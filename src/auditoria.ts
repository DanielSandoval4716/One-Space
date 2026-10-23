import { supabase } from "@/supabase";

export type Registro = {
  id: number;
  fecha: string;
  accion: string;
  entidad: string | null;
  entidad_id: string | null;
  usuario_id: string | null;
  usuario: string | null; // nombre de la persona, si se encuentra
  detalle: Record<string, unknown> | null;
};

export type FiltroFechas = { desde?: Date; hasta?: Date };

// Registros de auditoría (máximo 200), del más nuevo al más viejo, dentro del rango de fechas.
// Devuelve null si hubo un error.
export async function obtenerAuditoria(filtro: FiltroFechas = {}): Promise<Registro[] | null> {
  let consulta = supabase
    .from("auditoria")
    .select("id, fecha, accion, entidad, entidad_id, usuario_id, detalle")
    .order("fecha", { ascending: false })
    .limit(200);

  if (filtro.desde) consulta = consulta.gte("fecha", filtro.desde.toISOString());
  if (filtro.hasta) consulta = consulta.lte("fecha", filtro.hasta.toISOString());

  const [{ data, error }, { data: personas }] = await Promise.all([
    consulta,
    supabase.from("personas").select("usuario_id, nombre").not("usuario_id", "is", null),
  ]);
  if (error) {
    console.log(error.message);
    return null;
  }

  const nombres = new Map((personas ?? []).map((p: any) => [p.usuario_id as string, p.nombre as string]));
  return ((data ?? []) as any[]).map((r) => ({
    ...r,
    usuario: r.usuario_id ? (nombres.get(r.usuario_id) ?? null) : null,
  })) as Registro[];
}

// Convierte "AAAA-MM-DD" en una fecha local. Devuelve null si el texto no es válido.
export function leerFecha(texto: string, finDelDia = false): Date | null {
  const m = texto.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  const [anio, mes, dia] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const f = finDelDia ? new Date(anio, mes - 1, dia, 23, 59, 59, 999) : new Date(anio, mes - 1, dia);
  // Rechaza fechas que no existen (por ejemplo 2026-02-31).
  if (f.getFullYear() !== anio || f.getMonth() !== mes - 1 || f.getDate() !== dia) return null;
  return f;
}

// Convierte el campo "detalle" en líneas legibles: "cantidad: 5".
export function lineasDeDetalle(detalle: Record<string, unknown> | null): [string, string][] {
  if (!detalle || typeof detalle !== "object") return [];
  return Object.entries(detalle).map(([clave, valor]) => [
    clave.replace(/_/g, " "),
    valor !== null && typeof valor === "object" ? JSON.stringify(valor) : String(valor ?? "—"),
  ]);
}

export const ES_MOVIMIENTO = (entidad: string | null) => entidad === "movimientos" || entidad === "movimiento";
