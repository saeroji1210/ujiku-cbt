import * as api from '../core/api.js';
import * as store from '../core/store.js';
import { html, raw, icon, $, $$, on, fmt, mapelColor, badge, skel, modal, toast, toastErr, busy, popMenu, confirmDialog, debounce, sanitize, pickFile } from '../core/ui.js';
import { compressImage } from '../lib/image.js';

const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];
const stripped = (h) => String(h || '').replace(/<img[^>]*>/gi, 'IMG').replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').trim();
export function problem(q) {
  if (!stripped(q.teks)) return 'Teks soal kosong';
  const filled = (q.opsi || []).filter((o) => stripped(o.t));
  if (filled.length < 2) return 'Opsi kurang dari 2';
  if (!q.kunci) return 'Kunci belum ditetapkan';
  if (!filled.some((o) => o.k === q.kunci)) return 'Kunci tidak ada di opsi';
  return null;
}
export function previewPhone(q, idx, total, judul) {
  return html`<div class="phone"><div class="scr"><div class="ph-top"><span class="badge" style="background:rgba(255,255,255,.2);color:#fff">${idx + 1}</span>
    <div style="flex:1;min-width:0"><div class="bold ellipsis">${judul}</div><div style="opacity:.8;font-size:11px">Soal ${idx + 1} dari ${total}</div></div>
    <span class="badge" style="background:rgba(0,0,0,.18);color:#fff">${icon('timer')} 58:24</span></div>
    <div class="ph-body">${q ? html`<div class="q-html">${raw(sanitize(q.teks) || '<span style="color:#9CA3AF">Teks soal…</span>')}
      ${q.gambar_url ? html`<div style="margin-top:8px"><img src="${q.gambar_url}" alt=""></div>` : ''}</div>
      ${(q.opsi || []).map((o, i) => html`<div class="p-opt" style="${q.kunci === o.k ? 'border-color:var(--primary);background:#EBF3FC' : ''}"><b>${LETTERS[i]}</b><span>${raw(sanitize(o.t) || '<span style="color:#9CA3AF">…</span>')}</span></div>`)}`
      : html`<div class="muted small" style="padding:20px;text-align:center">Belum ada soal.</div>`}</div></div></div>
    <div class="muted tiny" style="text-align:center;margin-top:10px">${icon('touch_app')} Kunci jawaban disorot hanya di pratinjau guru.</div>`;
}

export default async function (ctx) {
  const { el, params, title, alive, go, me } = ctx;
  el.innerHTML = skel.page().s;
  let d;
  try { d = await store.fetchOnce('bank:' + params.id, () => api.rpc('bank_detail', { id: params.id })); }
  catch (e) { throw e; }
  if (!alive()) return;
  const bank = d.bank;
  const soal = d.soal;
  let cur = 0, filter = 'semua', locked = bank.terkunci, saveState = 'ok', lastSaved = null, dirty = false, chain = Promise.resolve();
  title('Editor · ' + bank.nama);
  const c = mapelColor(bank.mapel);

  el.innerHTML = html`<div class="card" style="margin:8px 0 18px;padding:16px 20px">
      <div class="row wrap gap-8 small muted"><a href="#/bank">${icon('folder_open')} Bank Soal</a><span>/</span><span>${bank.mapel}${bank.jenjang ? ' Kelas ' + bank.jenjang : ''}</span><span>/</span>
        <b class="ellipsis" style="color:var(--text);max-width:420px">${bank.nama}</b><span id="st-badge"></span>
        <span id="save-ind" class="save-st"></span></div>
      <div class="row wrap gap-8 mt-16"><button class="btn primary" id="btn-siap"></button>
        <button class="btn soft" id="btn-prev">${icon('visibility')} Pratinjau Siswa</button>
        <span class="spacer"></span><button class="btn ghost icon" id="btn-more" aria-label="Lainnya">${icon('more_vert')}</button></div></div>
    <div id="lock-banner"></div>
    <div class="editor-wrap">
      <aside class="card" style="position:sticky;top:84px">
        <div class="row"><div><h3 style="font-size:18px">Daftar Soal</h3><div class="muted small" id="total"></div></div><span class="spacer"></span>
          <button class="btn primary icon" id="btn-add" aria-label="Tambah soal">${icon('add')}</button></div>
        <div class="row wrap gap-4 mt-16" id="filters"></div>
        <div class="legend mt-8"><span><i style="background:#22A06B"></i>Lengkap</span><span><i style="background:#F7941D"></i>Belum lengkap</span><span><i style="background:#E5E7EB"></i>Kosong</span></div>
        <div class="qnum-grid mt-16" id="qgrid"></div>
        <div class="col gap-8 mt-16"><a class="btn soft block" href="#/impor?bank=${bank.id}">${icon('upload_file')} Impor dari Word</a></div>
      </aside>
      <section id="ed" class="col gap-16"></section>
      <aside class="ed-preview" style="position:sticky;top:84px"><div class="row" style="margin-bottom:12px">${icon('smartphone')}<b>Pratinjau Layar Siswa</b><span class="spacer"></span><span class="badge b-green">${raw('<i class="d"></i>')} Real-time</span></div>
        <div id="pv"></div></aside>
    </div>`.s;

  const q = () => soal[cur];
  const setSave = (s) => {
    saveState = s;
    const ind = $('#save-ind', el);
    ind.className = 'save-st' + (s === 'saving' ? ' saving' : s === 'err' ? ' off' : '');
    ind.innerHTML = html`${icon(s === 'saving' ? 'sync' : s === 'err' ? 'cloud_off' : 'cloud_done')}<span>${s === 'saving' ? 'Menyimpan…' : s === 'err' ? 'Gagal menyimpan — klik untuk coba lagi' : lastSaved ? 'Tersimpan otomatis pukul ' + fmt.time(lastSaved) : 'Semua perubahan tersimpan'}</span>`.s;
  };
  const paintHead = () => {
    $('#st-badge', el).innerHTML = (locked ? badge('terkunci', 'Terkunci · dipakai ujian') : badge(bank.status)).s;
    const b = $('#btn-siap', el);
    b.disabled = locked;
    b.innerHTML = bank.status === 'siap' ? html`${icon('undo')} Kembalikan ke Draf`.s : html`${icon('task_alt')} Tandai Siap Dipakai`.s;
    b.className = 'btn ' + (bank.status === 'siap' ? 'secondary' : 'primary');
    $('#lock-banner', el).innerHTML = locked ? html`<div class="alert purple"><div class="a-ic">${icon('lock')}</div><div style="flex:1"><b>Bank soal sedang dipakai ujian dan terkunci.</b>
      <div class="small muted">Soal tidak bisa diubah agar ujian yang terjadwal tetap konsisten. Duplikat bank soal untuk merevisi.</div></div>
      <button class="btn secondary" data-dup>${icon('content_copy')} Duplikat Bank Soal</button></div>`.s : '';
  };
  const paintList = () => {
    const nKunci = soal.filter((x) => !x.kunci).length, nRev = soal.filter((x) => x.perlu_revisi).length;
    $('#total', el).textContent = `Total: ${soal.length} butir soal`;
    $('#filters', el).innerHTML = html`${[['semua', `Semua (${soal.length})`], ['kunci', `Perlu Kunci (${nKunci})`], ['revisi', `Revisi (${nRev})`]].map(([k, l]) => html`<span class="chip ${filter === k ? 'on' : ''}" data-f="${k}" style="height:26px;font-size:12px">${l}</span>`)}`.s;
    $('#qgrid', el).innerHTML = soal.map((x, i) => {
      const show = filter === 'semua' || (filter === 'kunci' && !x.kunci) || (filter === 'revisi' && x.perlu_revisi);
      if (!show) return '';
      const p = problem(x), emptyQ = !stripped(x.teks) && !(x.opsi || []).some((o) => stripped(o.t));
      return html`<div class="qn ${emptyQ ? '' : p ? 'warn' : 'ok'} ${i === cur ? 'cur' : ''}" data-i="${i}" draggable="${!locked}" title="${p || 'Lengkap'}">${i + 1}${x.perlu_revisi ? html`<span style="position:absolute;top:-5px;right:-5px;width:10px;height:10px;border-radius:50%;background:var(--coral)"></span>` : ''}</div>`.s;
    }).join('');
  };
  const paintPreview = () => { $('#pv', el).innerHTML = previewPhone(q(), cur, soal.length, bank.nama).s; };

  const paintEditor = () => {
    const ed = $('#ed', el);
    const x = q();
    if (!x) {
      ed.innerHTML = html`<div class="card"><div class="empty"><div class="e-art">${icon('edit_note')}</div><h3>Belum ada soal</h3><p>Tulis soal pertama atau impor dari Word.</p>
        <div class="row"><button class="btn primary" data-add ${locked ? 'disabled' : ''}>${icon('add')} Tambah Soal Pertama</button><a class="btn secondary" href="#/impor?bank=${bank.id}">${icon('upload_file')} Impor Word</a></div></div></div>`.s;
      return;
    }
    const dis = locked ? 'disabled' : '';
    ed.innerHTML = html`<div class="card" style="padding:24px">
      <div class="row wrap"><span class="badge" style="background:var(--primary);color:#fff;height:38px;padding:0 16px;font-size:18px;border-radius:10px">Soal #${cur + 1}</span>
        <span class="muted">Pilihan Ganda (A–${LETTERS[Math.max(1, x.opsi.length - 1)]})</span><span class="spacer"></span>
        <button class="btn ghost icon sm" data-dupq title="Duplikat soal" ${dis}>${icon('content_copy')}</button>
        <button class="btn ghost icon sm red" data-delq title="Hapus soal" ${dis}>${icon('delete')}</button></div>
      ${x.perlu_revisi ? html`<div class="alert red mt-16" style="margin-bottom:0"><div class="a-ic">${icon('flag')}</div><div class="small"><b>Soal ditandai perlu revisi</b> dari analisis butir (daya beda rendah). Tanda hilang setelah soal disunting.</div></div>` : ''}
      <div class="row wrap gap-8 mt-16">
        <label class="row gap-8" style="background:var(--slate-50);border-radius:10px;padding:4px 4px 4px 12px"><span class="muted small">Tingkat:</span>
          <select class="select" id="tk" style="height:36px;width:auto;border:0;background-color:transparent" ${dis}>${['mudah', 'sedang', 'sukar'].map((t) => html`<option value="${t}" ${x.tingkat === t ? 'selected' : ''}>${t[0].toUpperCase() + t.slice(1)}</option>`)}</select></label>
        <label class="row gap-8" style="background:var(--slate-50);border-radius:10px;padding:4px 12px"><span class="muted small">Bobot:</span>
          <input class="input" id="bb" type="number" min="0.5" step="0.5" value="${x.bobot}" style="height:36px;width:70px;border:0;background:transparent;padding:0 4px" ${dis}><span class="muted small">poin</span></label></div>
      <div class="rte-bar mt-16" id="bar">${[['bold', 'format_bold'], ['italic', 'format_italic'], ['underline', 'format_underlined'], ['strikeThrough', 'strikethrough_s'],
          ['superscript', 'superscript'], ['subscript', 'subscript'], ['insertUnorderedList', 'format_list_bulleted'], ['img', 'image'], ['undo', 'undo'], ['redo', 'redo']]
        .map(([cmd, ic]) => html`<button type="button" data-cmd="${cmd}" title="${cmd}" ${dis}>${icon(ic)}</button>`)}</div>
      <div class="rte" id="teks" contenteditable="${!locked}" data-ph="Tulis teks pertanyaan di sini…">${raw(sanitize(x.teks))}</div>
      ${x.gambar_url ? html`<div class="row mt-16" style="background:var(--slate-50);border-radius:14px;padding:12px">${icon('image', 'c-primary')}<b>Lampiran gambar</b><span class="spacer"></span>
        <button class="btn ghost sm red" data-rmimg ${dis}>${icon('delete')} Hapus</button></div><div style="padding:8px;text-align:center"><img src="${x.gambar_url}" alt="" style="max-height:260px;border-radius:10px"></div>` : ''}
      <div class="row mt-24"><b>Pilihan Jawaban</b><span class="muted small">(klik bulatan untuk menetapkan kunci)</span><span class="spacer"></span>
        ${x.kunci ? html`<span class="badge b-green">${icon('check_circle')} Kunci: Opsi ${x.kunci}</span>` : html`<span class="badge b-orange">${icon('key_off')} Kunci belum dipilih</span>`}</div>
      <div class="col gap-8 mt-8" id="opts">${x.opsi.map((o, i) => html`<div class="opt-edit ${x.kunci === o.k ? 'key' : ''}" data-k="${o.k}">
        <input type="radio" name="kunci" value="${o.k}" ${x.kunci === o.k ? 'checked' : ''} ${dis} aria-label="Kunci ${LETTERS[i]}"><span class="lt">${LETTERS[i]}</span>
        <div class="rte small" contenteditable="${!locked}" data-opt="${o.k}" data-ph="Teks opsi ${LETTERS[i]}">${raw(sanitize(o.t))}</div>
        <button class="btn ghost icon sm" data-rmopt="${o.k}" title="Hapus opsi" ${dis || x.opsi.length <= 2 ? 'disabled' : ''}>${icon('close')}</button></div>`)}</div>
      ${x.opsi.length < 6 && !locked ? html`<button class="btn soft block mt-8" data-addopt>${icon('add_circle')} Tambah Opsi Pilihan (${LETTERS[x.opsi.length]})</button>` : ''}
      <details class="mt-16" ${x.pembahasan ? 'open' : ''}><summary class="semi" style="cursor:pointer;padding:10px 0">${icon('lightbulb', 'c-orange')} Pembahasan / catatan guru (opsional)</summary>
        <textarea class="textarea" id="pb" placeholder="Penjelasan jawaban untuk arsip guru" ${dis}>${x.pembahasan || ''}</textarea></details>
      <div class="row mt-24" style="justify-content:space-between">
        <button class="btn secondary lg" data-nav="-1" ${cur === 0 ? 'disabled' : ''}>${icon('chevron_left')} Sebelumnya</button>
        <button class="btn primary lg" data-nav="1">${cur === soal.length - 1 && !locked ? html`${icon('add')} Simpan & Soal Baru` : html`Simpan & Lanjut (#${cur + 2}) ${icon('chevron_right')}`}</button></div>
      </div>`.s;
  };
  const paintAll = () => { paintHead(); paintList(); paintEditor(); paintPreview(); setSave(saveState); };

  // ---------------- Simpan otomatis ----------------
  const collect = () => {
    const x = q(); if (!x || locked) return null;
    const ed = $('#ed', el);
    const teks = $('#teks', ed); if (!teks) return null;
    x.teks = sanitize(teks.innerHTML);
    x.opsi = $$('[data-opt]', ed).map((n) => ({ k: n.dataset.opt, t: sanitize(n.innerHTML) }));
    x.kunci = ($('input[name=kunci]:checked', ed) || {}).value || null;
    x.bobot = Number($('#bb', ed).value) || 1;
    x.tingkat = $('#tk', ed).value;
    x.pembahasan = $('#pb', ed).value;
    return x;
  };
  const save = (x = collect()) => {
    if (!x) return chain;
    dirty = false;
    const snap = { id: x.id, bank_id: bank.id, teks: x.teks, opsi: x.opsi, kunci: x.kunci, bobot: x.bobot, tingkat: x.tingkat, pembahasan: x.pembahasan, gambar_url: x.gambar_url || '' };
    setSave('saving');
    chain = chain.then(() => api.rpc('question_save', { p: snap }).then((r) => {
      x.perlu_revisi = r.perlu_revisi; x.updated_at = r.updated_at;
      if (r.status_bank) bank.status = r.status_bank;
      lastSaved = new Date(); setSave(dirty ? 'saving' : 'ok');
      store.invalidate('banks', 'gr_dashboard');
      if (bank.status === 'siap' && problem(x)) { bank.status = 'draf'; paintHead(); }
      if (alive()) paintList();
    }).catch((e) => { setSave('err'); if (e.hint === 'terkunci') { locked = true; paintAll(); } toastErr(e, 'Gagal menyimpan soal'); }));
    return chain;
  };
  const saveSoon = debounce(() => save(), 900);
  const touched = () => { dirty = true; setSave('saving'); collect(); paintPreview(); paintListLight(); saveSoon(); };
  const paintListLight = debounce(paintList, 300);
  const flush = async () => { if (dirty) await save(); else await chain; };

  const select = async (i) => { if (i === cur) return; await flush(); cur = Math.max(0, Math.min(soal.length - 1, i)); paintList(); paintEditor(); paintPreview(); $('#ed', el).scrollIntoView({ block: 'nearest', behavior: 'smooth' }); };
  const addQ = async (base) => {
    if (locked) return;
    await flush();
    try {
      const r = base ? await api.rpc('question_duplicate', { id: base.id })
        : await api.rpc('question_save', { p: { bank_id: bank.id, teks: '', opsi: LETTERS.slice(0, 5).map((k) => ({ k, t: '' })), bobot: 1, tingkat: 'sedang' } });
      soal.splice(base ? cur + 1 : soal.length, 0, r);
      cur = base ? cur + 1 : soal.length - 1;
      paintAll();
      setTimeout(() => $('#teks', el)?.focus(), 50);
    } catch (e) { toastErr(e); }
  };

  async function insertImage(target) {
    const file = await pickFile('image/*');
    if (!file) return;
    await uploadAndInsert(file, target);
  }
  async function uploadAndInsert(file, target) {
    try {
      toast('Mengunggah gambar…', '', 'info', 1800);
      const { blob, ext, type } = await compressImage(file);
      const path = `${me.tenant.id}/${bank.id}/${api.randomId(10)}.${ext}`;
      const { url } = await api.upload('soal-media', path, blob, type);
      target.focus();
      document.execCommand('insertHTML', false, `<img src="${url}" alt="">`);
      touched();
    } catch (e) { toastErr(e, 'Gagal mengunggah gambar'); }
  }

  paintAll();
  if (!soal.length && !locked) { /* tampilkan keadaan kosong */ }

  let lastRte = null;
  const offs = [
    on(el, 'focusin', '.rte', (e, n) => { lastRte = n; }),
    on(el, 'input', '#ed', () => touched()),
    on(el, 'change', '#ed', (e) => { if (e.target.name === 'kunci') { collect(); paintEditor(); paintPreview(); paintList(); save(); } else touched(); }),
    on(el, 'click', '[data-i]', (e, n) => select(+n.dataset.i)),
    on(el, 'click', '[data-f]', (e, n) => { filter = n.dataset.f; paintList(); }),
    on(el, 'click', '[data-nav]', async (e, b) => { const dir = +b.dataset.nav; if (dir > 0 && cur === soal.length - 1) { if (!locked) await addQ(); } else select(cur + dir); }),
    on(el, 'click', '[data-add], #btn-add', () => addQ()),
    on(el, 'click', '[data-dupq]', () => addQ(q())),
    on(el, 'click', '[data-delq]', async () => {
      if (!(await confirmDialog({ title: `Hapus soal #${cur + 1}?`, text: 'Soal akan dihapus permanen dari bank ini.', danger: true, ok: 'Hapus' }))) return;
      try { await chain; await api.rpc('question_delete', { id: q().id }); soal.splice(cur, 1); cur = Math.max(0, cur - 1); dirty = false; paintAll(); store.invalidate('banks'); } catch (x) { toastErr(x); }
    }),
    on(el, 'click', '[data-addopt]', () => { const x = collect(); x.opsi.push({ k: LETTERS[x.opsi.length], t: '' }); paintEditor(); touched(); }),
    on(el, 'click', '[data-rmopt]', (e, b) => {
      const x = collect(); const k = b.dataset.rmopt;
      const rest = x.opsi.filter((o) => o.k !== k);
      // huruf disusun ulang agar tetap A, B, C…
      const map = {}; rest.forEach((o, i) => { map[o.k] = LETTERS[i]; o.k = LETTERS[i]; });
      x.kunci = x.kunci === k ? null : map[x.kunci] || null;
      x.opsi = rest; paintEditor(); paintPreview(); save(x);
    }),
    on(el, 'click', '[data-rmimg]', () => { const x = collect(); x.gambar_url = null; paintEditor(); paintPreview(); save(x); }),
    on(el, 'mousedown', '[data-cmd]', (e) => e.preventDefault()),
    on(el, 'click', '[data-cmd]', (e, b) => {
      const cmd = b.dataset.cmd;
      const target = lastRte && el.contains(lastRte) ? lastRte : $('#teks', el);
      if (!target) return;
      if (cmd === 'img') return insertImage(target);
      target.focus(); document.execCommand(cmd, false, null); touched();
    }),
    on(el, 'paste', '.rte', async (e, n) => {
      const files = Array.from(e.clipboardData?.files || []).filter((f) => f.type.startsWith('image/'));
      if (files.length) { e.preventDefault(); for (const f of files) await uploadAndInsert(f, n); return; }
      const h = e.clipboardData?.getData('text/html');
      if (h) { e.preventDefault(); document.execCommand('insertHTML', false, sanitize(h.replace(/<img[^>]*src="file:[^"]*"[^>]*>/gi, ''))); }
    }),
    on(el, 'click', '#save-ind', () => { if (saveState === 'err') save(); }),
    on(el, 'click', '[data-dup]', async (e, b) => busy(b, async () => { try { const r = await api.rpc('bank_duplicate', { id: bank.id }); store.invalidate('banks'); toast('Salinan dibuat', 'Silakan revisi di salinan ini.', 'ok'); go('/bank/' + r.id); } catch (x) { toastErr(x); } })),
  ];
  // urut ulang dengan seret
  let dragI = null;
  offs.push(on(el, 'dragstart', '.qn', (e, n) => { dragI = +n.dataset.i; n.classList.add('drag'); }));
  offs.push(on(el, 'dragover', '.qn', (e) => e.preventDefault()));
  offs.push(on(el, 'drop', '.qn', async (e, n) => {
    e.preventDefault(); const to = +n.dataset.i;
    if (dragI == null || dragI === to || locked) return;
    await flush();
    const [m] = soal.splice(dragI, 1); soal.splice(to, 0, m);
    cur = to; dragI = null; paintAll();
    try { await api.rpc('questions_reorder', { bank: bank.id, ids: soal.map((x) => x.id) }); toast('Urutan soal disimpan', '', 'ok', 1800); } catch (x) { toastErr(x); }
  }));

  $('#btn-siap', el).onclick = (e) => busy(e.currentTarget, async () => {
    await flush();
    const to = bank.status === 'siap' ? 'draf' : 'siap';
    try {
      await api.rpc('bank_set_status', { id: bank.id, status: to });
      bank.status = to; paintHead(); store.invalidate('banks', 'gr_dashboard', 'ad_dashboard');
      toast(to === 'siap' ? 'Bank soal siap dipakai' : 'Dikembalikan ke draf', to === 'siap' ? 'Admin kini dapat memakainya untuk jadwal ujian.' : '', 'ok');
    } catch (x) {
      toastErr(x, 'Belum bisa ditandai siap');
      const bad = soal.findIndex((s) => problem(s));
      if (bad >= 0) { filter = 'semua'; select(bad); }
    }
  });
  $('#btn-prev', el).onclick = async () => { collect(); modal({ title: 'Pratinjau Layar Siswa', size: 'narrow', body: previewPhone(q(), cur, soal.length, bank.nama) }); };
  $('#btn-more', el).onclick = (e) => popMenu(e.currentTarget, [
    { label: 'Ubah info bank soal', icon: 'edit', k: 'edit' }, { label: 'Duplikat bank soal', icon: 'content_copy', k: 'dup' }, { label: 'Kembali ke daftar', icon: 'arrow_back', k: 'back' }], async (it) => {
    if (it.k === 'back') go('/bank');
    else if (it.k === 'dup') { try { const r = await api.rpc('bank_duplicate', { id: bank.id }); store.invalidate('banks'); go('/bank/' + r.id); } catch (x) { toastErr(x); } }
    else if (it.k === 'edit') {
      const { bankForm } = await import('./bank-list.js');
      const data = await store.fetchOnce('banks||||', () => api.rpc('banks_list', {}));
      bankForm({ data, me, bank, go, onSaved: () => { store.invalidate('bank:' + bank.id); go('/bank/' + bank.id, { replace: true }); } });
    }
  });
  const keys = (e) => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); save(); } };
  document.addEventListener('keydown', keys);
  const before = (e) => { if (dirty || saveState === 'saving') { e.preventDefault(); e.returnValue = ''; } };
  window.addEventListener('beforeunload', before);
  return () => {
    if (dirty) save();
    store.invalidate('bank:' + bank.id);
    offs.forEach((f) => f());
    document.removeEventListener('keydown', keys);
    window.removeEventListener('beforeunload', before);
  };
}
