import { supabase } from "@/supabase";

export type MovimientoReciente = {
  id: number;
  fecha: string;
  tipo: string;
  cantidad: number;
  productos: { modelo: string; marcas: { nombre: string } | null } | null;
};

export type OperacionReciente = { id: number; fecha: string; accion: string };

export type Resumen = {
  productos: number;
  existencias: number;
  stockBajo: number;
  movimientos: MovimientoReciente[];
  operaciones: OperacionReciente[] | null;
  pendientes: { conteos: number; ajustes: number; reservas: number };
};

export async function obtenerResumen(verAuditoria: boolean): Promise<Resumen> {
  const contar = (tabla: string, estado: string) =>
    supabase.from(tabla).select("*", { count: "exact", head: true }).eq("estado", estado);

  const [prod, exist, movs, ops, conteos, ajustes, reservas] = await Promise.all([
    supabase
      .from("productos")
      .select("*", { count: "exact", head: true })
      .eq("activo", true),
    supabase.from("existencias_por_producto").select("total, stock_bajo"),
    supabase
      .from("movimientos")
      .select("id, fecha, tipo, cantidad, productos(modelo, marcas(nombre))")
      .order("fecha", { ascending: false })
      .limit(5),
    verAuditoria
      ? supabase
          .from("auditoria")
          .select("id, fecha, accion")
          .order("fecha", { ascending: false })
          .limit(5)
      : null,
    contar("conteos", "en_progreso"),
    contar("solicitudes_ajuste", "pendiente"),
    contar("reservas", "activa"),
  ]);

  for (const r of [prod, exist, movs, ops, conteos, ajustes, reservas]) {
    if (r?.error) console.log(r.error.message);
  }

  const filas = (exist.data ?? []) as { total: number; stock_bajo: boolean }[];

  return {
    productos: prod.count ?? 0,
    existencias: filas.reduce((suma, f) => suma + Number(f.total), 0),
    stockBajo: filas.filter((f) => f.stock_bajo).length,
    movimientos: (movs.data ?? []) as unknown as MovimientoReciente[],
    operaciones: ops ? ((ops.data ?? []) as OperacionReciente[]) : null,
    pendientes: { conteos: conteos.count ?? 0, ajustes: ajustes.count ?? 0, reservas: reservas.count ?? 0 },
  };
}
