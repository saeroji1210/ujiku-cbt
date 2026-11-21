import * as api from '../core/api.js';
import * as store from '../core/store.js';
import { html, icon, $, $$, skel, fmt, badge, toast, toastErr, busy, confirmDialog } from '../core/ui.js';

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

  // ---------- WhatsApp otomatis (Fonnte) ----------
  const box = document.createElement('div'); box.className = 'mt-24'; box.innerHTML = skel.lines(4).s; el.appendChild(box);
  let wa = null;
  const JENIS = { setuju: 'Disetujui', tolak: 'Ditolak', tes: 'Uji coba' };
  const paintWa = (x) => {
    wa = x; if (!alive()) return;
    box.innerHTML = html`<div class="card col">
      <div class="row between"><div><h3 style="margin:0">WhatsApp otomatis</h3>
        <div class="muted small">Pemilik lembaga dikabari lewat WhatsApp begitu pendaftarannya disetujui atau ditolak. Memakai layanan <b>Fonnte</b>.</div></div>
        <label class="switch"><input type="checkbox" id="wa-on" ${x.aktif ? 'checked' : ''}><span class="tr"></span><b>${x.aktif ? 'Aktif' : 'Mati'}</b></label></div>
      ${!x.pg_net ? html`<div class="alert orange"><div class="a-ic">${icon('warning')}</div><div><b>Ekstensi pg_net belum aktif.</b><div class="small">Di Supabase buka <b>Database → Extensions</b>, cari <b>pg_net</b>, lalu aktifkan.</div></div></div>` : ''}
      <div class="grid g-2">
        <div class="field"><label>Token Fonnte</label><input class="input" id="wa-tok" type="password" autocomplete="off" placeholder="${x.token_set ? 'Tersimpan (…' + x.token_hint + ') — kosongkan bila tidak diubah' : 'Tempel token perangkat dari fonnte.com'}">
          <div class="hint">Token dari menu <b>Device</b> di fonnte.com, perangkat harus berstatus <b>Connected</b>. ${x.token_set ? html`<a href="#" id="wa-del">Hapus token</a>` : ''}</div></div>
        <div class="field"><label>Alamat aplikasi (untuk tautan di pesan)</label><input class="input" id="wa-url" value="${x.app_url || api.APP_URL}">
          <div class="hint">Tautan masuk dan pendaftaran di pesan memakai alamat ini.</div></div>
      </div>
      <div class="grid g-2">
        <div class="field"><label>Pesan saat disetujui</label><textarea class="textarea" id="wa-ts" rows="9">${x.tpl_setuju}</textarea></div>
        <div class="field"><label>Pesan saat ditolak</label><textarea class="textarea" id="wa-tt" rows="9">${x.tpl_tolak}</textarea></div>
      </div>
      <div class="hint">Penanda otomatis: <code>{nama_admin}</code> <code>{lembaga}</code> <code>{kode}</code> <code>{poin}</code> <code>{email}</code> <code>{langkah}</code> <code>{url}</code> (disetujui) · <code>{alasan}</code> <code>{url_daftar}</code> (ditolak). Gunakan *teks* untuk huruf tebal.</div>
      <div class="row wrap"><button class="btn primary" id="wa-save">${icon('save')} Simpan WhatsApp</button><span class="spacer"></span>
        <input class="input" id="wa-no" style="max-width:190px" placeholder="08xxxxxxxxxx"><button class="btn secondary" id="wa-test">${icon('send')} Kirim pesan uji</button></div>
      <h4 class="mt-8" style="margin-bottom:0">Riwayat pesan</h4>
      ${(x.log || []).length ? html`<div class="table-wrap"><table class="table"><thead><tr><th>Waktu</th><th>Tujuan</th><th>Jenis</th><th>Status</th><th></th></tr></thead><tbody>
        ${x.log.map((l) => html`<tr><td class="nowrap">${fmt.date(l.at)}<div class="muted small">${fmt.time(l.at)}</div></td>
          <td>${l.tujuan}${l.lembaga ? html`<div class="muted small">${l.lembaga}</div>` : ''}</td><td>${JENIS[l.jenis] || l.jenis}</td>
          <td>${badge(l.status === 'nonaktif' ? 'nonaktif' : l.status, l.status === 'nonaktif' ? 'Tidak dikirim' : '')}${l.respon && l.status !== 'dikirim' ? html`<div class="muted small">${l.respon}</div>` : ''}</td>
          <td class="num">${l.status === 'gagal' || l.status === 'nonaktif' ? html`<button class="btn sm secondary" data-re="${l.id}">${icon('replay')} Kirim ulang</button>` : ''}</td></tr>`)}</tbody></table></div>`
        : html`<div class="muted small">Belum ada pesan. Pesan akan tercatat di sini setelah ada pendaftaran yang diputuskan.</div>`}
    </div>`.s;
    const save = async (extra = {}) => api.rpc('sa_wa_save', { p: { aktif: $('#wa-on', box).checked, app_url: $('#wa-url', box).value.trim(),
      tpl_setuju: $('#wa-ts', box).value, tpl_tolak: $('#wa-tt', box).value, token: $('#wa-tok', box).value.trim(), ...extra } });
    $('#wa-on', box).onchange = async (e) => { try { paintWa(await api.rpc('sa_wa_save', { p: { aktif: e.target.checked } })); toast(e.target.checked ? 'WhatsApp otomatis aktif' : 'WhatsApp otomatis dimatikan', '', 'ok'); } catch (x) { e.target.checked = !e.target.checked; toastErr(x); } };
    $('#wa-save', box).onclick = (e) => busy(e.currentTarget, async () => { try { paintWa(await save()); toast('Pengaturan WhatsApp disimpan', '', 'ok'); } catch (x) { toastErr(x); } });
    $('#wa-test', box).onclick = (e) => busy(e.currentTarget, async () => {
      const no = $('#wa-no', box).value.trim(); if (no.replace(/\D/g, '').length < 10) return toast('Isi nomor tujuan uji', 'Contoh 081234567890', 'warn');
      try { await save(); const r = await api.rpc('sa_wa_test', { p_to: no }); paintWa(r); setTimeout(refresh, 4000);
        const st = (r.log || []).find((l) => l.id === r.id); toast(st && st.status === 'gagal' ? 'Pesan uji gagal' : 'Pesan uji dikirim', st?.respon || 'Periksa WhatsApp di nomor tujuan', st && st.status === 'gagal' ? 'err' : 'ok'); } catch (x) { toastErr(x); }
    });
    const del = $('#wa-del', box); if (del) del.onclick = async (e) => { e.preventDefault(); if (!(await confirmDialog({ title: 'Hapus token Fonnte?', text: 'WhatsApp otomatis berhenti terkirim sampai token baru diisi.', ok: 'Hapus' }))) return;
      try { paintWa(await api.rpc('sa_wa_save', { p: { token: '-', aktif: false } })); } catch (x) { toastErr(x); } };
    $$('[data-re]', box).forEach((b) => { b.onclick = () => busy(b, async () => { try { paintWa(await api.rpc('sa_wa_resend', { p_id: b.dataset.re })); setTimeout(refresh, 4000); toast('Dikirim ulang', '', 'ok'); } catch (x) { toastErr(x); } }); });
  };
  const refresh = async () => { try { if (alive() && !document.activeElement?.matches?.('#wa-ts,#wa-tt,#wa-tok,#wa-url,#wa-no')) paintWa(await api.rpc('sa_wa_info')); } catch { /* abaikan */ } };
  try { paintWa(await api.rpc('sa_wa_info')); } catch (x) { box.innerHTML = ''; toastErr(x); }
}
