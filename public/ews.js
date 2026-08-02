/* ═══════════════════════════════════════════════════════════════════════════
   EWS — Early Warning System  ·  ews.js  v2
   Standalone module — no UAT dependency. Stakeholders + calendar invites.
═══════════════════════════════════════════════════════════════════════════ */

const EWS = (() => {
  'use strict';

  // ── State ─────────────────────────────────────────────────────────────────
  const S = {
    view: 'dashboard',
    ewsList: [],
    currentEwsId: null,
    inited: false,
    loading: false,
  };

  let _edf = { client:'', project:'', severity:'', status:'' };
  let _elf = { client:'', project:'', severity:'', status:'', triggerType:'' };
  const _ec = {};
  let _selTrigger = '';
  let _formStakeholders = [];
  let _drawerMaximized = false;

  const _SVG_MAXIMIZE = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><polyline points="8,1.5 12.5,1.5 12.5,6"/><polyline points="6,12.5 1.5,12.5 1.5,8"/><line x1="12.5" y1="1.5" x2="7.5" y2="6.5"/><line x1="1.5" y1="12.5" x2="6.5" y2="7.5"/></svg>`;
  const _SVG_RESTORE  = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><polyline points="12.5,6 8,6 8,1.5"/><polyline points="1.5,8 6,8 6,12.5"/><line x1="8" y1="6" x2="12.5" y2="1.5"/><line x1="6" y1="8" x2="1.5" y2="12.5"/></svg>`;

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
    try { return new Date(iso).toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' }); }
    catch { return iso; }
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
      const opts = { method, headers: { 'Content-Type':'application/json', 'x-user-email': u.email||'' } };
      if (body !== undefined) opts.body = JSON.stringify(body);
      const r = await fetch(path, opts);
      if (!r.ok) return { ok:false, error:r.statusText };
      const ct = r.headers.get('content-type') || '';
      if (!ct.includes('json')) return { ok:false, error:'non-JSON response' };
      return r.json();
    } catch(e) { return { ok:false, error:e.message }; }
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
    return `<span class="ews-severity-badge ${escHtml(s)}">${escHtml(map[s]||s)}</span>`;
  }

  function statusPill(s) {
    const info = STATUSES[s] || { label: s };
    return `<span class="ews-status-pill ${escHtml(s)}">${escHtml(info.label)}</span>`;
  }

  function riskBubble(score) {
    return `<span class="ews-risk-score" style="background:${riskColor(score)};font-size:11px">${score}</span>`;
  }

  function triggerLabel(t) { return TRIGGER_TYPES[t]?.label || t || '—'; }
  function triggerIcon(t)  { return TRIGGER_TYPES[t]?.icon  || '⚠️'; }

  // ── Filtered data — uses free-text clientName / projectName ──────────────
  function _dashFiltered() {
    let list = S.ewsList;
    if (_edf.client)   list = list.filter(e => e.clientName  === _edf.client);
    if (_edf.project)  list = list.filter(e => e.projectName === _edf.project);
    if (_edf.severity) list = list.filter(e => e.severity    === _edf.severity);
    if (_edf.status)   list = list.filter(e => e.status      === _edf.status);
    return list;
  }

  function _listFiltered() {
    let list = S.ewsList;
    if (_elf.client)      list = list.filter(e => e.clientName  === _elf.client);
    if (_elf.project)     list = list.filter(e => e.projectName === _elf.project);
    if (_elf.severity)    list = list.filter(e => e.severity    === _elf.severity);
    if (_elf.status)      list = list.filter(e => e.status      === _elf.status);
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
    document.querySelectorAll('#ewsOverlay .ews-view').forEach(e => e.classList.remove('active'));
    document.querySelectorAll('#ewsOverlay .ews-nav-tab').forEach(t => {
      t.classList.toggle('active', t.dataset.view === v);
    });
    const vEl = el(`ewsView_${v}`);
    if (vEl) vEl.classList.add('active');
    if (v === 'dashboard') renderDashboard();
    if (v === 'list')      renderList();
  }

  // ── Init — fetches only EWS data (standalone) ─────────────────────────────
  async function init() {
    if (S.loading) return;
    S.loading = true;
    try {
      const r = await api('GET', '/api/ews');
      if (r.ok && Array.isArray(r.data)) S.ewsList = r.data;
    } catch { /* silent */ }
    S.loading = false;
    _buildFiltersFromData();
    renderDashboard();
    renderList();
    _updateNavBadge();
  }

  async function loadList() {
    const r = await api('GET', '/api/ews');
    if (r.ok && Array.isArray(r.data)) S.ewsList = r.data;
    _updateNavBadge();
    _buildFiltersFromData();
    renderDashboard();
    renderList();
  }

  function _updateNavBadge() {
    const active = S.ewsList.filter(e => !['resolved','closed'].includes(e.status)).length;
    const b = el('ewsNavBadge');
    if (b) b.textContent = active;
  }

  // ── Filter options — derived from EWS data itself (no UAT) ───────────────
  function _buildFiltersFromData() {
    const clients  = [...new Set(S.ewsList.map(e => e.clientName).filter(Boolean))].sort();
    const projects = [...new Set(S.ewsList.map(e => e.projectName).filter(Boolean))].sort();

    const clientOpts = '<option value="">All Clients</option>' +
      clients.map(c => `<option value="${escHtml(c)}">${escHtml(c)}</option>`).join('');
    const projOpts = '<option value="">All Projects</option>' +
      projects.map(p => `<option value="${escHtml(p)}">${escHtml(p)}</option>`).join('');

    ['edfClient','elfClient'].forEach(id => {
      const s = el(id);
      if (s) { const v = s.value; s.innerHTML = clientOpts; s.value = v; }
    });
    ['edfProject','elfProject'].forEach(id => {
      const s = el(id);
      if (s) { const v = s.value; s.innerHTML = projOpts; s.value = v; }
    });

    const tSel = el('elfTrigger');
    if (tSel) {
      const tv = tSel.value;
      tSel.innerHTML = '<option value="">All Triggers</option>' +
        Object.entries(TRIGGER_TYPES).map(([k,v]) =>
          `<option value="${k}">${v.icon} ${escHtml(v.label)}</option>`
        ).join('');
      tSel.value = tv;
    }
  }

  // ── Dashboard filter handlers ─────────────────────────────────────────────
  function onDashClientChange() {
    _edf.client  = el('edfClient')?.value || '';
    _edf.project = '';
    const projects = [...new Set(
      S.ewsList.filter(e => !_edf.client || e.clientName === _edf.client).map(e => e.projectName).filter(Boolean)
    )].sort();
    const projSel = el('edfProject');
    if (projSel) {
      projSel.innerHTML = '<option value="">All Projects</option>' +
        projects.map(p => `<option value="${escHtml(p)}">${escHtml(p)}</option>`).join('');
      projSel.value = '';
    }
    applyDashFilters();
  }

  function onDashProjectChange() {
    _edf.project = el('edfProject')?.value || '';
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
    ['edfClient','edfProject','edfSeverity','edfStatus'].forEach(id => { const s=el(id); if(s) s.value=''; });
    renderDashboard();
  }

  // ── List filter handlers ──────────────────────────────────────────────────
  function onListClientChange() {
    _elf.client  = el('elfClient')?.value || '';
    _elf.project = '';
    const projects = [...new Set(
      S.ewsList.filter(e => !_elf.client || e.clientName === _elf.client).map(e => e.projectName).filter(Boolean)
    )].sort();
    const projSel = el('elfProject');
    if (projSel) {
      projSel.innerHTML = '<option value="">All Projects</option>' +
        projects.map(p => `<option value="${escHtml(p)}">${escHtml(p)}</option>`).join('');
      projSel.value = '';
    }
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
    ['elfClient','elfProject','elfSeverity','elfStatus','elfTrigger'].forEach(id => { const s=el(id); if(s) s.value=''; });
    renderList();
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
    const projs    = new Set(active.map(e => e.projectName).filter(Boolean));
    const times    = resolved.filter(e => e.resolvedAt && e.raisedAt).map(e =>
      (new Date(e.resolvedAt) - new Date(e.raisedAt)) / 86400000
    );
    const avgDays  = times.length ? (times.reduce((a,b) => a+b, 0) / times.length).toFixed(1) : '—';
    _setKpi('ewsKpi_active',   active.length,   `${list.length} total`);
    _setKpi('ewsKpi_critical', critical.length, `${critical.filter(e=>e.severity==='critical').length} critical`);
    _setKpi('ewsKpi_resolved', resolved.length, 'all time');
    _setKpi('ewsKpi_avgDays',  avgDays, times.length ? `from ${times.length} resolved` : 'no data yet');
    _setKpi('ewsKpi_atRisk',   projs.size, 'with active EWS');
  }

  function _setKpi(valId, val, sub) {
    const v = el(valId), s = el(valId + 'Sub');
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
    const byProj = {};
    active.forEach(e => {
      const key = e.projectName || '__none__';
      if (!byProj[key]) byProj[key] = { name: e.projectName || 'Unknown Project', clientName: e.clientName || '—', items: [] };
      byProj[key].items.push(e);
    });
    tbody.innerHTML = Object.values(byProj).sort((a,b) => b.items.length - a.items.length).map(row => {
      const critCount = row.items.filter(e => e.severity === 'critical').length;
      const lastRaised = row.items.reduce((lat, e) => (!lat || e.raisedAt > lat ? e.raisedAt : lat), null);
      const maxScore   = Math.max(...row.items.map(e => e.riskScore || 0));
      const healthPct  = Math.max(0, 100 - Math.min(100, maxScore * 7));
      const healthCol  = healthPct >= 70 ? '#22c55e' : healthPct >= 40 ? '#f59e0b' : '#dc2626';
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
        indexAxis: 'y', responsive: true, maintainAspectRatio: false,
        plugins: { legend:{ display:false }, tooltip:{ callbacks:{ label: ctx => ` ${ctx.parsed.x}` } } },
        scales: {
          x: { grid:{ color:'#f3f4f8' }, ticks:{ color:'#9ca3af', font:{ size:11 } }, beginAtZero:true },
          y: { grid:{ display:false }, ticks:{ color:'#374151', font:{ size:11 } } }
        }
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
        responsive: true, maintainAspectRatio: false, cutout: '65%',
        plugins: {
          legend: { position:'bottom', labels:{ boxWidth:10, padding:10, font:{size:11}, color:'#374151' } },
          tooltip: { callbacks:{ label: ctx => ` ${ctx.label}: ${ctx.parsed}` } }
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
    const counts = {};
    active.forEach(e => { counts[e.severity] = (counts[e.severity]||0)+1; });
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
        responsive: true, maintainAspectRatio: false, cutout: '65%',
        plugins: { legend:{ position:'bottom', labels:{ boxWidth:10, padding:10, font:{size:11}, color:'#374151' } } }
      }
    });
  }

  function _renderChartTrend() {
    _destroyChart('trend');
    const c = el('ewsChartTrend');
    if (!c || !window.Chart) return;
    const weeks = [];
    const now = new Date();
    for (let i = 7; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i * 7);
      weeks.push({ label: d.toLocaleDateString('en-GB', { day:'2-digit', month:'short' }), raised:0, resolved:0, ts: d.getTime() });
    }
    const bucketOf = iso => {
      if (!iso) return -1;
      const t = new Date(iso).getTime();
      for (let i = weeks.length-1; i >= 0; i--) if (t >= weeks[i].ts - 7*86400000) return i;
      return -1;
    };
    S.ewsList.forEach(e => {
      const ri = bucketOf(e.raisedAt); if (ri >= 0) weeks[ri].raised++;
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
        plugins: { legend:{ position:'bottom', labels:{ boxWidth:10, padding:10, font:{size:11}, color:'#374151' } } },
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
    const sevs = ['critical','high','medium','low'];
    const liks  = ['unlikely','possible','likely','certain'];
    const counts = {};
    list.filter(e => !['resolved','closed'].includes(e.status)).forEach(e => {
      const k = `${e.severity}:${e.likelihood}`;
      counts[k] = (counts[k] || 0) + 1;
    });
    let html = `<div style="display:grid;grid-template-columns:60px repeat(4,1fr);gap:3px;align-items:center">`;
    html += `<div style="font-size:9px;color:#9ca3af;text-align:center;font-weight:700">↑ SEVERITY</div>`;
    liks.forEach(l => {
      html += `<div style="font-size:9px;color:#9ca3af;text-align:center;font-weight:600;text-transform:uppercase;letter-spacing:.3px">${l.slice(0,3).toUpperCase()}</div>`;
    });
    sevs.forEach(sev => {
      const svScore = { critical:4, high:3, medium:2, low:1 }[sev] || 1;
      html += `<div style="font-size:9px;color:#9ca3af;font-weight:600;text-transform:uppercase;letter-spacing:.3px;text-align:right;padding-right:6px">${sev.toUpperCase()}</div>`;
      liks.forEach(lik => {
        const lkScore = { certain:4, likely:3, possible:2, unlikely:1 }[lik] || 1;
        const score   = svScore * lkScore;
        const cnt     = counts[`${sev}:${lik}`] || 0;
        const col     = score >= 12 ? '#dc2626' : score >= 8 ? '#f97316' : score >= 4 ? '#f59e0b' : '#dcfce7';
        const textCol = score >= 4 ? '#fff' : '#9ca3af';
        html += `<div class="ews-heatmap-cell" style="background:${col};color:${textCol}" title="${sev} × ${lik}: ${cnt} active">${cnt || ''}</div>`;
      });
    });
    html += `</div><div style="font-size:9px;color:#9ca3af;text-align:center;margin-top:4px;font-weight:600">LIKELIHOOD →</div>`;
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
      const score = e.riskScore || riskScore(e.severity, e.likelihood);
      return `<tr>
        <td><span class="ews-ref-chip">${escHtml(e.ref||'—')}</span></td>
        <td>
          <div style="font-weight:600;color:#090909;font-size:13px;cursor:pointer" onclick="EWS.openDrawer('${escHtml(e.id)}')">${escHtml(e.title)}</div>
          <div style="font-size:11px;color:#9ca3af;margin-top:2px">${escHtml(e.projectName||'—')} · ${escHtml(e.clientName||'—')}</div>
        </td>
        <td><span style="font-size:12px">${triggerIcon(e.triggerType)}</span> <span style="font-size:12px;color:#374151">${escHtml(triggerLabel(e.triggerType))}</span></td>
        <td>${severityBadge(e.severity)}</td>
        <td>${statusPill(e.status)}</td>
        <td>${riskBubble(score)}</td>
        <td style="font-size:12px;color:#374151">${escHtml(e.internalOwner||'—')}</td>
        <td style="font-size:12px;color:#6b7280">${fmtDate(e.raisedAt)}</td>
        <td style="font-size:12px;color:${e.targetResolutionDate && new Date(e.targetResolutionDate)<new Date() && !['resolved','closed'].includes(e.status)?'#dc2626':'#6b7280'}">${fmtDate(e.targetResolutionDate)}</td>
        <td><button class="ews-btn-secondary ews-btn-sm" onclick="EWS.openDrawer('${escHtml(e.id)}')" style="padding:4px 10px;font-size:11px">View →</button></td>
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
    _drawerMaximized = false;
    el('ewsDrawerOverlay')?.classList.remove('open');
    el('ewsDrawer')?.classList.remove('open', 'maximized');
  }

  function toggleMaximize() {
    _drawerMaximized = !_drawerMaximized;
    el('ewsDrawer')?.classList.toggle('maximized', _drawerMaximized);
    const btn = el('ewsMaxBtn');
    if (btn) {
      btn.innerHTML = _drawerMaximized ? _SVG_RESTORE : _SVG_MAXIMIZE;
      btn.title = _drawerMaximized ? 'Restore' : 'Maximize';
    }
  }

  function _renderDrawer(ews) {
    const score = ews.riskScore || riskScore(ews.severity, ews.likelihood);
    el('ewsDrRef').innerHTML    = `<span class="ews-ref-chip">${escHtml(ews.ref||'EWS')}</span>`;
    el('ewsDrSeverity').innerHTML = severityBadge(ews.severity);
    el('ewsDrStatus').innerHTML   = statusPill(ews.status);
    el('ewsDrTitle').textContent  = ews.title || '—';
    el('ewsDrProject').textContent = `${ews.projectName||'—'} · ${ews.clientName||'—'}`;
    const scoreEl = el('ewsDrRiskScore');
    if (scoreEl) { scoreEl.textContent = score; scoreEl.style.background = riskColor(score); }

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

    const advBtn = el('ewsDrAdvanceBtn');
    if (advBtn) {
      const next = STATUSES[ews.status]?.next;
      if (next) { advBtn.textContent = `→ ${STATUSES[next].label}`; advBtn.style.display = ''; }
      else        advBtn.style.display = 'none';
    }

    _renderDrawerBody(ews);
  }

  function _renderDrawerBody(ews) {
    const body = el('ewsDrawerBody');
    if (!body) return;

    const stakeholders = ews.stakeholders || [];
    const stakeholdersHtml = stakeholders.length
      ? `<div class="ews-stakeholder-list">${stakeholders.map(em =>
          `<span class="ews-stakeholder-chip">${escHtml(em)}<button onclick="EWS._removeDrawerStakeholder('${escHtml(em)}')" type="button" title="Remove">×</button></span>`
        ).join('')}</div>`
      : `<div style="color:#9ca3af;font-size:12px;padding:4px 0">No stakeholders added yet</div>`;

    const canSchedule = ews.reviewFrequency && ews.reviewFrequency !== 'adhoc' && stakeholders.length > 0;

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
          const cls = u.type === 'status_change' ? 'status' : u.type === 'created' ? 'created' : u.type === 'action' ? 'action' : u.type === 'decision' ? 'decision' : u.type === 'review' ? 'review' : '';
          const dot = u.type === 'status_change' ? '↑' : u.type === 'created' ? '★' : u.type === 'action' ? '✓' : u.type === 'decision' ? '⚖' : u.type === 'review' ? '📋' : '●';
          const label = u.type === 'decision' ? '<span style="font-size:10px;font-weight:700;color:#8b5cf6;text-transform:uppercase;letter-spacing:.4px;margin-right:6px">Decision</span>' :
                        u.type === 'review'   ? '<span style="font-size:10px;font-weight:700;color:#14b8a6;text-transform:uppercase;letter-spacing:.4px;margin-right:6px">Review</span>' : '';
          return `<li class="ews-timeline-item">
            <div class="ews-timeline-dot ${cls}">${dot}</div>
            <div>
              <div class="ews-timeline-text">${label}${escHtml(u.text)}</div>
              <div class="ews-timeline-meta">${escHtml(u.author||'System')} · ${relTime(u.at)}</div>
            </div>
          </li>`;
        }).join('')}</ul>`
      : `<div style="color:#9ca3af;font-size:12px">No activity yet</div>`;

    body.innerHTML = `
      <!-- Risk Description -->
      <div class="ews-drawer-section">
        <div class="ews-drawer-section-title">Risk Description</div>
        <div style="font-size:13px;color:#090909;line-height:1.6">${escHtml(ews.description || '—')}</div>
        ${ews.rootCause ? `<div style="margin-top:10px"><span style="font-size:11px;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:.4px">Root Cause</span><div style="font-size:13px;color:#374151;margin-top:4px;line-height:1.5">${escHtml(ews.rootCause)}</div></div>` : ''}
        ${ews.currentImpact ? `<div style="margin-top:10px"><span style="font-size:11px;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:.4px">Current Impact</span><div style="font-size:13px;color:#374151;margin-top:4px;line-height:1.5">${escHtml(ews.currentImpact)}</div></div>` : ''}
        <div style="margin-top:10px">
          <span style="font-size:11px;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:.4px">Business Impact</span>
          ${ews.businessImpact
            ? `<div style="font-size:13px;color:#374151;margin-top:4px;line-height:1.5">${escHtml(ews.businessImpact)}</div>`
            : `<div style="font-size:12px;color:#9ca3af;margin-top:4px">Not specified — <button class="ews-inline-btn" onclick="EWS._editBusinessImpact()">Add impact</button></div>`}
          <div id="ewsBusinessImpactEdit" class="ews-add-update-form" style="margin-top:8px">
            <textarea class="ews-textarea" id="ewsBusinessImpactText" placeholder="Describe financial, operational or reputational impact..." style="min-height:64px;margin-bottom:8px">${escHtml(ews.businessImpact||'')}</textarea>
            <div style="display:flex;gap:8px;justify-content:flex-end">
              <button class="ews-btn-secondary ews-btn-sm" onclick="EWS._cancelBusinessImpact()">Cancel</button>
              <button class="ews-btn-primary ews-btn-sm" onclick="EWS._saveBusinessImpact()">Save</button>
            </div>
          </div>
        </div>
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

      <!-- Stakeholders & Meetings -->
      <div class="ews-drawer-section">
        <div class="ews-drawer-section-title">Stakeholders &amp; Meetings</div>
        ${stakeholdersHtml}
        <div class="ews-stakeholder-input-row" style="margin-top:8px">
          <input class="ews-input" id="ewsDrawerStakeholderInput" type="email" placeholder="Add email address..."
                 onkeydown="if(event.key==='Enter'){event.preventDefault();EWS._addDrawerStakeholder()}">
          <button class="ews-btn-secondary ews-btn-sm" onclick="EWS._addDrawerStakeholder()">Add</button>
        </div>
        <div style="margin-top:10px">
          ${ews.meetLink
            ? `<div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
                <a href="${escHtml(ews.meetLink)}" target="_blank" rel="noopener" style="color:#3548FF;font-size:12px;font-weight:600">🎥 Join Google Meet</a>
                <button class="ews-inline-btn" onclick="EWS._clearMeetLink()">Change</button>
              </div>`
            : `<div style="display:flex;gap:8px;align-items:center;margin-bottom:8px">
                <input class="ews-input" id="ewsDrawerMeetLink" type="url" placeholder="Paste Google Meet or video link..." style="flex:1;font-size:12px">
                <button class="ews-btn-secondary ews-btn-sm" onclick="EWS._saveMeetLink()">Save</button>
              </div>`}
          ${canSchedule
            ? `<div style="display:flex;align-items:center;gap:10px">
                <button id="ewsScheduleBtn" class="ews-btn-secondary ews-btn-sm" onclick="EWS.scheduleReviews()" style="display:flex;align-items:center;gap:4px">
                  📅 Send Calendar Invite
                </button>
                ${ews.calendarInviteSent ? `<span style="font-size:11px;color:#22c55e">✓ Invite sent${ews.calendarInviteSentAt ? ' ' + relTime(ews.calendarInviteSentAt) : ''}</span>` : ''}
              </div>`
            : stakeholders.length === 0
              ? `<div style="font-size:11px;color:#9ca3af">Add stakeholder emails above to enable calendar invites</div>`
              : ews.reviewFrequency === 'adhoc'
                ? `<div style="font-size:11px;color:#9ca3af">Set a recurring review frequency to enable calendar invites</div>`
                : ''}
        </div>
      </div>

      <!-- Ownership & Review -->
      <div class="ews-drawer-section">
        <div class="ews-drawer-section-title">Ownership &amp; Review</div>
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

      <!-- Activity & Decisions -->
      <div class="ews-drawer-section">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">
          <div class="ews-drawer-section-title" style="margin-bottom:0">Activity &amp; Decisions</div>
          <button class="ews-btn-secondary ews-btn-sm" onclick="EWS.showAddUpdate()" style="font-size:11px;padding:4px 10px">+ Add</button>
        </div>
        <div id="ewsAddUpdateForm" class="ews-add-update-form">
          <select class="ews-select" id="ewsUpdateType" style="margin-bottom:8px;font-size:12px">
            <option value="update">General Update</option>
            <option value="decision">Decision Made</option>
            <option value="review">Review Notes</option>
          </select>
          <textarea class="ews-textarea" id="ewsNewUpdateText" placeholder="What's the latest update, decision, or review notes?" style="min-height:72px;margin-bottom:8px"></textarea>
          <div style="display:flex;gap:8px;justify-content:flex-end">
            <button class="ews-btn-secondary ews-btn-sm" onclick="EWS.hideAddUpdate()">Cancel</button>
            <button class="ews-btn-primary ews-btn-sm" onclick="EWS.submitAddUpdate()">Post</button>
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
    if (f) {
      f.classList.remove('open');
      const t = el('ewsNewUpdateText'); if (t) t.value = '';
      const s = el('ewsUpdateType'); if (s) s.value = 'update';
    }
  }

  async function submitAddUpdate() {
    if (!S.currentEwsId) return;
    const text = el('ewsNewUpdateText')?.value?.trim();
    const type = el('ewsUpdateType')?.value || 'update';
    if (!text) { toast('Please enter an update'); return; }
    const u = currentUser();
    const r = await api('POST', `/api/ews/${S.currentEwsId}/updates`, { text, author: u.name || u.email || 'Team', type });
    if (!r.ok) { toast('Failed to post update'); return; }
    hideAddUpdate();
    await loadList();
    const ews = S.ewsList.find(e => e.id === S.currentEwsId);
    if (ews) _renderDrawerBody(ews);
    toast(type === 'decision' ? 'Decision recorded' : type === 'review' ? 'Review notes saved' : 'Update posted');
  }

  function showAddAction() {
    const f = el('ewsAddActionForm');
    if (f) { f.classList.toggle('open'); if (f.classList.contains('open')) el('ewsNewActionTitle')?.focus(); }
  }

  function hideAddAction() {
    const f = el('ewsAddActionForm');
    if (f) {
      f.classList.remove('open');
      ['ewsNewActionTitle','ewsNewActionAssignee','ewsNewActionDue'].forEach(id => { const i=el(id); if(i) i.value=''; });
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
    const ews  = S.ewsList.find(e => e.id === S.currentEwsId);
    if (!ews)  return;
    const next = STATUSES[ews.status]?.next;
    if (!next) return;
    const u = currentUser();
    const r = await api('PUT', `/api/ews/${S.currentEwsId}`, {
      status: next,
      addUpdate: { text:`Status advanced to: ${STATUSES[next].label}`, author: u.name || 'System', type:'status_change' }
    });
    if (!r.ok) { toast('Failed to update status'); return; }
    await loadList();
    const refreshed = S.ewsList.find(e => e.id === S.currentEwsId);
    if (refreshed) _renderDrawer(refreshed);
    toast(`Status updated: ${STATUSES[next].label}`);
  }

  // ── Drawer stakeholder management ─────────────────────────────────────────
  async function _addDrawerStakeholder() {
    if (!S.currentEwsId) return;
    const input = el('ewsDrawerStakeholderInput');
    if (!input) return;
    const email = input.value.trim().toLowerCase();
    if (!email || !email.includes('@')) { toast('Enter a valid email address'); return; }
    const ews = S.ewsList.find(e => e.id === S.currentEwsId);
    if (!ews) return;
    if ((ews.stakeholders||[]).includes(email)) { toast('Already added'); input.value = ''; return; }
    const r = await api('PUT', `/api/ews/${S.currentEwsId}`, { stakeholders: [...(ews.stakeholders||[]), email] });
    if (!r.ok) { toast('Failed to add stakeholder'); return; }
    input.value = '';
    await loadList();
    const refreshed = S.ewsList.find(e => e.id === S.currentEwsId);
    if (refreshed) _renderDrawerBody(refreshed);
  }

  async function _removeDrawerStakeholder(email) {
    if (!S.currentEwsId) return;
    const ews = S.ewsList.find(e => e.id === S.currentEwsId);
    if (!ews) return;
    const r = await api('PUT', `/api/ews/${S.currentEwsId}`, {
      stakeholders: (ews.stakeholders||[]).filter(e => e !== email)
    });
    if (!r.ok) { toast('Failed to remove stakeholder'); return; }
    await loadList();
    const refreshed = S.ewsList.find(e => e.id === S.currentEwsId);
    if (refreshed) _renderDrawerBody(refreshed);
  }

  async function _saveMeetLink() {
    if (!S.currentEwsId) return;
    const link = el('ewsDrawerMeetLink')?.value?.trim();
    if (!link) { toast('Enter a meeting link'); return; }
    const r = await api('PUT', `/api/ews/${S.currentEwsId}`, { meetLink: link });
    if (!r.ok) { toast('Failed to save link'); return; }
    await loadList();
    const refreshed = S.ewsList.find(e => e.id === S.currentEwsId);
    if (refreshed) _renderDrawerBody(refreshed);
    toast('Meet link saved');
  }

  async function _clearMeetLink() {
    if (!S.currentEwsId) return;
    const r = await api('PUT', `/api/ews/${S.currentEwsId}`, { meetLink: '' });
    if (!r.ok) { toast('Failed to clear link'); return; }
    await loadList();
    const refreshed = S.ewsList.find(e => e.id === S.currentEwsId);
    if (refreshed) _renderDrawerBody(refreshed);
  }

  // ── Schedule calendar invite ──────────────────────────────────────────────
  async function scheduleReviews() {
    if (!S.currentEwsId) return;
    const ews = S.ewsList.find(e => e.id === S.currentEwsId);
    if (!ews) return;
    if (!ews.stakeholders || !ews.stakeholders.length) { toast('Add stakeholder emails first'); return; }
    if (ews.reviewFrequency === 'adhoc') { toast('Set a recurring review frequency first'); return; }
    const btn = el('ewsScheduleBtn');
    if (btn) { btn.textContent = 'Sending…'; btn.disabled = true; }
    const r = await api('POST', `/api/ews/${S.currentEwsId}/schedule`);
    if (btn) { btn.textContent = '📅 Send Calendar Invite'; btn.disabled = false; }
    if (!r.ok) { toast(`Failed: ${r.error || 'Could not send invite'}`); return; }
    await loadList();
    const refreshed = S.ewsList.find(e => e.id === S.currentEwsId);
    if (refreshed) _renderDrawerBody(refreshed);
    toast(`✓ Calendar invite sent to ${ews.stakeholders.length} stakeholder(s)`);
  }

  // ── Business impact inline edit ───────────────────────────────────────────
  function _editBusinessImpact() {
    const f = el('ewsBusinessImpactEdit');
    if (!f) return;
    const ews = S.ewsList.find(e => e.id === S.currentEwsId);
    const inp = el('ewsBusinessImpactText');
    if (inp && ews) inp.value = ews.businessImpact || '';
    f.classList.add('open');
    inp?.focus();
  }

  function _cancelBusinessImpact() {
    const f = el('ewsBusinessImpactEdit');
    if (f) f.classList.remove('open');
  }

  async function _saveBusinessImpact() {
    if (!S.currentEwsId) return;
    const text = el('ewsBusinessImpactText')?.value?.trim() || '';
    const r = await api('PUT', `/api/ews/${S.currentEwsId}`, { businessImpact: text });
    if (!r.ok) { toast('Failed to save'); return; }
    _cancelBusinessImpact();
    await loadList();
    const refreshed = S.ewsList.find(e => e.id === S.currentEwsId);
    if (refreshed) _renderDrawerBody(refreshed);
    toast('Business impact saved');
  }

  // ── New EWS Modal ─────────────────────────────────────────────────────────
  function showNewModal() {
    _selTrigger = '';
    _formStakeholders = [];

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

    _renderFormStakeholders();
    el('ewsModalBg').style.display = 'flex';
    el('ewsFTitle')?.focus();
  }

  function hideNewModal() {
    const m = el('ewsModalBg');
    if (m) m.style.display = 'none';
    _selTrigger = '';
    _formStakeholders = [];
    ['ewsFTitle','ewsFClient','ewsFProject','ewsFOwner','ewsFClientContact','ewsFStakeholderInput'].forEach(id => {
      const i = el(id); if (i) i.value = '';
    });
    ['ewsFDesc','ewsFRootCause','ewsFImpact','ewsFPlan'].forEach(id => { const i=el(id); if(i) i.value=''; });
    const sev = el('ewsFSeverity'); if (sev) sev.value = 'medium';
    const lik = el('ewsFLikelihood'); if (lik) lik.value = 'possible';
    const rf  = el('ewsFReviewFreq'); if (rf)  rf.value = 'biweekly';
    _renderFormStakeholders();
  }

  function _selectTrigger(key) {
    _selTrigger = key;
    document.querySelectorAll('.ews-trigger-card').forEach(card => {
      card.classList.toggle('selected', card.dataset.key === key);
    });
  }

  // ── Form stakeholder management ───────────────────────────────────────────
  function _addFormStakeholder() {
    const input = el('ewsFStakeholderInput');
    if (!input) return;
    const email = input.value.trim().toLowerCase();
    if (!email || !email.includes('@') || !email.includes('.')) { toast('Enter a valid email address'); return; }
    if (_formStakeholders.includes(email)) { toast('Already added'); input.value = ''; return; }
    _formStakeholders.push(email);
    _renderFormStakeholders();
    input.value = '';
    input.focus();
  }

  function _removeFormStakeholder(email) {
    _formStakeholders = _formStakeholders.filter(e => e !== email);
    _renderFormStakeholders();
  }

  function _renderFormStakeholders() {
    const c = el('ewsFormStakeholderList');
    if (!c) return;
    c.innerHTML = _formStakeholders.map(em =>
      `<span class="ews-stakeholder-chip">${escHtml(em)}<button onclick="EWS._removeFormStakeholder('${escHtml(em)}')" type="button" title="Remove">×</button></span>`
    ).join('');
  }

  async function submitNewEws() {
    const title = el('ewsFTitle')?.value?.trim();
    if (!title) { toast('Please enter a title'); el('ewsFTitle')?.focus(); return; }
    if (!_selTrigger) { toast('Please select a trigger type'); return; }
    const u = currentUser();

    const payload = {
      title,
      triggerType:          _selTrigger,
      clientName:           el('ewsFClient')?.value?.trim()        || '',
      projectName:          el('ewsFProject')?.value?.trim()       || '',
      severity:             el('ewsFSeverity')?.value              || 'medium',
      likelihood:           el('ewsFLikelihood')?.value            || 'possible',
      description:          el('ewsFDesc')?.value?.trim()          || '',
      rootCause:            el('ewsFRootCause')?.value?.trim()     || '',
      currentImpact:        el('ewsFImpact')?.value?.trim()        || '',
      correctivePlan:       el('ewsFPlan')?.value?.trim()          || '',
      internalOwner:        el('ewsFOwner')?.value?.trim()         || '',
      clientContact:        el('ewsFClientContact')?.value?.trim() || '',
      targetResolutionDate: el('ewsFTargetDate')?.value            || '',
      reviewFrequency:      el('ewsFReviewFreq')?.value            || 'biweekly',
      stakeholders:         _formStakeholders.slice(),
      raisedBy:             u.name || u.email || 'Team',
    };

    const btn = document.querySelector('.ews-modal [onclick="EWS.submitNewEws()"]');
    if (btn) { btn.textContent = 'Raising…'; btn.disabled = true; }

    const r = await api('POST', '/api/ews', payload);
    if (btn) { btn.textContent = 'Raise EWS'; btn.disabled = false; }
    if (!r.ok) { toast('Failed to raise EWS — please try again'); return; }

    hideNewModal();
    await loadList();
    toast(`✓ ${r.data?.ref || 'EWS'} raised successfully`);
    if (r.data?.id) setTimeout(() => openDrawer(r.data.id), 300);
  }

  // ── Public API ────────────────────────────────────────────────────────────
  return {
    open, close, setView,
    openDrawer, closeDrawer,
    showNewModal, hideNewModal, submitNewEws,
    showAddUpdate, hideAddUpdate, submitAddUpdate,
    showAddAction, hideAddAction, submitAddAction,
    toggleActionItem, advanceStatus,
    applyDashFilters, resetDashFilters, onDashClientChange, onDashProjectChange,
    applyListFilters, resetListFilters, onListClientChange,
    _selectTrigger,
    _addFormStakeholder, _removeFormStakeholder,
    _addDrawerStakeholder, _removeDrawerStakeholder,
    _saveMeetLink, _clearMeetLink,
    scheduleReviews,
    _editBusinessImpact, _cancelBusinessImpact, _saveBusinessImpact,
    toggleMaximize,
  };
})();
