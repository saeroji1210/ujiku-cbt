// Tulis soal langsung di aplikasi (tanpa Word): pilih bank soal atau buat baru, lalu editor terbuka di soal kosong.
import * as api from '../core/api.js';
import * as store from '../core/store.js';
import { html, icon, $, on, fmt, mapelColor, mapelIcon, badge, skel, empty, toast, toastErr, busy, debounce } from '../core/ui.js';
import { bankForm } from './bank-list.js';

const TIPS = [
  ['edit_note', 'Teks soal', 'Huruf tebal/miring, pangkat (x²), indeks (H₂O), dan daftar.'],
  ['add_photo_alternate', 'Gambar', 'Di soal maupun di opsi jawaban: klik ikon gambar, seret berkas, atau tempel (Ctrl+V).'],
  ['auto_stories', 'Wacana & audio', 'Satu bacaan, gambar, atau audio listening untuk beberapa soal sekaligus.'],
  ['key', 'Kunci jawaban', 'Klik bulatan di samping opsi yang benar. Opsi bisa 2 sampai 6 (A–F).'],
  ['cloud_done', 'Tersimpan otomatis', 'Tidak perlu tombol simpan. "Simpan & Lanjut" membuka soal berikutnya.'],
  ['verified', 'Siap dipakai', 'Setelah selesai, klik "Tandai Siap Dipakai" agar bisa dijadwalkan.'],
];

export default async function (ctx) {
  const { el, title, alive, me, mode, go } = ctx;
  const guru = mode === 'guru';
  title('Tulis Soal');
  let data = null, q = '';
  el.innerHTML = html`<div class="page-head"><div><div class="crumb">${guru ? 'Ruang Guru' : 'Ujian'} › <b>Tulis Soal</b></div>
      <h1>Tulis Soal di Aplikasi</h1><div class="sub">Buat soal langsung tanpa Word. Pilih bank soal tujuan, editor terbuka di soal kosong dan siap diketik.</div></div>
      <span class="spacer"></span><a class="btn secondary" href="#/impor">${icon('upload_file')} Punya file Word? Impor</a></div>
    <div class="tulis-grid">
      <div class="card pad-0">
        <div class="tulis-head"><div><h3 style="margin:0">Pilih bank soal</h3><div class="muted small">Soal baru ditambahkan di akhir bank yang dipilih.</div></div>
          <span class="spacer"></span><button class="btn primary" data-new>${icon('library_add')} Bank Soal Baru</button></div>
        <div class="toolbar"><div class="input-ic" style="flex:1">${icon('search')}<input class="input soft" id="q" placeholder="Cari nama bank soal atau mapel…"></div></div>
        <div id="list">${skel.lines(5)}</div></div>
      <aside class="card tulis-tips"><h3 style="margin:0 0 4px">Yang bisa dibuat di editor</h3>
        ${TIPS.map(([ic, t, d]) => html`<div class="tip"><span class="icon-tile soft">${icon(ic)}</span><div><b>${t}</b><div class="muted small">${d}</div></div></div>`)}</aside>
    </div>`.s;

  const paint = () => {
    if (!alive() || !data) return;
    const k = q.toLowerCase();
    const rows = (data.rows || []).filter((b) => b.status !== 'diarsipkan' && (!k || (b.nama + ' ' + b.mapel).toLowerCase().includes(k)));
    $('#list', el).innerHTML = rows.length ? html`${rows.map((b) => html`<div class="list-row tulis-row">
        <div class="icon-tile" style="background:${mapelColor(b.mapel)}">${icon(mapelIcon(b.mapel))}</div>
        <div style="flex:1;min-width:0"><div class="semi ellipsis">${b.nama}</div>
          <div class="muted small ellipsis">${b.mapel}${b.jenjang ? ' · Kelas ' + b.jenjang : ''} · ${fmt.num(b.jumlah)} soal${guru ? '' : ' · ' + (b.pemilik?.nama || '–')} · diubah ${fmt.rel(b.updated_at)}</div></div>
        ${b.terkunci ? html`${badge('terkunci', 'Terkunci')}<button class="btn secondary sm" data-dup="${b.id}" title="Bank ini dipakai ujian, jadi tidak bisa diubah. Salin untuk menulis soal baru.">${icon('content_copy')} Salin & tulis</button>`
          : html`${badge(b.status)}<a class="btn soft sm" href="#/bank/${b.id}?tulis=1">${icon('edit_note')} Tulis di sini</a>`}</div>`)}`.s
      : html`${empty('layers', q ? 'Tidak ada yang cocok' : 'Belum ada bank soal', q ? 'Coba kata kunci lain.' : 'Buat bank soal dulu (nama, mapel, kelas), lalu editor langsung terbuka.',
          q ? '' : html`<button class="btn primary" data-new>${icon('library_add')} Buat Bank Soal Pertama</button>`)}`.s;
  };
  try {
    await store.swr('banks||||', () => api.rpc('banks_list', {}), (d) => { data = d; paint(); }, { alive, ttl: 10000 });
  } catch (x) { toastErr(x); }

  const offs = [
    on(el, 'click', '[data-new]', () => bankForm({ data, me, go, onSaved: (r) => go('/bank/' + r.id + '?tulis=1') })),
    on(el, 'click', '[data-dup]', (e, b) => busy(b, async () => {
      try {
        const r = await api.rpc('bank_duplicate', { id: b.dataset.dup });
        store.invalidate('banks'); toast('Salinan bank soal dibuat', 'Soal baru ditulis di salinan ini.', 'ok');
        go('/bank/' + r.id + '?tulis=1');
      } catch (x) { toastErr(x); }
    })),
  ];
  $('#q', el).addEventListener('input', debounce((e) => { q = e.target.value.trim(); paint(); }, 200));
  return () => offs.forEach((f) => f());
}
