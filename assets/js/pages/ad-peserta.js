import * as api from '../core/api.js';
import * as store from '../core/store.js';
import { html, raw, icon, $, on, fmt, initials, badge, skel, empty, modal, toast, toastErr, busy, popMenu, confirmDialog, debounce, download, pickFile, printDoc, esc } from '../core/ui.js';
import { readSheet, writeXlsx } from '../lib/xlsx.js';

const load = (q = '', kelas = '', page = 1) => api.rpc('participants_list', { q, kelas, page, size: 50 });
export const prefetch = () => store.fetchOnce('peserta||1', () => load());

export function printCards(list, me) {
  const lembaga = me.tenant?.nama || '', kode = me.tenant?.kode || '';
  printDoc('Kartu Login Peserta', `<h1>Kartu Login Peserta UjiKu CBT</h1><div class="sub">${esc(lembaga)} · Kode lembaga: <b>${esc(kode)}</b> · Masuk di ${esc(api.APP_URL)}</div>
    <div class="kartu">${list.map((k) => `<div class="k"><div style="font-size:10px;color:#6B7280">${esc(lembaga)}</div><b>${esc(k.nama)}</b><div>Kelas ${esc(k.kelas || '-')}</div>
    <div style="margin-top:6px">Kode Lembaga: <b>${esc(kode)}</b></div><div>NIS: <b>${esc(k.nis)}</b></div><div>Sandi: <span class="s">${esc(k.sandi)}</span></div></div>`).join('')}</div>`);
}
function credDialog(list, me, judul = 'Kredensial login peserta') {
  const m = modal({
    title: judul, ic: 'key', size: 'wide',
    body: html`<div class="alert orange"><div class="a-ic">${icon('warning')}</div><div class="small">Sandi hanya ditampilkan <b>sekali</b>. Cetak kartu login atau unduh Excel sekarang, lalu bagikan ke peserta.</div></div>
      <div class="table-wrap" style="max-height:340px;overflow:auto"><table class="table"><thead><tr><th>NIS</th><th>Nama</th><th>Kelas</th><th>Sandi</th></tr></thead>
      <tbody>${list.map((k) => html`<tr><td>${k.nis}</td><td>${k.nama}</td><td>${k.kelas}</td><td class="mono bold">${k.sandi}</td></tr>`)}</tbody></table></div>`,
    foot: html`<button class="btn secondary" data-xl>${icon('table_view')} Unduh Excel</button><button class="btn primary" data-print>${icon('print')} Cetak Kartu Login</button>`,
  });
  $('[data-print]', m.el).onclick = () => printCards(list, me);
  $('[data-xl]', m.el).onclick = () => download(writeXlsx([{ name: 'Kredensial', widths: [16, 32, 10, 12, 16], rows: [['NIS', 'Nama', 'Kelas', 'Sandi', 'Kode Lembaga'], ...list.map((k) => [k.nis, k.nama, k.kelas, k.sandi, me.tenant?.kode || ''])] }]), 'kredensial-peserta.xlsx');
}

export default async function (ctx) {
  const { el, title, alive, me, query } = ctx;
  title('Data Peserta');
  let q = query.q || '', kelas = '', page = 1, data = null;
  el.innerHTML = html`<div class="page-head"><div><div class="crumb">Pengguna</div><h1>Data Peserta</h1>
    <div class="sub">Peserta masuk dengan <b>Kode Lembaga <span class="badge b-blue">${me.tenant?.kode}</span></b>, NIS, dan sandi.</div></div>
    <span class="spacer"></span><div class="row wrap gap-8"><button class="btn secondary" data-act="cards">${icon('badge')} Kartu Login</button>
    <button class="btn secondary" data-act="import">${icon('upload_file')} Impor Excel</button><button class="btn primary" data-act="add">${icon('person_add')} Tambah Peserta</button></div></div>
    <div id="kelas" class="row wrap gap-8 mb-16"></div>
    <div class="card pad-0"><div class="toolbar"><div class="input-ic">${icon('search')}<input class="input soft" id="q" placeholder="Cari nama atau NIS…" value="${q}"></div>
      <span class="spacer"></span><span class="muted small" id="cnt"></span></div><div id="tbl">${skel.lines(8)}</div><div class="pager" id="pager"></div></div>`.s;

  const paint = (d) => {
    data = d; if (!alive()) return;
    const total = d.kelas.reduce((s, k) => s + k.n, 0);
    $('#kelas', el).innerHTML = html`<span class="chip ${kelas === '' ? 'on' : ''}" data-k="">Semua kelas · ${total}</span>${d.kelas.map((k) => html`<span class="chip ${kelas === k.kelas ? 'on' : ''}" data-k="${k.kelas}">${k.kelas || 'Tanpa kelas'} · ${k.n}</span>`)}`.s;
    $('#cnt', el).textContent = `${fmt.num(d.total)} peserta`;
    $('#tbl', el).innerHTML = d.rows.length ? html`<div class="table-wrap"><table class="table"><thead><tr><th>NIS</th><th>Nama Peserta</th><th>Kelas</th><th>Status</th><th></th></tr></thead>
      <tbody>${d.rows.map((r) => html`<tr data-id="${r.id}"><td class="mono">${r.nis}</td>
        <td><div class="row gap-8"><span class="avatar sm">${initials(r.nama)}</span><span class="semi">${r.nama}</span>${r.terkunci ? html`<span class="badge b-red" style="height:20px">${icon('lock')} Terkunci</span>` : ''}</div></td>
        <td>${r.kelas || '–'}</td><td>${badge(r.status)}</td>
        <td style="text-align:right"><button class="btn ghost icon sm" data-act="menu" aria-label="Aksi">${icon('more_vert')}</button></td></tr>`)}</tbody></table></div>`.s
      : empty('groups', q || kelas ? 'Tidak ada peserta yang cocok' : 'Belum ada peserta', q || kelas ? 'Ubah kata kunci atau filter kelas.' : 'Impor daftar peserta dari Excel atau tambahkan satu per satu.',
          q || kelas ? '' : html`<button class="btn primary" data-act="import">${icon('upload_file')} Impor dari Excel</button>`).s;
    const pages = Math.ceil(d.total / d.size);
    $('#pager', el).innerHTML = pages > 1 ? html`<span class="muted small">Halaman ${page} dari ${pages}</span><span class="spacer"></span>
      <button data-pg="${page - 1}" ${page <= 1 ? 'disabled' : ''}>${icon('chevron_left')}</button>
      ${Array.from({ length: Math.min(pages, 7) }, (_, i) => { const p = pages <= 7 ? i + 1 : Math.min(Math.max(1, page - 3), pages - 6) + i; return html`<button data-pg="${p}" class="${p === page ? 'on' : ''}">${p}</button>`; })}
      <button data-pg="${page + 1}" ${page >= pages ? 'disabled' : ''}>${icon('chevron_right')}</button>`.s : '';
  };
  const refresh = () => store.swr(`peserta|${q}|${kelas}|${page}`, () => load(q, kelas, page), paint, { alive, ttl: 10000 }).catch(toastErr);
  const hard = () => { store.invalidate('peserta|'); refresh(); };
  await refresh();

  $('#q', el).addEventListener('input', debounce((e) => { q = e.target.value.trim(); page = 1; refresh(); }, 300));
  const offs = [
    on(el, 'click', '[data-k]', (e, b) => { kelas = b.dataset.k; page = 1; refresh(); }),
    on(el, 'click', '[data-pg]', (e, b) => { if (b.disabled) return; page = +b.dataset.pg; refresh(); }),
    on(el, 'click', '[data-act]', (e, b) => {
      const act = b.dataset.act;
      const r = data?.rows.find((x) => x.id === b.closest('tr')?.dataset.id);
      if (act === 'add') return form(null);
      if (act === 'import') return importDialog();
      if (act === 'cards') return cardsDialog();
      if (act === 'menu') popMenu(b, [
        { label: 'Ubah data', icon: 'edit', k: 'edit' }, { label: 'Reset sandi', icon: 'lock_reset', k: 'reset' }, { sep: true },
        r.status === 'aktif' ? { label: 'Nonaktifkan', icon: 'block', k: 'off', red: true } : { label: 'Aktifkan', icon: 'check_circle', k: 'on' },
        { label: 'Hapus', icon: 'delete', k: 'del', red: true }], async (it) => {
        try {
          if (it.k === 'edit') form(r);
          else if (it.k === 'reset') { const c = await api.rpc('participant_reset_password', { id: r.id }); credDialog([c], me, 'Sandi baru peserta'); hard(); }
          else if (it.k === 'on' || it.k === 'off') { await api.rpc('participant_set_status', { id: r.id, status: it.k === 'on' ? 'aktif' : 'nonaktif' }); hard(); }
          else if (it.k === 'del' && await confirmDialog({ title: 'Hapus peserta?', text: `${r.nama} (${r.nis}) akan dihapus permanen.`, danger: true, ok: 'Hapus' })) {
            await api.rpc('participant_delete', { id: r.id }); toast('Peserta dihapus', '', 'ok'); hard();
          }
        } catch (x) { toastErr(x); }
      });
    }),
  ];

  function form(r) {
    const m = modal({
      title: r ? 'Ubah Peserta' : 'Tambah Peserta', ic: 'person_add', size: 'narrow',
      body: html`<form class="col" id="pf"><div class="field"><label>NIS / Nomor peserta <span class="req">*</span></label><input class="input" name="nis" value="${r?.nis || ''}" ${r ? 'readonly' : ''} required></div>
        <div class="field"><label>Nama lengkap <span class="req">*</span></label><input class="input" name="nama" value="${r?.nama || ''}" required></div>
        <div class="field"><label>Kelas</label><input class="input" name="kelas" value="${r?.kelas || kelas}" list="dl-k" placeholder="8A"><datalist id="dl-k">${(data?.kelas || []).map((k) => html`<option value="${k.kelas}">`)}</datalist></div>
        ${r ? '' : html`<div class="field"><label>Sandi</label><input class="input" name="sandi" placeholder="Kosongkan agar dibuat otomatis (6 angka)"></div>`}</form>`,
      foot: html`<button class="btn secondary" data-x>Batal</button><button class="btn primary" data-save>${icon('save')} Simpan</button>`,
    });
    $('[data-save]', m.el).onclick = (e) => busy(e.currentTarget, async () => {
      const f = $('#pf', m.el);
      try {
        const res = await api.rpc('participants_upsert', { rows: [{ nis: f.nis.value, nama: f.nama.value, kelas: f.kelas.value, sandi: f.sandi?.value || '' }] });
        if (res.galat.length) throw new Error(res.galat[0].pesan);
        m.close(); hard();
        if (res.kredensial.length) credDialog(res.kredensial, me, 'Peserta ditambahkan'); else toast('Data peserta disimpan', '', 'ok');
      } catch (x) { toastErr(x); }
    });
  }

  function importDialog() {
    let rows = [];
    const m = modal({
      title: 'Impor Peserta dari Excel', sub: 'Format kolom: NIS, Nama, Kelas, Sandi (opsional)', ic: 'upload_file', size: 'wide',
      body: html`<div class="stepper" style="--n:3"><div class="step on" id="s1"><div class="n">1</div><div><div class="sl">Langkah 1</div><div class="st">Unduh Templat</div></div></div>
        <div class="step" id="s2"><div class="n">2</div><div><div class="sl">Langkah 2</div><div class="st">Unggah Berkas</div></div></div>
        <div class="step" id="s3"><div class="n">3</div><div><div class="sl">Langkah 3</div><div class="st">Pratinjau</div></div></div></div>
        <div class="row wrap mt-16"><button class="btn secondary" data-tpl>${icon('download')} Unduh templat Excel</button>
          <span class="muted small">NIS yang sudah ada akan diperbarui (nama & kelas). Sandi kosong dibuat otomatis.</span></div>
        <div class="dropzone mt-16" id="dz">${icon('cloud_upload')}<div class="semi mt-8">Seret berkas .xlsx / .csv ke sini atau klik untuk memilih</div><div class="muted small">Maksimal 2.000 baris per impor</div></div>
        <div id="prev" class="mt-16"></div>`,
      foot: html`<button class="btn secondary" data-x>Batal</button><button class="btn primary" data-go disabled>${icon('done_all')} Impor</button>`,
    });
    $('[data-tpl]', m.el).onclick = () => {
      download(writeXlsx([{ name: 'Peserta', widths: [16, 34, 10, 14], rows: [['NIS', 'Nama', 'Kelas', 'Sandi'], ['2024001', 'Siti Aminah', '8A', ''], ['2024002', 'Budi Santoso', '8A', '']] }]), 'templat-peserta-ujiku.xlsx');
      $('#s1', m.el).className = 'step done';
    };
    const handle = async (file) => {
      if (!file) return;
      try {
        const raw = await readSheet(file);
        if (!raw.length) throw new Error('Berkas kosong.');
        const head = raw[0].map((h) => String(h).toLowerCase());
        const hasHead = head.some((h) => /nis|nama|kelas/.test(h));
        const idx = (re, d) => { const i = head.findIndex((h) => re.test(h)); return hasHead && i >= 0 ? i : d; };
        const iN = idx(/nis|nomor|no\.? ?induk|username/, 0), iM = idx(/nama/, 1), iK = idx(/kelas|rombel/, 2), iS = idx(/sandi|password|pass/, 3);
        const seen = new Set();
        rows = raw.slice(hasHead ? 1 : 0).map((r, i) => {
          const o = { nis: String(r[iN] || '').trim(), nama: String(r[iM] || '').trim(), kelas: String(r[iK] || '').trim(), sandi: String(r[iS] || '').trim(), baris: i + 2 };
          o.err = !o.nis || !o.nama ? 'NIS/nama kosong' : seen.has(o.nis) ? 'NIS ganda di berkas' : '';
          seen.add(o.nis); return o;
        });
        const ok = rows.filter((r) => !r.err);
        $('#s2', m.el).className = 'step done'; $('#s3', m.el).className = 'step on';
        $('#prev', m.el).innerHTML = html`<div class="row wrap gap-8"><span class="badge b-green">${icon('check')} ${ok.length} siap diimpor</span>
          ${rows.length - ok.length ? html`<span class="badge b-red">${icon('error')} ${rows.length - ok.length} bermasalah</span>` : ''}<span class="muted small">${file.name}</span></div>
          <div class="table-wrap mt-8" style="max-height:300px;overflow:auto"><table class="table"><thead><tr><th>Baris</th><th>NIS</th><th>Nama</th><th>Kelas</th><th>Sandi</th><th>Status</th></tr></thead>
          <tbody>${rows.slice(0, 300).map((r) => html`<tr style="${r.err ? 'background:#FEF2F2' : ''}"><td>${r.baris}</td><td>${r.nis}</td><td>${r.nama}</td><td>${r.kelas}</td><td>${r.sandi ? '••••' : html`<span class="muted">otomatis</span>`}</td>
            <td>${r.err ? html`<span class="c-red small">${r.err}</span>` : icon('check_circle', 'c-green')}</td></tr>`)}</tbody></table></div>
          ${rows.length > 300 ? html`<div class="muted small mt-8">Menampilkan 300 dari ${rows.length} baris.</div>` : ''}`.s;
        const go = $('[data-go]', m.el); go.disabled = !ok.length; go.innerHTML = html`${icon('done_all')} Impor ${ok.length} Peserta`.s;
      } catch (x) { toastErr(x, 'Gagal membaca berkas'); }
    };
    const dz = $('#dz', m.el);
    dz.onclick = async () => handle(await pickFile('.xlsx,.csv'));
    dz.ondragover = (e) => { e.preventDefault(); dz.classList.add('over'); };
    dz.ondragleave = () => dz.classList.remove('over');
    dz.ondrop = (e) => { e.preventDefault(); dz.classList.remove('over'); handle(e.dataTransfer.files[0]); };
    $('[data-go]', m.el).onclick = (e) => busy(e.currentTarget, async () => {
      try {
        const ok = rows.filter((r) => !r.err).map(({ nis, nama, kelas: k, sandi }) => ({ nis, nama, kelas: k, sandi }));
        const res = await api.rpc('participants_upsert', { rows: ok });
        m.close(); hard();
        toast('Impor selesai', `${res.baru} peserta baru, ${res.diperbarui} diperbarui.`, 'ok');
        if (res.kredensial.length) credDialog(res.kredensial, me, `${res.kredensial.length} kredensial login baru`);
      } catch (x) { toastErr(x); }
    });
  }

  function cardsDialog() {
    const m = modal({
      title: 'Cetak Kartu Login', ic: 'badge', size: 'narrow',
      body: html`<p class="muted">Karena sandi disimpan terenkripsi, kartu dicetak dengan <b>membuat sandi baru</b> untuk semua peserta di kelas terpilih. Sandi lama tidak berlaku lagi.</p>
        <div class="field mt-16"><label>Kelas</label><select class="select" id="kc">${(data?.kelas || []).filter((k) => k.kelas).map((k) => html`<option value="${k.kelas}">${k.kelas} (${k.n} peserta)</option>`)}</select></div>`,
      foot: html`<button class="btn secondary" data-x>Batal</button><button class="btn primary" data-go>${icon('lock_reset')} Buat sandi & cetak</button>`,
    });
    $('[data-go]', m.el).onclick = (e) => busy(e.currentTarget, async () => {
      const k = $('#kc', m.el).value;
      if (!k) return;
      try { const r = await api.rpc('participants_reset_kelas', { kelas: k }); m.close(); credDialog(r.kredensial, me, `Kartu login kelas ${k}`); } catch (x) { toastErr(x); }
    });
  }
  return () => offs.forEach((f) => f());
}
