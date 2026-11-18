import * as api from '../core/api.js';
import { html, icon, $, fmt } from '../core/ui.js';
import { pesertaNav } from './ps-home.js';

export default async function (ctx) {
  const { el, params, title } = ctx;
  title('Ujian Selesai');
  let r = null;
  try { r = JSON.parse(sessionStorage.getItem('ujk.hasil.' + params.id) || 'null'); } catch {}
  if (!r) {
    try {
      const h = await api.prpc('p_home');
      const u = h.ujian.find((x) => x.id === params.id);
      if (u) r = { judul: u.judul, mapel: u.mapel, tampilkan_nilai: u.tampilkan_nilai, nilai: u.nilai, total: u.jumlah_soal, terjawab: u.sesi?.terjawab };
    } catch {}
  }
  r = r || {};
  const lokal = api.MODE === 'lokal';
  const showScore = r.tampilkan_nilai && r.nilai != null;
  const n = Number(r.nilai || 0), kkm = Number(r.kkm || 75);
  const col = n >= kkm ? '#22A06B' : '#F7941D';
  el.innerHTML = html`<div class="p-app" style="position:relative;overflow:hidden"><div class="confetti" id="cf"></div>
    <div class="p-body" style="padding-top:40px;align-items:center;text-align:center">
      <div class="p-card" style="width:100%;align-items:center;padding:28px 20px">
        <div class="icon-tile" style="width:84px;height:84px;border-radius:50%;background:var(--green)">${icon('celebration')}</div>
        <h1 style="font-size:28px" class="mt-8">Ujian selesai!</h1>
        <p class="muted">${r.judul || ''}${r.mapel ? ' · ' + r.mapel : ''}</p>
        ${showScore ? html`<div class="score-ring" style="background:conic-gradient(${col} ${Math.min(100, n) * 3.6}deg, #E5E7EB 0)"><div><div><b style="color:${col}">${fmt.num(n, 1)}</b><div class="muted small">nilai</div></div></div></div>
          <div class="row wrap gap-8" style="justify-content:center">${r.benar != null ? html`<span class="badge b-green">Benar ${r.benar}</span><span class="badge b-red">Salah ${r.salah}</span>` : ''}<span class="badge b-gray">Kosong ${r.kosong ?? '–'}</span></div>
          <p class="mt-8 semi" style="color:${col}">${n >= kkm ? 'Selamat, nilaimu mencapai KKM!' : 'Tetap semangat, terus belajar ya!'}</p>`
        : html`<div class="alert ${lokal ? 'cyan' : 'blue'} mt-16" style="text-align:left"><div class="a-ic">${icon(lokal ? 'lan' : 'verified')}</div>
          <div class="small">${lokal ? html`<b>Jawaban tersimpan di server sekolah</b> dan akan dinilai setelah server tersinkron ke internet.` : html`<b>Jawaban sudah terkirim.</b> Nilai akan diumumkan oleh sekolah.`}
          ${r.total ? html`<br>Terjawab ${r.terjawab ?? '–'} dari ${r.total} soal.` : ''}</div></div>`}
        <a class="btn primary lg block mt-16" href="#/ujian">${icon('home')} Kembali ke Beranda</a></div></div></div>${pesertaNav('home')}`.s;
  const cf = $('#cf', el);
  const colors = ['#1565D8', '#F7941D', '#F15A3B', '#22B8E8', '#22A06B'];
  for (let i = 0; i < 60; i++) {
    const c = document.createElement('i');
    c.style.left = Math.random() * 100 + '%'; c.style.background = colors[i % colors.length];
    c.style.animationDuration = 2.4 + Math.random() * 2.4 + 's'; c.style.animationDelay = Math.random() * 0.8 + 's';
    cf.appendChild(c);
  }
}
