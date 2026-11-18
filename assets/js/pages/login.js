import * as api from '../core/api.js';
import { html, raw, icon, $, toast, busy } from '../core/ui.js';
import { LOGO, GOOGLE } from '../core/art.js';

export default async function ({ el, query, go, title }) {
  title('Masuk');
  const lokal = api.MODE === 'lokal';
  let tab = lokal || query.peserta || localStorage.getItem('ujk.tab') === 'peserta' ? 'peserta' : 'staf';
  const kodeTersimpan = query.kode || localStorage.getItem('ujk.kode') || '';

  const ljk = Array.from({ length: 16 }, (_, i) => html`<i>${[0, 1, 2, 3, 4].map((j) => html`<u class="${j === (i * 3 + 1) % 5 ? 'f' : ''}"></u>`)}</i>`);
  el.innerHTML = html`<div class="msk">
    <section class="msk-side">
      <div class="msk-ljk" aria-hidden="true">${ljk}</div>
      <div class="msk-brand">
        <a href="${lokal ? '#/masuk' : '#/beranda'}" aria-label="UjiKu CBT, ke beranda"><span class="logo-mark">${raw(LOGO)}</span>UjiKu CBT</a>
        ${lokal ? html`<span class="badge b-cyan">${icon('lan')} Server Lokal Sekolah</span>` : html`<a class="home-m" href="#/beranda">${icon('arrow_back')} Beranda</a>`}
      </div>
      <div class="msk-mid">
        <h1>Ujian lebih mudah, nilai lebih cepat.</h1>
        <p class="lead">Ujian berbasis komputer untuk sekolah, madrasah, bimbel, dan kampus. Dikerjakan dari HP, tablet, atau komputer.</p>
        <div class="msk-pts">
          ${[['task_alt', '#22A06B', 'Nilai keluar otomatis', 'Dihitung begitu siswa menekan Selesai.'],
             ['shield', '#F7941D', 'Ujian lebih jujur', 'Soal dan opsi diacak, pindah aplikasi tercatat.'],
             ['wifi_off', '#22B8E8', 'Tetap jalan tanpa internet', 'Lewat server lokal di sekolah.']]
            .map(([ic, c, j, t]) => html`<div><span class="ic" style="background:${c}">${icon(ic)}</span><div><b>${j}</b><small>${t}</small></div></div>`)}
        </div>
      </div>
    </section>
    <section class="msk-main">
      <div class="msk-top">
        ${lokal ? html`<span></span>` : html`<a href="#/beranda">${icon('arrow_back')} Beranda</a>`}
        <a id="bantuan" class="hidden" target="_blank" rel="noopener" href="#">${icon('support_agent')} Bantuan</a>
      </div>
      <div class="msk-center"><div class="msk-card">
        <h2>Masuk</h2>
        <p class="sub">${lokal ? 'Masuk sebagai peserta ujian di server sekolah.' : 'Pilih jenis akun Anda untuk melanjutkan.'}</p>
        ${lokal ? '' : html`<div class="msk-tabs" role="tablist" aria-label="Jenis akun">
          <button type="button" data-tab="staf" role="tab">${icon('badge')} Staf sekolah</button>
          <button type="button" data-tab="peserta" role="tab">${icon('school')} Peserta ujian</button></div>`}
        <div id="f-staf" class="msk-pane" role="tabpanel">
          ${api.session() ? html`<div class="alert blue"><div class="a-ic">${icon('verified_user')}</div>
            <div style="flex:1">Anda masih masuk sebagai staf.</div><a class="btn sm primary" href="#/">Lanjutkan</a></div>` : ''}
          <button class="btn-google" id="g-btn">${raw(GOOGLE)} Masuk dengan Google</button>
          <div class="msk-info">${icon('info')}<span>Untuk Super Admin, admin sekolah, guru, dan pengawas. Gunakan email Google yang sudah didaftarkan admin.</span></div>
          <div id="daftar-wrap" class="hidden"><div class="or">atau</div>
            <a class="msk-reg" id="daftar-link" href="#/daftar">${icon('domain_add')} Daftarkan sekolah Anda</a></div>
        </div>
        <form id="f-peserta" class="msk-pane col" autocomplete="on" novalidate role="tabpanel">
          ${lokal ? '' : html`<div class="field"><label for="kode">Kode Lembaga</label>
            <div class="input-ic">${icon('apartment')}<input class="input" id="kode" name="kode" value="${kodeTersimpan}" placeholder="contoh: SMPN3SMG" autocapitalize="characters" required></div></div>`}
          <div class="field"><label for="nis">NIS / Nomor Peserta</label>
            <div class="input-ic">${icon('badge')}<input class="input" id="nis" name="username" inputmode="numeric" placeholder="Nomor induk siswa" autocomplete="username" required></div></div>
          <div class="field"><label for="sandi">Kata Sandi</label>
            <div class="input-ic" style="position:relative">${icon('lock')}<input class="input" id="sandi" type="password" name="password" placeholder="Kata sandi dari sekolah" autocomplete="current-password" required style="padding-right:46px">
            <button type="button" class="btn ghost icon sm" id="eye" style="position:absolute;right:4px;top:5px" aria-label="Tampilkan sandi">${icon('visibility')}</button></div></div>
          <div class="err-text hidden" id="p-err" role="alert"></div>
          <button class="btn primary lg block mt-8" id="p-btn" type="submit">${icon('login')} Masuk Ujian</button>
          ${lokal ? html`<div class="alert cyan mt-8" style="margin-bottom:0"><div class="a-ic">${icon('wifi')}</div><div class="small">Terhubung ke server lokal sekolah, tidak perlu internet.</div></div>`
            : html`<div class="msk-info" style="margin-top:4px">${icon('badge')}<span>Kode lembaga, NIS, dan kata sandi tertera di kartu login dari sekolah.</span></div>`}
        </form>
      </div></div>
      <p class="msk-bottom">© ${new Date().getFullYear()} UjiKu CBT</p>
    </section></div>`.s;

  const setTab = (t) => {
    tab = t; localStorage.setItem('ujk.tab', t);
    el.querySelectorAll('[data-tab]').forEach((b) => { b.classList.toggle('on', b.dataset.tab === t); b.setAttribute('aria-selected', String(b.dataset.tab === t)); });
    $('#f-staf', el).classList.toggle('hidden', t !== 'staf');
    $('#f-peserta', el).classList.toggle('hidden', t !== 'peserta');
  };
  setTab(tab);
  el.querySelectorAll('[data-tab]').forEach((b) => b.addEventListener('click', () => setTab(b.dataset.tab)));
  $('#g-btn', el)?.addEventListener('click', () => {
    if (!api.configured) return toast('Belum dikonfigurasi', 'Isi config.js terlebih dahulu.', 'warn');
    api.signInWithGoogle(sessionStorage.getItem('ujk.next') || '#/');
  });
  if (!lokal && api.configured) api.rpc('daftar_info', {}, { anon: true }).then((i) => {
    if (i?.mode && i.mode !== 'nonaktif') $('#daftar-wrap', el)?.classList.remove('hidden');
    const wa = String(i?.kontak?.wa || '').replace(/\D/g, '');
    const b = $('#bantuan', el);
    if (wa && b) { b.href = `https://wa.me/${wa}?text=${encodeURIComponent('Halo tim UjiKu CBT, saya butuh bantuan untuk masuk.')}`; b.classList.remove('hidden'); }
  }).catch(() => {});
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
