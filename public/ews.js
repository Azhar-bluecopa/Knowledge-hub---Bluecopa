/* ═══════════════════════════════════════════════════════════════════════════
   EWS — Early Warning System  ·  ews.js  v1
   IIFE module pattern, same as uat.js
═══════════════════════════════════════════════════════════════════════════ */

const EWS = (() => {
  'use strict';

  // ── State ─────────────────────────────────────────────────────────────────
  const S = {
    view: 'dashboard',
    ewsList: [],
    projects: [],
    clients: [],
    currentEwsId: null,
    inited: false,
    loading: false,
  };

  // Dashboard filter state
  let _edf = { client:'', project:'', severity:'', status:'' };
  // List filter state
  let _elf = { client:'', project:'', severity:'', status:'', triggerType:'' };
  // Chart instances
  const _ec = {};
  // Selected trigger in new-EWS modal
  let _selTrigger = '';
  // Add-update panel open state
  let _addUpdateOpen = false;

  // ── Constants ─────────────────────────────────────────────────────────────
  const TRIGGER_TYPES = {
    scope_creep:              { label:'Scope Creep',            icon:'📐', desc:'Unplanned feature growth' },
    timeline_delay:           { label:'Timeline Delay',         icon:'⏰', desc:'Milestone or schedule risk' },
    customer_dissatisfaction: { label:'Client Dissatisfaction', icon:'😟', desc:'Escalated concerns or complaints' },
    technical_challenges:     { label:'Technical Challenges',   icon:'⚙️',  desc:'Platform or integration issues' },
    deprioritization:         { label:'Deprioritization',       icon:'📉', desc:'Client reducing focus or resources' },
    resource_constraint:      { label:'Resource Constraint',    icon:'👥', desc:'Team availability or bandwidth' },
    dependency_risk:          { label:'Dependency Risk',        icon:'🔗', desc:'Third-party or upstream blockers' },
    quality_issues:           { label:'Quality Issues',         icon:'🐛', desc:'Repeated defects or rework' },
    budget_overrun:           { label:'Budget Overrun',         icon:'💸', desc:'Cost escalation beyond plan' },
    low_engagement:           { label:'Low Engagement',         icon:'💤', desc:'Slow approvals or participation' },
    unresolved_blockers:      { label:'Unresolved Blockers',    icon:'🚧', desc:'Long-standing blocking issues' },
    emerging_risk:            { label:'Emerging Risk',          icon:'⚠️',  desc:'Any other delivery-impacting factor' },
  };

  const STATUSES = {
    detected:            { label:'Risk Detected',       dot:'🔍', next:'ews_raised' },
    ews_raised:          { label:'EWS Raised',          dot:'🚨', next:'plan_defined' },
    plan_defined:        { label:'Plan Defined',        dot:'📋', next:'leadership_engaged' },
    leadership_engaged:  { label:'Leadership Engaged',  dot:'🤝', next:'in_review' },
    in_review:           { label:'In Review',           dot:'🔄', next:'resolved' },
    resolved:            { label:'Resolved',            dot:'✅', next:'closed' },
    closed:              { label:'Closed',              dot:'🔒', next:null },
  };
  const STATUS_KEYS = Object.keys(STATUSES);

  // ── Helpers ───────────────────────────────────────────────────────────────
  function el(id) { return document.getElementById(id); }

  function escHtml(s) {
    return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  function fmtDate(iso) {
    if (!iso) return '—';
    try {
      const d = new Date(iso);
      return d.toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' });
    } catch { return iso; }
  }

  function relTime(iso) {
    if (!iso) return '';
    try {
      const diff = Date.now() - new Date(iso).getTime();
      const m = Math.floor(diff / 60000);
      if (m < 2)  return 'just now';
      if (m < 60) return `${m}m ago`;
      const h = Math.floor(m / 60);
      if (h < 24) return `${h}h ago`;
      const d = Math.floor(h / 24);
      if (d < 30) return `${d}d ago`;
      return fmtDate(iso);
    } catch { return ''; }
  }

  function riskScore(severity, likelihood) {
    const sv = { critical:4, high:3, medium:2, low:1 };
    const lk = { certain:4, likely:3, possible:2, unlikely:1 };
    return (sv[severity] || 2) * (lk[likelihood] || 2);
  }

  function riskColor(score) {
    if (score >= 12) return '#dc2626';
    if (score >= 8)  return '#f97316';
    if (score >= 4)  return '#f59e0b';
    return '#22c55e';
  }

  function currentUser() {
    try { return JSON.parse(localStorage.getItem('kb_user') || '{}'); } catch { return {}; }
  }

  async function api(method, path, body) {
    try {
      const u = currentUser();
      const opts = {
        method,
        headers: { 'Content-Type': 'application/json', 'x-user-email': u.email || '' }
      };
      if (body !== undefined) opts.body = JSON.stringify(body);
      const r = await fetch(path, opts);
      if (!r.ok) return { ok: false, error: r.statusText };
      const ct = r.headers.get('content-type') || '';
      if (!ct.includes('json')) return { ok: false, error: 'non-JSON response' };
      return r.json();
    } catch(e) { return { ok: false, error: e.message }; }
  }

  function toast(msg, dur = 3000) {
    const t = el('ewsToast');
    if (!t) return;
    t.textContent = msg;
    t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), dur);
  }

  function _destroyChart(id) {
    if (_ec[id]) { try { _ec[id].destroy(); } catch {} delete _ec[id]; }
  }

  function severityBadge(s) {
    const map = { critical:'Critical', high:'High', medium:'Medium', low:'Low' };
    return `<span class="ews-severity-badge ${escHtml(s)}">${escHtml(map[s] || s)}</span>`;
  }

  function statusPill(s) {
    const info = STATUSES[s] || { label: s };
    return `<span class="ews-status-pill ${escHtml(s)}">${escHtml(info.label)}</span>`;
  }

  function riskBubble(score) {
    const col = riskColor(score);
    return `<span class="ews-risk-score" style="background:${col};font-size:11px">${score}</span>`;
  }

  function triggerLabel(t) {
    return TRIGGER_TYPES[t]?.label || t || '—';
  }

  function triggerIcon(t) {
    return TRIGGER_TYPES[t]?.icon || '⚠️';
  }

  // ── Filtered data helpers ─────────────────────────────────────────────────
  function _dashFiltered() {
    let list = S.ewsList;
    if (_edf.client) {
      const projs = new Set(S.projects.filter(p => p.clientId === _edf.client).map(p => p.id));
      list = list.filter(e => projs.has(e.projectId));
    }
    if (_edf.project)  list = list.filter(e => e.projectId === _edf.project);
    if (_edf.severity) list = list.filter(e => e.severity === _edf.severity);
    if (_edf.status)   list = list.filter(e => e.status === _edf.status);
    return list;
  }

  function _listFiltered() {
    let list = S.ewsList;
    if (_elf.client) {
      const projs = new Set(S.projects.filter(p => p.clientId === _elf.client).map(p => p.id));
      list = list.filter(e => projs.has(e.projectId));
    }
    if (_elf.project)     list = list.filter(e => e.projectId === _elf.project);
    if (_elf.severity)    list = list.filter(e => e.severity === _elf.severity);
    if (_elf.status)      list = list.filter(e => e.status === _elf.status);
    if (_elf.triggerType) list = list.filter(e => e.triggerType === _elf.triggerType);
    return list;
  }

  // ── Open / Close / View ───────────────────────────────────────────────────
  function open() {
    const o = el('ewsOverlay');
    if (!o) return;
    o.style.display = 'flex';
    document.body.style.overflow = 'hidden';
    if (!S.inited) { S.inited = true; init(); }
  }

  function close() {
    const o = el('ewsOverlay');
    if (o) o.style.display = 'none';
    document.body.style.overflow = '';
    closeDrawer();
    hideNewModal();
    if (typeof dwGoKnowledge === 'function') dwGoKnowledge();
  }

  function setView(v) {
    S.view = v;
    document.querySelectorAll('#ewsOverlay .ews-view').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('#ewsOverlay .ews-nav-tab').forEach(t => {
      t.classList.toggle('active', t.dataset.view === v);
    });
    const vEl = el(`ewsView_${v}`);
    if (vEl) vEl.classList.add('active');
    if (v === 'dashboard') renderDashboard();
    if (v === 'list')      renderList();
  }

  // ── Init ──────────────────────────────────────────────────────────────────
  async function init() {
    if (S.loading) return;
    S.loading = true;
    try {
      // Fetch EWS, projects, clients in parallel
      const [ewsR, projR, clientR] = await Promise.all([
        api('GET', '/api/ews'),
        api('GET', '/api/uat/projects'),
        api('GET', '/api/uat/clients'),
      ]);
      if (ewsR.ok && Array.isArray(ewsR.data))     S.ewsList  = ewsR.data;
      if (projR.ok && Array.isArray(projR.data))   S.projects = projR.data;
      if (clientR.ok && Array.isArray(clientR.data)) S.clients = clientR.data;
    } catch(e) { /* silent */ }
    S.loading = false;
    _buildFilterOptions();
    renderDashboard();
    renderList();
    _updateNavBadge();
  }

  async function loadList() {
    const r = await api('GET', '/api/ews');
    if (r.ok && Array.isArray(r.data)) S.ewsList = r.data;
    _updateNavBadge();
    renderDashboard();
    renderList();
  }

  function _updateNavBadge() {
    const active = S.ewsList.filter(e => !['resolved','closed'].includes(e.status)).length;
    const b = el('ewsNavBadge');
    if (b) b.textContent = active;
  }

  // ── Filter options builder ────────────────────────────────────────────────
  function _buildFilterOptions() {
    // Dashboard client/project selects
    _populateClientSelect('edfClient', _edf.client);
    _populateClientSelect('elfClient', _elf.client);
    _populateClientSelect('ewsFClient', '');
    _populateDashProjectSelect();
    _populateListProjectSelect();
    _populateFormProjectSelect('');

    // List trigger type
    const tSel = el('elfTrigger');
    if (tSel) {
      tSel.innerHTML = '<option value="">All Triggers</option>' +
        Object.entries(TRIGGER_TYPES).map(([k,v]) =>
          `<option value="${k}">${v.icon} ${escHtml(v.label)}</option>`
        ).join('');
      tSel.value = _elf.triggerType || '';
    }
  }

  function _populateClientSelect(selId, currentVal) {
    const sel = el(selId);
    if (!sel) return;
    sel.innerHTML = '<option value="">All Clients</option>' +
      S.clients.map(c => `<option value="${escHtml(c.id)}">${escHtml(c.name)}</option>`).join('');
    sel.value = currentVal || '';
  }

  function _populateDashProjectSelect() {
    const sel = el('edfProject');
    if (!sel) return;
    let projs = S.projects;
    if (_edf.client) projs = projs.filter(p => p.clientId === _edf.client);
    sel.innerHTML = '<option value="">All Projects</option>' +
      projs.map(p => `<option value="${escHtml(p.id)}">${escHtml(p.name)}</option>`).join('');
    sel.value = _edf.project || '';
  }

  function _populateListProjectSelect() {
    const sel = el('elfProject');
    if (!sel) return;
    let projs = S.projects;
    if (_elf.client) projs = projs.filter(p => p.clientId === _elf.client);
    sel.innerHTML = '<option value="">All Projects</option>' +
      projs.map(p => `<option value="${escHtml(p.id)}">${escHtml(p.name)}</option>`).join('');
    sel.value = _elf.project || '';
  }

  function _populateFormProjectSelect(clientId) {
    const sel = el('ewsFProject');
    if (!sel) return;
    let projs = S.projects;
    if (clientId) projs = projs.filter(p => p.clientId === clientId);
    sel.innerHTML = '<option value="">Select project...</option>' +
      projs.map(p => `<option value="${escHtml(p.id)}">${escHtml(p.name)}</option>`).join('');
  }

  // ── Dashboard filter handlers ─────────────────────────────────────────────
  function onDashClientChange() {
    _edf.client  = (el('edfClient')?.value || '');
    _edf.project = '';
    _populateDashProjectSelect();
    applyDashFilters();
  }

  function onDashProjectChange() {
    _edf.project = (el('edfProject')?.value || '');
    applyDashFilters();
  }

  function applyDashFilters() {
    _edf.client   = el('edfClient')?.value   || '';
    _edf.project  = el('edfProject')?.value  || '';
    _edf.severity = el('edfSeverity')?.value || '';
    _edf.status   = el('edfStatus')?.value   || '';
    renderDashboard();
  }

  function resetDashFilters() {
    _edf = { client:'', project:'', severity:'', status:'' };
    const ids = ['edfClient','edfProject','edfSeverity','edfStatus'];
    ids.forEach(id => { const s = el(id); if (s) s.value = ''; });
    _populateDashProjectSelect();
    renderDashboard();
  }

  // ── List filter handlers ──────────────────────────────────────────────────
  function onListClientChange() {
    _elf.client  = el('elfClient')?.value || '';
    _elf.project = '';
    _populateListProjectSelect();
    applyListFilters();
  }

  function applyListFilters() {
    _elf.client      = el('elfClient')?.value      || '';
    _elf.project     = el('elfProject')?.value     || '';
    _elf.severity    = el('elfSeverity')?.value    || '';
    _elf.status      = el('elfStatus')?.value      || '';
    _elf.triggerType = el('elfTrigger')?.value     || '';
    renderList();
  }

  function resetListFilters() {
    _elf = { client:'', project:'', severity:'', status:'', triggerType:'' };
    const ids = ['elfClient','elfProject','elfSeverity','elfStatus','elfTrigger'];
    ids.forEach(id => { const s = el(id); if (s) s.value = ''; });
    _populateListProjectSelect();
    renderList();
  }

  // ── Form client change ────────────────────────────────────────────────────
  function onFormClientChange() {
    const clientId = el('ewsFClient')?.value || '';
    _populateFormProjectSelect(clientId);
  }

  // ── Dashboard render ──────────────────────────────────────────────────────
  function renderDashboard() {
    const list = _dashFiltered();
    _renderKPIs(list);
    _renderAtRisk(list);

    if (typeof requireChartJs === 'function') {
      requireChartJs(() => {
        _renderChartTrigger(list);
        _renderChartStatus(list);
        _renderChartSeverity(list);
        _renderChartTrend();
        _renderHeatmap(list);
      });
    } else {
      _renderHeatmap(list);
    }
  }

  function _renderKPIs(list) {
    const active   = list.filter(e => !['resolved','closed'].includes(e.status));
    const critical = active.filter(e => e.severity === 'critical' || e.severity === 'high');
    const resolved = list.filter(e => ['resolved','closed'].includes(e.status));
    const projs    = new Set(active.map(e => e.projectId).filter(Boolean));

    const times = resolved.filter(e => e.resolvedAt && e.raisedAt).map(e =>
      (new Date(e.resolvedAt) - new Date(e.raisedAt)) / 86400000
    );
    const avgDays = times.length
      ? (times.reduce((a,b) => a+b, 0) / times.length).toFixed(1)
      : '—';

    _setKpi('ewsKpi_active', active.length, `${list.length} total`);
    _setKpi('ewsKpi_critical', critical.length, `${critical.filter(e=>e.severity==='critical').length} critical`);
    _setKpi('ewsKpi_resolved', resolved.length, 'all time');
    _setKpi('ewsKpi_avgDays', avgDays, times.length ? `from ${times.length} resolved` : 'no data yet');
    _setKpi('ewsKpi_atRisk', projs.size, 'with active EWS');
  }

  function _setKpi(valId, val, sub) {
    const v = el(valId);
    const s = el(valId + 'Sub');
    if (v) v.textContent = val;
    if (s) s.textContent = sub;
  }

  function _renderAtRisk(list) {
    const tbody = el('ewsAtRiskBody');
    if (!tbody) return;
    const active = list.filter(e => !['resolved','closed'].includes(e.status));
    if (!active.length) {
      tbody.innerHTML = `<tr><td colspan="6" class="ews-table-empty">🟢 No projects currently at risk</td></tr>`;
      return;
    }

    // Group by project
    const byProj = {};
    active.forEach(e => {
      const pid = e.projectId || '__no_proj__';
      if (!byProj[pid]) byProj[pid] = { name: e.projectName || 'Unknown', clientName: e.clientName || '—', items: [] };
      byProj[pid].items.push(e);
    });

    tbody.innerHTML = Object.values(byProj).sort((a,b) => b.items.length - a.items.length).map(row => {
      const critCount = row.items.filter(e => e.severity === 'critical').length;
      const lastRaised = row.items.reduce((latest, e) => {
        return !latest || e.raisedAt > latest ? e.raisedAt : latest;
      }, null);
      const maxScore = Math.max(...row.items.map(e => e.riskScore || 0));
      const healthPct = Math.max(0, 100 - Math.min(100, maxScore * 7));
      const healthCol = healthPct >= 70 ? '#22c55e' : healthPct >= 40 ? '#f59e0b' : '#dc2626';
      return `<tr>
        <td><strong>${escHtml(row.name)}</strong></td>
        <td style="color:#6b7280">${escHtml(row.clientName)}</td>
        <td>${riskBubble(row.items.length)}</td>
        <td>${critCount > 0 ? `<span style="color:#dc2626;font-weight:700">${critCount}</span>` : '<span style="color:#9ca3af">0</span>'}</td>
        <td style="color:#6b7280;font-size:12px">${fmtDate(lastRaised)}</td>
        <td>
          <div style="display:flex;align-items:center;gap:6px">
            <div class="ews-health-bar" style="width:60px"><div class="ews-health-fill" style="width:${healthPct}%;background:${healthCol}"></div></div>
            <span style="font-size:11px;color:#9ca3af">${healthPct}%</span>
          </div>
        </td>
      </tr>`;
    }).join('');
  }

  function _renderChartTrigger(list) {
    _destroyChart('trigger');
    const c = el('ewsChartTrigger');
    if (!c || !window.Chart) return;
    const counts = {};
    list.forEach(e => { counts[e.triggerType] = (counts[e.triggerType] || 0) + 1; });
    const entries = Object.entries(counts).sort((a,b) => b[1]-a[1]).slice(0, 8);
    if (!entries.length) { c.style.display='none'; return; }
    c.style.display = '';
    _ec['trigger'] = new Chart(c.getContext('2d'), {
      type: 'bar',
      data: {
        labels: entries.map(([k]) => TRIGGER_TYPES[k]?.label || k),
        datasets: [{ data: entries.map(([,v]) => v),
          backgroundColor: ['#3548FF','#f97316','#f59e0b','#22c55e','#8b5cf6','#14b8a6','#ec4899','#dc2626'],
          borderRadius: 6, borderSkipped: false }]
      },
      options: {
        indexAxis: 'y',
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => ` ${ctx.parsed.x}` } } },
        scales: { x: { grid: { color: '#f3f4f8' }, ticks: { color: '#9ca3af', font: { size: 11 } }, beginAtZero: true },
                  y: { grid: { display: false }, ticks: { color: '#374151', font: { size: 11 } } } }
      }
    });
  }

  function _renderChartStatus(list) {
    _destroyChart('status');
    const c = el('ewsChartStatus');
    if (!c || !window.Chart) return;
    const SCOL = { detected:'#6b7280', ews_raised:'#3b82f6', plan_defined:'#8b5cf6',
                   leadership_engaged:'#f59e0b', in_review:'#14b8a6', resolved:'#22c55e', closed:'#9ca3af' };
    const counts = {};
    list.forEach(e => { counts[e.status] = (counts[e.status] || 0) + 1; });
    const entries = STATUS_KEYS.filter(k => counts[k]);
    if (!entries.length) { c.style.display='none'; return; }
    c.style.display = '';
    _ec['status'] = new Chart(c.getContext('2d'), {
      type: 'doughnut',
      data: {
        labels: entries.map(k => STATUSES[k]?.label || k),
        datasets: [{ data: entries.map(k => counts[k]),
          backgroundColor: entries.map(k => SCOL[k] || '#9ca3af'),
          borderWidth: 2, borderColor: '#fff', hoverBorderWidth: 3 }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        cutout: '65%',
        plugins: {
          legend: { position: 'bottom', labels: { boxWidth: 10, padding: 10, font: { size: 11 }, color: '#374151' } },
          tooltip: { callbacks: { label: ctx => ` ${ctx.label}: ${ctx.parsed}` } }
        }
      }
    });
  }

  function _renderChartSeverity(list) {
    _destroyChart('severity');
    const c = el('ewsChartSeverity');
    if (!c || !window.Chart) return;
    const active = list.filter(e => !['resolved','closed'].includes(e.status));
    const SCOL2 = { critical:'#dc2626', high:'#f97316', medium:'#f59e0b', low:'#22c55e' };
    const keys = ['critical','high','medium','low'];
    const counts = {}; active.forEach(e => { counts[e.severity] = (counts[e.severity]||0)+1; });
    const entries = keys.filter(k => counts[k]);
    if (!entries.length) { c.style.display='none'; return; }
    c.style.display = '';
    _ec['severity'] = new Chart(c.getContext('2d'), {
      type: 'doughnut',
      data: {
        labels: entries.map(k => k.charAt(0).toUpperCase()+k.slice(1)),
        datasets: [{ data: entries.map(k => counts[k]),
          backgroundColor: entries.map(k => SCOL2[k]),
          borderWidth: 2, borderColor: '#fff' }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        cutout: '65%',
        plugins: {
          legend: { position: 'bottom', labels: { boxWidth: 10, padding: 10, font: { size: 11 }, color: '#374151' } },
        }
      }
    });
  }

  function _renderChartTrend() {
    _destroyChart('trend');
    const c = el('ewsChartTrend');
    if (!c || !window.Chart) return;

    // Build 8-week buckets
    const weeks = [];
    const now = new Date();
    for (let i = 7; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i * 7);
      weeks.push({ label: d.toLocaleDateString('en-GB', { day:'2-digit', month:'short' }), raised: 0, resolved: 0, ts: d.getTime() });
    }
    const bucketOf = (iso) => {
      if (!iso) return -1;
      const t = new Date(iso).getTime();
      for (let i = weeks.length - 1; i >= 0; i--) {
        if (t >= weeks[i].ts - 7*86400000) return i;
      }
      return -1;
    };
    S.ewsList.forEach(e => {
      const ri = bucketOf(e.raisedAt);
      if (ri >= 0) weeks[ri].raised++;
      if (e.resolvedAt) { const si = bucketOf(e.resolvedAt); if (si >= 0) weeks[si].resolved++; }
    });

    _ec['trend'] = new Chart(c.getContext('2d'), {
      type: 'line',
      data: {
        labels: weeks.map(w => w.label),
        datasets: [
          { label:'Raised',   data: weeks.map(w=>w.raised),   borderColor:'#dc2626', backgroundColor:'rgba(220,38,38,.08)', tension:.4, fill:true, pointBackgroundColor:'#dc2626', pointRadius:4 },
          { label:'Resolved', data: weeks.map(w=>w.resolved), borderColor:'#22c55e', backgroundColor:'rgba(34,197,94,.08)', tension:.4, fill:true, pointBackgroundColor:'#22c55e', pointRadius:4 },
        ]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { position:'bottom', labels: { boxWidth:10, padding:10, font:{size:11}, color:'#374151' } } },
        scales: {
          x: { grid:{color:'#f3f4f8'}, ticks:{color:'#9ca3af', font:{size:11}} },
          y: { grid:{color:'#f3f4f8'}, ticks:{color:'#9ca3af', font:{size:11}}, beginAtZero:true }
        }
      }
    });
  }

  function _renderHeatmap(list) {
    const wrap = el('ewsHeatmap');
    if (!wrap) return;

    // Severity (rows) × Likelihood (cols)
    const sevs = ['critical','high','medium','low'];
    const liks  = ['unlikely','possible','likely','certain'];
    const counts = {};
    list.filter(e => !['resolved','closed'].includes(e.status)).forEach(e => {
      const k = `${e.severity}:${e.likelihood}`;
      counts[k] = (counts[k] || 0) + 1;
    });

    let html = `<div style="display:grid;grid-template-columns:60px repeat(4,1fr);gap:3px;align-items:center">`;
    // Header row: likelihood labels
    html += `<div style="font-size:9px;color:#9ca3af;text-align:center;font-weight:700">↑ SEVERITY</div>`;
    liks.forEach(l => {
      html += `<div style="font-size:9px;color:#9ca3af;text-align:center;font-weight:600;text-transform:uppercase;letter-spacing:.3px">${l.slice(0,3).toUpperCase()}</div>`;
    });
    // Rows: severity
    sevs.forEach(sev => {
      const svScore = { critical:4, high:3, medium:2, low:1 }[sev] || 1;
      html += `<div style="font-size:9px;color:#9ca3af;font-weight:600;text-transform:uppercase;letter-spacing:.3px;text-align:right;padding-right:6px">${sev.toUpperCase()}</div>`;
      liks.forEach(lik => {
        const lkScore = { certain:4, likely:3, possible:2, unlikely:1 }[lik] || 1;
        const score = svScore * lkScore;
        const cnt = counts[`${sev}:${lik}`] || 0;
        const col = score >= 12 ? '#dc2626' : score >= 8 ? '#f97316' : score >= 4 ? '#f59e0b' : '#dcfce7';
        const textCol = score >= 4 ? '#fff' : '#9ca3af';
        html += `<div class="ews-heatmap-cell" style="background:${col};color:${textCol}" title="${sev} × ${lik}: ${cnt} active">${cnt || ''}</div>`;
      });
    });
    html += `</div>`;
    html += `<div style="font-size:9px;color:#9ca3af;text-align:center;margin-top:4px;font-weight:600">LIKELIHOOD →</div>`;
    wrap.innerHTML = html;
  }

  // ── List render ───────────────────────────────────────────────────────────
  function renderList() {
    const tbody = el('ewsListBody');
    if (!tbody) return;
    const list = _listFiltered();
    if (!list.length) {
      tbody.innerHTML = `<tr><td colspan="10"><div class="ews-table-empty">
        <div style="font-size:32px;margin-bottom:8px">📋</div>
        <div style="font-weight:700;color:#374151;margin-bottom:4px">No EWS items found</div>
        <div>Try adjusting filters or raise the first early warning</div>
      </div></td></tr>`;
      return;
    }
    tbody.innerHTML = list.map(e => {
      const proj = S.projects.find(p => p.id === e.projectId);
      const projName = e.projectName || proj?.name || '—';
      const clientName = e.clientName || '—';
      const score = e.riskScore || riskScore(e.severity, e.likelihood);
      return `<tr>
        <td><span class="ews-ref-chip">${escHtml(e.ref||'—')}</span></td>
        <td>
          <div style="font-weight:600;color:#090909;font-size:13px;cursor:pointer" onclick="EWS.openDrawer('${escHtml(e.id)}')">${escHtml(e.title)}</div>
          <div style="font-size:11px;color:#9ca3af;margin-top:2px">${escHtml(projName)} · ${escHtml(clientName)}</div>
        </td>
        <td><span style="font-size:12px">${triggerIcon(e.triggerType)}</span> <span style="font-size:12px;color:#374151">${escHtml(triggerLabel(e.triggerType))}</span></td>
        <td>${severityBadge(e.severity)}</td>
        <td>${statusPill(e.status)}</td>
        <td>${riskBubble(score)}</td>
        <td style="font-size:12px;color:#374151">${escHtml(e.internalOwner||'—')}</td>
        <td style="font-size:12px;color:#6b7280">${fmtDate(e.raisedAt)}</td>
        <td style="font-size:12px;color:${e.targetResolutionDate && new Date(e.targetResolutionDate)<new Date() && !['resolved','closed'].includes(e.status)?'#dc2626':'#6b7280'}">${fmtDate(e.targetResolutionDate)}</td>
        <td>
          <button class="ews-btn-secondary ews-btn-sm" onclick="EWS.openDrawer('${escHtml(e.id)}')" style="padding:4px 10px;font-size:11px">View →</button>
        </td>
      </tr>`;
    }).join('');
  }

  // ── Drawer ────────────────────────────────────────────────────────────────
  function openDrawer(id) {
    const ews = S.ewsList.find(e => e.id === id);
    if (!ews) return;
    S.currentEwsId = id;
    _renderDrawer(ews);
    el('ewsDrawerOverlay').classList.add('open');
    el('ewsDrawer').classList.add('open');
  }

  function closeDrawer() {
    S.currentEwsId = null;
    el('ewsDrawerOverlay')?.classList.remove('open');
    el('ewsDrawer')?.classList.remove('open');
    _addUpdateOpen = false;
  }

  function _renderDrawer(ews) {
    const score = ews.riskScore || riskScore(ews.severity, ews.likelihood);

    // Header
    el('ewsDrRef').innerHTML    = `<span class="ews-ref-chip">${escHtml(ews.ref||'EWS')}</span>`;
    el('ewsDrSeverity').innerHTML = severityBadge(ews.severity);
    el('ewsDrStatus').innerHTML   = statusPill(ews.status);
    el('ewsDrTitle').textContent  = ews.title || '—';
    el('ewsDrProject').textContent = `${ews.projectName||'—'} · ${ews.clientName||'—'}`;
    const scoreEl = el('ewsDrRiskScore');
    if (scoreEl) { scoreEl.textContent = score; scoreEl.style.background = riskColor(score); }

    // Progress steps
    const progEl = el('ewsDrProgress');
    if (progEl) {
      const curIdx = STATUS_KEYS.indexOf(ews.status);
      progEl.innerHTML = STATUS_KEYS.map((k, i) => {
        const cls = i < curIdx ? 'done' : i === curIdx ? 'active' : '';
        const dot = i < curIdx ? '✓' : (i === curIdx ? '●' : '');
        return `<div class="ews-progress-step ${cls}">
          <div class="ews-progress-dot">${dot}</div>
          <div class="ews-progress-label">${escHtml(STATUSES[k].label)}</div>
        </div>`;
      }).join('');
    }

    // Advance button
    const advBtn = el('ewsDrAdvanceBtn');
    if (advBtn) {
      const next = STATUSES[ews.status]?.next;
      if (next) {
        advBtn.textContent = `→ ${STATUSES[next].label}`;
        advBtn.style.display = '';
      } else {
        advBtn.style.display = 'none';
      }
    }

    // Body
    _renderDrawerBody(ews);
  }

  function _renderDrawerBody(ews) {
    const body = el('ewsDrawerBody');
    if (!body) return;

    const actionItemsHtml = (ews.actionItems || []).length
      ? ews.actionItems.map(a => {
          const done = a.status === 'completed';
          return `<div class="ews-action-item">
            <div class="ews-action-check ${done?'checked':''}" onclick="EWS.toggleActionItem('${escHtml(ews.id)}','${escHtml(a.id)}')">${done?'✓':''}</div>
            <div style="flex:1">
              <div class="ews-action-text ${done?'done':''}">${escHtml(a.title)}</div>
              <div class="ews-action-meta">${escHtml(a.assignee||'Unassigned')}${a.dueDate?' · Due '+fmtDate(a.dueDate):''}</div>
            </div>
          </div>`;
        }).join('')
      : `<div style="color:#9ca3af;font-size:12px;padding:8px 0">No action items yet</div>`;

    const updatesHtml = (ews.updates || []).length
      ? `<ul class="ews-timeline">${ews.updates.map(u => {
          const cls = u.type === 'status_change' ? 'status' : u.type === 'created' ? 'created' : u.type === 'action' ? 'action' : '';
          const dot = u.type === 'status_change' ? '↑' : u.type === 'created' ? '★' : u.type === 'action' ? '✓' : '●';
          return `<li class="ews-timeline-item">
            <div class="ews-timeline-dot ${cls}">${dot}</div>
            <div>
              <div class="ews-timeline-text">${escHtml(u.text)}</div>
              <div class="ews-timeline-meta">${escHtml(u.author||'System')} · ${relTime(u.at)}</div>
            </div>
          </li>`;
        }).join('')}</ul>`
      : `<div style="color:#9ca3af;font-size:12px">No activity yet</div>`;

    body.innerHTML = `
      <!-- Description -->
      <div class="ews-drawer-section">
        <div class="ews-drawer-section-title">Risk Description</div>
        <div style="font-size:13px;color:#090909;line-height:1.6">${escHtml(ews.description || '—')}</div>
        ${ews.rootCause ? `<div style="margin-top:10px"><span style="font-size:11px;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:.4px">Root Cause</span><div style="font-size:13px;color:#374151;margin-top:4px;line-height:1.5">${escHtml(ews.rootCause)}</div></div>` : ''}
        ${ews.currentImpact ? `<div style="margin-top:10px"><span style="font-size:11px;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:.4px">Current Impact</span><div style="font-size:13px;color:#374151;margin-top:4px;line-height:1.5">${escHtml(ews.currentImpact)}</div></div>` : ''}
      </div>

      <!-- Corrective Plan & Action Items -->
      <div class="ews-drawer-section">
        <div class="ews-drawer-section-title">Corrective Plan</div>
        ${ews.correctivePlan
          ? `<div style="font-size:13px;color:#090909;line-height:1.6;margin-bottom:14px">${escHtml(ews.correctivePlan)}</div>`
          : `<div style="color:#9ca3af;font-size:13px;margin-bottom:14px">No corrective plan defined</div>`}
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
          <span style="font-size:12px;font-weight:700;color:#374151">Action Items (${(ews.actionItems||[]).length})</span>
          <button class="ews-btn-secondary ews-btn-sm" onclick="EWS.showAddAction()" style="font-size:11px;padding:4px 10px">+ Add</button>
        </div>
        ${actionItemsHtml}
        <div id="ewsAddActionForm" class="ews-add-update-form">
          <input class="ews-input" id="ewsNewActionTitle" placeholder="Action item description..." style="margin-bottom:8px">
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px">
            <input class="ews-input" id="ewsNewActionAssignee" placeholder="Assignee name">
            <input class="ews-input" type="date" id="ewsNewActionDue">
          </div>
          <div style="display:flex;gap:8px;justify-content:flex-end">
            <button class="ews-btn-secondary ews-btn-sm" onclick="EWS.hideAddAction()">Cancel</button>
            <button class="ews-btn-primary ews-btn-sm" onclick="EWS.submitAddAction()">Add Item</button>
          </div>
        </div>
      </div>

      <!-- People & Review -->
      <div class="ews-drawer-section">
        <div class="ews-drawer-section-title">Ownership & Review</div>
        <div class="ews-info-grid">
          <div class="ews-info-item"><label>Internal Owner</label><div class="ews-info-val">${escHtml(ews.internalOwner||'—')}</div></div>
          <div class="ews-info-item"><label>Client Contact</label><div class="ews-info-val">${escHtml(ews.clientContact||'—')}</div></div>
          <div class="ews-info-item"><label>Raised By</label><div class="ews-info-val">${escHtml(ews.raisedBy||'—')}</div></div>
          <div class="ews-info-item"><label>Review Frequency</label><div class="ews-info-val" style="text-transform:capitalize">${escHtml(ews.reviewFrequency||'—')}</div></div>
          <div class="ews-info-item"><label>Target Resolution</label><div class="ews-info-val">${fmtDate(ews.targetResolutionDate)}</div></div>
          <div class="ews-info-item"><label>Raised Date</label><div class="ews-info-val">${fmtDate(ews.raisedAt)}</div></div>
          ${ews.resolvedAt ? `<div class="ews-info-item"><label>Resolved Date</label><div class="ews-info-val">${fmtDate(ews.resolvedAt)}</div></div>` : ''}
        </div>
      </div>

      <!-- Activity timeline -->
      <div class="ews-drawer-section">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">
          <div class="ews-drawer-section-title" style="margin-bottom:0">Activity</div>
          <button class="ews-btn-secondary ews-btn-sm" onclick="EWS.showAddUpdate()" style="font-size:11px;padding:4px 10px">+ Update</button>
        </div>
        <div id="ewsAddUpdateForm" class="ews-add-update-form">
          <textarea class="ews-textarea" id="ewsNewUpdateText" placeholder="What's the latest update on this risk?" style="min-height:72px;margin-bottom:8px"></textarea>
          <div style="display:flex;gap:8px;justify-content:flex-end">
            <button class="ews-btn-secondary ews-btn-sm" onclick="EWS.hideAddUpdate()">Cancel</button>
            <button class="ews-btn-primary ews-btn-sm" onclick="EWS.submitAddUpdate()">Post Update</button>
          </div>
        </div>
        ${updatesHtml}
      </div>`;
  }

  // ── Drawer actions ────────────────────────────────────────────────────────
  function showAddUpdate() {
    const f = el('ewsAddUpdateForm');
    if (f) { f.classList.toggle('open'); if (f.classList.contains('open')) el('ewsNewUpdateText')?.focus(); }
  }

  function hideAddUpdate() {
    const f = el('ewsAddUpdateForm');
    if (f) { f.classList.remove('open'); const t = el('ewsNewUpdateText'); if (t) t.value = ''; }
  }

  async function submitAddUpdate() {
    if (!S.currentEwsId) return;
    const text = el('ewsNewUpdateText')?.value?.trim();
    if (!text) { toast('Please enter an update'); return; }
    const u = currentUser();
    const r = await api('POST', `/api/ews/${S.currentEwsId}/updates`, { text, author: u.name || u.email || 'Team', type:'update' });
    if (!r.ok) { toast('Failed to post update'); return; }
    hideAddUpdate();
    await loadList();
    const ews = S.ewsList.find(e => e.id === S.currentEwsId);
    if (ews) _renderDrawerBody(ews);
    toast('Update posted');
  }

  function showAddAction() {
    const f = el('ewsAddActionForm');
    if (f) { f.classList.toggle('open'); if (f.classList.contains('open')) el('ewsNewActionTitle')?.focus(); }
  }

  function hideAddAction() {
    const f = el('ewsAddActionForm');
    if (f) {
      f.classList.remove('open');
      ['ewsNewActionTitle','ewsNewActionAssignee','ewsNewActionDue'].forEach(id => {
        const inp = el(id); if (inp) inp.value = '';
      });
    }
  }

  async function submitAddAction() {
    if (!S.currentEwsId) return;
    const title    = el('ewsNewActionTitle')?.value?.trim();
    const assignee = el('ewsNewActionAssignee')?.value?.trim();
    const dueDate  = el('ewsNewActionDue')?.value;
    if (!title) { toast('Please enter an action title'); return; }
    const r = await api('POST', `/api/ews/${S.currentEwsId}/actions`, { title, assignee, dueDate });
    if (!r.ok) { toast('Failed to add action'); return; }
    hideAddAction();
    await loadList();
    const ews = S.ewsList.find(e => e.id === S.currentEwsId);
    if (ews) _renderDrawerBody(ews);
    toast('Action item added');
  }

  async function toggleActionItem(ewsId, actionId) {
    const ews    = S.ewsList.find(e => e.id === ewsId);
    if (!ews) return;
    const action = ews.actionItems?.find(a => a.id === actionId);
    if (!action) return;
    const newStatus = action.status === 'completed' ? 'in_progress' : 'completed';
    const r = await api('PUT', `/api/ews/${ewsId}/actions/${actionId}`, { status: newStatus });
    if (!r.ok) { toast('Failed to update action'); return; }
    await loadList();
    const refreshed = S.ewsList.find(e => e.id === ewsId);
    if (refreshed) _renderDrawerBody(refreshed);
  }

  async function advanceStatus() {
    if (!S.currentEwsId) return;
    const ews = S.ewsList.find(e => e.id === S.currentEwsId);
    if (!ews) return;
    const next = STATUSES[ews.status]?.next;
    if (!next) return;
    const u = currentUser();
    const r = await api('PUT', `/api/ews/${S.currentEwsId}`, {
      status: next,
      addUpdate: { text: `Status advanced to: ${STATUSES[next].label}`, author: u.name || 'System', type: 'status_change' }
    });
    if (!r.ok) { toast('Failed to update status'); return; }
    await loadList();
    const refreshed = S.ewsList.find(e => e.id === S.currentEwsId);
    if (refreshed) _renderDrawer(refreshed);
    toast(`Status updated: ${STATUSES[next].label}`);
  }

  // ── New EWS Modal ─────────────────────────────────────────────────────────
  function showNewModal() {
    _selTrigger = '';

    // Build trigger grid
    const grid = el('ewsTriggerGrid');
    if (grid) {
      grid.innerHTML = Object.entries(TRIGGER_TYPES).map(([k, v]) =>
        `<button class="ews-trigger-card" data-key="${k}" onclick="EWS._selectTrigger('${k}')">
          <div class="ews-trigger-icon">${v.icon}</div>
          <div class="ews-trigger-name">${escHtml(v.label)}</div>
          <div class="ews-trigger-desc">${escHtml(v.desc)}</div>
        </button>`
      ).join('');
    }

    // Populate client/project
    _populateClientSelect('ewsFClient', '');
    _populateFormProjectSelect('');

    el('ewsModalBg').style.display = 'flex';
    el('ewsFTitle')?.focus();
  }

  function hideNewModal() {
    const m = el('ewsModalBg');
    if (m) m.style.display = 'none';
    _selTrigger = '';
    // Reset form
    ['ewsFTitle','ewsFOwner','ewsFClientContact'].forEach(id => { const i=el(id); if(i) i.value=''; });
    ['ewsFDesc','ewsFRootCause','ewsFImpact','ewsFPlan'].forEach(id => { const i=el(id); if(i) i.value=''; });
    const sev = el('ewsFSeverity'); if (sev) sev.value = 'medium';
    const lik = el('ewsFLikelihood'); if (lik) lik.value = 'possible';
    const rf  = el('ewsFReviewFreq'); if (rf)  rf.value = 'biweekly';
  }

  function _selectTrigger(key) {
    _selTrigger = key;
    document.querySelectorAll('.ews-trigger-card').forEach(card => {
      card.classList.toggle('selected', card.dataset.key === key);
    });
  }

  async function submitNewEws() {
    const title = el('ewsFTitle')?.value?.trim();
    if (!title) { toast('Please enter a title'); el('ewsFTitle')?.focus(); return; }
    if (!_selTrigger) { toast('Please select a trigger type'); return; }

    const projectId = el('ewsFProject')?.value || '';
    const clientId  = el('ewsFClient')?.value  || '';
    const proj = S.projects.find(p => p.id === projectId);
    const client = S.clients.find(c => c.id === clientId);
    const u = currentUser();

    const payload = {
      title,
      triggerType:         _selTrigger,
      projectId,
      clientId,
      projectName:         proj?.name || '',
      clientName:          client?.name || '',
      severity:            el('ewsFSeverity')?.value    || 'medium',
      likelihood:          el('ewsFLikelihood')?.value  || 'possible',
      description:         el('ewsFDesc')?.value?.trim()         || '',
      rootCause:           el('ewsFRootCause')?.value?.trim()    || '',
      currentImpact:       el('ewsFImpact')?.value?.trim()       || '',
      correctivePlan:      el('ewsFPlan')?.value?.trim()         || '',
      internalOwner:       el('ewsFOwner')?.value?.trim()        || '',
      clientContact:       el('ewsFClientContact')?.value?.trim()|| '',
      targetResolutionDate:el('ewsFTargetDate')?.value           || '',
      reviewFrequency:     el('ewsFReviewFreq')?.value           || 'biweekly',
      raisedBy:            u.name || u.email || 'Team',
    };

    const btn = document.querySelector('.ews-modal [onclick="EWS.submitNewEws()"]');
    if (btn) { btn.textContent = 'Raising…'; btn.disabled = true; }

    const r = await api('POST', '/api/ews', payload);
    if (btn) { btn.textContent = 'Raise EWS'; btn.disabled = false; }
    if (!r.ok) { toast('Failed to raise EWS — please try again'); return; }

    hideNewModal();
    await loadList();
    toast(`✓ ${r.data?.ref || 'EWS'} raised successfully`);
    // Open the drawer for the new item
    if (r.data?.id) setTimeout(() => openDrawer(r.data.id), 300);
  }

  // ── Public API ────────────────────────────────────────────────────────────
  return {
    open,
    close,
    setView,
    openDrawer,
    closeDrawer,
    showNewModal,
    hideNewModal,
    submitNewEws,
    showAddUpdate,
    hideAddUpdate,
    submitAddUpdate,
    showAddAction,
    hideAddAction,
    submitAddAction,
    toggleActionItem,
    advanceStatus,
    applyDashFilters,
    resetDashFilters,
    onDashClientChange,
    onDashProjectChange,
    applyListFilters,
    resetListFilters,
    onListClientChange,
    onFormClientChange,
    _selectTrigger,
  };
})();
