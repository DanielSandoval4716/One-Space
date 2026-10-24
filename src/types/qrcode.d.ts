// Tipos mínimos de la parte de "qrcode" que usamos (la librería no los trae para esta ruta).
declare module "qrcode/lib/core/qrcode" {
  const QRCodeCore: {
    create(
      texto: string,
      opciones?: { errorCorrectionLevel?: "L" | "M" | "Q" | "H" }
    ): { modules: { size: number; get(fila: number, columna: number): number | boolean } };
  };
  export default QRCodeCore;
}
