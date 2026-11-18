import * as api from '../core/api.js';
import * as store from '../core/store.js';
import { html, icon, $, $$, on, fmt, mapelColor, badge, skel, empty, toast, toastErr, popMenu, confirmDialog, copyText } from '../core/ui.js';

const KEY = 'exams_list';
const load = () => api.rpc('exams_list', {});
export const prefetch = () => store.fetchOnce(KEY, load);
const TABS = [['', 'Semua'], ['berlangsung', 'Berlangsung'], ['terjadwal', 'Terjadwal'], ['draf', 'Draf'], ['berakhir', 'Menunggu Ditutup'], ['selesai', 'Selesai'], ['dibatalkan', 'Dibatalkan']];

export async function examAction(k, e, { go, after }) {
  try {
    if (k === 'token') { const r = await api.rpc('exam_token_regen', { id: e.id }); toast('Token baru: ' + r.token, 'Bagikan token baru kepada peserta.', 'ok', 6000); }
    else if (k === 'close') {
      if (!(await confirmDialog({ title: 'Tutup ujian?', text: 'Semua sesi yang masih berjalan akan diakhiri dan dinilai. Analisis butir soal dihitung otomatis.', ok: 'Tutup Ujian', ic: 'lock_clock' }))) return;
      const r = await api.rpc('exam_close', { id: e.id }); toast('Ujian ditutup', r.diakhiri ? `${r.diakhiri} sesi diakhiri otomatis.` : 'Nilai dan analisis siap dilihat.', 'ok');
    } else if (k === 'cancel') {
      if (!(await confirmDialog({ title: e.status === 'draf' ? 'Hapus draf ujian?' : 'Batalkan ujian?', text: e.status === 'draf' ? 'Draf ini akan dihapus.' : `Poin yang terpakai (${e.poin_terpakai}) dikembalikan ke saldo lembaga.`, danger: true, ok: e.status === 'draf' ? 'Hapus' : 'Batalkan Ujian' }))) return;
      const r = await api.rpc('exam_cancel', { id: e.id }); toast(r.dihapus ? 'Draf dihapus' : 'Ujian dibatalkan', r.refund ? `${r.refund} poin dikembalikan.` : '', 'ok');
    } else return;
    store.invalidate(KEY, 'ad_dashboard', 'me', 'report', 'monitor');
    after && after();
  } catch (x) { toastErr(x); }
}

export default async function (ctx) {
  const { el, title, alive, go, refreshMe } = ctx;
  title('Jadwal Ujian');
  let tab = '', rows = [];
  el.innerHTML = html`<div class="page-head"><div><div class="crumb">Ujian</div><h1>Jadwal Ujian</h1>
    <div class="sub">Buat jadwal dari bank soal berstatus Siap, pilih peserta, lalu terbitkan. Poin dipotong satu kali saat ujian diterbitkan.</div></div>
    <span class="spacer"></span><a class="btn primary" href="#/admin/ujian/baru">${icon('add_task')} Buat Jadwal Ujian</a></div>
    <div class="tabs" id="tabs"></div><div id="body">${skel.table(6)}</div>`.s;

  const paint = (d) => {
    rows = d; if (!alive()) return;
    const cnt = (k) => (k ? rows.filter((r) => r.state === k).length : rows.length);
    $('#tabs', el).innerHTML = TABS.map(([k, l]) => html`<button data-t="${k}" class="${tab === k ? 'on' : ''}">${l}${cnt(k) ? html`<span class="cnt">${cnt(k)}</span>` : ''}</button>`.s).join('');
    const list = rows.filter((r) => !tab || r.state === tab);
    $('#body', el).innerHTML = (list.length ? html`<div class="card pad-0"><div class="table-wrap"><table class="table"><thead><tr><th>Ujian</th><th>Jadwal</th><th>Peserta</th><th class="hide-sm">Progres</th><th class="hide-sm">Token</th><th>Status</th><th></th></tr></thead>
      <tbody>${list.map((e) => {
        const c = mapelColor(e.mapel); const pct = e.peserta ? Math.round((e.selesai_n / e.peserta) * 100) : 0;
        return html`<tr class="clickable" data-id="${e.id}"><td><div class="row gap-8"><span style="width:10px;height:40px;border-radius:4px;background:${c};flex:none"></span>
            <div style="min-width:0"><div class="semi">${e.judul}</div><div class="muted small">${e.mapel || '–'} · ${e.bank || 'Bank belum dipilih'}${e.lokasi === 'server_lokal' ? ' · Server lokal' : ''}</div></div></div></td>
          <td class="nowrap"><div>${fmt.day(e.mulai)}</div><div class="muted small">${fmt.time(e.mulai)}–${fmt.time(e.selesai)} · ${e.durasi_menit} mnt</div></td>
          <td><div class="semi">${e.peserta}</div><div class="muted small">${(e.kelas || []).join(', ') || '–'}</div></td>
          <td class="hide-sm" style="min-width:140px">${e.status === 'draf' ? html`<span class="muted small">–</span>` : html`<div class="small">${e.selesai_n}/${e.peserta} selesai</div><div class="progress mt-4"><i style="width:${pct}%;background:${c}"></i></div>`}</td>
          <td class="hide-sm">${e.status === 'terbit' ? html`<button class="btn ghost sm mono" data-copy="${e.token}" title="Salin token">${e.token}</button>` : html`<span class="muted">–</span>`}</td>
          <td>${badge(e.state)}</td><td style="text-align:right"><button class="btn ghost icon sm" data-menu aria-label="Aksi">${icon('more_vert')}</button></td></tr>`;
      })}</tbody></table></div></div>`
      : html`<div class="card">${empty('event_note', tab ? 'Tidak ada ujian di kategori ini' : 'Belum ada jadwal ujian', 'Buat jadwal ujian pertama dari bank soal yang sudah siap.', html`<a class="btn primary" href="#/admin/ujian/baru">${icon('add_task')} Buat Jadwal Ujian</a>`)}</div>`).s;
  };
  await store.swr(KEY, load, paint, { alive, ttl: 8000 });
  const hard = () => { store.invalidate(KEY); store.fetchOnce(KEY, load).then(paint); refreshMe(); };
  const offs = [
    on(el, 'click', '[data-t]', (e, b) => { tab = b.dataset.t; paint(rows); }),
    on(el, 'click', '[data-copy]', (e, b) => { e.stopPropagation(); copyText(b.dataset.copy, 'Token disalin'); }),
    on(el, 'click', 'tr[data-id]', (e, tr) => {
      const ex = rows.find((x) => x.id === tr.dataset.id);
      if (e.target.closest('[data-menu]')) {
        const it = [{ label: ex.status === 'draf' ? 'Lanjutkan pengaturan' : 'Detail & ubah', icon: 'edit', k: 'open' }];
        if (ex.status !== 'draf' && ex.status !== 'dibatalkan') it.push({ label: 'Pantau sesi', icon: 'visibility', k: 'mon' }, { label: 'Laporan nilai', icon: 'monitoring', k: 'rep' });
        if (ex.status === 'terbit') it.push({ label: 'Ganti token', icon: 'key', k: 'token' }, { sep: true }, { label: 'Tutup ujian', icon: 'lock_clock', k: 'close' });
        if (ex.status === 'terbit' && !ex.selesai_n && !ex.mengerjakan) it.push({ label: 'Batalkan & kembalikan poin', icon: 'cancel', k: 'cancel', red: true });
        if (ex.status === 'draf') it.push({ sep: true }, { label: 'Hapus draf', icon: 'delete', k: 'cancel', red: true });
        return popMenu(e.target.closest('[data-menu]'), it, (x) => {
          if (x.k === 'open') go('/admin/ujian/' + ex.id);
          else if (x.k === 'mon') go('/pantau/' + ex.id);
          else if (x.k === 'rep') go('/laporan/' + ex.id);
          else examAction(x.k, ex, { go, after: hard });
        });
      }
      if (e.target.closest('[data-copy]')) return;
      go(ex.state === 'berlangsung' ? '/pantau/' + ex.id : ex.state === 'selesai' || ex.state === 'berakhir' ? '/laporan/' + ex.id : '/admin/ujian/' + ex.id);
    }),
  ];
  return () => offs.forEach((f) => f());
}
