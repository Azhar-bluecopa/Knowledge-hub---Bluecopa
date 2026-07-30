require('dotenv').config({ path: require('path').join(__dirname, '.env'), override: true });
const express     = require('express');
const http        = require('http');
const path        = require('path');
const fs          = require('fs');
const compression = require('compression');
const multer      = require('multer');
const nodemailer  = require('nodemailer');

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

// ── Vercel compatibility ──────────────────────────────────────────────────────
const IS_VERCEL = !!process.env.VERCEL;

const app    = express();
const server = IS_VERCEL ? null : http.createServer(app);

// WebSocket only in local mode (Vercel serverless doesn't support persistent connections)
let wss = null;
if (!IS_VERCEL) {
  const { WebSocketServer } = require('ws');
  wss = new WebSocketServer({ server });
}

// ── Persistent store — MongoDB (primary) with file fallback ──────────────────
const DB_FILE = (() => {
  const p1 = path.join(__dirname, 'data.json');
  if (fs.existsSync(p1)) return p1;
  return path.join(process.cwd(), 'data.json');
})();
const UPLOADS = path.join(__dirname, 'public', 'uploads');
if (!IS_VERCEL && !fs.existsSync(UPLOADS)) fs.mkdirSync(UPLOADS, { recursive: true });

let mongoCol = null; // MongoDB collection, set after connect
let db = { articles: [], nextId: 1 }; // In-memory DB, populated in initDB()
let _dbReady = null; // Promise that resolves once initDB + migrate have finished

// Read from data.json (used as seed / fallback)
function loadFileDB() {
  try {
    const p1 = path.join(__dirname, 'data.json');
    const p2 = path.join(process.cwd(), 'data.json');
    const file = fs.existsSync(p1) ? p1 : p2;
    if (!fs.existsSync(file)) return { articles: [], nextId: 1 };
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch { return { articles: [], nextId: 1 }; }
}

// Persist — MongoDB when available, otherwise local file
function saveDB(data) {
  if (mongoCol) {
    // Return the promise so callers can await it when needed
    return mongoCol.replaceOne({ _id: 'main' }, { _id: 'main', ...data }, { upsert: true })
      .catch(e => console.error('[saveDB/mongo]', e.message));
  }
  if (IS_VERCEL) return Promise.resolve(); // no file write on Vercel without Mongo
  try { fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf8'); }
  catch (e) { console.error('[saveDB/file]', e.message); }
  return Promise.resolve();
}

// Connect to MongoDB Atlas and load data
async function initDB() {
  const uri = process.env.MONGODB_URI;
  if (uri) {
    try {
      const { MongoClient } = require('mongodb');
      const client = new MongoClient(uri, { serverSelectionTimeoutMS: 6000 });
      await client.connect();
      const mdb = client.db('knowledgehub');
      mongoCol = mdb.collection('store');
      console.log('◆ MongoDB connected');

      const doc = await mongoCol.findOne({ _id: 'main' });
      if (doc) {
        const { _id, ...data } = doc;
        db = data;
        console.log(`◆ Loaded ${db.articles?.length || 0} articles from MongoDB`);
      } else {
        // First run — seed MongoDB from data.json
        const seed = loadFileDB();
        db = seed;
        await mongoCol.insertOne({ _id: 'main', ...db });
        console.log(`◆ Seeded MongoDB with ${db.articles?.length || 0} articles from data.json`);
      }
      return;
    } catch (e) {
      console.error('✗ MongoDB connection failed, falling back to file:', e.message);
      mongoCol = null;
    }
  }
  // File fallback (local dev without MONGODB_URI)
  db = loadFileDB();
  console.log(`◆ Loaded ${db.articles?.length || 0} articles from file`);
}

// ── Migrate / init new DB fields (called after initDB) ───────────────────────
function migrate() {
  let dirty = false;
  if (!db.categories) {
    db.categories = [
      { id:1, name:'Engineering', color:'#7a9ee8', bg:'rgba(122,158,232,0.15)' },
      { id:2, name:'Finance',     color:'#7ae8b4', bg:'rgba(122,232,180,0.15)' },
      { id:3, name:'HR',          color:'#e87a9e', bg:'rgba(232,122,158,0.15)' },
      { id:4, name:'Product',     color:'#c97ae8', bg:'rgba(201,122,232,0.15)' },
      { id:5, name:'Support',     color:'#e8a87a', bg:'rgba(232,168,122,0.15)' },
    ];
    db.nextCategoryId = 6;
    dirty = true;
  }
  if (!db.settings) {
    db.settings = {
      adminEmails:  ['azhar.m@bluecopa.com'],
      siteTitle:    'KnowledgeHub',
      restrictions: { whoCanPost: 'anyone' }
    };
    dirty = true;
  }
  if (db.settings && !db.settings.adminEmails) {
    db.settings.adminEmails = ['azhar.m@bluecopa.com'];
    dirty = true;
  }
  // add views to existing articles
  db.articles.forEach(a => { if (a.views === undefined) { a.views = 0; dirty = true; } });
  // Employee Engagement Hub
  if (!db.engagement) {
    db.engagement = {
      spotlight: { month: null, quarter: null, year: null },
      achievements: [],
      moments: { photos: [], birthdays: [], anniversaries: [] },
      ideas: [],
      nextIdeaId: 1
    };
    dirty = true;
  }

  // ── 360° Leaderboard seed data ────────────────────────────────────────────
  // All checks use a specific ID as a canary so they're idempotent even when
  // MongoDB already has some data from real UI usage.

  // Skill Matrix — ensure our team's scores exist (keyed by 'Azhar' as canary)
  if (!db.skillMatrix) db.skillMatrix = { employees:[], processAreas:[], currentScores:{}, snapshots:[], nextSnapshotId:1 };
  if (!db.skillMatrix.currentScores) db.skillMatrix.currentScores = {};
  if (!db.skillMatrix.currentScores['Azhar']) {
    // Merge our team into the existing employee list without removing UI-added entries
    const existing = new Set(db.skillMatrix.employees || []);
    ['Azhar','Dharma Teja Taddi','Sai Kumar','Divyam Pandey','Karthik Varma',
     'Srikanth Ande','Srinivas Puneeth','Bhuvaneshwari Jangam','Sameera J',
     'Bhavana Priya','Jnanendra Avinash Golakoti','Hemanth Varma Pakalapati','Pradyumn Vibhandik']
      .forEach(n => existing.add(n));
    db.skillMatrix.employees = [...existing];
    if (!db.skillMatrix.processAreas || !db.skillMatrix.processAreas.length)
      db.skillMatrix.processAreas = ['Data Ingestion','Reconciliation','Workflows','Portal Creation','Exports'];
    Object.assign(db.skillMatrix.currentScores, {
      'Azhar':                       { 'Data Ingestion':92,'Reconciliation':88,'Workflows':90,'Portal Creation':82,'Exports':78 },
      'Dharma Teja Taddi':           { 'Data Ingestion':82,'Reconciliation':75,'Workflows':78,'Portal Creation':70,'Exports':68 },
      'Sai Kumar':                   { 'Data Ingestion':80,'Reconciliation':85,'Workflows':72,'Portal Creation':68,'Exports':75 },
      'Divyam Pandey':               { 'Data Ingestion':65,'Reconciliation':62,'Workflows':70,'Portal Creation':58,'Exports':60 },
      'Karthik Varma':               { 'Data Ingestion':72,'Reconciliation':68,'Workflows':65,'Portal Creation':75,'Exports':70 },
      'Srikanth Ande':               { 'Data Ingestion':78,'Reconciliation':72,'Workflows':68,'Portal Creation':62,'Exports':65 },
      'Srinivas Puneeth':            { 'Data Ingestion':70,'Reconciliation':68,'Workflows':72,'Portal Creation':65,'Exports':62 },
      'Bhuvaneshwari Jangam':        { 'Data Ingestion':60,'Reconciliation':65,'Workflows':58,'Portal Creation':55,'Exports':62 },
      'Sameera J':                   { 'Data Ingestion':68,'Reconciliation':62,'Workflows':65,'Portal Creation':70,'Exports':58 },
      'Bhavana Priya':               { 'Data Ingestion':72,'Reconciliation':65,'Workflows':70,'Portal Creation':62,'Exports':68 },
      'Jnanendra Avinash Golakoti':  { 'Data Ingestion':75,'Reconciliation':70,'Workflows':68,'Portal Creation':65,'Exports':72 },
      'Hemanth Varma Pakalapati':    { 'Data Ingestion':68,'Reconciliation':65,'Workflows':72,'Portal Creation':60,'Exports':65 },
      'Pradyumn Vibhandik':          { 'Data Ingestion':62,'Reconciliation':58,'Workflows':65,'Portal Creation':55,'Exports':60 },
    });
    dirty = true;
  }

  // Process Puzzle — add demo attempts if id 'pa_001' not yet present
  if (!db.processGame) db.processGame = { currentGame: null, attempts: [], gameHistory: [] };
  if (!Array.isArray(db.processGame.attempts)) db.processGame.attempts = [];
  if (!db.processGame.attempts.find(a => a.id === 'pa_001')) {
    db.processGame.attempts.push(
      { id:'pa_001', gameId:'demo', playerName:'Azhar',                     playerInitials:'AZ', score:9,  total:10, accuracy:90, timeTaken:95000,  completedAt:'2026-07-03T10:00:00.000Z', isFirstAttempt:true },
      { id:'pa_002', gameId:'demo', playerName:'Karthik Varma',             playerInitials:'KV', score:10, total:10, accuracy:100,timeTaken:72000,  completedAt:'2026-07-03T10:30:00.000Z', isFirstAttempt:true },
      { id:'pa_003', gameId:'demo', playerName:'Dharma Teja Taddi',         playerInitials:'DT', score:8,  total:10, accuracy:80, timeTaken:145000, completedAt:'2026-07-04T09:00:00.000Z', isFirstAttempt:true },
      { id:'pa_004', gameId:'demo', playerName:'Sai Kumar',                 playerInitials:'SK', score:7,  total:10, accuracy:70, timeTaken:180000, completedAt:'2026-07-04T11:00:00.000Z', isFirstAttempt:true },
      { id:'pa_005', gameId:'demo', playerName:'Hemanth Varma Pakalapati',  playerInitials:'HV', score:8,  total:10, accuracy:80, timeTaken:130000, completedAt:'2026-07-05T10:00:00.000Z', isFirstAttempt:true },
      { id:'pa_006', gameId:'demo', playerName:'Divyam Pandey',             playerInitials:'DP', score:6,  total:10, accuracy:60, timeTaken:200000, completedAt:'2026-07-05T11:00:00.000Z', isFirstAttempt:true },
      { id:'pa_007', gameId:'demo', playerName:'Srinivas Puneeth',          playerInitials:'SP', score:7,  total:10, accuracy:70, timeTaken:160000, completedAt:'2026-07-06T09:00:00.000Z', isFirstAttempt:true },
      { id:'pa_008', gameId:'demo', playerName:'Srikanth Ande',             playerInitials:'SA', score:9,  total:10, accuracy:90, timeTaken:105000, completedAt:'2026-07-06T09:30:00.000Z', isFirstAttempt:true }
    );
    dirty = true;
  }

  // Ideas — add demo ideas if id 1 not yet present
  if (db.engagement && !Array.isArray(db.engagement.ideas)) db.engagement.ideas = [];
  if (db.engagement && !db.engagement.ideas.find(i => i.id === 1)) {
    db.engagement.ideas.push(
      { id:1, title:'AI-powered article summarizer for faster reading', category:'Website Improvement',   author:'Azhar',               date:'2026-07-01T09:00:00.000Z', votes:8,  voters:[], status:'implemented' },
      { id:2, title:'Weekly knowledge quiz with team leaderboard',      category:'Process Improvement',   author:'Dharma Teja Taddi',   date:'2026-07-02T10:00:00.000Z', votes:5,  voters:[], status:'in-progress' },
      { id:3, title:'Client-specific knowledge sections per project',   category:'Process Improvement',   author:'Sai Kumar',           date:'2026-07-02T14:00:00.000Z', votes:3,  voters:[], status:'new' },
      { id:4, title:'Dark mode for the portal',                         category:'Website Improvement',   author:'Divyam Pandey',       date:'2026-07-03T15:00:00.000Z', votes:4,  voters:[], status:'new' },
      { id:5, title:'Automated onboarding checklist for new joiners',   category:'Process Improvement',   author:'Srikanth Ande',       date:'2026-07-04T11:00:00.000Z', votes:6,  voters:[], status:'in-progress' },
      { id:6, title:'Video walkthroughs for complex processes',         category:'Process Improvement',   author:'Karthik Varma',       date:'2026-07-05T09:00:00.000Z', votes:3,  voters:[], status:'new' }
    );
    if (!db.engagement.nextIdeaId || db.engagement.nextIdeaId < 7) db.engagement.nextIdeaId = 7;
    dirty = true;
  }

  // Tasks — add demo tasks if id 10 not yet present
  if (!db.tasks) db.tasks = [];
  if (!db.tasks.find(t => t.id === 10)) {
    db.tasks.push(
      { id:10, title:'Complete Q2 reconciliation review',    assigneeName:'Azhar',               assigneeEmail:'azhar.m@bluecopa.com', assignedByName:'Admin', assignedByEmail:'azhar.m@bluecopa.com', dueDate:'2026-07-01', priority:'high',   status:'completed', createdAt:'2026-06-25T09:00:00.000Z', links:[], comments:[] },
      { id:11, title:'Update delivery process documentation',assigneeName:'Azhar',               assigneeEmail:'azhar.m@bluecopa.com', assignedByName:'Admin', assignedByEmail:'azhar.m@bluecopa.com', dueDate:'2026-07-05', priority:'medium', status:'completed', createdAt:'2026-06-28T09:00:00.000Z', links:[], comments:[] },
      { id:12, title:'Review onboarding article for accuracy',assigneeName:'Dharma Teja Taddi',  assigneeEmail:'dharma@bluecopa.com',  assignedByName:'Admin', assignedByEmail:'azhar.m@bluecopa.com', dueDate:'2026-07-03', priority:'high',   status:'completed', createdAt:'2026-06-27T09:00:00.000Z', links:[], comments:[] },
      { id:13, title:'Prepare Q3 client onboarding deck',    assigneeName:'Sai Kumar',           assigneeEmail:'sai@bluecopa.com',     assignedByName:'Admin', assignedByEmail:'azhar.m@bluecopa.com', dueDate:'2026-07-04', priority:'medium', status:'completed', createdAt:'2026-06-28T09:00:00.000Z', links:[], comments:[] },
      { id:14, title:'Fix reconciliation module test cases',  assigneeName:'Karthik Varma',       assigneeEmail:'karthik@bluecopa.com', assignedByName:'Admin', assignedByEmail:'azhar.m@bluecopa.com', dueDate:'2026-07-02', priority:'medium', status:'completed', createdAt:'2026-06-26T09:00:00.000Z', links:[], comments:[] },
      { id:15, title:'Write GCS connector documentation',    assigneeName:'Srikanth Ande',       assigneeEmail:'srikanth@bluecopa.com',assignedByName:'Admin', assignedByEmail:'azhar.m@bluecopa.com', dueDate:'2026-07-04', priority:'medium', status:'completed', createdAt:'2026-06-27T09:00:00.000Z', links:[], comments:[] },
      { id:16, title:'Audit skill matrix scores for Q2',     assigneeName:'Srinivas Puneeth',    assigneeEmail:'srinivas@bluecopa.com',assignedByName:'Admin', assignedByEmail:'azhar.m@bluecopa.com', dueDate:'2026-07-05', priority:'low',    status:'completed', createdAt:'2026-06-29T09:00:00.000Z', links:[], comments:[] },
      { id:17, title:'Submit issue resolution report',        assigneeName:'Dharma Teja Taddi',   assigneeEmail:'dharma@bluecopa.com',  assignedByName:'Admin', assignedByEmail:'azhar.m@bluecopa.com', dueDate:'2026-07-06', priority:'high',   status:'completed', createdAt:'2026-06-30T09:00:00.000Z', links:[], comments:[] }
    );
    db.nextTaskId = Math.max(db.nextTaskId || 1, 18);
    dirty = true;
  }

  // Issues — seed a demo solution if no solutions exist
  if (db.issues && db.issues.length > 0 && (db.issues[0].solutions || []).length === 0) {
    db.issues[0].solutions = [{
      id: 'sol_001',
      text: 'Identified root cause: the reconciliation engine uses single-currency decimal precision (2dp) which overflows on multi-currency conversions. Fix is to apply currency-specific scale from the exchange rate table before comparison. Applied patch to the staging instance — verified against 3 multi-currency client datasets.',
      author: { email: 'dharma@bluecopa.com', name: 'Dharma Teja Taddi' },
      createdAt: '2026-07-04T14:00:00.000Z',
      isAccepted: true,
      comments: []
    }];
    db.issues[0].status = 'Resolved within Delivery';
    db.issues[0].resolvedAt = '2026-07-04T15:00:00.000Z';
    db.issues[0].updatedAt = '2026-07-04T15:00:00.000Z';
    dirty = true;
  }

  // UAT Platform
  if (!db.uat) {
    db.uat = { clients:[], projects:[], testcases:[], issues:[], templates:[], activity:[],
      nextClientId:1, nextProjectId:1, nextTestId:1, nextIssueId:1, nextTemplateId:1 };
    dirty = true;
  }

  return dirty; // caller is responsible for saveDB
}

// ── Multer ────────────────────────────────────────────────────────────────────
const storage = multer.diskStorage({
  destination: UPLOADS,
  filename: (req, file, cb) => {
    const safe = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    cb(null, `${Date.now()}-${safe}`);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    cb(null, /\.(jpg|jpeg|png|gif|webp|svg|mp4|webm|mov|ogg|avi)$/i.test(file.originalname));
  }
});

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(compression()); // gzip all responses
app.use(express.json({ limit: '10mb' }));
// Versioned assets (js?v=X, css?v=X) cached for 7 days; index.html never cached
app.use(express.static(path.join(__dirname, 'public'), {
  setHeaders(res, filePath) {
    if (filePath.endsWith('.html')) {
      res.setHeader('Cache-Control', 'no-cache');
    } else if (/\.(js|css|png|jpg|jpeg|svg|ico|webp|woff2?)$/.test(filePath)) {
      res.setHeader('Cache-Control', 'public, max-age=604800, stale-while-revalidate=86400');
    }
  },
}));

// ── Helpers ───────────────────────────────────────────────────────────────────
function getWeekNumber(d) {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return Math.ceil((((date - yearStart) / 86400000) + 1) / 7);
}

function broadcast(data) {
  if (!wss) return; // no-op on Vercel
  const msg = JSON.stringify(data);
  wss.clients.forEach(c => { if (c.readyState === 1) c.send(msg); });
}
function isAdmin(req) {
  const email = (req.headers['x-user-email'] || '').toLowerCase().trim();
  if (!email) return false;
  const adminEmails = (db.settings && db.settings.adminEmails) || ['azhar.m@bluecopa.com'];
  return adminEmails.map(e => e.toLowerCase()).includes(email);
}

// ── Articles ──────────────────────────────────────────────────────────────────
app.get('/api/articles', (req, res) => {
  const { category, q } = req.query;
  let list = [...db.articles];
  if (category && category !== 'All') list = list.filter(a => a.category === category);
  if (q) {
    const lq = q.toLowerCase();
    list = list.filter(a =>
      a.title.toLowerCase().includes(lq) ||
      a.excerpt.toLowerCase().includes(lq) ||
      a.tags.some(t => t.toLowerCase().includes(lq))
    );
  }
  res.json(list);
});

app.get('/api/articles/:id', (req, res) => {
  const a = db.articles.find(x => x.id === parseInt(req.params.id));
  if (!a) return res.status(404).json({ error: 'Not found' });
  res.json(a);
});

app.post('/api/articles', (req, res) => {
  const admin = isAdmin(req);
  const { whoCanPost } = db.settings.restrictions;
  if (whoCanPost === 'disabled') return res.status(403).json({ error: 'Posting is disabled by admin.' });
  if (whoCanPost === 'admins_only' && !admin) return res.status(403).json({ error: 'Only admins can post articles.' });

  const { title, category, author, initials, content, tags } = req.body;
  if (!title || !category || !content) return res.status(400).json({ error: 'title, category, content required' });

  const article = {
    id:         db.nextId++,
    title:      title.trim(),
    category,
    author:     (author || 'Anonymous').trim(),
    initials:   (initials || 'AN').trim().toUpperCase().slice(0, 2),
    excerpt:    content.replace(/!\[[^\]]*\]\([^)]+\)|\[video:[^\]]+\]/g, '').substring(0, 160).trimEnd() + (content.length > 160 ? '…' : ''),
    content,
    tags:       tags?.length ? tags : ['general'],
    created_at: new Date().toISOString(),
  };
  db.articles.unshift(article);
  saveDB(db);
  broadcast({ type: 'article_created', article });
  res.status(201).json(article);
});

app.post('/api/articles/:id/view', (req, res) => {
  const a = db.articles.find(x => x.id === parseInt(req.params.id));
  if (!a) return res.status(404).json({ error: 'Not found' });
  a.views = (a.views || 0) + 1;
  saveDB(db);
  res.json({ views: a.views });
});

app.get('/api/analytics', (req, res) => {
  const articles = db.articles;

  // articles per category
  const byCat = {};
  db.categories.forEach(c => { byCat[c.name] = 0; });
  articles.forEach(a => { byCat[a.category] = (byCat[a.category] || 0) + 1; });

  // articles per author
  const byAuthor = {};
  articles.forEach(a => { byAuthor[a.author] = (byAuthor[a.author] || 0) + 1; });

  // top 8 most viewed
  const topViewed = [...articles].sort((a,b) => (b.views||0)-(a.views||0)).slice(0,8)
    .map(a => ({ id:a.id, title:a.title, views:a.views||0, author:a.author, category:a.category }));

  // articles per month (last 6 months)
  const monthly = {};
  for (let i = 5; i >= 0; i--) {
    const d = new Date(); d.setMonth(d.getMonth() - i);
    const key = d.toLocaleString('default',{month:'short',year:'2-digit'});
    monthly[key] = 0;
  }
  articles.forEach(a => {
    const d = new Date(a.created_at);
    const key = d.toLocaleString('default',{month:'short',year:'2-digit'});
    if (monthly[key] !== undefined) monthly[key]++;
  });

  // tags frequency
  const tagFreq = {};
  articles.forEach(a => (a.tags||[]).forEach(t => { tagFreq[t] = (tagFreq[t]||0)+1; }));
  const topTags = Object.entries(tagFreq).sort((a,b)=>b[1]-a[1]).slice(0,8).map(([tag,count])=>({tag,count}));

  res.json({
    totals: { articles: articles.length, categories: db.categories.length, authors: Object.keys(byAuthor).length, views: articles.reduce((s,a)=>s+(a.views||0),0) },
    byCategory: Object.entries(byCat).map(([name,count])=>({ name, count, color: db.categories.find(c=>c.name===name)?.color||'#7a7a96' })),
    byAuthor:   Object.entries(byAuthor).sort((a,b)=>b[1]-a[1]).map(([name,count])=>({name,count})),
    topViewed,
    monthly,
    topTags,
  });
});

app.put('/api/articles/:id', (req, res) => {
  if (!isAdmin(req)) return res.status(401).json({ error: 'Admin required' });
  const id  = parseInt(req.params.id);
  const idx = db.articles.findIndex(x => x.id === id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  const { title, category, tags, content } = req.body;
  if (!title?.trim() || !category || !content?.trim())
    return res.status(400).json({ error: 'title, category and content required' });
  db.articles[idx] = {
    ...db.articles[idx],
    title: title.trim(),
    category,
    tags: Array.isArray(tags) ? tags : [],
    content: content.trim(),
    excerpt: content.trim().replace(/[#*`!\[\]]/g,'').slice(0,140),
    updated_at: new Date().toISOString(),
  };
  saveDB(db);
  broadcast({ type: 'article_updated', article: db.articles[idx] });
  res.json(db.articles[idx]);
});

app.delete('/api/articles/:id', (req, res) => {
  const id  = parseInt(req.params.id);
  const idx = db.articles.findIndex(x => x.id === id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  const article = db.articles[idx];
  const admin   = isAdmin(req);
  const author  = req.headers['x-author'];
  if (!admin && article.author !== author) return res.status(403).json({ error: 'Not authorized' });
  db.articles.splice(idx, 1);
  saveDB(db);
  broadcast({ type: 'article_deleted', id });
  res.json({ success: true });
});

// ── Categories ────────────────────────────────────────────────────────────────
app.get('/api/categories', (req, res) => res.json(db.categories));

app.post('/api/categories', (req, res) => {
  if (!isAdmin(req)) return res.status(401).json({ error: 'Admin required' });
  const { name, color } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'name required' });
  if (db.categories.find(c => c.name.toLowerCase() === name.trim().toLowerCase()))
    return res.status(400).json({ error: 'Category already exists' });

  const r = parseInt(color.slice(1,3),16), g = parseInt(color.slice(3,5),16), b = parseInt(color.slice(5,7),16);
  const cat = { id: db.nextCategoryId++, name: name.trim(), color, bg: `rgba(${r},${g},${b},0.15)` };
  db.categories.push(cat);
  saveDB(db);
  broadcast({ type: 'categories_updated', categories: db.categories });
  res.status(201).json(cat);
});

app.delete('/api/categories/:id', (req, res) => {
  if (!isAdmin(req)) return res.status(401).json({ error: 'Admin required' });
  const id  = parseInt(req.params.id);
  const idx = db.categories.findIndex(c => c.id === id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  const catName = db.categories[idx].name;
  db.categories.splice(idx, 1);
  const fallback = db.categories[0]?.name || 'General';
  db.articles.forEach(a => { if (a.category === catName) a.category = fallback; });
  saveDB(db);
  broadcast({ type: 'categories_updated', categories: db.categories });
  broadcast({ type: 'articles_refresh' });
  res.json({ success: true });
});

// ── Settings ──────────────────────────────────────────────────────────────────
app.get('/api/settings', (req, res) => {
  const { adminPassword: _, ...pub } = db.settings;
  res.json(pub);
});

app.put('/api/settings', (req, res) => {
  if (!isAdmin(req)) return res.status(401).json({ error: 'Admin required' });
  const { restrictions, adminEmails, siteTitle, aboutText } = req.body;
  if (restrictions)                                      db.settings.restrictions = { ...db.settings.restrictions, ...restrictions };
  if (Array.isArray(adminEmails) && adminEmails.length)  db.settings.adminEmails = adminEmails.map(e => e.trim().toLowerCase());
  if (siteTitle?.trim())                                 db.settings.siteTitle = siteTitle.trim();
  if (aboutText !== undefined)                           db.settings.aboutText = aboutText;
  saveDB(db);
  broadcast({ type: 'settings_updated', settings: db.settings });
  res.json(db.settings);
});

app.post('/api/admin/login', (req, res) => {
  const email = (req.body.email || '').toLowerCase().trim();
  if (!email) return res.status(400).json({ error: 'Email required' });
  const adminEmails = (db.settings && db.settings.adminEmails) || ['azhar.m@bluecopa.com'];
  if (adminEmails.map(e => e.toLowerCase()).includes(email))
    return res.json({ ok: true });
  return res.status(403).json({ error: 'Not authorized' });
});

// ── Comments ──────────────────────────────────────────────────────────────────
app.get('/api/articles/:id/comments', (req, res) => {
  const articleId = parseInt(req.params.id);
  const comments = (db.comments || []).filter(c => c.articleId === articleId);
  res.json(comments);
});

app.post('/api/articles/:id/comments', (req, res) => {
  const articleId = parseInt(req.params.id);
  const article = db.articles.find(a => a.id === articleId);
  if (!article) return res.status(404).json({ error: 'Article not found' });
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
  db.comments.push(comment);
  saveDB(db);
  broadcast({ type: 'new_comment', comment });
  res.status(201).json(comment);
});

app.delete('/api/articles/:id/comments/:commentId', (req, res) => {
  if (!isAdmin(req)) return res.status(401).json({ error: 'Admin required' });
  if (!db.comments) return res.status(404).json({ error: 'Not found' });
  const commentId = parseInt(req.params.commentId);
  const idx = db.comments.findIndex(c => c.id === commentId);
  if (idx === -1) return res.status(404).json({ error: 'Comment not found' });
  db.comments.splice(idx, 1);
  saveDB(db);
  broadcast({ type: 'comment_deleted', commentId });
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
  saveDB(db);
  broadcast({ type: 'new_article_request', request });
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
  const { status } = req.body;
  if (status) item.status = status;
  saveDB(db);
  res.json(item);
});

// ── Article Feedback ──────────────────────────────────────────────────────────
function ensureFeedback() { if (!db.feedback) db.feedback = []; }

app.get('/api/feedback', (req, res) => {
  if (!isAdmin(req)) return res.status(401).json({ error: 'Admin required' });
  ensureFeedback();
  res.json([...db.feedback].sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt)));
});

app.post('/api/feedback', (req, res) => {
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
  saveDB(db);
  res.status(201).json(fb);
});

app.put('/api/feedback/:id', (req, res) => {
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
  saveDB(db);
  res.json(fb);
});

// ── AI Ask (supports Anthropic Claude or Groq) ────────────────────────────────
app.post('/api/ask', async (req, res) => {
  const { question, articleId, history } = req.body;
  if (!question?.trim()) return res.status(400).json({ error: 'Question is required.' });

  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  const groqKey      = process.env.GROQ_API_KEY;
  const useAnthropic = anthropicKey && anthropicKey !== 'your-anthropic-api-key-here';
  const useGroq      = groqKey      && groqKey      !== 'your-groq-api-key-here';

  if (!useAnthropic && !useGroq) {
    return res.status(503).json({ error: 'AI assistant is not configured. Add ANTHROPIC_API_KEY or GROQ_API_KEY to your .env file.' });
  }

  // ── Helpers ──────────────────────────────────────────────────────────────────
  // Strip HTML tags & decode entities so the AI gets clean readable text
  function stripHtml(html) {
    return html
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, ' ')
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, ' ')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/?(p|div|li|h[1-6]|tr|td|th|section|article)[^>]*>/gi, '\n')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
      .replace(/[ \t]+/g, ' ')
      .replace(/\n[ \t]+/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  // Extract the most relevant paragraphs from clean text — not just the first N chars
  function extractRelevant(rawContent, qWords, maxChars = 6000) {
    const text = stripHtml(rawContent);
    if (text.length <= maxChars) return text;

    // Split into paragraphs (double newline or markdown headings)
    const paras = text.split(/\n{2,}/).map(p => p.trim()).filter(p => p.length > 30);

    // Score each paragraph by keyword overlap (weighted by position — earlier = slight bonus)
    const scored = paras.map((p, idx) => {
      const lower = p.toLowerCase();
      const kw = qWords.reduce((s, w) => s + (lower.includes(w) ? 1 : 0), 0);
      return { p, score: kw + (idx < 4 ? 0.3 : 0), idx };
    }).sort((a, b) => b.score - a.score || a.idx - b.idx);

    // Always include the first paragraph (context/title) then best matches
    const intro = paras.slice(0, 2).join('\n\n');
    let out = intro + '\n\n';
    let left = maxChars - intro.length - 2;

    for (const { p, idx } of scored) {
      if (idx < 2) continue;   // already in intro
      if (left <= 0) break;
      out += p + '\n\n';
      left -= p.length + 2;
    }
    return out.slice(0, maxChars);
  }

  // ── Retrieval ─────────────────────────────────────────────────────────────
  const allArticles = db.articles || [];
  let topArticles = [];
  const qWords = question.toLowerCase().replace(/[^a-z0-9\s]/g,' ').split(/\s+/).filter(w => w.length > 2);

  if (articleId) {
    const a = allArticles.find(x => x.id === parseInt(articleId));
    if (a) topArticles = [a];
  } else {
    const scored = allArticles.map(a => {
      // Score against title, tags, excerpt AND full stripped content
      const cleanText = stripHtml(a.content);
      const hay = (a.title+' '+a.excerpt+' '+(a.tags||[]).join(' ')+' '+a.category+' '+cleanText).toLowerCase();
      const score = qWords.reduce((s,w) => s + (hay.includes(w) ? 1 : 0), 0);
      return { a, score };
    }).sort((x,y) => y.score - x.score);
    topArticles = scored.slice(0,3).map(r => r.a);
  }

  // Full index of every article — ID + title + clickable link format shown explicitly
  const articleIndex = allArticles.map(a =>
    `  • ID ${a.id} | "${a.title}" | Category: ${a.category} | Link format: [${a.title}](#article-${a.id})`
  ).join('\n');

  // Smart extraction — strip HTML, pull most relevant paragraphs (up to 6000 chars each)
  const articleContext = topArticles.map(a =>
    `=== ARTICLE ID ${a.id}: ${a.title} ===\nCategory: ${a.category} | Tags: ${(a.tags||[]).join(', ')}\nLink: [${a.title}](#article-${a.id})\n\n${extractRelevant(a.content, qWords, 6000)}\n`
  ).join('\n---\n\n');

  const systemPrompt = `You are the Bluecopa Knowledge Assistant. You answer employee questions using ONLY the articles in the knowledge base below. Never use outside knowledge.

STRICT RULES:
- Use ONLY facts from the articles provided. Never invent URLs, steps, or info.
- If the answer is not in the articles, say: "⚠️ I don't have this info yet. Please contact the relevant team."
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
— End of knowledge base —`;

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
    if (useAnthropic) {
      // ── Anthropic Claude ──
      const Anthropic = require('@anthropic-ai/sdk');
      const client = new Anthropic.default({ apiKey: anthropicKey });
      const stream = await client.messages.stream({
        model: 'claude-opus-4-7',
        max_tokens: 2048,
        thinking: { type: 'adaptive' },
        system: systemPrompt,
        messages,
      });
      for await (const event of stream) {
        if (event.type === 'content_block_delta' && event.delta?.type === 'text_delta') {
          res.write(`data: ${JSON.stringify({ type: 'text', text: event.delta.text })}\n\n`);
        }
      }
    } else {
      // ── Groq (streaming via fetch) ──
      const fetch = globalThis.fetch || require('node-fetch');
      const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${groqKey}` },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [{ role: 'system', content: systemPrompt }, ...messages],
          max_tokens: 1024,
          temperature: 0.2,
          stream: true,
        }),
      });

      if (!groqRes.ok) {
        const errText = await groqRes.text();
        throw new Error(`Groq API error ${groqRes.status}: ${errText}`);
      }

      const reader = groqRes.body.getReader();
      const decoder = new TextDecoder();
      let buf = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split('\n');
        buf = lines.pop(); // keep incomplete line
        for (const line of lines) {
          const l = line.trim();
          if (!l || l === 'data: [DONE]') continue;
          if (l.startsWith('data: ')) {
            try {
              const json = JSON.parse(l.slice(6));
              const text = json.choices?.[0]?.delta?.content;
              if (text) res.write(`data: ${JSON.stringify({ type: 'text', text })}\n\n`);
            } catch { /* skip malformed */ }
          }
        }
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
const UAT_DEFAULTS = [
  { category:'R2R', subCategory:'Chart of Accounts', priority:'critical', testDescription:'Create and activate a new GL account with correct account type, group, and currency', expectedResult:'Account created, appears in CoA with correct type, currency, and group assignment; available for posting in correct periods' },
  { category:'R2R', subCategory:'Opening Balances', priority:'critical', testDescription:'Upload opening balances for all GL accounts and verify trial balance totals', expectedResult:'All accounts show correct opening debit/credit; trial balance total debits = total credits; no posting errors' },
  { category:'R2R', subCategory:'Journal Entries', priority:'critical', testDescription:'Post a manual journal entry with multiple debit/credit lines across two entities', expectedResult:'Journal posts without error, debit=credit, appears in GL with correct date, period, and user stamp; reversible' },
  { category:'R2R', subCategory:'Period Close', priority:'high', testDescription:'Execute month-end period close: run depreciation, post accruals, lock period for prior entries', expectedResult:'Depreciation posts correctly to asset and expense accounts; period locks after close; prior-period posting blocked' },
  { category:'R2R', subCategory:'Bank Reconciliation', priority:'high', testDescription:'Reconcile bank statement with GL cash account for a given month', expectedResult:'Matched items reconciled, unmatched items flagged with reason, reconciliation report exportable, closing balance matches bank statement' },
  { category:'R2R', subCategory:'Intercompany', priority:'medium', testDescription:'Post an intercompany transaction and verify automatic elimination entries', expectedResult:'IC payable and receivable created in respective entities; elimination journal generated; IC balances net to zero in consolidated view' },
  { category:'R2R', subCategory:'Financial Statements', priority:'critical', testDescription:'Generate P&L, Balance Sheet, and Cash Flow statements for a closed period', expectedResult:'All three statements balance, figures agree with trial balance, period/entity filters functional, export to PDF and Excel works' },
  { category:'R2R', subCategory:'Audit Trail', priority:'high', testDescription:'Modify a posted journal and verify the system creates an audit log entry', expectedResult:'Original entry preserved; modification logged with user, timestamp, old value, new value; immutable log exportable' },
  { category:'P2P', subCategory:'Vendor Master', priority:'high', testDescription:'Create a new vendor with bank details, payment terms, and tax classification', expectedResult:'Vendor saved with all fields; bank details encrypted; payment terms applied to invoices; vendor searchable by name and code' },
  { category:'P2P', subCategory:'Purchase Orders', priority:'critical', testDescription:'Raise a 3-way match PO (PO → GRN → Invoice) and verify matching rules', expectedResult:'PO created with approval workflow; GRN posts inventory; invoice matched within tolerance; mismatches flagged for review' },
  { category:'P2P', subCategory:'Invoice Processing', priority:'critical', testDescription:'Process a vendor invoice against a PO and handle a quantity variance', expectedResult:'Invoice matched to PO; quantity variance creates exception; approver notified; variance approved or rejected with comment' },
  { category:'P2P', subCategory:'Payments', priority:'critical', testDescription:'Run a payment batch for due invoices and generate bank payment file', expectedResult:'Correct invoices selected by due date and vendor; bank file generated in correct format; payment posted and reconciled to bank' },
  { category:'P2P', subCategory:'Payments', priority:'high', testDescription:'Process a vendor advance payment and apply it against a subsequent invoice', expectedResult:'Advance posted to vendor account; invoice created later; advance applied reducing invoice balance; net payment correct' },
  { category:'P2P', subCategory:'Expense Claims', priority:'medium', testDescription:'Submit an employee expense claim with receipts and route through approval', expectedResult:'Claim submitted with attachment; routed to approver; approved/rejected with comment; reimbursement payment generated' },
  { category:'P2P', subCategory:'AP Reporting', priority:'high', testDescription:'Generate AP aging report and reconcile totals with AP control account', expectedResult:'Aging buckets (current/30/60/90+ days) correct, total matches AP ledger, supplier-wise breakdown available, export works' },
  { category:'P2P', subCategory:'Credit Notes', priority:'medium', testDescription:'Process a vendor credit note and apply it to an open invoice', expectedResult:'Credit note posted; applied against correct invoice; net vendor balance updated; available for future payment batch' },
  { category:'O2C', subCategory:'Customer Master', priority:'high', testDescription:'Create a new customer with credit limit, payment terms, and tax details', expectedResult:'Customer created with credit limit enforced on orders; tax applied correctly on invoices; searchable and reportable' },
  { category:'O2C', subCategory:'Sales Orders', priority:'critical', testDescription:'Create a sales order, check inventory availability, and confirm delivery', expectedResult:'Order created; inventory checked and reserved; delivery schedule confirmed; order status tracked through fulfillment' },
  { category:'O2C', subCategory:'Invoicing', priority:'critical', testDescription:'Generate a customer invoice from a delivered sales order and email to customer', expectedResult:'Invoice generated with correct line items, taxes, and totals; PDF generated; email sent with invoice attached; AR updated' },
  { category:'O2C', subCategory:'Collections', priority:'high', testDescription:'Record a partial customer payment and apply it to the oldest open invoices', expectedResult:'Payment posted to AR; applied to oldest invoices first (FIFO); remaining balance correct; payment visible in customer statement' },
  { category:'O2C', subCategory:'Credit Notes', priority:'medium', testDescription:'Raise a customer credit note for a returned item and apply against AR', expectedResult:'Credit note posted; linked to original invoice; applied to AR reducing balance; inventory updated for returned goods' },
  { category:'O2C', subCategory:'Dunning', priority:'medium', testDescription:'Run the dunning process for overdue invoices and verify reminder letters', expectedResult:'Overdue invoices identified by aging; dunning letters generated with correct amounts and due dates; sent to customer contacts' },
  { category:'O2C', subCategory:'AR Reporting', priority:'high', testDescription:'Generate AR aging report and reconcile with AR control account', expectedResult:'Aging buckets correct; total matches AR control account in GL; customer-wise and invoice-wise drill-down available' },
  { category:'Planning', subCategory:'Budget Setup', priority:'high', testDescription:'Create annual budget by cost center and department with version control', expectedResult:'Budget entries created for all periods; version saved; budget vs actual comparison available in reporting; locked after approval' },
  { category:'Planning', subCategory:'Forecasting', priority:'medium', testDescription:'Generate a rolling 3-month forecast and compare to budget', expectedResult:'Forecast generated using actuals + forward estimates; variance to budget highlighted; scenario comparison available' },
  { category:'Planning', subCategory:'Consolidation', priority:'high', testDescription:'Run multi-entity consolidation and verify elimination of intercompany balances', expectedResult:'All entities consolidated; IC eliminations applied; minority interest calculated; consolidated financials balance' },
  { category:'Planning', subCategory:'Allocations', priority:'medium', testDescription:'Configure and run a cost allocation from a shared service center to business units', expectedResult:'Allocation rule configured with correct driver; amounts allocated proportionally; journal created; source account zeroed out' },
  { category:'Dashboards', subCategory:'Executive Dashboard', priority:'critical', testDescription:'Load the executive dashboard and verify all KPI cards refresh with live data', expectedResult:'All KPIs (revenue, cost, margin, AR, AP) load within 5 seconds; data matches source reports; filters by entity and period work' },
  { category:'Dashboards', subCategory:'Cash Flow Dashboard', priority:'high', testDescription:'View cash position dashboard across all bank accounts with drill-down', expectedResult:'Total cash position correct; bank-wise breakdown available; cash flow trend chart renders; forecast vs actual toggle works' },
  { category:'Dashboards', subCategory:'AP Dashboard', priority:'high', testDescription:'View AP dashboard showing due payments, aging, and top vendors', expectedResult:'Due payments for next 7/30 days correct; aging chart matches AP aging report; top 10 vendors by outstanding balance shown' },
  { category:'Dashboards', subCategory:'AR Dashboard', priority:'high', testDescription:'View AR dashboard showing overdue invoices, DSO, and collection trends', expectedResult:'Overdue amount correct; DSO calculated correctly; collection efficiency trend visible; drill-down to invoice level works' },
  { category:'Dashboards', subCategory:'Budgets Dashboard', priority:'medium', testDescription:'View budget vs actual dashboard for current month and YTD', expectedResult:'Budget vs actual for all cost centers; favorable/unfavorable variance highlighted; YTD toggle works; entity filter functional' },
  { category:'Reports', subCategory:'Standard Reports', priority:'critical', testDescription:'Generate trial balance for a closed accounting period', expectedResult:'Debits equal credits, figures match GL, export to Excel and PDF functional, comparative period toggle works' },
  { category:'Reports', subCategory:'Standard Reports', priority:'high', testDescription:'Generate month-over-month P&L comparison report', expectedResult:'Current vs prior period columns correct, variance column accurate, export to Excel works with all formatting' },
  { category:'Reports', subCategory:'Standard Reports', priority:'critical', testDescription:'Generate balance sheet as of period-end date', expectedResult:'Assets = Liabilities + Equity, matches GL balances, entity-wise breakdown available, export functional' },
  { category:'Reports', subCategory:'Custom Reports', priority:'medium', testDescription:'Build a custom report using report builder with GL, entity, and date range filters', expectedResult:'Report generates data matching GL, save-report feature works, export to CSV and Excel functional' },
  { category:'Reports', subCategory:'Scheduled Reports', priority:'medium', testDescription:'Schedule a monthly trial balance report to email to the finance team', expectedResult:'Schedule configured with correct recipients, frequency, and format; report delivered on schedule; unsubscribe option works' },
  { category:'Security', subCategory:'Role-Based Access', priority:'critical', testDescription:'Verify that a read-only user cannot post journals or approve payments', expectedResult:'Post and approve buttons hidden or disabled for read-only role; direct API calls return 403; audit log records access attempt' },
  { category:'Security', subCategory:'Audit Trail', priority:'high', testDescription:'Make a data change and verify full audit log with user, timestamp, and before/after values', expectedResult:'Audit log shows user, action type, timestamp, old value, new value. Log is immutable and exportable to Excel' },
  { category:'Security', subCategory:'Data Segregation', priority:'high', testDescription:'Verify that Entity A users cannot view or post to Entity B data', expectedResult:'Entity B data not visible in dropdowns or reports for Entity A users; cross-entity API calls return 403' },
  { category:'Security', subCategory:'Password Policy', priority:'medium', testDescription:'Attempt login with weak password and verify enforcement of password policy', expectedResult:'Weak passwords rejected with specific rule message; lockout after 5 failed attempts; password reset flow works via email' },
  { category:'Integrations', subCategory:'Bank Feed', priority:'high', testDescription:'Trigger bank feed sync and verify transactions imported and matched', expectedResult:'Bank transactions imported within 2 minutes; auto-matched to GL entries where possible; unmatched flagged for review' },
  { category:'Integrations', subCategory:'ERP Sync', priority:'high', testDescription:'Sync a vendor invoice from source ERP and verify it appears in AP module', expectedResult:'Invoice synced within configured interval; data fields mapped correctly; duplicate detection prevents double import; error log available' },
  { category:'Integrations', subCategory:'Export API', priority:'medium', testDescription:'Call the financial data export API and verify response format and data accuracy', expectedResult:'API returns correct JSON schema; data matches reports; authentication required; rate limiting active; pagination works for large datasets' },
];

// ── Clients ───────────────────────────────────────────────────────────────────
app.get('/api/uat/clients', async (req, res) => { await _dbReady; res.json({ ok:true, data: uatDB().clients }); });
// ── Clients ───────────────────────────────────────────────────────────────────
app.post('/api/uat/clients', async (req, res) => {
  await _dbReady; const u=uatDB();
  const { name, shortCode, primaryContact={}, internalLead='', entities=['Default'] } = req.body;
  if (!name) return res.status(400).json({ ok:false, error:'name required' });
  const token=require('crypto').randomBytes(24).toString('hex');
  const client={ id:uatId(), name, shortCode:shortCode||name.replace(/\s+/g,'').slice(0,5).toUpperCase(), primaryContact, internalLead, entities, status:'active', portalToken:token, createdAt:new Date().toISOString(), updatedAt:new Date().toISOString() };
  u.clients.push(client); uatLog('client_created',`Client "${name}" added`);
  await saveDB(db); res.json({ ok:true, data:client });
});
app.put('/api/uat/clients/:id', async (req, res) => {
  await _dbReady; const u=uatDB(); const c=u.clients.find(x=>x.id===req.params.id);
  if (!c) return res.status(404).json({ ok:false, error:'not found' });
  Object.assign(c, req.body, { id:c.id, portalToken:c.portalToken, updatedAt:new Date().toISOString() });
  await saveDB(db); res.json({ ok:true, data:c });
});
app.delete('/api/uat/clients/:id', async (req, res) => {
  await _dbReady; const u=uatDB(); const id=req.params.id;
  u.clients=u.clients.filter(x=>x.id!==id); u.projects=u.projects.filter(x=>x.clientId!==id);
  u.testcases=u.testcases.filter(x=>x.clientId!==id); u.issues=u.issues.filter(x=>x.clientId!==id);
  await saveDB(db); res.json({ ok:true });
});

// ── Projects ──────────────────────────────────────────────────────────────────
app.get('/api/uat/projects', async (req, res) => {
  await _dbReady; let list=uatDB().projects;
  if (req.query.clientId) list=list.filter(p=>p.clientId===req.query.clientId);
  res.json({ ok:true, data:list });
});
app.post('/api/uat/projects', async (req, res) => {
  await _dbReady; const u=uatDB();
  const { clientId: rawClientId, clientName: rawClientName='', name, entity='', businessUnit='', goLiveDate='', description='', seedDefaults=false } = req.body;
  if (!name) return res.status(400).json({ ok:false, error:'Project name required' });
  let clientId = rawClientId || '';
  let clientName = rawClientName.trim();
  if (!clientId && clientName) {
    let c = u.clients.find(x => x.name.toLowerCase() === clientName.toLowerCase());
    if (!c) { c = { id:uatId(), name:clientName, shortCode:clientName.slice(0,3).toUpperCase(), createdAt:new Date().toISOString() }; u.clients.push(c); }
    else clientName = c.name;
    clientId = c.id;
  } else if (clientId) {
    const c = u.clients.find(x => x.id === clientId);
    if (c) clientName = c.name;
  }
  const p={ id:uatId(), clientId, clientName, name, entity, businessUnit, goLiveDate, description, phase:'uat', status:'active', uatRound:1, signoff:null, createdAt:new Date().toISOString(), updatedAt:new Date().toISOString() };
  u.projects.push(p);
  if (seedDefaults) {
    const tcs=UAT_DEFAULTS.map((d,i)=>uatNewTC({...d,id:uatId(),projectId:p.id,clientId,seq:i+1}));
    u.testcases.push(...tcs);
    uatLog('project_seeded',`"${name}" seeded with ${tcs.length} default test cases`,{projectId:p.id,clientId});
  } else uatLog('project_created',`Project "${name}" created`,{projectId:p.id,clientId});
  await saveDB(db); res.json({ ok:true, data:p });
});
app.put('/api/uat/projects/:id', async (req, res) => {
  await _dbReady; const u=uatDB(); const p=u.projects.find(x=>x.id===req.params.id);
  if (!p) return res.status(404).json({ ok:false, error:'not found' });
  if (req.body.clientName !== undefined) {
    const cn = req.body.clientName.trim();
    if (cn) {
      let c = u.clients.find(x => x.name.toLowerCase() === cn.toLowerCase());
      if (!c) { c = { id:uatId(), name:cn, shortCode:cn.slice(0,3).toUpperCase(), createdAt:new Date().toISOString() }; u.clients.push(c); }
      req.body.clientId = c.id; req.body.clientName = c.name;
    }
  }
  Object.assign(p, req.body, { id:p.id, updatedAt:new Date().toISOString() });
  await saveDB(db); res.json({ ok:true, data:p });
});
app.post('/api/uat/projects/:id/seed', async (req, res) => {
  await _dbReady; const u=uatDB(); const p=u.projects.find(x=>x.id===req.params.id);
  if (!p) return res.status(404).json({ ok:false, error:'not found' });
  const start=u.testcases.filter(t=>t.projectId===p.id).length;
  const tcs=UAT_DEFAULTS.map((d,i)=>uatNewTC({...d,id:uatId(),projectId:p.id,clientId:p.clientId,seq:start+i+1}));
  u.testcases.push(...tcs);
  uatLog('project_seeded',`Seeded ${tcs.length} default test cases into "${p.name}"`,{projectId:p.id});
  await saveDB(db); res.json({ ok:true, data:{ count:tcs.length } });
});
app.post('/api/uat/projects/:id/signoff', async (req, res) => {
  await _dbReady; const u=uatDB(); const p=u.projects.find(x=>x.id===req.params.id);
  if (!p) return res.status(404).json({ ok:false, error:'not found' });
  p.signoff={ status:req.body.approve?'approved':'rejected', signedBy:req.body.signedBy||'Client', comment:req.body.comment||'', signedAt:new Date().toISOString() };
  if (req.body.approve) p.phase='go_live';
  uatLog('signoff',`UAT ${p.signoff.status} for "${p.name}"`,{projectId:p.id,clientId:p.clientId});
  await saveDB(db); res.json({ ok:true, data:p });
});
// ── Test Cases ────────────────────────────────────────────────────────────────
app.get('/api/uat/testcases', async (req, res) => {
  await _dbReady; let list=uatDB().testcases;
  if (req.query.projectId) list=list.filter(t=>t.projectId===req.query.projectId);
  if (req.query.clientId)  list=list.filter(t=>t.clientId===req.query.clientId);
  if (req.query.category)  list=list.filter(t=>t.category===req.query.category);
  if (req.query.bStatus)   list=list.filter(t=>t.bluecopaStatus===req.query.bStatus);
  if (req.query.cStatus)   list=list.filter(t=>t.clientStatus===req.query.cStatus);
  if (req.query.q) { const ql=req.query.q.toLowerCase(); list=list.filter(t=>(t.testDescription||'').toLowerCase().includes(ql)||(t.subCategory||'').toLowerCase().includes(ql)||(t.category||'').toLowerCase().includes(ql)); }
  res.json({ ok:true, data:list });
});
app.post('/api/uat/testcases', async (req, res) => {
  await _dbReady; const u=uatDB();
  if (!req.body.projectId) return res.status(400).json({ ok:false, error:'projectId required' });
  const seq=u.testcases.filter(t=>t.projectId===req.body.projectId).length+1;
  const tc=uatNewTC({...req.body,seq,id:uatId()});
  u.testcases.push(tc); await saveDB(db); res.json({ ok:true, data:tc });
});
app.put('/api/uat/testcases/:id', async (req, res) => {
  await _dbReady; const u=uatDB(); const tc=u.testcases.find(x=>x.id===req.params.id);
  if (!tc) return res.status(404).json({ ok:false, error:'not found' });
  const { bluecopaStatus, clientStatus, bluecopaComments, clientComments, attachments, ...rest } = req.body;
  if (bluecopaStatus!==undefined&&tc.bluecopaStatus!==bluecopaStatus){tc.bluecopaStatus=bluecopaStatus;uatLog('b_status',`Bluecopa: ${bluecopaStatus} on TC-${tc.seq}`,{projectId:tc.projectId});}
  if (clientStatus!==undefined&&tc.clientStatus!==clientStatus){tc.clientStatus=clientStatus;uatLog('c_status',`Client: ${clientStatus} on TC-${tc.seq}`,{projectId:tc.projectId});}
  if (bluecopaComments!==undefined) tc.bluecopaComments=bluecopaComments;
  if (clientComments!==undefined)   tc.clientComments=clientComments;
  if (attachments!==undefined)      tc.attachments=attachments;
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
app.post('/api/uat/projects/:id/rename-entity', async (req, res) => {
  await _dbReady; const u=uatDB(); const p=u.projects.find(x=>x.id===req.params.id);
  if (!p) return res.status(404).json({ ok:false, error:'not found' });
  const { oldName, newName } = req.body;
  if (!oldName||!newName||oldName===newName) return res.status(400).json({ ok:false, error:'invalid names' });
  const idx = (p.entities||[]).indexOf(oldName);
  if (idx === -1) return res.status(404).json({ ok:false, error:'entity not found' });
  p.entities[idx] = newName;
  u.testcases.filter(t=>t.projectId===p.id).forEach(tc=>{
    if (tc.entityStatuses&&tc.entityStatuses[oldName]) {
      tc.entityStatuses[newName] = tc.entityStatuses[oldName];
      delete tc.entityStatuses[oldName];
      tc.updatedAt = new Date().toISOString();
    }
  });
  p.updatedAt = new Date().toISOString();
  await saveDB(db); res.json({ ok:true, data:p });
});
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
  const { testCaseId, projectId, clientId, title, description='', severity='medium', assignedTo='' } = req.body;
  if (!title) return res.status(400).json({ ok:false, error:'title required' });
  const cnt=u.issues.filter(i=>i.projectId===projectId).length+1;
  const issue={ id:uatId(), testCaseId, projectId, clientId, ref:`ISS-${String(cnt).padStart(3,'0')}`, title, description, severity, status:'open', assignedTo, resolution:'', createdAt:new Date().toISOString(), updatedAt:new Date().toISOString() };
  u.issues.push(issue);
  if (testCaseId) { const tc=u.testcases.find(x=>x.id===testCaseId); if(tc){tc.bluecopaStatus='blocked';tc.updatedAt=new Date().toISOString();} }
  uatLog('issue_opened',`Issue "${title}" raised`,{projectId,clientId});
  await saveDB(db); res.json({ ok:true, data:issue });
});
app.put('/api/uat/issues/:id', async (req, res) => {
  await _dbReady; const u=uatDB(); const issue=u.issues.find(x=>x.id===req.params.id);
  if (!issue) return res.status(404).json({ ok:false, error:'not found' });
  Object.assign(issue, req.body, { id:issue.id, updatedAt:new Date().toISOString() });
  await saveDB(db); res.json({ ok:true, data:issue });
});

// ── Dashboard ─────────────────────────────────────────────────────────────────
app.get('/api/uat/dashboard', async (req, res) => {
  await _dbReady; const u=uatDB();
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
    const goLiveScore=tc.length?Math.min(100,Math.round(((bPassed*0.6)+(cPassed*0.4))/tc.length*100)):0;
    return { ...p, clientName:client?.name||'', total:tc.length, bPassed, cPassed, failed:tc.filter(t=>t.bluecopaStatus==='fail'||t.clientStatus==='fail').length, blocked, goLiveScore, byCategory, openIssues:u.issues.filter(i=>i.projectId===p.id&&['open','in_progress'].includes(i.status)).length };
  }
  const allTCs=u.testcases;
  const stats={ totalClients:u.clients.length, activeProjects:u.projects.filter(p=>p.status==='active').length, totalTests:allTCs.length, bPassRate:allTCs.length?Math.round(allTCs.filter(t=>t.bluecopaStatus==='pass').length/allTCs.length*100):0, cPassRate:allTCs.length?Math.round(allTCs.filter(t=>t.clientStatus==='pass').length/allTCs.length*100):0, openIssues:u.issues.filter(i=>['open','in_progress'].includes(i.status)).length, criticalFails:allTCs.filter(t=>t.priority==='critical'&&(t.bluecopaStatus==='fail'||t.clientStatus==='fail')).length, projects:u.projects.map(projectStats), activity:u.activity.slice(0,30) };
  res.json({ ok:true, data:stats });
});

// ── Templates ─────────────────────────────────────────────────────────────────
app.get('/api/uat/templates', async (req, res) => { await _dbReady; res.json({ ok:true, data:uatDB().templates }); });
app.post('/api/uat/templates', async (req, res) => {
  await _dbReady; const u=uatDB(); const { name, sourceProjectId } = req.body;
  const p=u.projects.find(x=>x.id===sourceProjectId); const c=p?u.clients.find(x=>x.id===p.clientId):null;
  const tcs=u.testcases.filter(t=>t.projectId===sourceProjectId).map(t=>({ category:t.category,subCategory:t.subCategory,testDescription:t.testDescription,expectedResult:t.expectedResult,priority:t.priority,owner:t.owner,tags:t.tags||[] }));
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
  let tcs=u.testcases.filter(t=>t.bluecopaStatus==='pass'||t.clientStatus==='pass');
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
app.get('/api/uat/portal/:token', async (req, res) => {
  await _dbReady; const u=uatDB(); const c=u.clients.find(x=>x.portalToken===req.params.token);
  if (!c) return res.status(404).json({ ok:false, error:'invalid link' });
  const projects=u.projects.filter(p=>p.clientId===c.id).map(p=>{
    const tc=u.testcases.filter(t=>t.projectId===p.id).sort((a,b)=>a.seq-b.seq);
    const total=tc.length, cPass=tc.filter(t=>t.clientStatus==='pass').length;
    const categories=[...new Set(tc.map(t=>t.category))];
    return {...p,testcases:tc,total,cPassed:cPass,cPassRate:total?Math.round(cPass/total*100):0,categories};
  });
  res.json({ ok:true, data:{ client:{id:c.id,name:c.name,shortCode:c.shortCode}, projects } });
});
app.put('/api/uat/portal/:token/tc/:id', async (req, res) => {
  await _dbReady; const u=uatDB(); const c=u.clients.find(x=>x.portalToken===req.params.token);
  if (!c) return res.status(403).json({ ok:false, error:'invalid token' });
  const tc=u.testcases.find(x=>x.id===req.params.id&&x.clientId===c.id);
  if (!tc) return res.status(404).json({ ok:false, error:'not found' });
  const { clientStatus, clientComments, attachments } = req.body;
  if (clientStatus!==undefined){tc.clientStatus=clientStatus;uatLog('c_status',`Client: ${clientStatus} on TC-${tc.seq}`,{projectId:tc.projectId,clientId:c.id});}
  if (clientComments!==undefined) tc.clientComments=clientComments;
  if (attachments!==undefined)    tc.attachments=attachments;
  tc.updatedAt=new Date().toISOString();
  await saveDB(db); res.json({ ok:true, data:tc });
});

// ── Client Portal HTML ────────────────────────────────────────────────────────
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
.topbar{background:#fff;border-bottom:1px solid #e4e6ea;padding:0 24px;height:56px;display:flex;align-items:center;gap:16px;position:sticky;top:0;z-index:10}
.logo{font-size:16px;font-weight:800;color:#0d1117;letter-spacing:-.3px}.logo span{color:#c9a227}
.client-chip{background:#f4f5f7;border:1px solid #e4e6ea;border-radius:6px;padding:4px 10px;font-size:12px;color:#6b7280;font-weight:600}
.main{max-width:1200px;margin:0 auto;padding:24px 16px}
.page-title{font-size:22px;font-weight:800;margin-bottom:4px}.page-sub{color:#6b7280;font-size:13px;margin-bottom:24px}
.project-tabs{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:20px}
.proj-tab{padding:8px 16px;border:1px solid #e4e6ea;border-radius:8px;cursor:pointer;font-size:13px;font-weight:600;background:#fff;transition:all .15s}
.proj-tab.active{background:#0d1117;color:#fff;border-color:#0d1117}
.progress-card{background:#fff;border:1px solid #e4e6ea;border-radius:12px;padding:16px 20px;margin-bottom:20px;display:flex;gap:24px;flex-wrap:wrap;align-items:center}
.prog-stat{text-align:center}.prog-stat .val{font-size:24px;font-weight:800}.prog-stat .lbl{font-size:11px;color:#6b7280;font-weight:600;text-transform:uppercase;letter-spacing:.5px}
.prog-bar-wrap{flex:1;min-width:200px}.prog-bar-bg{background:#f1f2f5;border-radius:99px;height:8px;overflow:hidden}
.prog-bar-fill{height:100%;border-radius:99px;background:#22c55e;transition:width .4s}
.prog-label{display:flex;justify-content:space-between;font-size:12px;color:#6b7280;margin-bottom:4px}
.table-wrap{background:#fff;border:1px solid #e4e6ea;border-radius:12px;overflow:hidden}
table{width:100%;border-collapse:collapse}
th{background:#f8f9fa;font-size:11px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:.5px;padding:10px 14px;border-bottom:1px solid #e4e6ea;text-align:left;white-space:nowrap}
td{padding:12px 14px;border-bottom:1px solid #f1f2f5;vertical-align:top;font-size:13px}
tr:last-child td{border-bottom:none}tr:hover td{background:#fafafa}
.cat-badge{display:inline-block;padding:2px 8px;border-radius:6px;font-size:11px;font-weight:700;font-family:monospace;background:#f4f5f7;color:#374151}
.status-cell{position:relative}
.status-pill{display:inline-flex;align-items:center;gap:5px;padding:3px 10px;border-radius:99px;font-size:11px;font-weight:700;border:none;cursor:pointer;transition:all .15s;white-space:nowrap}
.status-pill:hover{filter:brightness(.93)}
.s-not_tested{background:#f1f2f5;color:#6b7280}.s-in_progress{background:#dbeafe;color:#1d4ed8}.s-pass{background:#dcfce7;color:#15803d}.s-fail{background:#fee2e2;color:#dc2626}.s-blocked{background:#fef3c7;color:#b45309}
.status-dd{position:absolute;top:calc(100% + 4px);left:0;z-index:50;background:#fff;border:1px solid #e4e6ea;border-radius:8px;box-shadow:0 8px 24px rgba(0,0,0,.12);padding:4px;min-width:140px;display:none}
.status-dd.open{display:block}
.status-dd button{display:flex;align-items:center;gap:8px;width:100%;padding:7px 12px;border:none;background:none;cursor:pointer;font-size:12px;font-weight:600;border-radius:6px;color:#0d1117;text-align:left}
.status-dd button:hover{background:#f4f5f7}
.comment-area{width:100%;border:1px solid #e4e6ea;border-radius:6px;padding:8px;font-size:12px;font-family:inherit;resize:vertical;min-height:60px;color:#0d1117}
.comment-area:focus{outline:2px solid rgba(201,162,39,.4);border-color:#c9a227}
.save-btn{margin-top:6px;padding:5px 12px;background:#0d1117;color:#fff;border:none;border-radius:6px;font-size:12px;font-weight:700;cursor:pointer}
.toast{position:fixed;bottom:24px;right:24px;background:#0d1117;color:#fff;padding:10px 18px;border-radius:8px;font-size:13px;font-weight:600;z-index:100;opacity:0;transform:translateY(8px);transition:all .25s;pointer-events:none}
.toast.show{opacity:1;transform:translateY(0)}
</style></head><body>
<div class="topbar"><div class="logo">Blue<span>copa</span></div><div class="client-chip">${c.name}</div><div style="margin-left:auto;font-size:12px;color:#6b7280">UAT Client Portal</div></div>
<div class="main" id="app">
  <div class="page-title">UAT Sign-off Portal</div>
  <div class="page-sub">Review test cases, update your status, and add comments.</div>
  <div id="projectTabs" class="project-tabs"></div>
  <div id="progressCard" class="progress-card"></div>
  <div class="table-wrap"><table id="tcTable"><thead><tr>
    <th>#</th><th>Category</th><th>Test Description</th><th>Expected Result</th>
    <th>Bluecopa Status</th><th>Bluecopa Comments</th><th>Your Status</th><th>Your Comments</th>
  </tr></thead><tbody id="tcBody"></tbody></table></div>
</div>
<div class="toast" id="toast"></div>
<script>
const TOKEN='${token}';let data=null,curProject=null;
const SL={'not_tested':'Not Tested','in_progress':'In Progress','pass':'Pass','fail':'Fail','blocked':'Blocked'};
const SC={'not_tested':'s-not_tested','in_progress':'s-in_progress','pass':'s-pass','fail':'s-fail','blocked':'s-blocked'};
function toast(m){const e=document.getElementById('toast');e.textContent=m;e.classList.add('show');setTimeout(()=>e.classList.remove('show'),2400)}
async function load(){const r=await fetch('/api/uat/portal/'+TOKEN);if(!r.ok)return;data=(await r.json()).data;renderTabs();if(data.projects.length)selectProject(data.projects[0].id);}
function renderTabs(){document.getElementById('projectTabs').innerHTML=data.projects.map(p=>\`<button class="proj-tab" onclick="selectProject('\${p.id}')" id="ptab_\${p.id}">\${p.name}</button>\`).join('');}
function selectProject(id){curProject=data.projects.find(p=>p.id===id);document.querySelectorAll('.proj-tab').forEach(b=>b.classList.toggle('active',b.id==='ptab_'+id));renderProgress();renderTable();}
function renderProgress(){const p=curProject,total=p.testcases.length,pass=p.testcases.filter(t=>t.clientStatus==='pass').length,pct=total?Math.round(pass/total*100):0;
document.getElementById('progressCard').innerHTML=\`<div class="prog-stat"><div class="val">\${total}</div><div class="lbl">Total</div></div><div class="prog-stat"><div class="val" style="color:#22c55e">\${pass}</div><div class="lbl">Passed</div></div><div class="prog-stat"><div class="val" style="color:#dc2626">\${p.testcases.filter(t=>t.clientStatus==='fail').length}</div><div class="lbl">Failed</div></div><div class="prog-stat"><div class="val" style="color:#b45309">\${p.testcases.filter(t=>t.clientStatus==='blocked').length}</div><div class="lbl">Blocked</div></div><div class="prog-bar-wrap"><div class="prog-label"><span>Your Pass Rate</span><span>\${pct}%</span></div><div class="prog-bar-bg"><div class="prog-bar-fill" style="width:\${pct}%"></div></div></div>\`;}
function renderTable(){const tcs=curProject.testcases;if(!tcs.length){document.getElementById('tcBody').innerHTML='<tr><td colspan="8" style="text-align:center;padding:40px;color:#6b7280">No test cases found.</td></tr>';return;}
document.getElementById('tcBody').innerHTML=tcs.map(tc=>\`<tr id="row_\${tc.id}"><td><span style="color:#6b7280;font-size:12px;font-weight:600">\${tc.seq}</span></td><td><span class="cat-badge">\${tc.category}</span><div style="font-size:11px;color:#6b7280;margin-top:3px">\${tc.subCategory||''}</div></td><td style="max-width:250px"><div style="font-weight:600;line-height:1.4">\${tc.testDescription}</div></td><td style="max-width:200px;color:#6b7280;font-size:12px;line-height:1.4">\${tc.expectedResult}</td><td><span class="status-pill \${SC[tc.bluecopaStatus]||'s-not_tested'}">\${SL[tc.bluecopaStatus]||'Not Tested'}</span></td><td style="color:#374151;font-size:12px;line-height:1.5;max-width:200px">\${tc.bluecopaComments||'<span style="color:#d1d5db">—</span>'}</td><td class="status-cell"><button class="status-pill \${SC[tc.clientStatus]||'s-not_tested'}" onclick="toggleDD('\${tc.id}',event)">\${SL[tc.clientStatus]||'Not Tested'} ▾</button><div class="status-dd" id="dd_\${tc.id}">\${Object.entries(SL).map(([k,v])=>\`<button onclick="setStatus('\${tc.id}','\${k}')">\${v}</button>\`).join('')}</div></td><td style="min-width:180px"><textarea class="comment-area" id="cmt_\${tc.id}" placeholder="Add your comments...">\${tc.clientComments||''}</textarea><button class="save-btn" onclick="saveComment('\${tc.id}')">Save</button></td></tr>\`).join('');}
function toggleDD(id,e){e.stopPropagation();document.querySelectorAll('.status-dd').forEach(d=>{if(d.id!=='dd_'+id)d.classList.remove('open');});document.getElementById('dd_'+id).classList.toggle('open');}
document.addEventListener('click',()=>document.querySelectorAll('.status-dd').forEach(d=>d.classList.remove('open')));
async function setStatus(tcId,status){document.getElementById('dd_'+tcId).classList.remove('open');const tc=curProject.testcases.find(t=>t.id===tcId);tc.clientStatus=status;const r=await fetch('/api/uat/portal/'+TOKEN+'/tc/'+tcId,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({clientStatus:status})});if(r.ok){renderProgress();const row=document.getElementById('row_'+tcId);if(row){const pill=row.querySelector('.status-cell .status-pill');pill.className='status-pill '+SC[status];pill.innerHTML=SL[status]+' ▾';}toast('Status updated');}else toast('Failed to save');}
async function saveComment(tcId){const text=document.getElementById('cmt_'+tcId).value;const tc=curProject.testcases.find(t=>t.id===tcId);tc.clientComments=text;const r=await fetch('/api/uat/portal/'+TOKEN+'/tc/'+tcId,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({clientComments:text})});if(r.ok)toast('Comment saved');else toast('Failed to save');}
load();
</script></body></html>`);
});

// ── Project-level Client Portal ──────────────────────────────────────────────
app.post('/api/uat/projects/:id/generate-portal', async (req, res) => {
  await _dbReady; const u = uatDB(); const p = u.projects.find(x => x.id === req.params.id);
  if (!p) return res.status(404).json({ ok: false, error: 'not found' });
  if (!p.portalToken) {
    p.portalToken = require('crypto').randomBytes(24).toString('hex');
    p.updatedAt = new Date().toISOString();
    await saveDB(db);
  }
  res.json({ ok: true, token: p.portalToken });
});

app.post('/api/uat/projects/:id/regenerate-portal', async (req, res) => {
  await _dbReady; const u = uatDB(); const p = u.projects.find(x => x.id === req.params.id);
  if (!p) return res.status(404).json({ ok: false, error: 'not found' });
  p.portalToken = require('crypto').randomBytes(24).toString('hex');
  p.updatedAt = new Date().toISOString();
  await saveDB(db);
  res.json({ ok: true, token: p.portalToken });
});

app.get('/api/portal/:token', async (req, res) => {
  await _dbReady; const u = uatDB();
  const p = u.projects.find(x => x.portalToken === req.params.token);
  if (!p) return res.status(404).json({ ok: false, error: 'invalid link' });
  const client = u.clients.find(x => x.id === p.clientId);
  const entity = req.query.entity || '';
  const testcases = u.testcases.filter(t => t.projectId === p.id).sort((a, b) => a.seq - b.seq);
  const entityList = p.entities || [];
  function aggStatus(arr) {
    if (arr.includes('fail')) return 'fail';
    if (arr.includes('blocked')) return 'blocked';
    if (arr.includes('in_progress')) return 'in_progress';
    if (arr.some(s => s === 'pass')) return 'pass';
    return 'not_tested';
  }
  const tcs = testcases.map(tc => {
    let clientStatus, clientComments, bluecopaStatus, bluecopaComments;
    if (entity && tc.entityStatuses) {
      const es = tc.entityStatuses[entity] || {};
      clientStatus = es.clientStatus || 'not_tested';
      clientComments = es.clientComments || '';
      bluecopaStatus = es.bluecopaStatus || tc.bluecopaStatus || 'not_tested';
      bluecopaComments = es.bluecopaComments || tc.bluecopaComments || '';
    } else if (!entity && entityList.length > 0) {
      const es = tc.entityStatuses || {};
      const bArr = entityList.map(e => (es[e]?.bluecopaStatus) || 'not_tested');
      const cArr = entityList.map(e => (es[e]?.clientStatus) || 'not_tested');
      bluecopaStatus = aggStatus(bArr);
      clientStatus = aggStatus(cArr);
      bluecopaComments = ''; clientComments = '';
    } else {
      clientStatus = tc.clientStatus || 'not_tested';
      clientComments = tc.clientComments || '';
      bluecopaStatus = tc.bluecopaStatus || 'not_tested';
      bluecopaComments = tc.bluecopaComments || '';
    }
    return { id: tc.id, seq: tc.seq,
      category: tc.category || tc.processArea || '',
      subCategory: tc.subCategory || tc.module || '',
      testDescription: tc.testDescription || tc.testScenario || '',
      expectedResult: tc.expectedResult || '',
      priority: tc.priority || 'medium', clientStatus, clientComments,
      bluecopaStatus, bluecopaComments,
      procedure: tc.procedure || null };
  });
  // Compute per-entity-TC pair aggregate for All tab (client perspective)
  let entityAggregate = null;
  if (!entity && entityList.length > 0) {
    let total = 0, pass = 0, fail = 0, blocked = 0, inProg = 0;
    testcases.forEach(tc => {
      const es = tc.entityStatuses || {};
      entityList.forEach(e => {
        total++;
        const st = (es[e]?.clientStatus) || 'not_tested';
        if (st === 'pass') pass++;
        else if (st === 'fail') fail++;
        else if (st === 'blocked') blocked++;
        else if (st === 'in_progress') inProg++;
      });
    });
    entityAggregate = { total, pass, fail, blocked, inProgress: inProg, pending: total - pass - fail - blocked - inProg };
  }
  res.json({ ok: true, data: {
    project: { id: p.id, name: p.name, description: p.description || '', phase: p.phase,
      goLiveDate: p.goLiveDate, clientLabel: p.clientLabel || 'Client' },
    client: client ? { id: client.id, name: client.name } : { id: '', name: 'Client' },
    entity: entity || null, entities: p.entities || [], testcases: tcs,
    entityAggregate,
    signoff: ((p.entitySignoffs || {})[entity || '']) || null,
    allEntitySignoffs: p.entitySignoffs || {},
    bluecopaSignoff: ((p.bluecopaEntitySignoffs || {})[entity || '']) || null,
  }});
});

app.put('/api/uat/projects/:id/entity-signoff', async (req, res) => {
  await _dbReady; const u = uatDB();
  const p = u.projects.find(x => x.id === req.params.id);
  if (!p) return res.status(404).json({ ok: false, error: 'not found' });
  const { name, role, date, entity } = req.body;
  if (!name || !name.trim()) return res.status(400).json({ ok: false, error: 'name required' });
  const signoff = { name: name.trim(), role: (role || '').trim(), date: date || new Date().toISOString().slice(0, 10), signedAt: new Date().toISOString() };
  if (!p.bluecopaEntitySignoffs) p.bluecopaEntitySignoffs = {};
  p.bluecopaEntitySignoffs[entity || ''] = signoff;
  p.updatedAt = new Date().toISOString();
  await saveDB(db); res.json({ ok: true, signoff });
});

app.put('/api/portal/:token/signoff', async (req, res) => {
  await _dbReady; const u = uatDB();
  const p = u.projects.find(x => x.portalToken === req.params.token);
  if (!p) return res.status(403).json({ ok: false, error: 'invalid token' });
  const { name, role, date, entity } = req.body;
  if (!name || !name.trim()) return res.status(400).json({ ok: false, error: 'name required' });
  const signoff = { name: name.trim(), role: (role || '').trim(), date: date || new Date().toISOString().slice(0, 10), signedAt: new Date().toISOString() };
  if (!p.entitySignoffs) p.entitySignoffs = {};
  p.entitySignoffs[entity || ''] = signoff;
  p.updatedAt = new Date().toISOString();
  await saveDB(db); res.json({ ok: true, signoff });
});

app.put('/api/portal/:token/tc/:id', async (req, res) => {
  await _dbReady; const u = uatDB();
  const p = u.projects.find(x => x.portalToken === req.params.token);
  if (!p) return res.status(403).json({ ok: false, error: 'invalid token' });
  const tc = u.testcases.find(x => x.id === req.params.id && x.projectId === p.id);
  if (!tc) return res.status(404).json({ ok: false, error: 'not found' });
  const { clientStatus, clientComments, entity } = req.body;
  const prevStatus = entity ? (tc.entityStatuses?.[entity]?.clientStatus || 'not_tested') : (tc.clientStatus || 'not_tested');
  if (entity) {
    if (!tc.entityStatuses) tc.entityStatuses = {};
    if (!tc.entityStatuses[entity]) tc.entityStatuses[entity] = {};
    if (clientStatus !== undefined) tc.entityStatuses[entity].clientStatus = clientStatus;
    if (clientComments !== undefined) tc.entityStatuses[entity].clientComments = clientComments;
  } else {
    if (clientStatus !== undefined) tc.clientStatus = clientStatus;
    if (clientComments !== undefined) tc.clientComments = clientComments;
  }
  // Auto-create UAT issue when client marks fail with a comment (first time only)
  const newStatus = clientStatus !== undefined ? clientStatus : prevStatus;
  const newComment = clientComments !== undefined ? clientComments : (entity ? (tc.entityStatuses?.[entity]?.clientComments || '') : (tc.clientComments || ''));
  if (newStatus === 'fail' && newComment && prevStatus !== 'fail') {
    if (!u.issues) u.issues = [];
    const alreadyExists = u.issues.find(i => i.testCaseId === tc.id && i.source === 'client_portal' && i.status === 'open');
    if (!alreadyExists) {
      const cnt = u.issues.filter(i => i.projectId === p.id).length + 1;
      const sevMap = { critical: 'Critical', high: 'High', medium: 'Medium', low: 'Low' };
      u.issues.push({ id: uatId(), testCaseId: tc.id, projectId: p.id, clientId: p.clientId,
        ref: `ISS-${String(cnt).padStart(3, '0')}`, source: 'client_portal',
        title: `TC-${tc.seq} Fail: ${(tc.testDescription || tc.testScenario || '').slice(0, 60)}`,
        description: newComment, severity: sevMap[tc.priority || 'medium'] || 'Medium',
        status: 'open', assignedTo: '', resolution: '',
        createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
    }
  }
  tc.updatedAt = new Date().toISOString();
  await saveDB(db);
  res.json({ ok: true });
});

app.get('/portal/:token', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'portal.html'));
});

// ── File upload ───────────────────────────────────────────────────────────────
app.post('/api/upload', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  res.json({ url: `/uploads/${req.file.filename}`, name: req.file.originalname, type: req.file.mimetype });
});

// ── WebSocket ─────────────────────────────────────────────────────────────────
if (wss) {
  wss.on('connection', (ws) => {
    console.log(`[WS] +client  total=${wss.clients.size}`);
    ws.on('close', () => console.log(`[WS] -client  total=${wss.clients.size}`));
  });
}

// ── Boot: init DB then start server ──────────────────────────────────────────
// Capture the promise so routes can await _dbReady on Vercel cold-starts
// (a request can arrive before initDB resolves on Vercel serverless)
_dbReady = initDB().then(async () => {
  try {
    const dirty = migrate();
    // Await saveDB so MongoDB is updated before _dbReady resolves.
    // This prevents repeated re-seeding on every cold start.
    if (dirty) await saveDB(db);
  } catch (e) {
    console.error('[migrate] error:', e.message);
  }

  // seed default articles only if DB is completely empty
  if ((db.articles || []).length === 0) {
    const now = Date.now(), day = 86400000;
    db.articles = [
      { id:1,  title:'How to Onboard a New Client onto Bluecopa',  category:'Support',     author:'Priya Nair',   initials:'PN', excerpt:'Step-by-step guide covering account creation, data migration, user access setup, and initial configuration for new enterprise clients.', content:'Step-by-step guide covering account creation, data migration, user access setup, and initial configuration for new enterprise clients.\n\n1. Create the client account in the admin panel.\n2. Migrate existing data using the import wizard.\n3. Configure user roles and permissions.\n4. Run the initial setup checklist with the client.', tags:['onboarding','setup'],   created_at:new Date(now - 0*day).toISOString(), views:0 },
      { id:2,  title:'Month-End Reconciliation Checklist',          category:'Finance',     author:'Rahul Mehta',  initials:'RM', excerpt:'A comprehensive checklist for the finance team to ensure all ledgers are balanced and accounts are reconciled before month-end close.', content:'A comprehensive checklist for the finance team.', tags:['finance','checklist'], created_at:new Date(now - 1*day).toISOString(), views:0 },
    ];
    db.nextId = 3;
    saveDB(db);
    console.log('◆ Seeded default articles');
  }

  if (!IS_VERCEL) {
    const PORT = process.env.PORT || 3000;
    server.listen(PORT, () => {
      console.log(`\n  KnowledgeHub → http://localhost:${PORT}`);
      console.log(`  Admin emails: ${(db.settings?.adminEmails || ['azhar.m@bluecopa.com']).join(', ')}\n`);
    });
  }
}).catch(e => {
  console.error('[boot] DB init error:', e.message);
  // Do not exit — serve with whatever partial state db has
});

// ── Skill Matrix ──────────────────────────────────────────────────────────────
function ensureSM() {
  if (!db.skillMatrix) db.skillMatrix = { employees:[], processAreas:[], currentScores:{}, snapshots:[], nextSnapshotId:1 };
  if (!db.processGame) db.processGame = { currentGame: null, attempts: [], gameHistory: [] };
}

app.get('/api/skillmatrix', (req, res) => {
  ensureSM();
  res.json(db.skillMatrix);
});

app.put('/api/skillmatrix/config', (req, res) => {
  if (!isAdmin(req)) return res.status(401).json({ error: 'Admin required' });
  ensureSM();
  const { employees, processAreas } = req.body;
  if (Array.isArray(employees))    db.skillMatrix.employees    = employees;
  if (Array.isArray(processAreas)) db.skillMatrix.processAreas = processAreas;
  saveDB();
  res.json(db.skillMatrix);
});

app.put('/api/skillmatrix/scores', (req, res) => {
  ensureSM();
  const { scores } = req.body;
  if (scores && typeof scores === 'object') db.skillMatrix.currentScores = scores;
  saveDB();
  res.json({ ok: true });
});

app.post('/api/skillmatrix/snapshots', (req, res) => {
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
  saveDB();
  res.json(snap);
});

app.delete('/api/skillmatrix/snapshots/:id', (req, res) => {
  if (!isAdmin(req)) return res.status(401).json({ error: 'Admin required' });
  ensureSM();
  const id = parseInt(req.params.id);
  db.skillMatrix.snapshots = db.skillMatrix.snapshots.filter(s => s.id !== id);
  saveDB();
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
  const groqKey      = process.env.GROQ_API_KEY;
  const useAnthropic = anthropicKey && anthropicKey !== 'your-anthropic-api-key-here';
  const useGroq      = groqKey      && groqKey      !== 'your-groq-api-key-here';
  if (!useAnthropic && !useGroq) {
    return res.status(503).json({ error: 'AI not configured. Add ANTHROPIC_API_KEY or GROQ_API_KEY to env vars.' });
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
      rules:`Generate 12 multiple-choice KNOWLEDGE questions. Each must have exactly 4 options (A-D). Test understanding of processes, tools, and workflows. One option is clearly correct; the other 3 are plausible but wrong. Mix 3 easy, 6 medium, 3 hard.` },
    { id:'true_false',     name:'True or False',      icon:'⚖️', color:'trivia',
      desc:'Decide if each statement is true or false',
      rules:`Generate 12 TRUE/FALSE questions. Each question MUST be a statement (not a question). Options MUST be exactly ["True","False"] — only 2 options. Set correct to 0 if statement is True, 1 if False. Mix ~6 true and ~6 false. Include one surprising fact.` },
    { id:'riddle_round',   name:'Riddle Round',       icon:'🔮', color:'scenario',
      desc:'Solve creative riddles about delivery and data concepts',
      rules:`Generate 12 RIDDLES where each answer is a process, tool, concept, or workflow term from the knowledge base. Write each riddle metaphorically (e.g. "I flow between systems carrying data, I transform and cleanse but never rest — what am I?"). Provide 4 answer options, one correct. Make riddles clever but solvable with domain knowledge.` },
    { id:'fill_blank',     name:'Fill in the Blank',  icon:'✏️', color:'quiz',
      desc:'Complete the missing word or phrase in each statement',
      rules:`Generate 12 FILL-IN-THE-BLANK questions. Each is a sentence with exactly ONE blank marked as _____. Provide 4 options to fill the blank — only one is correct. The correct answer must be a key term, acronym, or concept from the knowledge base. Make the blanks meaningful, not trivial.` },
    { id:'spot_mistake',   name:'Spot the Mistake',   icon:'🔍', color:'trivia',
      desc:'Find the deliberate error hidden in each description',
      rules:`Generate 12 SPOT-THE-MISTAKE questions. Each describes a process or concept with ONE deliberate factual mistake. Format: "A colleague described [topic] as: [description with embedded mistake]. What is incorrect?" Provide 4 options — only one correctly identifies the mistake. Other 3 options point to things that were actually correct or are irrelevant.` },
    { id:'scenario',       name:'Scenario Challenge', icon:'🎯', color:'scenario',
      desc:'Make the right call in real-world delivery situations',
      rules:`Generate 12 SCENARIO-BASED questions presenting realistic delivery team situations. Each presents a work situation with a problem or decision. Provide 4 possible actions — only one is clearly the best approach. Wrong options should be common mistakes or partial solutions, not obviously wrong.` },
    { id:'what_next',      name:'What Comes Next?',   icon:'⏭️', color:'quiz',
      desc:'Identify the next correct step in a delivery workflow',
      rules:`Generate 12 SEQUENCING questions. Each describes a process up to a certain step then asks "What should happen next?" Provide 4 options for the next step — one is correct. Draw from different process areas (ingestion, reconciliation, reporting, exports, etc.). Vary difficulty.` },
    { id:'term_buster',    name:'Term Buster',        icon:'📖', color:'trivia',
      desc:'Match terms, acronyms, and definitions from the knowledge base',
      rules:`Generate 12 TERMINOLOGY questions about specific terms, acronyms, tools, or concepts from the knowledge base. Format questions as "What is [TERM]?", "What does [ACRONYM] stand for?", or "Which best describes [CONCEPT]?". Provide 4 options — one correct definition, 3 plausible but wrong. Include at least 3 acronym questions.` },
    { id:'rapid_fire',     name:'Rapid Fire ⚡',       icon:'⚡', color:'scenario',
      desc:'12 quick-fire questions — speed and accuracy both count!',
      rules:`Generate 12 SHORT multiple-choice questions. Each question MUST be one concise sentence (max 20 words). Each has exactly 4 options, one correct. Focus on quick-recall facts: key terms, numbers, acronyms, and "who does what" knowledge. Mix difficulty: 4 easy, 5 medium, 3 hard. No long scenarios.` },
    { id:'emoji_quiz',     name:'Emoji Decode 🎯',    icon:'🎯', color:'scenario',
      desc:'Decode process workflows and concepts from emoji sequences!',
      rules:`Generate 12 EMOJI-CLUE questions. Each question shows 3–6 emojis representing a process, workflow, tool, or concept from the knowledge base. Format: "🔢 → 📥 → 🔍 → ✅ — What process does this represent?" Provide 4 answer options (one correct). Be creative but make the emoji logic deducible by someone who knows the domain.` },
    { id:'who_am_i',       name:'Who Am I? 🕵️',       icon:'🕵️', color:'trivia',
      desc:'Guess the role, tool, or process from cryptic one-liners!',
      rules:`Generate 12 "WHO/WHAT AM I?" questions. Each gives 3 progressive clues getting more specific (Clue 1 = vague, Clue 3 = obvious). Format: "Clue 1: I touch every dataset before it goes live. Clue 2: I check counts, types, and thresholds. Clue 3: Teams configure me with rules and tolerances. Who/what am I?" Provide 4 options. Make it feel like a puzzle to unravel.` },
    { id:'mixed_bag',      name:'Mixed Bag',          icon:'🎲', color:'quiz',
      desc:'A surprise mix of all question types — stay on your toes!',
      rules:`Generate 12 questions using a MIX of formats: 3 standard multiple-choice (4 options), 3 TRUE/FALSE (options MUST be exactly ["True","False"] — no other values), 3 fill-in-the-blank (sentence with _____ and 4 options), 3 riddles (metaphorical description, 4 options). For true/false, ALWAYS use exactly ["True","False"] as the options array.` },
    { id:'puzzle',         name:'Puzzle',             icon:'🧩', color:'quiz',
      desc:'Piece together clues to identify the correct process or concept',
      rules:`Generate 12 PUZZLE questions. Each presents exactly 3 numbered facts about a delivery process, tool, concept, or workflow term from the knowledge base. Format: "Given these facts: [1] ... [2] ... [3] ... — what is being described?" Provide 4 answer options (one correct, three plausible alternatives). The 3 facts should approach the concept from different angles: function, outcome, and usage context. Mix difficulty: easier puzzles use direct facts, harder ones use abstract or indirect descriptions.` },
  ];
  const fmt = (formatId && formatId !== 'random')
    ? (PP_FORMATS.find(f => f.id === formatId) || PP_FORMATS[Math.floor(Math.random() * PP_FORMATS.length)])
    : PP_FORMATS[Math.floor(Math.random() * PP_FORMATS.length)];
  // Format-specific prompt variables
  const questionCount = 12;
  const optionsExample = fmt.id === 'true_false'
    ? '["True","False"]'
    : '["Option A","Option B","Option C","Option D"]';
  const questionExample =
    fmt.id === 'fill_blank'  ? '"Teams use _____ to verify that ingested data matches the source system counts."' :
    fmt.id === 'emoji_quiz'  ? '"📥 → 🔍 → ✅ → 📊 — What process does this emoji sequence represent?"' :
    fmt.id === 'who_am_i'   ? '"Clue 1: I am invisible until something breaks. Clue 2: I watch every data load silently. Clue 3: Teams set my thresholds to catch row-count mismatches. Who/What am I?"' :
    fmt.id === 'riddle_round'? '"I travel between systems carrying data, transforming as I go, never seen but always felt. What am I?"' :
    fmt.id === 'puzzle'      ? '"Given these facts: [1] It matches amounts across two different ledgers. [2] It is performed at month-end to verify completeness. [3] Discrepancies found are escalated to the finance team. — What process is being described?"' :
    '"Full question text here — written exactly as players will read it."';

  // Build format-enforcement block
  const formatEnforcement = [
    fmt.id === 'fill_blank'   ? '⚠️ FILL_BLANK RULE: Every single question string MUST contain exactly one _____ (five underscores) blank. Do NOT write normal questions — every question is an incomplete sentence with a gap.' : '',
    fmt.id === 'emoji_quiz'   ? '⚠️ EMOJI_QUIZ RULE: Every single question string MUST begin with 3–6 emojis separated by → (e.g. "📥 → 🔍 → ✅ — What process does this represent?"). Do NOT write text-only questions.' : '',
    fmt.id === 'who_am_i'    ? '⚠️ WHO_AM_I RULE: Every single question string MUST follow this exact pattern: "Clue 1: [vague clue]. Clue 2: [more specific]. Clue 3: [most specific]. Who/What am I?" — no exceptions.' : '',
    fmt.id === 'riddle_round' ? '⚠️ RIDDLE RULE: Every single question string MUST be written in first person as a metaphorical riddle starting with "I" (e.g. "I travel between systems..."). Do NOT write normal questions.' : '',
    fmt.id === 'true_false'   ? '⚠️ TRUE_FALSE RULE: Every options array MUST be exactly ["True","False"] (2 items only). Never use 4 options. Every question must be a statement, not a question.' : '',
    fmt.id === 'rapid_fire'   ? '⚠️ RAPID_FIRE RULE: Every question string MUST be 15 words or fewer. Short, punchy, recall-based. Generate exactly 12 questions.' : '',
    fmt.id === 'puzzle'       ? '⚠️ PUZZLE RULE: Every question string MUST present exactly 3 facts numbered [1], [2], [3], formatted as "Given these facts: [1] ... [2] ... [3] ... — what is being described?" No other question format is acceptable.' : '',
    fmt.id === 'spot_mistake' ? '⚠️ SPOT_MISTAKE RULE: Every question string MUST describe a process with one embedded factual error, formatted as a colleague\'s statement.' : '',
    fmt.id === 'scenario'     ? '⚠️ SCENARIO RULE: Every question string MUST describe a realistic work situation with a dilemma or decision point.' : '',
    fmt.id === 'what_next'    ? '⚠️ WHAT_NEXT RULE: Every question string MUST describe a process up to a step, then ask "What should happen next?"' : '',
  ].filter(Boolean).join('\n');

  const prompt = `You are generating a "${fmt.name}" format quiz for a delivery team's weekly "Process Puzzle" challenge.

THIS IS A "${fmt.id.toUpperCase()}" FORMAT GAME — NOT A STANDARD MULTIPLE CHOICE QUIZ.

KNOWLEDGE BASE (base all questions on this content):
${articles}${mlCourseSummary}

PROCESS AREAS: ${processAreas}

═══ FORMAT RULES (MANDATORY) ═══
${fmt.rules}

${formatEnforcement}

EXAMPLE QUESTION for this format:
  "question": ${questionExample},
  "options": ${optionsExample}

VALIDATION: Before returning, mentally check every question matches the ${fmt.name} format. If any question looks like generic MCQ when it should be ${fmt.id}, rewrite it.

Return ONLY valid JSON, no markdown, no code fences:
{
  "type": "${fmt.id}",
  "title": "Week ${week}: ${fmt.name.replace(/ [⚡🎯🕵️]/gu,'').trim()}",
  "instructions": "One sentence telling players exactly how to answer ${fmt.name} questions.",
  "questions": [
    {
      "id": 1,
      "question": ${questionExample},
      "options": ${optionsExample},
      "correct": 0,
      "explanation": "Explain why this answer is correct using domain knowledge.",
      "difficulty": "easy"
    }
  ]
}

Generate exactly ${questionCount} questions. Every question MUST be in ${fmt.name} format. Return ONLY the JSON object.`;

  try {
    let raw = '';
    if (useAnthropic) {
      const Anthropic = require('@anthropic-ai/sdk');
      const client = new Anthropic.default({ apiKey: anthropicKey });
      const message = await client.messages.create({
        model: 'claude-opus-4-7',
        max_tokens: 4096,
        system: `You are a quiz generator that STRICTLY follows format instructions. You NEVER output standard multiple-choice questions unless the format is "knowledge_quiz". You always match the exact format specified (fill_blank, emoji_quiz, who_am_i, riddle_round, true_false, rapid_fire, etc.). Return ONLY valid JSON.`,
        messages: [{ role: 'user', content: prompt }]
      });
      raw = message.content[0].text.trim();
    } else {
      const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${groqKey}` },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [
            { role: 'system', content: `You are a quiz generator that STRICTLY follows format instructions. You NEVER output standard multiple-choice questions unless the format is "knowledge_quiz". You always match the exact format specified. Return ONLY valid JSON.` },
            { role: 'user', content: prompt }
          ],
          max_tokens: 4096,
          temperature: 0.65,
          stream: false
        }),
      });
      if (!groqRes.ok) throw new Error(`Groq API error ${groqRes.status}: ${await groqRes.text()}`);
      const groqData = await groqRes.json();
      raw = (groqData.choices[0].message.content || '').trim();
    }
    const js = raw.indexOf('{'), je = raw.lastIndexOf('}') + 1;
    if (js === -1 || je === 0) throw new Error('AI did not return valid JSON');
    const parsed = JSON.parse(raw.slice(js, je));

    // ── Server-side format enforcement ────────────────────────────────────────
    // Guarantee format compliance regardless of AI output
    const rawQuestions = (parsed.questions || []);
    const enforcedQuestions = rawQuestions.map((q, i) => {
      let question = (q.question || '').trim();
      let options   = Array.isArray(q.options) ? q.options : [];
      let correct   = typeof q.correct === 'number' ? q.correct : 0;

      switch (fmt.id) {
        case 'true_false':
          // Always force exactly ["True","False"] regardless of AI output
          options = ['True', 'False'];
          // Re-map correct: if AI said 0 or 1, keep it; anything else → 0
          correct = (correct === 0 || correct === 1) ? correct : 0;
          break;

        case 'fill_blank':
          // Ensure question has a _____ blank; inject one if missing
          if (!question.includes('_____')) {
            const correctOpt = (options[correct] || '').trim();
            if (correctOpt && question.toLowerCase().includes(correctOpt.toLowerCase())) {
              // Replace the correct answer text with _____
              const re = new RegExp(correctOpt.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
              question = question.replace(re, '_____');
            } else {
              // Append a fill-blank phrase
              question = question.replace(/\?$/, '') + ' — teams call this _____.';
            }
          }
          break;

        case 'who_am_i':
          // Ensure "Clue 1:" format
          if (!/clue\s*1/i.test(question)) {
            // Wrap the question as a 3-clue format
            const parts = question.split(/[.!?]+/).filter(s => s.trim()).slice(0, 3);
            if (parts.length >= 2) {
              question = `Clue 1: ${parts[0].trim()}. Clue 2: ${parts[1].trim()}. ${parts[2] ? 'Clue 3: ' + parts[2].trim() + '. ' : ''}Who/What am I?`;
            } else {
              question = `Clue 1: ${question} Clue 2: I am a key concept in delivery processes. Clue 3: Delivery teams use me daily. Who/What am I?`;
            }
          }
          break;

        case 'emoji_quiz':
          // Ensure question starts with emoji sequence
          if (!/^\p{Emoji}/u.test(question)) {
            const domainEmojis = ['📥', '🔍', '✅', '📊', '🔄', '📤', '⚙️', '🗂️', '📋', '🔗'];
            const seq = domainEmojis.slice(0, 3).join(' → ');
            question = `${seq} → ❓ — ${question}`;
          }
          break;

        case 'rapid_fire':
          // Trim overly long questions
          if (question.split(/\s+/).length > 20) {
            question = question.split(/\s+/).slice(0, 18).join(' ') + '…?';
          }
          break;
      }

      return { ...q, id: i + 1, question, options, correct };
    });

    console.log(`[PP] Format: ${fmt.id} | Questions: ${enforcedQuestions.length} | Q1 preview: ${(enforcedQuestions[0]?.question||'').slice(0,80)}`);

    const newGame = {
      id: gameId, week, year,
      type: fmt.id,  // always use requested fmt.id, not AI's returned type
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
    saveDB(db);
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
  saveDB(db);
  res.json({ success: true, attempt, questionResults, gameTitle: game.title });
});

app.get('/api/puzzle/leaderboard', (req, res) => {
  if (!db.processGame || !db.processGame.currentGame) return res.json({ leaderboard: [], game: null });
  const game = db.processGame.currentGame;
  const lb = db.processGame.attempts
    .filter(a => a.gameId === game.id && a.isFirstAttempt)
    .sort((a, b) => b.accuracy - a.accuracy || a.timeTaken - b.timeTaken)
    .slice(0, 20)
    .map((a, i) => ({ rank: i + 1, playerName: a.playerName, playerInitials: a.playerInitials, score: a.score, total: a.total, accuracy: a.accuracy, timeTaken: a.timeTaken }));
  res.json({ leaderboard: lb, game: { id: game.id, title: game.title, week: game.week, type: game.type } });
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

// ── Employee Engagement Hub ───────────────────────────────────────────────────
app.get('/api/engagement', (req, res) => {
  res.json(db.engagement || {});
});

app.put('/api/engagement/spotlight', (req, res) => {
  if (!isAdmin(req)) return res.status(403).json({ error: 'Forbidden' });
  const { type, data } = req.body; // type: 'month'|'quarter'|'year'
  if (!['month','quarter','year'].includes(type)) return res.status(400).json({ error: 'Invalid type' });
  if (!db.engagement) db.engagement = { spotlight:{month:null,quarter:null,year:null}, achievements:[], moments:{photos:[],birthdays:[],anniversaries:[]}, ideas:[], nextIdeaId:1 };
  db.engagement.spotlight[type] = data;
  saveDB(db);
  res.json({ ok: true });
});

app.put('/api/engagement/achievements', (req, res) => {
  if (!isAdmin(req)) return res.status(403).json({ error: 'Forbidden' });
  const { achievements } = req.body;
  if (!db.engagement) db.engagement = { spotlight:{month:null,quarter:null,year:null}, achievements:[], moments:{photos:[],birthdays:[],anniversaries:[]}, ideas:[], nextIdeaId:1 };
  db.engagement.achievements = achievements;
  saveDB(db);
  res.json({ ok: true });
});

app.put('/api/engagement/moments', (req, res) => {
  if (!isAdmin(req)) return res.status(403).json({ error: 'Forbidden' });
  const { moments } = req.body;
  if (!db.engagement) db.engagement = { spotlight:{month:null,quarter:null,year:null}, achievements:[], moments:{photos:[],birthdays:[],anniversaries:[]}, ideas:[], nextIdeaId:1 };
  db.engagement.moments = moments;
  saveDB(db);
  res.json({ ok: true });
});

app.get('/api/ideas', (req, res) => {
  res.json((db.engagement && db.engagement.ideas) || []);
});

app.post('/api/ideas', (req, res) => {
  const { title, category, description, author } = req.body;
  if (!title || !category || !description) return res.status(400).json({ error: 'Missing fields' });
  if (!db.engagement) db.engagement = { spotlight:{month:null,quarter:null,year:null}, achievements:[], moments:{photos:[],birthdays:[],anniversaries:[]}, ideas:[], nextIdeaId:1 };
  const idea = { id: db.engagement.nextIdeaId++, title, category, description, author: author || 'Anonymous', date: new Date().toISOString(), votes: 0, voters: [], status: 'new' };
  db.engagement.ideas.unshift(idea);
  saveDB(db);
  res.json(idea);
});

app.post('/api/ideas/:id/vote', (req, res) => {
  const { voterEmail } = req.body;
  const idea = db.engagement && db.engagement.ideas.find(i => i.id === parseInt(req.params.id));
  if (!idea) return res.status(404).json({ error: 'Not found' });
  if (idea.voters.includes(voterEmail)) {
    idea.voters = idea.voters.filter(v => v !== voterEmail);
    idea.votes = Math.max(0, idea.votes - 1);
  } else {
    idea.voters.push(voterEmail);
    idea.votes++;
  }
  saveDB(db);
  res.json({ votes: idea.votes, voted: idea.voters.includes(voterEmail) });
});

app.put('/api/ideas/:id/status', (req, res) => {
  if (!isAdmin(req)) return res.status(403).json({ error: 'Forbidden' });
  const { status } = req.body;
  const idea = db.engagement && db.engagement.ideas.find(i => i.id === parseInt(req.params.id));
  if (!idea) return res.status(404).json({ error: 'Not found' });
  idea.status = status;
  saveDB(db);
  res.json({ ok: true });
});

app.delete('/api/ideas/:id', (req, res) => {
  if (!isAdmin(req)) return res.status(403).json({ error: 'Forbidden' });
  if (!db.engagement) return res.status(404).json({ error: 'Not found' });
  db.engagement.ideas = db.engagement.ideas.filter(i => i.id !== parseInt(req.params.id));
  saveDB(db);
  res.json({ ok: true });
});

// ── Rocketlane proxy (mirrors api/index.js logic for local dev) ──────────────
let rlCache = null, rlCacheAt = 0;
const RL_CACHE_TTL = 5 * 60 * 1000;

let rlAllTasksCache = null, rlAllTasksCacheAt = 0;
const RL_TASKS_CACHE_TTL = 5 * 60 * 1000;

async function rlFetchAllTasks(apiKey) {
  const now = Date.now();
  if (rlAllTasksCache && (now - rlAllTasksCacheAt) < RL_TASKS_CACHE_TTL) return rlAllTasksCache;
  const tasks = [];
  let pageToken = null, hasMore = true;
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
  const map = {};
  let pageToken = null, hasMore = true;
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
  if (!apiKey) return res.status(503).json({ error: 'not_configured', message: 'ROCKETLANE_API_KEY not set in .env' });
  const now = Date.now();
  if (rlCache && !req.query.refresh && (now - rlCacheAt) < RL_CACHE_TTL)
    return res.json({ ...rlCache, cached: true, cacheAge: Math.round((now - rlCacheAt) / 1000) });
  try {
    const [projResp, completionMap] = await Promise.all([
      fetch('https://api.rocketlane.com/api/1.0/projects', { headers: { 'api-key': apiKey, 'Accept': 'application/json' } }),
      rlFetchCompletionMap(apiKey)
    ]);
    const data = await projResp.json();
    if (!projResp.ok) return res.status(projResp.status).json({ error: 'api_error', message: data?.message });
    const projects = data.data || data.projects || (Array.isArray(data) ? data : []);
    projects.forEach(p => {
      const comp = completionMap[p.projectId];
      if (comp && comp.total > 0) {
        // Weighted formula: completed=100%, in-progress=50%, todo=0%
        p.completionPct = Math.round((comp.completed + comp.inprogress * 0.5) / comp.total * 100);
        p.completionTasks = comp;
      } else {
        p.completionPct = (p.status?.label || '').toLowerCase().includes('complet') ? 100 : 0;
        p.completionTasks = { total: 0, completed: 0, inprogress: 0, todo: 0 };
      }
    });
    rlCache = data; rlCacheAt = now;
    res.json({ ...data, cached: false, fetchedAt: now });
  } catch (e) { res.status(500).json({ error: 'fetch_failed', message: e.message }); }
});

// ── Rocketlane My Work ────────────────────────────────────────────────────────
app.get('/api/rocketlane/my-work', async (req, res) => {
  const apiKey = process.env.ROCKETLANE_API_KEY;
  if (!apiKey) return res.status(503).json({ error: 'not_configured' });

  const email = (req.query.email || '').trim().toLowerCase();
  if (!email) return res.status(400).json({ error: 'email query param required' });

  try {
    const [projResp, allTasks] = await Promise.all([
      fetch('https://api.rocketlane.com/api/1.0/projects?pageSize=100', {
        headers: { 'api-key': apiKey, 'Accept': 'application/json' }
      }),
      rlFetchAllTasks(apiKey)
    ]);

    const projData = await projResp.json();
    const allProjects = projData.data || [];

    const myProjects = allProjects.filter(p =>
      (p.teamMembers?.members || []).some(m => (m.emailId || '').toLowerCase() === email)
    );

    const myProjectIds = new Set(myProjects.map(p => p.projectId));
    const now = new Date();

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
        overdue: !!(t.dueDate && t.status?.label !== 'Completed' && new Date(t.dueDate) < now)
      }))
      .sort((a, b) => {
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return new Date(a.dueDate) - new Date(b.dueDate);
      });

    const projects = myProjects.map(p => {
      const ptasks = allTasks.filter(t => t.project?.projectId === p.projectId);
      const done = ptasks.filter(t => t.status?.label === 'Completed').length;
      const inprog = ptasks.filter(t => t.status?.label === 'In progress').length;
      return {
        projectId: p.projectId,
        projectName: p.projectName,
        startDate: p.startDate || null,
        dueDate: p.dueDate || null,
        status: { value: p.status?.value, label: p.status?.label || 'Unknown' },
        customer: p.customer?.companyName || null,
        completionPct: ptasks.length ? Math.round((done + inprog * 0.5) / ptasks.length * 100) : 0
      };
    });

    res.json({ projects, tasks: myTasks });
  } catch (e) {
    res.status(500).json({ error: 'fetch_failed', message: e.message });
  }
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
  try { await saveDB(db); } catch(_){}
  res.json({ ok: true });
});

app.get('/api/proxy/logs', (req, res) => {
  if (!isAdmin(req)) return res.status(401).json({ error: 'Admin required' });
  ensureProxyLogs();
  res.json([...db.proxyLogs].reverse().slice(0, 200));
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

// Get assignments — user gets their own, admin gets all
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

// Create / upsert single assignment
app.post('/api/learning/assignments', (req, res) => {
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
    saveDB(db);
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
  saveDB(db);
  res.json(a);
});

// Update assignment (type / due date)
app.put('/api/learning/assignments/:id', (req, res) => {
  if (!isAdmin(req)) return res.status(401).json({ error: 'Admin required' });
  ensureLearning();
  const id = parseInt(req.params.id);
  const a  = db.learning.assignments.find(x => x.id === id);
  if (!a) return res.status(404).json({ error: 'Not found' });
  const { type, dueDate } = req.body;
  if (type)              a.type    = type;
  if (dueDate !== undefined) a.dueDate = dueDate;
  saveDB(db);
  res.json(a);
});

// Remove assignment
app.delete('/api/learning/assignments/:id', (req, res) => {
  if (!isAdmin(req)) return res.status(401).json({ error: 'Admin required' });
  ensureLearning();
  const id = parseInt(req.params.id);
  db.learning.assignments = db.learning.assignments.filter(a => a.id !== id);
  saveDB(db);
  res.json({ ok: true });
});

// Bulk assign — a learning path to one or many users
app.post('/api/learning/bulk-assign', (req, res) => {
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
  saveDB(db);
  res.json({ ok: true, created });
});

// Admin: full team view with employee roster
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

// GET /api/tasks?assignee=email  OR  ?assignedBy=email  OR both absent (admin, all)
app.get('/api/tasks', (req, res) => {
  ensureTasks();
  const { assignee, assignedBy } = req.query;
  const now = new Date();
  let list = db.tasks;
  if (assignee)    list = list.filter(t => (t.assigneeEmail  || '').toLowerCase() === assignee.toLowerCase());
  if (assignedBy)  list = list.filter(t => (t.assignedByEmail|| '').toLowerCase() === assignedBy.toLowerCase());
  // Annotate overdue flag at read-time; don't persist it
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
  const allowed = ['status','title','description','dueDate','priority','links'];
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
  if (!db.issues)      db.issues      = [];
  if (!db.nextIssueId) db.nextIssueId = 1;
}

// GET /api/issues/analytics  ← must be BEFORE /:id
app.get('/api/issues/analytics', async (req, res) => {
  await initDB();
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
  await initDB();
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
  await initDB();
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
  saveDB(db);
  res.status(201).json(issue);
});

// GET /api/issues/:id
app.get('/api/issues/:id', async (req, res) => {
  await initDB();
  ensureIssues();
  const issue = db.issues.find(i => i.id === req.params.id);
  if (!issue) return res.status(404).json({ error: 'Not found' });
  res.json(issue);
});

// PATCH /api/issues/:id
app.patch('/api/issues/:id', async (req, res) => {
  await initDB();
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
  saveDB(db);
  res.json(issue);
});

// POST /api/issues/:id/solutions
app.post('/api/issues/:id/solutions', async (req, res) => {
  await initDB();
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
  saveDB(db);
  res.status(201).json(sol);
});

// POST /api/issues/:id/solutions/:sid/accept
app.post('/api/issues/:id/solutions/:sid/accept', async (req, res) => {
  await initDB();
  ensureIssues();
  const issue = db.issues.find(i => i.id === req.params.id);
  if (!issue) return res.status(404).json({ error: 'Not found' });
  const userEmail = (req.headers['x-user-email'] || '').toLowerCase();
  if (!isAdmin(req) && issue.reportedBy?.email?.toLowerCase() !== userEmail)
    return res.status(403).json({ error: 'Only the reporter or admins can accept a solution' });
  const sol = (issue.solutions || []).find(s => s.id === req.params.sid);
  if (!sol) return res.status(404).json({ error: 'Solution not found' });
  issue.solutions.forEach(s => { s.isAccepted = false; s.acceptedAt = null; });
  sol.isAccepted   = true;
  sol.acceptedAt   = new Date().toISOString();
  issue.status     = 'Resolved within Delivery';
  issue.resolvedAt = issue.resolvedAt || new Date().toISOString();
  issue.updatedAt  = new Date().toISOString();
  saveDB(db);
  res.json({ issue, solution: sol });
});

// POST /api/issues/:id/solutions/:sid/comments
app.post('/api/issues/:id/solutions/:sid/comments', async (req, res) => {
  await initDB();
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
  saveDB(db);
  res.status(201).json(comment);
});

// ── 360° Leaderboard ─────────────────────────────────────────────────────────
app.get('/api/leaderboard', async (req, res) => {
  const period = req.query.period || 'year';
  const offset = parseInt(req.query.offset || '0', 10); // 0=current, -1=prev, etc.
  try {
    // On Vercel cold-starts a request can arrive before initDB() + migrate() finish.
    // Awaiting _dbReady is idempotent: instant if already resolved, waits if still in flight.
    if (_dbReady) await _dbReady;
    // If our canary score is missing (saveDB hadn't propagated on previous cold start),
    // re-run migrate() synchronously so this request sees seed data in memory.
    if (!db.skillMatrix?.currentScores?.['Azhar']) {
      try { migrate(); } catch (e) { console.error('[lb-seed]', e.message); }
    }
  const now = new Date();
  const y = now.getFullYear(), m = now.getMonth();

  // Returns { start, end } for the target period — JavaScript Date handles month/year overflow.
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

  const empMap = {}; // normalized-name → employee record

  function normKey(name) {
    return (name || '').toLowerCase().trim().replace(/\s+/g, ' ');
  }

  function getEmp(name, email) {
    if (!name || !name.trim()) return null;
    const key = normKey(name);
    if (!empMap[key]) {
      empMap[key] = {
        name: name.trim(), email: email || '', score: 0,
        breakdown: { articles: 0, skills: 0, puzzles: 0, issues: 0, tasks: 0, ideas: 0, learning: 0 }
      };
    }
    if (email && !empMap[key].email) empMap[key].email = email;
    return empMap[key];
  }

  // ── 1. ARTICLES — 15 pts/article + category diversity + volume + view bonus ──
  const articleAgg = {};
  (db.articles || []).forEach(a => {
    if (!a.author) return;
    const ts = new Date(a.created_at || a.updated_at || 0);
    if (ts < pStart || ts >= pEnd) return;
    if (!articleAgg[a.author]) articleAgg[a.author] = { count: 0, cats: new Set(), views: 0 };
    articleAgg[a.author].count++;
    if (a.category) articleAgg[a.author].cats.add(a.category);
    articleAgg[a.author].views += (a.views || 0);
  });
  Object.entries(articleAgg).forEach(([author, d]) => {
    const e = getEmp(author, '');
    if (!e) return;
    const pts = d.count * 15
      + Math.max(0, d.cats.size - 1) * 8
      + (d.count >= 6 ? 20 : d.count >= 4 ? 10 : 0)
      + Math.floor(d.views / 50);
    e.breakdown.articles += pts;
    e.score += pts;
  });

  // ── 2. SKILL MATRIX — avg score × 0.8 (max 80 pts), always current snapshot ──
  const sm = db.skillMatrix || {};
  (sm.employees || []).forEach(empName => {
    const e = getEmp(empName, '');
    if (!e) return;
    const scores = (sm.processAreas || [])
      .map(pa => ((sm.currentScores || {})[empName] || {})[pa] || 0)
      .filter(s => s > 0);
    if (!scores.length) return;
    const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
    const pts = Math.round(avg * 0.8);
    e.breakdown.skills += pts;
    e.score += pts;
  });

  // ── 3. PROCESS PUZZLES — 5 participation + accuracy bonus + speed bonus ──
  ((db.processGame || {}).attempts || []).forEach(att => {
    if (!att.playerName) return;
    const attTs = new Date(att.completedAt || 0);
    if (attTs < pStart || attTs >= pEnd) return;
    const e = getEmp(att.playerName, '');
    if (!e) return;
    const pts = 5
      + Math.round((att.accuracy || 0) * 0.45)
      + ((att.timeTaken || Infinity) < 120000 ? 8 : 0);
    e.breakdown.puzzles += pts;
    e.score += pts;
  });

  // ── 4. ISSUES — reporting + solutions + accepted solutions (high weight) ──
  (db.issues || []).forEach(issue => {
    const issueTs = new Date(issue.createdAt || 0);
    if (issueTs >= pStart && issueTs < pEnd && issue.reportedBy?.name) {
      const e = getEmp(issue.reportedBy.name, issue.reportedBy.email);
      if (e) { e.breakdown.issues += 8; e.score += 8; }
    }
    (issue.solutions || []).forEach(sol => {
      const solTs = new Date(sol.createdAt || 0);
      if (solTs < pStart || solTs >= pEnd) return;
      if (!sol.author?.name) return;
      const e = getEmp(sol.author.name, sol.author.email);
      if (!e) return;
      const pts = sol.isAccepted ? 50 : 20;
      e.breakdown.issues += pts;
      e.score += pts;
    });
  });

  // ── 5. TASKS — priority-weighted completion, penalise overdue ──
  (db.tasks || []).forEach(task => {
    const name = task.assigneeName || task.assigneeEmail;
    if (!name) return;
    const e = getEmp(name, task.assigneeEmail);
    if (!e) return;
    const due = task.dueDate ? new Date(task.dueDate) : null;
    const taskTs = due || new Date(task.createdAt || 0);
    if (taskTs < pStart || taskTs >= pEnd) return;
    const hi = { high: 25, medium: 15, low: 8 };
    const lo = { high: 12, medium: 8,  low: 4  };
    const p = task.priority || 'medium';
    if (task.status === 'completed') {
      const onTime = !due || due >= now;
      const pts = onTime ? (hi[p] || 15) : (lo[p] || 8);
      e.breakdown.tasks += pts;
      e.score += pts;
    } else if (due && due < now) {
      e.breakdown.tasks = Math.max(0, e.breakdown.tasks - 5);
      e.score -= 5;
    }
  });

  // ── 6. IDEAS — submission + votes received + status bonus ──
  ((db.engagement || {}).ideas || []).forEach(idea => {
    if (!idea.author) return;
    const ideaTs = new Date(idea.date || 0);
    if (ideaTs < pStart || ideaTs >= pEnd) return;
    const e = getEmp(idea.author, '');
    if (!e) return;
    const pts = 12
      + (idea.votes || 0) * 3
      + (idea.status === 'implemented' ? 35 : idea.status === 'in-progress' ? 20 : 0);
    e.breakdown.ideas += pts;
    e.score += pts;
  });

  // ── 7. LEARNING — enrolled courses (completion tracking coming soon) ──
  ((db.learning || {}).assignments || []).forEach(a => {
    if (!a.userName) return;
    const lrnTs = new Date(a.assignedAt || 0);
    if (lrnTs < pStart || lrnTs >= pEnd) return;
    const e = getEmp(a.userName, '');
    if (!e) return;
    const pts = a.type === 'mandatory' ? 10 : 6;
    e.breakdown.learning += pts;
    e.score += pts;
  });

  // ── Rank and return ──
  const ranked = Object.values(empMap)
    .filter(e => e.score > 0)
    .map(e => ({
      ...e,
      score: Math.max(0, e.score),
      breakdown: Object.fromEntries(
        Object.entries(e.breakdown).map(([k, v]) => [k, Math.max(0, v)])
      )
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);

  res.json(ranked);
  } catch (err) {
    console.error('[leaderboard]', err);
    res.status(500).json({ error: 'Failed to compute leaderboard', detail: err.message });
  }
});

// ── Debug: inspect live DB state (admin only) ────────────────────────────────
app.get('/api/debug/db', async (req, res) => {
  if (_dbReady) await _dbReady;
  res.json({
    articles:    (db.articles || []).length,
    firstArticleDate: (db.articles || [])[0]?.created_at || null,
    lastArticleDate:  (db.articles || []).slice(-1)[0]?.created_at || null,
    skillMatrixEmployees: (db.skillMatrix?.employees || []).length,
    puzzleAttempts: (db.processGame?.attempts || []).length,
    ideas:        (db.engagement?.ideas || []).length,
    tasks:        (db.tasks || []).length,
    issues:       (db.issues || []).length,
    mongoConnected: !!mongoCol,
  });
});

// ── Export for Vercel serverless ──────────────────────────────────────────────
module.exports = app;
