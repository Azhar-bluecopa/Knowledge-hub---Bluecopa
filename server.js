const express    = require('express');
const http       = require('http');
const path       = require('path');
const fs         = require('fs');
const multer     = require('multer');
const nodemailer = require('nodemailer');
require('dotenv').config();

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

// ── JSON store ────────────────────────────────────────────────────────────────
// Try __dirname first, then process.cwd() as fallback (Vercel serverless)
const DB_FILE = (() => {
  const p1 = path.join(__dirname, 'data.json');
  if (fs.existsSync(p1)) return p1;
  return path.join(process.cwd(), 'data.json');
})();
const UPLOADS = path.join(__dirname, 'public', 'uploads');
if (!IS_VERCEL && !fs.existsSync(UPLOADS)) fs.mkdirSync(UPLOADS, { recursive: true });

function loadDB() {
  try {
    const p1 = path.join(__dirname, 'data.json');
    const p2 = path.join(process.cwd(), 'data.json');
    const file = fs.existsSync(p1) ? p1 : p2;
    if (!fs.existsSync(file)) return { articles: [], nextId: 1 };
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch { return { articles: [], nextId: 1 }; }
}
function saveDB(db) {
  if (IS_VERCEL) return; // Vercel filesystem is read-only — writes are no-ops
  try { fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf8'); }
  catch (e) { console.error('[saveDB] write failed:', e.message); }
}

let db = loadDB();

// ── Migrate / init new DB fields ──────────────────────────────────────────────
(function migrate() {
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
  if (dirty) saveDB(db);
})();

// ── Seed articles ─────────────────────────────────────────────────────────────
if (db.articles.length === 0) {
  const now = Date.now(), day = 86400000;
  db.articles = [
    { id:1,  title:'How to Onboard a New Client onto Bluecopa',  category:'Support',     author:'Priya Nair',   initials:'PN', excerpt:'Step-by-step guide covering account creation, data migration, user access setup, and initial configuration for new enterprise clients.', content:'Step-by-step guide covering account creation, data migration, user access setup, and initial configuration for new enterprise clients.\n\n1. Create the client account in the admin panel.\n2. Migrate existing data using the import wizard.\n3. Configure user roles and permissions.\n4. Run the initial setup checklist with the client.', tags:['onboarding','setup'],   created_at:new Date(now - 0*day).toISOString() },
    { id:2,  title:'Month-End Reconciliation Checklist',          category:'Finance',     author:'Rahul Mehta',  initials:'RM', excerpt:'A comprehensive checklist for the finance team to ensure all ledgers are balanced and accounts are reconciled before month-end close.', content:'A comprehensive checklist for the finance team to ensure all ledgers are balanced and accounts are reconciled before month-end close.\n\n- Verify all bank statements\n- Reconcile accounts payable and receivable\n- Ensure all invoices are processed\n- Review expense reports', tags:['finance','checklist'], created_at:new Date(now - 1*day).toISOString() },
    { id:3,  title:'Setting Up Local Dev Environment',             category:'Engineering', author:'Arjun Kumar',  initials:'AK', excerpt:'Complete guide to installing Node.js, configuring environment variables, running Docker containers, and connecting to staging databases.', content:'Complete guide to installing Node.js, configuring environment variables, running Docker containers, and connecting to staging databases.\n\n```bash\nnpm install\ncp .env.example .env\ndocker-compose up -d\n```', tags:['dev','setup'],        created_at:new Date(now - 1*day).toISOString() },
    { id:4,  title:'Leave Policy & Attendance Guidelines',         category:'HR',          author:'Sanya Kapoor', initials:'SK', excerpt:'Detailed overview of leave types, application procedures, carry-forward rules, and attendance tracking expectations for all employees.', content:'Detailed overview of leave types, application procedures, carry-forward rules, and attendance tracking expectations for all employees.\n\n**Leave Types:** Casual, Medical, Earned\n**Carry Forward:** Up to 15 days per year\n**Application:** Submit at least 2 days in advance', tags:['HR','policy'],         created_at:new Date(now - 2*day).toISOString() },
    { id:5,  title:'API Rate Limits & Error Codes Reference',      category:'Engineering', author:'Dev Sharma',   initials:'DS', excerpt:'A reference document for all public and internal API endpoints, their rate limits, expected error codes, and retry strategies.', content:'A reference document for all public and internal API endpoints, their rate limits, expected error codes, and retry strategies.\n\n| Endpoint | Rate Limit | Retry |\n|---|---|---|\n| /api/v1/* | 1000/min | Exponential backoff |\n| /api/internal/* | 5000/min | Immediate |', tags:['API','reference'],    created_at:new Date(now - 3*day).toISOString() },
    { id:6,  title:'Q4 Financial Reporting Template',              category:'Finance',     author:'Rahul Mehta',  initials:'RM', excerpt:'Standardized template for quarterly financial reports including revenue breakdowns, cost analysis, and stakeholder-ready summary slides.', content:'Standardized template for quarterly financial reports including revenue breakdowns, cost analysis, and stakeholder-ready summary slides.\n\nSections:\n1. Executive Summary\n2. Revenue Breakdown\n3. Cost Analysis\n4. Forecast', tags:['finance','reporting'], created_at:new Date(now - 4*day).toISOString() },
    { id:7,  title:'Product Roadmap — H2 2025',                    category:'Product',     author:'Meena Iyer',   initials:'MI', excerpt:'Overview of planned features, prioritization framework, and key milestones for the second half of 2025 across all product lines.', content:'Overview of planned features, prioritization framework, and key milestones for the second half of 2025 across all product lines.\n\nQ3: Analytics dashboard v2, SSO integration\nQ4: Mobile app launch, Bulk exports, API v3', tags:['roadmap','strategy'],  created_at:new Date(now - 5*day).toISOString() },
    { id:8,  title:'Debugging Payment Integration Issues',         category:'Engineering', author:'Arjun Kumar',  initials:'AK', excerpt:'Common failure scenarios in payment gateway integrations, how to read webhook logs, and resolution steps for the most frequent errors.', content:'Common failure scenarios in payment gateway integrations, how to read webhook logs, and resolution steps for the most frequent errors.\n\nCheck webhook signatures first. Enable verbose logging with `DEBUG=payments*`. Common codes: 402 (card declined), 422 (validation error).', tags:['payments','debug'],    created_at:new Date(now - 6*day).toISOString() },
    { id:9,  title:'Performance Review Process — 2025',            category:'HR',          author:'Sanya Kapoor', initials:'SK', excerpt:'Timeline, evaluation criteria, self-assessment templates, and manager guidelines for the annual performance review cycle.', content:'Timeline, evaluation criteria, self-assessment templates, and manager guidelines for the annual performance review cycle.\n\nTimeline: Jan self-assessment → Feb manager review → Mar calibration → Apr letters', tags:['HR','reviews'],        created_at:new Date(now - 7*day).toISOString() },
    { id:10, title:'GST & TDS Compliance Checklist',               category:'Finance',     author:'Anjali Verma', initials:'AV', excerpt:'Monthly and quarterly compliance tasks for GST filing, TDS deduction, and statutory payment deadlines for the accounts team.', content:'Monthly and quarterly compliance tasks for GST filing, TDS deduction, and statutory payment deadlines for the accounts team.\n\nMonthly: GSTR-1 by 11th, GSTR-3B by 20th\nQuarterly: TDS return by 31st of month following quarter', tags:['tax','compliance'],    created_at:new Date(now - 7*day).toISOString() },
    { id:11, title:'Feature Flag Management Guide',                 category:'Product',     author:'Meena Iyer',   initials:'MI', excerpt:'How to create, enable, disable, and audit feature flags across environments using our internal feature management dashboard.', content:'How to create, enable, disable, and audit feature flags across environments using our internal feature management dashboard.\n\nAccess: Settings → Feature Flags. Always test in staging before enabling in production. Flags auto-expire after 90 days.', tags:['flags','deployment'],  created_at:new Date(now - 8*day).toISOString() },
    { id:12, title:'CI/CD Pipeline Overview',                      category:'Engineering', author:'Dev Sharma',   initials:'DS', excerpt:'Architecture documentation for our continuous integration and deployment pipeline including branch strategies, test gates, and rollback procedures.', content:'Architecture documentation for our continuous integration and deployment pipeline including branch strategies, test gates, and rollback procedures.\n\nBranch: feature/* → main (PR required). Gates: lint, unit tests, e2e. Deploy: auto on merge to main. Rollback: `npm run rollback -- --env=prod`', tags:['DevOps','CI/CD'],      created_at:new Date(now - 14*day).toISOString() },
  ];
  db.nextId = 13;
  saveDB(db);
  console.log('Seeded 12 articles.');
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

// ── Article Requests ──────────────────────────────────────────────────────────
app.post('/api/article-requests', async (req, res) => {
  const { topic, description, requesterName, requesterEmail } = req.body;
  if (!topic?.trim()) return res.status(400).json({ error: 'Topic is required.' });

  // Save request in DB
  if (!db.articleRequests) db.articleRequests = [];
  const request = {
    id:             (db.articleRequests.length + 1),
    topic:          topic.trim(),
    description:    (description || '').trim(),
    requesterName:  (requesterName || 'Anonymous').trim(),
    requesterEmail: (requesterEmail || '').trim(),
    status:         'pending',
    created_at:     new Date().toISOString(),
  };
  db.articleRequests.push(request);
  saveDB(db);

  // Send email notification
  const notifyEmail = process.env.NOTIFY_EMAIL || 'azhar.m@bluecopa.com';
  try {
    const transporter = nodemailer.createTransport({
      host:   process.env.SMTP_HOST || 'smtp.gmail.com',
      port:   parseInt(process.env.SMTP_PORT || '587'),
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    await transporter.sendMail({
      from:    `"Bluecopa Knowledge Hub" <${process.env.SMTP_USER}>`,
      to:      notifyEmail,
      subject: `📚 New Article Request: ${request.topic}`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;background:#f9fafb;border-radius:10px;overflow:hidden;border:1px solid #e5e7eb;">
          <div style="background:#111827;padding:24px 28px;">
            <h2 style="color:#3B82F6;margin:0;font-size:18px;">📚 New Article Request</h2>
            <p style="color:#9CA3AF;margin:4px 0 0;font-size:13px;">Bluecopa Knowledge Hub</p>
          </div>
          <div style="padding:24px 28px;background:#fff;">
            <table style="width:100%;border-collapse:collapse;font-size:14px;">
              <tr><td style="padding:8px 0;color:#6B7280;width:140px;">📌 Topic</td><td style="padding:8px 0;font-weight:600;color:#111827;">${request.topic}</td></tr>
              <tr><td style="padding:8px 0;color:#6B7280;">📝 Description</td><td style="padding:8px 0;color:#374151;">${request.description || '<em style="color:#9CA3AF">Not provided</em>'}</td></tr>
              <tr><td style="padding:8px 0;color:#6B7280;">👤 Requested by</td><td style="padding:8px 0;color:#374151;">${request.requesterName}</td></tr>
              <tr><td style="padding:8px 0;color:#6B7280;">✉️ Their email</td><td style="padding:8px 0;color:#374151;">${request.requesterEmail || '<em style="color:#9CA3AF">Not provided</em>'}</td></tr>
              <tr><td style="padding:8px 0;color:#6B7280;">🕒 Submitted</td><td style="padding:8px 0;color:#374151;">${new Date(request.created_at).toLocaleString('en-IN',{dateStyle:'medium',timeStyle:'short'})}</td></tr>
            </table>
          </div>
          <div style="padding:16px 28px;background:#f9fafb;border-top:1px solid #e5e7eb;">
            <p style="margin:0;font-size:12px;color:#9CA3AF;">This request was submitted via the Bluecopa Knowledge Hub. Log in as admin to manage requests.</p>
          </div>
        </div>
      `,
    });
    console.log(`[article-request] Email sent to ${notifyEmail} for: "${request.topic}"`);
  } catch (emailErr) {
    console.error('[article-request] Email failed:', emailErr.message);
    // Still return success — request is saved even if email fails
  }

  res.status(201).json({ success: true, id: request.id });
});

app.get('/api/article-requests', (req, res) => {
  if (!isAdmin(req)) return res.status(401).json({ error: 'Admin required' });
  res.json(db.articleRequests || []);
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

// ── Start (local only) ────────────────────────────────────────────────────────
if (!IS_VERCEL) {
  const PORT = process.env.PORT || 3000;
  server.listen(PORT, () => {
    console.log(`\n  KnowledgeHub → http://localhost:${PORT}`);
    console.log(`  Default admin password: ${db.settings.adminPassword}\n`);
  });
}

// ── Export for Vercel serverless ──────────────────────────────────────────────
module.exports = app;
