import { supabase } from "@/supabase";

export const ETIQUETA_TIPO: Record<string, string> = {
  entrada: "Entrada",
  salida: "Salida",
  transferencia: "Transferencia",
  ajuste: "Ajuste",
};

export type Lugar = { nombre: string; bodegas: { nombre: string } | null } | null;

export type Movimiento = {
  id: number;
  fecha: string;
  tipo: string;
  cantidad: number;
  observaciones: string | null;
  usuario_id: string | null;
  producto: {
    id: string;
    modelo: string;
    marcas: { nombre: string } | null;
    tipos_producto: { nombre: string } | null;
    unidades_medida: { abreviatura: string } | null;
  } | null;
  origen: Lugar;
  destino: Lugar;
  motivo: { nombre: string } | null;
  proveedor: { nombre: string } | null;
  persona: { nombre: string } | null;
  documento: { nombre: string; tipo: string } | null;
};

export type RegistroAuditoria = {
  id: number;
  fecha: string;
  accion: string;
};

// Columnas y tablas relacionadas que se piden a Supabase
const SELECT = `
  id, fecha, tipo, cantidad, observaciones, usuario_id,
  producto:productos(id, modelo, marcas(nombre), tipos_producto(nombre), unidades_medida(abreviatura)),
  origen:ubicaciones!ubicacion_origen_id(nombre, bodegas(nombre)),
  destino:ubicaciones!ubicacion_destino_id(nombre, bodegas(nombre)),
  motivo:motivos(nombre),
  proveedor:proveedores(nombre),
  persona:personas(nombre),
  documento:documentos(nombre, tipo)
`;

export type FiltroMovimientos = {
  tipo?: string; // entrada, salida, transferencia o ajuste
  productoId?: string; // solo los movimientos de ese producto
  limite?: number;
};

// Devuelve null si hubo un error (para poder avisarle al usuario)
export async function obtenerMovimientos(filtro: FiltroMovimientos = {}) {
  let consulta = supabase
    .from("movimientos")
    .select(SELECT)
    .order("fecha", { ascending: false })
    .order("id", { ascending: false })
    .limit(filtro.limite ?? 30);

  if (filtro.tipo) consulta = consulta.eq("tipo", filtro.tipo);
  if (filtro.productoId) consulta = consulta.eq("producto_id", filtro.productoId);

  const { data, error } = await consulta;
  if (error) {
    console.log(error.message);
    return null;
  }
  return (data ?? []) as unknown as Movimiento[];
}

export async function obtenerMovimiento(id: number) {
  const { data, error } = await supabase
    .from("movimientos")
    .select(SELECT)
    .eq("id", id)
    .maybeSingle();
  if (error) console.log(error.message);
  return (data ?? null) as unknown as Movimiento | null;
}

// Nombre de la persona ligada a un usuario de acceso
export async function obtenerNombreUsuario(usuarioId: string | null) {
  if (!usuarioId) return null;
  const { data, error } = await supabase
    .from("personas")
    .select("nombre")
    .eq("usuario_id", usuarioId)
    .maybeSingle();
  if (error) console.log(error.message);
  return (data?.nombre as string | undefined) ?? null;
}

// Registros de auditoría de un movimiento (solo los puede ver quien tenga auditoria.ver)
export async function obtenerAuditoriaDeMovimiento(id: number) {
  const { data, error } = await supabase
    .from("auditoria")
    .select("id, fecha, accion")
    .in("entidad", ["movimientos", "movimiento"])
    .eq("entidad_id", String(id))
    .order("fecha", { ascending: false });
  if (error) console.log(error.message);
  return (data ?? []) as RegistroAuditoria[];
}

// Funciones para mostrar los datos

export function formatearFechaHora(fecha: string) {
  const f = new Date(fecha);
  const dos = (n: number) => String(n).padStart(2, "0");
  return `${dos(f.getDate())}/${dos(f.getMonth() + 1)}/${f.getFullYear()} ${dos(f.getHours())}:${dos(f.getMinutes())}`;
}

export function nombreProducto(m: Movimiento) {
  const p = m.producto;
  if (!p) return "Producto desconocido";
  return [p.marcas?.nombre, p.modelo].filter(Boolean).join(" ");
}

export function textoLugar(lugar: Lugar) {
  if (!lugar) return null;
  return lugar.bodegas ? `${lugar.bodegas.nombre} › ${lugar.nombre}` : lugar.nombre;
}

// 1 = suma existencias, -1 = resta, 0 = solo cambia de lugar
export function direccion(m: Movimiento): 1 | -1 | 0 {
  if (m.tipo === "entrada") return 1;
  if (m.tipo === "salida") return -1;
  if (m.tipo === "ajuste") return m.destino ? 1 : -1;
  return 0;
}

export function textoCantidad(m: Movimiento) {
  const d = direccion(m);
  const unidad = m.producto?.unidades_medida?.abreviatura;
  const signo = d > 0 ? "+" : d < 0 ? "−" : "";
  return `${signo}${Number(m.cantidad)}${unidad ? " " + unidad : ""}`;
}

export function resumenUbicaciones(m: Movimiento) {
  const origen = textoLugar(m.origen);
  const destino = textoLugar(m.destino);
  if (origen && destino) return `${origen} → ${destino}`;
  if (origen) return `Desde ${origen}`;
  if (destino) return `Hacia ${destino}`;
  return "";
}