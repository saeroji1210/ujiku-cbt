// Klien Supabase ringan: Auth (Google PKCE), RPC (PostgREST), Storage.
// Tanpa pustaka eksternal agar muat cepat dan bisa dipakai juga di server lokal.
const CFG = window.UJIKU_CONFIG || {};
export const MODE = CFG.MODE === 'lokal' ? 'lokal' : 'cloud';
const BASE = (CFG.SUPABASE_URL || (MODE === 'lokal' ? location.origin : '')).replace(/\/+$/, '');
const KEY = CFG.SUPABASE_ANON_KEY || (MODE === 'lokal' ? 'lokal' : '');
export const APP_URL = (CFG.APP_URL || (location.origin + location.pathname)).replace(/#.*$/, '');
export const configured = !!(BASE && KEY && !/GANTI|XXXX|your-project/i.test(BASE + KEY));

export class ApiError extends Error {
  constructor(message, { hint = null, code = null, status = 0 } = {}) {
    super(message); this.hint = hint; this.code = code; this.status = status;
  }
}

const LS_AUTH = 'ujk.auth.v1';
let auth = readJSON(localStorage, LS_AUTH);
let refreshing = null;
const listeners = new Set();
export const onAuthChange = (fn) => { listeners.add(fn); return () => listeners.delete(fn); };

function readJSON(store, key) { try { return JSON.parse(store.getItem(key) || 'null'); } catch { return null; } }
function emit() { listeners.forEach((fn) => { try { fn(auth); } catch (e) { console.error(e); } }); }

function setSession(d) {
  if (!d || !d.access_token) { auth = null; localStorage.removeItem(LS_AUTH); emit(); return; }
  const exp = d.expires_at || Math.floor(Date.now() / 1000) + (d.expires_in || 3600);
  auth = { access_token: d.access_token, refresh_token: d.refresh_token, expires_at: exp, user: d.user || auth?.user || null };
  localStorage.setItem(LS_AUTH, JSON.stringify(auth));
  emit();
}
export const session = () => auth;

async function req(path, { method = 'POST', body, token, headers = {}, timeout = 25000, isAuth = false } = {}) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), timeout);
  let res;
  try {
    res = await fetch(BASE + path, {
      method, signal: ctl.signal,
      // Authorization hanya dikirim bila ada token pengguna (kompatibel dengan anon key lama & publishable key baru)
      headers: { apikey: KEY, ...(token ? { Authorization: 'Bearer ' + token } : {}), 'Content-Type': 'application/json', ...headers },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch (e) {
    throw new ApiError(e.name === 'AbortError' ? 'Server terlalu lama merespons. Coba lagi.' : 'Tidak dapat terhubung ke server. Periksa koneksi internet.', { code: 'network' });
  } finally { clearTimeout(t); }
  const txt = await res.text();
  let data = null;
  if (txt) { try { data = JSON.parse(txt); } catch { data = txt; } }
  if (!res.ok) {
    const msg = (data && (data.message || data.msg || data.error_description || data.error)) || `Permintaan gagal (${res.status})`;
    const hint = data && data.hint;
    if (!isAuth && res.status === 401 && /jwt/i.test(String(msg))) throw new ApiError('Sesi Anda berakhir. Silakan masuk kembali.', { hint: 'relogin', status: 401 });
    throw new ApiError(String(msg), { hint, code: data && data.code, status: res.status });
  }
  return data;
}

async function refresh() {
  if (!auth?.refresh_token) { setSession(null); return null; }
  if (!refreshing) {
    refreshing = req('/auth/v1/token?grant_type=refresh_token', { body: { refresh_token: auth.refresh_token }, isAuth: true })
      .then((d) => { setSession(d); return auth; })
      .catch((e) => { if (e.code !== 'network') setSession(null); throw e; })
      .finally(() => { refreshing = null; });
  }
  return refreshing;
}

export async function accessToken() {
  if (!auth) return null;
  if (auth.expires_at * 1000 - 60000 < Date.now()) await refresh();
  return auth?.access_token || null;
}

/** Panggil fungsi RPC Postgres. args otomatis diberi prefiks p_ bila belum. */
export async function rpc(fn, args = {}, { anon = false } = {}) {
  const body = {};
  for (const [k, v] of Object.entries(args)) if (v !== undefined) body[k === 'p' || k.startsWith('p_') ? k : 'p_' + k] = v;
  const token = anon ? null : await accessToken();
  try {
    return await req('/rest/v1/rpc/' + fn, { body, token });
  } catch (e) {
    if (e.hint === 'relogin' && !anon) { setSession(null); }
    throw e;
  }
}

// ---------------- Auth Google (PKCE) ----------------
function b64url(bytes) { let s = ''; bytes.forEach((b) => { s += String.fromCharCode(b); }); return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); }
export function randomId(n = 16) { const a = new Uint8Array(n); crypto.getRandomValues(a); return Array.from(a, (b) => b.toString(16).padStart(2, '0')).join(''); }

export async function signInWithGoogle(nextHash) {
  const verifier = b64url(crypto.getRandomValues(new Uint8Array(48)));
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier)));
  sessionStorage.setItem('ujk.pkce', verifier);
  sessionStorage.setItem('ujk.next', nextHash || '#/');
  const redirect = APP_URL;
  location.href = `${BASE}/auth/v1/authorize?provider=google&redirect_to=${encodeURIComponent(redirect)}`
    + `&code_challenge=${b64url(digest)}&code_challenge_method=s256&prompt=select_account`;
}

/** Tangani kembalian dari Google. Mengembalikan hash tujuan bila berhasil masuk. */
export async function handleAuthRedirect() {
  const qs = new URLSearchParams(location.search);
  const hashQs = new URLSearchParams(location.hash.replace(/^#/, '').replace(/^\/[^?]*\??/, ''));
  const err = qs.get('error_description') || hashQs.get('error_description');
  const next = sessionStorage.getItem('ujk.next') || '#/';
  const clean = (h) => history.replaceState(null, '', location.pathname + h);
  if (err) { clean('#/masuk'); throw new ApiError(err.replace(/\+/g, ' ')); }
  const code = qs.get('code');
  if (code) {
    const verifier = sessionStorage.getItem('ujk.pkce');
    clean(next);
    if (!verifier) throw new ApiError('Proses login terputus. Silakan ulangi.');
    const d = await req('/auth/v1/token?grant_type=pkce', { body: { auth_code: code, code_verifier: verifier }, isAuth: true });
    sessionStorage.removeItem('ujk.pkce');
    setSession(d);
    return next;
  }
  if (location.hash.includes('access_token=')) {
    const h = new URLSearchParams(location.hash.slice(1));
    setSession({ access_token: h.get('access_token'), refresh_token: h.get('refresh_token'), expires_at: +h.get('expires_at') || 0, expires_in: +h.get('expires_in') || 3600 });
    clean(next);
    return next;
  }
  return null;
}

export async function signOut() {
  const tok = auth?.access_token;
  setSession(null);
  if (tok) req('/auth/v1/logout', { token: tok, isAuth: true }).catch(() => {});
}

// ---------------- Storage ----------------
export const publicUrl = (bucket, path) => `${BASE}/storage/v1/object/public/${bucket}/${path}`;

export async function upload(bucket, path, blob, contentType) {
  const token = await accessToken();
  let res;
  try {
    res = await fetch(`${BASE}/storage/v1/object/${bucket}/${path}`, {
      method: 'POST',
      headers: { apikey: KEY, ...(token ? { Authorization: 'Bearer ' + token } : {}), 'Content-Type': contentType || blob.type || 'application/octet-stream', 'x-upsert': 'false', 'cache-control': 'max-age=31536000' },
      body: blob,
    });
  } catch { throw new ApiError('Unggah gagal. Periksa koneksi internet.', { code: 'network' }); }
  if (!res.ok) {
    let m = 'Unggah berkas gagal.';
    try { const j = await res.json(); m = j.message || j.error || m; } catch {}
    throw new ApiError(m, { status: res.status });
  }
  return { path, url: publicUrl(bucket, path) };
}

export async function signedUrl(bucket, path, expiresIn = 900) {
  const token = await accessToken();
  const d = await req(`/storage/v1/object/sign/${bucket}/${path}`, { body: { expiresIn }, token });
  const u = d.signedURL || d.signedUrl;
  return u.startsWith('http') ? u : `${BASE}/storage/v1${u.startsWith('/') ? '' : '/'}${u}`;
}

// ---------------- Peserta (token sesi sendiri, bukan Supabase Auth) ----------------
const LS_P = 'ujk.peserta.v1';
export const peserta = {
  get: () => readJSON(localStorage, LS_P),
  set: (d) => localStorage.setItem(LS_P, JSON.stringify(d)),
  clear: () => localStorage.removeItem(LS_P),
  token: () => readJSON(localStorage, LS_P)?.token,
};
export function deviceId() {
  let d = localStorage.getItem('ujk.device');
  if (!d) { d = 'dev-' + randomId(12); localStorage.setItem('ujk.device', d); }
  return d;
}
export const prpc = (fn, args = {}) => rpc(fn, { token: peserta.token(), ...args }, { anon: true });
