import { obtenerExistencias } from "@/existencias";
import { formatearPrecio } from "@/precios";
import { supabase } from "@/supabase";

const URL_API = "https://api.deepseek.com/chat/completions";
const API_KEY = process.env.EXPO_PUBLIC_DEEPSEEK_KEY!;
const MODELO = "deepseek-chat";

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

  const [existencias, precios, movs, reservas, pendientes] = await Promise.all([
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
  ].join("\n");
}

export async function preguntar(
  historial: Mensaje[],
  contexto: string,
): Promise<string> {
  const sistema =
    `Eres el asistente de un sistema de inventario. Hoy es ${new Date().toLocaleDateString("es-GT")}. ` +
    `Responde en español, breve y claro, usando SOLO los datos de abajo. ` +
    `Usa los totales ya calculados; no recalcules sumas largas. ` +
    `Si el dato no está o el periodo no lo cubre, dilo; no inventes cifras. ` +
    `Los montos están en quetzales (Q).\n\n${contexto}`;

  const res = await fetch(URL_API, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${API_KEY}`,
    },
    body: JSON.stringify({
      model: MODELO,
      temperature: 0.3,
      messages: [{ role: "system", content: sistema }, ...historial.slice(-10)],
    }),
  });

  if (!res.ok) throw new Error(`Error ${res.status}`);
  const json = await res.json();
  return json.choices?.[0]?.message?.content ?? "Sin respuesta.";
}
