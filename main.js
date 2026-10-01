'use strict';
/* ════════════════════════════════════════════════
   PEAK POTENTIA — AP (Advanced Placement) PORTAL
════════════════════════════════════════════════ */
const SUPABASE_URL = 'https://zvmyzmkpuogbehgczuya.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp2bXl6bWtwdW9nYmVoZ2N6dXlhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkzNzc3MDEsImV4cCI6MjEwNDk1MzcwMX0.1MyE--706374FzF7wfMBA4X0XXsGwi5SVSnZv8Wb8SM';
const IS_LIVE = true;
const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const PAYMENTS_ENABLED = false;

/* ✅ Same 6-module list the teacher portal publishes worksheets into,
   so students see their worksheets grouped module-wise. */
const AP_MODULES = ['Module 1', 'Module 2', 'Module 3', 'Module 4', 'Module 5', 'Module 6'];
const UNASSIGNED_MODULE = 'Unassigned / General';
function moduleLabel(m) {
  return (m && AP_MODULES.includes(m)) ? m : UNASSIGNED_MODULE;
}

function saveSession(profile) { sessionStorage.setItem('pp_ap_student', JSON.stringify(profile)); }
function loadSession() { try { return JSON.parse(sessionStorage.getItem('pp_ap_student')); } catch { return null; } }
function clearSession() { sessionStorage.removeItem('pp_ap_student'); }

function parseFees(fees) {
  if (!fees) return [];
  if (typeof fees === 'string') { try { fees = JSON.parse(fees); } catch { return []; } }
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
function assignmentInScope(a, grade, board) {
  const ag = a.grade, ab = a.board;
  const noScope = (ag == null || ag === '') && (ab == null || ab === '');
  if (noScope) return true;
  return _feeMatchOne(ag, grade) && _feeMatchOne(ab, board);
}
function feeNum(entry, classType) {
  if (!entry) return 0;
  const keys = classType === 'individual'
    ? ['individual_fee', 'individual-fee', 'individualFee', 'fee_individual', 'individual']
    : ['group_fee', 'group-fee', 'groupFee', 'fee_group', 'group'];
  for (const k of keys) { if (entry[k] != null) return Number(entry[k]) || 0; }
  return 0;
}
function getStudentFeeEntry(subject) {
  const fees = parseFees(subject && subject.fees);
  if (!fees.length) return null;
  const g = (PROFILE && PROFILE.class) || '';
  const b = (PROFILE && PROFILE.board) || '';
  return fees.find(f => feeMatches(f, g, b)) || fees[0];
}
function getGroupFee(subject) {
  return feeNum(getStudentFeeEntry(subject), 'group');
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

function getIndividualFee(subject) {
  return feeNum(getStudentFeeEntry(subject), 'individual');
}
function getEnrolledClassType(subject) {
  return subject._class_type || 'group';
}
function getClassTypeLabel(subject) {
  const ct = getEnrolledClassType(subject);
  return ct === 'individual' ? '👤 1-on-1 Class' : '👥 Group Class';
}

const DEMO = {
  profile: { id: '', username: 'aryan123', full_name: 'Aryan Sharma', class: 'Grade 12', board: 'AP', roll_number: 'AP-1024' },
  notices: [
    { type: 'urgent', title: 'AP Exam registration window is now open', body: 'Register with your coordinator before the deadline.', created_at: '-' },
    { type: 'info', title: 'AP Score release', body: 'Scores for this cycle release in July — check your College Board account.', created_at: '-' },
  ],
  subjects: [
    { id: 'demo-econ-macro', name: 'AP Macroeconomics', code: 'APMACRO', teacher: 'Ms. Nandini Rao', icon: '📈', color_class: 'c1', total_assessments: 10, fees: [{ grade: 'All', board: 'AP', group_fee: 14000, individual_fee: 22000 }], _class_type: 'group', _done: 4, _avg: 78 },
    { id: 'demo-econ-micro', name: 'AP Microeconomics', code: 'APMICRO', teacher: 'Ms. Nandini Rao', icon: '💹', color_class: 'c2', total_assessments: 10, fees: [{ grade: 'All', board: 'AP', group_fee: 14000, individual_fee: 22000 }], _class_type: 'group', _done: 3, _avg: 82 },
    { id: 'demo-calc-ab', name: 'AP Calculus AB', code: 'APCALCAB', teacher: 'Mr. Rohit Verma', icon: '📐', color_class: 'c3', total_assessments: 12, fees: [{ grade: 'All', board: 'AP', group_fee: 15000, individual_fee: 24000 }], _class_type: 'individual', _done: 6, _avg: 71 },
    { id: 'demo-stats', name: 'AP Statistics', code: 'APSTAT', teacher: 'Mr. Rohit Verma', icon: '📊', color_class: 'c4', total_assessments: 10, fees: [{ grade: 'All', board: 'AP', group_fee: 14000, individual_fee: 22000 }], _class_type: 'group', _done: 2, _avg: 66 },
    { id: 'demo-bio', name: 'AP Biology', code: 'APBIO', teacher: 'Dr. Kavita Menon', icon: '🧬', color_class: 'c5', total_assessments: 12, fees: [{ grade: 'All', board: 'AP', group_fee: 15000, individual_fee: 23000 }], _class_type: 'group', _done: 5, _avg: 88 },
    { id: 'demo-psych', name: 'AP Psychology', code: 'APPSYCH', teacher: 'Ms. Fatima Iqbal', icon: '🧠', color_class: 'c6', total_assessments: 10, fees: [{ grade: 'All', board: 'AP', group_fee: 13000, individual_fee: 20000 }], _class_type: 'group', _done: 7, _avg: 91 },
  ],
  monthly: {},
  assessments: {},
};

let PROFILE = null, SUBJECTS = [], CUR_SUBJ = null, CUR_METHOD = null;
let CUR_CLASS_TYPE = 'group';

function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  window.scrollTo(0, 0);
}

let _toastTimer;
function toast(msg, type = '') {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.className = 'show ' + type;
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => el.className = '', 2800);
}

function togglePass() {
  const i = document.getElementById('inp-pass');
  i.type = i.type === 'password' ? 'text' : 'password';
}

function nowStamp() {
  const d = new Date(), pad = n => String(n).padStart(2, '0');
  return pad(d.getDate()) + '/' + pad(d.getMonth() + 1) + '/' + d.getFullYear()
       + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes());
}

function studentWatermarkText() {
  const name = (PROFILE && PROFILE.full_name) ? PROFILE.full_name : 'Student';
  const id = (PROFILE && (PROFILE.email || PROFILE.username || PROFILE.roll_number)) || '';
  return [name.toUpperCase(), id, nowStamp()].filter(Boolean).join('  •  ');
}

function wmTiledOverlay(tag, text) {
  const safe = String(text)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  const tile =
    "<svg xmlns='http://www.w3.org/2000/svg' width='360' height='210'>"
    + "<text x='10' y='110' transform='rotate(-30 180 105)' "
    + "fill='rgba(20,22,26,0.10)' font-size='13' font-weight='700' "
    + "font-family='Arial, sans-serif' letter-spacing='1'>" + safe + "</text></svg>";
  let b64;
  try { b64 = btoa(unescape(encodeURIComponent(tile))); } catch (e) { b64 = btoa(tile); }
  const uri = 'data:image/svg+xml;base64,' + b64;
  return "<div class='wm-overlay' data-wm='" + tag + "' "
    + "style=\"position:absolute;inset:0;z-index:40;pointer-events:none;"
    + "background-image:url('" + uri + "');background-repeat:repeat;\"></div>";
}

let _wmTimer = null;
function applyModalWatermark() {
  const body = document.getElementById('view-modal-body');
  if (!body) return;
  let card = body;
  while (card && card.parentElement && card.parentElement.id !== 'view-modal') card = card.parentElement;
  if (!card) card = body;
  if (getComputedStyle(card).position === 'static') card.style.position = 'relative';

  function paint() {
    const old = card.querySelector(".wm-overlay[data-wm='modal']");
    if (old) old.remove();
    card.insertAdjacentHTML('beforeend', wmTiledOverlay('modal', studentWatermarkText()));
  }
  paint();
  if (_wmTimer) clearInterval(_wmTimer);
  _wmTimer = setInterval(() => {
    const m = document.getElementById('view-modal');
    if (!m || m.style.display !== 'flex') return;
    paint();
  }, 15000);
}

function fmtDate(d) {
  if (!d) return '—';
  try { return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }); }
  catch { return d; }
}

function initials(name) {
  return (name || 'ST').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

function setHeaderUser(p) {
  const n = p.full_name || 'Student';
  const rol = [p.class, p.board].filter(Boolean).join(' • ');
  const ini = initials(n);
  ['tb-av'].forEach(id => { const e = document.getElementById(id); if (e) e.textContent = ini; });
  ['tb-un'].forEach(id => { const e = document.getElementById(id); if (e) e.textContent = n; });
  ['tb-ur'].forEach(id => { const e = document.getElementById(id); if (e) e.textContent = rol; });
  document.getElementById('greet-name').textContent = n.split(' ')[0];
}

async function doLogin() {
  const btn = document.getElementById('login-btn');
  const user = document.getElementById('inp-user').value.trim().toLowerCase().replace(/\s+/g, '');
  const pass = document.getElementById('inp-pass').value;
  const errEl = document.getElementById('login-err');
  errEl.style.display = 'none';
  if (!user || !pass) {
    errEl.textContent = '⚠ Please enter both username and password.';
    errEl.style.display = 'block';
    return;
  }
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span>Signing in…';
  try {
    if (!IS_LIVE) {
      await new Promise(r => setTimeout(r, 700));
      if (user !== 'aryan123' || pass !== 'demo1234') throw new Error('Demo login only');
      PROFILE = DEMO.profile;
    } else {
      const { data, error } = await sb.rpc('student_login', { p_username: user, p_password: pass });
      if (error) throw new Error('Login error: ' + error.message);
      if (!data || !data.success) throw new Error('Incorrect username and password.');
      PROFILE = data;
    }
    saveSession(PROFILE);
    setHeaderUser(PROFILE);
    document.getElementById('subj-lbl').textContent = ['AP Subjects —', PROFILE.class || '', PROFILE.board ? '(' + PROFILE.board + ')' : ''].filter(Boolean).join(' ');
    await Promise.all([loadNotices(), loadSubjects()]);
    await loadWorksheetsOverview();
    showScreen('s-dash');
    toast('Welcome back, ' + (PROFILE.full_name || '').split(' ')[0] + '!', 'ok');
  } catch (e) {
    errEl.textContent = '⚠ ' + (e.message || 'Login failed.');
    errEl.style.display = 'block';
  } finally {
    btn.disabled = false;
    btn.innerHTML = 'Sign in to portal';
  }
}

async function doLogout() {
  clearSession();
  PROFILE = null;
  SUBJECTS = [];
  CUR_SUBJ = null;
  showScreen('s-login');
  toast('Signed out successfully.');
}

async function loadNotices() {
  let notices = DEMO.notices;
  if (IS_LIVE) {
    const { data, error } = await sb.from('notices').select('*').order('created_at', { ascending: false }).limit(5);
    if (!error && data?.length) notices = data;
  }
  document.getElementById('nb-ct').textContent = notices.length;
  document.getElementById('notice-list').innerHTML = notices.map(n => `
    <div class="ni">
      <div class="ndott ${n.type || 'info'}"></div>
      <div>
        <div class="ni-txt">${n.title}${n.body ? ' <span style="color:var(--muted)">— ' + n.body + '</span>' : ''}</div>
        <div class="ni-date">${fmtDate(n.created_at)}</div>
      </div>
    </div>`).join('');
  wireBell();
}

function scrollToNotices() {
  const el = document.getElementById('notice-list')
          || document.getElementById('nb-ct')
          || document.querySelector('.nb, .notice-board');
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function wireBell() {
  if (window._bellWired) return;
  let bell = document.getElementById('bell') || document.querySelector('.bell, [class*="bell"], [class*="notif"]');
  if (!bell) {
    const nodes = document.querySelectorAll('span, button, a, i, div');
    for (const el of nodes) {
      if (el.children.length === 0 && /🔔/.test(el.textContent || '')) { bell = el; break; }
    }
  }
  if (bell) {
    const target = bell.closest('button, a') || bell;
    target.style.cursor = 'pointer';
    target.addEventListener('click', scrollToNotices);
    window._bellWired = true;
  }
}

async function loadSubjects() {
  if (!IS_LIVE) { SUBJECTS = DEMO.subjects; renderSubjects(SUBJECTS); return; }

  if (!PAYMENTS_ENABLED) {
    try {
      let wanted = PROFILE.subjects;
      let prefType = PROFILE.preferred_class_type;

      if (wanted === undefined || wanted === null) {
        const { data: prof, error: pErr } = await sb
          .from('profiles')
          .select('subjects, preferred_class_type')
          .eq('id', PROFILE.id)
          .single();
        if (pErr) throw pErr;
        if (prof) {
          wanted = prof.subjects;
          if (!prefType) prefType = prof.preferred_class_type;
        }
      }

      if (typeof wanted === 'string') {
        try { wanted = JSON.parse(wanted); }
        catch { wanted = wanted.split(',').map(x => x.trim()); }
      }
      if (!Array.isArray(wanted)) wanted = [];

      const wantedList = wanted.map(item => {
        if (item && typeof item === 'object') {
          return {
            name: String(item.name || item.subject || '').trim(),
            type: String(item.type || item.class_type || '').trim().toLowerCase()
          };
        }
        return { name: String(item).trim(), type: '' };
      }).filter(x => x.name);

      const wantedSet = wantedList.map(x => x.name.toLowerCase());
      const typeByName = {};
      wantedList.forEach(x => { typeByName[x.name.toLowerCase()] = x.type; });

      if (!wantedSet.length) { SUBJECTS = []; renderSubjects([]); return; }

      const grade = (PROFILE.class || '').toString().trim().toLowerCase();
      const board = (PROFILE.board || '').toString().trim().toLowerCase();

      const { data: allSubjects, error: sErr } = await sb.from('subjects').select('*');
      if (sErr) throw sErr;

      const picked = (allSubjects || []).filter(s => {
        const nameMatch = wantedSet.includes((s.name || '').trim().toLowerCase())
                       || wantedSet.includes((s.code || '').trim().toLowerCase());
        if (!nameMatch) return false;
        const fees = parseFees(s.fees);
        if (!fees.length) return true;
        return fees.some(f => feeMatches(f, grade, board));
      });

      if (!picked.length) { SUBJECTS = []; renderSubjects([]); return; }

      const enriched = await Promise.all(picked.map(async s => {
        let done = 0, avg = 0;

        const rawType = typeByName[(s.name || '').trim().toLowerCase()]
                     || typeByName[(s.code || '').trim().toLowerCase()]
                     || prefType || 'group';
        const subjType = /ind|1|one/.test(String(rawType).toLowerCase()) ? 'individual' : 'group';

        const [{ count }, { data: scores }, { data: pubAssigns }] = await Promise.all([
          sb.from('assessments').select('*', { count: 'exact', head: true }).eq('subject_id', s.id).eq('student_id', PROFILE.id),
          sb.from('assessments').select('student_score, name').eq('subject_id', s.id).eq('student_id', PROFILE.id),
          sb.from('assignments').select('title, max_score').eq('subject_id', s.id).eq('status', 'published')
        ]);
        done = count || 0;
        const maxMap = {};
        (pubAssigns || []).forEach(a => { maxMap[(a.title || '').trim()] = Number(a.max_score) || 0; });
        avg = avgPercent(scores, maxMap) || 0;

        return {
          ...s,
          _status: 'active',
          _class_type: subjType,
          _done: done,
          _avg: avg,
          _due_in: 0,
          _last_paid: '—',
          _valid_until: '—',
          _validity_pct: 0
        };
      }));

      SUBJECTS = enriched;
      renderSubjects(enriched);
    } catch (e) {
      console.error('loadSubjects error:', e);
      toast('Could not load AP subjects: ' + e.message, 'err');
      SUBJECTS = [];
      renderSubjects([]);
    }
    return;
  }
}

function renderSubjects(list) {
  const ct = document.getElementById('stat-subj-ct');
  if (ct) ct.textContent = list.length;
  if (!list.length) {
    document.getElementById('subj-grid').innerHTML = '<tr><td colspan="4" class="loading-state">No AP subjects found. Please contact admin.</td></tr>';
    return;
  }
  document.getElementById('subj-grid').innerHTML = list.map(buildCard).join('');
}

function buildCard(s) {
  const scoreCls = s._avg >= 80 ? 'high' : s._avg >= 60 ? 'mid' : s._avg > 0 ? 'low' : 'none';
  const scoreTxt = s._avg > 0 ? s._avg + '%' : '—';
  return `<tr onclick="openSubject('${s.id}')" style="cursor:pointer;">
    <td>
      <div class="row-subject">${s.icon} ${s.name}</div>
      <div class="row-teacher">${s.teacher}</div>
    </td>
    <td>${s._done}/${s.total_assessments} assessments</td>
    <td><span class="avg-score-badge ${scoreCls}">${scoreTxt}</span></td>
    <td><span class="action-link" onclick="event.stopPropagation();openSubject('${s.id}')">Open →</span></td>
  </tr>`;
}

const MAIN_NAV_HTML = `
  <div class="sb-item active" data-view="view-subjects" onclick="switchDashView(this,'view-subjects')"><span class="sb-ic">📄</span> My Subjects</div>
  <div class="sb-item" data-view="view-worksheets" onclick="switchDashView(this,'view-worksheets')"><span class="sb-ic">📝</span> Worksheets</div>
  <div class="sb-item" data-view="view-notices" onclick="switchDashView(this,'view-notices')"><span class="sb-ic">🔔</span> Notices</div>
`;

function switchDashView(el, viewId) {
  document.querySelectorAll('.sb-item, .view-tab').forEach(x => x.classList.toggle('active', x.dataset.view === viewId));
  document.querySelectorAll('.data-view').forEach(v => v.classList.toggle('active', v.id === viewId));
  document.querySelector('.stats-row').style.display = '';
  document.querySelector('.view-tabs').style.display = '';
  document.querySelector('.banner-note').style.display = '';
}

function showSubjectView() {
  document.querySelectorAll('.sb-item, .view-tab').forEach(x => x.classList.remove('active'));
  document.querySelectorAll('.data-view').forEach(v => v.classList.remove('active'));
  document.getElementById('view-subject').classList.add('active');
  document.querySelector('.stats-row').style.display = 'none';
  document.querySelector('.view-tabs').style.display = 'none';
  document.querySelector('.banner-note').style.display = 'none';
  const roleTag = document.getElementById('sb-role-tag');
  const menuLbl = document.getElementById('sb-menu-lbl');
  if (roleTag) roleTag.textContent = (CUR_SUBJ ? CUR_SUBJ.name : 'Subject');
  if (menuLbl) menuLbl.textContent = 'Modules';
  window.scrollTo(0, 0);
}

function filterDashTables(q) {
  q = (q || '').trim().toLowerCase();
  document.querySelectorAll('.data-view.active tbody tr').forEach(tr => {
    tr.style.display = !q || tr.textContent.toLowerCase().includes(q) ? '' : 'none';
  });
}

/* ════════════════════════════════════════════════
   ✅ WORKSHEETS OVERVIEW — now module-wise
════════════════════════════════════════════════ */
async function loadWorksheetsOverview() {
  const tbody = document.getElementById('worksheets-body');
  if (!tbody) return;
  if (!IS_LIVE || !SUBJECTS.length) {
    renderWorksheetsTable([]);
    return;
  }
  tbody.innerHTML = '<tr><td colspan="7" class="loading-state">Loading worksheets…</td></tr>';
  const sg = (PROFILE.class || ''), sbd = (PROFILE.board || '');
  const rows = [];
  await Promise.all(SUBJECTS.map(async s => {
    try {
      const { data: assignsRaw } = await sb.from('assignments').select('*')
        .eq('subject_id', s.id).eq('status', 'published').order('due_date');
      const assigns = (assignsRaw || []).filter(a => assignmentInScope(a, sg, sbd));
      if (!assigns.length) return;
      const { data: subs } = await sb.from('assignment_submissions').select('*')
        .eq('student_id', PROFILE.id).in('assignment_id', assigns.map(a => a.id));
      const subMap = {};
      (subs || []).forEach(x => subMap[x.assignment_id] = x);
      const { data: scoreRows } = await sb.from('assessments').select('name, student_score')
        .eq('subject_id', s.id).eq('student_id', PROFILE.id);
      const scoreMap = {};
      (scoreRows || []).forEach(r => { scoreMap[(r.name || '').trim()] = Number(r.student_score); });
      assigns.forEach(a => {
        const sub = subMap[a.id];
        const sv = scoreMap[(a.title || '').trim()];
        rows.push({ subject: s, assignment: a, submission: sub, score: (sv !== undefined && !isNaN(sv)) ? sv : null });
      });
    } catch (e) { console.error('loadWorksheetsOverview subject error:', e); }
  }));
  window._worksheetRows = rows;
  renderWorksheetsTable(rows);
}

function renderWorksheetsTable(rows) {
  const tbody = document.getElementById('worksheets-body');
  const assignedCt = rows.length;
  const doneCt = rows.filter(r => r.submission).length;
  const scoredPcts = rows.filter(r => r.score !== null && r.assignment.max_score > 0)
    .map(r => Math.round((r.score / r.assignment.max_score) * 100));
  const avgScore = scoredPcts.length ? Math.round(scoredPcts.reduce((a, b) => a + b, 0) / scoredPcts.length) : null;

  const setTxt = (id, v) => { const e = document.getElementById(id); if (e) e.textContent = v; };
  setTxt('stat-ws-assigned', assignedCt);
  setTxt('stat-ws-done', doneCt);
  setTxt('stat-ws-avg', avgScore !== null ? avgScore + '%' : '—');

  if (!tbody) return;
  if (!rows.length) {
    tbody.innerHTML = '<tr><td colspan="7" class="loading-state">No worksheets yet.</td></tr>';
    return;
  }

  tbody.innerHTML = rows.map(r => {
    const a = r.assignment, sub = r.submission;
    const daysLeft = Math.ceil((new Date(a.due_date) - new Date()) / 86400000);
    const overdue = daysLeft < 0;
    const dueLbl = overdue
      ? '<span style="color:var(--red);">Overdue</span>'
      : new Date(a.due_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
    const statusHTML = sub ? '<span class="rmk excellent">Submitted</span>'
      : overdue ? '<span class="rmk below">Missed</span>'
      : '<span class="rmk average">Pending</span>';
    const scoreTxt = r.score !== null ? r.score + ' / ' + a.max_score : '—';
    return `<tr>
      <td>${a.title}<div class="row-teacher">${a.type || 'Worksheet'}</div></td>
      <td>${r.subject.icon} ${r.subject.name}</td>
      <td>${moduleLabel(a.module)}</td>
      <td>${dueLbl}</td>
      <td>${statusHTML}</td>
      <td>${scoreTxt}</td>
      <td><span class="action-link" onclick="openSubject('${r.subject.id}')">Open subject →</span></td>
    </tr>`;
  }).join('');
}

/* ── SUBJECT DETAIL ── */
async function openSubject(subjectId) {
  const s = SUBJECTS.find(x => x.id === subjectId);
  if (!s) return;
  CUR_SUBJ = s;
  const di = document.getElementById('d-icon');
  di.textContent = s.icon;
  di.className = `dh-icon ${s.color_class || 'c1'}`;
  document.getElementById('d-title').textContent = s.name;
  document.getElementById('d-meta').innerHTML = s.teacher;

  renderAssessmentWidget(s);
  renderAvgWidget(s);
  const _pw = document.getElementById('pay-widget');
  if (_pw) _pw.style.display = 'none';

  showSubjectView();
  const [monthly, assessments] = await Promise.all([fetchMonthly(s.id), fetchAssessments(s.id)]);
  renderChart(monthly);
  renderTable(s, assessments);
  await loadAssignments(s.id);
}

function renderAssessmentWidget(s) {
  const pct = Math.round((s._done / s.total_assessments) * 100);
  const circ = 2 * Math.PI * 28, dash = (pct / 100) * circ;
  document.getElementById('ring-arc').setAttribute('stroke-dasharray', `${dash} ${circ}`);
  document.getElementById('ring-pct').textContent = pct + '%';
  document.getElementById('w-done').textContent = s._done;
  document.getElementById('w-tot').textContent = s.total_assessments;
  document.getElementById('w-rem').textContent = `${s.total_assessments - s._done} remaining`;
}

function renderAvgWidget(s) {
  const avg = s._avg || 0;
  const color = avg >= 80 ? 'var(--green)' : avg >= 60 ? 'var(--gold)' : 'var(--red)';
  document.getElementById('w-avg').textContent = avg;
  document.getElementById('w-avg').style.color = color;
  document.getElementById('avg-fill').style.width = avg + '%';
  document.getElementById('avg-fill').style.background = color;
  document.getElementById('w-vs').textContent = avg >= 75 ? '↑ Above class average' : '↓ Below class average';
}

async function fetchMonthly(subjectId) {
  if (!IS_LIVE) return [];
  const { data } = await sb.from('assessments')
    .select('conducted_month,student_score,class_avg_score')
    .eq('subject_id', subjectId).eq('student_id', PROFILE.id)
    .order('conducted_at', { ascending: true });
  const map = {};
  (data || []).forEach(r => {
    const m = r.conducted_month || '—';
    if (!map[m]) map[m] = { scores: [], avgs: [] };
    map[m].scores.push(Number(r.student_score));
    map[m].avgs.push(Number(r.class_avg_score));
  });
  return Object.entries(map).map(([month, v]) => ({
    month,
    score: Math.round(v.scores.reduce((a, b) => a + b, 0) / v.scores.length),
    avg: Math.round(v.avgs.reduce((a, b) => a + b, 0) / v.avgs.length),
  }));
}

function renderChart(data) {
  if (!data.length) {
    document.getElementById('chart-area').innerHTML = '<div class="loading-state">No assessment data yet.</div>';
    return;
  }
  const maxVal = Math.max(...data.map(d => d.score), ...data.map(d => d.avg), 1);
  document.getElementById('chart-area').innerHTML = data.map(d => `
    <div class="cbg">
      <div class="cbars">
        <div class="cbar" style="height:${(d.avg / maxVal) * 110}px;background:rgba(36,84,199,.22);"></div>
        <div class="cbar" style="height:${(d.score / maxVal) * 110}px;background:var(--gold);"></div>
      </div>
      <div class="cmonth">${d.month}</div>
    </div>`).join('');
}

async function fetchAssessments(subjectId) {
  if (!IS_LIVE) return [];
  const [{ data, error }, { data: pubAssigns }] = await Promise.all([
    sb.from('assessments')
      .select('*')
      .eq('subject_id', subjectId)
      .eq('student_id', PROFILE.id)
      .order('conducted_at', { ascending: true }),
    sb.from('assignments').select('title, max_score').eq('subject_id', subjectId).eq('status', 'published')
  ]);
  if (error) return [];
  const maxMap = {};
  (pubAssigns || []).forEach(a => { maxMap[(a.title || '').trim()] = Number(a.max_score) || 0; });
  return (data || []).map(r => {
    const max = Number(maxMap[(r.name || '').trim()]) || 0;
    const rawScore = Number(r.student_score);
    const rawAvg = Number(r.class_avg_score);
    const pct = v => (max > 0 ? Math.round((Number(v) / max) * 100) : Number(v));
    return {
      name: r.name,
      max,
      score: rawScore,
      avg: rawAvg,
      scorePct: pct(rawScore),
      avgPct: pct(rawAvg),
      remarks: (r.remarks || '').trim()
    };
  });
}

function renderTable(s, assessments) {
  const done = assessments.length;
  const total = s.total_assessments;
  document.getElementById('tbl-meta').textContent = `${done} completed · ${total - done} upcoming`;

  const rows = assessments.map((a, i) => {
    const bc = a.scorePct >= 80 ? 'high' : a.scorePct >= 65 ? 'mid' : 'low';
    const maxTxt = a.max > 0 ? ' / ' + a.max : '';
    const teacherRemark = (a.remarks || '').trim();
    const remarkHTML = teacherRemark
      ? `<span style="display:inline-block;padding:4px 12px;background:var(--teal-dim);border:1px solid rgba(36,84,199,0.25);border-radius:8px;color:var(--teal);font-size:12px;font-weight:500;white-space:nowrap;">${teacherRemark}</span>`
      : '<span style="color:var(--muted);font-size:12px;">—</span>';

    return `<tr>
      <td style="color:var(--muted);width:40px;">${String(i + 1).padStart(2, '0')}</td>
      <td style="font-weight:500;">${a.name}</td>
      <td><div class="sbw"><span style="color:var(--muted);">${a.scorePct}%</span>
        <div class="smb"><div class="smf mid" style="width:${a.scorePct}%"></div></div></div></td>
      <td><div class="sbw"><span>${a.score}${maxTxt}</span>
        <div class="smb"><div class="smf ${bc}" style="width:${a.scorePct}%"></div></div></div></td>
      <td>${remarkHTML}</td>
    </tr>`;
  });

  const upcoming = Array.from({ length: total - done }, () => `<tr class="upcoming"></tr>`);
  document.getElementById('asmnt-body').innerHTML = [...rows, ...upcoming].join('');

  const _body = document.getElementById('asmnt-body');
  const _tbl = _body && _body.closest('table');
  if (_tbl) {
    _tbl.querySelectorAll('th').forEach(th => {
      if (/class\s*avg/i.test(th.textContent || '')) th.textContent = 'Percentage';
    });
  }
}

function goBack() {
  const nav = document.getElementById('sb-nav');
  if (nav) nav.innerHTML = MAIN_NAV_HTML;
  const roleTag = document.getElementById('sb-role-tag');
  const menuLbl = document.getElementById('sb-menu-lbl');
  if (roleTag) roleTag.textContent = 'AP Student';
  if (menuLbl) menuLbl.textContent = 'Menu';
  switchDashView(document.querySelector('.sb-item[data-view="view-subjects"]'), 'view-subjects');
}

/* ── SESSION RESTORE ── */
(function restoreSession() {
  const saved = loadSession();
  if (!saved) return;
  PROFILE = saved;
  setHeaderUser(saved);
  document.getElementById('subj-lbl').textContent = ['AP Subjects —', saved.class || '', saved.board ? '(' + saved.board + ')' : ''].filter(Boolean).join(' ');
  Promise.all([loadNotices(), loadSubjects()])
    .then(() => loadWorksheetsOverview())
    .then(() => showScreen('s-dash'));
})();

/* ════════════════════════════════════════════════
   ASSIGNMENTS SECTION — module-wise for the student too
════════════════════════════════════════════════ */
let CURR_ASSIGN_ID = null, CURR_ASSIGN_DATA = null;
let _currentBlobUrl = null;
let _blobUrls = {};

(function applyProtections() {
  const modalOpen = () => {
    const m = document.getElementById('view-modal');
    return m && m.style.display === 'flex';
  };

  document.addEventListener('contextmenu', function (e) {
    if (modalOpen()) e.preventDefault();
  });

  document.addEventListener('keydown', function (e) {
    if (!modalOpen()) return;
    const key = (e.key || '').toLowerCase();
    if ((e.ctrlKey || e.metaKey) && ['s', 'p', 'c', 'a', 'u'].includes(key)) {
      e.preventDefault(); return false;
    }
    if (key === 'f12') { e.preventDefault(); return false; }
  });

  function blurGuard() {
    if (!modalOpen()) return;
    const b = document.getElementById('view-modal-body');
    if (b) b.style.filter = 'blur(22px)';
  }
  function unblurGuard() {
    const b = document.getElementById('view-modal-body');
    if (b) b.style.filter = '';
  }
  document.addEventListener('visibilitychange', () => { document.hidden ? blurGuard() : unblurGuard(); });
  window.addEventListener('blur', blurGuard);
  window.addEventListener('focus', unblurGuard);

  function flashBlur(ms = 1200) {
    if (!modalOpen()) return;
    const b = document.getElementById('view-modal-body');
    if (!b) return;
    b.style.filter = 'blur(22px)';
    setTimeout(() => { b.style.filter = ''; }, ms);
  }

  async function handlePrintScreen() {
    if (!modalOpen()) return;
    flashBlur();
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(' ');
      }
    } catch (err) { }
  }
  document.addEventListener('keyup', function (e) {
    if (e.key === 'PrintScreen') handlePrintScreen();
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'PrintScreen') e.preventDefault();
  });

  document.addEventListener('keydown', function (e) {
    if (!modalOpen()) return;
    if (e.metaKey && e.shiftKey && ['3', '4', '5'].includes(e.key)) {
      flashBlur();
    }
  });
})();

function assignRowHtml(a, i, sub) {
  const daysLeft = Math.ceil((new Date(a.due_date) - new Date()) / 86400000);
  const overdue = daysLeft < 0;
  const dueLbl = overdue
    ? '<span style="color:var(--red);">Overdue ' + Math.abs(daysLeft) + 'd</span>'
    : daysLeft === 0
      ? '<span style="color:var(--orange);">Due today!</span>'
      : '<span style="color:var(--muted);">' + new Date(a.due_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) + '</span>';
  const statusHTML = sub ? '<span class="rmk excellent">Submitted</span>'
    : overdue ? '<span class="rmk below">Missed</span>'
    : '<span class="rmk average">Pending</span>';
  const safeTitle = (a.title || '').replace(/'/g, "\\'");
  const viewBtn = '<button onclick="viewAssignment(\'' + a.id + '\')" style="padding:5px 14px;background:transparent;color:var(--gold);border:1px solid var(--gold);border-radius:6px;font-size:12px;font-weight:600;cursor:pointer;margin-right:6px;">👁 View</button>';
  const submitBtn = (!sub && !overdue)
    ? '<button onclick="openSubmitModal(\'' + a.id + '\',\'' + safeTitle + '\')" style="padding:5px 14px;background:var(--gold);color:#fff;border:none;border-radius:6px;font-size:12px;font-weight:700;cursor:pointer;">Submit</button>'
    : (sub && sub.file_url
      ? '<a href="' + sub.file_url + '" target="_blank" style="padding:5px 12px;background:transparent;color:var(--green);border:1px solid var(--green);border-radius:6px;font-size:12px;font-weight:600;text-decoration:none;">My Work</a>'
      : '<span style="font-size:12px;color:var(--muted);">No file</span>');
  return '<tr>'
    + '<td style="color:var(--muted);width:36px;">' + String(i + 1).padStart(2, '0') + '</td>'
    + '<td style="font-weight:500;">' + a.title + '</td>'
    + '<td style="color:var(--muted);font-size:13px;">' + (a.type || 'Assignment') + '</td>'
    + '<td>' + dueLbl + '</td>'
    + '<td style="text-align:center;">' + a.max_score + '</td>'
    + '<td>' + statusHTML + '</td>'
    + '<td style="white-space:nowrap;">' + viewBtn + submitBtn + '</td>'
    + '</tr>';
}

let STUD_ASSIGNS = [], STUD_SUBS = {}, SEL_STUD_MODULE = 'all';

async function loadAssignments(subjectId) {
  const section = document.getElementById('assign-section');
  const list = document.getElementById('assign-list-student');
  const lbl = document.getElementById('assign-count-lbl');
  if (!section) return;
  section.style.display = 'block';
  list.innerHTML = '<div class="loading-state">Loading assignments...</div>';
  try {
    const { data: assignsRaw, error } = await sb.from('assignments').select('*')
      .eq('subject_id', subjectId).eq('status', 'published').order('due_date');
    if (error) throw error;
    const sg = (PROFILE.class || ''), sbd = (PROFILE.board || '');
    const assigns = (assignsRaw || []).filter(a => assignmentInScope(a, sg, sbd));
    STUD_ASSIGNS = assigns;
    STUD_SUBS = {};
    if (!assigns || assigns.length === 0) {
      lbl.textContent = '0 assignments';
      list.innerHTML = '<div class="loading-state">No assignments yet.</div>';
      return;
    }
    const { data: subs } = await sb.from('assignment_submissions').select('*')
      .eq('student_id', PROFILE.id).in('assignment_id', assigns.map(a => a.id));
    const subMap = {};
    (subs || []).forEach(s => subMap[s.assignment_id] = s);
    STUD_SUBS = subMap;
    window._assignCache = {};
    assigns.forEach(a => { window._assignCache[a.id] = a; });
    window._subCache = subMap;

    SEL_STUD_MODULE = 'all';
    renderStudModuleSidebar();
    renderStudModuleContent(SEL_STUD_MODULE);
  } catch (e) {
    list.innerHTML = '<div class="loading-state" style="color:var(--red);">Error: ' + e.message + '</div>';
  }
}

/* ✅ Left sidebar of modules for the student, same navigation pattern
   as the teacher portal — click a module to see just its worksheets. */
function renderStudModuleSidebar() {
  const wrap = document.getElementById('sb-nav');
  if (!wrap) return;
  const counts = {};
  AP_MODULES.forEach(m => counts[m] = 0);
  STUD_ASSIGNS.forEach(a => {
    const k = moduleLabel(a.module);
    if (counts[k] != null) counts[k]++;
  });
  let html = `<div class="sb-item" onclick="goBack()"><span class="sb-ic">←</span> Back to Subjects</div>`;
  html += `<button class="sb-item ${SEL_STUD_MODULE === 'all' ? 'active' : ''}" style="width:100%;border:none;text-align:left;margin-top:10px;" onclick="selectStudModule('all')"><span class="sb-ic">📋</span> All Worksheets</button>`;
  html += AP_MODULES.map(m =>
    `<button class="sb-item ${m === SEL_STUD_MODULE ? 'active' : ''}" style="width:100%;border:none;text-align:left;" onclick="selectStudModule('${m}')"><span class="sb-ic">📄</span> ${m}${counts[m] ? ` <span class="mod-count">${counts[m]}</span>` : ''}</button>`
  ).join('');
  wrap.innerHTML = html;
}

function selectStudModule(m) {
  SEL_STUD_MODULE = m;
  renderStudModuleSidebar();
  renderStudModuleContent(m);
}

function renderStudModuleContent(m) {
  const list = document.getElementById('assign-list-student');
  const lbl = document.getElementById('assign-count-lbl');
  const titleEl = document.getElementById('assign-section-title');
  if (!list) return;
  const rows = (m === 'all') ? STUD_ASSIGNS : STUD_ASSIGNS.filter(a => moduleLabel(a.module) === m);
  const doneCt = rows.filter(a => STUD_SUBS[a.id]).length;
  if (titleEl) titleEl.textContent = (m === 'all') ? 'All Worksheets' : m;
  if (lbl) lbl.textContent = rows.length + ' worksheet' + (rows.length !== 1 ? 's' : '') + ' · ' + doneCt + ' completed';
  if (!rows.length) {
    list.innerHTML = '<div class="loading-state">No worksheets in ' + (m === 'all' ? 'this subject' : m) + ' yet.</div>';
    return;
  }
  list.innerHTML = '<div class="table-card" style="overflow-x:auto;"><table><thead><tr>'
    + '<th>#</th><th>Assignment</th><th>Type</th><th>Due Date</th><th>Max</th><th>Status</th><th>Action</th>'
    + '</tr></thead><tbody>'
    + rows.map((a, i) => assignRowHtml(a, i, STUD_SUBS[a.id])).join('')
    + '</tbody></table></div>';
}

async function viewAssignment(assignId) {
  const a = (window._assignCache || {})[assignId];
  const sub = (window._subCache || {})[assignId];
  if (!a) return;
  CURR_ASSIGN_DATA = a;
  const daysLeft = Math.ceil((new Date(a.due_date) - new Date()) / 86400000);
  const overdue = daysLeft < 0;
  const duePill = overdue
    ? '<span style="background:var(--red-dim);color:var(--red);padding:4px 12px;border-radius:20px;font-size:12px;">Overdue by ' + Math.abs(daysLeft) + ' day(s)</span>'
    : daysLeft === 0
      ? '<span style="background:var(--orange-dim);color:var(--orange);padding:4px 12px;border-radius:20px;font-size:12px;">Due Today!</span>'
      : '<span style="background:var(--green-dim);color:var(--green);padding:4px 12px;border-radius:20px;font-size:12px;">Due in ' + daysLeft + ' day(s)</span>';
  const wName = (PROFILE.full_name || 'Student').toUpperCase();
  const wRoll = PROFILE.roll_number || '';
  const wText = wName + (wRoll ? '  |  ' + wRoll : '');
  const wUser = PROFILE.username ? '@' + PROFILE.username : (wRoll || '');
  const wStamp = (() => { const d = new Date(), p = n => String(n).padStart(2, '0');
    return p(d.getDate()) + '/' + p(d.getMonth() + 1) + '/' + d.getFullYear() + ' ' + p(d.getHours()) + ':' + p(d.getMinutes()); })();
  let contentHTML = '';
  if (a.file_url) {
    const wmRow = Array(30).fill('<span style="font-size:12px;font-weight:700;color:#fff;white-space:nowrap;letter-spacing:1px;padding:0 20px;">' + wText + '</span>').join('');
    contentHTML = '<div style="position:relative;border-radius:10px;overflow:hidden;background:#14161a;">'
      + '<div style="position:absolute;inset:0;z-index:20;pointer-events:none;">'
      + '<div style="position:absolute;inset:0;overflow:hidden;display:flex;flex-wrap:wrap;align-items:center;justify-content:center;gap:30px 10px;transform:rotate(-30deg) scale(1.8);opacity:0.12;">' + wmRow + wmRow + wmRow + '</div>'
      + '<div style="position:absolute;bottom:14px;right:16px;font-size:11px;font-weight:700;color:rgba(255,255,255,0.4);letter-spacing:1px;">' + wText + '</div>'
      + '<div style="position:absolute;top:14px;left:16px;font-size:11px;font-weight:700;color:rgba(255,255,255,0.4);letter-spacing:1px;">' + wText + '</div>'
      + '</div>'
      + '<div id="pdf-frame-container" style="width:100%;height:72vh;min-height:500px;display:flex;align-items:center;justify-content:center;color:#fff;font-size:13px;">'
      + '<span class="spinner" style="margin-right:10px;"></span>Loading worksheet…'
      + '</div>'
      + '</div>';
  } else if (a.instructions) {
    contentHTML = '<div style="position:relative;border-radius:10px;overflow:hidden;">'
      + '<div style="position:absolute;inset:0;z-index:2;pointer-events:none;overflow:hidden;display:flex;flex-wrap:wrap;align-items:center;justify-content:center;gap:40px;transform:rotate(-25deg) scale(1.4);opacity:0.08;">'
      + Array(20).fill('<span style="font-size:13px;font-weight:700;color:var(--gold);white-space:nowrap;">' + wText + '</span>').join('')
      + '</div>'
      + '<div style="position:relative;z-index:1;padding:24px;background:var(--card2);border:1px solid var(--border);border-radius:10px;font-size:14px;line-height:1.9;color:var(--cream);user-select:none;-webkit-user-select:none;" oncontextmenu="return false;" onselectstart="return false;">' + a.instructions + '</div>'
      + '</div>';
  } else {
    contentHTML = '<div style="padding:20px;text-align:center;color:var(--muted);">No content available.</div>';
  }
  const teacherComment = (sub && sub.teacher_remarks && sub.teacher_remarks.trim())
    ? '<div style="margin-top:12px;padding:14px 16px;background:var(--teal-dim);border:1px solid rgba(36,84,199,0.28);border-radius:10px;">'
      + '<div style="font-size:11px;text-transform:uppercase;letter-spacing:1px;color:var(--navy);font-weight:700;margin-bottom:6px;">📝 Teacher\'s Comment</div>'
      + '<div style="font-size:13.5px;color:var(--navy);line-height:1.65;">' + sub.teacher_remarks + '</div></div>'
    : '';
  const footerHTML = sub
    ? '<div style="padding:14px 18px;background:var(--green-dim);border:1px solid rgba(31,138,82,0.3);border-radius:10px;display:flex;align-items:center;gap:12px;"><span style="font-size:22px;">✅</span><div><div style="color:var(--green);font-weight:600;">Assignment Submitted</div><div style="font-size:12px;color:var(--muted);">' + new Date(sub.submitted_at).toLocaleString('en-IN') + '</div></div></div>' + teacherComment
    : overdue
      ? '<div style="padding:14px;background:var(--red-dim);border:1px solid rgba(194,59,52,0.3);border-radius:10px;color:var(--red);font-weight:600;">Deadline passed — Submission closed</div>'
      : '<div style="text-align:right;"><button onclick="closeViewModal();openSubmitModal(\'' + a.id + '\',\'' + (a.title || '').replace(/'/g, "\\'") + '\');" style="padding:11px 28px;background:var(--gold);color:#fff;border:none;border-radius:8px;font-size:14px;font-weight:700;cursor:pointer;">Submit Assignment →</button></div>';
  const checkedBlock = (sub && sub.checked_file_url)
    ? '<div style="margin-top:18px;">'
      + '<div style="font-size:11px;text-transform:uppercase;letter-spacing:1px;color:var(--gold);font-weight:700;margin-bottom:8px;">📄 Checked Worksheet (by Teacher)</div>'
      + '<div id="checked-frame-container" style="width:100%;height:62vh;min-height:420px;display:flex;align-items:center;justify-content:center;background:#14161a;border-radius:10px;color:#fff;font-size:13px;"><span class="spinner" style="margin-right:10px;"></span>Loading checked worksheet…</div>'
      + '</div>'
    : '';
  document.getElementById('view-modal-body').innerHTML =
    '<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:16px;">'
    + '<div><div style="font-size:11px;font-weight:600;letter-spacing:1px;text-transform:uppercase;color:var(--muted);margin-bottom:5px;">' + (a.type || 'Assignment') + '</div>'
    + '<div style="font-family:\'Cormorant Garamond\',serif;font-size:22px;font-weight:700;color:var(--muted);">' + a.title + '</div></div>'
    + '<button onclick="closeViewModal()" style="background:var(--card3);border:none;color:var(--muted);font-size:18px;cursor:pointer;border-radius:50%;width:34px;height:34px;">&times;</button>'
    + '</div>'
    + '</div>'
    + '<div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:16px;">'
    + duePill + '<span style="background:var(--card3);color:var(--cream);padding:4px 12px;border-radius:20px;font-size:12px;">Max: ' + a.max_score + ' marks</span>'
    + '</div>'
   + '<div style="display:flex;align-items:center;gap:8px;margin-bottom:16px;padding:9px 14px;'
    + 'background:var(--card2);border:1px solid var(--border2);border-radius:9px;'
    + 'font-size:12px;color:var(--gold);line-height:1.5;">'
    + '🔒 Licensed to <strong style="color:var(--cream);">' + (PROFILE.full_name || 'Student') + '</strong>'
    + (wUser ? ' <span style="opacity:.85;">(' + wUser + ')</span>' : '')
    + ' - <span style="opacity:.85;">' + wStamp + '</span> — sharing is traceable to you.'
    + '</div>'
    + contentHTML
    + '<div style="margin-top:18px;">' + footerHTML + '</div>'
    + checkedBlock;

  const _vm = document.getElementById('view-modal');
  let _card = document.getElementById('view-modal-body');
  while (_card && _card.parentElement && _card.parentElement.id !== 'view-modal') _card = _card.parentElement;
  if (_card) { _card.style.maxWidth = '1150px'; _card.style.width = '94vw'; }

  document.getElementById('view-modal').style.display = 'flex';

  if (a.file_url) loadPdfBlob(a.file_url, 'pdf-frame-container');
  if (sub && sub.checked_file_url) loadPdfBlob(sub.checked_file_url, 'checked-frame-container');
  document.getElementById('view-modal').style.display = 'flex';
  applyModalWatermark();
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

async function loadPdfBlob(url, containerId = 'pdf-frame-container') {
  const container = document.getElementById(containerId);
  if (!container) return;

  if (_blobUrls[containerId]) { try { URL.revokeObjectURL(_blobUrls[containerId]); } catch (e) {} _blobUrls[containerId] = null; }

  const cleanUrl = url.split('#')[0].split('?')[0].toLowerCase();
  const ext = (cleanUrl.split('.').pop() || '').trim();
  const isImage  = /^(png|jpg|jpeg|gif|webp|bmp|svg)$/.test(ext);
  const isPdf    = ext === 'pdf';
  const isOffice = /^(doc|docx|ppt|pptx|xls|xlsx)$/.test(ext);

  container.style.display = 'block';

  if (isOffice) {
    const officeSrc = 'https://view.officeapps.live.com/op/embed.aspx?src=' + encodeURIComponent(url);
    container.innerHTML =
      '<iframe src="' + officeSrc + '" style="width:100%;height:72vh;min-height:500px;border:none;display:block;background:#fff;" title="Assignment Viewer"></iframe>';
    return;
  }

  try {
    const resp = await fetch(url, { cache: 'no-store' });
    if (!resp.ok) throw new Error('HTTP ' + resp.status);
    const raw = await resp.blob();
    const ctype = (resp.headers.get('content-type') || raw.type || '').toLowerCase();

    if (isImage || ctype.startsWith('image/')) {
      const blobUrl = URL.createObjectURL(raw);
      _blobUrls[containerId] = blobUrl;
      container.innerHTML =
        '<div style="width:100%;height:72vh;min-height:500px;overflow:auto;display:flex;align-items:flex-start;justify-content:center;background:#14161a;padding:16px;box-sizing:border-box;">'
        + '<img src="' + blobUrl + '" style="max-width:100%;height:auto;border-radius:6px;" oncontextmenu="return false;" draggable="false" alt="Worksheet" />'
        + '</div>';
      return;
    }

    if (isPdf || ctype.includes('pdf')) {
      const pdfjsLib = await ensurePdfJs();
      const arrayBuffer = await raw.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

      container.innerHTML = '';
      const scroller = document.createElement('div');
      scroller.style.cssText =
        'width:100%;height:72vh;min-height:500px;overflow:auto;background:#14161a;padding:10px;box-sizing:border-box;-webkit-overflow-scrolling:touch;';
      scroller.oncontextmenu = () => false;
      container.appendChild(scroller);

      const dpr = window.devicePixelRatio || 1;
      const availW = (scroller.clientWidth || container.clientWidth || 350) - 20;

      for (let p = 1; p <= pdf.numPages; p++) {
        const page = await pdf.getPage(p);
        const base = page.getViewport({ scale: 1 });
        const cssScale = availW / base.width;
        const vp = page.getViewport({ scale: cssScale * dpr });

        const canvas = document.createElement('canvas');
        canvas.width = vp.width;
        canvas.height = vp.height;
        canvas.style.cssText =
          'display:block;margin:0 auto 12px;width:100%;max-width:' + (base.width * cssScale) + 'px;height:auto;border-radius:6px;';
        canvas.oncontextmenu = () => false;
        scroller.appendChild(canvas);

        await page.render({ canvasContext: canvas.getContext('2d'), viewport: vp }).promise;
      }
      return;
    }

    container.style.display = 'flex';
    container.innerHTML =
      '<div style="padding:30px;text-align:center;color:#cbd5e1;font-size:13px;line-height:1.7;">'
      + 'This file cannot be previewed here (type: ' + (ext || 'unknown') + ').<br><br>'
      + '<a href="' + url + '" target="_blank" rel="noopener" style="color:var(--gold);font-weight:600;">Open in new tab →</a></div>';
  } catch (e) {
    container.style.display = 'flex';
    container.innerHTML =
      '<div style="padding:30px;text-align:center;color:var(--red);font-size:13px;line-height:1.7;">'
      + 'Could not load the worksheet.<br>(' + e.message + ')<br><br>'
      + '<a href="' + url + '" target="_blank" rel="noopener" style="color:var(--gold);font-weight:600;">Open in new tab →</a></div>';
  }
}
function closeViewModal() {
  document.getElementById('view-modal').style.display = 'none';
  if (_wmTimer) { clearInterval(_wmTimer); _wmTimer = null; }
  if (_currentBlobUrl) { try { URL.revokeObjectURL(_currentBlobUrl); } catch (e) {} _currentBlobUrl = null; }
  Object.keys(_blobUrls).forEach(k => { try { URL.revokeObjectURL(_blobUrls[k]); } catch (e) {} });
  _blobUrls = {};
  const c = document.getElementById('pdf-frame-container');
  if (c) c.innerHTML = '';
}

function openSubmitModal(assignId, assignTitle) {
  CURR_ASSIGN_ID = assignId;
  document.getElementById('modal-assign-title').textContent = assignTitle;
  document.getElementById('submit-file-input').value = '';
  document.getElementById('submit-err').style.display = 'none';
  document.getElementById('submit-modal').style.display = 'flex';
}

function closeSubmitModal() {
  document.getElementById('submit-modal').style.display = 'none';
  CURR_ASSIGN_ID = null;
}

async function doSubmitAssignment() {
  const file = document.getElementById('submit-file-input').files[0];
  const err = document.getElementById('submit-err');
  err.style.display = 'none';
  if (!file) { err.textContent = 'Please select a file.'; err.style.display = 'block'; return; }
  if (!CURR_ASSIGN_ID) return;
  const btn = document.querySelector('#submit-modal button[onclick="doSubmitAssignment()"]');
  if (btn) { btn.disabled = true; btn.textContent = 'Submitting...'; }
  try {
    const path = PROFILE.id + '/' + CURR_ASSIGN_ID + '/' + Date.now() + '_' + file.name;
    let fileUrl = '';
    const { error: ue } = await sb.storage.from('peak-submissions').upload(path, file, { upsert: true });
    if (!ue) fileUrl = sb.storage.from('peak-submissions').getPublicUrl(path).data.publicUrl;
    const { error: ie } = await sb.from('assignment_submissions').upsert({
      assignment_id: CURR_ASSIGN_ID,
      student_id: PROFILE.id,
      file_url: fileUrl,
      file_name: file.name,
      file_size: file.size,
      status: 'submitted',
      submitted_at: new Date().toISOString()
    }, { onConflict: 'assignment_id,student_id' });
    if (ie) throw ie;
    closeSubmitModal();
    toast('Assignment submitted successfully!', 'ok');
    await loadAssignments(CUR_SUBJ.id);
  } catch (e) {
    err.textContent = e.message;
    err.style.display = 'block';
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = 'Submit'; }
  }
}