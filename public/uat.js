/* ══════════════════════════════════════════════════════════════════════════════
   UAT PLATFORM v2  — uat.js
   ══════════════════════════════════════════════════════════════════════════════ */

const UAT = (() => {
  /* ── State ─────────────────────────────────────────────────────────────── */
  const S = {
    view: 'dashboard',
    clients: [], projects: [], testcases: [], issues: [], templates: [], activity: [],
    activeClientId: null,
    activeProjectId: null,
    drawerTC: null,
    drawerTcId: null,
    selected: new Set(),
    filterQ: '', filterCategory: '', filterBStatus: '', filterCStatus: '', filterPriority: '', filterEntity: '',
    dashData: null,
  };

  /* ── Helpers ────────────────────────────────────────────────────────────── */
  function el(id) { return document.getElementById(id); }
  function qs(s, r) { return (r || document).querySelector(s); }
  function qsa(s, r) { return [...(r || document).querySelectorAll(s)]; }

  function authH() {
    const u = JSON.parse(localStorage.getItem('kb_user') || '{}');
    return { 'Content-Type': 'application/json', 'x-user-email': u.email || 'azhar.m@bluecopa.com' };
  }

  async function api(method, path, body) {
    const opts = { method, headers: authH() };
    if (body !== undefined) opts.body = JSON.stringify(body);
    const r = await fetch(path, opts);
    return r.json();
  }

  function toast(msg, type = 'success') {
    let t = el('uatToast');
    if (!t) { t = document.createElement('div'); t.id = 'uatToast'; document.body.appendChild(t); }
    t.textContent = msg; t.className = `uat-toast ${type} show`;
    clearTimeout(t._tid); t._tid = setTimeout(() => t.classList.remove('show'), 3000);
  }

  function relTime(iso) {
    if (!iso) return '';
    const d = (Date.now() - new Date(iso)) / 1000;
    if (d < 60) return 'just now';
    if (d < 3600) return `${Math.floor(d/60)}m ago`;
    if (d < 86400) return `${Math.floor(d/3600)}h ago`;
    return `${Math.floor(d/86400)}d ago`;
  }

  const STATUS_LABELS = { not_tested: 'Not Tested', in_progress: 'In Progress', pass: 'Pass', fail: 'Fail', blocked: 'Blocked' };
  const PRIORITY_LABELS = { critical: 'CRITICAL', high: 'HIGH', medium: 'MED', low: 'LOW' };
  const CATEGORIES = ['R2R', 'P2P', 'O2C', 'Planning', 'Dashboards', 'Reports', 'Security', 'Integrations'];

  function statusPill(status, prefix, tcId) {
    const s = status || 'not_tested';
    return `<button class="uat-status-pill ${s}" onclick="UAT.toggleStatusDD('${prefix}','${tcId}',event)">
      ${STATUS_LABELS[s] || s}
    </button>
    <div class="uat-status-dropdown" id="sdd_${prefix}_${tcId}">
      ${Object.entries(STATUS_LABELS).map(([k,v]) =>
        `<button class="uat-status-opt" onclick="UAT.setStatus('${prefix}','${tcId}','${k}',event)">
          <span class="uat-status-dot dot-${k}"></span>${v}
        </button>`).join('')}
    </div>`;
  }

  function getEntityStatus(tc, prefix) {
    if (!S.filterEntity) return prefix === 'b' ? tc.bluecopaStatus : tc.clientStatus;
    const es = (tc.entityStatuses || {})[S.filterEntity] || {};
    return prefix === 'b' ? (es.bluecopaStatus || 'not_tested') : (es.clientStatus || 'not_tested');
  }

  function priorityBadge(p) {
    const cls = { critical:'pri-critical', high:'pri-high', medium:'pri-medium', low:'pri-low' };
    return `<span class="uat-priority ${cls[p]||'pri-low'}">${PRIORITY_LABELS[p]||p||''}</span>`;
  }

  function healthColor(score) {
    if (score >= 80) return 'health-good';
    if (score >= 50) return 'health-mid';
    if (score > 0)   return 'health-bad';
    return 'health-none';
  }

  function barColor(score) {
    if (score >= 80) return '#22c55e';
    if (score >= 50) return '#f97316';
    return '#dc2626';
  }

  /* ── Navigation ─────────────────────────────────────────────────────────── */
  function setView(v) {
    S.view = v;
    qsa('.uat-nav-tab').forEach(t => t.classList.toggle('active', t.dataset.view === v));
    qsa('.uat-view').forEach(d => d.classList.toggle('active', d.id === `uatView_${v}`));
    el('uatTopbarBreadcrumb').innerHTML = breadcrumb(v);
    if (v === 'dashboard') loadDashboard();
    if (v === 'projects')  renderProjects();
    if (v === 'testcases') { if (!S.activeProjectId) setView('projects'); else loadTestCases(); }
    if (v === 'progress')  { if (!S.activeProjectId) setView('projects'); else loadTestCases(); }
    if (v === 'issues')    loadIssues();
    if (v === 'repository') loadRepository();
  }

  function breadcrumb(v) {
    const names = { dashboard:'Overview', projects:'Projects', testcases:'Test Cases', progress:'Category Progress', issues:'Issues', repository:'Repository' };
    let html = 'UAT Platform';
    if (S.activeClientId) {
      const c = S.clients.find(x => x.id === S.activeClientId);
      if (c) html += ` / <span>${c.name}</span>`;
    }
    if (v === 'testcases' && S.activeProjectId) {
      const p = S.projects.find(x => x.id === S.activeProjectId);
      if (p) html += ` / <span>${p.name}</span>`;
    }
    return html;
  }

  /* ── Dashboard ──────────────────────────────────────────────────────────── */
  async function loadDashboard() {
    const r = await api('GET', '/api/uat/dashboard');
    if (!r.ok) return;
    S.dashData = r.data;
    renderDashboard(r.data);
  }

  function renderDashboard(d) {
    const allTCs = d.totalTests;
    el('uatDash_clients').textContent = d.totalClients;
    el('uatDash_projects').textContent = d.activeProjects;
    el('uatDash_tests').textContent = allTCs;
    el('uatDash_issues').textContent = d.openIssues;
    el('uatDash_bpass').textContent = `${d.bPassRate}%`;
    el('uatDash_cpass').textContent = `${d.cPassRate}%`;
    el('uatDash_critfail').textContent = d.criticalFails;

    // Projects table
    const tbody = el('uatDash_projects_tbody');
    if (!d.projects.length) {
      tbody.innerHTML = `<tr><td colspan="7" class="uat-empty" style="padding:32px">No projects yet</td></tr>`;
    } else {
      tbody.innerHTML = d.projects.map(p => `
        <tr onclick="UAT.openProject('${p.id}')" style="cursor:pointer">
          <td><div class="uat-project-name">${p.name}</div><div class="uat-project-client">${p.clientName}</div></td>
          <td><span class="uat-priority ${p.phase==='go_live'?'pri-medium':'pri-low'}">${p.phase||'uat'}</span></td>
          <td>${p.total}</td>
          <td><span class="uat-status-pill pass" style="pointer-events:none">${p.bPassed}</span></td>
          <td><span class="uat-status-pill pass" style="pointer-events:none">${p.cPassed}</span></td>
          <td><span class="uat-status-pill blocked" style="pointer-events:none">${p.openIssues}</span></td>
          <td>
            <div class="uat-project-bar-bg" style="min-width:80px">
              <div class="uat-project-bar-fill" style="width:${p.goLiveScore}%;background:${barColor(p.goLiveScore)}"></div>
            </div>
            <div style="font-size:11px;font-weight:700;color:${barColor(p.goLiveScore)};text-align:right;margin-top:2px">${p.goLiveScore}%</div>
          </td>
        </tr>`).join('');
    }

    // Activity feed
    const feed = el('uatDash_activity');
    if (!d.activity.length) {
      feed.innerHTML = `<div style="color:#9ca3af;font-size:13px;padding:16px">No recent activity</div>`;
    } else {
      feed.innerHTML = d.activity.slice(0, 15).map(a => `
        <div class="uat-activity-item">
          <div class="uat-activity-dot"></div>
          <div class="uat-activity-msg">${a.message}</div>
          <div class="uat-activity-time">${relTime(a.createdAt)}</div>
        </div>`).join('');
    }
  }

  /* ── Projects ───────────────────────────────────────────────────────────── */
  async function loadProjects() {
    const r = await api('GET', '/api/uat/projects');
    if (r.ok) S.projects = r.data;
    const rc = await api('GET', '/api/uat/clients');
    if (rc.ok) S.clients = rc.data;
  }

  function renderProjects() {
    const wrap = el('uatProjectGrid');
    const projects = S.activeClientId ? S.projects.filter(p => p.clientId === S.activeClientId) : S.projects;
    if (!projects.length) {
      wrap.innerHTML = `<div class="uat-empty" style="grid-column:1/-1">
        <div class="uat-empty-icon">📁</div>
        <div class="uat-empty-title">No projects yet</div>
        <div class="uat-empty-desc">Create a project and seed it with 44 standard finance UAT test cases</div>
        <button class="uat-btn uat-btn-primary" onclick="UAT.showNewProjectModal()">+ New Project</button>
      </div>`;
      return;
    }
    wrap.innerHTML = projects.map(p => {
      const client = S.clients.find(c => c.id === p.clientId);
      const tcs = S.testcases.filter(t => t.projectId === p.id);
      const bPass = tcs.filter(t => t.bluecopaStatus === 'pass').length;
      const cPass = tcs.filter(t => t.clientStatus === 'pass').length;
      const total = tcs.length;
      const score = total ? Math.min(100, Math.round(((bPass*0.6)+(cPass*0.4))/total*100)) : 0;
      return `
        <div class="uat-project-card" onclick="UAT.openProject('${p.id}')">
          <div class="uat-project-card-header">
            <div>
              <div class="uat-project-name">${p.name}</div>
              <div class="uat-project-client">${client ? client.name : '—'}</div>
            </div>
            <div class="uat-project-health ${healthColor(score)}">${score}%</div>
          </div>
          <div class="uat-project-bar-bg">
            <div class="uat-project-bar-fill" style="width:${score}%;background:${barColor(score)}"></div>
          </div>
          <div class="uat-project-stats">
            <div class="uat-project-stat"><span class="dot" style="background:#6b7280"></span>${total} tests</div>
            <div class="uat-project-stat"><span class="dot" style="background:#22c55e"></span>${bPass} Bluecopa</div>
            <div class="uat-project-stat"><span class="dot" style="background:#3b82f6"></span>${cPass} Client</div>
            ${p.goLiveDate ? `<div class="uat-project-stat">Go-live: ${p.goLiveDate}</div>` : ''}
          </div>
        </div>`;
    }).join('');
  }

  function openProject(projectId) {
    S.activeProjectId = projectId;
    S.filterEntity = '';
    const p = S.projects.find(x => x.id === projectId);
    if (p) S.activeClientId = p.clientId;
    setView('testcases');
  }

  /* ── Test Cases ─────────────────────────────────────────────────────────── */
  async function loadTestCases() {
    if (!S.activeProjectId) return;
    const r = await api('GET', `/api/uat/testcases?projectId=${S.activeProjectId}`);
    if (r.ok) S.testcases = r.data;
    renderTestCaseView();
  }

  function filteredTCs() {
    let list = S.testcases;
    if (S.activeProjectId) list = list.filter(t => t.projectId === S.activeProjectId);
    if (S.filterQ) {
      const q = S.filterQ.toLowerCase();
      list = list.filter(t => (t.testDescription||'').toLowerCase().includes(q) ||
        (t.subCategory||'').toLowerCase().includes(q) || (t.category||'').toLowerCase().includes(q));
    }
    if (S.filterCategory) list = list.filter(t => t.category === S.filterCategory);
    if (S.filterBStatus)  list = list.filter(t => t.bluecopaStatus === S.filterBStatus);
    if (S.filterCStatus)  list = list.filter(t => t.clientStatus === S.filterCStatus);
    if (S.filterPriority) list = list.filter(t => t.priority === S.filterPriority);
    return list.sort((a, b) => (a.seq || 0) - (b.seq || 0));
  }

  function renderTestCaseView() {
    const tcs = filteredTCs();
    renderEntityTabs();
    if (S.view === 'progress') renderCategoryBars();
    renderTCTable(tcs);
    updateBadges();
  }

  function renderEntityTabs() {
    const row = el('uatEntityTabRow');
    if (!row) return;
    const p = S.projects.find(x => x.id === S.activeProjectId);
    const entities = p?.entities || [];
    if (!entities.length) { row.style.display = 'none'; return; }
    row.style.display = 'flex';
    row.innerHTML =
      `<button class="uat-entity-tab ${!S.filterEntity ? 'active' : ''}" onclick="UAT.selectEntity('')">All Entities</button>` +
      entities.map(e =>
        `<button class="uat-entity-tab ${S.filterEntity === e ? 'active' : ''}" onclick="UAT.selectEntity('${e.replace(/'/g,"\\'")}')">
          ${e}
        </button>`).join('') +
      `<button class="uat-entity-tab-add" onclick="UAT.showManageEntitiesModal()">+ Entity</button>`;
  }

  function selectEntity(entity) {
    S.filterEntity = entity;
    renderEntityTabs();
    renderTCTable(filteredTCs());
    updateBadges();
    if (S.view === 'progress') renderCategoryBars();
  }

  function renderCategoryBars() {
    const tcs = S.testcases.filter(t => t.projectId === S.activeProjectId);
    const cats = {};
    tcs.forEach(t => {
      if (!cats[t.category]) cats[t.category] = { total: 0, bPass: 0, cPass: 0 };
      cats[t.category].total++;
      if (getEntityStatus(t,'b') === 'pass') cats[t.category].bPass++;
      if (getEntityStatus(t,'c') === 'pass') cats[t.category].cPass++;
    });
    const catKeys = Object.keys(cats).sort();
    const emptyEl = el('uatCatBarsEmpty');
    if (!catKeys.length) {
      el('uatCatBars').style.display = 'none';
      if (emptyEl) emptyEl.style.display = '';
      return;
    }
    if (emptyEl) emptyEl.style.display = 'none';
    el('uatCatBars').style.display = '';
    el('uatCatBarsInner').innerHTML = catKeys.map(cat => {
      const c = cats[cat];
      const bPct = c.total ? Math.round(c.bPass/c.total*100) : 0;
      const cPct = c.total ? Math.round(c.cPass/c.total*100) : 0;
      return `
        <div class="uat-cat-bar-row">
          <div class="uat-cat-name">${cat}</div>
          <div class="uat-bar-wrap"><div class="uat-bar-fill uat-bar-b" style="width:${bPct}%"></div></div>
          <div class="uat-bar-wrap"><div class="uat-bar-fill uat-bar-c" style="width:${cPct}%"></div></div>
          <div class="uat-cat-pct">${cPct}%</div>
        </div>`;
    }).join('') +
    `<div style="display:grid;grid-template-columns:200px 1fr 1fr 80px;gap:20px;margin-top:24px">
      <div></div>
      <div style="text-align:center;color:#3b82f6;font-size:14px;font-weight:700">■ Bluecopa</div>
      <div style="text-align:center;color:#22c55e;font-size:14px;font-weight:700">■ Client</div>
      <div></div>
    </div>`;
  }

  function renderTCTable(tcs) {
    const tbody = el('uatTCBody');
    const headRow = el('uatTCHeadRow');
    const p = S.projects.find(x => x.id === S.activeProjectId);
    const entities = p?.entities || [];
    const isConsolidated = !S.filterEntity && entities.length > 0;

    // Update header columns to match row structure
    if (headRow) {
      headRow.innerHTML = `
        <th><input type="checkbox" class="uat-checkbox" onchange="UAT.selectAll(this.checked)"></th>
        <th>#</th>
        <th>Category</th>
        ${isConsolidated ? '<th>Entity</th>' : ''}
        <th>Test Description</th>
        <th>Priority</th>
        <th>Bluecopa Status</th>
        <th>Client Status</th>
        <th>Bluecopa Notes</th>
        <th>Client Notes</th>
        ${isConsolidated ? '' : '<th></th>'}`;
    }

    if (!tcs.length) {
      tbody.innerHTML = `<tr><td colspan="${isConsolidated ? 10 : 9}">
        <div class="uat-empty">
          <div class="uat-empty-icon">✅</div>
          <div class="uat-empty-title">No test cases${S.filterQ || S.filterCategory ? ' match your filter' : ''}</div>
          <div class="uat-empty-desc">Seed ${p ? '"'+p.name+'"' : 'this project'} with 44 standard finance test cases or add them manually</div>
          ${(!S.filterQ && !S.filterCategory && S.activeProjectId) ? `<button class="uat-btn uat-btn-primary" onclick="UAT.seedDefaults()">Seed 44 Default Test Cases</button>` : ''}
        </div>
      </td></tr>`;
      return;
    }

    if (isConsolidated) {
      tbody.innerHTML = tcs.flatMap(tc =>
        entities.map(entity => {
          const es = (tc.entityStatuses || {})[entity] || {};
          const bStatus = es.bluecopaStatus || 'not_tested';
          const cStatus = es.clientStatus   || 'not_tested';
          return `
            <tr title="Click to switch to ${entity} view" onclick="UAT.selectEntity('${entity.replace(/'/g,"\\'")}');" style="cursor:pointer">
              <td></td>
              <td><span style="font-size:11px;color:#9ca3af;font-weight:700">${tc.seq||''}</span></td>
              <td>
                <span class="uat-cat-tag">${tc.category||'—'}</span>
                <div class="uat-subcat">${tc.subCategory||''}</div>
              </td>
              <td><span class="uat-entity-chip">${entity}</span></td>
              <td><div class="uat-tc-desc">${tc.testDescription||'—'}</div></td>
              <td>${priorityBadge(tc.priority)}</td>
              <td><span class="uat-status-pill ${bStatus}" style="pointer-events:none">${STATUS_LABELS[bStatus]||bStatus}</span></td>
              <td><span class="uat-status-pill ${cStatus}" style="pointer-events:none">${STATUS_LABELS[cStatus]||cStatus}</span></td>
              <td style="font-size:11px;color:#6b7280">${es.bluecopaComments||'—'}</td>
              <td style="font-size:11px;color:#374151">${es.clientComments||'—'}</td>
            </tr>`;
        })
      ).join('');
    } else {
      tbody.innerHTML = tcs.map(tc => `
        <tr id="tcrow_${tc.id}" onclick="UAT.openDrawer('${tc.id}')" class="${S.selected.has(tc.id) ? 'selected' : ''}">
          <td onclick="event.stopPropagation()" style="text-align:center">
            <input type="checkbox" class="uat-checkbox" ${S.selected.has(tc.id)?'checked':''} onchange="UAT.toggleSelect('${tc.id}',this.checked)">
          </td>
          <td><span style="font-size:11px;color:#9ca3af;font-weight:700">${tc.seq||''}</span></td>
          <td>
            <span class="uat-cat-tag">${tc.category||'—'}</span>
            <div class="uat-subcat">${tc.subCategory||''}</div>
          </td>
          <td><div class="uat-tc-desc">${tc.testDescription||'—'}</div></td>
          <td>${priorityBadge(tc.priority)}</td>
          <td class="uat-status-cell" onclick="event.stopPropagation()">
            ${statusPill(getEntityStatus(tc,'b'), 'b', tc.id)}
          </td>
          <td class="uat-status-cell" onclick="event.stopPropagation()">
            ${statusPill(getEntityStatus(tc,'c'), 'c', tc.id)}
          </td>
          <td style="font-size:11px;color:#6b7280;max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${tc.bluecopaComments||'—'}</td>
          <td style="font-size:11px;color:#374151;max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${tc.clientComments||'—'}</td>
          <td onclick="event.stopPropagation()" style="text-align:center;padding:0 8px">
            <button class="uat-del-btn" title="Delete test case" onclick="event.stopPropagation();UAT.deleteTest('${tc.id}')">&#128465;</button>
          </td>
        </tr>`).join('');
    }
    updateBulkBar();
  }

  function updateBulkBar() {
    const bar = el('uatBulkBar');
    if (S.selected.size > 0) {
      bar.classList.add('visible');
      el('uatBulkCount').textContent = `${S.selected.size} selected`;
    } else {
      bar.classList.remove('visible');
    }
  }

  function updateBadges() {
    const total = filteredTCs().length;
    const pass = filteredTCs().filter(t => t.bluecopaStatus === 'pass').length;
    const fail = filteredTCs().filter(t => t.bluecopaStatus === 'fail' || t.clientStatus === 'fail').length;
    const blocked = filteredTCs().filter(t => t.bluecopaStatus === 'blocked' || t.clientStatus === 'blocked').length;
    const nb = el('uatNavBadge_testcases');
    if (nb) nb.textContent = total;
  }

  /* ── Status Dropdown ────────────────────────────────────────────────────── */
  function toggleStatusDD(prefix, tcId, e) {
    e.stopPropagation();
    const ddId = `sdd_${prefix}_${tcId}`;
    qsa('.uat-status-dropdown').forEach(d => { if (d.id !== ddId) d.classList.remove('open'); });
    const dd = el(ddId);
    if (dd) dd.classList.toggle('open');
  }

  async function setStatus(prefix, tcId, status, e) {
    e && e.stopPropagation();
    const dd = el(`sdd_${prefix}_${tcId}`);
    if (dd) dd.classList.remove('open');
    const tc = S.testcases.find(x => x.id === tcId);
    if (!tc) return;
    const field = prefix === 'b' ? 'bluecopaStatus' : 'clientStatus';
    let body;
    if (S.filterEntity) {
      if (!tc.entityStatuses) tc.entityStatuses = {};
      if (!tc.entityStatuses[S.filterEntity]) tc.entityStatuses[S.filterEntity] = {};
      tc.entityStatuses[S.filterEntity][field] = status;
      body = { entityStatuses: tc.entityStatuses };
    } else {
      tc[field] = status;
      body = { [field]: status };
    }
    const cell = el(`tcrow_${tcId}`)?.querySelectorAll('.uat-status-cell')[prefix === 'b' ? 0 : 1];
    if (cell) cell.innerHTML = statusPill(getEntityStatus(tc, prefix), prefix, tcId);
    const r = await api('PUT', `/api/uat/testcases/${tcId}`, body);
    if (r.ok) {
      toast(`${S.filterEntity ? '['+S.filterEntity+'] ' : ''}${prefix === 'b' ? 'Bluecopa' : 'Client'} → ${STATUS_LABELS[status]}`);
      renderCategoryBars();
    } else toast('Failed to save', 'error');
    if (S.drawerTC?.id === tcId) syncDrawerStatus(prefix, getEntityStatus(tc, prefix));
  }

  /* ── Right Drawer ───────────────────────────────────────────────────────── */
  function openDrawer(tcId) {
    const tc = S.testcases.find(x => x.id === tcId);
    if (!tc) return;
    S.drawerTC = tc;
    S.drawerTcId = tcId;
    const d = el('uatTCDrawer');
    const o = el('uatTCDrawerOverlay');
    el('uatTCDrawer_seq').textContent = `TC-${tc.seq}`;
    el('uatTCDrawer_title').textContent = tc.testDescription || '—';
    el('uatTCDrawer_category').textContent = tc.category || '—';
    el('uatTCDrawer_subcat').textContent = tc.subCategory || '—';
    el('uatTCDrawer_priority').innerHTML = priorityBadge(tc.priority);
    el('uatTCDrawer_owner').textContent = tc.owner || '—';
    el('uatTCDrawer_expected').textContent = tc.expectedResult || '—';
    el('uatTCDrawer_bStatus').innerHTML = statusPill(tc.bluecopaStatus, 'b', tc.id);
    el('uatTCDrawer_cStatus').innerHTML = statusPill(tc.clientStatus, 'c', tc.id);
    el('uatTCDrawer_bComments').value = tc.bluecopaComments || '';
    el('uatTCDrawer_cComments').value = tc.clientComments || '';
    el('uatTCDrawer_updated').textContent = relTime(tc.updatedAt);
    setProcContent('uatTCDrawer_procedure', tc.procedure || '');
    d.classList.add('open');
    o.classList.add('open');
    el('uatTCDrawer_procedure').addEventListener('paste', drawerEditorPaste);
  }

  function closeDrawer() {
    el('uatTCDrawer_procedure').removeEventListener('paste', drawerEditorPaste);
    el('uatTCDrawer').classList.remove('open');
    el('uatTCDrawerOverlay').classList.remove('open');
    S.drawerTC = null;
  }

  function syncDrawerStatus(prefix, status) {
    const tc = S.drawerTC;
    if (!tc) return;
    const cell = prefix === 'b' ? el('uatTCDrawer_bStatus') : el('uatTCDrawer_cStatus');
    if (cell) cell.innerHTML = statusPill(status, prefix, tc.id);
  }

  async function saveDrawerComments() {
    const tc = S.drawerTC;
    if (!tc) return;
    const bComments = el('uatTCDrawer_bComments').value;
    const cComments = el('uatTCDrawer_cComments').value;
    const r = await api('PUT', `/api/uat/testcases/${tc.id}`, { bluecopaComments: bComments, clientComments: cComments });
    if (r.ok) {
      tc.bluecopaComments = bComments; tc.clientComments = cComments;
      toast('Comments saved');
      renderTCTable(filteredTCs());
    } else toast('Failed to save', 'error');
  }

  /* ── Procedure & Screenshots ─────────────────────────────────────────────── */
  function fileToBase64(file) {
    return new Promise(resolve => {
      const reader = new FileReader();
      reader.onload = e => resolve(e.target.result);
      reader.readAsDataURL(file);
    });
  }

  function insertImageAtCursor(editorId, dataUrl) {
    const editor = el(editorId);
    if (!editor) return;
    const img = document.createElement('img');
    img.src = dataUrl;
    img.onclick = openImgLightbox;
    const selection = window.getSelection();
    if (selection.rangeCount > 0 && editor.contains(selection.anchorNode)) {
      const range = selection.getRangeAt(0);
      range.deleteContents();
      range.insertNode(img);
      range.setStartAfter(img);
      range.collapse(true);
      selection.removeAllRanges();
      selection.addRange(range);
    } else {
      editor.appendChild(img);
    }
    editor.appendChild(document.createElement('br'));
  }

  function openImgLightbox() {
    el('uatImgLightboxImg').src = this.src;
    el('uatImgLightbox').style.display = 'flex';
  }

  function setProcContent(editorId, content) {
    const editor = el(editorId);
    if (!editor) return;
    if (!content) { editor.innerHTML = ''; return; }
    // Legacy plain-text → convert newlines; HTML content → set directly
    if (!content.includes('<') ) {
      editor.innerHTML = content.split('\n').map(l => `<div>${l || '<br>'}</div>`).join('');
    } else {
      editor.innerHTML = content;
    }
    editor.querySelectorAll('img').forEach(img => { img.onclick = openImgLightbox; });
  }

  async function procEditorPaste(e, editorId) {
    const items = Array.from(e.clipboardData?.items || []);
    const imgs = items.filter(i => i.type.startsWith('image/'));
    if (!imgs.length) {
      // Plain text only — strip formatting
      e.preventDefault();
      const text = e.clipboardData.getData('text/plain');
      document.execCommand('insertText', false, text);
      return;
    }
    e.preventDefault();
    for (const item of imgs) {
      const data = await fileToBase64(item.getAsFile());
      insertImageAtCursor(editorId, data);
    }
  }

  function drawerEditorPaste(e) { procEditorPaste(e, 'uatTCDrawer_procedure'); }
  function fsEditorPaste(e)     { procEditorPaste(e, 'uatProcFsEditor'); }

  async function handleProcDrop(files, editorId) {
    const editor = el(editorId);
    if (!editor) return;
    for (const file of Array.from(files)) {
      if (!file.type.startsWith('image/')) continue;
      const data = await fileToBase64(file);
      editor.focus();
      insertImageAtCursor(editorId, data);
    }
  }

  async function saveProcedure() {
    const tc = S.testcases.find(x => x.id === S.drawerTcId);
    if (!tc) return;
    tc.procedure = el('uatTCDrawer_procedure').innerHTML;
    const r = await api('PUT', `/api/uat/testcases/${tc.id}`, { procedure: tc.procedure });
    if (r.ok) toast('Procedure saved');
    else toast('Failed to save procedure', 'error');
  }

  function openProcFullscreen() {
    const tc = S.testcases.find(x => x.id === S.drawerTcId);
    if (!tc) return;
    setProcContent('uatProcFsEditor', el('uatTCDrawer_procedure').innerHTML);
    el('uatProcFsSeq').textContent = `TC-${tc.seq}`;
    el('uatProcFsTitle').textContent = tc.testDescription || 'Test Procedure';
    el('uatProcFullscreen').classList.add('open');
  }

  function closeProcFullscreen() {
    el('uatProcFullscreen').classList.remove('open');
  }

  async function saveProcedureFS() {
    const tc = S.testcases.find(x => x.id === S.drawerTcId);
    if (!tc) return;
    const content = el('uatProcFsEditor').innerHTML;
    tc.procedure = content;
    el('uatTCDrawer_procedure').innerHTML = content;
    el('uatTCDrawer_procedure').querySelectorAll('img').forEach(img => { img.onclick = openImgLightbox; });
    const r = await api('PUT', `/api/uat/testcases/${tc.id}`, { procedure: content });
    if (r.ok) toast('Procedure saved');
    else toast('Failed to save', 'error');
  }

  /* ── Add / Delete Test Cases ────────────────────────────────────────────── */
  function showAddTestModal() {
    if (!S.activeProjectId) return toast('Open a project first');
    el('uatFormAddTest')?.reset();
    el('uatModalAddTest')?.classList.add('open');
  }

  function hideAddTestModal() {
    el('uatModalAddTest')?.classList.remove('open');
  }

  async function submitNewTest() {
    const form = el('uatFormAddTest');
    const fd = new FormData(form);
    const data = Object.fromEntries(fd.entries());
    const r = await api('POST', '/api/uat/testcases', {
      projectId: S.activeProjectId,
      category: data.category,
      subCategory: data.subCategory || '',
      testDescription: data.testDescription.trim(),
      expectedResult: data.expectedResult || '',
      priority: data.priority || 'medium',
      owner: data.owner || '',
    });
    if (!r.ok) return toast(r.error || 'Failed to add test', 'error');
    hideAddTestModal();
    await loadTestCases();
    toast('Test case added');
  }

  async function deleteTest(tcId) {
    if (!confirm('Delete this test case? This cannot be undone.')) return;
    const r = await api('DELETE', `/api/uat/testcases/${tcId}`);
    if (!r.ok) return toast(r.error || 'Failed to delete', 'error');
    S.testcases = S.testcases.filter(x => x.id !== tcId);
    S.selected.delete(tcId);
    renderTestCaseView();
    toast('Test case deleted');
  }

  /* ── Seed Defaults ──────────────────────────────────────────────────────── */
  async function seedDefaults() {
    if (!S.activeProjectId) return;
    const p = S.projects.find(x => x.id === S.activeProjectId);
    if (!confirm(`Seed "${p?.name}" with 44 standard finance UAT test cases?`)) return;
    const r = await api('POST', `/api/uat/projects/${S.activeProjectId}/seed`);
    if (r.ok) { toast(`${r.data.count} test cases added`); await loadTestCases(); }
    else toast('Failed to seed', 'error');
  }

  /* ── Selection / Bulk ───────────────────────────────────────────────────── */
  function toggleSelect(tcId, checked) {
    if (checked) S.selected.add(tcId); else S.selected.delete(tcId);
    const row = el(`tcrow_${tcId}`);
    if (row) row.classList.toggle('selected', checked);
    updateBulkBar();
  }

  function selectAll(checked) {
    filteredTCs().forEach(tc => { if (checked) S.selected.add(tc.id); else S.selected.delete(tc.id); });
    qsa('.uat-checkbox').forEach(cb => { cb.checked = checked; });
    qsa('.uat-table tbody tr').forEach(r => r.classList.toggle('selected', checked));
    updateBulkBar();
  }

  async function bulkSetStatus(field, status) {
    const ids = [...S.selected];
    if (!ids.length) return;
    const r = await api('POST', '/api/uat/testcases/bulk', { ids, [field]: status });
    if (r.ok) {
      ids.forEach(id => { const t = S.testcases.find(x => x.id === id); if (t) t[field] = status; });
      S.selected.clear();
      renderTestCaseView();
      toast(`${ids.length} tests updated`);
    } else toast('Failed', 'error');
  }

  function clearSelection() { S.selected.clear(); updateBulkBar(); renderTCTable(filteredTCs()); }

  /* ── Filter & Search ────────────────────────────────────────────────────── */
  function applyFilters() {
    S.filterQ        = el('uatFilterQ')?.value.trim() || '';
    S.filterCategory = el('uatFilterCategory')?.value || '';
    S.filterBStatus  = el('uatFilterBStatus')?.value || '';
    S.filterCStatus  = el('uatFilterCStatus')?.value || '';
    S.filterPriority = el('uatFilterPriority')?.value || '';
    renderTestCaseView();
  }

  /* ── Export ─────────────────────────────────────────────────────────────── */
  function exportCSV() {
    if (!S.activeProjectId) return;
    window.open(`/api/uat/export/${S.activeProjectId}`, '_blank');
  }

  /* ── New Project Modal ──────────────────────────────────────────────────── */
  function showNewProjectModal() {
    const backdrop = el('uatModalNewProject');
    if (!backdrop) return;
    // Populate client dropdown
    const sel = qs('#uatModalNewProject [name=clientId]');
    if (sel) sel.innerHTML = `<option value="">Select client…</option>` +
      S.clients.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
    backdrop.classList.add('open');
  }

  function hideNewProjectModal() {
    el('uatModalNewProject')?.classList.remove('open');
  }

  async function submitNewProject() {
    const form = el('uatFormNewProject');
    if (!form) return;
    const data = Object.fromEntries(new FormData(form));
    if (!data.clientId || !data.name) return toast('Client and name required', 'error');
    data.seedDefaults = form.querySelector('[name=seedDefaults]')?.checked;
    data.entities = (data.entities || '').split(',').map(e => e.trim()).filter(Boolean);
    const r = await api('POST', '/api/uat/projects', data);
    if (r.ok) {
      S.projects.push(r.data);
      hideNewProjectModal();
      toast(data.seedDefaults ? 'Project created & seeded with 44 test cases' : 'Project created');
      if (data.seedDefaults) { openProject(r.data.id); } else { renderProjects(); }
    } else toast(r.error || 'Failed', 'error');
  }

  /* ── New Client Modal ───────────────────────────────────────────────────── */
  function showNewClientModal() {
    el('uatModalNewClient')?.classList.add('open');
  }
  function hideNewClientModal() {
    el('uatModalNewClient')?.classList.remove('open');
  }
  async function submitNewClient() {
    const form = el('uatFormNewClient');
    if (!form) return;
    const data = Object.fromEntries(new FormData(form));
    if (!data.name) return toast('Client name required', 'error');
    data.primaryContact = { name: data.contactName || '', email: data.contactEmail || '' };
    const r = await api('POST', '/api/uat/clients', data);
    if (r.ok) {
      S.clients.push(r.data);
      hideNewClientModal();
      toast('Client added');
      renderClientList();
    } else toast(r.error || 'Failed', 'error');
  }

  /* ── Client List ─────────────────────────────────────────────────────────── */
  function renderClientList() {
    const wrap = el('uatClientGrid');
    if (!wrap) return;
    if (!S.clients.length) {
      wrap.innerHTML = `<div class="uat-empty" style="grid-column:1/-1">
        <div class="uat-empty-icon">🏢</div>
        <div class="uat-empty-title">No clients yet</div>
        <div class="uat-empty-desc">Add your first client to start UAT management</div>
        <button class="uat-btn uat-btn-primary" onclick="UAT.showNewClientModal()">+ Add Client</button>
      </div>`;
      return;
    }
    wrap.innerHTML = S.clients.map(c => {
      const projs = S.projects.filter(p => p.clientId === c.id);
      const tcs = S.testcases.filter(t => t.clientId === c.id);
      const baseUrl = window.location.origin;
      return `
        <div class="uat-client-card">
          <div class="uat-client-avatar">${c.shortCode || c.name.slice(0,3).toUpperCase()}</div>
          <div class="uat-client-name">${c.name}</div>
          <div class="uat-client-meta">${projs.length} project${projs.length!==1?'s':''} · ${tcs.length} test cases</div>
          ${c.primaryContact?.email ? `<div class="uat-client-meta" style="margin-top:4px">📧 ${c.primaryContact.email}</div>` : ''}
          ${c.portalToken ? `<div class="uat-portal-url" style="margin-top:8px" title="Click to copy" onclick="UAT.copyPortalLink('${c.portalToken}')">${baseUrl}/uat/portal/${c.portalToken}</div>` : ''}
          <div class="uat-client-actions">
            <button class="uat-btn uat-btn-secondary uat-btn-sm" onclick="UAT.filterByClient('${c.id}')">View Projects</button>
            <button class="uat-btn uat-btn-ghost uat-btn-sm" onclick="UAT.regenPortal('${c.id}')">🔗 Regen Link</button>
          </div>
        </div>`;
    }).join('');
  }

  function copyPortalLink(token) {
    const url = `${window.location.origin}/uat/portal/${token}`;
    navigator.clipboard.writeText(url).then(() => toast('Portal link copied!')).catch(() => toast('Copy failed', 'error'));
  }

  async function regenPortal(clientId) {
    const r = await api('POST', '/api/uat/portal/generate', { clientId });
    if (r.ok) {
      const c = S.clients.find(x => x.id === clientId);
      if (c) c.portalToken = r.token;
      toast('New portal link generated');
      renderClientList();
    } else toast('Failed', 'error');
  }

  function filterByClient(clientId) {
    S.activeClientId = clientId;
    setView('projects');
  }

  /* ── Issues ──────────────────────────────────────────────────────────────── */
  async function loadIssues() {
    const params = S.activeProjectId ? `?projectId=${S.activeProjectId}` : '';
    const r = await api('GET', `/api/uat/issues${params}`);
    if (r.ok) S.issues = r.data;
    renderIssues();
  }

  function renderIssues() {
    const tbody = el('uatIssuesTbody');
    if (!tbody) return;
    if (!S.issues.length) {
      tbody.innerHTML = `<tr><td colspan="6"><div class="uat-empty" style="padding:32px">No issues logged</div></td></tr>`;
      return;
    }
    const SEV = { critical: 'pri-critical', high: 'pri-high', medium: 'pri-medium', low: 'pri-low' };
    tbody.innerHTML = S.issues.map(i => `
      <tr>
        <td><span style="font-size:11px;font-family:monospace;font-weight:700;color:#6b7280">${i.ref}</span></td>
        <td>${i.title}</td>
        <td><span class="uat-priority ${SEV[i.severity]||'pri-low'}">${i.severity||'med'}</span></td>
        <td><span class="uat-status-pill ${i.status==='open'?'fail':i.status==='resolved'?'pass':'in_progress'}" style="pointer-events:none">${i.status}</span></td>
        <td>${i.assignedTo || '—'}</td>
        <td>${relTime(i.createdAt)}</td>
      </tr>`).join('');
  }

  /* ── Repository ──────────────────────────────────────────────────────────── */
  async function loadRepository() {
    const r = await api('GET', '/api/uat/repository');
    if (r.ok) renderRepository(r.data);
  }

  function renderRepository(tcs) {
    const tbody = el('uatRepoTbody');
    if (!tbody) return;
    if (!tcs.length) {
      tbody.innerHTML = `<tr><td colspan="6"><div class="uat-empty" style="padding:32px">No proven test cases yet. Pass some UAT items to build the repository.</div></td></tr>`;
      return;
    }
    tbody.innerHTML = tcs.map(t => `
      <tr>
        <td><span class="uat-cat-tag">${t.category}</span></td>
        <td>${t.subCategory || '—'}</td>
        <td>${t.testDescription}</td>
        <td>${t.expectedResult ? t.expectedResult.slice(0,100)+'…' : '—'}</td>
        <td>${priorityBadge(t.priority)}</td>
        <td>${t.clientName || '—'}</td>
      </tr>`).join('');
  }

  /* ── Global dropdown close ──────────────────────────────────────────────── */
  document.addEventListener('click', () => {
    qsa('.uat-status-dropdown').forEach(d => d.classList.remove('open'));
  });

  /* ── Open / Close ───────────────────────────────────────────────────────── */
  function open() {
    const overlay = el('uatOverlay');
    if (!overlay) return;
    overlay.style.display = 'flex';
    // Initialize on first open
    if (!open._initialized) {
      open._initialized = true;
      init();
    } else {
      setView(S.view);
    }
  }

  function close() {
    const overlay = el('uatOverlay');
    if (overlay) overlay.style.display = 'none';
  }

  /* ── Init ────────────────────────────────────────────────────────────────── */
  async function init() {
    const [cr, pr, tr] = await Promise.all([
      api('GET', '/api/uat/clients'),
      api('GET', '/api/uat/projects'),
      api('GET', '/api/uat/testcases'),
    ]);
    if (cr.ok) S.clients = cr.data;
    if (pr.ok) S.projects = pr.data;
    if (tr.ok) S.testcases = tr.data;
    const nb = el('uatNavBadge_projects');
    if (nb) nb.textContent = S.projects.length;
    renderClientList();
    setView('dashboard');
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && el('uatProcFullscreen')?.classList.contains('open')) {
        closeProcFullscreen();
      }
    });
  }

  /* ── Entity Management ──────────────────────────────────────────────────── */
  function showManageEntitiesModal() {
    if (!S.activeProjectId) return toast('Select a project first', 'error');
    renderEntityList();
    el('uatModalEntities')?.classList.add('open');
  }
  function hideManageEntitiesModal() {
    el('uatModalEntities')?.classList.remove('open');
    renderEntityTabs();
  }
  function renderEntityList() {
    const p = S.projects.find(x => x.id === S.activeProjectId);
    const entities = p?.entities || [];
    const wrap = el('uatEntityList');
    if (!wrap) return;
    if (!entities.length) {
      wrap.innerHTML = `<div style="color:#6b7280;font-size:13px;padding:8px 0">No entities yet. Add one below.</div>`;
      return;
    }
    wrap.innerHTML = entities.map((e, i) => `
      <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 0;border-bottom:1px solid #f1f2f5">
        <span style="font-size:13px;font-weight:600;color:#0d1117">${e}</span>
        <button class="uat-btn uat-btn-ghost uat-btn-sm" onclick="UAT.removeEntity(${i})" style="color:#dc2626;font-size:12px">Remove</button>
      </div>`).join('');
  }
  async function addEntity() {
    const input = el('uatEntityInput');
    const name = input?.value.trim();
    if (!name) return;
    const p = S.projects.find(x => x.id === S.activeProjectId);
    if (!p) return;
    if (!p.entities) p.entities = [];
    if (p.entities.includes(name)) return toast('Entity already exists', 'error');
    p.entities.push(name);
    const r = await api('PUT', `/api/uat/projects/${S.activeProjectId}`, { entities: p.entities });
    if (r.ok) {
      input.value = '';
      renderEntityList();
      toast(`"${name}" added — select it in the tab row to test at entity level`);
    } else toast('Failed to save', 'error');
  }
  async function removeEntity(index) {
    const p = S.projects.find(x => x.id === S.activeProjectId);
    if (!p?.entities) return;
    const name = p.entities[index];
    p.entities.splice(index, 1);
    const r = await api('PUT', `/api/uat/projects/${S.activeProjectId}`, { entities: p.entities });
    if (r.ok) {
      if (S.filterEntity === name) S.filterEntity = '';
      renderEntityList();
      toast(`"${name}" removed`);
    } else toast('Failed to save', 'error');
  }

  /* ── Public API ──────────────────────────────────────────────────────────── */
  return {
    open,
    close,
    init,
    setView,
    openProject,
    openDrawer,
    closeDrawer,
    saveDrawerComments,
    toggleStatusDD,
    setStatus,
    toggleSelect,
    selectAll,
    clearSelection,
    bulkSetStatus,
    applyFilters,
    exportCSV,
    seedDefaults,
    showNewProjectModal,
    hideNewProjectModal,
    submitNewProject,
    showNewClientModal,
    hideNewClientModal,
    submitNewClient,
    filterByClient,
    copyPortalLink,
    regenPortal,
    loadRepository,
    showManageEntitiesModal,
    hideManageEntitiesModal,
    addEntity,
    removeEntity,
    selectEntity,
    showAddTestModal,
    hideAddTestModal,
    submitNewTest,
    deleteTest,
    handleProcDrop,
    saveProcedure,
    openProcFullscreen,
    closeProcFullscreen,
    saveProcedureFS,
  };
})();
