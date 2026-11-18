import * as api from '../core/api.js';
import * as store from '../core/store.js';
import { html, icon, $, toast, toastErr, busy, copyText } from '../core/ui.js';

export default async function (ctx) {
  const { el, title, me, refreshMe } = ctx;
  title('Pengaturan');
  const t = me.tenant;
  const loginUrl = `${api.APP_URL}#/masuk?peserta=1&kode=${t.kode}`;
  el.innerHTML = html`<div class="page-head"><div><div class="crumb">Lainnya</div><h1>Pengaturan Lembaga</h1><div class="sub">Profil lembaga, KKM, dan informasi login peserta.</div></div></div>
    <div class="grid g-side" style="align-items:start">
      <form class="card" id="f" style="padding:24px"><h3>Profil lembaga</h3><div class="form-grid mt-16">
        <div class="field full"><label>Nama lembaga</label><input class="input soft" value="${t.nama}" readonly><div class="hint">Perubahan nama dilakukan oleh tim UjiKu CBT.</div></div>
        <div class="field"><label>Jenis</label><input class="input soft" value="${t.jenis || ''}" readonly></div>
        <div class="field"><label>NPSN / kode registrasi</label><input class="input" name="npsn" value="${t.npsn || ''}"></div>
        <div class="field full"><label>Alamat</label><textarea class="textarea" name="alamat" style="min-height:70px">${t.alamat || ''}</textarea></div>
        <div class="field"><label>KKM (Kriteria Ketuntasan Minimal)</label><input class="input" type="number" name="kkm" min="0" max="100" step="0.5" value="${t.kkm}">
          <div class="hint">Dipakai untuk menghitung ketuntasan di laporan.</div></div></div>
        <button class="btn primary mt-24" type="submit">${icon('save')} Simpan Pengaturan</button></form>
      <aside class="col gap-16"><div class="card"><h3>Login peserta</h3><p class="muted small mt-4">Bagikan kode & tautan ini ke peserta.</p>
        <div class="token-box mt-16" style="text-align:center">${t.kode}</div>
        <div class="row mt-16" style="background:var(--slate-50);border-radius:12px;padding:10px 12px"><code class="small ellipsis" style="flex:1">${loginUrl}</code></div>
        <button class="btn secondary block mt-8" data-copy>${icon('content_copy')} Salin tautan login peserta</button></div>
        <div class="card"><h3>Status langganan</h3><p class="mt-8">${t.status === 'trial' ? 'Masa uji coba — beli paket poin untuk mengaktifkan penuh.' : 'Aktif'}</p>
          <a class="btn soft block mt-16" href="#/admin/poin">${icon('toll')} Poin & Langganan</a></div></aside></div>`.s;
  $('[data-copy]', el).onclick = () => copyText(loginUrl, 'Tautan login peserta disalin');
  $('#f', el).addEventListener('submit', (e) => {
    e.preventDefault(); const f = e.currentTarget;
    busy($('button[type=submit]', f), async () => {
      try { await api.rpc('tenant_settings_save', { p: { kkm: f.kkm.value, alamat: f.alamat.value, npsn: f.npsn.value } }); store.invalidate('report'); await refreshMe(); toast('Pengaturan disimpan', '', 'ok'); } catch (x) { toastErr(x); }
    });
  });
}
