'use strict';
/* ════════════════════════════════════════════════
   PEAK POTENTIA — AP (Advanced Placement) TEACHER PORTAL
════════════════════════════════════════════════ */
const SUPABASE_URL = 'https://zvmyzmkpuogbehgczuya.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp2bXl6bWtwdW9nYmVoZ2N6dXlhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkzNzc3MDEsImV4cCI6MjEwNDk1MzcwMX0.1MyE--706374FzF7wfMBA4X0XXsGwi5SVSnZv8Wb8SM';
const IS_LIVE = true;
const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const AP_MODULES = ['Module 1', 'Module 2', 'Module 3', 'Module 4', 'Module 5', 'Module 6'];
const UNASSIGNED_MODULE = 'Unassigned / General';

function moduleLabel(m) {
  return (m && AP_MODULES.includes(m)) ? m : UNASSIGNED_MODULE;
}

let TEACHER = null,
  SUBJECTS = [],
  CURR = null;
let CUR_STUDENTS = [],
  CUR_ASSIGNS = [],
  CUR_SUBS = {},
  SEL_ASSIGN = null,
  SEL_MODULE = 'overview',
  ASSIGN_SUB_COUNT = {},
  ROSTER_OPEN = false;
const AVC = ['#2454c7', '#3d6ae0', '#1f8a52', '#b25e18', '#c23b34', '#5a4fb8'];
let _srvBlobUrl = null;

function parseFees(fees) {
  if (!fees) return [];
  if (typeof fees === 'string') {
    try {
      fees = JSON.parse(fees);
    } catch {
      return [];
    }
  }
  return Array.isArray(fees) ? fees : [];
}

function _feeMatchOne(val, target) {
  if (val == null || val === '') return true;
  const list = String(val).split(',').map(x => x.trim().toLowerCase());
  if (list.includes('all')) return true;
  return list.includes((target || '').toString().trim().toLowerCase());
}

function feeMatches(entry, grade, board) {
  return _feeMatchOne(entry.grade, grade) && _feeMatchOne(entry.board, board);
}

function feeNum(entry, classType) {
  if (!entry) return 0;
  const keys = classType === 'individual' ? ['individual_fee', 'individual-fee', 'individualFee', 'fee_individual', 'individual'] : ['group_fee', 'group-fee', 'groupFee', 'fee_group', 'group'];
  for (const k of keys) {
    if (entry[k] != null) return Number(entry[k]) || 0;
  }
  return 0;
}
function getSubjectFee(subject, classType = 'group', grade = null, board = null) {
  if (!subject) return 0;
  const fees = parseFees(subject.fees);
  if (!fees.length) return 0;
  let entry = null;
  if (grade != null || board != null) entry = fees.find(f => feeMatches(f, grade, board));
  if (!entry) entry = fees[0];
  return feeNum(entry, classType);
}
function subjectScopeLabel(subject) {
  const fees = parseFees(subject && subject.fees);
  if (!fees.length) return '—';
  const combos = fees.map(f => ((f.board || 'All') + ' ' + (f.grade || 'All')).trim());
  return [...new Set(combos)].join(', ');
}
function subjectFirstBoard(subject) {
  const fees = parseFees(subject && subject.fees);
  return fees.length ? (fees[0].board || '') : '';
}

function parseProfileSubjects(subs) {
  if (!subs) return [];
  if (typeof subs === 'string') {
    try {
      subs = JSON.parse(subs);
    } catch {
      subs = subs.split(',').map(x => x.trim());
    }
  }
  if (!Array.isArray(subs)) return [];
  return subs.map(item => {
    if (item && typeof item === 'object') {
      return {
        name: String(item.name || item.subject || '').trim(),
        type: String(item.type || item.class_type || '').trim().toLowerCase()
      };
    }
    return {
      name: String(item).trim(),
      type: ''
    };
  }).filter(x => x.name);
}
function profileSubjectEntry(profileSubjects, subject) {
  const list = parseProfileSubjects(profileSubjects);
  const sn = (subject.name || '').trim().toLowerCase();
  const sc = (subject.code || '').trim().toLowerCase();
  return list.find(x => {
    const n = x.name.toLowerCase();
    return n === sn || (sc && n === sc);
  }) || null;
}

function normClassType(raw) {
  return /ind|1|one/.test(String(raw || '').toLowerCase()) ? 'individual' : 'group';
}
function assignmentInScope(a, grade, board) {
  const ag = a.grade,
    ab = a.board;
  const noScope = (ag == null || ag === '') && (ab == null || ab === '');
  if (noScope) return true;
  return _feeMatchOne(ag, grade) && _feeMatchOne(ab, board);
}
function avgPercent(rows, maxMap) {
  const pcts = [];
  (rows || []).forEach(r => {
    const score = Number(r.student_score);
    if (isNaN(score)) return;
    const max = Number(maxMap[(r.name || '').trim()]) || 0;
    pcts.push(max > 0 ? (score / max) * 100 : score);
  });
  return pcts.length ? Math.round(pcts.reduce((a, b) => a + b, 0) / pcts.length) : null;
}

function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  window.scrollTo(0, 0);
}

function fmtDate(d) {
  if (!d) return '—';
  try {
    return new Date(d).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  } catch {
    return d;
  }
}

function ini(n) {
  return (n || '').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || '?';
}

function bc(b) {
  const l = (b || '').toLowerCase();
  if (l === 'ap') return 'ib';
  if (l === 'ib') return 'ib';
  if (l === 'icse' || l === 'isc') return 'icse';
  return 'cbse';
}
let _tt;

function toast(m, t = 'ok') {
  const el = document.getElementById('toast');
  el.textContent = m;
  el.className = `show ${t}`;
  clearTimeout(_tt);
  _tt = setTimeout(() => el.className = '', 3500);
}

function setTopbars() {
  if (!TEACHER) return;
  const n = TEACHER.full_name || TEACHER.username;
  const r = `AP Faculty · ID: ${TEACHER.employee_id || 'TCH-0001'}`;
  const av = ini(n);
  ['d-uname', 'd2-uname'].forEach(id => {
    const e = document.getElementById(id);
    if (e) e.textContent = n;
  });
  ['d-urole', 'd2-urole'].forEach(id => {
    const e = document.getElementById(id);
    if (e) e.textContent = r;
  });
  ['d-uav', 'd2-uav'].forEach(id => {
    const e = document.getElementById(id);
    if (e) e.textContent = av;
  });
}

function _(id) {
  return document.getElementById(id);
}

function setTxt(id, v) {
  const e = _(id);
  if (e) e.innerHTML = String(v);
}

function setW(id, w) {
  const e = _(id);
  if (e) e.style.width = w;
}

window.addEventListener('load', async () => {
  const s = sessionStorage.getItem('pp_ap_teacher');
  if (s) {
    try {
      TEACHER = JSON.parse(s);
      await loadDashboard();
    } catch {
      sessionStorage.removeItem('pp_ap_teacher');
      showScreen('s-login');
    }
  } else showScreen('s-login');
});

async function doLogin() {
  const u = _('t-user').value.trim(),
    p = _('t-pass').value;
  const btn = _('login-btn'),
    err = _('login-err');
  err.style.display = 'none';
  if (!u || !p) {
    err.textContent = 'Please enter both username and password.';
    err.style.display = 'block';
    return;
  }
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span>Signing in…';
  try {
    if (!IS_LIVE) {
      toast('⚠ Supabase is not connected. Please use live login.', 'err');
      btn.disabled = false;
      btn.textContent = 'Sign In to Portal →';
      return;
    }
    const {
      data,
      error
    } = await sb.rpc('teacher_login', {
      p_username: u,
      p_password: p
    });
    if (error) throw error;
    if (!data || !data.success) {
      err.textContent = '⚠ ' + (data?.message || 'Invalid username or password');
      err.style.display = 'block';
      return;
    }
    TEACHER = data;
    sessionStorage.setItem('pp_ap_teacher', JSON.stringify(TEACHER));
    await loadDashboard();
  } catch (e) {
    err.textContent = '⚠ ' + (e.message || 'Login failed');
    err.style.display = 'block';
  } finally {
    btn.disabled = false;
    btn.textContent = 'Sign In to Portal →';
  }
}

function doLogout() {
  sessionStorage.removeItem('pp_ap_teacher');
  TEACHER = null;
  SUBJECTS = [];
  CURR = null;
  showScreen('s-login');
}

let TEACHER_WORKSHEETS = [];

async function loadDashboard() {
  setTopbars();
  setTxt('dash-name', TEACHER.full_name);
  showScreen('s-dash');
  loadNotices();
  if (!IS_LIVE) {
    toast('⚠ Unable to connect to Supabase.', 'err');
    return;
  }
  setTxt('dash-sub', 'Loading your AP subjects…');
  TEACHER_WORKSHEETS = [];

  const {
    data: allSubs,
    error
  } = await sb.from('subjects').select('*');
  if (error) {
    toast('Error: ' + error.message, 'err');
    return;
  }
  const tLower = (TEACHER.full_name || '').toLowerCase().trim();
  const subs = (allSubs || []).filter(s => (s.teacher || '').toLowerCase().trim() === tLower);
  if (!subs || !subs.length) {
    _('curr-grid').innerHTML = '<div style="grid-column:1/-1;padding:48px 32px;text-align:center;color:var(--muted)"><div style="font-size:28px;margin-bottom:14px">📚</div><div style="font-size:16px;font-weight:600;color:var(--cream);margin-bottom:10px">No AP subjects assigned yet</div></div>';
    updateStats([]);
    return;
  }

  const {
    data: allProfiles
  } = await sb
    .from('profiles')
    .select('id, full_name, username, roll_number, class, board, subjects, preferred_class_type');

  const cards = [];
  for (const s of subs) {
    const enrolledProfiles = (allProfiles || []).map(p => {
      const entry = profileSubjectEntry(p.subjects, s);
      if (!entry) return null;
      const ct = normClassType(entry.type || p.preferred_class_type || 'group');
      return {
        ...p,
        _class_type: ct
      };
    }).filter(Boolean);

    const [{
        data: scores
      },
      {
        data: pubAssigns
      }
    ] = await Promise.all([
      sb.from('assessments').select('student_id, student_score, name').eq('subject_id', s.id),
      sb.from('assignments').select('*').eq('subject_id', s.id).eq('status', 'published'),
    ]);

    const maxMap = {};
    (pubAssigns || []).forEach(a => {
      maxMap[(a.title || '').trim()] = Number(a.max_score) || 0;
    });

    if (pubAssigns && pubAssigns.length) {
      const ids = pubAssigns.map(a => a.id).filter(Boolean);
      let subCount = {};
      if (ids.length) {
        const { data: subsForAssigns } = await sb.from('assignment_submissions').select('assignment_id').in('assignment_id', ids);
        (subsForAssigns || []).forEach(x => { subCount[x.assignment_id] = (subCount[x.assignment_id] || 0) + 1; });
      }
      const totalStudentsForSubject = enrolledProfiles.length;
      pubAssigns.forEach(a => {
        TEACHER_WORKSHEETS.push({ subject: s, assignment: a, submittedCount: subCount[a.id] || 0, totalStudents: totalStudentsForSubject });
      });
    }

    const fees = parseFees(s.fees);
    const combos = fees.length ? fees : [{
      grade: null,
      board: null,
      _all: true
    }];

    combos.forEach(combo => {
      const inCombo = combo._all ? enrolledProfiles : enrolledProfiles.filter(p =>
        feeMatches(combo, p.class, p.board)
      );
      const studentIds = new Set(inCombo.map(p => p.id));

      const active = inCombo.length;
      const pending = 0;

      const comboScores = (scores || []).filter(r => studentIds.has(r.student_id));
      const avg = avgPercent(comboScores, maxMap) || 0;

      const aCount = combo._all ?
        (pubAssigns || []).length :
        (pubAssigns || []).filter(a => assignmentInScope(a, combo.grade, combo.board)).length;

      const scopeLabel = combo._all ?
        subjectScopeLabel(s) :
        ((combo.board || 'All') + ' ' + (combo.grade || 'All')).trim();

      cards.push({
        ...s,
        _cardId: s.id + '||' + (combo.grade || '') + '||' + (combo.board || ''),
        _grade: combo.grade || null,
        _board: combo.board || null,
        _scope: scopeLabel,
        _tot: inCombo.length,
        _active: active,
        _pending: pending,
        _avg: avg,
        _asgn: aCount || 0,
        _students: inCombo
      });
    });
  }
  SUBJECTS = cards;
  renderDashboard();
}

function renderDashboard() {
  setTopbars();
  updateStats(SUBJECTS);
  renderCurrGrid(SUBJECTS);
  renderTeacherWorksheetsTable();
}

const MAIN_NAV_HTML = `
  <div class="sb-item active" data-view="view-curr" onclick="switchDashView(this,'view-curr')"><span class="sb-ic">📚</span> My Curriculums</div>
  <div class="sb-item" data-view="view-worksheets" onclick="switchDashView(this,'view-worksheets')"><span class="sb-ic">📝</span> Worksheets</div>
  <div class="sb-item" data-view="view-notices" onclick="switchDashView(this,'view-notices')"><span class="sb-ic">🔔</span> Notices</div>
`;

function switchDashView(el, viewId) {
  document.querySelectorAll('.sb-item, .view-tab').forEach(x => x.classList.toggle('active', x.dataset.view === viewId));
  document.querySelectorAll('.data-view').forEach(v => v.classList.toggle('active', v.id === viewId));
  _('main-view-tabs').style.display = '';
  _('stats-row-main').style.display = '';
  _('banner-note-main').style.display = '';
  CURR = null;
}

function backToCurriculums() {
  const nav = _('sb-nav');
  if (nav) nav.innerHTML = MAIN_NAV_HTML;
  const roleTag = _('sb-role-tag');
  const menuLbl = _('sb-menu-lbl');
  if (roleTag) roleTag.textContent = 'AP Faculty';
  if (menuLbl) menuLbl.textContent = 'Menu';
  switchDashView(document.querySelector('.sb-item[data-view="view-curr"]'), 'view-curr');
}

function showSubjectView() {
  document.querySelectorAll('.sb-item, .view-tab').forEach(x => x.classList.remove('active'));
  document.querySelectorAll('.data-view').forEach(v => v.classList.remove('active'));
  _('view-subject').classList.add('active');
  _('main-view-tabs').style.display = 'none';
  _('stats-row-main').style.display = 'none';
  _('banner-note-main').style.display = 'none';
  const roleTag = _('sb-role-tag');
  const menuLbl = _('sb-menu-lbl');
  if (roleTag) roleTag.textContent = (CURR ? CURR.name : 'Subject');
  if (menuLbl) menuLbl.textContent = 'Modules';
  window.scrollTo(0, 0);
}

function filterDashTables(q) {
  q = (q || '').trim().toLowerCase();
  document.querySelectorAll('.data-view.active tbody tr').forEach(tr => {
    tr.style.display = !q || tr.textContent.toLowerCase().includes(q) ? '' : 'none';
  });
}

function renderTeacherWorksheetsTable() {
  const tbody = _('t-worksheets-body');
  if (!tbody) return;
  if (!TEACHER_WORKSHEETS.length) {
    tbody.innerHTML = '<tr><td colspan="6" class="loading-state">No worksheets published yet.</td></tr>';
    return;
  }
  tbody.innerHTML = TEACHER_WORKSHEETS.map(w => {
    const a = w.assignment, s = w.subject;
    const dueLbl = a.due_date ? new Date(a.due_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : '—';
    return `<tr>
      <td>${a.title}<div class="row-teacher">${a.type || 'Worksheet'}</div></td>
      <td>${s.name}</td>
      <td>${moduleLabel(a.module)}</td>
      <td>${dueLbl}</td>
      <td>${w.submittedCount} / ${w.totalStudents}</td>
      <td><span class="action-link" onclick="openSubject('${s._cardId || s.id}','${moduleLabel(a.module)}')">Review →</span></td>
    </tr>`;
  }).join('');
}

function updateStats(list) {
  const totStu = list.reduce((a, s) => a + (s._active || 0) + (s._pending || 0), 0);
  setTxt('st-stu', totStu);
  setTxt('st-stu-sub', `across <b>${list.length} AP subject${list.length !== 1 ? 's' : ''}</b>`);

  const now = new Date();
  setTxt('dash-sub', `${now.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} · ${list.length} AP subject${list.length !== 1 ? 's' : ''} assigned`);
}

function renderCurrGrid(list) {
  const g = _('curr-grid');
  if (!list.length) {
    g.innerHTML = '<tr><td colspan="5" class="loading-state">No AP subjects assigned yet.</td></tr>';
    return;
  }
  g.innerHTML = list.map(s => {
    const avgCls = s._avg >= 80 ? 'high' : s._avg >= 60 ? 'mid' : s._avg > 0 ? 'low' : 'none';
    const totalStudents = (s._active || 0) + (s._pending || 0);
    return `<tr onclick="openSubject('${s._cardId || s.id}')" style="cursor:pointer;">
      <td>
        <div class="row-subject">${s.name}</div>
        <div class="row-teacher">${s._scope || subjectScopeLabel(s)}</div>
      </td>
      <td>${totalStudents}</td>
      <td>${s._asgn || 0}</td>
      <td><span class="avg-score-badge ${avgCls}">${s._avg ? s._avg + '%' : '—'}</span></td>
      <td><span class="action-link" onclick="event.stopPropagation();openSubject('${s._cardId || s.id}')">Open →</span></td>
    </tr>`;
  }).join('');
}

async function openSubject(id, preferModule) {
  CURR = SUBJECTS.find(s => (s._cardId || s.id) === id) || SUBJECTS.find(s => s.id === id);
  if (!CURR) return;
  CUR_STUDENTS = [];
  CUR_ASSIGNS = [];
  CUR_SUBS = {};
  SEL_ASSIGN = null;
  ASSIGN_SUB_COUNT = {};
  ROSTER_OPEN = false;

  const b = bc(CURR._board || subjectFirstBoard(CURR));
  setTxt('det-title', CURR.name);
  const badge = _('det-badge');
  badge.textContent = CURR._scope || subjectScopeLabel(CURR);
  badge.className = `det-badge ${b}`;
  setTxt('det-meta', `${CURR.code || ''} ${TEACHER.full_name} - Academic Year 2025–26`);

  _('module-content').innerHTML = '<div class="loading-state">Loading…</div>';
  showSubjectView();

  if (!IS_LIVE) {
    toast('⚠ Supabase is not connected.', 'err');
    return;
  }

  const {
    data: asgns
  } = await sb.from('assignments').select('*')
    .eq('subject_id', CURR.id).eq('status', 'published')
    .order('created_at', {
      ascending: false
    });
  CUR_ASSIGNS = (asgns || []).filter(a =>
    (CURR._grade == null && CURR._board == null) ? true : assignmentInScope(a, CURR._grade, CURR._board)
  );

  const rawStudents = (CURR._students || []).map(p => ({
    id: p.id,
    full_name: p.full_name || null,
    username: p.username || null,
    roll_number: p.roll_number || null,
    class: p.class || null,
    board: p.board || null,
    _class_type: p._class_type || 'group',
    _is_active: true,
    _pay: 'active',
    _avg: null
  }));

  const _comboFilter = (cls, brd) => {
    if (CURR._grade == null && CURR._board == null) return true;
    return feeMatches({
      grade: CURR._grade,
      board: CURR._board
    }, cls, brd);
  };

  if (CUR_ASSIGNS.length) {
    const assignIds = CUR_ASSIGNS.map(a => a.id);
    const {
      data: subRows
    } = await sb.from('assignment_submissions')
      .select('student_id, assignment_id, profiles:student_id(id, full_name, username, roll_number, class, board)')
      .in('assignment_id', assignIds);

    (subRows || []).forEach(sub => {
      if (sub.assignment_id) ASSIGN_SUB_COUNT[sub.assignment_id] = (ASSIGN_SUB_COUNT[sub.assignment_id] || 0) + 1;
    });

    const knownIds = new Set(rawStudents.map(s => s.id));
    (subRows || []).forEach(sub => {
      if (sub.student_id && !knownIds.has(sub.student_id)) {
        const pr = sub.profiles || {};
        if (!_comboFilter(pr.class, pr.board)) return;
        rawStudents.push({
          id: sub.student_id,
          full_name: pr.full_name || null,
          username: pr.username || null,
          roll_number: pr.roll_number || null,
          class: pr.class || null,
          board: pr.board || null,
          _class_type: 'group',
          _is_active: false,
          _pay: 'pending',
          _avg: null
        });
        knownIds.add(sub.student_id);
      }
    });
  }

  if (rawStudents.some(s => !s.full_name)) {
    const ids = rawStudents.map(s => s.id).filter(Boolean);
    if (ids.length) {
      const {
        data: profs
      } = await sb.from('profiles')
        .select('id, full_name, username, roll_number, class, board').in('id', ids);
      if (profs && profs.length) {
        const pm = {};
        profs.forEach(p => pm[p.id] = p);
        rawStudents.forEach((s, i) => {
          if (pm[s.id]) {
            const orig = rawStudents[i];
            Object.assign(rawStudents[i], pm[s.id]);
            rawStudents[i]._class_type = orig._class_type;
            rawStudents[i]._is_active = orig._is_active;
            rawStudents[i]._pay = orig._pay;
          }
        });
      }
    }
  }

  const maxMap = {};
  CUR_ASSIGNS.forEach(a => {
    maxMap[(a.title || '').trim()] = Number(a.max_score) || 0;
  });

  CUR_STUDENTS = await Promise.all(rawStudents.map(async s => {
    if (!s.id) return s;
    const {
      data: sc
    } = await sb.from('assessments')
      .select('student_score, name').eq('student_id', s.id).eq('subject_id', CURR.id);
    return {
      ...s,
      _avg: avgPercent(sc, maxMap)
    };
  }));

  SEL_MODULE = (preferModule && AP_MODULES.includes(preferModule)) ? preferModule : 'overview';
  renderModuleTabs();
  renderModuleContent(SEL_MODULE);
}

function toggleRoster() {
  ROSTER_OPEN = !ROSTER_OPEN;
}

function renderStudentTable(filter = '') {
  const tbody = _('stu-tbody');
  if (!tbody) return;
  const rows = CUR_STUDENTS.filter(s =>
    !filter ||
    (s.full_name || '').toLowerCase().includes(filter.toLowerCase()) ||
    (s.roll_number || '').includes(filter) ||
    (s.username || '').toLowerCase().includes(filter.toLowerCase())
  );
  if (!rows.length) {
    tbody.innerHTML = '<tr><td colspan="5" class="loading-state">No students found.</td></tr>';
    return;
  }
  tbody.innerHTML = rows.map((s, i) => {
    const av = AVC[i % AVC.length];
    const iv = ini(s.full_name);
    const sc = s._avg;
    const bcc = sc >= 80 ? 'high' : sc >= 65 ? 'mid' : 'low';

    const isActive = s._is_active === true;
    const isPending = !isActive && (s._pay === 'pending');
    let ptag, pcls;
    if (isActive) {
      ptag = '✓ Active';
      pcls = 'paid';
    } else if (isPending) {
      ptag = '⏳ Pending';
      pcls = 'pending';
    } else {
      ptag = 'Inactive';
      pcls = 'overdue';
    }

    return `<tr>
      <td style="color:var(--muted);width:36px">${String(i + 1).padStart(2, '0')}</td>
      <td>
        <div class="s-name-cell">
          <div class="s-av" style="background:${av}">${iv}</div>
          <div>
            <div style="font-weight:500;">${s.full_name || '—'}</div>
            ${s.username ? `<div style="font-size:11px;color:var(--muted);">@${s.username}</div>` : ''}
          </div>
        </div>
      </td>

      <td>${sc != null ? `<div class="score-wrap"><span>${sc}%</span><div class="score-bar"><div class="score-fill ${bcc}" style="width:${sc}%"></div></div></div>` : '—'}</td>
      <td><span class="pay-badge ${pcls}">${ptag}</span></td>
    </tr>`;
  }).join('');
}

function filterStudents(v) {
  renderStudentTable(v);
}

/* ════════════════════════════════════════════════
   MODULE SIDEBAR + MODULE CONTENT
════════════════════════════════════════════════ */
/* ✅ Modules now replace the sidebar's main menu (My Curriculums /
   Worksheets / Notices) — click "← My Curriculums" to restore it. */
function renderModuleTabs() {
  const wrap = _('sb-nav');
  if (!wrap) return;
  const counts = {};
  AP_MODULES.forEach(m => counts[m] = 0);
  CUR_ASSIGNS.forEach(a => {
    const k = moduleLabel(a.module);
    if (counts[k] != null) counts[k]++;
  });
  let html = `<div class="sb-item" onclick="backToCurriculums()"><span class="sb-ic">←</span> My Curriculums</div>`;
  html += `<button class="sb-item ${SEL_MODULE === 'overview' ? 'active' : ''}" style="width:100%;border:none;text-align:left;margin-top:10px;" onclick="selectModule('overview')"><span class="sb-ic">👥</span> Overview</button>`;
  html += AP_MODULES.map(m =>
    `<button class="sb-item ${m === SEL_MODULE ? 'active' : ''}" style="width:100%;border:none;text-align:left;" onclick="selectModule('${m}')"><span class="sb-ic">📄</span> ${m}${counts[m] ? ` <span class="mod-count">${counts[m]}</span>` : ''}</button>`
  ).join('');
  wrap.innerHTML = html;
}

function selectModule(m) {
  SEL_MODULE = m;
  renderModuleTabs();
  renderModuleContent(m);
}

function renderModuleContent(m) {
  const cont = _('module-content');
  if (!cont) return;

  if (m === 'overview') {
    renderStudentTable();
    cont.innerHTML = `
      <div class="dqs" style="margin-bottom:20px;">
        <div class="dqs-box"><div class="dqs-val c-blue" id="dqs-stu">${CUR_STUDENTS.length}</div><div class="dqs-lbl">Students</div></div>
        <div class="dqs-box"><div class="dqs-val c-teal" id="dqs-avg">${(() => { const avgs = CUR_STUDENTS.filter(s => s._avg != null).map(s => s._avg); return avgs.length ? Math.round(avgs.reduce((a,b)=>a+b,0)/avgs.length) + '%' : '—'; })()}</div><div class="dqs-lbl">Class Avg</div></div>
        <div class="dqs-box"><div class="dqs-val c-green" id="dqs-sub">${Object.values(ASSIGN_SUB_COUNT).reduce((a,b)=>a+b,0)}</div><div class="dqs-lbl">Submissions</div></div>
      </div>
      <div class="stu-card" style="margin-bottom:0;">
        <div class="stu-card-hd">
          <div class="card-title">Student Roster</div>
          <input class="search-box-inp" placeholder="🔍 Search students…" oninput="filterStudents(this.value)">
        </div>
        <div style="overflow-x:auto">
          <table>
            <thead><tr><th>#</th><th>Student</th><th>Avg Score</th><th>Status</th></tr></thead>
            <tbody id="stu-tbody"><tr><td colspan="4" class="loading-state">Loading…</td></tr></tbody>
          </table>
        </div>
      </div>`;
    renderStudentTable();
    return;
  }

  const list = CUR_ASSIGNS.filter(a => moduleLabel(a.module) === m);
  const totalStudents = CUR_STUDENTS.length;

  let html = `<button class="upload-toggle-btn" onclick="toggleUploadForm()">+ Upload worksheet to ${m}</button>`;
  html += uploadFormHtml(m);

  if (!list.length) {
    html += `<div class="loading-state" style="padding:40px 20px;text-align:center;">No worksheets in <strong>${m}</strong> yet.</div>`;
  } else {
    html += list.slice()
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .map(a => wkCardHtml(a, totalStudents)).join('');
  }
  cont.innerHTML = html;
}

function uploadFormHtml(m) {
  return `<div class="upload-form-wrap" id="upload-form-wrap">
    <div class="fg" style="margin-bottom:16px"><label>Assignment Title</label><input id="a-title" class="fi2" placeholder="e.g. Unit 3 Progress Check (FRQ)"></div>
    <div class="upload-grid">
      <div class="fg"><label>Assignment Type</label><select id="a-type" class="fsel">
          <option>Problem Set</option>
          <option>Worksheet</option>
          <option>Practice Paper</option>
          <option>FRQ Practice</option>
          <option>MCQ Practice</option>
          <option>Lab Report</option>
          <option>Project</option>
        </select></div>
      <div class="fg"><label>Due Date</label><input id="a-due" class="fi2" type="date"></div>
      <div class="fg"><label>Max Score</label><input id="a-max" class="fi2" type="number" value="50" min="1"></div>
    </div>
    <label style="font-size:11px;font-weight:600;letter-spacing:1px;text-transform:uppercase;color:var(--muted);margin-bottom:8px;display:block">Instructions / Notes</label>
    <textarea id="a-inst" class="ftxt" placeholder="Attempt all questions. Show all working steps clearly. Submit as a single PDF."></textarea>
    <div id="drop-zone" class="drop-zone" onclick="document.getElementById('a-file').click()">
      <div style="font-size:28px;margin-bottom:10px">📎</div>
      <div style="font-size:14px;font-weight:500;margin-bottom:4px">Drag & drop your file here, or click to browse</div>
      <div style="font-size:12px;color:var(--muted)">PDF, DOCX, PPTX · Max 20MB</div>
    </div>
    <input id="a-file" type="file" accept=".pdf,.doc,.docx,.pptx,.ppt,.jpg,.png" style="display:none" onchange="handleFile(this)">
    <div id="file-prev" class="upl-file" style="display:none">
      <div class="upl-file-icon">📄</div>
      <div>
        <div id="file-nm" style="font-size:13px;font-weight:500">—</div>
        <div id="file-sz" style="font-size:11.5px;color:var(--muted)">—</div>
      </div>
      <button class="upl-rm" onclick="clearFile()">✕</button>
    </div>
    <button id="pub-btn" class="up-btn" onclick="publishAssignment()">Publish to ${m} →</button>
  </div>`;
}

function toggleUploadForm() {
  const w = _('upload-form-wrap');
  if (w) w.style.display = (w.style.display === 'block') ? 'none' : 'block';
}

function wkCardHtml(a, totalStudents) {
  const daysLeft = Math.ceil((new Date(a.due_date) - new Date()) / 86400000);
  const overdue = daysLeft < 0;
  const dueStr = overdue ?
    `<span style="color:var(--red)">Overdue ${Math.abs(daysLeft)}d</span>` :
    daysLeft === 0 ?
    `<span style="color:var(--orange)">Due today</span>` :
    `Due ${fmtDate(a.due_date)}`;
  const subCount = ASSIGN_SUB_COUNT[a.id] || 0;
  return `<div class="wk-card">
    <div class="wk-title">${a.title}</div>
    <div class="wk-meta">${a.type} · Max ${a.max_score} · ${dueStr} · ${subCount}/${totalStudents} submitted</div>
    ${a.instructions ? `<div class="wk-meta">${a.instructions}</div>` : ''}
    ${a.file_url ? `<div class="wk-meta"><a href="${a.file_url}" target="_blank" style="color:var(--teal);font-weight:600;">📎 ${a.file_name || 'Worksheet file'}</a></div>` : ''}
    <div class="wk-actions">
      <button class="wk-btn" onclick="toggleSubmissions('${a.id}')">View submissions</button>
    </div>
    <div class="subs-inline" id="subs-wrap-${a.id}" style="display:none">
      <div style="display:flex;gap:20px;margin-bottom:10px;">
        <span style="font-size:12.5px;color:var(--teal)">✓ Submitted: <span id="subc-y-${a.id}">0</span></span>
        <span style="font-size:12.5px;color:var(--red)">✗ Not submitted: <span id="subc-n-${a.id}">0</span></span>
      </div>
      <div id="subs-list-${a.id}" class="loading-state">Loading…</div>
    </div>
  </div>`;
}

async function toggleSubmissions(aid) {
  const wrap = _('subs-wrap-' + aid);
  if (!wrap) return;
  const isOpen = wrap.style.display === 'block';
  if (isOpen) {
    wrap.style.display = 'none';
    return;
  }
  wrap.style.display = 'block';
  if (!CUR_SUBS[aid]) {
    await loadSubmissionsInline(aid);
  } else {
    renderSubListInline(aid, CUR_SUBS[aid]);
  }
}

async function loadSubmissionsInline(aid) {
  let sm = {};
  if (IS_LIVE) {
    const {
      data: subs
    } = await sb.from('assignment_submissions')
      .select('id, student_id, submitted_at, file_url, file_name, file_size, status, teacher_remarks, checked_file_url, checked_file_name, profiles:student_id(id, full_name, username, roll_number, class, board)')
      .eq('assignment_id', aid);
    (subs || []).forEach(s => {
      const pr = s.profiles || {};
      sm[s.student_id] = {
        ...s,
        _name: pr.full_name || null,
        _username: pr.username || null,
        teacher_remarks: s.teacher_remarks || '',
        checked_file_url: s.checked_file_url || '',
        checked_file_name: s.checked_file_name || ''
      };
    });
  }
  CUR_SUBS[aid] = sm;
  renderSubListInline(aid, sm);
}

function renderSubListInline(aid, sm) {
  const listEl = _('subs-list-' + aid);
  if (!listEl) return;
  const submittedArr = Object.values(sm);
  const submittedIds = new Set(Object.keys(sm));
  const notSubArr = CUR_STUDENTS.filter(s => !submittedIds.has(s.id));
  setTxt('subc-y-' + aid, submittedArr.length);
  setTxt('subc-n-' + aid, notSubArr.length);

  let html = '';
  submittedArr.forEach(sub => {
    const name = sub._name || '—',
      username = sub._username ? '@' + sub._username : '';
    const fname = sub.file_name || '';
    const subData = {
      sid: sub.student_id,
      aid,
      url: sub.file_url,
      fname: sub.file_name || '',
      remark: sub.teacher_remarks || '',
      subId: sub.id || '',
      checkedUrl: sub.checked_file_url || '',
      checkedName: sub.checked_file_name || ''
    };
    const subDataStr = btoa(unescape(encodeURIComponent(JSON.stringify(subData))));
    const viewBtn = sub.file_url ?
      `<button onclick="openSubReview(atob('${subDataStr}'))" class="wk-btn">Review & comment</button>` :
      `<span style="font-size:11.5px;color:var(--muted)">No file</span>`;
    const dlBtn = sub.file_url ?
      `<button onclick="downloadSubmission(atob('${subDataStr}'))" class="wk-btn" style="border-color:var(--blue);color:var(--blue)">Download</button>` :
      '';
    html += `<div class="sub-row-min">
      <div>
        <div style="font-size:13px;font-weight:600;color:var(--cream)">${name}</div>
        <div style="font-size:11.5px;color:var(--muted)">${username}${fname ? ' · ' + fname : ''}</div>
      </div>
      <div style="display:flex;gap:8px;flex-shrink:0;">${viewBtn}${dlBtn}</div>
    </div>`;
  });
  notSubArr.forEach(s => {
    html += `<div class="sub-row-min" style="opacity:.65">
      <div>
        <div style="font-size:13px;font-weight:600;color:var(--cream)">${s.full_name || '—'}</div>
        <div style="font-size:11.5px;color:var(--muted)">${s.username ? '@' + s.username : ''}</div>
      </div>
      <div style="font-size:11.5px;color:var(--red);font-weight:600;">Not submitted</div>
    </div>`;
  });
  listEl.innerHTML = html || '<div class="loading-state">No students found.</div>';
}

function handleFile(inp) {
  const f = inp.files[0];
  if (!f) return;
  setTxt('file-nm', f.name);
  setTxt('file-sz', (f.size / 1048576).toFixed(2) + ' MB');
  _('drop-zone').style.display = 'none';
  _('file-prev').style.display = 'flex';
}

function clearFile() {
  if (_('a-file')) _('a-file').value = '';
  if (_('drop-zone')) _('drop-zone').style.display = 'block';
  if (_('file-prev')) _('file-prev').style.display = 'none';
}

async function publishAssignment() {
  const mod = SEL_MODULE;
  const title = _('a-title').value.trim(),
    type = _('a-type').value,
    due = _('a-due').value,
    max = parseInt(_('a-max').value) || 50,
    inst = _('a-inst').value.trim();
  if (!mod || mod === 'overview') {
    toast('Please select a module tab first.', 'err');
    return;
  }
  if (!title || !due) {
    toast('Please fill in the title and due date.', 'err');
    return;
  }
  const btn = _('pub-btn');
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span>Publishing…';
  let fileUrl = '',
    fileName = '';
  const fi = _('a-file');
  if (fi.files[0]) {
    const f = fi.files[0];
    fileName = f.name;
    btn.innerHTML = '<span class="spinner"></span>Uploading file…';
    try {
      const codeFolder = (CURR.code || CURR.name || 'Subject').replace(/[^a-zA-Z0-9]/g, '-').replace(/-+/g, '-');
      const subName = (CURR.name || 'Subject').replace(/[^a-zA-Z0-9 ]/g, '').replace(/ +/g, '-');
      const tName = (TEACHER.full_name || 'Teacher').replace(/[^a-zA-Z0-9 .]/g, '').replace(/ +/g, '-');
      const safeFN = f.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const path = codeFolder + '/' + subName + '/' + tName + '/' + safeFN;
      const {
        error: ue
      } = await sb.storage.from('peak-assignments').upload(path, f, {
        upsert: true
      });
      if (ue) {
        toast('File upload failed: ' + ue.message, 'err');
        btn.disabled = false;
        btn.textContent = 'Publish Assignment →';
        return;
      }
      fileUrl = sb.storage.from('peak-assignments').getPublicUrl(path).data.publicUrl || '';
    } catch (uploadErr) {
      toast('Upload error: ' + uploadErr.message, 'err');
      btn.disabled = false;
      btn.textContent = 'Publish Assignment →';
      return;
    }
    btn.innerHTML = '<span class="spinner"></span>Saving…';
  }
  if (!IS_LIVE) {
    toast('⚠ Supabase is not connected.', 'err');
    btn.disabled = false;
    btn.textContent = 'Publish Assignment →';
    return;
  }
  const {
    data: nA,
    error
  } = await sb.from('assignments').insert({
    subject_id: CURR.id,
    teacher_id: TEACHER.id,
    title,
    type,
    due_date: due,
    max_score: max,
    instructions: inst,
    file_url: fileUrl,
    file_name: fileName,
    status: 'published',
    grade: CURR._grade || null,
    board: CURR._board || null,
    module: mod
  }).select().single();
  if (error) {
    toast('Error: ' + error.message, 'err');
    btn.disabled = false;
    btn.textContent = 'Publish Assignment →';
    return;
  }
  CUR_ASSIGNS.unshift(nA);
  ASSIGN_SUB_COUNT[nA.id] = 0;
  if (CURR) CURR._asgn = (CURR._asgn || 0) + 1;
  renderCurrGrid(SUBJECTS);
  toast(`✓ "${title}" published to ${mod}!`, 'ok');
  renderModuleTabs();
  renderModuleContent(SEL_MODULE);
}

async function loadNotices() {
  const list = _('notice-list');
  list.innerHTML = '<div class="loading-state">Loading…</div>';
  if (!IS_LIVE) {
    list.innerHTML = '<div class="loading-state">Please connect Supabase.</div>';
    return;
  }
  const {
    data
  } = await sb.from('notices').select('*').order('created_at', {
    ascending: false
  }).limit(20);
  renderNoticeList(data || []);
}

function renderNoticeList(notices) {
  const list = _('notice-list');
  if (!notices.length) {
    list.innerHTML = '<div class="loading-state">No notices posted yet.</div>';
    return;
  }
  const clr = {
    info: 'var(--yellow)',
    warning: 'var(--orange)',
    urgent: 'var(--red)'
  };
  list.innerHTML = notices.map(n => `
    <div class="n-row">
      <div class="n-dot" style="background:${clr[n.type] || clr.info};margin-top:6px"></div>
      <div style="flex:1"><div style="font-size:13.5px;line-height:1.5"><strong>${n.title}</strong>${n.body ? ' — ' + n.body : ''}</div><div style="font-size:11.5px;color:var(--muted);margin-top:3px">${fmtDate(n.created_at)}</div></div>
      <button onclick="deleteNotice('${n.id}')" title="Delete notice"
        style="flex-shrink:0;background:rgba(194,59,52,0.10);border:1px solid rgba(194,59,52,0.32);color:#c23b34;border-radius:8px;padding:5px 12px;font-size:12px;font-weight:600;cursor:pointer;">🗑 Delete</button>
    </div>`).join('');
}

function toggleNoticeForm() {
  const w = _('notice-form-wrap');
  if (w) w.style.display = (w.style.display === 'block') ? 'none' : 'block';
}

async function deleteNotice(id) {
  if (!id) return;
  if (!confirm('Delete this notice? It will also be removed from student dashboards.')) return;
  if (!IS_LIVE) {
    toast('⚠ Supabase is not connected.', 'err');
    return;
  }
  try {
    const {
      data,
      error
    } = await sb.from('notices').delete().eq('id', id).select();
    if (error) throw error;
    if (!data || data.length === 0) {
      toast('Delete blocked. Run the notices delete policy in Supabase.', 'err');
      return;
    }
    toast('✓ Notice deleted.', 'ok');
    await loadNotices();
  } catch (e) {
    toast('Delete failed: ' + e.message, 'err');
  }
}

async function postNotice() {
  const t = _('n-title').value.trim(),
    b = _('n-body').value.trim(),
    ty = _('n-type').value;
  if (!t || !b) {
    toast('Please fill in the title and content.', 'err');
    return;
  }
  if (!IS_LIVE) {
    toast('⚠ Supabase is not connected.', 'err');
    return;
  }
  const {
    error
  } = await sb.from('notices').insert({
    title: t,
    body: b,
    type: ty
  });
  if (error) {
    toast('Error: ' + error.message, 'err');
    return;
  }
  toast('✓ Notice posted!', 'ok');
  _('n-title').value = '';
  _('n-body').value = '';
  const w = _('notice-form-wrap');
  if (w) w.style.display = 'none';
  await loadNotices();
}

/* ════════════════════════════════════════════════
   Submission review modal
════════════════════════════════════════════════ */
function openSubReview(jsonStr) {
  let meta;
  try {
    meta = JSON.parse(jsonStr);
  } catch (e) {
    toast('Error opening review', 'err');
    return;
  }

  const modal = _('sub-review-modal');
  if (!modal) {
    toast('Modal not found', 'err');
    return;
  }

  SEL_ASSIGN = CUR_ASSIGNS.find(x => x.id === meta.aid) || null;

  setTxt('srv-fname', meta.fname || 'Submission');
  _('srv-remark-input').value = meta.remark || '';
  _('srv-save-btn').dataset.subId = meta.subId || '';
  _('srv-save-btn')._metaAid = meta.aid;
  _('srv-save-btn')._metaSid = meta.sid;
  setTxt('srv-char-count', (meta.remark || '').length + ' characters');

  modal.style.display = 'flex';

  mountCheckedUI(meta);
  mountScoreUI(meta);

  renderSubmissionFile(meta.url, meta.fname);
}

async function mountScoreUI(meta) {
  const saveBtn = _('srv-save-btn');
  if (!saveBtn) return;
  const a = CUR_ASSIGNS.find(x => x.id === meta.aid) || SEL_ASSIGN;
  const maxScore = a ? a.max_score : 0;

  let wrap = _('srv-score-wrap');
  if (!wrap) {
    wrap = document.createElement('div');
    wrap.id = 'srv-score-wrap';
    wrap.style.cssText = 'margin:14px 0;padding:14px 16px;border:1px solid rgba(31,138,82,0.4);border-radius:10px;position:relative;z-index:5;';
    wrap.innerHTML =
      '<div style="font-size:12px;font-weight:700;color:var(--green);margin-bottom:10px;">✏️ Marks (will appear in the student dashboard)</div>' +
      '<div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:10px;">' +
      '  <input type="number" id="srv-score-input" min="0" placeholder="—" style="width:90px;padding:8px 10px;background:rgba(255,255,255,0.95);border:1px solid rgba(31,138,82,0.4);border-radius:8px;font-size:14px;font-weight:700;color:#0d2424;outline:none;">' +
      '  <span id="srv-score-max" style="font-size:13px;color:var(--muted);">/ ' + maxScore + '</span>' +
      '</div>' +
      '<input type="text" id="srv-score-remark" placeholder="Remarks (optional)…" style="width:100%;padding:8px 10px;background:rgba(255,255,255,0.95);border:1px solid rgba(31,138,82,0.3);border-radius:8px;font-size:12.5px;color:#0d2424;outline:none;box-sizing:border-box;margin-bottom:10px;">' +
      '<button type="button" id="srv-score-btn" style="padding:8px 18px;background:var(--green);border:none;border-radius:8px;color:#fff;font-family:\'DM Sans\',sans-serif;font-size:12.5px;font-weight:700;cursor:pointer;">Save Marks →</button>' +
      '<div id="srv-score-status" style="font-size:11.5px;color:var(--muted);margin-top:8px;"></div>';
    const checkedWrap = _('srv-checked-wrap');
    saveBtn.parentNode.insertBefore(wrap, checkedWrap || saveBtn);
    _('srv-score-btn').addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      saveScoreFromReview();
    });
  } else {
    setTxt('srv-score-max', '/ ' + maxScore);
  }

  const inp = _('srv-score-input'),
    rem = _('srv-score-remark');
  if (inp) inp.value = '';
  if (rem) rem.value = '';
  setTxt('srv-score-status', 'Loading saved marks…');

  const btn = _('srv-score-btn');
  btn._sid = meta.sid;
  btn._title = a ? a.title : '';
  btn._max = maxScore;

  if (IS_LIVE && CURR && a) {
    try {
      const {
        data: existing
      } = await sb.from('assessments')
        .select('student_score, remarks')
        .eq('subject_id', CURR.id).eq('name', a.title).eq('student_id', meta.sid)
        .limit(1);
      if (existing && existing.length) {
        if (inp) inp.value = existing[0].student_score ?? '';
        if (rem) rem.value = existing[0].remarks || '';
        setTxt('srv-score-status', '✓ Saved: ' + existing[0].student_score + '/' + maxScore);
      } else {
        setTxt('srv-score-status', 'No marks saved yet.');
      }
    } catch (e) {
      setTxt('srv-score-status', '');
    }
  }
}

async function saveScoreFromReview() {
  const btn = _('srv-score-btn');
  if (!btn) return;
  const sid = btn._sid,
    title = btn._title,
    maxScore = Number(btn._max) || 0;
  const scoreVal = _('srv-score-input').value;
  const remark = (_('srv-score-remark').value || '').trim();

  if (scoreVal === '') {
    toast('Please enter a score.', 'err');
    return;
  }
  const score = parseFloat(scoreVal);
  if (isNaN(score)) {
    toast('Score must be a number.', 'err');
    return;
  }
  if (maxScore > 0 && score > maxScore) {
    toast('Score cannot exceed ' + maxScore + '.', 'err');
    return;
  }
  if (!CURR || !title) {
    toast('Assignment info missing.', 'err');
    return;
  }
  if (!IS_LIVE) {
    toast('⚠ Supabase is not connected.', 'err');
    return;
  }

  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span>Saving…';
  try {
    await sb.from('assessments').delete()
      .eq('subject_id', CURR.id).eq('name', title).eq('student_id', sid);

    const {
      error: insErr
    } = await sb.from('assessments').insert({
      student_id: sid,
      subject_id: CURR.id,
      name: title,
      student_score: score,
      class_avg_score: 0,
      remarks: remark,
      conducted_month: new Date().toLocaleString('default', {
        month: 'long',
        year: 'numeric'
      }),
      conducted_at: new Date().toISOString()
    });
    if (insErr) throw insErr;

    const {
      data: allRows
    } = await sb.from('assessments')
      .select('student_score').eq('subject_id', CURR.id).eq('name', title);
    if (allRows && allRows.length) {
      const vals = allRows.map(r => Number(r.student_score)).filter(n => !isNaN(n));
      const avg = vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : 0;
      await sb.from('assessments').update({
          class_avg_score: avg
        })
        .eq('subject_id', CURR.id).eq('name', title);
    }

    setTxt('srv-score-status', '✓ Saved: ' + score + '/' + maxScore);
    toast('✓ Marks saved! Visible on the student dashboard.', 'ok');
  } catch (e) {
    toast('Save failed: ' + e.message, 'err');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Save Marks →';
  }
}

function mountCheckedUI(meta) {
  const saveBtn = _('srv-save-btn');
  if (!saveBtn) return;
  let wrap = _('srv-checked-wrap');
  if (!wrap) {
    wrap = document.createElement('div');
    wrap.id = 'srv-checked-wrap';
    wrap.style.cssText = 'margin:14px 0;padding:14px 16px;border:1px dashed rgba(36,84,199,0.4);border-radius:10px;position:relative;z-index:5;';
    wrap.innerHTML =
      '<div style="font-size:12px;font-weight:700;color:var(--teal);margin-bottom:8px;">📤 Upload Checked Worksheet (student will see this)</div>' +
      '<div id="srv-checked-status" style="font-size:12px;color:var(--muted);margin-bottom:10px;">No checked file uploaded yet.</div>'
      +
      '<input type="file" id="srv-checked-file" style="display:none;">' +
      '<div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:10px;">' +
      '  <button type="button" id="srv-choose-btn" style="padding:8px 16px;background:rgba(36,84,199,0.10);border:1px solid var(--teal);border-radius:8px;color:var(--teal);font-family:\'DM Sans\',sans-serif;font-size:12.5px;font-weight:600;cursor:pointer;">📁 Choose File</button>' +
      '  <span id="srv-chosen-name" style="font-size:12px;color:var(--muted);">No file chosen</span>' +
      '</div>' +
      '<button type="button" id="srv-checked-btn" style="padding:8px 18px;background:var(--teal);border:none;border-radius:8px;color:#fff;font-family:\'DM Sans\',sans-serif;font-size:12.5px;font-weight:600;cursor:pointer;">Upload Checked File →</button>';
    saveBtn.parentNode.insertBefore(wrap, saveBtn);

    const chooseBtn = _('srv-choose-btn');
    const fileInp = _('srv-checked-file');
    chooseBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      fileInp.click();
    });
    fileInp.addEventListener('change', () => {
      const f = fileInp.files[0];
      setTxt('srv-chosen-name', f ? f.name : 'No file chosen');
    });
    _('srv-checked-btn').addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      uploadCheckedWorksheet();
    });
  }

  const fileInp = _('srv-checked-file');
  if (fileInp) fileInp.value = '';
  setTxt('srv-chosen-name', 'No file chosen');
  setTxt('srv-checked-status', (meta.checkedUrl) ?
    '✓ Checked file uploaded: ' + (meta.checkedName || 'file') :
    'No checked file uploaded yet.');
}

async function uploadCheckedWorksheet() {
  const fileInp = _('srv-checked-file');
  const btn = _('srv-checked-btn');
  const subId = _('srv-save-btn').dataset.subId;
  const sid = _('srv-save-btn')._metaSid;
  const aid = _('srv-save-btn')._metaAid;
  const file = fileInp && fileInp.files[0];
  if (!file) {
    toast('Please choose a file first.', 'err');
    return;
  }
  if (!subId) {
    toast('Submission ID not found.', 'err');
    return;
  }
  if (!IS_LIVE) {
    toast('⚠ Supabase is not connected.', 'err');
    return;
  }
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span>Uploading…';
  try {
    const safeFN = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const path = 'checked/' + (sid || 'student') + '/' + subId + '/' + Date.now() + '_' + safeFN;
    const {
      error: ue
    } = await sb.storage.from('peak-submissions').upload(path, file, {
      upsert: true
    });
    if (ue) throw ue;
    const url = sb.storage.from('peak-submissions').getPublicUrl(path).data.publicUrl || '';
    const {
      data: upd,
      error
    } = await sb.from('assignment_submissions')
      .update({
        checked_file_url: url,
        checked_file_name: file.name
      })
      .eq('id', subId).select();
    if (error) throw error;
    if (!upd || upd.length === 0) {
      toast('File saved but DB update blocked (RLS). Add an UPDATE policy on assignment_submissions.', 'err');
      return;
    }
    if (aid && CUR_SUBS[aid] && CUR_SUBS[aid][sid]) {
      CUR_SUBS[aid][sid].checked_file_url = url;
      CUR_SUBS[aid][sid].checked_file_name = file.name;
    }
    setTxt('srv-checked-status', '✓ Checked file uploaded: ' + file.name);
    toast('✓ Checked worksheet uploaded! The student can see it now.', 'ok');
  } catch (e) {
    toast('Upload failed: ' + e.message, 'err');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Upload Checked File →';
  }
}

function downloadSubmission(jsonStr) {
  let meta;
  try {
    meta = JSON.parse(jsonStr);
  } catch (e) {
    return;
  }
  if (!meta.url) {
    toast('No file to download.', 'err');
    return;
  }
  _downloadFile(meta.url, meta.fname || 'submission');
}
async function _downloadFile(url, filename) {
  try {
    toast('Downloading…', 'ok');
    const resp = await fetch(url, {
      cache: 'no-store'
    });
    if (!resp.ok) throw new Error('HTTP ' + resp.status);
    const blob = await resp.blob();
    const objUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = objUrl;
    a.download = filename || 'submission';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => {
      try {
        URL.revokeObjectURL(objUrl);
      } catch (e) {}
    }, 4000);
  } catch (e) {
    window.open(url, '_blank');
  }
}

async function ensurePdfJs() {
  if (window.pdfjsLib) return window.pdfjsLib;
  await new Promise((resolve, reject) => {
    const sc = document.createElement('script');
    sc.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
    sc.onload = resolve;
    sc.onerror = () => reject(new Error('PDF.js load failed'));
    document.head.appendChild(sc);
  });
  window.pdfjsLib.GlobalWorkerOptions.workerSrc =
    'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
  return window.pdfjsLib;
}

async function renderSubmissionFile(url, fname) {
  const fileEl = _('srv-file-area');
  if (!fileEl) return;

  if (_srvBlobUrl) {
    try {
      URL.revokeObjectURL(_srvBlobUrl);
    } catch (e) {}
    _srvBlobUrl = null;
  }

  if (!url) {
    fileEl.innerHTML = '<div style="color:var(--muted);font-size:13px;text-align:center;">No file attached.</div>';
    return;
  }

  const name = (fname || url).toLowerCase();
  const clean = name.split('#')[0].split('?')[0];
  const ext = (clean.split('.').pop() || '').trim();

  const isImage = /^(png|jpg|jpeg|gif|webp|bmp|svg)$/.test(ext);
  const isPdf = ext === 'pdf';
  const isOffice = /^(doc|docx|ppt|pptx|xls|xlsx)$/.test(ext);

  fileEl.innerHTML = '<div style="color:var(--muted);font-size:13px;text-align:center;"><span class="spinner" style="margin-right:8px;"></span>Loading file…</div>';

  if (isOffice) {
    const officeSrc = 'https://view.officeapps.live.com/op/embed.aspx?src=' + encodeURIComponent(url);
    fileEl.innerHTML =
      '<iframe src="' + officeSrc + '" style="width:100%;height:68vh;border:none;border-radius:10px;background:#fff;" title="Submission"></iframe>';
    return;
  }

  try {
    const resp = await fetch(url, {
      cache: 'no-store'
    });
    if (!resp.ok) throw new Error('HTTP ' + resp.status);
    const raw = await resp.blob();
    const ctype = (resp.headers.get('content-type') || raw.type || '').toLowerCase();

    if (isImage || ctype.startsWith('image/')) {
      const b = URL.createObjectURL(raw);
      _srvBlobUrl = b;
      fileEl.innerHTML =
        '<img src="' + b + '" alt="Submission" style="max-width:100%;max-height:68vh;border-radius:10px;display:block;margin:0 auto;" oncontextmenu="return false;">';
      return;
    }

    if (isPdf || ctype.includes('pdf')) {
      const pdfjsLib = await ensurePdfJs();
      const arrayBuffer = await raw.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({
        data: arrayBuffer
      }).promise;

      fileEl.innerHTML = '';
      const scroller = document.createElement('div');
      scroller.style.cssText =
        'width:100%;height:68vh;overflow:auto;background:#0d0d18;padding:10px;box-sizing:border-box;border-radius:10px;-webkit-overflow-scrolling:touch;';
      scroller.oncontextmenu = () => false;
      fileEl.appendChild(scroller);

      const dpr = window.devicePixelRatio || 1;
      const availW = (scroller.clientWidth || fileEl.clientWidth || 350) - 20;

      for (let p = 1; p <= pdf.numPages; p++) {
        const page = await pdf.getPage(p);
        const base = page.getViewport({
          scale: 1
        });
        const cssScale = availW / base.width;
        const vp = page.getViewport({
          scale: cssScale * dpr
        });

        const canvas = document.createElement('canvas');
        canvas.width = vp.width;
        canvas.height = vp.height;
        canvas.style.cssText =
          'display:block;margin:0 auto 12px;width:100%;max-width:' + (base.width * cssScale) + 'px;height:auto;border-radius:6px;';
        canvas.oncontextmenu = () => false;
        scroller.appendChild(canvas);

        await page.render({
          canvasContext: canvas.getContext('2d'),
          viewport: vp
        }).promise;
      }
      return;
    }

    fileEl.innerHTML =
      '<div style="padding:24px;text-align:center;color:#cbd5e1;font-size:13px;line-height:1.7;">' +
      'This file cannot be previewed here (' + (ext || 'unknown') + ').<br><br>' +
      '<a href="' + url + '" target="_blank" rel="noopener" style="color:var(--teal);font-weight:600;">Open in new tab →</a></div>';
  } catch (e) {
    fileEl.innerHTML =
      '<div style="padding:24px;text-align:center;color:#e07070;font-size:13px;line-height:1.7;">' +
      'Could not load the file.<br>(' + e.message + ')<br><br>' +
      '<a href="' + url + '" target="_blank" rel="noopener" style="color:var(--teal);font-weight:600;">Open in new tab →</a></div>';
  }
}

function closeSubReview() {
  const modal = _('sub-review-modal');
  if (modal) modal.style.display = 'none';
  if (_srvBlobUrl) {
    try {
      URL.revokeObjectURL(_srvBlobUrl);
    } catch (e) {}
    _srvBlobUrl = null;
  }
  const fileEl = _('srv-file-area');
  if (fileEl) fileEl.innerHTML = '';
}

async function saveSubRemark() {
  const btn = _('srv-save-btn');
  const input = _('srv-remark-input');
  const subId = btn.dataset.subId;
  const remark = input.value.trim();
  if (!subId) {
    toast('Submission ID not found.', 'err');
    return;
  }

  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span>Saving…';

  try {
    if (IS_LIVE) {
      const {
        error
      } = await sb.from('assignment_submissions')
        .update({
          teacher_remarks: remark
        })
        .eq('id', subId);
      if (error) throw error;
    }
    const aid = btn._metaAid;
    const sid = btn._metaSid;
    if (aid && CUR_SUBS[aid] && CUR_SUBS[aid][sid]) {
      CUR_SUBS[aid][sid].teacher_remarks = remark;
    }
    toast('✓ Comment saved! The student can see it now.', 'ok');
    closeSubReview();
    if (aid) renderSubListInline(aid, CUR_SUBS[aid] || {});
  } catch (e) {
    toast('Error: ' + e.message, 'err');
  } finally {
    btn.disabled = false;
    btn.textContent = '💾 Save Comment';
  }
}