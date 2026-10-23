import { supabase } from "@/supabase";

export type Registro = {
  id: number;
  fecha: string;
  accion: string;
  entidad: string | null;
  entidad_id: string | null;
};

// Últimos 100 registros. Devuelve null si hubo un error.
export async function obtenerAuditoria(): Promise<Registro[] | null> {
  const { data, error } = await supabase
    .from("auditoria")
    .select("id, fecha, accion, entidad, entidad_id")
    .order("fecha", { ascending: false })
    .limit(100);
  if (error) {
    console.log(error.message);
    return null;
  }
  return (data ?? []) as Registro[];
}
