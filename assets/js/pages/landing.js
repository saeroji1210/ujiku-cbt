// Halaman beranda publik (landing): pengunjung tanpa sesi di "#/" dan "#/beranda".
// Ciri utama: demo ujian 3 soal di mockup HP — nilai keluar seketika & pindah tab tercatat.
import * as api from '../core/api.js';
import { html, raw, icon, $, $$, fmt } from '../core/ui.js';
import { LOGO } from '../core/art.js';

const CSS = `
.lp{--ink:#1B2A4E;--blue:#1565D8;--orange:#F7941D;--green:#22A06B;--sky:#EBF3FC;--line:#E2E8F0;
  background:#fff;color:#334155;font-size:17px;line-height:1.6;min-height:100vh;overflow-x:clip}
.lp h1,.lp h2,.lp h3{color:var(--ink);margin:0;letter-spacing:-.02em;text-wrap:balance}
.lp h1{font-size:clamp(36px,5.4vw,62px);line-height:1.04;font-weight:800;letter-spacing:-.035em}
.lp h2{font-size:clamp(28px,3.4vw,42px);line-height:1.12;font-weight:800}
.lp h3{font-size:19px;line-height:1.3;font-weight:700}
.lp p{margin:0}
.lp a{color:var(--blue);font-weight:600}
.lp-w{max-width:1160px;margin:0 auto;padding:0 24px}
.lp-sec{padding:96px 0}
.lp-lead{font-size:clamp(17px,1.5vw,19px);color:#475569;max-width:60ch}
.lp-btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;height:52px;padding:0 24px;border-radius:14px;
  font:inherit;font-size:16px;font-weight:700;text-decoration:none;border:2px solid transparent;cursor:pointer;white-space:nowrap;transition:transform .15s,background .15s}
.lp-btn:active{transform:translateY(1px)}
.lp-btn.lp-or{background:var(--orange);color:#fff}.lp-btn.lp-or:hover{background:#E5830C}
.lp-btn.lp-bl{background:var(--blue);color:#fff}.lp-btn.lp-bl:hover{background:#0F55BD}
.lp-btn.lp-ol{background:#fff;color:var(--ink);border-color:#CBD5E1}.lp-btn.lp-ol:hover{border-color:var(--ink)}
.lp-btn.lp-sm{height:42px;padding:0 16px;font-size:15px;border-radius:12px}
.lp :focus-visible{outline:3px solid #3B9BF5;outline-offset:3px;border-radius:12px}

/* header */
.lp-hd{position:sticky;top:0;z-index:30;background:rgba(255,255,255,.9);backdrop-filter:saturate(1.4) blur(10px);-webkit-backdrop-filter:blur(10px);
  border-bottom:1px solid transparent;transition:border-color .2s}
.lp-hd.sc{border-bottom-color:var(--line)}
.lp-hd .lp-w{display:flex;align-items:center;gap:20px;height:72px}
.lp-brand{display:flex;align-items:center;gap:10px;text-decoration:none;color:var(--ink);font-weight:800;font-size:19px;letter-spacing:-.01em}
.lp-brand .logo-mark{width:38px;height:38px}
.lp-nav{display:flex;gap:4px;margin-left:12px}
.lp-nav button{background:none;border:0;font:inherit;font-size:15px;font-weight:600;color:#475569;padding:8px 12px;border-radius:10px;cursor:pointer}
.lp-nav button:hover{color:var(--ink);background:#F1F5F9}
.lp-hd .act{margin-left:auto;display:flex;gap:10px}

/* hero */
.lp-hero{padding:56px 0 88px;background:linear-gradient(180deg,#fff 0,#F4F6FA 100%)}
.lp-hero .lp-w{display:grid;grid-template-columns:minmax(0,1.1fr) minmax(0,.9fr);gap:56px;align-items:center}
.lp-hero .lp-lead{margin-top:22px}
.lp-cta{display:flex;flex-wrap:wrap;gap:12px;margin-top:32px}
.lp-note{margin-top:22px;font-size:15px;color:#64748B;display:grid;gap:6px}
.lp-note > span{display:flex;gap:8px;align-items:flex-start}
.lp-note .ms{color:var(--green);flex:none;margin-top:3px}

/* panggung demo: LJK di belakang HP */
.lp-stage{position:relative;display:grid;padding:28px 0 0}
.lp-ljk{position:absolute;top:0;bottom:96px;left:0;width:74%;border-radius:28px;background:var(--blue);overflow:hidden;
  display:grid;gap:7px;padding:28px 26px;align-content:start;transform:rotate(-3deg)}
.lp-ljk i{display:flex;align-items:center;gap:6px;font-style:normal;font-size:11px;font-weight:700;color:rgba(255,255,255,.6)}
.lp-ljk i b{width:18px;text-align:right;font-weight:700;margin-right:2px}
.lp-ljk i u{width:15px;height:15px;border-radius:50%;border:1.5px solid rgba(255,255,255,.5);text-decoration:none;
  font-size:8px;display:grid;place-items:center;color:rgba(255,255,255,.6)}
.lp-ljk i u.f{background:#fff;border-color:transparent;color:transparent}
.lp-phone{position:relative;justify-self:end;margin-right:3%;width:min(330px,100%);border-radius:40px;background:var(--ink);padding:11px;
  box-shadow:0 30px 60px -20px rgba(27,42,78,.55),0 0 0 1px rgba(255,255,255,.06) inset}
.lp-phone::before{content:"";position:absolute;top:18px;left:50%;width:84px;height:22px;margin-left:-42px;border-radius:12px;background:var(--ink);z-index:2}
.lp-scr{background:#F4F6FA;border-radius:30px;min-height:560px;overflow:hidden;display:flex;flex-direction:column;font-size:14px}
.lp-cap{position:relative;justify-self:end;margin:26px 3% 0 0;font-size:14px;color:#64748B;text-align:center;width:min(330px,100%)}

/* layar demo */
.dm-top{background:#fff;padding:46px 18px 12px;display:flex;align-items:center;gap:10px;border-bottom:1px solid var(--line)}
.dm-top b{display:block;color:var(--ink);font-size:15px}
.dm-top small{color:#64748B;font-size:12px}
.dm-timer{margin-left:auto;font-variant-numeric:tabular-nums;font-weight:800;color:var(--ink);background:var(--sky);padding:5px 10px;border-radius:10px;font-size:14px}
.dm-timer.low{background:#FEE2E2;color:#B91C1C}
.dm-warn{margin:12px 14px 0;background:#FFF4E5;color:#92400E;border-radius:12px;padding:10px 12px;font-size:12.5px;line-height:1.45;display:flex;gap:8px}
.dm-warn .ms{flex:none;color:#F7941D}
.dm-body{padding:16px 14px;display:flex;flex-direction:column;gap:12px;flex:1}
.dm-mapel{align-self:flex-start;font-size:11.5px;font-weight:700;color:var(--blue);background:var(--sky);padding:3px 10px;border-radius:99px}
.dm-q{font-size:16px;font-weight:600;color:var(--ink);line-height:1.45}
.dm-opt{display:flex;align-items:center;gap:12px;width:100%;text-align:left;background:#fff;border:2px solid var(--line);border-radius:14px;
  padding:11px 12px;font:inherit;font-size:15px;color:#1F2937;cursor:pointer;transition:border-color .12s,background .12s}
.dm-opt:hover{border-color:#93C5FD}
.dm-opt .k{width:30px;height:30px;border-radius:9px;background:#F1F5F9;display:grid;place-items:center;font-weight:800;color:#475569;flex:none}
.dm-opt[aria-pressed=true]{border-color:var(--blue);background:#F5F9FF}
.dm-opt[aria-pressed=true] .k{background:var(--blue);color:#fff}
.dm-foot{display:flex;align-items:center;gap:8px;padding:12px 14px 18px;background:#fff;border-top:1px solid var(--line)}
.dm-dots{display:flex;gap:6px}
.dm-dots span{width:28px;height:28px;border-radius:8px;display:grid;place-items:center;font-size:12px;font-weight:700;background:#F1F5F9;color:#64748B}
.dm-dots span.on{outline:2px solid var(--blue);outline-offset:1px}
.dm-dots span.isi{background:var(--blue);color:#fff}
.dm-next{margin-left:auto;height:42px;padding:0 18px;border-radius:12px;border:0;background:var(--blue);color:#fff;font:inherit;font-weight:700;font-size:14px;cursor:pointer}
.dm-next:disabled{background:#CBD5E1;cursor:not-allowed}
.dm-next.fin{background:var(--green)}
.dm-res{padding:46px 18px 20px;display:flex;flex-direction:column;align-items:center;text-align:center;gap:10px;flex:1}
.dm-score{width:132px;height:132px;border-radius:50%;display:grid;place-items:center;margin-top:6px;
  background:conic-gradient(var(--c) calc(var(--p)*1%),#E2E8F0 0);animation:dm-pop .5s cubic-bezier(.2,.9,.3,1.3)}
.dm-score div{width:108px;height:108px;border-radius:50%;background:#F4F6FA;display:grid;place-items:center;align-content:center}
.dm-score b{font-size:42px;font-weight:800;color:var(--ink);line-height:1}
.dm-score small{font-size:11px;color:#64748B}
@keyframes dm-pop{from{transform:scale(.6);opacity:0}}
.dm-res h4{margin:4px 0 0;font-size:17px;color:var(--ink)}
.dm-res p{font-size:13px;color:#64748B;line-height:1.45}
.dm-list{width:100%;display:grid;gap:6px;margin:6px 0;text-align:left}
.dm-list div{display:flex;gap:8px;align-items:center;background:#fff;border-radius:10px;padding:8px 10px;font-size:12.5px}
.dm-list .ms{flex:none}
.dm-list .y{color:var(--green)} .dm-list .n{color:#DC2626}
.dm-again{margin-top:auto;height:42px;padding:0 18px;border-radius:12px;border:2px solid var(--line);background:#fff;font:inherit;font-weight:700;font-size:14px;color:var(--ink);cursor:pointer}

/* perbandingan */
.lp-cmp{margin-top:44px;border-top:2px solid var(--ink)}
.lp-cmp .r{display:grid;grid-template-columns:200px minmax(0,1fr) minmax(0,1.25fr);gap:28px;padding:22px 0;border-bottom:1px solid var(--line);align-items:start}
.lp-cmp .r.h{padding:14px 0;font-size:14px;font-weight:700;color:#64748B}
.lp-cmp .r.h .u{color:var(--blue)}
.lp-cmp .t{font-weight:700;color:var(--ink)}
.lp-cmp .o{color:#94A3B8}
.lp-cmp .u{color:#1F2937;display:flex;gap:10px}
.lp-cmp .u .ms{color:var(--green);flex:none;margin-top:3px}
.lp-cmp .lb{display:none}

/* peran */
.lp-roles{margin-top:44px;display:grid;grid-template-columns:repeat(4,minmax(0,1fr));border:1px solid var(--line);border-radius:24px;overflow:hidden}
.lp-roles > div{padding:28px 24px;display:flex;flex-direction:column;gap:10px;border-left:1px solid var(--line)}
.lp-roles > div:first-child{border-left:0}
.lp-roles .ic{width:46px;height:46px;border-radius:14px;display:grid;place-items:center;color:#fff}
.lp-roles .ic .ms{font-size:24px}
.lp-roles p{font-size:15px;color:#475569}
.lp-roles .via{margin-top:auto;padding-top:10px;font-size:13px;color:#64748B;font-weight:600}

/* langkah */
.lp-steps{margin-top:44px;display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:28px;counter-reset:s;list-style:none;padding:0}
.lp-steps li{position:relative;padding-top:64px}
.lp-steps li::before{counter-increment:s;content:counter(s);position:absolute;top:0;left:0;width:46px;height:46px;border-radius:50%;
  background:var(--ink);color:#fff;display:grid;place-items:center;font-weight:800;font-size:19px}
.lp-steps li::after{content:"";position:absolute;top:23px;left:58px;right:-16px;height:2px;background:repeating-linear-gradient(90deg,#CBD5E1 0 6px,transparent 6px 12px)}
.lp-steps li:last-child::after{display:none}
.lp-steps p{margin-top:8px;font-size:15px;color:#475569}

/* server lokal */
.lp-dark{background:var(--ink);color:#CBD5E1}
.lp-dark h2{color:#fff}
.lp-dark .lp-lead{color:#CBD5E1}
.lp-dark .lp-w{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.1fr);gap:56px;align-items:center}
.lp-flow{display:grid;gap:10px}
.lp-flow .n{display:flex;align-items:center;gap:14px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.1);border-radius:16px;padding:14px 16px}
.lp-flow .n .ic{width:42px;height:42px;border-radius:12px;display:grid;place-items:center;color:#fff;flex:none}
.lp-flow .n b{color:#fff;display:block;font-size:16px}
.lp-flow .n small{color:#94A3B8;font-size:13.5px}
.lp-flow .ar{display:flex;align-items:center;gap:10px;padding-left:30px;font-size:13px;color:#94A3B8}
.lp-flow .ar::before{content:"";width:2px;height:22px;background:repeating-linear-gradient(180deg,#64748B 0 4px,transparent 4px 8px)}
.lp-dark .lp-btn.lp-ol{background:transparent;color:#fff;border-color:rgba(255,255,255,.35)}
.lp-dark .lp-btn.lp-ol:hover{border-color:#fff}

/* biaya */
.lp-price{margin-top:44px;display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.3fr);gap:28px;align-items:start}
.lp-calc{background:var(--sky);border-radius:24px;padding:28px}
.lp-calc .eq{display:flex;flex-wrap:wrap;align-items:center;gap:10px;margin-top:16px;font-weight:700;color:var(--ink);font-size:17px}
.lp-calc .eq span{background:#fff;border-radius:12px;padding:8px 12px}
.lp-calc .eq .res{background:var(--blue);color:#fff}
.lp-pk{display:grid;gap:12px}
.lp-pk .p{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:4px 16px;align-items:center;border:2px solid var(--line);border-radius:18px;padding:18px 20px}
.lp-pk .p.pop{border-color:var(--orange)}
.lp-pk .p b{color:var(--ink);font-size:17px}
.lp-pk .p .hg{font-size:22px;font-weight:800;color:var(--ink);text-align:right}
.lp-pk .p small{color:#64748B;font-size:13.5px}
.lp-pk .tag{display:inline-block;margin-left:8px;font-size:12px;font-weight:700;color:#B45309;background:#FFF4E5;padding:2px 8px;border-radius:99px;vertical-align:2px}
.lp-trial{display:flex;gap:14px;align-items:center;border-radius:18px;padding:18px 20px;background:#DCFCE7;color:#14532D;font-size:15px}
.lp-trial .ms{color:var(--green);font-size:28px;flex:none}

/* tanya jawab */
.lp-faq{margin-top:36px;max-width:820px;border-top:1px solid var(--line)}
.lp-faq details{border-bottom:1px solid var(--line)}
.lp-faq summary{list-style:none;cursor:pointer;padding:20px 0;font-weight:700;color:var(--ink);font-size:17px;display:flex;gap:16px;align-items:center}
.lp-faq summary::-webkit-details-marker{display:none}
.lp-faq summary::after{content:"+";margin-left:auto;font-size:24px;font-weight:500;color:var(--blue);transition:transform .2s}
.lp-faq details[open] summary::after{transform:rotate(45deg)}
.lp-faq details p{padding:0 40px 22px 0;color:#475569;font-size:16px}

/* ajakan akhir */
.lp-end{padding:0 0 96px}
.lp-end .lp-w > div{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));border-radius:28px;overflow:hidden}
.lp-end .a{background:var(--orange);color:#fff;padding:40px}
.lp-end .b{background:var(--sky);padding:40px}
.lp-end h3{font-size:26px;letter-spacing:-.02em}
.lp-end .a h3{color:#fff}
.lp-end p{margin:10px 0 24px;font-size:16px}
.lp-end .a p{color:#FFF7ED}
.lp-end .a .lp-btn{background:#fff;color:#B45309}
.lp-end .b p{color:#475569}

.lp-ft{border-top:1px solid var(--line);padding:36px 0 48px;font-size:14.5px;color:#64748B}
.lp-ft .lp-w{display:flex;flex-wrap:wrap;gap:24px 48px;align-items:flex-start}
.lp-ft .c{display:grid;gap:6px}
.lp-ft b{color:var(--ink)}
.lp-ft .cp{margin-left:auto;align-self:flex-end}

@media (max-width:1023px){
  .lp-nav{display:none}
  .lp-hero .lp-w,.lp-dark .lp-w,.lp-price{grid-template-columns:minmax(0,1fr)}
  .lp-roles{grid-template-columns:repeat(2,minmax(0,1fr))}
  .lp-roles > div:nth-child(3){border-left:0}
  .lp-roles > div:nth-child(n+3){border-top:1px solid var(--line)}
  .lp-steps{grid-template-columns:repeat(2,minmax(0,1fr))}
  .lp-steps li::after{display:none}
  .lp-phone,.lp-cap{justify-self:center;margin-right:0}
  .lp-ljk{left:50%;width:min(560px,100%);transform:translateX(-50%) rotate(-3deg)}
}
@media (max-width:640px){
  .lp{font-size:16px}
  .lp-w{padding:0 18px}
  .lp-sec{padding:64px 0}
  .lp-hd .lp-w{height:62px;gap:10px}
  .lp-brand .bt{display:none}
  .lp-hd .act .lp-btn{height:40px;padding:0 13px;font-size:14px}
  .lp-hero{padding:28px 0 56px}
  .lp-cta .lp-btn{flex:1 1 100%}
  .lp-stage{padding-top:20px}
  .lp-cmp .r{grid-template-columns:minmax(0,1fr);gap:6px;padding:18px 0}
  .lp-cmp .r.h{display:none}
  .lp-cmp .lb{display:inline;font-weight:700;margin-right:6px}
  .lp-cmp .o{font-size:14.5px}
  .lp-roles{grid-template-columns:minmax(0,1fr)}
  .lp-roles > div{border-left:0;border-top:1px solid var(--line)}
  .lp-roles > div:first-child{border-top:0}
  .lp-steps{grid-template-columns:minmax(0,1fr);gap:22px}
  .lp-steps li{padding:0 0 0 64px}
  .lp-end .lp-w > div{grid-template-columns:minmax(0,1fr)}
  .lp-end .a,.lp-end .b{padding:30px 24px}
  .lp-faq details p{padding-right:0}
  .lp-ft .cp{margin-left:0}
}
@media (prefers-reduced-motion:reduce){.dm-score{animation:none}.lp-faq summary::after{transition:none}}
`;

const SOAL = [
  { mapel: 'Matematika', q: 'Hasil dari 3/4 + 1/8 adalah …', o: ['5/8', '7/8', '1', '4/12'], k: 1 },
  { mapel: 'Bahasa Indonesia', q: 'Kata baku yang tepat adalah …', o: ['Apotik', 'Resiko', 'Kualitas', 'Nasehat'], k: 2 },
  { mapel: 'IPA', q: 'Bagian tumbuhan yang paling banyak melakukan fotosintesis adalah …', o: ['Akar', 'Batang', 'Daun', 'Bunga'], k: 2 },
];
const DURASI = 120;
const waUrl = (no, pesan) => `https://wa.me/${String(no || '').replace(/\D/g, '').replace(/^0/, '62')}${pesan ? '?text=' + encodeURIComponent(pesan) : ''}`;
const acak = (n) => { const a = [...Array(n).keys()]; for (let i = n - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

export default async function ({ el, title, alive }) {
  title('Ujian berbasis komputer untuk sekolah');
  if (!document.getElementById('lp-css')) { const s = document.createElement('style'); s.id = 'lp-css'; s.textContent = CSS; document.head.appendChild(s); }

  // data publik (mode pendaftaran, poin uji coba, paket, kontak); halaman tetap tampil bila gagal
  let info = { mode: 'persetujuan', poin_trial: 0, poin_per_peserta: 1, paket: [], kontak: {} };
  try { info = { ...info, ...(await api.rpc('daftar_info', {}, { anon: true })) }; } catch {}
  if (!alive()) return;
  const per = Math.max(1, Number(info.poin_per_peserta) || 1);
  const trial = info.mode === 'nonaktif' ? 0 : Number(info.poin_trial) || 0;
  const kontak = info.kontak || {};
  const staf = !!api.session(), siswa = !!api.peserta.get();
  const tanyaWa = kontak.wa ? waUrl(kontak.wa, 'Halo tim UjiKu CBT, saya ingin bertanya tentang UjiKu CBT untuk sekolah kami.') : '';

  const tombolAkun = staf ? html`<a class="lp-btn lp-bl lp-sm" href="#/">${icon('dashboard')} Buka dashboard</a>`
    : siswa ? html`<a class="lp-btn lp-bl lp-sm" href="#/ujian">${icon('play_arrow')} Lanjutkan ujian</a>`
    : html`<a class="lp-btn lp-ol lp-sm" href="#/masuk">Masuk</a><a class="lp-btn lp-or lp-sm" href="#/daftar">Daftarkan sekolah</a>`;

  const ljk = Array.from({ length: 22 }, (_, i) => {
    const isi = (i * 7 + 3) % 5;
    return html`<i><b>${i + 1}</b>${['A', 'B', 'C', 'D', 'E'].map((h, j) => html`<u class="${j === isi && i % 7 !== 6 ? 'f' : ''}">${h}</u>`)}</i>`;
  });

  const banding = [
    ['Menyiapkan soal', 'Diketik, lalu difotokopi untuk setiap siswa', 'Ditulis langsung di aplikasi atau diimpor dari berkas Word'],
    ['Mengoreksi', 'Guru memeriksa lembar jawaban satu per satu', 'Dinilai otomatis begitu siswa menekan Selesai'],
    ['Nilai sampai ke siswa', 'Beberapa hari kemudian', 'Saat itu juga, bila guru mengizinkan nilai ditampilkan'],
    ['Mencontek', 'Sulit diawasi di kelas besar', 'Soal dan opsi diacak per siswa; pindah aplikasi tercatat dan sesi bisa dikunci'],
    ['Mengevaluasi soal', 'Jarang sempat dilakukan', 'Tingkat kesukaran dan daya beda setiap soal dihitung otomatis'],
    ['Laporan', 'Direkap manual', 'Grafik dan tabel nilai, siap diunduh sebagai Excel atau PDF'],
  ];
  const peran = [
    ['Admin sekolah', 'admin_panel_settings', '#1565D8', 'Mengelola guru dan siswa, menerbitkan jadwal ujian, membeli poin, dan melihat laporan seluruh sekolah.', 'Masuk dengan akun Google'],
    ['Guru', 'history_edu', '#22A06B', 'Menyusun bank soal dari HP atau laptop, mengimpor soal dari Word, dan membaca analisis setiap soal.', 'Diundang admin, masuk dengan Google'],
    ['Pengawas', 'visibility', '#F7941D', 'Memantau siapa yang sedang mengerjakan, membuka sesi yang terkunci, dan menambah waktu.', 'Diundang admin, masuk dengan Google'],
    ['Siswa', 'school', '#22B8E8', 'Mengerjakan dari HP, tablet, atau komputer. Jawaban tersimpan otomatis walau sinyal putus sebentar.', 'Masuk dengan Kode Lembaga, NIS, dan sandi'],
  ];
  const langkah = [
    ['Daftarkan sekolah', 'Masuk dengan akun Google pengelola sekolah, lalu isi data sekolah dan NPSN.'],
    ['Undang guru, masukkan siswa', 'Guru diundang lewat email Google. Data siswa diimpor dari Excel dan kartu login bisa langsung dicetak.'],
    ['Siapkan soal', 'Guru menulis soal di editor atau mengimpor berkas Word memakai templat yang disediakan.'],
    ['Terbitkan ujian', 'Bagikan token ke siswa, pantau selama ujian, lalu unduh laporan nilai setelah selesai.'],
  ];
  const faq = [
    ['Apakah siswa perlu memasang aplikasi?', 'Tidak. Cukup browser di HP, tablet, atau komputer. Bila ingin, UjiKu bisa ditambahkan ke layar utama HP sehingga terbuka seperti aplikasi.'],
    ['Bisakah siswa dicegah membuka aplikasi lain?', 'Browser tidak bisa mengunci HP sepenuhnya. UjiKu mencatat setiap kali siswa meninggalkan halaman ujian, mengunci sesi setelah batas yang ditentukan sekolah, dan mengacak soal serta opsi. Untuk penguncian penuh, gunakan aplikasi exam browser di perangkat sekolah.'],
    ['Bagaimana bila sinyal putus saat ujian?', 'Jawaban disimpan di perangkat dan dikirim ulang otomatis saat sinyal kembali. Sisa waktu mengikuti jam server, jadi tidak berubah walau jam HP diubah. Sekolah tanpa internet stabil bisa memakai server lokal.'],
    ['Bentuk soal apa yang didukung?', 'Pilihan ganda dengan 2 sampai 6 opsi. Soal dan opsi boleh berisi gambar, dan setiap soal bisa diberi bobot nilai sendiri.'],
    ['Berkas Word seperti apa yang bisa diimpor?', 'Berkas .docx dengan pola soal, opsi, dan kunci. Templat berisi contoh bisa diunduh di halaman impor, termasuk contoh soal bergambar.'],
    ['Apakah data sekolah kami terpisah dari sekolah lain?', 'Ya. Setiap lembaga hanya bisa melihat datanya sendiri, dan pemeriksaannya dilakukan di database, bukan hanya di tampilan.'],
    ['Bagaimana cara membeli poin?', 'Admin sekolah memilih paket di menu Poin, mentransfer ke rekening yang tertera, lalu mengunggah bukti transfer. Poin masuk setelah pembayaran diverifikasi.'],
  ];
  const paket = (info.paket || []).slice(0, 4);
  const contoh = 3 * 32;

  el.innerHTML = html`<div class="lp">
  <header class="lp-hd" id="lp-hd"><div class="lp-w">
    <a class="lp-brand" href="#/beranda" aria-label="UjiKu CBT, beranda"><span class="logo-mark">${raw(LOGO)}</span><span class="bt">UjiKu CBT</span></a>
    <nav class="lp-nav" aria-label="Bagian halaman">
      ${[['lp-banding', 'Keunggulan'], ['lp-langkah', 'Cara mulai'], ['lp-lokal', 'Tanpa internet'], ['lp-biaya', 'Biaya'], ['lp-faq', 'Tanya jawab']]
        .map(([id, l]) => html`<button type="button" data-to="${id}">${l}</button>`)}
    </nav>
    <div class="act">${tombolAkun}</div>
  </div></header>

  <main>
  <section class="lp-hero"><div class="lp-w">
    <div>
      <h1>Siswa menekan Selesai, nilai langsung keluar.</h1>
      <p class="lp-lead">UjiKu CBT menggantikan lembar soal dan LJK di sekolah Anda. Guru menulis soal atau mengimpornya dari Word, siswa mengerjakan di HP atau komputer, dan sekolah langsung mendapat nilai beserta analisis setiap butir soal.</p>
      <div class="lp-cta">
        ${staf || siswa ? tombolAkun : html`<a class="lp-btn lp-or" href="#/daftar">${icon('domain_add')} Daftarkan sekolah</a><a class="lp-btn lp-ol" href="#/masuk">${icon('login')} Masuk</a>`}
      </div>
      <div class="lp-note">
        ${trial ? html`<span>${icon('check_circle')}<span>Lembaga baru mendapat ${fmt.num(trial)} poin uji coba, cukup untuk ${fmt.num(Math.floor(trial / per))} siswa mengikuti satu ujian.</span></span>` : ''}
        <span>${icon('check_circle')}<span>Siswa yang akan ujian: <a href="#/masuk?peserta=1">masuk dengan Kode Lembaga dan NIS</a>.</span></span>
      </div>
    </div>
    <div class="lp-stage">
      <div class="lp-ljk" aria-hidden="true">${ljk}</div>
      <div class="lp-phone"><div class="lp-scr" id="demo" role="region" aria-label="Demo ujian: jawab tiga soal" aria-live="polite"></div></div>
      <p class="lp-cap">Coba sekarang: jawab 3 soal lalu tekan Selesai. Pindah ke tab lain sebentar juga boleh.</p>
    </div>
  </div></section>

  <section class="lp-sec" id="lp-banding"><div class="lp-w">
    <h2>Yang berubah saat ujian pindah dari kertas</h2>
    <div class="lp-cmp" role="table" aria-label="Perbandingan ujian kertas dan UjiKu CBT">
      <div class="r h" role="row"><span role="columnheader"></span><span role="columnheader">Ujian kertas</span><span class="u" role="columnheader">Dengan UjiKu CBT</span></div>
      ${banding.map(([t, o, u]) => html`<div class="r" role="row"><span class="t" role="rowheader">${t}</span>
        <span class="o" role="cell"><span class="lb">Kertas:</span>${o}</span>
        <span class="u" role="cell">${icon('check_circle')}<span>${u}</span></span></div>`)}
    </div>
  </div></section>

  <section class="lp-sec" style="background:#F4F6FA"><div class="lp-w">
    <h2>Satu aplikasi untuk semua orang di sekolah</h2>
    <div class="lp-roles">
      ${peran.map(([n, ic, c, t, v]) => html`<div><span class="ic" style="background:${c}">${icon(ic)}</span><h3>${n}</h3><p>${t}</p><span class="via">${v}</span></div>`)}
    </div>
  </div></section>

  <section class="lp-sec" id="lp-langkah"><div class="lp-w">
    <h2>Empat langkah sampai ujian pertama</h2>
    <ol class="lp-steps">${langkah.map(([j, t]) => html`<li><h3>${j}</h3><p>${t}</p></li>`)}</ol>
    ${staf || siswa ? '' : html`<div class="lp-cta"><a class="lp-btn lp-or" href="#/daftar">${icon('domain_add')} Daftarkan sekolah</a></div>`}
  </div></section>

  <section class="lp-sec lp-dark" id="lp-lokal"><div class="lp-w">
    <div>
      <h2>Internet sekolah tidak stabil? Ujian tetap berjalan.</h2>
      <p class="lp-lead" style="margin-top:20px">Dengan paket server lokal, sebuah mini PC di sekolah menyajikan ujian lewat WiFi sekolah. Jawaban siswa tersimpan di server itu, lalu dikirim ke UjiKu saat internet kembali, dan nilainya muncul di laporan seperti biasa.</p>
      <p class="lp-lead" style="margin-top:14px">Kunci jawaban tidak pernah disimpan di server sekolah.</p>
      ${tanyaWa ? html`<div class="lp-cta"><a class="lp-btn lp-ol" target="_blank" rel="noopener" href="${tanyaWa}">${icon('chat')} Tanyakan paket server lokal</a></div>` : ''}
    </div>
    <div class="lp-flow" role="list" aria-label="Alur ujian dengan server lokal">
      <div class="n" role="listitem"><span class="ic" style="background:#22B8E8">${icon('smartphone')}</span><div><b>HP siswa</b><small>Membuka alamat server lewat WiFi sekolah</small></div></div>
      <div class="ar" aria-hidden="true">tanpa internet</div>
      <div class="n" role="listitem"><span class="ic" style="background:#F7941D">${icon('dns')}</span><div><b>Server UjiKu di sekolah</b><small>Menyimpan jawaban, tahan listrik padam</small></div></div>
      <div class="ar" aria-hidden="true">saat internet tersedia</div>
      <div class="n" role="listitem"><span class="ic" style="background:#1565D8">${icon('cloud_done')}</span><div><b>UjiKu CBT</b><small>Menilai jawaban dan menyusun laporan</small></div></div>
    </div>
  </div></section>

  <section class="lp-sec" id="lp-biaya"><div class="lp-w">
    <h2>Bayar sesuai jumlah siswa yang ujian</h2>
    <div class="lp-price">
      <div class="lp-calc">
        <p>Sekolah membeli poin. Setiap siswa yang mengikuti satu ujian memakai <b>${per} poin</b>. Poin baru terpakai saat ujian diterbitkan, dan kembali utuh bila ujian dibatalkan sebelum dimulai.</p>
        <div class="eq" aria-label="Contoh perhitungan"><span>3 kelas × 32 siswa</span>${per > 1 ? html`<span>× ${per}</span>` : ''}<span>=</span><span class="res">${fmt.num(contoh * per)} poin</span></div>
        <p style="margin-top:12px;font-size:14.5px;color:#64748B">Contoh untuk satu ujian. Tidak ada biaya bulanan.</p>
      </div>
      <div class="lp-pk">
        ${trial ? html`<div class="lp-trial">${icon('redeem')}<div><b>${fmt.num(trial)} poin uji coba gratis</b> untuk setiap lembaga baru, tanpa perlu membayar dulu.</div></div>` : ''}
        ${paket.length ? paket.map((p) => html`<div class="p ${p.populer ? 'pop' : ''}">
            <div><b>${p.nama}</b>${p.populer ? html`<span class="tag">Pilihan populer</span>` : ''}<br><small>${fmt.num(p.poin)} poin · untuk ${fmt.num(Math.floor(p.poin / per))} siswa-ujian</small></div>
            <div><div class="hg">${fmt.rp(p.harga)}</div><small style="display:block;text-align:right">≈ ${fmt.rp(Math.round(p.harga / Math.max(1, Math.floor(p.poin / per))))} per siswa</small></div></div>`)
          : html`<p style="color:#64748B;font-size:15px">Daftar harga paket tampil di menu Poin setelah sekolah terdaftar.${tanyaWa ? html` Atau <a target="_blank" rel="noopener" href="${tanyaWa}">tanyakan lewat WhatsApp</a>.` : ''}</p>`}
      </div>
    </div>
  </div></section>

  <section class="lp-sec" id="lp-faq" style="padding-top:0"><div class="lp-w">
    <h2>Tanya jawab</h2>
    <div class="lp-faq">${faq.map(([q, a]) => html`<details><summary>${q}</summary><p>${a}</p></details>`)}</div>
  </div></section>

  <section class="lp-end"><div class="lp-w"><div>
    <div class="a"><h3>Mengelola sekolah atau lembaga?</h3>
      <p>Daftarkan dengan akun Google${trial ? `, lalu coba dengan ${fmt.num(trial)} poin gratis` : ''}.</p>
      <a class="lp-btn" href="#/daftar">${icon('domain_add')} Daftarkan sekolah</a></div>
    <div class="b"><h3>Guru, pengawas, atau siswa?</h3>
      <p>Guru dan pengawas diundang oleh admin sekolah. Siswa memakai kartu login dari sekolah.</p>
      <a class="lp-btn lp-bl" href="#/masuk">${icon('login')} Masuk</a></div>
  </div></div></section>
  </main>

  <footer class="lp-ft"><div class="lp-w">
    <div class="c"><b>UjiKu CBT</b><span>Ujian berbasis komputer untuk sekolah, madrasah, bimbel, dan kampus.</span></div>
    <div class="c"><b>Akun</b><a href="#/masuk">Masuk</a><a href="#/daftar">Daftarkan sekolah</a><a href="#/masuk?peserta=1">Masuk sebagai siswa</a></div>
    ${kontak.wa || kontak.email ? html`<div class="c"><b>Kontak</b>
      ${kontak.wa ? html`<a target="_blank" rel="noopener" href="${waUrl(kontak.wa)}">WhatsApp ${kontak.wa}</a>` : ''}
      ${kontak.email ? html`<span>${kontak.email}</span>` : ''}</div>` : ''}
    <span class="cp">© ${new Date().getFullYear()} UjiKu CBT</span>
  </div></footer>
</div>`.s;

  // ---------- navigasi bagian (tanpa mengubah hash, karena hash dipakai router) ----------
  const halus = !matchMedia('(prefers-reduced-motion: reduce)').matches;
  el.querySelectorAll('[data-to]').forEach((b) => { b.onclick = () => document.getElementById(b.dataset.to)?.scrollIntoView({ behavior: halus ? 'smooth' : 'auto', block: 'start' }); });
  const hd = $('#lp-hd', el);
  const onScroll = () => hd.classList.toggle('sc', window.scrollY > 8);
  window.addEventListener('scroll', onScroll, { passive: true }); onScroll();

  // ---------- demo ujian ----------
  const scr = $('#demo', el);
  let st;
  const baru = () => { st = { i: 0, jwb: [], urut: SOAL.map((s) => acak(s.o.length)), sisa: DURASI, mulai: false, selesai: false, pindah: 0, lihatPindah: false, tick: null }; };
  const mmss = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
  const mulaiWaktu = () => {
    if (st.mulai) return; st.mulai = true;
    st.tick = setInterval(() => {
      st.sisa--; const t = $('.dm-timer', scr);
      if (t) { t.textContent = mmss(Math.max(0, st.sisa)); t.classList.toggle('low', st.sisa <= 20); }
      if (st.sisa <= 0) selesai();
    }, 1000);
  };
  const soal = () => {
    const s = SOAL[st.i], u = st.urut[st.i], akhir = st.i === SOAL.length - 1;
    scr.innerHTML = html`<div class="dm-top"><div><b>Ujian Demo</b><small>Soal ${st.i + 1} dari ${SOAL.length}</small></div>
        <span class="dm-timer ${st.sisa <= 20 ? 'low' : ''}" aria-label="Sisa waktu">${mmss(st.sisa)}</span></div>
      ${st.lihatPindah ? html`<div class="dm-warn" role="alert">${icon('warning')}<span>Anda meninggalkan halaman ujian (${st.pindah}×). Pada ujian sungguhan ini tercatat, terlihat oleh pengawas, dan sesi bisa terkunci.</span></div>` : ''}
      <div class="dm-body"><span class="dm-mapel">${s.mapel}</span><p class="dm-q">${s.q}</p>
        ${u.map((oi, pos) => html`<button type="button" class="dm-opt" data-o="${oi}" aria-pressed="${st.jwb[st.i] === oi}"><span class="k">${'ABCD'[pos]}</span>${s.o[oi]}</button>`)}</div>
      <div class="dm-foot"><div class="dm-dots" aria-hidden="true">${SOAL.map((_, k) => html`<span class="${k === st.i ? 'on' : ''} ${st.jwb[k] != null ? 'isi' : ''}">${k + 1}</span>`)}</div>
        <button type="button" class="dm-next ${akhir ? 'fin' : ''}" ${st.jwb[st.i] == null ? 'disabled' : ''}>${akhir ? 'Selesai' : 'Lanjut'}</button></div>`.s;
  };
  const selesai = () => {
    if (st.selesai) return; st.selesai = true; clearInterval(st.tick);
    const benar = SOAL.filter((s, k) => st.jwb[k] === s.k).length;
    const nilai = Math.round((benar / SOAL.length) * 100);
    const warna = nilai >= 70 ? '#22A06B' : nilai >= 40 ? '#F7941D' : '#DC2626';
    scr.innerHTML = html`<div class="dm-res">
      <div class="dm-score" style="--p:${nilai};--c:${warna}"><div><b>${nilai}</b><small>nilai</small></div></div>
      <h4>Nilai keluar seketika</h4>
      <p>Dihitung saat Anda menekan Selesai, sama seperti yang dialami siswa.</p>
      <div class="dm-list">${SOAL.map((s, k) => { const ok = st.jwb[k] === s.k; return html`<div>${icon(ok ? 'check_circle' : 'cancel', ok ? 'y' : 'n')}
        <span>${s.mapel}: ${ok ? 'benar' : st.jwb[k] == null ? 'tidak dijawab' : 'salah'}${ok ? '' : html` · jawaban <b>${s.o[s.k]}</b>`}</span></div>`; })}</div>
      ${st.pindah ? html`<p>Pindah halaman tercatat <b>${st.pindah}×</b>.</p>` : ''}
      <p>Di laporan sekolah, setiap soal juga mendapat tingkat kesukaran dan daya beda.</p>
      <button type="button" class="dm-again">${icon('replay')} Ulangi demo</button></div>`.s;
  };
  baru(); soal();
  scr.addEventListener('click', (e) => {
    const o = e.target.closest('.dm-opt');
    if (o) { mulaiWaktu(); st.jwb[st.i] = Number(o.dataset.o); soal(); $(`.dm-opt[data-o="${o.dataset.o}"]`, scr)?.focus(); return; }
    if (e.target.closest('.dm-next')) { if (st.i < SOAL.length - 1) { st.i++; soal(); $('.dm-opt', scr)?.focus(); } else selesai(); return; }
    if (e.target.closest('.dm-again')) { clearInterval(st.tick); baru(); soal(); $('.dm-opt', scr)?.focus(); }
  });
  const onVis = () => {
    if (!st.mulai || st.selesai) return;
    if (document.visibilityState === 'hidden') { st.pindah++; st.lihatPindah = true; }
    else soal();
  };
  document.addEventListener('visibilitychange', onVis);

  return () => { clearInterval(st?.tick); document.removeEventListener('visibilitychange', onVis); window.removeEventListener('scroll', onScroll); };
}
