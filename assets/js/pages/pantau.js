import * as api from '../core/api.js';
import * as store from '../core/store.js';
import { html, icon, $, $$, on, fmt, initials, mapelColor, badge, skel, empty, modal, toast, toastErr, busy, copyText, confirmDialog } from '../core/ui.js';
import { examAction } from './ad-ujian.js';

const EV = {
  mulai: ['play_circle', 'Mulai mengerjakan', '#1565D8'], lanjut: ['replay', 'Melanjutkan sesi', '#1565D8'], selesai: ['task_alt', 'Menyelesaikan ujian', '#22A06B'],
  pindah_tab: ['tab_unselected', 'Pindah tab / aplikasi', '#F15A3B'], keluar_fullscreen: ['fullscreen_exit', 'Keluar layar penuh', '#F15A3B'],
  terkunci: ['lock', 'Sesi terkunci otomatis', '#DC2626'], diizinkan_lanjut: ['lock_open', 'Diizinkan melanjutkan', '#22A06B'],
  tambah_waktu: ['more_time', 'Tambahan waktu', '#F7941D'], koneksi_putus: ['wifi_off', 'Koneksi terputus', '#F7941D'], koneksi_pulih: ['wifi', 'Koneksi pulih', '#22B8E8'],
  kembali: ['undo', 'Kembali ke halaman ujian', '#6B7280'], layar_penuh: ['fullscreen', 'Masuk layar penuh', '#6B7280'],
};
const ST = { belum: 'Belum Mulai', mengerjakan: 'Mengerjakan', selesai: 'Selesai', terkunci: 'Terkunci' };

export default async function (ctx) {
  const { el, params, title, alive, mode, go } = ctx;
  el.innerHTML = skel.page().s;
  let d = null, filter = 'semua', kelas = '', q = '', drawer = null;
  const load = () => api.rpc('monitor', { exam: params.id });
  d = await load();
  if (!alive()) return;
  title('Pantau · ' + d.ujian.judul);
  const u = d.ujian;
  const skew = new Date(d.server_now).getTime() - Date.now();
  const now = () => Date.now() + skew;
  el.innerHTML = html`<div class="page-head"><div><div class="crumb"><a href="#/pantau">Pantau Sesi</a> › <b>${u.mapel}</b></div><h1>${u.judul}</h1>
      <div class="sub row wrap gap-8" id="sub"></div></div><span class="spacer"></span>
      <div class="row wrap gap-8"><div class="card row gap-8" style="padding:8px 12px"><span class="muted small">Token</span><span class="token-box" id="tok">${u.token}</span>
        <button class="btn ghost icon sm" data-a="copy" title="Salin">${icon('content_copy')}</button><button class="btn ghost icon sm" data-a="token" title="Ganti token">${icon('autorenew')}</button></div>
        ${mode === 'admin' && u.status === 'terbit' ? html`<button class="btn secondary" data-a="close">${icon('lock_clock')} Tutup Ujian</button>` : ''}
        <a class="btn soft" href="#/laporan/${u.id}">${icon('monitoring')} Laporan</a></div></div>
    ${u.lokasi === 'server_lokal' ? html`<div class="alert cyan"><div class="a-ic">${icon('dns')}</div><div class="small"><b>Ujian lewat server lokal sekolah.</b> Data di sini diperbarui setiap kali server lokal tersinkron ke internet. Untuk izin lanjut & tambah waktu saat offline, gunakan halaman pengawas di server lokal.</div></div>` : ''}
    <div class="grid g-4" id="stats" style="gap:14px"></div>
    <div class="card pad-0 mt-16"><div class="toolbar"><div class="input-ic">${icon('search')}<input class="input soft" id="q" placeholder="Cari nama atau NIS…"></div>
      <select class="select soft" id="kls" style="width:auto"><option value="">Semua kelas</option></select>
      <div class="seg" id="flt">${[['semua', 'Semua'], ['mengerjakan', 'Mengerjakan'], ['terkunci', 'Terkunci'], ['selesai', 'Selesai'], ['belum', 'Belum']].map(([k, l]) => html`<button data-f="${k}" class="${k === 'semua' ? 'on' : ''}">${l}</button>`)}</div>
      <span class="spacer"></span><span class="muted small row gap-4" id="upd"></span></div>
      <div style="padding:0 16px 16px"><div class="tiles" id="tiles"></div></div></div>`.s;
  [...new Set(d.peserta.map((p) => p.kelas))].sort().forEach((k) => $('#kls', el).add(new Option(k || 'Tanpa kelas', k)));

  const sisa = (p) => (p.batas_waktu ? (new Date(p.batas_waktu).getTime() - now()) / 1000 : 0);
  const paint = () => {
    if (!alive()) return;
    const c = { belum: 0, mengerjakan: 0, selesai: 0, terkunci: 0 };
    d.peserta.forEach((p) => { c[p.status] = (c[p.status] || 0) + 1; });
    const ex = d.ujian;
    const endIn = (new Date(ex.selesai).getTime() - now()) / 1000;
    $('#sub', el).innerHTML = html`${badge(ex.state)}<span>${fmt.dt(ex.mulai)} – ${fmt.time(ex.selesai)}</span>·<span>${ex.jumlah_soal} soal · ${ex.durasi_menit} menit</span>
      ${ex.state === 'berlangsung' ? html`·<b class="c-primary">Ditutup dalam ${fmt.mins(endIn)}</b>` : ''}`.s;
    $('#stats', el).innerHTML = [['belum', 'hourglass_empty', '#94A3B8'], ['mengerjakan', 'edit_note', '#1565D8'], ['selesai', 'task_alt', '#22A06B'], ['terkunci', 'lock', '#DC2626']]
      .map(([k, ic, col]) => html`<button class="card row hover-lift" data-f="${k}" style="border:0;text-align:left;cursor:pointer;${filter === k ? 'box-shadow:0 0 0 2px ' + col : ''}">
        <div class="icon-tile" style="background:${col}">${icon(ic)}</div><div><div class="bold" style="font-size:26px">${c[k] || 0}</div><div class="muted small">${ST[k]}</div></div></button>`.s).join('');
    const list = d.peserta.filter((p) => (filter === 'semua' || p.status === filter) && (!kelas || p.kelas === kelas)
      && (!q || p.nama.toLowerCase().includes(q) || p.nis.includes(q)));
    $('#tiles', el).innerHTML = list.length ? list.map((p) => html`<div class="tile st-${p.status}" data-pid="${p.pid}">
      <span class="avatar" style="${p.status === 'terkunci' ? 'background:var(--red-50);color:var(--red)' : p.status === 'selesai' ? 'background:var(--green-50);color:var(--green)' : ''}">${initials(p.nama)}</span>
      <div style="flex:1;min-width:0"><div class="semi ellipsis">${p.nama}</div><div class="muted small">${p.kelas} · ${p.nis}</div>
        <div class="row gap-8 small mt-4">${p.status === 'belum' ? html`<span class="muted">Belum mulai</span>`
          : html`<b>${p.terjawab}/${ex.jumlah_soal}</b>${p.status === 'mengerjakan' ? html`<span class="muted">· ${fmt.dur(Math.max(0, sisa(p)))}</span>` : p.status === 'selesai' && p.nilai != null ? html`<span class="muted">· nilai ${fmt.num(p.nilai, 1)}</span>` : ''}
          ${p.sumber === 'server_lokal' ? icon('dns', 'muted') : ''}`}</div></div>
      ${p.pelanggaran ? html`<span class="flag" title="Pelanggaran">${icon('flag')}${p.pelanggaran}</span>` : ''}</div>`.s).join('')
      : empty('person_search', 'Tidak ada peserta', 'Ubah filter atau kata kunci.').s;
    $('#upd', el).innerHTML = html`${icon('sync')} Diperbarui ${fmt.time(new Date())}`.s;
    if (drawer && !drawer.closed) paintDrawer();
  };
  paint();

  const refresh = async () => { try { d = await load(); paint(); } catch (e) { if (e.code !== 'network') toastErr(e); } };
  const iv = setInterval(() => { if (!document.hidden) refresh(); }, 5000);
  const tick = setInterval(() => { if (!document.hidden && alive()) { $$('.tile.st-mengerjakan', el).length && paint(); } }, 1000 * 15);

  let curPid = null;
  function paintDrawer() {
    const p = d.peserta.find((x) => x.pid === curPid);
    if (!p || !drawer) return;
    const info = $('#dinfo', drawer.el);
    info.innerHTML = html`<div class="row"><span class="avatar lg">${initials(p.nama)}</span><div><h3>${p.nama}</h3><div class="muted small">${p.nis} · Kelas ${p.kelas}</div></div><span class="spacer"></span>${badge(p.status === 'belum' ? 'belum' : p.status)}</div>
      <div class="grid g-2 mt-16" style="gap:10px">${[['Terjawab', p.status === 'belum' ? '–' : `${p.terjawab}/${d.ujian.jumlah_soal}`], ['Pelanggaran', `${p.pelanggaran} / ${d.ujian.batas_pelanggaran || '∞'}`],
        ['Mulai', p.mulai ? fmt.time(p.mulai) : '–'], ['Sisa waktu', p.status === 'mengerjakan' ? fmt.dur(Math.max(0, sisa(p))) : '–'],
        ['Terakhir aktif', p.last_seen ? fmt.rel(p.last_seen) : '–'], ['Sumber', p.sumber === 'server_lokal' ? 'Server lokal' : p.sumber ? 'Online' : '–']]
        .map(([l, v]) => html`<div style="background:var(--slate-50);border-radius:12px;padding:10px 12px"><div class="muted tiny">${l}</div><b>${v}</b></div>`)}</div>
      ${p.status === 'terkunci' ? html`<div class="alert red mt-16"><div class="a-ic">${icon('lock')}</div><div class="small"><b>Sesi terkunci</b> karena melewati batas pelanggaran. Pastikan peserta kembali tertib sebelum diizinkan lanjut.</div></div>` : ''}
      <div class="row wrap gap-8 mt-16">${p.sid && p.status !== 'selesai' && p.sumber !== 'server_lokal' ? html`
        ${p.status === 'terkunci' ? html`<button class="btn primary" data-d="unlock">${icon('lock_open')} Izinkan Lanjut</button>` : html`<button class="btn secondary" data-d="device">${icon('devices')} Izinkan Pindah Perangkat</button>`}
        <button class="btn secondary" data-d="time">${icon('more_time')} Tambah Waktu</button>` : ''}</div>`.s;
  }
  async function openDrawer(pid) {
    curPid = pid;
    const p = d.peserta.find((x) => x.pid === pid);
    drawer = modal({ drawer: true, title: 'Detail Sesi Peserta', ic: 'person', body: html`<div id="dinfo"></div><h3 class="mt-24">Log Kejadian</h3><div id="dlog" class="mt-8">${p.sid ? skel.lines(4) : html`<p class="muted small">Peserta belum memulai ujian.</p>`}</div>` });
    paintDrawer();
    on(drawer.el, 'click', '[data-d]', (e, b) => {
      const p2 = d.peserta.find((x) => x.pid === curPid);
      const a = b.dataset.d;
      if (a === 'unlock' || a === 'device') return busy(b, async () => {
        try { await api.rpc('session_unlock', { session: p2.sid, reset_device: true }); toast(a === 'unlock' ? 'Peserta diizinkan melanjutkan' : 'Peserta boleh masuk dari perangkat lain', 'Minta peserta memasukkan token lagi bila pindah perangkat.', 'ok'); await refresh(); loadLog(); } catch (x) { toastErr(x); }
      });
      if (a === 'time') {
        const m = modal({ title: 'Tambah Waktu', sub: p2.nama, ic: 'more_time', size: 'narrow',
          body: html`<div class="field"><label>Tambahan (menit)</label><input class="input" type="number" id="mn" value="10" min="1" max="240"></div>
            <div class="field mt-16"><label>Alasan <span class="req">*</span></label><input class="input" id="al" placeholder="mis. listrik padam, perangkat bermasalah"></div>`,
          foot: html`<button class="btn secondary" data-x>Batal</button><button class="btn primary" data-go>${icon('more_time')} Tambahkan</button>` });
        $('[data-go]', m.el).onclick = (ev) => busy(ev.currentTarget, async () => {
          try { await api.rpc('session_add_time', { session: p2.sid, menit: Number($('#mn', m.el).value), alasan: $('#al', m.el).value }); m.close(); toast('Waktu ditambahkan', '', 'ok'); await refresh(); loadLog(); } catch (x) { toastErr(x); }
        });
      }
    });
    const loadLog = async () => {
      if (!p.sid) return;
      try {
        const ev = await api.rpc('session_events', { session: p.sid });
        $('#dlog', drawer.el).innerHTML = ev.length ? html`<div class="timeline">${ev.map((x) => { const [ic, l, col] = EV[x.jenis] || ['info', x.jenis, '#6B7280'];
          return html`<div class="tl"><div class="tm">${fmt.time(x.waktu)}</div><div class="bar" style="background:${col}"></div><div><div class="tt row gap-4">${icon(ic)} ${l}</div>
            <div class="ts">${x.detail?.alasan ? 'Alasan: ' + x.detail.alasan : ''}${x.detail?.oleh ? ' · oleh ' + x.detail.oleh : ''}${x.detail?.menit ? ' · +' + x.detail.menit + ' menit' : ''}</div></div></div>`; })}</div>`.s
          : '<p class="muted small">Belum ada kejadian.</p>';
      } catch (e) { toastErr(e); }
    };
    loadLog();
  }

  $('#q', el).addEventListener('input', (e) => { q = e.target.value.trim().toLowerCase(); paint(); });
  $('#kls', el).onchange = (e) => { kelas = e.target.value; paint(); };
  const offs = [
    on(el, 'click', '[data-f]', (e, b) => { filter = filter === b.dataset.f && b.closest('#stats') ? 'semua' : b.dataset.f; $$('#flt [data-f]', el).forEach((x) => x.classList.toggle('on', x.dataset.f === filter)); paint(); }),
    on(el, 'click', '[data-pid]', (e, t) => openDrawer(t.dataset.pid)),
    on(el, 'click', '[data-a]', async (e, b) => {
      const a = b.dataset.a;
      if (a === 'copy') return copyText(d.ujian.token, 'Token disalin');
      if (a === 'token') { try { const r = await api.rpc('exam_token_regen', { id: d.ujian.id }); d.ujian.token = r.token; $('#tok', el).textContent = r.token; toast('Token baru: ' + r.token, '', 'ok'); } catch (x) { toastErr(x); } return; }
      if (a === 'close') examAction('close', d.ujian, { go, after: () => go('/laporan/' + d.ujian.id) });
    }),
  ];
  return () => { clearInterval(iv); clearInterval(tick); offs.forEach((f) => f()); };
}
