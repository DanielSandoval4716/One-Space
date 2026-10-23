import { ETIQUETA_TIPO, formatearFechaHora, nombreProducto, obtenerMovimientos } from "@/movimientos";
import { obtenerProductosOpcion } from "@/opcionesInventario";
import { formatearPrecio } from "@/precios";
import { supabase } from "@/supabase";

// Cada reporte devuelve una lista de líneas de texto.
export const REPORTES: { id: string; titulo: string; generar: () => Promise<string[]> }[] = [
  { id: "existencias", titulo: "Existencias", generar: existencias },
  { id: "bajas", titulo: "Existencias bajas", generar: bajas },
  { id: "valor", titulo: "Valor del inventario", generar: valorInventario },
  { id: "movimientos", titulo: "Movimientos (30 días)", generar: movimientos30 },
  { id: "usuarios", titulo: "Operaciones por usuario (30 días)", generar: porUsuario },
];

async function existencias() {
  const productos = await obtenerProductosOpcion();
  return productos.map(
    (p) => `${p.nombre} · ${p.total} ${p.unidad} (reservado ${p.reservado}, disponible ${p.disponible})`
  );
}

async function bajas() {
  const { data } = await supabase.from("existencias_por_producto").select("producto_id, stock_bajo");
  const bajos = new Set((data ?? []).filter((f: any) => f.stock_bajo).map((f: any) => f.producto_id));
  const productos = await obtenerProductosOpcion();
  return productos.filter((p) => bajos.has(p.id)).map((p) => `${p.nombre} · quedan ${p.total} ${p.unidad}`);
}

async function ultimos30Dias() {
  const todos = (await obtenerMovimientos({ limite: 500 })) ?? [];
  const desde = Date.now() - 30 * 24 * 60 * 60 * 1000;
  return todos.filter((m) => new Date(m.fecha).getTime() >= desde);
}

async function movimientos30() {
  const lista = await ultimos30Dias();
  const resumen = Object.keys(ETIQUETA_TIPO).map(
    (t) => `${ETIQUETA_TIPO[t]}: ${lista.filter((m) => m.tipo === t).length}`
  );
  const detalle = lista.map(
    (m) => `${formatearFechaHora(m.fecha)} · ${ETIQUETA_TIPO[m.tipo] ?? m.tipo} · ${nombreProducto(m)} · ${m.cantidad}`
  );
  return [...resumen, "", ...detalle];
}

async function porUsuario() {
  const lista = await ultimos30Dias();
  const { data } = await supabase.from("personas").select("usuario_id, nombre").not("usuario_id", "is", null);
  const nombres = new Map((data ?? []).map((p: any) => [p.usuario_id, p.nombre]));

  const conteo = new Map<string, number>();
  for (const m of lista) {
    const nombre = (m.usuario_id && nombres.get(m.usuario_id)) || "Usuario desconocido";
    conteo.set(nombre, (conteo.get(nombre) ?? 0) + 1);
  }
  return [...conteo.entries()].sort((a, b) => b[1] - a[1]).map(([nombre, n]) => `${nombre}: ${n} operación(es)`);
}

async function valorInventario() {
  const [{ data }, productos] = await Promise.all([
    supabase.from("productos").select("id, precio").eq("activo", true),
    obtenerProductosOpcion(),
  ]);
  const precios = new Map((data ?? []).map((p: any) => [p.id, p.precio === null ? null : Number(p.precio)]));

  let total = 0;
  let sinPrecio = 0;
  const lineas: string[] = [];
  for (const p of productos) {
    const precio = precios.get(p.id);
    if (precio === null || precio === undefined) {
      if (p.total > 0) sinPrecio++;
      continue;
    }
    const valor = precio * p.total;
    total += valor;
    lineas.push(`${p.nombre} · ${p.total} × ${formatearPrecio(precio)} = ${formatearPrecio(valor)}`);
  }

  const resumen = [`Valor total: ${formatearPrecio(total)}`];
  if (sinPrecio > 0) resumen.push(`${sinPrecio} producto(s) con existencias no tienen precio y no se cuentan.`);
  return [...resumen, "", ...lineas];
}
