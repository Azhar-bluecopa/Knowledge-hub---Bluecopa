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
    mongoCol.replaceOne({ _id: 'main' }, { _id: 'main', ...data }, { upsert: true })
      .catch(e => console.error('[saveDB/mongo]', e.message));
    return;
  }
  if (IS_VERCEL) return; // no file write on Vercel without Mongo
  try { fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf8'); }
  catch (e) { console.error('[saveDB/file]', e.message); }
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
  if (dirty) saveDB(db);
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
initDB().then(() => {
  migrate();
  // seed default articles only if DB is completely empty
  if (db.articles.length === 0) {
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
  console.error('Failed to init DB:', e);
  process.exit(1);
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
      rules:`Generate 8 multiple-choice KNOWLEDGE questions. Each must have exactly 4 options (A-D). Test understanding of processes, tools, and workflows. One option is clearly correct; the other 3 are plausible but wrong. Mix 2 easy, 4 medium, 2 hard.` },
    { id:'true_false',     name:'True or False',      icon:'⚖️', color:'trivia',
      desc:'Decide if each statement is true or false',
      rules:`Generate 8 TRUE/FALSE questions. Each question MUST be a statement (not a question). Options MUST be exactly ["True","False"] — only 2 options. Set correct to 0 if statement is True, 1 if False. Mix ~4 true and ~4 false. Include one surprising fact.` },
    { id:'riddle_round',   name:'Riddle Round',       icon:'🔮', color:'scenario',
      desc:'Solve creative riddles about delivery and data concepts',
      rules:`Generate 8 RIDDLES where each answer is a process, tool, concept, or workflow term from the knowledge base. Write each riddle metaphorically (e.g. "I flow between systems carrying data, I transform and cleanse but never rest — what am I?"). Provide 4 answer options, one correct. Make riddles clever but solvable with domain knowledge.` },
    { id:'fill_blank',     name:'Fill in the Blank',  icon:'✏️', color:'quiz',
      desc:'Complete the missing word or phrase in each statement',
      rules:`Generate 8 FILL-IN-THE-BLANK questions. Each is a sentence with exactly ONE blank marked as _____. Provide 4 options to fill the blank — only one is correct. The correct answer must be a key term, acronym, or concept from the knowledge base. Make the blanks meaningful, not trivial.` },
    { id:'spot_mistake',   name:'Spot the Mistake',   icon:'🔍', color:'trivia',
      desc:'Find the deliberate error hidden in each description',
      rules:`Generate 8 SPOT-THE-MISTAKE questions. Each describes a process or concept with ONE deliberate factual mistake. Format: "A colleague described [topic] as: [description with embedded mistake]. What is incorrect?" Provide 4 options — only one correctly identifies the mistake. Other 3 options point to things that were actually correct or are irrelevant.` },
    { id:'scenario',       name:'Scenario Challenge', icon:'🎯', color:'scenario',
      desc:'Make the right call in real-world delivery situations',
      rules:`Generate 8 SCENARIO-BASED questions presenting realistic delivery team situations. Each presents a work situation with a problem or decision. Provide 4 possible actions — only one is clearly the best approach. Wrong options should be common mistakes or partial solutions, not obviously wrong.` },
    { id:'what_next',      name:'What Comes Next?',   icon:'⏭️', color:'quiz',
      desc:'Identify the next correct step in a delivery workflow',
      rules:`Generate 8 SEQUENCING questions. Each describes a process up to a certain step then asks "What should happen next?" Provide 4 options for the next step — one is correct. Draw from different process areas (ingestion, reconciliation, reporting, exports, etc.). Vary difficulty.` },
    { id:'term_buster',    name:'Term Buster',        icon:'📖', color:'trivia',
      desc:'Match terms, acronyms, and definitions from the knowledge base',
      rules:`Generate 8 TERMINOLOGY questions about specific terms, acronyms, tools, or concepts from the knowledge base. Format questions as "What is [TERM]?", "What does [ACRONYM] stand for?", or "Which best describes [CONCEPT]?". Provide 4 options — one correct definition, 3 plausible but wrong. Include at least 2 acronym questions.` },
    { id:'rapid_fire',     name:'Rapid Fire ⚡',       icon:'⚡', color:'scenario',
      desc:'10 quick-fire questions — speed and accuracy both count!',
      rules:`Generate 10 SHORT multiple-choice questions. Each question MUST be one concise sentence (max 20 words). Each has exactly 4 options, one correct. Focus on quick-recall facts: key terms, numbers, acronyms, and "who does what" knowledge. Mix difficulty: 4 easy, 4 medium, 2 hard. No long scenarios.` },
    { id:'emoji_quiz',     name:'Emoji Decode 🎯',    icon:'🎯', color:'scenario',
      desc:'Decode process workflows and concepts from emoji sequences!',
      rules:`Generate 8 EMOJI-CLUE questions. Each question shows 3–6 emojis representing a process, workflow, tool, or concept from the knowledge base. Format: "🔢 → 📥 → 🔍 → ✅ — What process does this represent?" Provide 4 answer options (one correct). Be creative but make the emoji logic deducible by someone who knows the domain.` },
    { id:'who_am_i',       name:'Who Am I? 🕵️',       icon:'🕵️', color:'trivia',
      desc:'Guess the role, tool, or process from cryptic one-liners!',
      rules:`Generate 8 "WHO/WHAT AM I?" questions. Each gives 3 progressive clues getting more specific (Clue 1 = vague, Clue 3 = obvious). Format: "Clue 1: I touch every dataset before it goes live. Clue 2: I check counts, types, and thresholds. Clue 3: Teams configure me with rules and tolerances. Who/what am I?" Provide 4 options. Make it feel like a puzzle to unravel.` },
    { id:'mixed_bag',      name:'Mixed Bag',          icon:'🎲', color:'quiz',
      desc:'A surprise mix of all question types — stay on your toes!',
      rules:`Generate 8 questions using a MIX of formats: 2 standard multiple-choice (4 options), 2 TRUE/FALSE (options MUST be exactly ["True","False"] — no other values), 2 fill-in-the-blank (sentence with _____ and 4 options), 2 riddles (metaphorical description, 4 options). For true/false, ALWAYS use exactly ["True","False"] as the options array.` },
  ];
  const fmt = (formatId && formatId !== 'random')
    ? (PP_FORMATS.find(f => f.id === formatId) || PP_FORMATS[Math.floor(Math.random() * PP_FORMATS.length)])
    : PP_FORMATS[Math.floor(Math.random() * PP_FORMATS.length)];
  // Format-specific prompt variables
  const questionCount = fmt.id === 'rapid_fire' ? 10 : 8;
  const optionsExample = fmt.id === 'true_false'
    ? '["True","False"]'
    : '["Option A","Option B","Option C","Option D"]';
  const questionExample =
    fmt.id === 'fill_blank'  ? '"Teams use _____ to verify that ingested data matches the source system counts."' :
    fmt.id === 'emoji_quiz'  ? '"📥 → 🔍 → ✅ → 📊 — What process does this emoji sequence represent?"' :
    fmt.id === 'who_am_i'   ? '"Clue 1: I am invisible until something breaks. Clue 2: I watch every data load silently. Clue 3: Teams set my thresholds to catch row-count mismatches. Who/What am I?"' :
    fmt.id === 'riddle_round'? '"I travel between systems carrying data, transforming as I go, never seen but always felt. What am I?"' :
    '"Full question text here — written exactly as players will read it."';

  // Build format-enforcement block
  const formatEnforcement = [
    fmt.id === 'fill_blank'   ? '⚠️ FILL_BLANK RULE: Every single question string MUST contain exactly one _____ (five underscores) blank. Do NOT write normal questions — every question is an incomplete sentence with a gap.' : '',
    fmt.id === 'emoji_quiz'   ? '⚠️ EMOJI_QUIZ RULE: Every single question string MUST begin with 3–6 emojis separated by → (e.g. "📥 → 🔍 → ✅ — What process does this represent?"). Do NOT write text-only questions.' : '',
    fmt.id === 'who_am_i'    ? '⚠️ WHO_AM_I RULE: Every single question string MUST follow this exact pattern: "Clue 1: [vague clue]. Clue 2: [more specific]. Clue 3: [most specific]. Who/What am I?" — no exceptions.' : '',
    fmt.id === 'riddle_round' ? '⚠️ RIDDLE RULE: Every single question string MUST be written in first person as a metaphorical riddle starting with "I" (e.g. "I travel between systems..."). Do NOT write normal questions.' : '',
    fmt.id === 'true_false'   ? '⚠️ TRUE_FALSE RULE: Every options array MUST be exactly ["True","False"] (2 items only). Never use 4 options. Every question must be a statement, not a question.' : '',
    fmt.id === 'rapid_fire'   ? '⚠️ RAPID_FIRE RULE: Every question string MUST be 15 words or fewer. Short, punchy, recall-based. Generate exactly 10 questions.' : '',
    fmt.id === 'spot_mistake' ? '⚠️ SPOT_MISTAKE RULE: Every question string MUST describe a process with one embedded factual error, formatted as a colleague\'s statement.' : '',
    fmt.id === 'scenario'     ? '⚠️ SCENARIO RULE: Every question string MUST describe a realistic work situation with a dilemma or decision point.' : '',
    fmt.id === 'what_next'    ? '⚠️ WHAT_NEXT RULE: Every question string MUST describe a process up to a step, then ask "What should happen next?"' : '',
  ].filter(Boolean).join('\n');

  const prompt = `You are generating a "${fmt.name}" format quiz for a delivery team's weekly "Process Puzzle" challenge.

THIS IS A "${fmt.id.toUpperCase()}" FORMAT GAME — NOT A STANDARD MULTIPLE CHOICE QUIZ.

KNOWLEDGE BASE (base all questions on this content):
${articles}

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
        max_tokens: 3000,
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
          max_tokens: 3000,
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

// ── Export for Vercel serverless ──────────────────────────────────────────────
module.exports = app;
