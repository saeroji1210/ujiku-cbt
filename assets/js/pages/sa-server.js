import * as api from '../core/api.js';
import * as store from '../core/store.js';
import { html, icon, $, $$, on, fmt, skel, empty, modal, toast, toastErr, busy, confirmDialog, copyText, esc } from '../core/ui.js';

const KEY = 'sa_servers';
const load = () => api.rpc('sa_servers');
export const prefetch = () => store.fetchOnce(KEY, load);

function keyDialog(key, nama) {
  const cfg = window.UJIKU_CONFIG || {};
  const env = `SUPABASE_URL=${cfg.SUPABASE_URL || 'https://xxxx.supabase.co'}\nSUPABASE_ANON_KEY=${cfg.SUPABASE_ANON_KEY || '...'}\nDEVICE_KEY=${key}\nPENGAWAS_PIN=ganti-dengan-pin-6-digit`;
  const m = modal({ title: 'Device key server lokal', sub: nama, ic: 'key',
    body: html`<div class="alert orange"><div class="a-ic">${icon('warning')}</div><div class="small">Kunci ini hanya ditampilkan <b>sekali</b>. Simpan di berkas <code>.env</code> server lokal. Jika hilang, buat kunci baru (kunci lama tidak berlaku).</div></div>
      <div class="field"><label>Isi berkas .env di server lokal</label><textarea class="textarea mono small" rows="5" readonly id="env">${env}</textarea></div>
      <p class="muted small mt-8">Lalu jalankan <code>docker compose up -d</code> di folder <b>local-server</b>. Panduan lengkap ada di README.</p>`,
    foot: html`<button class="btn secondary" data-k>${icon('content_copy')} Salin device key</button><button class="btn primary" data-e>${icon('content_copy')} Salin isi .env</button>` });
  $('[data-k]', m.el).onclick = () => copyText(key, 'Device key disalin');
  $('[data-e]', m.el).onclick = () => copyText(env, 'Isi .env disalin');
}

export default async function (ctx) {
  const { el, title, alive } = ctx;
  title('Server Lokal');
  let d = null, f = '';
  el.innerHTML = html`<div class="page-head"><div><div class="crumb">Lembaga & Poin</div><h1>Monitor Server Lokal</h1>
    <div class="sub">Server lokal di sekolah menjalankan ujian tanpa internet dan menyinkronkan jawaban ke cloud. Daftarkan perangkat untuk mendapatkan device key.</div></div>
    <span class="spacer"></span><button class="btn primary" data-a="new">${icon('add')} Daftarkan Server</button></div>
    <div class="row wrap gap-8 mb-16" id="flt"></div><div id="body">${skel.cards(3, 200)}</div>`.s;
  const paint = (x) => {
    d = x; if (!alive()) return;
    const list = d.servers.filter((s) => !f || (f === 'online' ? s.online : f === 'offline' ? !s.online : s.antrean > 0));
    $('#flt', el).innerHTML = [['', 'Semua', d.servers.length], ['online', 'Online', d.servers.filter((s) => s.online).length], ['offline', 'Offline', d.servers.filter((s) => !s.online).length], ['antrean', 'Antrean Tertunda', d.servers.filter((s) => s.antrean > 0).length]]
      .map(([k, l, n]) => html`<span class="chip ${f === k ? 'on' : ''}" data-f="${k}">${l} · ${n}</span>`.s).join('');
    $('#body', el).innerHTML = (list.length ? html`<div class="grid g-3">${list.map((s) => { const stale = s.antrean > 0 && s.terakhir_sinkron && Date.now() - new Date(s.terakhir_sinkron) > 86400000;
      return html`<div class="card col"><div class="row"><div class="icon-tile" style="background:${s.online ? 'var(--green)' : '#94A3B8'}">${icon('dns')}</div>
        <div style="flex:1;min-width:0"><b class="ellipsis">${s.nama}</b><div class="muted small ellipsis">${s.lembaga} · ${s.kode}</div></div>
        ${s.online ? html`<span class="badge b-green pulse"><i class="d"></i> Online</span>` : html`<span class="badge b-gray">Offline</span>`}</div>
        <div class="grid g-3" style="gap:8px">${[['Versi', s.versi ? 'v' + s.versi : '–'], ['Online', s.terakhir_online ? fmt.rel(s.terakhir_online) : 'belum'], ['Sinkron', s.terakhir_sinkron ? fmt.rel(s.terakhir_sinkron) : '–']]
          .map(([l, v]) => html`<div style="background:var(--slate-50);border-radius:10px;padding:8px 10px"><div class="muted tiny">${l}</div><b class="small">${v}</b></div>`)}</div>
        ${s.antrean ? html`<span class="warn-strip">${icon('sync_problem')} ${s.antrean} data menunggu sinkron${stale ? ' · tertunda >24 jam' : ''}</span>` : ''}
        <div class="row gap-8 mt-8"><button class="btn secondary sm" data-reset="${s.id}" data-n="${s.nama}">${icon('key')} Kunci baru</button>
          <span class="spacer"></span><button class="btn ghost red sm" data-del="${s.id}">${icon('delete')} Hapus</button></div></div>`; })}</div>`
      : html`<div class="card">${empty('dns', 'Belum ada server lokal', 'Daftarkan server untuk lembaga yang membeli paket layanan ujian tanpa internet.', html`<button class="btn primary" data-a="new">${icon('add')} Daftarkan Server</button>`)}</div>`).s;
  };
  await store.swr(KEY, load, paint, { alive, ttl: 10000 });
  const hard = async () => { store.invalidate(KEY, 'sa_dashboard', 'sa_tenants'); paint(await store.fetchOnce(KEY, load)); };
  const offs = [
    on(el, 'click', '[data-f]', (e, b) => { f = b.dataset.f; paint(d); }),
    on(el, 'click', '[data-a=new]', () => {
      const m = modal({ title: 'Daftarkan Server Lokal', ic: 'dns', size: 'narrow',
        body: html`<div class="field"><label>Lembaga</label><select class="select" id="tn">${d.lembaga.map((t) => html`<option value="${t.id}">${t.nama}</option>`)}</select></div>
          <div class="field mt-16"><label>Nama server</label><input class="input" id="nm" placeholder="Server Lab Komputer 1" value="Server Lab 1"></div>`,
        foot: html`<button class="btn secondary" data-x>Batal</button><button class="btn primary" data-go>${icon('key')} Buat Device Key</button>` });
      $('[data-go]', m.el).onclick = (e) => busy(e.currentTarget, async () => {
        try { const r = await api.rpc('sa_server_create', { tenant: $('#tn', m.el).value, nama: $('#nm', m.el).value }); m.close(); hard(); keyDialog(r.device_key, $('#nm', m.el).value); } catch (x) { toastErr(x); }
      });
    }),
    on(el, 'click', '[data-reset]', async (e, b) => {
      if (!(await confirmDialog({ title: 'Buat device key baru?', text: 'Kunci lama langsung tidak berlaku. Perbarui berkas .env di server lokal setelah ini.', ok: 'Buat kunci baru' }))) return;
      try { const r = await api.rpc('sa_server_reset_key', { id: b.dataset.reset }); keyDialog(r.device_key, b.dataset.n); } catch (x) { toastErr(x); }
    }),
    on(el, 'click', '[data-del]', async (e, b) => {
      if (!(await confirmDialog({ title: 'Hapus server lokal?', text: 'Perangkat tidak dapat lagi menyinkronkan data. Data ujian yang sudah tersinkron tetap aman.', danger: true, ok: 'Hapus' }))) return;
      try { await api.rpc('sa_server_delete', { id: b.dataset.del }); toast('Server dihapus', '', 'ok'); hard(); } catch (x) { toastErr(x); }
    }),
  ];
  return () => offs.forEach((x) => x());
}
