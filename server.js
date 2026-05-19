require('dotenv').config({ path: require('path').join(__dirname, '.env'), override: true });
const express = require('express');
const http    = require('http');
const path    = require('path');
const fs      = require('fs');
const multer  = require('multer');

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
      adminPassword: 'admin123',
      siteTitle:     'KnowledgeHub',
      restrictions:  { whoCanPost: 'anyone' }  // 'anyone' | 'admins_only' | 'disabled'
    };
    dirty = true;
  }
  // add views to existing articles
  db.articles.forEach(a => { if (a.views === undefined) { a.views = 0; dirty = true; } });
  if (!db.skillMatrix) {
    db.skillMatrix = { processAreas: [], employees: [], currentScores: {}, snapshots: [], nextSnapshotId: 1 };
    dirty = true;
  }
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
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ── Helpers ───────────────────────────────────────────────────────────────────
function broadcast(data) {
  if (!wss) return; // no-op on Vercel
  const msg = JSON.stringify(data);
  wss.clients.forEach(c => { if (c.readyState === 1) c.send(msg); });
}
function isAdmin(req) {
  return req.headers['x-admin-password'] === db.settings.adminPassword;
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
  const { restrictions, adminPassword, siteTitle, aboutText } = req.body;
  if (restrictions)           db.settings.restrictions = { ...db.settings.restrictions, ...restrictions };
  if (adminPassword?.trim())  db.settings.adminPassword = adminPassword.trim();
  if (siteTitle?.trim())      db.settings.siteTitle = siteTitle.trim();
  if (aboutText !== undefined) db.settings.aboutText = aboutText;
  saveDB(db);
  const { adminPassword: _, ...pub } = db.settings;
  broadcast({ type: 'settings_updated', settings: pub });
  res.json(pub);
});

app.post('/api/admin/login', (req, res) => {
  const { password } = req.body;
  if (password === db.settings.adminPassword) res.json({ success: true });
  else res.status(401).json({ error: 'Invalid password' });
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

// ── Skill Matrix ──────────────────────────────────────────────────────────────
function ensureSM() {
  if (!db.skillMatrix) db.skillMatrix = { processAreas:[], employees:[], currentScores:{}, snapshots:[], nextSnapshotId:1 };
}
app.get('/api/skillmatrix', (req, res) => { ensureSM(); res.json(db.skillMatrix); });

app.put('/api/skillmatrix/config', (req, res) => {
  if (!isAdmin(req)) return res.status(401).json({ error:'Admin required' });
  ensureSM();
  const { processAreas, employees } = req.body;
  if (Array.isArray(processAreas)) db.skillMatrix.processAreas = processAreas.map(p=>p.trim()).filter(Boolean);
  if (Array.isArray(employees))    db.skillMatrix.employees    = employees.map(e=>e.trim()).filter(Boolean);
  saveDB(db); broadcast({ type:'skillmatrix_config_updated' });
  res.json({ processAreas: db.skillMatrix.processAreas, employees: db.skillMatrix.employees });
});

app.put('/api/skillmatrix/scores', (req, res) => {
  ensureSM();
  db.skillMatrix.currentScores = req.body.scores || {};
  saveDB(db); res.json({ success:true });
});

app.post('/api/skillmatrix/snapshots', (req, res) => {
  if (!isAdmin(req)) return res.status(401).json({ error:'Admin required' });
  ensureSM();
  const now = new Date();
  const snapshot = {
    id: db.skillMatrix.nextSnapshotId++,
    label: (req.body.label||'').trim() || now.toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'}),
    date:  now.toISOString().split('T')[0],
    scores: JSON.parse(JSON.stringify(db.skillMatrix.currentScores||{})),
    created_at: now.toISOString()
  };
  db.skillMatrix.snapshots.push(snapshot);
  saveDB(db); broadcast({ type:'skillmatrix_snapshot', snapshot });
  res.status(201).json(snapshot);
});

app.delete('/api/skillmatrix/snapshots/:id', (req, res) => {
  if (!isAdmin(req)) return res.status(401).json({ error:'Admin required' });
  ensureSM();
  const idx = db.skillMatrix.snapshots.findIndex(s=>s.id===parseInt(req.params.id));
  if (idx===-1) return res.status(404).json({ error:'Not found' });
  db.skillMatrix.snapshots.splice(idx,1); saveDB(db); res.json({ success:true });
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
      console.log(`  Admin password: ${db.settings?.adminPassword || 'admin123'}\n`);
    });
  }
}).catch(e => {
  console.error('Failed to init DB:', e);
  process.exit(1);
});

// ── Export for Vercel serverless ──────────────────────────────────────────────
module.exports = app;
