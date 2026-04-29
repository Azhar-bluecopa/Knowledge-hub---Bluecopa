const express = require('express');
const { WebSocketServer } = require('ws');
const http = require('http');
const path = require('path');
const fs   = require('fs');

const app    = express();
const server = http.createServer(app);
const wss    = new WebSocketServer({ server });

// ── JSON file store ───────────────────────────────────────────────────────────
const DB_FILE = path.join(__dirname, 'data.json');

function loadDB() {
  if (!fs.existsSync(DB_FILE)) return { articles: [], nextId: 1 };
  try { return JSON.parse(fs.readFileSync(DB_FILE, 'utf8')); }
  catch { return { articles: [], nextId: 1 }; }
}

function saveDB(db) {
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf8');
}

let db = loadDB();

// ── Seed data (runs once on empty DB) ────────────────────────────────────────
if (db.articles.length === 0) {
  const now = Date.now();
  const day = 86400000;
  db.articles = [
    { id:1,  title:"How to Onboard a New Client onto Bluecopa",  category:"Support",     author:"Priya Nair",   initials:"PN", excerpt:"Step-by-step guide covering account creation, data migration, user access setup, and initial configuration for new enterprise clients.", content:"Step-by-step guide covering account creation, data migration, user access setup, and initial configuration for new enterprise clients.\n\n1. Create the client account in the admin panel.\n2. Migrate existing data using the import wizard.\n3. Configure user roles and permissions.\n4. Run the initial setup checklist with the client.", tags:["onboarding","setup"],   created_at: new Date(now - 0*day).toISOString() },
    { id:2,  title:"Month-End Reconciliation Checklist",          category:"Finance",     author:"Rahul Mehta",  initials:"RM", excerpt:"A comprehensive checklist for the finance team to ensure all ledgers are balanced and accounts are reconciled before month-end close.", content:"A comprehensive checklist for the finance team to ensure all ledgers are balanced and accounts are reconciled before month-end close.\n\n- Verify all bank statements\n- Reconcile accounts payable and receivable\n- Ensure all invoices are processed\n- Review expense reports", tags:["finance","checklist"], created_at: new Date(now - 1*day).toISOString() },
    { id:3,  title:"Setting Up Local Dev Environment",             category:"Engineering", author:"Arjun Kumar",  initials:"AK", excerpt:"Complete guide to installing Node.js, configuring environment variables, running Docker containers, and connecting to staging databases.", content:"Complete guide to installing Node.js, configuring environment variables, running Docker containers, and connecting to staging databases.\n\n```bash\nnpm install\ncp .env.example .env\ndocker-compose up -d\n```", tags:["dev","setup"],        created_at: new Date(now - 1*day).toISOString() },
    { id:4,  title:"Leave Policy & Attendance Guidelines",         category:"HR",          author:"Sanya Kapoor", initials:"SK", excerpt:"Detailed overview of leave types, application procedures, carry-forward rules, and attendance tracking expectations for all employees.", content:"Detailed overview of leave types, application procedures, carry-forward rules, and attendance tracking expectations for all employees.\n\n**Leave Types:** Casual, Medical, Earned\n**Carry Forward:** Up to 15 days per year\n**Application:** Submit at least 2 days in advance", tags:["HR","policy"],         created_at: new Date(now - 2*day).toISOString() },
    { id:5,  title:"API Rate Limits & Error Codes Reference",      category:"Engineering", author:"Dev Sharma",   initials:"DS", excerpt:"A reference document for all public and internal API endpoints, their rate limits, expected error codes, and retry strategies.", content:"A reference document for all public and internal API endpoints, their rate limits, expected error codes, and retry strategies.\n\n| Endpoint | Rate Limit | Retry |\n|---|---|---|\n| /api/v1/* | 1000/min | Exponential backoff |\n| /api/internal/* | 5000/min | Immediate |", tags:["API","reference"],    created_at: new Date(now - 3*day).toISOString() },
    { id:6,  title:"Q4 Financial Reporting Template",              category:"Finance",     author:"Rahul Mehta",  initials:"RM", excerpt:"Standardized template for quarterly financial reports including revenue breakdowns, cost analysis, and stakeholder-ready summary slides.", content:"Standardized template for quarterly financial reports including revenue breakdowns, cost analysis, and stakeholder-ready summary slides.\n\nSections:\n1. Executive Summary\n2. Revenue Breakdown\n3. Cost Analysis\n4. Forecast", tags:["finance","reporting"], created_at: new Date(now - 4*day).toISOString() },
    { id:7,  title:"Product Roadmap — H2 2025",                    category:"Product",     author:"Meena Iyer",   initials:"MI", excerpt:"Overview of planned features, prioritization framework, and key milestones for the second half of 2025 across all product lines.", content:"Overview of planned features, prioritization framework, and key milestones for the second half of 2025 across all product lines.\n\nQ3: Analytics dashboard v2, SSO integration\nQ4: Mobile app launch, Bulk exports, API v3", tags:["roadmap","strategy"],  created_at: new Date(now - 5*day).toISOString() },
    { id:8,  title:"Debugging Payment Integration Issues",         category:"Engineering", author:"Arjun Kumar",  initials:"AK", excerpt:"Common failure scenarios in payment gateway integrations, how to read webhook logs, and resolution steps for the most frequent errors.", content:"Common failure scenarios in payment gateway integrations, how to read webhook logs, and resolution steps for the most frequent errors.\n\nCheck webhook signatures first. Enable verbose logging with `DEBUG=payments*`. Common codes: 402 (card declined), 422 (validation error).", tags:["payments","debug"],    created_at: new Date(now - 6*day).toISOString() },
    { id:9,  title:"Performance Review Process — 2025",            category:"HR",          author:"Sanya Kapoor", initials:"SK", excerpt:"Timeline, evaluation criteria, self-assessment templates, and manager guidelines for the annual performance review cycle.", content:"Timeline, evaluation criteria, self-assessment templates, and manager guidelines for the annual performance review cycle.\n\nTimeline: Jan self-assessment → Feb manager review → Mar calibration → Apr letters", tags:["HR","reviews"],        created_at: new Date(now - 7*day).toISOString() },
    { id:10, title:"GST & TDS Compliance Checklist",               category:"Finance",     author:"Anjali Verma", initials:"AV", excerpt:"Monthly and quarterly compliance tasks for GST filing, TDS deduction, and statutory payment deadlines for the accounts team.", content:"Monthly and quarterly compliance tasks for GST filing, TDS deduction, and statutory payment deadlines for the accounts team.\n\nMonthly: GSTR-1 by 11th, GSTR-3B by 20th\nQuarterly: TDS return by 31st of month following quarter", tags:["tax","compliance"],    created_at: new Date(now - 7*day).toISOString() },
    { id:11, title:"Feature Flag Management Guide",                 category:"Product",     author:"Meena Iyer",   initials:"MI", excerpt:"How to create, enable, disable, and audit feature flags across environments using our internal feature management dashboard.", content:"How to create, enable, disable, and audit feature flags across environments using our internal feature management dashboard.\n\nAccess: Settings → Feature Flags. Always test in staging before enabling in production. Flags auto-expire after 90 days.", tags:["flags","deployment"],  created_at: new Date(now - 8*day).toISOString() },
    { id:12, title:"CI/CD Pipeline Overview",                      category:"Engineering", author:"Dev Sharma",   initials:"DS", excerpt:"Architecture documentation for our continuous integration and deployment pipeline including branch strategies, test gates, and rollback procedures.", content:"Architecture documentation for our continuous integration and deployment pipeline including branch strategies, test gates, and rollback procedures.\n\nBranch: feature/* → main (PR required). Gates: lint, unit tests, e2e. Deploy: auto on merge to main. Rollback: `npm run rollback -- --env=prod`", tags:["DevOps","CI/CD"],      created_at: new Date(now - 14*day).toISOString() },
  ];
  db.nextId = 13;
  saveDB(db);
  console.log('Seeded 12 articles.');
}

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ── Broadcast helper ──────────────────────────────────────────────────────────
function broadcast(data) {
  const msg = JSON.stringify(data);
  wss.clients.forEach(c => { if (c.readyState === 1) c.send(msg); });
}

// ── REST API ──────────────────────────────────────────────────────────────────
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
  const { title, category, author, initials, content, tags } = req.body;
  if (!title || !category || !content)
    return res.status(400).json({ error: 'title, category, and content are required' });

  const article = {
    id:         db.nextId++,
    title:      title.trim(),
    category,
    author:     (author || 'Anonymous').trim(),
    initials:   (initials || 'AN').trim().toUpperCase().slice(0, 2),
    excerpt:    content.substring(0, 160).trimEnd() + (content.length > 160 ? '…' : ''),
    content,
    tags:       tags && tags.length ? tags : ['general'],
    created_at: new Date().toISOString(),
  };

  db.articles.unshift(article);
  saveDB(db);
  broadcast({ type: 'article_created', article });
  res.status(201).json(article);
});

app.delete('/api/articles/:id', (req, res) => {
  const id  = parseInt(req.params.id);
  const idx = db.articles.findIndex(x => x.id === id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  db.articles.splice(idx, 1);
  saveDB(db);
  broadcast({ type: 'article_deleted', id });
  res.json({ success: true });
});

// ── WebSocket ─────────────────────────────────────────────────────────────────
wss.on('connection', (ws, req) => {
  console.log(`[WS] +client  (${req.socket.remoteAddress})  total=${wss.clients.size}`);
  ws.on('close', () => console.log(`[WS] -client  total=${wss.clients.size}`));
});

// ── Start ─────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`\n  KnowledgeHub → http://localhost:${PORT}\n`);
});
