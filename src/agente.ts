import { analisisEstadistico, elasticidades } from "@/analisis";
import { obtenerExistencias } from "@/existencias";
import { formatearPrecio } from "@/precios";
import { supabase } from "@/supabase";

// Gemini (modelo gratuito). Si Google lo cambia, solo hay que modificar MODELO.
const MODELO = "gemini-3.1-flash-lite";
const URL_API = `https://generativelanguage.googleapis.com/v1beta/models/${MODELO}:generateContent`;
// Se limpian espacios y comillas por si quedaron en el archivo .env.
const API_KEY = (process.env.EXPO_PUBLIC_GEMINI_API_KEY ?? "").trim().replace(/^["']|["']$/g, "");

const MAX_MOVIMIENTOS = 1000;
const MAX_DETALLE = 150;

export type Mensaje = { role: "user" | "assistant"; content: string };

type Fila = {
  fecha: string;
  tipo: string;
  cantidad: number;
  producto_id: string;
  observaciones: string | null;
  ubicacion_origen_id: number | null;
  ubicacion_destino_id: number | null;
  productos: { modelo: string; marcas: { nombre: string } | null } | null;
  motivos: { nombre: string } | null;
  proveedores: { nombre: string } | null;
  personas: { nombre: string } | null;
};

function clasificar(m: Fila) {
  if (m.tipo !== "ajuste") return m.tipo;
  return m.ubicacion_origen_id ? "ajuste (faltante)" : "ajuste (sobrante)";
}
export async function construirContexto(dias: number): Promise<string> {
  const desde = new Date(Date.now() - dias * 86400000).toISOString();

  const [existencias, precios, movs, reservas, pendientes, historial] = await Promise.all([
    obtenerExistencias(),
    supabase.from("productos").select("id, precio").eq("activo", true),
    supabase
      .from("movimientos")
      .select(
        "fecha, tipo, cantidad, producto_id, observaciones, ubicacion_origen_id, ubicacion_destino_id, " +
          "productos(modelo, marcas(nombre)), motivos(nombre), proveedores(nombre), personas(nombre)",
      )
      .gte("fecha", desde)
      .order("fecha", { ascending: false })
      .limit(MAX_MOVIMIENTOS),
    supabase
      .from("reservas")
      .select("cantidad, motivo, productos(modelo, marcas(nombre))")
      .eq("estado", "activa"),
    supabase
      .from("solicitudes_ajuste")
      .select("*", { count: "exact", head: true })
      .eq("estado", "pendiente"),
    // Historial de cambios de precio (para la elasticidad). Si la tabla no existe, devuelve error.
    supabase
      .from("historial_precios")
      .select("producto_id, precio, cambiado_en")
      .order("cambiado_en", { ascending: true }),
  ]);

  const precio = new Map<string, number>();
  for (const p of (precios.data ?? []) as {
    id: string;
    precio: number | null;
  }[]) {
    if (p.precio !== null) precio.set(p.id, Number(p.precio));
  }

  //Inventario actual
  let valorTotal = 0;
  let sinPrecio = 0;
  const lineasProductos = (existencias ?? []).map((p) => {
    const pr = precio.get(p.id);
    if (pr === undefined) sinPrecio++;
    else valorTotal += pr * p.total;
    const lugares =
      p.ubicaciones.map((u) => `${u.lugar}=${u.cantidad}`).join("; ") ||
      "sin existencias";
    return `- ${p.nombre} | ${p.tipo} | ${p.total} ${p.unidad}${p.stockBajo ? " | STOCK BAJO" : ""} | precio ${
      pr === undefined ? "sin precio" : formatearPrecio(pr)
    } | ${lugares}`;
  });

  const filas = (movs.data ?? []) as unknown as Fila[];
  const porTipo = new Map<
    string,
    { n: number; unidades: number; valor: number }
  >();
  const porMotivo = new Map<string, number>();
  const porProducto = new Map<
    string,
    { nombre: string; entradas: number; salidas: number }
  >();

  for (const m of filas) {
    const tipo = clasificar(m);
    const cant = Number(m.cantidad);
    const t = porTipo.get(tipo) ?? { n: 0, unidades: 0, valor: 0 };
    t.n++;
    t.unidades += cant;
    t.valor += cant * (precio.get(m.producto_id) ?? 0);
    porTipo.set(tipo, t);

    const motivo = m.motivos?.nombre ?? "sin motivo";
    porMotivo.set(
      `${tipo}: ${motivo}`,
      (porMotivo.get(`${tipo}: ${motivo}`) ?? 0) + 1,
    );

    const nombre =
      `${m.productos?.marcas?.nombre ?? ""} ${m.productos?.modelo ?? ""}`.trim();
    const p = porProducto.get(m.producto_id) ?? {
      nombre,
      entradas: 0,
      salidas: 0,
    };
    if (m.tipo === "entrada") p.entradas += cant;
    if (m.tipo === "salida") p.salidas += cant;
    porProducto.set(m.producto_id, p);
  }

  const resumenTipos = [...porTipo.entries()].map(
    ([tipo, t]) =>
      `- ${tipo}: ${t.n} movimientos, ${t.unidades} unidades, valor aprox. ${formatearPrecio(t.valor)}`,
  );
  const resumenMotivos = [...porMotivo.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([k, n]) => `- ${k}: ${n}`);
  const topProductos = [...porProducto.values()]
    .sort((a, b) => b.salidas - a.salidas)
    .slice(0, 15)
    .map((p) => `- ${p.nombre}: entradas ${p.entradas}, salidas ${p.salidas}`);

  const detalle = filas.slice(0, MAX_DETALLE).map((m) => {
    const nombre =
      `${m.productos?.marcas?.nombre ?? ""} ${m.productos?.modelo ?? ""}`.trim();
    return [
      m.fecha.slice(0, 16).replace("T", " "),
      clasificar(m),
      `${m.cantidad} x ${nombre}`,
      m.motivos?.nombre,
      m.proveedores?.nombre && `prov: ${m.proveedores.nombre}`,
      m.personas?.nombre && `resp: ${m.personas.nombre}`,
      m.observaciones,
    ]
      .filter(Boolean)
      .join(" | ");
  });

  const lineasReservas = ((reservas.data ?? []) as unknown as any[]).map(
    (r) =>
      `- ${r.cantidad} x ${r.productos?.marcas?.nombre ?? ""} ${r.productos?.modelo ?? ""} (${r.motivo})`,
  );

  // Análisis estadístico y económico: se calcula aquí, la IA solo lo interpreta.
  const MS_DIA = 86400000;
  const truncado = filas.length >= MAX_MOVIMIENTOS;
  const diasAnalisis = truncado
    ? Math.max(1, Math.ceil((Date.now() - new Date(filas[filas.length - 1].fecha).getTime()) / MS_DIA))
    : dias;
  const nombres = new Map((existencias ?? []).map((p) => [p.id, p.nombre]));
  const stock = new Map((existencias ?? []).map((p) => [p.id, p.total]));
  const movsAnalisis = filas.map((m) => ({
    fecha: m.fecha,
    tipo: m.tipo,
    cantidad: Number(m.cantidad),
    producto_id: m.producto_id,
  }));
  const historialPrecios = historial.error ? null : ((historial.data ?? []) as any[]);
  const bloqueEstadistico = analisisEstadistico(movsAnalisis, nombres, precio, stock, diasAnalisis, formatearPrecio);
  const bloqueElasticidad = elasticidades(movsAnalisis, historialPrecios, nombres, diasAnalisis, formatearPrecio);
  const avisoTruncado = truncado
    ? [`AVISO: hay más de ${MAX_MOVIMIENTOS} movimientos; el análisis cubre solo los últimos ${diasAnalisis} días.`]
    : [];

  return [
    `INVENTARIO ACTUAL (${lineasProductos.length} productos). Valor total aprox. ${formatearPrecio(valorTotal)}` +
      (sinPrecio
        ? `; ${sinPrecio} productos sin precio no están incluidos en el valor.`
        : "."),
    lineasProductos.join("\n") || "(sin datos)",
    "",
    `MOVIMIENTOS DEL PERIODO (últimos ${dias} días): ${filas.length} movimientos` +
      (filas.length >= MAX_MOVIMIENTOS
        ? " (lista truncada, puede haber más)"
        : "") +
      ". Los valores usan el precio actual de cada producto.",
    "Totales por tipo:",
    resumenTipos.join("\n") || "(sin movimientos)",
    "Por motivo:",
    resumenMotivos.join("\n") || "(sin movimientos)",
    "Productos con más salidas:",
    topProductos.join("\n") || "(sin movimientos)",
    "",
    `Detalle (${detalle.length} más recientes):`,
    detalle.join("\n") || "(sin movimientos)",
    "",
    `RESERVAS ACTIVAS (${lineasReservas.length}):`,
    lineasReservas.join("\n") || "(ninguna)",
    `AJUSTES PENDIENTES DE AUTORIZACIÓN: ${pendientes.count ?? 0}`,
    "",
    ...avisoTruncado,
    ...bloqueEstadistico,
    "",
    ...bloqueElasticidad,
  ].join("\n");
}

export async function preguntar(
  historial: Mensaje[],
  contexto: string,
): Promise<string> {
  const sistema =
    `Eres el asistente de un sistema de inventario. Hoy es ${new Date().toLocaleDateString("es-GT")}. ` +
    `Responde en español, breve y claro, usando SOLO los datos de abajo. ` +
    `Usa los totales ya calculados; no recalcules sumas largas. Las secciones ANÁLISIS ESTADÍSTICO y ELASTICIDAD ya vienen calculadas por la aplicación: úsalas tal cual. ` +
    `Si el dato no está o el periodo no lo cubre, dilo; no inventes cifras. ` +
    `Los montos están en quetzales (Q).\n\n${contexto}`;

  if (!API_KEY) {
    throw new Error("falta EXPO_PUBLIC_GEMINI_API_KEY en el archivo .env");
  }

  let res: Response;
  try {
    res = await fetch(`${URL_API}?key=${encodeURIComponent(API_KEY)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: sistema }] },
        contents: historial.slice(-10).map((m) => ({
          role: m.role === "user" ? "user" : "model",
          parts: [{ text: m.content }],
        })),
      }),
    });
  } catch {
    throw new Error("sin conexión con Gemini");
  }

  if (!res.ok) {
    let motivo = "";
    try {
      motivo = String((await res.json())?.error?.message ?? "").slice(0, 150);
    } catch {}
    throw new Error(`Error ${res.status}${motivo ? ": " + motivo : ""}`);
  }

  const json = await res.json();
  const texto = ((json.candidates?.[0]?.content?.parts ?? []) as { text?: string }[])
    .map((p) => p.text ?? "")
    .join("")
    .trim();
  return texto || "Sin respuesta.";
}
