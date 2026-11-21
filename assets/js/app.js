// UjiKu CBT — bootstrap aplikasi: router hash, cangkang staf, sesi login.
import * as api from './core/api.js';
import * as store from './core/store.js';
import { html, raw, icon, $, $$, on, toast, toastErr, popMenu, fmt, initials, debounce, esc } from './core/ui.js';
import { LOGO } from './core/art.js';

const ROUTES = [
  { p: '/masuk', m: 'login', shell: 'public' },
  { p: '/aktivasi', m: 'aktivasi', shell: 'public' },
  { p: '/daftar', m: 'daftar', shell: 'public' },
  { p: '/beranda', m: 'landing', shell: 'public' },
  { p: '/sa', m: 'sa-dashboard', role: ['super_admin'] },
  { p: '/sa/lembaga', m: 'sa-lembaga', role: ['super_admin'] },
  { p: '/sa/pendaftaran', m: 'sa-pendaftaran', role: ['super_admin'] },
  { p: '/sa/poin', m: 'sa-poin', role: ['super_admin'] },
  { p: '/sa/server', m: 'sa-server', role: ['super_admin'] },
  { p: '/sa/pengaturan', m: 'sa-pengaturan', role: ['super_admin'] },
  { p: '/admin', m: 'ad-dashboard', role: ['admin'] },
  { p: '/admin/guru', m: 'ad-guru', role: ['admin'] },
  { p: '/admin/peserta', m: 'ad-peserta', role: ['admin'] },
  { p: '/admin/ujian', m: 'ad-ujian', role: ['admin'] },
  { p: '/admin/ujian/baru', m: 'ad-ujian-form', role: ['admin'] },
  { p: '/admin/ujian/:id', m: 'ad-ujian-form', role: ['admin'] },
  { p: '/admin/poin', m: 'ad-poin', role: ['admin'] },
  { p: '/admin/server', m: 'ad-server', role: ['admin'] },
  { p: '/admin/pengaturan', m: 'ad-pengaturan', role: ['admin'] },
  { p: '/guru', m: 'gr-dashboard', role: ['guru', 'admin'] },
  { p: '/bank', m: 'bank-list', role: ['admin', 'guru'] },
  { p: '/bank/:id', m: 'bank-editor', role: ['admin', 'guru'] },
  { p: '/tulis', m: 'tulis-soal', role: ['admin', 'guru'] },
  { p: '/impor', m: 'impor-word', role: ['admin', 'guru'] },
  { p: '/pantau', m: 'pantau-list', role: ['admin', 'pengawas'] },
  { p: '/pantau/:id', m: 'pantau', role: ['admin', 'pengawas'] },
  { p: '/laporan', m: 'laporan-list', role: ['admin', 'guru', 'pengawas'] },
  { p: '/laporan/:id', m: 'laporan', role: ['admin', 'guru', 'pengawas'] },
  { p: '/ujian', m: 'ps-home', shell: 'peserta' },
  { p: '/ujian/:id', m: 'ps-mulai', shell: 'peserta' },
  { p: '/ujian/:id/kerjakan', m: 'ps-exam', shell: 'exam' },
  { p: '/ujian/:id/hasil', m: 'ps-hasil', shell: 'peserta' },
];

const MODES = {
  super_admin: { label: 'Super Admin', home: '/sa' },
  admin: { label: 'Admin Lembaga', home: '/admin' },
  guru: { label: 'Guru', home: '/guru' },
  pengawas: { label: 'Pengawas', home: '/pantau' },
};
const MENUS = {
  super_admin: [
    ['g', 'Utama'], ['/sa', 'dashboard', 'Dashboard'],
    ['g', 'Lembaga & Poin'], ['/sa/lembaga', 'domain', 'Kelola Lembaga'], ['/sa/pendaftaran', 'how_to_reg', 'Pendaftaran Sekolah'], ['/sa/poin', 'payments', 'Paket & Pembelian'], ['/sa/server', 'dns', 'Server Lokal'],
    ['g', 'Sistem'], ['/sa/pengaturan', 'settings', 'Pengaturan'],
  ],
  admin: [
    ['g', 'Utama'], ['/admin', 'dashboard', 'Dashboard'],
    ['g', 'Ujian'], ['/bank', 'layers', 'Bank Soal'], ['/tulis', 'edit_note', 'Tulis Soal'], ['/impor', 'upload_file', 'Impor Word'], ['/admin/ujian', 'event_note', 'Jadwal Ujian'], ['/pantau', 'visibility', 'Pantau Sesi'],
    ['g', 'Pengguna'], ['/admin/guru', 'badge', 'Guru & Penugasan'], ['/admin/peserta', 'groups', 'Peserta'],
    ['g', 'Laporan'], ['/laporan', 'monitoring', 'Laporan Nilai'],
    ['g', 'Lainnya'], ['/admin/poin', 'toll', 'Poin & Langganan'], ['/admin/server', 'dns', 'Server Lokal'], ['/admin/pengaturan', 'settings', 'Pengaturan'],
  ],
  guru: [
    ['g', 'Utama'], ['/guru', 'dashboard', 'Dashboard'],
    ['g', 'Ruang Guru'], ['/bank', 'layers', 'Bank Soal Saya'], ['/tulis', 'edit_note', 'Tulis Soal'], ['/impor', 'upload_file', 'Impor Word'], ['/laporan', 'insights', 'Hasil & Analisis'],
  ],
  pengawas: [
    ['g', 'Pengawasan'], ['/pantau', 'visibility', 'Pantau Sesi'], ['/laporan', 'monitoring', 'Laporan Nilai'],
  ],
};
const BOTTOM = {
  super_admin: [['/sa', 'dashboard', 'Beranda'], ['/sa/lembaga', 'domain', 'Lembaga'], ['/sa/poin', 'payments', 'Poin'], ['/sa/server', 'dns', 'Server']],
  admin: [['/admin', 'dashboard', 'Beranda'], ['/bank', 'layers', 'Bank'], ['/admin/ujian', 'event_note', 'Jadwal'], ['/pantau', 'visibility', 'Pantau']],
  guru: [['/guru', 'dashboard', 'Beranda'], ['/bank', 'layers', 'Bank Soal'], ['/tulis', 'edit_note', 'Tulis'], ['/laporan', 'insights', 'Hasil']],
  pengawas: [['/pantau', 'visibility', 'Pantau'], ['/laporan', 'monitoring', 'Laporan']],
};
const QUICK = {
  super_admin: [['/sa/lembaga?baru=1', 'add_business', 'Daftarkan lembaga'], ['/sa/pendaftaran', 'how_to_reg', 'Pendaftaran sekolah'], ['/sa/poin?tab=pengajuan', 'fact_check', 'Verifikasi pembelian'], ['/sa/server', 'dns', 'Server lokal']],
  admin: [['/admin/ujian/baru', 'add_task', 'Buat jadwal ujian'], ['/tulis', 'edit_note', 'Tulis soal'], ['/impor', 'upload_file', 'Impor soal Word'], ['/pantau', 'fact_check', 'Pantau sesi']],
  guru: [['/tulis', 'edit_note', 'Tulis soal'], ['/impor', 'upload_file', 'Impor soal Word'], ['/laporan', 'insights', 'Hasil & analisis']],
  pengawas: [['/pantau', 'fact_check', 'Pantau sesi'], ['/laporan', 'monitoring', 'Laporan']],
};

const root = document.getElementById('app');
const state = { me: null, mode: null, shell: null, token: 0, cleanup: null, path: '' };

// ---------------- Router ----------------
function match(path) {
  for (const r of ROUTES) {
    const keys = [];
    const re = new RegExp('^' + r.p.replace(/:(\w+)/g, (_, k) => { keys.push(k); return '([^/]+)'; }) + '/?$');
    const m = path.match(re);
    if (m) { const params = {}; keys.forEach((k, i) => { params[k] = decodeURIComponent(m[i + 1]); }); return { r, params }; }
  }
  return null;
}
function parseHash() {
  const h = location.hash.replace(/^#/, '') || '/';
  const [path, qs] = h.split('?');
  return { path: path || '/', query: Object.fromEntries(new URLSearchParams(qs || '')) };
}
export function go(to, { replace = false } = {}) {
  const h = '#' + to;
  if (replace) history.replaceState(null, '', location.pathname + h); else history.pushState(null, '', location.pathname + h);
  route();
}
// popstate & hashchange bisa terpicu bersamaan untuk satu navigasi — cegah render ganda
const onNav = () => { if (location.hash !== state.lastHash) route(); };
window.addEventListener('popstate', onNav);
window.addEventListener('hashchange', onNav);
document.addEventListener('click', (e) => {
  const a = e.target.closest('a[href^="#/"]');
  if (!a || e.ctrlKey || e.metaKey || e.shiftKey || a.target === '_blank') return;
  e.preventDefault();
  const to = a.getAttribute('href').slice(1);
  go(to, { replace: '#' + to === location.hash });
});

const modCache = new Map();
const loadMod = (m) => { if (!modCache.has(m)) modCache.set(m, import(`./pages/${m}.js`)); return modCache.get(m); };

// ---------------- Sesi staf ----------------
async function loadMe(force = false) {
  if (!force && state.me) return state.me;
  if (!api.session()) return null;
  const cached = store.peek('me');
  if (!force && cached) { state.me = cached; api.rpc('staff_me').then((m) => { state.me = m; store.put('me', m); paintWallet(); }).catch(() => {}); return cached; }
  const me = await api.rpc('staff_me');
  store.put('me', me);
  state.me = me;
  return me;
}
export async function refreshMe() { try { await loadMe(true); paintWallet(); } catch {} }
function pickMode(me, wanted) {
  const roles = me.roles || [];
  const saved = localStorage.getItem('ujk.mode');
  for (const m of [wanted, state.mode, saved, 'super_admin', 'admin', 'guru', 'pengawas']) if (m && roles.includes(m)) return m;
  return roles[0];
}
api.onAuthChange((a) => { if (!a) { state.me = null; store.clearAll(); } });

// ---------------- Render rute ----------------
async function route() {
  let { path, query } = parseHash();
  state.lastHash = location.hash;
  const token = ++state.token;
  if (state.cleanup) { try { state.cleanup(); } catch {} state.cleanup = null; }
  document.querySelectorAll('.menu-pop').forEach((m) => m.remove());

  if (!api.configured && api.MODE === 'cloud') return renderSetup();

  if (path === '/' || path === '') {
    if (api.MODE === 'lokal') return go(api.peserta.get() ? '/ujian' : '/masuk', { replace: true });
    if (api.session()) {
      try {
        const me = await loadMe();
        if (token !== state.token) return;
        if (me?.terdaftar && !me.nonaktif) return go(MODES[pickMode(me)].home, { replace: true });
        if (me) return renderNotRegistered(me);
      } catch {}
    }
    if (api.peserta.get()) return go('/ujian', { replace: true });
    path = '/beranda';   // pengunjung tanpa sesi: halaman beranda (landing)
  }
  const hit = match(path);
  if (!hit) return go('/', { replace: true });
  const { r, params } = hit;
  const shell = r.shell || 'staff';

  if (shell === 'staff') {
    if (api.MODE === 'lokal') return go('/masuk', { replace: true });
    if (!api.session()) { sessionStorage.setItem('ujk.next', '#' + path); return go('/masuk', { replace: true }); }
    let me;
    try { me = await loadMe(); } catch (e) {
      if (!api.session()) return go('/masuk', { replace: true });
      return renderFatal(e);
    }
    if (token !== state.token) return;
    if (!me.terdaftar || me.nonaktif) return renderNotRegistered(me);
    if (!r.role.some((x) => me.roles.includes(x))) { toast('Akses ditolak', 'Halaman ini bukan untuk peran Anda.', 'warn'); return go(MODES[pickMode(me)].home, { replace: true }); }
    const routeMode = r.role.includes(state.mode) && me.roles.includes(state.mode) ? state.mode : pickMode(me, r.role.find((x) => me.roles.includes(x)));
    setMode(routeMode);
    store.setScope(me.id);
    renderStaffShell();
    highlight(path);
  } else if (shell === 'public') {
    state.shell = 'public'; root.className = ''; root.innerHTML = '';
  } else {
    if (!api.peserta.get() && r.m !== 'login') return go('/masuk', { replace: true });
    state.shell = shell; root.className = ''; root.innerHTML = '<div id="page"></div>';
  }
  const el = shell === 'staff' ? $('#page') : shell === 'public' ? root : $('#page');
  const t0 = setTimeout(() => { if (token === state.token && !el.childElementCount) el.innerHTML = '<div class="page-loading"><span class="spin" style="color:var(--primary);width:28px;height:28px"></span></div>'; }, 120);
  let mod;
  try { mod = await loadMod(r.m); } catch (e) { clearTimeout(t0); console.error(e); return renderFatal(new Error('Gagal memuat halaman. Periksa koneksi lalu muat ulang.')); }
  if (token !== state.token) return;
  clearTimeout(t0);
  el.innerHTML = '';
  if (shell === 'staff') { $('.main')?.scrollTo?.(0, 0); window.scrollTo(0, 0); }
  const ctx = {
    el, params, query, path, me: state.me, mode: state.mode, go, refreshMe, paintWallet,
    alive: () => token === state.token,
    title: (t) => { document.title = t + ' · UjiKu CBT'; },
    onCleanup: (fn) => { const prev = state.cleanup; state.cleanup = () => { prev && prev(); fn(); }; },
  };
  try {
    const out = await mod.default(ctx);
    if (typeof out === 'function') ctx.onCleanup(out);
  } catch (e) {
    console.error(e);
    if (token !== state.token) return;
    if (e.hint === 'relogin') { if (shell === 'staff') { toast('Sesi berakhir', 'Silakan masuk kembali.', 'warn'); return go('/masuk', { replace: true }); } api.peserta.clear(); return go('/masuk', { replace: true }); }
    el.innerHTML = html`<div class="card" style="margin-top:20px"><div class="empty"><div class="e-art">${icon('cloud_off')}</div><h3>Gagal memuat data</h3><p>${e.message}</p>
      <button class="btn primary" onclick="location.reload()">Muat ulang</button></div></div>`.s;
  }
}

function setMode(m) {
  if (state.mode !== m) { state.mode = m; localStorage.setItem('ujk.mode', m); state.shellMode = null; }
}

// ---------------- Cangkang staf ----------------
function renderStaffShell() {
  const me = state.me, mode = state.mode;
  if (state.shell === 'staff' && state.shellMode === mode && state.shellUser === me.id) return;
  state.shell = 'staff'; state.shellMode = mode; state.shellUser = me.id;
  const multi = (me.roles || []).filter((r) => MODES[r]);
  const footT1 = me.tenant ? me.tenant.nama : 'UjiKu CBT Pusat';
  const footT2 = me.tenant ? 'Kode: ' + me.tenant.kode : 'Super Admin';
  root.className = 'app';
  root.innerHTML = html`
  <aside class="sidebar" aria-label="Navigasi utama">
    <div class="sb-head"><span class="logo-mark">${raw(LOGO)}</span><span class="logo-text">UjiKu CBT</span>
      <button class="btn ghost icon show-sm" style="margin-left:auto;color:#fff" data-act="nav-close" aria-label="Tutup menu">${icon('close')}</button></div>
    <nav class="sb-nav">${MENUS[mode].map((it) => (it[0] === 'g' ? html`<div class="sb-group">${it[1]}</div>`
      : html`<a class="sb-link" href="#${it[0]}" data-path="${it[0]}">${icon(it[1])}<span>${it[2]}</span></a>`))}</nav>
    <div class="sb-foot"><div class="sb-ic">${icon(me.tenant ? 'school' : 'shield_person')}</div>
      <div style="min-width:0"><div class="t1 ellipsis">${footT1}</div><div class="t2">${footT2}</div></div>
      <button class="sb-out" data-act="logout">Keluar</button></div>
  </aside>
  <div class="sb-scrim" data-act="nav-close"></div>
  <div class="main">
    <header class="topbar">
      <button class="tb-btn menu-btn" data-act="nav-open" aria-label="Buka menu">${icon('menu')}</button>
      ${QUICK[mode].map((q) => html`<a class="tb-btn hide-sm" href="#${q[0]}" title="${q[2]}" aria-label="${q[2]}">${icon(q[1])}</a>`)}
      <div class="tb-search">${icon('search')}<input id="tb-q" placeholder="${mode === 'super_admin' ? 'Cari lembaga, NPSN, kode…' : 'Cari peserta, bank soal, jadwal…'}" autocomplete="off">
        <div class="tb-results hidden" id="tb-res"></div></div>
      <button class="tb-btn hide-sm" data-act="fullscreen" title="Layar penuh" style="margin-left:${mode === 'pengawas' ? 'auto' : '0'}">${icon('fullscreen')}</button>
      <button class="tb-btn" data-act="notif" title="Notifikasi" aria-label="Notifikasi">${icon('notifications')}<span class="dot hidden" id="notif-dot"></span></button>
      ${me.tenant && mode === 'admin' ? html`<a class="wallet-pill" href="#/admin/poin" id="wallet">${icon('toll')}<span id="wallet-n">${fmt.num(me.saldo)}</span><span class="lbl-txt">Poin</span></a>` : ''}
      <button class="user-btn" data-act="user"><span class="avatar">${me.avatar ? raw(`<img src="${esc(me.avatar)}" alt="" referrerpolicy="no-referrer">`) : initials(me.nama)}</span>
        <span><span class="nm">${me.nama.split(',')[0]}</span>${multi.length > 1 ? html`<span class="role-tag">${MODES[mode].label}</span>` : ''}<br>
        <span class="rl">${multi.length > 1 ? 'Ganti Peran: ' + multi.map((r) => MODES[r].label.split(' ')[0]).join(' / ') : MODES[mode].label}</span></span>
        ${icon('expand_more', 'chev')}</button>
    </header>
    <main class="content" id="page" tabindex="-1"></main>
  </div>
  <nav class="bottom-nav" aria-label="Navigasi cepat">${BOTTOM[mode].map((b) => html`<a href="#${b[0]}" data-path="${b[0]}">${icon(b[1])}<span>${b[2]}</span></a>`)}
    <a href="#" data-act="nav-open">${icon('menu')}<span>Menu</span></a></nav>`.s;

  on(root, 'click', '[data-act]', (e, b) => {
    const a = b.dataset.act;
    if (a === 'nav-open') { e.preventDefault(); root.classList.add('nav-open'); }
    else if (a === 'nav-close') root.classList.remove('nav-open');
    else if (a === 'logout') logout();
    else if (a === 'fullscreen') { document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen?.(); }
    else if (a === 'user') userMenu(b);
    else if (a === 'notif') notifMenu(b);
  });
  on(root, 'click', '.sb-link', () => root.classList.remove('nav-open'));
  // Prefetch modul saat kursor mendekati menu → klik terasa instan
  const pre = (e) => { const a = e.target.closest('a[href^="#/"]'); if (!a) return; const m = match(a.getAttribute('href').slice(1).split('?')[0]); if (m) loadMod(m.r.m).then((x) => x.prefetch && x.prefetch()).catch(() => {}); };
  root.addEventListener('mouseover', pre, { passive: true });
  root.addEventListener('touchstart', pre, { passive: true });
  idlePreload(mode);
  setupSearch();
  setupNotif();
}
function idlePreload(mode) {
  const mods = new Set();
  for (const it of MENUS[mode]) if (it[0] !== 'g') { const m = match(it[0]); if (m) mods.add(m.r.m); }
  const run = () => { for (const m of mods) loadMod(m).catch(() => {}); };
  (window.requestIdleCallback || ((f) => setTimeout(f, 1200)))(run);
}
function highlight(path) {
  const base = '/' + path.split('/').filter(Boolean).slice(0, path.startsWith('/sa/') || path.startsWith('/admin/') ? 2 : 1).join('/');
  const cand = [path, base, '/' + path.split('/')[1]];
  for (const sel of ['.sb-link', '.bottom-nav a[data-path]']) {
    const links = $$(sel, root);
    let best = null;
    for (const c of cand) { best = links.find((l) => l.dataset.path === c); if (best) break; }
    links.forEach((l) => l.classList.toggle(sel === '.sb-link' ? 'active' : 'on', l === best));
  }
}
export function paintWallet() {
  const n = $('#wallet-n');
  if (n && state.me) n.textContent = fmt.num(state.me.saldo);
}
async function logout() {
  await api.signOut();
  store.clearAll();
  state.me = null; state.shell = null;
  localStorage.removeItem('ujk.mode');
  go('/masuk', { replace: true });
}
function userMenu(btn) {
  const me = state.me;
  const items = [];
  for (const r of me.roles) if (MODES[r] && r !== state.mode) items.push({ label: 'Beralih ke ' + MODES[r].label, icon: 'swap_horiz', mode: r });
  if (items.length) items.push({ sep: true });
  items.push({ label: me.email, icon: 'mail', info: true });
  items.push({ label: 'Keluar', icon: 'logout', red: true, out: true });
  popMenu(btn, items, (it) => {
    if (it.mode) { setMode(it.mode); store.invalidate(''); go(MODES[it.mode].home); }
    else if (it.out) logout();
  });
}
// Notifikasi diambil dari aktivitas dashboard sesuai peran
const NOTIF_SRC = { super_admin: 'sa_dashboard', admin: 'ad_dashboard', pengawas: 'pengawas_exams', guru: 'gr_dashboard' };
async function notifItems() {
  const fn = NOTIF_SRC[state.mode];
  const d = await store.fetchOnce(fn, () => api.rpc(fn));
  if (state.mode === 'super_admin') {
    const reg = await store.fetchOnce('sa_registrations|menunggu', () => api.rpc('sa_registrations', { status: 'menunggu' })).catch(() => null);
    return [
    ...(reg?.rows || []).slice(0, 5).map((r) => ({ t: r.created_at, label: `Pendaftaran baru — ${r.nama}`, href: '/sa/pendaftaran' })),
    ...(d.pengajuan || []).map((p) => ({ t: p.created_at, label: `Pembelian ${p.paket} — ${p.lembaga}`, href: '/sa/poin?tab=pengajuan' })),
    ...(d.aktivitas || []).slice(0, 5).map((a) => ({ t: a.waktu, label: (a.lembaga ? a.lembaga + ': ' : '') + a.aksi.replace(/_/g, ' '), href: '/sa' })),
  ]; }
  if (state.mode === 'admin') return (d.aktivitas || []).map((a) => ({ t: a.waktu, label: a.judul, href: a.warna === 'coral' ? '/pantau' : '/admin' }));
  if (state.mode === 'guru') return [
    ...(d.tanpa_kunci ? [{ t: new Date().toISOString(), label: `${d.tanpa_kunci} soal belum diberi kunci`, href: '/bank' }] : []),
    ...(d.revisi || []).map((r) => ({ t: null, label: `Perlu revisi: ${r.bank} no. ${r.no}`, href: '/bank/' + r.bank_id })),
  ];
  return (Array.isArray(d) ? d : []).filter((x) => x.terkunci > 0).map((x) => ({ t: null, label: `${x.terkunci} sesi terkunci — ${x.judul}`, href: '/pantau/' + x.id }));
}
async function setupNotif() {
  try {
    const items = await notifItems();
    const seen = +(localStorage.getItem('ujk.notif.' + state.mode) || 0);
    const n = items.filter((i) => !i.t || new Date(i.t).getTime() > seen).length;
    const dot = $('#notif-dot');
    if (dot) { dot.textContent = n > 9 ? '9+' : n; dot.classList.toggle('hidden', !n); }
  } catch {}
}
async function notifMenu(btn) {
  let items = [];
  try { items = await notifItems(); } catch (e) { return toastErr(e); }
  localStorage.setItem('ujk.notif.' + state.mode, Date.now());
  $('#notif-dot')?.classList.add('hidden');
  if (!items.length) items = [{ label: 'Belum ada notifikasi baru', none: true }];
  popMenu(btn, items.slice(0, 8).map((i) => ({ ...i, label: (i.t ? fmt.time(i.t) + ' · ' : '') + i.label, icon: i.none ? 'notifications_off' : 'circle_notifications' })), (it) => { if (it.href) go(it.href); });
}
function setupSearch() {
  const inp = $('#tb-q'), res = $('#tb-res');
  if (!inp) return;
  const run = debounce(async () => {
    const q = inp.value.trim();
    if (q.length < 2) { res.classList.add('hidden'); return; }
    try {
      const d = await api.rpc('staff_search', { q });
      const grp = (title, arr, href) => (arr && arr.length ? html`<div class="grp">${title}</div>${arr.map((x) => html`<a href="#${href(x)}"><b>${x.nama}</b> <span class="muted small">${x.sub || ''}</span></a>`)}` : '');
      const out = html`${grp('Lembaga', d.lembaga, () => '/sa/lembaga?q=' + encodeURIComponent(q))}${grp('Peserta', d.peserta, () => '/admin/peserta?q=' + encodeURIComponent(q))}
        ${grp('Bank soal', d.bank, (x) => '/bank/' + x.id)}${grp('Ujian', d.ujian, (x) => '/pantau/' + x.id)}`.s;
      res.innerHTML = out || '<div class="muted" style="padding:12px">Tidak ada hasil.</div>';
      res.classList.remove('hidden');
    } catch (e) { res.classList.add('hidden'); }
  }, 280);
  inp.addEventListener('input', run);
  inp.addEventListener('focus', run);
  document.addEventListener('mousedown', (e) => { if (!e.target.closest('.tb-search')) res.classList.add('hidden'); });
  res.addEventListener('click', () => { res.classList.add('hidden'); inp.value = ''; });
}

// ---------------- Layar khusus ----------------
function renderSetup() {
  root.className = '';
  root.innerHTML = html`<div class="auth-form" style="min-height:100vh"><div class="auth-card" style="width:min(620px,100%)">
    <div class="row"><span class="logo-mark">${raw(LOGO)}</span><h2>UjiKu CBT belum dikonfigurasi</h2></div>
    <p class="muted mt-16">Buka berkas <b>config.js</b> lalu isi <code>SUPABASE_URL</code> dan <code>SUPABASE_ANON_KEY</code> dari
    Supabase → Project Settings → API. Setelah itu muat ulang halaman ini.</p>
    <pre class="card flat mono small mt-16" style="white-space:pre-wrap">window.UJIKU_CONFIG = {\n  SUPABASE_URL: 'https://xxxx.supabase.co',\n  SUPABASE_ANON_KEY: 'eyJhbGciOi...'\n};</pre></div></div>`.s;
}
function renderNotRegistered(me) {
  state.shell = 'public';
  root.className = '';
  root.innerHTML = html`<div class="auth-form" style="min-height:100vh"><div class="auth-card" style="text-align:center">
    <div class="empty" style="padding:0"><div class="e-art">${icon(me.nonaktif ? 'person_off' : 'how_to_reg')}</div>
    <h3>${me.nonaktif ? 'Akun Anda dinonaktifkan' : 'Email belum terdaftar'}</h3>
    <p>${me.nonaktif ? 'Hubungi admin lembaga untuk mengaktifkan kembali akun' : 'Akun Google'} <b>${me.email}</b>
    ${me.nonaktif ? '' : ' belum didaftarkan di UjiKu CBT.'}</p>
    ${me.nonaktif ? '' : html`<p class="small muted mt-8">Guru atau pengawas: minta admin sekolah Anda menambahkan email ini. Pengelola sekolah baru: daftarkan sekolah Anda.</p>
      <a class="btn primary mt-16" href="#/daftar">${icon('domain_add')} Daftarkan sekolah Anda</a>`}
    <button class="btn ${me.nonaktif ? 'primary' : 'secondary'} mt-16" id="out">${icon('logout')} Masuk dengan akun lain</button></div></div></div>`.s;
  $('#out').onclick = logout;
}
function renderFatal(e) {
  root.className = '';
  root.innerHTML = html`<div class="auth-form" style="min-height:100vh"><div class="auth-card"><div class="empty" style="padding:0"><div class="e-art">${icon('cloud_off')}</div>
    <h3>Tidak dapat memuat aplikasi</h3><p>${e.message}</p><button class="btn primary" onclick="location.reload()">Coba lagi</button></div></div></div>`.s;
}

// ---------------- Mulai ----------------
(async function boot() {
  if (api.MODE === 'cloud' && api.configured) {
    try {
      const next = await api.handleAuthRedirect();
      if (next) { store.clearAll(); state.me = null; }
    } catch (e) { toastErr(e, 'Login gagal'); }
  }
  route();
  if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => {});
})();
