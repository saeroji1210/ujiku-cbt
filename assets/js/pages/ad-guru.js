import * as api from '../core/api.js';
import * as store from '../core/store.js';
import { html, raw, icon, $, $$, on, fmt, initials, mapelColor, badge, skel, empty, modal, toast, toastErr, busy, popMenu, confirmDialog, copyText } from '../core/ui.js';

const KEY = 'staff_list';
const load = () => api.rpc('staff_list');
export const prefetch = () => store.fetchOnce(KEY, load);
const ROLE = { admin: ['Admin', 'b-navy'], guru: ['Guru', 'b-blue'], pengawas: ['Pengawas', 'b-cyan'] };

export const inviteLink = (tok) => `${api.APP_URL}#/aktivasi?t=${tok}`;
export function shareInvite({ nama, email, wa, token, lembaga }) {
  const link = inviteLink(token);
  const pesan = `Halo ${nama}, Anda diundang ke UjiKu CBT${lembaga ? ' (' + lembaga + ')' : ''}. Aktivasi akun dengan login Google memakai email ${email} melalui tautan berikut:\n${link}`;
  const m = modal({
    title: 'Tautan undangan siap', ic: 'mark_email_read', size: 'narrow',
    body: html`<p class="muted">Kirim tautan ini ke <b>${nama}</b>. Ia cukup membuka tautan lalu masuk dengan akun Google <b>${email}</b>.</p>
      <div class="row mt-16" style="background:var(--slate-50);border-radius:12px;padding:10px 12px"><code class="small ellipsis" style="flex:1">${link}</code></div>`,
    foot: html`<button class="btn secondary" data-copy>${icon('content_copy')} Salin tautan</button>
      <a class="btn success" target="_blank" rel="noopener" href="https://wa.me/${(wa || '').replace(/\D/g, '').replace(/^0/, '62')}?text=${encodeURIComponent(pesan)}">${icon('chat')} Kirim via WhatsApp</a>`,
  });
  $('[data-copy]', m.el).onclick = () => copyText(link, 'Tautan undangan disalin');
}

export default async function (ctx) {
  const { el, title, alive, me } = ctx;
  title('Guru & Penugasan');
  let data = null;
  el.innerHTML = html`<div class="page-head"><div><div class="crumb">Pengguna</div><h1>Guru & Penugasan</h1>
    <div class="sub">Daftarkan email guru dan pengawas, atur mata pelajaran yang diampu, dan pantau progres penyusunan soal.</div></div>
    <span class="spacer"></span><button class="btn primary" data-act="add">${icon('person_add')} Tambah Guru / Staf</button></div>
    <div id="body">${skel.table(5)}</div>`.s;
  const body = $('#body', el);

  const paint = (d) => {
    data = d; if (!alive()) return;
    const rows = d.rows;
    const aktif = rows.filter((r) => r.status === 'aktif').length, undangan = rows.filter((r) => r.status === 'undangan').length;
    body.innerHTML = html`<div class="grid g-3" style="margin-bottom:20px">
        ${[['groups', 'Total staf', rows.length, '#1565D8'], ['verified', 'Aktif', aktif, '#22A06B'], ['schedule_send', 'Menunggu aktivasi', undangan, '#F7941D']]
          .map(([ic, l, v, c]) => html`<div class="card row"><div class="icon-tile" style="background:${c}">${icon(ic)}</div><div><div class="bold" style="font-size:24px">${v}</div><div class="muted small">${l}</div></div></div>`)}</div>
      <div class="card pad-0">${rows.length ? html`<div class="table-wrap"><table class="table"><thead><tr>
        <th>Nama & Email</th><th>Peran</th><th>Mapel Diampu</th><th class="num">Bank Soal</th><th class="num hide-sm">Soal</th><th class="hide-sm">Terakhir Diubah</th><th>Status</th><th></th></tr></thead>
        <tbody>${rows.map((r) => html`<tr data-id="${r.id}">
          <td><div class="row gap-8"><span class="avatar">${initials(r.nama)}</span><div style="min-width:0"><div class="semi">${r.nama}${r.saya ? html` <span class="badge b-gray" style="height:20px">Anda</span>` : ''}</div>
            <div class="muted small">${r.email}</div></div></div></td>
          <td><div class="row gap-4 wrap">${r.roles.map((x) => html`<span class="badge ${ROLE[x]?.[1] || 'b-gray'}" style="height:22px">${ROLE[x]?.[0] || x}</span>`)}</div></td>
          <td><div class="row gap-4 wrap" style="max-width:260px">${r.penugasan.length ? r.penugasan.map((p) => html`<span class="badge" style="background:${mapelColor(p.mapel)}1A;color:${mapelColor(p.mapel)};height:22px">${p.mapel}${p.kelas ? ' · ' + p.kelas : ''}</span>`)
            : r.roles.includes('guru') ? html`<button class="btn ghost sm" data-act="assign">${icon('add')} Atur penugasan</button>` : html`<span class="muted">–</span>`}</div></td>
          <td class="num">${r.bank_siap}/${r.bank}</td><td class="num hide-sm">${fmt.num(r.soal)}</td>
          <td class="hide-sm muted small">${r.diubah ? fmt.rel(r.diubah) : '–'}</td>
          <td>${badge(r.status)}</td>
          <td><button class="btn ghost icon sm" data-act="menu" aria-label="Aksi">${icon('more_vert')}</button></td></tr>`)}</tbody></table></div>`
        : empty('badge', 'Belum ada guru', 'Tambahkan email guru untuk mulai menyusun soal secara online.', html`<button class="btn primary" data-act="add">${icon('person_add')} Tambah Guru</button>`)}</div>`.s;
  };
  await store.swr(KEY, load, paint, { alive });

  const reload = async () => { store.invalidate(KEY); paint(await store.fetchOnce(KEY, load)); };
  const off = on(el, 'click', '[data-act]', (e, b) => {
    const act = b.dataset.act;
    const r = data?.rows.find((x) => x.id === b.closest('tr')?.dataset.id);
    if (act === 'add') return staffForm(null);
    if (act === 'assign') return assignDrawer(r);
    if (act === 'menu') {
      const items = [{ label: 'Ubah data & peran', icon: 'edit', k: 'edit' }];
      if (r.roles.includes('guru')) items.push({ label: 'Atur penugasan mapel', icon: 'assignment_ind', k: 'assign' });
      if (r.status === 'undangan') items.push({ label: 'Bagikan tautan undangan', icon: 'share', k: 'invite' });
      if (!r.saya) {
        items.push({ sep: true });
        items.push(r.status === 'nonaktif' ? { label: 'Aktifkan kembali', icon: 'check_circle', k: 'on' } : { label: 'Nonaktifkan', icon: 'block', k: 'off', red: true });
        if (r.status === 'undangan') items.push({ label: 'Hapus undangan', icon: 'delete', k: 'del', red: true });
      }
      popMenu(b, items, async (it) => {
        try {
          if (it.k === 'edit') staffForm(r);
          else if (it.k === 'assign') assignDrawer(r);
          else if (it.k === 'invite') { const x = await api.rpc('staff_invite_link', { staff: r.id }); shareInvite({ ...r, token: x.token, lembaga: me.tenant?.nama }); reload(); }
          else if (it.k === 'on' || it.k === 'off') { await api.rpc('staff_set_status', { id: r.id, status: it.k === 'on' ? 'aktif' : 'nonaktif' }); toast('Status diperbarui', '', 'ok'); reload(); }
          else if (it.k === 'del' && await confirmDialog({ title: 'Hapus undangan?', text: `Undangan untuk ${r.email} akan dihapus.`, danger: true, ok: 'Hapus' })) {
            await api.rpc('staff_delete', { id: r.id }); toast('Undangan dihapus', '', 'ok'); reload();
          }
        } catch (x) { toastErr(x); }
      });
    }
  });

  function staffForm(r) {
    const roles = r ? r.roles : ['guru'];
    const m = modal({
      title: r ? 'Ubah Data Staf' : 'Tambah Guru / Staf', sub: r ? r.email : 'Staf masuk dengan akun Google sesuai email yang didaftarkan.', ic: 'person_add',
      body: html`<form class="col" id="sf"><div class="field"><label>Nama lengkap & gelar <span class="req">*</span></label><input class="input" name="nama" value="${r?.nama || ''}" placeholder="Rina Kurniawati, S.Pd." required></div>
        <div class="form-grid"><div class="field"><label>Email Google <span class="req">*</span></label><input class="input" type="email" name="email" value="${r?.email || ''}" placeholder="nama@sekolah.sch.id" required ${r?.last_login ? 'readonly' : ''}></div>
        <div class="field"><label>Nomor WhatsApp</label><input class="input" name="wa" value="${r?.wa || ''}" placeholder="0812xxxxxxx" inputmode="tel"></div></div>
        <div class="field"><label>Peran</label><div class="row wrap gap-16">
          ${[['guru', 'Guru pembuat soal'], ['pengawas', 'Pengawas ujian'], ['admin', 'Admin lembaga']].map(([k, l]) => html`<label class="check"><input type="checkbox" name="roles" value="${k}" ${roles.includes(k) ? 'checked' : ''}> ${l}</label>`)}</div>
          <div class="hint">Satu akun boleh memiliki lebih dari satu peran, misalnya Guru + Pengawas.</div></div></form>`,
      foot: html`<button class="btn secondary" data-x>Batal</button><button class="btn primary" data-save>${icon('save')} Simpan</button>`,
    });
    $('[data-save]', m.el).onclick = (e) => busy(e.currentTarget, async () => {
      const f = $('#sf', m.el);
      const p = { id: r?.id, nama: f.nama.value, email: f.email.value, wa: f.wa.value, roles: $$('input[name=roles]:checked', f).map((x) => x.value) };
      try {
        const res = await api.rpc('staff_save', { p });
        m.close();
        toast(r ? 'Data staf disimpan' : 'Staf ditambahkan', '', 'ok');
        await reload();
        if (!r && res.invite_token) {
          shareInvite({ ...p, token: res.invite_token, lembaga: me.tenant?.nama });
          if (p.roles.includes('guru')) setTimeout(() => {}, 0);
        }
      } catch (x) { toastErr(x); }
    });
  }

  function assignDrawer(r) {
    let items = r.penugasan.map((x) => ({ ...x }));
    const m = modal({
      drawer: true, title: 'Penugasan Mapel', sub: r.nama, ic: 'assignment_ind',
      body: html`<p class="muted small">Guru hanya bisa membuat bank soal untuk mapel yang ditugaskan.</p>
        <div id="list" class="col mt-16"></div>
        <div class="card flat mt-16"><div class="form-grid">
          <div class="field"><label>Mata pelajaran</label><input class="input" id="mp" list="dl-mapel" placeholder="Matematika"></div>
          <div class="field"><label>Kelas / jenjang</label><input class="input" id="kl" list="dl-kelas" placeholder="8 atau 8A (opsional)"></div></div>
          <button class="btn soft block mt-16" id="addp">${icon('add')} Tambahkan</button></div>
        <datalist id="dl-mapel">${['Matematika', 'Bahasa Indonesia', 'IPA', 'Bahasa Inggris', 'IPS', 'PPKn', 'Pendidikan Agama', 'Informatika', ...(data?.mapel || [])].filter((v, i, a) => a.indexOf(v) === i).map((x) => html`<option value="${x}">`)}</datalist>
        <datalist id="dl-kelas">${(data?.kelas || []).map((x) => html`<option value="${x}">`)}</datalist>`,
      foot: html`<button class="btn secondary" data-x>Batal</button><button class="btn primary" data-save>${icon('save')} Simpan Penugasan</button>`,
    });
    const paintList = () => {
      $('#list', m.el).innerHTML = items.length ? items.map((x, i) => html`<div class="row" style="padding:10px 12px;border-radius:12px;background:var(--slate-50)">
        <span class="icon-tile" style="width:36px;height:36px;background:${mapelColor(x.mapel)}">${icon('menu_book')}</span>
        <div style="flex:1"><div class="semi">${x.mapel}</div><div class="muted small">${x.kelas ? 'Kelas ' + x.kelas : 'Semua kelas'}</div></div>
        <button class="btn ghost icon sm red" data-rm="${i}" aria-label="Hapus">${icon('delete')}</button></div>`.s).join('') : '<div class="muted small">Belum ada penugasan.</div>';
    };
    paintList();
    on(m.el, 'click', '[data-rm]', (e, b) => { items.splice(+b.dataset.rm, 1); paintList(); });
    $('#addp', m.el).onclick = () => {
      const mp = $('#mp', m.el).value.trim(), kl = $('#kl', m.el).value.trim();
      if (!mp) return toast('Isi mata pelajaran', '', 'warn');
      if (!items.some((x) => x.mapel.toLowerCase() === mp.toLowerCase() && x.kelas === kl)) items.push({ mapel: mp, kelas: kl });
      $('#mp', m.el).value = ''; $('#kl', m.el).value = ''; paintList();
    };
    $('[data-save]', m.el).onclick = (e) => busy(e.currentTarget, async () => {
      try { await api.rpc('assignments_save', { staff: r.id, items }); m.close(); toast('Penugasan disimpan', '', 'ok'); reload(); } catch (x) { toastErr(x); }
    });
  }
  return off;
}
