import * as api from '../core/api.js';
import * as store from '../core/store.js';
import { html, icon, $, $$, on, fmt, initials, badge, skel, empty, modal, toast, toastErr, busy, debounce, confirmDialog, copyText } from '../core/ui.js';
import { shareInvite } from './ad-guru.js';

const JENIS = ['Sekolah Negeri', 'Sekolah Swasta', 'Madrasah', 'Bimbel & Kursus', 'Kampus', 'Instansi / Perusahaan'];
const load = (q = '', status = '', page = 1) => api.rpc('sa_tenants', { q, status, page, size: 15 });
export const prefetch = () => store.fetchOnce('sa_tenants|||1', () => load());

export default async function (ctx) {
  const { el, title, alive, query } = ctx;
  title('Kelola Lembaga');
  let q = query.q || '', status = '', page = 1, d = null;
  el.innerHTML = html`<div class="page-head"><div><span class="badge b-blue">Multi-tenant console</span><h1 class="mt-8">Kelola Lembaga</h1>
    <div class="sub">Daftarkan sekolah, bimbel, atau kampus mitra; pantau saldo poin, admin, dan status server lokal setiap lembaga.</div></div>
    <span class="spacer"></span><a class="btn secondary" href="#/sa/poin">${icon('add_circle')} Paket Poin</a><button class="btn primary" data-a="new">${icon('domain_add')} Daftarkan Lembaga Baru</button></div>
    <div class="tabs" id="st"></div>
    <div class="card pad-0"><div class="toolbar"><div class="input-ic">${icon('search')}<input class="input soft" id="q" value="${q}" placeholder="Cari nama sekolah, NPSN, atau kode…"></div><span class="spacer"></span><span class="muted small" id="cnt"></span></div>
      <div id="tbl">${skel.lines(8)}</div><div class="pager" id="pg"></div></div>`.s;

  const paint = (x) => {
    d = x; if (!alive()) return;
    const c = d.counts || {};
    const all = (c.aktif || 0) + (c.trial || 0) + (c.nonaktif || 0);
    $('#st', el).innerHTML = [['', 'Semua', all], ['aktif', 'Aktif', c.aktif], ['trial', 'Uji Coba', c.trial], ['nonaktif', 'Nonaktif', c.nonaktif]]
      .map(([k, l, n]) => html`<button data-s="${k}" class="${status === k ? 'on' : ''}">${l}<span class="cnt">${n || 0}</span></button>`.s).join('');
    $('#cnt', el).textContent = `${d.total} lembaga`;
    $('#tbl', el).innerHTML = (d.rows.length ? html`<div class="table-wrap"><table class="table"><thead><tr><th>Nama Lembaga & NPSN</th><th class="hide-sm">Jenis</th><th>Status</th><th>Saldo Poin</th><th class="hide-sm">Server Lokal</th><th class="hide-sm">Penanggung Jawab</th></tr></thead>
      <tbody>${d.rows.map((t) => html`<tr class="clickable" data-id="${t.id}"><td><div class="row gap-8"><span class="avatar sq" style="background:var(--primary-50)">${initials(t.nama)}</span>
          <div style="min-width:0"><div class="semi">${t.nama}</div><div class="muted small">${t.npsn ? 'NPSN ' + t.npsn + ' · ' : ''}Kode ${t.kode} · ${t.peserta} peserta</div></div></div></td>
        <td class="hide-sm"><span class="badge b-blue">${t.jenis}</span></td><td>${badge(t.status)}</td>
        <td style="min-width:130px"><div class="row gap-4">${icon('toll', 'c-orange')}<b>${fmt.num(t.saldo)}</b><span class="muted small">poin</span></div>
          <div class="progress mt-4" style="width:110px"><i style="width:${Math.min(100, t.saldo / 50)}%;background:${t.saldo < 100 ? 'var(--orange)' : 'var(--primary)'}"></i></div></td>
        <td class="hide-sm">${t.server ? html`${t.server.online ? html`<span class="badge b-green"><i class="d"></i> Online ${t.server.versi ? 'v' + t.server.versi : ''}</span>` : t.server.antrean ? html`<span class="badge b-orange">${icon('warning')} Perlu sinkron</span>` : html`<span class="badge b-gray">Offline</span>`}
          <div class="muted tiny mt-4">${t.server.terakhir_online ? 'Online ' + fmt.rel(t.server.terakhir_online) : 'Belum pernah online'}</div>` : html`<span class="muted small">–</span>`}</td>
        <td class="hide-sm">${t.admin ? html`<div class="semi">${t.admin.nama}</div><div class="muted small">${t.admin.email}${t.admin.status === 'undangan' ? ' · belum aktivasi' : ''}</div>` : '–'}</td></tr>`)}</tbody></table></div>`
      : empty('domain', q || status ? 'Tidak ada lembaga yang cocok' : 'Belum ada lembaga', 'Daftarkan lembaga mitra pertama.', html`<button class="btn primary" data-a="new">${icon('domain_add')} Daftarkan Lembaga</button>`)).s;
    const pages = Math.ceil(d.total / d.size);
    $('#pg', el).innerHTML = pages > 1 ? html`<span class="muted small">Menampilkan ${(page - 1) * d.size + 1}–${Math.min(page * d.size, d.total)} dari ${d.total}</span><span class="spacer"></span>
      <button data-p="${page - 1}" ${page <= 1 ? 'disabled' : ''}>${icon('chevron_left')}</button>${Array.from({ length: Math.min(pages, 7) }, (_, i) => { const p = pages <= 7 ? i + 1 : Math.min(Math.max(1, page - 3), pages - 6) + i; return html`<button data-p="${p}" class="${p === page ? 'on' : ''}">${p}</button>`; })}
      <button data-p="${page + 1}" ${page >= pages ? 'disabled' : ''}>${icon('chevron_right')}</button>`.s : '';
  };
  const refresh = () => store.swr(`sa_tenants|${q}|${status}|${page}`, () => load(q, status, page), paint, { alive, ttl: 10000 }).catch(toastErr);
  const hard = () => { store.invalidate('sa_tenants', 'sa_dashboard'); refresh(); };
  await refresh();
  if (query.baru && alive()) newTenant();
  $('#q', el).addEventListener('input', debounce((e) => { q = e.target.value.trim(); page = 1; refresh(); }, 300));

  async function newTenant() {
    const set = await store.fetchOnce('sa_settings', () => api.rpc('sa_settings'));
    const m = modal({
      title: 'Daftarkan Lembaga Baru', sub: 'Tambahkan tenant sekolah, bimbel, atau kampus mitra ke UjiKu CBT', ic: 'school', size: 'wide',
      body: html`<form id="tf" class="col gap-16"><div class="row gap-8"><span style="width:5px;height:20px;border-radius:3px;background:var(--primary)"></span><b class="small" style="letter-spacing:.06em">1. INFORMASI LEMBAGA</b></div>
        <div class="field"><label>Nama lembaga / sekolah <span class="req">*</span></label><div class="input-ic">${icon('apartment')}<input class="input soft" name="nama" placeholder="SMA Negeri 1 Yogyakarta" required></div></div>
        <div class="form-grid"><div class="field"><label>Jenis lembaga <span class="req">*</span></label><select class="select soft" name="jenis">${JENIS.map((j) => html`<option>${j}</option>`)}</select></div>
          <div class="field"><label>NPSN / kode registrasi</label><div class="input-ic">${icon('tag')}<input class="input soft" name="npsn" placeholder="20401142"></div></div></div>
        <div class="field"><label>Alamat lengkap & kota</label><div class="input-ic">${icon('location_on')}<input class="input soft" name="alamat" placeholder="Jl. … , Kota …"></div></div>
        <div class="form-grid"><div class="field"><label>Kode login peserta</label><input class="input soft" name="kode" placeholder="Otomatis (mis. SMAN1YK)" style="text-transform:uppercase">
          <div class="hint">Dipakai peserta saat login bersama NIS.</div></div>
          <div class="field"><label>Poin uji coba gratis</label><input class="input soft" type="number" min="0" name="poin_trial" value="${Number(set.poin_trial || 0)}"></div></div>
        <div class="row gap-8 mt-8"><span style="width:5px;height:20px;border-radius:3px;background:var(--primary)"></span><b class="small" style="letter-spacing:.06em">2. AKUN ADMINISTRATOR LEMBAGA</b></div>
        <div class="field"><label>Nama penanggung jawab / admin lembaga <span class="req">*</span></label><div class="input-ic">${icon('badge')}<input class="input soft" name="admin_nama" placeholder="Drs. Hendro Wibowo, M.Pd" required></div></div>
        <div class="form-grid"><div class="field"><label>Email Google admin <span class="req">*</span></label><div class="input-ic">${icon('mail')}<input class="input soft" type="email" name="admin_email" placeholder="admin@sekolah.sch.id" required></div>
          <div class="hint">Admin masuk dengan login Google memakai email ini.</div></div>
          <div class="field"><label>Nomor WhatsApp admin</label><div class="input-ic">${icon('chat')}<input class="input soft" name="admin_wa" placeholder="0812-9844-3210"></div><div class="hint">Untuk mengirim tautan aktivasi.</div></div></div></form>`,
      foot: html`<button class="btn secondary" data-x>Batal</button><button class="btn primary" data-go>${icon('domain_add')} Daftarkan & Buat Undangan</button>`,
    });
    $('[data-go]', m.el).onclick = (e) => busy(e.currentTarget, async () => {
      const f = $('#tf', m.el);
      const p = Object.fromEntries(['nama', 'jenis', 'npsn', 'alamat', 'kode', 'poin_trial', 'admin_nama', 'admin_email', 'admin_wa'].map((k) => [k, f[k].value]));
      try {
        const r = await api.rpc('sa_tenant_save', { p });
        m.close(); hard();
        toast('Lembaga terdaftar', `Kode lembaga ${r.kode} · ${r.poin_trial} poin uji coba`, 'ok', 6000);
        shareInvite({ nama: p.admin_nama, email: p.admin_email.toLowerCase(), wa: p.admin_wa, token: r.invite_token, lembaga: p.nama });
      } catch (x) { toastErr(x); }
    });
  }

  async function detail(id) {
    const dr = modal({ drawer: true, title: 'Detail Lembaga', ic: 'domain', body: skel.lines(8) });
    let x = null;
    const paintD = async () => {
      let t;
      try { t = await api.rpc('sa_tenant_detail', { id }); } catch (er) { dr.close(); return toastErr(er); }
      x = t.tenant;
      dr.body.innerHTML = html`<div class="row"><span class="avatar sq lg">${initials(x.nama)}</span><div style="flex:1;min-width:0"><h3>${x.nama}</h3><div class="muted small">${x.jenis} · Kode <b>${x.kode}</b>${x.npsn ? ' · NPSN ' + x.npsn : ''}</div></div>${badge(x.status)}</div>
        ${x.alamat ? html`<p class="muted small mt-8">${icon('location_on')} ${x.alamat}</p>` : ''}
        <div class="card mt-16" style="background:linear-gradient(130deg,#1B2A4E,#1565D8);color:#fff"><div class="small" style="opacity:.8">Saldo poin</div><div style="font-size:34px;font-weight:800">${fmt.num(t.saldo)}</div>
          <button class="btn sm mt-8" style="background:rgba(255,255,255,.15);color:#fff" data-d="adj">${icon('tune')} Koreksi Saldo</button></div>
        <div class="grid g-2 mt-16" style="gap:10px">${[['Peserta', t.jumlah.peserta], ['Guru', t.jumlah.guru], ['Bank soal', t.jumlah.bank], ['Ujian terbit', t.jumlah.ujian]].map(([l, v]) => html`<div style="background:var(--slate-50);border-radius:12px;padding:10px 12px"><div class="muted tiny">${l}</div><b>${fmt.num(v)}</b></div>`)}</div>
        <h3 class="mt-24">Admin lembaga</h3>${t.admin.map((a) => html`<div class="row mt-8" style="padding:10px 12px;border-radius:12px;background:var(--slate-50)"><span class="avatar sm">${initials(a.nama)}</span>
          <div style="flex:1;min-width:0"><div class="semi">${a.nama}</div><div class="muted small ellipsis">${a.email}${a.last_login ? ' · login ' + fmt.rel(a.last_login) : ''}</div></div>
          ${a.status === 'undangan' ? html`<button class="btn soft sm" data-inv="${a.id}" data-n="${a.nama}" data-e="${a.email}" data-w="${a.wa || ''}">${icon('share')} Undangan</button>` : badge(a.status)}</div>`)}
        <h3 class="mt-24">Riwayat poin</h3><div class="col gap-4 mt-8">${t.ledger.length ? t.ledger.map((l) => html`<div class="row small" style="padding:6px 0;border-bottom:1px solid var(--border-2)"><span class="muted" style="width:90px">${fmt.date(l.created_at)}</span>
          <span style="flex:1" class="ellipsis">${l.keterangan || l.jenis}</span><b style="color:${l.jumlah > 0 ? 'var(--green)' : 'var(--coral)'}">${l.jumlah > 0 ? '+' : ''}${fmt.num(l.jumlah)}</b></div>`) : html`<span class="muted small">Belum ada.</span>`}</div>
        <div class="row wrap gap-8 mt-24"><button class="btn secondary" data-d="edit">${icon('edit')} Ubah data</button>
          ${x.status === 'nonaktif' ? html`<button class="btn success" data-d="on">${icon('check_circle')} Aktifkan</button>` : html`<button class="btn danger" data-d="off">${icon('block')} Nonaktifkan</button>`}</div>`.s;
    };
    on(dr.body, 'click', '[data-inv]', async (e, b) => { try { const r = await api.rpc('staff_invite_link', { staff: b.dataset.inv }); if (r.token) shareInvite({ nama: b.dataset.n, email: b.dataset.e, wa: b.dataset.w, token: r.token, lembaga: x.nama }); } catch (er) { toastErr(er); } });
    on(dr.body, 'click', '[data-d]', async (e, b) => {
        if (!x) return;
        const a = b.dataset.d;
        if (a === 'adj') {
          const m = modal({ title: 'Koreksi Saldo Poin', sub: x.nama, ic: 'tune', size: 'narrow',
            body: html`<div class="alert purple"><div class="a-ic">${icon('history_edu')}</div><div class="small">Setiap koreksi tercatat di buku besar poin dan jejak audit.</div></div>
              <div class="field"><label>Jumlah (gunakan minus untuk mengurangi)</label><input class="input" type="number" id="jm" placeholder="mis. 100 atau -50"></div>
              <div class="field mt-16"><label>Alasan <span class="req">*</span></label><textarea class="textarea" id="al" placeholder="mis. kompensasi gangguan server tanggal …"></textarea></div>`,
            foot: html`<button class="btn secondary" data-x>Batal</button><button class="btn primary" data-go>${icon('save')} Simpan Koreksi</button>` });
          $('[data-go]', m.el).onclick = (ev) => busy(ev.currentTarget, async () => {
            try { const r = await api.rpc('sa_wallet_adjust', { tenant: id, jumlah: Number($('#jm', m.el).value), alasan: $('#al', m.el).value }); m.close(); toast('Saldo dikoreksi', 'Saldo baru: ' + fmt.num(r.saldo), 'ok'); hard(); paintD(); } catch (er) { toastErr(er); }
          });
        } else if (a === 'on' || a === 'off') {
          if (a === 'off' && !(await confirmDialog({ title: 'Nonaktifkan lembaga?', text: 'Staf dan peserta lembaga ini tidak dapat masuk sampai diaktifkan kembali. Data tetap tersimpan.', danger: true, ok: 'Nonaktifkan' }))) return;
          try { await api.rpc('sa_tenant_set_status', { id, status: a === 'on' ? 'aktif' : 'nonaktif' }); toast('Status diperbarui', '', 'ok'); hard(); paintD(); } catch (er) { toastErr(er); }
        } else if (a === 'edit') {
          const m = modal({ title: 'Ubah Data Lembaga', ic: 'edit', body: html`<form id="ef" class="form-grid"><div class="field full"><label>Nama</label><input class="input" name="nama" value="${x.nama}"></div>
              <div class="field"><label>Jenis</label><select class="select" name="jenis">${JENIS.map((j) => html`<option ${j === x.jenis ? 'selected' : ''}>${j}</option>`)}</select></div>
              <div class="field"><label>Kode login peserta</label><input class="input" name="kode" value="${x.kode}" style="text-transform:uppercase"></div>
              <div class="field"><label>NPSN</label><input class="input" name="npsn" value="${x.npsn || ''}"></div><div class="field"><label>KKM</label><input class="input" type="number" name="kkm" value="${x.kkm}"></div>
              <div class="field full"><label>Alamat</label><input class="input" name="alamat" value="${x.alamat || ''}"></div></form>`,
            foot: html`<button class="btn secondary" data-x>Batal</button><button class="btn primary" data-go>${icon('save')} Simpan</button>` });
          $('[data-go]', m.el).onclick = (ev) => busy(ev.currentTarget, async () => {
            const f = $('#ef', m.el);
            try { await api.rpc('sa_tenant_save', { p: { id, nama: f.nama.value, jenis: f.jenis.value, kode: f.kode.value, npsn: f.npsn.value, kkm: f.kkm.value, alamat: f.alamat.value } }); m.close(); toast('Data lembaga disimpan', '', 'ok'); hard(); paintD(); } catch (er) { toastErr(er); }
          });
        }
      });
    paintD();
  }

  const offs = [
    on(el, 'click', '[data-s]', (e, b) => { status = b.dataset.s; page = 1; refresh(); }),
    on(el, 'click', '[data-p]', (e, b) => { if (b.disabled) return; page = +b.dataset.p; refresh(); }),
    on(el, 'click', '[data-a=new]', () => newTenant()),
    on(el, 'click', 'tr[data-id]', (e, tr) => detail(tr.dataset.id)),
  ];
  return () => offs.forEach((f) => f());
}
