import * as api from '../core/api.js';
import * as store from '../core/store.js';
import { html, raw, icon, $, $$, on, fmt, mapelColor, plain, sanitize, modal, toast, toastErr, busy, confirmDialog, pickFile } from '../core/ui.js';
import { parseDocx, itemProblem, itemWarning, wacanaProblem } from '../lib/docx.js';
import { compressImage } from '../lib/image.js';
import { bankForm } from './bank-list.js';

const MIME = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', bmp: 'image/bmp', webp: 'image/webp', svg: 'image/svg+xml' };

export default async function (ctx) {
  const { el, title, alive, me, mode, go, query } = ctx;
  title('Impor Soal Word');
  let banks = await store.fetchOnce('banks||||', () => api.rpc('banks_list', {}));
  if (!alive()) return;
  let bankId = query.bank || '';
  let file = null, items = [], wacana = [], media = new Map(), urls = new Map(), sel = 0, view = 'semua';

  el.innerHTML = html`<div class="page-head"><div><div class="crumb">${mode === 'guru' ? 'Ruang Guru' : 'Ujian'} › <b>Impor Word (.docx)</b></div>
      <h1>Impor Soal dari Microsoft Word (.docx)</h1><div class="sub">Unggah puluhan butir soal lengkap dengan gambar dan kunci jawaban dalam satu langkah.</div></div>
      <span class="spacer"></span><a class="btn secondary lg" href="assets/templat/templat-soal-ujiku.docx" download>${icon('download')} Unduh Templat Word (.docx)</a></div>
    <div class="card stepper" style="--n:3;margin-bottom:20px" id="steps"></div>
    <div class="grid" style="grid-template-columns:minmax(0,1fr) minmax(0,1.4fr);margin-bottom:20px" id="top">
      <div class="card"><div class="tiny bold muted" style="letter-spacing:.08em">PILIH BANK SOAL TUJUAN</div>
        <select class="select mt-8" id="bank" style="height:52px"></select>
        <div class="row mt-16 small"><span class="muted" id="bank-info"></span><span class="spacer"></span><button class="btn ghost sm" id="newbank">${icon('add')} Bank baru</button></div></div>
      <div class="card" id="filebox"></div>
    </div>
    <div id="work"></div>`.s;
  if (window.innerWidth < 900) $('#top', el).style.gridTemplateColumns = '1fr';

  const paintBanks = () => {
    const s = $('#bank', el);
    const usable = banks.rows.filter((b) => !b.terkunci && b.status !== 'diarsipkan');
    s.innerHTML = html`<option value="">— Pilih bank soal —</option>${usable.map((b) => html`<option value="${b.id}" ${b.id === bankId ? 'selected' : ''}>${b.mapel} · ${b.nama} (${b.jumlah} soal)</option>`)}`.s;
    const b = usable.find((x) => x.id === bankId);
    $('#bank-info', el).innerHTML = b ? html`<span class="badge" style="background:${mapelColor(b.mapel)}1A;color:${mapelColor(b.mapel)}">${b.mapel}</span> Pengampu: ${b.pemilik?.nama || '–'}`.s : 'Soal akan ditambahkan di akhir bank yang dipilih.';
  };
  const stats = () => { const bad = items.filter(itemProblem).length; return { ok: items.length - bad, bad }; };
  const wcUsed = () => new Set(items.map((q) => q.w).filter((w) => w >= 0));
  const paintSteps = () => {
    const s = stats();
    $('#steps', el).innerHTML = html`
      <div class="step done"><div class="n">${icon('check_circle')}</div><div><div class="sl">Langkah 1</div><div class="st">Unduh Templat</div><div class="small muted">Format standar siap pakai</div></div></div>
      <div class="step ${file ? 'done' : 'on'}"><div class="n">${icon(file ? 'check_circle' : 'upload_file')}</div><div><div class="sl">Langkah 2</div><div class="st">Unggah Berkas .docx</div><div class="small muted">${file ? items.length + ' butir berhasil diurai' : 'Seret atau pilih berkas'}</div></div></div>
      <div class="step ${file ? 'on' : ''}"><div class="n">${icon('fact_check')}</div><div><div class="sl">Langkah 3</div><div class="st">Pratinjau & Validasi Kunci</div>
        <div class="small ${s.bad ? 'c-orange' : 'muted'}">${file ? (s.bad ? s.bad + ' butir perlu tinjauan' : 'Semua butir valid') : 'Periksa sebelum disimpan'}</div></div></div>`.s;
  };
  const paintFile = () => {
    const box = $('#filebox', el);
    if (!file) {
      box.innerHTML = html`<div class="dropzone" id="dz" style="height:100%">${icon('cloud_upload')}<div class="semi mt-8" style="font-size:16px">Seret berkas Word (.docx) ke sini</div>
        <div class="muted small">atau klik untuk memilih berkas · maksimal 20 MB</div></div>`.s;
      const dz = $('#dz', box);
      dz.onclick = async () => handle(await pickFile('.docx'));
      dz.ondragover = (e) => { e.preventDefault(); dz.classList.add('over'); };
      dz.ondragleave = () => dz.classList.remove('over');
      dz.ondrop = (e) => { e.preventDefault(); dz.classList.remove('over'); handle(e.dataTransfer.files[0]); };
      return;
    }
    const s = stats();
    box.innerHTML = html`<div class="row"><div class="icon-tile soft">${icon('description')}</div><div style="flex:1;min-width:0"><div class="row gap-8"><b class="ellipsis">${file.name}</b><span class="badge b-gray">${fmt.num(file.size / 1024)} KB</span></div>
      <div class="c-green small semi">${icon('check_circle')} Selesai diurai (${items.length} butir soal${wcUsed().size ? ', ' + wcUsed().size + ' wacana' : ''} terdeteksi)</div></div>
      <button class="btn ghost" id="reup">${icon('sync')} Unggah Ulang</button></div>
      <div class="grid g-2 mt-16" style="gap:12px"><div class="alert green" style="margin:0"><div class="a-ic">${icon('check_circle')}</div><div><b class="c-green" style="font-size:17px">${s.ok} Soal Siap</b><div class="small muted">Kunci & opsi valid</div></div></div>
      <div class="alert ${s.bad ? 'orange' : 'green'}" style="margin:0"><div class="a-ic">${icon(s.bad ? 'error' : 'verified')}</div><div><b class="${s.bad ? 'c-orange' : 'c-green'}" style="font-size:17px">${s.bad} Butuh Perbaikan</b><div class="small muted">Bisa diperbaiki di sini atau di editor</div></div></div></div>`.s;
    $('#reup', box).onclick = async () => handle(await pickFile('.docx'));
  };
  const showHtml = (h) => raw(sanitize(String(h || '').replace(/<img data-media="([^"]+)"[^>]*>/g, (m, p) => (urls.get(p) ? `<img src="${urls.get(p)}" alt="">` : '[gambar tidak didukung]'))));
  const paintWork = () => {
    const w = $('#work', el);
    if (!file) { w.innerHTML = ''; return; }
    if (!items.length) {
      w.innerHTML = html`<div class="card"><div class="empty"><div class="e-art">${icon('find_in_page')}</div><h3>Tidak ada soal yang terdeteksi</h3>
        <p>Pastikan soal diberi nomor ("1. …"), opsi diawali huruf ("A. …"), dan kunci ditulis "Kunci: B". Untuk bacaan bersama, tulis "Wacana: Judul" sebelum soal-soalnya. Unduh templat untuk contoh format.</p></div></div>`.s;
      return;
    }
    const s = stats();
    const list = items.map((q, i) => ({ q, i, p: itemProblem(q) })).filter((x) => view === 'semua' || x.p);
    const cur = items[sel];
    const p = cur ? itemProblem(cur) : null;
    w.innerHTML = html`<div class="grid" style="grid-template-columns:minmax(0,1fr) minmax(0,1.4fr);align-items:start" id="wg">
      <div class="card pad-0"><div class="row" style="padding:18px 18px 12px"><div><h3 style="font-size:18px">Daftar Soal Terurai</h3><div class="muted small">Klik butir untuk memeriksa & menetapkan kunci</div></div><span class="spacer"></span>
        <div class="seg"><button data-v="semua" class="${view === 'semua' ? 'on' : ''}">Semua (${items.length})</button><button data-v="cek" class="${view === 'cek' ? 'on' : ''}">Perlu Cek ${s.bad ? '(' + s.bad + ')' : ''}</button></div></div>
        <div style="max-height:560px;overflow:auto;padding:0 10px 10px">${list.map(({ q, i, p: pr }) => html`<div class="row" data-sel="${i}" style="padding:12px;border-radius:12px;cursor:pointer;margin:2px 0;${i === sel ? 'background:var(--primary-50);box-shadow:inset 3px 0 0 var(--primary)' : ''}">
          <span class="avatar sq sm" style="${pr ? 'background:var(--orange);color:#fff' : ''}">${String(i + 1).padStart(2, '0')}</span>
          <div style="flex:1;min-width:0"><div class="semi ellipsis">${plain(q.teks) || '(teks kosong)'}</div><div class="small ${pr ? 'c-orange' : 'muted'}">${pr ? html`${icon('warning')} ${pr}` : `Pilihan Ganda (${q.opsi.length} opsi)${/<img/.test(q.teks) ? ' · gambar' : ''}${itemWarning(q) ? ' · ⚠ rumus gambar' : ''}${q.w >= 0 ? ' · wacana: ' + (wacana[q.w].judul || 'W' + (q.w + 1)) : ''}`}</div></div>
          ${pr ? html`<span class="badge b-orange">${pr.startsWith('Kunci') ? 'Set Kunci' : 'Perbaiki'}</span>` : html`<span class="badge b-green">${icon('check')} Kunci ${q.kunci}</span>`}</div>`)}</div></div>
      <div class="card">${cur ? html`<div class="row"><span class="avatar sq lg" style="background:${p ? 'var(--orange)' : 'var(--green)'};color:#fff">${String(sel + 1).padStart(2, '0')}</span>
          <div style="flex:1"><div class="row gap-8 wrap"><h3 style="font-size:20px">Butir Soal Nomor ${sel + 1}</h3>${p ? html`<span class="badge b-orange">${p}</span>` : html`<span class="badge b-green">Valid</span>`}</div>
          <div class="muted small">Pilihan Ganda · Tingkat ${cur.tingkat} · Bobot ${cur.bobot}</div></div>
          <button class="btn ghost icon red" data-del title="Buang butir ini">${icon('delete')}</button></div>
        ${p ? html`<div class="alert orange mt-16"><div class="a-ic">${icon('info')}</div><div><b class="c-orange">${p.startsWith('Kunci') ? 'Kunci jawaban tidak terdeteksi otomatis' : p}</b>
          <div class="small muted">${p.startsWith('Kunci') ? html`Tidak ditemukan baris <code>Kunci: [A-E]</code> untuk butir ini. Klik salah satu opsi di bawah untuk menetapkan kunci.` : 'Perbaiki di berkas Word lalu unggah ulang, atau sunting di editor setelah impor.'}</div></div></div>` : ''}
        ${!p && itemWarning(cur) ? html`<div class="alert orange mt-16"><div class="a-ic">${icon('info')}</div><div><b class="c-orange">${itemWarning(cur)}</b><div class="small muted">Rumus dibuat dengan MathType/objek lama tidak bisa dibaca. Di Word, hapus rumus itu lalu ketik ulang lewat <b>Insert → Equation</b>, kemudian unggah ulang.</div></div></div>` : ''}
        ${cur.w >= 0 ? html`<details class="wc-box mt-16" open><summary class="semi" style="cursor:pointer">${icon('auto_stories', 'c-primary')} Wacana: ${wacana[cur.w].judul || 'tanpa judul'}
          ${wacanaProblem(wacana[cur.w]) ? html`<span class="badge b-orange">${wacanaProblem(wacana[cur.w])}</span>` : html`<span class="muted small">dipakai ${items.filter((z) => z.w === cur.w).length} soal</span>`}</summary>
          <div class="q-html mt-8" style="max-height:240px;overflow:auto">${showHtml(wacana[cur.w].teks)}</div></details>` : ''}
        <div style="background:var(--slate-50);border-radius:14px;padding:16px;margin-top:16px"><div class="tiny bold muted" style="letter-spacing:.08em">TEKS SOAL</div>
          <div class="q-html mt-8">${showHtml(cur.teks)}</div></div>
        <div class="row mt-16"><span class="tiny bold muted" style="letter-spacing:.08em">OPSI JAWABAN (KLIK UNTUK MEMILIH KUNCI)</span></div>
        <div class="col gap-8 mt-8">${cur.opsi.map((o) => html`<button class="opt ${cur.kunci === o.k ? 'on' : ''}" data-key="${o.k}" style="min-height:52px"><span class="lt">${o.k}</span><span class="ot">${showHtml(o.t)}</span>
          <span class="small ${cur.kunci === o.k ? 'c-green semi' : 'muted'}">${cur.kunci === o.k ? 'Kunci ✓' : 'Tetapkan ' + o.k}</span></button>`)}</div>
        ${cur.pembahasan ? html`<div class="muted small mt-16">${icon('lightbulb')} ${cur.pembahasan}</div>` : ''}` : ''}</div></div>
      <div class="card row wrap mt-16" style="position:sticky;bottom:${window.innerWidth < 1024 ? '88px' : '12px'};box-shadow:var(--sh-2);z-index:5">
        <div class="icon-tile" style="background:var(--green-50);color:var(--green)">${icon('fact_check')}</div>
        <div style="flex:1;min-width:200px"><b>Ringkasan Impor: <span class="c-green">${s.ok} soal valid</span>${s.bad ? html` · <span class="c-orange">${s.bad} butuh perbaikan</span>` : ''}</b>
          <div class="small muted">${s.bad ? 'Soal bermasalah tetap ikut diimpor sebagai draf dan dapat diperbaiki di editor.' : 'Semua soal siap disimpan ke bank soal.'}</div></div>
        <button class="btn ghost" data-cancel>Batalkan</button>
        <button class="btn primary lg" data-import ${bankId ? '' : 'disabled'}>${icon('upload')} Impor & Simpan ${items.length} Soal</button></div>`.s;
    if (window.innerWidth < 900) $('#wg', el).style.gridTemplateColumns = '1fr';
  };
  const paintAll = () => { paintSteps(); paintFile(); paintWork(); };

  async function handle(f) {
    if (!f) return;
    if (!/\.docx$/i.test(f.name)) return toast('Format tidak didukung', 'Gunakan berkas Word .docx (bukan .doc lama). Simpan ulang dengan "Save As → Word Document".', 'warn', 7000);
    if (f.size > 20 * 1024 * 1024) return toast('Berkas terlalu besar', 'Maksimal 20 MB.', 'warn');
    try {
      const r = await parseDocx(f);
      urls.forEach((u) => URL.revokeObjectURL(u)); urls = new Map();
      for (const [p, bytes] of r.media) {
        const ext = p.split('.').pop().toLowerCase();
        if (MIME[ext]) urls.set(p, URL.createObjectURL(new Blob([bytes], { type: MIME[ext] })));
      }
      file = f; items = r.items; wacana = r.wacana || []; media = r.media; sel = Math.max(0, items.findIndex(itemProblem)); view = 'semua';
      paintAll();
      toast('Berkas diurai', `${items.length} soal${wacana.length ? ' dan ' + wacana.length + ' wacana' : ''} terdeteksi.`, 'ok');
    } catch (e) { toastErr(e, 'Gagal membaca berkas Word'); }
  }

  paintBanks(); paintAll();
  $('#bank', el).onchange = (e) => { bankId = e.target.value; paintBanks(); paintWork(); };
  $('#newbank', el).onclick = () => bankForm({ data: banks, me, go, onSaved: async (r) => { store.invalidate('banks'); banks = await api.rpc('banks_list', {}); bankId = r.id; paintBanks(); paintWork(); } });
  const offs = [
    on(el, 'click', '[data-sel]', (e, n) => { sel = +n.dataset.sel; paintWork(); }),
    on(el, 'click', '[data-v]', (e, b) => { view = b.dataset.v; paintWork(); }),
    on(el, 'click', '[data-key]', (e, b) => { items[sel].kunci = b.dataset.key; const nx = items.findIndex((q, i) => i > sel && itemProblem(q)); paintAll(); if (nx > 0) setTimeout(() => { sel = nx; paintWork(); }, 450); }),
    on(el, 'click', '[data-del]', () => { items.splice(sel, 1); sel = Math.min(sel, items.length - 1); paintAll(); }),
    on(el, 'click', '[data-cancel]', async () => { if (await confirmDialog({ title: 'Batalkan impor?', text: 'Hasil penguraian berkas akan dibuang.' })) { file = null; items = []; paintAll(); } }),
    on(el, 'click', '[data-import]', (e, b) => busy(b, async () => {
      if (!bankId) return toast('Pilih bank soal tujuan', '', 'warn');
      try {
        // unggah gambar yang dipakai
        const used = new Set();
        const scan = (h) => String(h || '').replace(/data-media="([^"]+)"/g, (m, p) => { used.add(p); return m; });
        items.forEach((q) => { scan(q.teks); q.opsi.forEach((o) => scan(o.t)); });
        const pakai = [...wcUsed()].sort((a, b) => a - b);
        pakai.forEach((i) => scan(wacana[i].teks));
        const done = new Map();
        for (const p of used) {
          const ext = p.split('.').pop().toLowerCase();
          if (!MIME[ext]) continue;
          const blob0 = new Blob([media.get(p)], { type: MIME[ext] });
          const { blob, ext: e2, type } = await compressImage(new File([blob0], 'img.' + ext, { type: MIME[ext] })).catch(() => ({ blob: blob0, ext, type: MIME[ext] }));
          const { url } = await api.upload('soal-media', `${me.tenant.id}/${bankId}/${api.randomId(10)}.${e2}`, blob, type);
          done.set(p, url);
        }
        const fix = (h) => sanitize(String(h || '').replace(/<img data-media="([^"]+)"[^>]*>/g, (m, p) => (done.get(p) ? `<img src="${done.get(p)}" alt="">` : '')));
        const remap = new Map(pakai.map((old, i) => [old, i]));
        const payload = items.map((q) => ({ teks: fix(q.teks), opsi: q.opsi.map((o) => ({ k: o.k, t: fix(o.t) })), kunci: q.kunci, tingkat: q.tingkat, bobot: q.bobot, pembahasan: q.pembahasan, w: q.w >= 0 ? remap.get(q.w) : null }));
        const r = await api.rpc('questions_import', { bank: bankId, items: payload, wacana: pakai.map((i) => ({ judul: wacana[i].judul, teks: fix(wacana[i].teks) })) });
        store.invalidate('banks', 'bank:' + bankId, 'gr_dashboard', 'ad_dashboard');
        toast('Impor berhasil', `${r.jumlah} soal${r.wacana ? ' dan ' + r.wacana + ' wacana' : ''} ditambahkan ke bank soal.`, 'ok');
        go('/bank/' + bankId);
      } catch (x) { toastErr(x, 'Impor gagal'); }
    })),
  ];
  return () => { offs.forEach((f) => f()); urls.forEach((u) => URL.revokeObjectURL(u)); };
}
