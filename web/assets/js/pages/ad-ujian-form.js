import * as api from '../core/api.js';
import * as store from '../core/store.js';
import { html, raw, icon, $, $$, on, fmt, mapelColor, badge, skel, modal, toast, toastErr, busy, debounce, copyText } from '../core/ui.js';
import { examAction } from './ad-ujian.js';

const STEPS = ['Info Ujian', 'Soal', 'Peserta', 'Pengaturan & Terbit'];

export default async function (ctx) {
  const { el, params, title, alive, go, me, refreshMe } = ctx;
  const isNew = !params.id;
  el.innerHTML = skel.page().s;
  const [opt, ex] = await Promise.all([
    store.fetchOnce('exam_form_options', () => api.rpc('exam_form_options')),
    isNew ? null : api.rpc('exam_detail', { id: params.id }),
  ]);
  if (!alive()) return;
  if (ex && ex.status !== 'draf') return publishedView(ex);
  title(isNew ? 'Buat Jadwal Ujian' : 'Atur Ujian');

  const now = new Date(); now.setMinutes(0, 0, 0); now.setHours(now.getHours() + 1);
  const f = {
    id: ex?.id || null, judul: ex?.judul || '', mapel: ex?.mapel || '', bank_id: ex?.bank_id || '',
    mulai: ex?.mulai || now.toISOString(), selesai: ex?.selesai || new Date(now.getTime() + 120 * 60000).toISOString(),
    durasi_menit: ex?.durasi_menit || 90, jumlah_soal: ex?.jumlah_soal || '', lokasi: ex?.lokasi || 'online',
    acak_soal: ex?.acak_soal ?? true, acak_opsi: ex?.acak_opsi ?? true, tampilkan_nilai: ex?.tampilkan_nilai ?? false,
    batas_pelanggaran: ex?.batas_pelanggaran ?? 3, token: ex?.token || '', kelas: [], peserta: [],
  };
  const kelasN = Object.fromEntries(opt.kelas.map((k) => [k.kelas, k.n]));
  if (ex) { // susun ulang pilihan kelas vs perorangan
    const by = {}; ex.peserta.forEach((p) => { (by[p.kelas] = by[p.kelas] || []).push(p); });
    for (const [k, arr] of Object.entries(by)) { if (kelasN[k] && arr.length >= kelasN[k]) f.kelas.push(k); else f.peserta.push(...arr); }
  }
  let step = 0, searchRes = [];
  const ppp = Number(opt.poin_per_peserta || 1);
  const est = () => f.kelas.reduce((s, k) => s + (kelasN[k] || 0), 0) + f.peserta.filter((p) => !f.kelas.includes(p.kelas)).length;
  const bank = () => opt.bank.find((b) => b.id === f.bank_id);

  el.innerHTML = html`<div class="page-head"><div><div class="crumb">Ujian › <b>${isNew ? 'Jadwal baru' : 'Draf'}</b></div><h1>${isNew ? 'Buat Jadwal Ujian' : f.judul}</h1>
    <div class="sub">Lengkapi 4 langkah berikut. Draf tidak memotong poin; poin dipotong saat ujian diterbitkan.</div></div>
    <span class="spacer"></span><a class="btn secondary" href="#/admin/ujian">${icon('arrow_back')} Kembali</a></div>
    <div class="card stepper" style="--n:4;margin-bottom:20px" id="st"></div>
    <div class="grid g-side" style="align-items:start"><div class="card" style="padding:24px" id="pane"></div><aside class="card" id="sum" style="position:sticky;top:84px"></aside></div>`.s;

  const paintSteps = () => {
    $('#st', el).innerHTML = STEPS.map((s, i) => html`<div class="step ${i === step ? 'on' : i < step ? 'done' : ''}" data-step="${i}" style="cursor:pointer">
      <div class="n">${i < step ? icon('check') : i + 1}</div><div><div class="sl">Langkah ${i + 1}</div><div class="st">${s}</div></div></div>`.s).join('');
  };
  const paintSum = () => {
    const b = bank(); const n = est(); const biaya = n * ppp; const cukup = opt.saldo >= biaya;
    $('#sum', el).innerHTML = html`<h3>Ringkasan</h3>
      <div class="col gap-8 mt-16 small">
        <div class="row">${icon('title', 'muted')}<span class="ellipsis">${f.judul || html`<span class="muted">Judul belum diisi</span>`}</span></div>
        <div class="row">${icon('schedule', 'muted')}<span>${fmt.dt(f.mulai)} – ${fmt.time(f.selesai)}</span></div>
        <div class="row">${icon('timer', 'muted')}<span>${f.durasi_menit} menit per peserta</span></div>
        <div class="row">${icon('layers', 'muted')}<span class="ellipsis">${b ? `${b.nama} (${f.jumlah_soal || b.jumlah} soal)` : html`<span class="muted">Bank soal belum dipilih</span>`}</span></div>
        <div class="row">${icon('groups', 'muted')}<span>${n} peserta${f.kelas.length ? ' · ' + f.kelas.join(', ') : ''}</span></div>
        <div class="row">${icon(f.lokasi === 'online' ? 'cloud' : 'dns', 'muted')}<span>${f.lokasi === 'online' ? 'Online (internet)' : 'Server lokal sekolah'}</span></div></div>
      <div style="border-top:1px solid var(--border-2);margin:16px 0;padding-top:16px" class="col gap-8">
        <div class="row"><span class="muted">Perkiraan poin</span><span class="spacer"></span><b>${fmt.num(biaya)} poin</b></div>
        <div class="row"><span class="muted">Saldo saat ini</span><span class="spacer"></span><b>${fmt.num(opt.saldo)} poin</b></div>
        ${!cukup && n ? html`<div class="alert red" style="margin:6px 0 0;padding:10px 12px"><div class="small"><b>Saldo tidak cukup.</b> Kurang ${fmt.num(biaya - opt.saldo)} poin.</div></div>` : ''}</div>
      <div class="col gap-8"><button class="btn secondary block" data-act="draft">${icon('save')} Simpan Draf</button>
        ${step === 3 ? html`<button class="btn primary block lg" data-act="publish">${icon('rocket_launch')} Terbitkan Ujian</button>` : html`<button class="btn primary block" data-act="next">Lanjut ${icon('arrow_forward')}</button>`}</div>`.s;
  };
  const paintPane = () => {
    const p = $('#pane', el);
    if (step === 0) {
      p.innerHTML = html`<h2>Info Ujian</h2><p class="muted mt-4">Judul, jadwal pelaksanaan, dan durasi pengerjaan.</p>
        <div class="form-grid mt-24"><div class="field full"><label>Judul ujian <span class="req">*</span></label><input class="input" data-f="judul" value="${f.judul}" placeholder="PTS Ganjil Matematika Kelas 8A"></div>
          <div class="field"><label>Mulai <span class="req">*</span></label><input class="input" type="datetime-local" data-f="mulai" value="${fmt.localInput(f.mulai)}"></div>
          <div class="field"><label>Selesai (batas akhir mulai mengerjakan) <span class="req">*</span></label><input class="input" type="datetime-local" data-f="selesai" value="${fmt.localInput(f.selesai)}"></div>
          <div class="field"><label>Durasi pengerjaan (menit)</label><input class="input" type="number" min="5" max="600" data-f="durasi_menit" value="${f.durasi_menit}">
            <div class="hint">Waktu tiap peserta dihitung dari server sejak ia mulai, tidak melewati jam selesai.</div></div>
          <div class="field"><label>Mata pelajaran</label><input class="input" data-f="mapel" value="${f.mapel}" placeholder="Otomatis dari bank soal"></div>
          <div class="field full"><label>Lokasi pelaksanaan</label><div class="row wrap gap-8">
            ${[['online', 'cloud', 'Online', 'Peserta memakai internet / WiFi sekolah yang tersambung internet'], ['server_lokal', 'dns', 'Server lokal sekolah', 'Tanpa internet — lewat WiFi lokal ke server sekolah']].map(([k, ic, l, s]) => html`
              <label class="card flat row hover-lift" style="flex:1;min-width:240px;cursor:pointer;${f.lokasi === k ? 'border-color:var(--primary);background:var(--primary-50)' : ''};${k === 'server_lokal' && !opt.punya_server ? 'opacity:.5' : ''}">
                <input type="radio" name="lok" value="${k}" ${f.lokasi === k ? 'checked' : ''} ${k === 'server_lokal' && !opt.punya_server ? 'disabled' : ''}>
                <div class="icon-tile soft">${icon(ic)}</div><div><b>${l}</b><div class="small muted">${k === 'server_lokal' && !opt.punya_server ? 'Lembaga belum memiliki server lokal' : s}</div></div></label>`)}</div></div></div>`.s;
    } else if (step === 1) {
      const b = bank();
      p.innerHTML = html`<h2>Pilih Bank Soal</h2><p class="muted mt-4">Hanya bank soal berstatus <b>Siap</b> yang dapat diterbitkan.</p>
        <div class="col gap-8 mt-16" style="max-height:440px;overflow:auto;padding:2px">${opt.bank.length ? opt.bank.map((x) => html`<label class="list-row" style="cursor:${x.status === 'siap' ? 'pointer' : 'not-allowed'};${x.id === f.bank_id ? 'box-shadow:0 0 0 2px var(--primary)' : ''};${x.status !== 'siap' ? 'opacity:.55' : ''}" title="${x.status !== 'siap' ? 'Bank soal masih draf' : ''}">
            <input type="radio" name="bank" value="${x.id}" ${x.id === f.bank_id ? 'checked' : ''} ${x.status !== 'siap' ? 'disabled' : ''} style="width:18px;height:18px">
            <div class="icon-tile" style="background:${mapelColor(x.mapel)}">${icon('layers')}</div>
            <div style="flex:1;min-width:0"><div class="semi ellipsis">${x.nama}</div><div class="muted small">${x.mapel} · ${x.jumlah} soal · ${x.pemilik || '–'}</div></div>${badge(x.status)}</label>`)
          : html`<div class="muted">Belum ada bank soal. <a href="#/bank">Buat bank soal</a> terlebih dahulu.</div>`}</div>
        ${b ? html`<div class="field mt-24"><label>Jumlah soal yang diujikan: <b id="js-v">${f.jumlah_soal || b.jumlah}</b> dari ${b.jumlah}</label>
          <input type="range" min="1" max="${b.jumlah}" value="${f.jumlah_soal || b.jumlah}" data-f="jumlah_soal" style="width:100%">
          <div class="hint">Bila kurang dari total, soal diambil acak dari bank saat diterbitkan.</div></div>` : ''}`.s;
    } else if (step === 2) {
      p.innerHTML = html`<h2>Pilih Peserta</h2><p class="muted mt-4">Pilih per kelas, atau tambahkan peserta satu per satu.</p>
        <div class="row wrap gap-8 mt-16">${opt.kelas.length ? opt.kelas.map((k) => html`<span class="chip ${f.kelas.includes(k.kelas) ? 'on' : ''}" data-kelas="${k.kelas}" style="height:38px;padding:0 16px;font-size:14px">
          ${f.kelas.includes(k.kelas) ? icon('check') : ''} ${k.kelas || 'Tanpa kelas'} · ${k.n}</span>`) : html`<span class="muted">Belum ada peserta. <a href="#/admin/peserta">Impor peserta</a> dulu.</span>`}</div>
        <div class="field mt-24"><label>Tambah peserta perorangan</label><div class="input-ic">${icon('person_search')}<input class="input" id="ps" placeholder="Cari nama atau NIS…" autocomplete="off"></div>
          <div id="ps-res" class="col gap-4 mt-8"></div></div>
        ${f.peserta.length ? html`<div class="row wrap gap-8 mt-16">${f.peserta.map((x) => html`<span class="chip on">${x.nama} (${x.kelas})<span class="x" data-rmp="${x.id}">${icon('close')}</span></span>`)}</div>` : ''}
        <div class="alert blue mt-24"><div class="a-ic">${icon('groups')}</div><div><b>${est()} peserta</b> akan mengikuti ujian ini.</div></div>`.s;
    } else {
      const n = est(); const biaya = n * ppp;
      p.innerHTML = html`<h2>Pengaturan & Terbit</h2><p class="muted mt-4">Atur keamanan ujian dan token, lalu terbitkan.</p>
        <div class="col gap-16 mt-24">
          ${[['acak_soal', 'Acak urutan soal', 'Setiap peserta mendapat urutan soal berbeda'], ['acak_opsi', 'Acak urutan opsi', 'Urutan pilihan A–E diacak per peserta'],
             ['tampilkan_nilai', 'Tampilkan nilai ke peserta', 'Peserta melihat nilai segera setelah selesai']].map(([k, l, s]) => html`<label class="switch">
            <input type="checkbox" data-f="${k}" ${f[k] ? 'checked' : ''}><span class="tr"></span><span><b>${l}</b><br><span class="muted small">${s}</span></span></label>`)}
          <div class="form-grid"><div class="field"><label>Batas pelanggaran sebelum sesi dikunci</label><input class="input" type="number" min="0" max="50" data-f="batas_pelanggaran" value="${f.batas_pelanggaran}">
            <div class="hint">Pindah tab/aplikasi atau keluar layar penuh. 0 = tidak dikunci (hanya dicatat).</div></div>
          <div class="field"><label>Token ujian</label><div class="row gap-8"><input class="input mono" data-f="token" value="${f.token}" placeholder="Otomatis" maxlength="10" style="text-transform:uppercase;letter-spacing:.2em;font-weight:700">
            <button class="btn secondary icon" data-act="tok" title="Buat token acak">${icon('autorenew')}</button></div><div class="hint">Peserta memasukkan token ini untuk mulai.</div></div></div>
          <div class="alert ${opt.saldo >= biaya ? 'blue' : 'red'}"><div class="a-ic">${icon('toll')}</div><div><b>Ujian ini akan memakai ${fmt.num(biaya)} poin</b> (${n} peserta × ${ppp} poin).
            <div class="small muted">Saldo ${fmt.num(opt.saldo)} → ${fmt.num(opt.saldo - biaya)} poin. Bank soal akan dikunci selama ujian terbit.</div></div></div></div>`.s;
    }
  };
  const paint = () => { paintSteps(); paintPane(); paintSum(); };
  paint();

  const payload = () => ({ ...f, kelas: f.kelas, peserta: f.peserta.map((x) => x.id), jumlah_soal: f.jumlah_soal || null, token: (f.token || '').toUpperCase() });
  const validate = (upto) => {
    if (upto >= 0 && !f.judul.trim()) return 'Judul ujian wajib diisi.';
    if (upto >= 0 && new Date(f.selesai) <= new Date(f.mulai)) return 'Waktu selesai harus setelah waktu mulai.';
    if (upto >= 1 && !f.bank_id) return 'Pilih bank soal berstatus Siap.';
    if (upto >= 2 && !est()) return 'Pilih minimal satu kelas atau peserta.';
    return null;
  };
  const saveDraft = async () => {
    const r = await api.rpc('exam_save', { p: payload() });
    f.id = r.id; f.token = r.token;
    store.invalidate('exams_list', 'ad_dashboard');
    if (isNew) history.replaceState(null, '', location.pathname + '#/admin/ujian/' + r.id);
    return r;
  };
  const searchPs = debounce(async (q) => {
    if (q.length < 2) { $('#ps-res', el).innerHTML = ''; return; }
    try {
      const d = await api.rpc('participants_list', { q, size: 10 });
      searchRes = d.rows;
      $('#ps-res', el).innerHTML = searchRes.map((x) => html`<button class="list-row" data-addp="${x.id}" style="padding:10px 12px">${icon('person_add', 'c-primary')}
        <span style="flex:1;text-align:left"><b>${x.nama}</b> <span class="muted small">${x.nis} · ${x.kelas}</span></span></button>`.s).join('') || '<div class="muted small">Tidak ditemukan.</div>';
    } catch (e) { toastErr(e); }
  }, 280);

  const offs = [
    on(el, 'input', '[data-f]', (e, n) => {
      const k = n.dataset.f;
      if (n.type === 'checkbox') f[k] = n.checked;
      else if (n.type === 'datetime-local') { if (n.value) f[k] = new Date(n.value).toISOString(); }
      else if (n.type === 'number' || n.type === 'range') f[k] = n.value === '' ? '' : Number(n.value);
      else f[k] = n.value;
      if (k === 'jumlah_soal') { const v = $('#js-v', el); if (v) v.textContent = n.value; }
      paintSum();
    }),
    on(el, 'change', 'input[name=lok]', (e, n) => { f.lokasi = n.value; paintPane(); paintSum(); }),
    on(el, 'change', 'input[name=bank]', (e, n) => { f.bank_id = n.value; f.jumlah_soal = ''; const b = bank(); if (b && !f.mapel) f.mapel = b.mapel; if (b && !f.judul) f.judul = b.nama; paintPane(); paintSum(); }),
    on(el, 'click', '[data-kelas]', (e, n) => { const k = n.dataset.kelas; f.kelas = f.kelas.includes(k) ? f.kelas.filter((x) => x !== k) : [...f.kelas, k]; paintPane(); paintSum(); }),
    on(el, 'input', '#ps', (e, n) => searchPs(n.value.trim())),
    on(el, 'click', '[data-addp]', (e, n) => { const x = searchRes.find((s) => s.id === n.dataset.addp); if (x && !f.peserta.some((p) => p.id === x.id)) f.peserta.push(x); paintPane(); paintSum(); setTimeout(() => $('#ps', el)?.focus()); }),
    on(el, 'click', '[data-rmp]', (e, n) => { f.peserta = f.peserta.filter((p) => p.id !== n.dataset.rmp); paintPane(); paintSum(); }),
    on(el, 'click', '[data-step]', (e, n) => { const s = +n.dataset.step; const err = s > step ? validate(s - 1) : null; if (err) return toast(err, '', 'warn'); step = s; paint(); }),
    on(el, 'click', '[data-act]', (e, b) => {
      const a = b.dataset.act;
      if (a === 'tok') { const C = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; f.token = Array.from(crypto.getRandomValues(new Uint8Array(6)), (x) => C[x % C.length]).join(''); paintPane(); return; }
      if (a === 'next') { const err = validate(step); if (err) return toast(err, '', 'warn'); step = Math.min(3, step + 1); paint(); window.scrollTo({ top: 0, behavior: 'smooth' }); return; }
      if (a === 'draft') return busy(b, async () => { const err = validate(0); if (err) return toast(err, '', 'warn'); try { const r = await saveDraft(); toast('Draf tersimpan', `${r.peserta} peserta · token ${r.token}`, 'ok'); } catch (x) { toastErr(x); } });
      if (a === 'publish') {
        const err = validate(2); if (err) return toast(err, '', 'warn');
        return busy(b, async () => {
          try {
            const r = await saveDraft();
            const biaya = r.peserta * ppp;
            const cukup = opt.saldo >= biaya;
            const m = modal({
              title: 'Terbitkan ujian?', ic: 'rocket_launch', size: 'narrow',
              body: html`<div style="text-align:center"><div class="icon-tile" style="margin:0 auto;width:72px;height:72px;border-radius:50%;background:var(--orange-50);color:var(--orange)">${icon('toll')}</div>
                <h3 class="mt-16" style="font-size:20px">Ujian ini akan memakai ${fmt.num(biaya)} poin</h3>
                <p class="muted mt-8">${r.peserta} peserta × ${ppp} poin · Saldo <b>${fmt.num(opt.saldo)}</b> → <b>${fmt.num(opt.saldo - biaya)}</b> poin</p></div>
                ${cukup ? html`<div class="alert purple mt-16"><div class="a-ic">${icon('lock')}</div><div class="small">Bank soal akan dikunci selama ujian terbit. Token: <b class="mono">${r.token}</b></div></div>`
                  : html`<div class="alert red mt-16"><div class="a-ic">${icon('error')}</div><div class="small"><b>Saldo poin tidak cukup.</b> Beli paket poin terlebih dahulu. Draf sudah disimpan.</div></div>`}`,
              foot: cukup ? html`<button class="btn secondary" data-x>Batal</button><button class="btn primary" data-go>${icon('rocket_launch')} Terbitkan Ujian</button>`
                : html`<button class="btn secondary" data-x>Tutup</button><a class="btn orange" href="#/admin/poin">${icon('add_shopping_cart')} Beli Poin</a>`,
            });
            $('a.btn.orange', m.el)?.addEventListener('click', () => m.close());
            $('[data-go]', m.el)?.addEventListener('click', (ev) => busy(ev.currentTarget, async () => {
              try {
                const pr = await api.rpc('exam_publish', { id: f.id });
                m.close(); store.invalidate('exams_list', 'ad_dashboard', 'exam_form_options', 'banks'); refreshMe();
                toast('Ujian diterbitkan', `${pr.poin_terpakai} poin terpakai · sisa ${fmt.num(pr.saldo)} poin.`, 'ok', 6000);
                go('/admin/ujian/' + f.id, { replace: true });
              } catch (x) { toastErr(x, 'Gagal menerbitkan'); }
            }));
          } catch (x) { toastErr(x); }
        });
      }
    }),
  ];
  return () => offs.forEach((x) => x());

  // ---------- Ujian yang sudah terbit: tampilan detail + ubah terbatas ----------
  function publishedView(e) {
    title(e.judul);
    const c = mapelColor(e.mapel);
    el.innerHTML = html`<div class="page-head"><div><div class="crumb">Ujian › <b>Detail</b></div><h1>${e.judul}</h1>
      <div class="sub row gap-8 wrap">${badge(e.state)}<span>${e.mapel}</span>·<span>${fmt.dateLong(e.mulai)}</span></div></div>
      <span class="spacer"></span><div class="row wrap gap-8"><a class="btn secondary" href="#/admin/ujian">${icon('arrow_back')} Kembali</a>
      ${e.status !== 'dibatalkan' ? html`<a class="btn soft" href="#/pantau/${e.id}">${icon('visibility')} Pantau</a><a class="btn soft" href="#/laporan/${e.id}">${icon('monitoring')} Laporan</a>` : ''}</div></div>
      <div class="grid g-side" style="align-items:start">
        <div class="card" style="padding:24px"><div class="chip-head" style="background:${c};max-width:260px">${e.mapel}</div>
          <div class="grid g-2 mt-24" style="gap:16px">${[['schedule', 'Jadwal', `${fmt.dt(e.mulai)} – ${fmt.dt(e.selesai)}`], ['timer', 'Durasi', e.durasi_menit + ' menit'],
            ['layers', 'Bank soal', `${e.bank?.nama || '–'} (${e.jumlah_soal} soal)`], ['groups', 'Peserta', `${e.peserta.length} peserta`],
            [e.lokasi === 'online' ? 'cloud' : 'dns', 'Lokasi', e.lokasi === 'online' ? 'Online' : 'Server lokal sekolah'], ['toll', 'Poin terpakai', `${e.poin_terpakai} poin`]]
            .map(([ic, l, v]) => html`<div class="row top"><div class="icon-tile soft" style="width:40px;height:40px">${icon(ic)}</div><div><div class="muted small">${l}</div><b>${v}</b></div></div>`)}</div>
          ${e.status === 'terbit' ? html`<h3 class="mt-24">Ubah pengaturan</h3><p class="muted small mt-4">Setelah terbit, hanya pengaturan berikut yang bisa diubah.</p>
            <form class="form-grid mt-16" id="pf"><div class="field full"><label>Judul</label><input class="input" name="judul" value="${e.judul}"></div>
              <div class="field"><label>Perpanjang waktu selesai</label><input class="input" type="datetime-local" name="selesai" value="${fmt.localInput(e.selesai)}"></div>
              <div class="field"><label>Batas pelanggaran</label><input class="input" type="number" name="batas" value="${e.batas_pelanggaran}" min="0" max="50"></div>
              <label class="switch full"><input type="checkbox" name="nilai" ${e.tampilkan_nilai ? 'checked' : ''}><span class="tr"></span><span><b>Tampilkan nilai ke peserta</b></span></label>
              <div class="full"><button class="btn primary" type="submit">${icon('save')} Simpan Perubahan</button></div></form>` : ''}
        </div>
        <aside class="col gap-16">${e.status === 'terbit' ? html`<div class="card" style="text-align:center"><div class="muted small">Token ujian</div><div class="token-box mt-8" style="display:inline-block">${e.token}</div>
            <div class="row gap-8 mt-16" style="justify-content:center"><button class="btn secondary sm" data-a="copy">${icon('content_copy')} Salin</button><button class="btn secondary sm" data-a="token">${icon('autorenew')} Ganti</button></div></div>` : ''}
          <div class="card col gap-8"><h3>Tindakan</h3>
            ${e.status === 'terbit' ? html`<button class="btn secondary block" data-a="close">${icon('lock_clock')} Tutup Ujian Sekarang</button>` : ''}
            ${e.status === 'terbit' && !e.sesi ? html`<button class="btn ghost red block" data-a="cancel">${icon('cancel')} Batalkan & kembalikan poin</button>` : ''}
            ${e.status !== 'terbit' ? html`<p class="muted small">Ujian ${e.status === 'selesai' ? 'sudah ditutup. Lihat laporan untuk nilai & analisis butir soal.' : 'dibatalkan.'}</p>` : ''}</div>
          <div class="card"><h3>Peserta (${e.peserta.length})</h3><div class="col gap-4 mt-8" style="max-height:300px;overflow:auto">${e.peserta.slice(0, 200).map((x) => html`<div class="row small"><span class="mono muted">${x.nis}</span><span class="ellipsis" style="flex:1">${x.nama}</span><span class="muted">${x.kelas}</span></div>`)}</div></div>
        </aside></div>`.s;
    const reload = () => { store.invalidate('exams_list'); go('/admin/ujian/' + e.id, { replace: true }); };
    $('#pf', el)?.addEventListener('submit', (ev) => {
      ev.preventDefault(); const fm = ev.currentTarget;
      busy($('button[type=submit]', fm), async () => {
        try { await api.rpc('exam_save', { p: { id: e.id, judul: fm.judul.value, selesai: new Date(fm.selesai.value).toISOString(), batas_pelanggaran: Number(fm.batas.value), tampilkan_nilai: fm.nilai.checked } }); toast('Perubahan disimpan', '', 'ok'); reload(); } catch (x) { toastErr(x); }
      });
    });
    return on(el, 'click', '[data-a]', (ev, b) => {
      const a = b.dataset.a;
      if (a === 'copy') return copyText(e.token, 'Token disalin');
      examAction(a, e, { go, after: () => { refreshMe(); reload(); } });
    });
  }
}
