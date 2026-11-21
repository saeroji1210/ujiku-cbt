// Audio soal (listening): unggah di editor & pemutar di layar ujian dengan batas putar.
import { html, icon } from '../core/ui.js';

export const AUDIO_ACCEPT = 'audio/*,.mp3,.m4a,.aac,.ogg,.oga,.opus,.wav,.webm';
export const AUDIO_MAX_MB = 20;
const EXT_TYPE = { mp3: 'audio/mpeg', m4a: 'audio/mp4', mp4: 'audio/mp4', aac: 'audio/aac', ogg: 'audio/ogg', oga: 'audio/ogg', opus: 'audio/ogg', wav: 'audio/wav', webm: 'audio/webm' };

// Periksa berkas audio sebelum diunggah. Mengembalikan { ext, type } atau melempar galat yang ramah.
export function checkAudio(file) {
  const ext = (file.name.split('.').pop() || '').toLowerCase();
  const type = EXT_TYPE[ext] || (/^audio\//.test(file.type) ? file.type : '');
  if (!type) throw new Error('Format audio tidak didukung. Gunakan MP3 (disarankan), M4A, OGG, atau WAV.');
  if (file.size > AUDIO_MAX_MB * 1024 * 1024) {
    throw new Error(`Ukuran audio ${(file.size / 1048576).toFixed(1)} MB, maksimal ${AUDIO_MAX_MB} MB. Simpan ulang sebagai MP3 64–128 kbps (±1 MB per menit).`);
  }
  return { ext: EXT_TYPE[ext] ? ext : (type.split('/')[1] || 'mp3').replace('mpeg', 'mp3'), type };
}

export const MAKS_OPSI = [[0, 'Bebas diputar ulang'], [1, 'Maksimal 1× putar'], [2, 'Maksimal 2× putar'], [3, 'Maksimal 3× putar']];

const mmss = (s) => (Number.isFinite(s) && s >= 0 ? `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}` : '–:––');

/**
 * Pemutar audio untuk peserta. Elemen Audio disimpan di luar DOM sehingga tetap berputar
 * saat tampilan soal digambar ulang (pindah soal dalam satu blok wacana).
 * Hitungan putar & posisi terakhir disimpan di localStorage per sesi (tahan muat ulang).
 */
export function examAudio(sid) {
  const KEY = 'ujk.aud.' + sid;
  let st = {}; try { st = JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch { st = {}; }
  const persist = () => { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch { /* penuh */ } };
  const els = new Map(), ui = new Map(), maksOf = new Map();
  let lastSave = 0;

  const rec = (u) => (st[u] ||= { n: 0, t: 0 });
  const sisa = (u) => { const m = maksOf.get(u) || 0; return m ? Math.max(0, m - rec(u).n) : Infinity; };
  const habis = (u, a) => sisa(u) <= 0 && (!a || a.paused) && (rec(u).t === 0);

  function paint(u) {
    const node = ui.get(u); const a = els.get(u);
    if (!node || !node.isConnected || !a) return;
    const m = maksOf.get(u) || 0, r = rec(u), playing = !a.paused && !a.ended;
    const dur = a.duration, pos = a.currentTime || 0;
    const done = habis(u, a);
    node.classList.toggle('on', playing);
    node.classList.toggle('done', done);
    node.classList.toggle('err', !!a.error);
    const btn = node.querySelector('[data-aud-play]');
    btn.disabled = done;
    btn.innerHTML = icon(playing ? 'pause' : done ? 'block' : 'play_arrow', 'fill').s;
    btn.setAttribute('aria-label', playing ? 'Jeda audio' : 'Putar audio');
    node.querySelector('.aud-time').textContent = `${mmss(pos)} / ${mmss(dur)}`;
    node.querySelector('.aud-bar i').style.width = (Number.isFinite(dur) && dur > 0 ? Math.min(100, (pos / dur) * 100) : 0) + '%';
    const note = node.querySelector('.aud-note');
    note.textContent = a.error ? 'Audio gagal dimuat. Periksa koneksi lalu ketuk tombol putar untuk mencoba lagi.'
      : node.classList.contains('wait') && playing ? 'Memuat audio…'
      : !m ? 'Boleh diputar ulang dan digeser.'
      : done ? `Batas putar habis (${m}×).`
      : playing ? `Putaran ke-${r.n} dari ${m} · bisa dijeda, tidak bisa digeser.`
      : r.t > 0 ? `Dijeda · lanjutkan tanpa mengurangi jatah. Sisa ${sisa(u)} dari ${m} putar.`
      : `Dapat diputar ${m}× · sisa ${sisa(u)}.`;
  }

  function el(u) {
    let a = els.get(u);
    if (a) return a;
    a = new Audio(); a.preload = 'auto'; a.src = u;
    const r = rec(u);
    a.addEventListener('loadedmetadata', () => { if (r.t > 0 && r.t < (a.duration || 0) - 0.5) a.currentTime = r.t; paint(u); });
    a.addEventListener('timeupdate', () => {
      if (!a.paused) { r.t = a.currentTime; if (Date.now() - lastSave > 2000) { lastSave = Date.now(); persist(); } }
      paint(u);
    });
    a.addEventListener('playing', () => {
      ui.get(u)?.classList.remove('wait');
      if (a._count) { a._count = false; r.n += 1; persist(); }
      paint(u);
    });
    a.addEventListener('waiting', () => { ui.get(u)?.classList.add('wait'); paint(u); });
    a.addEventListener('pause', () => { r.t = a.ended ? 0 : a.currentTime; persist(); paint(u); });
    a.addEventListener('ended', () => { r.t = 0; persist(); paint(u); });
    a.addEventListener('error', () => { a._count = false; paint(u); });
    els.set(u, a);
    return a;
  }

  // HTML pemutar. label: judul kecil di atas bilah.
  const widget = (u, maks, label = 'Audio') => {
    maksOf.set(u, +maks || 0);
    return html`<div class="aud ${+maks ? 'lim' : ''}" data-aud="${u}">
      <button type="button" class="aud-btn" data-aud-play aria-label="Putar audio">${icon('play_arrow', 'fill')}</button>
      <div class="aud-mid"><div class="aud-top">${icon('headphones')}<b class="ellipsis">${label}</b><span class="aud-time">0:00 / –:––</span></div>
        <div class="aud-bar" ${+maks ? '' : 'data-aud-seek'}><i></i></div><div class="aud-note"></div></div></div>`;
  };

  // Hubungkan pemutar yang baru digambar; jeda audio lain yang tidak lagi tampil.
  function bind(root) {
    const seen = new Set();
    root.querySelectorAll('.aud[data-aud]').forEach((node) => { const u = node.dataset.aud; seen.add(u); ui.set(u, node); el(u); paint(u); });
    for (const [u, a] of els) if (!seen.has(u) && !a.paused) a.pause();
  }

  function toggle(node) {
    const u = node.dataset.aud; const a = el(u);
    if (!a.paused && !a.ended) { a.pause(); return; }
    if (a.error) { a.load(); }
    const fresh = a.ended || rec(u).t === 0;
    if (fresh) {
      if (sisa(u) <= 0) { paint(u); return; }
      if (a.ended) a.currentTime = 0;
      a._count = (maksOf.get(u) || 0) > 0;
    }
    a.play().catch(() => { a._count = false; paint(u); });
  }
  function seek(node, e) {
    const u = node.closest('[data-aud]').dataset.aud; const a = el(u);
    if ((maksOf.get(u) || 0) > 0 || !Number.isFinite(a.duration)) return;
    const b = node.getBoundingClientRect();
    a.currentTime = Math.max(0, Math.min(1, (e.clientX - b.left) / b.width)) * a.duration;
    rec(u).t = a.currentTime; persist(); paint(u);
  }
  const stopAll = () => { for (const a of els.values()) { try { a.pause(); } catch { /* */ } } };
  return { widget, bind, toggle, seek, stopAll };
}

// Pemutar sederhana untuk guru (editor & pratinjau)
export const teacherAudio = (u) => html`<div class="aud-t"><audio controls preload="metadata" src="${u}"></audio></div>`;
