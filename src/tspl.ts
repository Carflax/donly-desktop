/**
 * Generates TSPL commands for a monochrome bitmap.
 * @param bitmap Uint8Array of 1-bit monochrome data (0=black, 1=white typically for TSPL)
 * @param width Width in pixels
 * @param height Height in pixels
 * @param labelWidthmm Width of the label in mm
 * @param labelHeightmm Height of the label in mm
 * @param copies Number of copies
 */
export function generateTSPL(
  bitmap: Uint8Array,
  width: number,
  height: number,
  labelWidthmm: number,
  labelHeightmm: number,
  copies: number = 1,
  offsetX: number = 0,
  offsetY: number = 0
): Uint8Array {
  const HEADER = `SIZE ${labelWidthmm} mm, ${labelHeightmm} mm\r\nGAP 3 mm, 0 mm\r\nDIRECTION 1,0\r\nCLS\r\nREFERENCE ${offsetX},${offsetY}\r\n`;
  const FOOTER = `\r\nPRINT 1,${copies}\r\n`;

  const rowBytes = Math.floor((width + 7) / 8);
  const bitmapCommand = `BITMAP 0,0,${rowBytes},${height},0,`;

  const encoder = new TextEncoder();
  const headerBytes = encoder.encode(HEADER);
  const cmdBytes = encoder.encode(bitmapCommand);
  const footerBytes = encoder.encode(FOOTER);

  // Buffer total
  const totalLength = headerBytes.length + cmdBytes.length + bitmap.length + footerBytes.length;
  const combined = new Uint8Array(totalLength);

  let offset = 0;
  combined.set(headerBytes, offset);
  offset += headerBytes.length;
  combined.set(cmdBytes, offset);
  offset += cmdBytes.length;
  combined.set(bitmap, offset);
  offset += bitmap.length;
  combined.set(footerBytes, offset);

  return combined;
}

/**
 * Converts Canvas image data to 1-bit monochrome bitmap for TSPL.
 * TSPL BITMAP expects 1=black, 0=white (wait, in Python it was XORed?)
 * Actually, TSPL BITMAP 0 = white, 1 = black usually.
 * My Python code said: # TSPL BITMAP: 1=preto, 0=branco — inverte com XOR
 */
export function canvasToMonoBitmap(ctx: CanvasRenderingContext2D, width: number, height: number): Uint8Array {
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;
  const rowBytes = Math.floor((width + 7) / 8);
  const bitmap = new Uint8Array(rowBytes * height);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const gray = (r + g + b) / 3;
      
      // TSPL BITMAP: 1 = white, 0 = black (inverted from intuition)
      // So we set bit 1 for LIGHT pixels (background), leave 0 for DARK pixels (text/elements)
      if (gray >= 180) {
        const index = y * rowBytes + Math.floor(x / 8);
        const bit = 7 - (x % 8); // Bits are MSB first in TSPL
        bitmap[index] |= (1 << bit);
      }
    }
  }

  return bitmap;
}
