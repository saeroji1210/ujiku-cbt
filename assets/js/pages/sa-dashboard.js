import * as api from '../core/api.js';
import * as store from '../core/store.js';
import { html, raw, icon, $, on, fmt, skel, toast, toastErr, busy, promptDialog } from '../core/ui.js';
import { HERO } from '../core/art.js';

const KEY = 'sa_dashboard';
const load = () => api.rpc('sa_dashboard');
export const prefetch = () => store.fetchOnce(KEY, load);
const AKSI = { daftar_lembaga: ['domain_add', 'Lembaga baru terdaftar', '#1565D8'], aktivasi_akun: ['how_to_reg', 'Akun staf diaktivasi', '#22A06B'],
  verifikasi_pembelian: ['verified', 'Pembelian diverifikasi', '#22A06B'], ajukan_pembelian: ['shopping_bag', 'Pengajuan pembelian poin', '#F7941D'],
  koreksi_saldo: ['tune', 'Koreksi saldo', '#7C3AED'], status_lembaga: ['toggle_on', 'Status lembaga diubah', '#6B7280'], sinkron_server: ['sync', 'Server lokal tersinkron', '#22B8E8'] };

export function groupedBars(rows) {
  const max = Math.max(1, ...rows.flatMap((r) => [r.terjual, r.terpakai]));
  const bulan = (iso) => new Date(iso).toLocaleDateString('id-ID', { month: 'short' });
  return html`<div class="bars" style="height:200px">${rows.map((r) => html`<div class="bc"><div class="row gap-4" style="align-items:flex-end;height:100%;width:100%;justify-content:center">
    <div class="b" title="Terjual ${fmt.num(r.terjual)}" style="height:${Math.max(2, (r.terjual / max) * 150)}px;max-width:20px;background:#1565D8"></div>
    <div class="b" title="Terpakai ${fmt.num(r.terpakai)}" style="height:${Math.max(2, (r.terpakai / max) * 150)}px;max-width:20px;background:#22B8E8"></div></div><span class="bl">${bulan(r.bulan)}</span></div>`)}</div>
    <div class="legend mt-8"><span><i style="background:#1565D8"></i>Poin terjual</span><span><i style="background:#22B8E8"></i>Poin terpakai</span></div>`;
}

export default async function (ctx) {
  const { el, title, alive, go } = ctx;
  title('Dashboard Super Admin');
  el.innerHTML = skel.page().s;
  let d;
  const paint = (x) => {
    d = x; if (!alive()) return;
    const k = d.kpi;
    el.innerHTML = html`<section class="banner"><div class="b-txt"><span class="b-pill"><i></i> Multi-tenant console</span><h1>Selamat datang, Super Admin!</h1>
        <p>Pantau lembaga, penjualan poin, dan server lokal. ${k.pengajuan ? html`<b>${k.pengajuan} pengajuan pembelian</b> menunggu verifikasi.` : 'Tidak ada pengajuan yang menunggu.'}</p></div><div class="b-art">${raw(HERO)}</div></section>
      <div class="grid g-4 mt-24">
        <div class="card kpi"><div class="k-top"><span class="k-lbl">Total lembaga mitra</span><div class="k-ic" style="background:#1565D81A;color:#1565D8">${icon('domain')}</div></div>
          <div><span class="k-val">${fmt.num(k.lembaga)}</span><span class="k-unit">lembaga</span></div>
          <div class="row wrap gap-4"><span class="badge b-green">${k.aktif} Aktif</span><span class="badge b-yellow">${k.trial} Uji Coba</span><span class="badge b-gray">${k.nonaktif} Nonaktif</span></div></div>
        <div class="card kpi"><div class="k-top"><span class="k-lbl">Poin terjual bulan ini</span><div class="k-ic" style="background:#F7941D1A;color:#F7941D">${icon('payments')}</div></div>
          <div><span class="k-val">${fmt.num(k.poin_terjual)}</span><span class="k-unit">poin</span></div><div class="semi">${fmt.rp(k.rupiah)}</div></div>
        <div class="card kpi"><div class="k-top"><span class="k-lbl">Poin terpakai ujian</span><div class="k-ic" style="background:#22B8E81A;color:#22B8E8">${icon('fact_check')}</div></div>
          <div><span class="k-val">${fmt.num(k.poin_terpakai)}</span><span class="k-unit">poin</span></div><div class="muted small">Beredar di lembaga: ${fmt.num(k.poin_beredar)} poin</div></div>
        <div class="card kpi"><div class="k-top"><span class="k-lbl">Server lokal aktif</span><div class="k-ic" style="background:#22A06B1A;color:#22A06B">${icon('dns')}</div></div>
          <div><span class="k-val">${k.server_online}</span><span class="k-unit">/ ${k.server_total} online</span></div>
          <div class="small ${k.server_antrean ? 'c-orange semi' : 'muted'}">${k.server_antrean ? icon('sync_problem') : ''} ${k.server_antrean ? k.server_antrean + ' perlu sinkronisasi' : 'Semua tersinkron'}</div></div></div>
      <div class="grid g-main mt-24">
        <div class="card"><div class="card-head"><h3>Penjualan & Pemakaian Poin · 6 bulan</h3></div>${groupedBars(d.grafik)}</div>
        <div class="card"><div class="card-head"><h3>Pengajuan Pembelian Menunggu</h3><span class="spacer"></span><a class="link-more small" href="#/sa/poin?tab=pengajuan">Semua</a></div>
          ${d.pengajuan.length ? html`<div class="col gap-8">${d.pengajuan.map((p) => html`<div class="row" style="padding:12px;border-radius:12px;background:var(--slate-50)">
            <div style="flex:1;min-width:0"><div class="semi ellipsis">${p.lembaga}</div><div class="muted small">${p.paket} · ${fmt.num(p.poin)} poin · ${fmt.rp(p.nominal)}</div></div>
            <button class="btn success sm" data-ok="${p.id}">${icon('check')} Setujui</button><button class="btn ghost red sm icon" data-no="${p.id}" title="Tolak">${icon('close')}</button></div>`)}</div>`
            : html`<p class="muted small">Tidak ada pengajuan yang menunggu.</p>`}</div>
        <div class="card"><div class="card-head"><h3>Aktivitas Terbaru</h3></div>${d.aktivitas.length ? html`<div class="timeline">${d.aktivitas.map((a) => { const [ic, l, c] = AKSI[a.aksi] || ['info', a.aksi, '#6B7280'];
            return html`<div class="tl"><div class="tm">${fmt.time(a.waktu)}</div><div class="bar" style="background:${c}"></div><div style="min-width:0"><div class="tt ellipsis">${l}</div>
              <div class="ts ellipsis">${a.lembaga || ''}${a.detail?.poin ? ' · ' + a.detail.poin + ' poin' : ''}${a.detail?.email ? ' · ' + a.detail.email : ''}</div></div></div>`; })}</div>`
            : html`<p class="muted small">Belum ada aktivitas.</p>`}</div></div>
      <div class="card mt-24"><div class="card-head"><h3>Status Server Lokal</h3><span class="spacer"></span><a class="link-more small" href="#/sa/server">Kelola</a></div>
        ${d.server.length ? html`<div class="grid g-3" style="gap:12px">${d.server.map((s) => html`<div class="row" style="padding:12px;border-radius:12px;background:var(--slate-50)">
          <div class="icon-tile" style="width:40px;height:40px;background:${s.online ? 'var(--green)' : '#94A3B8'}">${icon('dns')}</div>
          <div style="flex:1;min-width:0"><div class="semi ellipsis">${s.lembaga}</div><div class="muted small">${s.nama} · v${s.versi || '–'} · sinkron ${s.terakhir_sinkron ? fmt.rel(s.terakhir_sinkron) : '–'}</div></div>
          ${s.online ? html`<span class="badge b-green pulse"><i class="d"></i> Online</span>` : html`<span class="badge b-gray">Offline</span>`}</div>`)}</div>`
          : html`<p class="muted small">Belum ada server lokal terpasang.</p>`}</div>`.s;
  };
  await store.swr(KEY, load, paint, { alive, ttl: 15000 });
  const hard = async () => { store.invalidate(KEY, 'sa_purchases'); paint(await store.fetchOnce(KEY, load)); };
  return on(el, 'click', '[data-ok],[data-no]', (e, b) => {
    if (b.dataset.ok) return busy(b, async () => { try { await api.rpc('sa_purchase_verify', { id: b.dataset.ok, setujui: true }); toast('Pembelian disetujui', 'Poin masuk ke saldo lembaga.', 'ok'); hard(); } catch (x) { toastErr(x); } });
    promptDialog({ title: 'Tolak pengajuan', label: 'Alasan penolakan', textarea: true, ok: 'Tolak' }).then(async (v) => {
      if (v == null) return;
      try { await api.rpc('sa_purchase_verify', { id: b.dataset.no, setujui: false, catatan: v }); toast('Pengajuan ditolak', '', 'ok'); hard(); } catch (x) { toastErr(x); }
    });
  });
}
