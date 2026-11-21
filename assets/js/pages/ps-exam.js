// Layar ujian peserta — mobile-first, simpan otomatis + antrean offline, anti-curang.
import * as api from '../core/api.js';
import { html, raw, icon, $, $$, on, fmt, sanitize, modal, toast } from '../core/ui.js';
import { pkgKey, savePkg, enterFullscreen } from './ps-mulai.js';
import { examAudio } from '../lib/audio.js';

const LET = ['A', 'B', 'C', 'D', 'E', 'F'];
const plainLen = (h) => String(h || '').replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').trim().length;
const firstImg = (h) => (String(h || '').match(/<img[^>]*\ssrc="([^"]+)"/i) || [])[1] || '';
const readLS = (k, d) => { try { return JSON.parse(localStorage.getItem(k) || 'null') ?? d; } catch { return d; } };

export default async function (ctx) {
  const { el, params, title, go, alive } = ctx;
  title('Ujian');
  let pkg = readLS(pkgKey(params.id), null);
  if (!pkg) {
    try { pkg = await api.prpc('p_start', { exam: params.id, exam_token: '', device: api.deviceId() }); savePkg(params.id, pkg); }
    catch (e) { if (e.hint === 'selesai') return go('/ujian/' + params.id + '/hasil', { replace: true }); return go('/ujian/' + params.id, { replace: true }); }
  }
  if (!alive()) return;
  const sid = pkg.sesi.id, U = pkg.ujian, soal = pkg.soal, WAC = pkg.wacana || {};
  const wcOpen = {};
  const AUD = examAudio(sid);
  const QK = 'ujk.ans.' + sid, EK = 'ujk.ev.' + sid;
  const ans = {};
  for (const [q, v] of Object.entries(pkg.jawaban || {})) ans[q] = { a: v.a || null, r: !!v.r };
  let pending = readLS(QK, {});
  for (const [q, v] of Object.entries(pending)) ans[q] = { a: v.a || null, r: !!v.r };
  let events = readLS(EK, []);
  let cur = Math.min(soal.length - 1, +(sessionStorage.getItem('ujk.cur.' + sid) || 0));
  let status = pkg.sesi.status, batas = new Date(pkg.sesi.batas_waktu).getTime();
  let skew = new Date(pkg.sesi.server_now).getTime() - (pkg._t || Date.now());
  let pel = pkg.sesi.pelanggaran || 0; const batasPel = pkg.sesi.batas_pelanggaran || 0;
  let saving = false, finishing = false, net = 'ok', lastViol = 0, wasFs = !!document.fullscreenElement, warnPending = false, lockPoll = null;
  let font = +(localStorage.getItem('ujk.font') || 1);
  const graceUntil = Date.now() + 3000;
  const serverNow = () => Date.now() + skew;
  const persist = () => { try { localStorage.setItem(QK, JSON.stringify(pending)); localStorage.setItem(EK, JSON.stringify(events)); } catch {} };
  const answered = () => soal.filter((q) => ans[q.id]?.a).length;

  el.innerHTML = html`<div class="exam" id="exam">
    <div class="ex-top"><div class="ex-top-in">
      <button class="ex-num-btn" data-sheet aria-label="Daftar nomor soal">${icon('grid_view')}<span id="numtxt"></span></button>
      <div class="ex-title ellipsis hide-sm">${U.judul}</div><span class="spacer show-sm"></span>
      <span class="timer" id="timer">${icon('timer')}<span id="tt">--:--</span></span>
      <span class="save-st" id="save"></span></div>
      <div class="ex-prog"><i id="prog"></i></div>
      <div class="ex-top-in small" style="padding-top:6px;padding-bottom:8px"><span class="muted">Kemajuan pengerjaan</span><span class="spacer"></span><b class="c-primary" id="progtxt"></b></div></div>
    <div class="ex-body">
      <div class="col gap-16"><div id="banner"></div><div id="wc"></div><div class="ex-q" id="q" style="--fs:${font}"></div></div>
      <aside class="ex-side card"><div class="row"><b>Nomor Soal</b><span class="spacer"></span>
          <div class="row gap-4"><button class="btn ghost sm" data-font="-1" aria-label="Perkecil huruf">A−</button><button class="btn ghost sm" data-font="1" aria-label="Perbesar huruf">A+</button></div></div>
        <div class="qnum-grid mt-16" id="grid"></div>
        <div class="legend-q"><span><i style="background:var(--primary)"></i>Terjawab</span><span><i style="background:var(--orange)"></i>Ragu-ragu</span><span><i style="border:1.5px solid var(--border);background:#fff"></i>Belum</span><span><i style="box-shadow:0 0 0 2px var(--navy)"></i>Sekarang</span></div>
        <button class="btn success block lg mt-16" data-finish>${icon('task_alt')} Selesai Ujian</button></aside></div>
    <div class="ex-foot"><div class="ex-foot-in">
      <button class="btn secondary" data-nav="-1">${icon('chevron_left')}<span>Sebelum</span></button>
      <button class="btn doubt" data-doubt>${icon('flag')}<span>Ragu</span></button>
      <button class="btn primary" data-nav="1" id="next"></button></div></div></div>`.s;

  // ---------------- Render ----------------
  // Wacana bersama: tampil di atas soal selama soal-soal sewacana dikerjakan
  const paintWacana = (q) => {
    const box = $('#wc', el); const w = q.w ? WAC[q.w] : null;
    if (!w) { box.innerHTML = ''; return; }
    let a = cur, b = cur;
    while (a > 0 && soal[a - 1].w === q.w) a--;
    while (b < soal.length - 1 && soal[b + 1].w === q.w) b++;
    const teks = sanitize(w.teks);
    box.innerHTML = html`<details class="ex-wc" ${wcOpen[q.w] === false ? '' : 'open'}><summary>${icon(w.audio ? 'headphones' : 'article')}<b class="ellipsis">${w.judul || (w.audio ? 'Audio' : 'Wacana')}</b>
        <span class="muted small">${a === b ? 'Untuk soal no. ' + (a + 1) : 'Untuk soal no. ' + (a + 1) + '–' + (b + 1)}</span></summary>
      ${w.audio ? AUD.widget(w.audio, w.audio_maks, 'Dengarkan') : ''}
      ${plainLen(teks) || /<img/i.test(teks) ? html`<div class="q-html" style="font-size:calc(17px * ${font})">${raw(teks)}</div>` : ''}</details>`.s;
    const d = $('details', box); d.addEventListener('toggle', () => { wcOpen[q.w] = d.open; });
    $$('.q-html img', box).forEach((im) => { im.dataset.zoom = im.src; im.style.cursor = 'zoom-in'; });
  };
  const paintQ = () => {
    const q = soal[cur]; const a = ans[q.id] || {};
    const imgGrid = q.opsi.length >= 2 && q.opsi.every((o) => /<img/i.test(o.t) && plainLen(o.t) <= 40);
    paintWacana(q);
    $('#q', el).innerHTML = html`<div class="q-meta"><span class="q-no">Soal No. ${cur + 1}</span>${q.bobot && Number(q.bobot) !== 1 ? html`<span class="badge b-blue" style="height:30px">Bobot: ${fmt.num(q.bobot, 1)} poin</span>` : ''}
        ${a.r ? html`<span class="badge b-orange" style="height:30px">${icon('flag')} Ragu-ragu</span>` : ''}</div>
      ${q.audio_url ? AUD.widget(q.audio_url, q.audio_maks, 'Audio soal') : ''}
      <div class="q-html" style="font-size:calc(18px * ${font})">${raw(sanitize(q.teks))}</div>
      ${q.gambar_url ? html`<div class="q-img" data-zoom="${q.gambar_url}"><img src="${q.gambar_url}" alt="Gambar soal" loading="eager"></div>` : ''}
      <div class="opts ${imgGrid ? 'img-grid' : ''}" role="radiogroup" aria-label="Pilihan jawaban">${q.opsi.map((o, i) => { const t = sanitize(o.t), im = firstImg(t); return html`<button class="opt ${a.a === o.k ? 'on' : ''}" data-k="${o.k}" role="radio" aria-checked="${a.a === o.k}" style="font-size:calc(17px * ${font})">
        <span class="lt">${LET[i]}</span><span class="ot">${raw(t)}</span>${im ? html`<span class="zo" data-zoom="${im}" role="button" aria-label="Perbesar gambar opsi ${LET[i]}">${icon('zoom_in')}</span>` : ''}${icon('check_circle', 'ck fill')}</button>`; })}</div>`.s;
    $$('#q .q-html img', el).forEach((im) => { im.dataset.zoom = im.src; im.style.cursor = 'zoom-in'; });
    AUD.bind(el);
    const last = cur === soal.length - 1;
    $('#next', el).className = 'btn ' + (last ? 'success' : 'primary');
    $('#next', el).innerHTML = last ? html`${icon('task_alt')}<span>Selesai</span>`.s : html`<span>Berikut</span>${icon('chevron_right')}`.s;
    $('[data-doubt]', el).classList.toggle('on', !!a.r);
    $('[data-nav="-1"]', el).disabled = cur === 0;
    sessionStorage.setItem('ujk.cur.' + sid, cur);
  };
  const gridHtml = () => soal.map((q, i) => { const a = ans[q.id] || {}; return `<button class="qn ${a.r ? 'doubt' : a.a ? 'ans' : ''} ${i === cur ? 'cur' : ''}" data-go="${i}" aria-label="Soal ${i + 1}">${i + 1}${a.r && a.a ? '<span style="position:absolute;bottom:2px;right:4px;width:6px;height:6px;border-radius:50%;background:#fff"></span>' : ''}</button>`; }).join('');
  const paintGrid = () => {
    $('#grid', el).innerHTML = gridHtml();
    const sh = document.querySelector('.sheet .qnum-grid'); if (sh) sh.innerHTML = gridHtml();
    const n = answered();
    $('#numtxt', el).innerHTML = `<b>${cur + 1}</b>/${soal.length}`;
    $('#prog', el).style.width = (n / soal.length) * 100 + '%';
    $('#progtxt', el).textContent = `${n} dari ${soal.length} terjawab (${Math.round((n / soal.length) * 100)}%)`;
  };
  const paintBanner = () => {
    const fsOk = !!document.documentElement.requestFullscreen;
    const sisa = batasPel ? Math.max(0, batasPel - pel) : null;
    $('#banner', el).innerHTML = net === 'off' ? html`<div class="alert orange" style="margin:0"><div class="a-ic">${icon('wifi_off')}</div><div class="small"><b>Koneksi terputus.</b> Jawaban disimpan di perangkat ini dan dikirim otomatis saat tersambung. Jangan tutup halaman.</div></div>`.s
      : html`<div class="alert orange" style="margin:0"><div class="a-ic">${icon('warning')}</div><div class="small"><b class="c-orange">${fsOk ? 'Mode Layar Penuh Aktif' : 'Mode Ujian Aktif'}</b><br>Pindah aplikasi/tab tercatat otomatis ke pengawas${batasPel ? html` (<u><b>${sisa} dari ${batasPel}</b></u> peringatan tersisa)` : ''}.</div></div>`.s;
  };
  const setSave = (s) => {
    const n = $('#save', el); if (!n) return;
    n.className = 'save-st' + (s === 'saving' ? ' saving' : s === 'off' ? ' off' : '');
    n.innerHTML = html`${icon(s === 'saving' ? 'sync' : s === 'off' ? 'cloud_off' : 'cloud_done')}<span class="lbl-txt">${s === 'saving' ? 'Menyimpan…' : s === 'off' ? 'Offline' : 'Tersimpan'}</span>`.s;
  };
  const paintTimer = () => {
    const left = Math.round((batas - serverNow()) / 1000);
    const t = $('#timer', el); if (!t) return;
    $('#tt', el).textContent = fmt.dur(Math.max(0, left));
    t.className = 'timer' + (left <= 300 ? ' crit' : left <= 600 ? ' warn' : '');
    if (left <= 0 && !finishing && status === 'mengerjakan') finish(true);
  };

  // ---------------- Sinkronisasi ----------------
  const applyStatus = (r) => {
    if (!r) return;
    if (r.server_now) skew = new Date(r.server_now).getTime() - Date.now();
    if (r.batas_waktu) { const nb = new Date(r.batas_waktu).getTime(); if (nb > batas + 1000) toast('Waktu ditambah pengawas', 'Batas waktu baru ' + fmt.time(nb), 'info'); batas = nb; }
    if (typeof r.pelanggaran === 'number') { pel = r.pelanggaran; paintBanner(); }
    if (r.status && r.status !== status) {
      status = r.status;
      if (status === 'terkunci') showLock();
      else if (status === 'mengerjakan') hideLock();
      else if (status === 'selesai' && !finishing) { cleanupStore(); go('/ujian/' + params.id + '/hasil', { replace: true }); }
    }
  };
  const flush = async () => {
    if (saving || finishing) return;
    if (events.length) await sendEvents();
    const keys = Object.keys(pending);
    if (!keys.length) { setSave(net === 'off' ? 'off' : 'ok'); return; }
    saving = true; setSave('saving');
    const snap = { ...pending };
    try {
      const r = await api.prpc('p_save', { session: sid, items: Object.values(snap) });
      for (const [k, v] of Object.entries(snap)) if (pending[k] && pending[k].t === v.t) delete pending[k];
      persist();
      if (net === 'off') { net = 'ok'; paintBanner(); }
      applyStatus(r);
      setSave(Object.keys(pending).length ? 'saving' : 'ok');
    } catch (e) {
      if (e.hint === 'relogin') { toast('Sesi login berakhir', 'Masuk kembali untuk melanjutkan. Jawaban tetap tersimpan di perangkat.', 'warn', 8000); }
      if (e.code === 'network' || e.status >= 500 || !e.status) { if (net !== 'off') { net = 'off'; paintBanner(); } }
      setSave('off');
    } finally { saving = false; }
  };
  let flushT = null;
  const flushSoon = () => { clearTimeout(flushT); flushT = setTimeout(flush, 600); };
  const sendEvents = async () => {
    while (events.length) {
      const ev = events[0];
      try { const r = await api.prpc('p_event', { session: sid, jenis: ev.jenis, detail: ev.detail || null }); events.shift(); persist(); applyStatus(r); }
      catch (e) { if (e.code === 'network' || !e.status) { net = 'off'; paintBanner(); return; } events.shift(); persist(); }
    }
  };

  // ---------------- Interaksi jawaban ----------------
  const setAns = (patch) => {
    if (status !== 'mengerjakan' || finishing) return;
    const q = soal[cur];
    ans[q.id] = { ...(ans[q.id] || { a: null, r: false }), ...patch };
    pending[q.id] = { q: q.id, a: ans[q.id].a, r: ans[q.id].r, t: new Date(serverNow()).toISOString() };
    persist(); setSave('saving'); flushSoon();
  };
  const goQ = (i) => { cur = Math.max(0, Math.min(soal.length - 1, i)); paintQ(); paintGrid(); window.scrollTo({ top: 0 }); };

  // ---------------- Anti-curang ----------------
  const violation = (jenis) => {
    if (status !== 'mengerjakan' || finishing || Date.now() < graceUntil) return;
    if (Date.now() - lastViol < 3000) return;
    lastViol = Date.now();
    pel += 1; paintBanner();
    events.push({ jenis, detail: { t: new Date(serverNow()).toISOString() } }); persist();
    warnPending = true;
    sendEvents();
  };
  const warn = () => {
    if (!warnPending || status !== 'mengerjakan') return;
    warnPending = false;
    const m = modal({ size: 'narrow', dismiss: false,
      body: html`<div style="text-align:center;padding-top:16px"><div class="icon-tile" style="margin:0 auto;width:72px;height:72px;border-radius:50%;background:var(--coral);">${icon('warning')}</div>
        <h2 class="mt-16">Kamu terdeteksi meninggalkan halaman ujian${batasPel ? ` (${pel}/${batasPel})` : ''}</h2>
        <p class="muted mt-8">${batasPel && pel >= batasPel ? 'Sesi akan dikunci. Hubungi pengawas.' : batasPel ? `Jika mencapai ${batasPel} kali, sesi ujianmu akan dikunci dan harus dibuka pengawas.` : 'Kejadian ini tercatat dan terlihat oleh pengawas.'}</p></div>`,
      foot: html`<button class="btn primary lg block" data-back>${icon('fullscreen')} Kembali ke Ujian</button>` });
    $('[data-back]', m.el).onclick = () => { enterFullscreen(); m.close(); };
  };
  const onVis = () => { if (document.hidden) violation('pindah_tab'); else { warn(); flush(); } };
  const onFs = () => { const fs = !!document.fullscreenElement; if (wasFs && !fs) { violation('keluar_fullscreen'); setTimeout(warn, 50); } wasFs = fs; };
  const block = (e) => { e.preventDefault(); };
  const keys = (e) => {
    if ((e.ctrlKey || e.metaKey) && ['c', 'x', 'v', 'p', 's', 'u', 'a'].includes(e.key.toLowerCase())) e.preventDefault();
    if (e.key === 'ArrowRight' && !e.target.closest('input,textarea')) goQ(cur + 1);
    if (e.key === 'ArrowLeft' && !e.target.closest('input,textarea')) goQ(cur - 1);
    if (/^[a-fA-F]$/.test(e.key) && !e.ctrlKey && !e.metaKey && !e.target.closest('input,textarea')) {
      const o = soal[cur].opsi[LET.indexOf(e.key.toUpperCase())]; if (o) { setAns({ a: o.k }); paintQ(); paintGrid(); }
    }
  };
  const unload = (e) => { if (!finishing && (Object.keys(pending).length || status === 'mengerjakan')) { e.preventDefault(); e.returnValue = ''; } };
  const goOnline = () => { net = 'ok'; paintBanner(); flush(); };
  const goOffline = () => { net = 'off'; paintBanner(); setSave('off'); };

  // ---------------- Kunci & selesai ----------------
  let lockEl = null;
  function showLock() {
    if (lockEl) return;
    AUD.stopAll();
    lockEl = document.createElement('div');
    lockEl.className = 'lock-screen';
    lockEl.innerHTML = html`<div class="p-card" style="max-width:420px;text-align:center;padding:28px"><div class="icon-tile" style="margin:0 auto;width:84px;height:84px;border-radius:50%;background:var(--red)">${icon('lock')}</div>
      <h2 class="mt-16">Sesi terkunci</h2><p class="muted mt-8">Batas pelanggaran tercapai. Hubungi pengawas untuk melanjutkan. Jawabanmu tetap aman.</p>
      <div class="row mt-16" style="justify-content:center"><span class="spin" style="color:var(--primary)"></span><span class="muted small">Menunggu izin pengawas…</span></div></div>`.s;
    document.body.appendChild(lockEl);
    lockPoll = setInterval(async () => { try { applyStatus(await api.prpc('p_status', { session: sid })); } catch {} }, 5000);
  }
  function hideLock() {
    if (!lockEl) return;
    lockEl.remove(); lockEl = null; clearInterval(lockPoll);
    toast('Pengawas mengizinkan', 'Silakan lanjutkan ujian.', 'ok'); enterFullscreen();
  }
  const cleanupStore = () => { localStorage.removeItem('ujk.aud.' + sid); localStorage.removeItem(QK); localStorage.removeItem(EK); localStorage.removeItem(pkgKey(params.id)); sessionStorage.removeItem('ujk.cur.' + sid); };
  async function finish(auto) {
    if (finishing) return;
    finishing = true; AUD.stopAll();
    const ov = document.createElement('div');
    ov.className = 'lock-screen';
    const msg = (t, s) => { ov.innerHTML = html`<div class="p-card" style="max-width:420px;text-align:center;padding:28px"><span class="spin" style="color:var(--primary);width:36px;height:36px;margin:0 auto"></span>
      <h2 class="mt-16">${t}</h2><p class="muted mt-8">${s}</p></div>`.s; };
    msg(auto ? 'Waktu habis' : 'Mengirim jawaban…', 'Jawaban sedang dikirim. Jangan tutup halaman ini.');
    document.body.appendChild(ov);
    for (let attempt = 0; ; attempt++) {
      try {
        if (events.length) await sendEvents();
        const r = await api.prpc('p_finish', { session: sid, items: Object.values(pending) });
        cleanupStore();
        sessionStorage.setItem('ujk.hasil.' + params.id, JSON.stringify({ ...r, judul: U.judul, mapel: U.mapel, terjawab: answered(), total: soal.length }));
        ov.remove();
        if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
        go('/ujian/' + params.id + '/hasil', { replace: true });
        return;
      } catch (e) {
        if (e.hint === 'terkunci') { ov.remove(); finishing = false; status = 'terkunci'; showLock(); return; }
        if (e.hint === 'relogin') { msg('Sesi login berakhir', 'Jawaban tersimpan di perangkat. Minta pengawas membantu login ulang, lalu buka ujian ini lagi.'); return; }
        if (e.status && e.status < 500 && e.code !== 'network') {
          ov.remove(); finishing = false; toast('Gagal menyelesaikan', e.message, 'err', 7000); return;
        }
        msg('Menunggu koneksi…', 'Jawaban tersimpan aman di perangkat ini dan akan dikirim otomatis saat koneksi kembali. Jangan tutup halaman.');
        await new Promise((res) => setTimeout(res, Math.min(15000, 2000 + attempt * 1500)));
      }
    }
  }
  const confirmFinish = () => {
    const n = answered(), ragu = soal.filter((q) => ans[q.id]?.r).length, kosong = soal.length - n;
    const m = modal({ sheet: true,
      body: html`<h2>Selesaikan ujian?</h2><p class="muted mt-4">Periksa kembali sebelum mengakhiri. Setelah selesai, jawaban tidak bisa diubah.</p>
        <div class="row wrap gap-8 mt-16"><span class="badge b-blue" style="height:34px;font-size:14px">${icon('check')} Terjawab ${n}</span>
          <span class="badge b-orange" style="height:34px;font-size:14px">${icon('flag')} Ragu-ragu ${ragu}</span><span class="badge b-gray" style="height:34px;font-size:14px">Kosong ${kosong}</span></div>
        ${kosong ? html`<div class="alert orange mt-16"><div class="a-ic">${icon('warning')}</div><div class="small">Masih ada <b>${kosong} soal kosong</b>.</div></div>` : ''}
        <div class="grid g-2 mt-16" style="gap:10px"><button class="btn secondary lg" data-x>Periksa Lagi</button><button class="btn success lg" data-ok>${icon('task_alt')} Ya, Selesai</button></div>` });
    $('[data-ok]', m.el).onclick = () => { m.close(); finish(false); };
  };
  const openSheet = () => {
    const m = modal({ sheet: true, body: html`<div class="row"><h3>Daftar Soal</h3><span class="spacer"></span><span class="muted small">${answered()}/${soal.length} terjawab</span></div>
      <div class="qnum-grid mt-16" style="grid-template-columns:repeat(auto-fill,minmax(44px,1fr))">${raw(gridHtml())}</div>
      <div class="legend-q"><span><i style="background:var(--primary)"></i>Terjawab</span><span><i style="background:var(--orange)"></i>Ragu-ragu</span><span><i style="border:1.5px solid var(--border);background:#fff"></i>Belum</span><span><i style="box-shadow:0 0 0 2px var(--navy)"></i>Sekarang</span></div>
      <div class="row gap-8 mt-16"><button class="btn ghost" data-f="-1">Huruf A−</button><button class="btn ghost" data-f="1">Huruf A+</button><span class="spacer"></span><button class="btn success" data-fin>${icon('task_alt')} Selesai Ujian</button></div>` });
    on(m.el, 'click', '[data-go]', (e, b) => { m.close(); goQ(+b.dataset.go); });
    on(m.el, 'click', '[data-f]', (e, b) => setFont(+b.dataset.f));
    on(m.el, 'click', '[data-fin]', () => { m.close(); confirmFinish(); });
  };
  const setFont = (d) => { font = Math.max(0.85, Math.min(1.5, Math.round((font + d * 0.1) * 100) / 100)); localStorage.setItem('ujk.font', font); paintQ(); };

  // ---------------- Mulai ----------------
  paintQ(); paintGrid(); paintBanner(); setSave(Object.keys(pending).length ? 'saving' : 'ok'); paintTimer();
  if (status === 'terkunci') showLock();
  const offs = [
    on(el, 'click', '.opt', (e, b) => { if (e.target.closest('[data-zoom]')) return; setAns({ a: b.dataset.k }); paintQ(); paintGrid(); }),
    on(el, 'click', '[data-aud-play]', (e, b) => AUD.toggle(b.closest('[data-aud]'))),
    on(el, 'click', '[data-aud-seek]', (e, b) => AUD.seek(b, e)),
    on(el, 'click', '[data-nav]', (e, b) => { const d = +b.dataset.nav; if (d > 0 && cur === soal.length - 1) return confirmFinish(); goQ(cur + d); }),
    on(el, 'click', '[data-doubt]', () => { setAns({ r: !ans[soal[cur].id]?.r }); paintQ(); paintGrid(); }),
    on(el, 'click', '[data-go]', (e, b) => goQ(+b.dataset.go)),
    on(el, 'click', '[data-sheet]', openSheet),
    on(el, 'click', '[data-finish]', confirmFinish),
    on(el, 'click', '[data-font]', (e, b) => setFont(+b.dataset.font)),
    on(el, 'click', '[data-zoom]', (e, b) => modal({ size: 'wide', body: html`<div style="text-align:center"><img class="zoom-img" src="${b.dataset.zoom}" alt=""></div>` })),
  ];
  document.addEventListener('visibilitychange', onVis);
  document.addEventListener('fullscreenchange', onFs);
  document.addEventListener('contextmenu', block);
  document.addEventListener('copy', block); document.addEventListener('cut', block); document.addEventListener('paste', block);
  document.addEventListener('keydown', keys);
  window.addEventListener('beforeunload', unload);
  window.addEventListener('online', goOnline); window.addEventListener('offline', goOffline);
  const tick = setInterval(paintTimer, 1000);
  const pump = setInterval(() => { if (Object.keys(pending).length || events.length) flush(); }, 5000);
  const poll = setInterval(async () => {
    if (document.hidden || finishing || Object.keys(pending).length || status === 'terkunci') return;
    try { applyStatus(await api.prpc('p_status', { session: sid })); if (net === 'off') { net = 'ok'; paintBanner(); setSave('ok'); } } catch (e) { if (e.code === 'network') goOffline(); }
  }, 30000);
  flush();
  return () => {
    clearInterval(tick); clearInterval(pump); clearInterval(poll); clearInterval(lockPoll); clearTimeout(flushT);
    AUD.stopAll();
    if (!finishing && Object.keys(pending).length) flush();
    lockEl?.remove();
    offs.forEach((f) => f());
    document.removeEventListener('visibilitychange', onVis);
    document.removeEventListener('fullscreenchange', onFs);
    document.removeEventListener('contextmenu', block);
    document.removeEventListener('copy', block); document.removeEventListener('cut', block); document.removeEventListener('paste', block);
    document.removeEventListener('keydown', keys);
    window.removeEventListener('beforeunload', unload);
    window.removeEventListener('online', goOnline); window.removeEventListener('offline', goOffline);
  };
}
