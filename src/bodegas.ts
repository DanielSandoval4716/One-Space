import { supabase } from "@/supabase";

export type Bodega = { id: number; nombre: string; descripcion: string | null };
export type Ubicacion = {
  id: number;
  bodega_id: number;
  nombre: string;
  descripcion: string | null;
};

export async function obtenerBodegas() {
  const { data, error } = await supabase
    .from("bodegas")
    .select("*")
    .order("nombre");
  if (error) console.log(error.message);
  return (data ?? []) as Bodega[];
}

export async function crearBodega(nombre: string, descripcion: string) {
  const { error } = await supabase
    .from("bodegas")
    .insert({ nombre: nombre.trim(), descripcion: descripcion.trim() || null });
  if (error) console.log(error.message);
  return error === null;
}

export async function obtenerUbicaciones(bodegaId: number) {
  const { data, error } = await supabase
    .from("ubicaciones")
    .select("*")
    .eq("bodega_id", bodegaId)
    .order("nombre");
  if (error) console.log(error.message);
  return (data ?? []) as Ubicacion[];
}

export async function crearUbicacion(
  bodegaId: number,
  nombre: string,
  descripcion: string,
) {
  const { error } = await supabase.from("ubicaciones").insert({
    bodega_id: bodegaId,
    nombre: nombre.trim(),
    descripcion: descripcion.trim() || null,
  });
  if (error) console.log(error.message);
  return error === null;
}

// Productos que hay en cada ubicación de una bodega: { ubicacionId: ["Marca Modelo: 5 un"] }
export async function obtenerExistenciasDeBodega(bodegaId: number) {
  const { data, error } = await supabase
    .from("existencias")
    .select("ubicacion_id, cantidad, ubicaciones!inner(bodega_id), producto:productos(modelo, marcas(nombre), unidades_medida(abreviatura))")
    .eq("ubicaciones.bodega_id", bodegaId)
    .neq("cantidad", 0);
  if (error) console.log(error.message);

  const resultado: Record<number, string[]> = {};
  for (const f of (data ?? []) as any[]) {
    const nombre = [f.producto?.marcas?.nombre, f.producto?.modelo].filter(Boolean).join(" ");
    const linea = `${nombre}: ${Number(f.cantidad)} ${f.producto?.unidades_medida?.abreviatura ?? ""}`.trim();
    (resultado[f.ubicacion_id] ??= []).push(linea);
  }
  return resultado;
}

// Registro en la auditoría; si falla (por permisos) no interrumpe la operación.
async function registrarAuditoria(accion: string, bodegaId: number, detalle: Record<string, unknown>) {
  await supabase.from("auditoria").insert({ accion, entidad: "bodegas", entidad_id: String(bodegaId), detalle });
}

// Cambia el nombre y la descripción de una bodega.
export async function editarBodega(id: number, nombre: string, descripcion: string, nombreAnterior: string) {
  const { data, error } = await supabase
    .from("bodegas")
    .update({ nombre: nombre.trim(), descripcion: descripcion.trim() || null })
    .eq("id", id)
    .select("id");
  if (error) console.log(error.message);
  const ok = !error && (data ?? []).length > 0;
  if (ok) await registrarAuditoria("Bodega editada", id, { nombre_anterior: nombreAnterior, nombre_nuevo: nombre.trim() });
  return ok;
}

// Elimina una bodega con sus ubicaciones, solo si no tiene existencias ni historial.
export async function eliminarBodega(id: number, nombre: string): Promise<{ ok: boolean; mensaje: string }> {
  const ubicaciones = await obtenerUbicaciones(id);
  const ids = ubicaciones.map((u) => u.id);

  if (ids.length > 0) {
    const lista = ids.join(",");
    const contar = (tabla: string) => supabase.from(tabla).select("*", { count: "exact", head: true });
    const [exist, movs, conteos, ajustes] = await Promise.all([
      contar("existencias").in("ubicacion_id", ids).neq("cantidad", 0),
      contar("movimientos").or(`ubicacion_origen_id.in.(${lista}),ubicacion_destino_id.in.(${lista})`),
      contar("conteos").in("ubicacion_id", ids),
      contar("solicitudes_ajuste").in("ubicacion_id", ids),
    ]);
    if (exist.error || movs.error || conteos.error || ajustes.error) {
      return { ok: false, mensaje: "No se pudo verificar el contenido de la bodega. Inténtalo de nuevo." };
    }
    if ((exist.count ?? 0) > 0) {
      return { ok: false, mensaje: "La bodega todavía tiene existencias. Transfiérelas o sácalas antes de eliminarla." };
    }
    if ((movs.count ?? 0) + (conteos.count ?? 0) + (ajustes.count ?? 0) > 0) {
      return {
        ok: false,
        mensaje: "No se puede eliminar porque tiene historial de movimientos, conteos o ajustes. Si ya no la usas, puedes cambiarle el nombre.",
      };
    }

    // Filas de existencias en cero que impedirían borrar las ubicaciones
    await supabase.from("existencias").delete().in("ubicacion_id", ids);
    const { error: errorUbicaciones } = await supabase.from("ubicaciones").delete().eq("bodega_id", id);
    if (errorUbicaciones) {
      console.log(errorUbicaciones.message);
      return { ok: false, mensaje: "No se pudieron eliminar las ubicaciones. Verifica que tengas permiso." };
    }
  }

  const { data, error } = await supabase.from("bodegas").delete().eq("id", id).select("id");
  if (error) console.log(error.message);
  if (error || (data ?? []).length === 0) {
    return { ok: false, mensaje: "No se pudo eliminar la bodega. Verifica que tengas permiso." };
  }

  await registrarAuditoria("Bodega eliminada", id, { nombre, ubicaciones_eliminadas: ids.length });
  return { ok: true, mensaje: "" };
}
