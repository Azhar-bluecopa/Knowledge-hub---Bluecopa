// ── AI Chat ──────────────────────────────────────────────────────────────────
const aiHistory = []; // [{role:'user',content:''},{role:'assistant',content:''}]
let aiStreaming = false;
let aiPanelState = 'closed'; // 'closed' | 'normal' | 'minimised' | 'maximised'

function toggleAiPanel() {
  const panel = document.getElementById('aiPanel');
  if (aiPanelState === 'closed') {
    setAiPanelState('normal');
  } else {
    setAiPanelState('closed');
  }
}

function setAiPanelState(state) {
  const panel  = document.getElementById('aiPanel');
  const maxBtn = document.getElementById('aiMaxBtn');
  const minBtn = document.getElementById('aiMinBtn');

  // Clear all state classes
  panel.classList.remove('open','minimised','maximised');
  aiPanelState = state;

  if (state === 'closed') {
    // hidden
  } else if (state === 'minimised') {
    panel.classList.add('open','minimised');
    // Clicking the header restores to normal
    document.getElementById('aiPanelHeader').onclick = () => setAiPanelState('normal');
    minBtn.style.display = 'none';
    // Update max button to show restore icon when minimised
    maxBtn.querySelector('svg').innerHTML = '<polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/>';
    maxBtn.title = 'Restore';
    maxBtn.onclick = () => setAiPanelState('normal');
  } else if (state === 'maximised') {
    panel.classList.add('open','maximised');
    document.getElementById('aiPanelHeader').onclick = null;
    minBtn.style.display = '';
    // Max button becomes restore
    maxBtn.querySelector('svg').innerHTML = '<polyline points="4 14 10 14 10 20"/><polyline points="20 10 14 10 14 4"/><line x1="10" y1="14" x2="21" y2="3"/><line x1="3" y1="21" x2="14" y2="10"/>';
    maxBtn.title = 'Restore';
    maxBtn.onclick = () => setAiPanelState('normal');
    document.getElementById('aiMessages').scrollTop = 9999;
  } else { // normal
    panel.classList.add('open');
    document.getElementById('aiPanelHeader').onclick = null;
    minBtn.style.display = '';
    // Restore max button to maximise icon
    maxBtn.querySelector('svg').innerHTML = '<rect x="4" y="4" width="16" height="16" rx="2"/>';
    maxBtn.title = 'Maximise';
    maxBtn.onclick = () => toggleAiMaximise();
    setTimeout(() => document.getElementById('aiInput').focus(), 100);
  }
}

function toggleAiMaximise() {
  if (aiPanelState === 'maximised') {
    setAiPanelState('normal');
  } else {
    setAiPanelState('maximised');
  }
}

function aiAutoResize(el) {
  el.style.height = 'auto';
  el.style.height = Math.min(el.scrollHeight, 100) + 'px';
}

function aiAskChip(btn) {
  const q = btn.textContent.trim();
  document.getElementById('aiInput').value = q;
  aiSend();
}

function aiClearChat() {
  aiHistory.length = 0;
  const msgs = document.getElementById('aiMessages');
  msgs.innerHTML = `
    <div class="ai-welcome" id="aiWelcome">
      <div class="ai-welcome-icon">✦</div>
      <div class="ai-welcome-title">Hi! I'm your Knowledge Assistant</div>
      <div class="ai-welcome-sub">Ask me anything — I'll search through your articles and give you a clear, step-by-step answer.</div>
      <div class="ai-welcome-chips">
        <button class="ai-chip" onclick="aiAskChip(this)">How do I onboard a new client?</button>
        <button class="ai-chip" onclick="aiAskChip(this)">What's the leave policy?</button>
        <button class="ai-chip" onclick="aiAskChip(this)">How do I set up my dev environment?</button>
        <button class="ai-chip" onclick="aiAskChip(this)">What are the API rate limits?</button>
      </div>
    </div>`;
  document.getElementById('aiClearBtn').style.display = 'none';
}

function aiAppendMsg(role, html) {
  const welcome = document.getElementById('aiWelcome');
  if (welcome) welcome.remove();
  document.getElementById('aiClearBtn').style.display = 'block';

  const msgs = document.getElementById('aiMessages');
  const isUser = role === 'user';
  const div = document.createElement('div');
  div.className = `ai-msg ${role}`;
  div.innerHTML = `
    <div class="ai-avatar-sm ${role}">${isUser ? '👤' : '✦'}</div>
    <div class="ai-msg-bubble">${html}</div>`;
  msgs.appendChild(div);
  msgs.scrollTop = msgs.scrollHeight;
  return div;
}

function aiShowTyping() {
  const welcome = document.getElementById('aiWelcome');
  if (welcome) welcome.remove();
  const msgs = document.getElementById('aiMessages');
  const div = document.createElement('div');
  div.className = 'ai-msg assistant';
  div.id = 'aiTyping';
  div.innerHTML = `<div class="ai-avatar-sm assistant">✦</div><div class="ai-typing"><span></span><span></span><span></span></div>`;
  msgs.appendChild(div);
  msgs.scrollTop = msgs.scrollHeight;
}

function aiRemoveTyping() {
  const t = document.getElementById('aiTyping');
  if (t) t.remove();
}

// Rich markdown → HTML renderer for AI responses
// ── Rich Markdown Renderer for AI responses ───────────────────────────────────
function inlineMd(raw) {
  // Helper: build article link HTML
  const artLink = (title, id) =>
    `<a class="ai-article-link" href="#" onclick="openArticleById(${parseInt(id)});return false;">📖 ${title}</a>`;

  return raw
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>')
    .replace(/\*(.+?)\*/g,'<em>$1</em>')
    .replace(/`([^`]+)`/g,'<code class="ai-code">$1</code>')
    // Article links — permissive, catches all formats the AI might produce:
    // [Title](#article-4)  [Title](article-4)  [Title](#4)  📖 [Title](#article-4)
    .replace(/📖\s*\[([^\]]+)\]\(#?article-(\d+)\)/g, (_,t,id)=> artLink(t,id))  // with emoji
    .replace(/\[([^\]]+)\]\(#article-(\d+)\)/g, (_,t,id)=> artLink(t,id))         // standard
    .replace(/\[([^\]]+)\]\(article-(\d+)\)/g, (_,t,id)=> artLink(t,id))          // no #
    .replace(/\[([^\]]+)\]\(#(\d+)\)/g, (_,t,id)=> artLink(t,id))                 // just #N
    // External URLs — markdown format [text](url)
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g,
      '<a href="$2" target="_blank" rel="noopener" class="ai-link">$1 ↗</a>')
    // Bare URLs — auto-link any raw https://... not already inside an <a href>
    .replace(/(^|\s)(https?:\/\/[^\s<>"]+)/g, (_, pre, url) => {
      url = url.replace(/[.,;:!?)>\]"']+$/, ''); // strip trailing punctuation
      return `${pre}<a href="${url}" target="_blank" rel="noopener" class="ai-link">${url} ↗</a>`;
    });
}

function aiMd(text) {
  const lines = text.split('\n');
  let html = '';
  let i = 0;
  let sourceLines = [];

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    // ── Collect source lines (📖 links) — render as a block at the end ──
    // Catch all formats: (#article-N), (article-N), (#N), plus 📖 emoji lines with links
    if (trimmed.match(/\(#?article-?\d+\)/) ||
        (trimmed.startsWith('📖') && trimmed.match(/\[.+?\]\(.+?\)/))) {
      sourceLines.push(trimmed);
      i++; continue;
    }

    // ── Markdown Table ──
    if (trimmed.startsWith('|') && lines[i+1] && lines[i+1].trim().match(/^\|[\s\-:|]+\|$/)) {
      const allHeaders = trimmed.split('|').slice(1,-1).map(h=>h.trim());
      i += 2;
      const allRows = [];
      while (i < lines.length && lines[i].trim().startsWith('|')) {
        allRows.push(lines[i].trim().split('|').slice(1,-1).map(c=>c.trim()));
        i++;
      }
      // Drop columns where every cell looks like a URL path (e.g. Route columns)
      const isUrlCol = idx => allHeaders[idx]?.match(/^(route|url|path|link)$/i) ||
        allRows.every(r => (r[idx]||'').match(/^https?:\/\/|^\//));
      const keepCols = allHeaders.map((_,idx) => !isUrlCol(idx));
      const headers = allHeaders.filter((_,idx) => keepCols[idx]);
      const rows = allRows.map(r => r.filter((_,idx) => keepCols[idx]));
      html += `<div class="ai-table-wrap"><table class="ai-table">
        <thead><tr>${headers.map(h=>`<th>${inlineMd(h)}</th>`).join('')}</tr></thead>
        <tbody>${rows.map(r=>`<tr>${r.map(c=>`<td>${inlineMd(c)}</td>`).join('')}</tr>`).join('')}</tbody>
      </table></div>`;
      continue;
    }

    // ── Headings ──
    if (trimmed.startsWith('### ')) { html+=`<div class="ai-h3">${inlineMd(trimmed.slice(4))}</div>`; i++; continue; }
    if (trimmed.startsWith('## '))  { html+=`<div class="ai-h2">${inlineMd(trimmed.slice(3))}</div>`; i++; continue; }
    if (trimmed.startsWith('# '))   { html+=`<div class="ai-h1">${inlineMd(trimmed.slice(2))}</div>`; i++; continue; }

    // ── Numbered steps (with circle indicators) ──
    if (/^\d+\.\s/.test(trimmed)) {
      let items = [], n = 1;
      while (i < lines.length && /^\d+\.\s/.test(lines[i].trim())) {
        items.push(`<li data-n="${n++}">${inlineMd(lines[i].trim().replace(/^\d+\.\s/,''))}</li>`);
        i++;
      }
      html += `<ol class="ai-ol">${items.join('')}</ol>`;
      continue;
    }

    // ── Bullet list ──
    if (/^[-*•]\s/.test(trimmed)) {
      let items = [];
      while (i < lines.length && /^[-*•]\s/.test(lines[i].trim())) {
        items.push(`<li>${inlineMd(lines[i].trim().replace(/^[-*•]\s/,''))}</li>`);
        i++;
      }
      html += `<ul class="ai-ul">${items.join('')}</ul>`;
      continue;
    }

    // ── Tip / warning callout (lines starting with 💡 or ⚠️) ──
    if (trimmed.startsWith('💡')) {
      html+=`<div class="ai-callout ai-callout-tip"><span>💡</span><span>${inlineMd(trimmed.slice(2).trim())}</span></div>`;
      i++; continue;
    }
    if (trimmed.startsWith('⚠️')) {
      html+=`<div class="ai-callout ai-callout-warn"><span>⚠️</span><span>${inlineMd(trimmed.slice(2).trim())}</span></div>`;
      i++; continue;
    }
    if (trimmed.startsWith('ℹ️') || trimmed.startsWith('📌')) {
      html+=`<div class="ai-callout ai-callout-info"><span>${trimmed[0]}</span><span>${inlineMd(trimmed.slice(2).trim())}</span></div>`;
      i++; continue;
    }

    // ── Horizontal rule ──
    if (/^[-─━]{3,}$/.test(trimmed)) { html+='<hr style="border:none;border-top:1px solid rgba(255,255,255,.08);margin:8px 0">'; i++; continue; }

    // ── Blank line ──
    if (trimmed === '') { html+='<div class="ai-spacer"></div>'; i++; continue; }

    // ── Regular paragraph ──
    html += `<p class="ai-p">${inlineMd(trimmed)}</p>`;
    i++;
  }

  // ── Render collected sources at the bottom ──
  if (sourceLines.length) {
    const artLink = (title, id) =>
      `<a class="ai-article-link" href="#" onclick="openArticleById(${parseInt(id)});return false;">📖 ${title}</a>`;

    const links = sourceLines.map(line =>
      line
        .replace(/📖\s*\[([^\]]+)\]\(#?article-(\d+)\)/g, (_,t,id)=> artLink(t,id))
        .replace(/\[([^\]]+)\]\(#article-(\d+)\)/g,        (_,t,id)=> artLink(t,id))
        .replace(/\[([^\]]+)\]\(article-(\d+)\)/g,         (_,t,id)=> artLink(t,id))
        .replace(/\[([^\]]+)\]\(#(\d+)\)/g,                (_,t,id)=> artLink(t,id))
    ).join(' ');
    html += `<div class="ai-sources"><div class="ai-sources-label">Sources</div>${links}</div>`;
  }

  return html;
}

function openArticleById(id) {
  const numId = parseInt(id);
  const a = allArticles.find(x => x.id === numId);
  if (a) {
    openViewModal(a);
  } else {
    fetch(`/api/articles/${numId}`)
      .then(r => r.json())
      .then(art => { if (art && art.id) openViewModal(art); });
  }
}

async function aiSend() {
  if (aiStreaming) return;
  const input = document.getElementById('aiInput');
  const question = input.value.trim();
  if (!question) return;

  input.value = '';
  input.style.height = 'auto';
  aiStreaming = true;
  document.getElementById('aiSendBtn').disabled = true;

  // Add user message
  aiAppendMsg('user', aiMd(question));
  aiHistory.push({ role: 'user', content: question });
  aiShowTyping();

  try {
    // Build roadmap payload with any saved dates
    const roadmapPayload = ROADMAP_DATA.map((topic, ti) => ({
      topic: topic.name,
      articles: topic.articles.map((a, ai) => ({
        title: a.title,
        owner: a.owner,
        date: rmDates[`${ti}-${ai}`] || 'TBD'
      }))
    }));

    // Ensure skill matrix data is loaded
    if (!smData) {
      try {
        const sr = await fetch('/api/skillmatrix');
        smData = await sr.json();
      } catch(e) { smData = { employees:[], processAreas:[], currentScores:{}, snapshots:[] }; }
    }

    // Build skill matrix payload
    let skillMatrixPayload = null;
    if (smData && smData.employees && smData.employees.length) {
      const SM_LVL = ['Unassessed','Beginner','Intermediate','Advanced','Expert'];
      skillMatrixPayload = {
        employees: smData.employees,
        processAreas: smData.processAreas,
        scores: smData.currentScores,
        snapshots: smData.snapshots.map(s => ({
          label: s.label,
          date: s.date,
          // compact: avg score per employee in this snapshot
          employeeAvgs: smData.employees.map(e => {
            const sc = s.scores[e] || {};
            const vals = smData.processAreas.map(pa => sc[pa]||0).filter(v=>v>0);
            return { name: e, avg: vals.length ? +(vals.reduce((a,b)=>a+b,0)/vals.length).toFixed(2) : 0 };
          })
        }))
      };
    }

    const resp = await fetch('/api/ask', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question, history: aiHistory.slice(0, -1), roadmap: roadmapPayload, skillMatrix: skillMatrixPayload })
    });

    aiRemoveTyping();

    if (!resp.ok) {
      const err = await resp.json().catch(()=>({error:'Unknown error'}));
      aiAppendMsg('assistant', `<span style="color:var(--danger)">⚠ ${err.error || 'Something went wrong.'}</span>`);
      aiStreaming = false;
      document.getElementById('aiSendBtn').disabled = false;
      return;
    }

    // Stream SSE
    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    let assistantText = '';
    let msgDiv = null;
    let bubbleEl = null;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split('\n');
      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        let evt;
        try { evt = JSON.parse(line.slice(6)); } catch { continue; }
        if (evt.type === 'text') {
          assistantText += evt.text;
          if (!msgDiv) {
            // Create the assistant bubble on first text
            const welcome = document.getElementById('aiWelcome');
            if (welcome) welcome.remove();
            document.getElementById('aiClearBtn').style.display = 'block';
            const msgs = document.getElementById('aiMessages');
            msgDiv = document.createElement('div');
            msgDiv.className = 'ai-msg assistant';
            msgDiv.innerHTML = `<div class="ai-avatar-sm assistant">✦</div><div class="ai-msg-bubble"></div>`;
            msgs.appendChild(msgDiv);
            bubbleEl = msgDiv.querySelector('.ai-msg-bubble');
          }
          bubbleEl.innerHTML = aiMd(assistantText);
          document.getElementById('aiMessages').scrollTop = document.getElementById('aiMessages').scrollHeight;
        } else if (evt.type === 'done') {
          aiHistory.push({ role: 'assistant', content: assistantText });
        } else if (evt.type === 'error') {
          if (!msgDiv) aiAppendMsg('assistant', `<span style="color:var(--danger)">⚠ ${evt.message}</span>`);
        }
      }
    }
  } catch (err) {
    aiRemoveTyping();
    aiAppendMsg('assistant', `<span style="color:var(--danger)">⚠ Could not reach the AI assistant. Make sure the server is running.</span>`);
  }

  aiStreaming = false;
  document.getElementById('aiSendBtn').disabled = false;
  setTimeout(() => document.getElementById('aiInput').focus(), 100);
}

// ══════════════════════════════════════════════════════════════════════════════
// SKILL MATRIX
// ══════════════════════════════════════════════════════════════════════════════
// Register Chart.js datalabels plugin
if (typeof ChartDataLabels !== 'undefined') Chart.register(ChartDataLabels);

let smData = null;
let smSaveTimer = null;
let smCharts = {};

const SM_LEVELS = ['', 'Beginner', 'Intermediate', 'Advanced', 'Expert'];
const SM_COLORS = { 0:'var(--muted)', 1:'#e87a7a', 2:'#f9a74f', 3:'#7ae8b4', 4:'#00c8cc' };

function smScoreToStatus(avg) {
  if (!avg || avg === 0) return { label:'No Data', cls:'lv-0' };
  if (avg <= 1.5) return { label:'Beginner',     cls:'lv-1' };
  if (avg <= 2.5) return { label:'Intermediate', cls:'lv-2' };
  if (avg <= 3.5) return { label:'Advanced',     cls:'lv-3' };
  return            { label:'Expert',        cls:'lv-4' };
}

// ── Navigation ────────────────────────────────────────────────────────────────
async function showSkillMatrix() {
  document.getElementById('smOverlay').classList.add('active');
  document.querySelector('.main').style.display = 'none';
  const tb = document.getElementById('topbarSkillBtn');
  if (tb) { tb.style.color='#e8c97a'; tb.style.background='rgba(232,201,122,.1)'; }
  await smLoad();
}

function hideSkillMatrix() {
  document.getElementById('smOverlay').classList.remove('active');
  document.querySelector('.main').style.display = '';
  const tb = document.getElementById('topbarSkillBtn');
  if (tb) { tb.style.color=''; tb.style.background=''; }
  smDestroyCharts();
}

function smSwitchTab(tab, noHistory) {
  if(!noHistory && !_dwNavFlag) history.pushState({screen:'skillmatrix', tab}, '');
  document.getElementById('smPanelAssess').classList.toggle('active', tab==='assess');
  document.getElementById('smPanelDash').classList.toggle('active', tab==='dashboard');
  const auditPanel = document.getElementById('smPanelAudit');
  if (auditPanel) auditPanel.classList.toggle('active', tab==='audit');
  document.getElementById('smTabAssess').classList.toggle('active', tab==='assess');
  document.getElementById('smTabDash').classList.toggle('active', tab==='dashboard');
  const auditTabEl = document.getElementById('smTabAudit');
  if (auditTabEl) auditTabEl.classList.toggle('active', tab==='audit');
  if (tab==='dashboard') smRenderDashboard();
  if (tab==='audit') smRenderAuditLog();
}

// ── Load & Render ─────────────────────────────────────────────────────────────
async function smLoad() {
  try {
    const r = await fetch('/api/skillmatrix');
    smData = await r.json();
  } catch(e) {
    smData = { employees:[], processAreas:[], currentScores:{}, snapshots:[], nextSnapshotId:1 };
  }
  smRender();
}

function smRender() {
  const isAdmin = !!getAdminPwd();
  document.getElementById('smCaptureBtn').style.display = isAdmin ? '' : 'none';
  const auditTab = document.getElementById('smTabAudit');
  if (auditTab) auditTab.style.display = isAdmin ? '' : 'none';
  smRenderGrid();
}

// ── Self-Assessment Grid ──────────────────────────────────────────────────────
function smRenderGrid() {
  const wrap = document.getElementById('smAssessContent');
  const { employees, processAreas, currentScores, snapshots } = smData;

  if (!employees.length || !processAreas.length) {
    wrap.innerHTML = '<div class="sm-empty">No employees or process areas configured yet.<br>Go to <strong>Admin Panel → 📈 Skill Matrix</strong> to add them.</div>';
    return;
  }

  // Use the most recent snapshot as baseline for progress comparison
  const prevSnap = snapshots && snapshots.length ? snapshots[snapshots.length - 1] : null;
  const prevScores = prevSnap ? (prevSnap.scores || {}) : null;
  const hasHistory = !!prevScores;

  let html = '<div class="sm-table-wrap"><table class="sm-table"><thead><tr>';
  html += '<th>Employee Name</th>';
  processAreas.forEach(pa => { html += `<th>${pa}</th>`; });
  html += '<th>Avg Score</th><th>Status</th></tr></thead><tbody>';

  employees.forEach(emp => {
    const scores = currentScores[emp] || {};
    let total = 0, count = 0;
    processAreas.forEach(pa => { const v=scores[pa]||0; if(v>0){total+=v;count++;} });
    const avg = count ? (total/count) : 0;
    const status = smScoreToStatus(avg);

    html += `<tr><td>${emp}</td>`;
    processAreas.forEach(pa => {
      const v = scores[pa] || 0;
      // Progress arrow: compare current vs last snapshot
      let arrowHtml = '<span class="sm-arrow"></span>';
      if (hasHistory) {
        const prev = (prevScores[emp] || {})[pa] || 0;
        const diff = v - prev;
        if (diff > 0)            arrowHtml = `<span class="sm-arrow sm-arr-up">↑</span>`;
        else if (diff < 0)       arrowHtml = `<span class="sm-arrow sm-arr-dn">↓</span>`;
        else if (prev>0||v>0)    arrowHtml = `<span class="sm-arrow sm-arr-eq">→</span>`;
      }
      const empEsc = emp.replace(/'/g,"\\'"); const paEsc = pa.replace(/'/g,"\\'");
      html += `<td><div style="display:flex;align-items:center;gap:4px;"><select class="sm-select lv-${v}" onchange="smSetScore('${empEsc}','${paEsc}',this.value,this)">`;
      html += `<option value="0"${v===0?' selected':''}>—</option>`;
      SM_LEVELS.slice(1).forEach((lv,i) => {
        html += `<option value="${i+1}"${v===i+1?' selected':''}>${lv}</option>`;
      });
      html += `</select>${arrowHtml}</div></td>`;
    });
    html += `<td class="${avg?'lv-'+(smScoreToStatus(avg).cls.slice(3)||'0'):'lv-0'}" style="font-weight:600;">${avg?avg.toFixed(1):'—'}</td>`;
    html += `<td class="${status.cls}">${status.label}</td></tr>`;
  });

  html += '</tbody><tfoot>';

  // Team Average row
  html += '<tr><td>TEAM AVERAGE</td>';
  processAreas.forEach(pa => {
    let tot=0,cnt=0;
    employees.forEach(emp => { const v=(currentScores[emp]||{})[pa]||0; if(v>0){tot+=v;cnt++;} });
    const avg = cnt ? (tot/cnt) : 0;
    const st = smScoreToStatus(avg);
    html += `<td class="${st.cls}">${avg?avg.toFixed(1):'—'}</td>`;
  });
  html += '<td></td><td></td></tr>';

  // PA Status row
  html += '<tr><td>PA STATUS</td>';
  processAreas.forEach(pa => {
    let tot=0,cnt=0;
    employees.forEach(emp => { const v=(currentScores[emp]||{})[pa]||0; if(v>0){tot+=v;cnt++;} });
    const avg = cnt ? (tot/cnt) : 0;
    const st = smScoreToStatus(avg);
    html += `<td class="${st.cls}">${st.label}</td>`;
  });
  html += '<td></td><td></td></tr>';

  html += '</tfoot></table></div>';
  wrap.innerHTML = html;
}

function smSetScore(emp, pa, val, sel) {
  if (!smData.currentScores[emp]) smData.currentScores[emp] = {};
  const oldVal = smData.currentScores[emp][pa] || 0;
  const newVal = parseInt(val);
  smData.currentScores[emp][pa] = newVal;
  smLogScoreChange(emp, pa, oldVal, newVal);
  sel.className = `sm-select lv-${val}`;
  // Update progress arrow inline
  const arrow = sel.parentElement && sel.parentElement.querySelector('.sm-arrow');
  if (arrow && smData.snapshots && smData.snapshots.length) {
    const prevSnap = smData.snapshots[smData.snapshots.length - 1];
    const prev = ((prevSnap.scores || {})[emp] || {})[pa] || 0;
    const cur = parseInt(val);
    const diff = cur - prev;
    if (diff > 0)           { arrow.className='sm-arrow sm-arr-up'; arrow.textContent='↑'; }
    else if (diff < 0)      { arrow.className='sm-arrow sm-arr-dn'; arrow.textContent='↓'; }
    else if (prev>0||cur>0) { arrow.className='sm-arrow sm-arr-eq'; arrow.textContent='→'; }
    else                    { arrow.className='sm-arrow'; arrow.textContent=''; }
  }
  // Recalculate avg & status for this row inline
  smUpdateRowStats(emp);
  smUpdateFooter();
  // Debounce auto-save
  clearTimeout(smSaveTimer);
  smSaveTimer = setTimeout(smAutoSave, 1500);
}

function smUpdateRowStats(emp) {
  const { processAreas, currentScores } = smData;
  const scores = currentScores[emp] || {};
  let tot=0,cnt=0;
  processAreas.forEach(pa => { const v=scores[pa]||0; if(v>0){tot+=v;cnt++;} });
  const avg = cnt ? tot/cnt : 0;
  const st = smScoreToStatus(avg);
  // Update the last two cells of this employee's row
  const rows = document.querySelectorAll('.sm-table tbody tr');
  rows.forEach(row => {
    if (row.cells[0] && row.cells[0].textContent === emp) {
      const n = row.cells.length;
      row.cells[n-2].className = st.cls;
      row.cells[n-2].textContent = avg ? avg.toFixed(1) : '—';
      row.cells[n-1].className = st.cls;
      row.cells[n-1].textContent = st.label;
    }
  });
}

function smUpdateFooter() {
  const { employees, processAreas, currentScores } = smData;
  const frows = document.querySelectorAll('.sm-table tfoot tr');
  if (!frows.length) return;
  const avgRow = frows[0], stRow = frows[1];
  processAreas.forEach((pa, i) => {
    let tot=0,cnt=0;
    employees.forEach(emp => { const v=(currentScores[emp]||{})[pa]||0; if(v>0){tot+=v;cnt++;} });
    const avg = cnt ? tot/cnt : 0;
    const st = smScoreToStatus(avg);
    if (avgRow.cells[i+1]) { avgRow.cells[i+1].className=st.cls; avgRow.cells[i+1].textContent=avg?avg.toFixed(1):'—'; }
    if (stRow.cells[i+1])  { stRow.cells[i+1].className=st.cls;  stRow.cells[i+1].textContent=st.label; }
  });
}

async function smAutoSave() {
  try {
    await fetch('/api/skillmatrix/scores', {
      method:'PUT', headers:{'Content-Type':'application/json',...adminHeaders()},
      body: JSON.stringify({ scores: smData.currentScores })
    });
  } catch(e) {}
}

async function smCaptureSnapshot() {
  const label = prompt('Snapshot name (e.g. "May 2026"):');
  if (!label) return;
  try {
    const r = await fetch('/api/skillmatrix/snapshots', {
      method:'POST', headers:{'Content-Type':'application/json',...adminHeaders()},
      body: JSON.stringify({ label })
    });
    const snap = await r.json();
    smData.snapshots.push(snap);
    smLogSnapshot(label, smData.employees.length, smData.processAreas.length);
    smRenderGrid(); // refresh arrows against new baseline
    showToast(`Snapshot "${label}" captured!`);
  } catch(e) { showToast('Failed to capture snapshot'); }
}

// ── Audit Log ─────────────────────────────────────────────────────────────────
const SM_LEVEL_LABELS = {0:'None',1:'Beginner',2:'Intermediate',3:'Advanced',4:'Expert'};
const SM_AUDIT_KEY = 'kb_sm_audit_log';
const SM_AUDIT_MAX = 2000;

function smAuditGet() {
  try { return JSON.parse(localStorage.getItem(SM_AUDIT_KEY)||'[]'); } catch(e) { return []; }
}

function smAuditPush(entry) {
  const log = smAuditGet();
  log.push({ id: Date.now() + Math.random(), ...entry });
  if (log.length > SM_AUDIT_MAX) log.splice(0, log.length - SM_AUDIT_MAX);
  localStorage.setItem(SM_AUDIT_KEY, JSON.stringify(log));
}

function smLogScoreChange(emp, pa, oldVal, newVal) {
  const u = getUser();
  const diff = newVal - oldVal;
  smAuditPush({
    ts: new Date().toISOString(),
    action: 'SCORE_UPDATE',
    changedBy: u?.name || 'Unknown',
    isAdmin: !!getAdminPwd(),
    employee: emp,
    processArea: pa,
    oldScore: oldVal,
    oldLevel: SM_LEVEL_LABELS[oldVal] || 'None',
    newScore: newVal,
    newLevel: SM_LEVEL_LABELS[newVal] || 'None',
    direction: diff > 0 ? 'IMPROVED' : diff < 0 ? 'DECLINED' : 'NO CHANGE',
    notes: ''
  });
}

function smLogSnapshot(label, numEmployees, numPAs) {
  const u = getUser();
  smAuditPush({
    ts: new Date().toISOString(),
    action: 'SNAPSHOT',
    changedBy: u?.name || 'Unknown',
    isAdmin: true,
    employee: '—',
    processArea: '—',
    oldScore: null, oldLevel: '—',
    newScore: null, newLevel: '—',
    direction: '—',
    notes: `"${label}" — ${numEmployees} members, ${numPAs} process areas`
  });
}

function smRenderAuditLog() {
  const wrap = document.getElementById('smAuditContent');
  if (!wrap) return;
  const fullLog = smAuditGet().slice().reverse();

  const fEmp    = document.getElementById('smAuFEmp')?.value    || '';
  const fAction = document.getElementById('smAuFAction')?.value || '';
  const fDate   = document.getElementById('smAuFDate')?.value   || '';

  let filtered = fullLog;
  if (fEmp)    filtered = filtered.filter(e => e.employee === fEmp);
  if (fAction) filtered = filtered.filter(e => e.action   === fAction);
  if (fDate)   filtered = filtered.filter(e => e.ts && e.ts.startsWith(fDate));

  const today   = new Date().toISOString().slice(0,10);
  const weekAgo = new Date(Date.now() - 7*24*3600*1000).toISOString();
  const todayCnt  = fullLog.filter(e => e.ts?.startsWith(today)).length;
  const weekCnt   = fullLog.filter(e => e.ts > weekAgo).length;
  const editors   = [...new Set(fullLog.map(e => e.changedBy))].length;
  const snapsCnt  = fullLog.filter(e => e.action === 'SNAPSHOT').length;
  const employees = smData?.employees || [];
  const hasFilter = fEmp || fAction || fDate;

  wrap.innerHTML = `
  <div class="sm-audit-bar">
    <select class="sm-audit-filter" id="smAuFEmp" onchange="smRenderAuditLog()">
      <option value="">All Employees</option>
      ${employees.map(e=>`<option value="${e}" ${fEmp===e?'selected':''}>${e}</option>`).join('')}
    </select>
    <select class="sm-audit-filter" id="smAuFAction" onchange="smRenderAuditLog()">
      <option value="">All Actions</option>
      <option value="SCORE_UPDATE" ${fAction==='SCORE_UPDATE'?'selected':''}>Score Updates</option>
      <option value="SNAPSHOT"     ${fAction==='SNAPSHOT'?'selected':''}>Snapshots</option>
    </select>
    <input type="date" class="sm-audit-filter" id="smAuFDate" value="${fDate}" onchange="smRenderAuditLog()" style="cursor:pointer;">
    ${hasFilter ? `<button class="sm-audit-clear" onclick="smAuditClearFilters()">✕ Clear filters</button>` : ''}
    <button class="sm-audit-dl-btn" onclick="smDownloadAuditCSV()">⬇ Download CSV</button>
  </div>
  <div class="sm-audit-stats">
    <div class="sm-audit-stat"><strong>${fullLog.length}</strong><span>Total Entries</span></div>
    <div class="sm-audit-stat"><strong>${todayCnt}</strong><span>Today</span></div>
    <div class="sm-audit-stat"><strong>${weekCnt}</strong><span>This Week</span></div>
    <div class="sm-audit-stat"><strong>${editors}</strong><span>Contributors</span></div>
    <div class="sm-audit-stat"><strong>${snapsCnt}</strong><span>Snapshots</span></div>
    ${hasFilter ? `<div class="sm-audit-stat" style="border-color:rgba(232,201,122,.3);"><strong style="color:#e8c97a;">${filtered.length}</strong><span>Filtered</span></div>` : ''}
  </div>
  <div class="sm-audit-table-wrap">
    ${filtered.length === 0
      ? `<div class="sm-audit-empty">
           <div class="sm-audit-empty-icon">📋</div>
           <div style="font-size:15px;font-weight:600;margin-bottom:8px;">${hasFilter ? 'No entries match your filters' : 'No audit entries yet'}</div>
           <div style="font-size:13px;opacity:.5;">${hasFilter ? 'Try adjusting or clearing your filters.' : 'Score changes and snapshot captures will appear here automatically.'}</div>
         </div>`
      : `<table class="sm-audit-table">
          <thead><tr>
            <th>#</th><th>Timestamp</th><th>Action</th><th>Changed By</th><th>Role</th>
            <th>Employee</th><th>Process Area</th><th>Old Level</th><th>New Level</th><th>Change</th><th>Notes</th>
          </tr></thead>
          <tbody>${filtered.map((e,i) => {
            const dt = new Date(e.ts);
            const dateStr = dt.toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'});
            const timeStr = dt.toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit',second:'2-digit'});
            const dc = e.action==='SNAPSHOT'?'snap':e.direction==='IMPROVED'?'up':e.direction==='DECLINED'?'dn':'eq';
            const dl = e.action==='SNAPSHOT'?'📸 SNAPSHOT':e.direction==='IMPROVED'?'↑ IMPROVED':e.direction==='DECLINED'?'↓ DECLINED':'→ NO CHANGE';
            const lvColour = lv => lv==='Expert'?'#e8c97a':lv==='Advanced'?'#a78bfa':lv==='Intermediate'?'#f59e0b':lv==='Beginner'?'rgba(232,232,240,.55)':'rgba(232,232,240,.25)';
            return `<tr>
              <td class="sm-audit-mono" style="color:var(--muted);">${filtered.length-i}</td>
              <td class="sm-audit-mono" style="white-space:nowrap;"><div>${dateStr}</div><div style="opacity:.4;">${timeStr}</div></td>
              <td><span class="sm-audit-badge ${dc}" style="font-size:9px;">${e.action}</span></td>
              <td style="font-weight:600;">${e.changedBy||'—'}</td>
              <td>${e.isAdmin?`<span style="color:#e8c97a;font-family:'DM Mono',monospace;font-size:10px;">⚙ ADMIN</span>`:`<span style="color:var(--muted);font-family:'DM Mono',monospace;font-size:10px;">👤 USER</span>`}</td>
              <td style="font-weight:500;">${e.employee||'—'}</td>
              <td style="color:rgba(232,232,240,.55);font-size:12px;">${e.processArea||'—'}</td>
              <td><span style="color:${lvColour(e.oldLevel)};font-weight:600;">${e.oldLevel||'—'}</span></td>
              <td><span style="color:${lvColour(e.newLevel)};font-weight:600;">${e.newLevel||'—'}</span></td>
              <td><span class="sm-audit-badge ${dc}">${dl}</span></td>
              <td style="font-size:11px;color:var(--muted);max-width:180px;">${e.notes||'—'}</td>
            </tr>`;
          }).join('')}</tbody>
        </table>`
    }
  </div>`;
}

function smAuditClearFilters() {
  const e = document.getElementById('smAuFEmp');
  const a = document.getElementById('smAuFAction');
  const d = document.getElementById('smAuFDate');
  if (e) e.value=''; if (a) a.value=''; if (d) d.value='';
  smRenderAuditLog();
}

function smDownloadAuditCSV() {
  const log = smAuditGet().slice().reverse();
  if (!log.length) { showToast('No audit log entries to download', 'info'); return; }
  const HEADERS = [
    'Entry #','Timestamp (ISO)','Date','Time (Local)',
    'Action','Changed By','Role',
    'Employee','Process Area',
    'Old Score','Old Level','New Score','New Level',
    'Change Direction','Notes'
  ];
  const cell = v => '"' + String(v==null?'':v).replace(/"/g,'""') + '"';
  const rows = log.map((e,i) => {
    const dt = new Date(e.ts);
    return [
      log.length-i, e.ts||'',
      dt.toLocaleDateString('en-GB'), dt.toLocaleTimeString('en-GB'),
      e.action||'', e.changedBy||'', e.isAdmin?'Admin':'User',
      e.employee!=='—'?e.employee:'', e.processArea!=='—'?e.processArea:'',
      e.oldScore!=null?e.oldScore:'', e.oldLevel!=='—'?e.oldLevel:'',
      e.newScore!=null?e.newScore:'', e.newLevel!=='—'?e.newLevel:'',
      e.direction!=='—'?e.direction:'', e.notes||''
    ].map(cell).join(',');
  });
  const csv = [HEADERS.join(','), ...rows].join('\r\n');
  const blob = new Blob(['﻿'+csv], {type:'text/csv;charset=utf-8;'}); // BOM for Google Sheets / Excel
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href=url; a.download=`skill_matrix_audit_${new Date().toISOString().slice(0,10)}.csv`;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showToast('Audit log downloaded ✓ — open in Google Sheets or Excel', 'success');
}

// ── Dashboard ─────────────────────────────────────────────────────────────────
function smDestroyCharts() {
  Object.values(smCharts).forEach(c => { try{c.destroy();}catch(_){} });
  smCharts = {};
}

function smRenderDashboard() {
  const wrap = document.getElementById('smDashContent');
  const { employees, processAreas, currentScores, snapshots } = smData;

  if (!employees.length || !processAreas.length) {
    wrap.innerHTML = smViewToggle('team') + '<div class="sm-empty">No data yet. Add employees and process areas in the Admin Panel.</div>';
    return;
  }

  smDestroyCharts();

  // Build snapshot options
  const snapOpts = snapshots.map(s => `<option value="${s.id}">${s.label} (${new Date(s.date).toLocaleDateString()})</option>`).join('');
  const snap1 = snapshots[snapshots.length-1];
  const snap2 = snapshots.length>=2 ? snapshots[snapshots.length-2] : null;

  // KPIs from current scores
  let allScores=[], expertCount=0, totalCount=0;
  employees.forEach(emp => {
    processAreas.forEach(pa => {
      const v=(currentScores[emp]||{})[pa]||0;
      if(v>0){ allScores.push(v); totalCount++; if(v===4) expertCount++; }
    });
  });
  const teamAvg = allScores.length ? (allScores.reduce((a,b)=>a+b,0)/allScores.length).toFixed(2) : '—';
  const expertRate = totalCount ? Math.round(expertCount/totalCount*100)+'%' : '—';
  const filledEmps = employees.filter(e => processAreas.some(pa => (currentScores[e]||{})[pa]>0)).length;

  wrap.innerHTML = `
    ${smViewToggle('team')}
    <div class="sm-kpi-row">
      <div class="sm-kpi"><div class="sm-kpi-val">${teamAvg}</div><div class="sm-kpi-lbl">Team Avg Score</div></div>
      <div class="sm-kpi"><div class="sm-kpi-val">${expertRate}</div><div class="sm-kpi-lbl">Expert Rate</div></div>
      <div class="sm-kpi"><div class="sm-kpi-val">${filledEmps}/${employees.length}</div><div class="sm-kpi-lbl">Assessed</div></div>
      <div class="sm-kpi"><div class="sm-kpi-val">${snapshots.length}</div><div class="sm-kpi-lbl">Snapshots</div></div>
    </div>
    <div class="sm-chart-grid">
      <div class="sm-chart-card full"><div class="sm-chart-title">Team Average per Process Area (Current)</div><canvas id="smChartPA" style="max-height:220px;"></canvas></div>
      <div class="sm-chart-card full">
        <div class="sm-chart-title">Period-over-Period Comparison
          <span style="float:right;display:flex;gap:8px;">
            <select class="sm-snap-sel" id="smSnap1Sel" onchange="smRenderComparison()">${snapOpts}</select>
            <select class="sm-snap-sel" id="smSnap2Sel" onchange="smRenderComparison()">${snapOpts}</select>
          </span>
        </div>
        <canvas id="smChartCompare" style="max-height:220px;"></canvas>
        ${getAdminPwd() ? `<div style="margin-top:16px;border-top:1px solid var(--border);padding-top:14px;">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">
            <div style="font-size:12px;font-weight:600;color:var(--muted);text-transform:uppercase;letter-spacing:.06em;">🗂 Manage Snapshots</div>
            <button onclick="smCaptureSnapshot()" style="background:#e8c97a;color:#0f0f13;border:none;border-radius:8px;padding:7px 16px;font-family:'DM Mono',monospace;font-size:11px;font-weight:700;letter-spacing:.08em;cursor:pointer;">+ CAPTURE NEW SNAPSHOT</button>
          </div>
          <div style="display:flex;flex-direction:column;gap:6px;max-height:180px;overflow-y:auto;">
            ${smData.snapshots.length ? smData.snapshots.map(s=>`
              <div style="display:flex;align-items:center;justify-content:space-between;background:var(--surface2);border-radius:8px;padding:8px 12px;">
                <div>
                  <div style="font-size:13px;font-weight:500;color:var(--text);">${s.label}</div>
                  <div style="font-size:11px;color:var(--muted);">${new Date(s.date).toLocaleDateString()}</div>
                </div>
                <button onclick="smAdmDelSnap(${s.id})" style="background:rgba(232,122,122,0.15);border:1px solid rgba(232,122,122,0.3);color:#e87a7a;border-radius:6px;padding:4px 10px;font-size:12px;cursor:pointer;">✕ Remove</button>
              </div>`).join('') : '<div style="color:var(--muted);font-size:13px;">No snapshots yet.</div>'}
          </div>
        </div>` : ''}
      </div>
      <div class="sm-chart-card">
        <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:6px;margin-bottom:10px;">
          <div class="sm-chart-title" style="margin-bottom:0;">Score Distribution</div>
          <div style="display:flex;gap:6px;flex-wrap:wrap;">
            <select class="sm-snap-sel" id="smDistSnap1Sel" onchange="smRenderDist()"><option value="current">Current</option>${snapOpts}</select>
            <select class="sm-snap-sel" id="smDistSnap2Sel" onchange="smRenderDist()"><option value="">vs Period…</option>${snapOpts}</select>
          </div>
        </div>
        <canvas id="smChartDist" style="max-height:200px;"></canvas>
      </div>
      <div class="sm-chart-card">
        <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:6px;margin-bottom:10px;">
          <div class="sm-chart-title" style="margin-bottom:0;">Employee Avg Scores</div>
          <select class="sm-snap-sel" id="smEmpSnapSel" onchange="smRenderEmp()"><option value="current">Current</option>${snapOpts}</select>
        </div>
        <canvas id="smChartEmp" style="max-height:200px;"></canvas>
      </div>
      <div class="sm-chart-card full"><div class="sm-chart-title">Team Skill Trend Over Time</div><canvas id="smChartTrend" style="max-height:200px;"></canvas><div id="smTrendEmpty" style="display:none;" class="sm-empty" style="padding:20px 0;font-size:13px;"></div></div>
      <div class="sm-chart-card full"><div class="sm-chart-title">Coverage Risk by Process Area <span style="font-size:11px;color:var(--muted);font-weight:400;margin-left:8px;">— how many employees at each level per skill</span></div><canvas id="smChartCoverage" style="max-height:240px;"></canvas></div>
      <div class="sm-chart-card full">
        <div class="sm-chart-title">Skill Heatmap <span style="font-size:11px;color:var(--muted);font-weight:400;margin-left:8px;">— B=Beginner · I=Intermediate · A=Advanced · E=Expert</span></div>
        <div id="smHeatmapWrap" style="overflow-x:auto;margin-top:8px;"></div>
      </div>
    </div>`;

  // Set default snapshot selections
  if (snapshots.length >= 2) {
    document.getElementById('smSnap1Sel').value = snap2.id;
    document.getElementById('smSnap2Sel').value = snap1.id;
  }

  const chartOpts = () => ({
    responsive:true,
    plugins:{
      legend:{display:false},
      tooltip:{callbacks:{label:c=>`${SM_LEVELS[Math.round(c.parsed.y||c.parsed)]||c.parsed.y||c.parsed}`}},
      datalabels:{
        anchor:'end', align:'top', color:'#e8e8f0',
        font:{size:11, weight:'600'},
        formatter: v => v > 0 ? v.toFixed(1) : ''
      }
    },
    scales:{
      y:{ beginAtZero:true, max:4.5, ticks:{ color:'#7a7a96', callback:v=>SM_LEVELS[v]||'' }, grid:{color:'#2a2a38'} },
      x:{ ticks:{ color:'#7a7a96', maxRotation:0, minRotation:0, align:'center', autoSkip:false, callback: function(val,i){ const lbl=this.getLabelForValue(val); return lbl.length>14 ? lbl.slice(0,13)+'…' : lbl; } }, grid:{color:'#2a2a38'} }
    }
  });

  // Chart 1: Team avg per PA
  const paAvgs = processAreas.map(pa => {
    let tot=0,cnt=0;
    employees.forEach(emp=>{const v=(currentScores[emp]||{})[pa]||0;if(v>0){tot+=v;cnt++;}});
    return cnt?+(tot/cnt).toFixed(2):0;
  });
  smCharts.pa = new Chart(document.getElementById('smChartPA'), {
    type:'bar',
    data:{ labels:processAreas, datasets:[{ data:paAvgs, backgroundColor:paAvgs.map(v=>SM_COLORS[Math.round(v)]||'#7a7a96'), borderRadius:5 }] },
    options: chartOpts()
  });

  // Chart 3 & 4: rendered by dedicated functions so dropdowns can re-trigger them
  smRenderDist();
  smRenderEmp();

  smRenderComparison();

  // Team Skill Trend
  const trendLabels = [...snapshots.map(s=>s.label), 'Current'];
  const trendScores = [...snapshots.map(s => {
    let tot=0,cnt=0;
    employees.forEach(e=>processAreas.forEach(pa=>{const v=(s.scores[e]||{})[pa]||0;if(v>0){tot+=v;cnt++;}}));
    return cnt?+(tot/cnt).toFixed(2):0;
  }), +(+teamAvg)||0];
  if (snapshots.length > 0) {
    smCharts.trend = new Chart(document.getElementById('smChartTrend'), {
      type:'line',
      data:{ labels:trendLabels, datasets:[{ label:'Team Avg', data:trendScores, borderColor:'#e8c97a', backgroundColor:'rgba(232,201,122,0.1)', tension:0.35, pointBackgroundColor:'#e8c97a', pointRadius:6, fill:true }] },
      options:{
        responsive:true, layout:{padding:{top:24}},
        plugins:{ legend:{display:false}, datalabels:{anchor:'end',align:'top',color:'#e8e8f0',font:{size:12,weight:'700'},clamp:true,formatter:v=>v>0?v.toFixed(2):''} },
        scales:{
          y:{beginAtZero:true,max:4.5,ticks:{color:'#7a7a96',callback:v=>SM_LEVELS[v]||''},grid:{color:'#2a2a38'}},
          x:{ticks:{color:'#7a7a96'},grid:{color:'#2a2a38'}}
        }
      }
    });
  } else {
    document.getElementById('smChartTrend').style.display='none';
    const el=document.getElementById('smTrendEmpty');
    if(el){el.style.display='block';el.textContent='Capture snapshots over time to see the trend.';}
  }

  // Coverage Risk (stacked bar — employees per level per PA)
  const covData = [1,2,3,4].map(lvl=>processAreas.map(pa=>employees.filter(e=>(currentScores[e]||{})[pa]===lvl).length));
  smCharts.coverage = new Chart(document.getElementById('smChartCoverage'), {
    type:'bar',
    data:{
      labels:processAreas,
      datasets:[
        {label:'Beginner',   data:covData[0], backgroundColor:'#e87a7a', borderRadius:3, stack:'s'},
        {label:'Intermediate',data:covData[1], backgroundColor:'#f9a74f', borderRadius:3, stack:'s'},
        {label:'Advanced',   data:covData[2], backgroundColor:'#7ae8b4', borderRadius:3, stack:'s'},
        {label:'Expert',     data:covData[3], backgroundColor:'#e8c97a', borderRadius:3, stack:'s'}
      ]
    },
    options:{
      responsive:true,
      plugins:{ legend:{position:'bottom',labels:{color:'#e8e8f0',padding:14}}, datalabels:{display:false} },
      scales:{
        y:{beginAtZero:true,stacked:true,ticks:{color:'#7a7a96',stepSize:1},grid:{color:'#2a2a38'}},
        x:{stacked:true,ticks:{color:'#7a7a96',maxRotation:30,minRotation:0},grid:{color:'#2a2a38'}}
      }
    }
  });

  // Skill Heatmap (HTML table)
  const hmWrap = document.getElementById('smHeatmapWrap');
  if (hmWrap) {
    const hmLbl = ['—','B','I','A','E'];
    hmWrap.innerHTML = `<table class="sm-heatmap">
      <thead><tr>
        <th style="text-align:left;">Employee</th>
        ${processAreas.map(pa=>`<th title="${pa}">${pa.length>10?pa.slice(0,9)+'…':pa}</th>`).join('')}
        <th>Avg</th>
      </tr></thead>
      <tbody>
        ${employees.map(emp=>{
          const sc=currentScores[emp]||{};
          const vals=processAreas.map(pa=>sc[pa]||0);
          const filled=vals.filter(v=>v>0);
          const avg=filled.length?(filled.reduce((a,b)=>a+b,0)/filled.length).toFixed(1):'—';
          return `<tr><td class="sm-hm-name">${emp}</td>${vals.map(v=>`<td class="sm-hm-${v}">${hmLbl[v]}</td>`).join('')}<td class="sm-hm-${Math.round(+avg)||0}">${avg}</td></tr>`;
        }).join('')}
      </tbody>
    </table>`;
  }
}

function smRenderComparison() {
  if (smCharts.compare) { smCharts.compare.destroy(); delete smCharts.compare; }
  const { processAreas, snapshots, currentScores } = smData;
  const sel1 = document.getElementById('smSnap1Sel');
  const sel2 = document.getElementById('smSnap2Sel');
  if (!sel1 || !sel2 || !snapshots.length) return;

  const getScores = (id) => {
    if (!id) return null;
    const s = snapshots.find(s=>s.id==id);
    return s ? s.scores : null;
  };

  const sc1 = getScores(sel1.value);
  const sc2 = getScores(sel2.value);
  if (!sc1 && !sc2) return;

  const { employees } = smData;
  const paAvg = (scores) => processAreas.map(pa=>{
    let tot=0,cnt=0;
    employees.forEach(emp=>{const v=(scores[emp]||{})[pa]||0;if(v>0){tot+=v;cnt++;}});
    return cnt?+(tot/cnt).toFixed(2):0;
  });

  const datasets = [];
  if (sc1) datasets.push({ label: sel1.options[sel1.selectedIndex]?.text||'Snapshot 1', data:paAvg(sc1), backgroundColor:'rgba(122,158,232,.7)', borderRadius:4 });
  if (sc2) datasets.push({ label: sel2.options[sel2.selectedIndex]?.text||'Snapshot 2', data:paAvg(sc2), backgroundColor:'rgba(0,200,204,.7)', borderRadius:4 });

  smCharts.compare = new Chart(document.getElementById('smChartCompare'), {
    type:'bar',
    data:{ labels:processAreas, datasets },
    options:{
      responsive:true,
      plugins:{
        legend:{labels:{color:'#e8e8f0'}},
        datalabels:{ anchor:'end', align:'top', color:'#e8e8f0', font:{size:10,weight:'600'}, formatter:v=>v>0?v.toFixed(1):'' }
      },
      scales:{ y:{beginAtZero:true,max:4.5,ticks:{color:'#7a7a96',callback:v=>SM_LEVELS[v]||''},grid:{color:'#2a2a38'}}, x:{ticks:{color:'#7a7a96',maxRotation:0,minRotation:0,align:'center',autoSkip:false,callback:function(val,i){const lbl=this.getLabelForValue(val);return lbl.length>14?lbl.slice(0,13)+'…':lbl;}},grid:{color:'#2a2a38'}} }
    }
  });
}

function smRenderDist() {
  if (smCharts.dist) { smCharts.dist.destroy(); delete smCharts.dist; }
  const { employees, processAreas, currentScores, snapshots } = smData;
  const sel1 = document.getElementById('smDistSnap1Sel');
  const sel2 = document.getElementById('smDistSnap2Sel');
  if (!sel1) return;

  const getScores = (val) => {
    if (!val || val === 'current') return currentScores;
    const s = snapshots.find(s => s.id == val);
    return s ? s.scores : null;
  };
  const calcDist = (scores) => {
    const d = [0,0,0,0];
    employees.forEach(emp => processAreas.forEach(pa => { const v=(scores[emp]||{})[pa]||0; if(v>0) d[v-1]++; }));
    return d;
  };

  const sc1 = getScores(sel1.value);
  const sc2 = sel2 && sel2.value ? getScores(sel2.value) : null;
  const dist1 = calcDist(sc1 || {});
  const distTotal = dist1.reduce((a,b)=>a+b,0);
  const lbl1 = sel1.value === 'current' ? 'Current' : (sel1.options[sel1.selectedIndex]?.text || 'Period 1');
  const lbl2 = sel2 && sel2.value ? (sel2.options[sel2.selectedIndex]?.text || 'Period 2') : null;

  const datasets = [{ label: lbl1, data: dist1, backgroundColor: ['#e87a7a','#f9a74f','#7ae8b4','#00c8cc'], borderRadius: 4, borderWidth: 0 }];
  if (sc2 && lbl2) {
    datasets.push({ label: lbl2, data: calcDist(sc2), backgroundColor: ['rgba(232,122,122,.4)','rgba(249,167,79,.4)','rgba(122,232,180,.4)','rgba(0,200,204,.4)'], borderRadius: 4, borderWidth: 0 });
  }

  smCharts.dist = new Chart(document.getElementById('smChartDist'), {
    type: sc2 ? 'bar' : 'doughnut',
    data: { labels: SM_LEVELS.slice(1), datasets },
    options: sc2 ? {
      responsive: true,
      layout: { padding: { top: 24 } },
      plugins: {
        legend: { position:'bottom', labels:{ color:'#e8e8f0', padding:12 } },
        datalabels: { anchor:'end', align:'top', color:'#e8e8f0', font:{ size:11, weight:'600' }, clamp: true, formatter: v => v > 0 ? v : '' }
      },
      scales: {
        y: { beginAtZero:true, ticks:{ color:'#7a7a96', stepSize:1 }, grid:{ color:'#2a2a38' } },
        x: { ticks:{ color:'#7a7a96' }, grid:{ color:'#2a2a38' } }
      }
    } : {
      responsive: true,
      plugins: {
        legend: { position:'bottom', labels:{ color:'#e8e8f0', padding:14 } },
        datalabels: { color:'#fff', anchor:'center', align:'center', textAlign:'center', font:{ size:12, weight:'700' }, formatter: val => distTotal>0 && val>0 ? `${val}\n(${Math.round(val/distTotal*100)}%)` : '' }
      }
    }
  });
}

function smRenderEmp() {
  if (smCharts.emp) { smCharts.emp.destroy(); delete smCharts.emp; }
  const { employees, processAreas, currentScores, snapshots } = smData;
  const sel = document.getElementById('smEmpSnapSel');

  let scores = currentScores;
  if (sel && sel.value && sel.value !== 'current') {
    const s = snapshots.find(s => s.id == sel.value);
    if (s) scores = s.scores;
  }

  const empAvgs = employees.map(emp => {
    let tot=0, cnt=0;
    processAreas.forEach(pa => { const v=(scores[emp]||{})[pa]||0; if(v>0){tot+=v;cnt++;} });
    return cnt ? +(tot/cnt).toFixed(2) : 0;
  });
  const empLabels = employees.map(emp => {
    const words = emp.trim().split(' ');
    if (words.length <= 1) return emp;
    const mid = Math.ceil(words.length / 2);
    return [words.slice(0, mid).join(' '), words.slice(mid).join(' ')];
  });

  smCharts.emp = new Chart(document.getElementById('smChartEmp'), {
    type: 'bar',
    data: { labels: empLabels, datasets: [{ data: empAvgs, backgroundColor: empAvgs.map(v => SM_COLORS[Math.round(v)]||'#7a7a96'), borderRadius: 5 }] },
    options: {
      responsive: true,
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: c => SM_LEVELS[Math.round(c.parsed.y)] || c.parsed.y } },
        datalabels: { anchor:'end', align:'top', color:'#e8e8f0', font:{ size:11, weight:'600' }, formatter: v => v > 0 ? v.toFixed(1) : '' }
      },
      scales: {
        y: { beginAtZero:true, max:4.5, ticks:{ color:'#7a7a96', callback: v => SM_LEVELS[v]||'' }, grid:{ color:'#2a2a38' } },
        x: { ticks:{ color:'#7a7a96', maxRotation:0, minRotation:0, align:'center', autoSkip:false, callback: function(val,i){ const lbl=this.getLabelForValue(val); return typeof lbl==='string'?(lbl.length>14?lbl.slice(0,13)+'…':lbl):lbl; } }, grid:{ color:'#2a2a38' } }
      }
    }
  });
}

function smViewToggle(active) {
  return `<div style="display:flex;gap:8px;margin-bottom:22px;">
    <button class="sm-view-btn ${active==='team'?'active':''}" onclick="smDashViewTeam()">👥 Team View</button>
    <button class="sm-view-btn ${active==='ind'?'active':''}" onclick="smDashViewInd()">👤 Individual View</button>
  </div>`;
}

function smDashViewTeam() { if(!_dwNavFlag) history.pushState({screen:'skillmatrix', tab:'dashboard', view:'team'}, ''); smDestroyCharts(); smRenderDashboard(); }
function smDashViewInd()  { if(!_dwNavFlag) history.pushState({screen:'skillmatrix', tab:'dashboard', view:'ind'}, '');  smRenderIndDash(); }

function smRenderIndDash(selectedEmp) {
  const wrap = document.getElementById('smDashContent');
  const { employees, processAreas, currentScores, snapshots } = smData;
  if (!employees.length || !processAreas.length) {
    wrap.innerHTML = smViewToggle('ind') + '<div class="sm-empty">No data yet. Add employees and process areas in the Admin Panel.</div>';
    return;
  }
  smDestroyCharts();
  const emp = selectedEmp || employees[0];
  const empScores = currentScores[emp] || {};

  const empVals = processAreas.map(pa => empScores[pa]||0).filter(v=>v>0);
  const empAvg = empVals.length ? +(empVals.reduce((a,b)=>a+b,0)/empVals.length).toFixed(2) : 0;
  const expertCnt = empVals.filter(v=>v===4).length;
  const topPA = processAreas.reduce((best,pa) => (empScores[pa]||0)>(empScores[best]||0)?pa:best, processAreas[0]);

  const teamPaAvg = processAreas.map(pa => {
    let tot=0,cnt=0;
    employees.forEach(e => { const v=(currentScores[e]||{})[pa]||0; if(v>0){tot+=v;cnt++;} });
    return cnt ? +(tot/cnt).toFixed(2) : 0;
  });

  const timeLabels = [...snapshots.map(s=>s.label), 'Current'];
  const timeScores = [...snapshots.map(s => {
    const sc=s.scores[emp]||{};
    const vals=processAreas.map(pa=>sc[pa]||0).filter(v=>v>0);
    return vals.length ? +(vals.reduce((a,b)=>a+b,0)/vals.length).toFixed(2) : 0;
  }), empAvg];

  const empOpts = employees.map(e=>`<option value="${e}" ${e===emp?'selected':''}>${e}</option>`).join('');
  const paLabels = processAreas.map(pa => { const w=pa.trim().split(' '); if(w.length<=1)return pa; const m=Math.ceil(w.length/2); return [w.slice(0,m).join(' '),w.slice(m).join(' ')]; });

  wrap.innerHTML = `
    ${smViewToggle('ind')}
    <div style="display:flex;align-items:center;gap:12px;margin-bottom:20px;flex-wrap:wrap;">
      <div style="font-size:12px;color:var(--muted);font-weight:600;text-transform:uppercase;letter-spacing:.06em;">Employee</div>
      <select class="sm-snap-sel" style="font-size:13px;padding:7px 12px;" onchange="smRenderIndDash(this.value)">${empOpts}</select>
    </div>
    <div class="sm-kpi-row">
      <div class="sm-kpi"><div class="sm-kpi-val">${empAvg||'—'}</div><div class="sm-kpi-lbl">Avg Score</div></div>
      <div class="sm-kpi"><div class="sm-kpi-val">${expertCnt}</div><div class="sm-kpi-lbl">Expert Skills</div></div>
      <div class="sm-kpi"><div class="sm-kpi-val" style="font-size:15px;line-height:1.3;">${topPA||'—'}</div><div class="sm-kpi-lbl">Top Area</div></div>
      <div class="sm-kpi"><div class="sm-kpi-val">${empVals.length}/${processAreas.length}</div><div class="sm-kpi-lbl">Assessed</div></div>
    </div>
    <div class="sm-chart-grid">
      <div class="sm-chart-card full"><div class="sm-chart-title">Skills vs Team Average — ${emp}</div><canvas id="smIndChartPA" style="max-height:220px;"></canvas></div>
      <div class="sm-chart-card"><div class="sm-chart-title">Score Over Time</div><canvas id="smIndChartTime" style="max-height:200px;"></canvas></div>
      <div class="sm-chart-card"><div class="sm-chart-title">Skill Distribution</div><canvas id="smIndChartDist" style="max-height:200px;"></canvas></div>
      <div class="sm-chart-card"><div class="sm-chart-title">Skill Radar</div><canvas id="smIndChartRadar" style="max-height:260px;"></canvas></div>
      <div class="sm-chart-card full"><div class="sm-chart-title">Peer Ranking by Skill <span style="font-size:11px;color:var(--muted);font-weight:400;margin-left:8px;">— sorted by individual score, vs team average</span></div><canvas id="smIndChartRank" style="max-height:260px;"></canvas></div>
    </div>`;

  const empPaScores = processAreas.map(pa => empScores[pa]||0);
  smCharts.indPA = new Chart(document.getElementById('smIndChartPA'), {
    type:'bar',
    data:{ labels:paLabels, datasets:[
      { label:emp, data:empPaScores, backgroundColor:empPaScores.map(v=>SM_COLORS[Math.round(v)]||'rgba(122,122,150,.4)'), borderRadius:5 },
      { label:'Team Avg', data:teamPaAvg, backgroundColor:'rgba(255,255,255,0.08)', borderColor:'rgba(255,255,255,0.3)', borderWidth:1.5, borderRadius:5 }
    ]},
    options:{
      responsive:true, layout:{padding:{top:22}},
      plugins:{
        legend:{labels:{color:'#e8e8f0'}},
        datalabels:{anchor:'end',align:'top',color:'#e8e8f0',font:{size:10,weight:'600'},clamp:true,formatter:v=>v>0?v.toFixed(1):''}
      },
      scales:{
        y:{beginAtZero:true,max:4.5,ticks:{color:'#7a7a96',callback:v=>SM_LEVELS[v]||''},grid:{color:'#2a2a38'}},
        x:{ticks:{color:'#7a7a96',maxRotation:0,minRotation:0,align:'center',autoSkip:false},grid:{color:'#2a2a38'}}
      }
    }
  });

  smCharts.indTime = new Chart(document.getElementById('smIndChartTime'), {
    type:'line',
    data:{ labels:timeLabels, datasets:[{ label:'Avg Score', data:timeScores, borderColor:'#e8c97a', backgroundColor:'rgba(232,201,122,0.1)', tension:0.35, pointBackgroundColor:'#e8c97a', pointRadius:5, fill:true }] },
    options:{
      responsive:true, layout:{padding:{top:22}},
      plugins:{
        legend:{display:false},
        datalabels:{anchor:'end',align:'top',color:'#e8e8f0',font:{size:11,weight:'600'},clamp:true,formatter:v=>v>0?v.toFixed(1):''}
      },
      scales:{
        y:{beginAtZero:true,max:4.5,ticks:{color:'#7a7a96',callback:v=>SM_LEVELS[v]||''},grid:{color:'#2a2a38'}},
        x:{ticks:{color:'#7a7a96'},grid:{color:'#2a2a38'}}
      }
    }
  });

  const dist=[0,0,0,0];
  processAreas.forEach(pa=>{const v=empScores[pa]||0;if(v>0)dist[v-1]++;});
  const distTotal=dist.reduce((a,b)=>a+b,0);
  smCharts.indDist = new Chart(document.getElementById('smIndChartDist'), {
    type:'doughnut',
    data:{ labels:SM_LEVELS.slice(1), datasets:[{ data:dist, backgroundColor:['#e87a7a','#f9a74f','#7ae8b4','#00c8cc'], borderWidth:0 }] },
    options:{
      responsive:true,
      plugins:{
        legend:{position:'bottom',labels:{color:'#e8e8f0',padding:12}},
        datalabels:{color:'#fff',anchor:'center',align:'center',textAlign:'center',font:{size:12,weight:'700'},formatter:val=>distTotal>0&&val>0?`${val}\n(${Math.round(val/distTotal*100)}%)`:''}
      }
    }
  });

  // Skill Radar
  smCharts.indRadar = new Chart(document.getElementById('smIndChartRadar'), {
    type:'radar',
    data:{
      labels: processAreas,
      datasets:[{
        label: emp,
        data: processAreas.map(pa=>empScores[pa]||0),
        backgroundColor:'rgba(232,201,122,0.15)',
        borderColor:'#e8c97a',
        pointBackgroundColor:'#e8c97a',
        pointRadius:4
      }]
    },
    options:{
      responsive:true,
      plugins:{ legend:{display:false}, datalabels:{display:false} },
      scales:{
        r:{
          beginAtZero:true, min:0, max:4,
          ticks:{stepSize:1,color:'#7a7a96',backdropColor:'transparent',callback:v=>SM_LEVELS[v]||''},
          grid:{color:'#2a2a38'},
          angleLines:{color:'#2a2a38'},
          pointLabels:{color:'#e8e8f0',font:{size:11}}
        }
      }
    }
  });

  // Peer Ranking (horizontal bar, sorted by individual score desc)
  const rankPAs = [...processAreas].sort((a,b)=>(empScores[b]||0)-(empScores[a]||0));
  const rankEmpScores = rankPAs.map(pa=>empScores[pa]||0);
  const rankTeamAvg = rankPAs.map(pa=>{
    let tot=0,cnt=0;
    employees.forEach(e=>{const v=(currentScores[e]||{})[pa]||0;if(v>0){tot+=v;cnt++;}});
    return cnt?+(tot/cnt).toFixed(2):0;
  });
  smCharts.indRank = new Chart(document.getElementById('smIndChartRank'), {
    type:'bar',
    data:{
      labels: rankPAs,
      datasets:[
        {label:emp, data:rankEmpScores, backgroundColor:rankEmpScores.map(v=>SM_COLORS[Math.round(v)]||'rgba(122,122,150,.4)'), borderRadius:4},
        {label:'Team Avg', data:rankTeamAvg, backgroundColor:'rgba(255,255,255,0.08)', borderColor:'rgba(255,255,255,0.3)', borderWidth:1.5, borderRadius:4}
      ]
    },
    options:{
      indexAxis:'y',
      responsive:true,
      layout:{padding:{right:30}},
      plugins:{
        legend:{labels:{color:'#e8e8f0'}},
        datalabels:{anchor:'end',align:'right',color:'#e8e8f0',font:{size:10,weight:'600'},clamp:true,formatter:v=>v>0?v.toFixed(1):''}
      },
      scales:{
        x:{beginAtZero:true,max:4.5,ticks:{color:'#7a7a96',callback:v=>SM_LEVELS[v]||''},grid:{color:'#2a2a38'}},
        y:{ticks:{color:'#e8e8f0'},grid:{color:'#2a2a38'}}
      }
    }
  });
}

// ── Admin Panel ───────────────────────────────────────────────────────────────
async function smAdmLoad() {
  if (!smData) { try{ const r=await fetch('/api/skillmatrix'); smData=await r.json(); }catch(e){ smData={employees:[],processAreas:[],currentScores:{},snapshots:[],nextSnapshotId:1}; } }
  smRenderAdmEmp();
  smRenderAdmPA();
  smRenderAdmSnaps();
}

function smRenderAdmEmp() {
  const list = document.getElementById('smAdmEmpList');
  if (!list) return;
  list.innerHTML = smData.employees.length ? smData.employees.map((e,i)=>
    `<div class="sm-adm-item"><span>${e}</span><button class="sm-adm-del" onclick="smAdmDel('emp',${i})">✕</button></div>`
  ).join('') : '<div style="color:var(--muted);font-size:13px;padding:4px 0;">No employees yet.</div>';
}

function smRenderAdmPA() {
  const list = document.getElementById('smAdmPAList');
  if (!list) return;
  list.innerHTML = smData.processAreas.length ? smData.processAreas.map((p,i)=>
    `<div class="sm-adm-item"><span>${p}</span><button class="sm-adm-del" onclick="smAdmDel('pa',${i})">✕</button></div>`
  ).join('') : '<div style="color:var(--muted);font-size:13px;padding:4px 0;">No process areas yet.</div>';
}

function smRenderAdmSnaps() {
  const list = document.getElementById('smAdmSnapList');
  if (!list) return;
  list.innerHTML = smData.snapshots.length ? smData.snapshots.map(s=>
    `<div class="sm-snap-item"><div><div class="sm-snap-name">${s.label}</div><div class="sm-snap-date">${new Date(s.date).toLocaleDateString()}</div></div><button class="sm-adm-del" onclick="smAdmDelSnap(${s.id})">✕</button></div>`
  ).join('') : '<div style="color:var(--muted);font-size:13px;">No snapshots yet.</div>';
}

async function smAdmAddEmp() {
  const inp = document.getElementById('smAdmEmpInput');
  const name = inp.value.trim();
  if (!name) return;
  smData.employees.push(name);
  inp.value = '';
  await smSaveConfig();
  smRenderAdmEmp();
}

async function smAdmAddPA() {
  const inp = document.getElementById('smAdmPAInput');
  const name = inp.value.trim();
  if (!name) return;
  smData.processAreas.push(name);
  inp.value = '';
  await smSaveConfig();
  smRenderAdmPA();
}

async function smAdmDel(type, idx) {
  if (type==='emp')  smData.employees.splice(idx,1);
  if (type==='pa')   smData.processAreas.splice(idx,1);
  await smSaveConfig();
  smRenderAdmEmp();
  smRenderAdmPA();
}

async function smSaveConfig() {
  try {
    await fetch('/api/skillmatrix/config', {
      method:'PUT', headers:{'Content-Type':'application/json',...adminHeaders()},
      body: JSON.stringify({ employees: smData.employees, processAreas: smData.processAreas })
    });
    showToast('Saved!');
  } catch(e) { showToast('Save failed'); }
}

async function smAdmDelSnap(id) {
  if (!confirm('Delete this snapshot?')) return;
  try {
    await fetch(`/api/skillmatrix/snapshots/${id}`, { method:'DELETE', headers:adminHeaders() });
    smData.snapshots = smData.snapshots.filter(s=>s.id!==id);
    smRenderAdmSnaps();
    showToast('Snapshot deleted');
  } catch(e) { showToast('Delete failed'); }
}

// Hook admin panel tab switching
const _origSwitchAdminTab = typeof switchAdminTab === 'function' ? switchAdminTab : null;
function switchAdminTab(tab, btn, noHistory) {
  if(!noHistory && !_dwNavFlag) history.pushState({screen:'admin', tab}, '');
  document.querySelectorAll('.admin-tab').forEach(b=>b.classList.remove('active'));
  document.querySelectorAll('.admin-tab-panel').forEach(p=>p.classList.remove('active'));
  if(btn) btn.classList.add('active');
  const panel = document.getElementById('tab-'+tab);
  if(panel) panel.classList.add('active');
  if(tab==='skillmatrix') smAdmLoad();
  if(tab==='requests') loadRequestsTab();
  if(tab==='feedback') loadFeedbackTab();
  if(tab==='proxy') loadProxyTab();
};
/* ── Landing overlay JS ── */
// ══════════════════════════════════════════════════════
// PROCESS PUZZLE
// ══════════════════════════════════════════════════════
let ppCurrentGame = null;
let ppAnswers = [];
let ppTimerInterval = null;
let ppTimerSeconds = 0;
let ppCurrentQ = 0;
let ppSubmitData = null;
let ppAnimFrame = null;
let ppMouseX = 0, ppMouseY = 0;

function ppInitCanvas() {
  const ring = document.getElementById('pp3dRing');
  const row  = document.getElementById('ppCardRow');
  if (!ring || !row) return;

  let scrollProg = 0;
  let targetProg  = 0;

  // ── Build card row ────────────────────────────────────────────
  if (!row.dataset.built) {
    row.dataset.built = '1';
    const emojis = ['🧩','⚙️','🎯','📊','💡','🔍','📈','🏆','⚡'];
    const grads  = [
      'linear-gradient(160deg,#1a0938,#3d0f80)',
      'linear-gradient(160deg,#092038,#0d4080)',
      'linear-gradient(160deg,#0a2e1a,#0d6030)',
      'linear-gradient(160deg,#2e160a,#7c3510)',
      'linear-gradient(160deg,#092828,#0d5550)',
      'linear-gradient(160deg,#280918,#6b0d35)',
      'linear-gradient(160deg,#1a0a3a,#4a1590)',
      'linear-gradient(160deg,#0a1e30,#0d4575)',
      'linear-gradient(160deg,#2a240a,#665510)',
    ];
    // Fan offsets: centre card is highest (0 Y offset), outer cards droop down
    const yOffsets = [60, 38, 20, 8, 0, 8, 20, 38, 60];
    const rotates  = [-18,-12,-7,-3, 0, 3, 7, 12, 18]; // slight rotation per card
    emojis.forEach((em, i) => {
      const card = document.createElement('div');
      card.className = 'pp-card';
      card.style.background   = grads[i];
      card.style.marginBottom = yOffsets[i] + 'px';
      card.style.transform    = `rotate(${rotates[i]}deg)`;
      card.textContent = em;
      row.appendChild(card);
    });
  }

  // ── Entrance animation (mimics DG exactly) ────────────────────
  // Start state: blurred, invisible, below + tilted
  ring.style.cssText = `
    perspective: 800px;
    filter: blur(18px);
    opacity: 0;
    transform: translateY(70px) scale(0.88) rotateX(-14deg);
    will-change: filter, opacity, transform;
    transition: none;
  `;

  // After short delay, animate to resting state
  setTimeout(() => {
    ring.style.transition = 'filter 1.1s cubic-bezier(.16,1,.3,1), opacity 1.1s cubic-bezier(.16,1,.3,1), transform 1.1s cubic-bezier(.16,1,.3,1)';
    ring.style.filter    = 'blur(0px)';
    ring.style.opacity   = '1';
    ring.style.transform = 'translateY(20px) scale(1) rotateX(10deg)';
  }, 400);

  // ── Scroll + mouse driven animation ──────────────────────────
  let mouseX      = 0.5;  // 0-1 normalised
  let breathPhase = 0;
  const overlay   = document.getElementById('ppOverlay');

  // Wheel → scroll progress (only on landing; let game/results scroll normally)
  function onWheel(e) {
    const landingVisible = document.getElementById('ppLandingView')?.style.display !== 'none';
    if (!landingVisible) return; // don't block scroll in game or results view
    e.preventDefault();
    targetProg += e.deltaY * 0.0008;
    targetProg  = Math.max(0, Math.min(1, targetProg));
  }
  overlay._ppWheel && overlay.removeEventListener('wheel', overlay._ppWheel, {passive:false});
  overlay._ppWheel = onWheel;
  overlay.addEventListener('wheel', onWheel, {passive:false});

  // Mouse → parallax tilt
  function onMouse(e) { mouseX = e.clientX / window.innerWidth; }
  overlay._ppMouse && overlay.removeEventListener('mousemove', overlay._ppMouse);
  overlay._ppMouse = onMouse;
  overlay.addEventListener('mousemove', onMouse);

  // RAF loop — smooth lerp
  function tick(now) {
    // Lerp scroll progress
    scrollProg += (targetProg - scrollProg) * 0.07;

    // Breathing: slow sine wave ±4px, only when close to resting
    breathPhase += 0.012;
    const breathY = Math.sin(breathPhase) * 4 * (1 - scrollProg);

    // Derived values
    const rotX   = 10  - scrollProg * 10;           // 10° → 0°
    const rotY   = (mouseX - 0.5) * 12;             // ±6° from mouse
    const transY = 20  - scrollProg * 140 + breathY; // 20px → -120px (rises up)
    const sc     = 1   + scrollProg * 0.04;          // slight scale-up

    ring.style.transform = `translateY(${transY.toFixed(1)}px) scale(${sc.toFixed(3)}) rotateX(${rotX.toFixed(2)}deg) rotateY(${rotY.toFixed(2)}deg)`;

    ppAnimFrame = requestAnimationFrame(tick);
  }

  // Start loop after entrance
  setTimeout(() => {
    if (ppAnimFrame) cancelAnimationFrame(ppAnimFrame);
    ppAnimFrame = requestAnimationFrame(tick);
  }, 500);
}

function ppStopCanvas() {
  if (ppAnimFrame) { cancelAnimationFrame(ppAnimFrame); ppAnimFrame = null; }
  const overlay = document.getElementById('ppOverlay');
  if (overlay) {
    overlay._ppWheel  && overlay.removeEventListener('wheel', overlay._ppWheel, {passive:false});
    overlay._ppMouse  && overlay.removeEventListener('mousemove', overlay._ppMouse);
    overlay._ppWheel  = null;
    overlay._ppMouse  = null;
  }
}

async function dwGoProcessPuzzle() {
  if(typeof auditTrackPage==='function') auditTrackPage('process_puzzle','Process Puzzle');
  hideLanding();
  if(!_dwNavFlag) history.pushState({screen:'processpuzzle'}, '');
  document.getElementById('ppOverlay').classList.add('active');
  document.querySelector('.main').style.display = 'none';
  document.getElementById('ppAdminBar').style.display = getAdminPwd() ? 'flex' : 'none';
  // Start canvas animation
  ppInitCanvas();
  await ppLoad();
}

function hidePP() {
  document.getElementById('ppOverlay').classList.remove('active');
  ppStopTimer();
  ppStopCanvas();
  // Only navigate home when called directly (Exit button).
  // When called from popstate, _dwNavFlag is true — let popstate manage navigation.
  if (!_dwNavFlag) showLanding();
}

async function ppLoad() {
  ppShowView('landing');
  document.getElementById('ppNoGame').style.display = 'none';
  document.getElementById('ppGameInfo').style.display = 'none';
  try {
    const r = await fetch('/api/puzzle/current');
    const data = await r.json();
    ppCurrentGame = data.game;
    if (!ppCurrentGame) {
      document.getElementById('ppNoGame').style.display = 'block';
      return;
    }
    ppRenderLanding();
  } catch(e) {
    document.getElementById('ppNoGame').style.display = 'block';
  }
}

function ppRenderLanding() {
  const g = ppCurrentGame;
  document.getElementById('ppNoGame').style.display = 'none';
  document.getElementById('ppGameInfo').style.display = 'block';
  // Badge — use formatColor if available, fall back to type
  const colorKey = g.formatColor || g.type || 'quiz';
  const badgeEl = document.getElementById('ppTypeBadge');
  const FMT_LABELS = {knowledge_quiz:'Multiple Choice',true_false:'True or False',fill_blank:'Fill in the Blank',riddle_round:'Riddle Round',emoji_quiz:'Emoji Decode',who_am_i:'Who Am I?',rapid_fire:'Rapid Fire',scenario:'Scenario Challenge',spot_mistake:'Spot the Mistake',term_buster:'Term Buster',what_next:'What Comes Next?',mixed_bag:'Mixed Bag'};
  badgeEl.className = `pp-badge pp-badge-${colorKey}`;
  badgeEl.style.display = 'inline-flex';
  const icon = g.formatIcon || '🧩';
  const label = FMT_LABELS[g.type] || (g.type||'quiz').replace(/_/g,' ');
  badgeEl.innerHTML = `${icon} ${label}`;
  document.getElementById('ppGameTitle').textContent = g.title;
  document.getElementById('ppWeekLabel').textContent = `Week ${g.week} · ${g.year}`;
  // Show format description as subtitle + instructions
  const desc = g.formatDesc || '';
  const instr = g.instructions || '';
  const instrBox = document.getElementById('ppInstructions');
  const instrText = document.getElementById('ppInstructionsText');
  if (desc || instr) {
    instrBox.style.display = 'block';
    if (instrText) instrText.textContent = (desc ? desc + ' ' : '') + instr;
  } else {
    instrBox.style.display = 'none';
  }
  document.getElementById('ppQCount').textContent = g.totalQuestions || (g.questions||[]).length;
  document.getElementById('ppParticipants').textContent = g.participantCount || 0;
  ppLoadLandingLb();
  const glWrap = document.getElementById('ppGLWrap');
  if (glWrap) glWrap.style.display = 'block';
}

async function ppLoadLandingLb() {
  await ppGLLoad('weekly');
}

// ── Gaming Leaderboard ────────────────────────────────────────────────────────
let ppGLCurrentPeriod = 'weekly';

async function ppGLSwitchTab(period, btn) {
  ppGLCurrentPeriod = period;
  document.querySelectorAll('.pp-gl-tab').forEach(t => t.classList.remove('active'));
  if (btn) btn.classList.add('active');
  await ppGLLoad(period);
}

function ppGLSpawnParticles() {
  const wrap = document.getElementById('ppGLWrap');
  if (!wrap || wrap.querySelector('.pp-gl-particle')) return;
  const colors = ['#e8c97a','#e8c97a','#7dd3fc','#fbbf24','#f0abfc','#818cf8','#6366f1'];
  for (let i = 0; i < 22; i++) {
    const p = document.createElement('div');
    const size = 1.5 + Math.random() * 3.5;
    const dur  = 5 + Math.random() * 7;
    const del  = Math.random() * 6;
    p.className = 'pp-gl-particle';
    p.style.cssText = `width:${size}px;height:${size}px;background:${colors[i%colors.length]};left:${3+Math.random()*94}%;bottom:${Math.random()*20}%;animation:ppGlPtcl ${dur}s ${del}s linear infinite;opacity:.6;`;
    wrap.appendChild(p); // append to wrap (position:relative) so they're contained
  }
}

function ppGLAnimateScores() {
  document.querySelectorAll('.pp-gl-score-val').forEach(el => {
    const target = parseInt(el.dataset.target || '0');
    const start = performance.now();
    const dur = 900;
    const tick = now => {
      const t = Math.min((now - start) / dur, 1);
      const ease = 1 - Math.pow(1 - t, 3);
      el.textContent = Math.round(target * ease);
      if (t < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
}

async function ppGLLoad(period) {
  const content = document.getElementById('ppGLContent');
  if (!content) return;
  // Retrigger content entrance animation
  content.style.animation = 'none';
  content.offsetHeight; // reflow
  content.style.animation = '';
  content.innerHTML = '<div class="pp-gl-loading">⏳ Loading…</div>';
  try {
    const r = await fetch(`/api/puzzle/leaderboard?period=${period || 'weekly'}`);
    const data = await r.json();
    ppGLRender(data, period || 'weekly');
    // Update header
    const wl = document.getElementById('ppGLWeekLabel');
    if (wl && data.game) wl.textContent = `Week ${data.game.week||'—'} · ${new Date().getFullYear()}`;
    const pc = document.getElementById('ppGLPlayerCount');
    if (pc) pc.textContent = `${data.totalPlayers || 0} player${data.totalPlayers !== 1 ? 's' : ''}`;
    // Spawn particles once + animate score numbers
    ppGLSpawnParticles();
    setTimeout(ppGLAnimateScores, 300);
  } catch(e) {
    content.innerHTML = '<div class="pp-gl-empty"><span class="pp-gl-empty-icon">⚡</span><div class="pp-gl-empty-title">Could not load leaderboard</div></div>';
  }
}

function ppGLRender(data, period) {
  const content = document.getElementById('ppGLContent');
  const lb = data.leaderboard || [];
  const me = (getUser() || {}).name;
  const periodLabels = { weekly:'This week\'s scores', monthly:'Accumulated this month', quarterly:'Accumulated this quarter', yearly:'Accumulated this year' };

  if (!lb.length) {
    content.innerHTML = `<div class="pp-gl-empty"><span class="pp-gl-empty-icon">🏆</span><div class="pp-gl-empty-title">No entries yet</div><div style="font-size:13px;margin-top:6px;">Be the first to complete this week\'s puzzle!</div></div>`;
    return;
  }

  const myEntry = me ? lb.find(p => p.playerName.toLowerCase() === me.toLowerCase()) : null;
  const top3 = lb.slice(0, 3);
  // Podium order: 2nd left, 1st centre, 3rd right
  const podOrder = [top3[1], top3[0], top3[2]];
  const podClass = ['pp-gl-p2','pp-gl-p1','pp-gl-p3'];

  const avatarGrads = ['#e8c97a,#7c3aed','#06b6d4,#0e7490','#10b981,#047857','#f59e0b,#b45309','#ef4444,#b91c1c','#ec4899,#be185d'];

  let html = '';

  // Info strip
  html += `<div class="pp-gl-info"><span>${periodLabels[period]}</span><span><strong>${data.gamesInPeriod||1}</strong> game${(data.gamesInPeriod||1)>1?'s':''} · <strong>${lb.length}</strong> player${lb.length!==1?'s':''}</span></div>`;

  // "You" strip if outside top 3
  if (myEntry && myEntry.rank > 3) {
    const b = myEntry.badge;
    html += `<div class="pp-gl-you">
      <div class="pp-gl-you-left">
        <div class="pp-gl-you-rank">#${myEntry.rank}</div>
        <div class="pp-gl-you-info">
          <span class="pp-gl-you-lbl">Your position</span>
          <div style="display:flex;align-items:center;gap:8px;margin-top:2px;">
            <span class="pp-gl-you-name">${myEntry.playerName}</span>
            <span class="pp-tier pp-tier-${b.name.toLowerCase()}">${b.icon} ${b.name}</span>
          </div>
        </div>
      </div>
      <div class="pp-gl-you-score">${myEntry.totalScore}<span style="font-size:10px;opacity:.4;font-weight:400;">/${myEntry.totalPossible}</span></div>
    </div>`;
  }

  // Podium
  const podTrophies = ['🥈','🏆','🥉'];
  const podTrophyLabels = ['2nd','CHAMPION','3rd'];
  html += '<div class="pp-gl-podium">';
  podOrder.forEach((p, i) => {
    if (!p) { html += '<div style="min-width:100px;"></div>'; return; }
    const isMe = me && p.playerName.toLowerCase() === me.toLowerCase();
    const placeNum = i === 1 ? 1 : i === 0 ? 2 : 3;
    const sparkle = placeNum === 1 ? `<div class="pp-gl-sparkle-ring"><span></span><span></span><span></span><span></span></div>` : '';
    html += `<div class="pp-gl-pplace ${podClass[i]}">
      ${placeNum === 1 ? '<div class="pp-gl-crown">👑</div>' : ''}
      <div class="pp-gl-av-card" style="position:relative;">
        ${sparkle}
        ${p.playerInitials||p.playerName.slice(0,2).toUpperCase()}
      </div>
      <div class="pp-gl-pname">${p.playerName}${isMe?' ★':''}</div>
      <div class="pp-gl-pbadge">${podTrophyLabels[i]}</div>
      <div class="pp-gl-block">
        <div class="pp-gl-block-trophy">${podTrophies[i]}</div>
        <div class="pp-gl-block-score"><span class="pp-gl-score-val" data-target="${p.totalScore}">0</span> pts</div>
        <div class="pp-gl-block-n">${placeNum}</div>
      </div>
    </div>`;
  });
  html += '</div>';
  // Ground glow line
  html += '<div class="pp-gl-podium-ground"></div>';

  // Table 4th+
  if (lb.length > 3) {
    html += `<div><div class="pp-gl-tbl-hdr"><div>#</div><div>Player</div><div>Badge</div><div style="text-align:right;">Score</div><div style="text-align:right;">Time</div></div>`;
    lb.slice(3).forEach((p, rowIdx) => {
      const isMe = me && p.playerName.toLowerCase() === me.toLowerCase();
      const b = p.badge;
      const grad = avatarGrads[(p.rank - 1) % avatarGrads.length];
      const delay = (rowIdx * 0.045).toFixed(3);
      html += `<div class="pp-gl-trow${isMe?' pp-gl-me':''}" style="animation:ppGlSlideR .4s ${delay}s cubic-bezier(.16,1,.3,1) both;">
        <div class="pp-gl-c-rank${p.rank<=10?' top':''}">${p.rank}</div>
        <div class="pp-gl-c-player">
          <div class="pp-gl-rav" style="background:linear-gradient(135deg,${grad});">${p.playerInitials||p.playerName.slice(0,2).toUpperCase()}</div>
          <span class="pp-gl-rname">${p.playerName}</span>
          ${isMe ? '<span class="pp-gl-you-tag">YOU</span>' : ''}
        </div>
        <div><span class="pp-tier pp-tier-${b.name.toLowerCase()}">${b.icon} ${b.name}</span></div>
        <div class="pp-gl-c-score"><span class="pp-gl-score-val" data-target="${p.totalScore}">0</span><span style="font-size:9px;opacity:.4;">/${p.totalPossible}</span></div>
        <div class="pp-gl-c-time">${ppFmtTime(p.totalTime)}</div>
      </div>`;
    });
    html += '</div>';
  }

  content.innerHTML = html;
}

function ppShowView(view) {
  document.getElementById('ppLandingView').style.display = view==='landing' ? 'block' : 'none';
  document.getElementById('ppGameView').className = `pp-game-view${view==='game'?' active':''}`;
  document.getElementById('ppResultsView').className = `pp-results-view${view==='results'?' active':''}`;
  // Scroll body to top on view change
  const body = document.getElementById('ppBody');
  if(body) body.scrollTop = 0;
}

function ppStartGame() {
  if (!ppCurrentGame) return;
  ppAnswers = new Array(ppCurrentGame.questions.length).fill(-1);
  ppCurrentQ = 0;
  ppTimerSeconds = 0;
  ppSubmitData = null;
  ppShowView('game');

  // Show format splash for 1.8s before revealing the first question
  const FMT_META = {
    knowledge_quiz: {icon:'📝', label:'Multiple Choice',     desc:'Select the correct answer from 4 options'},
    true_false:     {icon:'⚖️', label:'True or False',       desc:'Decide if each statement is true or false'},
    fill_blank:     {icon:'✏️', label:'Fill in the Blank',   desc:'Pick the word that completes each sentence'},
    riddle_round:   {icon:'🔮', label:'Riddle Round',        desc:'Solve metaphorical riddles using domain knowledge'},
    emoji_quiz:     {icon:'🎯', label:'Emoji Decode',        desc:'Decode process workflows from emoji sequences'},
    who_am_i:       {icon:'🕵️', label:'Who Am I?',           desc:'Identify the concept from 3 progressive clues'},
    rapid_fire:     {icon:'⚡', label:'Rapid Fire',          desc:'10 quick questions — speed & accuracy count!'},
    scenario:       {icon:'🎭', label:'Scenario Challenge',  desc:'Make the right call in real-world situations'},
    spot_mistake:   {icon:'🔍', label:'Spot the Mistake',    desc:'Find the deliberate error in each description'},
    term_buster:    {icon:'📖', label:'Term Buster',         desc:'Match terms, acronyms and definitions'},
    what_next:      {icon:'⏭️', label:'What Comes Next?',    desc:'Identify the next correct step in the workflow'},
    mixed_bag:      {icon:'🎲', label:'Mixed Bag',           desc:'A surprise mix of all question types'},
  };
  const gameType = (ppCurrentGame.type || 'knowledge_quiz').trim();
  const meta = FMT_META[gameType] || {icon:'🎮', label: gameType.replace(/_/g,' '), desc:'Answer all questions'};

  const gameContainer = document.querySelector('.pp-game-container');
  const splash = document.createElement('div');
  splash.className = 'pp-fmt-splash';
  splash.innerHTML = `
    <div class="pp-fmt-splash-icon">${meta.icon}</div>
    <div class="pp-fmt-splash-label">${meta.label}</div>
    <div class="pp-fmt-splash-desc">${meta.desc}</div>
  `;
  document.getElementById('ppGameView').style.position = 'relative';
  document.getElementById('ppGameView').appendChild(splash);

  setTimeout(() => {
    splash.style.transition = 'opacity .4s, transform .4s';
    splash.style.opacity = '0';
    splash.style.transform = 'scale(1.04)';
    setTimeout(() => {
      splash.remove();
      ppStartTimer();
      ppRenderQuestion();
    }, 400);
  }, 1800);
}

function ppStartTimer() {
  ppStopTimer();
  ppTimerInterval = setInterval(() => {
    ppTimerSeconds++;
    const m = String(Math.floor(ppTimerSeconds/60)).padStart(2,'0');
    const s = String(ppTimerSeconds%60).padStart(2,'0');
    const el = document.getElementById('ppTimer');
    if(el) el.textContent = `${m}:${s}`;
  }, 1000);
}

function ppStopTimer() {
  if(ppTimerInterval){ clearInterval(ppTimerInterval); ppTimerInterval=null; }
}

function ppRenderQuestion() {
  const q = ppCurrentGame.questions[ppCurrentQ];
  const n = ppCurrentGame.questions.length;
  const gameType = (ppCurrentGame.type || 'knowledge_quiz').trim();

  // Q counter
  document.getElementById('ppQCounter').textContent = `Q ${ppCurrentQ+1} / ${n}`;
  // Stepped progress
  const stepsEl = document.getElementById('ppSteps');
  stepsEl.innerHTML = Array.from({length:n},(_,i)=>`<div class="pp-step${i<ppCurrentQ?' done':i===ppCurrentQ?' current':''}"></div>`).join('');
  // Difficulty badge
  const diff = q.difficulty||'medium';
  const diffEl = document.getElementById('ppDiffBadge');
  diffEl.className = 'pp-diff-badge';
  diffEl.textContent = diff.charAt(0).toUpperCase()+diff.slice(1);
  document.getElementById('ppQNumber').textContent = `Q ${ppCurrentQ+1} / ${n}`;

  // ── Format banner ──────────────────────────────────────────
  const FMT_META = {
    knowledge_quiz: {icon:'📝', label:'Multiple Choice'},
    true_false:     {icon:'⚖️', label:'True or False'},
    fill_blank:     {icon:'✏️', label:'Fill in the Blank'},
    riddle_round:   {icon:'🔮', label:'Riddle Round'},
    emoji_quiz:     {icon:'🎯', label:'Emoji Decode'},
    who_am_i:       {icon:'🕵️', label:'Who Am I?'},
    rapid_fire:     {icon:'⚡', label:'Rapid Fire'},
    scenario:       {icon:'🎭', label:'Scenario Challenge'},
    spot_mistake:   {icon:'🔍', label:'Spot the Mistake'},
    term_buster:    {icon:'📖', label:'Term Buster'},
    what_next:      {icon:'⏭️', label:'What Comes Next?'},
    mixed_bag:      {icon:'🎲', label:'Mixed Bag'},
  };
  const fmtMeta = FMT_META[gameType] || {icon:'🎮', label: gameType.replace(/_/g,' ')};
  const bannerEl = document.getElementById('ppFormatBanner');
  if (bannerEl) {
    bannerEl.style.display = 'flex';
    bannerEl.innerHTML = `<span>${fmtMeta.icon}</span><span>${fmtMeta.label}</span>`;
  }
  // HUD format chip
  const hudFmt = document.getElementById('ppHudFmt');
  if (hudFmt) hudFmt.textContent = `${fmtMeta.icon} ${fmtMeta.label}`;

  // ── Question text — format-aware rendering ──────────────────
  const qTextEl = document.getElementById('ppQuestionText');
  qTextEl.className = 'pp-q-text';
  const qText = q.question || '';

  if (gameType === 'fill_blank') {
    // Highlight the blank with a styled gap
    qTextEl.innerHTML = qText.replace(/_{3,}/g, '<span class="pp-blank">_ _ _ _</span>');
  } else if (gameType === 'who_am_i') {
    qTextEl.className = 'pp-q-text who-am-i';
    // Style each clue label with colour
    qTextEl.innerHTML = qText
      .replace(/(Clue\s*\d+\s*:)/gi, '<span class="pp-clue-label">$1</span>')
      .replace(/\n/g, '<br>');
  } else if (gameType === 'emoji_quiz') {
    // Split emoji sequence from question text at the dash/em-dash
    const sepIdx = qText.search(/[—–-]\s*[A-Z]/);
    if (sepIdx > 0) {
      const emojiPart = qText.slice(0, sepIdx).replace(/[-–—]+$/, '').trim();
      const textPart  = qText.slice(sepIdx).replace(/^[-–—\s]+/, '').trim();
      qTextEl.innerHTML = `<div class="pp-emoji-seq">${emojiPart}</div><div class="pp-emoji-q">${textPart}</div>`;
    } else {
      qTextEl.textContent = qText;
    }
  } else if (gameType === 'riddle_round') {
    qTextEl.className = 'pp-q-text riddle';
    qTextEl.textContent = qText;
  } else {
    qTextEl.textContent = qText;
  }

  // ── Options — format-aware layout ──────────────────────────
  const isTF = gameType === 'true_false' || (q.options||[]).length === 2;
  const isRapid = gameType === 'rapid_fire';
  const letters = ['A','B','C','D','E'];
  const opts = document.getElementById('ppOptions');
  opts.className = `pp-options${isTF?' pp-tf':''}${isRapid?' pp-rapid':''}`;
  opts.innerHTML = (q.options||[]).map((opt,i) => {
    const sel = ppAnswers[ppCurrentQ]===i;
    return `<button class="pp-opt${sel?' selected':''}" onclick="ppSelectOption(${i})"><span class="pp-opt-letter">${letters[i]||i+1}</span><span class="pp-opt-text">${opt}</span></button>`;
  }).join('');

  // Nav buttons
  document.getElementById('ppPrevBtn').style.display = ppCurrentQ>0 ? 'inline-flex' : 'none';
  const isLast = ppCurrentQ===n-1;
  document.getElementById('ppNextBtn').style.display = isLast ? 'none' : 'inline-flex';
  document.getElementById('ppSubmitBtn').style.display = isLast ? 'inline-flex' : 'none';
}

function ppSelectOption(idx) {
  ppAnswers[ppCurrentQ] = idx;
  document.querySelectorAll('.pp-opt').forEach((btn,i) => {
    btn.classList.toggle('selected', i===idx);
  });
}

function ppNextQuestion() {
  if(ppCurrentQ < ppCurrentGame.questions.length-1){ ppCurrentQ++; ppRenderQuestion(); }
}

function ppPrevQuestion() {
  if(ppCurrentQ > 0){ ppCurrentQ--; ppRenderQuestion(); }
}

async function ppSubmit() {
  ppStopTimer();
  const user = getUser();
  if(!user||!user.name||user.name==='Anonymous'){
    showToast('Please set your name first — click your avatar at the bottom left','error');
    ppStartTimer(); return;
  }
  const btn = document.getElementById('ppSubmitBtn');
  btn.disabled=true; btn.textContent='Submitting…';
  try {
    const r = await fetch('/api/puzzle/attempt', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body:JSON.stringify({ gameId:ppCurrentGame.id, playerName:user.name, playerInitials:user.initials||user.name.slice(0,2).toUpperCase(), answers:ppAnswers, timeTaken:ppTimerSeconds })
    });
    const data = await r.json();
    if(data.success){ ppSubmitData=data; ppShowResults(data); }
    else showToast(data.error||'Submit failed','error');
  } catch(e){ showToast('Network error','error'); }
  btn.disabled=false; btn.textContent='Submit ✓';
}

async function ppShowResults(data) {
  ppShowView('results');
  const { attempt, questionResults } = data;
  const pct = attempt.accuracy;
  // Score ring (SVG animated arc)
  document.getElementById('ppScorePct').textContent = `${pct}%`;
  const circle=document.getElementById('ppScoreRingCircle');
  if(circle){const circ=2*Math.PI*68;setTimeout(()=>{circle.style.strokeDashoffset=circ*(1-pct/100);},100);}
  // Result title based on score
  const titles = pct===100?'🎯 Perfect Score!':pct>=80?'🔥 Excellent!':pct>=60?'👍 Good Work!':pct>=40?'💪 Keep Going!':'😅 Better Luck Next Time!';
  document.getElementById('ppResultsTitle').textContent = titles;
  document.getElementById('ppResultsSub').textContent = `${attempt.score} correct out of ${attempt.total} questions`;
  // Stats cards
  document.getElementById('ppResCorrect').textContent = `${attempt.score}/${attempt.total}`;
  document.getElementById('ppResTime').textContent = ppFmtTime(attempt.timeTaken);
  // Attempt badge
  document.getElementById('ppAttemptBadge').innerHTML = attempt.isFirstAttempt
    ? '<div class="pp-attempt-badge first">🏆 First attempt — counts for the leaderboard!</div>'
    : '<div class="pp-attempt-badge practice">ℹ️ Practice attempt — does not affect rankings</div>';
  // Answer breakdown
  const letters = ['A','B','C','D','E'];
  document.getElementById('ppAnswerBreakdown').innerHTML =
    `<div class="pp-breakdown-title">Question Breakdown</div>` +
    (questionResults||[]).map((qr,i) => `
    <div class="pp-breakdown-item">
      <div class="pp-breakdown-icon ${qr.isCorrect?'correct':'wrong'}">${qr.isCorrect?'✅':'❌'}</div>
      <div class="pp-breakdown-q">
        <div>${i+1}. ${qr.question}</div>
        <div class="pp-breakdown-a ${qr.isCorrect?'correct':'wrong'}">
          Your answer: ${qr.selected>=0?(letters[qr.selected]+'. '+qr.options[qr.selected]):'No answer'}
          ${!qr.isCorrect?` · Correct: ${letters[qr.correct]}. ${qr.options[qr.correct]}`:''}
        </div>
        ${qr.explanation?`<div style="font-size:11px;color:rgba(241,245,249,.3);font-style:italic;margin-top:4px;">💡 ${qr.explanation}</div>`:''}
      </div>
    </div>`).join('');
  await ppLoadResultsLb(attempt);
}

async function ppLoadResultsLb(myAttempt) {
  try {
    const r = await fetch('/api/puzzle/leaderboard');
    const data = await r.json();
    const lb = data.leaderboard||[];
    const myRank = lb.findIndex(p=>p.playerName.toLowerCase()===myAttempt.playerName.toLowerCase());
    document.getElementById('ppResRank').textContent = myRank>=0 ? `#${myRank+1}` : '—';
    const ppResultsLbEl = document.getElementById('ppResultsLb');
    if (lb.length===0) {
      ppResultsLbEl.innerHTML = '<p style="color:rgba(100,116,139,.7);font-size:13px;text-align:center;padding:20px 0;">No players yet.</p>';
      return;
    }
    // Podium for top 3 (display order: 2nd left, 1st center, 3rd right)
    const podiumOrder=[lb[1],lb[0],lb[2]].filter(Boolean);
    const podiumClasses=['pp-podium-2','pp-podium-1','pp-podium-3'];
    let html=`<div class="pp-podium">${podiumOrder.map((p,i)=>{
      const isMe = p.playerName.toLowerCase()===myAttempt.playerName.toLowerCase();
      return `<div class="pp-podium-place ${podiumClasses[i]}">
        <div class="pp-podium-avatar">${p.playerInitials||p.playerName.slice(0,2).toUpperCase()}</div>
        <div class="pp-podium-block"></div>
        <div class="pp-podium-name${isMe?' pp-lb-you':''}">${p.playerName}${isMe?' ★':''}</div>
        <div class="pp-podium-score">${p.score}/${p.total}</div>
      </div>`;}).join('')}</div>`;
    // Rows for 4th+
    if(lb.length>3){
      html+=lb.slice(3).map((p,i)=>{
        const isMe = p.playerName.toLowerCase()===myAttempt.playerName.toLowerCase();
        return `
    <div class="pp-lb-row">
      <span class="pp-lb-rank">#${i+4}</span>
      <div class="pp-lb-avatar">${p.playerInitials||p.playerName.slice(0,2).toUpperCase()}</div>
      <span class="pp-lb-name${isMe?' pp-lb-you':''}">${p.playerName}${isMe?' ★':''}</span>
      <span class="pp-lb-score">${p.score}/${p.total}</span>
      <span class="pp-lb-time">${ppFmtTime(p.timeTaken)}</span>
    </div>`;}).join('');
    }
    ppResultsLbEl.innerHTML=html;
  } catch(e) {}
}

function ppPlayAgain() { ppStopTimer(); ppStartGame(); }

function ppFmtTime(s) {
  if(!s&&s!==0) return '—';
  const m=Math.floor(s/60), sec=s%60;
  return m>0?`${m}m ${sec}s`:`${sec}s`;
}

async function ppGenerateGame() {
  const btn=document.getElementById('ppGenerateBtn');
  const status=document.getElementById('ppAdminStatus');
  btn.disabled=true; btn.textContent='⏳ Generating with AI…';
  status.textContent='This may take 10-15 seconds…';
  try {
    const weekNum = parseInt(document.getElementById('ppWeekNum')?.value) || 1;
    const formatId = document.getElementById('ppFormatSelect')?.value || 'random';
    const r=await fetch('/api/puzzle/generate',{method:'POST',headers:{'x-admin-password':getAdminPwd(),'content-type':'application/json'},body:JSON.stringify({weekNumber:weekNum,formatId})});
    const data=await r.json();
    if(data.success){
      ppCurrentGame=data.game;
      const fmtLabel = (data.game.type||'').replace(/_/g,' ');
      const fmtIcon  = data.game.formatIcon || '🎮';
      showToast(`${fmtIcon} New game generated: ${fmtLabel}!`,'success');
      ppRenderLanding();
      ppShowView('landing');
      status.textContent=`Last: ${fmtLabel} — just now`;
    } else {
      const msg = data.error || 'Generation failed';
      showToast(msg, 'error');
      status.textContent = msg.length > 60 ? msg.slice(0,60)+'…' : msg;
    }
  } catch(e){
    showToast('Network error: '+e.message,'error');
    status.textContent = 'Network error';
  }
  btn.disabled=false; btn.textContent='🎲 Generate New Game';
}

// ── History API: prevents pushState during popstate handling ──
let _dwNavFlag = false;

// Safe back navigation — uses history.back() when possible, falls back to landing
function navBack() {
  if (history.length > 1) {
    history.back();
  } else {
    showLanding();
  }
}

function showLanding(){
  if(!_dwNavFlag) history.pushState({screen:'landing'}, '');
  document.getElementById('dwLanding').classList.remove('dw-hidden');
  document.getElementById('dw-canvas').style.display='block';
  // hide other overlays
  const sm=document.getElementById('smOverlay');
  if(sm) sm.classList.remove('active');
  const dv=document.getElementById('dashboardView');
  if(dv) dv.classList.remove('active');
  const rv=document.getElementById('roadmapView');
  if(rv) rv.classList.remove('active');
  document.querySelector('.main').style.display='';
  // close any open tooltips
  document.querySelectorAll('.dw-tooltip').forEach(t=>t.classList.remove('open'));
  // restart canvas
  dwStartLoop();
  // ── Restore nav and admin button (hidden when leaving landing) ──
  const mcNav = document.getElementById('mcNav');
  if(mcNav) mcNav.style.display = 'flex';
  const adminFab = document.getElementById('dwAdminFab');
  if(adminFab) { adminFab.style.display='flex'; adminFab.style.opacity=!!getAdminPwd()?'1':'0.55'; }
  // Restore admin btn in nav
  const mcAdminBtn = document.getElementById('mcAdminBtn');
  if(mcAdminBtn) mcAdminBtn.style.display = 'none';
  // Close any open Browse dropdown
  mcCloseBrowse();
  // Clear search
  const searchInput = document.getElementById('mcSearchInput');
  if(searchInput) searchInput.value = '';
  const searchResults = document.getElementById('mcSearchResults');
  if(searchResults) { searchResults.innerHTML = ''; searchResults.classList.remove('open'); }
  // refresh live stats
  updateLandingStats();
  // tech animations
  setTimeout(dwInitTechEffects, 200);
  // Always re-check Leadership Insights access on every return to home
  if(typeof liUpdateNavVisibility==='function') liUpdateNavVisibility();
  // audit tracking
  if(typeof auditTrackPage==='function') auditTrackPage('landing','Home');
}

function dwCountUp(el,target,dur){
  if(!el||typeof target!=='number')return;
  const start=performance.now();
  (function tick(now){
    const p=Math.min((now-start)/dur,1);
    const e=1-Math.pow(1-p,3);
    el.textContent=Math.round(target*e);
    if(p<1)requestAnimationFrame(tick);
  })(start);
}

async function updateLandingStats(){
  // 0. My Learning courses
  const cEl=document.getElementById('dwStatCourses');
  const cSubEl=document.getElementById('dwStatCoursesSub');
  if(cEl&&typeof ML_COURSES!=='undefined'){
    const total=ML_COURSES.length;
    const done=ML_COURSES.filter(c=>mlGetCourseProgress(c.id).passed).length;
    dwCountUp(cEl,total,800);
    if(cSubEl)cSubEl.textContent=done>0?`${done} completed`:'self-paced';
  }
  // 1. Articles — total + personal unread count
  const posted=allArticles.length||0;
  const artEl=document.getElementById('dwStatArticles');
  const planEl=document.getElementById('dwStatPlanned');
  if(artEl){if(posted)dwCountUp(artEl,posted,900);else artEl.textContent='—';}
  if(planEl){
    const read=typeof getReadArticles==='function'?getReadArticles():new Set();
    const unread=Math.max(0,posted-read.size);
    planEl.textContent=unread>0?`${unread} unread`:'✓ all read';
  }
  // 2. Skill matrix people
  let smCount=null;
  if(typeof smData!=='undefined'&&smData&&smData.employees)smCount=smData.employees.length;
  else{try{const r=await fetch('/api/skillmatrix');if(r.ok){const d=await r.json();smCount=d.employees?d.employees.length:null;}}catch(e){}}
  const smEl=document.getElementById('dwStatSMPeople');
  if(smEl){if(smCount!==null)dwCountUp(smEl,smCount,800);else smEl.textContent='—';}
  // 3. Games hosted
  let games=null;
  try{const r=await fetch('/api/puzzle/leaderboard');if(r.ok){const d=await r.json();if(d.game&&d.game.week!=null)games=d.game.week;}}catch(e){}
  const gEl=document.getElementById('dwStatGames');
  if(gEl){if(games!==null)dwCountUp(gEl,games,700);else gEl.textContent='—';}
}

function hideLanding(){
  document.getElementById('dwLanding').classList.add('dw-hidden');
  document.getElementById('dw-canvas').style.display='none';
  dwStopLoop();
  dwHideTechEffects();
  // Hide nav when leaving landing
  const nav=document.getElementById('mcNav');
  if(nav) nav.style.display='none';
}

function dwGoKnowledge(){
  hideLanding();
  history.pushState({screen:'articles'}, '');
  document.getElementById('pageTitle').textContent='All Articles';
  document.getElementById('pageMeta').textContent='Browse and manage your team\'s knowledge base';
}

function dwGoSkillMatrix(){
  hideLanding();
  history.pushState({screen:'skillmatrix', tab:'assess'}, '');
  showSkillMatrix();
}

function dwGoRoadmap(){
  hideLanding();
  if(!_dwNavFlag) history.pushState({screen:'dw-roadmap'}, '');
  document.getElementById('dwRoadmapOverlay').classList.add('active');
}

function closeRoadmap(){
  document.getElementById('dwRoadmapOverlay').classList.remove('active');
  showLanding();
}

let _certSource = 'landing';

function dwGoCertificates(source){
  _certSource = source || 'landing';
  const ml = document.getElementById('mlOverlay');
  if(ml) ml.classList.remove('active');
  hideLanding();
  history.pushState({screen:'certificates'},'');
  document.getElementById('dwCertOverlay').classList.add('active');
  certRender();
}

function closeCertificates(){
  document.getElementById('dwCertOverlay').classList.remove('active');
  showLanding();
}

function certRender(){
  const user = JSON.parse(localStorage.getItem('kb_user')||'{}');
  const userName = user.name || 'Team Member';
  const prog = JSON.parse(localStorage.getItem('ml_prog')||'{}');
  const courses = typeof ML_COURSES !== 'undefined' ? ML_COURSES : [];
  const earned = courses.filter(c => prog[c.id] && prog[c.id].passed);

  const badge = document.getElementById('certCountBadge');
  if(badge) badge.textContent = earned.length + ' Earned';
  const statEl = document.getElementById('dwStatCertCount');
  if(statEl) statEl.textContent = earned.length;

  const emptyEl = document.getElementById('certEmpty');
  const gridEl  = document.getElementById('certGrid');
  if(!emptyEl || !gridEl) return;

  if(!earned.length){
    emptyEl.style.display='flex';
    gridEl.style.display='none';
    const nameEl = document.getElementById('certEmptyName');
    if(nameEl) nameEl.textContent = userName + ' — no certifications under your belt yet.';
    const listEl = document.getElementById('certCourseList');
    if(listEl) listEl.innerHTML = courses.map(c=>`
      <div class="cert-course-row" onclick="dwGoLearning()">
        <span class="cert-course-row-icon">${c.icon||'📘'}</span>
        <span class="cert-course-row-name">${c.title}</span>
        <span class="cert-course-row-arr">→</span>
      </div>`).join('');
    return;
  }
  emptyEl.style.display='none';
  gridEl.style.display='grid';

  gridEl.innerHTML = earned.map(c => {
    const cp = prog[c.id]||{};
    const dateStr = cp.passedAt
      ? new Date(cp.passedAt).toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric'})
      : 'Completed';
    const score = cp.score||0;
    return `<div class="cert-card" onclick="certViewFull('${c.id}')">
      <div class="cert-card-header" style="background:${c.grad||'linear-gradient(135deg,#1a1a2e,#16213e)'}">
        <div class="cert-card-icon">${c.icon||'🏆'}</div>
        <div class="cert-card-tag">${c.tag||c.title}</div>
      </div>
      <div class="cert-card-body">
        <div class="cert-card-label">Certificate of Completion</div>
        <div class="cert-card-course">${c.title}</div>
        <div class="cert-card-name">${userName}</div>
        <div class="cert-card-meta">
          <span class="cert-card-date">${dateStr}</span>
          <span class="cert-card-score">Score: ${score}%</span>
        </div>
        <div class="cert-card-seal">🏆 CERTIFIED</div>
      </div>
    </div>`;
  }).join('');
}

function certViewFull(courseId){
  const user = JSON.parse(localStorage.getItem('kb_user')||'{}');
  const userName = user.name||'Team Member';
  const prog = JSON.parse(localStorage.getItem('ml_prog')||'{}');
  const courses = typeof ML_COURSES !== 'undefined' ? ML_COURSES : [];
  const c = courses.find(x=>x.id===courseId);
  if(!c) return;
  const cp = prog[courseId]||{};
  const dateStr = cp.passedAt
    ? new Date(cp.passedAt).toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric'})
    : new Date().toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric'});
  const score = cp.score||0;

  const existing = document.getElementById('certModalOverlay');
  if(existing) existing.remove();

  const modal = document.createElement('div');
  modal.className='cert-modal-overlay'; modal.id='certModalOverlay';
  modal.onclick = e => { if(e.target===modal) modal.remove(); };
  modal.innerHTML = `
  <div class="cert-modal">
    <button class="cert-modal-close" onclick="document.getElementById('certModalOverlay').remove()">✕</button>
    <div class="cert-full">
      <div class="cert-full-top-bar"></div>
      <div class="cert-full-header">
        <div class="cert-full-logo">🏆</div>
        <div class="cert-full-issuer">BLUECOPA · DELIVERY TEAM</div>
        <div class="cert-full-headline">Certificate of Completion</div>
      </div>
      <div class="cert-full-body">
        <div class="cert-full-presented">This certifies that</div>
        <div class="cert-full-name">${userName}</div>
        <div class="cert-full-desc">has successfully completed</div>
        <div class="cert-full-course">${c.title}</div>
        <div class="cert-full-tag">${c.tag||''}</div>
      </div>
      <div class="cert-full-footer">
        <div class="cert-full-meta"><div class="cert-full-date">${dateStr}</div><div class="cert-full-date-label">Date Completed</div></div>
        <div class="cert-full-seal">
          <svg viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg" width="72" height="72">
            <circle cx="40" cy="40" r="36" stroke="rgba(201,162,39,0.45)" stroke-width="2" stroke-dasharray="6 3"/>
            <circle cx="40" cy="40" r="27" fill="rgba(201,162,39,0.09)" stroke="rgba(201,162,39,0.6)" stroke-width="2"/>
            <text x="40" y="48" text-anchor="middle" font-size="22">🏆</text>
          </svg>
        </div>
        <div class="cert-full-meta"><div class="cert-full-date">${score}%</div><div class="cert-full-date-label">Assessment Score</div></div>
      </div>
    </div>
  </div>`;
  document.body.appendChild(modal);
}


const DW_CS_CONFIG = {
  'KPIs': {
    icon:'📊', tag:'// 03 · KPIs',
    desc:'Delivery performance metrics — velocity, quality and team health — all in one live view.',
    clr:'249,167,79', grad:'linear-gradient(135deg,#f9a74f,#e8873a)'
  },
  'Delivery Journey': {
    icon:'🏛', tag:'// 04 · The Delivery Journey',
    desc:'A living record of every past implementation — what we built, what we learned, and what comes next.',
    clr:'122,232,180', grad:'linear-gradient(135deg,#7ae8b4,#3ec68a)'
  }
};

function dwComingSoon(name) {
  const cfg = DW_CS_CONFIG[name] || { icon:'🚀', tag:'// Coming Soon', desc:'', clr:'232,201,122', grad:'linear-gradient(135deg,#e8c97a,#d4b55a)' };
  const ol = document.getElementById('dwComingSoonOverlay');

  // Apply theme colours
  const rgba12 = `rgba(${cfg.clr},.12)`;
  const rgba08 = `rgba(${cfg.clr},.08)`;
  const plain  = `rgb(${cfg.clr})`;
  document.getElementById('dwCsBgOrb').style.background = `radial-gradient(circle,${rgba12},transparent 70%)`;
  ['dwCsR1','dwCsR2','dwCsR3'].forEach(id => {
    document.getElementById(id).style.borderColor = `rgba(${cfg.clr},.18)`;
  });
  ['dwCsR1','dwCsR2','dwCsR3'].forEach(id => {
    const el = document.getElementById(id);
    // set pseudo-element colour via CSS var trick
    el.style.setProperty('--cs-dot', plain);
  });
  document.getElementById('dwCsBarFill').style.background = cfg.grad;
  document.getElementById('dwCsTag').style.color = plain;
  document.getElementById('dwCsHeadEm').style.backgroundImage = cfg.grad;

  // Content
  document.getElementById('dwCsIcon').textContent = cfg.icon;
  document.getElementById('dwCsTag').textContent  = cfg.tag;
  document.getElementById('dwCsDesc').textContent = cfg.desc;

  // Spawn particles
  const wrap = document.getElementById('dwCsParticles');
  wrap.innerHTML = '';
  for (let i = 0; i < 22; i++) {
    const p = document.createElement('div');
    p.className = 'dw-cs-p';
    const sz = Math.random() * 3.5 + 1.5;
    p.style.cssText = `width:${sz}px;height:${sz}px;background:rgba(${cfg.clr},.5);left:${Math.random()*100}%;animation-duration:${Math.random()*14+9}s;animation-delay:${Math.random()*10}s;`;
    wrap.appendChild(p);
  }

  ol.classList.remove('dw-cs-hidden');
  // push history so back-button works
  history.pushState({ screen:'comingsoon', name }, '');
}

function hideDwComingSoon() {
  document.getElementById('dwComingSoonOverlay').classList.add('dw-cs-hidden');
  history.back();
}

function dwToggleTip(id){
  const tip=document.getElementById(id);
  const wasOpen=tip.classList.contains('open');
  document.querySelectorAll('.dw-tooltip').forEach(t=>t.classList.remove('open'));
  if(!wasOpen) tip.classList.add('open');
}

// ═══════════════════════════════════════════════════════════
// BROWSER BACK BUTTON — History API
// Stamp the landing page as the very first history entry
// so the back button always has a valid state to return to.
// ═══════════════════════════════════════════════════════════
history.replaceState({screen:'landing'}, '');

window.addEventListener('popstate', function(e){
  _dwNavFlag = true;
  const scr = (e.state && e.state.screen) || 'landing';

  // ── Coming-soon overlay: just close it ──
  if(scr === 'comingsoon'){
    document.getElementById('dwComingSoonOverlay').classList.add('dw-cs-hidden');
    _dwNavFlag = false;
    return;
  }

  // ── Admin panel tabs: keep panel open, just switch tab ──
  if(scr === 'admin'){
    closeAbout(); closeViewModal(); closeModal();
    document.getElementById('adminPanelOverlay').classList.add('open');
    const tab = (e.state && e.state.tab) || 'categories';
    const btn = [...document.querySelectorAll('#adminPanelOverlay .admin-tab')]
                  .find(b => (b.getAttribute('onclick')||'').includes(`'${tab}'`));
    switchAdminTab(tab, btn, true);
    _dwNavFlag = false;
    return;
  }

  // ── For all other states: close every overlay/modal first ──
  closeViewModal();
  closeAbout();
  closeAdminPanel();
  closeModal();
  smDestroyCharts();
  hidePP();
  mlHide();
  document.getElementById('dwLanding').classList.add('dw-hidden');
  document.getElementById('dw-canvas').style.display = 'none';
  dwStopLoop();
  const sm  = document.getElementById('smOverlay');
  const dv  = document.getElementById('dashboardView');
  const rv  = document.getElementById('roadmapView');
  const mainEl = document.querySelector('.main');
  if(sm) sm.classList.remove('active');
  if(dv) dv.classList.remove('active');
  if(rv) rv.classList.remove('active');
  if(mainEl) mainEl.style.display = '';
  // Close full-screen overlays not caught above
  const _ro = document.getElementById('dwRoadmapOverlay');
  if(_ro) _ro.classList.remove('active');
  const _co = document.getElementById('dwCertOverlay');
  if(_co) _co.classList.remove('active');
  const _pdo = document.getElementById('pdOverlay');
  if(_pdo) _pdo.classList.remove('active');
  const _lio = document.getElementById('liOverlay');
  if(_lio) _lio.style.display = 'none';

  // ── Activate the target screen ──
  if(scr === 'landing'){
    // Use showLanding() so nav, admin button, and all UI elements are properly restored
    showLanding();
  } else if(scr === 'skillmatrix'){
    const tab  = (e.state && e.state.tab)  || 'assess';
    const view = (e.state && e.state.view) || 'team';
    if(sm) sm.classList.add('active');
    if(mainEl) mainEl.style.display = 'none';
    smLoad().then(() => {
      smSwitchTab(tab, true);
      if(tab === 'dashboard' && view === 'ind') smRenderIndDash();
    });
  } else if(scr === 'dashboard'){
    if(dv) dv.classList.add('active');
    if(mainEl) mainEl.style.display = 'none';
    loadDashboard();
  } else if(scr === 'pd-dashboard'){
    if(_pdo) _pdo.classList.add('active');
    if(typeof pdLoadDashboard === 'function') pdLoadDashboard();
    if(!_rlLoaded && typeof pdLoadRocketlane === 'function') pdLoadRocketlane();
  } else if(scr === 'roadmap'){
    if(rv) rv.classList.add('active');
    if(mainEl) mainEl.style.display = 'none';
    renderRoadmap();
  } else if(scr === 'dw-roadmap'){
    if(_ro) _ro.classList.add('active');
  } else if(scr === 'about'){
    // Popping forward to about — reopen the modal
    openAbout();
  } else if(scr === 'processpuzzle'){
    document.getElementById('ppOverlay').classList.add('active');
    document.querySelector('.main').style.display = 'none';
    document.getElementById('ppAdminBar').style.display = getAdminPwd() ? 'flex' : 'none';
    ppLoad();
  } else if(scr === 'leadership'){
    liOpen();
  } else if(scr === 'my-learning'){
    dwGoLearning();
  } else if(scr === 'certificates'){
    if(_co) _co.classList.add('active');
    certRender();
  }
  // 'articles', 'article-detail', 'new-article' → main view already restored by reset

  _dwNavFlag = false;
});

// Close tooltips on outside click
document.addEventListener('click',function(e){
  if(!e.target.closest('.dw-info-btn') && !e.target.closest('.dw-tooltip')){
    document.querySelectorAll('.dw-tooltip').forEach(t=>t.classList.remove('open'));
  }
});

/* ── Particle canvas for landing ── */
const dwCv=document.getElementById('dw-canvas');
const dwCtx=dwCv.getContext('2d');
let dwW,dwH,dwCanvasRunning=true,dwT=0,dwRafId=null;
function dwResize(){dwW=dwCv.width=innerWidth;dwH=dwCv.height=innerHeight;}
dwResize();window.addEventListener('resize',dwResize);

// Gold/warm color palette
const DW_COLORS=[[232,201,122],[255,220,155],[200,155,50],[232,220,180],[180,140,70]];

// Aurora blobs drawn on canvas (large, slow morphing)
const dwAuroras=[
  {cx:.18,cy:.28,rx:.38,ry:.28,c:[232,201,122],ph:0,spd:.00055},
  {cx:.82,cy:.55,rx:.32,ry:.22,c:[122,158,232],ph:2.1,spd:.00042},
  {cx:.5,cy:.08,rx:.28,ry:.18,c:[200,155,50],ph:4.3,spd:.00068},
  {cx:.1,cy:.75,rx:.24,ry:.18,c:[180,130,60],ph:1.4,spd:.00050},
  {cx:.88,cy:.15,rx:.30,ry:.20,c:[220,190,100],ph:3.2,spd:.00060},
];

// Particles
const dwPts=Array.from({length:95},()=>({
  x:Math.random()*innerWidth,y:Math.random()*innerHeight,
  vx:(Math.random()-.5)*.28,vy:(Math.random()-.5)*.28,
  r:Math.random()*1.8+.5,
  c:DW_COLORS[Math.floor(Math.random()*DW_COLORS.length)],
  tw:Math.random()*Math.PI*2,tws:.004+Math.random()*.014
}));

// Shooting stars
const dwShoots=[];
function dwSpawn(){
  dwShoots.push({
    x:Math.random()*dwW*1.4,y:Math.random()*dwH*.45,
    vx:-(5+Math.random()*7),vy:1.2+Math.random()*3,
    life:1,decay:.012+Math.random()*.01,
    len:100+Math.random()*160,
    c:[232,201,122]
  });
}
setInterval(dwSpawn,3000);setInterval(dwSpawn,5500);

function dwDraw(){
  if(!dwCanvasRunning){dwRafId=null;return;}
  dwT+=.001;
  dwCtx.clearRect(0,0,dwW,dwH);

  // Aurora blobs
  dwAuroras.forEach(a=>{
    const ox=Math.sin(dwT*a.spd*1000+a.ph)*.10;
    const oy=Math.cos(dwT*a.spd*800+a.ph)*.07;
    const cx=(a.cx+ox)*dwW,cy=(a.cy+oy)*dwH;
    const rx=a.rx*dwW,ry=a.ry*dwH;
    const [r,g,b]=a.c;
    dwCtx.save();
    dwCtx.translate(cx,cy);
    dwCtx.rotate(dwT*.018+a.ph);
    const grd=dwCtx.createRadialGradient(0,0,0,0,0,rx);
    grd.addColorStop(0,`rgba(${r},${g},${b},.055)`);
    grd.addColorStop(.45,`rgba(${r},${g},${b},.028)`);
    grd.addColorStop(1,`rgba(${r},${g},${b},0)`);
    dwCtx.beginPath();dwCtx.ellipse(0,0,rx,ry,0,0,Math.PI*2);
    dwCtx.fillStyle=grd;dwCtx.fill();
    dwCtx.restore();
  });

  // Particles + glow
  dwPts.forEach(p=>{
    p.tw+=p.tws;const a=.35+.65*Math.sin(p.tw);
    p.x+=p.vx;p.y+=p.vy;
    if(p.x<0)p.x=dwW;if(p.x>dwW)p.x=0;
    if(p.y<0)p.y=dwH;if(p.y>dwH)p.y=0;
    const[r,g,b]=p.c;
    // outer glow
    const glow=dwCtx.createRadialGradient(p.x,p.y,0,p.x,p.y,p.r*7);
    glow.addColorStop(0,`rgba(${r},${g},${b},${a*.16})`);
    glow.addColorStop(1,`rgba(${r},${g},${b},0)`);
    dwCtx.beginPath();dwCtx.arc(p.x,p.y,p.r*7,0,Math.PI*2);
    dwCtx.fillStyle=glow;dwCtx.fill();
    // core dot
    dwCtx.beginPath();dwCtx.arc(p.x,p.y,p.r,0,Math.PI*2);
    dwCtx.fillStyle=`rgba(${r},${g},${b},${a*.85})`;dwCtx.fill();
  });

  // Connecting lines
  for(let i=0;i<dwPts.length;i++)for(let j=i+1;j<dwPts.length;j++){
    const dx=dwPts[i].x-dwPts[j].x,dy=dwPts[i].y-dwPts[j].y,d=Math.hypot(dx,dy);
    if(d<140){
      const[r,g,b]=dwPts[i].c;
      const alpha=(1-d/140)*.2;
      dwCtx.beginPath();
      dwCtx.strokeStyle=`rgba(${r},${g},${b},${alpha})`;
      dwCtx.lineWidth=.65;
      dwCtx.moveTo(dwPts[i].x,dwPts[i].y);
      dwCtx.lineTo(dwPts[j].x,dwPts[j].y);
      dwCtx.stroke();
    }
  }

  // Shooting stars
  for(let i=dwShoots.length-1;i>=0;i--){
    const s=dwShoots[i];const[r,g,b]=s.c;
    const sg=dwCtx.createLinearGradient(s.x,s.y,s.x+s.len*.68,s.y-s.len*.24);
    sg.addColorStop(0,`rgba(${r},${g},${b},0)`);
    sg.addColorStop(.45,`rgba(${r},${g},${b},${s.life*.5})`);
    sg.addColorStop(1,`rgba(255,248,220,${s.life*.95})`);
    dwCtx.beginPath();dwCtx.strokeStyle=sg;dwCtx.lineWidth=1.6*s.life;
    dwCtx.moveTo(s.x,s.y);dwCtx.lineTo(s.x+s.len*.68,s.y-s.len*.24);dwCtx.stroke();
    // tip glow
    const tg=dwCtx.createRadialGradient(s.x+s.len*.68,s.y-s.len*.24,0,s.x+s.len*.68,s.y-s.len*.24,6*s.life);
    tg.addColorStop(0,`rgba(255,248,220,${s.life*.9})`);
    tg.addColorStop(1,`rgba(232,201,122,0)`);
    dwCtx.beginPath();dwCtx.arc(s.x+s.len*.68,s.y-s.len*.24,6*s.life,0,Math.PI*2);
    dwCtx.fillStyle=tg;dwCtx.fill();
    s.x+=s.vx;s.y+=s.vy;s.life-=s.decay;
    if(s.life<=0||s.x<-200)dwShoots.splice(i,1);
  }

  dwRafId = requestAnimationFrame(dwDraw);
}
function dwStartLoop(){if(!dwRafId){dwCanvasRunning=true;dwRafId=requestAnimationFrame(dwDraw);}}
function dwStopLoop(){dwCanvasRunning=false;if(dwRafId){cancelAnimationFrame(dwRafId);dwRafId=null;}}
dwStartLoop();

// Card 3D tilt on dw-cards
document.querySelectorAll('.dw-card').forEach(card=>{
  card.addEventListener('mousemove',e=>{
    const r=card.getBoundingClientRect();
    const dx=(e.clientX-r.left-r.width/2)/(r.width/2);
    const dy=(e.clientY-r.top-r.height/2)/(r.height/2);
    card.style.transform=`perspective(700px) rotateX(${-dy*7}deg) rotateY(${dx*7}deg) translateY(-8px) scale(1.02)`;
  });
  card.addEventListener('mouseleave',()=>{card.style.transform='';});
});

// ══ AUDIT LOG TRACKING ═══════════════════════════════════════════════════════
(function(){
  // Generate/restore session ID per browser session
  const _sid = sessionStorage.getItem('_al_sid') ||
    (Date.now().toString(36) + Math.random().toString(36).slice(2,8));
  sessionStorage.setItem('_al_sid', _sid);

  let _curPage = null, _curTitle = null, _pageStart = null;

  function _send(action, page, pageTitle, duration) {
    const u = getUser ? getUser() : null;
    const entry = {
      sessionId: _sid,
      userId:        u ? u.name     : 'Anonymous',
      userName:      u ? u.name     : 'Anonymous',
      userInitials:  u ? u.initials : '?',
      action, page, pageTitle,
      duration: duration || 0
    };
    fetch('/api/audit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(entry)
    }).catch(() => {});
  }

  // Public tracker — call whenever a page opens
  window.auditTrackPage = function(page, pageTitle) {
    const now = Date.now();
    // Log time on previous page
    if (_curPage && _pageStart) {
      const dur = Math.round((now - _pageStart) / 1000);
      if (dur >= 2) _send('page_exit', _curPage, _curTitle, dur);
    }
    _curPage  = page;
    _curTitle = pageTitle;
    _pageStart = now;
    _send('page_view', page, pageTitle, 0);
  };

  // Log on tab close / navigation away
  window.addEventListener('pagehide', () => {
    if (_curPage && _pageStart) {
      const dur = Math.round((Date.now() - _pageStart) / 1000);
      if (dur >= 2) {
        const u = getUser ? getUser() : null;
        const entry = JSON.stringify({
          sessionId: _sid,
          userId: u ? u.name : 'Anonymous',
          userName: u ? u.name : 'Anonymous',
          userInitials: u ? u.initials : '?',
          action: 'page_exit', page: _curPage,
          pageTitle: _curTitle, duration: dur
        });
        navigator.sendBeacon('/api/audit', new Blob([entry], { type: 'application/json' }));
      }
    }
  });
})();

// ══ AUDIT LOG ADMIN DASHBOARD ═════════════════════════════════════════════════
let _alRawLog = [];

async function alLoad() {
  const days = document.getElementById('alDaysFilter')?.value || 30;
  document.getElementById('alContent').innerHTML = '<div style="text-align:center;padding:40px;color:var(--muted);">⏳ Loading…</div>';
  try {
    const r = await fetch(`/api/audit?days=${days}`, { headers: adminHeaders() });
    if (!r.ok) { document.getElementById('alContent').innerHTML = '<div style="color:var(--danger);padding:20px;">Failed to load audit log.</div>'; return; }
    const data = await r.json();
    _alRawLog = data.log || [];
    alPopulateFilters();
    alRender();
  } catch(e) {
    document.getElementById('alContent').innerHTML = '<div style="color:var(--danger);padding:20px;">Error loading audit log.</div>';
  }
}

function alPopulateFilters() {
  const users = [...new Set(_alRawLog.map(e => e.userName).filter(Boolean))].sort();
  const sel = document.getElementById('alUserFilter');
  const cur = sel.value;
  sel.innerHTML = '<option value="">All Users</option>' +
    users.map(u => `<option value="${u}" ${cur===u?'selected':''}>${u}</option>`).join('');
}

function alRender() {
  const userF = document.getElementById('alUserFilter')?.value || '';
  const pageF = document.getElementById('alPageFilter')?.value || '';

  let log = _alRawLog;
  if (userF) log = log.filter(e => e.userName === userF);
  if (pageF) log = log.filter(e => e.page === pageF);

  // ── Stats ──────────────────────────────────────────────────────────────────
  const PAGE_VIEWS  = log.filter(e => e.action === 'page_view');
  const PAGE_EXITS  = log.filter(e => e.action === 'page_exit');
  const uniqueUsers = [...new Set(log.map(e => e.userId))].length;
  const uniqueSess  = [...new Set(log.map(e => e.sessionId))].length;
  const totalTime   = PAGE_EXITS.reduce((s, e) => s + (e.duration || 0), 0);
  const avgSession  = uniqueSess > 0 ? Math.round(totalTime / uniqueSess) : 0;

  const statCard = (val, lbl, color) =>
    `<div style="background:var(--surface2);border:1px solid var(--border);border-radius:10px;padding:14px 16px;">
      <div style="font-size:24px;font-weight:800;color:${color};letter-spacing:-.02em;">${val}</div>
      <div style="font-size:10px;font-family:'DM Mono',monospace;letter-spacing:.1em;text-transform:uppercase;color:var(--muted);margin-top:4px;">${lbl}</div>
    </div>`;

  document.getElementById('alStats').innerHTML =
    statCard(uniqueUsers, 'Unique Users', 'var(--accent)') +
    statCard(uniqueSess, 'Sessions', '#60a5fa') +
    statCard(PAGE_VIEWS.length, 'Page Views', '#4ade80') +
    statCard(fmtDur(avgSession), 'Avg Session', '#f59e0b');

  if (!log.length) {
    document.getElementById('alContent').innerHTML =
      '<div style="text-align:center;padding:48px;color:var(--muted);">No activity data for this period.</div>';
    return;
  }

  // ── Group into sessions ────────────────────────────────────────────────────
  const sessMap = {};
  log.forEach(e => {
    if (!sessMap[e.sessionId]) sessMap[e.sessionId] = {
      sessionId: e.sessionId, userName: e.userName, userInitials: e.userInitials,
      start: e.timestamp, end: e.timestamp, pages: [], totalDuration: 0, events: []
    };
    const s = sessMap[e.sessionId];
    if (e.timestamp < s.start) s.start = e.timestamp;
    if (e.timestamp > s.end)   s.end   = e.timestamp;
    if (e.action === 'page_view') s.pages.push({ page: e.page, title: e.pageTitle, time: e.timestamp });
    if (e.action === 'page_exit') s.totalDuration += (e.duration || 0);
    s.events.push(e);
  });

  const sessions = Object.values(sessMap)
    .sort((a, b) => b.start.localeCompare(a.start));

  // ── Render table ───────────────────────────────────────────────────────────
  const PAGE_ICONS = { landing:'🏠', articles:'📚', skill_matrix:'🧠', process_puzzle:'🧩',
    dashboard:'📊', roadmap:'🗺', about:'ℹ️', kpi:'📈', delivery_journey:'🏛️' };
  const PAGE_COLORS = { landing:'#e8c97a', articles:'#00c8cc', skill_matrix:'#a78bfa',
    process_puzzle:'#f87171', dashboard:'#f59e0b', roadmap:'#34d399' };

  let html = `<table style="width:100%;border-collapse:collapse;">
    <thead>
      <tr style="border-bottom:2px solid var(--border);">
        <th style="padding:10px 14px;text-align:left;font-size:10px;font-family:'DM Mono',monospace;letter-spacing:.12em;text-transform:uppercase;color:var(--muted);">User</th>
        <th style="padding:10px 14px;text-align:left;font-size:10px;font-family:'DM Mono',monospace;letter-spacing:.12em;text-transform:uppercase;color:var(--muted);">Date & Time</th>
        <th style="padding:10px 14px;text-align:left;font-size:10px;font-family:'DM Mono',monospace;letter-spacing:.12em;text-transform:uppercase;color:var(--muted);">Pages Visited</th>
        <th style="padding:10px 14px;text-align:left;font-size:10px;font-family:'DM Mono',monospace;letter-spacing:.12em;text-transform:uppercase;color:var(--muted);">Time Spent</th>
        <th style="padding:10px 14px;text-align:left;font-size:10px;font-family:'DM Mono',monospace;letter-spacing:.12em;text-transform:uppercase;color:var(--muted);">Session</th>
      </tr>
    </thead>
    <tbody>`;

  sessions.forEach(s => {
    const dt = new Date(s.start);
    const dateStr = dt.toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' });
    const timeStr = dt.toLocaleTimeString('en-GB', { hour:'2-digit', minute:'2-digit' });
    const uniquePages = [...new Map(s.pages.map(p => [p.page, p])).values()];

    html += `<tr style="border-bottom:1px solid var(--border);transition:background .12s;" onmouseover="this.style.background='rgba(255,255,255,.03)'" onmouseout="this.style.background=''">
      <td style="padding:12px 14px;">
        <div style="display:flex;align-items:center;gap:9px;">
          <div style="width:30px;height:30px;border-radius:50%;background:linear-gradient(135deg,#3b82f6,#8b5cf6);display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:#fff;flex-shrink:0;">${s.userInitials||'?'}</div>
          <span style="font-weight:600;color:var(--text);font-size:13.5px;">${s.userName||'Anonymous'}</span>
        </div>
      </td>
      <td style="padding:12px 14px;color:var(--text-secondary);font-size:12.5px;">
        <div style="font-weight:600;">${dateStr}</div>
        <div style="color:var(--muted);font-size:11px;margin-top:1px;">${timeStr}</div>
      </td>
      <td style="padding:12px 14px;">
        <div style="display:flex;flex-wrap:wrap;gap:4px;">
          ${uniquePages.map(p => {
            const col = PAGE_COLORS[p.page] || '#9ca3af';
            const icon = PAGE_ICONS[p.page] || '📄';
            return `<span style="display:inline-flex;align-items:center;gap:4px;background:${col}15;border:1px solid ${col}30;color:${col};border-radius:99px;padding:2px 9px;font-size:11px;font-weight:600;">${icon} ${p.title||p.page}</span>`;
          }).join('')}
        </div>
      </td>
      <td style="padding:12px 14px;">
        <span style="font-family:'DM Mono',monospace;font-size:13px;font-weight:700;color:var(--text);">${fmtDur(s.totalDuration)}</span>
      </td>
      <td style="padding:12px 14px;">
        <span style="font-family:'DM Mono',monospace;font-size:10px;color:var(--muted);">${s.sessionId.slice(-6)}</span>
      </td>
    </tr>`;
  });

  html += '</tbody></table>';
  document.getElementById('alContent').innerHTML = html;
}

function fmtDur(s) {
  if (!s) return '—';
  if (s < 60) return `${s}s`;
  const m = Math.floor(s/60), sec = s%60;
  if (m < 60) return `${m}m ${sec}s`;
  return `${Math.floor(m/60)}h ${m%60}m`;
}

function alDownloadCSV() {
  if (!_alRawLog.length) { showToast('No data to export', 'info'); return; }
  const headers = ['Timestamp','User','Session ID','Action','Page','Page Title','Duration (s)'];
  const rows = _alRawLog.map(e => [
    e.timestamp, e.userName, e.sessionId, e.action, e.page, e.pageTitle, e.duration
  ].map(v => `"${String(v||'').replace(/"/g,'""')}"`).join(','));
  const csv = [headers.join(','), ...rows].join('\r\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob(['﻿'+csv], { type:'text/csv;charset=utf-8;' }));
  a.download = `audit_log_${new Date().toISOString().slice(0,10)}.csv`;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  showToast('Audit log exported ✓', 'success');
}

async function alClear() {
  if (!confirm('Clear all audit log data? This cannot be undone.')) return;
  await fetch('/api/audit', { method:'DELETE', headers: adminHeaders() });
  _alRawLog = [];
  alRender();
  showToast('Audit log cleared', 'success');
}

// ══ TECH ANIMATIONS ══════════════════════════════════════════════════════════
let _dwTechInitDone = false;

function dwInitTechEffects() {
  if (_dwTechInitDone) {
    // Just show system status again
    const s = document.getElementById('dwSysStatus');
    if (s) s.style.display = 'flex';
    return;
  }
  _dwTechInitDone = true;

  // ── 1. Tech character rain ─────────────────────────────────────────────────
  const layer = document.getElementById('dwTechLayer');
  if (layer) {
    const CHARS = ['0','1','A','B','C','D','E','F','0x','FF','00','01','10',
                   '</>', '{  }', '[ ]', '::', '>>', '<<', '&&', '||',
                   '≈','∑','∞','∂','Δ','π','λ','∇','⊕','⊗'];
    for (let i = 0; i < 28; i++) {
      const el = document.createElement('span');
      el.className = 'dw-tc';
      el.textContent = CHARS[Math.floor(Math.random() * CHARS.length)];
      const size = 9 + Math.random() * 6;
      const opacity = 0.035 + Math.random() * 0.07;
      const dur = 10 + Math.random() * 18;
      const del = Math.random() * 12;
      el.style.cssText = `left:${1 + Math.random() * 98}%;bottom:${Math.random() * 100}%;font-size:${size}px;color:rgba(232,201,122,${opacity});animation-duration:${dur}s;animation-delay:${del}s;`;
      layer.appendChild(el);
      // Periodically swap character
      setInterval(() => {
        el.textContent = CHARS[Math.floor(Math.random() * CHARS.length)];
      }, 2000 + Math.random() * 4000);
    }
  }

  // ── 2. System status indicator ─────────────────────────────────────────────
  const status = document.getElementById('dwSysStatus');
  if (status) status.style.display = 'flex';

  // ── 3. Typewriter on subtitle (plays once) ─────────────────────────────────
  const sub = document.querySelector('.dw-hero-sub');
  if (sub && !sub.dataset.typed) {
    sub.dataset.typed = '1';
    const fullText = sub.textContent.trim();
    sub.innerHTML = '';
    const cursor = document.createElement('span');
    cursor.className = 'dw-cursor';
    sub.appendChild(cursor);

    let i = 0;
    setTimeout(() => {
      const tw = setInterval(() => {
        if (i < fullText.length) {
          sub.insertBefore(document.createTextNode(fullText[i]), cursor);
          i++;
        } else {
          clearInterval(tw);
          setTimeout(() => { if (cursor.parentNode) cursor.remove(); }, 2200);
        }
      }, 18);
    }, 600);
  }

  // ── 4. Occasional title glitch ─────────────────────────────────────────────
  const title = document.querySelector('.dw-hero-title');
  if (title) {
    const glitch = () => {
      const steps = [
        () => { title.style.transform = 'skewX(-2deg) translateX(-3px)'; title.style.filter = 'hue-rotate(15deg) brightness(1.2)'; },
        () => { title.style.transform = 'skewX(1.5deg) translateX(2px)'; title.style.filter = 'hue-rotate(-10deg)'; },
        () => { title.style.transform = 'translateX(-1px)'; title.style.filter = ''; },
        () => { title.style.transform = ''; title.style.filter = ''; }
      ];
      steps.forEach((fn, i) => setTimeout(fn, i * 70));
    };
    // First glitch after 4s, then random intervals 8-15s
    setTimeout(function scheduleGlitch() {
      glitch();
      setTimeout(scheduleGlitch, 8000 + Math.random() * 7000);
    }, 4000);
  }

  // ── 5. Floating data badges ────────────────────────────────────────────────
  const landing = document.getElementById('dwLanding');
  if (landing) {
    const dataSnippets = ['SYS::OK','NODE_12','PROC:OK','AUTH::1','KB:LIVE','SKL:ACT','API::UP'];
    dataSnippets.forEach((txt, i) => {
      const badge = document.createElement('div');
      badge.className = 'dw-data-flash';
      badge.textContent = txt;
      const dur = 4 + Math.random() * 4;
      badge.style.cssText = `left:${3+Math.random()*94}%;top:${10+Math.random()*80}%;animation-duration:${dur}s;animation-delay:${Math.random()*8}s;`;
      landing.appendChild(badge);
    });
  }
}

function dwHideTechEffects() {
  const s = document.getElementById('dwSysStatus');
  if (s) s.style.display = 'none';
}

// ══ MASTERCLASS NAV ══════════════════════════════════════════════════════════
function mcToggleBrowse(e) {
  e.stopPropagation();
  const btn = document.getElementById('mcBrowseBtn');
  btn.classList.toggle('open');
}
function mcCloseBrowse() {
  document.getElementById('mcBrowseBtn').classList.remove('open');
}
// Close dropdown when clicking outside
document.addEventListener('click', () => mcCloseBrowse());

function mcGoTo(section) {
  hideLanding();
  if (section === 'knowledge') {
    history.pushState({screen:'articles'}, '');
    document.getElementById('pageTitle').textContent = 'All Articles';
    document.getElementById('pageMeta').textContent = "Browse and manage your team's knowledge base";
    document.querySelector('.main').style.display = '';
    filterCategory('All', document.getElementById('cat-all'));
  } else if (section === 'skillmatrix') {
    dwGoSkillMatrix();
  } else if (section === 'puzzle') {
    dwGoProcessPuzzle();
  }
}

// Show/hide nav with landing page
function mcNavUpdate() {
  const nav = document.getElementById('mcNav');
  const landing = document.getElementById('dwLanding');
  if (!nav || !landing) return;
  nav.style.display = landing.classList.contains('dw-hidden') ? 'none' : 'flex';
  // Show admin button & primary btn if admin
  const isAdm = !!getAdminPwd();
  const adminBtn = document.getElementById('mcAdminBtn');
  const startBtn = document.getElementById('mcGetStartedBtn');
  if (adminBtn) adminBtn.style.display = isAdm ? 'block' : 'none';
  if (startBtn) startBtn.style.display = 'flex';
}

// Search functionality
let _mcSearchTimer = null;
function mcHandleSearch(val) {
  clearTimeout(_mcSearchTimer);
  const results = document.getElementById('mcSearchResults');
  if (!val.trim()) { results.classList.remove('open'); results.innerHTML = ''; return; }
  _mcSearchTimer = setTimeout(() => mcDoSearch(val.trim()), 200);
}

function mcDoSearch(q) {
  const results = document.getElementById('mcSearchResults');
  const lower = q.toLowerCase();

  // Search knowledge articles
  const articleMatches = (allArticles || []).filter(a =>
    (a.title||'').toLowerCase().includes(lower) ||
    (a.excerpt||'').toLowerCase().includes(lower) ||
    (a.category||'').toLowerCase().includes(lower)
  ).slice(0, 4);

  // Search courses
  const courseMatches = (typeof ML_COURSES !== 'undefined' ? ML_COURSES : []).filter(c =>
    (c.title||'').toLowerCase().includes(lower) ||
    (c.desc||'').toLowerCase().includes(lower) ||
    (c.tag||'').toLowerCase().includes(lower) ||
    (c.level||'').toLowerCase().includes(lower)
  ).slice(0, 3);

  // Search course lessons
  const lessonMatches = [];
  if (typeof MLC !== 'undefined') {
    outer: for (const [cid, course] of Object.entries(MLC)) {
      for (const mod of course.modules) {
        for (const lesson of mod.lessons) {
          if ((lesson.title||'').toLowerCase().includes(lower) ||
              (lesson.html||'').replace(/<[^>]+>/g,'').toLowerCase().includes(lower)) {
            const parent = ML_COURSES.find(c => c.id === cid);
            lessonMatches.push({ courseId: cid, courseTitle: parent ? parent.title : cid, lessonTitle: lesson.title });
            if (lessonMatches.length >= 3) break outer;
          }
        }
      }
    }
  }

  if (!articleMatches.length && !courseMatches.length && !lessonMatches.length) {
    results.innerHTML = `<div class="mc-sr-empty">No results for "<strong>${q}</strong>"</div>`;
    results.classList.add('open');
    return;
  }

  const catColors = {'Platform':'#00c8cc','Product':'#a78bfa','Onboarding':'#34d399','Finance & FP&A':'#f59e0b','Engineering':'#60a5fa'};
  const highlight = (text, q) => {
    if (!text) return '';
    const re = new RegExp(`(${q.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')})`, 'gi');
    return text.replace(re, '<mark>$1</mark>');
  };

  let html = `<div class="mc-sr-header">Results for "${q}"</div>`;

  if (courseMatches.length) {
    html += `<div class="mc-sr-section-label">🎓 Courses</div>`;
    html += courseMatches.map(c => `<div class="mc-sr-item" onclick="mcOpenCourse('${c.id}')">
      <span class="mc-sr-cat" style="background:rgba(201,162,39,.12);color:#c9a227;border:1px solid rgba(201,162,39,.3);">${c.tag||'Course'}</span>
      <div style="flex:1;min-width:0;">
        <div class="mc-sr-title">${highlight(c.title, q)}</div>
        <div class="mc-sr-excerpt">${(c.desc||'').slice(0,90)}…</div>
      </div>
    </div>`).join('');
  }

  if (lessonMatches.length) {
    html += `<div class="mc-sr-section-label">📖 Lessons</div>`;
    html += lessonMatches.map(l => `<div class="mc-sr-item" onclick="mcOpenCourse('${l.courseId}')">
      <span class="mc-sr-cat" style="background:rgba(201,162,39,.07);color:#c9a227;border:1px solid rgba(201,162,39,.2);">Lesson</span>
      <div style="flex:1;min-width:0;">
        <div class="mc-sr-title">${highlight(l.lessonTitle, q)}</div>
        <div class="mc-sr-excerpt">In: ${l.courseTitle}</div>
      </div>
    </div>`).join('');
  }

  if (articleMatches.length) {
    html += `<div class="mc-sr-section-label">📚 Knowledge Articles</div>`;
    html += articleMatches.map(a => {
      const col = catColors[a.category] || '#e8c97a';
      const excerpt = (a.excerpt || '').replace(/<[^>]+>/g,'').slice(0,80) + '…';
      return `<div class="mc-sr-item" onclick="mcOpenArticle(${a.id})">
        <span class="mc-sr-cat" style="background:${col}20;color:${col};border:1px solid ${col}40;">${a.category||'Article'}</span>
        <div style="flex:1;min-width:0;">
          <div class="mc-sr-title">${highlight(a.title, q)}</div>
          <div class="mc-sr-excerpt">${excerpt}</div>
        </div>
      </div>`;
    }).join('');
  }

  results.innerHTML = html;
  results.classList.add('open');
}

function mcOpenArticle(id) {
  mcClearSearch();
  hideLanding();
  document.querySelector('.main').style.display = '';
  history.pushState({screen:'articles'}, '');
  filterCategory('All', document.getElementById('cat-all'));
  setTimeout(() => openArticle(id), 300);
}

function mcOpenCourse(id) {
  mcClearSearch();
  dwGoLearning();
  setTimeout(() => mlOpenCourse(id), 350);
}

function mcClearSearch() {
  document.getElementById('mcSearchInput').value = '';
  const r = document.getElementById('mcSearchResults');
  r.classList.remove('open');
  r.innerHTML = '';
}

// Close search on outside click
document.addEventListener('click', (e) => {
  if (!e.target.closest('.mc-search-wrap')) mcClearSearch();
});

// ══ ABOUT VIDEO PLAYER ═══════════════════════════════════════════════════════
const DW_AV_SLIDES = 7;
const DW_AV_DURATION = 8000; // ms per slide
const DW_AV_CHAPTER_LABELS = ['Introduction','Knowledge Hub','Skill Matrix','KPI Dashboard','Project Stories','Process Puzzle','Why It Matters'];

let dwAvIdx = 0;
let dwAvPlaying = true;
let dwAvProgInterval = null;
let dwAvProgElapsed = 0;

function dwOpenAbout() {
  document.getElementById('dwAboutOverlay').classList.add('active');
  dwAvIdx = 0;
  dwAvPlaying = true;
  _dwAvBuildChapters();
  _dwAvShow(0);
  _dwAvStartTimer();
}

function dwCloseAbout() {
  document.getElementById('dwAboutOverlay').classList.remove('active');
  _dwAvStopTimer();
}

function _dwAvBuildChapters() {
  document.getElementById('dwAvChapters').innerHTML =
    DW_AV_CHAPTER_LABELS.map((l,i)=>`<div class="dw-av-chap${i===0?' active':''}" onclick="dwAvGoTo(${i})" title="${l}"></div>`).join('');
}

function _dwAvShow(idx) {
  const slides = document.querySelectorAll('.dw-av-slide');
  const chaps  = document.querySelectorAll('.dw-av-chap');

  // Remove entering/leaving from all
  slides.forEach(s => { s.classList.remove('active','entering','leaving'); });

  slides[idx].classList.add('active','entering');

  chaps.forEach((c,i) => {
    c.className = 'dw-av-chap' + (i===idx?' active':i<idx?' done':'');
  });

  document.getElementById('dwAvBarTitle').textContent = DW_AV_CHAPTER_LABELS[idx];
  document.getElementById('dwAvSlideNum').textContent = `${idx+1} / ${DW_AV_SLIDES}`;
  document.getElementById('dwAvPlayBtn').textContent = dwAvPlaying ? '⏸' : '▶';
  _dwAvResetProg();
}

function _dwAvResetProg() {
  dwAvProgElapsed = 0;
  document.getElementById('dwAvProgFill').style.width = '0%';
}

function _dwAvStartTimer() {
  _dwAvStopTimer();
  if (!dwAvPlaying) return;
  const tick = 50;
  dwAvProgInterval = setInterval(() => {
    dwAvProgElapsed += tick;
    const pct = Math.min(dwAvProgElapsed / DW_AV_DURATION * 100, 100);
    document.getElementById('dwAvProgFill').style.width = pct + '%';
    if (dwAvProgElapsed >= DW_AV_DURATION) dwAvNext();
  }, tick);
}

function _dwAvStopTimer() {
  if (dwAvProgInterval) { clearInterval(dwAvProgInterval); dwAvProgInterval = null; }
}

function dwAvNext() {
  _dwAvStopTimer();
  if (dwAvIdx < DW_AV_SLIDES - 1) {
    dwAvIdx++;
    _dwAvShow(dwAvIdx);
    if (dwAvPlaying) _dwAvStartTimer();
  } else {
    // End of all slides
    dwAvPlaying = false;
    document.getElementById('dwAvPlayBtn').textContent = '↺';
    document.getElementById('dwAvProgFill').style.width = '100%';
  }
}

function dwAvPrev() {
  _dwAvStopTimer();
  if (dwAvIdx > 0) {
    dwAvIdx--;
    _dwAvShow(dwAvIdx);
    if (dwAvPlaying) _dwAvStartTimer();
  }
}

function dwAvGoTo(idx) {
  _dwAvStopTimer();
  dwAvIdx = idx;
  _dwAvShow(idx);
  if (dwAvPlaying) _dwAvStartTimer();
}

function dwAvTogglePlay() {
  dwAvPlaying = !dwAvPlaying;
  if (dwAvPlaying) {
    // Restart from beginning if at end
    if (dwAvIdx >= DW_AV_SLIDES - 1) { dwAvIdx = 0; _dwAvShow(0); }
    _dwAvStartTimer();
  } else {
    _dwAvStopTimer();
  }
  document.getElementById('dwAvPlayBtn').textContent = dwAvPlaying ? '⏸' : '▶';
}

// Keyboard navigation
document.addEventListener('keydown', e => {
  if (!document.getElementById('dwAboutOverlay').classList.contains('active')) return;
  if (e.key === 'ArrowRight') { e.preventDefault(); dwAvNext(); }
  if (e.key === 'ArrowLeft')  { e.preventDefault(); dwAvPrev(); }
  if (e.key === ' ')          { e.preventDefault(); dwAvTogglePlay(); }
  if (e.key === 'Escape')     { dwCloseAbout(); }
});

// ══ LEADERSHIP INSIGHTS ═══════════════════════════════════════════════════════
let _liAccess = null; // null=unchecked, true=granted, false=denied

async function liCheckAccess() {
  if (_liAccess !== null) return _liAccess;
  const u = getUser();
  if (!u) { _liAccess = false; return false; }
  // Admins always have access — no API call needed
  if (!!getAdminPwd()) { _liAccess = true; return true; }
  try {
    const r = await fetch(`/api/leadership/check?user=${encodeURIComponent(u.name)}`);
    const d = await r.json();
    _liAccess = d.access === true;
  } catch(e) { _liAccess = false; }
  return _liAccess;
}

async function liOpen() {
  const overlay = document.getElementById('liOverlay');
  overlay.style.display = 'block';
  document.querySelector('.main').style.display = 'none';
  if (!history.state || history.state.screen !== 'leadership') {
    history.pushState({screen:'leadership'}, '');
  }
  const hasAccess = await liCheckAccess();
  if (hasAccess) {
    liShowPanel('landing');
    const u = getUser();
    const chip = document.getElementById('liUserChip');
    if (chip && u) chip.textContent = u.name;
    const title = document.getElementById('liWelcomeTitle');
    if (title && u) title.textContent = `Welcome, ${u.name.split(' ')[0]}`;
  } else {
    liShowPanel('denied');
  }
  // Track page view
  if (typeof auditTrackPage === 'function') auditTrackPage('leadership','Leadership Insights');
}

function liHide() {
  document.getElementById('liOverlay').style.display = 'none';
  showLanding();
}

function liShowPanel(panel) {
  ['landing','issues','ideas','esw','denied','rocketlane'].forEach(p => {
    const el = document.getElementById(`liPanel${p.charAt(0).toUpperCase()+p.slice(1)}`);
    if (el) el.style.display = p === panel ? 'block' : 'none';
  });
  // Scroll overlay to top when switching panels
  const overlay = document.getElementById('liOverlay');
  if (overlay) overlay.scrollTop = 0;
  // Track sub-page
  const titles = {landing:'Leadership Insights',issues:'Issue Tracker',ideas:'Process Improvement Ideas',esw:'EWS — Early Warning System',denied:'Access Denied',rocketlane:'Rocketlane Dashboard'};
  if (typeof auditTrackPage === 'function' && panel !== 'denied') auditTrackPage(`leadership_${panel}`, titles[panel] || panel);
  // Trigger animations after a brief delay
  if (panel === 'ideas' || panel === 'esw') {
    setTimeout(() => liInitScrollAnimations(), 100);
    if (panel === 'esw') setTimeout(() => liAnimateImpactBars(), 600);
  }
  // Fade-up for dashboard
  if (panel === 'ideas') {
    setTimeout(() => {
      document.querySelectorAll('.pi-fade-up').forEach((el, i) => {
        setTimeout(() => el.classList.add('visible'), i * 80);
      });
    }, 80);
  }
  // Rocketlane init
  if (panel === 'rocketlane') setTimeout(() => liInitRocketlane(), 100);
}

// ── Rocketlane Dashboard ──────────────────────────────────────────────────────
let rlProjectsData = [];
let rlCurrentFilter = 'all';

async function liInitRocketlane(forceRefresh) {
  const content = document.getElementById('rlContent');
  if (!content) return;
  content.innerHTML = '<div class="rl-loader"><div class="rl-spin"></div><div style="font-size:13px;color:rgba(255,255,255,.3);">Fetching projects from Rocketlane…</div></div>';
  try {
    const resp = await fetch(forceRefresh ? '/api/rocketlane/projects?refresh=1' : '/api/rocketlane/projects');
    const json = await resp.json();
    if (resp.status === 503 && json.error === 'not_configured') {
      content.innerHTML = `<div class="rl-setup">
        <div style="font-size:44px;margin-bottom:16px;">🔗</div>
        <div style="font-size:20px;font-weight:800;color:#fff;margin-bottom:8px;">Connect Rocketlane</div>
        <div style="font-size:13px;color:rgba(255,255,255,.45);line-height:1.7;">Add your Rocketlane API key to enable live project syncing. The key is stored securely as a server-side environment variable.</div>
        <div class="rl-setup-steps">
          <div style="color:rgba(255,255,255,.25);margin-bottom:4px;"># How to connect</div>
          <div>1. Rocketlane → <span style="color:rgba(251,146,60,.8);">Settings → API Keys</span> → Create key (Read access)</div>
          <div>2. Vercel Dashboard → Project → <span style="color:rgba(134,239,172,.8);">Environment Variables</span></div>
          <div>3. Add: <span style="color:rgba(147,197,253,.9);">ROCKETLANE_API_KEY</span> = &lt;your-key&gt;</div>
          <div>4. Redeploy → click <span style="color:rgba(251,191,36,.8);">↻</span> button</div>
        </div>
        <button onclick="liInitRocketlane(true)" style="background:rgba(251,146,60,.12);border:1px solid rgba(251,146,60,.3);color:rgba(251,191,36,.9);border-radius:8px;padding:10px 22px;font-size:13px;font-family:'DM Sans',sans-serif;font-weight:600;cursor:pointer;">↻ Try Again</button>
      </div>`;
      return;
    }
    if (!resp.ok) throw new Error(json.message || `HTTP ${resp.status}`);
    let raw = [];
    if (Array.isArray(json)) raw = json;
    else if (json.data && Array.isArray(json.data)) raw = json.data;
    else if (json.data && Array.isArray(json.data.projects)) raw = json.data.projects;
    else if (json.projects) raw = json.projects;
    else { const v = Object.values(json.data || json); const a = v.find(x => Array.isArray(x)); if (a) raw = a; }
    rlProjectsData = raw.map(p => ({
      id: p.projectId || p.id,
      name: p.projectName || p.name || 'Unnamed Project',
      status: rlNormStatus(p.status || p.projectStatus || ''),
      phase: rlGetPhase(p),
      progress: rlGetProgress(p),
      completionPct: typeof p.completionPct === 'number' ? p.completionPct : rlGetProgress(p),
      completionTasks: p.completionTasks || null,
      dueDate: p.dueDate || p.endDate || p.expectedEndDate || '',
      goLiveDate: p.dueDate || p.endDate || p.expectedEndDate || '',
      customer: (p.customer && (p.customer.companyName || p.customer.name)) || p.clientName || (p.account && p.account.name) || '',
    }));
    rlCurrentFilter = 'all';
    rlRenderDashboard();
  } catch(e) {
    content.innerHTML = `<div class="rl-loader"><div style="font-size:36px;opacity:.5;">⚠️</div><div style="font-size:15px;font-weight:700;color:#fff;">Failed to load projects</div><div style="font-size:13px;color:rgba(255,255,255,.4);max-width:380px;text-align:center;">${e.message}</div><button onclick="liInitRocketlane(true)" style="background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.12);color:rgba(255,255,255,.6);border-radius:8px;padding:9px 18px;font-size:13px;font-family:'DM Sans',sans-serif;cursor:pointer;">↻ Retry</button></div>`;
  }
}

function rlNormStatus(s) {
  // Rocketlane API returns status as {value: 2, label: "In progress"}
  const str = (s && typeof s === 'object') ? (s.label || s.name || String(s.value || '')) : String(s || '');
  const m = {'IN_PROGRESS':'inprogress','In progress':'inprogress','in_progress':'inprogress','BLOCKED':'blocked','Blocked':'blocked','COMPLETED':'completed','Completed':'completed','ON_HOLD':'onhold','On Hold':'onhold','on_hold':'onhold','PROPOSED':'proposed','Proposed':'proposed','IN_PLANNING':'inplanning','In Planning':'inplanning','in_planning':'inplanning'};
  return m[str] || str.toLowerCase().replace(/[^a-z]/g,'') || 'unknown';
}
function rlStatusLabel(s) { return {'inprogress':'In Progress','blocked':'Blocked','completed':'Completed','onhold':'On Hold','proposed':'Proposed','inplanning':'In Planning'}[s] || s; }
function rlGetPhase(p) {
  if (p.currentPhase) return typeof p.currentPhase === 'string' ? p.currentPhase : (p.currentPhase.name || '');
  if (p.currentPhases && p.currentPhases.length) return Array.isArray(p.currentPhases) ? p.currentPhases[0] : p.currentPhases;
  if (p.phases && p.phases.length) { const a = p.phases.find(ph => ph.status==='IN_PROGRESS'||ph.isActive); return a ? (a.name||a.phaseName||'') : ''; }
  return '';
}
function rlGetProgress(p) {
  if (typeof p.completionPct === 'number') return p.completionPct;
  if (typeof p.progress === 'number') return p.progress;
  if (typeof p.completionPercentage === 'number') return p.completionPercentage;
  if ((p.status||'').toString().includes('COMPLET')) return 100;
  return null;
}

function rlSetFilter(f) {
  rlCurrentFilter = (f === rlCurrentFilter) ? 'all' : f;
  // Ensure current view tab is visible
  const cp = document.getElementById('rl2CurrentPane'), sp = document.getElementById('rl2SnapPane');
  if (cp && sp && sp.style.display !== 'none') {
    cp.style.display = ''; sp.style.display = 'none';
    document.getElementById('rl2TabCurrent')?.classList.add('rl2-tab-active');
    document.getElementById('rl2TabSnap')?.classList.remove('rl2-tab-active');
  }
  rlRefreshTable();
}

// Shared helpers
const RL_STATUS_COLORS = {inprogress:'#3b82f6',blocked:'#ef4444',completed:'#22c55e',onhold:'#9ca3af',proposed:'#a855f7',inplanning:'#eab308'};
const RL_STATUS_BG     = {inprogress:'rgba(59,130,246,.12)',blocked:'rgba(239,68,68,.12)',completed:'rgba(34,197,94,.12)',onhold:'rgba(107,114,128,.12)',proposed:'rgba(168,85,247,.12)',inplanning:'rgba(234,179,8,.12)'};
const RL_STATUS_BORDER = {inprogress:'rgba(59,130,246,.28)',blocked:'rgba(239,68,68,.28)',completed:'rgba(34,197,94,.28)',onhold:'rgba(107,114,128,.28)',proposed:'rgba(168,85,247,.28)',inplanning:'rgba(234,179,8,.28)'};
const RL_STATUS_TEXT   = {inprogress:'rgba(147,197,253,1)',blocked:'rgba(252,165,165,1)',completed:'rgba(134,239,172,1)',onhold:'rgba(209,213,219,1)',proposed:'rgba(216,180,254,1)',inplanning:'rgba(253,224,71,1)'};
const RL_ICON_POOL = ['#3b82f6','#8b5cf6','#f59e0b','#10b981','#ef4444','#ec4899','#06b6d4','#f97316'];
function rlIconColor(name){let h=0;for(let i=0;i<name.length;i++)h=(h*31+name.charCodeAt(i))&0xffffffff;return RL_ICON_POOL[Math.abs(h)%RL_ICON_POOL.length];}
function rlBadge(s){return `<span class="rl-badge" style="background:${RL_STATUS_BG[s]||'rgba(255,255,255,.06)'};border:1px solid ${RL_STATUS_BORDER[s]||'rgba(255,255,255,.1)'};color:${RL_STATUS_TEXT[s]||'rgba(255,255,255,.5)'}"><span class="rl-dot" style="background:${RL_STATUS_COLORS[s]||'#aaa'};"></span>${rlStatusLabel(s)}</span>`;}
function rlFmtDate(d,short){if(!d)return'—';try{const opts=short?{day:'2-digit',month:'short'}:{day:'2-digit',month:'short',year:'2-digit'};return new Date(d).toLocaleDateString('en-GB',opts);}catch{return d;}}
function rlDaysLeft(d){try{const t=new Date();t.setHours(0,0,0,0);return Math.ceil((new Date(d)-t)/86400000);}catch{return null;}}

function rlRenderDashboard() {
  const content = document.getElementById('rlContent');
  if (!content) return;

  const total = rlProjectsData.length;
  const byStatus = {};
  rlProjectsData.forEach(p => { byStatus[p.status] = (byStatus[p.status]||0)+1; });
  const inProgress = byStatus['inprogress']||0;
  const blocked    = byStatus['blocked']||0;
  const completed  = byStatus['completed']||0;
  const onHold     = byStatus['onhold']||0;

  // Avg completion across active projects only (exclude proposed/completed)
  const active = rlProjectsData.filter(p => p.status !== 'completed' && p.status !== 'proposed');
  const avgPct = active.length ? Math.round(active.reduce((s,p) => s+(p.completionPct||0), 0) / active.length) : 0;
  const noGoLive = rlProjectsData.filter(p => !p.goLiveDate && p.status !== 'completed' && p.status !== 'proposed').length;

  const kpis = [
    { n: total,     l: 'Total Projects',   col: 'rgba(255,255,255,.9)',  f: 'all' },
    { n: inProgress,l: 'In Progress',       col: 'rgba(147,197,253,1)',   f: 'inprogress' },
    { n: blocked,   l: 'Blocked',           col: blocked>0?'rgba(252,165,165,1)':'rgba(255,255,255,.9)',  f: 'blocked' },
    { n: `${avgPct}%`, l: 'Avg Completion', col: avgPct>=70?'rgba(134,239,172,1)':avgPct>=40?'rgba(253,224,71,1)':'rgba(252,165,165,1)', f: null },
    { n: completed, l: 'Completed',          col: 'rgba(134,239,172,1)',  f: 'completed' },
    { n: noGoLive,  l: 'No Go-Live Date',    col: noGoLive>0?'rgba(253,224,71,1)':'rgba(255,255,255,.5)', f: null },
  ];
  const kpiHtml = kpis.map(k =>
    `<div class="rl2-kpi"${k.f?` onclick="rlSetFilter('${k.f}')" style="cursor:pointer;"`:''}>`+
    `<div class="rl2-kpi-n" style="color:${k.col};">${k.n}</div>`+
    `<div class="rl2-kpi-l">${k.l}</div></div>`
  ).join('');

  const now = new Date();
  const timeStr = `${now.getHours().toString().padStart(2,'0')}:${now.getMinutes().toString().padStart(2,'0')}`;

  content.innerHTML =
    `<div class="rl2-header">`+
      `<div><div style="font-size:9px;font-family:'DM Mono',monospace;letter-spacing:.16em;text-transform:uppercase;color:rgba(255,255,255,.28);margin-bottom:4px;">Weekly Project Connect</div>`+
      `<div style="font-size:13px;font-weight:600;color:rgba(255,255,255,.38);">Task-weighted completion (done=100% · active=50% · to-do=0%)</div></div>`+
      `<div style="display:flex;gap:8px;align-items:center;">`+
        `<span style="font-size:11px;font-family:'DM Mono',monospace;color:rgba(255,255,255,.22);">Updated ${timeStr}</span>`+
        `<button onclick="rl2CaptureModal()" class="rl2-capture-btn">📸 Capture Snapshot</button>`+
        `<button onclick="liInitRocketlane(true)" title="Force refresh" style="background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.09);color:rgba(255,255,255,.4);border-radius:8px;padding:8px 12px;font-size:14px;cursor:pointer;transition:all .15s;" onmouseover="this.style.background='rgba(255,255,255,.09)'" onmouseout="this.style.background='rgba(255,255,255,.05)'">↻</button>`+
      `</div>`+
    `</div>`+
    `<div class="rl2-kpi-row">${kpiHtml}</div>`+
    `<div class="rl2-tabs">`+
      `<button class="rl2-tab rl2-tab-active" id="rl2TabCurrent" onclick="rl2SwitchTab('current')">📊 Current View</button>`+
      `<button class="rl2-tab" id="rl2TabSnap" onclick="rl2SwitchTab('snapshots')">📅 Snapshot History</button>`+
    `</div>`+
    `<div id="rl2CurrentPane"></div>`+
    `<div id="rl2SnapPane" style="display:none;"></div>`;

  rlRefreshTable();
  rl2LoadSnapshots();


}

function rlRefreshTable() {
  const pane = document.getElementById('rl2CurrentPane');
  if (!pane) return;

  const filterConf = [
    ['all','All'],['inprogress','In Progress'],['blocked','Blocked'],
    ['onhold','On Hold'],['inplanning','In Planning'],['proposed','Proposed'],['completed','Completed']
  ];
  const pillsHtml = filterConf.map(([k,l]) => {
    const n = k==='all' ? rlProjectsData.length : rlProjectsData.filter(p=>p.status===k).length;
    return `<button class="rl2-filter-pill${rlCurrentFilter===k?' rl2-active':''}" onclick="rlSetFilter('${k}')">${l} <span style="opacity:.4;font-size:10px;">${n}</span></button>`;
  }).join('');

  const statusPrio = {blocked:0,inprogress:1,inplanning:2,onhold:3,proposed:4,completed:5};
  const filtered = rlCurrentFilter==='all' ? rlProjectsData : rlProjectsData.filter(p=>p.status===rlCurrentFilter);
  const sorted = [...filtered].sort((a,b) => {
    const ap=statusPrio[a.status]??6, bp=statusPrio[b.status]??6;
    return ap!==bp ? ap-bp : (b.completionPct||0)-(a.completionPct||0);
  });

  if (!sorted.length) {
    pane.innerHTML = `<div class="rl2-filters">${pillsHtml}</div>`+
      `<div style="text-align:center;padding:64px 20px;color:rgba(255,255,255,.25);font-size:14px;">No projects with this status</div>`;
    return;
  }

  const today = new Date(); today.setHours(0,0,0,0);

  const headerRow =
    `<div class="rl2-proj-row" style="border-bottom:2px solid rgba(255,255,255,.07);padding:10px 20px;">` +
    `<div></div>` +
    `<div style="font-size:9px;font-family:'DM Mono',monospace;letter-spacing:.12em;text-transform:uppercase;color:rgba(255,255,255,.25);">Project</div>` +
    `<div style="font-size:9px;font-family:'DM Mono',monospace;letter-spacing:.12em;text-transform:uppercase;color:rgba(255,255,255,.25);">Status</div>` +
    `<div style="font-size:9px;font-family:'DM Mono',monospace;letter-spacing:.12em;text-transform:uppercase;color:rgba(255,255,255,.25);">% Complete</div>` +
    `<div style="font-size:9px;font-family:'DM Mono',monospace;letter-spacing:.12em;text-transform:uppercase;color:rgba(255,255,255,.25);">Current Phase</div>` +
    `<div style="font-size:9px;font-family:'DM Mono',monospace;letter-spacing:.12em;text-transform:uppercase;color:rgba(255,255,255,.25);">Go-Live Date</div>` +
    `</div>`;

  const rows = sorted.map(p => {
    const ic = rlIconColor(p.name);
    const ini = (p.name||'').split(/\s+/).slice(0,2).map(w=>w[0]).join('').toUpperCase()||'?';
    const pct = p.completionPct ?? (p.status==='completed' ? 100 : 0);
    const barColor = p.status==='blocked'?'#ef4444':p.status==='completed'?'#22c55e':pct>=70?'#22c55e':pct>=40?'#eab308':'#ef4444';

    const ct = p.completionTasks;
    const taskInfo = ct && ct.total>0
      ? `<div class="rl2-task-info">${ct.completed||0} done · ${ct.inprogress||0} active · ${ct.todo||0} to-do</div>` : '';

    const glDate = p.goLiveDate;
    const glMissing = !glDate && p.status!=='completed' && p.status!=='proposed';
    let glHtml;
    if (glMissing) {
      glHtml = `<div style="color:rgba(253,224,71,.85);font-size:11px;font-family:'DM Mono',monospace;font-weight:700;">⚠ Missing</div>`;
    } else if (glDate) {
      const glDays = Math.ceil((new Date(glDate)-today)/86400000);
      const glColor = glDays<0?'rgba(252,165,165,.9)':glDays<=14?'rgba(253,224,71,.9)':'rgba(255,255,255,.45)';
      const glSub = glDays<0&&p.status!=='completed'
        ? `<div style="font-size:10px;color:rgba(252,165,165,.6);">${Math.abs(glDays)}d overdue</div>`
        : glDays>=0&&glDays<=30&&p.status!=='completed'
          ? `<div style="font-size:10px;color:rgba(253,224,71,.55);">in ${glDays}d</div>` : '';
      glHtml = `<div style="color:${glColor};font-size:12px;font-family:'DM Mono',monospace;">${rlFmtDate(glDate)}</div>${glSub}`;
    } else {
      glHtml = `<div style="color:rgba(255,255,255,.18);font-size:12px;">—</div>`;
    }

    const phaseHtml = p.phase
      ? `<span style="font-size:11px;color:rgba(147,197,253,.8);background:rgba(147,197,253,.07);border:1px solid rgba(147,197,253,.15);border-radius:4px;padding:2px 8px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:155px;display:inline-block;" title="${p.phase}">${p.phase.length>22?p.phase.slice(0,20)+'…':p.phase}</span>`
      : `<span style="color:rgba(255,255,255,.15);font-size:11px;">—</span>`;

    const rowCls = `rl2-proj-row${p.status==='blocked'?' rl2-blocked-row':glMissing?' rl2-noglive-row':''}`;
    return `<div class="${rowCls}">` +
      `<div class="rl2-proj-icon" style="background:${ic}22;border:1px solid ${ic}44;color:${ic};">${ini}</div>` +
      `<div style="min-width:0;"><div class="rl2-proj-name">${p.name}</div>${p.customer?`<div class="rl2-proj-client">${p.customer}</div>`:''}</div>` +
      `<div>${rlBadge(p.status)}</div>` +
      `<div><div class="rl2-bar-wrap"><div class="rl2-bar-track"><div class="rl2-bar-fill" style="width:${pct}%;background:${barColor};"></div></div><span class="rl2-bar-pct" style="color:${barColor};">${pct}%</span></div>${taskInfo}</div>` +
      `<div>${phaseHtml}</div>` +
      `<div>${glHtml}</div>` +
      `</div>`;
  }).join('');

  pane.innerHTML = `<div class="rl2-filters">${pillsHtml}</div>`+
    `<div class="rl2-proj-grid">${headerRow}${rows}</div>`;
}

// ── Snapshot state ────────────────────────────────────────────────────────────
let rl2SnapsCache = [];
let rl2SnapType = 'weekly';
let rl2SelSnaps = [];
let rl2SnapSubTab = 'weekly';
let rl2TrendView = 'overall';
let rl2TrendFilter = [];
let rl2SelClient = '';

function rl2SwitchTab(tab) {
  const cp=document.getElementById('rl2CurrentPane'), sp=document.getElementById('rl2SnapPane');
  const tc=document.getElementById('rl2TabCurrent'), ts=document.getElementById('rl2TabSnap');
  if (!cp||!sp) return;
  if (tab==='current') {
    cp.style.display=''; sp.style.display='none';
    tc?.classList.add('rl2-tab-active'); ts?.classList.remove('rl2-tab-active');
  } else {
    cp.style.display='none'; sp.style.display='';
    tc?.classList.remove('rl2-tab-active'); ts?.classList.add('rl2-tab-active');
    rl2RenderSnapPane();
  }
}

function rl2CaptureModal() {
  const now = new Date();
  const weekLbl = `Week of ${now.toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'})}`;
  const monthLbl = `${now.toLocaleDateString('en-GB',{month:'long',year:'numeric'})}`;
  rl2SnapType = 'weekly';
  const m = document.createElement('div');
  m.className = 'rl2-modal-overlay'; m.id = 'rl2Modal';
  m.innerHTML =
    `<div class="rl2-modal-box">` +
    `<h3>📸 Capture Snapshot</h3>` +
    `<div style="font-size:13px;color:rgba(255,255,255,.38);margin-bottom:20px;">Save portfolio state for week-on-week comparison</div>` +
    `<div style="font-size:10px;font-family:'DM Mono',monospace;letter-spacing:.12em;text-transform:uppercase;color:rgba(255,255,255,.28);margin-bottom:8px;">Type</div>` +
    `<div class="rl2-modal-type">` +
      `<button class="rl2-type-opt active" id="rl2OWeek" onclick="rl2SetSnapType('weekly','${weekLbl}')">📅 Weekly</button>` +
      `<button class="rl2-type-opt" id="rl2OMon" onclick="rl2SetSnapType('monthly','${monthLbl}')">📆 Monthly</button>` +
    `</div>` +
    `<div style="font-size:10px;font-family:'DM Mono',monospace;letter-spacing:.12em;text-transform:uppercase;color:rgba(255,255,255,.28);margin-bottom:8px;">Label</div>` +
    `<input type="text" id="rl2SnapLbl" value="${weekLbl}" placeholder="e.g. Week of 16 Jun 2026" />` +
    `<div style="font-size:12px;color:rgba(255,255,255,.28);margin-top:10px;">${rlProjectsData.length} projects will be captured</div>` +
    `<div class="rl2-modal-footer">` +
      `<button onclick="document.getElementById('rl2Modal').remove()" style="background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.09);color:rgba(255,255,255,.45);border-radius:8px;padding:9px 18px;font-size:13px;cursor:pointer;font-family:'DM Sans',sans-serif;">Cancel</button>` +
      `<button id="rl2SaveBtn" onclick="rl2SaveSnapshot()" class="rl2-capture-btn" style="font-size:13px;padding:9px 20px;">💾 Capture</button>` +
    `</div></div>`;
  document.body.appendChild(m);
  m.addEventListener('click', e => { if(e.target===m) m.remove(); });
}

function rl2SetSnapType(type, lbl) {
  rl2SnapType = type;
  document.getElementById('rl2OWeek')?.classList.toggle('active', type==='weekly');
  document.getElementById('rl2OMon')?.classList.toggle('active', type==='monthly');
  if (lbl) { const el=document.getElementById('rl2SnapLbl'); if(el) el.value=lbl; }
}

async function rl2SaveSnapshot() {
  const label = (document.getElementById('rl2SnapLbl')?.value||'').trim();
  if (!label) { alert('Please enter a label'); return; }
  const btn = document.getElementById('rl2SaveBtn');
  if (btn) { btn.textContent='Saving…'; btn.disabled=true; }
  const projects = rlProjectsData.map(p => ({
    id:p.id, name:p.name, customer:p.customer, status:p.status,
    completionPct:p.completionPct??0, completionTasks:p.completionTasks||{},
    phase:p.phase, goLiveDate:p.goLiveDate, dueDate:p.dueDate
  }));
  try {
    const r = await fetch('/api/rocketlane/snapshots', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ type:rl2SnapType, label, projects })
    });
    if (!r.ok) throw new Error('Save failed');
    document.getElementById('rl2Modal')?.remove();
    await rl2LoadSnapshots();
    const t = document.createElement('div');
    t.style.cssText='position:fixed;bottom:24px;right:24px;background:rgba(134,239,172,.14);border:1px solid rgba(134,239,172,.4);color:rgba(134,239,172,.9);padding:12px 20px;border-radius:10px;font-size:13px;font-weight:700;z-index:9999;font-family:DM Sans,sans-serif;';
    t.textContent='✓ Snapshot saved';
    document.body.appendChild(t);
    setTimeout(()=>t.remove(),3000);
  } catch(e) {
    alert('Failed to save: '+e.message);
    if(btn){btn.textContent='💾 Capture';btn.disabled=false;}
  }
}

async function rl2LoadSnapshots() {
  try {
    const r = await fetch('/api/rocketlane/snapshots');
    const d = await r.json();
    rl2SnapsCache = d.snapshots||[];
  } catch { rl2SnapsCache=[]; }
}

function rl2SetSubTab(tab) {
  rl2SnapSubTab = tab;
  rl2TrendView = 'overall';
  rl2TrendFilter = [];
  rl2SelClient = '';
  rl2RenderSnapPane();
}

function rl2SetTrendView(view) {
  rl2TrendView = view;
  rl2TrendFilter = [];
  rl2SelClient = '';
  rl2RenderSnapPane();
}

function rl2SetClient(name) {
  rl2SelClient = name;
  rl2RenderSnapPane();
}

function rl2ToggleFullscreen() {
  const el = document.getElementById('rl2FullWrap');
  if (!el) return;
  el.classList.toggle('rl2-fullscreen');
  const btn = document.getElementById('rl2FullBtn');
  if (btn) btn.textContent = el.classList.contains('rl2-fullscreen') ? '✕ Exit' : '⛶ Expand';
}

function rl2BuildTrendChart(snaps, filterClient) {
  if (!snaps.length) return '<div style="text-align:center;padding:48px 24px;color:rgba(255,255,255,.28);font-size:13px;">No snapshots of this type yet. Capture your first snapshot.</div>';

  const PALETTE = ['#60a5fa','#34d399','#f472b6','#a78bfa','#fb923c','#38bdf8','#4ade80','#e879f9','#facc15','#f87171','#94a3b8','#2dd4bf','#c084fc','#fbbf24','#6ee7b7'];

  const projMap = new Map();
  snaps.forEach(s => s.projects.forEach(p => { if (!projMap.has(String(p.id))) projMap.set(String(p.id), {id: p.id, name: p.name, customer: p.customer||''}); }));
  let projects = [...projMap.values()];
  if (filterClient) projects = projects.filter(p => p.customer === filterClient);
  if (!projects.length) return '<div style="text-align:center;padding:48px;color:rgba(255,255,255,.28);font-size:13px;">No projects match the filter.</div>';

  const nP = projects.length, nS = snaps.length;
  const W = Math.max(1400, nP * 110 + 80);
  const H = 500;
  const ML = 48, MR = 24, MT = 24, MB = 120;
  const cW = W - ML - MR, cH = H - MT - MB;
  const groupW = cW / nP;
  const barW = Math.max(18, Math.min(52, (groupW * 0.85) / nS));
  const sideGap = (groupW - barW * nS) / 2;

  const projColor = {};
  projects.forEach((p, i) => { projColor[String(p.id)] = PALETTE[i % PALETTE.length]; });

  let gridSvg = '';
  [0, 25, 50, 75, 100].forEach(v => {
    const y = MT + cH * (1 - v / 100);
    gridSvg += `<line x1="${ML}" y1="${y.toFixed(1)}" x2="${(ML+cW).toFixed(1)}" y2="${y.toFixed(1)}" stroke="rgba(255,255,255,.06)" stroke-width="1"/>`;
    gridSvg += `<text x="${(ML-6).toFixed(1)}" y="${(y+4).toFixed(1)}" text-anchor="end" font-size="10" fill="rgba(255,255,255,.28)" font-family="DM Mono,monospace">${v}</text>`;
  });

  let barsSvg = '';
  projects.forEach((proj, gi) => {
    const sid = String(proj.id);
    const col = projColor[sid];
    const gx = ML + gi * groupW + sideGap;
    snaps.forEach((snap, si) => {
      const pd = snap.projects.find(p => String(p.id) === sid);
      const pct = pd ? (pd.completionPct || 0) : 0;
      const bh = (pct / 100) * cH;
      const x = gx + si * barW;
      const y = MT + cH - bh;
      const opacity = nS === 1 ? 1 : 0.38 + (si / (nS - 1)) * 0.62;
      barsSvg += `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${(barW-1.5).toFixed(1)}" height="${Math.max(2,bh).toFixed(1)}" fill="${col}" opacity="${opacity.toFixed(2)}" rx="3"><title>${proj.name} · ${snap.label}: ${pct}%</title></rect>`;
      if (bh >= 40) {
        barsSvg += `<text x="${(x+(barW-1.5)/2).toFixed(1)}" y="${(y+bh/2+5).toFixed(1)}" text-anchor="middle" font-size="12" fill="rgba(0,0,0,.7)" font-weight="800" font-family="DM Mono,monospace">${pct}%</text>`;
      } else if (bh >= 16) {
        barsSvg += `<text x="${(x+(barW-1.5)/2).toFixed(1)}" y="${(y-4).toFixed(1)}" text-anchor="middle" font-size="10" fill="${col}" opacity="${Math.min(1,opacity+0.1).toFixed(2)}" font-weight="700" font-family="DM Mono,monospace">${pct}</text>`;
      }
    });
    const lx = ML + gi * groupW + groupW / 2;
    const ly = MT + cH + 10;
    const short = proj.name.length > 20 ? proj.name.slice(0, 19) + '…' : proj.name;
    barsSvg += `<text transform="translate(${lx.toFixed(1)},${ly.toFixed(1)}) rotate(-42)" text-anchor="end" font-size="11" fill="${col}" font-weight="500" font-family="DM Sans,sans-serif">${short}</text>`;
  });

  let legendSvg = '';
  const lBaseY = H - 12;
  const lItemW = Math.min(160, (cW - 20) / nS);
  let lx = ML + (cW - lItemW * nS) / 2;
  snaps.forEach((snap, si) => {
    const opacity = nS === 1 ? 1 : 0.38 + (si / (nS - 1)) * 0.62;
    legendSvg += `<rect x="${lx.toFixed(1)}" y="${(lBaseY-10).toFixed(1)}" width="12" height="12" fill="rgba(255,255,255,${opacity.toFixed(2)})" rx="2"/>`;
    const lbl = snap.label.length > 20 ? snap.label.slice(0,19)+'…' : snap.label;
    legendSvg += `<text x="${(lx+16).toFixed(1)}" y="${lBaseY.toFixed(1)}" font-size="10" fill="rgba(255,255,255,.42)" font-family="DM Sans,sans-serif">${lbl}</text>`;
    lx += lItemW;
  });

  return `<div class="rl2-chart-wrap"><svg viewBox="0 0 ${W} ${H}" width="100%" style="display:block;overflow:visible;min-width:${Math.min(W,800)}px;" xmlns="http://www.w3.org/2000/svg">${gridSvg}${barsSvg}${legendSvg}</svg></div>`;
}

function rl2BuildMetricsSummary(snaps, filterClient) {
  if (!snaps.length) return '';
  const latest = snaps[snaps.length - 1];
  const prev = snaps.length >= 2 ? snaps[snaps.length - 2] : null;
  let projects = latest.projects || [];
  if (filterClient) projects = projects.filter(p => (p.customer||'') === filterClient);
  if (!projects.length) return '';
  const total = projects.length;
  const done = projects.filter(p => ['done','completed'].includes(p.status)).length;
  const active = projects.filter(p => ['active','in_progress','in-progress'].includes(p.status)).length;
  const blocked = projects.filter(p => p.status === 'blocked').length;
  const todo = total - done - active - blocked;
  const avg = Math.round(projects.reduce((a,p)=>a+(p.completionPct||0),0)/total);
  let delta = null;
  if (prev) {
    let pp = prev.projects || [];
    if (filterClient) pp = pp.filter(p => (p.customer||'') === filterClient);
    if (pp.length) delta = avg - Math.round(pp.reduce((a,p)=>a+(p.completionPct||0),0)/pp.length);
  }
  const deltaHtml = delta !== null
    ? `<div style="font-size:10px;font-family:'DM Mono',monospace;margin-top:3px;color:${delta>0?'#22c55e':delta<0?'#ef4444':'rgba(255,255,255,.3)'};">${delta>0?'↑ +':'↓ '}${delta}% vs prev</div>`
    : '';
  const cards = [
    {label:'TOTAL',val:total,col:'rgba(255,255,255,.7)'},
    {label:'DONE',val:done,col:'#22c55e'},
    {label:'IN PROGRESS',val:active,col:'#60a5fa'},
    {label:'BLOCKED',val:blocked,col:'#ef4444'},
    {label:'TO DO',val:todo,col:'rgba(255,255,255,.38)'},
    {label:'AVG %',val:avg+'%',col:avg>=70?'#22c55e':avg>=40?'#eab308':'#ef4444',extra:deltaHtml},
  ];
  return `<div class="rl2-metrics-row">` +
    cards.map(c=>`<div class="rl2-metric-card"><div style="font-size:22px;font-weight:900;color:${c.col};font-family:'DM Mono',monospace;">${c.val}</div><div style="font-size:9px;color:rgba(255,255,255,.28);font-family:'DM Mono',monospace;letter-spacing:.1em;text-transform:uppercase;margin-top:2px;">${c.label}</div>${c.extra||''}</div>`).join('') +
    `</div>`;
}

function rl2BuildStatusChart(snaps, filterClient) {
  if (!snaps.length) return '';
  const CATS = [
    {key:'completed',col:'#22c55e',label:'Completed'},
    {key:'inprogress',col:'#60a5fa',label:'In Progress'},
    {key:'todo',col:'rgba(180,180,200,.35)',label:'To Do'},
  ];
  const data = snaps.map(s => {
    let ps = s.projects || [];
    if (filterClient) ps = ps.filter(p => (p.customer||'') === filterClient);
    const completed = ps.reduce((a,p)=>a+((p.completionTasks||{}).completed||0),0);
    const inprogress = ps.reduce((a,p)=>a+((p.completionTasks||{}).inprogress||0),0);
    const todo = ps.reduce((a,p)=>a+((p.completionTasks||{}).todo||0),0);
    const total = completed + inprogress + todo;
    return {completed, inprogress, todo, total, label: s.label};
  });
  const nS = data.length;
  const maxVal = Math.max(...data.map(d => d.total), 1);
  const W = Math.max(500, nS * 220);
  const H = 200;
  const ML = 36, MR = 16, MT = 14, MB = 52;
  const cW = W - ML - MR, cH = H - MT - MB;
  const groupW = cW / nS;
  const barW = Math.max(14, Math.min(36, groupW * 0.22));
  let svg = '';
  [0, Math.ceil(maxVal/2), maxVal].forEach(v => {
    const y = MT + cH * (1 - v / maxVal);
    svg += `<line x1="${ML}" y1="${y.toFixed(1)}" x2="${(ML+cW).toFixed(1)}" y2="${y.toFixed(1)}" stroke="rgba(255,255,255,.05)" stroke-width="1"/>`;
    svg += `<text x="${(ML-4).toFixed(1)}" y="${(y+3).toFixed(1)}" text-anchor="end" font-size="9" fill="rgba(255,255,255,.22)" font-family="DM Mono,monospace">${v}</text>`;
  });
  data.forEach((d, si) => {
    const gx = ML + si * groupW + (groupW - CATS.length * barW) / 2;
    CATS.forEach((cat, ci) => {
      const val = d[cat.key];
      const bh = (val / maxVal) * cH;
      const x = gx + ci * barW;
      const y = MT + cH - bh;
      svg += `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${(barW-2).toFixed(1)}" height="${Math.max(2,bh).toFixed(1)}" fill="${cat.col}" rx="2" opacity="0.85"><title>${cat.label}: ${val}</title></rect>`;
      if (bh >= 16) svg += `<text x="${(x+(barW-2)/2).toFixed(1)}" y="${(bh>=34?(y+bh/2+4):(y-3)).toFixed(1)}" text-anchor="middle" font-size="${bh>=34?10:9}" fill="${bh>=34?'rgba(0,0,0,.65)':'rgba(255,255,255,.7)'}" font-weight="700" font-family="DM Mono,monospace">${val}</text>`;
    });
    const lx = ML + si * groupW + groupW / 2;
    const lbl = d.label.length > 14 ? d.label.slice(0,13)+'…' : d.label;
    svg += `<text x="${lx.toFixed(1)}" y="${(H-6).toFixed(1)}" text-anchor="middle" font-size="10" fill="rgba(255,255,255,.42)" font-family="DM Sans,sans-serif">${lbl}</text>`;
  });
  let legX = ML;
  CATS.forEach(cat => {
    svg += `<rect x="${legX.toFixed(1)}" y="${(H-30).toFixed(1)}" width="9" height="9" fill="${cat.col}" rx="1"/>`;
    svg += `<text x="${(legX+13).toFixed(1)}" y="${(H-22).toFixed(1)}" font-size="9" fill="rgba(255,255,255,.4)" font-family="DM Sans,sans-serif">${cat.label}</text>`;
    legX += 58;
  });
  return `<div style="margin-bottom:20px;"><div style="font-size:9px;color:rgba(255,255,255,.25);font-family:'DM Mono',monospace;text-transform:uppercase;letter-spacing:.1em;margin-bottom:8px;">Task Status Distribution (Completed · In Progress · To Do)</div><div class="rl2-chart-wrap" style="padding:14px 16px;"><svg viewBox="0 0 ${W} ${H}" width="100%" style="display:block;overflow:visible;" xmlns="http://www.w3.org/2000/svg">${svg}</svg></div></div>`;
}

function rl2BuildDeltaTable(snaps, filterClient) {
  if (snaps.length < 2) return '';
  const latest = snaps[snaps.length - 1], prev = snaps[snaps.length - 2];
  let lps = latest.projects || [], pps = prev.projects || [];
  if (filterClient) { lps = lps.filter(p => (p.customer||'') === filterClient); pps = pps.filter(p => (p.customer||'') === filterClient); }
  if (!lps.length) return '';
  const rows = lps.map(p => {
    const pp = pps.find(x => x.id === p.id);
    const cur = p.completionPct || 0, prv = pp ? (pp.completionPct||0) : null;
    const delta = prv !== null ? cur - prv : null;
    const bc = cur>=70?'#22c55e':cur>=40?'#eab308':'#ef4444';
    const dc = delta===null?'rgba(255,255,255,.3)':delta>0?'#22c55e':delta<0?'#ef4444':'rgba(255,255,255,.35)';
    const ds = delta===null?'New':delta>0?`↑ +${delta}%`:delta<0?`↓ ${delta}%`:'→ 0%';
    return `<div style="display:grid;grid-template-columns:1fr 58px 64px 84px;gap:8px;align-items:center;padding:8px 12px;border-bottom:1px solid rgba(255,255,255,.04);">` +
      `<div style="font-size:12px;color:#e2e8f0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${p.name}</div>` +
      `<div style="font-size:12px;font-family:'DM Mono',monospace;color:rgba(255,255,255,.35);text-align:right;">${prv!==null?prv+'%':'—'}</div>` +
      `<div style="font-size:12px;font-weight:700;font-family:'DM Mono',monospace;color:${bc};text-align:right;">${cur}%</div>` +
      `<div style="font-size:12px;font-weight:700;font-family:'DM Mono',monospace;color:${dc};text-align:right;">${ds}</div></div>`;
  }).join('');
  return `<div style="margin-bottom:20px;"><div style="font-size:9px;color:rgba(255,255,255,.25);font-family:'DM Mono',monospace;text-transform:uppercase;letter-spacing:.1em;margin-bottom:8px;">WoW Progress · ${prev.label} → ${latest.label}</div>` +
    `<div style="background:rgba(255,255,255,.02);border:1px solid rgba(255,255,255,.06);border-radius:10px;overflow:hidden;">` +
    `<div style="display:grid;grid-template-columns:1fr 58px 64px 84px;gap:8px;padding:7px 12px;border-bottom:1px solid rgba(255,255,255,.07);">` +
      `<div style="font-size:9px;color:rgba(255,255,255,.22);font-family:'DM Mono',monospace;text-transform:uppercase;">Project</div>` +
      `<div style="font-size:9px;color:rgba(255,255,255,.22);font-family:'DM Mono',monospace;text-transform:uppercase;text-align:right;">Prev</div>` +
      `<div style="font-size:9px;color:rgba(255,255,255,.22);font-family:'DM Mono',monospace;text-transform:uppercase;text-align:right;">Now</div>` +
      `<div style="font-size:9px;color:rgba(255,255,255,.22);font-family:'DM Mono',monospace;text-transform:uppercase;text-align:right;">Change</div>` +
    `</div>${rows}</div></div>`;
}

function rl2BuildClientSidebar(clients, selClient) {
  const allBtn = `<button class="rl2-client-sidebar-item${!selClient?' active':''}" onclick="rl2SetClient('')">All clients</button>`;
  const cBtns = clients.map(c => {
    const safe = c.replace(/&/g,'&amp;').replace(/"/g,'&quot;');
    return `<button class="rl2-client-sidebar-item${selClient===c?' active':''}" data-client="${safe}" onclick="rl2SetClient(this.dataset.client)">${safe}</button>`;
  }).join('');
  return `<div class="rl2-client-sidebar"><div class="rl2-client-sidebar-label">Clients</div>${allBtn}${cBtns}</div>`;
}

function rl2BuildClientAnalysis(clientName, snaps) {
  if (!snaps.length) return '';
  const latest = snaps[snaps.length - 1];
  const prev = snaps.length >= 2 ? snaps[snaps.length - 2] : null;
  const projects = (latest.projects||[]).filter(p=>(p.customer||'')===clientName);
  if (!projects.length) return `<div style="padding:32px;text-align:center;color:rgba(255,255,255,.28);font-size:13px;">No projects for this client in the latest snapshot.</div>`;
  const atRisk = projects.filter(p=>p.status==='blocked'||(p.completionPct||0)<30).length;
  const healthBadge = atRisk > 0
    ? `<span style="background:rgba(239,68,68,.12);border:1px solid rgba(239,68,68,.25);color:#fca5a5;border-radius:6px;padding:3px 10px;font-size:11px;font-family:'DM Mono',monospace;">⚠ ${atRisk} at risk</span>`
    : `<span style="background:rgba(34,197,94,.12);border:1px solid rgba(34,197,94,.25);color:#86efac;border-radius:6px;padding:3px 10px;font-size:11px;font-family:'DM Mono',monospace;">✓ On track</span>`;
  const rows = projects.map(p=>{
    const pct=p.completionPct||0, bc=pct>=70?'#22c55e':pct>=40?'#eab308':'#ef4444';
    const ic=rlIconColor(p.name), ini=p.name.split(/\s+/).slice(0,2).map(w=>w[0]).join('').toUpperCase()||'?';
    let delta=null;
    if (prev) { const pp=(prev.projects||[]).find(x=>x.id===p.id); if(pp) delta=pct-(pp.completionPct||0); }
    const dHtml = delta!==null?`<span style="font-size:11px;font-family:'DM Mono',monospace;color:${delta>0?'#22c55e':delta<0?'#ef4444':'rgba(255,255,255,.3)'};">${delta>0?'↑ +':'↓ '}${delta}%</span>`:'';
    return `<div class="rl2-project-row">` +
      `<div style="width:32px;height:32px;border-radius:8px;background:${ic}22;border:1px solid ${ic}44;color:${ic};display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:800;flex-shrink:0;">${ini}</div>` +
      `<div style="flex:1;min-width:0;"><div style="font-size:13px;font-weight:700;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${p.name}</div>` +
      `<div style="display:flex;align-items:center;gap:8px;margin-top:4px;"><div style="flex:1;max-width:120px;height:4px;background:rgba(255,255,255,.07);border-radius:2px;overflow:hidden;"><div style="height:100%;width:${pct}%;background:${bc};border-radius:2px;"></div></div><span style="font-size:12px;font-weight:700;font-family:'DM Mono',monospace;color:${bc};">${pct}%</span>${dHtml}</div></div>` +
      `<div style="display:flex;flex-direction:column;align-items:flex-end;gap:4px;flex-shrink:0;">${rlBadge(p.status)}${p.phase?`<div style="font-size:10px;color:rgba(255,255,255,.28);font-family:'DM Mono',monospace;">${p.phase}</div>`:''}</div>` +
    `</div>`;
  }).join('');
  return `<div style="display:flex;align-items:center;gap:8px;margin-bottom:12px;flex-wrap:wrap;">` +
    `<div style="font-size:14px;font-weight:700;color:#fff;">${clientName}</div>` +
    `<div style="font-size:11px;color:rgba(255,255,255,.32);font-family:'DM Mono',monospace;">${projects.length} project${projects.length!==1?'s':''}</div>` +
    healthBadge + `</div>` +
    rl2BuildMetricsSummary(snaps, clientName) +
    `<div style="margin:12px 0 6px;font-size:9px;color:rgba(255,255,255,.28);font-family:'DM Mono',monospace;text-transform:uppercase;letter-spacing:.1em;">Projects</div>` +
    `<div class="rl2-project-list">${rows}</div>` +
    `<div style="margin-top:16px;">${rl2BuildStatusChart(snaps, clientName)}</div>` +
    `<div>${rl2BuildDeltaTable(snaps, clientName)}</div>` +
    `<div>${rl2BuildTrendChart(snaps, clientName)}</div>`;
}

function rl2BuildSnapList() {
  const snapCards = rl2SnapsCache.map(s => {
    const d = new Date(s.capturedAt);
    const dateStr = d.toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'});
    const timeStr = d.toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'});
    const avg = s.projects.length ? Math.round(s.projects.reduce((a,p)=>a+(p.completionPct||0),0)/s.projects.length) : 0;
    const sel = rl2SelSnaps.includes(s.id);
    const avgCol = avg>=70?'rgba(134,239,172,1)':avg>=40?'rgba(253,224,71,1)':'rgba(252,165,165,1)';
    return `<div class="rl2-snap-card${sel?' rl2-snap-sel':''}" onclick="rl2ToggleSnap(${s.id})">` +
      `<div style="display:flex;align-items:center;gap:12px;">` +
        `<span class="rl2-snap-badge ${s.type}">${s.type}</span>` +
        `<div><div style="font-size:14px;font-weight:700;color:#fff;">${s.label}</div>` +
        `<div style="font-size:11px;color:rgba(255,255,255,.32);font-family:'DM Mono',monospace;">${dateStr} · ${timeStr} · ${s.projects.length} projects</div></div>` +
      `</div>` +
      `<div style="display:flex;align-items:center;gap:12px;">` +
        `<div style="text-align:right;"><div style="font-size:20px;font-weight:900;color:${avgCol};">${avg}%</div>` +
        `<div style="font-size:9px;color:rgba(255,255,255,.28);font-family:'DM Mono',monospace;">AVG COMPLETE</div></div>` +
        `<button onclick="event.stopPropagation();rl2DelSnap(${s.id})" style="background:rgba(239,68,68,.08);border:1px solid rgba(239,68,68,.18);color:rgba(252,165,165,.65);border-radius:6px;padding:6px 10px;font-size:12px;cursor:pointer;">🗑</button>` +
      `</div></div>`;
  }).join('');

  let detailHtml = '';
  if (rl2SelSnaps.length===2) {
    const s1=rl2SnapsCache.find(s=>s.id===rl2SelSnaps[0]), s2=rl2SnapsCache.find(s=>s.id===rl2SelSnaps[1]);
    if (s1&&s2) {
      const [older,newer] = new Date(s1.capturedAt)<new Date(s2.capturedAt)?[s1,s2]:[s2,s1];
      const ids = [...new Set([...older.projects.map(p=>p.id),...newer.projects.map(p=>p.id)])];
      const compRows = ids.map(id=>{
        const op=older.projects.find(p=>p.id===id), np=newer.projects.find(p=>p.id===id);
        const name=(np||op)?.name||'Unknown', cust=(np||op)?.customer||'';
        const oldPct=op?.completionPct??null, newPct=np?.completionPct??null;
        const delta=oldPct!==null&&newPct!==null?newPct-oldPct:null;
        const dStr=delta===null?'—':delta>0?`↑ +${delta}%`:delta<0?`↓ ${delta}%`:'→ 0%';
        const dCls=delta===null?'flat':delta>0?'up':delta<0?'down':'flat';
        const ic=rlIconColor(name), ini=name.split(/\s+/).slice(0,2).map(w=>w[0]).join('').toUpperCase()||'?';
        const bc=newPct!=null?(newPct>=70?'#22c55e':newPct>=40?'#eab308':'#ef4444'):'#4b5563';
        return `<div class="rl2-compare-grid">` +
          `<div style="width:28px;height:28px;border-radius:7px;background:${ic}22;border:1px solid ${ic}44;color:${ic};display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:800;">${ini}</div>` +
          `<div><div style="font-size:13px;font-weight:700;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${name}</div>${cust?`<div style="font-size:11px;color:rgba(255,255,255,.26);">${cust}</div>`:''}</div>` +
          `<div style="font-size:13px;font-family:'DM Mono',monospace;color:rgba(255,255,255,.38);">${oldPct!==null?oldPct+'%':'—'}</div>` +
          `<div>${newPct!==null?`<div style="display:flex;align-items:center;gap:6px;"><div style="width:56px;height:5px;background:rgba(255,255,255,.07);border-radius:3px;overflow:hidden;"><div style="height:100%;width:${newPct}%;background:${bc};border-radius:3px;"></div></div><span style="font-size:13px;font-weight:700;font-family:'DM Mono',monospace;color:${bc};">${newPct}%</span></div>`:'—'}</div>` +
          `<div class="rl2-delta ${dCls}">${dStr}</div>` +
          `</div>`;
      }).join('');
      detailHtml =
        `<div style="background:rgba(255,255,255,.025);border:1px solid rgba(255,255,255,.06);border-radius:14px;overflow:hidden;margin-top:20px;">` +
        `<div style="padding:14px 20px;border-bottom:1px solid rgba(255,255,255,.06);display:flex;align-items:center;gap:12px;">` +
          `<span style="font-size:9px;font-family:'DM Mono',monospace;text-transform:uppercase;color:rgba(255,255,255,.25);letter-spacing:.12em;">Comparing</span>` +
          `<span style="font-size:13px;font-weight:700;color:rgba(255,255,255,.55);">${older.label}</span>` +
          `<span style="color:rgba(255,255,255,.22);">→</span>` +
          `<span style="font-size:13px;font-weight:700;color:#fff;">${newer.label}</span>` +
        `</div>` +
        `<div class="rl2-compare-grid" style="padding:8px 16px;border-bottom:1px solid rgba(255,255,255,.06);">` +
          `<div></div><div style="font-size:9px;font-family:'DM Mono',monospace;text-transform:uppercase;color:rgba(255,255,255,.22);">Project</div>` +
          `<div style="font-size:9px;font-family:'DM Mono',monospace;text-transform:uppercase;color:rgba(255,255,255,.22);">Before</div>` +
          `<div style="font-size:9px;font-family:'DM Mono',monospace;text-transform:uppercase;color:rgba(255,255,255,.22);">After</div>` +
          `<div style="font-size:9px;font-family:'DM Mono',monospace;text-transform:uppercase;color:rgba(255,255,255,.22);">Change</div>` +
        `</div>${compRows}</div>`;
    }
  } else if (rl2SelSnaps.length===1) {
    const snap=rl2SnapsCache.find(s=>s.id===rl2SelSnaps[0]);
    if (snap) {
      const dRows = snap.projects.map(p=>{
        const ic=rlIconColor(p.name), ini=p.name.split(/\s+/).slice(0,2).map(w=>w[0]).join('').toUpperCase()||'?';
        const pct=p.completionPct??0, bc=pct>=70?'#22c55e':pct>=40?'#eab308':'#ef4444';
        return `<div class="rl2-compare-grid">` +
          `<div style="width:28px;height:28px;border-radius:7px;background:${ic}22;border:1px solid ${ic}44;color:${ic};display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:800;">${ini}</div>` +
          `<div><div style="font-size:13px;font-weight:700;color:#fff;">${p.name}</div>${p.customer?`<div style="font-size:11px;color:rgba(255,255,255,.26);">${p.customer}</div>`:''}</div>` +
          `<div>${rlBadge(p.status)}</div>` +
          `<div style="display:flex;align-items:center;gap:8px;"><div style="width:70px;height:5px;background:rgba(255,255,255,.07);border-radius:3px;overflow:hidden;"><div style="height:100%;width:${pct}%;background:${bc};border-radius:3px;"></div></div><span style="font-size:12px;font-weight:700;font-family:'DM Mono',monospace;color:${bc};">${pct}%</span></div>` +
          `<div style="font-size:11px;color:rgba(255,255,255,.3);">${p.phase||'—'}</div></div>`;
      }).join('');
      detailHtml =
        `<div style="background:rgba(255,255,255,.025);border:1px solid rgba(255,255,255,.06);border-radius:14px;overflow:hidden;margin-top:20px;">` +
        `<div style="padding:14px 20px;border-bottom:1px solid rgba(255,255,255,.06);">` +
          `<div style="font-size:9px;font-family:'DM Mono',monospace;letter-spacing:.12em;text-transform:uppercase;color:rgba(255,255,255,.25);margin-bottom:4px;">Snapshot Detail</div>` +
          `<div style="font-size:15px;font-weight:700;color:#fff;">${snap.label}</div>` +
          `<div style="font-size:11px;color:rgba(255,255,255,.28);font-family:'DM Mono',monospace;margin-top:2px;">${new Date(snap.capturedAt).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'})}</div>` +
        `</div>${dRows}</div>`;
    }
  }

  const hintText = rl2SelSnaps.length===0
    ? 'Select one to view detail · Select two to compare'
    : rl2SelSnaps.length===1
      ? 'Select one more to compare side-by-side'
      : '<span style="color:rgba(134,239,172,.7);">✓ Comparing two snapshots</span>';

  return `<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;">` +
    `<div style="font-size:13px;color:rgba(255,255,255,.38);">${hintText}</div>` +
    `<div style="display:flex;gap:8px;">` +
      `${rl2SelSnaps.length?`<button onclick="rl2SelSnaps=[];rl2RenderSnapPane()" style="background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.09);color:rgba(255,255,255,.38);border-radius:6px;padding:6px 12px;font-size:12px;cursor:pointer;font-family:'DM Sans',sans-serif;">Clear</button>`:''}` +
    `</div>` +
  `</div>` +
  `<div class="rl2-snap-list">${snapCards}</div>` +
  detailHtml;
}

function rl2RenderSnapPane() {
  const pane = document.getElementById('rl2SnapPane');
  if (!pane) return;
  if (!rl2SnapsCache.length) {
    pane.innerHTML =
      `<div style="text-align:center;padding:64px 24px;">` +
      `<div style="font-size:48px;opacity:.18;margin-bottom:16px;">📅</div>` +
      `<div style="font-size:16px;font-weight:700;color:rgba(255,255,255,.38);margin-bottom:8px;">No snapshots yet</div>` +
      `<div style="font-size:13px;color:rgba(255,255,255,.22);margin-bottom:24px;">Capture your first snapshot to start tracking progress week-on-week</div>` +
      `<button onclick="rl2CaptureModal()" class="rl2-capture-btn">📸 Capture First Snapshot</button></div>`;
    return;
  }

  const subTabs = [
    {key:'weekly', label:'📊 Weekly Trend'},
    {key:'monthly', label:'📅 Monthly Trend'},
    {key:'all', label:'📋 All Snapshots'},
  ];
  const tabBar = `<div class="rl2-subtabs">` +
    subTabs.map(t => `<button class="rl2-subtab${rl2SnapSubTab===t.key?' rl2-subtab-active':''}" onclick="rl2SetSubTab('${t.key}')">${t.label}</button>`).join('') +
    `</div>`;

  let body = '';
  if (rl2SnapSubTab === 'weekly' || rl2SnapSubTab === 'monthly') {
    const sorted = [...rl2SnapsCache].filter(s => s.type === rl2SnapSubTab).sort((a,b)=>new Date(a.capturedAt)-new Date(b.capturedAt));
    const snapsToShow = sorted.slice(-5);
    const typeLabel = rl2SnapSubTab === 'weekly' ? 'weekly' : 'monthly';
    const clientSet = new Set();
    snapsToShow.forEach(s => s.projects.forEach(p => { if (p.customer) clientSet.add(p.customer); }));
    const clients = [...clientSet].sort();
    const viewToggle =
      `<div class="rl2-view-toggle">` +
      `<button class="rl2-view-btn${rl2TrendView==='overall'?' rl2-view-active':''}" onclick="rl2SetTrendView('overall')">Overall</button>` +
      `<button class="rl2-view-btn${rl2TrendView==='client'?' rl2-view-active':''}" onclick="rl2SetTrendView('client')">By Client</button>` +
      `</div>`;
    const headerBar =
      `<div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;margin-bottom:16px;">` +
      `<div style="font-size:11px;color:rgba(255,255,255,.28);font-family:'DM Mono',monospace;text-transform:uppercase;letter-spacing:.1em;">% Completion · ${typeLabel} trend · ${snapsToShow.length} snapshot${snapsToShow.length!==1?'s':''}${rl2SnapSubTab==='weekly'?' · last 5 weeks':' · last 5 months'}</div>` +
      `<div style="display:flex;align-items:center;gap:8px;">${viewToggle}` +
      `<button id="rl2FullBtn" onclick="rl2ToggleFullscreen()" style="background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.1);color:rgba(255,255,255,.55);border-radius:6px;padding:5px 12px;font-size:12px;cursor:pointer;font-family:'DM Sans',sans-serif;">⛶ Expand</button>` +
      `</div></div>`;
    if (rl2TrendView === 'client') {
      const sidebar = rl2BuildClientSidebar(clients, rl2SelClient);
      const mainContent = rl2SelClient
        ? rl2BuildClientAnalysis(rl2SelClient, snapsToShow)
        : rl2BuildMetricsSummary(snapsToShow, '') + rl2BuildStatusChart(snapsToShow, '') + rl2BuildDeltaTable(snapsToShow, '') + rl2BuildTrendChart(snapsToShow, '');
      body = headerBar + `<div class="rl2-trend-layout">${sidebar}<div class="rl2-trend-main">${mainContent}</div></div>`;
    } else {
      body = headerBar + rl2BuildMetricsSummary(snapsToShow, '') + rl2BuildStatusChart(snapsToShow, '') + rl2BuildDeltaTable(snapsToShow, '') + rl2BuildTrendChart(snapsToShow, '');
    }
  } else {
    body = rl2BuildSnapList();
  }

  pane.innerHTML = `<div id="rl2FullWrap"><div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;">` +
    `<div></div>` +
    `<button onclick="rl2CaptureModal()" class="rl2-capture-btn">📸 New Snapshot</button>` +
    `</div>` +
    tabBar + body + `</div>`;
}

function rl2ToggleSnap(id) {
  if (rl2SelSnaps.includes(id)) { rl2SelSnaps=rl2SelSnaps.filter(s=>s!==id); }
  else if (rl2SelSnaps.length<2) { rl2SelSnaps.push(id); }
  else { rl2SelSnaps=[rl2SelSnaps[1],id]; }
  rl2RenderSnapPane();
}

async function rl2DelSnap(id) {
  if (!confirm('Delete this snapshot?')) return;
  try {
    await fetch(`/api/rocketlane/snapshots/${id}`,{method:'DELETE'});
    rl2SnapsCache=rl2SnapsCache.filter(s=>s.id!==id);
    rl2SelSnaps=rl2SelSnaps.filter(s=>s!==id);
    rl2RenderSnapPane();
  } catch(e) { alert('Delete failed: '+e.message); }
}
// ─────────────────────────────────────────────────────────────────────────────

function liInitScrollAnimations() {
  const container = document.getElementById('liOverlay');
  if (!container) return;

  // General reveal observer
  const revealObs = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        revealObs.unobserve(entry.target);
      }
    });
  }, { root: container, threshold: 0.12 });
  document.querySelectorAll('.esw-reveal,.esw-reveal-l,.esw-reveal-r').forEach(el => {
    el.classList.remove('visible');
    revealObs.observe(el);
  });

  // ── Lifecycle SVG line animation ───────────────────────────────────────────
  const lcSection = document.getElementById('eswLCSection');
  if (lcSection) {
    let lcDone = false;
    const lcObs = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting && !lcDone) {
          lcDone = true;
          setTimeout(() => {
            const fill = document.getElementById('lcLineFill');
            if (fill) fill.setAttribute('x2', '14.3%');
          }, 400);
          lcObs.unobserve(entry.target);
        }
      });
    }, { root: container, threshold: 0.3 });
    lcObs.observe(lcSection);
  }

  // ── Grid flowchart with SVG arrows ─────────────────────────────────────────
  const pfGrid = document.getElementById('pfGrid');
  if (pfGrid) {
    let pfStarted = false;

    function pfDrawArrows() {
      const svg = document.getElementById('pfArrowSvg');
      if (!svg) return;
      svg.innerHTML = '';
      const gr = pfGrid.getBoundingClientRect();
      const seqIds = ['pfn1','pfn2','pfn3','pfn4','pfn5','pfn6','pfn7','pfn8'];
      const colors = ['rgba(248,113,113,.55)','rgba(249,115,22,.5)','rgba(251,191,36,.5)',
                      'rgba(96,165,250,.55)','rgba(96,165,250,.45)','rgba(167,139,250,.5)',
                      'rgba(52,211,153,.5)'];

      for (let i = 0; i < seqIds.length - 1; i++) {
        const fe = document.getElementById(seqIds[i]);
        const te = document.getElementById(seqIds[i+1]);
        if (!fe || !te) continue;
        const fr = fe.getBoundingClientRect(), tr = te.getBoundingClientRect();
        let d = '';
        if (i < 3) {
          // Row 1 left-to-right
          const x1=fr.right-gr.left, y1=fr.top+fr.height/2-gr.top;
          const x2=tr.left-gr.left,  y2=tr.top+tr.height/2-gr.top;
          d = `M${x1},${y1} L${x2},${y2}`;
        } else if (i === 3) {
          // Snake turn: n4 bottom → n5 bottom (right column wraps)
          const x1=fr.right-gr.left, y1=fr.bottom-gr.top-8;
          const x2=tr.right-gr.left, y2=tr.bottom-gr.top-8;
          const mid = Math.max(fr.bottom, tr.bottom) - gr.top + 28;
          d = `M${x1},${y1} L${x1},${mid} L${x2},${mid} L${x2},${y2}`;
        } else {
          // Row 2 right-to-left
          const x1=fr.left-gr.left, y1=fr.top+fr.height/2-gr.top;
          const x2=tr.right-gr.left, y2=tr.top+tr.height/2-gr.top;
          d = `M${x1},${y1} L${x2},${y2}`;
        }
        const p = document.createElementNS('http://www.w3.org/2000/svg','path');
        p.setAttribute('d', d);
        p.setAttribute('stroke', colors[i]);
        p.setAttribute('stroke-width','2.5');
        p.setAttribute('fill','none');
        p.setAttribute('stroke-linecap','round');
        const len = p.getTotalLength ? p.getTotalLength() : 300;
        p.setAttribute('stroke-dasharray', len);
        p.setAttribute('stroke-dashoffset', len);
        p.style.transition = `stroke-dashoffset 0.55s cubic-bezier(.16,1,.3,1) ${i*0.15}s`;
        svg.appendChild(p);
        setTimeout(() => { p.setAttribute('stroke-dashoffset','0'); }, 100 + i*150);
      }
    }

    const pfObs = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting && !pfStarted) {
          pfStarted = true;
          const nodes = [...pfGrid.querySelectorAll('.pf-node')].sort((a,b)=>+a.dataset.seq - +b.dataset.seq);
          nodes.forEach((node, i) => {
            setTimeout(() => {
              node.style.opacity = '1';
              node.style.transform = 'scale(1) translateY(0)';
            }, i * 150);
          });
          setTimeout(pfDrawArrows, 100 + nodes.length * 150);
        }
      });
    }, { root: container, threshold: 0.12 });

    pfObs.observe(pfGrid);
    window.addEventListener('resize', () => { if (pfStarted) setTimeout(pfDrawArrows, 100); });
  }
}

function liAnimateImpactBars() {
  document.querySelectorAll('.esw-impact-bar-fill[data-width]').forEach(bar => {
    setTimeout(() => { bar.style.width = bar.dataset.width; }, 200);
  });
}

// Reset access cache when user changes
function liResetAccess() { _liAccess = null; }

// Always re-check access from API (clear cache first so it's never stale)
async function liUpdateNavVisibility() {
  const liItem = document.getElementById('mcLiItem');
  if (!liItem) return;
  _liAccess = null; // clear cache — always re-fetch on navigation
  const hasAccess = await liCheckAccess();
  liItem.style.display = hasAccess ? 'flex' : 'none';
}

// ── Admin: Leadership Access Management ───────────────────────────────────────
async function liAdmLoad() {
  const list = document.getElementById('liUserList');
  if (!list) return;
  list.innerHTML = '<div style="text-align:center;color:var(--muted);padding:20px;">Loading…</div>';
  try {
    const r = await fetch('/api/leadership/users', { headers: { 'x-admin-password': getAdminPwd() } });
    const d = await r.json();
    const users = d.users || [];
    if (!users.length) {
      list.innerHTML = '<div style="text-align:center;color:var(--muted);padding:24px;font-size:13px;">No users have been granted access yet.</div>';
      return;
    }
    list.innerHTML = `
      <div style="font-size:11px;font-family:\'DM Mono\',monospace;letter-spacing:.1em;text-transform:uppercase;color:var(--muted);margin-bottom:10px;padding:0 4px;">${users.length} user${users.length!==1?'s':''} with access</div>
      ${users.map(u => `
        <div style="display:flex;align-items:center;justify-content:space-between;padding:12px 14px;background:var(--surface2);border:1px solid var(--border);border-radius:8px;margin-bottom:6px;">
          <div style="display:flex;align-items:center;gap:10px;">
            <div style="width:32px;height:32px;border-radius:8px;background:linear-gradient(135deg,rgba(201,162,39,.2),rgba(201,162,39,.08));border:1px solid rgba(201,162,39,.25);display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;color:rgba(201,162,39,.8);">👑</div>
            <div>
              <div style="font-size:13.5px;font-weight:600;color:var(--text);">${u}</div>
              <div style="font-size:11px;color:var(--muted);">Leadership Insights access granted</div>
            </div>
          </div>
          <button onclick="liAdmRemove('${u}')" style="background:rgba(248,113,113,.08);border:1px solid rgba(248,113,113,.2);color:#f87171;border-radius:6px;padding:5px 12px;font-size:12px;font-family:\'DM Sans\',sans-serif;cursor:pointer;">Revoke</button>
        </div>`).join('')}`;
  } catch(e) {
    list.innerHTML = '<div style="color:var(--danger);padding:16px;font-size:13px;">Failed to load users.</div>';
  }
}

async function liAddUser() {
  const inp = document.getElementById('liAddUserInput');
  const name = (inp?.value || '').trim();
  if (!name) { showToast('Enter a username first'); return; }
  try {
    const r = await fetch('/api/leadership/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-admin-password': getAdminPwd() },
      body: JSON.stringify({ userName: name })
    });
    const d = await r.json();
    if (d.success) {
      inp.value = '';
      showToast(`✅ ${name} granted Leadership Insights access`);
      liAdmLoad();
      _liAccess = null; // reset cache
      liUpdateNavVisibility(); // immediately show in Browse dropdown
    } else {
      showToast('Failed: ' + (d.error || 'Unknown error'));
    }
  } catch(e) { showToast('Request failed'); }
}

async function liAdmRemove(userName) {
  if (!confirm(`Revoke Leadership Insights access for "${userName}"?`)) return;
  try {
    const r = await fetch('/api/leadership/users', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json', 'x-admin-password': getAdminPwd() },
      body: JSON.stringify({ userName })
    });
    const d = await r.json();
    if (d.success) { showToast(`Access revoked for ${userName}`); liAdmLoad(); _liAccess = null; liUpdateNavVisibility(); }
  } catch(e) { showToast('Failed'); }
}

// Hook into switchAdminTab for leadership
const _origSwitchAdminTabLI = switchAdminTab;
// Load leadership admin tab when clicked
document.addEventListener('click', e => {
  if (e.target.id === 'leadershipAdminTab') setTimeout(liAdmLoad, 100);
});

// Initialise LI nav visibility on page load
window.addEventListener('load', () => { setTimeout(liUpdateNavVisibility, 800); });;
(function(){
      const IT_DATA = {"GIVA":[{"date":"2026-01-13","issue":"In V2 pipelines, nodes run and perview error","module":"Pipeline","description":"In V2 pipelines, the nodes remain in a running state for a long time, and the data preview is not loading.","occurrences":1},{"date":"2026-02-13","issue":"V2 pipeline run error","module":"Pipeline","description":"while running the pipeline, it got stuck in scheduled state","occurrences":1},{"date":"2026-02-13","issue":"Recon run error","module":"Reconciliation","description":"while running recon ,it got stuck in scheduled state.","occurrences":1},{"date":"2026-02-06","issue":"V2 pipeline log access","module":"Pipeline","description":"please give access for the logs in the V2 pipelines.","occurrences":1},{"date":"2026-02-10","issue":"Recon dataset configaration error","module":"Reconciliation","description":"While saving rules in a new recon, after providing the datasets, the primary and secondary datasets are getting switched","occurrences":1},{"date":"2026-02-12","issue":"Data type validation error","module":"Databox","description":"Set one column as string in the schema, and the Excel values are also in the same format. But after uploading to Databox, it shows in E+ format.","occurrences":1},{"date":"2026-03-09","issue":"V2 pipelines node run and perview error","module":"Pipeline","description":"The nodes in pipelines are in running state and preview is not loading .","occurrences":1},{"date":"2026-03-17","issue":"Calculate node error","module":"Pipeline","description":"When I try to preview the calculate node, it gets stuck and doesn\u2019t display any output or error. When I am checking in the Dev tools we are not getting result call","occurrences":1},{"date":"2026-04-02","issue":"Pipeline Select Node","module":"Pipeline","description":"While previewing the Select node in the V2 pipeline, the following error is encountered:\n\"The query is too large (1038.89K characters, 15243 characters over the limit). The maximum standard SQL query length is 1024.00K characters, including comments and white space characters\". This issue persists even when selecting only 10 columns","occurrences":2},{"date":"2026-04-07","issue":"Pipeline run error","module":"Pipeline","description":"When I try to run the pipeline, it is not showing any new runs. One run failed earlier, and when I tried to run it again, no new run appeared. \nCurrently, only the failed run is visible.","occurrences":3},{"date":"2026-04-08","issue":"Exports","module":"Exports","description":"When we try to run the existing exports, the following error is encountered,Error: \"Variable ${rate_type} does not have a input rate_type\"","occurrences":1},{"date":"2026-04-17","issue":"Node preview error","module":"Pipeline","description":"Pipelines are getting stuck in Preview state.","occurrences":2},{"date":"2026-04-23","issue":"Data fetch error","module":"Pipeline","description":"Encountering issue in fetching data from nodes of the existing pipeline. But when i run the pipeline the run got succeeded.","occurrences":2},{"date":"2026-05-05","issue":"Portal preview error","module":"Portal","description":"The portal has been published with two pages. However, while previewing, only one page is visible.","occurrences":1},{"date":"2026-05-05","issue":"Calculate node error","module":"Pipeline","description":"The calculate node has been in a running state for a long time. I also tried materializing the node, but the issue still persists.","occurrences":2},{"date":"2026-05-12","issue":"V2 pipeline output node error","module":"Pipeline","description":"I have two chained pipelines where the output of Pipeline A serves as the source for Pipeline B. However, upon completion of the second pipeline, the output dataset from Pipeline A is being overwritten.Both stages are now reflecting the same name and the final processed data, resulting in the loss of the intermediate dataset.","occurrences":1},{"date":"2026-05-18","issue":"Statement line error","module":"Statement","description":"I'm getting this error \"Unexpected err-> The query is too large (1027.26K characters, 3335 characters over the limit). The maximum standard SQL query length is 1024.00K characters, including comments and white space characters.'), type(err)=<class 'google.api_core.exceptions.BadRequest'> in the statement for one particular metric.\n When I use the same metric in a new statement, it succeeds. In another statement, I'm neither getting an error nor any value.","occurrences":1},{"date":"2026-05-20","issue":"User invitation access","module":"User Invitation","description":"After inviting a particular user and granting access, the system displayed that the user had already been invited.However, when trying to provide folder-specific access to that user, the user was not appearing in the user list.","occurrences":1}],"Navi":[{"date":"2025-07-24","issue":"GCP WIF","module":"Pipeline, Workflow & Portals","description":"Tested Pipeline as throwed error as \"Failed to get Preasigned urlRequest failed with status code 500\"","occurrences":1},{"date":"2025-07-28","issue":"Unable to create a new instance.","module":"Workflow","description":"we\u2019re unable to create a new instance at the moment.","occurrences":1},{"date":"2025-07-30","issue":"Internal server error","module":"Pipeline","description":"Able to save and Run the pipeline. But while trying to publish the pipeline encountering Internal server error.","occurrences":1},{"date":"2025-11-18","issue":"Access Control","module":"Databox","description":"Users are unable to upload files in the Databox with Team-level access","occurrences":1},{"date":"2025-11-18","issue":"Access Control","module":"Other","description":"If the user has access to upload data in Databox, then it should auto-provide access to datasets. Similarly, we need to share both the statement from the workspace as well as the published statement. The same applies to the portals. This is creating a lot of confusion and causing hiccups in parallel runs.","occurrences":1},{"date":"2025-11-18","issue":"Improper Working of Reverse Action","module":"Statement","description":"Reverse option is not working properly - needs to re-verify all related scenarios","occurrences":1},{"date":"2025-11-18","issue":"Variance when reverse ie enabled","module":"Statement","description":"Variance in the Reverse option is not calculated correctly","occurrences":1},{"date":"2025-11-18","issue":"Variance displays incorrect value","module":"Statement","description":"If the number format is in crores, the Variance % shows 0 - which is incorrect; however, it shows the correct value if the graph option is selected","occurrences":1},{"date":"2025-11-18","issue":"Date range filter","module":"Statement","description":"If the statement is shared with multiple people, and user1 has updated the date range from 1Aug25 to 31Oct25 from 1Apr25 to 30Sep25 (User2 already has this view open in his screen). On new run, both users see the data from 1Aug25 to 31Oct25 even if the filters for User2 are shown as 1Apr25 to 30Sep25. Sometimes, even if user2 changes the filters to This Year or any other dates, it still shows data of 1Aug25 to 31Oct25 (that User1 has selected) - This needs to be verified for all promoted filters","occurrences":1},{"date":"2025-11-18","issue":"cache issue","module":"Statement","description":"when a new file is dropped, the numbers are not reflecting until we change/apply different date range filter","occurrences":2},{"date":"2025-12-09","issue":"Updation of Databox status","module":"Databox","description":"we uploaded a file 2 hours ago into a databox and its still in processing status / schema updtae","occurrences":2},{"date":"2026-03-12","issue":"Column not found","module":"Statement","description":"When the YTD option is enabled in the statement, formula lines throw \"Column not found\" error, _ytd suffix is being incorrectly inserted mid-name instead of being appended at the end, whereas in Existing columns its reflecting correctly","occurrences":1},{"date":"2026-03-16","issue":"Taking longer time to load the statement","module":"Statement","description":"One of the statements in Navi- Production environment is loading even after a successful run , unable to see the statement since it is in loading state","occurrences":1},{"date":"2026-03-17","issue":"Failed Processing","module":"Statement","description":"We\u2019re encountering an issue with a databox that shows a processing failed error when it was created and ran for the first time. Could we connect and take a look at this","occurrences":2},{"date":"2026-03-17","issue":"Stack Overflow","module":"Statement","description":"In Navi - Staging, data is getting updated only after a new date filter is selected Example: If feb data is updated , even when selected filter on Feb - data didn't change When changed date filter to feb-mar then the data reflected This is already raised previously now we are seeing this issue again Also, If a new filter is added in any column only after diagnosis and new run, we are able to see that filter option","occurrences":3},{"date":"2026-03-26","issue":"Statement Loading Continously","module":"Statement","description":"statement in the Navi production instance that isn\u2019t populating any line items, and no errors are being thrown.","occurrences":1},{"date":"2026-03-26","issue":"Value Mismatch","module":"Statement","description":"When a line item is pulled from one statement to other statement value it's showing different value Example: In PL statement value is 70 when pulled to other statement its 68","occurrences":5},{"date":"2026-03-26","issue":"nats time error","module":"Statement","description":"a) In a statement, YTD is enabled and worked fine, after adding a new line item its throwing as nats time out. after doing a new run again numbers are displayed but everything is just 0 - after Reverse is disabled it worked - need to raise a ticket on this asking - expecting statements to not throw error when reverse and YTD enabled.  (b) We are getting nats:timeout error for a statement even though there is no YTD enabled.","occurrences":8},{"date":"2026-03-26","issue":"Pipelines are getting failed","module":"Pipeline","description":"When pipelines are ran by client its failing(all the sources and exports are shared) this is happening for few of the pipelines.","occurrences":1},{"date":"2026-03-26","issue":"Access Issue","module":"Statement & Portals","description":"the user is not able to access statements from portal links in production env after deployment","occurrences":1},{"date":"2026-04-01","issue":"Unable to add filters","module":"Statement","description":"Unable to add filters after pulling new metric line in statement","occurrences":1},{"date":"2026-04-03","issue":"Formula line errors in Statments","module":"Statement","description":"When  tried to add a formula line of one section to another formula line of other section in a statement, it is throwing an error","occurrences":1},{"date":"2026-04-03","issue":"New Run","module":"Statement","description":"in a statement in Navi prod instance iam unable to do a new run even when I'm clicking on the new run option the run is changing its status from scheduled to outdated and is not succeeding","occurrences":2},{"date":"2026-04-03","issue":"Publish","module":"Statement","description":"We are getting Stack Overflow Error while publishing a statement","occurrences":5},{"date":"2026-04-06","issue":"Unable to pull line item from one statement to another staement","module":"Statement","description":"Unable to pull line item from one statement to another statement by its name","occurrences":1},{"date":"2026-04-08","issue":"Incorrect format of the value","module":"Statement","description":"In Variance Percentage column of Statement, instead of percentage showing full number, for few of the line","occurrences":1},{"date":"2026-04-08","issue":"New Run","module":"Statement","description":"Automatic new run is not triggered in other view of the statement, while in default view it's Triggered","occurrences":1},{"date":"2026-04-14","issue":"Irrespective of schema Databox is getting succeeded","module":"Databox","description":"In one of the databox while uploading files it's getting uploaded irrespective of schema","occurrences":6},{"date":"2026-04-14","issue":"SFTP Connection","module":"SFTP","description":"While creating SFTP connection, it's throwing as SFTP connection test failed","occurrences":1},{"date":"2026-04-15","issue":"Adding new line","module":"Statement","description":"On adding new line item in statement it is taking too longer to load","occurrences":2},{"date":"2026-04-17","issue":"SFTP Connection","module":"Workflow","description":"In workflow, Process SFTP action is failing","occurrences":1},{"date":"2026-04-20","issue":"Databox is taking longer time to load","module":"Databox","description":"when I'm creating a databox and trying to set schema its loading continuously and im unable to see available columns","occurrences":1},{"date":"2026-04-27","issue":"Unable to update formula in Workbook - intermittent issue","module":"Workbook","description":"When updating a formula of a column in workbook, on clicking enter workbook throwing an error unable to update formula","occurrences":1},{"date":"2026-05-07","issue":"Taking longer time to run an export","module":"Export","description":"Statements Export ran more than hour and failed this is in Production environment","occurrences":3},{"date":"2026-05-07","issue":"Stack over flow","module":"Statement","description":"Unable to add filetrs, new lines and to apply percentages, Unable to edit formula line, Filter icon is invisible in view statement and facing a new run/retry error in one of the statement in production .","occurrences":4},{"date":"2026-05-08","issue":"Taking longer time than ususal - OOM error msg","module":"Statement","description":"Statements are loading for a long time and databox is in schedule state from a long time","occurrences":6},{"date":"2026-05-08","issue":"Stack overflow","module":"Statement","description":"facing stack over flow Error on publishing statement in staging","occurrences":4},{"date":"2026-05-12","issue":"Unable to select drilldowns to the formula lines","module":"Statement","description":"In statements I am unable to select drilldowns to the formula lines.","occurrences":2},{"date":"2026-05-14","issue":"Export is getting Partially succeded","module":"Export","description":"Export is getting partially succeeded \u2014 a few statements got succeeded while the same statements partially succeseded in the next run. This is happening more frequently, even after saving and publishing the statements.","occurrences":3},{"date":"2026-05-25","issue":"invalid_request","module":"Workflow","description":"We are getting invalid_request on Authenticating Email in Email connections","occurrences":1},{"date":"2026-05-25","issue":"Export is getting failed without any error","module":"Export","description":"I\u2019m facing an issue while exporting a statement. The export status is showing as \u201cFailed,\u201d but I\u2019m unable to find any error message related to it.","occurrences":1},{"date":"2026-05-25","issue":"Unable to open anythig on prod","module":"Nvi prod env","description":"we are unable to run workflows , unable to open statements in navi production env ,when i tried to open in new tab its showing : might be temporarily down or may have moved to new web address","occurrences":2},{"date":"2026-05-26","issue":"Assertion Error","module":"Statement","description":"I\u2019m facing an issue while uploading scenarios in Statements under Plan vs Actuals. When I try to upload a scenario, it throws an assertion error, even though the data is already in numeric format.","occurrences":1},{"date":"2026-05-27","issue":"Production environment is inaccessible","module":"NAVI Prod env","description":"On opening Production Environment we are getting \"This site can't be reached ,The web page might be temporarily down or it may have moved permanently to a new web address\"","occurrences":1},{"date":"2026-05-29","issue":"YTD, Remarks & Variance are not getting displayed","module":"Statement","description":"On publishing the statement after anabling YTD ,Remarks and Variance they are getting unselected (I.e unable to view YTD,Remarks and Variance columns)","occurrences":1},{"date":"2026-06-02","issue":"Unable to see all line items in Statement","module":"Statement","description":"On making a new run in a statement, it is Just showing few line items Example: Total no of lines in a statement:60 but only 40 line items being show and am unable to see rest 20 line items.","occurrences":1},{"date":"2026-06-03","issue":"Run export excel action","module":"Export","description":"Issue: I am exporting statements through a workflow using the Run Export Excel action. The workflow contains a form where users provide start_date and end_date, allowing the export to run for the selected time period. I have completed the necessary configuration to pick the start and end dates from the form. However, the export has been stuck in the Running state for a long time and is not completing successfully. To rule out any issues with the date parameters, I removed the start_date and end_date configuration and triggered the export using the default configuration. However, I am still seeing the same behavior, with the export remaining in the Running state and not completing.","occurrences":1}],"ProHance":[{"date":"2025-10-11","issue":"Updated Records Not Reflecting  Due to Deduplication","module":"App Connections","description":"Updates made to existing records in QuickBooks/Zoho Books were not reflected in Prohance. \nDue to the deduplication logic during synchronization, modified records were skipped, causing outdated values to be displayed.","occurrences":2},{"date":"2025-10-13","issue":"403 Error During Login in Prohance Environment","module":"Client error","description":"Users are encountering a 403 (Forbidden) error while attempting to log in to the Prohance environment, \npreventing access to the application","occurrences":1},{"date":"2026-01-15","issue":"Workbook Data Not Loading (Nats issue)","module":"Workbook","description":"Workbook data is not loading in the Prohance application, \npreventing users from viewing or accessing the required workbook information","occurrences":2},{"date":"2026-01-20","issue":"Currency Change Error in KPI Portal","module":"Portal","description":"While changing the currency for KPIs in the portal, \nusers are encountering the error: \u201cWrong type. \u2018dict\u2019 object has no attribute \u2018upper\u2019","occurrences":1},{"date":"2026-03-02","issue":"Workbook Data Import Failure","module":"Workbook","description":"Workbook data is not importing successfully,\npreventing users from loading and accessing the required workbook information","occurrences":1},{"date":"2026-03-02","issue":"Pipeline Source Data Preview Failure","module":"Pipeline","description":"Pipeline source data is not being previewed,\npreventing users from validating the input data before processing.","occurrences":2},{"date":"2026-03-11","issue":"YTD Calculation Failure Due to Missing Columns","module":"Exchange rates","description":"After applying YTD in Prohance,\nmultiple formula lines fail with \u201ccolumn not found\u201d errors due to incorrect or missing YTD column mapping","occurrences":1},{"date":"2026-03-24","issue":"Portal Save Failure","module":"Portal","description":"saving the portal,an error occurs: \u201cCannot read properties of null \ncausing the save operation to fail.","occurrences":1},{"date":"2026-03-17","issue":"Incorrect Currency Symbol Display in Metrics Configuration","module":"Metric","description":"When selecting number format in metrics configuration,\nthe value is not reflecting correctly and is showing the \u201c$\u201d symbol instead of a numeric format.","occurrences":1},{"date":"2026-04-03","issue":"Empty Export File from Workbook","module":"Export","description":"The downloaded export file is empty even though data is present in the workbook, \nresulting in missing output during export","occurrences":1},{"date":"2026-05-21","issue":"Filters Not Updating in Statements View","module":"Statements","description":"Filters are not updating in the Statements view when applying filters,\nresulting in no change in the displayed data.","occurrences":1},{"date":"2026-06-03","issue":"Incorrect Exchange Rate Mapping in Dataset","module":"Exchange rates","description":"The dataset is not using the exchange rates from the exchange rates sheet. \nInstead,it is applying incorrect currency rates leading to inaccurate calculations","occurrences":1}]};

      // ── Compute metrics ──
      let totalIssues=0, totalOcc=0, modules={}, monthly={}, issueMap={}, clientCounts={};
      const now = new Date();
      const thisMonth = now.getFullYear()+'-'+String(now.getMonth()+1).padStart(2,'0');
      let thisMonthCount = 0;

      Object.keys(IT_DATA).forEach(client => {
        const rows = IT_DATA[client];
        clientCounts[client] = rows.length;
        totalIssues += rows.length;
        rows.forEach(r => {
          const occ = r.occurrences || 1;
          totalOcc += occ;
          const mod = r.module || 'Other';
          modules[mod] = (modules[mod]||0) + 1;
          const m = (r.date||'').slice(0,7);
          if(m) monthly[m] = (monthly[m]||0) + 1;
          if(m === thisMonth) thisMonthCount++;
          const key = r.issue;
          if(key) issueMap[key] = (issueMap[key]||0) + occ;
        });
      });

      const sortedModules = Object.entries(modules).sort((a,b)=>b[1]-a[1]);
      const topModule = sortedModules[0]?sortedModules[0][0]:'—';
      const topIssue = Object.entries(issueMap).sort((a,b)=>b[1]-a[1])[0];
      const topIssueName = topIssue ? topIssue[0] : '—';

      // ── KPIs ──
      document.getElementById('itKpis').innerHTML = [
        {v:totalIssues,l:'Total Issues',c:'#60a5fa'},
        {v:totalOcc,l:'Total Occurrences',c:'#f59e0b'},
        {v:Object.keys(IT_DATA).length,l:'Clients Impacted',c:'#14b8a6'},
        {v:topModule,l:'Most Affected Module',c:'#f87171',small:true},
        {v:topIssueName.slice(0,22)+(topIssueName.length>22?'…':''),l:'Most Repeated Issue',c:'#a78bfa',small:true},
        {v:thisMonthCount,l:'Issues This Month',c:'#34d399'},
      ].map(k=>`<div class="it-kpi"><div class="it-kpi-val" style="color:${k.c};${k.small?'font-size:15px;':''}text-transform:none;">${k.v}</div><div class="it-kpi-lbl">${k.l}</div></div>`).join('');

      // ── Issues by Client ──
      const maxClient = Math.max(...Object.values(clientCounts));
      const clientColors = {'GIVA':'#14b8a6','Navi':'#60a5fa','ProHance':'#f59e0b'};
      document.getElementById('itChartClient').innerHTML = Object.entries(clientCounts).map(([c,v])=>{
        const pct = Math.round(v/maxClient*100);
        const col = clientColors[c]||'#60a5fa';
        return `<div class="it-bar-row"><div class="it-bar-label">${c}</div><div class="it-bar-track"><div class="it-bar-fill" style="width:${pct}%;background:${col};">${v}</div></div></div>`;
      }).join('');

      // ── Issues by Module ──
      const maxMod = sortedModules[0]?sortedModules[0][1]:1;
      document.getElementById('itChartModule').innerHTML = sortedModules.slice(0,8).map(([m,v])=>{
        const pct = Math.round(v/maxMod*100);
        return `<div class="it-bar-row"><div class="it-bar-label" style="min-width:100px;">${m}</div><div class="it-bar-track"><div class="it-bar-fill" style="width:${pct}%;background:rgba(96,165,250,.7);">${v}</div></div></div>`;
      }).join('');

      // ── Monthly Trend ──
      const months = Object.keys(monthly).sort();
      const maxMonth = Math.max(...Object.values(monthly));
      const sparkEl = document.getElementById('itSparkline');
      const lblEl = document.getElementById('itSparkLabels');
      months.forEach(m=>{
        const v = monthly[m];
        const pct = Math.round(v/maxMonth*100);
        const bar = document.createElement('div');
        bar.className = 'it-spark-bar';
        bar.style.height = '0%';
        bar.style.background = v>=15?'rgba(248,113,113,.7)':v>=8?'rgba(251,191,36,.7)':'rgba(96,165,250,.6)';
        bar.title = m+': '+v+' issues';
        bar.innerHTML = '<div class="it-spark-bar-val">'+v+'</div>';
        setTimeout(()=>{bar.style.height=pct+'%';},300);
        sparkEl.appendChild(bar);
        const lbl = document.createElement('div');
        lbl.className = 'it-spark-lbl';
        lbl.style.flex = '1';
        lbl.style.minWidth = '20px';
        const monthNames = ['','Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
        const mm = parseInt(m.slice(5));
        lbl.textContent = (monthNames[mm]||m.slice(5)) + "'" + m.slice(2,4);
        lblEl.appendChild(lbl);
      });

      // ── Top Recurring Issues ──
      const topIssues = Object.entries(issueMap).sort((a,b)=>b[1]-a[1]).slice(0,10);
      document.getElementById('itTopIssues').innerHTML = '<thead><tr><th>#</th><th>Issue</th><th>Occurrences</th></tr></thead><tbody>'
        + topIssues.map(([name,occ],i)=>`<tr><td style="color:rgba(255,255,255,.25);">${i+1}</td><td>${name}</td><td class="it-occ" style="color:${occ>=5?'#f87171':occ>=3?'#fbbf24':'rgba(255,255,255,.5)'};">${occ}</td></tr>`).join('')
        + '</tbody>';

      // ── Weekly Review ──
      const wrPoints = [
        {dot:'#f87171',text:'<strong>Statement module</strong> accounts for '+modules['Statement']+' issues — highest across all modules. Needs platform team prioritization.'},
        {dot:'#60a5fa',text:'<strong>Navi</strong> has the most issues ('+clientCounts['Navi']+') — review if platform stability is impacting this implementation.'},
        {dot:'#fbbf24',text:'<strong>"nats time error"</strong> has occurred '+(issueMap['nats time error']||0)+' times — a recurring infrastructure issue requiring root cause analysis.'},
        {dot:'#14b8a6',text:'<strong>Pipeline issues</strong> appear across multiple clients — may indicate a systemic platform problem.'},
        {dot:'#a78bfa',text:'<strong>'+thisMonthCount+'</strong> new issues logged this month — '+(thisMonthCount>10?'elevated':'normal')+' volume. Track trend weekly.'},
      ];
      document.getElementById('itWeeklyReview').innerHTML = wrPoints.map(p=>`<div class="it-wr-item"><div class="it-wr-dot" style="background:${p.dot};"></div><div style="font-size:13px;color:rgba(255,255,255,.6);line-height:1.6;">${p.text}</div></div>`).join('');

      // ── Client Drill-Down ──
      let activeClient = Object.keys(IT_DATA)[0];
      const tabsEl = document.getElementById('itClientTabs');
      Object.keys(IT_DATA).forEach(c => {
        const btn = document.createElement('button');
        btn.className = 'it-tab' + (c===activeClient?' active':'');
        btn.textContent = c + ' ('+IT_DATA[c].length+')';
        btn.onclick = ()=>{ activeClient=c; document.querySelectorAll('.it-tab').forEach(t=>t.classList.remove('active')); btn.classList.add('active'); itRenderClient(); };
        tabsEl.appendChild(btn);
      });

      function itRenderClient(filter) {
        const rows = IT_DATA[activeClient];
        const q = (filter||'').toLowerCase();
        const filtered = q ? rows.filter(r=>(r.issue+r.module+r.description).toLowerCase().includes(q)) : rows;
        const occ = filtered.reduce((s,r)=>s+(r.occurrences||1),0);
        const mods = {};
        filtered.forEach(r=>{const m=r.module||'Other';mods[m]=(mods[m]||0)+1;});
        const sortedM = Object.entries(mods).sort((a,b)=>b[1]-a[1]);
        const maxM = sortedM[0]?sortedM[0][1]:1;

        document.getElementById('itClientStats').innerHTML =
          `<div class="it-kpi" style="flex:1;min-width:120px;"><div class="it-kpi-val" style="color:#60a5fa;">${filtered.length}</div><div class="it-kpi-lbl">Issues</div></div>`+
          `<div class="it-kpi" style="flex:1;min-width:120px;"><div class="it-kpi-val" style="color:#f59e0b;">${occ}</div><div class="it-kpi-lbl">Occurrences</div></div>`+
          `<div class="it-kpi" style="flex:1;min-width:120px;"><div class="it-kpi-val" style="color:#14b8a6;">${sortedM.length}</div><div class="it-kpi-lbl">Modules Affected</div></div>`;

        document.getElementById('itClientModules').innerHTML = sortedM.map(([m,v])=>{
          const pct=Math.round(v/maxM*100);
          return `<div class="it-bar-row"><div class="it-bar-label" style="min-width:100px;">${m}</div><div class="it-bar-track"><div class="it-bar-fill" style="width:${pct}%;background:rgba(96,165,250,.6);">${v}</div></div></div>`;
        }).join('');

        document.getElementById('itClientTable').innerHTML =
          '<thead><tr><th>Date</th><th>Issue</th><th>Module</th><th>Description</th><th>Occ.</th></tr></thead><tbody>'
          + filtered.map(r=>`<tr><td style="white-space:nowrap;color:rgba(255,255,255,.35);font-family:'DM Mono',monospace;font-size:11px;">${r.date||'—'}</td><td style="font-weight:600;color:#fff;">${r.issue}</td><td><span class="it-mod-badge">${r.module}</span></td><td style="max-width:320px;font-size:12px;color:rgba(255,255,255,.4);line-height:1.5;">${r.description.slice(0,120)}${r.description.length>120?'…':''}</td><td class="it-occ" style="color:${r.occurrences>=3?'#f87171':'rgba(255,255,255,.5)'};">${r.occurrences}</td></tr>`).join('')
          + '</tbody>';
      }
      window.itFilterClient = function(){ itRenderClient(document.getElementById('itClientSearch').value); };
      itRenderClient();

      // ── Scroll reveal ──
      const overlay = document.getElementById('liOverlay') || document.body;
      const obs = new IntersectionObserver(entries=>{
        entries.forEach(e=>{ if(e.isIntersecting){e.target.classList.add('in');obs.unobserve(e.target);} });
      },{root:overlay,threshold:0.08});
      document.querySelectorAll('#liPanelIssues .it-reveal').forEach(el=>obs.observe(el));
    })();;
(function() {
      // Title word-by-word rise
      var words = document.querySelectorAll('#eswTitle .tw');
      words.forEach(function(w, i) {
        setTimeout(function() {
          w.style.animation = 'eswWordRise .6s cubic-bezier(.16,1,.3,1) forwards';
        }, 200 + i * 160);
      });

      // IntersectionObserver for reveals and flips
      var overlay = document.getElementById('liOverlay') || document.body;
      var revealEls = document.querySelectorAll('#eswPage .esw2-reveal, #eswPage .esw2-flip');
      var flowSvg   = document.getElementById('eswFlowSvg');

      var observer = new IntersectionObserver(function(entries) {
        entries.forEach(function(entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add('in');
            observer.unobserve(entry.target);
          }
        });
      }, {
        root: overlay,
        threshold: 0.15
      });

      revealEls.forEach(function(el) { observer.observe(el); });

      // SVG spine draw triggered by flow wrap visibility
      if (flowSvg) {
        var flowObserver = new IntersectionObserver(function(entries) {
          entries.forEach(function(entry) {
            if (entry.isIntersecting) {
              flowSvg.classList.add('drawing');
              // Also reveal all cards in flow wrap
              var cards = document.querySelectorAll('#eswFlowWrap .esw2-reveal');
              cards.forEach(function(c) { c.classList.add('in'); });
              flowObserver.unobserve(entry.target);
            }
          });
        }, { root: overlay, threshold: 0.1 });
        flowObserver.observe(document.getElementById('eswFlowWrap'));
      }
    })();
// ═══════════════════════════════════════════════════
// MY LEARNING
// ═══════════════════════════════════════════════════

const ML_COURSES = [
  {
    id:'wf',
    cat:'wf',
    title:'Workflows Mastery',
    desc:'Master Bluecopa workflows end-to-end — all 9 trigger types, 16 transformation nodes, API integration, error handling, parent-child orchestration, and real-world pipeline implementations.',
    tag:'Workflows',
    icon:'⚡',
    grad:'linear-gradient(145deg,#064e3b 0%,#059669 60%,#6ee7b7 100%)',
    level:'Advanced',
    lessons:10,
    badge:'Hot & New', badgeClass:'hot',
  },
  {
    id:'rc',
    cat:'rc',
    title:'Reconciliation Mastery',
    desc:'Master Bluecopa\'s reconciliation engine — dataset setup, match rule groups, full vs incremental runs, Copa system columns, and resolving exceptions manually and via workflow.',
    tag:'Reconciliation',
    icon:'🔁',
    grad:'linear-gradient(145deg,#312e81 0%,#6d28d9 60%,#a78bfa 100%)',
    level:'Intermediate',
    lessons:10,
    badge:'Hot & New', badgeClass:'hot',
  },
  {
    id:'aw',
    cat:'aw',
    title:'Approval Workflows Mastery',
    desc:'Master every approval pattern in Bluecopa — single-level approvals, email OTP, SLA handling, conditional routing, and maker-checker multi-level authorization.',
    tag:'Approval Workflows',
    icon:'✅',
    grad:'linear-gradient(145deg,#78350f 0%,#d97706 60%,#fcd34d 100%)',
    level:'Intermediate',
    lessons:10,
    badge:'Hot & New', badgeClass:'hot',
  },
  {
    id:'di',
    cat:'di',
    title:'Data Ingestion Mastery',
    desc:'Master every ingestion pattern in Bluecopa — cloud storage connectors, ZIP workflows, portal-based uploads, and real-world pipeline design for production-scale implementations.',
    tag:'Data Ingestion',
    icon:'📥',
    grad:'linear-gradient(145deg,#0f4c81 0%,#0891b2 60%,#22d3ee 100%)',
    level:'Intermediate',
    lessons:10,
    badge:'Hot & New', badgeClass:'hot',
  },
  {
    id:'bc',
    cat:'platform',
    title:'About Bluecopa',
    desc:'Understand the Bluecopa platform from the ground up — its four-layer architecture, Foundation capabilities, Processing Engines, pre-built Solutions, and the Samyx AI layer.',
    tag:'Platform Overview',
    icon:'🔵',
    img:'/bluecopa-logo.png',
    grad:'linear-gradient(145deg,#0c4a6e 0%,#0284c7 60%,#38bdf8 100%)',
    level:'Beginner',
    lessons:10,
    badge:'Hot & New', badgeClass:'hot',
  },
  {
    id:'ap',
    cat:'fs',
    title:'Account Payable Deep Dive',
    desc:'Master vendor management, three-way matching, invoice processing and payment workflows from PO to final settlement.',
    tag:'Account Payable',
    icon:'📑',
    grad:'linear-gradient(145deg,#3730a3 0%,#6d28d9 60%,#a78bfa 100%)',
    level:'Beginner',
    lessons:7,
    badge:'Building', badgeClass:'building',
  },
  {
    id:'ar',
    cat:'fs',
    title:'Account Receivable Process Mastery',
    desc:'Understand the complete AR lifecycle — from invoicing and credit management to collections, aging reports, and reconciliation.',
    tag:'Account Receivable',
    icon:'💰',
    grad:'linear-gradient(145deg,#065f46 0%,#059669 60%,#34d399 100%)',
    level:'Intermediate',
    lessons:8,
    badge:'Hot & New', badgeClass:'hot',
  },
  {
    id:'mis',
    cat:'fs',
    title:'MIS Reports & Analytics',
    desc:'Build, interpret and automate management information system reports that drive real-time decisions across finance and operations.',
    tag:'MIS Reports',
    icon:'📊',
    grad:'linear-gradient(145deg,#1e3a8a 0%,#2563eb 60%,#60a5fa 100%)',
    level:'Intermediate',
    lessons:6,
    badge:'Bestseller', badgeClass:'bestseller',
  },
  {
    id:'o2c',
    cat:'fs',
    title:'Order-to-Cash Complete Guide',
    desc:'Navigate the full order lifecycle — customer order through fulfilment, billing, collections and revenue recognition — end to end.',
    tag:'Order-to-Cash',
    icon:'📦',
    grad:'linear-gradient(145deg,#7f1d1d 0%,#dc2626 60%,#f87171 100%)',
    level:'Advanced',
    lessons:10,
    badge:'Bestseller', badgeClass:'bestseller',
  },
  {
    id:'p2p',
    cat:'fs',
    title:'Procure-to-Pay End-to-End',
    desc:'Trace every step of the procurement cycle — requisition, vendor selection, PO management, GRN and final payment — with real Bluecopa scenarios.',
    tag:'Procure-to-Pay',
    icon:'🛒',
    grad:'linear-gradient(145deg,#92400e 0%,#d97706 60%,#fcd34d 100%)',
    level:'Intermediate',
    lessons:9,
    badge:'Hot & New', badgeClass:'hot',
  },
  {
    id:'r2r',
    cat:'fs',
    title:'Record-to-Report Fundamentals',
    desc:'Close the financial period right — from journal entries and intercompany reconciliation to trial balance and management reporting.',
    tag:'Record-to-Report',
    icon:'📋',
    grad:'linear-gradient(145deg,#1e1b4b 0%,#4338ca 60%,#818cf8 100%)',
    level:'Intermediate',
    lessons:8,
    badge:'Building', badgeClass:'building',
  },
];

function mlBadgeHTML(badge, cls) {
  const map = {hot:'ml-badge-hot', bestseller:'ml-badge-bestseller', building:'ml-badge-building'};
  return `<span class="ml-badge ${map[cls]||'ml-badge-building'}">${badge}</span>`;
}

function mlCardHTML(c) {
  const stars = '★★★★★';
  const prog = mlGetCourseProgress(c.id);
  const started = prog.done > 0;
  const pct = prog.total > 0 ? Math.round(prog.done / prog.total * 100) : 0;
  const progHTML = started ? `<div class="ml-card-prog-wrap"><div class="ml-card-prog-track"><div class="ml-card-prog-fill" style="width:${pct}%"></div></div><span class="ml-card-prog-label">${pct}% complete</span></div>` : '';
  const cta = prog.passed ? '✓ Completed' : (started ? 'Continue →' : 'Start Course →');
  const ctaCls = prog.passed ? 'ml-card-cta passed' : (started ? 'ml-card-cta continue' : 'ml-card-cta');
  const totalLessons = prog.total || c.lessons;
  // Assignment context
  const assign = mlAssignmentForCourse(c.id);
  const assignStrip = assign ? `<div class="ml-assign-strip">
    <span class="ml-assign-badge ${assign.type === 'mandatory' ? 'ml-assign-mandatory' : 'ml-assign-optional'}">${assign.type}</span>
    ${mlDueDateLabel(assign.dueDate, prog.passed)}
  </div>` : '';
  return `<div class="ml-card" onclick="mlOpenCourse('${c.id}')" style="cursor:pointer" title="Open ${c.title}">
    ${assignStrip}
    <div class="ml-card-thumb" style="background:${c.grad}">
      ${c.img ? `<img class="ml-card-thumb-img" src="${c.img}" alt="${c.title}">` : `<div class="ml-card-thumb-icon">${c.icon}</div>`}
      <div class="ml-card-thumb-label">${c.tag}</div>
      ${prog.passed ? '<div class="ml-card-cert-badge">🏆</div>' : ''}
    </div>
    <div class="ml-card-body">
      <div class="ml-card-badges">
        ${mlBadgeHTML(c.badge, c.badgeClass)}
        <span class="ml-badge ml-badge-level">${c.level}</span>
      </div>
      <div class="ml-card-title">${c.title}</div>
      <div class="ml-card-desc">${c.desc}</div>
      <div class="ml-card-author">By Bluecopa Delivery Team</div>
      ${progHTML}
      <div class="ml-card-footer">
        <div class="ml-card-rating">
          <span class="ml-card-stars">${stars}</span>
          <span class="ml-card-rating-val">4.8</span>
          <span class="ml-card-rating-ct">${totalLessons} lessons</span>
        </div>
        <span class="${ctaCls}">${cta}</span>
      </div>
    </div>
  </div>`;
}

function mlRender(courses) {
  const grid = document.getElementById('mlGrid');
  const count = document.getElementById('mlCount');
  if(!grid) return;
  grid.innerHTML = courses.map(mlCardHTML).join('');
  if(count) count.textContent = `${courses.length} course${courses.length!==1?'s':''}`;
}

// mlFilter — defined in LMS section below (handles 'assigned' tab)

function mlUpdateHeroStats() {
  const nEl = document.getElementById('mlStatCoursesN');
  const lEl = document.getElementById('mlStatCoursesL');
  if (!nEl) return;
  const done = ML_COURSES.filter(c => mlGetCourseProgress(c.id).passed).length;
  const total = ML_COURSES.length;
  nEl.textContent = done;
  lEl.textContent = done === total ? 'All Done 🎉' : `of ${total} Done`;
  const catsEl = document.getElementById('mlStatCatsN');
  if (catsEl) catsEl.textContent = new Set(ML_COURSES.map(c => c.cat || c.id)).size;
}

/* ══════════════════════════════════════════════════════
   LEARNING MANAGEMENT SYSTEM
   ══════════════════════════════════════════════════════ */

// Module-level cache of the current user's assignments
let mlAssignments = [];
let lmTeamData    = null; // admin cache

// ── Load user's assignments from server ────────────────
async function mlLoadAssignments() {
  const user = JSON.parse(localStorage.getItem('kb_user') || '{}');
  if (!user.name) return;
  try {
    const r = await fetch(`/api/learning/assignments?user=${encodeURIComponent(user.name)}`);
    if (!r.ok) return;
    const d = await r.json();
    mlAssignments = d.assignments || [];
    mlRenderPersonalDash();
    // Show "My Assignments" tab only when user has assignments
    const tab = document.getElementById('mlFilterAssigned');
    if (tab) tab.style.display = mlAssignments.length ? 'inline-flex' : 'none';
  } catch(e) {}
}

// ── Render personal dashboard strip ───────────────────
function mlRenderPersonalDash() {
  const strip = document.getElementById('mlDashStrip');
  if (!strip) return;
  if (!mlAssignments.length) { strip.style.display = 'none'; return; }
  strip.style.display = 'flex';

  const prog  = JSON.parse(localStorage.getItem('ml_prog') || '{}');
  const now   = new Date();
  let completed = 0, overdue = 0, inProgress = 0;
  let mandatoryTotal = 0, mandatoryDone = 0;

  mlAssignments.forEach(a => {
    const cp    = prog[a.courseId] || {};
    const done  = cp.passed === true;
    const started = (cp.lessons || []).length > 0;
    const isOverdue = a.dueDate && !done && new Date(a.dueDate) < now;
    if (done)          completed++;
    else if (isOverdue) overdue++;
    else if (started)   inProgress++;
    if (a.type === 'mandatory') {
      mandatoryTotal++;
      if (done) mandatoryDone++;
    }
  });

  const certs = Object.values(prog).filter(p => p.passed).length;
  const pct   = mandatoryTotal ? Math.round(mandatoryDone / mandatoryTotal * 100) : 0;

  document.getElementById('mlDashAssigned').textContent  = mlAssignments.length;
  document.getElementById('mlDashCompleted').textContent = completed;
  document.getElementById('mlDashInProgress').textContent = inProgress;
  document.getElementById('mlDashOverdue').textContent   = overdue;
  document.getElementById('mlDashCerts').textContent     = certs;
  const fill = document.getElementById('mlDashProgressFill');
  const pctEl = document.getElementById('mlDashProgressPct');
  if (fill)  fill.style.width = pct + '%';
  if (pctEl) pctEl.textContent = pct + '%';
}

// ── Enhanced mlCardHTML — shows assignment badges ──────
function mlAssignmentForCourse(courseId) {
  return mlAssignments.find(a => a.courseId === courseId) || null;
}

function mlDueDateLabel(dueDate, passed) {
  if (!dueDate || passed) return '';
  const due = new Date(dueDate);
  const now = new Date();
  const overdue = due < now;
  const days = Math.ceil((due - now) / 86400000);
  const label = overdue
    ? `Overdue ${Math.abs(days)}d ago`
    : (days === 0 ? 'Due today' : `Due in ${days}d`);
  const cls = overdue ? 'ml-assign-overdue' : '';
  return `<span class="ml-assign-due ${cls}">${label}</span>`;
}

// ── Filter: "assigned" shows only user's assigned courses ──
function mlFilter(cat, btn) {
  document.querySelectorAll('.ml-filter-btn').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  let filtered;
  if (cat === 'assigned') {
    const ids = mlAssignments.map(a => a.courseId);
    filtered = ML_COURSES.filter(c => ids.includes(c.id));
  } else {
    filtered = cat === 'all' ? ML_COURSES : ML_COURSES.filter(c => (c.cat || c.id) === cat);
  }
  mlRender(filtered);
}

/* ══════════════════════════════════════════════════════
   ADMIN LEARNING MANAGEMENT OVERLAY
   ══════════════════════════════════════════════════════ */

function mlGoAdminLearning() {
  let pwd = getAdminPwd();
  if (!pwd) {
    pwd = prompt('Enter admin password to access Learning Management:');
    if (!pwd) return;
    localStorage.setItem('kb_admin_pwd', pwd);
  }
  document.getElementById('mlOverlay').classList.remove('active');
  document.getElementById('lmAdminOverlay').classList.add('active');
  lmLoadTeam();
  lmPopulateUserDropdowns();
  lmRenderCourseChecks();
}

function lmAdminClose() {
  document.getElementById('lmAdminOverlay').classList.remove('active');
  document.getElementById('mlOverlay').classList.add('active');
}

function lmTabSwitch(idx) {
  [0,1,2].forEach(i => {
    document.getElementById(`lmTab${i}`).classList.toggle('active', i === idx);
    document.getElementById(`lmPanel${i}`).classList.toggle('active', i === idx);
  });
  if (idx === 1) lmRenderRecent();
  if (idx === 2) lmRenderEnrolled();
}

// ── Load team data ─────────────────────────────────────
async function lmLoadTeam() {
  const pwd = getAdminPwd();
  const tbody = document.getElementById('lmTeamBody');
  if (!pwd) {
    if (tbody) tbody.innerHTML = '<tr><td colspan="6" class="lm-table-loading">No admin password — click ← My Learning and re-open Manage.</td></tr>';
    return;
  }
  if (tbody) tbody.innerHTML = '<tr><td colspan="6" class="lm-table-loading">Loading team data…</td></tr>';
  try {
    const r = await fetch('/api/learning/team', { headers: { 'x-admin-password': pwd } });
    if (r.status === 401) {
      localStorage.removeItem('kb_admin_pwd');
      if (tbody) tbody.innerHTML = '<tr><td colspan="6" class="lm-table-loading" style="color:#f87171">Wrong admin password. Close and re-click 📋 Manage to re-enter.</td></tr>';
      return;
    }
    if (!r.ok) {
      if (tbody) tbody.innerHTML = `<tr><td colspan="6" class="lm-table-loading" style="color:#f87171">Server error (${r.status}). Try refreshing.</td></tr>`;
      return;
    }
    lmTeamData = await r.json();
    lmRenderTeamStats();
    const emps = lmTeamData.employees || [];
    if (!emps.length) {
      if (tbody) tbody.innerHTML = '<tr><td colspan="6" class="lm-table-loading">No team members found. Upload the skill matrix first (Skill Matrix → Admin).</td></tr>';
    } else {
      lmRenderTeamTable(emps, lmTeamData.assignments || []);
    }
    lmRenderEnrolled();
  } catch(e) {
    if (tbody) tbody.innerHTML = `<tr><td colspan="6" class="lm-table-loading" style="color:#f87171">Could not reach server. Check your connection.</td></tr>`;
  }
}

function lmRenderTeamStats() {
  if (!lmTeamData) return;
  const { employees = [], assignments = [] } = lmTeamData;
  const prog = JSON.parse(localStorage.getItem('ml_prog') || '{}');
  const now  = new Date();
  const enrolledSet = new Set(assignments.map(a => a.userName.toLowerCase()));
  let overdue = 0, completed = 0;
  assignments.forEach(a => {
    if (a.dueDate && new Date(a.dueDate) < now) overdue++;
    if (prog[a.courseId]?.passed) completed++;
  });
  const mandatory = assignments.filter(a => a.type === 'mandatory');
  const mandDone  = mandatory.filter(a => prog[a.courseId]?.passed).length;
  const compliance = mandatory.length ? Math.round(mandDone / mandatory.length * 100) : 100;

  document.getElementById('lmTsTotal').textContent     = employees.length;
  document.getElementById('lmTsAssigned').textContent  = enrolledSet.size;
  document.getElementById('lmTsCompleted').textContent = completed;
  document.getElementById('lmTsOverdue').textContent   = overdue;
  document.getElementById('lmTsCompliance').textContent = compliance + '%';
}

function lmRenderTeamTable(employees, assignments) {
  const tbody  = document.getElementById('lmTeamBody');
  if (!tbody) return;
  const prog   = JSON.parse(localStorage.getItem('ml_prog') || '{}');
  const now    = new Date();

  if (!employees.length) {
    tbody.innerHTML = '<tr><td colspan="6" class="lm-table-loading">No team members found — load skill matrix first.</td></tr>';
    return;
  }

  tbody.innerHTML = employees.map(emp => {
    const name   = emp.name || emp;
    const myA    = assignments.filter(a => a.userName.toLowerCase() === name.toLowerCase());
    const total  = myA.length;
    const done   = myA.filter(a => prog[a.courseId]?.passed).length;
    const overdue= myA.filter(a => a.dueDate && !prog[a.courseId]?.passed && new Date(a.dueDate) < now).length;
    const pct    = total ? Math.round(done / total * 100) : 0;
    const nextDue = myA
      .filter(a => a.dueDate && !prog[a.courseId]?.passed)
      .map(a => new Date(a.dueDate))
      .sort((x,y)=>x-y)[0];
    const nextDueStr = nextDue
      ? nextDue.toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'})
      : '—';
    const badge = overdue > 0
      ? `<span class="lm-badge-overdue">${overdue} overdue</span>`
      : (total ? `<span class="lm-badge-ontrack">On track</span>` : '');
    const progBar = total
      ? `<div class="lm-prog-mini-wrap"><div class="lm-prog-mini-track"><div class="lm-prog-mini-fill" style="width:${pct}%"></div></div><span class="lm-prog-mini-pct">${pct}%</span></div>`
      : '<span style="color:rgba(140,140,168,.5);font-size:12px;">Not enrolled</span>';
    return `<tr>
      <td><strong>${name}</strong></td>
      <td>${total || '—'}</td>
      <td>${total ? done : '—'}</td>
      <td>${badge}</td>
      <td>${progBar}</td>
      <td style="font-size:12px;color:rgba(140,140,168,.7)">${nextDueStr}</td>
    </tr>`;
  }).join('');
}

function lmFilterTeam(q) {
  if (!lmTeamData) return;
  const filter = document.getElementById('lmTeamFilter')?.value || 'all';
  const prog   = JSON.parse(localStorage.getItem('ml_prog') || '{}');
  const now    = new Date();
  const { employees = [], assignments = [] } = lmTeamData;
  let filtered = [...employees];
  if (q) {
    const lq = q.toLowerCase();
    filtered = filtered.filter(e => (e.name || e).toLowerCase().includes(lq));
  }
  if (filter === 'enrolled') {
    filtered = filtered.filter(e => assignments.some(a => a.userName.toLowerCase() === (e.name || e).toLowerCase()));
  } else if (filter === 'overdue') {
    filtered = filtered.filter(e => assignments.some(a =>
      a.userName.toLowerCase() === (e.name || e).toLowerCase() &&
      a.dueDate && !prog[a.courseId]?.passed && new Date(a.dueDate) < now
    ));
  } else if (filter === 'not-enrolled') {
    filtered = filtered.filter(e => !assignments.some(a => a.userName.toLowerCase() === (e.name || e).toLowerCase()));
  }
  lmRenderTeamTable(filtered, assignments);
}

// ── Populate user dropdowns with skill matrix employees ─
function lmPopulateUserDropdowns() {
  if (!lmTeamData) {
    const pwd = getAdminPwd();
    if (!pwd) return;
    fetch('/api/learning/team', { headers: { 'x-admin-password': pwd } })
      .then(r => r.json()).then(d => { lmTeamData = d; lmPopulateUserDropdowns(); }).catch(()=>{});
    return;
  }
  const employees = lmTeamData.employees || [];
  ['lmFormUser','lmEnrollUser'].forEach(id => {
    const sel = document.getElementById(id);
    if (!sel) return;
    sel.innerHTML = '<option value="">— select member —</option>' +
      employees.map(e => `<option value="${(e.name||e).replace(/"/g,'&quot;')}">${e.name||e}</option>`).join('');
  });
}

// ── Render course checkboxes in Assign form ────────────
function lmRenderCourseChecks() {
  const wrap = document.getElementById('lmCourseChecks');
  if (!wrap) return;
  wrap.innerHTML = ML_COURSES.map(c =>
    `<label class="lm-course-check-item">
      <input type="checkbox" value="${c.id}" class="lm-course-chk">
      <span class="lm-course-check-label">${c.icon||''} ${c.title}</span>
    </label>`
  ).join('');
}

// ── Submit single assignment ───────────────────────────
async function lmAssignSubmit() {
  const pwd  = getAdminPwd();
  const user = document.getElementById('lmFormUser')?.value;
  const type = document.getElementById('lmFormType')?.value;
  const due  = document.getElementById('lmFormDue')?.value;
  const checked = [...document.querySelectorAll('.lm-course-chk:checked')].map(c => c.value);
  const msg  = document.getElementById('lmFormMsg');

  if (!user)           { lmShowMsg(msg, 'Select a team member.', 'err'); return; }
  if (!checked.length) { lmShowMsg(msg, 'Select at least one course.', 'err'); return; }

  try {
    await fetch('/api/learning/bulk-assign', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-admin-password': pwd },
      body: JSON.stringify({ userNames: [user], courseIds: checked, type, dueDate: due || null })
    });
    lmShowMsg(msg, `✓ ${checked.length} course(s) assigned to ${user}`, 'ok');
    document.querySelectorAll('.lm-course-chk').forEach(c => c.checked = false);
    lmLoadTeam();
    lmRenderRecent();
  } catch(e) { lmShowMsg(msg, 'Error — try again.', 'err'); }
}

// ── Render recent assignments list ─────────────────────
function lmRenderRecent() {
  const wrap = document.getElementById('lmRecentList');
  if (!wrap || !lmTeamData) { if(wrap) wrap.innerHTML = '<div class="lm-table-loading">Loading…</div>'; return; }
  const recent = [...(lmTeamData.assignments || [])]
    .sort((a,b) => new Date(b.assignedAt) - new Date(a.assignedAt))
    .slice(0, 20);
  if (!recent.length) { wrap.innerHTML = '<div class="lm-table-loading">No assignments yet.</div>'; return; }
  const courseMap = Object.fromEntries(ML_COURSES.map(c => [c.id, c]));
  wrap.innerHTML = recent.map(a => {
    const c = courseMap[a.courseId];
    return `<div class="lm-recent-item">
      <span style="font-size:18px">${c?.icon||'📘'}</span>
      <div><div class="lm-recent-name">${a.userName}</div><div class="lm-recent-course">${c?.title||a.courseId} · ${a.type}</div></div>
      <button class="lm-recent-remove" onclick="lmDeleteAssignment(${a.id})" title="Remove">✕</button>
    </div>`;
  }).join('');
}

async function lmDeleteAssignment(id) {
  const pwd = getAdminPwd();
  if (!confirm('Remove this assignment?')) return;
  await fetch(`/api/learning/assignments/${id}`, {
    method: 'DELETE', headers: { 'x-admin-password': pwd }
  });
  await lmLoadTeam();
  lmRenderRecent();
}

// ── Enroll in New Joiner Path ──────────────────────────
async function lmEnrollNewJoiner() {
  const pwd  = getAdminPwd();
  const user = document.getElementById('lmEnrollUser')?.value;
  const due  = document.getElementById('lmEnrollDue')?.value;
  const msg  = document.getElementById('lmEnrollMsg');
  if (!user) { lmShowMsg(msg, 'Select a team member.', 'err'); return; }
  const courseIds = ['bc','ap','ar','mis','o2c','p2p','r2r'];
  try {
    const r = await fetch('/api/learning/bulk-assign', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-admin-password': pwd },
      body: JSON.stringify({ userNames: [user], courseIds, pathId: 'new-joiner', type: 'mandatory', dueDate: due || null })
    });
    const d = await r.json();
    lmShowMsg(msg, `✓ ${user} enrolled in New Joiner Path`, 'ok');
    lmLoadTeam();
  } catch(e) { lmShowMsg(msg, 'Error — try again.', 'err'); }
}

async function lmEnrollAll() {
  const pwd = getAdminPwd();
  if (!lmTeamData?.employees?.length) { alert('Load team data first.'); return; }
  if (!confirm(`Enroll all ${lmTeamData.employees.length} team members in the New Joiner Learning Path?`)) return;
  const msg = document.getElementById('lmEnrollMsg');
  const userNames = lmTeamData.employees.map(e => e.name || e);
  const courseIds = ['bc','ap','ar','mis','o2c','p2p','r2r'];
  try {
    const r = await fetch('/api/learning/bulk-assign', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-admin-password': pwd },
      body: JSON.stringify({ userNames, courseIds, pathId: 'new-joiner', type: 'mandatory' })
    });
    const d = await r.json();
    lmShowMsg(msg, `✓ ${d.created} new assignments created across ${userNames.length} members`, 'ok');
    lmLoadTeam();
    lmRenderEnrolled();
  } catch(e) { lmShowMsg(msg, 'Error — try again.', 'err'); }
}

function lmRenderEnrolled() {
  const wrap = document.getElementById('lmEnrolledList');
  if (!wrap || !lmTeamData) return;
  const njUsers = [...new Set(
    (lmTeamData.assignments || [])
      .filter(a => a.pathId === 'new-joiner')
      .map(a => a.userName)
  )];
  if (!njUsers.length) { wrap.innerHTML = '<span style="color:rgba(140,140,168,.5);font-size:13px">No one enrolled yet.</span>'; return; }
  wrap.innerHTML = njUsers.map(u =>
    `<div class="lm-enrolled-chip">${u}
      <button class="lm-enrolled-chip-remove" onclick="lmUnenroll('${u.replace(/'/g,"\\'")}')">✕</button>
    </div>`
  ).join('');
}

async function lmUnenroll(userName) {
  const pwd = getAdminPwd();
  if (!lmTeamData || !confirm(`Remove ${userName} from the New Joiner Path?`)) return;
  const toDelete = lmTeamData.assignments.filter(
    a => a.userName.toLowerCase() === userName.toLowerCase() && a.pathId === 'new-joiner'
  );
  for (const a of toDelete) {
    await fetch(`/api/learning/assignments/${a.id}`, { method: 'DELETE', headers: { 'x-admin-password': pwd } });
  }
  await lmLoadTeam();
  lmRenderEnrolled();
}

function lmShowMsg(el, text, type) {
  if (!el) return;
  el.textContent = text;
  el.className = 'lm-form-msg ' + type;
  setTimeout(() => { el.textContent = ''; el.className = 'lm-form-msg'; }, 4000);
}

function dwGoLearning() {
  hideLanding();
  if(!_dwNavFlag) history.pushState({screen:'my-learning'}, '');
  const ol = document.getElementById('mlOverlay');
  if(ol) {
    ol.classList.add('active');
    document.querySelectorAll('.ml-filter-btn').forEach(b=>b.classList.remove('active'));
    const allBtn = document.querySelector('.ml-filter-btn[data-cat="all"]');
    if(allBtn) allBtn.classList.add('active');
    mlUpdateHeroStats();
    mlRender(ML_COURSES);
    mlLoadAssignments(); // load user's LMS assignments & show dashboard strip
  }
}

function mlHide() {
  const ol = document.getElementById('mlOverlay');
  if(ol) ol.classList.remove('active');
}


// Populate greeting on landing page (runs after full DOM is ready since app.js is defer)
if (typeof renderUserInfo === 'function') renderUserInfo();

// ── Hero phrase cycler ──────────────────────────────────────────────────────
(function dwHeroCycler() {
  const phrases = document.querySelectorAll('.dw-hero-phrase');
  if (!phrases.length) return;
  let idx = 0;
  setInterval(() => {
    const current = phrases[idx];
    current.classList.add('dw-phrase-exit');
    current.classList.remove('dw-phrase-active');
    setTimeout(() => current.classList.remove('dw-phrase-exit'), 700);
    idx = (idx + 1) % phrases.length;
    phrases[idx].classList.add('dw-phrase-active');
  }, 3200);
})();

// ════════════════════════════════════════════════════════════
//  EMPLOYEE ENGAGEMENT HUB
// ════════════════════════════════════════════════════════════
let _eehData = null;
let _eehAllIdeas = [];
let _eehCurrentFilter = 'all';
let _eehSpotlightEditType = 'month';
let _eehSelectedCategory = '';

function dwGoEngagement() {
  hideLanding();
  history.pushState({ screen: 'engagement' }, '');
  document.getElementById('eehOverlay').classList.add('active');
  eehSwitchTab('leaderboard');
  eehLoad();
}

function eehClose() {
  document.getElementById('eehOverlay').classList.remove('active');
  showLanding();
}

function eehSwitchTab(tab) {
  document.querySelectorAll('.eeh-tab').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
  document.querySelectorAll('.eeh-panel').forEach(p => p.classList.remove('active'));
  const panel = { leaderboard: 'eehLeaderboard', sweetplace: 'eehSweetplace', ideabox: 'eehIdeabox' }[tab];
  if (panel) document.getElementById(panel).classList.add('active');
}

async function eehLoad() {
  const [engResp, ideaResp] = await Promise.all([
    fetch('/api/engagement'),
    fetch('/api/ideas')
  ]);
  _eehData = await engResp.json();
  _eehAllIdeas = await ideaResp.json();
  _eehLbCache = {};
  _eehLoadLeaderboard();
  eehRenderSpotlights();
  eehRenderAchievements();
  eehRenderMoments();
  eehRenderIdeas();
  eehShowAdminControls();
}

function eehShowAdminControls() {
  const isAdm = isAdminUser();
  ['eehSpotlightAdmin', 'eehAchievementAdmin', 'eehMomentsAdmin'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = isAdm ? 'flex' : 'none';
  });
}

function isAdminUser() {
  try {
    const u = JSON.parse(localStorage.getItem('kb_user') || '{}');
    return u.role === 'admin' || (typeof isAdmin === 'function' && isAdmin());
  } catch { return false; }
}

// ── Leaderboard ─────────────────────────────────────────────
let _eehCurrentPeriod = 'year';
let _eehCurrentOffset = 0;   // 0 = current period, -1 = previous, etc.
let _eehLbCache = {};

function _eehPeriodLabel(period, offset) {
  const now = new Date();
  const y = now.getFullYear(), m = now.getMonth();
  if (period === 'month') {
    const tm = m + offset;
    const d = new Date(y, tm, 1);
    return d.toLocaleString('en-US', { month: 'long', year: 'numeric' });
  } else if (period === 'quarter') {
    const tq = Math.floor(m / 3) + offset;
    const d = new Date(y, tq * 3, 1);
    const qNum = Math.floor(d.getMonth() / 3) + 1;
    return `Q${qNum} ${d.getFullYear()}`;
  } else {
    return String(y + offset);
  }
}

const _LB_CAT_META = {
  articles: { label: 'Articles',      icon: '📚', color: '#c9a227' },
  skills:   { label: 'Skill Matrix',  icon: '🎯', color: '#7a9ee8' },
  puzzles:  { label: 'Puzzles',       icon: '🧩', color: '#7ae8b4' },
  issues:   { label: 'Issue Solved',  icon: '🐛', color: '#e87a9e' },
  raised:   { label: 'Issue Raised',  icon: '🚀', color: '#e8d47a' },
  tasks:    { label: 'Tasks Done',    icon: '✅', color: '#c97ae8' },
  ideas:    { label: 'Ideas',         icon: '💡', color: '#e8a87a' },
  learning: { label: 'Learning',      icon: '📘', color: '#7ae8e8' },
};

function eehSetPeriod(period, el) {
  _eehCurrentPeriod = period;
  _eehCurrentOffset = 0; // reset to current period when switching tabs
  document.querySelectorAll('.eeh-lb-period-btn').forEach(b => b.classList.remove('active'));
  if (el) el.classList.add('active');
  _eehLoadLeaderboard();
}

function eehNavigatePeriod(delta) {
  const next = _eehCurrentOffset + delta;
  if (next > 0) return; // no future periods
  _eehCurrentOffset = next;
  // Enable/disable next arrow
  const nextBtn = document.getElementById('eehLbNavNext');
  if (nextBtn) nextBtn.disabled = _eehCurrentOffset >= 0;
  _eehLoadLeaderboard();
}

async function _eehLoadLeaderboard() {
  const cacheKey = `${_eehCurrentPeriod}_${_eehCurrentOffset}`;
  if (_eehLbCache[cacheKey]) {
    eehRenderLeaderboard(_eehLbCache[cacheKey]);
    return;
  }
  // Show skeleton while loading
  const r1 = document.getElementById('eehRank1');
  if (r1) r1.innerHTML = '<div class="eeh-lb-loading"><div class="eeh-lb-spin"></div><span>Computing 360° scores…</span></div>';
  ['eehRank23','eehRankRest'].forEach(id => { const el = document.getElementById(id); if (el) el.innerHTML = ''; });

  try {
    const resp = await fetch(`/api/leaderboard?period=${_eehCurrentPeriod}&offset=${_eehCurrentOffset}`);
    const payload = await resp.json();
    // Server may return { error, detail } on failure — treat as empty
    const data = Array.isArray(payload) ? payload : [];
    _eehLbCache[cacheKey] = data;
    eehRenderLeaderboard(data);
  } catch (err) {
    console.error('[leaderboard]', err);
    eehRenderLeaderboard([]);
  }
}

function _eehBreakdownBars(breakdown, maxScore) {
  const cats = Object.entries(breakdown).filter(([, v]) => v > 0).sort(([,a],[,b]) => b-a);
  if (!cats.length) return '';
  return `<div class="eeh-bd-wrap">${
    cats.map(([k, v]) => {
      const m = _LB_CAT_META[k] || { icon: '·', label: k, color: '#888' };
      const pct = Math.min(100, Math.round((v / maxScore) * 100));
      return `<div class="eeh-bd-item" title="${m.label}: ${v} pts">
        <span class="eeh-bd-icon">${m.icon}</span>
        <div class="eeh-bd-bar"><div class="eeh-bd-fill" style="width:${pct}%;background:${m.color}"></div></div>
        <span class="eeh-bd-val">${v}<span class="eeh-bd-pts">p</span></span>
      </div>`;
    }).join('')
  }</div>`;
}

function eehRenderLeaderboard(data) {
  data = data || [];
  const top = data[0];
  const maxScore = top ? top.score : 1;

  const label = _eehPeriodLabel(_eehCurrentPeriod, _eehCurrentOffset);
  const lbl = document.getElementById('eehLbPeriodLabel');
  if (lbl) lbl.textContent = label;
  // Keep next arrow disabled when at current period
  const nextBtn = document.getElementById('eehLbNavNext');
  if (nextBtn) nextBtn.disabled = _eehCurrentOffset >= 0;

  const dicebear = name => `https://api.dicebear.com/9.x/avataaars/png?seed=${encodeURIComponent(name)}`;

  // Rank #1 — hero card
  const r1 = document.getElementById('eehRank1');
  if (r1) {
    if (!top) {
      r1.innerHTML = '<div class="eeh-lb-empty">No data for this period yet.</div>';
    } else {
      const bd = top.breakdown || {};
      const activeCats = Object.entries(bd).filter(([,v]) => v > 0);
      r1.innerHTML = `<div class="eeh-rank1-card">
        <div class="eeh-rank1-medal">🥇</div>
        <div class="eeh-rank1-avatar"><img src="${dicebear(top.name)}" alt="${top.name}"></div>
        <div class="eeh-rank1-body">
          <div class="eeh-rank1-eyebrow">🏆 Top Performer — ${label}</div>
          <div class="eeh-rank1-name">${top.name}</div>
          <div class="eeh-rank1-dept">${activeCats.map(([k]) => _LB_CAT_META[k]?.icon || '').join(' ')} Active in ${activeCats.length} categories</div>
          <div class="eeh-rank1-stats">
            <div class="eeh-rank1-stat">
              <div class="eeh-rank1-stat-val">${top.score}<span class="eeh-stat-pts">pts</span></div>
              <div class="eeh-rank1-stat-lbl">Total Score</div>
            </div>
            ${Object.entries(bd).filter(([,v]) => v > 0).sort(([,a],[,b]) => b-a).slice(0, 3).map(([k, v]) => `
            <div class="eeh-rank1-divider"></div>
            <div class="eeh-rank1-stat">
              <div class="eeh-rank1-stat-val" style="color:${_LB_CAT_META[k]?.color||'#fff'}">${v}<span class="eeh-stat-pts">pts</span></div>
              <div class="eeh-rank1-stat-lbl">${_LB_CAT_META[k]?.label || k}</div>
            </div>`).join('')}
          </div>
          ${_eehBreakdownBars(bd, maxScore)}
          <div class="eeh-rank1-badge">⭐ 360° Champion</div>
        </div>
      </div>`;
    }
  }

  // Rank #2 & #3 — side cards
  const r23 = document.getElementById('eehRank23');
  if (r23) {
    r23.innerHTML = [1, 2].map(i => {
      const p = data[i];
      if (!p) return '<div></div>';
      const medal = i === 1 ? '🥈' : '🥉';
      const cls   = i === 1 ? 'rank2' : 'rank3';
      const bd = p.breakdown || {};
      return `<div class="eeh-rank-sm ${cls}">
        <div class="eeh-rank-sm-medal">${medal}</div>
        <div class="eeh-rank-sm-avatar"><img src="${dicebear(p.name)}" alt="${p.name}"></div>
        <div class="eeh-rank-sm-body">
          <div class="eeh-rank-sm-name">${p.name}</div>
          <div class="eeh-rank-sm-dept">${Object.entries(bd).filter(([,v])=>v>0).map(([k])=>_LB_CAT_META[k]?.icon||'').join(' ')}</div>
          <div class="eeh-rank-sm-score-row">
            <div class="eeh-rank-sm-score">${p.score}</div>
            <div class="eeh-rank-sm-pts">pts</div>
          </div>
          ${_eehBreakdownBars(bd, maxScore)}
        </div>
      </div>`;
    }).join('');
  }

  // Rank #4–#10 — list rows
  const rRest = document.getElementById('eehRankRest');
  if (rRest) {
    rRest.innerHTML = data.slice(3).map((p, idx) => {
      const bd = p.breakdown || {};
      const pct = Math.round((p.score / maxScore) * 100);
      const cats = Object.entries(bd).filter(([,v])=>v>0).map(([k])=>_LB_CAT_META[k]?.icon||'').join(' ');
      return `<div class="eeh-rank-row">
        <div class="eeh-rank-row-pos">${idx + 4}</div>
        <div class="eeh-rank-row-avatar"><img src="${dicebear(p.name)}" alt="${p.name}"></div>
        <div class="eeh-rank-row-body">
          <div class="eeh-rank-row-name">${p.name}</div>
          <div class="eeh-rank-row-dept">${cats}</div>
        </div>
        <div class="eeh-rank-row-right">
          <div class="eeh-rank-row-score">${p.score} <span class="eeh-rank-row-pts">pts</span></div>
          <div class="eeh-rank-row-bar"><div class="eeh-rank-row-bar-fill" style="width:${pct}%"></div></div>
        </div>
      </div>`;
    }).join('');
  }
}

// ── Spotlights ──────────────────────────────────────────────
function eehRenderSpotlights() {
  _eehRenderSpotYear();
  _eehRenderSpotGrid();
}

function _eehRenderSpotYear() {
  const el = document.getElementById('eehSpotYear');
  if (!el) return;
  const yr = (_eehData.spotlight || {}).year;
  if (!yr || !yr.name) {
    el.innerHTML = `<div class="eeh-spot-year-empty">
      <span class="eeh-spot-year-empty-icon">🏆</span>
      <div class="eeh-spot-year-empty-lbl">Employee of the Year</div>
      <div class="eeh-spot-year-empty-txt">Not yet announced — stay tuned for the announcement!</div>
    </div>`;
    return;
  }
  const ini = yr.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  const av = yr.photo ? `<img src="${yr.photo}" onerror="this.style.display='none'">` : ini;
  el.innerHTML = `<div class="eeh-spot-year-card">
    <div class="eeh-spot-year-avatar">${av}</div>
    <div class="eeh-spot-year-body">
      <div class="eeh-spot-year-eyebrow">⭐ Employee of the Year</div>
      <div class="eeh-spot-year-name">${yr.name}</div>
      <div class="eeh-spot-year-dept">${yr.dept || ''}</div>
      ${yr.reason ? `<div class="eeh-spot-year-quote">"${yr.reason}"</div>` : ''}
      ${yr.period ? `<div class="eeh-spot-year-period">${yr.period}</div>` : ''}
    </div>
  </div>`;
}

function _eehRenderSpotGrid() {
  const el = document.getElementById('eehSpotGrid');
  if (!el) return;
  const sp = _eehData.spotlight || {};
  const types = [
    { key: 'month',   label: 'Employee of the Month',   crown: '🥇', cls: 'eeh-s-month' },
    { key: 'quarter', label: 'Employee of the Quarter',  crown: '🥈', cls: 'eeh-s-quarter' }
  ];
  el.innerHTML = types.map(t => {
    const d = sp[t.key];
    if (!d || !d.name) return `
      <div class="eeh-spot-sm ${t.cls}">
        <div class="eeh-spot-sm-avatar-ph">${t.crown}</div>
        <div class="eeh-spot-sm-body">
          <div class="eeh-spot-sm-label">${t.label}</div>
          <div class="eeh-spot-sm-name-empty">Not yet announced</div>
          <div class="eeh-spot-sm-quote" style="margin-top:6px;">Stay tuned — spotlight coming soon.</div>
        </div>
      </div>`;
    const ini = d.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
    const av = d.photo ? `<img src="${d.photo}" onerror="this.style.display='none'">` : ini;
    return `
      <div class="eeh-spot-sm ${t.cls}">
        <div class="eeh-spot-sm-avatar">${av}</div>
        <div class="eeh-spot-sm-body">
          <div class="eeh-spot-sm-label">${t.label}</div>
          <div class="eeh-spot-sm-name">${d.name}</div>
          <div class="eeh-spot-sm-dept">${d.dept || ''}</div>
          ${d.reason ? `<div class="eeh-spot-sm-quote">"${d.reason}"</div>` : ''}
          ${d.period ? `<div class="eeh-spot-sm-period">${d.period}</div>` : ''}
        </div>
      </div>`;
  }).join('');
}

function eehOpenSpotlightModal(type) {
  _eehSpotlightEditType = type;
  const labels = { month: 'Employee of the Month', quarter: 'Employee of the Quarter', year: 'Employee of the Year' };
  document.getElementById('eehSpotlightModalTitle').textContent = `Edit — ${labels[type]}`;
  const d = (_eehData.spotlight || {})[type] || {};
  document.getElementById('smName').value = d.name || '';
  document.getElementById('smDept').value = d.dept || '';
  document.getElementById('smPeriod').value = d.period || '';
  document.getElementById('smReason').value = d.reason || '';
  document.getElementById('smPhoto').value = d.photo || '';
  document.getElementById('eehSpotlightModalBg').classList.add('open');
}

function eehCloseSpotlightModal() { document.getElementById('eehSpotlightModalBg').classList.remove('open'); }

async function eehSaveSpotlight() {
  const data = {
    name:   document.getElementById('smName').value.trim(),
    dept:   document.getElementById('smDept').value.trim(),
    period: document.getElementById('smPeriod').value.trim(),
    reason: document.getElementById('smReason').value.trim(),
    photo:  document.getElementById('smPhoto').value.trim()
  };
  const u = JSON.parse(localStorage.getItem('kb_user') || '{}');
  await fetch('/api/engagement/spotlight', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'x-user-email': u.email || '' },
    body: JSON.stringify({ type: _eehSpotlightEditType, data })
  });
  if (!_eehData.spotlight) _eehData.spotlight = {};
  _eehData.spotlight[_eehSpotlightEditType] = data;
  eehCloseSpotlightModal();
  eehRenderSpotlights();
}

// ── Achievements ────────────────────────────────────────────
const ACH_ICONS = ['🏅','🎖️','⭐','🌟','🎗️','🏆','💎','🔥','🚀','✨'];

function eehRenderAchievements() {
  const el = document.getElementById('eehAchievements');
  if (!el) return;
  const list = (_eehData.achievements || []);
  if (!list.length) { el.innerHTML = '<div class="eeh-empty"><span class="eeh-empty-icon">🏅</span>No achievements yet — add the first one!</div>'; return; }
  el.innerHTML = list.map((a, i) => `
    <div class="eeh-achievement">
      <div class="eeh-ach-icon">${ACH_ICONS[i % ACH_ICONS.length]}</div>
      <div class="eeh-ach-body" style="flex:1;">
        <div class="eeh-ach-award">${a.award}</div>
        <div class="eeh-ach-name">${a.name}</div>
        <div class="eeh-ach-dept">${a.dept || ''}</div>
        ${a.desc ? `<div class="eeh-ach-desc">${a.desc}</div>` : ''}
        ${a.date ? `<div class="eeh-ach-date">${new Date(a.date).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'})}</div>` : ''}
      </div>
      ${isAdminUser() ? `<button class="eeh-ach-del" onclick="eehDeleteAchievement(${i})" title="Remove">✕</button>` : ''}
    </div>`).join('');
}

function eehOpenAchievementModal() {
  ['achName','achDept','achAward','achDesc'].forEach(id => document.getElementById(id).value = '');
  document.getElementById('achDate').value = '';
  document.getElementById('eehAchievementModalBg').classList.add('open');
}
function eehCloseAchievementModal() { document.getElementById('eehAchievementModalBg').classList.remove('open'); }

async function eehSaveAchievement() {
  const ach = {
    name:  document.getElementById('achName').value.trim(),
    dept:  document.getElementById('achDept').value.trim(),
    award: document.getElementById('achAward').value.trim(),
    date:  document.getElementById('achDate').value,
    desc:  document.getElementById('achDesc').value.trim()
  };
  if (!ach.name || !ach.award) return;
  const list = [...(_eehData.achievements || []), ach];
  const u = JSON.parse(localStorage.getItem('kb_user') || '{}');
  await fetch('/api/engagement/achievements', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'x-user-email': u.email || '' },
    body: JSON.stringify({ achievements: list })
  });
  _eehData.achievements = list;
  eehCloseAchievementModal();
  eehRenderAchievements();
}

async function eehDeleteAchievement(idx) {
  const list = (_eehData.achievements || []).filter((_, i) => i !== idx);
  const u = JSON.parse(localStorage.getItem('kb_user') || '{}');
  await fetch('/api/engagement/achievements', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'x-user-email': u.email || '' },
    body: JSON.stringify({ achievements: list })
  });
  _eehData.achievements = list;
  eehRenderAchievements();
}

// ── Sweet Place: Moments ────────────────────────────────────
function eehRenderMoments() {
  eehUpdateTodayBanner();
  eehRenderBirthdays();
  eehRenderAnniversaries();
  eehRenderGallery();
}

function initials(name) { return (name||'').split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase(); }

function eehUpdateTodayBanner() {
  const banner = document.getElementById('eehTodayBanner');
  if (!banner) return;
  const today = new Date();
  const isToday = d => { const dt = new Date(d); return dt.getMonth()===today.getMonth() && dt.getDate()===today.getDate(); };
  const bdToday = ((_eehData.moments||{}).birthdays||[]).filter(b => isToday(b.date));
  const annToday = ((_eehData.moments||{}).anniversaries||[]).filter(a => isToday(a.date));
  if (bdToday.length || annToday.length) {
    banner.style.display = 'flex';
    const parts = [
      ...bdToday.map(b => `🎂 ${b.name}`),
      ...annToday.map(a => `🎊 ${a.name} (${today.getFullYear()-new Date(a.date).getFullYear()} yrs)`)
    ];
    document.getElementById('eehTodayTitle').textContent = 'Celebrating today! 🎉';
    document.getElementById('eehTodaySub').textContent = parts.join(' · ');
  } else {
    banner.style.display = 'none';
  }
}

const BDAY_GRADS = [
  '#7c3aed,#a78bfa','#be185d,#f472b6','#0e7490,#38bdf8',
  '#065f46,#34d399','#92400e,#fbbf24','#1d4ed8,#60a5fa','#7e22ce,#c084fc'
];

function eehRenderBirthdays() {
  const el = document.getElementById('eehBirthdays');
  if (!el) return;
  const list = ((_eehData.moments || {}).birthdays || []);
  if (!list.length) { el.innerHTML = '<div class="eeh-empty"><span class="eeh-empty-icon">🎂</span>No birthdays added yet — add your team!</div>'; return; }
  const today = new Date();
  const tagged = list.map((b, i) => ({ ...b, _idx: i }));
  const sorted = [...tagged].sort((a, b) => {
    const da = new Date(a.date), db = new Date(b.date);
    const am = da.getMonth() * 31 + da.getDate(), bm = db.getMonth() * 31 + db.getDate();
    const tm = today.getMonth() * 31 + today.getDate();
    return ((am - tm + 366) % 366) - ((bm - tm + 366) % 366);
  });
  el.innerHTML = sorted.map((b, i) => {
    const d = new Date(b.date);
    const label = d.toLocaleDateString('en-IN', { day: 'numeric', month: 'long' });
    const isTdy = d.getMonth()===today.getMonth() && d.getDate()===today.getDate();
    const grad = BDAY_GRADS[i % BDAY_GRADS.length];
    const av = b.photo ? `<img src="${b.photo}" onerror="this.style.display='none'">` : initials(b.name);
    return `<div class="eeh-bday-card${isTdy?' eeh-bday-today':''}">
      ${isTdy ? `<div class="eeh-bday-today-pill">🎉 Today</div>` : ''}
      <div class="eeh-bday-avatar" style="background:linear-gradient(135deg,${grad});">${av}</div>
      <div class="eeh-bday-name" title="${b.name}">${b.name}</div>
      <div class="eeh-bday-dept" title="${b.dept||''}">${b.dept||''}</div>
      <div class="eeh-bday-date">🎂 ${label}</div>
      ${isAdminUser() ? `<button class="eeh-bday-del" onclick="eehDeleteMoment('birthdays',${b._idx})" title="Remove">✕</button>` : ''}
    </div>`;
  }).join('');
}

function eehRenderAnniversaries() {
  const el = document.getElementById('eehAnniversaries');
  if (!el) return;
  const list = ((_eehData.moments || {}).anniversaries || []);
  if (!list.length) { el.innerHTML = '<div class="eeh-empty"><span class="eeh-empty-icon">🎊</span>No anniversaries added yet.</div>'; return; }
  const today = new Date();
  el.innerHTML = list.map((a, i) => {
    const joined = new Date(a.date);
    const years = today.getFullYear() - joined.getFullYear();
    const isTdy = joined.getMonth()===today.getMonth() && joined.getDate()===today.getDate();
    const milestone = years >= 10 ? `💎 ${years} Years` : years >= 5 ? `🏆 ${years} Years` : years >= 3 ? `🌟 ${years} Years` : `⭐ ${years} Year${years!==1?'s':''}`;
    const av = a.photo ? `<img src="${a.photo}" onerror="this.style.display='none'">` : initials(a.name);
    return `<div class="eeh-ann-card${isTdy?' eeh-ann-today':''}">
      <div class="eeh-ann-avatar">${av}</div>
      <div class="eeh-ann-body">
        <div class="eeh-ann-name" title="${a.name}">${a.name}</div>
        <div class="eeh-ann-dept">${a.dept||''}</div>
        <div class="eeh-ann-milestone">${milestone}</div>
        <div class="eeh-ann-joined">Joined ${joined.toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'})}</div>
      </div>
      ${isAdminUser() ? `<button class="eeh-ann-del" onclick="eehDeleteMoment('anniversaries',${i})" title="Remove">✕</button>` : ''}
    </div>`;
  }).join('');
}

function eehRenderGallery() {
  const el = document.getElementById('eehGallery');
  if (!el) return;
  const list = ((_eehData.moments || {}).photos || []);
  if (!list.length) { el.innerHTML = '<div class="eeh-empty"><span class="eeh-empty-icon">📸</span>No team photos yet — add the first memory!</div>'; return; }
  el.innerHTML = list.map((p, i) => `
    <div class="eeh-gallery-card">
      <img src="${p.url}" alt="${p.caption||''}" loading="lazy" onerror="this.parentElement.innerHTML='<div class=eeh-gallery-placeholder>📸</div>'">
      ${p.caption?`<div class="eeh-gallery-caption">${p.caption}</div>`:''}
      ${isAdminUser()?`<button class="eeh-gallery-del" onclick="eehDeleteMoment('photos',${i})" title="Remove">✕</button>`:''}
    </div>`).join('');
}

function eehOpenBirthdayModal() { document.getElementById('eehBirthdayModalBg').classList.add('open'); }
function eehOpenAnniversaryModal() { document.getElementById('eehAnniversaryModalBg').classList.add('open'); }
function eehOpenPhotoModal() { document.getElementById('eehPhotoModalBg').classList.add('open'); }

async function _eehSaveMoments() {
  const u = JSON.parse(localStorage.getItem('kb_user') || '{}');
  await fetch('/api/engagement/moments', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'x-user-email': u.email || '' },
    body: JSON.stringify({ moments: _eehData.moments })
  });
}

async function eehSaveBirthday() {
  const entry = { name: document.getElementById('bdName').value.trim(), dept: document.getElementById('bdDept').value.trim(), date: document.getElementById('bdDate').value, photo: document.getElementById('bdPhoto').value.trim() };
  if (!entry.name || !entry.date) return;
  if (!_eehData.moments) _eehData.moments = { photos:[], birthdays:[], anniversaries:[] };
  _eehData.moments.birthdays.push(entry);
  await _eehSaveMoments();
  document.getElementById('eehBirthdayModalBg').classList.remove('open');
  eehRenderBirthdays();
}

async function eehSaveAnniversary() {
  const entry = { name: document.getElementById('annName').value.trim(), dept: document.getElementById('annDept').value.trim(), date: document.getElementById('annDate').value, photo: document.getElementById('annPhoto').value.trim() };
  if (!entry.name || !entry.date) return;
  if (!_eehData.moments) _eehData.moments = { photos:[], birthdays:[], anniversaries:[] };
  _eehData.moments.anniversaries.push(entry);
  await _eehSaveMoments();
  document.getElementById('eehAnniversaryModalBg').classList.remove('open');
  eehRenderAnniversaries();
}

async function eehSavePhoto() {
  const entry = { url: document.getElementById('photoUrl').value.trim(), caption: document.getElementById('photoCaption').value.trim() };
  if (!entry.url) return;
  if (!_eehData.moments) _eehData.moments = { photos:[], birthdays:[], anniversaries:[] };
  _eehData.moments.photos.unshift(entry);
  await _eehSaveMoments();
  document.getElementById('eehPhotoModalBg').classList.remove('open');
  eehRenderGallery();
}

async function eehDeleteMoment(type, idx) {
  _eehData.moments[type].splice(idx, 1);
  await _eehSaveMoments();
  eehRenderMoments();
}

// ── Category tile selection ──────────────────────────────────
function eehSelectCategory(cat, el) {
  _eehSelectedCategory = cat;
  document.querySelectorAll('.eeh-cat-tile').forEach(t => t.classList.remove('selected'));
  el.classList.add('selected');
}

// ── Ideas ───────────────────────────────────────────────────
const CAT_LABELS = { website:'🖥️ Website', process:'⚙️ Process', product:'🚀 Product', culture:'🤝 Culture', other:'💬 Other' };
const STATUS_LABELS = { new:'New', review:'Under Review', inprogress:'In Progress', implemented:'Implemented' };

function eehRenderIdeas() {
  const el = document.getElementById('eehIdeasList');
  if (!el) return;
  const u = JSON.parse(localStorage.getItem('kb_user') || '{}');
  const adm = isAdminUser();
  let list = _eehAllIdeas;
  if (_eehCurrentFilter !== 'all') list = list.filter(i => i.category === _eehCurrentFilter);
  if (!list.length) { el.innerHTML = '<div class="eeh-empty"><span class="eeh-empty-icon">💡</span>No ideas yet — be the first to share one!</div>'; return; }
  el.innerHTML = list.map(idea => {
    const voted = (idea.voters||[]).includes(u.email||'');
    const statusCls = { new:'eeh-status-new', review:'eeh-status-review', inprogress:'eeh-status-inprogress', implemented:'eeh-status-implemented' }[idea.status] || 'eeh-status-new';
    const catCls = { website:'eeh-cat-website', process:'eeh-cat-process', product:'eeh-cat-product', culture:'eeh-cat-culture', other:'eeh-cat-other' }[idea.category] || 'eeh-cat-other';
    const dateStr = new Date(idea.date).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'});
    return `<div class="eeh-idea-card" id="idea-${idea.id}">
      <div class="eeh-idea-vote">
        <button class="eeh-vote-btn ${voted?'voted':''}" onclick="eehToggleVote(${idea.id})" title="${voted?'Remove vote':'Upvote'}">▲</button>
        <div class="eeh-vote-count" id="vote-count-${idea.id}">${idea.votes||0}</div>
      </div>
      <div class="eeh-idea-body">
        <div class="eeh-idea-header">
          <div class="eeh-idea-title">${idea.title}</div>
          <span class="eeh-idea-cat ${catCls}">${CAT_LABELS[idea.category]||idea.category}</span>
          <span class="eeh-idea-status ${statusCls}">${STATUS_LABELS[idea.status]||idea.status}</span>
        </div>
        <div class="eeh-idea-desc">${idea.description}</div>
        <div class="eeh-idea-meta">
          <span>by ${idea.author||'Anonymous'}</span>
          <span>${dateStr}</span>
        </div>
        ${adm ? `<div class="eeh-idea-admin-actions">
          <button class="eeh-idea-status-btn" onclick="eehSetIdeaStatus(${idea.id},'review')">Under Review</button>
          <button class="eeh-idea-status-btn" onclick="eehSetIdeaStatus(${idea.id},'inprogress')">In Progress</button>
          <button class="eeh-idea-status-btn" onclick="eehSetIdeaStatus(${idea.id},'implemented')">Implemented</button>
          <button class="eeh-idea-del-btn" onclick="eehDeleteIdea(${idea.id})">Delete</button>
        </div>` : ''}
      </div>
    </div>`;
  }).join('');
}

function eehFilterIdeas(filter, btn) {
  _eehCurrentFilter = filter;
  document.querySelectorAll('.eeh-idea-filter').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  eehRenderIdeas();
}

async function eehSubmitIdea() {
  const title = document.getElementById('ideaTitle').value.trim();
  const category = _eehSelectedCategory;
  const description = document.getElementById('ideaDescription').value.trim();
  const author = document.getElementById('ideaAuthor').value.trim();
  if (!title || !category || !description) { alert('Please fill in the title, pick a category tile, and add a description.'); return; }
  const u = JSON.parse(localStorage.getItem('kb_user') || '{}');
  const resp = await fetch('/api/ideas', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-user-email': u.email || '' },
    body: JSON.stringify({ title, category, description, author: author || u.name || 'Anonymous' })
  });
  const newIdea = await resp.json();
  _eehAllIdeas.unshift(newIdea);
  document.getElementById('ideaTitle').value = '';
  document.getElementById('ideaDescription').value = '';
  document.getElementById('ideaAuthor').value = '';
  _eehSelectedCategory = '';
  document.querySelectorAll('.eeh-cat-tile').forEach(t => t.classList.remove('selected'));
  _eehCurrentFilter = 'all';
  document.querySelectorAll('.eeh-idea-filter').forEach(b => b.classList.toggle('active', b.dataset.filter === 'all'));
  eehRenderIdeas();
}

async function eehToggleVote(ideaId) {
  const u = JSON.parse(localStorage.getItem('kb_user') || '{}');
  if (!u.email) return;
  const resp = await fetch(`/api/ideas/${ideaId}/vote`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-user-email': u.email },
    body: JSON.stringify({ voterEmail: u.email })
  });
  const data = await resp.json();
  const idea = _eehAllIdeas.find(i => i.id === ideaId);
  if (idea) {
    idea.votes = data.votes;
    if (data.voted) { idea.voters.push(u.email); } else { idea.voters = idea.voters.filter(v => v !== u.email); }
  }
  const countEl = document.getElementById(`vote-count-${ideaId}`);
  if (countEl) countEl.textContent = data.votes;
  const btn = document.querySelector(`#idea-${ideaId} .eeh-vote-btn`);
  if (btn) btn.classList.toggle('voted', data.voted);
}

async function eehSetIdeaStatus(ideaId, status) {
  const u = JSON.parse(localStorage.getItem('kb_user') || '{}');
  await fetch(`/api/ideas/${ideaId}/status`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'x-user-email': u.email || '' },
    body: JSON.stringify({ status })
  });
  const idea = _eehAllIdeas.find(i => i.id === ideaId);
  if (idea) idea.status = status;
  eehRenderIdeas();
}

async function eehDeleteIdea(ideaId) {
  if (!confirm('Delete this idea?')) return;
  const u = JSON.parse(localStorage.getItem('kb_user') || '{}');
  await fetch(`/api/ideas/${ideaId}`, {
    method: 'DELETE',
    headers: { 'x-user-email': u.email || '' }
  });
  _eehAllIdeas = _eehAllIdeas.filter(i => i.id !== ideaId);
  eehRenderIdeas();
}

// Handle browser back from engagement hub
window.addEventListener('popstate', e => {
  if (document.getElementById('eehOverlay').classList.contains('active')) {
    eehClose();
  }
});
