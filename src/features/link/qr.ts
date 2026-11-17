import qrcode from "qrcode-generator";

/** Los módulos de un código QR (true = oscuro) para un texto. Módulo puro. */
export function qrMatrix(text: string): boolean[][] {
  const qr = qrcode(0, "M");
  qr.addData(text, "Byte");
  qr.make();
  const size = qr.getModuleCount();
  return Array.from({ length: size }, (_, row) =>
    Array.from({ length: size }, (_, column) => qr.isDark(row, column)),
  );
}

/**
 * El QR como un solo trazo SVG. `size` es el lado en módulos, ya con el margen
 * claro que los lectores necesitan alrededor.
 */
export function qrPath(matrix: boolean[][], margin = 4): { size: number; d: string } {
  const parts: string[] = [];
  matrix.forEach((row, y) => {
    let start = -1;
    for (let x = 0; x <= row.length; x++) {
      const dark = x < row.length && row[x];
      if (dark && start < 0) start = x;
      if (!dark && start >= 0) {
        parts.push(`M${start + margin} ${y + margin}h${x - start}v1h-${x - start}z`);
        start = -1;
      }
    }
  });
  return { size: matrix.length + margin * 2, d: parts.join("") };
}
