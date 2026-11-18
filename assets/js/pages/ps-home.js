import * as api from '../core/api.js';
import { html, icon, $, on, fmt, initials, mapelColor, skel, empty, toast, toastErr, confirmDialog } from '../core/ui.js';

export function examState(u, nowMs = Date.now()) {
  const s = u.sesi;
  if (s?.status === 'selesai' || u.exam_status === 'selesai') return s ? 'selesai' : 'lewat';
  if (s?.status === 'terkunci') return 'terkunci';
  if (s?.status === 'mengerjakan') return nowMs > new Date(s.batas_waktu).getTime() + 120000 ? 'selesai' : 'lanjut';
  if (nowMs < new Date(u.mulai).getTime()) return 'akan';
  if (nowMs > new Date(u.selesai).getTime()) return 'lewat';
  return 'tersedia';
}
export function pesertaNav(active) {
  return html`<nav class="p-nav">${[['#/ujian', 'home', 'Beranda', 'home'], ['#/ujian?riwayat=1', 'history', 'Riwayat', 'riwayat'], ['#/ujian?keluar=1', 'logout', 'Keluar', 'keluar']]
    .map(([h, ic, l, k]) => html`<a href="${h}" class="${active === k ? 'on' : ''}" data-nav="${k}">${icon(ic)}<span>${l}</span></a>`)}</nav>`;
}

export default async function (ctx) {
  const { el, title, alive, go, query } = ctx;
  title('Beranda Peserta');
  const sesi = api.peserta.get();
  if (!sesi) return go('/masuk', { replace: true });
  if (query.keluar) {
    if (await confirmDialog({ title: 'Keluar dari akun?', text: 'Pastikan semua ujian sudah selesai dikerjakan.', ok: 'Keluar', ic: 'logout' })) {
      api.prpc('p_logout').catch(() => {});
      api.peserta.clear();
      return go('/masuk', { replace: true });
    }
    return go('/ujian', { replace: true });
  }
  const P = sesi.peserta;
  const lokal = api.MODE === 'lokal';
  el.innerHTML = html`<div class="p-app"><header class="p-head"><div class="row" style="position:relative;z-index:1">
      <span class="avatar lg" style="background:rgba(255,255,255,.22);color:#fff">${initials(P.nama)}</span>
      <div style="flex:1;min-width:0"><h1 class="ellipsis">Hai, ${P.nama.split(' ')[0]}!</h1><div class="s">Kelas ${P.kelas || '–'} · ${sesi.lembaga?.nama || ''}</div></div>
      <span class="badge" id="net" style="background:rgba(255,255,255,.2);color:#fff"></span></div></header>
    <div class="p-body" id="body">${skel.cards(2, 160)}</div></div>${pesertaNav(query.riwayat ? 'riwayat' : 'home')}`.s;
  const net = () => { $('#net', el).innerHTML = html`${icon(lokal ? 'lan' : navigator.onLine ? 'wifi' : 'wifi_off')} ${lokal ? 'Server Lokal' : navigator.onLine ? 'Online' : 'Offline'}`.s; };
  net();
  window.addEventListener('online', net); window.addEventListener('offline', net);

  let d = null, skew = 0;
  const paint = () => {
    if (!alive() || !d) return;
    const now = Date.now() + skew;
    const list = d.ujian.map((u) => ({ ...u, st: examState(u, now) }));
    const aktif = list.filter((u) => ['tersedia', 'lanjut', 'terkunci'].includes(u.st));
    const akan = list.filter((u) => u.st === 'akan');
    const riwayat = list.filter((u) => ['selesai', 'lewat'].includes(u.st)).reverse();
    const card = (u) => {
      const c = mapelColor(u.mapel);
      const lokalEx = u.lokasi === 'server_lokal' && !lokal;
      const btn = lokalEx && ['tersedia', 'lanjut'].includes(u.st) ? html`<div class="alert cyan" style="margin:0"><div class="a-ic">${icon('lan')}</div><div class="small">Dikerjakan lewat <b>WiFi ujian sekolah</b>. Buka alamat server lokal dari pengawas.</div></div>`
        : u.st === 'tersedia' ? html`<a class="btn primary lg block" href="#/ujian/${u.id}">${icon('play_arrow')} Mulai Ujian</a>`
        : u.st === 'lanjut' ? html`<a class="btn orange lg block" href="#/ujian/${u.id}">${icon('replay')} Lanjutkan Ujian</a>`
        : u.st === 'terkunci' ? html`<div class="alert red" style="margin:0"><div class="a-ic">${icon('lock')}</div><div class="small"><b>Sesi terkunci.</b> Hubungi pengawas untuk melanjutkan.</div><a class="btn sm secondary" href="#/ujian/${u.id}">Cek</a></div>`
        : u.st === 'akan' ? html`<button class="btn secondary lg block" disabled>${icon('schedule')} Dimulai ${fmt.day(u.mulai)} ${fmt.time(u.mulai)}</button>`
        : u.st === 'selesai' ? (u.nilai != null ? html`<div class="row"><span class="muted">Nilai Anda</span><span class="spacer"></span><b style="font-size:24px;color:var(--green)">${fmt.num(u.nilai, 1)}</b></div>` : html`<div class="muted small">${icon('task_alt', 'c-green')} Sudah dikerjakan${u.tampilkan_nilai ? ' · nilai diproses' : ' · nilai diumumkan sekolah'}</div>`)
        : html`<div class="muted small">${icon('event_busy')} Tidak mengikuti ujian ini</div>`;
      return html`<div class="p-card"><div class="row"><span class="chip-head" style="background:${c};height:30px;font-size:13px;flex:none">${u.mapel || 'Ujian'}</span><span class="spacer"></span>
          ${{ tersedia: html`<span class="badge b-blue">Tersedia</span>`, lanjut: html`<span class="badge b-orange">Sedang dikerjakan</span>`, terkunci: html`<span class="badge b-red">Terkunci</span>`,
             akan: html`<span class="badge b-gray">Belum dimulai</span>`, selesai: html`<span class="badge b-green">Selesai</span>`, lewat: html`<span class="badge b-gray">Berakhir</span>` }[u.st]}</div>
        <h3 style="font-size:18px">${u.judul}</h3>
        <div class="muted small row wrap gap-8">${icon('schedule')} ${fmt.time(u.mulai)}–${fmt.time(u.selesai)} · ${u.durasi_menit} menit · ${u.jumlah_soal} soal${u.st === 'lanjut' && u.sesi ? html` · <b class="c-orange">${u.sesi.terjawab} terjawab</b>` : ''}</div>
        ${btn}</div>`;
    };
    $('#body', el).innerHTML = (query.riwayat ? html`<h2 style="font-size:18px">Riwayat Ujian</h2>${riwayat.length ? riwayat.map(card) : html`<div class="p-card">${empty('history', 'Belum ada riwayat')}</div>`}`
      : html`<div class="row"><h2 style="font-size:18px">Ujian Hari Ini</h2><span class="spacer"></span><button class="btn ghost sm" data-r>${icon('refresh')} Muat ulang</button></div>
        ${aktif.length ? aktif.map(card) : html`<div class="p-card">${empty('beach_access', 'Tidak ada ujian saat ini', 'Tetap semangat belajar! Ujian yang dijadwalkan untukmu akan muncul di sini.')}</div>`}
        ${akan.length ? html`<h2 style="font-size:18px" class="mt-8">Ujian Mendatang</h2>${akan.map(card)}` : ''}
        ${riwayat.length ? html`<h2 style="font-size:18px" class="mt-8">Riwayat Nilai</h2>${riwayat.slice(0, 3).map(card)}${riwayat.length > 3 ? html`<a class="btn ghost" href="#/ujian?riwayat=1">Lihat semua riwayat</a>` : ''}` : ''}`).s;
  };
  const load = async () => {
    try {
      d = await api.prpc('p_home');
      skew = new Date(d.server_now).getTime() - Date.now();
      api.peserta.set({ ...api.peserta.get(), peserta: d.peserta, lembaga: d.lembaga || sesi.lembaga });
      paint();
    } catch (e) {
      if (e.hint === 'relogin') { api.peserta.clear(); toast('Sesi berakhir', 'Silakan masuk kembali.', 'warn'); return go('/masuk', { replace: true }); }
      if (!d) $('#body', el).innerHTML = html`<div class="p-card">${empty('cloud_off', 'Tidak dapat memuat ujian', e.message, html`<button class="btn primary" data-r>${icon('refresh')} Coba lagi</button>`)}</div>`.s;
      else toastErr(e);
    }
  };
  await load();
  const iv = setInterval(() => { if (!document.hidden) load(); }, 30000);
  const tick = setInterval(paint, 20000);
  const off = on(el, 'click', '[data-r]', () => load());
  return () => { clearInterval(iv); clearInterval(tick); off(); window.removeEventListener('online', net); window.removeEventListener('offline', net); };
}
