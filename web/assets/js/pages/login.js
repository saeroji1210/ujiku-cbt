import * as api from '../core/api.js';
import { html, raw, icon, $, toast, busy } from '../core/ui.js';
import { LOGO, HERO, GOOGLE } from '../core/art.js';

export default async function ({ el, query, go, title }) {
  title('Masuk');
  const lokal = api.MODE === 'lokal';
  let tab = lokal || query.peserta || localStorage.getItem('ujk.tab') === 'peserta' ? 'peserta' : 'staf';
  const kodeTersimpan = query.kode || localStorage.getItem('ujk.kode') || '';

  el.innerHTML = html`<div class="auth">
    <section class="auth-art">
      <div class="row"><span class="logo-mark">${raw(LOGO)}</span><span class="logo-text" style="color:#fff">UjiKu CBT</span>
        ${lokal ? html`<span class="badge b-cyan" style="margin-left:8px">${icon('lan')} Server Lokal Sekolah</span>` : ''}</div>
      <div class="art">${raw(HERO)}</div>
      <h1>Ujian lebih mudah,<br>nilai lebih cepat.</h1>
      <p>Platform ujian berbasis komputer untuk sekolah, bimbel, dan lembaga. Kerjakan dari HP, tablet, atau komputer — bahkan tanpa internet lewat server sekolah.</p>
    </section>
    <section class="auth-form">
      <div class="auth-card">
        <h2 style="font-size:24px">Masuk ke UjiKu CBT</h2>
        <p class="muted mt-4">${lokal ? 'Masuk sebagai peserta ujian' : 'Pilih jenis akun Anda'}</p>
        ${lokal ? '' : html`<div class="seg mt-16" role="tablist" style="width:100%">
          <button style="flex:1" data-tab="staf" role="tab">${icon('badge')} Staf</button>
          <button style="flex:1" data-tab="peserta" role="tab">${icon('school')} Peserta</button></div>`}
        <div id="f-staf" class="mt-24">
          ${api.session() ? html`<div class="alert blue"><div class="a-ic">${icon('verified_user')}</div>
            <div style="flex:1">Anda masih masuk sebagai staf.</div><a class="btn sm primary" href="#/">Lanjutkan</a></div>` : ''}
          <button class="btn-google" id="g-btn">${raw(GOOGLE)} Masuk dengan Google</button>
          <p class="hint mt-16" style="text-align:center">Untuk Super Admin, admin lembaga, guru, dan pengawas.<br>
            Email Google Anda harus sudah didaftarkan oleh admin.</p>
        </div>
        <form id="f-peserta" class="col mt-24" autocomplete="on" novalidate>
          ${lokal ? '' : html`<div class="field"><label for="kode">Kode Lembaga</label>
            <div class="input-ic">${icon('apartment')}<input class="input" id="kode" name="kode" value="${kodeTersimpan}" placeholder="contoh: SMPN3SMG" autocapitalize="characters" required></div></div>`}
          <div class="field"><label for="nis">NIS / Nomor Peserta</label>
            <div class="input-ic">${icon('badge')}<input class="input" id="nis" name="username" inputmode="numeric" placeholder="Nomor induk siswa" autocomplete="username" required></div></div>
          <div class="field"><label for="sandi">Kata Sandi</label>
            <div class="input-ic" style="position:relative">${icon('lock')}<input class="input" id="sandi" type="password" name="password" placeholder="Kata sandi dari sekolah" autocomplete="current-password" required style="padding-right:46px">
            <button type="button" class="btn ghost icon sm" id="eye" style="position:absolute;right:4px;top:5px" aria-label="Tampilkan sandi">${icon('visibility')}</button></div></div>
          <div class="err-text hidden" id="p-err" role="alert"></div>
          <button class="btn primary lg block mt-8" id="p-btn" type="submit">${icon('login')} Masuk Ujian</button>
          ${lokal ? html`<div class="alert cyan mt-8" style="margin-bottom:0"><div class="a-ic">${icon('wifi')}</div><div class="small">Terhubung ke server lokal sekolah — tidak perlu internet.</div></div>` : ''}
        </form>
      </div>
    </section></div>`.s;

  const setTab = (t) => {
    tab = t; localStorage.setItem('ujk.tab', t);
    el.querySelectorAll('[data-tab]').forEach((b) => b.classList.toggle('on', b.dataset.tab === t));
    $('#f-staf', el).classList.toggle('hidden', t !== 'staf');
    $('#f-peserta', el).classList.toggle('hidden', t !== 'peserta');
  };
  setTab(tab);
  el.querySelectorAll('[data-tab]').forEach((b) => b.addEventListener('click', () => setTab(b.dataset.tab)));
  $('#g-btn', el)?.addEventListener('click', () => {
    if (!api.configured) return toast('Belum dikonfigurasi', 'Isi config.js terlebih dahulu.', 'warn');
    api.signInWithGoogle(sessionStorage.getItem('ujk.next') || '#/');
  });
  $('#eye', el).addEventListener('click', () => { const i = $('#sandi', el); i.type = i.type === 'password' ? 'text' : 'password'; });

  $('#f-peserta', el).addEventListener('submit', (e) => {
    e.preventDefault();
    const err = $('#p-err', el);
    const kode = lokal ? 'lokal' : $('#kode', el).value.trim();
    const nis = $('#nis', el).value.trim(), sandi = $('#sandi', el).value;
    if ((!lokal && !kode) || !nis || !sandi) { err.textContent = 'Lengkapi kode lembaga, NIS, dan kata sandi.'; err.classList.remove('hidden'); return; }
    busy($('#p-btn', el), async () => {
      try {
        const r = await api.rpc('p_login', { kode, nis, sandi, device: api.deviceId() }, { anon: true });
        if (!r.ok) { err.textContent = r.pesan; err.classList.remove('hidden'); return; }
        if (!lokal) localStorage.setItem('ujk.kode', kode.toUpperCase());
        api.peserta.set({ token: r.token, peserta: r.peserta, lembaga: r.lembaga });
        go('/ujian', { replace: true });
      } catch (x) { err.textContent = x.message; err.classList.remove('hidden'); }
    });
  });
}
