/* ═══════════════════════════════════════════════════════════════════════════
   UAT PLATFORM — uat.js
   ═══════════════════════════════════════════════════════════════════════════ */

const UAT = (() => {
  /* ── state ──────────────────────────────────────────────────────────── */
  let state = {
    view: 'dashboard',
    clients: [], projects: [], testcases: [], issues: [], templates: [],
    activeClientId: null,
    activeProjectId: null,
    activeTestCase: null,
    selectedTCs: new Set(),
    filterStatus: '', filterPriority: '', filterProcess: '', filterQ: '',
    dashData: null,
    repoResults: [],
  };

  /* ── helpers ─────────────────────────────────────────────────────────── */
  function el(id) { return document.getElementById(id); }
  function qs(sel, root) { return (root || document).querySelector(sel); }
  function qsa(sel, root) { return [...(root || document).querySelectorAll(sel)]; }
  function apiBase() { return ''; }

  function authHeader() {
    const u = JSON.parse(localStorage.getItem('kb_user') || '{}');
    return { 'Content-Type': 'application/json', 'x-user-email': u.email || 'azhar.m@bluecopa.com' };
  }

  async function api(method, path, body) {
    const opts = { method, headers: authHeader() };
    if (body !== undefined) opts.body = JSON.stringify(body);
    const r = await fetch(path, opts);
    return r.json();
  }

  function toast(msg, type = 'success') {
    let t = el('uatToast');
    if (!t) {
      t = document.createElement('div');
      t.id = 'uatToast'; t.className = 'uat-toast';
      document.body.appendChild(t);
    }
    t.textContent = msg; t.className = `uat-toast ${type} show`;
    clearTimeout(t._tid);
    t._tid = setTimeout(() => t.classList.remove('show'), 3000);
  }

  function relTime(iso) {
    if (!iso) return '';
    const diff = Date.now() - new Date(iso).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1) return 'just now';
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
  }

  function statusBadge(s) {
    const map = {
      not_started:'not-started',in_progress:'in-progress',passed:'passed',
      failed:'failed',blocked:'blocked',retest:'retest',open:'open',
      resolved:'resolved',closed:'closed',active:'active',at_risk:'at-risk',
      on_hold:'on-hold',completed:'completed',go_live:'go-live',uat:'uat-phase'
    };
    const labels = {
      not_started:'Not Started',in_progress:'In Progress',passed:'Passed',
      failed:'Failed',blocked:'Blocked',retest:'Retest',open:'Open',
      resolved:'Resolved',closed:'Closed',active:'Active',at_risk:'At Risk',
      on_hold:'On Hold',completed:'Completed',go_live:'Go Live',uat:'UAT'
    };
    return `<span class="uat-badge ${map[s]||s}">${labels[s]||s}</span>`;
  }

  function prioBadge(p) {
    return `<span class="uat-prio ${p}">${p?p.charAt(0).toUpperCase()+p.slice(1):''}</span>`;
  }

  function initials(name) {
    return (name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  }

  function healthColor(pct) {
    if (pct >= 80) return '#22c55e';
    if (pct >= 50) return '#f59e0b';
    return '#dc2626';
  }

  function healthRing(pct) {
    const r = 20, circ = 2 * Math.PI * r, fill = circ * (pct / 100);
    const col = healthColor(pct);
    return `<div class="uat-health-ring">
      <svg viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
        <circle cx="24" cy="24" r="${r}" fill="none" stroke="#e4e6ea" stroke-width="4"/>
        <circle cx="24" cy="24" r="${r}" fill="none" stroke="${col}" stroke-width="4"
          stroke-dasharray="${fill} ${circ}" stroke-linecap="round"/>
      </svg>
      <span class="uat-health-ring-val" style="color:${col}">${pct}%</span>
    </div>`;
  }

  /* ── navigation ──────────────────────────────────────────────────────── */
  function showView(v) {
    state.view = v;
    qsa('.uat-view').forEach(el => el.classList.remove('active'));
    const ve = el(`uatView_${v}`);
    if (ve) ve.classList.add('active');
    qsa('.uat-nav-item').forEach(n => {
      n.classList.toggle('active', n.dataset.view === v);
    });
  }

  /* ── open / close overlay ────────────────────────────────────────────── */
  function open() {
    el('uatOverlay').classList.add('uat-open');
    loadDashboard();
    showView('dashboard');
    loadClients();
  }

  function close() {
    el('uatOverlay').classList.remove('uat-open');
  }

  /* ══════════════════════════════════════════════════════════════════════
     DASHBOARD
  ══════════════════════════════════════════════════════════════════════ */
  async function loadDashboard() {
    const r = await api('GET', '/api/uat/dashboard');
    if (!r.ok) return;
    state.dashData = r.data;
    renderDashboard(r.data);
  }

  function renderDashboard(d) {
    const kpi = el('uatDashKPI');
    kpi.innerHTML = `
      <div class="uat-kpi-card uat-kpi-accent gold">
        <div class="uat-kpi-label">Total Clients</div>
        <div class="uat-kpi-value">${d.totalClients}</div>
        <div class="uat-kpi-sub">Active engagements</div>
      </div>
      <div class="uat-kpi-card uat-kpi-accent blue">
        <div class="uat-kpi-label">Active Projects</div>
        <div class="uat-kpi-value">${d.activeProjects}</div>
        <div class="uat-kpi-sub">In UAT phase</div>
      </div>
      <div class="uat-kpi-card uat-kpi-accent green">
        <div class="uat-kpi-label">Total Tests</div>
        <div class="uat-kpi-value">${d.totalTests}</div>
        <div class="uat-kpi-sub">Pass rate: ${d.passRate}%</div>
        <div class="uat-progress-wrap">
          <div class="uat-progress-bar"><div class="uat-progress-fill${d.passRate<50?' danger':d.passRate<80?' warn':''}" style="width:${d.passRate}%"></div></div>
        </div>
      </div>
      <div class="uat-kpi-card uat-kpi-accent red">
        <div class="uat-kpi-label">Open Issues</div>
        <div class="uat-kpi-value">${d.openIssues}</div>
        <div class="uat-kpi-sub">Needs attention</div>
      </div>`;

    const proj = el('uatDashProjects');
    if (!d.projects.length) {
      proj.innerHTML = `<div class="uat-empty"><div class="uat-empty-title">No projects yet</div><div class="uat-empty-sub">Create a client and project to get started</div></div>`;
    } else {
      proj.innerHTML = `<div class="uat-table-wrap"><table class="uat-table">
        <thead><tr>
          <th>Client</th><th>Project</th><th>Phase</th>
          <th>Tests</th><th>Passed</th><th>Failed</th><th>Issues</th><th>Health</th><th></th>
        </tr></thead>
        <tbody>${d.projects.map(p => `
          <tr>
            <td><span class="uat-text-muted">${p.clientName}</span></td>
            <td class="uat-bold">${esc(p.name)}</td>
            <td>${statusBadge(p.phase)}</td>
            <td>${p.total}</td>
            <td style="color:#16a34a;font-weight:600">${p.passed}</td>
            <td style="color:${p.failed?'#dc2626':'#6b7280'};font-weight:600">${p.failed}</td>
            <td style="color:${p.openIssues?'#ea580c':'#6b7280'};font-weight:600">${p.openIssues}</td>
            <td>${healthRing(p.healthScore)}</td>
            <td><button class="uat-btn uat-btn-ghost uat-btn-sm" onclick="UAT.goProject('${p.id}','${p.clientId}')">View</button></td>
          </tr>`).join('')}
        </tbody>
      </table></div>`;
    }

    const act = el('uatDashActivity');
    act.innerHTML = !d.activity.length
      ? '<div class="uat-text-muted">No recent activity</div>'
      : `<div class="uat-activity-list">${d.activity.map(a => `
          <div class="uat-activity-item">
            <div class="uat-activity-dot"></div>
            <div class="uat-activity-text">${esc(a.message)}</div>
            <div class="uat-activity-time">${relTime(a.createdAt)}</div>
          </div>`).join('')}
        </div>`;
  }

  /* ══════════════════════════════════════════════════════════════════════
     CLIENTS
  ══════════════════════════════════════════════════════════════════════ */
  async function loadClients() {
    const r = await api('GET', '/api/uat/clients');
    if (!r.ok) return;
    state.clients = r.data;
    renderClientList();
    buildClientDropdown();
  }

  function renderClientList() {
    const wrap = el('uatClientGrid');
    const clients = state.clients;
    const addCard = `<div class="uat-add-client-card" onclick="UAT.openClientModal()">
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
      Add Client
    </div>`;
    if (!clients.length) {
      wrap.innerHTML = addCard;
      return;
    }
    wrap.innerHTML = clients.map(c => {
      const projs = state.projects.filter(p => p.clientId === c.id);
      return `<div class="uat-client-card" onclick="UAT.selectClient('${c.id}')">
        <div class="uat-client-card-top">
          <div class="uat-client-initials">${initials(c.shortCode || c.name)}</div>
          <div>
            <div class="uat-client-name">${esc(c.name)}</div>
            <div class="uat-client-code">${esc(c.shortCode)}</div>
          </div>
          <div style="margin-left:auto">${statusBadge(c.status)}</div>
        </div>
        <div class="uat-client-stats">
          <div class="uat-client-stat"><div class="uat-client-stat-n">${projs.length}</div><div class="uat-client-stat-l">Projects</div></div>
          <div class="uat-client-stat"><div class="uat-client-stat-n">${state.testcases.filter(t=>t.clientId===c.id).length}</div><div class="uat-client-stat-l">Tests</div></div>
          <div class="uat-client-stat"><div class="uat-client-stat-n">${state.issues.filter(i=>i.clientId===c.id&&['open','in_progress'].includes(i.status)).length}</div><div class="uat-client-stat-l">Issues</div></div>
        </div>
      </div>`;
    }).join('') + addCard;
  }

  function buildClientDropdown() {
    const s = el('uatClientSel');
    const ps = el('uatPortalClientSel');
    const opts = state.clients.map(c => `<option value="${c.id}">${esc(c.name)}</option>`).join('');
    if (s) {
      s.innerHTML = '<option value="">All Clients</option>' + opts;
      if (state.activeClientId) s.value = state.activeClientId;
    }
    if (ps) {
      ps.innerHTML = '<option value="">Choose client…</option>' + opts;
    }
  }

  function selectClient(id) {
    state.activeClientId = id;
    state.activeProjectId = null;
    const s = el('uatClientSel'); if (s) s.value = id;
    showView('projects');
    loadProjects(id);
  }

  function openClientModal(id) {
    const c = id ? state.clients.find(x => x.id === id) : null;
    el('uatClientModalTitle').textContent = c ? 'Edit Client' : 'Add New Client';
    el('uatClientForm').reset();
    if (c) {
      el('uatClientFormId').value = c.id;
      el('uatClientFormName').value = c.name;
      el('uatClientFormCode').value = c.shortCode || '';
      el('uatClientFormContact').value = c.primaryContact?.name || '';
      el('uatClientFormEmail').value = c.primaryContact?.email || '';
      el('uatClientFormLead').value = c.internalLead || '';
      el('uatClientFormStatus').value = c.status || 'active';
    } else {
      el('uatClientFormId').value = '';
    }
    el('uatClientModal').classList.add('open');
  }

  function closeClientModal() { el('uatClientModal').classList.remove('open'); }

  async function saveClient() {
    const id = el('uatClientFormId').value;
    const body = {
      name: el('uatClientFormName').value.trim(),
      shortCode: el('uatClientFormCode').value.trim().toUpperCase() || undefined,
      primaryContact: { name: el('uatClientFormContact').value.trim(), email: el('uatClientFormEmail').value.trim() },
      internalLead: el('uatClientFormLead').value.trim(),
      status: el('uatClientFormStatus').value,
    };
    if (!body.name) return toast('Client name is required', 'error');
    const r = id
      ? await api('PUT', `/api/uat/clients/${id}`, body)
      : await api('POST', '/api/uat/clients', body);
    if (!r.ok) return toast(r.error || 'Failed', 'error');
    toast(id ? 'Client updated' : 'Client created');
    closeClientModal();
    loadClients();
  }

  /* ══════════════════════════════════════════════════════════════════════
     PROJECTS
  ══════════════════════════════════════════════════════════════════════ */
  async function loadProjects(clientId) {
    const url = clientId ? `/api/uat/projects?clientId=${clientId}` : '/api/uat/projects';
    const [pr, tr, ir] = await Promise.all([
      api('GET', url),
      api('GET', clientId ? `/api/uat/testcases?clientId=${clientId}` : '/api/uat/testcases'),
      api('GET', clientId ? `/api/uat/issues?clientId=${clientId}` : '/api/uat/issues'),
    ]);
    if (pr.ok) state.projects = clientId ? [...state.projects.filter(p => p.clientId !== clientId), ...pr.data] : pr.data;
    if (tr.ok) state.testcases = clientId ? [...state.testcases.filter(t => t.clientId !== clientId), ...tr.data] : tr.data;
    if (ir.ok) state.issues = clientId ? [...state.issues.filter(i => i.clientId !== clientId), ...ir.data] : ir.data;
    renderProjectList(pr.data || []);
  }

  function renderProjectList(projects) {
    const wrap = el('uatProjectList');
    const client = state.clients.find(c => c.id === state.activeClientId);
    el('uatProjectsClientName').textContent = client ? client.name : 'All Clients';

    if (!projects.length) {
      wrap.innerHTML = `<div class="uat-empty">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>
        <div class="uat-empty-title">No projects yet</div>
        <div class="uat-empty-sub">Create the first project for this client</div>
      </div>`;
      return;
    }
    wrap.innerHTML = projects.map(p => {
      const tc = state.testcases.filter(t => t.projectId === p.id);
      const passed = tc.filter(t => t.status === 'passed').length;
      const pct = tc.length ? Math.round(passed / tc.length * 100) : 0;
      const open = state.issues.filter(i => i.projectId === p.id && ['open', 'in_progress'].includes(i.status)).length;
      return `<div class="uat-project-row" onclick="UAT.goProject('${p.id}','${p.clientId}')">
        <div class="uat-project-info">
          <div class="uat-project-name">${esc(p.name)}</div>
          <div class="uat-project-meta">${p.entity ? esc(p.entity) + ' · ' : ''}${p.businessUnit ? esc(p.businessUnit) + ' · ' : ''}Round ${p.uatRound} · Go-live ${p.goLiveDate || 'TBD'}</div>
          <div style="margin-top:6px;display:flex;gap:8px;align-items:center">
            ${statusBadge(p.phase)} ${statusBadge(p.status)}
            ${open ? `<span class="uat-chip" style="background:#fef2f2;border-color:#fca5a5;color:#dc2626">${open} open issue${open>1?'s':''}</span>` : ''}
          </div>
        </div>
        <div class="uat-project-health">
          ${healthRing(pct)}
          <span class="uat-project-health-label">health</span>
          <span class="uat-text-muted" style="font-size:11px">${tc.length} tests</span>
        </div>
      </div>`;
    }).join('');
  }

  function openProjectModal(id) {
    const p = id ? state.projects.find(x => x.id === id) : null;
    el('uatProjectModalTitle').textContent = p ? 'Edit Project' : 'Add New Project';
    el('uatProjectForm').reset();
    el('uatProjectFormClientId').value = state.activeClientId || '';
    if (p) {
      el('uatProjectFormId').value = p.id;
      el('uatProjectFormName').value = p.name;
      el('uatProjectFormEntity').value = p.entity || '';
      el('uatProjectFormBU').value = p.businessUnit || '';
      el('uatProjectFormGoLive').value = p.goLiveDate || '';
      el('uatProjectFormRound').value = p.uatRound || 1;
      el('uatProjectFormDesc').value = p.description || '';
      el('uatProjectFormStatus').value = p.status || 'active';
      el('uatProjectFormPhase').value = p.phase || 'uat';
    } else {
      el('uatProjectFormId').value = '';
    }
    el('uatProjectModal').classList.add('open');
  }

  function closeProjectModal() { el('uatProjectModal').classList.remove('open'); }

  async function saveProject() {
    const id = el('uatProjectFormId').value;
    const body = {
      clientId: el('uatProjectFormClientId').value,
      name: el('uatProjectFormName').value.trim(),
      entity: el('uatProjectFormEntity').value.trim(),
      businessUnit: el('uatProjectFormBU').value.trim(),
      goLiveDate: el('uatProjectFormGoLive').value,
      uatRound: parseInt(el('uatProjectFormRound').value) || 1,
      description: el('uatProjectFormDesc').value.trim(),
      status: el('uatProjectFormStatus').value,
      phase: el('uatProjectFormPhase').value,
    };
    if (!body.name) return toast('Project name is required', 'error');
    const r = id
      ? await api('PUT', `/api/uat/projects/${id}`, body)
      : await api('POST', '/api/uat/projects', body);
    if (!r.ok) return toast(r.error || 'Failed', 'error');
    toast(id ? 'Project updated' : 'Project created');
    closeProjectModal();
    loadProjects(state.activeClientId);
  }

  /* ══════════════════════════════════════════════════════════════════════
     TEST CASES
  ══════════════════════════════════════════════════════════════════════ */
  function goProject(projectId, clientId) {
    state.activeProjectId = projectId;
    state.activeClientId = clientId;
    state.selectedTCs.clear();
    state.filterStatus = ''; state.filterPriority = ''; state.filterProcess = ''; state.filterQ = '';
    showView('testcases');
    loadTestcases();
  }

  async function loadTestcases() {
    const [tr, ir] = await Promise.all([
      api('GET', `/api/uat/testcases?projectId=${state.activeProjectId}`),
      api('GET', `/api/uat/issues?projectId=${state.activeProjectId}`),
    ]);
    if (tr.ok) state.testcases = tr.data;
    if (ir.ok) state.issues = ir.data;
    const p = state.projects.find(x => x.id === state.activeProjectId) || {};
    const c = state.clients.find(x => x.id === state.activeClientId) || {};
    el('uatTCProjectName').textContent = `${c.name || ''} · ${p.name || ''}`;
    renderSignoffBanner(p);
    renderTCToolbar();
    renderTestcases();
  }

  function renderSignoffBanner(p) {
    const b = el('uatSignoffBanner');
    if (!p.signoff) { b.classList.add('uat-hidden'); return; }
    b.classList.remove('uat-hidden');
    b.className = `uat-signoff-banner ${p.signoff.status}`;
    const icons = { approved: '✅', rejected: '❌', pending: '⏳' };
    b.innerHTML = `<div class="uat-signoff-icon">${icons[p.signoff.status]||'📋'}</div>
      <div class="uat-signoff-text">
        <div class="uat-signoff-title">UAT ${p.signoff.status === 'approved' ? 'Approved' : 'Rejected'} by ${esc(p.signoff.signedBy)}</div>
        <div class="uat-signoff-sub">${p.signoff.comment ? esc(p.signoff.comment) + ' · ' : ''}${relTime(p.signoff.signedAt)}</div>
      </div>`;
  }

  function renderTCToolbar() {
    const tcs = state.testcases;
    const areas = [...new Set(tcs.map(t => t.processArea).filter(Boolean))];
    const ps = el('uatTCFilterProcess');
    if (ps) {
      ps.innerHTML = '<option value="">All Process Areas</option>' +
        areas.map(a => `<option value="${a}">${a}</option>`).join('');
      ps.value = state.filterProcess;
    }
    const ss = el('uatTCFilterStatus'); if (ss) ss.value = state.filterStatus;
    const pr = el('uatTCFilterPriority'); if (pr) pr.value = state.filterPriority;
    const q = el('uatTCSearch'); if (q) q.value = state.filterQ;
  }

  function filteredTCs() {
    return state.testcases.filter(t => {
      if (state.filterStatus && t.status !== state.filterStatus) return false;
      if (state.filterPriority && t.priority !== state.filterPriority) return false;
      if (state.filterProcess && t.processArea !== state.filterProcess) return false;
      if (state.filterQ) {
        const q = state.filterQ.toLowerCase();
        if (!(t.testScenario || '').toLowerCase().includes(q) &&
            !(t.module || '').toLowerCase().includes(q) &&
            !(t.processArea || '').toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }

  function renderTestcases() {
    const tcs = filteredTCs();
    const wrap = el('uatTCTableBody');
    updateBulkBar();

    if (!tcs.length) {
      wrap.innerHTML = `<tr><td colspan="9" style="text-align:center;padding:40px">
        <div class="uat-text-muted">No test cases match current filters</div>
      </td></tr>`;
      return;
    }

    wrap.innerHTML = tcs.map(tc => {
      const sel = state.selectedTCs.has(tc.id);
      const hasIssue = state.issues.find(i => i.testCaseId === tc.id && ['open','in_progress'].includes(i.status));
      return `<tr class="${sel ? 'selected' : ''}">
        <td><input type="checkbox" class="uat-checkbox" ${sel ? 'checked' : ''} onchange="UAT.toggleTCSelect('${tc.id}',this.checked)"></td>
        <td class="uat-text-muted" style="font-family:'DM Mono',monospace;font-size:11px">${tc.seq}</td>
        <td><span class="uat-chip">${esc(tc.processArea||'—')}</span></td>
        <td class="uat-text-muted">${esc(tc.module||'—')}</td>
        <td class="uat-tc-scenario">
          <div class="uat-tc-scenario-text" onclick="UAT.openTCDetail('${tc.id}')">${esc(tc.testScenario||'Untitled')}</div>
          ${hasIssue ? '<div style="margin-top:3px"><span class="uat-chip" style="background:#fef2f2;border-color:#fca5a5;color:#dc2626;font-size:10px">⚠ Issue open</span></div>' : ''}
        </td>
        <td>${statusBadge(tc.status)}</td>
        <td>${prioBadge(tc.priority)}</td>
        <td class="uat-text-muted">${esc(tc.assignee||'—')}</td>
        <td>
          <div style="display:flex;gap:4px">
            <button class="uat-btn-icon" title="Edit" onclick="UAT.openTCModal('${tc.id}')">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
            </button>
            <button class="uat-btn-icon" title="Open detail" onclick="UAT.openTCDetail('${tc.id}')">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
            </button>
          </div>
        </td>
      </tr>`;
    }).join('');
  }

  function toggleTCSelect(id, checked) {
    if (checked) state.selectedTCs.add(id); else state.selectedTCs.delete(id);
    updateBulkBar();
    renderTestcases();
  }

  function toggleAllTCs(checked) {
    if (checked) filteredTCs().forEach(t => state.selectedTCs.add(t.id));
    else state.selectedTCs.clear();
    updateBulkBar();
    renderTestcases();
  }

  function updateBulkBar() {
    const bar = el('uatBulkBar');
    if (!bar) return;
    const cnt = state.selectedTCs.size;
    if (cnt) {
      bar.classList.add('visible');
      el('uatBulkCount').textContent = `${cnt} test${cnt>1?'s':''} selected`;
    } else {
      bar.classList.remove('visible');
    }
  }

  async function bulkUpdate(status) {
    if (!state.selectedTCs.size) return;
    const r = await api('POST', '/api/uat/testcases/bulk', { ids: [...state.selectedTCs], status });
    if (!r.ok) return toast('Failed', 'error');
    toast(`Updated ${state.selectedTCs.size} tests to ${status}`);
    state.selectedTCs.clear();
    loadTestcases();
  }

  function openTCModal(id) {
    const tc = id ? state.testcases.find(x => x.id === id) : null;
    el('uatTCModalTitle').textContent = tc ? 'Edit Test Case' : 'New Test Case';
    el('uatTCForm').reset();
    if (tc) {
      el('uatTCFormId').value = tc.id;
      el('uatTCFormProcessArea').value = tc.processArea || '';
      el('uatTCFormModule').value = tc.module || '';
      el('uatTCFormScenario').value = tc.testScenario || '';
      el('uatTCFormSteps').value = tc.steps || '';
      el('uatTCFormExpected').value = tc.expectedResult || '';
      el('uatTCFormActual').value = tc.actualResult || '';
      el('uatTCFormStatus').value = tc.status || 'not_started';
      el('uatTCFormPriority').value = tc.priority || 'medium';
      el('uatTCFormAssignee').value = tc.assignee || '';
      el('uatTCFormTestedBy').value = tc.testedBy || '';
      el('uatTCFormExecDate').value = tc.executionDate || '';
    } else {
      el('uatTCFormId').value = '';
    }
    el('uatTCModal').classList.add('open');
  }

  function closeTCModal() { el('uatTCModal').classList.remove('open'); }

  async function saveTCModal() {
    const id = el('uatTCFormId').value;
    const body = {
      projectId: state.activeProjectId,
      clientId: state.activeClientId,
      processArea: el('uatTCFormProcessArea').value.trim(),
      module: el('uatTCFormModule').value.trim(),
      testScenario: el('uatTCFormScenario').value.trim(),
      steps: el('uatTCFormSteps').value.trim(),
      expectedResult: el('uatTCFormExpected').value.trim(),
      actualResult: el('uatTCFormActual').value.trim(),
      status: el('uatTCFormStatus').value,
      priority: el('uatTCFormPriority').value,
      assignee: el('uatTCFormAssignee').value.trim(),
      testedBy: el('uatTCFormTestedBy').value.trim(),
      executionDate: el('uatTCFormExecDate').value,
    };
    if (!body.testScenario) return toast('Test scenario is required', 'error');
    const r = id
      ? await api('PUT', `/api/uat/testcases/${id}`, body)
      : await api('POST', '/api/uat/testcases', body);
    if (!r.ok) return toast(r.error || 'Failed', 'error');
    toast(id ? 'Test case updated' : 'Test case created');
    closeTCModal();
    loadTestcases();
  }

  /* ── Test case detail drawer ─────────────────────────────────────────── */
  function openTCDetail(id) {
    const tc = state.testcases.find(x => x.id === id);
    if (!tc) return;
    state.activeTestCase = tc;
    const d = el('uatDrawer');
    renderTCDetail(tc);
    el('uatDrawerBackdrop').classList.add('open');
    d.classList.add('open');
  }

  function closeTCDetail() {
    el('uatDrawerBackdrop').classList.remove('open');
    el('uatDrawer').classList.remove('open');
    state.activeTestCase = null;
  }

  function renderTCDetail(tc) {
    el('uatDrawerTitle').textContent = tc.testScenario || 'Test Case';
    el('uatDrawerSub').innerHTML = `<span class="uat-chip" style="font-family:'DM Mono',monospace">TC-${String(tc.seq).padStart(3,'0')}</span> ${statusBadge(tc.status)} ${prioBadge(tc.priority)}`;

    const statusOpts = ['not_started','in_progress','passed','failed','blocked','retest']
      .map(s => `<option value="${s}" ${tc.status===s?'selected':''}>${s.replace('_',' ')}</option>`).join('');

    el('uatDrawerContent').innerHTML = `
      <div class="uat-detail-grid">
        <div class="uat-detail-item"><div class="uat-detail-label">Process Area</div><div class="uat-detail-value">${esc(tc.processArea)||'—'}</div></div>
        <div class="uat-detail-item"><div class="uat-detail-label">Module</div><div class="uat-detail-value">${esc(tc.module)||'—'}</div></div>
        <div class="uat-detail-item"><div class="uat-detail-label">Assignee</div><div class="uat-detail-value">${esc(tc.assignee)||'—'}</div></div>
        <div class="uat-detail-item"><div class="uat-detail-label">Tested By</div><div class="uat-detail-value">${esc(tc.testedBy)||'—'}</div></div>
        <div class="uat-detail-item"><div class="uat-detail-label">Execution Date</div><div class="uat-detail-value">${tc.executionDate||'—'}</div></div>
        <div class="uat-detail-item"><div class="uat-detail-label">Round</div><div class="uat-detail-value">${tc.round||1}</div></div>
      </div>

      <div style="margin-bottom:14px">
        <div class="uat-detail-label" style="margin-bottom:6px">Quick status update</div>
        <div style="display:flex;gap:6px;flex-wrap:wrap">
          ${['not_started','in_progress','passed','failed','blocked','retest'].map(s =>
            `<button class="uat-btn uat-btn-sm uat-btn-${tc.status===s?'primary':'ghost'}" onclick="UAT.quickStatus('${tc.id}','${s}')">${s.replace('_',' ')}</button>`
          ).join('')}
        </div>
      </div>

      <div class="uat-divider"></div>

      <div style="margin-bottom:14px">
        <div class="uat-detail-label" style="margin-bottom:4px">Test Scenario</div>
        <div style="font-size:13px;color:#0d1117;line-height:1.6">${esc(tc.testScenario)}</div>
      </div>
      ${tc.steps ? `<div style="margin-bottom:14px"><div class="uat-detail-label" style="margin-bottom:4px">Steps</div><div style="font-size:13px;color:#374151;white-space:pre-wrap;line-height:1.6">${esc(tc.steps)}</div></div>` : ''}
      <div style="margin-bottom:14px">
        <div class="uat-detail-label" style="margin-bottom:4px">Expected Result</div>
        <div style="font-size:13px;color:#374151;line-height:1.6">${esc(tc.expectedResult)||'—'}</div>
      </div>
      <div style="margin-bottom:14px">
        <div class="uat-detail-label" style="margin-bottom:4px">Actual Result</div>
        <textarea class="uat-form-control" id="uatDrawerActual" rows="3" placeholder="Enter actual result after testing...">${esc(tc.actualResult||'')}</textarea>
      </div>

      <div class="uat-divider"></div>

      <div class="uat-comments">
        <div class="uat-detail-label" style="margin-bottom:10px">Comments & Collaboration</div>
        <div class="uat-comments-list" id="uatCommentsContainer">
          ${(tc.comments || []).map(c => `
            <div class="uat-comment">
              <div class="uat-comment-avatar ${c.role==='client'?'client':''}">${initials(c.author)}</div>
              <div class="uat-comment-bubble">
                <div class="uat-comment-meta">
                  <span class="uat-comment-author">${esc(c.author)}</span>
                  <span class="uat-comment-role ${c.role==='client'?'client':''}">${c.role}</span>
                  <span class="uat-comment-time">${relTime(c.createdAt)}</span>
                </div>
                ${esc(c.text)}
              </div>
            </div>`).join('') || '<div class="uat-text-muted">No comments yet</div>'}
        </div>
        <div class="uat-comment-input">
          <textarea id="uatNewComment" placeholder="Add a comment..."></textarea>
          <button class="uat-btn uat-btn-primary uat-btn-sm" onclick="UAT.addComment()">Send</button>
        </div>
      </div>

      <div class="uat-divider"></div>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <button class="uat-btn uat-btn-secondary uat-btn-sm" onclick="UAT.openIssueFromTC('${tc.id}')">
          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
          Raise Issue
        </button>
        <button class="uat-btn uat-btn-secondary uat-btn-sm" onclick="UAT.saveActualResult('${tc.id}')">Save Actual Result</button>
        <button class="uat-btn uat-btn-danger uat-btn-sm" onclick="UAT.deleteTC('${tc.id}')">Delete</button>
      </div>`;
  }

  async function quickStatus(tcId, status) {
    const r = await api('PUT', `/api/uat/testcases/${tcId}`, { status });
    if (!r.ok) return toast('Failed', 'error');
    toast(`Status → ${status}`);
    const tc = state.testcases.find(x => x.id === tcId);
    if (tc) tc.status = status;
    state.activeTestCase = r.data;
    renderTCDetail(r.data);
    renderTestcases();
  }

  async function saveActualResult(tcId) {
    const actual = el('uatDrawerActual').value.trim();
    const r = await api('PUT', `/api/uat/testcases/${tcId}`, { actualResult: actual });
    if (!r.ok) return toast('Failed', 'error');
    toast('Actual result saved');
    const tc = state.testcases.find(x => x.id === tcId);
    if (tc) tc.actualResult = actual;
  }

  async function addComment() {
    const tc = state.activeTestCase;
    if (!tc) return;
    const text = (el('uatNewComment').value || '').trim();
    if (!text) return;
    const u = JSON.parse(localStorage.getItem('kb_user') || '{}');
    const r = await api('POST', `/api/uat/testcases/${tc.id}/comments`, {
      author: u.name || 'Team', role: 'internal', text,
    });
    if (!r.ok) return toast('Failed', 'error');
    el('uatNewComment').value = '';
    tc.comments.push(r.data);
    const container = el('uatCommentsContainer');
    const div = document.createElement('div');
    div.className = 'uat-comment';
    div.innerHTML = `
      <div class="uat-comment-avatar">${initials(r.data.author)}</div>
      <div class="uat-comment-bubble">
        <div class="uat-comment-meta">
          <span class="uat-comment-author">${esc(r.data.author)}</span>
          <span class="uat-comment-role">${r.data.role}</span>
          <span class="uat-comment-time">just now</span>
        </div>
        ${esc(r.data.text)}
      </div>`;
    if (container.querySelector('.uat-text-muted')) container.innerHTML = '';
    container.appendChild(div);
  }

  async function deleteTC(id) {
    if (!confirm('Delete this test case?')) return;
    const r = await api('DELETE', `/api/uat/testcases/${id}`);
    if (!r.ok) return toast('Failed', 'error');
    toast('Test case deleted');
    closeTCDetail();
    loadTestcases();
  }

  /* ══════════════════════════════════════════════════════════════════════
     ISSUES
  ══════════════════════════════════════════════════════════════════════ */
  function openIssueFromTC(tcId) {
    const tc = state.testcases.find(x => x.id === tcId);
    if (tc) {
      el('uatIssueFormTCRef').value = tcId;
      el('uatIssueFormTitle').value = `Issue with: ${tc.testScenario.slice(0, 60)}`;
    }
    closeTCDetail();
    showView('issues');
    loadIssues();
    el('uatIssueModal').classList.add('open');
  }

  async function loadIssues() {
    const url = state.activeProjectId
      ? `/api/uat/issues?projectId=${state.activeProjectId}`
      : '/api/uat/issues';
    const r = await api('GET', url);
    if (!r.ok) return;
    state.issues = r.data;
    renderIssues();
  }

  function renderIssues() {
    const issues = state.issues;
    const wrap = el('uatIssuesBody');
    if (!issues.length) {
      wrap.innerHTML = `<div class="uat-empty">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" width="48" height="48"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
        <div class="uat-empty-title">No issues found</div>
        <div class="uat-empty-sub">All test cases are clean</div>
      </div>`;
      return;
    }
    wrap.innerHTML = `<div class="uat-table-wrap"><table class="uat-table">
      <thead><tr>
        <th>Ref</th><th>Title</th><th>Severity</th><th>Status</th><th>Assigned To</th><th>Created</th><th></th>
      </tr></thead>
      <tbody>${issues.map(i => `
        <tr>
          <td style="font-family:'DM Mono',monospace;font-size:11px;color:#6b7280">${esc(i.ref||'')}</td>
          <td style="font-weight:600;color:#0d1117;max-width:280px">${esc(i.title)}</td>
          <td>${prioBadge(i.severity)}</td>
          <td>${statusBadge(i.status)}</td>
          <td class="uat-text-muted">${esc(i.assignedTo||'—')}</td>
          <td class="uat-text-muted">${relTime(i.createdAt)}</td>
          <td>
            <select class="uat-filter-select" style="font-size:11px;padding:3px 6px" onchange="UAT.updateIssueStatus('${i.id}',this.value)">
              ${['open','in_progress','resolved','closed','wont_fix'].map(s => `<option value="${s}" ${i.status===s?'selected':''}>${s.replace('_',' ')}</option>`).join('')}
            </select>
          </td>
        </tr>`).join('')}
      </tbody>
    </table></div>`;
  }

  function openIssueModal() {
    el('uatIssueForm').reset();
    el('uatIssueFormTCRef').value = '';
    el('uatIssueModal').classList.add('open');
  }
  function closeIssueModal() { el('uatIssueModal').classList.remove('open'); }

  async function saveIssue() {
    const body = {
      testCaseId: el('uatIssueFormTCRef').value || undefined,
      projectId: state.activeProjectId,
      clientId: state.activeClientId,
      title: el('uatIssueFormTitle').value.trim(),
      description: el('uatIssueFormDesc').value.trim(),
      severity: el('uatIssueFormSeverity').value,
      assignedTo: el('uatIssueFormAssignee').value.trim(),
    };
    if (!body.title) return toast('Title is required', 'error');
    const r = await api('POST', '/api/uat/issues', body);
    if (!r.ok) return toast(r.error || 'Failed', 'error');
    toast('Issue raised');
    closeIssueModal();
    loadIssues();
  }

  async function updateIssueStatus(id, status) {
    const r = await api('PUT', `/api/uat/issues/${id}`, { status });
    if (!r.ok) return toast('Failed', 'error');
    const iss = state.issues.find(i => i.id === id);
    if (iss) iss.status = status;
    toast(`Issue ${status}`);
  }

  /* ══════════════════════════════════════════════════════════════════════
     SIGN-OFF
  ══════════════════════════════════════════════════════════════════════ */
  function openSignoffModal() {
    el('uatSignoffModal').classList.add('open');
  }
  function closeSignoffModal() { el('uatSignoffModal').classList.remove('open'); }

  async function submitSignoff(approve) {
    const r = await api('POST', `/api/uat/projects/${state.activeProjectId}/signoff`, {
      approve, signedBy: el('uatSignoffBy').value.trim() || 'Client',
      comment: el('uatSignoffComment').value.trim(),
    });
    if (!r.ok) return toast('Failed', 'error');
    toast(`UAT ${approve ? 'approved' : 'rejected'}`);
    closeSignoffModal();
    const p = state.projects.find(x => x.id === state.activeProjectId);
    if (p) Object.assign(p, r.data);
    renderSignoffBanner(r.data);
    loadDashboard();
  }

  /* ══════════════════════════════════════════════════════════════════════
     EXPORT
  ══════════════════════════════════════════════════════════════════════ */
  function exportCSV() {
    if (!state.activeProjectId) return toast('Select a project first', 'error');
    window.open(`/api/uat/export/${state.activeProjectId}`, '_blank');
  }

  /* ══════════════════════════════════════════════════════════════════════
     CLIENT PORTAL
  ══════════════════════════════════════════════════════════════════════ */
  async function generatePortalLink() {
    const sel = el('uatPortalClientSel');
    const clientId = (sel && sel.value) || state.activeClientId;
    if (!clientId) return toast('Select a client first', 'error');
    const r = await api('POST', '/api/uat/portal/generate', { clientId });
    if (!r.ok) return toast('Failed', 'error');
    const link = `${location.origin}/portal/${r.token}`;
    el('uatPortalLinkInput').value = link;
    el('uatPortalLinkWrap').classList.remove('uat-hidden');
    toast('Portal link generated');
  }

  function copyPortalLink() {
    const v = el('uatPortalLinkInput').value;
    navigator.clipboard.writeText(v).then(() => toast('Copied to clipboard'));
  }

  /* ══════════════════════════════════════════════════════════════════════
     REPOSITORY
  ══════════════════════════════════════════════════════════════════════ */
  async function searchRepo() {
    const q = el('uatRepoSearch').value.trim();
    const pa = el('uatRepoFilterPA').value;
    const url = `/api/uat/repository?q=${encodeURIComponent(q)}&processArea=${encodeURIComponent(pa)}`;
    const r = await api('GET', url);
    if (!r.ok) return;
    state.repoResults = r.data;
    renderRepoResults();
  }

  function renderRepoResults() {
    const wrap = el('uatRepoResults');
    const tcs = state.repoResults;
    if (!tcs.length) {
      wrap.innerHTML = '<div class="uat-text-muted" style="padding:20px 0">No results found</div>';
      return;
    }
    wrap.innerHTML = tcs.map(t => `
      <div class="uat-repo-item">
        <div class="uat-repo-scenario">${esc(t.testScenario)}</div>
        <div class="uat-repo-meta">
          <span>${esc(t.processArea||'—')}</span>
          <span>${esc(t.module||'—')}</span>
          <span>Client: ${esc(t.clientName||'—')}</span>
          <span>Project: ${esc(t.projectName||'—')}</span>
          ${prioBadge(t.priority)}
        </div>
        ${t.expectedResult ? `<div style="font-size:12px;color:#374151;margin-top:6px">${esc(t.expectedResult.slice(0,100))}${t.expectedResult.length>100?'…':''}</div>` : ''}
      </div>`).join('');
  }

  /* ══════════════════════════════════════════════════════════════════════
     TEMPLATES
  ══════════════════════════════════════════════════════════════════════ */
  async function loadTemplates() {
    const r = await api('GET', '/api/uat/templates');
    if (!r.ok) return;
    renderTemplates(r.data);
  }

  function renderTemplates(templates) {
    const wrap = el('uatTemplatesBody');
    if (!templates.length) {
      wrap.innerHTML = `<div class="uat-empty">
        <div class="uat-empty-title">No templates yet</div>
        <div class="uat-empty-sub">Save a completed UAT project as a template to reuse it</div>
      </div>`;
      return;
    }
    wrap.innerHTML = templates.map(t => `
      <div class="uat-repo-item">
        <div style="display:flex;align-items:center;justify-content:space-between">
          <div class="uat-repo-scenario">${esc(t.name)}</div>
          <button class="uat-btn uat-btn-secondary uat-btn-sm" onclick="UAT.openCloneModal('${t.id}','${esc(t.name)}')">Clone to Project</button>
        </div>
        <div class="uat-repo-meta">
          <span>From: ${esc(t.sourceClientName||'—')}</span>
          <span>${t.testcases.length} test cases</span>
          ${t.processAreas.map(a => `<span class="uat-chip">${a}</span>`).join('')}
        </div>
      </div>`).join('');
  }

  async function saveAsTemplate() {
    if (!state.activeProjectId) return toast('Open a project first', 'error');
    const name = prompt('Template name:');
    if (!name) return;
    const r = await api('POST', '/api/uat/templates', { name, sourceProjectId: state.activeProjectId });
    if (!r.ok) return toast('Failed', 'error');
    toast('Template saved');
  }

  function openCloneModal(templateId, name) {
    el('uatCloneTemplateId').value = templateId;
    el('uatCloneTemplateName').textContent = name;
    el('uatCloneProjectId').innerHTML = '<option value="">Select project...</option>' +
      state.projects.map(p => {
        const c = state.clients.find(x => x.id === p.clientId);
        return `<option value="${p.id}" data-client="${p.clientId}">${c ? c.name + ' · ' : ''}${p.name}</option>`;
      }).join('');
    el('uatCloneModal').classList.add('open');
  }
  function closeCloneModal() { el('uatCloneModal').classList.remove('open'); }

  async function cloneTemplate() {
    const templateId = el('uatCloneTemplateId').value;
    const sel = el('uatCloneProjectId');
    const projectId = sel.value;
    const clientId = sel.options[sel.selectedIndex]?.dataset.client;
    if (!projectId) return toast('Select a project', 'error');
    const r = await api('POST', `/api/uat/templates/${templateId}/clone`, { projectId, clientId });
    if (!r.ok) return toast('Failed', 'error');
    toast(`Cloned ${r.data.count} test cases`);
    closeCloneModal();
  }

  /* ── XSS escape ──────────────────────────────────────────────────────── */
  function esc(s) {
    return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  /* ── Filter wiring ───────────────────────────────────────────────────── */
  function bindFilters() {
    const search = el('uatTCSearch');
    if (search) {
      let tid; search.addEventListener('input', () => {
        clearTimeout(tid); tid = setTimeout(() => { state.filterQ = search.value; renderTestcases(); }, 250);
      });
    }
    const ss = el('uatTCFilterStatus');
    if (ss) ss.addEventListener('change', () => { state.filterStatus = ss.value; renderTestcases(); });
    const sp = el('uatTCFilterPriority');
    if (sp) sp.addEventListener('change', () => { state.filterPriority = sp.value; renderTestcases(); });
    const spr = el('uatTCFilterProcess');
    if (spr) spr.addEventListener('change', () => { state.filterProcess = spr.value; renderTestcases(); });

    const clientSel = el('uatClientSel');
    if (clientSel) clientSel.addEventListener('change', e => {
      const v = e.target.value;
      state.activeClientId = v || null;
      if (state.view === 'projects') loadProjects(v || null);
      if (state.view === 'testcases') {
        state.activeProjectId = null;
        loadTestcases();
      }
    });

    // Repo search
    const rs = el('uatRepoSearch');
    if (rs) rs.addEventListener('keydown', e => { if (e.key === 'Enter') searchRepo(); });
  }

  /* ── Init ────────────────────────────────────────────────────────────── */
  function init() {
    bindFilters();
    // Nav clicks
    qsa('.uat-nav-item').forEach(item => {
      item.addEventListener('click', () => {
        const v = item.dataset.view;
        if (!v) return;
        showView(v);
        if (v === 'dashboard') loadDashboard();
        if (v === 'clients') { loadClients(); }
        if (v === 'projects') loadProjects(state.activeClientId);
        if (v === 'testcases') loadTestcases();
        if (v === 'issues') loadIssues();
        if (v === 'templates') loadTemplates();
        if (v === 'repository') { searchRepo(); }
        if (v === 'portal') { }
      });
    });
  }

  return {
    open, close, init, showView, goProject,
    selectClient, openClientModal, closeClientModal, saveClient,
    openProjectModal, closeProjectModal, saveProject,
    openTCModal, closeTCModal, saveTCModal,
    openTCDetail, closeTCDetail, quickStatus, saveActualResult, addComment, deleteTC, toggleTCSelect, toggleAllTCs,
    bulkUpdate,
    openIssueModal, closeIssueModal, saveIssue, updateIssueStatus, openIssueFromTC,
    openSignoffModal, closeSignoffModal, submitSignoff,
    exportCSV, generatePortalLink, copyPortalLink,
    searchRepo, saveAsTemplate, openCloneModal, closeCloneModal, cloneTemplate,
    loadTemplates,
  };
})();

document.addEventListener('DOMContentLoaded', () => UAT.init());
