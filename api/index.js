// Vercel serverless API handler — MongoDB persistent store — v8
require('dotenv').config();
const express = require('express');
const path    = require('path');
const fs      = require('fs');

const app = express();
app.use(express.json());

// ── Persistent store — MongoDB (primary) with data.json fallback ──────────────
let mongoCol = null;
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
          mongoCol = client.db('knowledgehub').collection('store');
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
  })();
  return dbInitPromise;
}

// Wait for DB before handling any request
app.use(async (req, res, next) => {
  try { await getDbInitPromise(); } catch (_) {}
  next();
});

function isAdmin(req) {
  return req.headers['x-admin-password'] === (db.settings && db.settings.adminPassword);
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
  await saveDB(db);
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
  const cat = { id: Date.now(), name: name.trim(), color: color || '#7a7a96' };
  db.categories.push(cat);
  await saveDB(db);
  res.status(201).json(cat);
});

app.delete('/api/categories/:id', async (req, res) => {
  if (!isAdmin(req)) return res.status(401).json({ error: 'Admin required' });
  const id = parseInt(req.params.id);
  const idx = (db.categories || []).findIndex(c => c.id === id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  db.categories.splice(idx, 1);
  await saveDB(db);
  res.json({ success: true });
});

// ── Settings ──────────────────────────────────────────────────────────────────
app.get('/api/settings', (req, res) => {
  const { adminPassword: _, ...pub } = db.settings || {};
  res.json(pub);
});

app.put('/api/settings', async (req, res) => {
  if (!isAdmin(req)) return res.status(401).json({ error: 'Admin required' });
  const { restrictions, adminPassword, siteTitle, aboutText } = req.body;
  if (!db.settings) db.settings = {};
  if (restrictions)          db.settings.restrictions = { ...db.settings.restrictions, ...restrictions };
  if (adminPassword?.trim()) db.settings.adminPassword = adminPassword.trim();
  if (siteTitle?.trim())     db.settings.siteTitle = siteTitle.trim();
  if (aboutText !== undefined) db.settings.aboutText = aboutText;
  await saveDB(db);
  res.json(db.settings);
});

// ── Admin login ───────────────────────────────────────────────────────────────
app.post('/api/admin/login', (req, res) => {
  const { password } = req.body;
  if (password === (db.settings && db.settings.adminPassword))
    res.json({ success: true });
  else
    res.status(401).json({ error: 'Invalid password' });
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

// ── AI Ask (supports Anthropic Claude or Groq) ────────────────────────────────
app.post('/api/ask', async (req, res) => {
  const { question, articleId, history } = req.body;
  if (!question?.trim()) return res.status(400).json({ error: 'Question is required.' });

  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  const groqKey      = process.env.GROQ_API_KEY;
  const useAnthropic = anthropicKey && anthropicKey !== 'your-anthropic-api-key-here';
  const useGroq      = groqKey      && groqKey      !== 'your-groq-api-key-here';

  if (!useAnthropic && !useGroq) {
    return res.status(503).json({ error: 'AI assistant is not configured. Add ANTHROPIC_API_KEY or GROQ_API_KEY.' });
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
      const Anthropic = require('@anthropic-ai/sdk');
      const client = new Anthropic.default({ apiKey: anthropicKey });
      const stream = await client.messages.stream({
        model: 'claude-opus-4-7', max_tokens: 2048,
        thinking: { type: 'adaptive' }, system: systemPrompt, messages,
      });
      for await (const event of stream) {
        if (event.type === 'content_block_delta' && event.delta?.type === 'text_delta') {
          res.write(`data: ${JSON.stringify({ type: 'text', text: event.delta.text })}\n\n`);
        }
      }
    } else {
      const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${groqKey}` },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [{ role: 'system', content: systemPrompt }, ...messages],
          max_tokens: 1024, temperature: 0.2, stream: true,
        }),
      });
      if (!groqRes.ok) throw new Error(`Groq API error ${groqRes.status}`);
      const reader = groqRes.body.getReader();
      const decoder = new TextDecoder();
      let buf = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split('\n'); buf = lines.pop();
        for (const line of lines) {
          const l = line.trim();
          if (!l || l === 'data: [DONE]') continue;
          if (l.startsWith('data: ')) {
            try {
              const json = JSON.parse(l.slice(6));
              const text = json.choices?.[0]?.delta?.content;
              if (text) res.write(`data: ${JSON.stringify({ type: 'text', text })}\n\n`);
            } catch { /* skip */ }
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

module.exports = app;
