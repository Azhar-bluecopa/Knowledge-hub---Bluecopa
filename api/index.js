// Vercel serverless API handler — clean version without multer/WebSocket — v7
require('dotenv').config();
const express = require('express');
const path    = require('path');
const fs      = require('fs');

const app = express();
app.use(express.json());

// ── Load data (read-only on Vercel) ───────────────────────────────────────────
function loadDB() {
  const candidates = [
    path.join(__dirname, '..', 'data.json'),
    path.join(process.cwd(), 'data.json'),
  ];
  for (const f of candidates) {
    try {
      if (fs.existsSync(f)) return JSON.parse(fs.readFileSync(f, 'utf8'));
    } catch (_) {}
  }
  return { articles: [], categories: [], settings: { siteTitle: 'KnowledgeHub', restrictions: { whoCanPost: 'admins_only' } }, nextId: 1 };
}

const db = loadDB();

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

// View increment — in-memory only (won't persist across cold starts, that's OK)
app.post('/api/articles/:id/view', (req, res) => {
  const a = (db.articles || []).find(x => x.id === parseInt(req.params.id));
  if (!a) return res.status(404).json({ error: 'Not found' });
  a.views = (a.views || 0) + 1;
  res.json({ views: a.views });
});

// Write endpoints — return success but data won't persist on Vercel (read-only deploy)
app.post('/api/articles', (req, res) => {
  const { whoCanPost } = (db.settings && db.settings.restrictions) || {};
  if (whoCanPost === 'disabled') return res.status(403).json({ error: 'Posting is disabled.' });
  if (whoCanPost === 'admins_only' && !isAdmin(req)) return res.status(403).json({ error: 'Only admins can post.' });
  res.status(201).json({ error: 'Vercel deployment is read-only. Add articles on the live server.' });
});

app.put('/api/articles/:id', (req, res) => {
  res.status(200).json({ error: 'Vercel deployment is read-only.' });
});

app.delete('/api/articles/:id', (req, res) => {
  res.status(200).json({ success: true, warning: 'Vercel deployment is read-only.' });
});

// ── Categories ────────────────────────────────────────────────────────────────
app.get('/api/categories', (req, res) => res.json(db.categories || []));

app.post('/api/categories', (req, res) => {
  if (!isAdmin(req)) return res.status(401).json({ error: 'Admin required' });
  res.status(201).json({ warning: 'Vercel deployment is read-only.' });
});

app.delete('/api/categories/:id', (req, res) => {
  if (!isAdmin(req)) return res.status(401).json({ error: 'Admin required' });
  res.json({ success: true, warning: 'Vercel deployment is read-only.' });
});

// ── Settings ──────────────────────────────────────────────────────────────────
app.get('/api/settings', (req, res) => {
  const { adminPassword: _, ...pub } = db.settings || {};
  res.json(pub);
});

app.put('/api/settings', (req, res) => {
  if (!isAdmin(req)) return res.status(401).json({ error: 'Admin required' });
  res.json({ warning: 'Vercel deployment is read-only.' });
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

  const byCat = {};
  categories.forEach(c => { byCat[c.name] = 0; });
  articles.forEach(a => { byCat[a.category] = (byCat[a.category] || 0) + 1; });

  const byAuthor = {};
  articles.forEach(a => { byAuthor[a.author] = (byAuthor[a.author] || 0) + 1; });

  const topViewed = [...articles]
    .sort((a, b) => (b.views || 0) - (a.views || 0))
    .slice(0, 8)
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

  res.json({
    totals: {
      articles:   articles.length,
      categories: categories.length,
      authors:    Object.keys(byAuthor).length,
      views:      articles.reduce((s, a) => s + (a.views || 0), 0),
    },
    byCategory: Object.entries(byCat).map(([name, count]) => ({
      name, count,
      color: categories.find(c => c.name === name)?.color || '#7a7a96',
    })),
    byAuthor:   Object.entries(byAuthor).sort((a, b) => b[1] - a[1]).map(([name, count]) => ({ name, count })),
    topViewed,
    monthly,
    topTags,
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

  let articleContext = '';
  if (articleId) {
    const a = (db.articles || []).find(x => x.id === parseInt(articleId));
    if (a) articleContext = `## Article: ${a.title}\nCategory: ${a.category} | Author: ${a.author}\nTags: ${(a.tags||[]).join(', ')}\n\n${a.content.slice(0,6000)}`;
  } else {
    const articles = db.articles || [];
    const qWords = question.toLowerCase().replace(/[^a-z0-9\s]/g,' ').split(/\s+/).filter(w => w.length > 2);
    const scored = articles.map(a => {
      const hay = (a.title+' '+a.excerpt+' '+(a.tags||[]).join(' ')+' '+a.category+' '+a.content.slice(0,1000)).toLowerCase();
      const score = qWords.reduce((s,w) => s+(hay.includes(w)?1:0), 0);
      return { a, score };
    }).sort((x,y) => y.score - x.score);
    articleContext = scored.slice(0,4).map(({a}) =>
      `## Article ${a.id}: ${a.title}\nCategory: ${a.category} | Author: ${a.author} | Tags: ${(a.tags||[]).join(', ')}\n\n${a.content.slice(0,2500)}`
    ).join('\n\n---\n\n');
  }

  const systemPrompt = `You are a helpful AI assistant for a company knowledge hub. Your role is to answer employee questions by drawing from the articles in the knowledge base below.

Guidelines:
- Answer clearly and concisely, using information from the articles provided.
- When relevant, structure your answer with numbered steps or bullet points for easy readability.
- If the answer spans multiple articles, synthesize the information cohesively and mention which articles you're referencing.
- If the knowledge base doesn't contain information relevant to the question, say so honestly and suggest what type of article might help.
- Keep answers practical and actionable.
- Format your response in clean markdown (bold, bullets, numbered lists as appropriate).

--- KNOWLEDGE BASE ---
${articleContext}
--- END KNOWLEDGE BASE ---`;

  const messages = [];
  if (Array.isArray(history) && history.length > 0) {
    history.forEach(h => { if (h.role && h.content) messages.push({ role: h.role, content: h.content }); });
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
          max_tokens: 2048, stream: true,
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
