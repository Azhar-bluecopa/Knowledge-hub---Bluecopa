// Vercel serverless API handler — MongoDB persistent store — v8
require('dotenv').config();
const express      = require('express');
const path         = require('path');
const fs           = require('fs');
const compression  = require('compression');
const nodemailer   = require('nodemailer');

// ── Email transporter ─────────────────────────────────────────────────────────
const mailer = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const PLATFORM_CC = 'azhar.m@bluecopa.com';

async function sendEmail({ to, subject, html, text, attachments }) {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.warn('[email] SMTP not configured — skipping send');
    return;
  }
  try {
    const info = await mailer.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to,
      cc: PLATFORM_CC,
      subject,
      html,
      text,
      ...(attachments ? { attachments } : {}),
    });
    console.log('[email] sent →', to, '|', info.messageId);
    return info;
  } catch (e) {
    console.error('[email] failed →', to, e.message);
    throw e;
  }
}

const app = express();
app.use(compression());
app.use(express.json({ limit: '10mb' }));

// ── Persistent store — MongoDB (primary) with data.json fallback ──────────────
let mongoCol = null;
let auditCol = null; // Separate collection for audit logs — avoids in-memory race conditions
let db = { articles: [], categories: [], settings: { siteTitle: 'KnowledgeHub', restrictions: { whoCanPost: 'admins_only' } }, nextId: 1 };

function loadFileDB() {
  const candidates = [
    path.join(__dirname, '..', 'data.json'),
    path.join(process.cwd(), 'data.json'),
  ];
  for (const f of candidates) {
    try { if (fs.existsSync(f)) return JSON.parse(fs.readFileSync(f, 'utf8')); } catch (_) {}
  }
  return db;
}

async function saveDB(data) {
  if (mongoCol) {
    try {
      await mongoCol.replaceOne({ _id: 'main' }, { _id: 'main', ...data }, { upsert: true });
    } catch(e) { console.error('[saveDB/mongo]', e.message); }
  }
  // On Vercel file writes are no-ops, so we don't even try
}

// Atomic field-level update — avoids full-document replace race conditions
async function atomicUpdate(update) {
  if (mongoCol) {
    try {
      await mongoCol.updateOne({ _id: 'main' }, update, { upsert: true });
      dbCacheTs = 0; // invalidate read cache so next GET fetches fresh
      return true;
    } catch(e) { console.error('[atomicUpdate]', e.message); }
  }
  return false;
}

// ── Data migration / seed ─────────────────────────────────────────────────────
function migrate() {
  let dirty = false;

  // Skill Matrix — canary: currentScores['Azhar']
  if (!db.skillMatrix) db.skillMatrix = { employees:[], processAreas:[], currentScores:{}, snapshots:[], nextSnapshotId:1 };
  if (!db.skillMatrix.currentScores) db.skillMatrix.currentScores = {};
  if (!db.skillMatrix.currentScores['Azhar']) {
    const existing = new Set(db.skillMatrix.employees || []);
    ['Azhar','Dharma Teja Taddi','Sai Kumar','Divyam Pandey','Karthik Varma',
     'Srikanth Ande','Srinivas Puneeth','Bhuvaneshwari Jangam','Sameera J',
     'Bhavana Priya','Jnanendra Avinash Golakoti','Hemanth Varma Pakalapati','Pradyumn Vibhandik']
      .forEach(n => existing.add(n));
    db.skillMatrix.employees = [...existing];
    if (!db.skillMatrix.processAreas || !db.skillMatrix.processAreas.length)
      db.skillMatrix.processAreas = ['Data Ingestion','Reconciliation','Workflows','Portal Creation','Exports'];
    Object.assign(db.skillMatrix.currentScores, {
      'Azhar':                      { 'Data Ingestion':92,'Reconciliation':88,'Workflows':90,'Portal Creation':82,'Exports':78 },
      'Dharma Teja Taddi':          { 'Data Ingestion':82,'Reconciliation':75,'Workflows':78,'Portal Creation':70,'Exports':68 },
      'Sai Kumar':                  { 'Data Ingestion':80,'Reconciliation':85,'Workflows':72,'Portal Creation':68,'Exports':75 },
      'Divyam Pandey':              { 'Data Ingestion':65,'Reconciliation':62,'Workflows':70,'Portal Creation':58,'Exports':60 },
      'Karthik Varma':              { 'Data Ingestion':72,'Reconciliation':68,'Workflows':65,'Portal Creation':75,'Exports':70 },
      'Srikanth Ande':              { 'Data Ingestion':78,'Reconciliation':72,'Workflows':68,'Portal Creation':62,'Exports':65 },
      'Srinivas Puneeth':           { 'Data Ingestion':70,'Reconciliation':68,'Workflows':72,'Portal Creation':65,'Exports':62 },
      'Bhuvaneshwari Jangam':       { 'Data Ingestion':60,'Reconciliation':65,'Workflows':58,'Portal Creation':55,'Exports':62 },
      'Sameera J':                  { 'Data Ingestion':68,'Reconciliation':62,'Workflows':65,'Portal Creation':70,'Exports':58 },
      'Bhavana Priya':              { 'Data Ingestion':72,'Reconciliation':65,'Workflows':70,'Portal Creation':62,'Exports':68 },
      'Jnanendra Avinash Golakoti': { 'Data Ingestion':75,'Reconciliation':70,'Workflows':68,'Portal Creation':65,'Exports':72 },
      'Hemanth Varma Pakalapati':   { 'Data Ingestion':68,'Reconciliation':65,'Workflows':72,'Portal Creation':60,'Exports':65 },
      'Pradyumn Vibhandik':         { 'Data Ingestion':62,'Reconciliation':58,'Workflows':65,'Portal Creation':55,'Exports':60 },
    });
    dirty = true;
  }

  // Process Puzzles — canary: attempt id 'pa_001'
  if (!db.processGame) db.processGame = { currentGame: null, attempts: [], gameHistory: [] };
  if (!db.processGame.attempts.find(a => a.id === 'pa_001')) {
    db.processGame.attempts.push(
      { id:'pa_001',gameId:'demo',playerName:'Azhar',playerInitials:'AZ',score:9,total:10,accuracy:90,timeTaken:95000,completedAt:'2026-07-03T10:00:00.000Z',isFirstAttempt:true },
      { id:'pa_002',gameId:'demo',playerName:'Karthik Varma',playerInitials:'KV',score:10,total:10,accuracy:100,timeTaken:72000,completedAt:'2026-07-03T10:30:00.000Z',isFirstAttempt:true },
      { id:'pa_003',gameId:'demo',playerName:'Dharma Teja Taddi',playerInitials:'DT',score:8,total:10,accuracy:80,timeTaken:145000,completedAt:'2026-07-04T09:00:00.000Z',isFirstAttempt:true },
      { id:'pa_004',gameId:'demo',playerName:'Sai Kumar',playerInitials:'SK',score:7,total:10,accuracy:70,timeTaken:180000,completedAt:'2026-07-04T11:00:00.000Z',isFirstAttempt:true },
      { id:'pa_005',gameId:'demo',playerName:'Hemanth Varma Pakalapati',playerInitials:'HV',score:8,total:10,accuracy:80,timeTaken:130000,completedAt:'2026-07-05T10:00:00.000Z',isFirstAttempt:true },
      { id:'pa_006',gameId:'demo',playerName:'Divyam Pandey',playerInitials:'DP',score:6,total:10,accuracy:60,timeTaken:200000,completedAt:'2026-07-05T11:00:00.000Z',isFirstAttempt:true },
      { id:'pa_007',gameId:'demo',playerName:'Srinivas Puneeth',playerInitials:'SP',score:7,total:10,accuracy:70,timeTaken:160000,completedAt:'2026-07-06T09:00:00.000Z',isFirstAttempt:true },
      { id:'pa_008',gameId:'demo',playerName:'Srikanth Ande',playerInitials:'SA',score:9,total:10,accuracy:90,timeTaken:105000,completedAt:'2026-07-06T09:30:00.000Z',isFirstAttempt:true }
    );
    dirty = true;
  }

  // Engagement (ideas) — canary: idea id 1
  if (!db.engagement) db.engagement = { ideas: [], nextIdeaId: 1 };
  if (!(db.engagement.ideas || []).find(i => i.id === 1)) {
    db.engagement.ideas.push(
      { id:1,title:'AI-powered article summarizer for faster reading',category:'Website Improvement',author:'Azhar',date:'2026-07-01T09:00:00.000Z',votes:8,voters:[],status:'implemented' },
      { id:2,title:'Weekly knowledge quiz with team leaderboard',category:'Process Improvement',author:'Dharma Teja Taddi',date:'2026-07-02T10:00:00.000Z',votes:5,voters:[],status:'in-progress' },
      { id:3,title:'Client-specific knowledge sections per project',category:'Process Improvement',author:'Sai Kumar',date:'2026-07-02T14:00:00.000Z',votes:3,voters:[],status:'new' },
      { id:4,title:'Dark mode for the portal',category:'Website Improvement',author:'Divyam Pandey',date:'2026-07-03T15:00:00.000Z',votes:4,voters:[],status:'new' },
      { id:5,title:'Automated onboarding checklist for new joiners',category:'Process Improvement',author:'Srikanth Ande',date:'2026-07-04T11:00:00.000Z',votes:6,voters:[],status:'in-progress' },
      { id:6,title:'Video walkthroughs for complex processes',category:'Process Improvement',author:'Karthik Varma',date:'2026-07-05T09:00:00.000Z',votes:3,voters:[],status:'new' }
    );
    if (!db.engagement.nextIdeaId || db.engagement.nextIdeaId < 7) db.engagement.nextIdeaId = 7;
    dirty = true;
  }

  // Tasks — canary: task id 10
  if (!db.tasks) db.tasks = [];
  if (!db.tasks.find(t => t.id === 10)) {
    db.tasks.push(
      { id:10,title:'Complete Q2 reconciliation review',assigneeName:'Azhar',assigneeEmail:'azhar.m@bluecopa.com',assignedByName:'Admin',assignedByEmail:'azhar.m@bluecopa.com',dueDate:'2026-07-01',priority:'high',status:'completed',createdAt:'2026-06-25T09:00:00.000Z',links:[],comments:[] },
      { id:11,title:'Update delivery process documentation',assigneeName:'Azhar',assigneeEmail:'azhar.m@bluecopa.com',assignedByName:'Admin',assignedByEmail:'azhar.m@bluecopa.com',dueDate:'2026-07-05',priority:'medium',status:'completed',createdAt:'2026-06-28T09:00:00.000Z',links:[],comments:[] },
      { id:12,title:'Review onboarding article for accuracy',assigneeName:'Dharma Teja Taddi',assigneeEmail:'dharma@bluecopa.com',assignedByName:'Admin',assignedByEmail:'azhar.m@bluecopa.com',dueDate:'2026-07-03',priority:'high',status:'completed',createdAt:'2026-06-27T09:00:00.000Z',links:[],comments:[] },
      { id:13,title:'Prepare Q3 client onboarding deck',assigneeName:'Sai Kumar',assigneeEmail:'sai@bluecopa.com',assignedByName:'Admin',assignedByEmail:'azhar.m@bluecopa.com',dueDate:'2026-07-04',priority:'medium',status:'completed',createdAt:'2026-06-28T09:00:00.000Z',links:[],comments:[] },
      { id:14,title:'Fix reconciliation module test cases',assigneeName:'Karthik Varma',assigneeEmail:'karthik@bluecopa.com',assignedByName:'Admin',assignedByEmail:'azhar.m@bluecopa.com',dueDate:'2026-07-02',priority:'medium',status:'completed',createdAt:'2026-06-26T09:00:00.000Z',links:[],comments:[] },
      { id:15,title:'Write GCS connector documentation',assigneeName:'Srikanth Ande',assigneeEmail:'srikanth@bluecopa.com',assignedByName:'Admin',assignedByEmail:'azhar.m@bluecopa.com',dueDate:'2026-07-04',priority:'medium',status:'completed',createdAt:'2026-06-27T09:00:00.000Z',links:[],comments:[] },
      { id:16,title:'Audit skill matrix scores for Q2',assigneeName:'Srinivas Puneeth',assigneeEmail:'srinivas@bluecopa.com',assignedByName:'Admin',assignedByEmail:'azhar.m@bluecopa.com',dueDate:'2026-07-05',priority:'low',status:'completed',createdAt:'2026-06-29T09:00:00.000Z',links:[],comments:[] },
      { id:17,title:'Submit issue resolution report',assigneeName:'Dharma Teja Taddi',assigneeEmail:'dharma@bluecopa.com',assignedByName:'Admin',assignedByEmail:'azhar.m@bluecopa.com',dueDate:'2026-07-06',priority:'high',status:'completed',createdAt:'2026-06-30T09:00:00.000Z',links:[],comments:[] }
    );
    db.nextTaskId = Math.max(db.nextTaskId || 1, 18);
    dirty = true;
  }

  // Issues — seed accepted solution on first issue if none exist
  if (db.issues && db.issues.length > 0 && (db.issues[0].solutions || []).length === 0) {
    db.issues[0].solutions = [{
      id: 'sol_001',
      text: 'Identified root cause: the reconciliation engine was not handling edge cases in the data ingestion pipeline. Fixed by adding validation checks before processing.',
      author: { email: 'dharma@bluecopa.com', name: 'Dharma Teja Taddi' },
      createdAt: '2026-07-04T14:00:00.000Z',
      isAccepted: true,
      acceptedAt: '2026-07-04T15:00:00.000Z',
      comments: []
    }];
    if (db.issues[0].status !== 'Resolved within Delivery') {
      db.issues[0].status = 'Resolved within Delivery';
      db.issues[0].resolvedAt = '2026-07-04T15:00:00.000Z';
    }
    dirty = true;
  }

  // UAT Platform — init + migrate old test case fields to v2 schema
  if (!db.uat) {
    db.uat = { clients:[], projects:[], testcases:[], issues:[], templates:[], activity:[], nextClientId:1, nextProjectId:1, nextTestId:1, nextIssueId:1, nextTemplateId:1 };
    dirty = true;
  }
  (db.uat.testcases||[]).forEach(tc => {
    if (!tc.category)        { tc.category = tc.processArea || 'General'; dirty = true; }
    if (!tc.subCategory)     { tc.subCategory = tc.module || ''; dirty = true; }
    if (!tc.testDescription) { tc.testDescription = tc.testScenario || ''; dirty = true; }
    if (tc.bluecopaStatus === undefined) {
      const m = {not_started:'not_tested',in_progress:'in_progress',passed:'pass',failed:'fail',blocked:'blocked',retest:'in_progress'};
      tc.bluecopaStatus = m[tc.status] || 'not_tested'; dirty = true;
    }
    if (tc.clientStatus   === undefined) { tc.clientStatus = 'not_tested'; dirty = true; }
    if (tc.bluecopaComments === undefined) { tc.bluecopaComments = (tc.comments||[]).filter(c=>c.role==='internal').map(c=>c.text).join('\n').trim(); dirty = true; }
    if (tc.clientComments   === undefined) { tc.clientComments = (tc.comments||[]).filter(c=>c.role==='client').map(c=>c.text).join('\n').trim(); dirty = true; }
    if (!tc.owner) { tc.owner = tc.assignee || ''; dirty = true; }
  });

  return dirty;
}

// Cache connection across warm lambda invocations
let dbInitPromise = null;
function getDbInitPromise() {
  if (dbInitPromise) return dbInitPromise;
  dbInitPromise = (async () => {
    const uri = process.env.MONGODB_URI;
    if (uri) {
      // Retry up to 3 times with 20s timeout — covers Vercel cold starts
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          const { MongoClient } = require('mongodb');
          const client = new MongoClient(uri, { serverSelectionTimeoutMS: 20000, connectTimeoutMS: 20000 });
          await client.connect();
          mongoCol  = client.db('knowledgehub').collection('store');
          auditCol  = client.db('knowledgehub').collection('audit_log'); // separate collection
          const doc = await mongoCol.findOne({ _id: 'main' });
          if (doc) {
            const { _id, ...data } = doc;
            db = data;
          } else {
            // First-time setup: seed from data.json into MongoDB
            db = loadFileDB();
            await mongoCol.insertOne({ _id: 'main', ...db });
          }
          console.log('[DB] MongoDB connected on attempt', attempt);
          try { if (migrate()) await saveDB(db); } catch(e) { console.error('[migrate]', e.message); }
          return; // success
        } catch (e) {
          console.error(`[DB] MongoDB attempt ${attempt} failed:`, e.message);
          mongoCol = null;
          if (attempt < 3) await new Promise(r => setTimeout(r, 1000));
        }
      }
      // All retries failed — keep in-memory db empty rather than loading
      // stale data.json which would show wrong categories/articles
      console.error('[DB] All MongoDB attempts failed — serving empty db');
      return;
    }
    // No MongoDB URI configured — use data.json (local dev only)
    db = loadFileDB();
    try { if (migrate()) await saveDB(db); } catch(e) { console.error('[migrate]', e.message); }
  })();
  return dbInitPromise;
}

// Wait for DB before handling any request
app.use(async (req, res, next) => {
  try { await getDbInitPromise(); } catch (_) {}
  next();
});

// Module-level promise used by UAT routes — pre-warms the DB on cold start
const _dbReady = getDbInitPromise();

function isAdmin(req) {
  const email = (req.headers['x-user-email'] || '').toLowerCase().trim();
  if (!email) return false;
  const adminEmails = (db.settings && db.settings.adminEmails) || ['azhar.m@bluecopa.com'];
  return adminEmails.map(e => e.toLowerCase()).includes(email);
}

// ── Role-Based Access Control ─────────────────────────────────────────────────

const ACL_DEFAULTS = {
  skillMatrix: { type: 'own',  selected: [] },
  kpis:        { type: 'own',  selected: [] },
  uat:         { type: 'none', selected: [] },
  ews:         { type: 'none', selected: [] },
  rocketlane:  { type: 'none', selected: [] }
};
const ACL_ADMIN_FULL = {
  skillMatrix: { type: 'all', selected: [] },
  kpis:        { type: 'all', selected: [] },
  uat:         { type: 'all', selected: [] },
  ews:         { type: 'all', selected: [] },
  rocketlane:  { type: 'all', selected: [] }
};
// Predefined role templates — applied when a role is assigned to a user
const ROLE_TEMPLATES = {
  // No access to any restricted module
  org: {
    skillMatrix: { type: 'none',     selected: [] },
    kpis:        { type: 'none',     selected: [] },
    uat:         { type: 'none',     selected: [] },
    ews:         { type: 'none',     selected: [] },
    rocketlane:  { type: 'none',     selected: [] }
  },
  // Own SM & KPI data; admin picks specific UAT/EWS/RL clients per person
  delivery: {
    skillMatrix: { type: 'own',      selected: [] },
    kpis:        { type: 'own',      selected: [] },
    uat:         { type: 'selected', selected: [] },
    ews:         { type: 'selected', selected: [] },
    rocketlane:  { type: 'selected', selected: [] }
  },
  // Own + team SM & KPI; admin picks specific UAT/EWS/RL clients per manager
  'team-manager': {
    skillMatrix: { type: 'team',     selected: [] },
    kpis:        { type: 'team',     selected: [] },
    uat:         { type: 'selected', selected: [] },
    ews:         { type: 'selected', selected: [] },
    rocketlane:  { type: 'selected', selected: [] }
  },
  // Full access to all modules (no admin panel)
  'delivery-lead': {
    skillMatrix: { type: 'all',      selected: [] },
    kpis:        { type: 'all',      selected: [] },
    uat:         { type: 'all',      selected: [] },
    ews:         { type: 'all',      selected: [] },
    rocketlane:  { type: 'all',      selected: [] }
  }
};

function ensureACL() {
  if (!db.acl) db.acl = {};
  if (!db.aclAudit) db.aclAudit = [];
}

function getUserACL(email) {
  if (!email) return { ...ACL_DEFAULTS };
  const lc = email.toLowerCase().trim();
  const adminEmails = (db.settings && db.settings.adminEmails) || ['azhar.m@bluecopa.com'];
  if (adminEmails.map(e => e.toLowerCase()).includes(lc)) return { ...ACL_ADMIN_FULL };
  ensureACL();
  const stored = db.acl[lc] || {};
  return {
    skillMatrix: stored.skillMatrix || ACL_DEFAULTS.skillMatrix,
    kpis:        stored.kpis        || ACL_DEFAULTS.kpis,
    uat:         stored.uat         || ACL_DEFAULTS.uat,
    ews:         stored.ews         || ACL_DEFAULTS.ews,
    rocketlane:  stored.rocketlane  || ACL_DEFAULTS.rocketlane
  };
}

// Resolve a user's email to their Skill Matrix employee name
function resolveNameFromEmail(email) {
  if (!email) return null;
  const lc = email.toLowerCase();
  const memberEmails = db.learning?.memberEmails || {};
  for (const [name, em] of Object.entries(memberEmails)) {
    if (em && em.toLowerCase() === lc) return name;
  }
  const user = (db.users || []).find(u => u.email && u.email.toLowerCase() === lc);
  if (user) {
    const employees = db.skillMatrix?.employees || [];
    if (employees.includes(user.name)) return user.name;
    const firstName = (user.name || '').split(' ')[0].toLowerCase();
    const match = employees.find(e => e.toLowerCase().startsWith(firstName));
    if (match) return match;
  }
  return null;
}

// Shared helper: resolves 'own', 'team', 'all', 'none', 'selected' for a people-based ACL field
function resolveEmployeeACL(perm, email) {
  if (perm.type === 'all') return null;
  if (perm.type === 'own') { const n = resolveNameFromEmail(email); return n ? [n] : []; }
  if (perm.type === 'team') {
    const ownName = resolveNameFromEmail(email);
    const selected = perm.selected || [];
    return ownName ? [ownName, ...selected.filter(n => n !== ownName)] : [...selected];
  }
  if (perm.type === 'none') return [];
  return perm.selected || [];
}

// Returns null = unrestricted, [] = no access, [names] = allowed list
function getAllowedEmployees(email) {
  return resolveEmployeeACL(getUserACL(email).skillMatrix, email);
}

// Same logic for KPIs (people-scoped, same employee dimension)
function getAllowedKPIEmployees(email) {
  return resolveEmployeeACL(getUserACL(email).kpis, email);
}

function getAllowedUATProjectIds(email) {
  const perm = getUserACL(email).uat;
  if (perm.type === 'all') return null;
  if (perm.type === 'none') return [];
  return perm.selected || [];
}

function getAllowedEWSIds(email) {
  const perm = getUserACL(email).ews;
  if (perm.type === 'all') return null;
  if (perm.type === 'none') return [];
  return perm.selected || [];
}

function getAllowedRLProjectIds(email) {
  const perm = getUserACL(email).rocketlane;
  if (perm.type === 'all') return null;
  if (perm.type === 'none') return [];
  return perm.selected || [];
}

function filterSkillMatrixForUser(data, email) {
  const allowed = getAllowedEmployees(email);
  if (allowed === null) return data;
  const filteredScores = {};
  allowed.forEach(n => { if (data.currentScores[n]) filteredScores[n] = data.currentScores[n]; });
  const filteredSnaps = (data.snapshots || []).map(s => ({
    ...s, scores: Object.fromEntries(Object.entries(s.scores || {}).filter(([n]) => allowed.includes(n)))
  }));
  return { ...data, employees: (data.employees || []).filter(e => allowed.includes(e)),
    currentScores: filteredScores, snapshots: filteredSnaps, _restricted: true, _ownView: allowed.length <= 1 };
}

function filterRLResponseForUser(data, email) {
  const allowedIds = getAllowedRLProjectIds(email);
  if (allowedIds === null) return data; // admin / all access — no filtering
  const idSet = new Set(allowedIds);
  const projects = (data.projects || []).filter(p => idSet.has(String(p.projectId)));
  const standard = projects.filter(p => p.isStandard);
  const avgProgress = standard.length ? Math.round(standard.reduce((s, p) => s + (p.overallPct || 0), 0) / standard.length) : 0;
  const phaseAvg = { engage: 0, drive: 0, enable: 0, convert: 0 };
  if (standard.length) {
    ['engage','drive','enable','convert'].forEach(ph => {
      phaseAvg[ph] = Math.round(standard.map(p => p.phases?.[ph]?.pct || 0).reduce((a, v) => a + v, 0) / standard.length);
    });
  }
  const summary = {
    total: projects.length, standard: standard.length, nonStandard: projects.length - standard.length,
    avgProgress, phaseAvg,
    byStatus: projects.reduce((m, p) => { m[p.status] = (m[p.status] || 0) + 1; return m; }, {})
  };
  return { ...data, projects, summary, _restricted: true };
}

function getWeekNumber(d) {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return Math.ceil((((date - yearStart) / 86400000) + 1) / 7);
}

// ── Helper: read fresh from MongoDB with a 30s cache — reduces round-trips on warm lambdas
let dbCacheTs = 0;
async function freshDB() {
  if (mongoCol && (Date.now() - dbCacheTs > 30000)) {
    try {
      const doc = await mongoCol.findOne({ _id: 'main' });
      if (doc) { const { _id, ...data } = doc; Object.assign(db, data); }
      dbCacheTs = Date.now();
    } catch (e) { console.error('[freshDB]', e.message); }
  }
}

// ── Articles ──────────────────────────────────────────────────────────────────
app.get('/api/articles', async (req, res) => {
  await freshDB();
  const { category, q } = req.query;
  let list = [...(db.articles || [])];
  if (category && category !== 'All') list = list.filter(a => a.category === category);
  if (q) {
    const lq = q.toLowerCase();
    list = list.filter(a =>
      (a.title  || '').toLowerCase().includes(lq) ||
      (a.excerpt|| '').toLowerCase().includes(lq) ||
      (a.tags   || []).some(t => t.toLowerCase().includes(lq))
    );
  }
  res.json(list.map(({ content, ...rest }) => rest));
});

app.get('/api/articles/:id', async (req, res) => {
  await freshDB();
  const a = (db.articles || []).find(x => x.id === parseInt(req.params.id));
  if (!a) return res.status(404).json({ error: 'Not found' });
  res.json(a);
});

// View increment
app.post('/api/articles/:id/view', async (req, res) => {
  const articleId = parseInt(req.params.id);
  const idx = (db.articles || []).findIndex(x => x.id === articleId);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  const a = db.articles[idx];
  a.views = (a.views || 0) + 1;

  const { viewer, viewerInitials } = req.body || {};
  const logEntry = {
    articleId: a.id, articleTitle: a.title,
    viewer: viewer || 'Anonymous',
    viewerInitials: viewerInitials || (viewer ? viewer.slice(0,2).toUpperCase() : 'AN'),
    ts: new Date().toISOString(),
  };

  if (mongoCol) {
    try {
      await mongoCol.updateOne(
        { _id: 'main' },
        {
          $inc: { [`articles.${idx}.views`]: 1 },
          $push: { viewLog: { $each: [logEntry], $slice: -2000 } },
        }
      );
      dbCacheTs = 0;
    } catch(e) {
      console.error('[view/mongo]', e.message);
      if (!db.viewLog) db.viewLog = [];
      db.viewLog.push(logEntry);
      if (db.viewLog.length > 2000) db.viewLog = db.viewLog.slice(-2000);
      await saveDB(db);
    }
  } else {
    if (!db.viewLog) db.viewLog = [];
    db.viewLog.push(logEntry);
    if (db.viewLog.length > 2000) db.viewLog = db.viewLog.slice(-2000);
  }
  res.json({ views: a.views });
});

// Create article
app.post('/api/articles', async (req, res) => {
  const { whoCanPost } = (db.settings && db.settings.restrictions) || {};
  if (whoCanPost === 'disabled') return res.status(403).json({ error: 'Posting is disabled.' });
  if (whoCanPost === 'admins_only' && !isAdmin(req)) return res.status(403).json({ error: 'Only admins can post.' });
  const { title, category, author, initials, content, tags } = req.body;
  if (!title || !category || !content) return res.status(400).json({ error: 'title, category, content required' });

  let articleId;
  if (mongoCol) {
    // Atomically increment nextId — safe under concurrent requests
    const result = await mongoCol.findOneAndUpdate(
      { _id: 'main' },
      { $inc: { nextId: 1 } },
      { returnDocument: 'before', upsert: true }
    );
    articleId = (result && result.nextId) || (Math.max(0, ...(db.articles||[]).map(a=>a.id)) + 1);
    db.nextId = articleId + 1;
  } else {
    if (!db.articles) db.articles = [];
    if (!db.nextId) db.nextId = (Math.max(0, ...db.articles.map(a => a.id)) + 1);
    articleId = db.nextId++;
  }

  const article = {
    id: articleId,
    title, category, author: author || 'Anonymous',
    initials: initials || (author || 'A').slice(0,2).toUpperCase(),
    excerpt: content.replace(/<style[\s\S]*?<\/style>/gi,'').replace(/<script[\s\S]*?<\/script>/gi,'').replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim().slice(0,180) + '…',
    content, tags: Array.isArray(tags) ? tags : (tags||'').split(',').map(t=>t.trim()).filter(Boolean),
    created_at: new Date().toISOString(), views: 0,
  };

  const ok = await atomicUpdate({ $push: { articles: article } });
  if (!ok) { db.articles = db.articles || []; db.articles.push(article); await saveDB(db); }
  res.status(201).json(article);
});

// Edit article
app.put('/api/articles/:id', async (req, res) => {
  if (!isAdmin(req)) return res.status(401).json({ error: 'Admin required' });
  const id  = parseInt(req.params.id);
  const idx = (db.articles || []).findIndex(x => x.id === id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  const { title, category, author, initials, content, tags } = req.body;
  const a = db.articles[idx];
  if (title)    a.title    = title;
  if (category) a.category = category;
  if (author)   a.author   = author;
  if (initials) a.initials = initials;
  if (content)  { a.content = content; a.excerpt = content.replace(/<style[\s\S]*?<\/style>/gi,'').replace(/<script[\s\S]*?<\/script>/gi,'').replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim().slice(0,180)+'…'; }
  if (tags !== undefined) a.tags = Array.isArray(tags) ? tags : (tags||'').split(',').map(t=>t.trim()).filter(Boolean);
  // Targeted update: only modify this article's array element in MongoDB.
  // Avoids the race condition where a stale serverless instance overwrites the
  // whole document (replaceOne) and reverts updates made by other instances.
  if (mongoCol) {
    try {
      await mongoCol.updateOne(
        { _id: 'main' },
        { $set: { [`articles.${idx}`]: a } }
      );
    } catch(e) {
      console.error('[PUT article/mongo]', e.message);
      // Fall back to full document replace only if targeted update fails
      try { await saveDB(db); } catch(_) {}
    }
  }
  res.json(a);
});

// Delete article
app.delete('/api/articles/:id', async (req, res) => {
  if (!isAdmin(req)) return res.status(401).json({ error: 'Admin required' });
  const id  = parseInt(req.params.id);
  const exists = (db.articles || []).some(x => x.id === id);
  if (!exists) return res.status(404).json({ error: 'Not found' });
  const ok = await atomicUpdate({ $pull: { articles: { id } } });
  if (!ok) { db.articles = (db.articles||[]).filter(x => x.id !== id); await saveDB(db); }
  else db.articles = (db.articles||[]).filter(x => x.id !== id); // keep in-memory in sync
  res.json({ success: true });
});

// ── Categories ────────────────────────────────────────────────────────────────
app.get('/api/categories', async (req, res) => { await freshDB(); res.json(db.categories || []); });

app.post('/api/categories', async (req, res) => {
  if (!isAdmin(req)) return res.status(401).json({ error: 'Admin required' });
  const { name, color } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'name required' });
  if (!db.categories) db.categories = [];
  if (db.categories.find(c => c.name.toLowerCase() === name.trim().toLowerCase()))
    return res.status(409).json({ error: 'Category already exists' });
  const hex = color || '#7a7a96';
  const r = parseInt(hex.slice(1,3),16), g = parseInt(hex.slice(3,5),16), b = parseInt(hex.slice(5,7),16);
  const cat = { id: Date.now(), name: name.trim(), color: hex, bg: `rgba(${r},${g},${b},0.15)` };
  const ok = await atomicUpdate({ $push: { categories: cat } });
  if (!ok) { db.categories.push(cat); await saveDB(db); }
  else db.categories.push(cat);
  res.status(201).json(cat);
});

app.delete('/api/categories/:id', async (req, res) => {
  if (!isAdmin(req)) return res.status(401).json({ error: 'Admin required' });
  const idParam = req.params.id;
  const cat = (db.categories || []).find(c => String(c.id) === idParam);
  if (!cat) return res.status(404).json({ error: 'Not found' });
  const ok = await atomicUpdate({ $pull: { categories: { id: cat.id } } });
  if (!ok) { db.categories = (db.categories||[]).filter(c => String(c.id) !== idParam); await saveDB(db); }
  else db.categories = (db.categories||[]).filter(c => String(c.id) !== idParam);
  res.json({ success: true });
});

app.put('/api/categories/:id', async (req, res) => {
  if (!isAdmin(req)) return res.status(401).json({ error: 'Admin required' });
  const idParam = req.params.id;
  const { name, color } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'name required' });
  // Use string comparison to avoid type-mismatch issues (number vs float vs string IDs)
  const cat = (db.categories || []).find(c => String(c.id) === idParam);
  if (!cat) return res.status(404).json({ error: 'Not found' });
  const duplicate = (db.categories || []).find(c => String(c.id) !== idParam && c.name.toLowerCase() === name.trim().toLowerCase());
  if (duplicate) return res.status(409).json({ error: 'Category name already exists' });
  cat.name = name.trim();
  if (color) cat.color = color;
  await saveDB(db);
  res.json(cat);
});

// ── Settings ──────────────────────────────────────────────────────────────────
app.get('/api/settings', (req, res) => {
  const { adminPassword: _, ...pub } = db.settings || {};
  res.json(pub);
});

app.put('/api/settings', async (req, res) => {
  if (!isAdmin(req)) return res.status(401).json({ error: 'Admin required' });
  const { restrictions, adminEmails, siteTitle, aboutText } = req.body;
  if (!db.settings) db.settings = {};
  if (restrictions)                                      db.settings.restrictions = { ...db.settings.restrictions, ...restrictions };
  if (Array.isArray(adminEmails) && adminEmails.length)  db.settings.adminEmails = adminEmails.map(e => e.trim().toLowerCase());
  if (siteTitle?.trim())                                 db.settings.siteTitle = siteTitle.trim();
  if (aboutText !== undefined)                           db.settings.aboutText = aboutText;
  await saveDB(db);
  res.json(db.settings);
});

// ── Admin login ───────────────────────────────────────────────────────────────
app.post('/api/admin/login', (req, res) => {
  const email = (req.body.email || '').toLowerCase().trim();
  if (!email) return res.status(400).json({ error: 'Email required' });
  const adminEmails = (db.settings && db.settings.adminEmails) || ['azhar.m@bluecopa.com'];
  if (adminEmails.map(e => e.toLowerCase()).includes(email))
    return res.json({ ok: true });
  return res.status(403).json({ error: 'Not authorized' });
});

// ── Analytics ─────────────────────────────────────────────────────────────────
app.get('/api/analytics', (req, res) => {
  const articles   = db.articles   || [];
  const categories = db.categories || [];
  const viewLog    = db.viewLog    || [];

  const byCat = {};
  categories.forEach(c => { byCat[c.name] = 0; });
  articles.forEach(a => { byCat[a.category] = (byCat[a.category] || 0) + 1; });

  const byAuthor = {};
  articles.forEach(a => { byAuthor[a.author] = (byAuthor[a.author] || 0) + 1; });

  const topViewed = [...articles]
    .sort((a, b) => (b.views || 0) - (a.views || 0))
    .slice(0, 10)
    .map(a => ({ id: a.id, title: a.title, views: a.views || 0, author: a.author, category: a.category }));

  const monthly = {};
  for (let i = 5; i >= 0; i--) {
    const d = new Date(); d.setMonth(d.getMonth() - i);
    const key = d.toLocaleString('default', { month: 'short', year: '2-digit' });
    monthly[key] = 0;
  }
  articles.forEach(a => {
    if (!a.created_at) return;
    const d = new Date(a.created_at);
    const key = d.toLocaleString('default', { month: 'short', year: '2-digit' });
    if (monthly[key] !== undefined) monthly[key]++;
  });

  const tagFreq = {};
  articles.forEach(a => (a.tags || []).forEach(t => { tagFreq[t] = (tagFreq[t] || 0) + 1; }));
  const topTags = Object.entries(tagFreq).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([tag, count]) => ({ tag, count }));

  // ── Viewer analytics ──────────────────────────────────────────────────────

  // Normalise every viewLog entry — skip or label entries missing a real name
  const cleanLog = viewLog.map(e => ({
    ...e,
    viewer: (e.viewer && e.viewer !== 'undefined' && e.viewer !== 'null' && e.viewer !== 'Anonymous')
      ? e.viewer
      : null,  // null = unknown, excluded from named analytics
  }));
  const namedLog = cleanLog.filter(e => e.viewer); // only entries with a real name

  // Who views the most (total views per person)
  const viewerTotals = {};
  const viewerInitialsMap = {};
  namedLog.forEach(e => {
    viewerTotals[e.viewer] = (viewerTotals[e.viewer] || 0) + 1;
    if (!viewerInitialsMap[e.viewer] && e.viewerInitials)
      viewerInitialsMap[e.viewer] = e.viewerInitials;
  });
  const viewerLeaderboard = Object.entries(viewerTotals)
    .sort((a, b) => b[1] - a[1])
    .map(([name, views], i) => ({ rank: i + 1, name, views, initials: viewerInitialsMap[name] }));

  // Per viewer: which articles they read and how many times
  const viewerArticleMap = {};
  namedLog.forEach(e => {
    if (!viewerArticleMap[e.viewer]) viewerArticleMap[e.viewer] = {};
    const key = `${e.articleId}|||${e.articleTitle}`;
    viewerArticleMap[e.viewer][key] = (viewerArticleMap[e.viewer][key] || 0) + 1;
  });
  const viewerDetail = Object.entries(viewerArticleMap).map(([viewer, arts]) => ({
    viewer,
    initials: viewerInitialsMap[viewer],
    totalViews: viewerTotals[viewer] || 0,
    articles: Object.entries(arts)
      .sort((a, b) => b[1] - a[1])
      .map(([key, count]) => {
        const [idStr, title] = key.split('|||');
        return { id: parseInt(idStr), title, count };
      }),
  })).sort((a, b) => b.totalViews - a.totalViews);

  // Article view breakdown: per article, who viewed it
  const articleViewerMap = {};
  namedLog.forEach(e => {
    if (!articleViewerMap[e.articleId]) articleViewerMap[e.articleId] = { title: e.articleTitle, viewers: {} };
    articleViewerMap[e.articleId].viewers[e.viewer] = (articleViewerMap[e.articleId].viewers[e.viewer] || 0) + 1;
  });
  const articleViewerDetail = Object.entries(articleViewerMap).map(([idStr, val]) => ({
    id: parseInt(idStr), title: val.title,
    totalViews: Object.values(val.viewers).reduce((s, v) => s + v, 0),
    uniqueViewers: Object.keys(val.viewers).length,
    viewers: Object.entries(val.viewers).sort((a, b) => b[1] - a[1]).map(([name, count]) => ({ name, count })),
  })).sort((a, b) => b.totalViews - a.totalViews);

  // Recent activity feed (last 30)
  const recentActivity = [...viewLog].reverse().slice(0, 30).map(e => ({
    viewer: e.viewer, viewerInitials: e.viewerInitials,
    articleId: e.articleId, articleTitle: e.articleTitle, ts: e.ts,
  }));

  // Daily views over last 14 days
  const dailyViews = {};
  for (let i = 13; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    dailyViews[d.toISOString().slice(0, 10)] = 0;
  }
  viewLog.forEach(e => {
    const day = e.ts ? e.ts.slice(0, 10) : null;
    if (day && dailyViews[day] !== undefined) dailyViews[day]++;
  });

  // Zero-view articles
  const zeroViewArticles = articles.filter(a => !(a.views > 0)).map(a => ({ id: a.id, title: a.title, author: a.author, category: a.category, created_at: a.created_at }));

  const totalViews = articles.reduce((s, a) => s + (a.views || 0), 0);

  res.json({
    totals: {
      articles:   articles.length,
      categories: categories.length,
      authors:    Object.keys(byAuthor).length,
      views:      totalViews,
      avgViews:   articles.length ? Math.round(totalViews / articles.length * 10) / 10 : 0,
      uniqueViewers: Object.keys(viewerTotals).length,
    },
    byCategory: Object.entries(byCat).map(([name, count]) => ({
      name, count,
      color: categories.find(c => c.name === name)?.color || '#7a7a96',
    })),
    byAuthor:   Object.entries(byAuthor).sort((a, b) => b[1] - a[1]).map(([name, count]) => ({ name, count })),
    topViewed,
    monthly,
    topTags,
    viewerLeaderboard,
    viewerDetail,
    articleViewerDetail,
    recentActivity,
    dailyViews,
    zeroViewArticles,
  });
});

// ── AI Ask (Claude / Anthropic) ───────────────────────────────────────────────
app.post('/api/ask', async (req, res) => {
  const { question, articleId, history, roadmap, skillMatrix } = req.body;
  if (!question?.trim()) return res.status(400).json({ error: 'Question is required.' });

  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  const useAnthropic = anthropicKey && anthropicKey !== 'your-anthropic-api-key-here';

  if (!useAnthropic) {
    return res.status(503).json({ error: 'AI assistant is not configured. Add ANTHROPIC_API_KEY to Vercel env vars.' });
  }

  // ── Helpers ────────────────────────────────────────────────────────────────
  function stripHtml(html) {
    return html
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, ' ')
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, ' ')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/?(p|div|li|h[1-6]|tr|td|th|section|article)[^>]*>/gi, '\n')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
      .replace(/[ \t]+/g, ' ').replace(/\n[ \t]+/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
  }

  function extractRelevant(rawContent, qWords, maxChars = 6000) {
    const text = stripHtml(rawContent);
    if (text.length <= maxChars) return text;
    const paras = text.split(/\n{2,}/).map(p => p.trim()).filter(p => p.length > 30);
    const scored = paras.map((p, idx) => {
      const lower = p.toLowerCase();
      const kw = qWords.reduce((s, w) => s + (lower.includes(w) ? 1 : 0), 0);
      return { p, score: kw + (idx < 4 ? 0.3 : 0), idx };
    }).sort((a, b) => b.score - a.score || a.idx - b.idx);
    const intro = paras.slice(0, 2).join('\n\n');
    let out = intro + '\n\n', left = maxChars - intro.length - 2;
    for (const { p, idx } of scored) {
      if (idx < 2) continue;
      if (left <= 0) break;
      out += p + '\n\n'; left -= p.length + 2;
    }
    return out.slice(0, maxChars);
  }

  // ── Retrieval ──────────────────────────────────────────────────────────────
  const allArts = db.articles || [];
  const qWords = question.toLowerCase().replace(/[^a-z0-9\s]/g,' ').split(/\s+/).filter(w => w.length > 2);
  let topArticles = [];
  if (articleId) {
    const a = allArts.find(x => x.id === parseInt(articleId));
    if (a) topArticles = [a];
  } else {
    const scored = allArts.map(a => {
      const cleanText = stripHtml(a.content);
      const hay = (a.title+' '+a.excerpt+' '+(a.tags||[]).join(' ')+' '+a.category+' '+cleanText).toLowerCase();
      const score = qWords.reduce((s,w) => s+(hay.includes(w)?1:0), 0);
      return { a, score };
    }).sort((x,y) => y.score - x.score);
    topArticles = scored.slice(0,3).map(r => r.a);
  }

  const articleIndex = allArts.map(a =>
    `  • ID ${a.id} | "${a.title}" | Category: ${a.category} | Link format: [${a.title}](#article-${a.id})`
  ).join('\n');
  const articleContext = topArticles.map(a =>
    `=== ARTICLE ID ${a.id}: ${a.title} ===\nCategory: ${a.category} | Tags: ${(a.tags||[]).join(', ')}\nLink: [${a.title}](#article-${a.id})\n\n${extractRelevant(a.content, qWords, 6000)}\n`
  ).join('\n---\n\n');

  // ── Skill Matrix Context ───────────────────────────────────────────────────
  let skillMatrixContext = '';
  if (skillMatrix && skillMatrix.employees && skillMatrix.employees.length) {
    const { employees, processAreas, scores, snapshots } = skillMatrix;
    const lvl = ['Unassessed','Beginner','Intermediate','Advanced','Expert'];

    // Per-employee breakdown
    const empRows = employees.map(emp => {
      const sc = scores[emp] || {};
      const vals = processAreas.map(pa => sc[pa]||0).filter(v=>v>0);
      const avg = vals.length ? (vals.reduce((a,b)=>a+b,0)/vals.length).toFixed(1) : '—';
      const details = processAreas
        .filter(pa => (sc[pa]||0) > 0)
        .map(pa => `${pa}:${lvl[sc[pa]]}(${sc[pa]})`).join(', ');
      return `  ${emp} | Avg:${avg} | ${details||'no scores'}`;
    }).join('\n');

    // Per-process-area summary
    const paRows = processAreas.map(pa => {
      const vals = employees.map(e => (scores[e]||{})[pa]||0).filter(v=>v>0);
      const avg = vals.length ? (vals.reduce((a,b)=>a+b,0)/vals.length).toFixed(1) : '—';
      const experts = employees.filter(e => (scores[e]||{})[pa]===4);
      const advanced = employees.filter(e => (scores[e]||{})[pa]===3);
      return `  ${pa} | TeamAvg:${avg}${experts.length?` | Experts:${experts.join(',')}`:''}`
           + `${advanced.length?` | Advanced:${advanced.join(',')}` : ''}`;
    }).join('\n');

    // Snapshot trend
    const snapRows = (snapshots||[]).map(s =>
      `  ${s.label}: ${s.employeeAvgs.map(e=>`${e.name}:${e.avg}`).join(', ')}`
    ).join('\n');

    skillMatrixContext = `

SKILL MATRIX — Live Team Data:
Score scale: 1=Beginner | 2=Intermediate | 3=Advanced | 4=Expert | 0=Unassessed

EMPLOYEE SKILL SCORES:
${empRows}

PROCESS AREA OVERVIEW (team averages & top performers):
${paRows}
${snapRows ? `\nHISTORICAL SNAPSHOTS (employee avg scores per snapshot):\n${snapRows}` : ''}

Use this to answer questions about: individual skill levels, who to contact for a skill, team strengths/gaps, top performers, skill trends over time. Source: Skill Matrix data.`;
  }

  const systemPrompt = `You are the Bluecopa Knowledge Assistant. You answer employee questions using the knowledge base, skill matrix data, and planned article roadmap below. Never use outside knowledge.

STRICT RULES:
- Use ONLY facts from: (1) published articles, (2) skill matrix data, (3) roadmap. Never invent info.
- If a topic is in the ROADMAP, tell the user the article is planned, who the owner is, and the expected date.
- If a question is about team skills, answer using the SKILL MATRIX data directly.
- If the answer is not in any of the three sources, say: "⚠️ I don't have this info yet. Please contact the relevant team."
- Never echo format instructions back. Never write labels like "One-line direct answer:" or "Steps:" or "Source link:" in your response.
- Write naturally, like a helpful colleague — not like filling in a template.

HOW TO ANSWER (match the question, no more, no less):
- Asked for a URL/link → give only the URL on one line
- Simple yes/no fact → one sentence, then the source pill
- How-to process → write numbered steps directly (no header, just the steps)
- Comparison/list → use a markdown table or bullet list
- General explanation → short paragraphs with bullet points for details

FORMATTING:
- **Bold** important terms and key values
- Use numbered lists for steps, bullets for unordered items
- For navigation menus or feature lists: use a 2-column table (Name | Description) — never include URL/route/path columns
- Keep tables to 2 columns maximum — never more than 2 columns in a chat response
- Keep it under 150 words for simple questions, under 300 for detailed guides
- No filler phrases like "Great question!" or "Certainly!"

ALWAYS end your response with the relevant article link on its own line:
📖 [Exact Article Title](#article-N)
Replace N with the real ID number from the list below. Never write #article-ID literally.

EXAMPLE of a good response to "How do I apply for leave?":
Submit your leave request in Zoho People:
1. Log in at https://people.zoho.in
2. Go to **Leave** → **Apply Leave**
3. Select leave type, dates, and add a reason
4. Click **Submit — your manager will be notified**

💡 Request at least 3 days in advance for planned leave.

📖 [Leave Policy & Attendance Guidelines](#article-4)

— End of example —

AVAILABLE ARTICLES (exact titles and IDs to use in links):
${articleIndex}

RELEVANT ARTICLE CONTENT:
${articleContext}
— End of knowledge base —
${skillMatrixContext}

${roadmap && roadmap.length ? `ARTICLE ROADMAP — Planned but not yet published:
These articles are confirmed planned and will be published. If the user asks about a topic not covered in the published articles above but found here, tell them:
- The article is planned/in progress (not published yet)
- Who the owner/author is
- The expected date (if not TBD)
- Be helpful and encouraging — let them know it's coming soon

ROADMAP DATA:
${roadmap.map(t => `Topic: ${t.topic}\n${t.articles.map(a => `  • "${a.title}" — Owner: ${a.owner}${a.date && a.date !== 'TBD' ? ` — Expected: ${a.date}` : ' — Date: TBD'}`).join('\n')}`).join('\n\n')}
— End of roadmap —` : ''}`;

  const messages = [];
  if (Array.isArray(history) && history.length > 0) {
    // Keep only the last 6 messages (3 turns) to stay within token limits
    const recentHistory = history.slice(-6);
    recentHistory.forEach(h => { if (h.role && h.content) messages.push({ role: h.role, content: h.content }); });
  }
  messages.push({ role: 'user', content: question.trim() });

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  try {
    const Anthropic = require('@anthropic-ai/sdk');
    const client = new Anthropic.default({ apiKey: anthropicKey });
    const stream = await client.messages.stream({
      model: 'claude-opus-4-5', max_tokens: 2048,
      system: systemPrompt, messages,
    });
    for await (const event of stream) {
      if (event.type === 'content_block_delta' && event.delta?.type === 'text_delta') {
        res.write(`data: ${JSON.stringify({ type: 'text', text: event.delta.text })}\n\n`);
      }
    }
    res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
    res.end();
  } catch (err) {
    console.error('[/api/ask] AI error:', err.message);
    res.write(`data: ${JSON.stringify({ type: 'error', message: err.message })}\n\n`);
    res.end();
  }
});

// ══════════════════════════════════════════════════════════════════════════════
//  UAT PLATFORM v2  — /api/uat/*  |  /uat/portal/:token
// ══════════════════════════════════════════════════════════════════════════════
function uatDB() {
  if (!db.uat) db.uat = { clients:[], projects:[], testcases:[], issues:[], templates:[], activity:[] };
  return db.uat;
}
function uatId() { return `${Date.now()}_${Math.random().toString(36).slice(2,6)}`; }
function uatLog(type, msg, extras={}) {
  const u = uatDB();
  u.activity.unshift({ id:uatId(), type, message:msg, ...extras, createdAt: new Date().toISOString() });
  if (u.activity.length > 500) u.activity = u.activity.slice(0, 500);
}
function uatNewTC(base={}) {
  return { id:uatId(), category:'', subCategory:'', testDescription:'', expectedResult:'', priority:'medium', owner:'',
    bluecopaStatus:'not_tested', clientStatus:'not_tested', bluecopaComments:'', clientComments:'',
    attachments:[], tags:[], createdAt:new Date().toISOString(), updatedAt:new Date().toISOString(), ...base };
}

// ── 44 default test cases covering Bluecopa finance/ERP implementation ────────
const UAT_DEFAULTS = [
  // R2R
  { category:'R2R', subCategory:'Chart of Accounts', priority:'critical', testDescription:'Verify GL account hierarchy and mapping is correctly configured in the system', expectedResult:'All GL accounts visible with correct mapping to P&L/BS, no duplicate codes, proper classification (Assets/Liabilities/Equity/Revenue/Expense)' },
  { category:'R2R', subCategory:'Opening Balances', priority:'critical', testDescription:'Upload and validate opening trial balance for all accounts', expectedResult:'All balances imported successfully, trial balance debits equal credits, figures match source data signed off by finance' },
  { category:'R2R', subCategory:'Journal Entries', priority:'high', testDescription:'Create and post a manual journal entry with multiple debit/credit line items', expectedResult:'Journal entry posted, GL accounts updated, audit trail created with user, timestamp, and IP address' },
  { category:'R2R', subCategory:'Journal Entries', priority:'medium', testDescription:'Configure and execute a recurring journal entry on a monthly schedule', expectedResult:'Recurring JE auto-posts on configured date, email notification sent, manual override available, audit log updated' },
  { category:'R2R', subCategory:'Period Close', priority:'critical', testDescription:'Execute month-end close process and lock the accounting period', expectedResult:'Period locked, prior period data protected from edits, closing entries auto-generated, period status shows "Closed"' },
  { category:'R2R', subCategory:'Bank Reconciliation', priority:'high', testDescription:'Reconcile bank statement with GL cash account for a given month', expectedResult:'Matched items reconciled, unmatched items flagged with reason, reconciliation report exportable, closing balance matches bank statement' },
  { category:'R2R', subCategory:'Intercompany', priority:'high', testDescription:'Reconcile intercompany balances between two legal entities', expectedResult:'Differences identified and highlighted, elimination entries generated, net intercompany position report available' },
  { category:'R2R', subCategory:'Financial Statements', priority:'critical', testDescription:'Generate P&L, Balance Sheet, and Cash Flow statements for a closed period', expectedResult:'All three statements balance, figures agree with trial balance, period/entity filters functional, export to PDF and Excel works' },
  // P2P
  { category:'P2P', subCategory:'Vendor Master', priority:'high', testDescription:'Create a new vendor with all required fields including bank details and payment terms', expectedResult:'Vendor activated after approval workflow, IFSC/IBAN validated, payment terms applied, duplicate check triggered' },
  { category:'P2P', subCategory:'Vendor Master', priority:'medium', testDescription:'Verify vendor approval workflow routes to correct approver based on spend category', expectedResult:'Approval request sent to correct approver, vendor inactive until approved, rejection reason captured in audit log' },
  { category:'P2P', subCategory:'Purchase Orders', priority:'high', testDescription:'Create a purchase order with multiple line items, taxes, and freight charges', expectedResult:'PO generated with correct subtotal, tax, and total. PO number assigned, vendor email notification sent' },
  { category:'P2P', subCategory:'Invoice Processing', priority:'critical', testDescription:'Upload and process vendor invoice against PO with 3-way match (PO + GRN + Invoice)', expectedResult:'3-way match validated automatically, discrepancies flagged with tolerance rules, matched invoices queued for payment approval' },
  { category:'P2P', subCategory:'Invoice Processing', priority:'high', testDescription:'Process a non-PO vendor invoice through GL coding and approval workflow', expectedResult:'Invoice coded to correct GL account, approval chain triggered per policy, GL updated on final approval' },
  { category:'P2P', subCategory:'Payments', priority:'critical', testDescription:'Execute payment run for all due vendor invoices in a payment cycle', expectedResult:'Payments processed to correct bank accounts, remittances emailed to vendors, AP ledger updated, bank payment file generated' },
  { category:'P2P', subCategory:'Debit/Credit Notes', priority:'medium', testDescription:'Process vendor credit note and apply against oldest matching open invoice', expectedResult:'Credit note recorded, net balance updated in AP ledger, excess credit carried forward as advance' },
  { category:'P2P', subCategory:'AP Reporting', priority:'high', testDescription:'Generate AP aging report and reconcile totals with AP control account', expectedResult:'Aging buckets (current/30/60/90+ days) correct, total matches AP ledger, supplier-wise breakdown available, export works' },
  // O2C
  { category:'O2C', subCategory:'Customer Master', priority:'high', testDescription:'Create customer with credit limit, payment terms, and billing/shipping addresses', expectedResult:'Customer active, credit limit enforced on new orders, correct tax category applied, duplicate customer check triggered' },
  { category:'O2C', subCategory:'Sales Orders', priority:'high', testDescription:'Create and confirm sales order with pricing, discount, and applicable taxes', expectedResult:'SO confirmed, inventory reserved, pricing and tax calculated correctly, order confirmation emailed to customer' },
  { category:'O2C', subCategory:'Invoicing', priority:'critical', testDescription:'Generate customer invoice from a fully delivered sales order', expectedResult:'Invoice created with correct line items, amounts, and tax. Auto-emailed to customer, AR ledger updated' },
  { category:'O2C', subCategory:'Invoicing', priority:'medium', testDescription:'Process a credit memo for a returned or disputed sales order', expectedResult:'Credit memo applied to open invoice or customer balance, AR reduced correctly, credit note emailed to customer' },
  { category:'O2C', subCategory:'Collections', priority:'critical', testDescription:'Apply customer payment receipt to open invoice(s)', expectedResult:'Invoice marked paid, AR ledger updated, receipt generated, excess treated as advance or credit on account' },
  { category:'O2C', subCategory:'AR Reporting', priority:'high', testDescription:'Generate AR aging report and verify accuracy against AR control account', expectedResult:'Aging buckets correct, total matches AR ledger, overdue amounts clearly flagged, customer-wise detail available' },
  { category:'O2C', subCategory:'Dunning', priority:'medium', testDescription:'Trigger payment reminder workflow for invoices overdue by 30, 60, and 90 days', expectedResult:'Escalating reminders sent to correct contacts, dunning letters generated, collection activity logged per customer' },
  // Planning
  { category:'Planning', subCategory:'Budget', priority:'high', testDescription:'Upload annual budget for all cost centers and departments via standard template', expectedResult:'Budget loaded, version controlled, accessible for real-time variance analysis against actuals' },
  { category:'Planning', subCategory:'Budget', priority:'high', testDescription:'Run budget vs actuals variance report with drill-down to individual transactions', expectedResult:'Variance (amount and %) calculated correctly, clicking variance figure opens underlying transactions' },
  { category:'Planning', subCategory:'Forecast', priority:'medium', testDescription:'Update rolling forecast figures and compare with annual budget and prior forecast', expectedResult:'Forecast saved, variance to budget and prior forecast displayed, version history retained' },
  { category:'Planning', subCategory:'Scenarios', priority:'low', testDescription:'Create and compare multiple budget scenarios (Base, Optimistic, Conservative)', expectedResult:'Scenarios independent, side-by-side comparison view accurate, scenarios can be locked/promoted' },
  // Dashboards
  { category:'Dashboards', subCategory:'Executive Dashboard', priority:'critical', testDescription:'Load executive overview with P&L summary, cash position, and key KPIs', expectedResult:'All widgets load under 3 seconds, data is current per configured refresh, no broken charts or missing data' },
  { category:'Dashboards', subCategory:'Finance Dashboard', priority:'high', testDescription:'Verify CFO dashboard P&L, Balance Sheet KPIs with prior-period comparison', expectedResult:'Figures match published financials, period selector updates all widgets, prior period comparison correct' },
  { category:'Dashboards', subCategory:'Operations Dashboard', priority:'high', testDescription:'Load AP/AR operations dashboard showing aging, DSO, DPO, and cash conversion cycle', expectedResult:'All metrics visible and correct, DSO/DPO match report figures, data refreshes without page reload' },
  { category:'Dashboards', subCategory:'Drill-Down', priority:'medium', testDescription:'Click a chart segment or KPI tile to drill into underlying transactions', expectedResult:'Transaction list matches chart selection exactly, back navigation returns to dashboard without reload' },
  { category:'Dashboards', subCategory:'Filters', priority:'high', testDescription:'Apply date range and entity filter across all dashboard widgets simultaneously', expectedResult:'All widgets update with filtered data at once, entity filter respects user access permissions' },
  // Reports
  { category:'Reports', subCategory:'Standard Reports', priority:'critical', testDescription:'Generate trial balance for a closed accounting period', expectedResult:'Debits equal credits, figures match GL, export to Excel and PDF functional, comparative period toggle works' },
  { category:'Reports', subCategory:'Standard Reports', priority:'high', testDescription:'Generate month-over-month P&L comparison report', expectedResult:'Current vs prior period columns correct, variance column accurate, export to Excel works with all formatting' },
  { category:'Reports', subCategory:'Standard Reports', priority:'critical', testDescription:'Generate balance sheet as of period-end date', expectedResult:'Assets = Liabilities + Equity, matches GL balances, entity-wise breakdown available, export functional' },
  { category:'Reports', subCategory:'Custom Reports', priority:'medium', testDescription:'Build a custom report using report builder with GL, entity, and date range filters', expectedResult:'Report generates data matching GL, save-report feature works, export to CSV and Excel functional' },
  { category:'Reports', subCategory:'Scheduled Reports', priority:'medium', testDescription:'Schedule a weekly summary report to be auto-emailed to finance stakeholders', expectedResult:'Report received in email at configured time, data matches on-demand report, recipient list is editable' },
  // Security
  { category:'Security', subCategory:'User Access', priority:'critical', testDescription:'Assign Finance Manager role and verify correct module-level access permissions', expectedResult:'User sees only permitted modules, restricted sections hidden from navigation, actions outside role blocked' },
  { category:'Security', subCategory:'User Access', priority:'critical', testDescription:'Verify entity-level restriction — user assigned to Entity A cannot view Entity B data', expectedResult:'All reports, dashboards, and transactions filtered to assigned entities only, cross-entity data invisible' },
  { category:'Security', subCategory:'Authentication', priority:'high', testDescription:'Verify SSO/Google login flow and session timeout enforcement', expectedResult:'Login redirects correctly, session established, timeout enforced, re-authentication required after session expires' },
  { category:'Security', subCategory:'Audit Trail', priority:'high', testDescription:'Make a data change and verify full audit log with user, timestamp, and before/after values', expectedResult:'Audit log shows user, action type, timestamp, old value, new value. Log is immutable and exportable to Excel' },
  // Integrations
  { category:'Integrations', subCategory:'ERP Sync', priority:'critical', testDescription:'Trigger ERP data sync and validate imported records against source system counts', expectedResult:'All records imported, row counts match source, error log available for failures, duplicates skipped with log entry' },
  { category:'Integrations', subCategory:'Banking', priority:'high', testDescription:'Connect bank account and import transactions via automated bank feed', expectedResult:'Transactions imported with correct dates/amounts, duplicates skipped, auto-categorisation rules applied, exceptions flagged' },
  { category:'Integrations', subCategory:'API & Webhooks', priority:'medium', testDescription:'Verify webhook fires on key events: invoice created, payment processed, PO approved', expectedResult:'Webhook payload received by external system within 30 seconds, payload schema matches API documentation' },
];

// ── Clients ───────────────────────────────────────────────────────────────────
app.get('/api/uat/clients', async (req, res) => { await _dbReady; res.json({ ok:true, data: uatDB().clients }); });
app.post('/api/uat/clients', async (req, res) => {
  await _dbReady; const u = uatDB();
  const { name, shortCode, primaryContact={}, internalLead='', entities=['Default'] } = req.body;
  if (!name) return res.status(400).json({ ok:false, error:'name required' });
  const token = require('crypto').randomBytes(24).toString('hex');
  const client = { id:uatId(), name, shortCode:shortCode||name.replace(/\s+/g,'').slice(0,5).toUpperCase(), primaryContact, internalLead, entities, status:'active', portalToken:token, createdAt:new Date().toISOString(), updatedAt:new Date().toISOString() };
  u.clients.push(client); uatLog('client_created',`Client "${name}" added`);
  await saveDB(db); res.json({ ok:true, data:client });
});
app.put('/api/uat/clients/:id', async (req, res) => {
  await _dbReady; const u = uatDB(); const c = u.clients.find(x=>x.id===req.params.id);
  if (!c) return res.status(404).json({ ok:false, error:'not found' });
  Object.assign(c, req.body, { id:c.id, portalToken:c.portalToken, updatedAt:new Date().toISOString() });
  await saveDB(db); res.json({ ok:true, data:c });
});
app.delete('/api/uat/clients/:id', async (req, res) => {
  await _dbReady; const u = uatDB(); const id=req.params.id;
  u.clients=u.clients.filter(x=>x.id!==id); u.projects=u.projects.filter(x=>x.clientId!==id);
  u.testcases=u.testcases.filter(x=>x.clientId!==id); u.issues=u.issues.filter(x=>x.clientId!==id);
  await saveDB(db); res.json({ ok:true });
});

// ── Projects ──────────────────────────────────────────────────────────────────
app.get('/api/uat/projects', async (req, res) => {
  await _dbReady; ensureACL();
  const email = (req.headers['x-user-email'] || '').toLowerCase().trim();
  const allowedIds = getAllowedUATProjectIds(email);
  let list = uatDB().projects;
  if (allowedIds !== null) list = list.filter(p => allowedIds.includes(p.id));
  if (req.query.clientId) list = list.filter(p => p.clientId === req.query.clientId);
  res.json({ ok:true, data:list });
});
app.post('/api/uat/projects', async (req, res) => {
  await _dbReady; const u = uatDB();
  const { clientId: rawClientId, clientName: rawClientName='', clientWebsite='', name, entity='', businessUnit='', goLiveDate='', description='', seedDefaults=false } = req.body;
  if (!name) return res.status(400).json({ ok:false, error:'Project name required' });
  let clientId = rawClientId || '';
  let clientName = rawClientName.trim();
  const website = clientWebsite.trim();
  if (!clientId && clientName) {
    let c = u.clients.find(x => x.name.toLowerCase() === clientName.toLowerCase());
    if (!c) { c = { id:uatId(), name:clientName, shortCode:clientName.slice(0,3).toUpperCase(), website, createdAt:new Date().toISOString() }; u.clients.push(c); }
    else { clientName = c.name; if (website) c.website = website; }
    clientId = c.id;
  } else if (clientId) {
    const c = u.clients.find(x => x.id === clientId);
    if (c) { clientName = c.name; if (website) c.website = website; }
  }
  const p = { id:uatId(), clientId, clientName, clientWebsite: website, name, entity, businessUnit, goLiveDate, description, phase:'uat', status:'active', uatRound:1, signoff:null, createdAt:new Date().toISOString(), updatedAt:new Date().toISOString() };
  u.projects.push(p);
  if (seedDefaults) {
    const tcs = UAT_DEFAULTS.map((d,i) => uatNewTC({ ...d, id:uatId(), projectId:p.id, clientId, seq:i+1 }));
    u.testcases.push(...tcs);
    uatLog('project_seeded', `"${name}" seeded with ${tcs.length} default test cases`, {projectId:p.id, clientId});
  } else {
    uatLog('project_created', `Project "${name}" created`, {projectId:p.id, clientId});
  }
  await saveDB(db); res.json({ ok:true, data:p });
});
app.put('/api/uat/projects/:id', async (req, res) => {
  await _dbReady; const u = uatDB(); const p=u.projects.find(x=>x.id===req.params.id);
  if (!p) return res.status(404).json({ ok:false, error:'not found' });
  if (req.body.clientName !== undefined) {
    const cn = req.body.clientName.trim();
    if (cn) {
      let c = u.clients.find(x => x.name.toLowerCase() === cn.toLowerCase());
      if (!c) { c = { id:uatId(), name:cn, shortCode:cn.slice(0,3).toUpperCase(), createdAt:new Date().toISOString() }; u.clients.push(c); }
      req.body.clientId = c.id; req.body.clientName = c.name;
    }
  }
  if (req.body.clientWebsite !== undefined) {
    const cid = req.body.clientId || p.clientId;
    const c = u.clients.find(x => x.id === cid);
    if (c) c.website = req.body.clientWebsite.trim();
  }
  Object.assign(p, req.body, { id:p.id, updatedAt:new Date().toISOString() });
  await saveDB(db); res.json({ ok:true, data:p });
});
app.post('/api/uat/projects/:id/seed', async (req, res) => {
  await _dbReady; const u = uatDB(); const p=u.projects.find(x=>x.id===req.params.id);
  if (!p) return res.status(404).json({ ok:false, error:'not found' });
  const existing = u.testcases.filter(t=>t.projectId===p.id).length;
  const start = existing + 1;
  const tcs = UAT_DEFAULTS.map((d,i) => uatNewTC({ ...d, id:uatId(), projectId:p.id, clientId:p.clientId, seq:start+i }));
  u.testcases.push(...tcs);
  uatLog('project_seeded', `Seeded ${tcs.length} default test cases into "${p.name}"`, {projectId:p.id});
  await saveDB(db); res.json({ ok:true, data:{ count:tcs.length } });
});
app.post('/api/uat/projects/:id/signoff', async (req, res) => {
  await _dbReady; const u = uatDB(); const p=u.projects.find(x=>x.id===req.params.id);
  if (!p) return res.status(404).json({ ok:false, error:'not found' });
  p.signoff={ status:req.body.approve?'approved':'rejected', signedBy:req.body.signedBy||'Client', comment:req.body.comment||'', signedAt:new Date().toISOString() };
  if (req.body.approve) p.phase='go_live';
  uatLog('signoff', `UAT ${p.signoff.status} for "${p.name}"`, {projectId:p.id, clientId:p.clientId});
  await saveDB(db); res.json({ ok:true, data:p });
});
// ── Test Cases ────────────────────────────────────────────────────────────────
app.get('/api/uat/testcases', async (req, res) => {
  await _dbReady; ensureACL();
  const email = (req.headers['x-user-email'] || '').toLowerCase().trim();
  const allowedIds = getAllowedUATProjectIds(email);
  let list = uatDB().testcases;
  if (allowedIds !== null) list = list.filter(t => allowedIds.includes(t.projectId));
  if (req.query.projectId) list=list.filter(t=>t.projectId===req.query.projectId);
  if (req.query.clientId)  list=list.filter(t=>t.clientId===req.query.clientId);
  if (req.query.category)  list=list.filter(t=>t.category===req.query.category);
  if (req.query.bStatus)   list=list.filter(t=>t.bluecopaStatus===req.query.bStatus);
  if (req.query.cStatus)   list=list.filter(t=>t.clientStatus===req.query.cStatus);
  if (req.query.q) { const ql=req.query.q.toLowerCase(); list=list.filter(t=>(t.testDescription||'').toLowerCase().includes(ql)||(t.subCategory||'').toLowerCase().includes(ql)||(t.category||'').toLowerCase().includes(ql)); }
  res.json({ ok:true, data:list });
});
app.post('/api/uat/testcases', async (req, res) => {
  await _dbReady; const u = uatDB();
  if (!req.body.projectId) return res.status(400).json({ ok:false, error:'projectId required' });
  const seq = u.testcases.filter(t=>t.projectId===req.body.projectId).length + 1;
  const tc = uatNewTC({ ...req.body, seq, id:uatId() });
  u.testcases.push(tc); await saveDB(db); res.json({ ok:true, data:tc });
});
app.put('/api/uat/testcases/:id', async (req, res) => {
  await _dbReady; const u = uatDB(); const tc=u.testcases.find(x=>x.id===req.params.id);
  if (!tc) return res.status(404).json({ ok:false, error:'not found' });
  const { bluecopaStatus, clientStatus, bluecopaComments, clientComments, attachments, ...rest } = req.body;
  if (bluecopaStatus !== undefined && tc.bluecopaStatus !== bluecopaStatus) {
    tc.bluecopaStatus = bluecopaStatus;
    uatLog('b_status', `Bluecopa: ${bluecopaStatus} on TC-${tc.seq}`, {projectId:tc.projectId});
  }
  if (clientStatus !== undefined && tc.clientStatus !== clientStatus) {
    tc.clientStatus = clientStatus;
    uatLog('c_status', `Client: ${clientStatus} on TC-${tc.seq}`, {projectId:tc.projectId});
  }
  if (bluecopaComments !== undefined) tc.bluecopaComments = bluecopaComments;
  if (clientComments   !== undefined) tc.clientComments   = clientComments;
  if (attachments      !== undefined) tc.attachments       = attachments;
  Object.assign(tc, rest, { id:tc.id, bluecopaStatus:tc.bluecopaStatus, clientStatus:tc.clientStatus, bluecopaComments:tc.bluecopaComments, clientComments:tc.clientComments, attachments:tc.attachments, updatedAt:new Date().toISOString() });
  await saveDB(db); res.json({ ok:true, data:tc });
});
app.delete('/api/uat/testcases/:id', async (req, res) => {
  await _dbReady; const u=uatDB(); u.testcases=u.testcases.filter(x=>x.id!==req.params.id);
  await saveDB(db); res.json({ ok:true });
});
app.post('/api/uat/testcases/bulk', async (req, res) => {
  await _dbReady; const u=uatDB(); const { ids=[], bluecopaStatus, clientStatus } = req.body;
  ids.forEach(id=>{ const t=u.testcases.find(x=>x.id===id); if(!t) return;
    if (bluecopaStatus) t.bluecopaStatus=bluecopaStatus;
    if (clientStatus)   t.clientStatus=clientStatus;
    t.updatedAt=new Date().toISOString();
  });
  await saveDB(db); res.json({ ok:true });
});
// Reorder test cases within a project
app.post('/api/uat/testcases/reorder', async (req, res) => {
  await _dbReady; const u=uatDB(); const { ids=[] } = req.body;
  ids.forEach((id,i)=>{ const t=u.testcases.find(x=>x.id===id); if(t) t.seq=i+1; });
  await saveDB(db); res.json({ ok:true });
});

// ── Issues ────────────────────────────────────────────────────────────────────
app.get('/api/uat/issues', async (req, res) => {
  await _dbReady; let list=uatDB().issues;
  if (req.query.projectId) list=list.filter(i=>i.projectId===req.query.projectId);
  if (req.query.clientId)  list=list.filter(i=>i.clientId===req.query.clientId);
  if (req.query.status)    list=list.filter(i=>i.status===req.query.status);
  res.json({ ok:true, data:list });
});
app.post('/api/uat/issues', async (req, res) => {
  await _dbReady; const u=uatDB();
  const { testCaseId, projectId, clientId, title, description='', severity='medium', assignedTo='', entity='' } = req.body;
  if (!title) return res.status(400).json({ ok:false, error:'title required' });
  const cnt=u.issues.filter(i=>i.projectId===projectId).length+1;
  const issue={ id:uatId(), testCaseId, projectId, clientId, ref:`ISS-${String(cnt).padStart(3,'0')}`, title, description, severity:(severity||'medium').toLowerCase(), status:'open', assignedTo, entity, resolution:'', createdAt:new Date().toISOString(), updatedAt:new Date().toISOString() };
  u.issues.push(issue);
  if (testCaseId) { const tc=u.testcases.find(x=>x.id===testCaseId); if(tc){tc.bluecopaStatus='blocked';tc.updatedAt=new Date().toISOString();} }
  uatLog('issue_opened', `Issue "${title}" raised`, {projectId, clientId});
  await saveDB(db); res.json({ ok:true, data:issue });
});
app.put('/api/uat/issues/:id', async (req, res) => {
  await _dbReady; const u=uatDB(); const issue=u.issues.find(x=>x.id===req.params.id);
  if (!issue) return res.status(404).json({ ok:false, error:'not found' });
  const now = new Date().toISOString();
  const { addUpdate, ...rest } = req.body;
  if (addUpdate && addUpdate.text) {
    if (!issue.updates) issue.updates = [];
    issue.updates.push({ text: addUpdate.text, author: addUpdate.author || 'Bluecopa', at: now });
  }
  if ((rest.status === 'resolved' || rest.status === 'solved') && !issue.resolvedAt) rest.resolvedAt = now;
  if (rest.severity) rest.severity = rest.severity.toLowerCase();
  Object.assign(issue, rest, { id:issue.id, updatedAt:now });
  await saveDB(db); res.json({ ok:true, data:issue });
});

// ── Dashboard ─────────────────────────────────────────────────────────────────
app.get('/api/uat/dashboard', async (req, res) => {
  await _dbReady; ensureACL(); const u=uatDB();
  const email = (req.headers['x-user-email'] || '').toLowerCase().trim();
  const allowedIds = getAllowedUATProjectIds(email);
  // Restrict dashboard to permitted projects so all stats recalculate correctly
  const permittedProjects = allowedIds !== null ? u.projects.filter(p => allowedIds.includes(p.id)) : u.projects;
  const permittedProjectIds = new Set(permittedProjects.map(p => p.id));
  const permittedTCs = u.testcases.filter(t => permittedProjectIds.has(t.projectId));
  const permittedIssues = u.issues.filter(i => permittedProjectIds.has(i.projectId));
  function projectStats(p) {
    const tc=u.testcases.filter(t=>t.projectId===p.id);
    const bPassed=tc.filter(t=>t.bluecopaStatus==='pass').length;
    const cPassed=tc.filter(t=>t.clientStatus==='pass').length;
    const blocked=tc.filter(t=>t.bluecopaStatus==='blocked'||t.clientStatus==='blocked').length;
    const byCategory={};
    tc.forEach(t=>{ if(!byCategory[t.category]) byCategory[t.category]={total:0,bPass:0,cPass:0,fail:0,blocked:0};
      byCategory[t.category].total++;
      if(t.bluecopaStatus==='pass') byCategory[t.category].bPass++;
      if(t.clientStatus==='pass') byCategory[t.category].cPass++;
      if(t.bluecopaStatus==='fail'||t.clientStatus==='fail') byCategory[t.category].fail++;
      if(t.bluecopaStatus==='blocked'||t.clientStatus==='blocked') byCategory[t.category].blocked++;
    });
    const client=u.clients.find(c=>c.id===p.clientId);
    const goLiveScore = tc.length ? Math.min(100, Math.round(((bPassed*0.6)+(cPassed*0.4))/tc.length*100)) : 0;
    return { ...p, clientName:client?.name||'', total:tc.length, bPassed, cPassed, failed:tc.filter(t=>t.bluecopaStatus==='fail'||t.clientStatus==='fail').length, blocked, goLiveScore, byCategory, openIssues:u.issues.filter(i=>i.projectId===p.id&&['open','in_progress'].includes(i.status)).length };
  }
  const allTCs=permittedTCs;
  const permittedClientIds = new Set(permittedProjects.map(p=>p.clientId));
  const stats={
    totalClients:u.clients.filter(c=>permittedClientIds.has(c.id)).length,
    activeProjects:permittedProjects.filter(p=>p.status==='active').length,
    totalTests:allTCs.length,
    bPassRate:allTCs.length?Math.round(allTCs.filter(t=>t.bluecopaStatus==='pass').length/allTCs.length*100):0,
    cPassRate:allTCs.length?Math.round(allTCs.filter(t=>t.clientStatus==='pass').length/allTCs.length*100):0,
    openIssues:permittedIssues.filter(i=>['open','in_progress'].includes(i.status)).length,
    criticalFails:allTCs.filter(t=>t.priority==='critical'&&(t.bluecopaStatus==='fail'||t.clientStatus==='fail')).length,
    projects: permittedProjects.map(projectStats),
    activity: u.activity.slice(0,30),
  };
  res.json({ ok:true, data:stats });
});

// ── Templates ─────────────────────────────────────────────────────────────────
app.get('/api/uat/templates', async (req, res) => { await _dbReady; res.json({ ok:true, data:uatDB().templates }); });
app.post('/api/uat/templates', async (req, res) => {
  await _dbReady; const u=uatDB(); const { name, sourceProjectId } = req.body;
  const p=u.projects.find(x=>x.id===sourceProjectId); const c=p?u.clients.find(x=>x.id===p.clientId):null;
  const tcs=u.testcases.filter(t=>t.projectId===sourceProjectId).map(t=>({ category:t.category, subCategory:t.subCategory, testDescription:t.testDescription, expectedResult:t.expectedResult, priority:t.priority, owner:t.owner, tags:t.tags||[] }));
  const categories=[...new Set(tcs.map(t=>t.category).filter(Boolean))];
  const tmpl={ id:uatId(), name, sourceProjectId, sourceClientName:c?.name||'', categories, testcases:tcs, count:tcs.length, createdAt:new Date().toISOString() };
  u.templates.push(tmpl); await saveDB(db); res.json({ ok:true, data:tmpl });
});
app.post('/api/uat/templates/:id/clone', async (req, res) => {
  await _dbReady; const u=uatDB(); const tmpl=u.templates.find(x=>x.id===req.params.id);
  if (!tmpl) return res.status(404).json({ ok:false, error:'not found' });
  const { projectId, clientId } = req.body;
  const start=u.testcases.filter(t=>t.projectId===projectId).length;
  const cloned=tmpl.testcases.map((t,i)=>uatNewTC({...t,id:uatId(),projectId,clientId:clientId||'',seq:start+i+1}));
  u.testcases.push(...cloned); await saveDB(db); res.json({ ok:true, data:{ count:cloned.length } });
});

// ── Repository ────────────────────────────────────────────────────────────────
app.get('/api/uat/repository', async (req, res) => {
  await _dbReady; const u=uatDB(); const { q='', category='', priority='' } = req.query;
  let tcs=u.testcases.filter(t=>t.bluecopaStatus==='pass'||t.clientStatus==='pass'); // only proven test cases
  if (category)  tcs=tcs.filter(t=>t.category===category);
  if (priority)  tcs=tcs.filter(t=>t.priority===priority);
  if (q) { const ql=q.toLowerCase(); tcs=tcs.filter(t=>(t.testDescription||'').toLowerCase().includes(ql)||(t.subCategory||'').toLowerCase().includes(ql)||(t.category||'').toLowerCase().includes(ql)); }
  const enriched=tcs.slice(0,200).map(t=>{ const p=u.projects.find(x=>x.id===t.projectId); const c=u.clients.find(x=>x.id===t.clientId); return {category:t.category,subCategory:t.subCategory,testDescription:t.testDescription,expectedResult:t.expectedResult,priority:t.priority,projectName:p?.name||'',clientName:c?.name||'',bluecopaStatus:t.bluecopaStatus,clientStatus:t.clientStatus}; });
  res.json({ ok:true, data:enriched });
});

// ── Export ────────────────────────────────────────────────────────────────────
app.get('/api/uat/export/:projectId', async (req, res) => {
  await _dbReady; const u=uatDB();
  const tcs=u.testcases.filter(t=>t.projectId===req.params.projectId).sort((a,b)=>a.seq-b.seq);
  const p=u.projects.find(x=>x.id===req.params.projectId);
  const headers=['#','Category','Sub-Category','Test Description','Expected Result','Priority','Owner','Bluecopa Status','Client Status','Bluecopa Comments','Client Comments','Last Updated'];
  const rows=tcs.map(t=>[t.seq,t.category,t.subCategory,t.testDescription,t.expectedResult,t.priority,t.owner,t.bluecopaStatus,t.clientStatus,t.bluecopaComments,t.clientComments,t.updatedAt]);
  const csv=[headers,...rows].map(r=>r.map(v=>`"${String(v||'').replace(/"/g,'""')}"`).join(',')).join('\n');
  res.setHeader('Content-Type','text/csv');
  res.setHeader('Content-Disposition',`attachment; filename="UAT_${(p?.name||'export').replace(/[^a-zA-Z0-9]/g,'_')}.csv"`);
  res.send(csv);
});

// ── Client Portal ─────────────────────────────────────────────────────────────
app.post('/api/uat/portal/generate', async (req, res) => {
  await _dbReady; const u=uatDB(); const c=u.clients.find(x=>x.id===req.body.clientId);
  if (!c) return res.status(404).json({ ok:false, error:'not found' });
  c.portalToken=require('crypto').randomBytes(24).toString('hex');
  await saveDB(db); res.json({ ok:true, token:c.portalToken });
});
// JSON data for portal (used by AJAX)
app.get('/api/uat/portal/:token', async (req, res) => {
  await _dbReady; const u=uatDB(); const c=u.clients.find(x=>x.portalToken===req.params.token);
  if (!c) return res.status(404).json({ ok:false, error:'invalid link' });
  const projects=u.projects.filter(p=>p.clientId===c.id).map(p=>{
    const tc=u.testcases.filter(t=>t.projectId===p.id).sort((a,b)=>a.seq-b.seq);
    const total=tc.length, cPass=tc.filter(t=>t.clientStatus==='pass').length;
    const categories=[...new Set(tc.map(t=>t.category))];
    return {...p,testcases:tc,total,cPassed:cPass,cPassRate:total?Math.round(cPass/total*100):0,categories,entities:p.entities||[]};
  });
  const issues=u.issues.filter(i=>i.clientId===c.id);
  res.json({ ok:true, data:{ client:{id:c.id,name:c.name,shortCode:c.shortCode}, projects, issues } });
});
app.put('/api/uat/portal/:token/issue/:id', async (req, res) => {
  await _dbReady; const u=uatDB(); const c=u.clients.find(x=>x.portalToken===req.params.token);
  if (!c) return res.status(403).json({ ok:false, error:'invalid token' });
  const issue=u.issues.find(x=>x.id===req.params.id&&x.clientId===c.id);
  if (!issue) return res.status(404).json({ ok:false, error:'not found' });
  const { clientVerdict } = req.body;
  const now=new Date().toISOString();
  if (!issue.updates) issue.updates=[];
  if (clientVerdict==='solved') {
    issue.status='solved';
    issue.updates.push({ text:'Client confirmed: issue resolved and retested successfully.', author:'Client', at:now });
    uatLog('issue_solved',`Issue ${issue.ref} confirmed resolved by client`,{projectId:issue.projectId,clientId:c.id});
  } else if (clientVerdict==='reopen') {
    issue.status='open';
    issue.updates.push({ text:'Client retested and confirmed: issue is still present. Reopened.', author:'Client', at:now });
    uatLog('issue_reopened',`Issue ${issue.ref} reopened by client`,{projectId:issue.projectId,clientId:c.id});
  }
  issue.updatedAt=now;
  await saveDB(db); res.json({ ok:true, data:issue });
});
// Client updates their own status/comments via portal
app.put('/api/uat/portal/:token/tc/:id', async (req, res) => {
  await _dbReady; const u=uatDB(); const c=u.clients.find(x=>x.portalToken===req.params.token);
  if (!c) return res.status(403).json({ ok:false, error:'invalid token' });
  const tc=u.testcases.find(x=>x.id===req.params.id&&x.clientId===c.id);
  if (!tc) return res.status(404).json({ ok:false, error:'not found' });
  const { clientStatus, clientComments, attachments, entity } = req.body;
  if (entity) {
    if (!tc.entityStatuses) tc.entityStatuses = {};
    if (!tc.entityStatuses[entity]) tc.entityStatuses[entity] = {};
    if (clientStatus   !== undefined) { tc.entityStatuses[entity].clientStatus=clientStatus; uatLog('c_status',`Client[${entity}]: ${clientStatus} on TC-${tc.seq}`,{projectId:tc.projectId,clientId:c.id}); }
    if (clientComments !== undefined) tc.entityStatuses[entity].clientComments=clientComments;
  } else {
    if (clientStatus   !== undefined) { tc.clientStatus=clientStatus; uatLog('c_status',`Client: ${clientStatus} on TC-${tc.seq}`,{projectId:tc.projectId,clientId:c.id}); }
    if (clientComments !== undefined) tc.clientComments=clientComments;
  }
  if (attachments !== undefined) tc.attachments=attachments;
  tc.updatedAt=new Date().toISOString();
  await saveDB(db); res.json({ ok:true, data:tc });
});

// ── Client Portal HTML (standalone page) ─────────────────────────────────────
app.get('/uat/portal/:token', async (req, res) => {
  await _dbReady; const u=uatDB(); const c=u.clients.find(x=>x.portalToken===req.params.token);
  if (!c) return res.status(404).send('<h2>Invalid or expired portal link</h2>');
  const token=req.params.token;
  res.setHeader('Content-Type','text/html');
  res.send(`<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>UAT Portal — ${c.name}</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'DM Sans',system-ui,sans-serif;background:#f1f2f5;color:#0d1117;font-size:14px}
.topbar{background:#fff;border-bottom:1px solid #e4e6ea;padding:0 20px;height:56px;display:flex;align-items:center;gap:10px;position:sticky;top:0;z-index:20}
.logo{font-size:15px;font-weight:800;color:#0d1117;letter-spacing:-.3px;flex-shrink:0}.logo span{color:#c9a227}
.client-chip{background:#f4f5f7;border:1px solid #e4e6ea;border-radius:6px;padding:3px 10px;font-size:12px;color:#6b7280;font-weight:600;flex-shrink:0}
.proj-sel{flex:1;display:flex;align-items:center;gap:6px;font-size:12px;color:#9ca3af;min-width:0}
.proj-sel select{border:1px solid #e4e6ea;border-radius:6px;padding:4px 10px;font-size:13px;font-weight:600;color:#0d1117;background:#fff;cursor:pointer;font-family:inherit;max-width:200px}
.it-btn{display:flex;align-items:center;gap:6px;padding:7px 14px;background:#0d1117;color:#fff;border:none;border-radius:8px;font-size:13px;font-weight:700;cursor:pointer;transition:all .15s;flex-shrink:0;font-family:inherit}
.it-btn:hover{background:#1a1d27}
.it-dot{width:8px;height:8px;border-radius:50%;background:#dc2626;display:none}
.it-dot.show{display:inline-block}
.main{max-width:1100px;margin:0 auto;padding:20px 16px}
.entity-tabs{display:none;gap:6px;flex-wrap:wrap;margin-bottom:16px}
.ent-tab{padding:6px 14px;border:1px solid #e4e6ea;border-radius:99px;font-size:12px;font-weight:600;background:#fff;cursor:pointer;color:#6b7280;transition:all .15s;font-family:inherit}
.ent-tab.active{background:#0d1117;color:#fff;border-color:#0d1117}
.nav-tabs{display:flex;gap:0;margin-bottom:24px;border-bottom:2px solid #e4e6ea}
.nav-tab{padding:10px 20px;font-size:13px;font-weight:700;color:#6b7280;background:none;border:none;cursor:pointer;border-bottom:2px solid transparent;margin-bottom:-2px;transition:all .15s;font-family:inherit;display:flex;align-items:center;gap:6px}
.nav-tab.active{color:#0d1117;border-bottom-color:#c9a227}
.nav-tab:hover:not(.active){color:#374151}
.badge-count{background:#e4e6ea;color:#374151;border-radius:99px;padding:1px 7px;font-size:11px;font-weight:700}
.tab-panel{display:none}.tab-panel.active{display:block}
.dash-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:12px;margin-bottom:20px}
.stat-card{background:#fff;border:1px solid #e4e6ea;border-radius:12px;padding:14px 18px}
.stat-card .val{font-size:26px;font-weight:800;line-height:1}.stat-card .lbl{font-size:11px;color:#6b7280;font-weight:600;text-transform:uppercase;letter-spacing:.5px;margin-top:4px}
.stat-card.green .val{color:#15803d}.stat-card.red .val{color:#dc2626}.stat-card.amber .val{color:#a16207}.stat-card.blue .val{color:#1d4ed8}
.prog-card{background:#fff;border:1px solid #e4e6ea;border-radius:12px;padding:16px 20px;margin-bottom:20px}
.prog-card-title{font-size:12px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:.5px;margin-bottom:10px}
.prog-bar-bg{background:#f1f2f5;border-radius:99px;height:10px;overflow:hidden;margin-bottom:6px}
.prog-bar-fill{height:100%;border-radius:99px;background:#22c55e;transition:width .5s}
.prog-pct{font-size:22px;font-weight:800;color:#15803d}
.table-wrap{background:#fff;border:1px solid #e4e6ea;border-radius:12px;overflow:hidden}
table{width:100%;border-collapse:collapse}
th{background:#f8f9fa;font-size:11px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:.5px;padding:10px 14px;border-bottom:1px solid #e4e6ea;text-align:left;white-space:nowrap}
td{padding:12px 14px;border-bottom:1px solid #f1f2f5;vertical-align:top;font-size:13px}
tr:last-child td{border-bottom:none}tr:hover td{background:#fafafa}
.cat-badge{display:inline-block;padding:2px 8px;border-radius:6px;font-size:11px;font-weight:700;font-family:monospace;background:#f4f5f7;color:#374151}
.status-cell{position:relative}
.status-pill{display:inline-flex;align-items:center;gap:5px;padding:3px 10px;border-radius:99px;font-size:11px;font-weight:700;border:none;cursor:pointer;transition:all .15s;white-space:nowrap;font-family:inherit}
.status-pill:hover{filter:brightness(.93)}
.s-not_tested{background:#f1f2f5;color:#6b7280}.s-in_progress{background:#dbeafe;color:#1d4ed8}.s-pass{background:#dcfce7;color:#15803d}.s-fail{background:#fee2e2;color:#dc2626}.s-blocked{background:#fef3c7;color:#b45309}
.status-dd{position:absolute;top:calc(100% + 4px);left:0;z-index:50;background:#fff;border:1px solid #e4e6ea;border-radius:8px;box-shadow:0 8px 24px rgba(0,0,0,.12);padding:4px;min-width:140px;display:none}
.status-dd.open{display:block}
.status-dd button{display:flex;align-items:center;gap:8px;width:100%;padding:7px 12px;border:none;background:none;cursor:pointer;font-size:12px;font-weight:600;border-radius:6px;color:#0d1117;text-align:left;font-family:inherit}
.status-dd button:hover{background:#f4f5f7}
.comment-area{width:100%;border:1px solid #e4e6ea;border-radius:6px;padding:8px;font-size:12px;font-family:inherit;resize:vertical;min-height:60px;color:#0d1117}
.comment-area:focus{outline:2px solid rgba(201,162,39,.4);border-color:#c9a227}
.save-btn{margin-top:6px;padding:5px 12px;background:#0d1117;color:#fff;border:none;border-radius:6px;font-size:12px;font-weight:700;cursor:pointer;font-family:inherit}
#issueTrackerView{display:none}
.it-header{display:flex;align-items:center;gap:14px;margin-bottom:24px}
.it-back-btn{display:flex;align-items:center;gap:6px;padding:7px 14px;background:#fff;color:#374151;border:1px solid #e4e6ea;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;transition:all .15s;font-family:inherit}
.it-back-btn:hover{border-color:#0d1117;color:#0d1117}
.it-page-title{font-size:20px;font-weight:800;color:#0d1117}
.it-page-sub{font-size:13px;color:#6b7280;margin-top:2px}
.entity-card-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:16px;margin-top:8px}
.entity-card{background:#fff;border:1px solid #e4e6ea;border-radius:14px;padding:20px 22px;cursor:pointer;transition:all .2s;position:relative;overflow:hidden}
.entity-card:hover{transform:translateY(-3px);box-shadow:0 8px 24px rgba(0,0,0,.10);border-color:#c9a227}
.entity-card>*{pointer-events:none}
.entity-card-accent{position:absolute;top:0;left:0;right:0;height:4px;border-radius:14px 14px 0 0;background:#e4e6ea}
.entity-card-accent.has-open{background:#dc2626}
.entity-card-accent.has-pending{background:#c9a227}
.entity-card-accent.all-solved{background:#22c55e}
.entity-card-icon{font-size:28px;margin-bottom:10px}
.entity-card-name{font-size:15px;font-weight:800;color:#0d1117;margin-bottom:6px}
.entity-card-stats{display:flex;gap:8px;flex-wrap:wrap}
.entity-stat{font-size:12px;font-weight:600;padding:2px 8px;border-radius:5px}
.entity-stat.open{background:#fef2f2;color:#dc2626}
.entity-stat.pending{background:#fffbeb;color:#a16207}
.entity-stat.solved{background:#f0fdf4;color:#15803d}
.entity-stat.none{background:#f4f5f7;color:#6b7280}
.it-issue-header{display:flex;align-items:center;gap:12px;margin-bottom:20px;flex-wrap:wrap}
.it-entity-label{font-size:18px;font-weight:800;color:#0d1117}
.it-issue-count{font-size:13px;color:#6b7280;font-weight:500}
.issue-card{background:#fff;border:1px solid #e4e6ea;border-radius:12px;padding:18px 20px;margin-bottom:12px}
.issue-card.open{border-left:4px solid #dc2626}.issue-card.in_progress{border-left:4px solid #6366f1}.issue-card.resolved{border-left:4px solid #c9a227}.issue-card.solved{border-left:4px solid #22c55e}
.issue-ref{font-size:11px;font-family:monospace;font-weight:700;color:#9ca3af;margin-bottom:4px}
.issue-title{font-size:15px;font-weight:700;color:#0d1117;margin-bottom:8px;line-height:1.4}
.issue-meta{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:8px}
.issue-badge{font-size:11px;font-weight:700;padding:2px 9px;border-radius:5px}
.issue-badge.open{background:#fef2f2;color:#dc2626}.issue-badge.in_progress{background:#eef2ff;color:#6366f1}.issue-badge.resolved{background:#fffbeb;color:#c9a227}.issue-badge.solved{background:#f0fdf4;color:#15803d}
.issue-eta{background:#fffbeb;border:1px solid rgba(201,162,39,.3);border-radius:6px;padding:7px 12px;font-size:12px;color:#374151;font-weight:600;margin:8px 0;display:inline-flex;align-items:center;gap:6px}
.issue-timeline{margin-top:14px;border-top:1px solid #f1f2f5;padding-top:14px}
.issue-tl-head{font-size:10px;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:.5px;margin-bottom:10px}
.issue-upd-row{display:flex;gap:10px;margin-bottom:10px}
.issue-upd-av{width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;flex-shrink:0}
.issue-upd-av.b{background:#e0f2fe;color:#0369a1}.issue-upd-av.c{background:#f0fdf4;color:#15803d}
.issue-upd-body{flex:1}
.issue-upd-meta{font-size:11px;margin-bottom:4px}
.issue-upd-name{font-weight:700;color:#374151}.issue-upd-time{color:#9ca3af;margin-left:6px}
.issue-upd-text{font-size:13px;color:#374151;line-height:1.5;background:#f8f9fa;border-radius:6px;padding:8px 10px}
.issue-confirm{background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:14px 16px;margin-top:14px}
.issue-confirm-label{font-size:12px;font-weight:700;color:#92400e;margin-bottom:4px}
.issue-confirm-desc{font-size:12px;color:#78350f;margin-bottom:12px;line-height:1.5}
.issue-confirm-btns{display:flex;gap:8px;flex-wrap:wrap}
.issue-cfm-btn{padding:8px 16px;border-radius:7px;font-size:12px;font-weight:700;cursor:pointer;border:none;font-family:inherit;transition:all .15s}
.issue-cfm-btn.yes{background:#15803d;color:#fff}.issue-cfm-btn.yes:hover{background:#166534}
.issue-cfm-btn.no{background:#fff;color:#dc2626;border:1px solid #dc2626}.issue-cfm-btn.no:hover{background:#fef2f2}
.empty-state{padding:48px;text-align:center;color:#6b7280;font-size:14px}
.toast{position:fixed;bottom:24px;right:24px;background:#0d1117;color:#fff;padding:10px 18px;border-radius:8px;font-size:13px;font-weight:600;z-index:100;opacity:0;transform:translateY(8px);transition:all .25s;pointer-events:none}
.toast.show{opacity:1;transform:translateY(0)}
@media(max-width:768px){th:nth-child(5),td:nth-child(5),th:nth-child(6),td:nth-child(6){display:none}.dash-grid{grid-template-columns:repeat(2,1fr)}.entity-card-grid{grid-template-columns:1fr 1fr}}
</style></head><body>
<div class="topbar">
  <div class="logo">Blue<span>copa</span></div>
  <div class="client-chip">${c.name}</div>
  <div class="proj-sel">Project: <select id="projSelect" onchange="selectProject(this.value)"></select></div>
  <button class="it-btn" onclick="openIssueTracker()"><span class="it-dot" id="itDot"></span>Issue Tracker</button>
</div>
<div id="signoffView" class="main">
  <div class="entity-tabs" id="entityTabs"></div>
  <div class="nav-tabs">
    <button class="nav-tab active" onclick="switchTab('overview',this)">Overview</button>
    <button class="nav-tab" onclick="switchTab('testcases',this)">Test Cases <span class="badge-count" id="tcBadge">0</span></button>
  </div>
  <div id="tab-overview" class="tab-panel active">
    <div class="dash-grid" id="dashStats"></div>
    <div class="prog-card">
      <div class="prog-card-title">Overall Pass Rate</div>
      <div style="display:flex;align-items:center;gap:16px">
        <div class="prog-pct" id="dashPct">0%</div>
        <div style="flex:1"><div class="prog-bar-bg"><div class="prog-bar-fill" id="dashBar" style="width:0%"></div></div></div>
      </div>
    </div>
  </div>
  <div id="tab-testcases" class="tab-panel">
    <div class="table-wrap"><table><thead><tr>
      <th>#</th><th>Category</th><th>Test Description</th><th>Expected Result</th>
      <th>Bluecopa Status</th><th>Bluecopa Notes</th><th>Your Status</th><th>Your Notes</th>
    </tr></thead><tbody id="tcBody"></tbody></table></div>
  </div>
</div>
<div id="issueTrackerView" class="main">
  <div class="it-header">
    <button class="it-back-btn" onclick="closeIssueTracker()">&#8592; Back to Sign-off</button>
    <div>
      <div class="it-page-title" id="itTitle">Issue Tracker</div>
      <div class="it-page-sub" id="itSub">Select an entity to view its issues</div>
    </div>
  </div>
  <div id="itEntityGrid"></div>
  <div id="itIssueView" style="display:none">
    <div class="it-issue-header">
      <button class="it-back-btn" onclick="backToEntityGrid()">&#8592; Back</button>
      <div class="it-entity-label" id="itEntityLabel"></div>
      <div class="it-issue-count" id="itIssueCount"></div>
    </div>
    <div id="itIssueList"></div>
  </div>
</div>
<div class="toast" id="toast"></div>
<script>
const TOKEN='${token}';
let data=null,curProject=null,curTab='overview',curEntity='',itEntity=null;
const SL={'not_tested':'Not Tested','in_progress':'In Progress','pass':'Pass','fail':'Fail','blocked':'Blocked'};
const SC={'not_tested':'s-not_tested','in_progress':'s-in_progress','pass':'s-pass','fail':'s-fail','blocked':'s-blocked'};
const STA_IT={open:'Open',in_progress:'In Progress',resolved:'Resolved — Pending Retest',solved:'Solved'};
const SEV_C={critical:'#dc2626',high:'#ea580c',medium:'#c9a227',low:'#6b7280'};

function toast(m){const e=document.getElementById('toast');e.textContent=m;e.classList.add('show');setTimeout(function(){e.classList.remove('show');},2400);}
function esc(s){const d=document.createElement('div');d.textContent=s||'';return d.innerHTML;}
function isoDate(s){if(!s)return '';return new Date(s).toLocaleString('en-GB',{day:'numeric',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'});}

function switchTab(tab,btn){
  curTab=tab;
  document.querySelectorAll('.nav-tab').forEach(function(b){b.classList.remove('active');});
  btn.classList.add('active');
  document.querySelectorAll('.tab-panel').forEach(function(p){p.classList.remove('active');});
  document.getElementById('tab-'+tab).classList.add('active');
}

async function load(){
  const r=await fetch('/api/uat/portal/'+TOKEN);
  if(!r.ok)return;
  data=(await r.json()).data;
  const sel=document.getElementById('projSelect');
  sel.innerHTML=data.projects.map(p=>\`<option value="\${p.id}">\${p.name}</option>\`).join('');
  if(data.projects.length) selectProject(data.projects[0].id);
}

function selectProject(id){
  curProject=data.projects.find(p=>p.id===id);
  curEntity='';
  document.getElementById('projSelect').value=id;
  renderEntityTabs();renderOverview();renderTable();updateItDot();
}

function selectEntity(e){
  curEntity=e;
  document.querySelectorAll('.ent-tab').forEach(function(b){b.classList.toggle('active',b.dataset.e===e);});
  renderOverview();renderTable();
}

function renderEntityTabs(){
  const entities=curProject.entities||[];
  const el=document.getElementById('entityTabs');
  if(!entities.length){el.style.display='none';return;}
  el.style.display='flex';
  el.innerHTML='<button class="ent-tab active" data-e="" onclick="selectEntity(this.dataset.e)">All</button>'+
    entities.map(function(e){return '<button class="ent-tab" data-e="'+esc(e)+'" onclick="selectEntity(this.dataset.e)">'+esc(e)+'</button>';}).join('');
}

function renderOverview(){
  const p=curProject;
  const tcs=curEntity?p.testcases.filter(t=>t.entityStatuses&&t.entityStatuses[curEntity]!==undefined):p.testcases;
  const cst=function(t){return curEntity?(t.entityStatuses&&t.entityStatuses[curEntity]&&t.entityStatuses[curEntity].clientStatus||'not_tested'):t.clientStatus||'not_tested';};
  const total=tcs.length,pass=tcs.filter(function(t){return cst(t)==='pass';}).length,
    fail=tcs.filter(function(t){return cst(t)==='fail';}).length,
    blocked=tcs.filter(function(t){return cst(t)==='blocked';}).length,
    pending=tcs.filter(function(t){return cst(t)==='not_tested'||cst(t)==='in_progress';}).length;
  const pct=total?Math.round(pass/total*100):0;
  document.getElementById('dashStats').innerHTML=
    '<div class="stat-card"><div class="val">'+total+'</div><div class="lbl">Total Tests</div></div>'+
    '<div class="stat-card green"><div class="val">'+pass+'</div><div class="lbl">Passed</div></div>'+
    '<div class="stat-card red"><div class="val">'+fail+'</div><div class="lbl">Failed</div></div>'+
    '<div class="stat-card amber"><div class="val">'+blocked+'</div><div class="lbl">Blocked</div></div>'+
    '<div class="stat-card blue"><div class="val">'+pending+'</div><div class="lbl">Pending</div></div>';
  document.getElementById('dashPct').textContent=pct+'%';
  document.getElementById('dashBar').style.width=pct+'%';
  document.getElementById('tcBadge').textContent=total;
}

function renderTable(){
  const allTcs=curProject.testcases;
  const tcs=curEntity?allTcs.filter(function(t){return t.entityStatuses&&t.entityStatuses[curEntity]!==undefined;}):allTcs;
  if(!tcs.length){document.getElementById('tcBody').innerHTML='<tr><td colspan="8" class="empty-state">'+(curEntity?'No test cases for '+esc(curEntity)+'.':'No test cases found.')+'</td></tr>';return;}
  document.getElementById('tcBody').innerHTML=tcs.map(function(tc){
    const es=curEntity&&tc.entityStatuses&&tc.entityStatuses[curEntity]?tc.entityStatuses[curEntity]:{};
    const cStatus=curEntity?(es.clientStatus||'not_tested'):(tc.clientStatus||'not_tested');
    const cComment=curEntity?(es.clientComments||''):(tc.clientComments||'');
    const bStatus=curEntity?(es.bluecopaStatus||tc.bluecopaStatus||'not_tested'):(tc.bluecopaStatus||'not_tested');
    const bComment=curEntity?(es.bluecopaComments||tc.bluecopaComments||''):(tc.bluecopaComments||'');
    return '<tr id="row_'+tc.id+'">'+
      '<td><span style="color:#6b7280;font-size:12px;font-weight:600">'+tc.seq+'</span></td>'+
      '<td><span class="cat-badge">'+esc(tc.category)+'</span><div style="font-size:11px;color:#6b7280;margin-top:3px">'+esc(tc.subCategory||'')+'</div></td>'+
      '<td style="max-width:240px"><div style="font-weight:600;line-height:1.4">'+esc(tc.testDescription)+'</div></td>'+
      '<td style="max-width:180px;color:#6b7280;font-size:12px;line-height:1.4">'+esc(tc.expectedResult)+'</td>'+
      '<td><span class="status-pill '+(SC[bStatus]||'s-not_tested')+'">'+(SL[bStatus]||'Not Tested')+'</span></td>'+
      '<td style="color:#374151;font-size:12px;line-height:1.5;max-width:180px">'+(bComment?esc(bComment):'<span style="color:#d1d5db">&mdash;</span>')+'</td>'+
      '<td class="status-cell">'+
        '<button class="status-pill '+(SC[cStatus]||'s-not_tested')+'" data-id="'+tc.id+'" onclick="toggleDD(this.dataset.id,event)">'+(SL[cStatus]||'Not Tested')+' &#9662;</button>'+
        '<div class="status-dd" id="dd_'+tc.id+'">'+
          Object.entries(SL).map(function(kv){return '<button data-id="'+tc.id+'" data-s="'+kv[0]+'" onclick="setStatus(this.dataset.id,this.dataset.s)">'+kv[1]+'</button>';}).join('')+
        '</div>'+
      '</td>'+
      '<td style="min-width:160px">'+
        '<textarea class="comment-area" id="cmt_'+tc.id+'" placeholder="+ Add note">'+esc(cComment)+'</textarea>'+
        '<button class="save-btn" data-id="'+tc.id+'" onclick="saveComment(this.dataset.id)">Save</button>'+
      '</td>'+
    '</tr>';
  }).join('');
}

function updateItDot(){
  const issues=(data.issues||[]).filter(function(i){return i.projectId===curProject.id;});
  const hasAction=issues.some(function(i){return i.status==='open'||i.status==='in_progress'||i.status==='resolved';});
  document.getElementById('itDot').classList.toggle('show',hasAction);
}

function openIssueTracker(){
  document.getElementById('signoffView').style.display='none';
  document.getElementById('issueTrackerView').style.display='block';
  itEntity=null;
  document.getElementById('itIssueView').style.display='none';
  document.getElementById('itEntityGrid').style.display='block';
  document.getElementById('itTitle').textContent='Issue Tracker';
  document.getElementById('itSub').textContent='Select an entity to view its issues';
  renderEntityGrid();
}

function closeIssueTracker(){
  document.getElementById('issueTrackerView').style.display='none';
  document.getElementById('signoffView').style.display='block';
}

function renderEntityGrid(){
  const issues=(data.issues||[]).filter(function(i){return i.projectId===curProject.id;});
  const entities=curProject.entities||[];

  function accentCls(open,pending,solved,total){
    if(open)return 'has-open';
    if(pending)return 'has-pending';
    if(solved&&solved===total&&total>0)return 'all-solved';
    return '';
  }
  function statsHtml(open,pending,solved,total){
    const s=[];
    if(open)s.push('<span class="entity-stat open">'+open+' open</span>');
    if(pending)s.push('<span class="entity-stat pending">'+pending+' pending retest</span>');
    if(solved)s.push('<span class="entity-stat solved">'+solved+' solved</span>');
    if(!total)s.push('<span class="entity-stat none">No issues</span>');
    return s.join('');
  }

  const allOpen=issues.filter(function(i){return i.status==='open'||i.status==='in_progress';}).length;
  const allPending=issues.filter(function(i){return i.status==='resolved';}).length;
  const allSolved=issues.filter(function(i){return i.status==='solved';}).length;

  let html='<div class="entity-card-grid">';
  html+='<div class="entity-card" data-entity="__all__" onclick="openEntityIssues(this)">'+
    '<div class="entity-card-accent '+accentCls(allOpen,allPending,allSolved,issues.length)+'"></div>'+
    '<div class="entity-card-icon">&#128203;</div>'+
    '<div class="entity-card-name">All Entities</div>'+
    '<div class="entity-card-stats">'+statsHtml(allOpen,allPending,allSolved,issues.length)+'</div>'+
    '</div>';

  entities.forEach(function(e){
    const ei=issues.filter(function(i){return i.entity===e;});
    const open=ei.filter(function(i){return i.status==='open'||i.status==='in_progress';}).length;
    const pending=ei.filter(function(i){return i.status==='resolved';}).length;
    const solved=ei.filter(function(i){return i.status==='solved';}).length;
    html+='<div class="entity-card" data-entity="'+esc(e)+'" onclick="openEntityIssues(this)">'+
      '<div class="entity-card-accent '+accentCls(open,pending,solved,ei.length)+'"></div>'+
      '<div class="entity-card-icon">&#127970;</div>'+
      '<div class="entity-card-name">'+esc(e)+'</div>'+
      '<div class="entity-card-stats">'+statsHtml(open,pending,solved,ei.length)+'</div>'+
      '</div>';
  });
  html+='</div>';
  document.getElementById('itEntityGrid').innerHTML=html;
}

function openEntityIssues(el){
  const raw=el.dataset.entity;
  itEntity=raw==='__all__'?null:raw;
  document.getElementById('itEntityGrid').style.display='none';
  document.getElementById('itIssueView').style.display='block';
  const label=itEntity===null?'All Entities':itEntity;
  document.getElementById('itEntityLabel').textContent=label;
  document.getElementById('itTitle').textContent='Issue Tracker — '+label;
  document.getElementById('itSub').textContent='';
  renderItIssues();
}

function backToEntityGrid(){
  itEntity=null;
  document.getElementById('itIssueView').style.display='none';
  document.getElementById('itEntityGrid').style.display='block';
  document.getElementById('itTitle').textContent='Issue Tracker';
  document.getElementById('itSub').textContent='Select an entity to view its issues';
}

function renderItIssues(){
  const allIssues=(data.issues||[]).filter(function(i){return i.projectId===curProject.id;});
  const issues=itEntity===null?allIssues:allIssues.filter(function(i){return i.entity===itEntity;});
  const el=document.getElementById('itIssueList');
  document.getElementById('itIssueCount').textContent=issues.length+' issue'+(issues.length!==1?'s':'');
  if(!issues.length){el.innerHTML='<div class="empty-state">No issues'+(itEntity?' for '+esc(itEntity):'')+' yet.</div>';return;}
  el.innerHTML=issues.map(function(i){
    const sev=SEV_C[(i.severity||'').toLowerCase()]||'#6b7280';
    const etaHtml=i.eta?'<div class="issue-eta">&#128197; Expected fix: <strong>'+new Date(i.eta+'T00:00:00').toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric'})+'</strong></div>':'';
    const upds=i.updates||[];
    const tlHtml=upds.length?'<div class="issue-timeline"><div class="issue-tl-head">Updates from Bluecopa</div>'+
      upds.map(function(u){
        const isC=u.author==='Client';
        return '<div class="issue-upd-row">'+
          '<div class="issue-upd-av '+(isC?'c':'b')+'">'+(isC?'C':'B')+'</div>'+
          '<div class="issue-upd-body">'+
            '<div class="issue-upd-meta"><span class="issue-upd-name">'+esc(u.author)+'</span><span class="issue-upd-time">'+isoDate(u.at)+'</span></div>'+
            '<div class="issue-upd-text">'+esc(u.text)+'</div>'+
          '</div></div>';
      }).join('')+'</div>':'';
    let action='';
    if(i.status==='resolved'){
      action='<div class="issue-confirm">'+
        '<div class="issue-confirm-label">&#9200; Action Required — Please Retest</div>'+
        '<div class="issue-confirm-desc">Bluecopa has marked this resolved. Please retest and confirm.</div>'+
        '<div class="issue-confirm-btns">'+
          '<button class="issue-cfm-btn yes" data-id="'+i.id+'" data-v="solved" onclick="confirmIssue(this.dataset.id,this.dataset.v)">&#10003; Confirmed Fixed</button>'+
          '<button class="issue-cfm-btn no" data-id="'+i.id+'" data-v="reopen" onclick="confirmIssue(this.dataset.id,this.dataset.v)">&#10007; Still Not Working</button>'+
        '</div></div>';
    } else if(i.status==='solved'){
      action='<div style="font-size:12px;font-weight:700;color:#15803d;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:6px;padding:8px 12px;margin-top:12px">&#10003; You confirmed this issue is resolved</div>';
    }
    const entityTag=i.entity?'<span style="font-size:11px;font-weight:600;color:#6366f1;background:#eef2ff;border-radius:5px;padding:2px 8px">'+esc(i.entity)+'</span>':'';
    return '<div class="issue-card '+(i.status||'open')+'">'+
      '<div class="issue-ref">'+esc(i.ref)+' &middot; Raised '+isoDate(i.createdAt)+'</div>'+
      '<div class="issue-title">'+esc(i.title)+'</div>'+
      '<div class="issue-meta">'+
        '<span class="issue-badge '+(i.status||'open')+'">'+(STA_IT[i.status]||'Open')+'</span>'+
        '<span style="font-size:11px;font-weight:700;color:'+sev+'">'+esc(i.severity||'Medium')+'</span>'+
        entityTag+
      '</div>'+
      etaHtml+tlHtml+action+
    '</div>';
  }).join('');
}

async function confirmIssue(issueId,verdict){
  try{
    const r=await fetch('/api/uat/portal/'+TOKEN+'/issue/'+issueId,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({clientVerdict:verdict})});
    const j=await r.json();
    if(j.ok){
      const idx=(data.issues||[]).findIndex(function(i){return i.id===issueId;});
      if(idx>=0)data.issues[idx]=j.data;
      updateItDot();renderItIssues();renderEntityGrid();
      toast(verdict==='solved'?'Issue marked resolved!':'Issue reopened.');
    } else { toast('Failed to update.'); }
  }catch(e){toast('Network error.');}
}

function toggleDD(id,e){
  e.stopPropagation();
  document.querySelectorAll('.status-dd').forEach(function(d){if(d.id!=='dd_'+id)d.classList.remove('open');});
  document.getElementById('dd_'+id).classList.toggle('open');
}
document.addEventListener('click',function(){document.querySelectorAll('.status-dd').forEach(function(d){d.classList.remove('open');});});

async function setStatus(tcId,status){
  document.getElementById('dd_'+tcId).classList.remove('open');
  const tc=curProject.testcases.find(function(t){return t.id===tcId;});
  const body={clientStatus:status};
  if(curEntity){
    body.entity=curEntity;
    if(!tc.entityStatuses)tc.entityStatuses={};
    if(!tc.entityStatuses[curEntity])tc.entityStatuses[curEntity]={};
    tc.entityStatuses[curEntity].clientStatus=status;
  } else { tc.clientStatus=status; }
  const r=await fetch('/api/uat/portal/'+TOKEN+'/tc/'+tcId,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
  if(r.ok){
    renderOverview();
    const row=document.getElementById('row_'+tcId);
    if(row){const pill=row.querySelector('.status-cell .status-pill');pill.className='status-pill '+(SC[status]||'s-not_tested');pill.innerHTML=(SL[status]||'Not Tested')+' &#9662;';}
    toast('Status updated');
  } else { toast('Failed to save'); }
}

async function saveComment(tcId){
  const text=document.getElementById('cmt_'+tcId).value;
  const tc=curProject.testcases.find(function(t){return t.id===tcId;});
  const body={clientComments:text};
  if(curEntity){
    body.entity=curEntity;
    if(!tc.entityStatuses)tc.entityStatuses={};
    if(!tc.entityStatuses[curEntity])tc.entityStatuses[curEntity]={};
    tc.entityStatuses[curEntity].clientComments=text;
  } else { tc.clientComments=text; }
  const r=await fetch('/api/uat/portal/'+TOKEN+'/tc/'+tcId,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
  if(r.ok)toast('Note saved');else toast('Failed to save');
}

load();
</script></body></html>`);
});

// ── Entity Rename ─────────────────────────────────────────────────────────────
app.post('/api/uat/projects/:id/rename-entity', async (req, res) => {
  await _dbReady; const u=uatDB(); const p=u.projects.find(x=>x.id===req.params.id);
  if (!p) return res.status(404).json({ ok:false, error:'not found' });
  const { oldName, newName } = req.body;
  if (!oldName||!newName||oldName===newName) return res.status(400).json({ ok:false, error:'invalid names' });
  const idx=(p.entities||[]).indexOf(oldName);
  if (idx===-1) return res.status(404).json({ ok:false, error:'entity not found' });
  p.entities[idx]=newName;
  u.testcases.filter(t=>t.projectId===p.id).forEach(tc=>{
    if (tc.entityStatuses&&tc.entityStatuses[oldName]) {
      tc.entityStatuses[newName]=tc.entityStatuses[oldName];
      delete tc.entityStatuses[oldName];
      tc.updatedAt=new Date().toISOString();
    }
  });
  p.updatedAt=new Date().toISOString();
  await saveDB(db); res.json({ ok:true, data:p });
});

// ── Project-level Client Portal ───────────────────────────────────────────────
app.post('/api/uat/projects/:id/generate-portal', async (req, res) => {
  await _dbReady; const u=uatDB(); const p=u.projects.find(x=>x.id===req.params.id);
  if (!p) return res.status(404).json({ ok:false, error:'not found' });
  if (!p.portalToken) {
    p.portalToken=require('crypto').randomBytes(24).toString('hex');
    p.updatedAt=new Date().toISOString();
    await saveDB(db);
  }
  res.json({ ok:true, token:p.portalToken });
});

app.post('/api/uat/projects/:id/regenerate-portal', async (req, res) => {
  await _dbReady; const u=uatDB(); const p=u.projects.find(x=>x.id===req.params.id);
  if (!p) return res.status(404).json({ ok:false, error:'not found' });
  p.portalToken=require('crypto').randomBytes(24).toString('hex');
  p.updatedAt=new Date().toISOString();
  await saveDB(db); res.json({ ok:true, token:p.portalToken });
});

app.get('/api/portal/:token', async (req, res) => {
  await _dbReady; const u=uatDB();
  const p=u.projects.find(x=>x.portalToken===req.params.token);
  if (!p) return res.status(404).json({ ok:false, error:'invalid link' });
  const client=u.clients.find(x=>x.id===p.clientId);
  const entity=req.query.entity||'';
  const testcases=u.testcases.filter(t=>t.projectId===p.id).sort((a,b)=>a.seq-b.seq);
  const entityList=p.entities||[];
  function aggStatus(arr){
    if(arr.includes('fail'))return 'fail';
    if(arr.includes('blocked'))return 'blocked';
    if(arr.includes('in_progress'))return 'in_progress';
    if(arr.some(s=>s==='pass'))return 'pass';
    return 'not_tested';
  }
  const tcs=testcases.map(tc=>{
    let clientStatus,clientComments,bluecopaStatus,bluecopaComments;
    if (entity&&tc.entityStatuses) {
      const es=tc.entityStatuses[entity]||{};
      clientStatus=es.clientStatus||'not_tested'; clientComments=es.clientComments||'';
      bluecopaStatus=es.bluecopaStatus||tc.bluecopaStatus||'not_tested';
      bluecopaComments=es.bluecopaComments||tc.bluecopaComments||'';
    } else if (!entity&&entityList.length>0) {
      // Aggregate across all entities that have interacted with this TC
      const es=tc.entityStatuses||{};
      const bArr=entityList.map(e=>(es[e]?.bluecopaStatus)||'not_tested');
      const cArr=entityList.map(e=>(es[e]?.clientStatus)||'not_tested');
      bluecopaStatus=aggStatus(bArr);
      clientStatus=aggStatus(cArr);
      bluecopaComments=''; clientComments='';
    } else {
      clientStatus=tc.clientStatus||'not_tested'; clientComments=tc.clientComments||'';
      bluecopaStatus=tc.bluecopaStatus||'not_tested';
      bluecopaComments=tc.bluecopaComments||'';
    }
    return { id:tc.id, seq:tc.seq,
      category:tc.category||tc.processArea||'',
      subCategory:tc.subCategory||tc.module||'',
      testDescription:tc.testDescription||tc.testScenario||'',
      expectedResult:tc.expectedResult||'',
      priority:tc.priority||'medium', clientStatus, clientComments,
      bluecopaStatus, bluecopaComments,
      procedure:tc.procedure||null };
  });
  // Compute per-entity-TC pair aggregate for All tab (client perspective)
  let entityAggregate=null;
  if (!entity&&entityList.length>0) {
    let total=0,pass=0,fail=0,blocked=0,inProg=0;
    testcases.forEach(tc=>{
      const es=tc.entityStatuses||{};
      entityList.forEach(e=>{
        total++;
        const st=(es[e]?.clientStatus)||'not_tested';
        if(st==='pass')pass++;
        else if(st==='fail')fail++;
        else if(st==='blocked')blocked++;
        else if(st==='in_progress')inProg++;
      });
    });
    entityAggregate={total,pass,fail,blocked,inProgress:inProg,pending:total-pass-fail-blocked-inProg};
  }
  const issues=u.issues.filter(i=>i.projectId===p.id);
  res.json({ ok:true, data:{
    project:{ id:p.id, name:p.name, description:p.description||'', phase:p.phase,
      goLiveDate:p.goLiveDate, clientLabel:p.clientLabel||'Client',
      clientWebsite:p.clientWebsite||'' },
    client:client?{ id:client.id, name:client.name, website:client.website||'' }:{ id:'', name:'Client', website:'' },
    entity:entity||null, entities:p.entities||[], testcases:tcs,
    entityAggregate,
    signoff:((p.entitySignoffs||{})[entity||''])||null,
    allEntitySignoffs:p.entitySignoffs||{},
    bluecopaSignoff:((p.bluecopaEntitySignoffs||{})[entity||''])||null,
    issues,
  }});
});
app.put('/api/portal/:token/issue/:id', async (req, res) => {
  await _dbReady; const u=uatDB();
  const p=u.projects.find(x=>x.portalToken===req.params.token);
  if (!p) return res.status(403).json({ ok:false, error:'invalid token' });
  const issue=u.issues.find(x=>x.id===req.params.id&&x.projectId===p.id);
  if (!issue) return res.status(404).json({ ok:false, error:'not found' });
  const { clientVerdict }=req.body;
  const now=new Date().toISOString();
  if (!issue.updates) issue.updates=[];
  if (clientVerdict==='solved') {
    issue.status='solved';
    issue.updates.push({ text:'Client confirmed: issue resolved and retested successfully.', author:'Client', at:now });
    uatLog('issue_solved',`Issue ${issue.ref} confirmed resolved by client`,{projectId:p.id,clientId:p.clientId});
  } else if (clientVerdict==='reopen') {
    issue.status='open';
    issue.updates.push({ text:'Client retested and confirmed: issue is still present. Reopened.', author:'Client', at:now });
    uatLog('issue_reopened',`Issue ${issue.ref} reopened by client`,{projectId:p.id,clientId:p.clientId});
  }
  issue.updatedAt=now;
  await saveDB(db); res.json({ ok:true, data:issue });
});

app.put('/api/uat/projects/:id/entity-signoff', async (req, res) => {
  await _dbReady; const u=uatDB(); const p=u.projects.find(x=>x.id===req.params.id);
  if (!p) return res.status(404).json({ ok:false, error:'not found' });
  const { name, role, date, entity }=req.body;
  if (!name||!name.trim()) return res.status(400).json({ ok:false, error:'name required' });
  const signoff={ name:name.trim(), role:(role||'').trim(), date:date||new Date().toISOString().slice(0,10), signedAt:new Date().toISOString() };
  if (!p.bluecopaEntitySignoffs) p.bluecopaEntitySignoffs={};
  p.bluecopaEntitySignoffs[entity||'']=signoff;
  p.updatedAt=new Date().toISOString();
  await saveDB(db); res.json({ ok:true, signoff });
});

app.put('/api/portal/:token/signoff', async (req, res) => {
  await _dbReady; const u=uatDB();
  const p=u.projects.find(x=>x.portalToken===req.params.token);
  if (!p) return res.status(403).json({ ok:false, error:'invalid token' });
  const { name, role, date, entity }=req.body;
  if (!name||!name.trim()) return res.status(400).json({ ok:false, error:'name required' });
  const signoff={ name:name.trim(), role:(role||'').trim(), date:date||new Date().toISOString().slice(0,10), signedAt:new Date().toISOString() };
  if (!p.entitySignoffs) p.entitySignoffs={};
  p.entitySignoffs[entity||'']=signoff;
  p.updatedAt=new Date().toISOString();
  await saveDB(db); res.json({ ok:true, signoff });
});

app.put('/api/portal/:token/tc/:id', async (req, res) => {
  await _dbReady; const u=uatDB();
  const p=u.projects.find(x=>x.portalToken===req.params.token);
  if (!p) return res.status(403).json({ ok:false, error:'invalid token' });
  const tc=u.testcases.find(x=>x.id===req.params.id&&x.projectId===p.id);
  if (!tc) return res.status(404).json({ ok:false, error:'not found' });
  const { clientStatus, clientComments, entity }=req.body;
  const prevStatus = entity ? (tc.entityStatuses?.[entity]?.clientStatus||'not_tested') : (tc.clientStatus||'not_tested');
  if (entity) {
    if (!tc.entityStatuses) tc.entityStatuses={};
    if (!tc.entityStatuses[entity]) tc.entityStatuses[entity]={};
    if (clientStatus!==undefined) tc.entityStatuses[entity].clientStatus=clientStatus;
    if (clientComments!==undefined) tc.entityStatuses[entity].clientComments=clientComments;
  } else {
    if (clientStatus!==undefined) tc.clientStatus=clientStatus;
    if (clientComments!==undefined) tc.clientComments=clientComments;
  }
  // Auto-create UAT issue when client marks fail with a comment (first time only)
  const newStatus = clientStatus !== undefined ? clientStatus : prevStatus;
  const newComment = clientComments !== undefined ? clientComments : (entity ? (tc.entityStatuses?.[entity]?.clientComments||'') : (tc.clientComments||''));
  if (newStatus === 'fail' && newComment && prevStatus !== 'fail') {
    if (!u.issues) u.issues = [];
    const alreadyExists = u.issues.find(i=>i.testCaseId===tc.id&&i.source==='client_portal'&&i.status==='open');
    if (!alreadyExists) {
      const cnt = u.issues.filter(i=>i.projectId===p.id).length + 1;
      const sevMap = { critical:'Critical', high:'High', medium:'Medium', low:'Low' };
      u.issues.push({ id:uatId(), testCaseId:tc.id, projectId:p.id, clientId:p.clientId,
        ref:`ISS-${String(cnt).padStart(3,'0')}`, source:'client_portal',
        title:`TC-${tc.seq} Fail: ${(tc.testDescription||tc.testScenario||'').slice(0,60)}`,
        description:newComment, severity:sevMap[tc.priority||'medium']||'Medium',
        status:'open', assignedTo:'', resolution:'',
        createdAt:new Date().toISOString(), updatedAt:new Date().toISOString() });
      uatLog('issue_opened', `Client flagged TC-${tc.seq} as failed`, {projectId:p.id, clientId:p.clientId});
    }
  }
  tc.updatedAt=new Date().toISOString();
  await saveDB(db); res.json({ ok:true });
});

// ══ EWS — EARLY WARNING SYSTEM ═══════════════════════════════════════════════

function ewsDB() {
  if (!db.ews) db.ews = { ewsList:[], nextEwsId:1, activity:[] };
  return db.ews;
}

function ewsUid() { return 'ews_'+Date.now()+'_'+Math.random().toString(36).slice(2,7); }
function escHtmlServer(s) { return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

// ── EWS email helpers ─────────────────────────────────────────────────────
const EWS_DEFAULT_RECIPIENT = 'azhar.m@bluecopa.com';
function ewsRecipients(ews) {
  return [...new Set([...(ews.stakeholders||[]), EWS_DEFAULT_RECIPIENT].filter(Boolean))].join(', ');
}
function _ewsStatusMeta(s) {
  const m = { ews_raised:{label:'EWS Raised',bg:'#fef2f2',color:'#dc2626'}, plan_defined:{label:'Plan Defined',bg:'#fffbeb',color:'#d97706'}, leadership_engaged:{label:'Leadership Engaged',bg:'#faf5ff',color:'#7c3aed'}, in_review:{label:'In Review',bg:'#eff6ff',color:'#2563eb'}, resolved:{label:'Resolved',bg:'#f0fdf4',color:'#16a34a'}, closed:{label:'Closed',bg:'#f9fafb',color:'#6b7280'} };
  return m[s] || { label:s, bg:'#f9fafb', color:'#6b7280' };
}
const _EWS_EVENT_CFG = {
  created:            { subj:'[EWS Raised]',    banner:'#fef2f2', bdr:'#dc2626', title:'⚠ New Early Warning Raised',       msg:'This EWS requires immediate attention. Please review the details and ensure the right people are engaged.' },
  plan_defined:       { subj:'[EWS Update]',     banner:'#fffbeb', bdr:'#d97706', title:'📋 Mitigation Plan Defined',        msg:'A mitigation plan has been defined. Please review, provide feedback, and support the owner in executing it.' },
  leadership_engaged: { subj:'[EWS Escalated]',  banner:'#faf5ff', bdr:'#7c3aed', title:'🔺 Escalated to Leadership',        msg:'This issue has been escalated for leadership oversight. Senior stakeholders should review and provide direction.' },
  in_review:          { subj:'[EWS In Review]',  banner:'#eff6ff', bdr:'#2563eb', title:'🔍 Under Active Review',            msg:'This EWS is under active review. Please ensure action items are progressing and share any relevant updates.' },
  resolved:           { subj:'[EWS Resolved]',   banner:'#f0fdf4', bdr:'#16a34a', title:'✅ EWS Resolved',                  msg:'The risk has been successfully mitigated. Please review the resolution details and confirm closure criteria are met.' },
  closed:             { subj:'[EWS Closed]',     banner:'#f9fafb', bdr:'#6b7280', title:'✓ EWS Closed',                    msg:'This EWS has been formally closed. No further action is required. Thank you for your contribution.' },
  update:             { subj:'[EWS Update]',     banner:'#f0f9ff', bdr:'#0ea5e9', title:'💬 Progress Update',               msg:'A new update has been posted. Please review and respond if any action is needed from your side.' },
  decision:           { subj:'[EWS Decision]',   banner:'#faf5ff', bdr:'#7c3aed', title:'⚖ Decision Recorded',             msg:'A key decision has been made on this EWS. Please review and align your actions accordingly.' },
  review:             { subj:'[EWS Review]',     banner:'#f0fdf4', bdr:'#14b8a6', title:'📋 Review Notes Added',            msg:'Review notes have been posted. Please read through and provide any feedback or follow-up actions.' },
  action_assigned:    { subj:'[EWS Action]',     banner:'#fffbeb', bdr:'#d97706', title:'✅ Action Item Assigned',          msg:'An action item has been assigned. Timely completion of action items is critical to resolving this EWS.' },
};
function buildEwsEmail(ews, event, details) {
  const h = escHtmlServer, sm = _ewsStatusMeta(ews.status), cfg = _EWS_EVENT_CFG[event] || _EWS_EVENT_CFG.update;
  const raisedDate = ews.raisedAt ? new Date(ews.raisedAt).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'}) : '—';
  const triggerLabel = (ews.triggerType||'').replace(/_/g,' ').replace(/\b\w/g,c=>c.toUpperCase());
  const sevColor = {critical:'#dc2626',high:'#d97706',medium:'#2563eb',low:'#16a34a'}[ews.severity]||'#6b7280';
  let detailHtml = '';
  if (event === 'created') {
    if (ews.description)    detailHtml += `<div style="margin-top:20px"><div style="font-weight:700;color:#374151;font-size:11px;text-transform:uppercase;letter-spacing:.8px;margin-bottom:6px">Risk Description</div><div style="color:#374151;font-size:13px;line-height:1.7">${h(ews.description)}</div></div>`;
    if (ews.rootCause)      detailHtml += `<div style="margin-top:12px"><div style="font-weight:700;color:#374151;font-size:11px;text-transform:uppercase;letter-spacing:.8px;margin-bottom:6px">Root Cause</div><div style="color:#374151;font-size:13px;line-height:1.7">${h(ews.rootCause)}</div></div>`;
    if (ews.correctivePlan) detailHtml += `<div style="margin-top:12px"><div style="font-weight:700;color:#374151;font-size:11px;text-transform:uppercase;letter-spacing:.8px;margin-bottom:6px">Corrective Plan</div><div style="color:#374151;font-size:13px;line-height:1.7">${h(ews.correctivePlan)}</div></div>`;
  } else if (details.oldStatus) {
    const om = _ewsStatusMeta(details.oldStatus), nm = _ewsStatusMeta(details.newStatus);
    detailHtml = `<div style="margin-top:20px;padding:14px 16px;background:#f9fafb;border:1px solid #e5e7eb;border-radius:6px"><div style="font-weight:700;color:#6b7280;font-size:11px;text-transform:uppercase;letter-spacing:.8px;margin-bottom:10px">Status Progression</div><span style="background:${om.bg};color:${om.color};padding:4px 12px;border-radius:99px;font-size:12px;font-weight:700">${h(om.label)}</span><span style="color:#9ca3af;margin:0 10px;font-size:15px">→</span><span style="background:${nm.bg};color:${nm.color};padding:4px 12px;border-radius:99px;font-size:12px;font-weight:700">${h(nm.label)}</span></div>`;
  } else if (details.updateText) {
    detailHtml = `<div style="margin-top:20px;padding:16px;background:#f9fafb;border:1px solid #e5e7eb;border-radius:6px"><div style="font-weight:700;color:#374151;font-size:11px;text-transform:uppercase;letter-spacing:.8px;margin-bottom:8px">Update</div><div style="color:#0d1117;font-size:14px;line-height:1.7">${h(details.updateText)}</div>${details.author?`<div style="color:#9ca3af;font-size:11px;margin-top:6px">— ${h(details.author)}</div>`:''}</div>`;
  } else if (details.actionTitle) {
    detailHtml = `<div style="margin-top:20px;padding:16px;background:#fffbeb;border:1px solid #fcd34d;border-radius:6px"><div style="font-weight:700;color:#92400e;font-size:11px;text-transform:uppercase;letter-spacing:.8px;margin-bottom:8px">Action Item</div><div style="color:#0d1117;font-size:14px;font-weight:600">${h(details.actionTitle)}</div>${details.actionAssignee?`<div style="color:#6b7280;font-size:13px;margin-top:4px">Assigned to: <strong>${h(details.actionAssignee)}</strong></div>`:''} ${details.actionDue?`<div style="color:#6b7280;font-size:13px;margin-top:2px">Due: <strong>${h(details.actionDue)}</strong></div>`:''}</div>`;
  }
  const recent = (ews.updates||[]).slice(0,3);
  let activityHtml = '';
  if (recent.length) {
    const rows = recent.map(u => { const icon={decision:'⚖',review:'📋',status_change:'🔄',created:'🚀'}[u.type]||'💬'; const dt=new Date(u.at).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'}); return `<tr><td style="padding:6px 0;vertical-align:top;width:20px;color:#9ca3af">${icon}</td><td style="padding:6px 0 6px 10px;vertical-align:top"><span style="color:#374151;font-size:13px">${h(u.text)}</span><br><span style="color:#9ca3af;font-size:11px">${h(u.author||'System')} · ${dt}</span></td></tr>`; }).join('');
    activityHtml = `<div style="margin-top:24px"><div style="font-weight:700;color:#374151;font-size:11px;text-transform:uppercase;letter-spacing:.8px;padding-bottom:8px;border-bottom:1px solid #e5e7eb;margin-bottom:4px">Recent Activity</div><table style="width:100%;border-collapse:collapse">${rows}</table></div>`;
  }
  const subject = `${cfg.subj} ${ews.ref}: ${ews.title}`;
  const html = `<div style="font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;max-width:600px;margin:0 auto;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden"><div style="background:#1a1d27;padding:20px 32px"><div style="color:#c9a227;font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase;margin-bottom:4px">Bluecopa · Delivery Wikipedia</div><div style="color:#f0f0f6;font-size:17px;font-weight:700">Early Warning System</div></div><div style="background:${cfg.banner};border-left:4px solid ${cfg.bdr};padding:14px 32px"><div style="color:${cfg.bdr};font-weight:700;font-size:13px">${cfg.title}</div><div style="color:#374151;font-size:13px;margin-top:3px">${cfg.msg}</div></div><div style="padding:24px 32px;background:#ffffff"><div style="color:#9ca3af;font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase">${h(ews.ref)} · ${h(triggerLabel)}</div><div style="color:#0d1117;font-size:19px;font-weight:700;margin-top:6px;line-height:1.35">${h(ews.title)}</div><div style="color:#6b7280;font-size:13px;margin-top:4px">${h(ews.projectName||'—')} · ${h(ews.clientName||'—')}</div><div style="margin-top:10px"><span style="background:${sm.bg};color:${sm.color};padding:4px 12px;border-radius:99px;font-size:11px;font-weight:700">${sm.label}</span><span style="background:${sevColor}22;color:${sevColor};padding:4px 12px;border-radius:99px;font-size:11px;font-weight:700;margin-left:6px;text-transform:capitalize">${h(ews.severity)}</span></div><table style="width:100%;border-collapse:collapse;margin-top:18px;border:1px solid #e5e7eb"><tr><td style="padding:9px 14px;background:#f9fafb;border-bottom:1px solid #e5e7eb;font-weight:700;color:#6b7280;font-size:11px;text-transform:uppercase;letter-spacing:.5px;width:105px">Project</td><td style="padding:9px 14px;border-bottom:1px solid #e5e7eb;color:#0d1117;font-size:13px;border-left:1px solid #e5e7eb">${h(ews.projectName||'—')}</td><td style="padding:9px 14px;background:#f9fafb;border-bottom:1px solid #e5e7eb;font-weight:700;color:#6b7280;font-size:11px;text-transform:uppercase;letter-spacing:.5px;border-left:1px solid #e5e7eb;width:105px">Client</td><td style="padding:9px 14px;border-bottom:1px solid #e5e7eb;color:#0d1117;font-size:13px;border-left:1px solid #e5e7eb">${h(ews.clientName||'—')}</td></tr><tr><td style="padding:9px 14px;background:#f9fafb;border-bottom:1px solid #e5e7eb;font-weight:700;color:#6b7280;font-size:11px;text-transform:uppercase;letter-spacing:.5px">Owner</td><td style="padding:9px 14px;border-bottom:1px solid #e5e7eb;color:#0d1117;font-size:13px;border-left:1px solid #e5e7eb">${h(ews.internalOwner||'—')}</td><td style="padding:9px 14px;background:#f9fafb;border-bottom:1px solid #e5e7eb;font-weight:700;color:#6b7280;font-size:11px;text-transform:uppercase;letter-spacing:.5px;border-left:1px solid #e5e7eb">Due Date</td><td style="padding:9px 14px;border-bottom:1px solid #e5e7eb;color:#0d1117;font-size:13px;border-left:1px solid #e5e7eb">${h(ews.targetResolutionDate||'Not set')}</td></tr><tr><td style="padding:9px 14px;background:#f9fafb;font-weight:700;color:#6b7280;font-size:11px;text-transform:uppercase;letter-spacing:.5px">Raised By</td><td style="padding:9px 14px;color:#0d1117;font-size:13px;border-left:1px solid #e5e7eb">${h(ews.raisedBy||'—')}</td><td style="padding:9px 14px;background:#f9fafb;font-weight:700;color:#6b7280;font-size:11px;text-transform:uppercase;letter-spacing:.5px;border-left:1px solid #e5e7eb">Raised On</td><td style="padding:9px 14px;color:#0d1117;font-size:13px;border-left:1px solid #e5e7eb">${h(raisedDate)}</td></tr></table>${detailHtml}${activityHtml}</div><div style="background:#f9fafb;border-top:1px solid #e5e7eb;padding:14px 32px"><div style="color:#9ca3af;font-size:11px">Automated notification from <strong>Delivery Wikipedia · EWS</strong> &nbsp;·&nbsp; delivery.wiki@bluecopa.com &nbsp;·&nbsp; Do not reply.</div></div></div>`;
  const text = `${cfg.title}\n${ews.ref}: ${ews.title}\nStatus: ${sm.label} | Severity: ${ews.severity}\nProject: ${ews.projectName||'—'} · Client: ${ews.clientName||'—'}\nOwner: ${ews.internalOwner||'—'} | Due: ${ews.targetResolutionDate||'Not set'}\n\n${cfg.msg}\n${details.updateText||details.actionTitle||''}\n\n— Delivery Wikipedia EWS · delivery.wiki@bluecopa.com`;
  return { subject, html, text };
}
function notifyEws(ews, event, details={}) {
  const to = ewsRecipients(ews);
  if (!to) return;
  const { subject, html, text } = buildEwsEmail(ews, event, details);
  setImmediate(async () => { try { await sendEmail({ to, subject, html, text }); } catch(e) { console.warn('[EWS notify]', event, e.message); } });
}
// ─────────────────────────────────────────────────────────────────────────────

function ewsLog(type, msg, meta={}) {
  const u = ewsDB();
  u.activity.unshift({ type, msg, at:new Date().toISOString(), ...meta });
  if (u.activity.length > 200) u.activity.length = 200;
}

// GET all EWS (with optional query filters) — filtered by ACL
app.get('/api/ews', async (req, res) => {
  await _dbReady; ensureACL();
  const email = (req.headers['x-user-email'] || '').toLowerCase().trim();
  const allowedIds = getAllowedEWSIds(email);
  let list = ewsDB().ewsList;
  if (allowedIds !== null) list = list.filter(e => allowedIds.includes(e.id));
  if (req.query.clientId)    list = list.filter(e => e.clientId    === req.query.clientId);
  if (req.query.projectId)   list = list.filter(e => e.projectId   === req.query.projectId);
  if (req.query.severity)    list = list.filter(e => e.severity    === req.query.severity);
  if (req.query.status)      list = list.filter(e => e.status      === req.query.status);
  if (req.query.triggerType) list = list.filter(e => e.triggerType === req.query.triggerType);
  res.json({ ok:true, data:list });
});

// GET single EWS — filtered by ACL
app.get('/api/ews/:id', async (req, res) => {
  await _dbReady; ensureACL();
  const email = (req.headers['x-user-email'] || '').toLowerCase().trim();
  const allowedIds = getAllowedEWSIds(email);
  const e = ewsDB().ewsList.find(x => x.id === req.params.id);
  if (!e) return res.status(404).json({ ok:false, error:'not found' });
  if (allowedIds !== null && !allowedIds.includes(e.id)) return res.status(403).json({ ok:false, error:'Access denied' });
  res.json({ ok:true, data:e });
});

// POST create EWS
app.post('/api/ews', async (req, res) => {
  await _dbReady;
  const u = ewsDB();
  const { title, projectName='', clientName='',
    triggerType='emerging_risk', severity='medium', likelihood='possible',
    description='', rootCause='', currentImpact='', potentialImpact='',
    businessImpact='', correctivePlan='', internalOwner='', clientContact='',
    targetResolutionDate='', reviewFrequency='biweekly', raisedBy='',
    stakeholders=[], meetLink='' } = req.body;
  if (!title || !title.trim()) return res.status(400).json({ ok:false, error:'title required' });
  const now = new Date().toISOString();
  const svMap = { critical:4, high:3, medium:2, low:1 };
  const lkMap = { certain:4, likely:3, possible:2, unlikely:1 };
  const rs = (svMap[severity]||2) * (lkMap[likelihood]||2);
  const seq = u.nextEwsId++;
  const ews = {
    id: ewsUid(), ref: `EWS-${String(seq).padStart(3,'0')}`,
    title: title.trim(), projectName, clientName,
    triggerType, severity, likelihood, riskScore: rs,
    description, rootCause, currentImpact, potentialImpact,
    businessImpact, correctivePlan, internalOwner, clientContact,
    targetResolutionDate, reviewFrequency,
    stakeholders: Array.isArray(stakeholders) ? stakeholders : [],
    meetLink,
    status: 'ews_raised', escalationLevel: 'team', raisedBy,
    actionItems: [], updates: [],
    calendarInviteSent: false, calendarInviteSentAt: null,
    detectedAt: now, raisedAt: now, resolvedAt: null, closedAt: null,
    nextReviewDate: '', lastReviewDate: '', createdAt: now, updatedAt: now,
  };
  ews.updates.push({ id:ewsUid(), text:`EWS raised${description?' — '+description.slice(0,80):''}`, author:raisedBy||'System', type:'created', at:now });
  u.ewsList.unshift(ews);
  ewsLog('ews_raised', `EWS "${title}" raised`, { ewsId:ews.id, projectName, clientName });
  await saveDB(db);
  res.json({ ok:true, data:ews });
  notifyEws(ews, 'created', {});
});

// PUT update EWS (status, fields, and/or inline update)
app.put('/api/ews/:id', async (req, res) => {
  await _dbReady;
  const u = ewsDB();
  const ews = u.ewsList.find(x => x.id === req.params.id);
  if (!ews) return res.status(404).json({ ok:false, error:'not found' });
  const now = new Date().toISOString();
  const { addUpdate, ...rest } = req.body;
  // Inline update entry
  if (addUpdate && addUpdate.text) {
    ews.updates.unshift({ id:ewsUid(), text:addUpdate.text, author:addUpdate.author||'System', type:addUpdate.type||'update', at:now });
  }
  // Status change
  if (rest.status && rest.status !== ews.status) {
    if (rest.status === 'resolved' && !ews.resolvedAt) rest.resolvedAt = now;
    if (rest.status === 'closed'   && !ews.closedAt)   rest.closedAt   = now;
    if (!addUpdate) {
      ews.updates.unshift({ id:ewsUid(), text:`Status changed to "${rest.status.replace(/_/g,' ')}"`, author:'System', type:'status_change', at:now });
    }
    ewsLog('status_change', `EWS "${ews.title}" → ${rest.status}`, { ewsId:ews.id });
  }
  // Recompute risk score if severity/likelihood changed
  if (rest.severity || rest.likelihood) {
    const svMap = { critical:4, high:3, medium:2, low:1 };
    const lkMap = { certain:4, likely:3, possible:2, unlikely:1 };
    rest.riskScore = (svMap[rest.severity||ews.severity]||2) * (lkMap[rest.likelihood||ews.likelihood]||2);
  }
  const _prevStatus = ews.status;
  Object.assign(ews, rest, { id:ews.id, ref:ews.ref, updatedAt:now });
  await saveDB(db);
  res.json({ ok:true, data:ews });
  if (rest.status && rest.status !== _prevStatus) {
    notifyEws(ews, rest.status, { oldStatus: _prevStatus, newStatus: rest.status });
  }
});

// DELETE EWS
app.delete('/api/ews/:id', async (req, res) => {
  await _dbReady;
  const u = ewsDB();
  u.ewsList = u.ewsList.filter(x => x.id !== req.params.id);
  await saveDB(db);
  res.json({ ok:true });
});

// POST add update entry
app.post('/api/ews/:id/updates', async (req, res) => {
  await _dbReady;
  const u = ewsDB();
  const ews = u.ewsList.find(x => x.id === req.params.id);
  if (!ews) return res.status(404).json({ ok:false, error:'not found' });
  const now = new Date().toISOString();
  const update = { id:ewsUid(), text:req.body.text||'', author:req.body.author||'System', type:req.body.type||'update', at:now };
  ews.updates.unshift(update);
  ews.updatedAt = now;
  ewsLog('update', `Update on "${ews.title}"`, { ewsId:ews.id });
  await saveDB(db);
  res.json({ ok:true, data:update });
  notifyEws(ews, update.type === 'decision' ? 'decision' : update.type === 'review' ? 'review' : 'update', { updateText: update.text, author: update.author });
});

// POST add action item
app.post('/api/ews/:id/actions', async (req, res) => {
  await _dbReady;
  const u = ewsDB();
  const ews = u.ewsList.find(x => x.id === req.params.id);
  if (!ews) return res.status(404).json({ ok:false, error:'not found' });
  const now = new Date().toISOString();
  const action = { id:ewsUid(), title:req.body.title||'', assignee:req.body.assignee||'', dueDate:req.body.dueDate||'', status:'open', completedAt:null, notes:'', createdAt:now };
  ews.actionItems.push(action);
  ews.updatedAt = now;
  await saveDB(db);
  res.json({ ok:true, data:action });
  notifyEws(ews, 'action_assigned', { actionTitle: action.title, actionAssignee: action.assignee, actionDue: action.dueDate });
});

// PUT toggle/update action item
app.put('/api/ews/:ewsId/actions/:actionId', async (req, res) => {
  await _dbReady;
  const u = ewsDB();
  const ews = u.ewsList.find(x => x.id === req.params.ewsId);
  if (!ews) return res.status(404).json({ ok:false, error:'EWS not found' });
  const action = (ews.actionItems||[]).find(a => a.id === req.params.actionId);
  if (!action) return res.status(404).json({ ok:false, error:'action not found' });
  const now = new Date().toISOString();
  if (req.body.status === 'completed' && action.status !== 'completed') req.body.completedAt = now;
  Object.assign(action, req.body, { id:action.id });
  ews.updatedAt = now;
  await saveDB(db);
  res.json({ ok:true, data:action });
});

// ── EWS: send calendar invite ─────────────────────────────────────────────────
function generateEWSICS(ews) {
  const freqMap = { weekly:'WEEKLY', biweekly:'WEEKLY;INTERVAL=2', monthly:'MONTHLY' };
  const rruleFreq = freqMap[ews.reviewFrequency];
  const now  = new Date();
  const start = new Date(now);
  const daysUntilMonday = (1 + 7 - start.getDay()) % 7 || 7;
  start.setDate(start.getDate() + daysUntilMonday);
  start.setUTCHours(10, 0, 0, 0);
  const end = new Date(start.getTime() + 60 * 60 * 1000);
  const fmt = d => d.toISOString().replace(/[-:]/g,'').replace('.000Z','Z');
  const desc = [
    `EWS Reference: ${ews.ref}`, `Project: ${ews.projectName||'N/A'}`,
    `Client: ${ews.clientName||'N/A'}`, `Severity: ${ews.severity}`,
    `Status: ${ews.status.replace(/_/g,' ')}`, '',
    ews.description || '', ews.meetLink ? `Video: ${ews.meetLink}` : 'Video link to be shared by organiser.',
  ].filter(Boolean).join('\\n');
  const attendees = (ews.stakeholders||[])
    .map(e => `ATTENDEE;CUTYPE=INDIVIDUAL;ROLE=REQ-PARTICIPANT;PARTSTAT=NEEDS-ACTION;RSVP=TRUE:mailto:${e}`)
    .join('\r\n');
  const lines = [
    'BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Bluecopa//EWS//EN',
    'CALSCALE:GREGORIAN','METHOD:REQUEST','BEGIN:VEVENT',
    `UID:${ews.id}-review@bluecopa.com`,`DTSTAMP:${fmt(now)}`,
    `DTSTART:${fmt(start)}`,`DTEND:${fmt(end)}`,
    ...(rruleFreq ? [`RRULE:FREQ=${rruleFreq}`] : []),
    `SUMMARY:EWS Review — ${ews.title}`,`DESCRIPTION:${desc}`,
    `ORGANIZER;CN=Bluecopa Delivery:mailto:delivery.wiki@bluecopa.com`,
    ...(attendees ? [attendees] : []),
    'STATUS:CONFIRMED','SEQUENCE:0',
    'BEGIN:VALARM','TRIGGER:-PT15M','ACTION:DISPLAY',
    `DESCRIPTION:Reminder: EWS Review in 15 min — ${ews.title}`,'END:VALARM',
    'END:VEVENT','END:VCALENDAR',
  ];
  return lines.join('\r\n');
}

app.post('/api/ews/:id/schedule', async (req, res) => {
  await _dbReady;
  const ews = ewsDB().ewsList.find(x => x.id === req.params.id);
  if (!ews) return res.status(404).json({ ok:false, error:'not found' });
  if (!ews.stakeholders || !ews.stakeholders.length)
    return res.status(400).json({ ok:false, error:'no stakeholders to invite' });
  if (ews.reviewFrequency === 'adhoc')
    return res.status(400).json({ ok:false, error:'adhoc frequency cannot be scheduled' });
  try {
    const ics = generateEWSICS(ews);
    const freqLabel = { weekly:'Weekly', biweekly:'Bi-weekly', monthly:'Monthly' }[ews.reviewFrequency] || ews.reviewFrequency;
    await sendEmail({
      to: ews.stakeholders.join(', '),
      subject: `[EWS Calendar] ${freqLabel} review — ${ews.ref}: ${ews.title}`,
      html: `<div style="font-family:sans-serif;max-width:600px"><h2 style="color:#3548FF">📅 EWS Review Invitation</h2><p>You are invited to a <strong>${freqLabel}</strong> review for <strong>${escHtmlServer(ews.ref)} — ${escHtmlServer(ews.title)}</strong></p><p>Project: ${escHtmlServer(ews.projectName||'N/A')} | Client: ${escHtmlServer(ews.clientName||'N/A')} | Severity: ${escHtmlServer(ews.severity)}</p>${ews.meetLink?`<p>🎥 <a href="${escHtmlServer(ews.meetLink)}">Join Google Meet</a></p>`:'<p style="color:#6b7280">A video link will be shared by the organiser.</p>'}<p>Please accept the calendar invitation attached.</p><p style="color:#6b7280;font-size:12px">Sent by Bluecopa Early Warning System</p></div>`,
      text: `EWS Review Invite: ${ews.ref} — ${ews.title}\nFrequency: ${freqLabel}`,
      attachments: [{ filename:`EWS-Review-${ews.ref}.ics`, content:ics, contentType:'text/calendar; method=REQUEST' }],
    });
    const now = new Date().toISOString();
    ews.calendarInviteSent   = true;
    ews.calendarInviteSentAt = now;
    ews.updates.unshift({ id:ewsUid(), text:`Calendar invite sent to ${ews.stakeholders.length} stakeholder(s)`, author:'System', type:'action', at:now });
    ews.updatedAt = now;
    await saveDB(db);
    res.json({ ok:true, message:`Invite sent to ${ews.stakeholders.length} stakeholder(s)` });
  } catch(e) {
    console.error('[EWS schedule]', e.message);
    res.status(500).json({ ok:false, error:'Failed to send invite: ' + e.message });
  }
});

// ── Upload (disabled on Vercel) ───────────────────────────────────────────────
app.post('/api/upload', (req, res) => {
  res.status(503).json({ error: 'File uploads are not supported on the Vercel deployment.' });
});

// ── Comments ──────────────────────────────────────────────────────────────────
app.get('/api/articles/:id/comments', (req, res) => {
  const articleId = parseInt(req.params.id);
  const comments = (db.comments || []).filter(c => c.articleId === articleId);
  res.json(comments);
});

app.post('/api/articles/:id/comments', (req, res) => {
  const articleId = parseInt(req.params.id);
  const { text, author, initials } = req.body;
  if (!text?.trim()) return res.status(400).json({ error: 'Comment text is required.' });
  if (!author?.trim()) return res.status(400).json({ error: 'Author name is required.' });
  if (!db.comments) db.comments = [];
  const comment = {
    id:         Date.now(),
    articleId,
    text:       text.trim(),
    author:     author.trim(),
    initials:   (initials || author.trim().slice(0,2)).toUpperCase().slice(0,2),
    created_at: new Date().toISOString(),
  };
  db.comments.unshift(comment);
  res.status(201).json(comment);
});

app.delete('/api/articles/:id/comments/:commentId', (req, res) => {
  if (!isAdmin(req)) return res.status(401).json({ error: 'Admin required' });
  if (!db.comments) return res.status(404).json({ error: 'Not found' });
  const commentId = parseInt(req.params.commentId);
  const idx = db.comments.findIndex(c => c.id === commentId);
  if (idx === -1) return res.status(404).json({ error: 'Comment not found' });
  db.comments.splice(idx, 1);
  res.json({ success: true });
});

// ── Article Requests ──────────────────────────────────────────────────────────
app.post('/api/article-requests', (req, res) => {
  const { topic, description, requesterName, requesterEmail } = req.body;
  if (!topic?.trim())          return res.status(400).json({ error: 'Topic is required.' });
  if (!description?.trim())    return res.status(400).json({ error: 'More details are required.' });
  if (!requesterName?.trim())  return res.status(400).json({ error: 'Your name is required.' });
  if (!requesterEmail?.trim()) return res.status(400).json({ error: 'Your email is required.' });
  if (!db.articleRequests) db.articleRequests = [];
  const request = {
    id:             Date.now(),
    topic:          topic.trim(),
    description:    (description || '').trim(),
    requesterName:  (requesterName || 'Anonymous').trim(),
    requesterEmail: (requesterEmail || '').trim(),
    status:         'pending',
    created_at:     new Date().toISOString(),
  };
  db.articleRequests.unshift(request);
  res.status(201).json({ success: true, id: request.id });
});

app.get('/api/article-requests', (req, res) => {
  if (!isAdmin(req)) return res.status(401).json({ error: 'Admin required' });
  res.json(db.articleRequests || []);
});

app.patch('/api/article-requests/:id', (req, res) => {
  if (!isAdmin(req)) return res.status(401).json({ error: 'Admin required' });
  if (!db.articleRequests) return res.status(404).json({ error: 'Not found' });
  const id = parseInt(req.params.id);
  const item = db.articleRequests.find(r => r.id === id);
  if (!item) return res.status(404).json({ error: 'Not found' });
  if (req.body.status) item.status = req.body.status;
  res.json(item);
});

// ── Skill Matrix ──────────────────────────────────────────────────────────────
function ensureSM() {
  if (!db.skillMatrix) db.skillMatrix = { employees:[], processAreas:[], currentScores:{}, snapshots:[], nextSnapshotId:1 };
  if (!db.processGame) db.processGame = { currentGame: null, attempts: [], gameHistory: [] };
}

// GET full skill matrix data — filtered by ACL
app.get('/api/skillmatrix', (req, res) => {
  ensureSM(); ensureACL();
  const email = (req.headers['x-user-email'] || '').toLowerCase().trim();
  res.json(filterSkillMatrixForUser(db.skillMatrix, email));
});

// PUT config (admin: update employees + process areas)
app.put('/api/skillmatrix/config', async (req, res) => {
  if (!isAdmin(req)) return res.status(401).json({ error: 'Admin required' });
  ensureSM();
  const { employees, processAreas } = req.body;
  if (Array.isArray(employees))    db.skillMatrix.employees    = employees;
  if (Array.isArray(processAreas)) db.skillMatrix.processAreas = processAreas;
  await saveDB(db);
  res.json(db.skillMatrix);
});

// PUT scores (any logged-in user saves current scores)
app.put('/api/skillmatrix/scores', async (req, res) => {
  ensureSM();
  const { scores } = req.body;
  if (scores && typeof scores === 'object') db.skillMatrix.currentScores = scores;
  await saveDB(db);
  res.json({ ok: true });
});

// POST snapshot (admin)
app.post('/api/skillmatrix/snapshots', async (req, res) => {
  if (!isAdmin(req)) return res.status(401).json({ error: 'Admin required' });
  ensureSM();
  const { label } = req.body;
  const snap = {
    id: db.skillMatrix.nextSnapshotId++,
    label: label || `Snapshot ${db.skillMatrix.nextSnapshotId - 1}`,
    date: new Date().toISOString(),
    scores: JSON.parse(JSON.stringify(db.skillMatrix.currentScores))
  };
  db.skillMatrix.snapshots.push(snap);
  await saveDB(db);
  res.json(snap);
});

// DELETE snapshot (admin)
app.delete('/api/skillmatrix/snapshots/:id', async (req, res) => {
  if (!isAdmin(req)) return res.status(401).json({ error: 'Admin required' });
  ensureSM();
  const id = parseInt(req.params.id);
  db.skillMatrix.snapshots = db.skillMatrix.snapshots.filter(s => s.id !== id);
  await saveDB(db);
  res.json({ ok: true });
});

// ── Process Puzzle ────────────────────────────────────────────────────────────
app.get('/api/puzzle/current', (req, res) => {
  if (!db.processGame) db.processGame = { currentGame: null, attempts: [], gameHistory: [] };
  const game = db.processGame.currentGame;
  if (!game) return res.json({ game: null });
  const safeQ = game.questions.map(q => ({ id: q.id, type: q.type, question: q.question, options: q.options, difficulty: q.difficulty }));
  const gameAttempts = db.processGame.attempts.filter(a => a.gameId === game.id && a.isFirstAttempt);
  res.json({ game: { ...game, questions: safeQ, participantCount: gameAttempts.length } });
});

app.post('/api/puzzle/generate', async (req, res) => {
  if (!isAdmin(req)) return res.status(403).json({ error: 'Forbidden' });
  if (!db.processGame) db.processGame = { currentGame: null, attempts: [], gameHistory: [] };

  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  const useAnthropic = anthropicKey && anthropicKey !== 'your-anthropic-api-key-here';
  if (!useAnthropic) {
    return res.status(503).json({ error: 'AI not configured. Add ANTHROPIC_API_KEY to Vercel env vars.' });
  }

  const articles = (db.articles || []).map(a =>
    `Title: ${a.title}\nCategory: ${a.category}\nExcerpt: ${(a.content || a.excerpt || '').replace(/<[^>]+>/g, '').slice(0, 400)}`
  ).join('\n\n---\n\n');
  const mlCourseSummary = `\n\n---\n\nMY LEARNING COURSES (Key Topics for Quiz Generation):\n- Accounts Receivable (AR): customer invoicing, cash application, dunning & collections, AR aging reports, DSO metric, credit management, period-end AR close\n- Accounts Payable (AP): vendor master data, three-way matching (PO/GR/Invoice), payment runs, GR/IR reconciliation, AP internal controls, DPO metric, period-end AP close\n- Management Information System (MIS): financial statements (P&L, Balance Sheet, Cash Flow), AR/AP/working capital reports, operational KPIs, finance dashboards, exception management\n- Procure-to-Pay (P2P): purchase requisition, purchase orders (PO types), goods receipt (GRN), invoice verification & exceptions, payment processing, P2P KPIs\n- Order-to-Cash (O2C): sales order processing, credit checks, delivery & fulfilment, billing & invoicing, cash collection, dispute management, O2C KPIs\n- Record-to-Report (R2R): journal entries, subledger accounting, GL reconciliation, bank reconciliation, period-end close activities, financial reporting\n- Analytics & Warehousing: data warehousing concepts, data pipelines, ETL processes, analytics frameworks, reporting layers\n- Reconciliation: account reconciliation, intercompany reconciliation, balance confirmation, exception handling & escalation\n- Workflow Automation: workflow design, approval chains, SLA management, process automation tools\n- Enterprise Reporting: management reporting, executive dashboards, data visualization, report governance & distribution\n- Client Integration: data onboarding, API integration, data validation rules, client data mapping & transformation\n- Business Communication: stakeholder communication, escalation protocols, documentation standards, delivery team coordination`;
  const processAreas = (db.skillMatrix && db.skillMatrix.processAreas || []).join(', ') || 'Data Ingestion, Workflows, Portal Creation, Reconciliation, Exports';
  const now = new Date();
  const year = now.getFullYear();
  const { weekNumber: weekOverride, formatId } = req.body || {};
  const week = (weekOverride && !isNaN(parseInt(weekOverride))) ? parseInt(weekOverride) : getWeekNumber(now);
  const gameId = `week-${year}-${week}-${Date.now()}`;
  if (db.processGame.currentGame) {
    db.processGame.gameHistory.push(db.processGame.currentGame);
    if (db.processGame.gameHistory.length > 20) db.processGame.gameHistory.shift();
  }

  const PP_FORMATS = [
    { id:'knowledge_quiz', name:'Knowledge Quiz',     icon:'📝', color:'quiz',
      desc:'Test your knowledge of delivery processes and workflows',
      rules:`Generate 12 multiple-choice KNOWLEDGE questions. Each must have exactly 4 options. Test understanding of processes, tools, and workflows. One option is clearly correct; the other 3 are plausible but wrong. Mix 3 easy, 6 medium, 3 hard.` },
    { id:'true_false',     name:'True or False',      icon:'⚖️', color:'trivia',
      desc:'Decide if each statement is true or false',
      rules:`Generate 12 TRUE/FALSE questions. Each question MUST be a statement (not a question). Options MUST be exactly ["True","False"] — only 2 options. Set correct to 0 if True, 1 if False. Mix ~6 true and ~6 false.` },
    { id:'riddle_round',   name:'Riddle Round',       icon:'🔮', color:'scenario',
      desc:'Solve creative riddles about delivery and data concepts',
      rules:`Generate 12 RIDDLES. Each riddle is metaphorical, written in first person ("I flow between systems..."). Provide 4 answer options, one correct.` },
    { id:'fill_blank',     name:'Fill in the Blank',  icon:'✏️', color:'quiz',
      desc:'Complete the missing word or phrase in each statement',
      rules:`Generate 12 FILL-IN-THE-BLANK questions. Each is a sentence with exactly ONE blank marked as _____. Provide 4 options to fill the blank — only one is correct.` },
    { id:'spot_mistake',   name:'Spot the Mistake',   icon:'🔍', color:'trivia',
      desc:'Find the deliberate error hidden in each description',
      rules:`Generate 12 SPOT-THE-MISTAKE questions. Each describes a process with ONE deliberate factual mistake. Ask "What is incorrect?" with 4 options.` },
    { id:'scenario',       name:'Scenario Challenge', icon:'🎯', color:'scenario',
      desc:'Make the right call in real-world delivery situations',
      rules:`Generate 12 SCENARIO-BASED questions. Each presents a work situation with a decision. Provide 4 possible actions — one is clearly best.` },
    { id:'what_next',      name:'What Comes Next?',   icon:'⏭️', color:'quiz',
      desc:'Identify the next correct step in a delivery workflow',
      rules:`Generate 12 SEQUENCING questions. Each describes a process up to a step, then asks "What should happen next?" Provide 4 options.` },
    { id:'term_buster',    name:'Term Buster',        icon:'📖', color:'trivia',
      desc:'Match terms, acronyms, and definitions from the knowledge base',
      rules:`Generate 12 TERMINOLOGY questions. Format: "What is [TERM]?", "What does [ACRONYM] stand for?". Provide 4 options — one correct definition. Include at least 3 acronym questions.` },
    { id:'rapid_fire',     name:'Rapid Fire ⚡',       icon:'⚡', color:'scenario',
      desc:'12 quick-fire questions — speed and accuracy both count!',
      rules:`Generate 12 SHORT multiple-choice questions. Each question MUST be one concise sentence (max 15 words). Each has 4 options, one correct. Focus on quick-recall facts. Mix 4 easy, 5 medium, 3 hard.` },
    { id:'emoji_quiz',     name:'Emoji Decode 🎯',    icon:'🎯', color:'scenario',
      desc:'Decode process workflows and concepts from emoji sequences!',
      rules:`Generate 12 EMOJI-CLUE questions. Each question shows 3–5 emojis representing a process or concept. Format: "📥 → 🔍 → ✅ — What process does this represent?" Provide 4 answer options.` },
    { id:'who_am_i',       name:'Who Am I? 🕵️',       icon:'🕵️', color:'trivia',
      desc:'Guess the role, tool, or process from cryptic clues!',
      rules:`Generate 12 "WHO/WHAT AM I?" questions with 3 progressive clues. Format: "Clue 1: [vague]. Clue 2: [more specific]. Clue 3: [most specific]. Who/What am I?" Provide 4 options.` },
    { id:'mixed_bag',      name:'Mixed Bag',          icon:'🎲', color:'quiz',
      desc:'A surprise mix of all question types — stay on your toes!',
      rules:`Generate 12 questions using a MIX: 3 standard MCQ, 3 TRUE/FALSE (options MUST be ["True","False"]), 3 fill-in-the-blank (with _____), 3 riddles (metaphorical, first person).` },
    { id:'puzzle',         name:'Puzzle',             icon:'🧩', color:'quiz',
      desc:'Piece together clues to identify the correct process or concept',
      rules:`Generate 12 PUZZLE questions. Each presents exactly 3 numbered facts about a delivery process, tool, concept, or workflow term from the knowledge base. Format: "Given these facts: [1] ... [2] ... [3] ... — what is being described?" Provide 4 answer options (one correct, three plausible alternatives). The 3 facts approach the concept from different angles: function, outcome, and usage context. Mix difficulty: easier puzzles use direct facts, harder ones use abstract or indirect descriptions.` },
  ];

  const fmt = (formatId && formatId !== 'random')
    ? (PP_FORMATS.find(f => f.id === formatId) || PP_FORMATS[Math.floor(Math.random() * PP_FORMATS.length)])
    : PP_FORMATS[Math.floor(Math.random() * PP_FORMATS.length)];

  const questionCount = 12;
  const optionsExample = fmt.id === 'true_false' ? '["True","False"]' : '["Option A","Option B","Option C","Option D"]';
  const questionExample =
    fmt.id === 'fill_blank'  ? '"Teams use _____ to verify that ingested data matches source system counts."' :
    fmt.id === 'emoji_quiz'  ? '"📥 → 🔍 → ✅ → 📊 — What process does this emoji sequence represent?"' :
    fmt.id === 'who_am_i'   ? '"Clue 1: I am invisible until something breaks. Clue 2: I watch every data load. Clue 3: Teams set my thresholds. Who/What am I?"' :
    fmt.id === 'riddle_round'? '"I travel between systems carrying data, transforming as I go. What am I?"' :
    fmt.id === 'puzzle'      ? '"Given these facts: [1] It matches amounts across two different ledgers. [2] It is performed at month-end to verify completeness. [3] Discrepancies found are escalated to the finance team. — What process is being described?"' :
    '"Full question text here."';

  const formatEnforcement = [
    fmt.id === 'fill_blank'   ? '⚠️ EVERY question MUST contain exactly one _____ blank in the sentence.' : '',
    fmt.id === 'emoji_quiz'   ? '⚠️ EVERY question MUST start with 3-5 emojis separated by → then a dash and text.' : '',
    fmt.id === 'who_am_i'    ? '⚠️ EVERY question MUST follow "Clue 1: ... Clue 2: ... Clue 3: ... Who/What am I?" format.' : '',
    fmt.id === 'riddle_round' ? '⚠️ EVERY question MUST be first-person metaphorical riddle ("I am...", "I do...").' : '',
    fmt.id === 'true_false'   ? '⚠️ options array MUST be exactly ["True","False"] for every question — no 4-option arrays.' : '',
    fmt.id === 'rapid_fire'   ? '⚠️ EVERY question must be ≤15 words. Generate exactly 12 questions.' : '',
    fmt.id === 'puzzle'       ? '⚠️ PUZZLE RULE: Every question MUST be formatted as "Given these facts: [1] ... [2] ... [3] ... — what is being described?" No other format accepted.' : '',
  ].filter(Boolean).join('\n');

  const prompt = `You are generating a "${fmt.name}" format quiz for a delivery team's weekly "Process Puzzle" challenge.

THIS IS A "${fmt.id.toUpperCase()}" FORMAT — NOT STANDARD MULTIPLE CHOICE.

KNOWLEDGE BASE:
${articles}${mlCourseSummary}

PROCESS AREAS: ${processAreas}

FORMAT RULES (MANDATORY):
${fmt.rules}

${formatEnforcement}

EXAMPLE for this format:
  "question": ${questionExample},
  "options": ${optionsExample}

Return ONLY valid JSON, no markdown, no code fences:
{
  "type": "${fmt.id}",
  "title": "Week ${week}: ${fmt.name}",
  "instructions": "One sentence explaining how to play ${fmt.name}.",
  "questions": [
    {
      "id": 1,
      "question": ${questionExample},
      "options": ${optionsExample},
      "correct": 0,
      "explanation": "Why this answer is correct.",
      "difficulty": "easy"
    }
  ]
}

Generate exactly ${questionCount} questions. Every question MUST match the ${fmt.name} format. Return ONLY the JSON object.`;

  try {
    const Anthropic = require('@anthropic-ai/sdk');
    const client = new Anthropic.default({ apiKey: anthropicKey });
    const message = await client.messages.create({
      model: 'claude-opus-4-5',
      max_tokens: 4096,
      system: `You are a quiz generator that STRICTLY follows format instructions. You NEVER output standard MCQ unless the format is "knowledge_quiz". Match the exact format specified. Return ONLY valid JSON.`,
      messages: [{ role: 'user', content: prompt }]
    });
    let raw = message.content[0].text.trim();
    if (!raw) throw new Error('Claude returned empty response');
    const js = raw.indexOf('{'), je = raw.lastIndexOf('}') + 1;
    if (js === -1 || je === 0) throw new Error('AI did not return valid JSON');
    const parsed = JSON.parse(raw.slice(js, je));

    // ── Server-side format enforcement (guarantees compliance regardless of AI) ──
    const enforcedQuestions = (parsed.questions || []).map((q, i) => {
      let question = (q.question || '').trim();
      let options   = Array.isArray(q.options) ? q.options : [];
      let correct   = typeof q.correct === 'number' ? q.correct : 0;
      switch (fmt.id) {
        case 'true_false':
          options = ['True', 'False'];
          correct = (correct === 0 || correct === 1) ? correct : 0;
          break;
        case 'fill_blank':
          if (!question.includes('_____')) {
            const ans = (options[correct] || '').trim();
            const re = ans ? new RegExp(ans.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') : null;
            question = re && re.test(question) ? question.replace(re, '_____') : question.replace(/\?$/, '') + ' — teams call this _____.';
          }
          break;
        case 'who_am_i':
          if (!/clue\s*1/i.test(question)) {
            const parts = question.split(/[.!?]+/).filter(s => s.trim()).slice(0, 3);
            question = parts.length >= 2
              ? `Clue 1: ${parts[0].trim()}. Clue 2: ${parts[1].trim()}. ${parts[2]?'Clue 3: '+parts[2].trim()+'. ':''}Who/What am I?`
              : `Clue 1: ${question} Who/What am I?`;
          }
          break;
        case 'emoji_quiz':
          if (!/^\p{Emoji}/u.test(question)) {
            question = `📥 → 🔍 → ✅ → ❓ — ${question}`;
          }
          break;
        case 'rapid_fire':
          if (question.split(/\s+/).length > 20) question = question.split(/\s+/).slice(0, 17).join(' ') + '…?';
          break;
      }
      return { ...q, id: i + 1, question, options, correct };
    });

    console.log(`[PP] fmt=${fmt.id} week=${week} qs=${enforcedQuestions.length} q1="${(enforcedQuestions[0]?.question||'').slice(0,60)}"`);

    const newGame = {
      id: gameId, week, year,
      type: fmt.id,
      formatIcon: fmt.icon,
      formatColor: fmt.color,
      formatDesc: fmt.desc,
      title: parsed.title || `Week ${week}: ${fmt.name}`,
      instructions: parsed.instructions || fmt.desc,
      questions: enforcedQuestions,
      publishedAt: now.toISOString(),
      totalQuestions: enforcedQuestions.length
    };
    db.processGame.currentGame = newGame;
    await saveDB(db);
    const safeQ = newGame.questions.map(q => ({ id: q.id, type: q.type, question: q.question, options: q.options, difficulty: q.difficulty }));
    res.json({ success: true, game: { ...newGame, questions: safeQ } });
  } catch (err) {
    console.error('Puzzle generate error:', err);
    res.status(500).json({ error: 'Failed to generate: ' + err.message });
  }
});

app.post('/api/puzzle/attempt', async (req, res) => {
  if (!db.processGame) return res.status(404).json({ error: 'No game' });
  const { gameId, playerName, playerInitials, answers, timeTaken } = req.body;
  if (!gameId || !playerName || !Array.isArray(answers)) return res.status(400).json({ error: 'Missing fields' });
  const game = db.processGame.currentGame;
  if (!game || game.id !== gameId) return res.status(404).json({ error: 'Game not found or expired' });
  const prev = db.processGame.attempts.filter(a => a.gameId === gameId && a.playerName.toLowerCase() === playerName.toLowerCase());
  const isFirstAttempt = prev.length === 0;
  let correct = 0;
  const questionResults = game.questions.map((q, i) => {
    const ok = answers[i] === q.correct;
    if (ok) correct++;
    return { questionId: q.id, question: q.question, selected: answers[i], correct: q.correct, isCorrect: ok, explanation: q.explanation, options: q.options };
  });
  const accuracy = Math.round((correct / game.questions.length) * 100);
  const attempt = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2),
    gameId, playerName,
    playerInitials: playerInitials || playerName.slice(0, 2).toUpperCase(),
    answers, score: correct, total: game.questions.length, accuracy,
    timeTaken: timeTaken || 0, completedAt: new Date().toISOString(), isFirstAttempt
  };
  db.processGame.attempts.push(attempt);
  if (db.processGame.attempts.length > 2000) db.processGame.attempts = db.processGame.attempts.slice(-2000);
  await saveDB(db);
  res.json({ success: true, attempt, questionResults, gameTitle: game.title });
});

// Badge tier based on lifetime total score
function ppBadgeTier(lifetimeScore) {
  if (lifetimeScore >= 250) return { name:'Legend',  icon:'👑', level:5 };
  if (lifetimeScore >= 150) return { name:'Platinum', icon:'💎', level:4 };
  if (lifetimeScore >=  80) return { name:'Gold',     icon:'🥇', level:3 };
  if (lifetimeScore >=  40) return { name:'Silver',   icon:'🥈', level:2 };
  return                           { name:'Bronze',   icon:'🥉', level:1 };
}

app.get('/api/puzzle/leaderboard', (req, res) => {
  if (!db.processGame) db.processGame = { currentGame: null, attempts: [], gameHistory: [] };
  const period  = req.query.period || 'weekly';
  const allAttempts = db.processGame.attempts || [];
  const allGames = [...(db.processGame.gameHistory || []), ...(db.processGame.currentGame ? [db.processGame.currentGame] : [])];

  // Lifetime score per player (for badge calculation)
  const lifetime = {};
  allAttempts.filter(a => a.isFirstAttempt).forEach(a => {
    const k = a.playerName.toLowerCase();
    if (!lifetime[k]) lifetime[k] = 0;
    lifetime[k] += a.score;
  });

  // Determine which game IDs fall in the requested period
  let filteredIds;
  if (period === 'weekly') {
    filteredIds = new Set(db.processGame.currentGame ? [db.processGame.currentGame.id] : []);
  } else {
    const now = new Date();
    let start;
    if      (period === 'monthly')   start = new Date(now.getFullYear(), now.getMonth(), 1);
    else if (period === 'quarterly') start = new Date(now.getFullYear(), Math.floor(now.getMonth()/3)*3, 1);
    else                              start = new Date(now.getFullYear(), 0, 1);
    filteredIds = new Set(
      allGames.filter(g => { const d = new Date(g.createdAt || g.date || 0); return d >= start; }).map(g => g.id)
    );
    if (db.processGame.currentGame) filteredIds.add(db.processGame.currentGame.id);
  }

  // Aggregate first-attempt scores for the period
  const playerMap = {};
  allAttempts.filter(a => a.isFirstAttempt && filteredIds.has(a.gameId)).forEach(a => {
    const k = a.playerName.toLowerCase();
    if (!playerMap[k]) playerMap[k] = { playerName: a.playerName, playerInitials: a.playerInitials || a.playerName.slice(0,2).toUpperCase(), totalScore:0, totalPossible:0, totalTime:0, weeksPlayed:0 };
    playerMap[k].totalScore    += a.score;
    playerMap[k].totalPossible += a.total;
    playerMap[k].totalTime     += (a.timeTaken || 0);
    playerMap[k].weeksPlayed   += 1;
  });

  const lb = Object.values(playerMap)
    .map(p => ({ ...p, accuracy: p.totalPossible ? Math.round(p.totalScore/p.totalPossible*100) : 0, badge: ppBadgeTier(lifetime[p.playerName.toLowerCase()]||0) }))
    .sort((a,b) => b.totalScore - a.totalScore || a.totalTime - b.totalTime)
    .map((p,i) => ({ ...p, rank: i+1 }));

  const cg = db.processGame.currentGame;
  res.json({ leaderboard: lb, period, gamesInPeriod: filteredIds.size, totalPlayers: lb.length,
    game: cg ? { id:cg.id, title:cg.title, week:cg.week, type:cg.type, formatIcon:cg.formatIcon } : null });
});

app.get('/api/puzzle/analytics', (req, res) => {
  if (!isAdmin(req)) return res.status(403).json({ error: 'Forbidden' });
  if (!db.processGame || !db.processGame.currentGame) return res.json({ analytics: null });
  const game = db.processGame.currentGame;
  const all = db.processGame.attempts.filter(a => a.gameId === game.id);
  const first = all.filter(a => a.isFirstAttempt);
  const avgAcc = first.length ? Math.round(first.reduce((s, a) => s + a.accuracy, 0) / first.length) : 0;
  const avgTime = first.length ? Math.round(first.reduce((s, a) => s + a.timeTaken, 0) / first.length) : 0;
  res.json({ analytics: { totalParticipants: first.length, totalAttempts: all.length, avgAccuracy: avgAcc, avgTime, topScore: first.length ? Math.max(...first.map(a => a.accuracy)) : 0, gameTitle: game.title, week: game.week } });
});

// ══ AUDIT LOG ════════════════════════════════════════════════════════════════
// Uses a SEPARATE MongoDB collection (audit_log) — atomic writes, no in-memory race conditions

// POST /api/audit — record a tracking event (no auth required)
app.post('/api/audit', async (req, res) => {
  const { sessionId, userId, userName, userInitials, action, page, pageTitle, duration } = req.body;
  if (!sessionId || !action) return res.status(400).json({ error: 'Missing fields' });
  const entry = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2,6),
    sessionId,
    userId:       userId       || 'Anonymous',
    userName:     userName     || 'Anonymous',
    userInitials: userInitials || '?',
    action, page: page || '', pageTitle: pageTitle || '',
    duration: duration || 0,
    timestamp: new Date().toISOString()
  };
  try {
    if (auditCol) {
      // Write directly to separate MongoDB collection — persists immediately
      await auditCol.insertOne(entry);
    } else {
      // Fallback: in-memory (dev only)
      if (!db.auditLog) db.auditLog = [];
      db.auditLog.push(entry);
      if (db.auditLog.length > 50000) db.auditLog = db.auditLog.slice(-50000);
    }
    res.json({ success: true });
  } catch(e) {
    res.json({ success: false, error: e.message });
  }
});

// GET /api/audit — retrieve audit log (admin only)
app.get('/api/audit', async (req, res) => {
  if (!isAdmin(req)) return res.status(403).json({ error: 'Admin only' });
  const days  = parseInt(req.query.days) || 30;
  const cutoff = new Date(Date.now() - days * 24 * 3600 * 1000);
  try {
    if (auditCol) {
      // Query directly from MongoDB — always fresh, no caching issues
      const [log, total] = await Promise.all([
        auditCol.find({ timestamp: { $gte: cutoff.toISOString() } })
          .sort({ timestamp: -1 }).limit(10000).toArray(),
        auditCol.countDocuments()
      ]);
      return res.json({ log, total });
    }
    // Fallback: in-memory
    const filtered = (db.auditLog || []).filter(e => e.timestamp >= cutoff.toISOString());
    res.json({ log: filtered.reverse(), total: (db.auditLog || []).length });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

// DELETE /api/audit — clear audit log (admin only)
app.delete('/api/audit', async (req, res) => {
  if (!isAdmin(req)) return res.status(403).json({ error: 'Admin only' });
  try {
    if (auditCol) {
      await auditCol.deleteMany({});
    } else {
      db.auditLog = [];
    }
    res.json({ success: true });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

// ══ LEADERSHIP INSIGHTS — Access Control ═════════════════════════════════════

// GET /api/leadership/check?user=Name — check if user has access (public endpoint)
app.get('/api/leadership/check', (req, res) => {
  const userName = (req.query.user || '').trim().toLowerCase();
  if (!userName) return res.json({ access: false });
  // Admins always have access
  if (isAdmin(req)) return res.json({ access: true, role: 'admin_leader' });
  const list = (db.leadership && db.leadership.approvedUsers) || [];
  // Case-insensitive exact match OR partial match (first name)
  const access = list.some(u => {
    const stored = u.toLowerCase();
    return stored === userName || stored.startsWith(userName + ' ') || userName.startsWith(stored + ' ');
  });
  res.json({ access, role: access ? 'leader' : 'none' });
});

// GET /api/leadership/users — get full access list (admin only)
app.get('/api/leadership/users', (req, res) => {
  if (!isAdmin(req)) return res.status(403).json({ error: 'Admin only' });
  if (!db.leadership) db.leadership = { approvedUsers: [] };
  res.json({ users: db.leadership.approvedUsers || [] });
});

// POST /api/leadership/users — add user to access list (admin only)
app.post('/api/leadership/users', async (req, res) => {
  if (!isAdmin(req)) return res.status(403).json({ error: 'Admin only' });
  const { userName } = req.body;
  if (!userName || !userName.trim()) return res.status(400).json({ error: 'userName required' });
  if (!db.leadership) db.leadership = { approvedUsers: [] };
  const name = userName.trim();
  if (!db.leadership.approvedUsers.includes(name)) {
    db.leadership.approvedUsers.push(name);
    await saveDB(db);
  }
  res.json({ success: true, users: db.leadership.approvedUsers });
});

// DELETE /api/leadership/users — remove user from access list (admin only)
app.delete('/api/leadership/users', async (req, res) => {
  if (!isAdmin(req)) return res.status(403).json({ error: 'Admin only' });
  const { userName } = req.body;
  if (!db.leadership) db.leadership = { approvedUsers: [] };
  db.leadership.approvedUsers = (db.leadership.approvedUsers || []).filter(u => u !== userName);
  await saveDB(db);
  res.json({ success: true, users: db.leadership.approvedUsers });
});

// ── Rocketlane proxy — API key stays server-side ──────────────────────────────
let rlCache = null;
let rlCacheAt = 0;
const RL_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// All-tasks cache shared across my-work requests
let rlAllTasksCache = null;
let rlAllTasksCacheAt = 0;
const RL_TASKS_CACHE_TTL = 2 * 60 * 1000; // 2 min — matches full cache TTL

// ── Bluecopa Delivery Methodology engine ──────────────────────────────────────
const RL_METHODOLOGY = [
  { key: 'personalization',         phase: 'engage',  order: 1,  weight: 10 },
  { key: 'data management',         phase: 'engage',  order: 2,  weight: 10 },
  { key: 'configurations',          phase: 'drive',   order: 3,  weight: 10, aliases: ['configuration'] },
  { key: 'process walkthrough',     phase: 'drive',   order: 4,  weight: 10, aliases: ['process walk through', 'process walk-through', 'walkthrough', 'walk through'] },
  { key: 'user and role alignment', phase: 'drive',   order: 5,  weight: 10, aliases: ['user & role alignment', 'user role alignment', 'users and role alignment', 'user and roles alignment'] },
  { key: 'teach back',              phase: 'enable',  order: 6,  weight: 10, aliases: ['teachback', 'teach-back'] },
  { key: 'system validation',       phase: 'enable',  order: 7,  weight: 10, aliases: ['system validation and testing'] },
  { key: 'user acceptance testing', phase: 'enable',  order: 8,  weight: 10, aliases: ['uat', 'user acceptance'] },
  { key: 'go-live',                 phase: 'convert', order: 9,  weight: 10, aliases: ['go live', 'golive', 'go-live support'] },
  { key: 'hypercare',               phase: 'convert', order: 10, weight: 10, aliases: ['hypercare period', 'hyper care'] },
];

// Normalise a task name for fuzzy matching: lowercase, & → and, hyphens/dashes → space
function rlNorm(s) {
  return (s || '').toLowerCase().trim()
    .replace(/&/g, 'and')
    .replace(/[-–—]/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/^\d+[\.\):\s]+/, ''); // strip leading numeric prefix like "1. " or "2) "
}

function rlMatchMainTask(taskName) {
  const n = rlNorm(taskName);
  if (n === 'project closure' || n.startsWith('project closure')) return { excluded: true };
  for (const mt of RL_METHODOLOGY) {
    const variants = [mt.key, ...(mt.aliases || [])].map(rlNorm);
    for (const v of variants) {
      // Match exact, or task starts with the variant (word boundary — followed by space or end)
      if (n === v || n.startsWith(v + ' ') || n === v || (n.startsWith(v) && (n.length === v.length || n[v.length] === ' ' || n[v.length] === ':' || n[v.length] === '-'))) return mt;
    }
  }
  return null;
}

function rlBuildProjectProgress(projectTasks) {
  const mainFound = [];
  projectTasks.forEach(t => {
    const match = rlMatchMainTask(t.taskName);
    if (match && !match.excluded) mainFound.push({ ...t, _mt: match });
  });
  const matchedOrders = new Set(mainFound.map(t => t._mt.order));
  const isStandard = matchedOrders.size >= 7;
  const phases = { engage:{tasks:[],pct:0}, drive:{tasks:[],pct:0}, enable:{tasks:[],pct:0}, convert:{tasks:[],pct:0} };
  let overallCompleted = 0;
  if (isStandard) {
    const countedOrders = new Set();
    mainFound.forEach(t => {
      const phase = t._mt.phase;
      const isDone = t.status?.label === 'Completed';
      if (isDone && !countedOrders.has(t._mt.order)) {
        countedOrders.add(t._mt.order);
        overallCompleted += t._mt.weight;
      }
      const assigneeMembers = t.assignees?.members || [];
      phases[phase].tasks.push({
        taskId: t.taskId, taskName: t.taskName, order: t._mt.order,
        status: t.status?.label || 'Unknown',
        dueDate: t.dueDate || null, startDate: t.startDate || null,
        completed: isDone,
        owner: assigneeMembers.map(a => [a.firstName, a.lastName].filter(Boolean).join(' ') || a.emailId || '').filter(Boolean).join(', ') || null
      });
    });
    Object.keys(phases).forEach(ph => {
      const pt = phases[ph].tasks;
      if (pt.length) phases[ph].pct = Math.round(pt.filter(t => t.completed).length / pt.length * 100);
    });
  }
  return {
    isStandard,
    overallPct: isStandard ? Math.min(100, overallCompleted) : null,
    phases: isStandard ? phases : null,
    mainTaskCount: mainFound.length,
    totalTasks: projectTasks.length,
    _mainFound: mainFound
  };
}

function rlBuildCompliance(project, progress, allProjectTasks, prevSnapProject) {
  const issues = [];
  const today = new Date(); today.setHours(0,0,0,0);
  const projectStatus = (project.status?.label || '').toLowerCase();
  // Pre-delivery projects are not yet being executed — compliance checks don't apply
  if (projectStatus.includes('proposed') || projectStatus.includes('cancel') || projectStatus.includes('closed')) {
    return issues;
  }
  const mainFound = progress._mainFound || [];
  const allMainTasks = Object.entries(progress.phases || {})
    .flatMap(([ph, obj]) => obj.tasks.map(t => ({ ...t, _phase: ph })));

  // ── GENERAL checks: run for ALL projects (standard and non-standard) ──

  // Missing / invalid dates — every non-completed task in the project
  allProjectTasks.forEach(t => {
    const lbl = (t.status?.label || '').toLowerCase();
    if (lbl.includes('complet')) return;
    if (!t.dueDate)
      issues.push({ severity:'medium', category:'dates', task:t.taskName, phase:null, issue:'No due date set' });
    else if (!t.startDate)
      issues.push({ severity:'low', category:'dates', task:t.taskName, phase:null, issue:'No start date set' });
    // Not-started tasks whose planned start has already passed
    const notStarted = ['todo','to do','not started','planned'].includes(lbl);
    if (notStarted && t.startDate) {
      const st = new Date(t.startDate);
      if (st < today) {
        const daysLate = Math.floor((today - st) / 86400000);
        issues.push({ severity:'medium', category:'dates', task:t.taskName, phase:null,
          issue:`Start date was ${daysLate}d ago — task still not started` });
      }
    }
  });

  // Overdue: In Progress tasks past their due date
  allProjectTasks.forEach(t => {
    const lbl = t.status?.label || '';
    if ((lbl === 'In Progress' || lbl === 'In progress') && t.dueDate) {
      const due = new Date(t.dueDate);
      if (due < today) {
        const days = Math.floor((today - due) / 86400000);
        issues.push({ severity:'high', category:'overdue', task:t.taskName, phase:null, issue:`In-progress, ${days}d overdue` });
      }
    }
  });

  // Extended overdue: all other non-complete statuses (Blocked, On Hold, Todo…) past due
  allProjectTasks.forEach(t => {
    const lbl = (t.status?.label || '').trim();
    const isDone = lbl.toLowerCase().includes('complet');
    const isInProg = lbl === 'In Progress' || lbl === 'In progress';
    if (!isDone && !isInProg && t.dueDate) {
      const due = new Date(t.dueDate);
      if (due < today) {
        const days = Math.floor((today - due) / 86400000);
        issues.push({ severity:'high', category:'overdue', task:t.taskName, phase:null,
          issue:`${lbl||'Open'} task — ${days}d past due date` });
      }
    }
  });

  // Blocked tasks
  allProjectTasks.forEach(t => {
    if ((t.status?.label||'') === 'Blocked')
      issues.push({ severity:'high', category:'blocked', task:t.taskName, phase:null, issue:'Task is blocked' });
  });

  // Business day gaps > 5 between consecutive task due dates
  {
    const tasksWithDates = allProjectTasks
      .filter(t => { const l=(t.status?.label||'').toLowerCase(); return !l.includes('complet') && t.dueDate; })
      .sort((a,b) => new Date(a.dueDate) - new Date(b.dueDate));
    for (let i = 1; i < tasksWithDates.length; i++) {
      const prev = new Date(tasksWithDates[i-1].dueDate);
      const curr = new Date(tasksWithDates[i].dueDate);
      if (curr <= prev) continue;
      let bizDays = 0, d = new Date(prev);
      d.setDate(d.getDate()+1);
      while (d < curr) { if (d.getDay()!==0&&d.getDay()!==6) bizDays++; d.setDate(d.getDate()+1); }
      if (bizDays > 5)
        issues.push({ severity:'low', category:'gaps', task:`${tasksWithDates[i-1].taskName} → ${tasksWithDates[i].taskName}`, phase:null,
          issue:`${bizDays} business day gap between consecutive task due dates` });
    }
  }

  // Weekend due dates
  allProjectTasks.forEach(t => {
    const lbl = (t.status?.label || '').toLowerCase();
    if (lbl.includes('complet') || !t.dueDate) return;
    const day = new Date(t.dueDate).getDay();
    if (day === 0 || day === 6)
      issues.push({ severity:'low', category:'weekend', task:t.taskName, phase:null,
        issue:`Due date falls on a ${day === 0 ? 'Sunday' : 'Saturday'} — consider shifting to a weekday` });
  });

  // Long-running: In Progress tasks started > 14 days ago without completion
  allProjectTasks.forEach(t => {
    const lbl = t.status?.label || '';
    if ((lbl === 'In Progress' || lbl === 'In progress') && t.startDate) {
      const start = new Date(t.startDate);
      const ageDays = Math.floor((today - start) / 86400000);
      if (ageDays > 14)
        issues.push({ severity:'medium', category:'stale', task:t.taskName, phase:null,
          issue:`In Progress for ${ageDays} days without completion` });
    }
  });

  // Unowned active tasks: In Progress or Blocked tasks with no assignee
  allProjectTasks.forEach(t => {
    const lbl = t.status?.label || '';
    const isActive = lbl === 'In Progress' || lbl === 'In progress' || lbl === 'Blocked';
    const members = t.assignees?.members || [];
    const placeholders = t.assignees?.placeholders || [];
    const hasOwner = members.length > 0 || placeholders.length > 0;
    if (isActive && !hasOwner) {
      const alreadyFlagged = issues.some(i => i.task === t.taskName && i.category === 'ownership');
      if (!alreadyFlagged)
        issues.push({ severity:'high', category:'ownership', task:t.taskName, phase:null,
          issue:`${lbl} task has no owner assigned` });
    }
  });

  // ── STRUCTURE check: non-standard projects exit here ──
  if (!progress.isStandard) {
    const matchedOrders = new Set(mainFound.map(t => t._mt?.order).filter(Boolean));
    const matchedPhases = new Set(mainFound.map(t => t._mt?.phase).filter(Boolean));
    ['engage','drive','enable','convert'].forEach(ph => {
      if (!matchedPhases.has(ph))
        issues.push({ severity:'high', category:'structure', task:null, phase:ph, issue:`Phase missing: ${ph}` });
    });
    RL_METHODOLOGY.forEach(mt => {
      if (!matchedOrders.has(mt.order))
        issues.push({ severity:'high', category:'structure', task:null, phase:mt.phase, issue:`Standard task missing: "${mt.key}"` });
    });
    const orderCounts = {};
    mainFound.forEach(t => { const o = t._mt?.order; if (o) orderCounts[o] = (orderCounts[o]||0)+1; });
    Object.entries(orderCounts).filter(([,c])=>c>1).forEach(([o]) => {
      const mt = RL_METHODOLOGY.find(m => m.order === parseInt(o));
      if (mt) issues.push({ severity:'medium', category:'structure', task:null, phase:mt.phase, issue:`Duplicate task slot: "${mt.key}"` });
    });
    const hasStructureIssue = issues.some(i => i.category === 'structure');
    if (!hasStructureIssue)
      issues.push({ severity:'medium', category:'structure', task:null, phase:null, issue:'Non-standard structure — fewer than 7 methodology tasks found' });
    return issues;
  }

  // ── STANDARD-ONLY checks ──

  // Methodology task ownership (standard projects): flag incomplete tasks with no assignee
  allMainTasks.filter(t => !t.completed && !t.owner).forEach(t => {
    const alreadyFlagged = issues.some(i => i.task === t.taskName && i.category === 'ownership');
    if (!alreadyFlagged)
      issues.push({ severity:'medium', category:'ownership', task:t.taskName, phase:t._phase, issue:'No owner assigned' });
  });

  // Tasks due after project deadline
  if (project.dueDate) {
    const projDue = new Date(project.dueDate);
    allMainTasks.filter(t => !t.completed && t.dueDate).forEach(t => {
      if (new Date(t.dueDate) > projDue)
        issues.push({ severity:'medium', category:'dates', task:t.taskName, phase:t._phase, issue:'Due after project deadline' });
    });
  }

  // Date sequencing: start date on or after due date (methodology tasks)
  allMainTasks.filter(t => t.startDate && t.dueDate && !t.completed).forEach(t => {
    const start = new Date(t.startDate), due = new Date(t.dueDate);
    if (start >= due)
      issues.push({ severity:'medium', category:'dates', task:t.taskName, phase:t._phase,
        issue:'Start date is on or after due date' });
  });

  // Stale: no methodology progress since last snapshot
  if (prevSnapProject && prevSnapProject.completionPct != null && progress.overallPct != null
      && prevSnapProject.completionPct === progress.overallPct && progress.overallPct < 100)
    issues.push({ severity:'medium', category:'stale', task:null, phase:null, issue:'No methodology progress since last snapshot' });

  // Completion: project marked done but standard tasks still open
  if (projectStatus.includes('complet') || projectStatus.includes('done')) {
    const openMain = allMainTasks.filter(t => !t.completed);
    openMain.forEach(t => {
      issues.push({ severity:'high', category:'completion', task:t.taskName, phase:t._phase, issue:`Still open (${t.status || 'Unknown'}) — project marked complete` });
    });
  }

  // Closure: all methodology tasks done but Project Closure task not complete
  if (progress.overallPct === 100) {
    const cTask = allProjectTasks.find(t => {
      const n = (t.taskName||'').toLowerCase().trim();
      return n === 'project closure' || n.startsWith('project closure');
    });
    if (!cTask)
      issues.push({ severity:'low', category:'closure', task:null, phase:null, issue:'All delivery tasks complete — Project Closure task not found' });
    else if ((cTask.status?.label||'') !== 'Completed')
      issues.push({ severity:'medium', category:'closure', task:'Project Closure', phase:null, issue:`Delivery complete but Project Closure is ${cTask.status?.label||'open'}` });
  }

  // Premature completion: later-phase task done while earlier phase has open tasks
  {
    const phOrder = ['engage','drive','enable','convert'];
    phOrder.forEach((laterPh, laterIdx) => {
      if (laterIdx === 0) return;
      const doneInLater = (progress.phases[laterPh]?.tasks||[]).filter(t => t.completed);
      if (!doneInLater.length) return;
      for (let ei = 0; ei < laterIdx; ei++) {
        const earlyPh = phOrder[ei];
        const openInEarly = (progress.phases[earlyPh]?.tasks||[]).filter(t => !t.completed);
        if (openInEarly.length) {
          doneInLater.forEach(t => {
            const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
            issues.push({ severity:'medium', category:'premature', task:t.taskName, phase:laterPh,
              issue:`${cap(laterPh)} task completed while ${openInEarly.length} ${cap(earlyPh)} task(s) still open` });
          });
          break;
        }
      }
    });
  }

  // Inactive: In Progress project with 0% methodology completion
  if (projectStatus.includes('progress') && (progress.overallPct||0) === 0) {
    issues.push({ severity:'medium', category:'inactive', task:null, phase:null,
      issue:'Project In Progress with 0% methodology completion — possible stale or abandoned project' });
  }

  // All methodology tasks complete but project still In Progress
  if (progress.overallPct === 100 && projectStatus.includes('progress')) {
    issues.push({ severity:'medium', category:'closure', task:null, phase:null,
      issue:'All methodology tasks complete — project status should be updated from In Progress' });
  }

  return issues;
}

let rlFullCache = null;
let rlFullCacheAt = 0;
let rlFetchInProgress = null; // deduplication: shared promise across concurrent cold-start requests
const RL_FULL_CACHE_TTL = 2 * 60 * 1000; // 2 min — stale after this, refresh in background

async function rlFetchAllTasks(apiKey) {
  const now = Date.now();
  if (rlAllTasksCache && (now - rlAllTasksCacheAt) < RL_TASKS_CACHE_TTL) return rlAllTasksCache;
  const tasks = [];
  let pageToken = null;
  let hasMore = true;
  while (hasMore) {
    // includeAllFields=true ensures the API returns assignees.members/placeholders data
    const url = 'https://api.rocketlane.com/api/1.0/tasks?pageSize=200&includeAllFields=true' + (pageToken ? `&pageToken=${pageToken}` : '');
    let pageOk = false;
    for (let attempt = 0; attempt < 3 && !pageOk; attempt++) {
      try {
        if (attempt > 0) await new Promise(r => setTimeout(r, attempt * 1200));
        const r = await fetch(url, { headers: { 'api-key': apiKey, 'Accept': 'application/json' } });
        if (!r.ok) {
          if (r.status === 429 || r.status >= 500) continue; // transient — retry
          hasMore = false; break; // 4xx client error — stop
        }
        const d = await r.json();
        const chunk = Array.isArray(d.data) ? d.data : Object.values(d.data || {});
        chunk.forEach(t => { if (t && t.taskId) tasks.push(t); });
        hasMore = d.pagination?.hasMore || false;
        pageToken = d.pagination?.nextPageToken || null;
        pageOk = true;
      } catch { /* retry */ }
    }
    if (!pageOk) break; // all 3 attempts failed — stop pagination
  }
  // Only replace the cache when the new fetch looks complete (≥70% of previous count)
  const prevCount = rlAllTasksCache?.length || 0;
  if (tasks.length > 0 && tasks.length >= prevCount * 0.7) {
    rlAllTasksCache = tasks;
    rlAllTasksCacheAt = now;
  }
  return tasks.length > 0 ? tasks : (rlAllTasksCache || []);
}

async function rlFetchCompletionMap(apiKey) {
  const map = {}; // projectId -> { total, completed, inprogress, todo }
  let pageToken = null;
  let hasMore = true;
  while (hasMore) {
    const url = 'https://api.rocketlane.com/api/1.0/tasks?pageSize=100' + (pageToken ? `&pageToken=${pageToken}` : '');
    try {
      const r = await fetch(url, { headers: { 'api-key': apiKey, 'Accept': 'application/json' } });
      if (!r.ok) break;
      const d = await r.json();
      (d.data || []).forEach(task => {
        const pid = task.project?.projectId;
        if (!pid) return;
        if (!map[pid]) map[pid] = { total: 0, completed: 0, inprogress: 0, todo: 0 };
        map[pid].total++;
        const lbl = task.status?.label || '';
        if (lbl === 'Completed') map[pid].completed++;
        else if (lbl === 'In progress') map[pid].inprogress++;
        else map[pid].todo++;
      });
      hasMore = d.pagination?.hasMore || false;
      pageToken = d.pagination?.nextPageToken || null;
    } catch { break; }
  }
  return map;
}

app.get('/api/rocketlane/projects', async (req, res) => {
  const apiKey = process.env.ROCKETLANE_API_KEY;
  if (!apiKey) {
    return res.status(503).json({ error: 'not_configured', message: 'ROCKETLANE_API_KEY environment variable not set. Add it in Vercel → Project → Environment Variables.' });
  }
  await getDbInitPromise(); ensureACL();
  const email = (req.headers['x-user-email'] || '').toLowerCase().trim();
  if (!email) console.warn('[RL] /api/rocketlane/projects called without x-user-email header — returning no data');
  const allowedRLIds = getAllowedRLProjectIds(email);
  function applyRLProjectsACL(data) {
    if (allowedRLIds === null) return data;
    const projects = data.data || [];
    const idSet = new Set(allowedRLIds.map(String));
    const ownerName = resolveNameFromEmail(email);
    const filtered = projects.filter(p =>
      idSet.has(String(p.projectId)) ||
      (ownerName && (p.projectOwner === ownerName || (p.owner && [p.owner.firstName, p.owner.lastName].filter(Boolean).join(' ').trim() === ownerName)))
    );
    return { ...data, data: filtered, _restricted: true, _email: email || null };
  }
  const now = Date.now();
  if (rlCache && !req.query.refresh && (now - rlCacheAt) < RL_CACHE_TTL) {
    return res.json({ ...applyRLProjectsACL(rlCache), cached: true, cacheAge: Math.round((now - rlCacheAt) / 1000) });
  }
  try {
    const [projResp, completionMap] = await Promise.all([
      fetch('https://api.rocketlane.com/api/1.0/projects', {
        headers: { 'api-key': apiKey, 'Accept': 'application/json', 'Content-Type': 'application/json' }
      }),
      rlFetchCompletionMap(apiKey)
    ]);
    const text = await projResp.text();
    let data;
    try { data = JSON.parse(text); } catch { return res.status(502).json({ error: 'invalid_json', message: text.slice(0, 300) }); }
    if (!projResp.ok) return res.status(projResp.status).json({ error: 'api_error', status: projResp.status, message: data?.message || text.slice(0, 300) });
    // Attach completion percentage to each project
    const projects = data.data || data.projects || (Array.isArray(data) ? data : []);
    projects.forEach(p => {
      const pid = p.projectId;
      const comp = completionMap[pid];
      if (comp && comp.total > 0) {
        p.completionPct = Math.min(100, Math.round((comp.completed + comp.inprogress * 0.5) / comp.total * 100));
        p.completionTasks = comp;
      } else {
        const lbl = (p.status?.label || '').toLowerCase();
        p.completionPct = lbl.includes('complet') ? 100 : 0;
        p.completionTasks = { total: 0, completed: 0, inprogress: 0, todo: 0 };
      }
    });
    rlCache = data;
    rlCacheAt = now;
    res.json({ ...applyRLProjectsACL(data), cached: false, fetchedAt: now });
  } catch (e) {
    console.error('[RL] fetch_failed:', e.message);
    res.status(500).json({ error: 'fetch_failed', message: e.message });
  }
});

// ── Rocketlane My Work ────────────────────────────────────────────────────────
app.get('/api/rocketlane/my-work', async (req, res) => {
  const apiKey = process.env.ROCKETLANE_API_KEY;
  if (!apiKey) return res.status(503).json({ error: 'not_configured' });

  const email = (req.query.email || '').trim().toLowerCase();
  if (!email) return res.status(400).json({ error: 'email query param required' });

  try {
    // Fetch projects + all tasks in parallel (tasks use shared cache)
    const [projResp, allTasks] = await Promise.all([
      fetch('https://api.rocketlane.com/api/1.0/projects?pageSize=100', {
        headers: { 'api-key': apiKey, 'Accept': 'application/json' }
      }),
      rlFetchAllTasks(apiKey)
    ]);

    const projData = await projResp.json();
    const allProjects = projData.data || [];

    // Projects where the user is a team member (match by email)
    const myProjects = allProjects.filter(p =>
      (p.teamMembers?.members || []).some(m => (m.emailId || '').toLowerCase() === email)
    );

    const myProjectIds = new Set(myProjects.map(p => p.projectId));
    const now = new Date();

    // Tasks in user's projects, excluding archived/completed, sorted by due date
    const myTasks = allTasks
      .filter(t => !t.archived && myProjectIds.has(t.project?.projectId))
      .map(t => ({
        taskId: t.taskId,
        taskName: t.taskName,
        startDate: t.startDate || null,
        dueDate: t.dueDate || null,
        status: { value: t.status?.value, label: t.status?.label || 'Unknown' },
        projectId: t.project?.projectId,
        projectName: t.project?.projectName,
        overdue: t.dueDate && t.status?.label !== 'Completed' && new Date(t.dueDate) < now
      }))
      .sort((a, b) => {
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return new Date(a.dueDate) - new Date(b.dueDate);
      });

    const projects = myProjects.map(p => ({
      projectId: p.projectId,
      projectName: p.projectName,
      startDate: p.startDate || null,
      dueDate: p.dueDate || null,
      status: { value: p.status?.value, label: p.status?.label || 'Unknown' },
      customer: p.customer?.companyName || null,
      completionPct: (() => {
        const proj = allTasks.filter(t => t.project?.projectId === p.projectId);
        if (!proj.length) return 0;
        const done = proj.filter(t => t.status?.label === 'Completed').length;
        const inprog = proj.filter(t => t.status?.label === 'In progress').length;
        return Math.round((done + inprog * 0.5) / proj.length * 100);
      })()
    }));

    res.json({ projects, tasks: myTasks });
  } catch (e) {
    res.status(500).json({ error: 'fetch_failed', message: e.message });
  }
});

// ── Article Feedback ──────────────────────────────────────────────────────────
function ensureFeedback() { if (!db.feedback) db.feedback = []; }

app.get('/api/feedback', async (req, res) => {
  if (!isAdmin(req)) return res.status(401).json({ error: 'Admin required' });
  if (mongoCol) {
    try {
      const doc = await mongoCol.findOne({ _id: 'main' }, { projection: { feedback: 1 } });
      const feedback = doc?.feedback || [];
      return res.json([...feedback].sort((a,b) => new Date(b.submittedAt)-new Date(a.submittedAt)));
    } catch(e) { console.error('[GET feedback/mongo]', e.message); }
  }
  ensureFeedback();
  res.json([...db.feedback].sort((a,b) => new Date(b.submittedAt)-new Date(a.submittedAt)));
});

app.post('/api/feedback', async (req, res) => {
  ensureFeedback();
  const { articleId, articleTitle, submittedBy, submittedByInitials, type, description } = req.body;
  if (!articleId || !type || !description?.trim())
    return res.status(400).json({ error: 'articleId, type, and description required' });
  const now = new Date().toISOString();
  const fb = {
    id: Date.now(),
    articleId, articleTitle: articleTitle || '',
    submittedBy: submittedBy || 'Anonymous',
    submittedByInitials: submittedByInitials || 'AN',
    submittedAt: now, type,
    description: description.trim(),
    status: 'open', resolutionNotes: '',
    history: [{ status: 'open', at: now, by: 'system', note: 'Feedback submitted' }]
  };
  db.feedback.push(fb);
  if (mongoCol) {
    try {
      await mongoCol.updateOne({ _id: 'main' }, { $push: { feedback: fb } }, { upsert: false });
    } catch(e) { console.error('[POST feedback/mongo]', e.message); try { await saveDB(db); } catch(_){} }
  }
  res.status(201).json(fb);
});

app.put('/api/feedback/:id', async (req, res) => {
  if (!isAdmin(req)) return res.status(401).json({ error: 'Admin required' });
  ensureFeedback();
  const id = parseInt(req.params.id);
  const idx = db.feedback.findIndex(f => f.id === id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  const { status, resolutionNotes, adminName } = req.body;
  const fb = { ...db.feedback[idx] };
  const now = new Date().toISOString();
  if (status && status !== fb.status) {
    fb.history = [...(fb.history || []), { status, at: now, by: adminName || 'Admin', note: resolutionNotes || '' }];
    fb.status = status;
    if (status === 'resolved') fb.resolvedAt = now;
    if (status === 'closed')   fb.closedAt = now;
  }
  if (resolutionNotes !== undefined) fb.resolutionNotes = resolutionNotes;
  db.feedback[idx] = fb;
  if (mongoCol) {
    try {
      await mongoCol.updateOne({ _id: 'main' }, { $set: { [`feedback.${idx}`]: fb } });
    } catch(e) { console.error('[PUT feedback/mongo]', e.message); try { await saveDB(db); } catch(_){} }
  }
  res.json(fb);
});

// ── Rocketlane Snapshots ──────────────────────────────────────────────────────
function ensureRL() {
  if (!db.rocketlane) db.rocketlane = { snapshots: [], nextSnapshotId: 1, findings: [], nextFindingId: 1 };
  if (!db.rocketlane.findings) db.rocketlane.findings = [];
  if (!db.rocketlane.nextFindingId) db.rocketlane.nextFindingId = 1;
  // Remove any previously stored fullData from MongoDB to reduce document size and data transfer costs
  if ('fullData' in db.rocketlane) { delete db.rocketlane.fullData; delete db.rocketlane.fullDataAt; }
}

app.get('/api/rocketlane/snapshots', (req, res) => {
  ensureRL();
  // Build owner lookup from the full data cache so historical snapshots
  // (captured before projectOwner was stored) get retroactively enriched.
  const ownerLookup = {};
  const fullProjects = rlFullCache?.projects || [];
  fullProjects.forEach(p => {
    if (p.projectId && p.projectOwner) ownerLookup[String(p.projectId)] = p.projectOwner;
  });
  const enrich = Object.keys(ownerLookup).length > 0;
  const snapshots = enrich
    ? db.rocketlane.snapshots.map(snap => ({
        ...snap,
        projects: (snap.projects || []).map(p => {
          if (p.projectOwner) return p;
          const owner = ownerLookup[String(p.projectId)];
          return owner ? { ...p, projectOwner: owner } : p;
        })
      }))
    : db.rocketlane.snapshots;
  res.json({ snapshots: [...snapshots].reverse() });
});

app.post('/api/rocketlane/snapshots', async (req, res) => {
  ensureRL();
  const { type, label, projects } = req.body;
  if (!type || !label || !Array.isArray(projects)) return res.status(400).json({ error: 'type, label, projects required' });
  const snap = {
    id: db.rocketlane.nextSnapshotId++,
    type, label,
    capturedAt: new Date().toISOString(),
    projects
  };
  db.rocketlane.snapshots.push(snap);
  await saveDB(db);
  res.json({ ok: true, snapshot: snap });
});

app.delete('/api/rocketlane/snapshots/:id', async (req, res) => {
  ensureRL();
  const id = parseInt(req.params.id);
  db.rocketlane.snapshots = db.rocketlane.snapshots.filter(s => s.id !== id);
  await saveDB(db);
  res.json({ ok: true });
});

// ── Rocketlane Findings ───────────────────────────────────────────────────────
// ── Temporary diagnostic: inspect raw task fields ──────────────────────────

app.get('/api/rocketlane/findings', (req, res) => {
  ensureRL();
  res.json({ findings: db.rocketlane.findings });
});

app.post('/api/rocketlane/findings', async (req, res) => {
  ensureRL();
  const { projectId, projectName, checkId, title, severity, description } = req.body;
  const finding = {
    id: db.rocketlane.nextFindingId++,
    projectId, projectName, checkId,
    title: title || 'Untitled', severity: severity || 'medium',
    description: description || '',
    status: 'open', createdAt: new Date().toISOString()
  };
  db.rocketlane.findings.push(finding);
  await saveDB(db);
  res.status(201).json({ ok: true, finding });
});

app.put('/api/rocketlane/findings/:id', async (req, res) => {
  ensureRL();
  const id = parseInt(req.params.id);
  const idx = db.rocketlane.findings.findIndex(f => f.id === id);
  if (idx === -1) return res.status(404).json({ error: 'not_found' });
  db.rocketlane.findings[idx] = { ...db.rocketlane.findings[idx], ...req.body, id };
  await saveDB(db);
  res.json({ ok: true, finding: db.rocketlane.findings[idx] });
});

app.delete('/api/rocketlane/findings/:id', async (req, res) => {
  ensureRL();
  const id = parseInt(req.params.id);
  db.rocketlane.findings = db.rocketlane.findings.filter(f => f.id !== id);
  await saveDB(db);
  res.json({ ok: true });
});

// ── Schedule & task-level metrics per project ─────────────────────────────────
function rlComputeScheduleMetrics(project, progress, tasks) {
  const today = new Date(); today.setHours(0,0,0,0);
  const todayMs = today.getTime();
  const statusLbl = (project.status?.label || '').toLowerCase();

  const overdueTaskCount = tasks.filter(t => {
    const l = (t.status?.label || '').toLowerCase();
    return !l.includes('complet') && t.dueDate && new Date(t.dueDate).getTime() < todayMs;
  }).length;

  const blockedTaskCount = tasks.filter(t =>
    (t.status?.label || '').toLowerCase().includes('block')
  ).length;

  let expectedProgressPct = null, scheduleVarianceDays = null, onSchedule = 'no-date';
  if (statusLbl.includes('complet') || statusLbl.includes('cancel')) {
    onSchedule = 'completed';
  } else if (project.startDate && project.dueDate) {
    const start = new Date(project.startDate).getTime();
    const due   = new Date(project.dueDate).getTime();
    const totalDays = Math.max(1, (due - start) / 86400000);
    const elapsed   = Math.min(totalDays, Math.max(0, (todayMs - start) / 86400000));
    expectedProgressPct = Math.round(elapsed / totalDays * 100);
    const actual = progress.overallPct ?? 0;
    const variance = actual - expectedProgressPct;
    scheduleVarianceDays = Math.round(variance / 100 * totalDays);
    onSchedule = scheduleVarianceDays >= 0 ? 'on-track' : scheduleVarianceDays >= -14 ? 'at-risk' : 'delayed';
  } else if (project.dueDate) {
    onSchedule = new Date(project.dueDate).getTime() < todayMs ? 'delayed' : 'no-date';
  }

  // Current active phase for standard projects
  let currentPhase = null;
  if (progress.isStandard && progress.phases) {
    for (const ph of ['engage','drive','enable','convert']) {
      if ((progress.phases[ph]?.pct ?? 0) < 100) { currentPhase = ph; break; }
    }
    if (!currentPhase) currentPhase = 'completed';
  }

  // Planned duration per completed phase (using task startDate/dueDate span as proxy)
  const phaseDurations = {};
  if (progress.isStandard && progress.phases) {
    for (const ph of ['engage','drive','enable','convert']) {
      const pTasks = progress.phases[ph]?.tasks || [];
      if (!pTasks.length || !pTasks.every(t => t.completed)) { phaseDurations[ph] = null; continue; }
      const dates = pTasks.filter(t => t.startDate && t.dueDate)
        .map(t => [new Date(t.startDate).getTime(), new Date(t.dueDate).getTime()]);
      if (!dates.length) { phaseDurations[ph] = null; continue; }
      phaseDurations[ph] = Math.max(1, Math.round(
        (Math.max(...dates.map(d => d[1])) - Math.min(...dates.map(d => d[0]))) / 86400000
      ));
    }
  }

  return {
    startDate: project.startDate || null,
    overdueTaskCount, blockedTaskCount,
    expectedProgressPct, scheduleVarianceDays, onSchedule,
    currentPhase, phaseDurations
  };
}

// ── Rocketlane Projects Full (methodology-based) ──────────────────────────────
async function rlDoFullFetch(apiKey) {
  // Deduplicate concurrent fetches — if one is already running, share its promise
  if (rlFetchInProgress) return rlFetchInProgress;
  rlFetchInProgress = _rlDoFullFetch(apiKey).finally(() => { rlFetchInProgress = null; });
  return rlFetchInProgress;
}

async function _rlDoFullFetch(apiKey) {
  const now = Date.now();
  const [projResp, allTasks] = await Promise.all([
    fetch('https://api.rocketlane.com/api/1.0/projects?pageSize=100', { headers: { 'api-key': apiKey, 'Accept': 'application/json' } }),
    rlFetchAllTasks(apiKey)
  ]);
  if (!projResp.ok) throw new Error('Rocketlane API ' + projResp.status);
  const projData = await projResp.json();
  const allProjects = Array.isArray(projData.data) ? projData.data : Object.values(projData.data || {});
  const tasksByProject = {};
  allTasks.forEach(t => {
    const pid = t.project?.projectId;
    if (!pid) return;
    if (!tasksByProject[pid]) tasksByProject[pid] = [];
    tasksByProject[pid].push(t);
  });
  await getDbInitPromise();
  ensureRL();
  const prevSnap = db.rocketlane.snapshots.length > 0
    ? db.rocketlane.snapshots[db.rocketlane.snapshots.length - 1] : null;
  const projects = allProjects.map(p => {
    const progress = rlBuildProjectProgress(tasksByProject[p.projectId] || []);
    const prevSnapProject = prevSnap?.projects?.find(proj => proj.projectId === p.projectId) || null;
    const issues = rlBuildCompliance(p, progress, tasksByProject[p.projectId] || [], prevSnapProject);
    // Rocketlane exposes the project owner as a direct top-level `owner` field
    // with { firstName, lastName, emailId, userId } — not derivable from teamMembers
    const projectOwner = (() => {
      const o = p.owner;
      if (!o) return null;
      return [o.firstName, o.lastName].filter(Boolean).join(' ').trim() || o.emailId || null;
    })();
    const metrics = rlComputeScheduleMetrics(p, progress, tasksByProject[p.projectId] || []);
    return {
      projectId: p.projectId, projectName: p.projectName,
      status: p.status?.label || 'Unknown',
      customer: p.customer?.companyName || null,
      projectOwner,
      startDate: metrics.startDate,
      dueDate: p.dueDate || null,
      isStandard: progress.isStandard,
      overallPct: progress.overallPct,
      phases: progress.phases,
      mainTaskCount: progress.mainTaskCount,
      totalTasks: progress.totalTasks,
      compliance: { issues, issueCount: issues.length },
      overdueTaskCount: metrics.overdueTaskCount,
      blockedTaskCount: metrics.blockedTaskCount,
      expectedProgressPct: metrics.expectedProgressPct,
      scheduleVarianceDays: metrics.scheduleVarianceDays,
      onSchedule: metrics.onSchedule,
      currentPhase: metrics.currentPhase,
      phaseDurations: metrics.phaseDurations
    };
  });
  const standard = projects.filter(p => p.isStandard);
  const avgProgress = standard.length ? Math.round(standard.reduce((s, p) => s + (p.overallPct || 0), 0) / standard.length) : 0;
  const phaseAvg = { engage: 0, drive: 0, enable: 0, convert: 0 };
  if (standard.length) {
    ['engage','drive','enable','convert'].forEach(ph => {
      phaseAvg[ph] = Math.round(standard.map(p => p.phases?.[ph]?.pct || 0).reduce((a, v) => a + v, 0) / standard.length);
    });
  }
  const result = {
    projects,
    summary: {
      total: projects.length, standard: standard.length, nonStandard: projects.length - standard.length,
      avgProgress, phaseAvg,
      byStatus: projects.reduce((m, p) => { m[p.status] = (m[p.status] || 0) + 1; return m; }, {})
    },
    tasksFetched: allTasks.length,
    fetchedAt: now
  };
  // Sanity check: if new fetch has far fewer tasks than the previous cache, it's likely
  // an incomplete paginated fetch (network error mid-way). Don't overwrite good data.
  const prev = rlFullCache;
  const prevStandard = prev?.summary?.standard || 0;
  const prevTasksFetched = prev?.tasksFetched || 0;
  const looksIncomplete =
    prevStandard >= 5 &&
    result.summary.standard < Math.floor(prevStandard * 0.6) &&
    prevTasksFetched > 0 &&
    allTasks.length < prevTasksFetched * 0.7;
  if (looksIncomplete) {
    // Return the previous good result rather than overwriting with bad data
    return { ...prev, stale: false };
  }
  rlFullCache = result;
  rlFullCacheAt = now;
  return result;
}

app.get('/api/rocketlane/projects-full', async (req, res) => {
  const apiKey = process.env.ROCKETLANE_API_KEY;
  if (!apiKey) return res.status(503).json({ error: 'not_configured', message: 'ROCKETLANE_API_KEY not set.' });
  const now = Date.now();
  const isRefresh = !!req.query.refresh;
  const email = (req.headers['x-user-email'] || '').toLowerCase().trim();

  await getDbInitPromise();
  ensureACL(); ensureRL();

  // Fresh in-memory cache — return instantly
  if (!isRefresh && rlFullCache && (now - rlFullCacheAt) < RL_FULL_CACHE_TTL)
    return res.json({ ...filterRLResponseForUser(rlFullCache, email), cached: true, cacheAge: Math.round((now - rlFullCacheAt) / 1000) });

  // Forced refresh with existing cache: return current data immediately so the UI stays
  // responsive, kick a fresh Rocketlane fetch in the background, client polls for the result
  if (isRefresh && rlFullCache) {
    rlAllTasksCache = null;
    rlAllTasksCacheAt = 0;
    rlFetchInProgress = null;
    rlDoFullFetch(apiKey).catch(() => {});
    return res.json({ ...filterRLResponseForUser(rlFullCache, email), stale: true, refreshing: true, cacheAge: Math.round((now - rlFullCacheAt) / 1000) });
  }

  // Stale in-memory cache (no explicit refresh) — return instantly, kick background refresh
  if (!isRefresh && rlFullCache) {
    res.json({ ...filterRLResponseForUser(rlFullCache, email), stale: true, cacheAge: Math.round((now - rlFullCacheAt) / 1000) });
    rlDoFullFetch(apiKey).catch(() => {});
    return;
  }

  // Cold start (no cache, not a forced refresh): if a fetch is already in flight,
  // return loading so the client polls — it will get data once the fetch lands
  if (!isRefresh && rlFetchInProgress) {
    return res.json({ loading: true });
  }

  // True cold start (no cache at all): must wait for the first fetch
  if (isRefresh) { rlAllTasksCache = null; rlAllTasksCacheAt = 0; rlFetchInProgress = null; }
  try {
    const result = await rlDoFullFetch(apiKey);
    res.json({ ...filterRLResponseForUser(result, email), cached: false });
  } catch (e) {
    if (rlFullCache)
      return res.json({ ...filterRLResponseForUser(rlFullCache, email), stale: true, error: e.message });
    res.status(500).json({ error: 'fetch_failed', message: e.message });
  }
});

// ── Proxy Login ───────────────────────────────────────────────────────────────
function ensureProxyLogs() { if (!db.proxyLogs) db.proxyLogs = []; }

app.get('/api/proxy/users', async (req, res) => {
  if (!isAdmin(req)) return res.status(401).json({ error: 'Admin required' });
  const apiKey = process.env.ROCKETLANE_API_KEY;
  if (!apiKey) {
    const emails = db.settings?.adminEmails || [];
    return res.json({ users: emails.map(e => ({ name: e.split('@')[0], email: e, role: null, initials: (e[0]||'?').toUpperCase() })), source: 'settings' });
  }
  try {
    // Collect all unique team members from every project (most reliable Rocketlane source)
    const memberMap = new Map();
    let pageToken = null;
    let hasMore = true;
    while (hasMore) {
      const url = 'https://api.rocketlane.com/api/1.0/projects?pageSize=100' + (pageToken ? '&pageToken=' + pageToken : '');
      const r = await fetch(url, { headers: { 'api-key': apiKey, 'Accept': 'application/json' } });
      if (!r.ok) throw new Error('Rocketlane projects API ' + r.status);
      const d = await r.json();
      (d.data || []).forEach(p => {
        (p.teamMembers?.members || []).forEach(m => {
          const email = (m.emailId || m.email || '').toLowerCase().trim();
          if (!email || memberMap.has(email)) return;
          const name = m.name || [m.firstName, m.lastName].filter(Boolean).join(' ') || email.split('@')[0];
          const role = m.designation || m.role || m.jobTitle || null;
          const initials = name.split(/\s+/).filter(Boolean).map(w => w[0]).slice(0,2).join('').toUpperCase() || '?';
          memberMap.set(email, { name, email, role, initials });
        });
      });
      hasMore = d.pagination?.hasMore || false;
      pageToken = d.pagination?.nextPageToken || null;
    }
    // Also merge all skill matrix employees so all 88 team members appear
    const smEmployees = db.skillMatrix?.employees || [];
    const memberEmails = db.learning?.memberEmails || {};
    smEmployees.forEach(empName => {
      const name = typeof empName === 'object' ? (empName.name || '') : empName;
      if (!name) return;
      const email = (memberEmails[name] || '').toLowerCase().trim();
      const alreadyInByEmail = email && memberMap.has(email);
      const alreadyInByName = [...memberMap.values()].some(m => m.name.toLowerCase() === name.toLowerCase());
      if (!alreadyInByEmail && !alreadyInByName) {
        const initials = name.split(/\s+/).filter(Boolean).map(w => w[0]).slice(0,2).join('').toUpperCase() || '?';
        const key = email || ('__name__' + name.toLowerCase());
        memberMap.set(key, { name, email, role: null, initials });
      }
    });
    const users = [...memberMap.values()].sort((a, b) => a.name.localeCompare(b.name));
    res.json({ users, source: 'rocketlane_projects' });
  } catch(e) {
    // Fallback: use skill matrix employees with any known emails
    const smEmployees = db.skillMatrix?.employees || [];
    const memberEmails = db.learning?.memberEmails || {};
    const fallbackMap = new Map();
    smEmployees.forEach(empName => {
      const name = typeof empName === 'object' ? (empName.name || '') : empName;
      if (!name) return;
      const email = (memberEmails[name] || '').toLowerCase().trim();
      const initials = name.split(/\s+/).filter(Boolean).map(w => w[0]).slice(0,2).join('').toUpperCase() || '?';
      fallbackMap.set(name.toLowerCase(), { name, email, role: null, initials });
    });
    const users = [...fallbackMap.values()].sort((a, b) => a.name.localeCompare(b.name));
    res.json({ users, source: 'fallback', error: e.message });
  }
});

app.post('/api/proxy/log', async (req, res) => {
  if (!isAdmin(req)) return res.status(401).json({ error: 'Admin required' });
  ensureProxyLogs();
  const { event, adminName, adminEmail, targetName, targetEmail, sessionId, startedAt } = req.body;
  const now = new Date().toISOString();
  if (event === 'start') {
    db.proxyLogs.push({ id: Number(sessionId)||Date.now(), adminName: adminName||'', adminEmail: adminEmail||'', targetName: targetName||'', targetEmail: targetEmail||'', startedAt: startedAt||now, endedAt: null, duration: null });
  } else if (event === 'end') {
    const entry = db.proxyLogs.find(l => l.id === Number(sessionId));
    if (entry && !entry.endedAt) {
      entry.endedAt = now;
      const ms = new Date(now) - new Date(entry.startedAt);
      entry.duration = ms < 60000 ? '<1 min' : Math.round(ms/60000) + ' min';
    }
  }
  if (mongoCol) {
    try { await mongoCol.updateOne({ _id: 'main' }, { $set: { proxyLogs: db.proxyLogs } }); } catch(e) { console.error('[proxy/log]', e.message); }
  } else { try { await saveDB(db); } catch(_){} }
  res.json({ ok: true });
});

app.get('/api/proxy/logs', (req, res) => {
  if (!isAdmin(req)) return res.status(401).json({ error: 'Admin required' });
  ensureProxyLogs();
  res.json([...db.proxyLogs].reverse().slice(0, 200));
});

// ── User Management (Google Auth) ─────────────────────────────────────────────
function ensureUsers() {
  if (!db.users) db.users = [];
}

app.post('/api/auth/google', async (req, res) => {
  ensureUsers();
  const { name, email, picture, googleId } = req.body;
  if (!email) return res.status(400).json({ error: 'email required' });
  if (!email.toLowerCase().endsWith('@bluecopa.com')) {
    return res.status(403).json({ error: 'access_denied', message: 'Access is restricted to @bluecopa.com accounts.' });
  }
  let user = db.users.find(u => u.email === email);
  if (!user) {
    user = {
      email, name, picture, googleId,
      role: db.users.length === 0 ? 'admin' : 'member',
      joinedAt: new Date().toISOString(),
      lastSeen: new Date().toISOString()
    };
    db.users.push(user);
  } else {
    user.name = name;
    user.picture = picture;
    if (googleId) user.googleId = googleId;
    user.lastSeen = new Date().toISOString();
  }
  await saveDB(db);
  res.json({ user: { email: user.email, name: user.name, role: user.role, picture: user.picture } });
});

app.get('/api/users', (req, res) => {
  if (!isAdmin(req)) return res.status(401).json({ error: 'Admin required' });
  ensureUsers();
  res.json(db.users.map(u => ({
    email: u.email, name: u.name, role: u.role,
    picture: u.picture, joinedAt: u.joinedAt, lastSeen: u.lastSeen
  })));
});

app.patch('/api/users/:email/role', async (req, res) => {
  if (!isAdmin(req)) return res.status(401).json({ error: 'Admin required' });
  ensureUsers();
  const user = db.users.find(u => u.email === decodeURIComponent(req.params.email));
  if (!user) return res.status(404).json({ error: 'User not found' });
  user.role = req.body.role;
  await saveDB(db);
  res.json({ email: user.email, name: user.name, role: user.role });
});

// ── ACL Routes ────────────────────────────────────────────────────────────────

app.get('/api/acl', async (req, res) => {
  await getDbInitPromise(); ensureACL();
  const email = (req.headers['x-user-email'] || '').toLowerCase().trim();
  res.json({ ok: true, acl: getUserACL(email) });
});

app.get('/api/acl/audit', async (req, res) => {
  if (!isAdmin(req)) return res.status(401).json({ error: 'Admin required' });
  await getDbInitPromise(); ensureACL();
  res.json({ ok: true, audit: db.aclAudit || [] });
});

// Must be before /api/acl/:email so it doesn't catch "audit"
app.get('/api/acl/users', async (req, res) => {
  if (!isAdmin(req)) return res.status(401).json({ error: 'Admin required' });
  await getDbInitPromise(); ensureACL(); ensureUsers();
  const adminEmails = new Set(((db.settings && db.settings.adminEmails) || ['azhar.m@bluecopa.com']).map(e=>e.toLowerCase()));
  const users = (db.users || []).map(u => ({
    email: u.email, name: u.name, picture: u.picture, role: u.role,
    isAdmin: adminEmails.has((u.email||'').toLowerCase()),
    acl: getUserACL(u.email)
  }));
  res.json({ ok: true, users });
});

app.delete('/api/acl/:email', async (req, res) => {
  if (!isAdmin(req)) return res.status(401).json({ error: 'Admin required' });
  await getDbInitPromise(); ensureACL(); ensureUsers();
  const targetEmail = decodeURIComponent(req.params.email).toLowerCase().trim();
  const adminEmails = ((db.settings && db.settings.adminEmails) || ['azhar.m@bluecopa.com']).map(e=>e.toLowerCase());
  if (adminEmails.includes(targetEmail)) return res.status(400).json({ error: 'Cannot remove an admin account' });
  db.users = (db.users||[]).filter(u=>(u.email||'').toLowerCase() !== targetEmail);
  delete db.acl[targetEmail];
  const memberEmails = db.learning?.memberEmails || {};
  for (const [name, em] of Object.entries(memberEmails)) {
    if (em && em.toLowerCase().trim() === targetEmail) delete memberEmails[name];
  }
  const adminEmail = (req.headers['x-user-email'] || '').toLowerCase().trim();
  if (!db.aclAudit) db.aclAudit = [];
  db.aclAudit.unshift({ changedBy: adminEmail, targetEmail, action: 'delete', timestamp: new Date().toISOString() });
  if (db.aclAudit.length > 500) db.aclAudit.length = 500;
  await saveDB(db);
  res.json({ ok: true });
});

app.post('/api/acl/bulk-assign', async (req, res) => {
  if (!isAdmin(req)) return res.status(401).json({ error: 'Admin required' });
  await getDbInitPromise(); ensureACL(); ensureUsers();
  const { emails, role } = req.body;
  if (!Array.isArray(emails) || !emails.length) return res.status(400).json({ error: 'emails required' });
  const template = ROLE_TEMPLATES[role];
  if (!template) return res.status(400).json({ error: 'Invalid role: ' + role });
  const adminEmail = (req.headers['x-user-email'] || '').toLowerCase().trim();
  const adminEmails = ((db.settings && db.settings.adminEmails) || ['azhar.m@bluecopa.com']).map(e=>e.toLowerCase());
  let count = 0;
  for (const email of emails) {
    const lc = (email||'').toLowerCase().trim();
    if (!lc || adminEmails.includes(lc)) continue;
    const prev = db.acl[lc] || {};
    const updated = { ...template, updatedAt: new Date().toISOString() };
    db.acl[lc] = updated;
    const userRecord = (db.users||[]).find(u=>(u.email||'').toLowerCase()===lc);
    if (userRecord) userRecord.role = role;
    db.aclAudit.unshift({ changedBy: adminEmail, targetEmail: lc, action: 'bulk-assign', role, prev, next: updated, timestamp: new Date().toISOString() });
    count++;
  }
  if (db.aclAudit.length > 500) db.aclAudit.length = 500;
  await saveDB(db);
  res.json({ ok: true, count });
});

app.put('/api/acl/:email', async (req, res) => {
  if (!isAdmin(req)) return res.status(401).json({ error: 'Admin required' });
  await getDbInitPromise(); ensureACL(); ensureUsers();
  const targetEmail = decodeURIComponent(req.params.email).toLowerCase().trim();
  const modules = ['skillMatrix','kpis','uat','ews','rocketlane'];
  const prev = db.acl[targetEmail] || {};
  const updated = { updatedAt: new Date().toISOString() };
  const body = req.body.acl || req.body;
  modules.forEach(m => { updated[m] = body[m] || prev[m] || ACL_DEFAULTS[m]; });
  db.acl[targetEmail] = updated;
  // persist role to user record if provided
  const role = req.body.role;
  if (role) {
    const userRecord = (db.users||[]).find(u=>(u.email||'').toLowerCase()===targetEmail);
    if (userRecord) userRecord.role = role;
  }
  const adminEmail = (req.headers['x-user-email'] || '').toLowerCase().trim();
  db.aclAudit.unshift({ changedBy: adminEmail, targetEmail, prev, next: updated, timestamp: new Date().toISOString() });
  if (db.aclAudit.length > 500) db.aclAudit.length = 500;
  await saveDB(db);
  res.json({ ok: true, acl: updated });
});

// ── Learning Management ────────────────────────────────────────────────────────
const NJ_PHASE1   = ['ap','ar','mis','o2c','p2p','r2r'];
const NJ_PHASE2   = ['bc','di','aw','wf','rc','er','ci'];
const NJ_ALL      = [...NJ_PHASE1, ...NJ_PHASE2];
const PORTAL_URL  = 'https://deliverywiki.bluecopa.com';
const BC_LOGO_URL = 'https://deliverywiki.bluecopa.com/bluecopa-icon.png';

const ENROLLMENT_COURSE_INFO = {
  ap:  { title:'Account Payable Deep Dive',          icon:'📑', desc:'End-to-end AP lifecycle, three-way matching & payment approvals' },
  ar:  { title:'Account Receivable Process Mastery', icon:'💰', desc:'Invoicing, collections, aging reports & cash application' },
  mis: { title:'MIS Reports & Analytics',            icon:'📊', desc:'Management dashboards, KPIs and data-driven decision reporting' },
  o2c: { title:'Order-to-Cash Complete Guide',       icon:'📦', desc:'Full O2C cycle — order intake through revenue recognition' },
  p2p: { title:'Procure-to-Pay End-to-End',         icon:'🛒', desc:'Procurement workflow, PO management & vendor payments' },
  r2r: { title:'Record-to-Report Fundamentals',      icon:'📋', desc:'Period-end close, journal entries & financial statements' },
  bc:  { title:'About Bluecopa',                     icon:'🔵', desc:'Platform architecture, four-layer design, Samyx AI & core capabilities' },
  di:  { title:'Data Ingestion Mastery',             icon:'📥', desc:'Cloud connectors, ZIP workflows, portal uploads & pipeline design' },
  aw:  { title:'Approval Workflows Mastery',         icon:'✅', desc:'Multi-level approvals, OTP, SLA handling & conditional routing' },
  wf:  { title:'Workflows Mastery',                  icon:'⚡', desc:'9 trigger types, 16 transformation nodes & real-world pipeline builds' },
  rc:  { title:'Reconciliation Mastery',             icon:'🔁', desc:'Dataset setup, match rules, incremental runs & exception handling' },
  er:  { title:'Exports & Reports Mastery',          icon:'📤', desc:'Scheduled delivery, multi-sheet Excel workbooks & email exports' },
  ci:  { title:'Connectors & Integrations Mastery',  icon:'🔌', desc:'GCS connectors, REST APIs, HTTP triggers & BigQuery integration' },
};

function ensureLearning() {
  if (!db.learning) db.learning = { assignments:[], nextAssignmentId:1, paths:[], memberEmails:{}, remindersSent:[] };
  if (!db.learning.memberEmails)  db.learning.memberEmails  = {};
  if (!db.learning.remindersSent) db.learning.remindersSent = [];
  const njDef = {
    id:'new-joiner', name:'New Joiner Learning Path',
    description:'Complete onboarding — Phase 1: Finance Studio + Phase 2: Platform Mastery',
    courseIds:NJ_ALL, durationDays:30,
    phases:[{ label:'Finance Studio', courseIds:NJ_PHASE1 },{ label:'Platform Mastery', courseIds:NJ_PHASE2 }],
  };
  if (!db.learning.paths) db.learning.paths = [];
  const njIdx = db.learning.paths.findIndex(p => p.id === 'new-joiner');
  if (njIdx === -1) db.learning.paths.push(njDef);
  else              db.learning.paths[njIdx] = { ...db.learning.paths[njIdx], ...njDef };
}

// ── Email template helpers ────────────────────────────────────────────────────
function _emailEscape(s) { return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
function _fmtDate(d) { return d ? new Date(d).toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric'}) : null; }
function _emailPreview(text) {
  const pad = '‌ '.repeat(60);
  return `<div style="display:none;max-height:0;overflow:hidden;font-size:1px;color:#f1f2f5">${text} · ${new Date().toISOString()}${pad}</div>`;
}
function _courseUrl(base, id) { return `${base}?course=${id}`; }
function _emailHeader(subtitle, badgeIcon, badgeLabel, badgeColor) {
  return `<tr><td style="background:#1a1d27;padding:22px 28px"><table width="100%" cellpadding="0" cellspacing="0"><tr>
    <td><table cellpadding="0" cellspacing="0"><tr>
      <td style="padding-right:12px;vertical-align:middle"><img src="${BC_LOGO_URL}" width="36" height="36" alt="Bluecopa" style="border-radius:8px;display:block"></td>
      <td style="vertical-align:middle">
        <div style="color:#c9a227;font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase">Bluecopa &middot; Delivery Wikipedia</div>
        <div style="color:#f0f0f6;font-size:17px;font-weight:800;margin-top:2px">${subtitle}</div>
      </td></tr></table></td>
    <td align="right" valign="middle"><div style="background:rgba(${badgeColor},.15);border:1px solid rgba(${badgeColor},.3);border-radius:8px;padding:7px 12px;text-align:center">
      <div style="font-size:19px">${badgeIcon}</div>
      <div style="color:rgba(${badgeColor},1);font-size:9px;font-weight:700;letter-spacing:1px;text-transform:uppercase;margin-top:2px">${badgeLabel}</div>
    </div></td>
  </tr></table></td></tr>`;
}
function _emailFooter(url) {
  return `<tr><td style="background:#f9fafb;border-top:1px solid #e4e6ea;padding:16px 28px">
  <div style="color:#6b7280;font-size:12px;line-height:1.6">Automated notification from <strong>Delivery Wikipedia</strong> &middot; Bluecopa's internal learning platform.<br>
  Questions? Visit <a href="${url}" style="color:#c9a227;text-decoration:none">deliverywiki.bluecopa.com</a> or reach your learning manager.</div>
  <div style="color:#9ca3af;font-size:11px;margin-top:5px">&copy; Bluecopa &middot; delivery.wiki@bluecopa.com &middot; Do not reply.</div>
</td></tr>`;
}

function buildEnrollmentEmail({ memberName, courseIds, dueDate, pathName, portalUrl, context }) {
  const eh = _emailEscape, url = portalUrl || PORTAL_URL;
  const firstName = (memberName || 'Team Member').split(' ')[0];
  const isExisting = context === 'existing';
  const path = pathName || (isExisting ? 'Continuing Learning Programme' : 'New Joiner Learning Path');
  const dueFmt = _fmtDate(dueDate) || 'To be confirmed by your manager';
  const ids = courseIds || NJ_ALL;
  const p1 = ids.filter(id => NJ_PHASE1.includes(id));
  const p2 = ids.filter(id => NJ_PHASE2.includes(id));
  let num = 0;
  function courseRow(id) {
    const c = ENROLLMENT_COURSE_INFO[id]; if (!c) return '';
    const cUrl = _courseUrl(url, id); num++;
    return `<tr>
<td style="padding:12px 14px;vertical-align:middle;width:42px;border-bottom:1px solid #f3f4f6"><div style="width:26px;height:26px;background:#1a1d27;color:#c9a227;border-radius:50%;text-align:center;font-size:11px;font-weight:800;line-height:26px">${num}</div></td>
<td style="padding:12px 8px 12px 4px;border-bottom:1px solid #f3f4f6;width:28px;vertical-align:middle;font-size:18px">${c.icon}</td>
<td style="padding:12px 8px;border-bottom:1px solid #f3f4f6;vertical-align:middle">
  <div style="font-weight:700;color:#0d1117;font-size:13px;margin-bottom:2px"><a href="${cUrl}" style="color:#0d1117;text-decoration:none">${eh(c.title)}</a></div>
  <div style="color:#6b7280;font-size:12px">${eh(c.desc)}</div>
</td>
<td style="padding:12px 14px 12px 8px;border-bottom:1px solid #f3f4f6;vertical-align:middle;white-space:nowrap;text-align:right;width:80px">
  <a href="${cUrl}" style="display:inline-block;font-size:11px;color:#c9a227;font-weight:700;text-decoration:none;border:1px solid #c9a227;border-radius:4px;padding:5px 10px">Open &rarr;</a>
</td></tr>`;
  }
  function phaseSection(label, sublabel, color, phaseIds) {
    if (!phaseIds.length) return '';
    return `<tr><td colspan="4" style="padding:0"><div style="background:#f9fafb;border-left:4px solid ${color};padding:10px 16px;margin-bottom:1px">
    <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:${color}">${label}</div>
    <div style="font-size:12px;color:#6b7280;margin-top:2px">${sublabel}</div>
  </div></td></tr>${phaseIds.map(id => courseRow(id)).join('')}`;
  }
  const coursesBlock = (p1.length || p2.length)
    ? phaseSection('Phase 1 · Finance Studio', `${p1.length} modules — core finance process knowledge`, '#7c3aed', p1) +
      (p1.length && p2.length ? '<tr><td colspan="4" style="padding:6px 0;text-align:center;color:#9ca3af;font-size:13px;background:#fff">&darr;&nbsp; then move to</td></tr>' : '') +
      phaseSection('Phase 2 · Platform Mastery', `${p2.length} modules — Bluecopa features &amp; integrations`, '#0891b2', p2)
    : ids.map(id => courseRow(id)).join('');

  // Context-specific copy
  const bannerText = isExisting
    ? '&#x1F4DA;&nbsp; New training has been assigned to you'
    : '&#x1F389;&nbsp; Congratulations — you\'ve been enrolled in a new learning path!';
  const introPara = isExisting
    ? `You have been assigned ${ids.length === 1 ? 'a new training module' : `${ids.length} new training modules`} as part of your ongoing professional development at Bluecopa. Complete ${ids.length === 1 ? 'it' : 'them'} by your target date to keep your skills sharp and your progress on track.`
    : `As part of your onboarding at Bluecopa, you have been enrolled in the <strong>${eh(path)}</strong>. This structured ${ids.length}-module programme is designed to equip you with the foundational knowledge and platform expertise needed to excel in your role — complete all modules by your target date to receive your onboarding certificate.`;
  const sectionLabel = isExisting ? 'Assigned Training' : 'Your Learning Journey';
  const certBullet = isExisting
    ? `<tr><td style="color:#22c55e;font-weight:700;width:18px;padding:2px 0">&#10003;</td><td style="padding:2px 0 2px 8px;color:#374151;font-size:13px">Track your progress at any time in the learning portal</td></tr>`
    : `<tr><td style="color:#22c55e;font-weight:700;width:18px;padding:2px 0">&#10003;</td><td style="padding:2px 0 2px 8px;color:#374151;font-size:13px">Certificate of completion issued for all ${ids.length} modules</td></tr>`;
  const previewText = isExisting
    ? `${path} · ${ids.length} module${ids.length > 1 ? 's' : ''} assigned`
    : `${path} · ${ids.length} modules`;
  const subject = isExisting
    ? `New training assigned: ${path} — Delivery Wikipedia`
    : `You've been enrolled: ${path} — Delivery Wikipedia`;

  const html = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title>${eh(subject)}</title></head>
<body style="margin:0;padding:0;background:#f1f2f5;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif">
${_emailPreview(previewText)}
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f2f5;padding:20px 0"><tr><td>
<table width="100%" cellpadding="0" cellspacing="0" style="width:100%;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,.12)">
${_emailHeader('Learning &amp; Development','🎓','Assigned','201,162,39')}
<tr><td style="background:#c9a227;padding:11px 28px"><div style="color:#1a1d27;font-size:13px;font-weight:700">${bannerText}</div></td></tr>
<tr><td style="background:#ffffff;padding:28px 28px 22px">
  <div style="font-size:22px;font-weight:800;color:#0d1117;letter-spacing:-.3px;margin-bottom:6px">Hi ${eh(firstName)}!</div>
  <div style="color:#374151;font-size:14px;line-height:1.7;margin-bottom:20px">${introPara}</div>
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#fefce8;border:1px solid #fde68a;border-radius:10px;margin-bottom:20px"><tr><td style="padding:15px 18px"><table cellpadding="0" cellspacing="0"><tr>
    <td style="font-size:20px;padding-right:10px;vertical-align:middle">&#x1F4C5;</td>
    <td><div style="color:#92400e;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.8px">Completion Due By</div>
    <div style="color:#78350f;font-size:18px;font-weight:800;margin-top:2px">${eh(dueFmt)}</div></td>
  </tr></table></td></tr></table>
  <div style="font-size:11px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:1.2px;margin-bottom:12px">${eh(sectionLabel)} — ${ids.length} Module${ids.length > 1 ? 's' : ''}</div>
  <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e4e6ea;border-radius:10px;overflow:hidden"><tbody>${coursesBlock}</tbody></table>
  <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:24px;margin-bottom:20px"><tr>
    <td align="center"><a href="${url}" style="display:inline-block;background:#c9a227;color:#1a1d27;text-decoration:none;font-weight:800;font-size:14px;padding:14px 40px;border-radius:8px">Start Learning &rarr;</a></td>
  </tr></table>
  <div style="background:#f9fafb;border:1px solid #e4e6ea;border-radius:10px;padding:16px 20px">
    <div style="font-size:13px;font-weight:700;color:#0d1117;margin-bottom:8px">What to expect</div>
    <table cellpadding="0" cellspacing="0"><tbody>
      <tr><td style="color:#22c55e;font-weight:700;width:18px;padding:2px 0">&#10003;</td><td style="padding:2px 0 2px 8px;color:#374151;font-size:13px">Self-paced modules — learn at your own schedule</td></tr>
      <tr><td style="color:#22c55e;font-weight:700;width:18px;padding:2px 0">&#10003;</td><td style="padding:2px 0 2px 8px;color:#374151;font-size:13px">Interactive quizzes after each module</td></tr>
      ${certBullet}
      <tr><td style="color:#22c55e;font-weight:700;width:18px;padding:2px 0">&#10003;</td><td style="padding:2px 0 2px 8px;color:#374151;font-size:13px">Progress visible to your learning manager in real time</td></tr>
    </tbody></table>
  </div>
</td></tr>
${_emailFooter(url)}
</table></td></tr></table></body></html>`;
  const text = `Hi ${firstName},\n\n` +
    (isExisting ? `New training has been assigned to you: ${path}` : `You've been enrolled in: ${path}`) +
    `\nTarget completion: ${dueFmt}\n\n` +
    (p1.length ? `Phase 1 — Finance Studio:\n${p1.map((id,i)=>`  ${i+1}. ${(ENROLLMENT_COURSE_INFO[id]||{}).title||id}`).join('\n')}\n\n` : '') +
    (p2.length ? `Phase 2 — Platform Mastery:\n${p2.map((id,i)=>`  ${p1.length+i+1}. ${(ENROLLMENT_COURSE_INFO[id]||{}).title||id}`).join('\n')}\n\n` : '') +
    (!p1.length && !p2.length ? ids.map((id,i)=>`  ${i+1}. ${(ENROLLMENT_COURSE_INFO[id]||{}).title||id}`).join('\n') + '\n\n' : '') +
    `Open at: ${url}\n\n— Delivery Wikipedia`;
  return { subject, html, text };
}

function buildProgressEmail({ memberName, allCourseIds, completedCourseIds, dueDate, pathName, portalUrl }) {
  const eh = _emailEscape, url = portalUrl || PORTAL_URL;
  const firstName = (memberName || 'Team Member').split(' ')[0];
  const path = pathName || 'New Joiner Learning Path';
  const completedSet = new Set(completedCourseIds || []);
  const total = allCourseIds.length, done = completedCourseIds.length;
  const dueFmt = _fmtDate(dueDate), isFinished = done >= total;
  const pctWidth = Math.max(Math.round((done / total) * 100), 4);
  const latestId = completedCourseIds[completedCourseIds.length - 1];
  const latestInfo = ENROLLMENT_COURSE_INFO[latestId] || { title: latestId, icon: '📚' };
  const courseRows = allCourseIds.map(id => {
    const c = ENROLLMENT_COURSE_INFO[id] || { title:id, icon:'📚', desc:'' };
    const ok = completedSet.has(id), cUrl = _courseUrl(url, id);
    return `<tr>
<td style="padding:10px 14px;vertical-align:middle;width:36px;border-bottom:1px solid #f3f4f6">
  ${ok ? '<div style="width:22px;height:22px;background:#22c55e;border-radius:50%;text-align:center;line-height:22px;font-size:12px;color:#fff;font-weight:700">&#10003;</div>'
       : '<div style="width:22px;height:22px;border:2px solid #d1d5db;border-radius:50%;"></div>'}
</td>
<td style="padding:10px 8px;border-bottom:1px solid #f3f4f6;width:28px;vertical-align:middle;font-size:17px">${c.icon}</td>
<td style="padding:10px 8px;border-bottom:1px solid #f3f4f6;vertical-align:middle">
  <a href="${cUrl}" style="display:block;font-weight:700;color:${ok?'#9ca3af':'#0d1117'};font-size:13px;text-decoration:${ok?'line-through':'none'}">${eh(c.title)}</a>
</td>
<td style="padding:10px 14px 10px 8px;border-bottom:1px solid #f3f4f6;vertical-align:middle;white-space:nowrap;text-align:right;width:80px">
  ${ok ? '<span style="display:inline-block;background:#f0fdf4;color:#16a34a;border:1px solid #bbf7d0;border-radius:99px;font-size:10px;font-weight:700;padding:3px 10px">Done &#10003;</span>'
       : `<a href="${cUrl}" style="display:inline-block;font-size:11px;color:#c9a227;font-weight:700;text-decoration:none;border:1px solid #c9a227;border-radius:4px;padding:5px 10px">Start &rarr;</a>`}
</td></tr>`;
  }).join('');
  const bannerBg = isFinished ? '#22c55e' : '#c9a227', bannerTxt = isFinished ? '#fff' : '#1a1d27';
  const heroMsg = isFinished
    ? `&#x1F3C6; Outstanding! You've completed all ${total} modules in <strong>${eh(path)}</strong>. Your certificate is ready!`
    : `Great work! You completed <strong>${latestInfo.icon} ${eh(latestInfo.title)}</strong> — ${done} of ${total} modules done so far.`;
  const subject = isFinished ? `🎉 You've completed ${path} — Delivery Wikipedia` : `Progress: ${done} of ${total} modules done — Delivery Wikipedia`;
  const html = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title>${eh(subject)}</title></head>
<body style="margin:0;padding:0;background:#f1f2f5;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif">
${_emailPreview(`${done} of ${total} modules completed`)}
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f2f5;padding:20px 0"><tr><td>
<table width="100%" cellpadding="0" cellspacing="0" style="width:100%;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,.12)">
${_emailHeader('Learning Progress', isFinished?'&#x1F3C6;':'&#x1F4C8;', isFinished?'Complete!':'In Progress', isFinished?'34,197,94':'201,162,39')}
<tr><td style="background:${bannerBg};padding:11px 28px"><div style="color:${bannerTxt};font-size:13px;font-weight:700">${isFinished?'&#x1F389;  All modules complete — certificate incoming!':'&#x2B50;  Great progress! Keep going!'}</div></td></tr>
<tr><td style="background:#ffffff;padding:28px 28px 22px">
  <div style="font-size:22px;font-weight:800;color:#0d1117;letter-spacing:-.3px;margin-bottom:6px">Hi ${eh(firstName)}!</div>
  <div style="color:#374151;font-size:14px;line-height:1.7;margin-bottom:18px">${heroMsg}</div>
  <div style="background:#f3f4f6;border-radius:99px;height:10px;overflow:hidden;margin-bottom:5px"><div style="background:${isFinished?'#22c55e':'#c9a227'};height:10px;border-radius:99px;width:${pctWidth}%"></div></div>
  <div style="font-size:12px;color:#6b7280;margin-bottom:20px">${done} of ${total} modules (${pctWidth}%)${dueFmt?' · Due '+eh(dueFmt):''}</div>
  <div style="font-size:11px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:1.2px;margin-bottom:12px">Progress — ${eh(path)}</div>
  <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e4e6ea;border-radius:10px;overflow:hidden;margin-bottom:24px"><tbody>${courseRows}</tbody></table>
  <table width="100%" cellpadding="0" cellspacing="0"><tr>
    <td align="center"><a href="${url}" style="display:inline-block;background:${isFinished?'#22c55e':'#c9a227'};color:${isFinished?'#fff':'#1a1d27'};text-decoration:none;font-weight:800;font-size:14px;padding:14px 40px;border-radius:8px">${isFinished?'View Your Certificate &#x1F3C6;':'Continue Learning &rarr;'}</a></td>
  </tr></table>
</td></tr>
${_emailFooter(url)}
</table></td></tr></table></body></html>`;
  const text = `Hi ${firstName},\n\n${isFinished?`You completed all ${total} modules!`:`Progress: ${done}/${total} done.`}\n\n` +
    allCourseIds.map((id,i)=>`${completedSet.has(id)?'✓':'○'} ${i+1}. ${(ENROLLMENT_COURSE_INFO[id]||{}).title||id}`).join('\n') +
    `\n\n${url}\n\n— Delivery Wikipedia`;
  return { subject, html, text };
}

function buildReminderEmail({ memberName, daysLeft, allCourseIds, completedCourseIds, dueDate, pathName, portalUrl }) {
  const eh = _emailEscape, url = portalUrl || PORTAL_URL;
  const firstName = (memberName || 'Team Member').split(' ')[0];
  const path = pathName || 'New Joiner Learning Path';
  const completedSet = new Set(completedCourseIds || []);
  const remaining = allCourseIds.filter(id => !completedSet.has(id));
  const total = allCourseIds.length, done = completedCourseIds.length;
  const dueFmt = _fmtDate(dueDate) || '', isCritical = daysLeft <= 1;
  const uc = isCritical ? '#dc2626' : daysLeft <= 3 ? '#d97706' : '#0891b2';
  const ub = isCritical ? '#fef2f2' : daysLeft <= 3 ? '#fffbeb' : '#f0f9ff';
  const ubr= isCritical ? '#fecaca' : daysLeft <= 3 ? '#fde68a' : '#bae6fd';
  const remRows = remaining.map(id => {
    const c = ENROLLMENT_COURSE_INFO[id] || { title:id, icon:'📚' };
    const cUrl = _courseUrl(url, id);
    return `<tr>
<td style="padding:10px 14px;vertical-align:middle;width:36px;border-bottom:1px solid #f3f4f6"><div style="width:20px;height:20px;border:2px solid #d1d5db;border-radius:50%;"></div></td>
<td style="padding:10px 8px;border-bottom:1px solid #f3f4f6;width:28px;vertical-align:middle;font-size:17px">${c.icon}</td>
<td style="padding:10px 8px;border-bottom:1px solid #f3f4f6;vertical-align:middle"><a href="${cUrl}" style="font-weight:700;color:#0d1117;font-size:13px;text-decoration:none">${eh(c.title)}</a></td>
<td style="padding:10px 14px 10px 8px;border-bottom:1px solid #f3f4f6;vertical-align:middle;white-space:nowrap;text-align:right;width:80px">
  <a href="${cUrl}" style="display:inline-block;font-size:11px;color:${uc};font-weight:700;text-decoration:none;border:1px solid ${uc};border-radius:4px;padding:5px 10px">Start &rarr;</a>
</td></tr>`;
  }).join('');
  const subject = isCritical ? `⚠️ Final reminder: Learning deadline is tomorrow — Delivery Wikipedia` : `Reminder: ${daysLeft} days until your learning deadline — Delivery Wikipedia`;
  const html = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title>${eh(subject)}</title></head>
<body style="margin:0;padding:0;background:#f1f2f5;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif">
${_emailPreview(`${remaining.length} modules remaining · ${daysLeft} day${daysLeft===1?'':'s'} left`)}
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f2f5;padding:20px 0"><tr><td>
<table width="100%" cellpadding="0" cellspacing="0" style="width:100%;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,.12)">
${_emailHeader('Learning Reminder', isCritical?'&#x26A0;&#xFE0F;':'&#x1F514;', `${daysLeft} Day${daysLeft===1?'':'s'} Left`, isCritical?'220,38,38':'201,162,39')}
<tr><td style="background:${isCritical?'#dc2626':'#c9a227'};padding:11px 28px"><div style="color:#fff;font-size:13px;font-weight:700">${isCritical?'&#x26A0;&#xFE0F;  Deadline tomorrow — complete your remaining modules now!':'&#x1F514;  Heads up — your learning deadline is approaching!'}</div></td></tr>
<tr><td style="background:#ffffff;padding:28px 28px 22px">
  <div style="font-size:22px;font-weight:800;color:#0d1117;letter-spacing:-.3px;margin-bottom:6px">Hi ${eh(firstName)}!</div>
  <div style="color:#374151;font-size:14px;line-height:1.7;margin-bottom:18px">You have <strong>${daysLeft} day${daysLeft===1?'':'s'}</strong> left to complete the <strong>${eh(path)}</strong>. You've finished ${done} of ${total} modules — ${remaining.length} still to go. ${isCritical?'Please complete them today.':'Keep it up!'}</div>
  <table width="100%" cellpadding="0" cellspacing="0" style="background:${ub};border:1px solid ${ubr};border-radius:10px;margin-bottom:20px"><tr><td style="padding:15px 18px"><table cellpadding="0" cellspacing="0"><tr>
    <td style="font-size:20px;padding-right:10px">${isCritical?'&#x23F0;':'&#x1F4C5;'}</td>
    <td><div style="color:${uc};font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.8px">Due Date</div>
    <div style="color:${uc};font-size:18px;font-weight:800;margin-top:2px">${eh(dueFmt)}</div></td>
  </tr></table></td></tr></table>
  ${remaining.length ? `<div style="font-size:11px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:1.2px;margin-bottom:12px">Remaining (${remaining.length})</div>
  <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e4e6ea;border-radius:10px;overflow:hidden;margin-bottom:24px"><tbody>${remRows}</tbody></table>` : ''}
  <table width="100%" cellpadding="0" cellspacing="0"><tr>
    <td align="center"><a href="${url}" style="display:inline-block;background:${isCritical?'#dc2626':'#c9a227'};color:#fff;text-decoration:none;font-weight:800;font-size:14px;padding:14px 40px;border-radius:8px">Continue Learning Now &rarr;</a></td>
  </tr></table>
</td></tr>
${_emailFooter(url)}
</table></td></tr></table></body></html>`;
  const text = `Hi ${firstName},\n\n${daysLeft} day${daysLeft===1?'':'s'} left · Due: ${dueFmt}\n\nRemaining (${remaining.length}):\n${remaining.map(id=>`  - ${(ENROLLMENT_COURSE_INFO[id]||{}).title||id}`).join('\n')}\n\n${url}\n\n— Delivery Wikipedia`;
  return { subject, html, text };
}

function buildOverdueEmail({ memberName, allCourseIds, completedCourseIds, dueDate, pathName, portalUrl }) {
  const eh = _emailEscape, url = portalUrl || PORTAL_URL;
  const firstName = (memberName || 'Team Member').split(' ')[0];
  const path = pathName || 'New Joiner Learning Path';
  const completedSet = new Set(completedCourseIds || []);
  const total = allCourseIds.length, done = (completedCourseIds || []).length;
  const remaining = allCourseIds.filter(id => !completedSet.has(id));
  const dueFmt = _fmtDate(dueDate) || 'your deadline';
  const courseRows = allCourseIds.map(id => {
    const c = ENROLLMENT_COURSE_INFO[id]; if (!c) return '';
    const isDone = completedSet.has(id);
    return `<tr>
<td style="padding:9px 14px;vertical-align:middle;width:36px;border-bottom:1px solid #fef2f2">
  <div style="width:22px;height:22px;border-radius:50%;text-align:center;font-size:12px;line-height:22px;font-weight:800;${isDone?'background:#22c55e;color:#fff':'background:#fecaca;color:#dc2626;border:2px solid #fca5a5'}">${isDone?'&#10003;':'!'}</div>
</td>
<td style="padding:9px 14px 9px 4px;border-bottom:1px solid #fef2f2">
  <span style="font-weight:${isDone?'400':'700'};color:${isDone?'#9ca3af':'#0d1117'};font-size:13px;${isDone?'text-decoration:line-through':''}">${eh(c.title)}</span>
  ${!isDone?`<span style="margin-left:6px;font-size:11px;background:#fef2f2;color:#dc2626;padding:1px 6px;border-radius:4px;font-weight:600">Pending</span>`:''}
</td></tr>`;
  }).join('');
  const subject = `Action Required: Your learning deadline has passed — ${path}`;
  const html = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title>${eh(subject)}</title></head>
<body style="margin:0;padding:0;background:#f1f2f5;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f2f5;padding:20px 0"><tr><td>
<table width="100%" cellpadding="0" cellspacing="0" style="width:100%;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,.12)">
${_emailHeader('Learning &amp; Development','&#x26A0;&#xFE0F;','Overdue','220,38,38')}
<tr><td style="background:#dc2626;padding:11px 28px"><div style="color:#fff;font-size:13px;font-weight:700">&#x26A0;&#xFE0F;&nbsp; Your learning deadline has passed — immediate action required</div></td></tr>
<tr><td style="background:#ffffff;padding:28px 28px 22px">
  <div style="font-size:22px;font-weight:800;color:#0d1117;letter-spacing:-.3px;margin-bottom:6px">Hi ${eh(firstName)},</div>
  <div style="color:#374151;font-size:14px;line-height:1.7;margin-bottom:20px">We noticed that the deadline for your <strong>${eh(path)}</strong> has passed on <strong>${eh(dueFmt)}</strong>, and ${remaining.length > 0 ? `you still have <strong>${remaining.length} module${remaining.length>1?'s':''}</strong> remaining` : 'your programme is now being reviewed'}. Please log in and complete your pending modules as soon as possible.</div>
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#fef2f2;border:1px solid #fca5a5;border-radius:10px;margin-bottom:20px"><tr><td style="padding:15px 18px"><table cellpadding="0" cellspacing="0"><tr>
    <td style="font-size:20px;padding-right:10px;vertical-align:middle">&#x1F4C5;</td>
    <td><div style="color:#991b1b;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.8px">Deadline Passed</div>
    <div style="color:#7f1d1d;font-size:18px;font-weight:800;margin-top:2px">${eh(dueFmt)}</div></td>
    <td style="padding-left:20px"><div style="background:#fecaca;border-radius:8px;padding:6px 12px;text-align:center">
      <div style="color:#dc2626;font-size:20px;font-weight:800">${done}/${total}</div>
      <div style="color:#991b1b;font-size:11px;font-weight:600">modules done</div>
    </div></td>
  </tr></table></td></tr></table>
  <div style="font-size:11px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:1.2px;margin-bottom:12px">Module Status</div>
  <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #fca5a5;border-radius:10px;overflow:hidden;background:#fff8f8"><tbody>${courseRows}</tbody></table>
  <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:24px;margin-bottom:20px"><tr>
    <td align="center"><a href="${url}" style="display:inline-block;background:#dc2626;color:#fff;text-decoration:none;font-weight:800;font-size:14px;padding:14px 40px;border-radius:8px">Complete Now &rarr;</a></td>
  </tr></table>
  <div style="background:#fef2f2;border:1px solid #fca5a5;border-radius:10px;padding:14px 18px;font-size:13px;color:#7f1d1d;line-height:1.6">If you are facing any challenges completing this programme, please reach out to your learning manager at the earliest.</div>
</td></tr>
${_emailFooter(url)}
</table></td></tr></table></body></html>`;
  const text = `Hi ${firstName},\n\nYour deadline for "${path}" passed on ${dueFmt}.\nCompleted: ${done}/${total}\n\nPending:\n${remaining.map(id=>`  - ${(ENROLLMENT_COURSE_INFO[id]||{}).title||id}`).join('\n')}\n\n${url}\n\n— Delivery Wikipedia`;
  return { subject, html, text };
}

app.get('/api/learning/assignments', (req, res) => {
  ensureLearning();
  const { user } = req.query;
  if (user) {
    const list = db.learning.assignments.filter(
      a => a.userName.toLowerCase() === user.toLowerCase()
    );
    return res.json({ assignments: list });
  }
  if (!isAdmin(req)) return res.status(401).json({ error: 'Admin required' });
  res.json({ assignments: db.learning.assignments, paths: db.learning.paths });
});

app.post('/api/learning/assignments', async (req, res) => {
  if (!isAdmin(req)) return res.status(401).json({ error: 'Admin required' });
  ensureLearning();
  const { userName, courseId, type, dueDate, pathId } = req.body;
  if (!userName || !courseId) return res.status(400).json({ error: 'userName and courseId required' });
  const existing = db.learning.assignments.find(
    a => a.userName.toLowerCase() === userName.toLowerCase() && a.courseId === courseId
  );
  if (existing) {
    if (type) existing.type = type;
    if (dueDate !== undefined) existing.dueDate = dueDate;
    if (pathId) existing.pathId = pathId;
    await saveDB(db);
    return res.json(existing);
  }
  const a = {
    id: db.learning.nextAssignmentId++,
    userName, courseId,
    type: type || 'mandatory',
    dueDate: dueDate || null,
    assignedAt: new Date().toISOString(),
    pathId: pathId || null
  };
  db.learning.assignments.push(a);
  await saveDB(db);
  res.json(a);
});

app.put('/api/learning/assignments/:id', async (req, res) => {
  if (!isAdmin(req)) return res.status(401).json({ error: 'Admin required' });
  ensureLearning();
  const id = parseInt(req.params.id);
  const a  = db.learning.assignments.find(x => x.id === id);
  if (!a) return res.status(404).json({ error: 'Not found' });
  const { type, dueDate } = req.body;
  if (type) a.type = type;
  if (dueDate !== undefined) a.dueDate = dueDate;
  await saveDB(db);
  res.json(a);
});

app.delete('/api/learning/assignments/:id', async (req, res) => {
  if (!isAdmin(req)) return res.status(401).json({ error: 'Admin required' });
  ensureLearning();
  const id = parseInt(req.params.id);
  db.learning.assignments = db.learning.assignments.filter(a => a.id !== id);
  await saveDB(db);
  res.json({ ok: true });
});

app.post('/api/learning/bulk-assign', async (req, res) => {
  if (!isAdmin(req)) return res.status(401).json({ error: 'Admin required' });
  ensureLearning();
  const { userNames, courseIds, pathId, type, dueDate, enrolleeEmails = {}, enrolledBy, context } = req.body;
  if (!Array.isArray(userNames) || !Array.isArray(courseIds))
    return res.status(400).json({ error: 'userNames[] and courseIds[] required' });
  let created = 0;
  for (const userName of userNames) {
    // Store email for reminder use
    if (enrolleeEmails[userName]) db.learning.memberEmails[userName] = enrolleeEmails[userName];
    for (const courseId of courseIds) {
      const exists = db.learning.assignments.find(
        a => a.userName.toLowerCase() === userName.toLowerCase() && a.courseId === courseId
      );
      if (exists) {
        if (type)    exists.type    = type;
        if (dueDate) exists.dueDate = dueDate;
      } else {
        db.learning.assignments.push({
          id: db.learning.nextAssignmentId++,
          userName, courseId,
          type:       type    || 'mandatory',
          dueDate:    dueDate || null,
          assignedAt: new Date().toISOString(),
          pathId:     pathId  || null
        });
        created++;
      }
    }
  }
  await saveDB(db);

  // Send enrollment emails before responding (setImmediate is killed on Vercel serverless)
  const path = db.learning.paths.find(p => p.id === pathId);
  await Promise.allSettled(userNames.map(async (userName) => {
    const toEmail = enrolleeEmails[userName] || db.learning.memberEmails[userName];
    if (!toEmail) return;
    try {
      const { subject, html, text } = buildEnrollmentEmail({
        memberName: userName, courseIds, dueDate,
        pathName: path ? path.name : undefined,
        enrolledBy, context
      });
      await sendEmail({ to: toEmail, subject, html, text });
    } catch(e) {
      console.warn('[learning enroll email]', userName, e.message);
    }
  }));

  res.json({ ok: true, created });
});

app.post('/api/learning/assignments/:id/complete', async (req, res) => {
  ensureLearning();
  const id = parseInt(req.params.id);
  const a  = db.learning.assignments.find(x => x.id === id);
  if (!a) return res.status(404).json({ error: 'Not found' });
  a.completedAt = a.completedAt || new Date().toISOString();
  await saveDB(db);

  // Send progress email before responding (setImmediate is killed on Vercel serverless)
  try {
    const toEmail = db.learning.memberEmails[a.userName];
    if (toEmail) {
      const path = db.learning.paths.find(p => p.id === a.pathId) || db.learning.paths[0];
      if (path) {
        const allIds       = path.courseIds || NJ_ALL;
        const completedIds = db.learning.assignments
          .filter(x => x.userName.toLowerCase() === a.userName.toLowerCase() && x.pathId === a.pathId && x.completedAt)
          .map(x => x.courseId);
        const { subject, html, text } = buildProgressEmail({
          memberName: a.userName, allCourseIds: allIds,
          completedCourseIds: completedIds, dueDate: a.dueDate,
          pathName: path.name
        });
        await Promise.race([
          sendEmail({ to: toEmail, subject, html, text }),
          new Promise(r => setTimeout(r, 9000))
        ]);
      }
    }
  } catch(e) {
    console.warn('[learning progress email]', a.userName, e.message);
  }

  res.json({ ok: true, assignment: a });
});

app.post('/api/learning/complete-by-course', async (req, res) => {
  ensureLearning();
  const { courseId, userName } = req.body;
  if (!courseId || !userName) return res.status(400).json({ error: 'courseId and userName required' });
  const a = db.learning.assignments.find(x =>
    x.courseId === courseId &&
    x.userName.toLowerCase() === (userName||'').toLowerCase() &&
    !x.completedAt
  );
  if (!a) return res.json({ ok: true, alreadyComplete: true });
  a.completedAt = new Date().toISOString();
  await saveDB(db);
  try {
    const toEmail = db.learning.memberEmails[a.userName];
    if (toEmail) {
      const path = db.learning.paths.find(p => p.id === a.pathId) || db.learning.paths[0];
      if (path) {
        const allIds = path.courseIds || NJ_ALL;
        const completedIds = db.learning.assignments
          .filter(x => x.userName.toLowerCase() === a.userName.toLowerCase() && x.pathId === a.pathId && x.completedAt)
          .map(x => x.courseId);
        const { subject, html, text } = buildProgressEmail({
          memberName: a.userName, allCourseIds: allIds,
          completedCourseIds: completedIds, dueDate: a.dueDate, pathName: path.name
        });
        await Promise.race([
          sendEmail({ to: toEmail, subject, html, text }),
          new Promise(r => setTimeout(r, 9000))
        ]);
      }
    }
  } catch(e) { console.warn('[complete-by-course email]', userName, e.message); }
  res.json({ ok: true, completedAt: a.completedAt });
});

app.post('/api/learning/preview-email', async (req, res) => {
  if (!isAdmin(req)) return res.status(401).json({ error: 'Admin required' });
  const { type, to } = req.body;
  const toAddr = to || PLATFORM_BCC;
  const sample = {
    memberName: 'Azhar Mohammed',
    courseIds: NJ_ALL,
    allCourseIds: NJ_ALL,
    completedCourseIds: NJ_PHASE1,
    daysLeft: 3,
    dueDate: new Date(Date.now() + 3 * 86400000).toISOString(),
    pathName: 'New Joiner Learning Path',
    enrolledBy: 'Admin'
  };
  let emailData;
  if      (type === 'enrollment') emailData = buildEnrollmentEmail(sample);
  else if (type === 'progress')   emailData = buildProgressEmail(sample);
  else if (type === 'reminder')   emailData = buildReminderEmail(sample);
  else if (type === 'overdue')    emailData = buildOverdueEmail(sample);
  else return res.status(400).json({ error: 'type must be enrollment|progress|reminder|overdue' });
  try {
    await sendEmail({ to: toAddr, subject: emailData.subject, html: emailData.html, text: emailData.text });
    res.json({ ok: true, to: toAddr, subject: emailData.subject });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

async function runLearningReminders() {
  ensureLearning();
  const now  = new Date();
  const today = now.toISOString().slice(0, 10);
  const paths  = db.learning.paths;
  const byUser = {};
  for (const a of db.learning.assignments) {
    if (!a.pathId || !a.dueDate) continue;
    const key = `${a.userName}::${a.pathId}::${a.dueDate}`;
    if (!byUser[key]) byUser[key] = [];
    byUser[key].push(a);
  }
  for (const key of Object.keys(byUser)) {
    const assignments = byUser[key];
    const { userName, pathId, dueDate } = assignments[0];
    const toEmail = db.learning.memberEmails[userName];
    if (!toEmail) continue;
    const path     = paths.find(p => p.id === pathId);
    if (!path)     continue;
    const allIds       = path.courseIds || NJ_ALL;
    const completedIds = assignments.filter(a => a.completedAt).map(a => a.courseId);
    if (completedIds.length >= allIds.length) continue;
    const due    = new Date(dueDate);
    const diffMs = due - now;
    const diffDays = Math.ceil(diffMs / 86400000);
    let emailType = null;
    if (diffDays < 0) emailType = 'overdue';
    else if ([7, 3, 1].includes(diffDays)) emailType = 'reminder';
    if (!emailType) continue;
    const dedupeKey = `${userName}::${pathId}::${dueDate}::${diffDays < 0 ? 'overdue-'+today : diffDays+'d'}`;
    if (db.learning.remindersSent.includes(dedupeKey)) continue;
    try {
      let emailData;
      if (emailType === 'overdue') {
        emailData = buildOverdueEmail({ memberName:userName, allCourseIds:allIds, completedCourseIds:completedIds, dueDate, pathName:path.name });
      } else {
        emailData = buildReminderEmail({ memberName:userName, daysLeft:diffDays, allCourseIds:allIds, completedCourseIds:completedIds, dueDate, pathName:path.name });
      }
      await sendEmail({ to:toEmail, subject:emailData.subject, html:emailData.html, text:emailData.text });
      db.learning.remindersSent.push(dedupeKey);
      console.log(`[learning reminders] sent ${emailType} to ${userName}`);
    } catch(e) {
      console.warn(`[learning reminders] ${userName}`, e.message);
    }
  }
  await saveDB(db);
}

app.get('/api/cron/learning-reminders', async (req, res) => {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && req.headers['authorization'] !== `Bearer ${cronSecret}`)
    return res.status(401).json({ error: 'Unauthorized' });
  try {
    await runLearningReminders();
    res.json({ ok: true, ts: new Date().toISOString() });
  } catch(e) {
    console.error('[cron learning-reminders]', e);
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/learning/team', (req, res) => {
  if (!isAdmin(req)) return res.status(401).json({ error: 'Admin required' });
  ensureLearning();
  ensureSM();
  res.json({
    assignments:  db.learning.assignments,
    paths:        db.learning.paths,
    employees:    db.skillMatrix.employees,
    memberEmails: db.learning.memberEmails || {}
  });
});

app.get('/api/learning/paths', (req, res) => {
  ensureLearning();
  res.json(db.learning.paths);
});

// ── Tasks (My Priorities) ─────────────────────────────────────────────────────
function ensureTasks() {
  if (!db.tasks)      db.tasks      = [];
  if (!db.nextTaskId) db.nextTaskId = 1;
}

// GET /api/tasks?assignee=email OR ?assignedBy=email
app.get('/api/tasks', (req, res) => {
  ensureTasks();
  const { assignee, assignedBy } = req.query;
  const now = new Date();
  let list = db.tasks;
  if (assignee)   list = list.filter(t => (t.assigneeEmail   || '').toLowerCase() === assignee.toLowerCase());
  if (assignedBy) list = list.filter(t => (t.assignedByEmail || '').toLowerCase() === assignedBy.toLowerCase());
  list = list.map(t => ({
    ...t,
    isOverdue: t.status !== 'completed' && !!t.dueDate && new Date(t.dueDate) < now
  }));
  res.json({ tasks: list });
});

// POST /api/tasks — create a task
app.post('/api/tasks', (req, res) => {
  ensureTasks();
  const { title, description, assigneeEmail, assigneeName,
          assignedByEmail, assignedByName, dueDate, priority, links } = req.body;
  if (!title || !assigneeEmail)
    return res.status(400).json({ error: 'title and assigneeEmail required' });
  const task = {
    id:              db.nextTaskId++,
    title:           title.trim(),
    description:     description || '',
    assigneeEmail:   assigneeEmail.trim(),
    assigneeName:    assigneeName  || assigneeEmail,
    assignedByEmail: assignedByEmail || '',
    assignedByName:  assignedByName  || '',
    dueDate:         dueDate || null,
    priority:        priority || 'medium',
    status:          'not-started',
    links:           links || [],
    comments:        [],
    createdAt:       new Date().toISOString()
  };
  db.tasks.push(task);
  saveDB(db);
  res.status(201).json(task);
});

// PUT /api/tasks/:id — update status / fields
app.put('/api/tasks/:id', (req, res) => {
  ensureTasks();
  const id = parseInt(req.params.id);
  const t  = db.tasks.find(x => x.id === id);
  if (!t) return res.status(404).json({ error: 'Not found' });
  const allowed = ['status', 'title', 'description', 'dueDate', 'priority', 'links'];
  allowed.forEach(k => { if (req.body[k] !== undefined) t[k] = req.body[k]; });
  saveDB(db);
  res.json(t);
});

// POST /api/tasks/:id/comments — add a comment
app.post('/api/tasks/:id/comments', (req, res) => {
  ensureTasks();
  const id = parseInt(req.params.id);
  const t  = db.tasks.find(x => x.id === id);
  if (!t) return res.status(404).json({ error: 'Not found' });
  const { text, authorName, authorEmail } = req.body;
  if (!text) return res.status(400).json({ error: 'text required' });
  const comment = {
    id:          Date.now(),
    text:        text.trim(),
    authorName:  authorName  || authorEmail || 'User',
    authorEmail: authorEmail || '',
    createdAt:   new Date().toISOString()
  };
  if (!t.comments) t.comments = [];
  t.comments.push(comment);
  saveDB(db);
  res.json(comment);
});

// DELETE /api/tasks/:id
app.delete('/api/tasks/:id', (req, res) => {
  ensureTasks();
  const id  = parseInt(req.params.id);
  const idx = db.tasks.findIndex(x => x.id === id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  db.tasks.splice(idx, 1);
  saveDB(db);
  res.json({ ok: true });
});

// ── Email test endpoint (admin only) ─────────────────────────────────────────
app.post('/api/email/test', async (req, res) => {
  if (!isAdmin(req)) return res.status(403).json({ error: 'Admin only' });
  const { to } = req.body;
  if (!to) return res.status(400).json({ error: '`to` email required' });
  try {
    await sendEmail({
      to,
      subject: 'Delivery Wikipedia — Email configured ✓',
      html: `<p>Hi,</p><p>This is a test email from <strong>Delivery Wikipedia</strong> to confirm the email integration is working correctly.</p><p style="color:#888;font-size:12px;">Sent from delivery.wiki@bluecopa.com</p>`,
      text: 'Test email from Delivery Wikipedia — email integration is working.',
    });
    res.json({ ok: true, message: `Test email sent to ${to}` });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── Issue Resolution Portal ───────────────────────────────────────────────────

function ensureIssues() {
  if (!db.issues)       db.issues       = [];
  if (!db.nextIssueId)  db.nextIssueId  = 1;
}

// GET /api/issues/analytics  ← must be BEFORE /:id
app.get('/api/issues/analytics', async (req, res) => {
  await getDbInitPromise();
  ensureIssues();
  const issues = db.issues;
  const total            = issues.length;
  const open             = issues.filter(i => i.status === 'Open').length;
  const inProgress       = issues.filter(i => i.status === 'In Progress').length;
  const resolvedInternal = issues.filter(i => i.status === 'Resolved within Delivery').length;
  const escalated        = issues.filter(i => i.status === 'Escalated to Platform').length;
  const closed           = issues.filter(i => i.status === 'Closed').length;

  const resolved = issues.filter(i => i.resolvedAt && i.createdAt);
  const avgMs    = resolved.length
    ? resolved.reduce((s, i) => s + (new Date(i.resolvedAt) - new Date(i.createdAt)), 0) / resolved.length
    : 0;

  const categoryCounts = {};
  issues.forEach(i => { const c = i.category || 'Other'; categoryCounts[c] = (categoryCounts[c] || 0) + 1; });

  const contributors = {};
  issues.forEach(issue => {
    (issue.solutions || []).forEach(sol => {
      const e = sol.author?.email || ''; if (!e) return;
      if (!contributors[e]) contributors[e] = { name: sol.author.name, email: e, solutions: 0, accepted: 0 };
      contributors[e].solutions++;
      if (sol.isAccepted) contributors[e].accepted++;
    });
  });
  const topContributors = Object.values(contributors)
    .sort((a, b) => (b.accepted * 2 + b.solutions) - (a.accepted * 2 + a.solutions))
    .slice(0, 10);

  const monthly = {};
  const now = new Date();
  for (let m = 5; m >= 0; m--) {
    const d = new Date(now.getFullYear(), now.getMonth() - m, 1);
    monthly[d.toLocaleString('default', { month: 'short', year: '2-digit' })] = 0;
  }
  issues.forEach(i => {
    const d   = new Date(i.createdAt);
    const key = d.toLocaleString('default', { month: 'short', year: '2-digit' });
    if (monthly[key] !== undefined) monthly[key]++;
  });

  res.json({
    total, open, inProgress, resolvedInternal, escalated, closed,
    avgResolutionDays: +(avgMs / 86400000).toFixed(1),
    internalResolutionRate: total ? +((resolvedInternal / total) * 100).toFixed(1) : 0,
    categoryCounts, topContributors, monthly,
  });
});

// GET /api/issues
app.get('/api/issues', async (req, res) => {
  await getDbInitPromise();
  ensureIssues();
  let list = db.issues.slice();
  const { status, category, priority, search, tag } = req.query;
  if (status)   list = list.filter(i => i.status === status);
  if (category) list = list.filter(i => i.category === category);
  if (priority) list = list.filter(i => i.priority === priority);
  if (tag)      list = list.filter(i => (i.tags || []).includes(tag));
  if (search) {
    const q = search.toLowerCase();
    list = list.filter(i =>
      (i.title || '').toLowerCase().includes(q) ||
      (i.description || '').toLowerCase().includes(q) ||
      (i.clientName || '').toLowerCase().includes(q) ||
      (i.projectName || '').toLowerCase().includes(q) ||
      (i.tags || []).some(t => t.toLowerCase().includes(q))
    );
  }
  list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json({ issues: list });
});

// POST /api/issues
app.post('/api/issues', async (req, res) => {
  await getDbInitPromise();
  ensureIssues();
  const userEmail = req.headers['x-user-email'] || '';
  if (!userEmail) return res.status(401).json({ error: 'Not authenticated' });
  const { title, clientName, projectName, category, priority, description, tags, reportedByName, screenshots } = req.body;
  if (!title?.trim()) return res.status(400).json({ error: 'Title required' });
  const issue = {
    id: 'ip_' + Date.now(),
    title: title.trim(),
    clientName: (clientName || '').trim(),
    projectName: (projectName || '').trim(),
    category: category || 'Other',
    priority: priority || 'Medium',
    description: (description || '').trim(),
    status: 'Open',
    tags: Array.isArray(tags) ? tags.filter(Boolean) : (tags || '').split(',').map(t => t.trim()).filter(Boolean),
    screenshots: Array.isArray(screenshots) ? screenshots : [],
    reportedBy: { email: userEmail, name: reportedByName || userEmail },
    assignedOwner: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    resolvedAt: null,
    solutions: [],
  };
  db.issues.push(issue);
  await saveDB(db);
  res.status(201).json(issue);
});

// GET /api/issues/:id
app.get('/api/issues/:id', async (req, res) => {
  await getDbInitPromise();
  ensureIssues();
  const issue = db.issues.find(i => i.id === req.params.id);
  if (!issue) return res.status(404).json({ error: 'Not found' });
  res.json(issue);
});

// PATCH /api/issues/:id
app.patch('/api/issues/:id', async (req, res) => {
  await getDbInitPromise();
  ensureIssues();
  const issue = db.issues.find(i => i.id === req.params.id);
  if (!issue) return res.status(404).json({ error: 'Not found' });
  const userEmail = (req.headers['x-user-email'] || '').toLowerCase();
  if (!isAdmin(req) && issue.reportedBy?.email?.toLowerCase() !== userEmail)
    return res.status(403).json({ error: 'Only the reporter or admins can update this issue' });
  ['title','status','assignedOwner','priority','category','description','tags','clientName','projectName'].forEach(k => {
    if (req.body[k] !== undefined) issue[k] = req.body[k];
  });
  issue.updatedAt = new Date().toISOString();
  if (['Resolved within Delivery','Closed'].includes(req.body.status))
    issue.resolvedAt = issue.resolvedAt || new Date().toISOString();
  await saveDB(db);
  res.json(issue);
});

// POST /api/issues/:id/solutions
app.post('/api/issues/:id/solutions', async (req, res) => {
  await getDbInitPromise();
  ensureIssues();
  const issue = db.issues.find(i => i.id === req.params.id);
  if (!issue) return res.status(404).json({ error: 'Not found' });
  const userEmail = req.headers['x-user-email'] || '';
  if (!userEmail) return res.status(401).json({ error: 'Not authenticated' });
  const { text, authorName } = req.body;
  if (!text?.trim()) return res.status(400).json({ error: 'Solution text required' });
  const sol = {
    id: 'sol_' + Date.now(),
    text: text.trim(),
    author: { email: userEmail, name: authorName || userEmail },
    createdAt: new Date().toISOString(),
    isAccepted: false,
    acceptedAt: null,
    comments: [],
  };
  if (!issue.solutions) issue.solutions = [];
  issue.solutions.push(sol);
  if (issue.status === 'Open') issue.status = 'In Progress';
  issue.updatedAt = new Date().toISOString();
  await saveDB(db);
  res.status(201).json(sol);
});

// POST /api/issues/:id/solutions/:sid/accept
app.post('/api/issues/:id/solutions/:sid/accept', async (req, res) => {
  await getDbInitPromise();
  ensureIssues();
  const issue = db.issues.find(i => i.id === req.params.id);
  if (!issue) return res.status(404).json({ error: 'Not found' });
  const userEmail = (req.headers['x-user-email'] || '').toLowerCase();
  if (!isAdmin(req) && issue.reportedBy?.email?.toLowerCase() !== userEmail)
    return res.status(403).json({ error: 'Only the reporter or admins can accept a solution' });
  const sol = (issue.solutions || []).find(s => s.id === req.params.sid);
  if (!sol) return res.status(404).json({ error: 'Solution not found' });
  issue.solutions.forEach(s => { s.isAccepted = false; s.acceptedAt = null; });
  sol.isAccepted  = true;
  sol.acceptedAt  = new Date().toISOString();
  issue.status    = 'Resolved within Delivery';
  issue.resolvedAt = issue.resolvedAt || new Date().toISOString();
  issue.updatedAt  = new Date().toISOString();
  await saveDB(db);
  res.json({ issue, solution: sol });
});

// POST /api/issues/:id/solutions/:sid/comments
app.post('/api/issues/:id/solutions/:sid/comments', async (req, res) => {
  await getDbInitPromise();
  ensureIssues();
  const issue = db.issues.find(i => i.id === req.params.id);
  if (!issue) return res.status(404).json({ error: 'Not found' });
  const userEmail = req.headers['x-user-email'] || '';
  if (!userEmail) return res.status(401).json({ error: 'Not authenticated' });
  const sol = (issue.solutions || []).find(s => s.id === req.params.sid);
  if (!sol) return res.status(404).json({ error: 'Solution not found' });
  const { text, authorName } = req.body;
  if (!text?.trim()) return res.status(400).json({ error: 'Comment text required' });
  const comment = {
    id: 'cmt_' + Date.now(),
    text: text.trim(),
    author: { email: userEmail, name: authorName || userEmail },
    createdAt: new Date().toISOString(),
  };
  if (!sol.comments) sol.comments = [];
  sol.comments.push(comment);
  issue.updatedAt = new Date().toISOString();
  await saveDB(db);
  res.status(201).json(comment);
});

// ── 360° Leaderboard ─────────────────────────────────────────────────────────
app.get('/api/leaderboard', async (req, res) => {
  const period = req.query.period || 'year';
  const offset = parseInt(req.query.offset || '0', 10);
  try {
    await getDbInitPromise();
    if (!db.skillMatrix?.currentScores?.['Azhar']) {
      try { if (migrate()) await saveDB(db); } catch(e) { console.error('[lb-seed]', e.message); }
    }

    const now = new Date();
    const y = now.getFullYear(), m = now.getMonth();

    function periodRange(p, off) {
      let start, end;
      if (p === 'month') {
        start = new Date(y, m + off, 1);
        end   = new Date(y, m + off + 1, 1);
      } else if (p === 'quarter') {
        const tq = Math.floor(m / 3) + off;
        start = new Date(y, tq * 3, 1);
        end   = new Date(y, tq * 3 + 3, 1);
      } else {
        start = new Date(y + off, 0, 1);
        end   = new Date(y + off + 1, 0, 1);
      }
      return { start, end };
    }

    const { start: pStart, end: pEnd } = periodRange(period, offset);

    // Build excluded-names set from admin emails — resolves "Azhar" and
    // "Azhar Mohammed" (same person) and any future admins automatically.
    const adminEmails = new Set(
      ((db.settings && db.settings.adminEmails) || ['azhar.m@bluecopa.com'])
        .map(e => e.toLowerCase())
    );
    const excludedNames = new Set();
    for (const t of (db.tasks || [])) {
      if (t.assigneeEmail   && adminEmails.has(t.assigneeEmail.toLowerCase()))   excludedNames.add(t.assigneeName);
      if (t.assignedByEmail && adminEmails.has(t.assignedByEmail.toLowerCase())) excludedNames.add(t.assignedByName);
    }
    for (const issue of (db.issues || [])) {
      if (issue.reportedBy?.email && adminEmails.has(issue.reportedBy.email.toLowerCase()))
        excludedNames.add(issue.reportedBy.name);
    }
    // Remove blank/Admin entries that shouldn't appear anyway
    excludedNames.delete('Admin');
    excludedNames.delete('');
    excludedNames.delete(undefined);

    const empMap = {};
    function addPts(name, cat, pts) {
      if (!name || pts <= 0) return;
      if (!empMap[name]) empMap[name] = { name, score: 0, breakdown: {}, counts: {} };
      empMap[name].score += pts;
      empMap[name].breakdown[cat] = (empMap[name].breakdown[cat] || 0) + pts;
      empMap[name].counts[cat] = (empMap[name].counts[cat] || 0) + 1;
    }

    // 1. Articles published (+10 each, by created_at)
    for (const a of (db.articles || [])) {
      if (!a.author) continue;
      const ts = new Date(a.created_at);
      if (isNaN(ts) || ts < pStart || ts >= pEnd) continue;
      addPts(a.author, 'articles', 10);
    }

    // 2. Process Puzzles (+5 base + accuracy×0.1, by completedAt)
    for (const a of ((db.processGame && db.processGame.attempts) || [])) {
      if (!a.playerName) continue;
      const ts = new Date(a.completedAt);
      if (isNaN(ts) || ts < pStart || ts >= pEnd) continue;
      addPts(a.playerName, 'puzzles', 5 + Math.round((a.accuracy || 0) * 0.1));
    }

    // 3. Issues solved (+15 per accepted solution, by acceptedAt)
    // 4. Issues raised (+3 per issue reported, by createdAt)
    for (const issue of (db.issues || [])) {
      if (issue.reportedBy?.name) {
        const ts = new Date(issue.createdAt);
        if (!isNaN(ts) && ts >= pStart && ts < pEnd) addPts(issue.reportedBy.name, 'raised', 3);
      }
      for (const sol of (issue.solutions || [])) {
        if (!sol.isAccepted || !sol.author?.name) continue;
        const ts = new Date(sol.acceptedAt || sol.createdAt);
        if (isNaN(ts) || ts < pStart || ts >= pEnd) continue;
        addPts(sol.author.name, 'issues', 15);
      }
    }

    // 5. Tasks completed (+8 each, by dueDate)
    for (const t of (db.tasks || [])) {
      if (t.status !== 'completed' || !t.assigneeName) continue;
      const dateStr = t.dueDate || t.createdAt;
      if (!dateStr) continue;
      const ts = new Date(dateStr.length === 10 ? dateStr + 'T00:00:00.000Z' : dateStr);
      if (isNaN(ts) || ts < pStart || ts >= pEnd) continue;
      addPts(t.assigneeName, 'tasks', 8);
    }

    // 6. Ideas submitted (+5 each, by date)
    for (const idea of ((db.engagement && db.engagement.ideas) || [])) {
      if (!idea.author) continue;
      const ts = new Date(idea.date);
      if (isNaN(ts) || ts < pStart || ts >= pEnd) continue;
      addPts(idea.author, 'ideas', 5);
    }

    // 7. Learning assignments (+5 each, only on completion)
    for (const a of ((db.learning && db.learning.assignments) || [])) {
      if (!a.userName || !a.completedAt) continue;
      const ts = new Date(a.completedAt);
      if (isNaN(ts) || ts < pStart || ts >= pEnd) continue;
      addPts(a.userName, 'learning', 2);
    }

    // 8. Skill Matrix — PROFILE BONUS only for people with other activity in period.
    //    Kept last so it never causes someone to appear in a period with no real activity.
    const smScores = (db.skillMatrix && db.skillMatrix.currentScores) || {};
    for (const [name, areaScores] of Object.entries(smScores)) {
      if (!empMap[name]) continue; // skip — no activity this period
      const vals = Object.values(areaScores).filter(v => typeof v === 'number');
      if (!vals.length) continue;
      const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
      const pts = Math.round(avg / 10);
      if (pts > 0) addPts(name, 'skills', pts);
    }

    const ranked = Object.values(empMap)
      .filter(e => e.score > 0 && !excludedNames.has(e.name))
      .sort((a, b) => b.score - a.score)
      .slice(0, 10)
      .map((e, i) => ({ rank: i + 1, ...e }));

    res.json(ranked);
  } catch (err) {
    console.error('[leaderboard]', err.message);
    res.status(500).json({ error: 'Failed to compute leaderboard', detail: err.message });
  }
});

// ── Leaderboard: per-person points history ────────────────────────────────────
app.get('/api/leaderboard/history', async (req, res) => {
  const { name, period = 'year', offset = '0' } = req.query;
  if (!name) return res.status(400).json({ error: 'name required' });
  try {
    await getDbInitPromise();
    const now = new Date();
    const y = now.getFullYear(), mo = now.getMonth();
    const off = parseInt(offset, 10) || 0;
    let pStart, pEnd;
    if (period === 'month') {
      pStart = new Date(y, mo + off, 1);
      pEnd   = new Date(y, mo + off + 1, 1);
    } else if (period === 'quarter') {
      const tq = Math.floor(mo / 3) + off;
      pStart = new Date(y, tq * 3, 1);
      pEnd   = new Date(y, tq * 3 + 3, 1);
    } else {
      pStart = new Date(y + off, 0, 1);
      pEnd   = new Date(y + off + 1, 0, 1);
    }

    const norm = name.toLowerCase();
    const acts = [];

    // Articles
    for (const a of (db.articles || [])) {
      if (!a.author || a.author.toLowerCase() !== norm) continue;
      const ts = new Date(a.created_at);
      if (isNaN(ts) || ts < pStart || ts >= pEnd) continue;
      acts.push({ cat: 'articles', pts: 10, date: a.created_at, detail: a.title || 'Article' });
    }

    // Puzzles
    for (const a of ((db.processGame && db.processGame.attempts) || [])) {
      if (!a.playerName || a.playerName.toLowerCase() !== norm) continue;
      const ts = new Date(a.completedAt);
      if (isNaN(ts) || ts < pStart || ts >= pEnd) continue;
      const pts = 5 + Math.round((a.accuracy || 0) * 0.1);
      acts.push({ cat: 'puzzles', pts, date: a.completedAt, detail: `${Math.round(a.accuracy || 0)}% accuracy — ${a.score}/${a.total} correct` });
    }

    // Issues raised & solved
    for (const issue of (db.issues || [])) {
      if (issue.reportedBy && issue.reportedBy.name && issue.reportedBy.name.toLowerCase() === norm) {
        const ts = new Date(issue.createdAt);
        if (!isNaN(ts) && ts >= pStart && ts < pEnd)
          acts.push({ cat: 'raised', pts: 3, date: issue.createdAt, detail: issue.title || 'Issue reported' });
      }
      for (const sol of (issue.solutions || [])) {
        if (!sol.isAccepted || !sol.author || sol.author.name.toLowerCase() !== norm) continue;
        const ts = new Date(sol.acceptedAt || sol.createdAt);
        if (isNaN(ts) || ts < pStart || ts >= pEnd) continue;
        acts.push({ cat: 'issues', pts: 15, date: sol.acceptedAt || sol.createdAt, detail: `Solved: ${issue.title || 'Issue'}` });
      }
    }

    // Tasks
    for (const t of (db.tasks || [])) {
      if (t.status !== 'completed' || !t.assigneeName || t.assigneeName.toLowerCase() !== norm) continue;
      const dateStr = t.dueDate || t.createdAt;
      if (!dateStr) continue;
      const ts = new Date(dateStr.length === 10 ? dateStr + 'T00:00:00.000Z' : dateStr);
      if (isNaN(ts) || ts < pStart || ts >= pEnd) continue;
      acts.push({ cat: 'tasks', pts: 8, date: dateStr, detail: t.title || 'Task completed' });
    }

    // Ideas
    for (const idea of ((db.engagement && db.engagement.ideas) || [])) {
      if (!idea.author || idea.author.toLowerCase() !== norm) continue;
      const ts = new Date(idea.date);
      if (isNaN(ts) || ts < pStart || ts >= pEnd) continue;
      acts.push({ cat: 'ideas', pts: 5, date: idea.date, detail: idea.title || (idea.text || '').slice(0, 80) });
    }

    // Learning completions
    for (const a of ((db.learning && db.learning.assignments) || [])) {
      if (!a.completedAt || !a.userName || a.userName.toLowerCase() !== norm) continue;
      const ts = new Date(a.completedAt);
      if (isNaN(ts) || ts < pStart || ts >= pEnd) continue;
      acts.push({ cat: 'learning', pts: 2, date: a.completedAt, detail: a.courseId });
    }

    // Skill matrix bonus
    const smAll = (db.skillMatrix && db.skillMatrix.currentScores) || {};
    const smKey = Object.keys(smAll).find(k => k.toLowerCase() === norm);
    if (smKey) {
      const smScores = smAll[smKey];
      const vals = Object.values(smScores).filter(v => typeof v === 'number');
      if (vals.length) {
        const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
        const pts = Math.round(avg / 10);
        if (pts > 0)
          acts.push({ cat: 'skills', pts, date: null, detail: `Avg skill score ${avg.toFixed(0)}/100 across ${vals.length} areas` });
      }
    }

    acts.sort((a, b) => {
      if (!a.date) return 1;
      if (!b.date) return -1;
      return new Date(b.date) - new Date(a.date);
    });

    res.json(acts);
  } catch (err) {
    console.error('[leaderboard/history]', err.message);
    res.status(500).json({ error: 'Failed to load history', detail: err.message });
  }
});

// ── Debug endpoint (DB state snapshot) ───────────────────────────────────────
app.get('/api/debug/db', async (req, res) => {
  await getDbInitPromise();
  res.json({
    articles:           (db.articles || []).length,
    firstArticleDate:   (db.articles || [])[0]?.created_at || null,
    skillMatrixEmployees: Object.keys((db.skillMatrix && db.skillMatrix.currentScores) || {}).length,
    puzzleAttempts:     ((db.processGame && db.processGame.attempts) || []).length,
    ideas:              ((db.engagement && db.engagement.ideas) || []).length,
    tasks:              (db.tasks || []).length,
    issues:             (db.issues || []).length,
    learning:           ((db.learning && db.learning.assignments) || []).length,
    mongoConnected:     !!mongoCol,
  });
});

// ── Rocketlane Weekly Auto-Snapshot (triggered by Vercel Cron) ───────────────
async function rlAutoSnapshot() {
  const apiKey = process.env.ROCKETLANE_API_KEY;
  if (!apiKey) return { ok: false, reason: 'no_api_key' };
  await getDbInitPromise();
  ensureRL();

  const now = new Date();
  const dayOfWeek = now.getUTCDay();
  const mondayUTC = new Date(now);
  mondayUTC.setUTCDate(now.getUTCDate() - ((dayOfWeek + 6) % 7));
  mondayUTC.setUTCHours(0, 0, 0, 0);
  const thisWeekKey = mondayUTC.toISOString().slice(0, 10);

  // Dedup by weekKey (not capturedAt prefix) so manual retriggers on non-Monday days don't duplicate
  const alreadyDone = db.rocketlane.snapshots.some(s =>
    s.type === 'weekly' && s.weekKey === thisWeekKey
  );
  if (alreadyDone) return { ok: true, skipped: true, reason: 'already_captured_this_week' };

  try {
    const [projResp, allTasks] = await Promise.all([
      fetch('https://api.rocketlane.com/api/1.0/projects?pageSize=100', { headers: { 'api-key': apiKey, 'Accept': 'application/json' } }),
      rlFetchAllTasks(apiKey)
    ]);
    if (!projResp.ok) return { ok: false, reason: 'api_error', status: projResp.status };
    const data = await projResp.json();
    const allProjects = Array.isArray(data.data) ? data.data : Object.values(data.data || {});

    const tasksByProject = {};
    allTasks.forEach(t => {
      const pid = t.project?.projectId;
      if (!pid) return;
      if (!tasksByProject[pid]) tasksByProject[pid] = [];
      tasksByProject[pid].push(t);
    });

    const projects = allProjects.map(p => {
      const progress = rlBuildProjectProgress(tasksByProject[p.projectId] || []);
      const o = p.owner;
      const projectOwner = o ? ([o.firstName, o.lastName].filter(Boolean).join(' ').trim() || o.emailId || null) : null;
      // Capture per-category compliance counts so trends can be computed from snapshots
      const issues = rlBuildCompliance(p, progress, tasksByProject[p.projectId] || [], null);
      const byCategory = {};
      issues.forEach(i => { byCategory[i.category] = (byCategory[i.category] || 0) + 1; });
      return {
        projectId: p.projectId, projectName: p.projectName,
        status: p.status?.label || 'Unknown',
        isStandard: progress.isStandard,
        completionPct: progress.overallPct,
        dueDate: p.dueDate || null,
        customer: p.customer?.companyName || null,
        projectOwner,
        compliance: { issueCount: issues.length, byCategory }
      };
    });

    const label = `Week of ${mondayUTC.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })} (auto)`;
    const snap = {
      id: db.rocketlane.nextSnapshotId++,
      type: 'weekly', label, weekKey: thisWeekKey,
      capturedAt: now.toISOString(),
      projects, auto: true
    };
    db.rocketlane.snapshots.push(snap);
    await saveDB(db);
    return { ok: true, label, projectCount: projects.length };
  } catch (e) {
    return { ok: false, reason: 'exception', message: e.message };
  }
}

// Vercel Cron: every Monday at 4:20 AM UTC (9:50 AM IST)
// Schedule defined in vercel.json: "20 4 * * 1"
app.get('/api/cron/rl-snapshot', async (req, res) => {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.authorization !== `Bearer ${secret}`)
    return res.status(401).json({ error: 'Unauthorized' });
  const result = await rlAutoSnapshot();
  res.json(result);
});

module.exports = app;
