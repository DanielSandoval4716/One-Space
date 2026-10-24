import { obtenerProductosOpcion } from "@/opcionesInventario";
import { supabase } from "@/supabase";

// Modelo gratuito de Gemini. Si Google lo cambia, solo hay que modificar esta línea.
const MODELO = "gemini-3.1-flash-lite";
const URL_API = `https://generativelanguage.googleapis.com/v1beta/models/${MODELO}:generateContent`;

// OJO: una clave EXPO_PUBLIC_ queda dentro de la app y puede extraerse.
// Sirve para probar; en producción conviene llamar a Gemini desde una Edge Function de Supabase.
// Se limpian espacios y comillas por si quedaron en el archivo .env.
const API_KEY = (process.env.EXPO_PUBLIC_GEMINI_API_KEY ?? "").trim().replace(/^["']|["']$/g, "");

export type Mensaje = { rol: "usuario" | "asistente"; texto: string };

// Resumen del inventario que se le entrega al modelo en cada pregunta.
async function resumenInventario(): Promise<string> {
  const [productos, { data: minimos }] = await Promise.all([
    obtenerProductosOpcion(),
    supabase.from("productos").select("id, stock_minimo").eq("activo", true),
  ]);
  const minimo = new Map((minimos ?? []).map((p: any) => [p.id as string, Number(p.stock_minimo) || 0]));

  if (productos.length === 0) return "No hay productos registrados.";

  return productos
    .slice(0, 300)
    .map((p) => {
      const min = minimo.get(p.id) ?? 0;
      const bajo = min > 0 && p.total < min ? " [STOCK BAJO]" : "";
      return `- ${p.nombre} (${p.tipo}): total ${p.total} ${p.unidad}, reservado ${p.reservado}, disponible ${p.disponible}, mínimo ${min}${bajo}`;
    })
    .join("\n");
}

// Envía la pregunta (con el historial reciente) a Gemini y devuelve la respuesta en texto.
// Lanza un Error con un mensaje legible si algo falla.
export async function preguntarAsistente(pregunta: string, historial: Mensaje[]): Promise<string> {
  if (!API_KEY) {
    throw new Error("Falta la clave de Gemini. Agrega EXPO_PUBLIC_GEMINI_API_KEY en el archivo .env y reinicia la app.");
  }

  const inventario = await resumenInventario();
  const instrucciones =
    "Eres el asistente de una app de inventario. Responde siempre en español, de forma breve y clara. " +
    "Usa únicamente los datos del inventario que aparecen abajo; si la respuesta no está en esos datos, dilo. " +
    "Solo puedes consultar información: no puedes registrar ni modificar nada.\n\n" +
    "INVENTARIO ACTUAL:\n" +
    inventario;

  const contents = [...historial.slice(-10), { rol: "usuario" as const, texto: pregunta }].map((m) => ({
    role: m.rol === "usuario" ? "user" : "model",
    parts: [{ text: m.texto }],
  }));

  let respuesta: Response;
  try {
    // La clave va en la URL (igual que la prueba en el navegador).
    respuesta = await fetch(`${URL_API}?key=${encodeURIComponent(API_KEY)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: instrucciones }] },
        contents,
      }),
    });
  } catch {
    throw new Error("No hay conexión con el asistente. Revisa tu internet.");
  }

  if (!respuesta.ok) {
    // Google explica el motivo en el cuerpo de la respuesta; se muestra para poder diagnosticar.
    let motivo = "";
    try {
      motivo = String((await respuesta.json())?.error?.message ?? "").slice(0, 200);
    } catch {}

    let causa = "El asistente no pudo responder.";
    if (respuesta.status === 401) causa = "Gemini no aceptó la clave. Revisa que esté completa, sin comillas ni espacios.";
    else if (respuesta.status === 400 || respuesta.status === 403) causa = "Gemini rechazó la petición. Revisa que la clave sea válida.";
    else if (respuesta.status === 404) causa = `El modelo ${MODELO} no está disponible para tu clave.`;
    else if (respuesta.status === 429) causa = "Se alcanzó el límite gratuito de Gemini. Espera un minuto e inténtalo de nuevo.";

    throw new Error(`${causa} (error ${respuesta.status}${motivo ? ": " + motivo : ""})`);
  }

  const datos = await respuesta.json();
  const texto = (datos?.candidates?.[0]?.content?.parts ?? [])
    .map((p: { text?: string }) => p.text ?? "")
    .join("")
    .trim();
  if (!texto) throw new Error("El asistente no devolvió una respuesta. Intenta reformular la pregunta.");
  return texto;
}
