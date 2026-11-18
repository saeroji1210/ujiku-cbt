import * as api from '../core/api.js';
import * as store from '../core/store.js';
import { html, icon, $, $$, on, fmt, badge, skel, empty, modal, toast, toastErr, busy, copyText } from '../core/ui.js';
import { compressImage } from '../lib/image.js';

const KEY = 'ad_wallet';
const load = () => api.rpc('ad_wallet');
export const prefetch = () => store.fetchOnce(KEY, load);
const JENIS = { gratis: ['b-cyan', 'Gratis'], beli: ['b-green', 'Beli'], pakai: ['b-blue', 'Pakai'], refund: ['b-purple', 'Refund'], koreksi: ['b-gray', 'Koreksi'] };

export default async function (ctx) {
  const { el, title, alive, me, paintWallet, refreshMe } = ctx;
  title('Poin & Langganan');
  let d = null, tab = 'ledger';
  el.innerHTML = html`<div class="page-head"><div><div class="crumb">Lainnya</div><h1>Poin & Langganan</h1>
    <div class="sub">Poin dipakai saat ujian diterbitkan (per peserta). Beli paket poin dengan transfer, lalu unggah bukti untuk diverifikasi tim UjiKu.</div></div></div><div id="body">${skel.cards(3, 160)}</div>`.s;

  const paint = (x) => {
    d = x; if (!alive()) return;
    me.saldo = d.saldo; paintWallet();
    const ppp = Number(d.poin_per_peserta || 1);
    const pend = d.pembelian.filter((p) => p.status === 'menunggu').length;
    $('#body', el).innerHTML = html`<div class="grid g-side" style="align-items:stretch">
      <div class="card" style="background:linear-gradient(130deg,#1B2A4E,#1565D8);color:#fff;padding:28px;position:relative;overflow:hidden">
        <div style="position:absolute;width:260px;height:260px;border-radius:50%;background:rgba(255,255,255,.07);right:-60px;top:-120px"></div>
        <div class="row" style="position:relative">${icon('account_balance_wallet')}<span class="semi" style="opacity:.85">Saldo poin lembaga</span><span class="spacer"></span><span class="badge" style="background:rgba(255,255,255,.15);color:#fff">${me.tenant?.status === 'trial' ? 'Uji Coba' : 'Aktif'}</span></div>
        <div style="font-size:52px;font-weight:800;letter-spacing:-.03em;margin-top:12px;position:relative">${fmt.num(d.saldo)} <span style="font-size:20px;font-weight:600;opacity:.8">poin</span></div>
        <div style="opacity:.85;position:relative">Cukup untuk sekitar <b>${fmt.num(Math.floor(d.saldo / ppp))} peserta-ujian</b> (${ppp} poin per peserta per ujian).</div>
        <div class="row wrap mt-24" style="position:relative"><button class="btn orange lg" data-buy="">${icon('add_shopping_cart')} Beli Poin</button>
          <span style="opacity:.85" class="small">Terpakai bulan ini: <b>${fmt.num(d.terpakai_bulan)} poin</b></span></div></div>
      <div class="card"><h3>Cara pembelian</h3><div class="col gap-16 mt-16 small">
        ${[['looks_one', 'Pilih paket poin di bawah'], ['looks_two', `Transfer ke ${d.info_pembayaran?.bank || '-'} ${d.info_pembayaran?.rekening || ''} a.n. ${d.info_pembayaran?.atas_nama || ''}`], ['looks_3', 'Unggah foto bukti transfer'], ['looks_4', 'Poin masuk setelah diverifikasi (biasanya < 1×24 jam)']]
          .map(([ic, t]) => html`<div class="row top">${icon(ic, 'c-primary')}<span>${t}</span></div>`)}
        ${d.kontak?.wa ? html`<a class="btn secondary sm" target="_blank" rel="noopener" href="https://wa.me/${d.kontak.wa}?text=${encodeURIComponent('Halo tim UjiKu, saya admin ' + (me.tenant?.nama || '') + ' ingin bertanya tentang pembelian poin.')}">${icon('support_agent')} Hubungi tim UjiKu</a>` : ''}</div></div></div>
      <div class="section-title"><span class="bar"></span><h2>Paket Poin</h2></div>
      ${d.paket.length ? html`<div class="grid g-4">${d.paket.map((p) => html`<div class="card col hover-lift" style="position:relative;${p.populer ? 'box-shadow:0 0 0 2px var(--orange),var(--sh-2)' : ''}">
        ${p.populer ? html`<span class="badge" style="position:absolute;top:-12px;left:16px;background:var(--orange);color:#fff">${icon('star')} Paling Populer</span>` : ''}
        <div class="muted semi">${p.nama}</div><div style="font-size:34px;font-weight:800;letter-spacing:-.02em">${fmt.num(p.jumlah_poin)} <span class="muted" style="font-size:15px">poin</span></div>
        <div class="bold c-primary" style="font-size:18px">${fmt.rp(p.harga)}</div><div class="muted small">≈ ${fmt.rp(Math.round(p.harga / p.jumlah_poin))} per peserta-ujian</div>
        <button class="btn ${p.populer ? 'orange' : 'primary'} block mt-8" data-buy="${p.id}">Pilih Paket</button></div>`)}</div>`
        : html`<div class="card muted">Belum ada paket poin yang dijual. Hubungi tim UjiKu CBT.</div>`}
      <div class="tabs mt-24"><button data-t="ledger" class="${tab === 'ledger' ? 'on' : ''}">${icon('receipt_long')} Riwayat Poin</button>
        <button data-t="beli" class="${tab === 'beli' ? 'on' : ''}">${icon('shopping_bag')} Pengajuan Pembelian ${pend ? html`<span class="cnt">${pend}</span>` : ''}</button></div>
      <div class="card pad-0" id="tb"></div>`.s;
    paintTab();
  };
  const paintTab = () => {
    const tb = $('#tb', el);
    if (tab === 'ledger') {
      tb.innerHTML = (d.ledger.length ? html`<div class="table-wrap"><table class="table"><thead><tr><th>Tanggal</th><th>Jenis</th><th>Keterangan</th><th class="num">Jumlah</th><th class="num">Saldo Akhir</th></tr></thead>
        <tbody>${d.ledger.map((l) => html`<tr><td class="nowrap">${fmt.date(l.created_at)} <span class="muted small">${fmt.time(l.created_at)}</span></td>
          <td><span class="badge ${JENIS[l.jenis][0]}">${JENIS[l.jenis][1]}</span></td><td><div>${l.keterangan || '–'}</div><div class="muted small mono">${l.referensi || ''}</div></td>
          <td class="num bold" style="color:${l.jumlah > 0 ? 'var(--green)' : 'var(--coral)'}">${l.jumlah > 0 ? '+' : ''}${fmt.num(l.jumlah)}</td><td class="num">${fmt.num(l.saldo_akhir)}</td></tr>`)}</tbody></table></div>`
        : empty('receipt_long', 'Belum ada transaksi poin')).s;
    } else {
      tb.innerHTML = (d.pembelian.length ? html`<div class="table-wrap"><table class="table"><thead><tr><th>Tanggal</th><th>Paket</th><th class="num">Poin</th><th class="num">Nominal</th><th>Status</th><th>Catatan</th></tr></thead>
        <tbody>${d.pembelian.map((p) => html`<tr><td class="nowrap">${fmt.date(p.created_at)}</td><td class="semi">${p.paket_nama}</td><td class="num">${fmt.num(p.jumlah_poin)}</td><td class="num">${fmt.rp(p.nominal)}</td>
          <td>${badge(p.status)}</td><td class="small muted">${p.catatan || (p.status === 'menunggu' ? 'Sedang diverifikasi tim UjiKu' : '–')}</td></tr>`)}</tbody></table></div>`
        : empty('shopping_bag', 'Belum ada pengajuan pembelian')).s;
    }
  };
  await store.swr(KEY, load, paint, { alive, ttl: 10000 });

  function buy(pid) {
    const list = d.paket;
    if (!list.length) return toast('Belum ada paket', 'Hubungi tim UjiKu CBT.', 'warn');
    let sel = pid || (list.find((p) => p.populer) || list[0]).id, bukti = null;
    const pay = d.info_pembayaran || {};
    const m = modal({
      title: 'Beli Paket Poin', ic: 'add_shopping_cart',
      body: html`<div class="col gap-8" id="pk">${list.map((p) => html`<label class="list-row" style="padding:12px 14px"><input type="radio" name="pk" value="${p.id}" ${p.id === sel ? 'checked' : ''} style="width:18px;height:18px">
          <div style="flex:1"><b>${p.nama}</b> · ${fmt.num(p.jumlah_poin)} poin</div><b class="c-primary">${fmt.rp(p.harga)}</b></label>`)}</div>
        <div class="card flat mt-16" style="background:var(--slate-50)"><div class="tiny bold muted" style="letter-spacing:.06em">TRANSFER KE</div>
          <div class="row mt-8"><div style="flex:1"><b>${pay.bank || '-'}</b><div class="mono" style="font-size:18px;font-weight:700">${pay.rekening || '-'}</div><div class="small muted">a.n. ${pay.atas_nama || '-'}</div></div>
          <button class="btn secondary sm" data-copy>${icon('content_copy')} Salin</button></div>
          <div class="row mt-8"><span class="muted small">Total transfer</span><span class="spacer"></span><b id="tot" style="font-size:18px"></b></div></div>
        <div class="field mt-16"><label>Bukti transfer <span class="req">*</span></label><div class="dropzone" id="dz" style="padding:20px">${icon('add_photo_alternate')}<div class="semi mt-8" id="dzt">Klik atau seret foto bukti transfer</div><div class="muted small">JPG/PNG/PDF · maks 5 MB</div></div></div>`,
      foot: html`<button class="btn secondary" data-x>Batal</button><button class="btn primary" data-go>${icon('send')} Ajukan Pembelian</button>`,
    });
    const upd = () => { const p = list.find((x) => x.id === sel); $('#tot', m.el).textContent = fmt.rp(p.harga); };
    upd();
    on(m.el, 'change', 'input[name=pk]', (e, n) => { sel = n.value; upd(); });
    $('[data-copy]', m.el).onclick = () => copyText(String(pay.rekening || '').replace(/\D/g, ''), 'Nomor rekening disalin');
    const dz = $('#dz', m.el);
    const setFile = (f) => {
      if (!f) return;
      if (!/^image\/|pdf$/.test(f.type)) return toast('Format tidak didukung', 'Unggah gambar atau PDF.', 'warn');
      if (f.size > 5 * 1024 * 1024) return toast('Berkas terlalu besar', 'Maksimal 5 MB.', 'warn');
      bukti = f; $('#dzt', m.el).textContent = '✓ ' + f.name; dz.style.borderColor = 'var(--green)';
    };
    dz.onclick = () => { const i = document.createElement('input'); i.type = 'file'; i.accept = 'image/*,application/pdf'; i.onchange = () => setFile(i.files[0]); i.click(); };
    dz.ondragover = (e) => { e.preventDefault(); dz.classList.add('over'); };
    dz.ondragleave = () => dz.classList.remove('over');
    dz.ondrop = (e) => { e.preventDefault(); dz.classList.remove('over'); setFile(e.dataTransfer.files[0]); };
    $('[data-go]', m.el).onclick = (e) => busy(e.currentTarget, async () => {
      if (!bukti) return toast('Unggah bukti transfer', '', 'warn');
      try {
        let blob = bukti, ext = (bukti.name.split('.').pop() || 'jpg').toLowerCase(), type = bukti.type;
        if (bukti.type.startsWith('image/')) ({ blob, ext, type } = await compressImage(bukti, 1600, 0.85));
        const path = `${me.tenant.id}/${Date.now()}-${api.randomId(6)}.${ext}`;
        await api.upload('bukti-bayar', path, blob, type);
        await api.rpc('purchase_create', { package: sel, bukti_path: path });
        m.close(); toast('Pengajuan terkirim', 'Poin akan masuk setelah diverifikasi tim UjiKu.', 'ok', 6000);
        tab = 'beli'; store.invalidate(KEY); paint(await store.fetchOnce(KEY, load)); refreshMe();
      } catch (x) { toastErr(x); }
    });
  }
  const offs = [
    on(el, 'click', '[data-buy]', (e, b) => buy(b.dataset.buy)),
    on(el, 'click', '[data-t]', (e, b) => { tab = b.dataset.t; $$('[data-t]', el).forEach((x) => x.classList.toggle('on', x === b)); paintTab(); }),
  ];
  return () => offs.forEach((f) => f());
}
