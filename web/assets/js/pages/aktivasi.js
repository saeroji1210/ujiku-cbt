import * as api from '../core/api.js';
import { html, raw, icon, $, fmt } from '../core/ui.js';
import { LOGO, GOOGLE } from '../core/art.js';

const PERAN = { admin: 'Administrator Lembaga', guru: 'Guru Pembuat Soal', pengawas: 'Pengawas Ujian', super_admin: 'Super Admin' };

export default async function ({ el, query, title }) {
  title('Aktivasi Akun');
  el.innerHTML = '<div class="page-loading" style="min-height:100vh"><span class="spin" style="color:var(--primary);width:28px;height:28px"></span></div>';
  let info = { ok: false };
  try { info = await api.rpc('invite_info', { token: query.t || '' }, { anon: true }); } catch (e) { info = { ok: false, err: e.message }; }

  const head = html`<header style="background:#fff;box-shadow:var(--sh-1)"><div class="row" style="max-width:1100px;margin:0 auto;padding:14px 20px">
    <span class="logo-mark">${raw(LOGO)}</span><div><div class="bold" style="font-size:18px;color:var(--primary)">UjiKu CBT</div><div class="tiny muted">Sistem Ujian Terpusat</div></div>
    <span class="badge b-gray hide-sm" style="margin-left:10px">${icon('lock')} Aktivasi aman via Google</span></div></header>`;

  if (!info.ok) {
    el.innerHTML = html`${head}<div class="auth-form" style="min-height:70vh"><div class="auth-card" style="text-align:center">
      <div class="empty" style="padding:0"><div class="e-art">${icon('link_off')}</div><h3>Tautan undangan tidak berlaku</h3>
      <p>Tautan ini sudah dipakai, kedaluwarsa, atau salah salin. Jika akun Anda sudah aktif, langsung masuk saja.</p>
      <a class="btn primary mt-8" href="#/masuk">${icon('login')} Ke halaman masuk</a></div></div></div>`.s;
    return;
  }
  const peran = (info.roles || []).map((r) => PERAN[r] || r).join(' + ');
  el.innerHTML = html`${head}<div style="max-width:1100px;margin:0 auto;padding:24px 16px 60px">
    <div class="card stepper" style="--n:3;margin-bottom:20px">
      <div class="step on"><div class="n">1</div><div><div class="sl">Langkah 1 · Sedang berjalan</div><div class="st">Verifikasi Akun Google</div></div></div>
      <div class="step"><div class="n">2</div><div><div class="sl">Langkah 2</div><div class="st">Konfirmasi Profil Lembaga</div></div></div>
      <div class="step"><div class="n">3</div><div><div class="sl">Langkah 3</div><div class="st">Siap Pakai & Masuk</div></div></div>
    </div>
    <div class="card" style="padding:28px">
      <div class="alert blue" style="padding:22px;align-items:flex-start">
        <div class="icon-tile" style="background:var(--primary);width:60px;height:60px">${icon('school')}</div>
        <div><span class="badge b-blue">${raw('<i class="d"></i>')} Undangan Resmi</span>
          <h2 class="mt-8" style="font-size:24px">Aktivasi Akun ${PERAN[(info.roles || [])[0]] || 'Staf'}</h2>
          <p class="muted mt-4">Selamat datang di <b class="c-primary">UjiKu CBT</b>! Anda diundang sebagai <b>${peran}</b>${info.lembaga ? html` untuk <b>${info.lembaga}</b>` : ''}.</p></div>
      </div>
      ${info.lembaga ? html`<div class="row wrap" style="background:var(--slate-50);border-radius:16px;padding:18px;margin:18px 0">
        <div class="icon-tile soft">${icon('domain')}</div>
        <div style="flex:1;min-width:200px"><div class="row gap-8 wrap"><b style="font-size:17px">${info.lembaga}</b>${info.npsn ? html`<span class="badge b-gray">NPSN: ${info.npsn}</span>` : ''}</div>
          <div class="muted small mt-4">${icon('verified_user')} Wewenang: <b class="c-primary">${peran}</b></div></div>
        ${info.saldo && (info.roles || []).includes('admin') ? html`<div class="alert orange" style="margin:0;padding:10px 14px"><div class="a-ic">${icon('toll')}</div>
          <div><div class="tiny bold c-orange" style="letter-spacing:.06em">SALDO AWAL</div><b class="c-orange">${fmt.num(info.saldo)} Poin CBT siap dipakai</b></div></div>` : ''}
      </div>` : ''}
      <div class="form-grid">
        <div class="field"><label>Email yang diundang</label><div class="input-ic">${icon('mail')}<input class="input soft" value="${info.email}" readonly></div>
          <div class="hint">Masuklah dengan akun Google yang memakai email ini.</div></div>
        <div class="field"><label>Nama</label><div class="input-ic">${icon('person')}<input class="input soft" value="${info.nama}" readonly></div>
          <div class="hint">Nama dapat diubah admin bila perlu.</div></div>
      </div>
      <div class="col mt-24">
        <label class="check"><input type="checkbox" id="c1"> Saya menyetujui ketentuan layanan dan kebijakan privasi data peserta didik UjiKu CBT.</label>
        <label class="check"><input type="checkbox" id="c2"> Saya bertanggung jawab menjaga kerahasiaan bank soal dan integritas ruang ujian.</label>
      </div>
      <button class="btn-google mt-24" id="go" style="height:56px;background:var(--primary);color:#fff;border:0" disabled>${raw(GOOGLE)} Aktivasi dengan Google & Lanjut ke Dashboard</button>
      <div class="row wrap mt-16 small muted" style="justify-content:space-between">
        <span>${icon('shield')} Login aman dengan Google — UjiKu tidak menyimpan kata sandi Anda.</span>
        ${info.kontak?.wa ? html`<a href="https://wa.me/${info.kontak.wa}" target="_blank" rel="noopener">${icon('support_agent')} Butuh bantuan? WhatsApp</a>` : ''}
      </div>
    </div></div>`.s;
  const btn = $('#go', el);
  const upd = () => { btn.disabled = !($('#c1', el).checked && $('#c2', el).checked); btn.style.opacity = btn.disabled ? '.55' : '1'; };
  $('#c1', el).onchange = upd; $('#c2', el).onchange = upd; upd();
  btn.onclick = () => { sessionStorage.setItem('ujk.invite_email', info.email); api.signInWithGoogle('#/'); };
}
