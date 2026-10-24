import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { qrComoSvg } from "@/qrSvg";

// Evita que un nombre con símbolos rompa el HTML del PDF.
const escapar = (t: string) =>
  t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

// Genera un PDF con el QR del producto y abre el menú de compartir (WhatsApp, correo, Drive, imprimir...).
// Devuelve un mensaje de error, o null si todo salió bien.
export async function compartirQREnPDF(codigo: string, nombre: string, detalle?: string): Promise<string | null> {
  try {
    const html = `
      <html>
        <head>
          <meta charset="utf-8" />
          <style>
            body { font-family: Arial, Helvetica, sans-serif; text-align: center; padding: 40px; }
            h1 { font-size: 28px; margin: 0 0 6px; }
            .detalle { font-size: 16px; color: #555; margin: 0 0 24px; }
            .qr svg { width: 9cm; height: 9cm; }
            .codigo { font-size: 10px; color: #777; margin-top: 16px; word-break: break-all; }
          </style>
        </head>
        <body>
          <h1>${escapar(nombre)}</h1>
          ${detalle ? `<p class="detalle">${escapar(detalle)}</p>` : ""}
          <div class="qr">${qrComoSvg(codigo)}</div>
          <p class="codigo">${escapar(codigo)}</p>
        </body>
      </html>`;

    const { uri } = await Print.printToFileAsync({ html });

    if (!(await Sharing.isAvailableAsync())) {
      return "Este dispositivo no permite compartir archivos.";
    }
    await Sharing.shareAsync(uri, {
      mimeType: "application/pdf",
      UTI: "com.adobe.pdf",
      dialogTitle: "Compartir o imprimir QR",
    });
    return null;
  } catch (e) {
    console.log(e);
    return "No se pudo crear el PDF. Inténtalo de nuevo.";
  }
}
