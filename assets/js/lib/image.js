// Kompres gambar di browser sebelum diunggah (hemat kuota & cepat dimuat peserta)
export async function compressImage(file, max = 1200, quality = 0.82) {
  if (!/^image\//.test(file.type)) throw new Error('Berkas bukan gambar.');
  if (file.type === 'image/svg+xml' || file.type === 'image/gif') return { blob: file, ext: file.type === 'image/gif' ? 'gif' : 'svg', type: file.type };
  const bmp = await createImageBitmap(file).catch(() => null);
  if (!bmp) return { blob: file, ext: (file.type.split('/')[1] || 'png'), type: file.type };
  const scale = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const w = Math.round(bmp.width * scale), h = Math.round(bmp.height * scale);
  const cv = document.createElement('canvas');
  cv.width = w; cv.height = h;
  const g = cv.getContext('2d');
  g.fillStyle = '#fff'; g.fillRect(0, 0, w, h);
  g.drawImage(bmp, 0, 0, w, h);
  const toBlob = (type) => new Promise((r) => cv.toBlob(r, type, quality));
  let blob = await toBlob('image/webp');
  let type = 'image/webp', ext = 'webp';
  if (!blob || blob.type !== 'image/webp') { blob = await toBlob('image/jpeg'); type = 'image/jpeg'; ext = 'jpg'; }
  if (blob.size > file.size && scale === 1) return { blob: file, ext: file.type.split('/')[1] || 'png', type: file.type };
  return { blob, ext, type };
}
