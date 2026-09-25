import QRCode from 'qrcode';

// Renders a QR code as a self-contained inline SVG string — used for the downloadable
// ticket PDF (expo-print renders arbitrary HTML, including inline <svg>, so this avoids
// needing to rasterize a QR component to a data URI first).
export function qrCodeSvg(value: string, size = 180): string {
  const { modules } = QRCode.create(value, { errorCorrectionLevel: 'M' });
  const count = modules.size;
  const cellSize = size / count;
  let rects = '';
  for (let row = 0; row < count; row++) {
    for (let col = 0; col < count; col++) {
      if (modules.get(row, col)) {
        rects += `<rect x="${(col * cellSize).toFixed(2)}" y="${(row * cellSize).toFixed(2)}" width="${cellSize.toFixed(2)}" height="${cellSize.toFixed(2)}" fill="#000"/>`;
      }
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"><rect width="${size}" height="${size}" fill="#fff"/>${rects}</svg>`;
}
