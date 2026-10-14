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
