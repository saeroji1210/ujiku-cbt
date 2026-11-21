// Super Admin: link pendaftaran mandiri, mode pendaftaran, dan verifikasi pendaftar.
import * as api from '../core/api.js';
import * as store from '../core/store.js';
import { html, icon, $, $$, on, fmt, badge, skel, empty, modal, toast, toastErr, busy, promptDialog, copyText, debounce } from '../core/ui.js';
import { shareInvite } from './ad-guru.js';

const MODES = [
  ['nonaktif', 'Tutup', 'block', 'Link tidak bisa dipakai. Lembaga hanya didaftarkan oleh Super Admin.'],
  ['persetujuan', 'Perlu persetujuan', 'fact_check', 'Pendaftar menunggu sampai Anda menyetujui. Disarankan, agar poin uji coba hanya untuk lembaga yang jelas.'],
  ['otomatis', 'Langsung aktif', 'rocket_launch', 'Lembaga langsung dibuat dan langsung menerima poin uji coba. Cocok saat promosi.'],
];
const KEY = (st) => 'sa_registrations|' + st;
export const prefetch = () => store.fetchOnce(KEY('menunggu'), () => api.rpc('sa_registrations', { status: 'menunggu' }));
const waUrl = (no, pesan) => `https://wa.me/${String(no || '').replace(/\D/g, '').replace(/^0/, '62')}${pesan ? '?text=' + encodeURIComponent(pesan) : ''}`;

export default async function (ctx) {
  const { el, title, alive } = ctx;
  title('Pendaftaran Sekolah');
  const link = api.APP_URL + '#/daftar';
  const promo = `Daftarkan sekolah Anda di UjiKu CBT: ujian berbasis komputer tanpa biaya cetak, nilai otomatis, dan analisis butir soal. Daftar gratis lewat tautan ini:\n${link}`;
  let st = 'menunggu', q = '', d = null;

  el.innerHTML = html`<div class="page-head"><div><div class="crumb">Lembaga & Poin</div><h1>Pendaftaran Sekolah</h1>
      <div class="sub">Bagikan link pendaftaran agar sekolah, madrasah, bimbel, atau kampus bisa mendaftar sendiri dengan akun Google.</div></div></div>
    <div class="grid g-2" style="margin-bottom:20px">
      <div class="card col">
        <div class="row"><div class="icon-tile soft">${icon('link')}</div><div><h3>Link pendaftaran</h3><div class="muted small">Bagikan di grup WhatsApp, media sosial, atau brosur.</div></div></div>
        <div class="row" style="background:var(--slate-50);border-radius:12px;padding:10px 12px"><code class="small ellipsis" style="flex:1" id="lk">${link}</code></div>
        <div class="row wrap" style="gap:8px">
          <button class="btn secondary" data-a="copy">${icon('content_copy')} Salin link</button>
          <a class="btn success" target="_blank" rel="noopener" href="https://wa.me/?text=${encodeURIComponent(promo)}">${icon('chat')} Bagikan via WhatsApp</a>
          <a class="btn ghost" target="_blank" rel="noopener" href="${link}">${icon('open_in_new')} Buka</a>
        </div>
      </div>
      <div class="card col">
        <div class="row"><div class="icon-tile soft">${icon('tune')}</div><div><h3>Cara menerima pendaftar</h3><div class="muted small" id="trial-info">Memuat…</div></div></div>
        <div class="seg" id="modes" style="width:100%">${MODES.map(([k, l, ic]) => html`<button style="flex:1" data-mode="${k}">${icon(ic)} ${l}</button>`)}</div>
        <div class="muted small" id="mode-desc"></div>
      </div>
    </div>
    <div class="card pad-0"><div class="toolbar"><div class="seg" id="sts"></div><span class="spacer"></span>
      <div class="input-ic">${icon('search')}<input class="input soft" id="q" placeholder="Cari nama, email, atau NPSN…"></div></div>
      <div id="tbl">${skel.lines(6)}</div></div>`.s;

  const paintMode = (mode, trial) => {
    $$('[data-mode]', el).forEach((b) => b.classList.toggle('on', b.dataset.mode === mode));
    $('#mode-desc', el).textContent = (MODES.find((m) => m[0] === mode) || MODES[1])[3];
    $('#trial-info', el).innerHTML = html`Poin uji coba saat ini <b>${fmt.num(trial)} poin</b> · <a href="#/sa/pengaturan">ubah di Pengaturan</a>`.s;
    $('#lk', el).style.opacity = mode === 'nonaktif' ? '.45' : '1';
  };

  const paint = (x) => {
    d = x; if (!alive()) return;
    paintMode(x.mode, x.poin_trial);
    const c = x.counts || {};
    $('#sts', el).innerHTML = html`${[['menunggu', 'Menunggu'], ['disetujui', 'Disetujui'], ['ditolak', 'Ditolak'], ['', 'Semua']]
      .map(([k, l]) => html`<button data-st="${k}" class="${st === k ? 'on' : ''}">${l} <span class="cnt">${fmt.num(c[k || 'semua'] || 0)}</span></button>`)}`.s;
    const rows = x.rows || [];
    $('#tbl', el).innerHTML = (rows.length ? html`<div class="table-wrap"><table class="table"><thead><tr>
        <th>Tanggal</th><th>Lembaga</th><th>Penanggung jawab</th><th class="num hide-sm">Peserta</th><th>Status</th><th></th></tr></thead>
      <tbody>${rows.map((r) => html`<tr>
        <td class="nowrap">${fmt.date(r.created_at)}<div class="muted small">${fmt.time(r.created_at)}</div></td>
        <td style="min-width:200px"><div class="semi">${r.nama}</div><div class="muted small">${r.jenis}${r.npsn ? ' · NPSN ' + r.npsn : ''}</div>
          ${r.alamat ? html`<div class="muted tiny">${r.alamat}</div>` : ''}
          ${r.npsn_bentrok ? html`<span class="badge b-red mt-4">${icon('warning')} NPSN sudah terdaftar</span>` : ''}
          ${r.email_bentrok ? html`<span class="badge b-red mt-4">${icon('warning')} Email sudah jadi staf</span>` : ''}
          ${r.catatan ? html`<div class="small mt-4" style="max-width:320px">“${r.catatan}”</div>` : ''}</td>
        <td style="min-width:190px"><div class="semi">${r.nama_admin}${r.jabatan ? html` <span class="muted small">· ${r.jabatan}</span>` : ''}</div>
          <div class="muted small">${r.email}</div>
          <a class="small" target="_blank" rel="noopener" href="${waUrl(r.wa)}">${icon('chat')} ${r.wa}</a></td>
        <td class="num hide-sm">${r.jumlah_peserta ? fmt.num(r.jumlah_peserta) : '–'}</td>
        <td>${badge(r.status)}
          ${r.status === 'disetujui' ? html`<div class="muted tiny mt-4">${r.kode ? 'Kode ' + r.kode : ''}${r.poin_trial != null ? ' · ' + fmt.num(r.poin_trial) + ' poin' : ''}${r.otomatis ? ' · otomatis' : ''}</div>` : ''}
          ${r.status === 'ditolak' && r.alasan ? html`<div class="muted tiny mt-4" style="max-width:220px">${r.alasan}</div>` : ''}</td>
        <td class="nowrap">${r.status === 'menunggu' ? html`<button class="btn success sm" data-ok="${r.id}">${icon('check')} Setujui</button> <button class="btn ghost red sm" data-no="${r.id}">Tolak</button>` : ''}</td>
      </tr>`)}</tbody></table></div>`
      : empty('how_to_reg', st === 'menunggu' ? 'Tidak ada pendaftaran yang menunggu' : 'Belum ada data',
          st === 'menunggu' ? 'Bagikan link pendaftaran di atas. Pendaftar baru akan muncul di sini dan di lonceng notifikasi.' : '')).s;
  };
  const load = () => store.swr(KEY(st) + (q ? '|' + q : ''), () => api.rpc('sa_registrations', { status: st, q }), paint, { alive, ttl: 8000 }).catch(toastErr);
  const hard = () => { store.invalidate('sa_registrations', 'sa_dashboard', 'sa_tenants'); load(); };
  const row = (id) => (d?.rows || []).find((r) => r.id === id);

  function setujui(r) {
    const m = modal({ title: 'Setujui pendaftaran', sub: r.nama, ic: 'verified', size: 'narrow',
      body: html`<p class="muted">Lembaga dibuat dengan status <b>Uji Coba</b>. Akun Google <b>${r.email}</b> langsung menjadi Admin Lembaga tanpa perlu tautan aktivasi.</p>
        ${r.npsn_bentrok ? html`<div class="alert red mt-16"><div class="a-ic">${icon('warning')}</div><div class="small">NPSN ${r.npsn} sudah dipakai lembaga lain. Pastikan ini bukan pendaftaran ganda sebelum menyetujui.</div></div>` : ''}
        <div class="field mt-16"><label>Poin uji coba untuk lembaga ini</label><input class="input" type="number" min="0" id="pt" value="${d?.poin_trial ?? 0}">
          <div class="hint">Isi 0 bila ingin memberi poin nanti lewat Koreksi Saldo.</div></div>`,
      foot: html`<button class="btn secondary" data-x>Batal</button><button class="btn success" data-go>${icon('check')} Setujui & Buat Lembaga</button>` });
    $('[data-go]', m.el).onclick = (e) => busy(e.currentTarget, async () => {
      try {
        const res = await api.rpc('sa_registration_decide', { id: r.id, setujui: true, poin: Number($('#pt', m.el).value || 0) });
        m.close(); hard(); notifWa(res);
        if (res.invite_token) return shareInvite({ nama: res.nama_admin, email: res.email, wa: res.wa, token: res.invite_token, lembaga: res.nama });
        kabari(res);
      } catch (x) { toastErr(x); }
    });
  }

  const notifWa = (res) => {
    if (res.wa_status === 'antre' || res.wa_status === 'dikirim') toast('WhatsApp otomatis dikirim', `Pesan ke ${res.wa || 'pendaftar'} sedang dikirim lewat Fonnte`, 'ok');
    else if (res.wa_status === 'gagal') toast('WhatsApp otomatis gagal', 'Kirim manual lewat tombol WhatsApp, atau cek Pengaturan → WhatsApp otomatis', 'warn', 8000);
  };

  function kabari(res) {
    const pesan = `Halo ${res.nama_admin}, pendaftaran ${res.nama} di UjiKu CBT sudah disetujui.\n\nKode lembaga: ${res.kode}\nPoin uji coba: ${res.poin_trial}\n\nSilakan masuk dengan akun Google ${res.email} di:\n${api.APP_URL}#/masuk`;
    const m = modal({ title: 'Lembaga disetujui', sub: `Kode ${res.kode} · ${fmt.num(res.poin_trial)} poin uji coba`, ic: 'celebration', size: 'narrow',
      body: html`<p class="muted">${res.wa_status === 'antre' || res.wa_status === 'dikirim' ? html`<b class="c-green">${icon('check_circle')} WhatsApp otomatis sudah dikirim.</b> Pesan di bawah hanya untuk kirim ulang manual bila perlu.` : html`Kabari <b>${res.nama_admin}</b> bahwa lembaganya sudah aktif. Ia cukup masuk dengan Google memakai <b>${res.email}</b>.`}</p>
        <textarea class="textarea mt-16" rows="7" readonly>${pesan}</textarea>`,
      foot: html`<button class="btn secondary" data-c>${icon('content_copy')} Salin pesan</button>
        <a class="btn success" target="_blank" rel="noopener" href="${waUrl(res.wa, pesan)}">${icon('chat')} Kirim via WhatsApp</a>` });
    $('[data-c]', m.el).onclick = () => copyText(pesan, 'Pesan disalin');
    toast('Lembaga dibuat', `${res.nama} · kode ${res.kode}`, 'ok');
  }

  const offs = [
    on(el, 'click', '[data-a=copy]', () => copyText(link, 'Link pendaftaran disalin')),
    on(el, 'click', '[data-mode]', (e, b) => {
      if (b.classList.contains('on')) return;
      busy(b, async () => {
        try { const r = await api.rpc('sa_daftar_mode', { mode: b.dataset.mode }); paintMode(r.mode, d?.poin_trial ?? 0); if (d) d.mode = r.mode;
          store.invalidate('sa_registrations'); toast('Mode pendaftaran disimpan', MODES.find((m) => m[0] === r.mode)[1], 'ok'); } catch (x) { toastErr(x); }
      });
    }),
    on(el, 'click', '[data-st]', (e, b) => { st = b.dataset.st; $$('[data-st]', el).forEach((x) => x.classList.toggle('on', x === b)); $('#tbl', el).innerHTML = skel.lines(6).s; load(); }),
    on(el, 'input', '#q', debounce((e) => { q = e.target.value.trim(); load(); }, 300)),
    on(el, 'click', '[data-ok]', (e, b) => { const r = row(b.dataset.ok); if (r) setujui(r); }),
    on(el, 'click', '[data-no]', async (e, b) => {
      const r = row(b.dataset.no); if (!r) return;
      const v = await promptDialog({ title: 'Tolak pendaftaran', label: `Alasan penolakan untuk ${r.nama}`, textarea: true, ok: 'Tolak',
        hint: 'Alasan ini terlihat oleh pendaftar. Ia bisa memperbaiki data lalu mengirim ulang.' });
      if (v == null) return;
      try { const rj = await api.rpc('sa_registration_decide', { id: r.id, setujui: false, alasan: v }); toast('Pendaftaran ditolak', rj.wa_status === 'antre' || rj.wa_status === 'dikirim' ? 'Pemberitahuan WhatsApp dikirim otomatis' : '', 'ok'); hard(); } catch (x) { toastErr(x); }
    }),
  ];
  load();
  return () => offs.forEach((f) => f());
}
