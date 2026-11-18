// Halaman publik pendaftaran mandiri lembaga: #/daftar
// Alur: masuk Google → isi data lembaga → (menunggu persetujuan | langsung aktif).
import * as api from '../core/api.js';
import { html, raw, icon, $, fmt, toast, toastErr, busy } from '../core/ui.js';
import { LOGO, GOOGLE } from '../core/art.js';

const JENIS = ['Sekolah Negeri', 'Sekolah Swasta', 'Madrasah', 'Bimbel & Kursus', 'Kampus', 'Instansi / Perusahaan'];
const SEKOLAH = ['Sekolah Negeri', 'Sekolah Swasta', 'Madrasah'];
const waLink = (no, pesan) => `https://wa.me/${String(no || '').replace(/\D/g, '').replace(/^0/, '62')}${pesan ? '?text=' + encodeURIComponent(pesan) : ''}`;

export default async function ({ el, title, go, refreshMe, alive }) {
  title('Daftarkan Sekolah');
  const head = html`<header style="background:#fff;box-shadow:var(--sh-1)"><div class="row" style="max-width:980px;margin:0 auto;padding:14px 20px">
    <span class="logo-mark">${raw(LOGO)}</span><div><div class="bold" style="font-size:18px;color:var(--primary)">UjiKu CBT</div><div class="tiny muted">Pendaftaran Lembaga</div></div>
    <span class="spacer"></span><a class="btn ghost sm" href="#/masuk">${icon('login')} Masuk</a></div></header>`;
  const page = (inner) => { if (alive()) el.innerHTML = html`${head}<main style="max-width:980px;margin:0 auto;padding:24px 16px 64px">${inner}</main>`.s; };
  const center = (ic, judul, teks, aksi = '') => html`<div class="card" style="max-width:620px;margin:20px auto 0;text-align:center">
    <div class="empty" style="padding:8px 0"><div class="e-art">${icon(ic)}</div><h3>${judul}</h3><p style="max-width:480px">${teks}</p>${aksi}</div></div>`;

  page(html`<div class="page-loading" style="min-height:50vh"><span class="spin" style="color:var(--primary);width:28px;height:28px"></span></div>`);
  let info;
  try { info = await api.rpc('daftar_info', {}, { anon: true }); } catch (e) {
    return page(center('cloud_off', 'Halaman pendaftaran belum siap', 'Sistem belum dapat dihubungi atau fitur pendaftaran belum dipasang. Coba lagi nanti.',
      html`<button class="btn primary mt-8" onclick="location.reload()">${icon('refresh')} Coba lagi</button>`));
  }
  const kontak = info.kontak || {};
  const bantuan = kontak.wa ? html`<a class="btn secondary" target="_blank" rel="noopener" href="${waLink(kontak.wa, 'Halo tim UjiKu CBT, saya ingin bertanya tentang pendaftaran sekolah.')}">${icon('support_agent')} Hubungi tim UjiKu</a>` : '';

  if (info.mode === 'nonaktif') {
    return page(center('lock', 'Pendaftaran sedang ditutup', 'Saat ini pendaftaran lembaga baru dilakukan langsung oleh tim UjiKu CBT. Silakan hubungi kami untuk didaftarkan.',
      html`<div class="row wrap mt-8" style="justify-content:center">${bantuan}<a class="btn primary" href="#/masuk">${icon('login')} Ke halaman masuk</a></div>`));
  }

  // ---------- belum login ----------
  if (!api.session()) return intro();

  let s;
  try { s = await api.rpc('daftar_saya'); } catch (e) {
    if (e.hint === 'relogin' || !api.session()) return intro();
    return page(center('cloud_off', 'Gagal memuat status pendaftaran', e.message, html`<button class="btn primary mt-8" onclick="location.reload()">${icon('refresh')} Coba lagi</button>`));
  }
  if (!alive()) return;
  if (s.status === 'terdaftar') {
    page(center(s.nonaktif ? 'person_off' : 'verified', s.nonaktif ? 'Akun Anda dinonaktifkan' : 'Akun Anda sudah terdaftar',
      s.nonaktif ? html`Akun <b>${s.email}</b> sedang dinonaktifkan. Hubungi admin lembaga atau tim UjiKu CBT.` : html`Email <b>${s.email}</b> sudah terdaftar di UjiKu CBT. Anda tidak perlu mendaftar lagi.`,
      s.nonaktif ? bantuan : html`<button class="btn primary mt-8" data-go>${icon('dashboard')} Buka Dashboard</button>`));
    const b = $('[data-go]', el);
    if (b) b.onclick = async () => { await refreshMe(); go('/', { replace: true }); };
    return;
  }
  if (s.status === 'menunggu') return menunggu(s.pengajuan, s.email);
  return form(s);

  function intro() {
    const trial = Number(info.poin_trial || 0), per = Math.max(1, Number(info.poin_per_peserta || 1));
    const langkah3 = info.mode === 'otomatis' ? ['rocket_launch', 'Langsung mulai', 'Lembaga dibuat otomatis dan Anda masuk ke dashboard admin.']
      : ['fact_check', 'Diverifikasi tim UjiKu', 'Kami memeriksa data lalu mengaktifkan lembaga Anda. Kabar dikirim lewat WhatsApp.'];
    page(html`<section class="banner" style="margin-bottom:20px"><div class="b-txt">
        <span class="b-pill"><i></i> Pendaftaran Lembaga Baru</span>
        <h1 class="mt-8">Daftarkan sekolah Anda ke UjiKu CBT</h1>
        <p>Ujian berbasis komputer tanpa biaya cetak. Nilai keluar otomatis, lengkap dengan analisis butir soal, dan bisa dikerjakan tanpa internet lewat server sekolah.</p></div></section>
      <div class="grid g-3" style="margin-bottom:20px">
        ${[trial ? ['toll', `${fmt.num(trial)} poin uji coba gratis`, `Cukup untuk ${fmt.num(Math.floor(trial / per))} peserta mengikuti satu ujian.`, '#F7941D']
              : ['toll', 'Bayar sesuai pemakaian', 'Beli poin sesuai jumlah peserta ujian, tanpa biaya bulanan.', '#F7941D'],
           ['insights', 'Nilai & analisis otomatis', 'Nilai muncul begitu peserta selesai. Laporan bisa diunduh Excel dan PDF.', '#22A06B'],
           ['shield', 'Aman dari kecurangan', 'Soal & opsi diacak, pindah aplikasi tercatat dan sesi bisa dikunci.', '#1565D8']]
          .map(([ic, j, t, c]) => html`<div class="card row" style="align-items:flex-start"><div class="icon-tile" style="background:${c}">${icon(ic)}</div>
            <div><div class="semi">${j}</div><div class="muted small mt-4">${t}</div></div></div>`)}
      </div>
      <div class="card" style="padding:28px">
        <h2 style="font-size:20px">Cara mendaftar</h2>
        <div class="grid g-3 mt-16">
          ${[['login', '1. Masuk dengan Google', 'Gunakan akun Google pengelola sekolah. Email ini menjadi akun Admin Lembaga.'],
             ['edit_note', '2. Isi data lembaga', 'Nama sekolah, NPSN, alamat, dan nomor WhatsApp. Sekitar 2 menit.'],
             [langkah3[0], '3. ' + langkah3[1], langkah3[2]]]
            .map(([ic, j, t]) => html`<div class="row" style="align-items:flex-start"><div class="icon-tile soft">${icon(ic)}</div><div><div class="semi">${j}</div><div class="muted small mt-4">${t}</div></div></div>`)}
        </div>
        <button class="btn-google mt-24" id="g-daftar" style="height:56px;background:var(--primary);color:#fff;border:0">${raw(GOOGLE)} Daftar dengan Google</button>
        <div class="row wrap mt-16 small muted" style="justify-content:space-between;gap:10px">
          <span>${icon('info')} Guru atau pengawas tidak perlu mendaftar di sini. Minta admin sekolah Anda mengundang email Anda.</span>
          <a href="#/masuk">Sudah punya akun? Masuk</a>
        </div>
      </div>`);
    $('#g-daftar', el).onclick = () => api.signInWithGoogle('#/daftar');
  }

  function form(s) {
    const lama = s.pengajuan || {};
    const ditolak = s.status === 'ditolak';
    const otomatis = s.info?.mode === 'otomatis';
    const val = (k, d = '') => (ditolak ? lama[k] ?? d : d);
    page(html`<div class="page-head"><div><div class="crumb">Pendaftaran Lembaga</div><h1>Data Sekolah / Lembaga</h1>
        <div class="sub">Isi dengan data sebenarnya. Data ini dipakai untuk memverifikasi dan mengaktifkan lembaga Anda.</div></div></div>
      <div class="alert blue"><div class="a-ic">${icon('verified_user')}</div><div style="flex:1">Masuk sebagai <b>${s.email}</b>. Email ini akan menjadi akun <b>Admin Lembaga</b>.</div>
        <button class="btn ghost sm" data-out>${icon('logout')} Ganti akun</button></div>
      ${ditolak ? html`<div class="alert red"><div class="a-ic">${icon('error')}</div><div><b>Pendaftaran sebelumnya ditolak.</b>
        <div class="small mt-4">Alasan: ${lama.alasan || '–'}</div><div class="small">Perbaiki data di bawah lalu kirim ulang.</div></div></div>` : ''}
      <form id="df" class="card col" style="padding:28px" novalidate>
        <div class="row gap-8"><span style="width:5px;height:20px;border-radius:3px;background:var(--primary)"></span><b class="small" style="letter-spacing:.06em">1. DATA LEMBAGA</b></div>
        <div class="form-grid">
          <div class="field full"><label>Nama sekolah / lembaga <span class="req">*</span></label>
            <div class="input-ic">${icon('apartment')}<input class="input" name="nama" maxlength="120" value="${val('nama')}" placeholder="SMP Negeri 3 Semarang" required></div></div>
          <div class="field"><label>Jenis lembaga <span class="req">*</span></label>
            <select class="select" name="jenis">${JENIS.map((j) => html`<option ${j === val('jenis', 'Sekolah Negeri') ? 'selected' : ''}>${j}</option>`)}</select></div>
          <div class="field"><label>NPSN <span class="req" id="npsn-req">*</span></label>
            <div class="input-ic">${icon('tag')}<input class="input" name="npsn" inputmode="numeric" maxlength="20" value="${val('npsn')}" placeholder="8 angka, mis. 20328901"></div>
            <div class="hint" id="npsn-hint">Wajib untuk sekolah dan madrasah. Satu NPSN hanya bisa didaftarkan sekali.</div></div>
          <div class="field full"><label>Alamat lengkap & kota</label>
            <div class="input-ic">${icon('location_on')}<input class="input" name="alamat" maxlength="250" value="${val('alamat')}" placeholder="Jl. Pemuda No. 1, Kota Semarang"></div></div>
          <div class="field"><label>Perkiraan jumlah peserta</label>
            <div class="input-ic">${icon('groups')}<input class="input" name="jumlah_peserta" type="number" min="1" max="100000" value="${val('jumlah_peserta')}" placeholder="mis. 300"></div></div>
        </div>
        <div class="row gap-8 mt-8"><span style="width:5px;height:20px;border-radius:3px;background:var(--primary)"></span><b class="small" style="letter-spacing:.06em">2. PENANGGUNG JAWAB (ADMIN LEMBAGA)</b></div>
        <div class="form-grid">
          <div class="field"><label>Nama lengkap <span class="req">*</span></label>
            <div class="input-ic">${icon('person')}<input class="input" name="nama_admin" maxlength="80" value="${val('nama_admin', s.nama || '')}" placeholder="Nama Anda" required></div></div>
          <div class="field"><label>Jabatan</label>
            <div class="input-ic">${icon('work')}<input class="input" name="jabatan" maxlength="60" value="${val('jabatan')}" placeholder="mis. Kepala Sekolah / Operator"></div></div>
          <div class="field"><label>Nomor WhatsApp <span class="req">*</span></label>
            <div class="input-ic">${icon('chat')}<input class="input" name="wa" inputmode="tel" maxlength="20" value="${val('wa')}" placeholder="0812-3456-7890" required></div>
            <div class="hint">Dipakai tim UjiKu untuk verifikasi dan bantuan.</div></div>
          <div class="field"><label>Email Google</label>
            <div class="input-ic">${icon('mail')}<input class="input soft" value="${s.email}" readonly></div></div>
          <div class="field full"><label>Catatan (opsional)</label>
            <textarea class="textarea" name="catatan" maxlength="500" rows="2" placeholder="mis. rencana ujian PTS bulan depan untuk kelas 7–9">${val('catatan')}</textarea></div>
        </div>
        <label class="check mt-8"><input type="checkbox" id="setuju"> Saya berwenang mendaftarkan lembaga ini dan data yang saya isi benar.</label>
        <div class="err-text hidden" id="d-err" role="alert"></div>
        <div class="row wrap" style="justify-content:space-between;gap:12px">
          <span class="muted small">${otomatis ? html`${icon('rocket_launch')} Lembaga langsung aktif setelah dikirim${info.poin_trial ? html`, dengan <b>${fmt.num(info.poin_trial)} poin</b> uji coba` : ''}.`
            : html`${icon('schedule')} Tim UjiKu akan memverifikasi pendaftaran Anda.`}</span>
          <button class="btn primary lg" type="submit" id="kirim">${icon(otomatis ? 'rocket_launch' : 'send')} ${otomatis ? 'Daftar & Mulai' : 'Kirim Pendaftaran'}</button>
        </div>
      </form>`);
    const f = $('#df', el);
    const syncJenis = () => {
      const wajib = SEKOLAH.includes(f.jenis.value);
      $('#npsn-req', el).classList.toggle('hidden', !wajib);
      $('#npsn-hint', el).textContent = wajib ? 'Wajib untuk sekolah dan madrasah. Satu NPSN hanya bisa didaftarkan sekali.' : 'Opsional untuk bimbel, kampus, dan instansi.';
    };
    f.jenis.onchange = syncJenis; syncJenis();
    $('[data-out]', el).onclick = async () => { await api.signOut(); intro(); };
    const err = (m, fld) => { const e = $('#d-err', el); e.textContent = m; e.classList.toggle('hidden', !m); if (fld) f[fld]?.focus(); return false; };
    f.onsubmit = (ev) => {
      ev.preventDefault();
      const p = Object.fromEntries(['nama', 'jenis', 'npsn', 'alamat', 'jumlah_peserta', 'nama_admin', 'jabatan', 'wa', 'catatan'].map((k) => [k, f[k].value.trim()]));
      const npsn = p.npsn.replace(/\D/g, ''), wa = p.wa.replace(/\D/g, '');
      if (p.nama.length < 4) return err('Isi nama sekolah / lembaga.', 'nama');
      if (SEKOLAH.includes(p.jenis) && npsn.length !== 8) return err('NPSN sekolah/madrasah terdiri dari 8 angka.', 'npsn');
      if (p.nama_admin.length < 3) return err('Isi nama penanggung jawab.', 'nama_admin');
      if (wa.length < 10 || wa.length > 15) return err('Nomor WhatsApp belum benar.', 'wa');
      if (!$('#setuju', el).checked) return err('Centang pernyataan di atas untuk melanjutkan.');
      err('');
      return busy($('#kirim', el), async () => {
        try {
          const r = await api.rpc('daftar_kirim', { p });
          if (r.langsung) {
            toast('Lembaga terdaftar', `Kode lembaga ${r.kode}${r.poin_trial ? ' · ' + r.poin_trial + ' poin uji coba' : ''}`, 'ok', 6000);
            await refreshMe();
            go('/', { replace: true });
          } else {
            toast('Pendaftaran terkirim', 'Kami akan memverifikasi data Anda.', 'ok');
            menunggu({ ...p, npsn, created_at: new Date().toISOString() }, s.email);
          }
        } catch (x) { err(x.message); toastErr(x); }
      });
    };
  }

  function menunggu(pj, email) {
    pj = pj || {};
    const pesan = `Halo tim UjiKu CBT, saya ${pj.nama_admin || ''} dari ${pj.nama || ''} sudah mengirim pendaftaran dengan email ${email}. Mohon diverifikasi.`;
    page(html`<div class="card" style="max-width:720px;margin:12px auto 0;padding:28px">
      <div class="row" style="align-items:flex-start;gap:16px"><div class="icon-tile" style="background:var(--orange);width:56px;height:56px">${icon('hourglass_top')}</div>
        <div><span class="badge b-yellow">Menunggu verifikasi</span><h2 class="mt-8" style="font-size:22px">Pendaftaran sedang diperiksa</h2>
        <p class="muted mt-4">Tim UjiKu akan menghubungi Anda lewat WhatsApp. Setelah disetujui, buka situs ini lalu masuk dengan Google memakai <b>${email}</b>.</p></div></div>
      <div class="table-wrap mt-16"><table class="table"><tbody>
        ${[['Lembaga', pj.nama], ['Jenis', pj.jenis], ['NPSN', pj.npsn || '–'], ['Alamat', pj.alamat || '–'], ['Penanggung jawab', [pj.nama_admin, pj.jabatan].filter(Boolean).join(' · ')],
           ['WhatsApp', pj.wa], ['Dikirim', pj.created_at ? fmt.date(pj.created_at) + ' ' + fmt.time(pj.created_at) : '–']]
          .map(([k, v]) => html`<tr><td class="muted" style="width:180px">${k}</td><td class="semi">${v || '–'}</td></tr>`)}
      </tbody></table></div>
      <div class="row wrap mt-24" style="gap:10px">
        <button class="btn primary" data-cek>${icon('refresh')} Cek status</button>
        ${kontak.wa ? html`<a class="btn success" target="_blank" rel="noopener" href="${waLink(kontak.wa, pesan)}">${icon('chat')} Tanya via WhatsApp</a>` : ''}
        <span class="spacer"></span><button class="btn ghost" data-out>${icon('logout')} Keluar</button>
      </div></div>`);
    $('[data-cek]', el).onclick = () => location.reload();
    $('[data-out]', el).onclick = async () => { await api.signOut(); intro(); };
  }
}

