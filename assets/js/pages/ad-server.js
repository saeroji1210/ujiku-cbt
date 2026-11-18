import * as api from '../core/api.js';
import * as store from '../core/store.js';
import { html, icon, $, fmt, badge, skel, empty, mapelColor } from '../core/ui.js';

const KEY = 'ad_servers';
const load = () => api.rpc('ad_servers');
export const prefetch = () => store.fetchOnce(KEY, load);

export default async function (ctx) {
  const { el, title, alive, me } = ctx;
  title('Server Lokal');
  el.innerHTML = html`<div class="page-head"><div><div class="crumb">Lainnya</div><h1>Server Lokal Sekolah</h1>
    <div class="sub">Server lokal menjalankan ujian lewat WiFi sekolah tanpa internet, lalu menyinkronkan jawaban ke cloud saat internet tersedia.</div></div></div><div id="body">${skel.cards(2, 180)}</div>`.s;
  const paint = (d) => {
    if (!alive()) return;
    $('#body', el).innerHTML = html`${d.servers.length ? html`<div class="grid g-2">${d.servers.map((s) => html`<div class="card col">
        <div class="row"><div class="icon-tile" style="background:${s.online ? 'var(--green)' : '#94A3B8'}">${icon('dns')}</div>
          <div style="flex:1"><h3>${s.nama}</h3><div class="muted small">Versi ${s.versi || '–'}</div></div>
          ${s.online ? html`<span class="badge b-green pulse"><i class="d"></i> Online</span>` : badge('offline', 'Offline')}</div>
        <div class="grid g-3 mt-8" style="gap:10px">${[['Terakhir online', s.terakhir_online ? fmt.rel(s.terakhir_online) : 'belum pernah'], ['Sinkron terakhir', s.terakhir_sinkron ? fmt.rel(s.terakhir_sinkron) : '–'],
          ['Antrean', s.antrean ? s.antrean + ' data' : 'Kosong']].map(([l, v]) => html`<div style="background:var(--slate-50);border-radius:12px;padding:10px 12px"><div class="muted tiny">${l}</div><b>${v}</b></div>`)}</div>
        ${s.antrean ? html`<div class="alert orange" style="margin:0"><div class="a-ic">${icon('sync_problem')}</div><div class="small">Ada data yang belum terkirim. Pastikan server tersambung internet setelah ujian.</div></div>` : ''}</div>`)}</div>`
      : html`<div class="card">${empty('dns', 'Belum ada server lokal', 'Server lokal disediakan dan dipasang oleh tim UjiKu CBT sebagai bagian dari paket layanan. Hubungi tim UjiKu untuk memasang server di sekolah Anda.',
          me.kontak?.wa ? html`<a class="btn primary" target="_blank" rel="noopener" href="https://wa.me/${me.kontak.wa}">${icon('support_agent')} Hubungi tim UjiKu</a>` : '')}</div>`}
      <div class="grid g-2 mt-24"><div class="card"><h3>Cara kerja</h3><div class="col gap-16 mt-16 small">
        ${[['cloud_download', 'Saat ada internet', 'Admin menerbitkan ujian dengan lokasi "Server lokal". Server otomatis mengunduh soal (tanpa kunci jawaban) dan daftar peserta.'],
           ['wifi', 'Hari ujian', 'Peserta tersambung ke WiFi sekolah lalu membuka alamat server lokal (mis. http://ujian.lokal). Tidak perlu internet.'],
           ['cloud_upload', 'Setelah ujian', 'Jawaban dikirim ke cloud saat internet tersedia, lalu dinilai otomatis dan muncul di Laporan Nilai.']]
          .map(([ic, t, s]) => html`<div class="row top"><div class="icon-tile soft" style="width:40px;height:40px">${icon(ic)}</div><div><b>${t}</b><div class="muted">${s}</div></div></div>`)}</div></div>
        <div class="card"><h3>Ujian lewat server lokal (30 hari)</h3>${d.ujian.length ? html`<div class="col gap-8 mt-16">${d.ujian.map((u) => html`<a class="list-row" href="#/laporan/${u.id}" style="padding:12px">
            <span style="width:8px;height:36px;border-radius:4px;background:${mapelColor(u.mapel)}"></span><div style="flex:1;min-width:0"><div class="semi ellipsis">${u.judul}</div>
            <div class="muted small">${fmt.dt(u.mulai)} · ${u.tersinkron}/${u.peserta} sesi tersinkron</div></div>${badge(u.status)}</a>`)}</div>`
          : html`<p class="muted small mt-16">Belum ada ujian dengan lokasi server lokal.</p>`}</div></div>`.s;
  };
  await store.swr(KEY, load, paint, { alive, ttl: 10000 });
}
