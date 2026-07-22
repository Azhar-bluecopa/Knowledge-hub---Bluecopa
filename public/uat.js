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
    selected: new Set(),
    filterQ: '', filterCategory: '', filterBStatus: '', filterCStatus: '', filterPriority: '',
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
    if (S.view === 'progress') renderCategoryBars();
    renderTCTable(tcs);
    updateBadges();
  }

  function renderCategoryBars() {
    const tcs = S.testcases.filter(t => t.projectId === S.activeProjectId);
    const cats = {};
    tcs.forEach(t => {
      if (!cats[t.category]) cats[t.category] = { total: 0, bPass: 0, cPass: 0 };
      cats[t.category].total++;
      if (t.bluecopaStatus === 'pass') cats[t.category].bPass++;
      if (t.clientStatus === 'pass') cats[t.category].cPass++;
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
    if (!tcs.length) {
      const p = S.projects.find(x => x.id === S.activeProjectId);
      tbody.innerHTML = `<tr><td colspan="9">
        <div class="uat-empty">
          <div class="uat-empty-icon">✅</div>
          <div class="uat-empty-title">No test cases${S.filterQ || S.filterCategory ? ' match your filter' : ''}</div>
          <div class="uat-empty-desc">Seed ${p ? '"'+p.name+'"' : 'this project'} with 44 standard finance test cases or add them manually</div>
          ${(!S.filterQ && !S.filterCategory && S.activeProjectId) ? `<button class="uat-btn uat-btn-primary" onclick="UAT.seedDefaults()">Seed 44 Default Test Cases</button>` : ''}
        </div>
      </td></tr>`;
      return;
    }
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
          ${statusPill(tc.bluecopaStatus, 'b', tc.id)}
        </td>
        <td class="uat-status-cell" onclick="event.stopPropagation()">
          ${statusPill(tc.clientStatus, 'c', tc.id)}
        </td>
        <td style="font-size:11px;color:#6b7280;max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${tc.bluecopaComments||'—'}</td>
        <td style="font-size:11px;color:#374151;max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${tc.clientComments||'—'}</td>
      </tr>`).join('');
    // update bulk bar
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
    tc[field] = status;
    // Update pill in DOM
    const cell = el(`tcrow_${tcId}`)?.querySelectorAll('.uat-status-cell')[prefix === 'b' ? 0 : 1];
    if (cell) cell.innerHTML = statusPill(status, prefix, tcId);
    // Save
    const r = await api('PUT', `/api/uat/testcases/${tcId}`, { [field]: status });
    if (r.ok) {
      toast(`${prefix === 'b' ? 'Bluecopa' : 'Client'} status → ${STATUS_LABELS[status]}`);
      renderCategoryBars();
    } else toast('Failed to save', 'error');
    // Sync drawer if open
    if (S.drawerTC?.id === tcId) { S.drawerTC[field] = status; syncDrawerStatus(prefix, status); }
  }

  /* ── Right Drawer ───────────────────────────────────────────────────────── */
  function openDrawer(tcId) {
    const tc = S.testcases.find(x => x.id === tcId);
    if (!tc) return;
    S.drawerTC = tc;
    const d = el('uatDrawer');
    const o = el('uatDrawerOverlay');
    el('uatDrawer_seq').textContent = `TC-${tc.seq}`;
    el('uatDrawer_title').textContent = tc.testDescription || '—';
    el('uatDrawer_category').textContent = tc.category || '—';
    el('uatDrawer_subcat').textContent = tc.subCategory || '—';
    el('uatDrawer_priority').innerHTML = priorityBadge(tc.priority);
    el('uatDrawer_owner').textContent = tc.owner || '—';
    el('uatDrawer_expected').textContent = tc.expectedResult || '—';
    el('uatDrawer_bStatus').innerHTML = statusPill(tc.bluecopaStatus, 'b', tc.id);
    el('uatDrawer_cStatus').innerHTML = statusPill(tc.clientStatus, 'c', tc.id);
    el('uatDrawer_bComments').value = tc.bluecopaComments || '';
    el('uatDrawer_cComments').value = tc.clientComments || '';
    el('uatDrawer_updated').textContent = relTime(tc.updatedAt);
    d.classList.add('open');
    o.classList.add('open');
  }

  function closeDrawer() {
    el('uatDrawer').classList.remove('open');
    el('uatDrawerOverlay').classList.remove('open');
    S.drawerTC = null;
  }

  function syncDrawerStatus(prefix, status) {
    const tc = S.drawerTC;
    if (!tc) return;
    const cell = prefix === 'b' ? el('uatDrawer_bStatus') : el('uatDrawer_cStatus');
    if (cell) cell.innerHTML = statusPill(status, prefix, tc.id);
  }

  async function saveDrawerComments() {
    const tc = S.drawerTC;
    if (!tc) return;
    const bComments = el('uatDrawer_bComments').value;
    const cComments = el('uatDrawer_cComments').value;
    const r = await api('PUT', `/api/uat/testcases/${tc.id}`, { bluecopaComments: bComments, clientComments: cComments });
    if (r.ok) {
      tc.bluecopaComments = bComments; tc.clientComments = cComments;
      toast('Comments saved');
      renderTCTable(filteredTCs());
    } else toast('Failed to save', 'error');
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
    // Update project badge
    const nb = el('uatNavBadge_projects');
    if (nb) nb.textContent = S.projects.length;
    renderClientList();
    setView('dashboard');
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
  };
})();
