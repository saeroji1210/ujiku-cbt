import * as api from '../core/api.js';
import * as store from '../core/store.js';
import { html, raw, icon, $, fmt, mapelColor, mapelIcon, badge, skel, empty } from '../core/ui.js';

const KEY = 'gr_dashboard';
const load = () => api.rpc('gr_dashboard');
export const prefetch = () => store.fetchOnce(KEY, load);

export default async function (ctx) {
  const { el, title, alive, me } = ctx;
  title('Dashboard Guru');
  el.innerHTML = skel.page().s;
  const paint = (d) => {
    if (!alive()) return;
    const sapa = me.nama.split(',')[0];
    const total = d.bank.reduce((s, b) => s + b.jumlah, 0);
    el.innerHTML = html`<section class="banner"><div class="b-txt"><span class="b-pill"><i></i> Ruang Guru</span><h1>Halo, ${sapa}!</h1>
        <p>${d.tanpa_kunci ? html`Ada <b>${d.tanpa_kunci} soal</b> yang belum diberi kunci jawaban.` : total ? 'Semua soal Anda sudah memiliki kunci jawaban. Mantap!' : 'Yuk mulai menyusun bank soal pertama Anda.'}</p>
        <div class="row wrap gap-8 mt-16"><a class="btn" style="background:#fff;color:var(--primary)" href="#/tulis">${icon('edit_note')} Tulis Soal</a>
          <a class="btn" style="background:rgba(255,255,255,.18);color:#fff" href="#/impor">${icon('upload_file')} Impor Word</a></div></div></section>
      <div class="row wrap gap-8 mt-16"><span class="muted semi">Penugasan:</span>${d.penugasan.length ? d.penugasan.map((p) => html`<span class="badge" style="background:${mapelColor(p.mapel)}1A;color:${mapelColor(p.mapel)};height:28px;padding:0 12px">${icon(mapelIcon(p.mapel))} ${p.mapel}${p.kelas ? ' · Kelas ' + p.kelas : ''}</span>`)
        : html`<span class="badge b-orange">Belum ada penugasan — hubungi admin lembaga</span>`}</div>
      <div class="section-title"><span class="bar"></span><h2>Bank Soal Saya</h2><span class="spacer"></span><a class="link-more" href="#/bank">Lihat Semua ${icon('arrow_forward')}</a></div>
      ${d.bank.length ? html`<div class="grid g-4">${d.bank.slice(0, 8).map((b) => { const c = mapelColor(b.mapel); const pct = b.jumlah ? Math.round((b.lengkap / b.jumlah) * 100) : 0;
        return html`<a class="card exam-card" href="#/bank/${b.id}" style="color:inherit;text-decoration:none"><div class="chip-head" style="background:${c}">${b.mapel}</div>
          <div class="t clamp2">${b.nama}</div><div class="row gap-8">${b.terkunci ? badge('terkunci', 'Terkunci') : badge(b.status)}<span class="muted small">${b.jumlah} soal</span></div>
          <div class="sep"><div class="row" style="justify-content:space-between"><span class="small">Soal lengkap</span><b style="color:${c}">${pct}%</b></div><div class="progress mt-8"><i style="width:${pct}%;background:${c}"></i></div>
          <div class="foot"><span class="muted">Diubah ${fmt.rel(b.updated_at)}</span></div></div></a>`; })}</div>`
        : html`<div class="card">${empty('layers', 'Belum ada bank soal', 'Buat bank soal untuk mapel yang Anda ampu, lalu tulis soal secara online.', html`<a class="btn primary" href="#/bank?baru=1">${icon('library_add')} Buat Bank Soal</a>`)}</div>`}
      <div class="grid g-2 mt-24">
        <div class="card"><div class="card-head"><h3>Soal Perlu Direvisi</h3><span class="spacer"></span><span class="badge b-coral">${d.revisi.length}</span></div>
          ${d.revisi.length ? html`<div class="col gap-8">${d.revisi.map((r) => html`<a class="list-row" href="#/bank/${r.bank_id}" style="padding:12px;box-shadow:none;background:var(--slate-50)">
            <div class="icon-tile" style="background:var(--coral);width:40px;height:40px">${icon('flag')}</div><div style="flex:1;min-width:0"><div class="semi ellipsis">Soal No. ${r.no} · ${r.bank}</div>
            <div class="muted small ellipsis">${r.d != null ? 'Daya beda ' + fmt.num(r.d, 2) + ' · ' : ''}${r.teks}</div></div><span class="c-primary semi small">Perbaiki</span></a>`)}</div>`
            : html`<p class="muted small">Tidak ada soal yang ditandai. Soal dengan daya beda rendah (&lt; 0,20) akan muncul di sini setelah ujian.</p>`}</div>
        <div class="card"><div class="card-head"><h3>Hasil Ujian Terbaru</h3><span class="spacer"></span><a class="link-more small" href="#/laporan">Semua</a></div>
          ${d.hasil.length ? html`<div class="col gap-8">${d.hasil.map((h) => html`<a class="list-row" href="#/laporan/${h.id}" style="padding:12px;box-shadow:none;background:var(--slate-50)">
            <span style="width:8px;height:36px;border-radius:4px;background:${mapelColor(h.mapel)}"></span><div style="flex:1;min-width:0"><div class="semi ellipsis">${h.judul}</div>
            <div class="muted small">${fmt.date(h.mulai)} · ${h.peserta} dinilai</div></div><span class="badge b-blue">Rata-rata ${h.rata == null ? '–' : fmt.num(h.rata, 1)}</span></a>`)}</div>`
            : html`<p class="muted small">Belum ada ujian yang memakai bank soal Anda.</p>`}</div></div>`.s;
  };
  await store.swr(KEY, load, paint, { alive, ttl: 15000 });
}
