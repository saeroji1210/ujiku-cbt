// Konversi rumus Word (OMML, "Insert Equation") dan simbol font Symbol → HTML sederhana yang aman.
// Hasil memakai Unicode + <sup>/<sub> + beberapa <span class="m-…"> (kelas ini diizinkan oleh sanitize()).
const MML = 'http://schemas.openxmlformats.org/officeDocument/2006/math';
const esc = (s) => String(s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
const kids = (n) => Array.from(n.childNodes).filter((c) => c.nodeType === 1 && c.namespaceURI === MML);
const kid = (n, name) => kids(n).find((c) => c.localName === name);
const val = (n, name, def) => { const e = n && kid(n, name); if (!e) return def; const v = e.getAttributeNS(MML, 'val') ?? e.getAttribute('m:val'); return v == null ? def : v; };
const prop = (n, pr, name, def) => { const p = kid(n, pr); return p ? val(p, name, def) : def; };

export const MATH_CLASSES = new Set(['m-f', 'm-n', 'm-d', 'm-rad', 'm-rb', 'm-ov', 'm-un', 'm-mx', 'm-big', 'm-lim', 'm-box', 'm-fn']);

// Operator besar (∑ ∫ ∏ …): bila Word tidak mengisi chr, bawaannya ∫
const NARY = { '': '∫', '∑': '∑', '∏': '∏', '∫': '∫', '∬': '∬', '∭': '∭', '∮': '∮', '⋃': '⋃', '⋂': '⋂' };
const ACC = { '': '̂', '^': '̂', '~': '̃', '¯': '̄', '˙': '̇', '¨': '̈', '→': '⃗', '⃗': '⃗', 'ˇ': '̌', '´': '́', '`': '̀' };

function run(r) {
  const t = Array.from(r.childNodes).filter((c) => c.nodeType === 1 && c.localName === 't').map((x) => x.textContent).join('');
  // Pasang spasi tipis di sekitar operator relasi agar enak dibaca
  return esc(t);
}
function seq(n) { return kids(n).map(node).join(''); }
function arg(n, name) { const e = kid(n, name); return e ? seq(e) : ''; }
const wrapIf = (h) => (/^[\p{L}\p{N}.,]+$/u.test(h.replace(/<[^>]+>/g, '')) || /^<(sup|sub)>/.test(h) ? h : '(' + h + ')');

function node(n) {
  switch (n.localName) {
    case 'r': return run(n);
    case 'f': {
      const type = prop(n, 'fPr', 'type', 'bar');
      const a = arg(n, 'num'), b = arg(n, 'den');
      if (type === 'lin' || type === 'skw') return `${wrapIf(a)}/${wrapIf(b)}`;
      return `<span class="m-f"><span class="m-n">${a}</span><span class="m-n m-d">${b}</span></span>`;
    }
    case 'sSup': return `${arg(n, 'e')}<sup>${arg(n, 'sup')}</sup>`;
    case 'sSub': return `${arg(n, 'e')}<sub>${arg(n, 'sub')}</sub>`;
    case 'sSubSup': return `${arg(n, 'e')}<sub>${arg(n, 'sub')}</sub><sup>${arg(n, 'sup')}</sup>`;
    case 'sPre': return `<sub>${arg(n, 'sub')}</sub><sup>${arg(n, 'sup')}</sup>${arg(n, 'e')}`;
    case 'rad': {
      const hide = prop(n, 'radPr', 'degHide', '0');
      const deg = arg(n, 'deg');
      const d = hide !== '1' && hide !== 'true' && deg ? `<sup>${deg}</sup>` : '';
      return `${d}<span class="m-rad">√<span class="m-rb">${arg(n, 'e')}</span></span>`;
    }
    case 'nary': {
      const chr = prop(n, 'naryPr', 'chr', '');
      const op = NARY[chr] || chr || '∫';
      const subH = prop(n, 'naryPr', 'subHide', '0'), supH = prop(n, 'naryPr', 'supHide', '0');
      const lo = subH === '1' || subH === 'true' ? '' : arg(n, 'sub'), up = supH === '1' || supH === 'true' ? '' : arg(n, 'sup');
      const stack = op !== '∫' && !/[∫∬∭∮]/.test(op) && (lo || up) && prop(n, 'naryPr', 'limLoc', 'undOvr') === 'undOvr';
      const lim = stack ? `<span class="m-lim"><span class="m-n">${up || '&nbsp;'}</span><span class="m-n m-big">${op}</span><span class="m-n">${lo || '&nbsp;'}</span></span>`
        : `${op}${lo ? `<sub>${lo}</sub>` : ''}${up ? `<sup>${up}</sup>` : ''}`;
      return `${lim} ${arg(n, 'e')}`;
    }
    case 'd': {
      const beg = prop(n, 'dPr', 'begChr', '('), end = prop(n, 'dPr', 'endChr', ')'), sep = prop(n, 'dPr', 'sepChr', '|');
      const es = kids(n).filter((c) => c.localName === 'e').map(seq);
      return esc(beg) + es.join(esc(sep)) + esc(end);
    }
    case 'func': return `<span class="m-fn">${arg(n, 'fName')}</span>${arg(n, 'e')}`;
    case 'limLow': return `${arg(n, 'e')}<sub>${arg(n, 'lim')}</sub>`;
    case 'limUpp': return `${arg(n, 'e')}<sup>${arg(n, 'lim')}</sup>`;
    case 'bar': return (prop(n, 'barPr', 'pos', 'top') === 'bot' ? `<span class="m-un">${arg(n, 'e')}</span>` : `<span class="m-ov">${arg(n, 'e')}</span>`);
    case 'acc': {
      const chr = prop(n, 'accPr', 'chr', '');
      const c = ACC[chr] ?? chr;
      if (c === '̄') return `<span class="m-ov">${arg(n, 'e')}</span>`;
      return arg(n, 'e') + c;
    }
    case 'groupChr': return `<span class="m-${prop(n, 'groupChrPr', 'pos', 'bot') === 'top' ? 'ov' : 'un'}">${arg(n, 'e')}</span>`;
    case 'borderBox': return `<span class="m-box">${arg(n, 'e')}</span>`;
    case 'eqArr': return kids(n).filter((c) => c.localName === 'e').map(seq).join('<br>');
    case 'm': {
      const rows = kids(n).filter((c) => c.localName === 'mr').map((r) => '<tr>' + kids(r).filter((c) => c.localName === 'e').map((c) => `<td>${seq(c)}</td>`).join('') + '</tr>');
      return `<span class="m-mx"><table><tbody>${rows.join('')}</tbody></table></span>`;
    }
    case 'box': case 'phant': case 'e': case 'num': case 'den': case 'sup': case 'sub': case 'deg': case 'lim': case 'fName': return seq(n);
    case 'oMath': return seq(n);
    case 'oMathPara': return kids(n).filter((c) => c.localName === 'oMath').map(seq).join('<br>');
    default: return /Pr$/.test(n.localName) ? '' : seq(n);
  }
}
export const ommlToHtml = (n) => node(n);

// ---- Karakter font Symbol (w:sym) → Unicode ----
const SYM = {};
const put = (s, from) => { Array.from(s).forEach((ch, i) => { SYM[from + i] = ch; }); };
put('ΑΒΧΔΕΦΓΗΙϑΚΛΜΝΟΠΘΡΣΤΥςΩΞΨΖ', 0x41);
put('αβχδεφγηιϕκλμνοπθρστυϖωξψζ', 0x61);
Object.assign(SYM, { 0x22: '∀', 0x24: '∃', 0x27: '∋', 0x2D: '−', 0x40: '≅', 0x5C: '∴', 0x5E: '⊥', 0x7E: '∼',
  0xA2: '′', 0xA3: '≤', 0xA4: '⁄', 0xA5: '∞', 0xA7: '♣', 0xA8: '♦', 0xA9: '♥', 0xAA: '♠', 0xAB: '↔', 0xAC: '←', 0xAD: '↑', 0xAE: '→', 0xAF: '↓',
  0xB0: '°', 0xB1: '±', 0xB2: '″', 0xB3: '≥', 0xB4: '×', 0xB5: '∝', 0xB6: '∂', 0xB7: '•', 0xB8: '÷', 0xB9: '≠', 0xBA: '≡', 0xBB: '≈', 0xBC: '…',
  0xC0: 'ℵ', 0xC5: '⊗', 0xC6: '∅', 0xC7: '∩', 0xC8: '∪', 0xC9: '⊃', 0xCA: '⊇', 0xCB: '⊄', 0xCC: '⊂', 0xCD: '⊆', 0xCE: '∈', 0xCF: '∉',
  0xD0: '∠', 0xD1: '∇', 0xD5: '∏', 0xD6: '√', 0xD7: '⋅', 0xD8: '¬', 0xD9: '∧', 0xDA: '∨', 0xDB: '⇔', 0xDC: '⇐', 0xDD: '⇑', 0xDE: '⇒', 0xDF: '⇓',
  0xE5: '∑', 0xF2: '∫' });
export function symChar(font, hex) {
  const code = parseInt(hex, 16); if (!code) return '';
  const lo = code & 0xFF;
  if (/symbol/i.test(font || '')) return SYM[lo] || '';
  if (/wingdings|webdings/i.test(font || '')) return '';
  return code >= 0xF000 ? String.fromCharCode(lo) : String.fromCharCode(code);
}
