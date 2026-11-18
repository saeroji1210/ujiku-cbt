import * as api from '../core/api.js';
import * as store from '../core/store.js';
import { html, icon, $, fmt, mapelColor, badge, skel, empty, copyText, on } from '../core/ui.js';

const KEY = 'pengawas_exams';
const load = () => api.rpc('pengawas_exams');
export const prefetch = () => store.fetchOnce(KEY, load);

export default async function (ctx) {
  const { el, title, alive, mode } = ctx;
  title('Pantau Sesi');
  el.innerHTML = html`<div class="page-head"><div><div class="crumb">${mode === 'pengawas' ? 'Pengawasan' : 'Ujian'}</div><h1>Pantau Sesi Ujian</h1>
    <div class="sub">Ujian yang sedang berlangsung, akan dimulai dalam 2 hari, atau baru berakhir. Buka pantauan untuk melihat progres peserta secara langsung.</div></div>
    ${mode === 'admin' ? html`<span class="spacer"></span><a class="btn secondary" href="#/admin/ujian">${icon('event_note')} Semua jadwal</a>` : ''}</div><div id="body">${skel.cards(4, 220)}</div>`.s;
  const paint = (rows) => {
    if (!alive()) return;
    const order = { berlangsung: 0, terjadwal: 1, berakhir: 2 };
    rows = [...rows].sort((a, b) => (order[a.state] ?? 3) - (order[b.state] ?? 3) || new Date(a.mulai) - new Date(b.mulai));
    $('#body', el).innerHTML = (rows.length ? html`<div class="grid g-3">${rows.map((e) => {
      const c = mapelColor(e.mapel); const pct = e.peserta ? Math.round((e.selesai_n / e.peserta) * 100) : 0;
      return html`<a class="card exam-card" href="#/pantau/${e.id}" style="color:inherit;text-decoration:none">
        <div class="chip-head" style="background:${c}">${e.mapel || 'Ujian'}</div>
        <div class="row top"><div style="flex:1;min-width:0"><div class="t ellipsis">${e.judul}</div><div class="m mt-4">${icon('schedule')} ${fmt.day(e.mulai)} · ${fmt.time(e.mulai)}–${fmt.time(e.selesai)}</div></div>${badge(e.state)}</div>
        <div class="row wrap gap-8"><button class="btn secondary sm mono" data-tok="${e.token}" title="Salin token">${icon('key')} ${e.token}</button>
          ${e.lokasi === 'server_lokal' ? html`<span class="badge b-cyan">${icon('dns')} Server lokal</span>` : ''}
          ${e.terkunci ? html`<span class="warn-strip">${icon('lock')} ${e.terkunci} sesi terkunci</span>` : ''}</div>
        <div class="sep"><div class="row" style="justify-content:space-between"><span class="small">${e.selesai_n}/${e.peserta} peserta selesai</span><b style="color:${c}">${pct}%</b></div>
          <div class="progress mt-8"><i style="width:${pct}%;background:${c}"></i></div>
          <div class="foot"><span class="muted">${e.state === 'berlangsung' ? 'Sisa ' + fmt.mins((new Date(e.selesai) - Date.now()) / 1000) : e.state === 'terjadwal' ? 'Mulai ' + fmt.rel(e.mulai).replace(' lalu', '') : 'Menunggu ditutup'}</span>
          <span class="c-primary semi">Buka pantauan ${icon('arrow_forward')}</span></div></div></a>`;
    })}</div>` : html`<div class="card">${empty('visibility_off', 'Tidak ada ujian untuk dipantau', 'Ujian yang sudah diterbitkan dan berlangsung hari ini akan muncul di sini.')}</div>`).s;
  };
  await store.swr(KEY, load, paint, { alive, ttl: 8000 });
  const iv = setInterval(() => { if (!document.hidden) store.fetchOnce(KEY, load).then(paint).catch(() => {}); }, 15000);
  const off = on(el, 'click', '[data-tok]', (e, b) => { e.preventDefault(); copyText(b.dataset.tok, 'Token disalin'); });
  return () => { clearInterval(iv); off(); };
}
