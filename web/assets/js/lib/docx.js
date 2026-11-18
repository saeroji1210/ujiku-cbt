// Pengurai soal pilihan ganda dari Microsoft Word (.docx) — berjalan penuh di browser.
// Format yang dikenali (lihat templat):
//   1. Teks soal …            ← nomor soal (atau daftar bernomor Word)
//   A. opsi … s.d. E./F.       ← opsi (boleh diawali * untuk menandai kunci)
//   Kunci: B                   ← kunci jawaban
//   Tingkat: Sedang | Bobot: 2 | Pembahasan: …   ← opsional
import { readZip } from './zip.js';

const W = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
const R = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
const A = 'http://schemas.openxmlformats.org/drawingml/2006/main';
const MML = 'http://schemas.openxmlformats.org/officeDocument/2006/math';
const VML = 'urn:schemas-microsoft-com:vml';
const escH = (s) => s.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
const LET = ['A', 'B', 'C', 'D', 'E', 'F'];

export async function parseDocx(file) {
  const z = await readZip(file);
  const xml = await z.text('word/document.xml');
  if (!xml) throw new Error('Berkas bukan dokumen Word (.docx) yang valid.');
  const doc = new DOMParser().parseFromString(xml, 'application/xml');
  const relsXml = await z.text('word/_rels/document.xml.rels');
  const rels = {};
  if (relsXml) for (const r of new DOMParser().parseFromString(relsXml, 'application/xml').getElementsByTagName('Relationship')) rels[r.getAttribute('Id')] = r.getAttribute('Target');

  const media = new Map(); // path → Uint8Array
  const imgTag = async (rid) => {
    const t = rels[rid]; if (!t) return '';
    const path = 'word/' + t.replace(/^\/?word\//, '').replace(/^\.\//, '');
    if (!media.has(path)) { const b = await z.bytes(path); if (!b) return ''; media.set(path, b); }
    return `<img data-media="${path}" alt="">`;
  };

  // Ubah satu paragraf menjadi { html, text, list }
  async function para(p) {
    let out = '', text = '';
    const walk = async (node) => {
      for (const ch of Array.from(node.childNodes)) {
        if (ch.nodeType !== 1) continue;
        const ln = ch.localName, ns = ch.namespaceURI;
        if (ns === W && ln === 'r') {
          const rPr = ch.getElementsByTagNameNS(W, 'rPr')[0];
          const has = (n) => { const e = rPr && rPr.getElementsByTagNameNS(W, n)[0]; return e && e.getAttributeNS(W, 'val') !== '0' && e.getAttributeNS(W, 'val') !== 'false'; };
          const va = rPr && rPr.getElementsByTagNameNS(W, 'vertAlign')[0]?.getAttributeNS(W, 'val');
          let seg = '';
          for (const rc of Array.from(ch.childNodes)) {
            if (rc.nodeType !== 1) continue;
            if (rc.localName === 't') { seg += escH(rc.textContent); text += rc.textContent; }
            else if (rc.localName === 'tab') { seg += ' '; text += ' '; }
            else if (rc.localName === 'br') { seg += '<br>'; text += '\n'; }
            else if (rc.localName === 'drawing') { for (const b of rc.getElementsByTagNameNS(A, 'blip')) seg += await imgTag(b.getAttributeNS(R, 'embed')); }
            else if (rc.localName === 'pict' || rc.localName === 'object') { for (const im of rc.getElementsByTagNameNS(VML, 'imagedata')) seg += await imgTag(im.getAttributeNS(R, 'id')); }
          }
          if (!seg) continue;
          if (va === 'superscript') seg = `<sup>${seg}</sup>`; else if (va === 'subscript') seg = `<sub>${seg}</sub>`;
          if (has('u')) seg = `<u>${seg}</u>`;
          if (has('i')) seg = `<i>${seg}</i>`;
          if (has('b')) seg = `<b>${seg}</b>`;
          out += seg;
        } else if (ns === MML && (ln === 'oMath' || ln === 'oMathPara')) {
          const t = Array.from(ch.getElementsByTagNameNS(MML, 't')).map((x) => x.textContent).join('');
          out += escH(t); text += t;
        } else if (ns === W && (ln === 'hyperlink' || ln === 'smartTag' || ln === 'ins' || ln === 'sdt' || ln === 'sdtContent')) {
          await walk(ch);
        }
      }
    };
    await walk(p);
    const numPr = p.getElementsByTagNameNS(W, 'numPr')[0];
    const lvl = numPr ? +(numPr.getElementsByTagNameNS(W, 'ilvl')[0]?.getAttributeNS(W, 'val') || 0) : -1;
    return { html: out.replace(/^(\s|&nbsp;)+|(\s|<br>)+$/g, ''), text: text.trim(), list: lvl };
  }

  const body = doc.getElementsByTagNameNS(W, 'body')[0];
  const paras = Array.from(body.getElementsByTagNameNS(W, 'p'));
  const items = [];
  let q = null, mode = 'teks';
  const stripLead = (h, re) => {
    // hapus awalan "1." / "A." dari HTML dengan mencocokkan teks polos
    const m = h.match(re); return m ? h.slice(m[0].length) : h;
  };
  const newQ = (htmlText) => { q = { teks: htmlText, opsi: [], kunci: null, tingkat: 'sedang', bobot: 1, pembahasan: '' }; items.push(q); mode = 'teks'; };

  for (const p of paras) {
    const { html: h, text: t, list } = await para(p);
    if (!t && !/<img/.test(h)) continue;
    let m;
    if ((m = t.match(/^(kunci(\s*jawaban)?|jawaban|answer|key)\s*[:=]\s*\(?([A-Fa-f])\)?\b/i))) { if (q) q.kunci = m[3].toUpperCase(); mode = 'meta'; continue; }
    if ((m = t.match(/^tingkat(\s*kesukaran)?\s*[:=]\s*(mudah|sedang|sukar|sulit)/i))) { if (q) q.tingkat = m[2].toLowerCase() === 'sulit' ? 'sukar' : m[2].toLowerCase(); continue; }
    if ((m = t.match(/^bobot\s*[:=]\s*([\d.,]+)/i))) { if (q) q.bobot = Number(m[1].replace(',', '.')) || 1; continue; }
    if ((m = t.match(/^pembahasan\s*[:=]\s*(.*)$/is))) { if (q) { q.pembahasan = m[1].trim(); mode = 'bahas'; } continue; }
    if ((m = t.match(/^\s*(\d{1,3})\s*[.)]\s*/))) {
      newQ(stripLead(h, /^(\s|<[^>]+>)*\d{1,3}\s*[.)]\s*/)); continue;
    }
    if ((m = t.match(/^\s*(\*)?\s*([A-Fa-f])\s*[.)]\s+/)) && q && (mode === 'teks' || mode === 'opsi') && m[2].toUpperCase() === LET[q.opsi.length]) {
      const k = m[2].toUpperCase();
      let oh = stripLead(h, /^(\s|<[^>]+>)*\*?\s*[A-Fa-f]\s*[.)]\s+/);
      if (m[1] || /\*\s*$/.test(t)) { q.kunci = k; oh = oh.replace(/\*\s*$/, ''); }
      q.opsi.push({ k, t: oh.trim() }); mode = 'opsi'; continue;
    }
    if (list >= 0) {
      // daftar bernomor otomatis Word
      if (!q || mode === 'meta' || mode === 'bahas' || (list === 0 && q.opsi.length >= 2)) { newQ(h); continue; }
      if (q.opsi.length < 6 && (list > 0 || mode === 'opsi' || (stripLeadText(q.teks) && mode === 'teks'))) { q.opsi.push({ k: LET[q.opsi.length], t: h }); mode = 'opsi'; continue; }
    }
    if (!q) continue; // teks pengantar sebelum soal pertama
    if (mode === 'teks') q.teks += (q.teks ? '<br>' : '') + h;
    else if (mode === 'opsi' && q.opsi.length) q.opsi[q.opsi.length - 1].t += '<br>' + h;
    else if (mode === 'bahas') q.pembahasan += '\n' + t;
  }
  return { items, media };
}
function stripLeadText(h) { return String(h || '').replace(/<[^>]+>/g, '').trim(); }

export function itemProblem(q) {
  const plain = (h) => String(h || '').replace(/<img[^>]*>/gi, 'IMG').replace(/<[^>]+>/g, '').trim();
  if (!plain(q.teks)) return 'Teks soal kosong';
  if (q.opsi.filter((o) => plain(o.t)).length < 2) return 'Opsi kurang dari 2';
  if (!q.kunci) return 'Kunci tidak ditemukan';
  if (!q.opsi.some((o) => o.k === q.kunci)) return 'Kunci tidak ada di opsi';
  return null;
}
