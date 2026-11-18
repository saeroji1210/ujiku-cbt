import * as api from '../core/api.js';
import * as store from '../core/store.js';
import { html, icon, $, fmt, mapelColor, badge, skel, empty, on, debounce } from '../core/ui.js';

const KEY = 'report_exams';
const load = () => api.rpc('report_exams');
export const prefetch = () => store.fetchOnce(KEY, load);

export default async function (ctx) {
  const { el, title, alive, go, mode } = ctx;
  title(mode === 'guru' ? 'Hasil & Analisis' : 'Laporan Nilai');
  let q = '';
  el.innerHTML = html`<div class="page-head"><div><div class="crumb">Laporan</div><h1>${mode === 'guru' ? 'Hasil & Analisis Soal' : 'Laporan Nilai'}</h1>
    <div class="sub">${mode === 'guru' ? 'Hasil ujian yang memakai bank soal Anda, lengkap dengan analisis butir soal untuk memperbaiki kualitas soal.' : 'Nilai, statistik, rekap jawaban, dan analisis butir soal setiap ujian. Unduh dalam Excel atau PDF.'}</div></div></div>
    <div class="card pad-0"><div class="toolbar"><div class="input-ic">${icon('search')}<input class="input soft" id="q" placeholder="Cari judul ujian atau mapel…"></div><span class="spacer"></span><span class="muted small" id="kkm"></span></div>
    <div id="body">${skel.lines(8)}</div></div>`.s;
  let data = null;
  const paint = (d) => {
    data = d; if (!alive()) return;
    $('#kkm', el).textContent = 'KKM lembaga: ' + fmt.num(d.kkm);
    const rows = d.rows.filter((r) => !q || (r.judul + ' ' + r.mapel).toLowerCase().includes(q));
    $('#body', el).innerHTML = (rows.length ? html`<div class="table-wrap"><table class="table"><thead><tr><th>Ujian</th><th>Tanggal</th><th class="num">Peserta</th><th class="num">Dinilai</th><th class="num">Rata-rata</th><th>Status</th><th></th></tr></thead>
      <tbody>${rows.map((r) => html`<tr class="clickable" data-id="${r.id}"><td><div class="row gap-8"><span style="width:10px;height:36px;border-radius:4px;background:${mapelColor(r.mapel)};flex:none"></span><div><div class="semi">${r.judul}</div><div class="muted small">${r.mapel}</div></div></div></td>
        <td class="nowrap">${fmt.date(r.mulai)}</td><td class="num">${r.peserta}</td><td class="num">${r.dinilai}</td>
        <td class="num"><b style="color:${r.rata == null ? 'var(--muted)' : r.rata >= d.kkm ? 'var(--green)' : 'var(--orange-700)'}">${r.rata == null ? '–' : fmt.num(r.rata, 1)}</b></td>
        <td>${badge(r.state)}</td><td>${icon('chevron_right', 'muted')}</td></tr>`)}</tbody></table></div>`
      : empty('monitoring', 'Belum ada hasil ujian', mode === 'guru' ? 'Hasil akan muncul setelah ujian yang memakai bank soal Anda berlangsung.' : 'Hasil akan muncul setelah ujian terbit mulai dikerjakan.')).s;
  };
  await store.swr(KEY, load, paint, { alive, ttl: 15000 });
  $('#q', el).addEventListener('input', debounce((e) => { q = e.target.value.trim().toLowerCase(); paint(data); }, 200));
  return on(el, 'click', 'tr[data-id]', (e, tr) => go('/laporan/' + tr.dataset.id));
}
