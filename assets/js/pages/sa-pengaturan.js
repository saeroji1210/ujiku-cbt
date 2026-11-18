import * as api from '../core/api.js';
import * as store from '../core/store.js';
import { html, icon, $, skel, toast, toastErr, busy } from '../core/ui.js';

export default async function (ctx) {
  const { el, title, alive } = ctx;
  title('Pengaturan Sistem');
  el.innerHTML = skel.page().s;
  const s = await api.rpc('sa_settings');
  if (!alive()) return;
  const bayar = s.info_pembayaran || {}, kontak = s.kontak_bantuan || {};
  el.innerHTML = html`<div class="page-head"><div><div class="crumb">Sistem</div><h1>Pengaturan Sistem</h1><div class="sub">Aturan poin dan informasi yang tampil ke semua lembaga.</div></div></div>
    <form id="f" class="grid g-2" style="align-items:start">
      <div class="card col"><h3>Aturan poin</h3>
        <div class="field"><label>Poin per peserta per ujian</label><input class="input" type="number" min="0" name="ppp" value="${s.poin_per_peserta}">
          <div class="hint">Biaya ujian = jumlah peserta × nilai ini, dipotong saat ujian diterbitkan.</div></div>
        <div class="field"><label>Poin uji coba gratis untuk lembaga baru</label><input class="input" type="number" min="0" name="trial" value="${s.poin_trial}"></div></div>
      <div class="card col"><h3>Info pembayaran</h3>
        <div class="field"><label>Bank</label><input class="input" name="bank" value="${bayar.bank || ''}"></div>
        <div class="field"><label>Nomor rekening</label><input class="input" name="rek" value="${bayar.rekening || ''}"></div>
        <div class="field"><label>Atas nama</label><input class="input" name="an" value="${bayar.atas_nama || ''}"></div></div>
      <div class="card col"><h3>Kontak bantuan</h3>
        <div class="field"><label>WhatsApp (format 62…)</label><input class="input" name="wa" value="${kontak.wa || ''}" placeholder="6281200000000"></div>
        <div class="field"><label>Email</label><input class="input" type="email" name="email" value="${kontak.email || ''}"></div></div>
      <div class="card col"><h3>Simpan</h3><p class="muted small">Perubahan berlaku segera untuk semua lembaga.</p><button class="btn primary lg" type="submit">${icon('save')} Simpan Pengaturan</button></div></form>`.s;
  $('#f', el).addEventListener('submit', (e) => {
    e.preventDefault(); const f = e.currentTarget;
    busy($('button[type=submit]', f), async () => {
      try {
        await api.rpc('sa_settings_save', { p: { poin_per_peserta: Number(f.ppp.value), poin_trial: Number(f.trial.value),
          info_pembayaran: { bank: f.bank.value, rekening: f.rek.value, atas_nama: f.an.value }, kontak_bantuan: { wa: f.wa.value.replace(/\D/g, ''), email: f.email.value } } });
        store.invalidate('sa_settings'); toast('Pengaturan disimpan', '', 'ok');
      } catch (x) { toastErr(x); }
    });
  });
}
