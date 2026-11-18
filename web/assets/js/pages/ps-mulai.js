import * as api from '../core/api.js';
import { html, icon, $, $$, fmt, mapelColor, skel, empty, toast } from '../core/ui.js';
import { examState } from './ps-home.js';

export const pkgKey = (examId) => 'ujk.pkg.' + examId;
export function savePkg(examId, pkg) { try { localStorage.setItem(pkgKey(examId), JSON.stringify({ ...pkg, _t: Date.now() })); } catch { /* penuh */ } }

export async function enterFullscreen() {
  try { if (!document.fullscreenElement && document.documentElement.requestFullscreen) await document.documentElement.requestFullscreen({ navigationUI: 'hide' }); } catch { /* tidak didukung (mis. iPhone) */ }
}

export default async function (ctx) {
  const { el, params, title, alive, go } = ctx;
  title('Mulai Ujian');
  el.innerHTML = html`<div class="p-app"><div class="p-body">${skel.cards(1, 300)}</div></div>`.s;
  let home;
  try { home = await api.prpc('p_home'); } catch (e) {
    if (e.hint === 'relogin') { api.peserta.clear(); return go('/masuk', { replace: true }); }
    throw e;
  }
  if (!alive()) return;
  const u = home.ujian.find((x) => x.id === params.id);
  if (!u) { el.innerHTML = html`<div class="p-app"><div class="p-body"><div class="p-card">${empty('search_off', 'Ujian tidak ditemukan', 'Ujian ini tidak dijadwalkan untuk Anda.', html`<a class="btn primary" href="#/ujian">Kembali</a>`)}</div></div></div>`.s; return; }
  const skew = new Date(home.server_now).getTime() - Date.now();
  const st = examState(u, Date.now() + skew);
  if (st === 'selesai') return go('/ujian/' + u.id + '/hasil', { replace: true });
  const resume = st === 'lanjut' || st === 'terkunci';
  const c = mapelColor(u.mapel);
  el.innerHTML = html`<div class="p-app"><header class="p-head"><div class="row" style="position:relative;z-index:1">
      <a href="#/ujian" class="btn icon" style="background:rgba(255,255,255,.2);color:#fff" aria-label="Kembali">${icon('arrow_back')}</a>
      <div style="flex:1;min-width:0"><div class="s">${u.mapel}</div><h1 class="ellipsis" style="font-size:20px">${u.judul}</h1></div></div></header>
    <div class="p-body">
      <div class="p-card"><div class="grid g-3" style="gap:10px;grid-template-columns:repeat(3,1fr)">
        ${[['timer', u.durasi_menit + ' menit', 'Durasi'], ['format_list_numbered', u.jumlah_soal + ' soal', 'Pilihan ganda'], ['event', fmt.time(u.selesai), 'Batas mulai']]
          .map(([ic, v, l]) => html`<div style="text-align:center;background:var(--slate-50);border-radius:14px;padding:12px 6px"><span style="color:${c}">${icon(ic)}</span><div class="bold mt-4">${v}</div><div class="muted tiny">${l}</div></div>`)}</div></div>
      <div class="p-card"><h3>Petunjuk ujian</h3><div class="rules">
        <div>${icon('fullscreen')}<span>Ujian berjalan dalam <b>mode layar penuh</b>.</span></div>
        <div>${icon('app_blocking')}<span><b>Jangan pindah aplikasi atau tab.</b> Setiap kejadian tercatat dan dapat mengunci sesi.</span></div>
        <div>${icon('cloud_done')}<span>Jawaban <b>tersimpan otomatis</b> setiap kali Anda memilih — aman walau sinyal putus sebentar.</span></div>
        <div>${icon('flag')}<span>Tandai <b>Ragu-ragu</b> untuk soal yang ingin diperiksa lagi.</span></div>
        <div>${icon('timer')}<span>Waktu dihitung server. Saat waktu habis, jawaban terkirim otomatis.</span></div></div></div>
      <div class="p-card" id="tokbox">${resume ? html`<div class="alert orange" style="margin:0"><div class="a-ic">${icon('replay')}</div><div class="small">Anda sudah memulai ujian ini${u.sesi ? html` dan menjawab <b>${u.sesi.terjawab}</b> soal` : ''}. Lanjutkan dari perangkat yang sama.</div></div>` : html`
        <h3 style="text-align:center">Masukkan token ujian</h3><p class="muted small" style="text-align:center">Token diberikan oleh pengawas ruang ujian.</p>`}
        <div class="token-in mt-8 ${resume ? 'hidden' : ''}" id="tok">${Array.from({ length: 6 }, (_, i) => html`<input maxlength="1" inputmode="text" autocomplete="off" autocapitalize="characters" aria-label="Token huruf ${i + 1}" data-i="${i}">`)}</div>
        <div class="err-text hidden" id="err" style="text-align:center"></div>
        <button class="btn primary lg block mt-8" id="go" ${st === 'akan' ? 'disabled' : ''}>${icon(resume ? 'replay' : 'play_arrow')} ${st === 'akan' ? 'Belum dimulai (' + fmt.time(u.mulai) + ')' : resume ? 'Lanjutkan Ujian' : 'Mulai Sekarang'}</button></div>
    </div></div>`.s;

  const boxes = $$('#tok input', el);
  const tokenVal = () => boxes.map((b) => b.value).join('').toUpperCase();
  boxes.forEach((b, i) => {
    b.addEventListener('input', () => { b.value = b.value.replace(/[^a-z0-9]/gi, '').slice(-1).toUpperCase(); if (b.value && boxes[i + 1]) boxes[i + 1].focus(); $('#tok', el).classList.remove('bad'); });
    b.addEventListener('keydown', (e) => { if (e.key === 'Backspace' && !b.value && boxes[i - 1]) boxes[i - 1].focus(); if (e.key === 'Enter') $('#go', el).click(); });
    b.addEventListener('paste', (e) => { e.preventDefault(); const t = (e.clipboardData.getData('text') || '').replace(/[^a-z0-9]/gi, '').toUpperCase(); boxes.forEach((x, j) => { x.value = t[j] || ''; }); boxes[Math.min(t.length, 5)].focus(); });
  });
  if (!resume) setTimeout(() => boxes[0]?.focus(), 100);

  const start = async (needToken) => {
    const err = $('#err', el); err.classList.add('hidden');
    const tok = tokenVal();
    if (needToken && tok.length < 4) { $('#tok', el).classList.add('bad'); err.textContent = 'Masukkan token ujian.'; err.classList.remove('hidden'); return; }
    const btn = $('#go', el); btn.disabled = true; btn.innerHTML = '<span class="spin"></span> Menyiapkan soal…';
    enterFullscreen(); // harus dalam gestur pengguna
    try {
      const pkg = await api.prpc('p_start', { exam: u.id, exam_token: tok, device: api.deviceId() });
      savePkg(u.id, pkg);
      go('/ujian/' + u.id + '/kerjakan', { replace: true });
    } catch (e) {
      btn.disabled = false; btn.innerHTML = html`${icon('play_arrow')} ${resume ? 'Lanjutkan Ujian' : 'Mulai Sekarang'}`.s;
      if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
      if (e.hint === 'token') { $('#tok', el).classList.remove('hidden'); $('#tok', el).classList.add('bad'); boxes[0].focus(); }
      if (e.hint === 'selesai') return go('/ujian/' + u.id + '/hasil', { replace: true });
      if (e.hint === 'relogin') { api.peserta.clear(); return go('/masuk', { replace: true }); }
      err.textContent = e.message; err.classList.remove('hidden');
      if (e.hint === 'perangkat') toast('Sesi aktif di perangkat lain', 'Minta pengawas menekan "Izinkan Pindah Perangkat".', 'warn', 7000);
    }
  };
  $('#go', el).addEventListener('click', () => start(!resume || !$('#tok', el).classList.contains('hidden')));
}
