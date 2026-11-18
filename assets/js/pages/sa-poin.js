import * as api from '../core/api.js';
import * as store from '../core/store.js';
import { html, icon, $, $$, on, fmt, badge, skel, empty, modal, toast, toastErr, busy, promptDialog } from '../core/ui.js';

export const prefetch = () => store.fetchOnce('sa_purchases|menunggu', () => api.rpc('sa_purchases', { status: 'menunggu' }));

export default async function (ctx) {
  const { el, title, alive, query } = ctx;
  title('Paket & Pembelian Poin');
  let tab = query.tab === 'paket' ? 'paket' : 'pengajuan', st = 'menunggu';
  el.innerHTML = html`<div class="page-head"><div><div class="crumb">Lembaga & Poin</div><h1>Paket & Pembelian Poin</h1>
    <div class="sub">Atur paket poin yang dijual dan verifikasi bukti transfer dari lembaga. Poin masuk ke saldo lembaga saat disetujui.</div></div>
    <span class="spacer"></span><button class="btn primary" data-a="newpkg">${icon('add_circle')} Paket Baru</button></div>
    <div class="tabs"><button data-t="pengajuan">${icon('fact_check')} Verifikasi Pembelian <span class="cnt" id="pend">…</span></button><button data-t="paket">${icon('sell')} Paket Poin</button></div>
    <div id="body"></div>`.s;
  const setTab = () => { $$('[data-t]', el).forEach((b) => b.classList.toggle('on', b.dataset.t === tab)); tab === 'paket' ? paket() : pengajuan(); };

  async function pengajuan() {
    const body = $('#body', el);
    body.innerHTML = html`<div class="card pad-0"><div class="toolbar"><div class="seg">${[['menunggu', 'Menunggu'], ['disetujui', 'Disetujui'], ['ditolak', 'Ditolak'], ['', 'Semua']].map(([k, l]) => html`<button data-st="${k}" class="${st === k ? 'on' : ''}">${l}</button>`)}</div></div><div id="pl">${skel.lines(6)}</div></div>`.s;
    const paint = (d) => {
      if (!alive() || tab !== 'pengajuan') return;
      $('#pend', el).textContent = d.counts?.menunggu || 0;
      $('#pl', el).innerHTML = (d.rows.length ? html`<div class="table-wrap"><table class="table"><thead><tr><th>Tanggal</th><th>Lembaga</th><th>Paket</th><th class="num">Nominal</th><th>Bukti</th><th>Status</th><th></th></tr></thead>
        <tbody>${d.rows.map((p) => html`<tr><td class="nowrap">${fmt.date(p.created_at)}<div class="muted small">${fmt.time(p.created_at)}</div></td>
          <td><div class="semi">${p.lembaga}</div><div class="muted small">${p.kode}${p.pengaju ? ' · ' + p.pengaju : ''}</div></td>
          <td>${p.paket_nama}<div class="muted small">${fmt.num(p.jumlah_poin)} poin</div></td><td class="num semi">${fmt.rp(p.nominal)}</td>
          <td>${p.bukti_path ? html`<button class="btn soft sm" data-bukti="${p.bukti_path}">${icon('receipt')} Lihat</button>` : '–'}</td>
          <td>${badge(p.status)}${p.catatan ? html`<div class="muted tiny mt-4">${p.catatan}</div>` : ''}</td>
          <td class="nowrap">${p.status === 'menunggu' ? html`<button class="btn success sm" data-ok="${p.id}">${icon('check')} Setujui</button> <button class="btn ghost red sm" data-no="${p.id}">Tolak</button>` : ''}</td></tr>`)}</tbody></table></div>`
        : empty('fact_check', st === 'menunggu' ? 'Tidak ada pengajuan menunggu' : 'Belum ada data')).s;
    };
    await store.swr('sa_purchases|' + st, () => api.rpc('sa_purchases', { status: st }), paint, { alive, ttl: 8000 }).catch(toastErr);
  }

  async function paket() {
    const body = $('#body', el);
    body.innerHTML = skel.cards(4, 200).s;
    const paint = (list) => {
      if (!alive() || tab !== 'paket') return;
      body.innerHTML = (list.length ? html`<div class="grid g-4">${list.map((p) => html`<div class="card col" style="position:relative;${p.populer ? 'box-shadow:0 0 0 2px var(--orange),var(--sh-2)' : ''};${p.aktif ? '' : 'opacity:.6'}">
        ${p.populer ? html`<span class="badge" style="position:absolute;top:-12px;left:16px;background:var(--orange);color:#fff">${icon('star')} Paling Populer</span>` : ''}
        <div class="row"><span class="muted semi">${p.nama}</span><span class="spacer"></span>${p.aktif ? badge('aktif') : badge('nonaktif')}</div>
        <div style="font-size:32px;font-weight:800">${fmt.num(p.jumlah_poin)} <span class="muted" style="font-size:14px">poin</span></div>
        <div class="bold c-primary" style="font-size:18px">${fmt.rp(p.harga)}</div><div class="muted small">${fmt.num(p.terjual)} kali terjual · ${fmt.rp(Math.round(p.harga / p.jumlah_poin))}/poin</div>
        <button class="btn secondary block mt-8" data-edit="${p.id}">${icon('edit')} Ubah</button></div>`)}</div>`
        : html`<div class="card">${empty('sell', 'Belum ada paket poin', 'Buat paket agar lembaga bisa membeli poin.', html`<button class="btn primary" data-a="newpkg">${icon('add_circle')} Paket Baru</button>`)}</div>`).s;
      body._list = list;
    };
    await store.swr('sa_packages', () => api.rpc('sa_packages'), paint, { alive, ttl: 15000 }).catch(toastErr);
  }

  function pkgForm(p) {
    const m = modal({ title: p ? 'Ubah Paket Poin' : 'Paket Poin Baru', ic: 'sell', size: 'narrow',
      body: html`<form id="pf" class="col"><div class="field"><label>Nama paket</label><input class="input" name="nama" value="${p?.nama || ''}" placeholder="Paket Reguler"></div>
        <div class="form-grid"><div class="field"><label>Jumlah poin</label><input class="input" type="number" name="jumlah_poin" value="${p?.jumlah_poin || ''}" min="1"></div>
        <div class="field"><label>Harga (Rp)</label><input class="input" type="number" name="harga" value="${p?.harga ?? ''}" min="0"></div>
        <div class="field"><label>Urutan tampil</label><input class="input" type="number" name="urutan" value="${p?.urutan || 0}"></div></div>
        <label class="switch"><input type="checkbox" name="aktif" ${p ? (p.aktif ? 'checked' : '') : 'checked'}><span class="tr"></span><span>Dijual (aktif)</span></label>
        <label class="switch"><input type="checkbox" name="populer" ${p?.populer ? 'checked' : ''}><span class="tr"></span><span>Tandai "Paling Populer"</span></label></form>`,
      foot: html`<button class="btn secondary" data-x>Batal</button><button class="btn primary" data-go>${icon('save')} Simpan</button>` });
    $('[data-go]', m.el).onclick = (e) => busy(e.currentTarget, async () => {
      const f = $('#pf', m.el);
      try {
        await api.rpc('sa_package_save', { p: { id: p?.id, nama: f.nama.value, jumlah_poin: Number(f.jumlah_poin.value), harga: Number(f.harga.value), urutan: Number(f.urutan.value), aktif: f.aktif.checked, populer: f.populer.checked } });
        m.close(); toast('Paket disimpan', '', 'ok'); store.invalidate('sa_packages'); tab = 'paket'; setTab();
      } catch (x) { toastErr(x); }
    });
  }

  const hardP = () => { store.invalidate('sa_purchases', 'sa_dashboard'); pengajuan(); };
  const offs = [
    on(el, 'click', '[data-t]', (e, b) => { tab = b.dataset.t; setTab(); }),
    on(el, 'click', '[data-st]', (e, b) => { st = b.dataset.st; pengajuan(); }),
    on(el, 'click', '[data-a=newpkg]', () => pkgForm(null)),
    on(el, 'click', '[data-edit]', (e, b) => pkgForm(($('#body', el)._list || []).find((x) => x.id === b.dataset.edit))),
    on(el, 'click', '[data-bukti]', async (e, b) => {
      try {
        const url = await api.signedUrl('bukti-bayar', b.dataset.bukti);
        modal({ title: 'Bukti Transfer', ic: 'receipt', body: /\.pdf$/i.test(b.dataset.bukti) ? html`<a class="btn primary" href="${url}" target="_blank" rel="noopener">${icon('open_in_new')} Buka PDF</a>`
          : html`<img src="${url}" alt="Bukti transfer" style="width:100%;border-radius:12px">` });
      } catch (x) { toastErr(x); }
    }),
    on(el, 'click', '[data-ok]', (e, b) => busy(b, async () => { try { await api.rpc('sa_purchase_verify', { id: b.dataset.ok, setujui: true }); toast('Pembelian disetujui', 'Poin masuk ke saldo lembaga.', 'ok'); hardP(); } catch (x) { toastErr(x); } })),
    on(el, 'click', '[data-no]', async (e, b) => {
      const v = await promptDialog({ title: 'Tolak pengajuan', label: 'Alasan penolakan (dikirim ke lembaga)', textarea: true, ok: 'Tolak' });
      if (v == null) return;
      try { await api.rpc('sa_purchase_verify', { id: b.dataset.no, setujui: false, catatan: v }); toast('Pengajuan ditolak', '', 'ok'); hardP(); } catch (x) { toastErr(x); }
    }),
  ];
  setTab();
  if (tab === 'paket') api.rpc('sa_purchases', { status: 'menunggu' }).then((d) => { $('#pend', el).textContent = d.counts?.menunggu || 0; }).catch(() => {});
  return () => offs.forEach((f) => f());
}
