import * as api from '../core/api.js';
import * as store from '../core/store.js';
import { html, raw, icon, $, fmt, initials, mapelColor, mapelIcon, skel, empty } from '../core/ui.js';

const KEY = 'ad_dashboard';
const load = () => api.rpc('ad_dashboard');
export const prefetch = () => store.fetchOnce(KEY, load);

export default async function (ctx) {
  const { el, me, title, alive, paintWallet } = ctx;
  title('Dashboard');
  el.innerHTML = skel.page().s;
  const paint = (d) => {
    if (!alive()) return;
    if (me) { me.saldo = d.saldo; paintWallet(); }
    const sapa = me.nama.split(',')[0];
    const ppp = Number(d.poin_per_peserta || 1);
    const low = d.saldo < 100;
    const hide = sessionStorage.getItem('ujk.hide-low') === '1';
    el.innerHTML = html`
      ${low && !hide ? html`<div class="alert orange" id="low"><div class="a-ic">${icon('toll')}</div>
        <div style="flex:1"><b class="c-orange">Saldo poin lembaga tinggal ${fmt.num(d.saldo)} poin.</b>
        <span class="muted"> Cukup untuk sekitar ${fmt.num(Math.floor(d.saldo / ppp))} peserta-ujian lagi.</span></div>
        <a class="btn orange sm" href="#/admin/poin">${icon('add_shopping_cart')} Beli Poin</a>
        <button class="btn ghost icon sm" data-close aria-label="Tutup">${icon('close')}</button></div>` : ''}
      <section class="banner">
        <div class="b-txt"><span class="b-pill"><i></i> Sistem CBT siap & terhubung</span>
          <h1>Selamat datang, ${sapa}!</h1>
          <p>Ujian lebih mudah, nilai lebih cepat. ${d.berlangsung.length ? html`<b>${d.berlangsung.length} sesi ujian</b> sedang aktif diawasi hari ini.` : 'Belum ada ujian yang berlangsung saat ini.'}</p></div>
      </section>
      <div class="grid g-4 mt-16" style="gap:14px">
        ${[['groups', 'Peserta aktif', d.statistik.peserta, '#/admin/peserta', '#1565D8'], ['badge', 'Guru & staf', d.statistik.guru, '#/admin/guru', '#22B8E8'],
           ['layers', 'Bank soal', d.statistik.bank, '#/bank', '#F7941D'], ['event_available', 'Ujian bulan ini', d.statistik.ujian_bulan, '#/admin/ujian', '#22A06B']]
          .map(([ic, l, v, h, c]) => html`<a class="card row hover-lift" href="${h}" style="padding:14px 16px;color:inherit;text-decoration:none">
            <div class="icon-tile" style="background:${c};width:42px;height:42px">${icon(ic)}</div><div><div class="bold" style="font-size:20px">${fmt.num(v)}</div><div class="muted small">${l}</div></div></a>`)}
      </div>
      <div class="section-title"><span class="bar"></span><h2>Ujian Berlangsung</h2>
        ${d.berlangsung.length ? html`<span class="badge b-blue">${d.berlangsung.length} Sesi Aktif</span>` : ''}
        <span class="spacer"></span><a class="link-more" href="#/pantau">Lihat Semua ${icon('arrow_forward')}</a></div>
      ${d.berlangsung.length ? html`<div class="grid g-4">${d.berlangsung.map(examCard)}</div>`
        : html`<div class="card">${empty('event_busy', 'Belum ada ujian berlangsung', 'Ujian yang sedang berjalan akan tampil di sini lengkap dengan progres peserta.',
          html`<a class="btn primary" href="#/admin/ujian/baru">${icon('add')} Buat Jadwal Ujian</a>`)}</div>`}
      <div class="grid g-main mt-24">
        <div>
          <div class="row" style="margin-bottom:14px"><h2 style="font-size:20px">Jadwal Ujian Mendatang</h2><span class="spacer"></span>
            <a class="link-more small" href="#/admin/ujian">Lihat Semua</a></div>
          <div class="col gap-16">${d.mendatang.length ? d.mendatang.map(schedCard) : html`<div class="card muted small">Belum ada jadwal ujian mendatang.</div>`}
            <a class="btn soft lg block" href="#/admin/ujian/baru" style="border:1.5px dashed var(--primary-100)">${icon('add_circle')} Buat Jadwal Ujian Baru</a></div>
        </div>
        <div>
          <div class="row" style="margin-bottom:14px"><h2 style="font-size:20px">Bank Soal Siap Dipakai</h2><span class="spacer"></span><a class="link-more small" href="#/bank">Lihat Semua</a></div>
          <div class="col gap-16">${d.bank_siap.length ? d.bank_siap.map((b) => html`<a class="list-row" href="#/bank/${b.id}">
              <div class="icon-tile" style="background:${mapelColor(b.mapel)}">${icon(mapelIcon(b.mapel))}</div>
              <div style="flex:1;min-width:0"><div class="semi ellipsis">${b.nama}</div><div class="muted small ellipsis">${b.pemilik || '–'} · ${b.jumlah} butir soal · Siap uji</div></div>
              ${icon('chevron_right', 'muted')}</a>`) : html`<div class="card muted small">Belum ada bank soal berstatus siap. Guru menandai bank soal sebagai "Siap Dipakai" dari editor soal.</div>`}
            <a class="list-row" href="#/tulis" style="padding:14px 16px">${icon('edit_note', 'c-primary')}<div style="flex:1" class="semi">Tulis soal langsung di aplikasi</div><span class="c-primary semi">Tulis Soal</span></a>
            <a class="list-row" href="#/impor" style="padding:14px 16px">${icon('upload_file', 'c-primary')}<div style="flex:1" class="semi">Punya file soal format Word (.docx)?</div><span class="c-primary semi">Impor Cepat</span></a>
          </div>
        </div>
        <div>
          <div class="row" style="margin-bottom:14px"><h2 style="font-size:20px">Aktivitas Terbaru</h2><span class="spacer"></span><span class="badge b-green pulse" style="padding:0 6px">${raw('<i class="d"></i>')}</span></div>
          <div class="card">${d.aktivitas.length ? html`<div class="timeline">${d.aktivitas.map((a) => html`<div class="tl"><div class="tm">${fmt.time(a.waktu)}</div>
              <div class="bar" style="background:${({ green: '#22A06B', coral: '#F15A3B', cyan: '#22B8E8', blue: '#1565D8', navy: '#1B2A4E' })[a.warna] || '#1565D8'}"></div>
              <div style="min-width:0"><div class="tt ellipsis">${a.judul}</div><div class="ts ${a.warna === 'green' ? 'c-green' : a.warna === 'coral' ? 'c-coral' : ''}">${a.sub}</div></div></div>`)}</div>`
              : html`<div class="muted small">Belum ada aktivitas.</div>`}
            <div style="border-top:1px solid var(--border-2);margin-top:18px;padding-top:14px;text-align:center"><a class="semi muted" href="#/pantau">Buka Log Pengawasan Lengkap ${icon('arrow_forward')}</a></div>
          </div>
        </div>
      </div>`.s;
    $('[data-close]', el)?.addEventListener('click', () => { sessionStorage.setItem('ujk.hide-low', '1'); $('#low', el)?.remove(); });
  };
  await store.swr(KEY, load, paint, { ttl: 15000, alive });
  const iv = setInterval(() => { if (!document.hidden) store.fetchOnce(KEY, load).then(paint).catch(() => {}); }, 30000);
  return () => clearInterval(iv);
}

function examCard(e) {
  const c = mapelColor(e.mapel);
  const pct = e.total ? Math.round((e.selesai_n / e.total) * 100) : 0;
  const sisa = (new Date(e.selesai) - Date.now()) / 1000;
  const flag = e.kejadian > 0;
  return html`<a class="card exam-card" href="#/pantau/${e.id}" style="color:inherit;text-decoration:none">
    <div class="chip-head" style="background:${c}">${e.mapel || 'Ujian'}</div>
    <div class="t ellipsis" title="${e.judul}">${e.judul}</div>
    <div class="m">${icon('person')} <span class="ellipsis">${e.pembuat || 'Admin lembaga'}</span></div>
    ${flag ? html`<span class="warn-strip">${icon('warning')} ${e.kejadian} Kejadian mencurigakan</span>` : ''}
    <div class="sep"><div class="row" style="justify-content:space-between"><span class="small">${e.selesai_n}/${e.total} peserta selesai</span>
      <b style="color:${c}">${pct}%</b></div>
      <div class="progress mt-8"><i style="width:${pct}%;background:${c}"></i></div>
      <div class="foot">${e.lokasi === 'server_lokal' ? html`<span class="badge b-gray" style="height:22px">${icon('dns')} Server Lokal</span>`
        : flag ? html`<span class="c-coral semi">● Perlu Pengawasan</span>` : html`<span class="c-green semi">● Berlangsung</span>`}
        <span class="muted">Sisa ${fmt.mins(sisa)}</span></div></div></a>`;
}
function schedCard(e) {
  const c = mapelColor(e.mapel);
  const jam = new Date(e.mulai).getHours();
  const sesi = jam < 10 ? 'SESI PAGI' : jam < 12 ? 'SESI SIANG I' : jam < 15 ? 'SESI SIANG II' : 'SESI SORE';
  return html`<div class="card sched" style="border-top-color:${c}">
    <div class="row"><span class="tiny bold" style="color:${c};letter-spacing:.06em">${sesi}</span><span class="spacer"></span>
      ${e.status === 'draf' ? html`<span class="badge b-gray">Draf</span>` : e.lokasi === 'server_lokal' ? html`<span class="badge b-cyan">${icon('dns')} Lokal</span>` : ''}</div>
    <h3 class="mt-4 ellipsis" style="font-size:18px">${e.judul}</h3>
    <div class="muted mt-4">${icon('schedule')} ${fmt.day(e.mulai)} · ${fmt.time(e.mulai)}–${fmt.time(e.selesai)}</div>
    <div class="row" style="border-top:1px solid var(--border-2);margin-top:14px;padding-top:12px">
      <div class="av-stack">${(e.inisial || []).map((i, k) => html`<span class="avatar sm" style="background:${['#DBEAFE', '#FFEDD5', '#DCFCE7'][k % 3]}">${initials(i)}</span>`)}</div>
      <span class="small muted">${e.peserta ? `${e.peserta} peserta` : 'Belum ada peserta'}${e.kelas?.length ? ' · ' + e.kelas.join(', ') : ''}</span>
      <span class="spacer"></span><a class="btn soft sm" href="#/admin/ujian/${e.id}">${e.status === 'draf' ? 'Lanjutkan' : 'Detail'}</a></div></div>`;
}
