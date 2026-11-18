import * as api from '../core/api.js';
import { html, raw, icon, $, $$, on, fmt, mapelColor, badge, skel, bars, donut, download, printDoc, esc, statusLabel } from '../core/ui.js';
import { writeXlsx } from '../lib/xlsx.js';

const KP = { mudah: ['b-green', '#22A06B'], sedang: ['b-orange', '#F7941D'], sukar: ['b-coral', '#F15A3B'] };
const KD = { 'sangat baik': 'b-green', baik: 'b-blue', cukup: 'b-yellow', 'perlu revisi': 'b-red' };

export default async function (ctx) {
  const { el, params, title, alive, mode } = ctx;
  el.innerHTML = skel.page().s;
  let kelas = '', tab = 'nilai', q = '', sort = 'nama';
  let d = await api.rpc('report_exam', { exam: params.id, kelas });
  if (!alive()) return;
  title('Laporan · ' + d.ujian.judul);

  const paint = () => {
    const u = d.ujian, s = d.stat, kkm = Number(d.kkm);
    const tuntasPct = s.dinilai ? Math.round((s.tuntas / s.dinilai) * 100) : 0;
    const kp = { mudah: 0, sedang: 0, sukar: 0 }; const kd = { 'sangat baik': 0, baik: 0, cukup: 0, 'perlu revisi': 0 };
    d.soal.forEach((x) => { if (x.kat_p) kp[x.kat_p]++; if (x.kat_d) kd[x.kat_d]++; });
    el.innerHTML = html`<div class="page-head"><div><div class="crumb"><a href="#/laporan">Laporan</a> › <b>${u.mapel}</b></div><h1>${u.judul}</h1>
        <div class="sub row wrap gap-8">${badge(u.state)}<span>${fmt.dateLong(u.mulai)}</span>·<span>${u.jumlah_soal} soal</span>·<span>KKM ${fmt.num(kkm)}</span></div></div>
        <span class="spacer"></span><div class="row wrap gap-8 no-print">
        <select class="select" id="kls" style="width:auto;min-width:150px"><option value="">Semua kelas</option>${d.kelas_list.sort().map((k) => html`<option ${k === kelas ? 'selected' : ''}>${k}</option>`)}</select>
        <button class="btn secondary" data-x="xlsx">${icon('table_view', 'c-green')} Unduh Excel</button><button class="btn secondary" data-x="pdf">${icon('picture_as_pdf', 'c-red')} Unduh PDF</button></div></div>
      ${d.menunggu_sinkron ? html`<div class="alert orange"><div class="a-ic">${icon('sync_problem')}</div><div class="small"><b>Sebagian jawaban menunggu sinkronisasi dari server lokal.</b> Nilai akan lengkap setelah server lokal tersambung internet.</div></div>` : ''}
      <div class="grid g-4">${[['Rata-rata', s.rata == null ? '–' : fmt.num(s.rata, 1), 'functions', '#1565D8', `Median ${s.median == null ? '–' : fmt.num(s.median, 1)}`],
          ['Tertinggi', s.max == null ? '–' : fmt.num(s.max, 1), 'trending_up', '#22A06B', ''], ['Terendah', s.min == null ? '–' : fmt.num(s.min, 1), 'trending_down', '#F15A3B', ''],
          ['Ketuntasan', tuntasPct + '%', 'verified', '#F7941D', `${s.tuntas} dari ${s.dinilai} peserta ≥ KKM`]]
        .map(([l, v, ic, c, sub]) => html`<div class="card kpi"><div class="k-top"><span class="k-lbl">${l}</span><div class="k-ic" style="background:${c}1A;color:${c}">${icon(ic)}</div></div>
          <div class="k-val">${v}</div><div class="muted small">${sub || `${s.dinilai} dinilai · ${s.mengikuti}/${s.terdaftar} mengikuti`}</div></div>`)}</div>
      <div class="grid g-3 mt-24">
        <div class="card"><div class="card-head"><h3>Sebaran Nilai</h3></div>${bars(d.histogram.map((h) => ({ l: h.dari === 90 ? '90+' : String(h.dari), v: h.n, c: h.dari >= kkm ? '#22A06B' : h.dari + 10 > kkm ? '#F7941D' : '#1565D8' })))}
          <div class="legend mt-8"><span><i style="background:#1565D8"></i>di bawah KKM</span><span><i style="background:#22A06B"></i>≥ KKM</span></div></div>
        <div class="card"><div class="card-head"><h3>Perbandingan Kelas</h3></div>${d.per_kelas.length ? bars(d.per_kelas.map((k) => ({ l: k.kelas, v: Number(k.rata), c: Number(k.rata) >= kkm ? '#22A06B' : '#F7941D' })), { fmtV: (v) => fmt.num(v, 1) }) : html`<p class="muted small">Belum ada data.</p>`}</div>
        <div class="card"><div class="card-head"><h3>Ketuntasan</h3></div><div class="row gap-24" style="justify-content:center;padding:12px 0">
          ${donut([{ v: s.tuntas, c: '#22A06B' }, { v: s.dinilai - s.tuntas, c: '#F15A3B' }, { v: s.dinilai ? 0 : 1, c: '#E5E7EB' }], html`<div><b style="font-size:24px">${tuntasPct}%</b><div class="tiny muted">tuntas</div></div>`)}
          <div class="col gap-8 small"><span><i style="display:inline-block;width:10px;height:10px;border-radius:3px;background:#22A06B"></i> Tuntas: <b>${s.tuntas}</b></span>
            <span><i style="display:inline-block;width:10px;height:10px;border-radius:3px;background:#F15A3B"></i> Belum: <b>${s.dinilai - s.tuntas}</b></span>
            <span class="muted">Tidak hadir: ${s.terdaftar - s.mengikuti}</span></div></div></div>
      </div>
      ${d.ringkas ? '' : html`<div class="grid g-2 mt-24"><div class="card"><div class="card-head"><h3>Kategori Tingkat Kesukaran</h3></div>
          ${bars(Object.entries(kp).map(([k, v]) => ({ l: k[0].toUpperCase() + k.slice(1), v, c: KP[k][1] })), { height: 150 })}</div>
        <div class="card"><div class="card-head"><h3>Kategori Daya Beda</h3></div>
          ${bars(Object.entries(kd).map(([k, v]) => ({ l: k[0].toUpperCase() + k.slice(1), v, c: { 'sangat baik': '#22A06B', baik: '#1565D8', cukup: '#F7941D', 'perlu revisi': '#F15A3B' }[k] })), { height: 150 })}</div></div>`}
      <div class="tabs mt-24 no-print">${[['nilai', 'Nilai Peserta', 'leaderboard'], ...(d.ringkas ? [] : [['rekap', 'Rekap Jawaban', 'grid_on'], ['analisis', 'Analisis Butir Soal', 'query_stats']])]
        .map(([k, l, ic]) => html`<button data-t="${k}" class="${tab === k ? 'on' : ''}">${icon(ic)} ${l}</button>`)}</div>
      <div class="card pad-0" id="tabbody"></div>`.s;
    paintTab();
  };
  const paintTab = () => {
    const box = $('#tabbody', el); const kkm = Number(d.kkm);
    if (tab === 'nilai') {
      let rows = d.nilai.filter((r) => !q || r.nama.toLowerCase().includes(q) || r.nis.includes(q));
      if (sort === 'nilai') rows = [...rows].sort((a, b) => (b.nilai ?? -1) - (a.nilai ?? -1));
      box.innerHTML = html`<div class="toolbar"><div class="input-ic">${icon('search')}<input class="input soft" id="q" value="${q}" placeholder="Cari nama atau NIS…"></div><span class="spacer"></span>
        <div class="seg"><button data-s="nama" class="${sort === 'nama' ? 'on' : ''}">Urut nama</button><button data-s="nilai" class="${sort === 'nilai' ? 'on' : ''}">Urut nilai</button></div></div>
        <div class="table-wrap"><table class="table"><thead><tr><th>#</th><th>NIS</th><th>Nama</th><th>Kelas</th><th class="num">Benar</th><th class="num">Salah</th><th class="num">Kosong</th><th class="num">Nilai</th><th>Status</th><th class="num hide-sm">Pelanggaran</th></tr></thead>
        <tbody>${rows.map((r, i) => html`<tr><td class="muted">${i + 1}</td><td class="mono">${r.nis}</td><td class="semi">${r.nama}</td><td>${r.kelas}</td>
          <td class="num">${r.benar ?? '–'}</td><td class="num">${r.salah ?? '–'}</td><td class="num">${r.kosong ?? '–'}</td>
          <td class="num">${r.nilai == null ? '–' : html`<span class="badge ${Number(r.nilai) >= kkm ? 'b-green' : 'b-orange'}">${fmt.num(r.nilai, 1)}</span>`}</td>
          <td>${r.status === 'belum' ? html`<span class="badge b-gray">Tidak hadir</span>` : badge(r.status)}</td>
          <td class="num hide-sm">${r.pelanggaran ? html`<span class="flag">${r.pelanggaran}</span>` : '–'}</td></tr>`)}</tbody></table></div>`.s;
      $('#q', box).addEventListener('input', (e) => { q = e.target.value.trim().toLowerCase(); const pos = e.target.selectionStart; paintTab(); const n = $('#q', el); n.focus(); n.setSelectionRange(pos, pos); });
    } else if (tab === 'rekap') {
      const n = d.ujian.jumlah_soal; const names = Object.fromEntries(d.nilai.map((r) => [r.pid, r]));
      box.innerHTML = d.matriks.length ? html`<div style="padding:16px"><div class="legend mb-16"><span><i style="background:var(--green)"></i>Benar</span><span><i style="background:var(--coral)"></i>Salah</span><span><i style="background:#E5E7EB"></i>Kosong</span>
        <span>Nomor sesuai nomor soal asli (sebelum diacak)</span></div><div class="table-wrap"><table class="table" style="width:auto"><thead><tr><th>Peserta</th>${Array.from({ length: n }, (_, i) => html`<th style="padding:8px 2px;text-align:center">${i + 1}</th>`)}<th class="num">Nilai</th></tr></thead>
        <tbody>${d.matriks.map((m) => { const r = names[m.pid] || {}; return html`<tr><td class="nowrap"><b>${r.nama}</b> <span class="muted small">${r.kelas}</span></td>
          ${[...(m.r || '')].map((ch) => html`<td style="padding:6px 2px"><i class="mx-${ch === '-' ? '' : ch}" style="display:block;width:16px;height:16px;border-radius:4px;margin:auto"></i></td>`)}<td class="num bold">${fmt.num(r.nilai, 1)}</td></tr>`; })}</tbody></table></div></div>`.s
        : '<div class="empty"><p>Belum ada jawaban yang dinilai.</p></div>';
    } else {
      box.innerHTML = html`<div style="padding:16px 16px 0" class="muted small">Tingkat kesukaran (p) = proporsi peserta menjawab benar · Daya beda (D) = p kelompok atas 27% − p kelompok bawah 27% · Pengecoh berfungsi bila dipilih ≥ 5% peserta.</div>
        <div class="table-wrap"><table class="table"><thead><tr><th>No</th><th>Soal</th><th>Kunci</th><th>Kesukaran (p)</th><th>Daya Beda (D)</th><th>Sebaran Jawaban</th><th>Catatan</th></tr></thead>
        <tbody>${d.soal.map((x) => {
          const tot = Object.values(x.distribusi || {}).reduce((a, b) => a + b, 0) || 1;
          const max = Math.max(1, ...Object.values(x.distribusi || {}));
          const lemah = (x.opsi || []).filter((k) => k !== x.kunci && ((x.distribusi || {})[k] || 0) / tot < 0.05);
          return html`<tr style="${x.perlu_revisi ? 'background:#FFF7F5' : ''}"><td class="bold">${x.no}</td><td style="max-width:320px"><div class="clamp2 small">${x.teks || '[gambar]'}</div></td>
            <td><span class="badge b-green">${x.kunci}</span></td>
            <td>${x.p == null ? '–' : html`<b>${fmt.num(x.p, 2)}</b> <span class="badge ${KP[x.kat_p]?.[0]}">${x.kat_p}</span>`}</td>
            <td>${x.d == null ? html`<span class="muted small">min. 4 peserta</span>` : html`<b>${fmt.num(x.d, 2)}</b> <span class="badge ${KD[x.kat_d]}">${x.kat_d}</span>`}</td>
            <td><div class="distr">${[...(x.opsi || []), '-'].map((k) => html`<span class="${k === x.kunci ? 'k' : ''}" title="${k === '-' ? 'Kosong' : k}: ${(x.distribusi || {})[k] || 0}" style="height:${Math.max(2, (((x.distribusi || {})[k] || 0) / max) * 34)}px"></span>`)}</div>
              <div class="distr-l">${[...(x.opsi || []), '–'].map((k) => html`<span>${k}</span>`)}</div></td>
            <td class="small">${x.perlu_revisi ? html`<span class="badge b-red">${icon('flag')} Perlu revisi</span>` : ''}${lemah.length ? html`<div class="muted mt-4">Pengecoh lemah: ${lemah.join(', ')}</div>` : ''}</td></tr>`;
        })}</tbody></table></div>`.s;
    }
  };
  paint();

  const exportXlsx = () => {
    const u = d.ujian; const n = u.jumlah_soal;
    const names = Object.fromEntries(d.nilai.map((r) => [r.pid, r]));
    const sheets = [{ name: 'Nilai', widths: [14, 32, 10, 8, 8, 8, 10, 14, 12], rows: [['NIS', 'Nama', 'Kelas', 'Benar', 'Salah', 'Kosong', 'Nilai', 'Status', 'Pelanggaran'],
      ...d.nilai.map((r) => [r.nis, r.nama, r.kelas, r.benar ?? '', r.salah ?? '', r.kosong ?? '', r.nilai == null ? '' : Number(r.nilai), r.status === 'belum' ? 'Tidak hadir' : statusLabel(r.status), r.pelanggaran || 0])] }];
    if (!d.ringkas) {
      sheets.push({ name: 'Rekap Jawaban', rows: [['Nama', 'Kelas', ...Array.from({ length: n }, (_, i) => 'S' + (i + 1)), 'Nilai'],
        ...d.matriks.map((m) => { const r = names[m.pid] || {}; return [r.nama, r.kelas, ...[...m.r].map((c) => (c === '1' ? 'B' : c === '0' ? 'S' : '-')), r.nilai == null ? '' : Number(r.nilai)]; })] });
      sheets.push({ name: 'Analisis Butir', widths: [6, 60, 8, 10, 14, 10, 14, 30, 14], rows: [['No', 'Soal', 'Kunci', 'p', 'Kesukaran', 'D', 'Daya Beda', 'Sebaran (A/B/C/D/E/kosong)', 'Catatan'],
        ...d.soal.map((x) => [x.no, x.teks, x.kunci, x.p == null ? '' : Number(x.p), x.kat_p || '', x.d == null ? '' : Number(x.d), x.kat_d || '',
          [...(x.opsi || []), '-'].map((k) => `${k}:${(x.distribusi || {})[k] || 0}`).join(' '), x.perlu_revisi ? 'Perlu revisi' : ''])] });
    }
    download(writeXlsx(sheets), `laporan-${u.judul.replace(/[^\w-]+/g, '-').toLowerCase()}${kelas ? '-' + kelas : ''}.xlsx`);
  };
  const exportPdf = () => {
    const u = d.ujian, s = d.stat, kkm = Number(d.kkm);
    printDoc('Laporan ' + u.judul, `<h1>${esc(u.judul)}</h1><div class="sub">${esc(ctx.me.tenant?.nama || '')} · ${esc(u.mapel)} · ${fmt.dateLong(u.mulai)}${kelas ? ' · Kelas ' + esc(kelas) : ''} · KKM ${kkm}</div>
      <table><tr><th>Peserta</th><th>Dinilai</th><th>Rata-rata</th><th>Tertinggi</th><th>Terendah</th><th>Tuntas</th></tr>
      <tr><td>${s.mengikuti}/${s.terdaftar}</td><td>${s.dinilai}</td><td>${fmt.num(s.rata, 2)}</td><td>${fmt.num(s.max, 2)}</td><td>${fmt.num(s.min, 2)}</td><td>${s.tuntas} (${s.dinilai ? Math.round((s.tuntas / s.dinilai) * 100) : 0}%)</td></tr></table>
      <h3 style="margin-top:18px">Daftar Nilai</h3><table><tr><th>No</th><th>NIS</th><th>Nama</th><th>Kelas</th><th class="num">B</th><th class="num">S</th><th class="num">K</th><th class="num">Nilai</th><th>Ket.</th></tr>
      ${d.nilai.map((r, i) => `<tr><td>${i + 1}</td><td>${esc(r.nis)}</td><td>${esc(r.nama)}</td><td>${esc(r.kelas)}</td><td class="num">${r.benar ?? '-'}</td><td class="num">${r.salah ?? '-'}</td><td class="num">${r.kosong ?? '-'}</td>
        <td class="num"><b>${r.nilai == null ? '-' : fmt.num(r.nilai, 1)}</b></td><td>${r.nilai == null ? 'Tidak hadir' : Number(r.nilai) >= kkm ? 'Tuntas' : 'Belum tuntas'}</td></tr>`).join('')}</table>
      ${d.ringkas ? '' : `<h3 style="margin-top:18px">Analisis Butir Soal</h3><table><tr><th>No</th><th>Soal</th><th>Kunci</th><th>p</th><th>Kesukaran</th><th>D</th><th>Daya beda</th></tr>
      ${d.soal.map((x) => `<tr><td>${x.no}</td><td>${esc(x.teks)}</td><td>${x.kunci}</td><td>${x.p == null ? '-' : fmt.num(x.p, 2)}</td><td>${x.kat_p || '-'}</td><td>${x.d == null ? '-' : fmt.num(x.d, 2)}</td><td>${x.kat_d || '-'}</td></tr>`).join('')}</table>`}
      <p style="margin-top:24px;color:#6B7280">Dicetak dari UjiKu CBT pada ${new Date().toLocaleString('id-ID')}</p>`);
  };

  const offs = [
    on(el, 'change', '#kls', async (e) => { kelas = e.target.value; d = await api.rpc('report_exam', { exam: params.id, kelas }); paint(); }),
    on(el, 'click', '[data-t]', (e, b) => { tab = b.dataset.t; $$('[data-t]', el).forEach((x) => x.classList.toggle('on', x === b)); paintTab(); }),
    on(el, 'click', '[data-s]', (e, b) => { sort = b.dataset.s; paintTab(); }),
    on(el, 'click', '[data-x]', (e, b) => (b.dataset.x === 'xlsx' ? exportXlsx() : exportPdf())),
  ];
  return () => offs.forEach((f) => f());
}
