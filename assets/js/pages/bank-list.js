import * as api from '../core/api.js';
import * as store from '../core/store.js';
import { html, icon, $, $$, on, fmt, mapelColor, badge, skel, empty, modal, toast, toastErr, busy, popMenu, confirmDialog, debounce } from '../core/ui.js';

const load = (f = {}) => api.rpc('banks_list', { q: f.q || '', mapel: f.mapel || '', pemilik: f.pemilik || null, status: f.status || '' });
export const prefetch = () => store.fetchOnce('banks|||', () => load());

export function bankForm({ data, me, bank, go, onSaved }) {
  const admin = data?.admin;
  const tugas = data?.penugasan || [];
  const mapelOpts = admin ? Array.from(new Set(['Matematika', 'Bahasa Indonesia', 'IPA', 'Bahasa Inggris', 'IPS', ...(data?.mapel || [])])) : Array.from(new Set(tugas.map((t) => t.mapel)));
  if (!admin && !mapelOpts.length) {
    return modal({ title: 'Belum ada penugasan', ic: 'assignment_late', size: 'narrow', body: html`<p class="muted">Anda belum ditugaskan ke mata pelajaran apa pun. Minta admin lembaga menambahkan penugasan di menu <b>Guru & Penugasan</b>.</p>`,
      foot: html`<button class="btn primary" data-x>Mengerti</button>` });
  }
  const m = modal({
    title: bank ? 'Ubah Info Bank Soal' : 'Bank Soal Baru', ic: 'library_add', size: 'narrow',
    body: html`<form class="col" id="bf"><div class="field"><label>Nama bank soal <span class="req">*</span></label><input class="input" name="nama" value="${bank?.nama || ''}" placeholder="PTS Ganjil Matematika Kelas 8" required></div>
      <div class="field"><label>Mata pelajaran <span class="req">*</span></label>${admin ? html`<input class="input" name="mapel" list="dl-mp" value="${bank?.mapel || ''}" required><datalist id="dl-mp">${mapelOpts.map((x) => html`<option value="${x}">`)}</datalist>`
        : html`<select class="select" name="mapel">${mapelOpts.map((x) => html`<option ${bank?.mapel === x ? 'selected' : ''}>${x}</option>`)}</select>`}</div>
      <div class="field"><label>Jenjang / kelas</label><input class="input" name="jenjang" value="${bank?.jenjang || ''}" placeholder="8"></div>
      ${admin && !bank ? html`<div class="field"><label>Guru pemilik</label><select class="select" name="pemilik"><option value="">Saya sendiri</option>${(data.guru || []).filter((g) => g.id !== me.id).map((g) => html`<option value="${g.id}">${g.nama}</option>`)}</select>
        <div class="hint">Guru pemilik dapat menyunting bank soal ini dari akunnya.</div></div>` : ''}</form>`,
    foot: html`<button class="btn secondary" data-x>Batal</button><button class="btn primary" data-save>${icon('save')} ${bank ? 'Simpan' : 'Buat & Buka Editor'}</button>`,
  });
  $('[data-save]', m.el).onclick = (e) => busy(e.currentTarget, async () => {
    const f = $('#bf', m.el);
    try {
      const r = await api.rpc('bank_save', { p: { id: bank?.id, nama: f.nama.value, mapel: f.mapel.value, jenjang: f.jenjang.value, pemilik_id: f.pemilik?.value || null } });
      m.close(); store.invalidate('banks', 'bank:', 'gr_dashboard');
      if (onSaved) onSaved(r); else go('/bank/' + r.id + (bank ? '' : '?tulis=1'));
    } catch (x) { toastErr(x); }
  });
  return m;
}

export default async function (ctx) {
  const { el, title, alive, me, mode, go, query } = ctx;
  const guru = mode === 'guru';
  title(guru ? 'Bank Soal Saya' : 'Bank Soal');
  const f = { q: '', mapel: '', pemilik: '', status: '' };
  let data = null;
  el.innerHTML = html`<div class="page-head"><div><div class="crumb">${guru ? 'Ruang Guru' : 'Ujian'}</div><h1>${guru ? 'Bank Soal Saya' : 'Bank Soal'}</h1>
    <div class="sub">${guru ? 'Susun soal secara online, impor dari Word, lalu tandai "Siap Dipakai" agar admin dapat menjadwalkan ujian.' : 'Semua bank soal lembaga. Hanya bank berstatus Siap yang bisa dipakai di jadwal ujian.'}</div></div>
    <span class="spacer"></span><div class="row wrap gap-8"><a class="btn secondary" href="#/impor">${icon('upload_file')} Impor Word</a><a class="btn secondary" href="#/tulis">${icon('edit_note')} Tulis Soal</a>
    <button class="btn primary" data-act="new">${icon('library_add')} Bank Soal Baru</button></div></div>
    <div class="card pad-0 mb-16"><div class="toolbar"><div class="input-ic">${icon('search')}<input class="input soft" id="q" placeholder="Cari nama bank soal atau mapel…"></div>
      <select class="select soft" id="fm" style="width:auto;min-width:170px"><option value="">Semua mapel</option></select>
      ${guru ? '' : html`<select class="select soft" id="fp" style="width:auto;min-width:170px"><option value="">Semua guru</option></select>`}
      <div class="seg" id="fs">${[['', 'Aktif'], ['draf', 'Draf'], ['siap', 'Siap'], ['diarsipkan', 'Arsip']].map(([k, l]) => html`<button data-s="${k}" class="${k === '' ? 'on' : ''}">${l}</button>`)}</div></div></div>
    <div id="grid">${skel.cards(6, 210)}</div>`.s;

  const paint = (d) => {
    data = d; if (!alive()) return;
    const fm = $('#fm', el), fp = $('#fp', el);
    if (fm.options.length <= 1) d.mapel.forEach((x) => fm.add(new Option(x, x)));
    if (fp && fp.options.length <= 1) d.guru.forEach((g) => fp.add(new Option(g.nama, g.id)));
    $('#grid', el).innerHTML = d.rows.length ? html`<div class="grid g-3">${d.rows.map((b) => {
      const c = mapelColor(b.mapel); const pct = b.jumlah ? Math.round((b.lengkap / b.jumlah) * 100) : 0;
      return html`<div class="card exam-card bank-card" data-open="${b.id}">
        <div class="chip-head" style="background:${c}">${b.mapel}${b.jenjang ? ' · ' + b.jenjang : ''}</div>
        <div class="row top"><div style="flex:1;min-width:0"><div class="t clamp2">${b.nama}</div>
          <div class="m mt-4">${icon('person')} ${b.pemilik?.nama || '–'}</div></div>
          <button class="btn ghost icon sm" data-act="menu" data-id="${b.id}" aria-label="Aksi">${icon('more_vert')}</button></div>
        <div class="row wrap gap-8">${b.terkunci ? badge('terkunci', 'Terkunci · dipakai ujian') : badge(b.status)}
          ${b.tanpa_kunci ? html`<span class="badge b-orange">${icon('key_off')} ${b.tanpa_kunci} tanpa kunci</span>` : ''}
          ${b.revisi ? html`<span class="badge b-coral">${icon('flag')} ${b.revisi} perlu revisi</span>` : ''}</div>
        <div class="sep"><div class="row" style="justify-content:space-between"><span class="small">${b.lengkap}/${b.jumlah} soal lengkap</span><b style="color:${c}">${pct}%</b></div>
          <div class="progress mt-8"><i style="width:${pct}%;background:${c}"></i></div>
          <div class="foot"><span class="muted">Diubah ${fmt.rel(b.updated_at)}</span><span class="c-primary semi">Tulis & ubah soal ${icon('arrow_forward')}</span></div></div></div>`;
    })}</div>` : html`<div class="card">${empty('layers', 'Belum ada bank soal', f.q || f.mapel || f.status ? 'Tidak ada yang cocok dengan filter.' : 'Buat bank soal pertama Anda, lalu tulis soal secara online atau impor dari Word.',
      html`<button class="btn primary" data-act="new">${icon('library_add')} Buat Bank Soal</button>`)}</div>`;
  };
  const key = () => `banks|${f.q}|${f.mapel}|${f.pemilik}|${f.status}`;
  const refresh = () => store.swr(key(), () => load(f), (d) => { paint(d); }, { alive, ttl: 10000 }).catch(toastErr);
  const hard = () => { store.invalidate('banks'); refresh(); };
  await refresh();
  if (query.baru && alive()) bankForm({ data, me, go });

  $('#q', el).addEventListener('input', debounce((e) => { f.q = e.target.value.trim(); refresh(); }, 300));
  $('#fm', el).onchange = (e) => { f.mapel = e.target.value; refresh(); };
  if ($('#fp', el)) $('#fp', el).onchange = (e) => { f.pemilik = e.target.value; refresh(); };
  const offs = [
    on(el, 'click', '[data-s]', (e, b) => { $$('[data-s]', el).forEach((x) => x.classList.toggle('on', x === b)); f.status = b.dataset.s; refresh(); }),
    on(el, 'click', '[data-open]', (e, card) => { if (e.target.closest('[data-act]')) return; go('/bank/' + card.dataset.open); }),
    on(el, 'click', '[data-act]', (e, b) => {
      if (b.dataset.act === 'new') return bankForm({ data, me, go });
      const bank = data.rows.find((x) => x.id === b.dataset.id);
      const items = [{ label: 'Buka editor soal', icon: 'edit_note', k: 'open' }, { label: 'Ubah info bank', icon: 'edit', k: 'edit' }, { label: 'Duplikat', icon: 'content_copy', k: 'dup' }];
      if (data.admin) items.push({ label: 'Pindahkan kepemilikan', icon: 'swap_horiz', k: 'move' });
      items.push({ sep: true });
      if (bank.status === 'diarsipkan') items.push({ label: 'Kembalikan dari arsip', icon: 'unarchive', k: 'unarc' });
      else items.push({ label: 'Arsipkan', icon: 'archive', k: 'arc' });
      items.push({ label: 'Hapus', icon: 'delete', k: 'del', red: true });
      popMenu(b, items, async (it) => {
        try {
          if (it.k === 'open') go('/bank/' + bank.id);
          else if (it.k === 'edit') bankForm({ data, me, bank, go, onSaved: hard });
          else if (it.k === 'dup') { const r = await api.rpc('bank_duplicate', { id: bank.id }); toast('Bank soal diduplikat', '', 'ok'); store.invalidate('banks'); go('/bank/' + r.id); }
          else if (it.k === 'arc' || it.k === 'unarc') { await api.rpc('bank_set_status', { id: bank.id, status: it.k === 'arc' ? 'diarsipkan' : 'draf' }); hard(); }
          else if (it.k === 'move') moveDialog(bank);
          else if (it.k === 'del' && await confirmDialog({ title: 'Hapus bank soal?', text: `"${bank.nama}" beserta ${bank.jumlah} soalnya akan dihapus permanen. Hasil ujian lama tetap tersimpan.`, danger: true, ok: 'Hapus' })) {
            await api.rpc('bank_delete', { id: bank.id }); toast('Bank soal dihapus', '', 'ok'); hard();
          }
        } catch (x) { toastErr(x); }
      });
    }),
  ];
  function moveDialog(bank) {
    const m = modal({
      title: 'Pindahkan Kepemilikan', sub: bank.nama, ic: 'swap_horiz', size: 'narrow',
      body: html`<div class="field"><label>Guru tujuan</label><select class="select" id="tg">${data.guru.map((g) => html`<option value="${g.id}" ${g.id === bank.pemilik?.id ? 'selected' : ''}>${g.nama}</option>`)}</select></div>`,
      foot: html`<button class="btn secondary" data-x>Batal</button><button class="btn primary" data-go>Pindahkan</button>`,
    });
    $('[data-go]', m.el).onclick = (e) => busy(e.currentTarget, async () => {
      try { await api.rpc('bank_transfer', { id: bank.id, staff: $('#tg', m.el).value }); m.close(); toast('Kepemilikan dipindahkan', '', 'ok'); hard(); } catch (x) { toastErr(x); }
    });
  }
  return () => offs.forEach((x) => x());
}
