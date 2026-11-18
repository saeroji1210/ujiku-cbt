import { ICONS } from './icons.js';
// Komponen & utilitas antarmuka bersama
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
class Raw { constructor(s) { this.s = s; } toString() { return this.s; } }
export const raw = (s) => new Raw(String(s ?? ''));
const flat = (v) => (v == null || v === false ? '' : v instanceof Raw ? v.s : Array.isArray(v) ? v.map(flat).join('') : esc(v));
/** Template HTML aman: nilai otomatis di-escape kecuali dibungkus raw()/html``. */
export function html(strings, ...vals) {
  let out = strings[0];
  for (let i = 0; i < vals.length; i++) out += flat(vals[i]) + strings[i + 1];
  return new Raw(out);
}
export const $ = (sel, el = document) => el.querySelector(sel);
export const $$ = (sel, el = document) => Array.from(el.querySelectorAll(sel));
export function on(el, type, sel, fn) {
  const h = (e) => { const t = e.target.closest(sel); if (t && el.contains(t)) fn(e, t); };
  el.addEventListener(type, h);
  return () => el.removeEventListener(type, h);
}
const warned = new Set();
export const icon = (name, cls = '') => {
  const d = (/\bfill\b/.test(cls) && ICONS[name + ':f']) || ICONS[name];
  if (!d && !warned.has(name)) { warned.add(name); console.warn('Ikon tidak ada:', name); }
  return raw(`<svg class="ms ${cls}" viewBox="0 0 24 24" aria-hidden="true" focusable="false">${d || ICONS.help || ''}</svg>`);
};
export const debounce = (fn, ms = 250) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---------------- Format ----------------
const ID = 'id-ID';
const d = (v) => (v instanceof Date ? v : new Date(v));
export const fmt = {
  num: (n, f = 0) => (n == null || n === '' ? '–' : Number(n).toLocaleString(ID, { maximumFractionDigits: f, minimumFractionDigits: 0 })),
  rp: (n) => 'Rp ' + Number(n || 0).toLocaleString(ID),
  date: (v) => (v ? d(v).toLocaleDateString(ID, { day: 'numeric', month: 'short', year: 'numeric' }) : '–'),
  dateLong: (v) => (v ? d(v).toLocaleDateString(ID, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : '–'),
  day: (v) => (v ? d(v).toLocaleDateString(ID, { weekday: 'short', day: 'numeric', month: 'short' }) : '–'),
  time: (v) => (v ? d(v).toLocaleTimeString(ID, { hour: '2-digit', minute: '2-digit' }).replace(':', '.') : '–'),
  dt: (v) => (v ? `${fmt.day(v)} · ${fmt.time(v)}` : '–'),
  rel(v) {
    if (!v) return '–';
    const s = (Date.now() - d(v).getTime()) / 1000;
    if (s < 60) return 'baru saja';
    if (s < 3600) return Math.floor(s / 60) + ' mnt lalu';
    if (s < 86400) return Math.floor(s / 3600) + ' jam lalu';
    if (s < 86400 * 30) return Math.floor(s / 86400) + ' hari lalu';
    return fmt.date(v);
  },
  dur(sec) {
    sec = Math.max(0, Math.floor(sec));
    const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
    return (h ? String(h).padStart(2, '0') + ':' : '') + String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
  },
  mins: (sec) => (sec <= 0 ? 'selesai' : sec < 3600 ? Math.ceil(sec / 60) + ' menit' : Math.floor(sec / 3600) + ' jam ' + Math.round((sec % 3600) / 60) + ' mnt'),
  localInput(v) { // untuk <input type=datetime-local>
    const x = d(v); x.setMinutes(x.getMinutes() - x.getTimezoneOffset()); return x.toISOString().slice(0, 16);
  },
};
export function initials(name = '') {
  const w = String(name).replace(/[,.].*$/, '').trim().split(/\s+/).filter((x) => !/^(pak|bu|ibu|drs?|ir|hj?)$/i.test(x));
  return ((w[0] || '?')[0] + (w[1] ? w[1][0] : '')).toUpperCase();
}
const MAPEL = [
  [/matem|mtk|math/i, '#1565D8'], [/indones|b\.? ?indo|bindo/i, '#F7941D'], [/ipa|sains|fisika|kimia|biologi|science/i, '#F15A3B'],
  [/inggris|english|b\.? ?ing/i, '#22B8E8'], [/ips|sejarah|geografi|ekonomi|sosiologi/i, '#7C3AED'], [/agama|pai|pendidikan agama/i, '#22A06B'],
  [/pkn|ppkn|pancasila/i, '#DB2777'], [/informatika|tik|komputer/i, '#0E7490'], [/seni|budaya|prakarya/i, '#CA8A04'], [/jawa|sunda|daerah|arab/i, '#B45309'],
];
const PALET = ['#1565D8', '#F7941D', '#F15A3B', '#22B8E8', '#7C3AED', '#22A06B', '#DB2777', '#0E7490'];
export function mapelColor(m = '') {
  for (const [re, c] of MAPEL) if (re.test(m)) return c;
  let h = 0; for (const ch of String(m)) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return PALET[h % PALET.length];
}
export const mapelIcon = (m = '') => (/matem/i.test(m) ? 'calculate' : /indones/i.test(m) ? 'menu_book' : /ipa|fisika|kimia|biologi|sains/i.test(m) ? 'science'
  : /inggris|english/i.test(m) ? 'translate' : /ips|sejarah|geografi/i.test(m) ? 'public' : /agama/i.test(m) ? 'mosque' : 'auto_stories');

const STATUS = {
  aktif: ['b-green', 'Aktif'], trial: ['b-yellow', 'Uji Coba'], nonaktif: ['b-red', 'Nonaktif'], undangan: ['b-yellow', 'Menunggu Aktivasi'],
  draf: ['b-gray', 'Draf'], siap: ['b-green', 'Siap'], diarsipkan: ['b-gray', 'Diarsipkan'], terkunci: ['b-purple', 'Terkunci'],
  terbit: ['b-blue', 'Terbit'], terjadwal: ['b-blue', 'Terjadwal'], berlangsung: ['b-blue', 'Berlangsung'], berakhir: ['b-yellow', 'Menunggu Ditutup'],
  selesai: ['b-green', 'Selesai'], dibatalkan: ['b-red', 'Dibatalkan'],
  menunggu: ['b-yellow', 'Menunggu'], disetujui: ['b-green', 'Disetujui'], ditolak: ['b-red', 'Ditolak'],
  belum: ['b-gray', 'Belum Mulai'], mengerjakan: ['b-blue', 'Mengerjakan'], online: ['b-green', 'Online'], offline: ['b-red', 'Offline'],
};
export function badge(status, label, dot = true) {
  const [c, l] = STATUS[status] || ['b-gray', status || '–'];
  return html`<span class="badge ${c}">${dot ? raw('<i class="d"></i>') : ''}${label || l}</span>`;
}
export const statusLabel = (s) => (STATUS[s] || [0, s])[1];

// ---------------- Sanitasi HTML soal ----------------
const MATH_CLS = new Set(['m-f', 'm-n', 'm-d', 'm-rad', 'm-rb', 'm-ov', 'm-un', 'm-mx', 'm-big', 'm-lim', 'm-box', 'm-fn']);
const ALLOWED = new Set(['B', 'STRONG', 'I', 'EM', 'U', 'S', 'SUP', 'SUB', 'BR', 'P', 'DIV', 'SPAN', 'UL', 'OL', 'LI', 'IMG', 'TABLE', 'TBODY', 'THEAD', 'TR', 'TD', 'TH', 'CODE', 'PRE', 'BLOCKQUOTE']);
export function sanitize(input) {
  if (!input) return '';
  const doc = new DOMParser().parseFromString('<div>' + input + '</div>', 'text/html');
  const walk = (node) => {
    for (const ch of Array.from(node.childNodes)) {
      if (ch.nodeType === 1) {
        if (!ALLOWED.has(ch.tagName)) {
          if (['SCRIPT', 'STYLE', 'IFRAME', 'OBJECT', 'EMBED', 'LINK', 'META'].includes(ch.tagName)) { ch.remove(); continue; }
          walk(ch); ch.replaceWith(...ch.childNodes); continue;
        }
        for (const a of Array.from(ch.attributes)) {
          const n = a.name.toLowerCase();
          const okImg = ch.tagName === 'IMG' && (n === 'src' || n === 'alt' || n === 'width' || n === 'height');
          const okTd = (ch.tagName === 'TD' || ch.tagName === 'TH') && (n === 'colspan' || n === 'rowspan');
          const okCls = ch.tagName === 'SPAN' && n === 'class' && a.value.split(/\s+/).every((c) => MATH_CLS.has(c));
          if (!okImg && !okTd && !okCls) ch.removeAttribute(a.name);
        }
        if (ch.tagName === 'IMG' && !/^(https?:|data:image\/|\/)/i.test(ch.getAttribute('src') || '')) { ch.remove(); continue; }
        walk(ch);
      } else if (ch.nodeType !== 3) ch.remove();
    }
  };
  walk(doc.body.firstChild);
  return doc.body.firstChild.innerHTML;
}
export const plain = (h = '') => String(h).replace(/<span class="m-n m-d">/g, '/').replace(/<\/?(sup|sub|b|i|u|s|strong|em|span|code)\b[^>]*>/gi, '').replace(/<img[^>]*>/gi, ' [gambar] ').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/\s+/g, ' ').trim();

// ---------------- Toast ----------------
let toastsEl;
export function toast(title, text = '', type = 'info', ms = 4200) {
  if (!toastsEl) { toastsEl = document.createElement('div'); toastsEl.className = 'toasts'; toastsEl.setAttribute('role', 'status'); document.body.appendChild(toastsEl); }
  const ic = { ok: 'check_circle', err: 'error', warn: 'warning', info: 'info' }[type] || 'info';
  const el = document.createElement('div');
  el.className = 'toast ' + type;
  el.innerHTML = html`${icon(ic, 'fill')}<div><div class="tt">${title}</div>${text ? html`<div class="tx">${text}</div>` : ''}</div>`.s;
  toastsEl.appendChild(el);
  setTimeout(() => { el.style.transition = 'opacity .25s'; el.style.opacity = '0'; setTimeout(() => el.remove(), 260); }, ms);
}
export const toastErr = (e, title = 'Terjadi kesalahan') => toast(title, e?.message || String(e), 'err', 6000);

// ---------------- Modal / drawer / konfirmasi ----------------
const openStack = [];
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && openStack.length) openStack[openStack.length - 1].close(); });
/**
 * modal({ title, sub, body, foot, size, icon, drawer, onMount, dismiss })
 * Mengembalikan objek { el, close, body } — body adalah elemen .m-body.
 */
export function modal({ title = '', sub = '', body = '', foot = '', size = '', ic = '', drawer = false, sheet = false, onClose, dismiss = true } = {}) {
  const scrim = document.createElement('div');
  scrim.className = 'scrim' + (drawer ? ' drawer-scrim' : '') + (sheet ? ' sheet-scrim' : '');
  const box = drawer ? 'drawer' : sheet ? 'sheet' : 'modal ' + size;
  scrim.innerHTML = html`<div class="${box}" role="dialog" aria-modal="true" aria-label="${title}">
    ${sheet ? raw('<div class="grab"></div>') : ''}
    ${title ? html`<div class="m-head">${ic ? html`<div class="icon-tile soft">${icon(ic)}</div>` : ''}
      <div style="min-width:0"><h2>${title}</h2>${sub ? html`<div class="sub">${sub}</div>` : ''}</div>
      <button class="btn ghost icon m-close" data-x aria-label="Tutup">${icon('close')}</button></div>` : ''}
    <div class="m-body">${body}</div>
    ${foot ? html`<div class="m-foot">${foot}</div>` : ''}</div>`.s;
  document.body.appendChild(scrim);
  document.body.style.overflow = 'hidden';
  const h = {
    el: scrim, body: scrim.querySelector('.m-body'), foot: scrim.querySelector('.m-foot'),
    close(v) {
      if (h.closed) return; h.closed = true;
      scrim.remove(); openStack.splice(openStack.indexOf(h), 1);
      if (!openStack.length) document.body.style.overflow = '';
      onClose && onClose(v);
    },
  };
  openStack.push(h);
  scrim.addEventListener('mousedown', (e) => { if (e.target === scrim && dismiss) h.close(); });
  scrim.querySelectorAll('[data-x]').forEach((b) => b.addEventListener('click', () => h.close()));
  setTimeout(() => { const f = scrim.querySelector('[autofocus], input:not([type=hidden]), textarea, select'); f && f.focus(); }, 30);
  return h;
}
export function confirmDialog({ title = 'Konfirmasi', text = '', ok = 'Ya, lanjutkan', cancel = 'Batal', danger = false, ic = 'help' } = {}) {
  return new Promise((resolve) => {
    const m = modal({
      title, ic, size: 'narrow', body: html`<p class="muted">${text}</p>`,
      foot: html`<button class="btn secondary" data-x>${cancel}</button><button class="btn ${danger ? 'danger' : 'primary'}" data-ok>${ok}</button>`,
      onClose: (v) => resolve(!!v),
    });
    m.el.querySelector('[data-ok]').addEventListener('click', () => m.close(true));
  });
}
export function promptDialog({ title, label, value = '', ok = 'Simpan', type = 'text', textarea = false, hint = '' }) {
  return new Promise((resolve) => {
    const m = modal({
      title, size: 'narrow',
      body: html`<div class="field"><label>${label}</label>${textarea ? html`<textarea class="textarea" data-v>${value}</textarea>` : html`<input class="input" type="${type}" data-v value="${value}">`}
        ${hint ? html`<div class="hint">${hint}</div>` : ''}</div>`,
      foot: html`<button class="btn secondary" data-x>Batal</button><button class="btn primary" data-ok>${ok}</button>`,
      onClose: (v) => resolve(v ?? null),
    });
    const inp = m.el.querySelector('[data-v]');
    const done = () => m.close(inp.value);
    m.el.querySelector('[data-ok]').addEventListener('click', done);
    if (!textarea) inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') done(); });
  });
}
/** Popup menu di dekat tombol. items: [{label, icon, act, red, sep}] */
export function popMenu(anchor, items, onPick) {
  document.querySelectorAll('.menu-pop').forEach((m) => m.remove());
  const m = document.createElement('div');
  m.className = 'menu-pop';
  m.innerHTML = items.map((it, i) => (it.sep ? '<div class="sep"></div>' : html`<button data-i="${i}" class="${it.red ? 'red' : ''}">${it.icon ? icon(it.icon) : ''}${it.label}</button>`.s)).join('');
  document.body.appendChild(m);
  const r = anchor.getBoundingClientRect();
  const w = m.offsetWidth, hgt = m.offsetHeight;
  m.style.left = Math.max(8, Math.min(window.innerWidth - w - 8, r.right - w)) + window.scrollX + 'px';
  const top = r.bottom + 6 + hgt > window.innerHeight ? r.top - hgt - 6 : r.bottom + 6;
  m.style.top = Math.max(8, top) + window.scrollY + 'px';
  const close = () => { m.remove(); document.removeEventListener('mousedown', out, true); };
  const out = (e) => { if (!m.contains(e.target)) close(); };
  setTimeout(() => document.addEventListener('mousedown', out, true));
  m.addEventListener('click', (e) => { const b = e.target.closest('button[data-i]'); if (b) { close(); onPick(items[+b.dataset.i]); } });
}

/** Jalankan aksi async dengan tombol berstatus memuat. */
export async function busy(btn, fn) {
  if (!btn) return fn();
  if (btn.dataset.busy) return;
  btn.dataset.busy = 1; btn.disabled = true;
  const old = btn.innerHTML;
  btn.innerHTML = '<span class="spin"></span>' + (btn.classList.contains('icon') ? '' : '<span>Memproses…</span>');
  try { return await fn(); } finally { btn.innerHTML = old; btn.disabled = false; delete btn.dataset.busy; }
}

// ---------------- Skeleton & kosong ----------------
export const skel = {
  lines: (n = 4) => raw(Array.from({ length: n }, (_, i) => `<div class="skel line" style="width:${90 - (i % 3) * 18}%"></div>`).join('')),
  cards: (n = 4, h = 150) => raw(`<div class="grid g-4">${Array.from({ length: n }, () => `<div class="skel card" style="height:${h}px"></div>`).join('')}</div>`),
  table: (rows = 6) => raw(`<div class="card pad-0"><div style="padding:16px">${Array.from({ length: rows }, () => '<div class="skel line" style="height:36px;margin:10px 0"></div>').join('')}</div></div>`),
  page: () => raw(`<div class="skel h" style="height:34px;width:320px;margin:20px 0 24px"></div>${skel.cards(4).s}<div style="height:20px"></div>${skel.table(5).s}`),
};
export function empty(ic, title, text = '', action = '') {
  return html`<div class="empty"><div class="e-art">${icon(ic)}</div><h3>${title}</h3>${text ? html`<p style="max-width:420px">${text}</p>` : ''}${action}</div>`;
}

// ---------------- Berkas ----------------
export function download(blob, name) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}
export function pickFile(accept) {
  return new Promise((resolve) => {
    const i = document.createElement('input');
    i.type = 'file'; i.accept = accept;
    i.onchange = () => resolve(i.files[0] || null);
    i.click();
  });
}
export async function copyText(t, label = 'Disalin ke papan klip') {
  try { await navigator.clipboard.writeText(t); toast(label, '', 'ok', 2200); }
  catch { const ta = document.createElement('textarea'); ta.value = t; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove(); toast(label, '', 'ok', 2200); }
}
/** Cetak / simpan PDF lewat dialog cetak browser. */
export function printDoc(title, bodyHtml) {
  const w = window.open('', '_blank');
  if (!w) { toast('Pop-up diblokir', 'Izinkan pop-up untuk mencetak.', 'warn'); return; }
  w.document.write(`<!doctype html><html lang="id"><head><meta charset="utf-8"><title>${esc(title)}</title>
  <style>body{font-family:'Plus Jakarta Sans',Arial,sans-serif;color:#1F2937;margin:28px;font-size:12px}h1{font-size:20px;margin:0 0 4px}
  .sub{color:#6B7280;margin-bottom:16px}table{width:100%;border-collapse:collapse;margin-top:10px}th,td{border:1px solid #D1D5DB;padding:6px 8px;text-align:left}
  th{background:#F1F5F9;font-size:11px;text-transform:uppercase}.num{text-align:right}.kartu{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}
  .k{border:1.5px dashed #94A3B8;border-radius:10px;padding:10px 12px;break-inside:avoid}.k b{font-size:14px}.k .s{font-family:monospace;font-size:16px;letter-spacing:.1em}
  @page{margin:14mm}</style></head><body>${bodyHtml}<script>setTimeout(()=>{window.print()},300)<\/script></body></html>`);
  w.document.close();
}

// ---------------- Grafik sederhana (HTML/CSS) ----------------
export function bars(data, { color = 'var(--primary)', fmtV = (v) => v, height = 180 } = {}) {
  const max = Math.max(1, ...data.map((x) => x.v));
  return html`<div class="bars" style="height:${height}px">${data.map((x) => html`<div class="bc" title="${x.l}: ${fmtV(x.v)}">
    <span class="bv">${x.v ? fmtV(x.v) : ''}</span><div class="b" style="height:${Math.max(2, (x.v / max) * (height - 46))}px;background:${x.c || color}"></div>
    <span class="bl">${x.l}</span></div>`)}</div>`;
}
export function donut(parts, center) {
  const total = parts.reduce((s, p) => s + p.v, 0) || 1;
  let acc = 0;
  const stops = parts.map((p) => { const a = (acc / total) * 360; acc += p.v; return `${p.c} ${a}deg ${(acc / total) * 360}deg`; }).join(',');
  return html`<div class="donut" style="background:conic-gradient(${raw(stops || '#E5E7EB 0 360deg')})"><div>${center}</div></div>`;
}
