// Cache data "stale-while-revalidate": halaman langsung tampil dari cache,
// lalu diperbarui diam-diam di latar belakang. Membuat pindah menu terasa instan.
const mem = new Map();
const inflight = new Map();
const SS = 'ujk.cache.';
let scope = '';
export const setScope = (s) => { if (s !== scope) { scope = s || ''; mem.clear(); } };

function read(key) {
  const k = scope + '|' + key;
  if (mem.has(k)) return mem.get(k);
  try { const v = JSON.parse(sessionStorage.getItem(SS + k) || 'null'); if (v) mem.set(k, v); return v; } catch { return null; }
}
function write(key, data) {
  const k = scope + '|' + key;
  const v = { t: Date.now(), data };
  mem.set(k, v);
  try { const s = JSON.stringify(v); if (s.length < 400000) sessionStorage.setItem(SS + k, s); } catch { /* penuh: abaikan */ }
}
export const peek = (key) => read(key)?.data;
export const put = (key, data) => write(key, data);

/** Ambil data (dengan deduplikasi permintaan paralel). */
export function fetchOnce(key, fetcher) {
  const k = scope + '|' + key;
  if (inflight.has(k)) return inflight.get(k);
  const p = fetcher().then((d) => { write(key, d); return d; }).finally(() => inflight.delete(k));
  inflight.set(k, p);
  return p;
}

/**
 * swr(key, fetcher, paint, { ttl })
 * - Bila ada cache: paint(data, true) seketika.
 * - Bila cache kosong/basi: ambil dari server, lalu paint(data, false) jika berubah.
 * Mengembalikan Promise data terbaru.
 */
export async function swr(key, fetcher, paint, { ttl = 20000, alive = () => true } = {}) {
  const hit = read(key);
  if (hit) paint(hit.data, true);
  if (hit && Date.now() - hit.t < ttl) return hit.data;
  const before = hit ? JSON.stringify(hit.data) : null;
  const d = await fetchOnce(key, fetcher);
  if (alive() && JSON.stringify(d) !== before) paint(d, false);
  return d;
}

/** Hapus cache yang kuncinya diawali salah satu prefiks. */
export function invalidate(...prefixes) {
  for (const k of Array.from(mem.keys())) if (prefixes.some((p) => k.split('|')[1]?.startsWith(p))) mem.delete(k);
  try {
    for (let i = sessionStorage.length - 1; i >= 0; i--) {
      const k = sessionStorage.key(i);
      if (k && k.startsWith(SS) && prefixes.some((p) => k.slice(SS.length).split('|')[1]?.startsWith(p))) sessionStorage.removeItem(k);
    }
  } catch {}
}
export function clearAll() {
  mem.clear();
  try { for (let i = sessionStorage.length - 1; i >= 0; i--) { const k = sessionStorage.key(i); if (k && k.startsWith(SS)) sessionStorage.removeItem(k); } } catch {}
}
