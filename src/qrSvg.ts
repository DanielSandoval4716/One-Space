import QRCodeCore from "qrcode/lib/core/qrcode";

// Dibuja un código QR como imagen vectorial (SVG): se ve nítido a cualquier tamaño al imprimir.
// Es la misma librería que usa react-native-qrcode-svg para mostrarlo en pantalla.
export function qrComoSvg(texto: string): string {
  const qr = QRCodeCore.create(texto, { errorCorrectionLevel: "M" });
  const n = qr.modules.size;
  const margen = 4; // zona blanca alrededor, necesaria para que el lector lo detecte

  // Une los cuadros negros contiguos de cada fila en un solo trazo.
  let trazo = "";
  for (let fila = 0; fila < n; fila++) {
    let col = 0;
    while (col < n) {
      if (!qr.modules.get(fila, col)) {
        col++;
        continue;
      }
      let largo = 0;
      while (col + largo < n && qr.modules.get(fila, col + largo)) largo++;
      trazo += `M${col + margen} ${fila + margen}h${largo}v1h-${largo}z`;
      col += largo;
    }
  }

  const lado = n + margen * 2;
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${lado} ${lado}" shape-rendering="crispEdges">` +
    `<rect width="${lado}" height="${lado}" fill="#fff"/><path d="${trazo}" fill="#000"/></svg>`
  );
}
