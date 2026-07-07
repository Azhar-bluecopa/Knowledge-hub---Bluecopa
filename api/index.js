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

async function sendEmail({ to, subject, html, text }) {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.warn('[email] SMTP not configured — skipping send');
    return;
  }
  try {
    const info = await mailer.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to,
      subject,
      html,
      text,
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

function isAdmin(req) {
  const email = (req.headers['x-user-email'] || '').toLowerCase().trim();
  if (!email) return false;
  const adminEmails = (db.settings && db.settings.adminEmails) || ['azhar.m@bluecopa.com'];
  return adminEmails.map(e => e.toLowerCase()).includes(email);
}

function getWeekNumber(d) {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return Math.ceil((((date - yearStart) / 86400000) + 1) / 7);
}

// ── Articles ──────────────────────────────────────────────────────────────────
app.get('/api/articles', (req, res) => {
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
  res.json(list);
});

app.get('/api/articles/:id', (req, res) => {
  const a = (db.articles || []).find(x => x.id === parseInt(req.params.id));
  if (!a) return res.status(404).json({ error: 'Not found' });
  res.json(a);
});

// View increment
app.post('/api/articles/:id/view', async (req, res) => {
  const a = (db.articles || []).find(x => x.id === parseInt(req.params.id));
  if (!a) return res.status(404).json({ error: 'Not found' });
  a.views = (a.views || 0) + 1;

  // Log who viewed
  const { viewer, viewerInitials } = req.body || {};
  if (!db.viewLog) db.viewLog = [];
  db.viewLog.push({
    articleId: a.id,
    articleTitle: a.title,
    viewer: viewer || 'Anonymous',
    viewerInitials: viewerInitials || (viewer ? viewer.slice(0,2).toUpperCase() : 'AN'),
    ts: new Date().toISOString(),
  });
  // Keep log capped at 2000 entries
  if (db.viewLog.length > 2000) db.viewLog = db.viewLog.slice(-2000);

  await saveDB(db);
  res.json({ views: a.views });
});

// Create article
app.post('/api/articles', async (req, res) => {
  const { whoCanPost } = (db.settings && db.settings.restrictions) || {};
  if (whoCanPost === 'disabled') return res.status(403).json({ error: 'Posting is disabled.' });
  if (whoCanPost === 'admins_only' && !isAdmin(req)) return res.status(403).json({ error: 'Only admins can post.' });
  const { title, category, author, initials, content, tags } = req.body;
  if (!title || !category || !content) return res.status(400).json({ error: 'title, category, content required' });
  if (!db.articles) db.articles = [];
  if (!db.nextId) db.nextId = (Math.max(0, ...db.articles.map(a => a.id)) + 1);
  const article = {
    id: db.nextId++,
    title, category, author: author || 'Anonymous',
    initials: initials || (author || 'A').slice(0,2).toUpperCase(),
    excerpt: content.replace(/<style[\s\S]*?<\/style>/gi,'').replace(/<script[\s\S]*?<\/script>/gi,'').replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim().slice(0,180) + '…',
    content, tags: Array.isArray(tags) ? tags : (tags||'').split(',').map(t=>t.trim()).filter(Boolean),
    created_at: new Date().toISOString(), views: 0,
  };
  db.articles.push(article);
  await saveDB(db);
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
  const idx = (db.articles || []).findIndex(x => x.id === id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  db.articles.splice(idx, 1);
  await saveDB(db);
  res.json({ success: true });
});

// ── Categories ────────────────────────────────────────────────────────────────
app.get('/api/categories', (req, res) => res.json(db.categories || []));

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
  db.categories.push(cat);
  await saveDB(db);
  res.status(201).json(cat);
});

app.delete('/api/categories/:id', async (req, res) => {
  if (!isAdmin(req)) return res.status(401).json({ error: 'Admin required' });
  const idParam = req.params.id;
  const idx = (db.categories || []).findIndex(c => String(c.id) === idParam);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  db.categories.splice(idx, 1);
  await saveDB(db);
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

// GET full skill matrix data
app.get('/api/skillmatrix', (req, res) => {
  ensureSM();
  res.json(db.skillMatrix);
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

  const articles = (db.articles || []).slice(0, 12).map(a =>
    `Title: ${a.title}\nCategory: ${a.category}\nExcerpt: ${(a.content || a.excerpt || '').replace(/<[^>]+>/g, '').slice(0, 600)}`
  ).join('\n\n---\n\n');
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
      rules:`Generate 8 multiple-choice KNOWLEDGE questions. Each must have exactly 4 options. Test understanding of processes, tools, and workflows. One option is clearly correct; the other 3 are plausible but wrong. Mix 2 easy, 4 medium, 2 hard.` },
    { id:'true_false',     name:'True or False',      icon:'⚖️', color:'trivia',
      desc:'Decide if each statement is true or false',
      rules:`Generate 8 TRUE/FALSE questions. Each question MUST be a statement (not a question). Options MUST be exactly ["True","False"] — only 2 options. Set correct to 0 if True, 1 if False. Mix ~4 true and ~4 false.` },
    { id:'riddle_round',   name:'Riddle Round',       icon:'🔮', color:'scenario',
      desc:'Solve creative riddles about delivery and data concepts',
      rules:`Generate 8 RIDDLES. Each riddle is metaphorical, written in first person ("I flow between systems..."). Provide 4 answer options, one correct.` },
    { id:'fill_blank',     name:'Fill in the Blank',  icon:'✏️', color:'quiz',
      desc:'Complete the missing word or phrase in each statement',
      rules:`Generate 8 FILL-IN-THE-BLANK questions. Each is a sentence with exactly ONE blank marked as _____. Provide 4 options to fill the blank — only one is correct.` },
    { id:'spot_mistake',   name:'Spot the Mistake',   icon:'🔍', color:'trivia',
      desc:'Find the deliberate error hidden in each description',
      rules:`Generate 8 SPOT-THE-MISTAKE questions. Each describes a process with ONE deliberate factual mistake. Ask "What is incorrect?" with 4 options.` },
    { id:'scenario',       name:'Scenario Challenge', icon:'🎯', color:'scenario',
      desc:'Make the right call in real-world delivery situations',
      rules:`Generate 8 SCENARIO-BASED questions. Each presents a work situation with a decision. Provide 4 possible actions — one is clearly best.` },
    { id:'what_next',      name:'What Comes Next?',   icon:'⏭️', color:'quiz',
      desc:'Identify the next correct step in a delivery workflow',
      rules:`Generate 8 SEQUENCING questions. Each describes a process up to a step, then asks "What should happen next?" Provide 4 options.` },
    { id:'term_buster',    name:'Term Buster',        icon:'📖', color:'trivia',
      desc:'Match terms, acronyms, and definitions from the knowledge base',
      rules:`Generate 8 TERMINOLOGY questions. Format: "What is [TERM]?", "What does [ACRONYM] stand for?". Provide 4 options — one correct definition.` },
    { id:'rapid_fire',     name:'Rapid Fire',         icon:'⚡', color:'scenario',
      desc:'10 quick-fire questions — speed and accuracy both count!',
      rules:`Generate 10 SHORT multiple-choice questions. Each question MUST be one concise sentence (max 15 words). Each has 4 options, one correct. Focus on quick-recall facts.` },
    { id:'emoji_quiz',     name:'Emoji Decode',       icon:'🎯', color:'scenario',
      desc:'Decode process workflows and concepts from emoji sequences!',
      rules:`Generate 8 EMOJI-CLUE questions. Each question shows 3–5 emojis representing a process or concept. Format: "📥 → 🔍 → ✅ — What process does this represent?" Provide 4 answer options.` },
    { id:'who_am_i',       name:'Who Am I?',          icon:'🕵️', color:'trivia',
      desc:'Guess the role, tool, or process from cryptic clues!',
      rules:`Generate 8 "WHO/WHAT AM I?" questions with 3 progressive clues. Format: "Clue 1: [vague]. Clue 2: [more specific]. Clue 3: [most specific]. Who/What am I?" Provide 4 options.` },
    { id:'mixed_bag',      name:'Mixed Bag',          icon:'🎲', color:'quiz',
      desc:'A surprise mix of all question types — stay on your toes!',
      rules:`Generate 8 questions using a MIX: 2 standard MCQ, 2 TRUE/FALSE (options MUST be ["True","False"]), 2 fill-in-the-blank (with _____), 2 riddles (metaphorical, first person).` },
  ];

  const fmt = (formatId && formatId !== 'random')
    ? (PP_FORMATS.find(f => f.id === formatId) || PP_FORMATS[Math.floor(Math.random() * PP_FORMATS.length)])
    : PP_FORMATS[Math.floor(Math.random() * PP_FORMATS.length)];

  const questionCount = fmt.id === 'rapid_fire' ? 10 : 8;
  const optionsExample = fmt.id === 'true_false' ? '["True","False"]' : '["Option A","Option B","Option C","Option D"]';
  const questionExample =
    fmt.id === 'fill_blank'  ? '"Teams use _____ to verify that ingested data matches source system counts."' :
    fmt.id === 'emoji_quiz'  ? '"📥 → 🔍 → ✅ → 📊 — What process does this emoji sequence represent?"' :
    fmt.id === 'who_am_i'   ? '"Clue 1: I am invisible until something breaks. Clue 2: I watch every data load. Clue 3: Teams set my thresholds. Who/What am I?"' :
    fmt.id === 'riddle_round'? '"I travel between systems carrying data, transforming as I go. What am I?"' :
    '"Full question text here."';

  const formatEnforcement = [
    fmt.id === 'fill_blank'   ? '⚠️ EVERY question MUST contain exactly one _____ blank in the sentence.' : '',
    fmt.id === 'emoji_quiz'   ? '⚠️ EVERY question MUST start with 3-5 emojis separated by → then a dash and text.' : '',
    fmt.id === 'who_am_i'    ? '⚠️ EVERY question MUST follow "Clue 1: ... Clue 2: ... Clue 3: ... Who/What am I?" format.' : '',
    fmt.id === 'riddle_round' ? '⚠️ EVERY question MUST be first-person metaphorical riddle ("I am...", "I do...").' : '',
    fmt.id === 'true_false'   ? '⚠️ options array MUST be exactly ["True","False"] for every question — no 4-option arrays.' : '',
    fmt.id === 'rapid_fire'   ? '⚠️ EVERY question must be ≤15 words. Generate 10, not 8.' : '',
  ].filter(Boolean).join('\n');

  const prompt = `You are generating a "${fmt.name}" format quiz for a delivery team's weekly "Process Puzzle" challenge.

THIS IS A "${fmt.id.toUpperCase()}" FORMAT — NOT STANDARD MULTIPLE CHOICE.

KNOWLEDGE BASE:
${articles}

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
      max_tokens: 3000,
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
const RL_TASKS_CACHE_TTL = 5 * 60 * 1000;

async function rlFetchAllTasks(apiKey) {
  const now = Date.now();
  if (rlAllTasksCache && (now - rlAllTasksCacheAt) < RL_TASKS_CACHE_TTL) return rlAllTasksCache;
  const tasks = [];
  let pageToken = null;
  let hasMore = true;
  while (hasMore) {
    const url = 'https://api.rocketlane.com/api/1.0/tasks?pageSize=100' + (pageToken ? `&pageToken=${pageToken}` : '');
    try {
      const r = await fetch(url, { headers: { 'api-key': apiKey, 'Accept': 'application/json' } });
      if (!r.ok) break;
      const d = await r.json();
      (d.data || []).forEach(t => tasks.push(t));
      hasMore = d.pagination?.hasMore || false;
      pageToken = d.pagination?.nextPageToken || null;
    } catch { break; }
  }
  rlAllTasksCache = tasks;
  rlAllTasksCacheAt = now;
  return tasks;
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
  const now = Date.now();
  if (rlCache && !req.query.refresh && (now - rlCacheAt) < RL_CACHE_TTL) {
    return res.json({ ...rlCache, cached: true, cacheAge: Math.round((now - rlCacheAt) / 1000) });
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
        // Weighted formula: completed=100%, in-progress=50%, todo=0%
        p.completionPct = Math.round((comp.completed + comp.inprogress * 0.5) / comp.total * 100);
        p.completionTasks = comp;
      } else {
        const lbl = (p.status?.label || '').toLowerCase();
        p.completionPct = lbl.includes('complet') ? 100 : 0;
        p.completionTasks = { total: 0, completed: 0, inprogress: 0, todo: 0 };
      }
    });
    rlCache = data;
    rlCacheAt = now;
    res.json({ ...data, cached: false, fetchedAt: now });
  } catch (e) {
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
  if (!db.rocketlane) db.rocketlane = { snapshots: [], nextSnapshotId: 1 };
}

app.get('/api/rocketlane/snapshots', (req, res) => {
  ensureRL();
  res.json({ snapshots: [...db.rocketlane.snapshots].reverse() });
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
    const users = [...memberMap.values()].sort((a, b) => a.name.localeCompare(b.name));
    res.json({ users, source: 'rocketlane_projects' });
  } catch(e) {
    const emails = db.settings?.adminEmails || [];
    res.json({ users: emails.map(e => ({ name: e.split('@')[0], email: e, role: null, initials: (e[0]||'?').toUpperCase() })), source: 'fallback', error: e.message });
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

// ── Learning Management ────────────────────────────────────────────────────────
function ensureLearning() {
  if (!db.learning) db.learning = {
    assignments: [],
    nextAssignmentId: 1,
    paths: [
      {
        id: 'new-joiner',
        name: 'New Joiner Learning Path',
        description: 'Mandatory onboarding curriculum for all new team members',
        courseIds: ['bc', 'ap', 'ar', 'mis', 'o2c', 'p2p', 'r2r'],
        durationDays: 30
      }
    ]
  };
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
  const { userNames, courseIds, pathId, type, dueDate } = req.body;
  if (!Array.isArray(userNames) || !Array.isArray(courseIds))
    return res.status(400).json({ error: 'userNames[] and courseIds[] required' });
  let created = 0;
  for (const userName of userNames) {
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
  res.json({ ok: true, created });
});

app.get('/api/learning/team', (req, res) => {
  if (!isAdmin(req)) return res.status(401).json({ error: 'Admin required' });
  ensureLearning();
  ensureSM();
  res.json({
    assignments: db.learning.assignments,
    paths:       db.learning.paths,
    employees:   db.skillMatrix.employees
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

    const empMap = {};
    // addPts stores POINTS (not counts) in breakdown so UI shows actual scores
    function addPts(name, cat, pts) {
      if (!name || pts <= 0) return;
      if (!empMap[name]) empMap[name] = { name, score: 0, breakdown: {} };
      empMap[name].score += pts;
      empMap[name].breakdown[cat] = (empMap[name].breakdown[cat] || 0) + pts;
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

    // 7. Learning assignments (+3 each, by assignedAt)
    for (const a of ((db.learning && db.learning.assignments) || [])) {
      if (!a.userName) continue;
      const ts = new Date(a.assignedAt);
      if (isNaN(ts) || ts < pStart || ts >= pEnd) continue;
      addPts(a.userName, 'learning', 3);
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
      .filter(e => e.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 10)
      .map((e, i) => ({ rank: i + 1, ...e }));

    res.json(ranked);
  } catch (err) {
    console.error('[leaderboard]', err.message);
    res.status(500).json({ error: 'Failed to compute leaderboard', detail: err.message });
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

module.exports = app;
