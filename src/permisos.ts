import { supabase } from "@/supabase";

export type Perfil = { nombre: string; rol: string; permisos: string[] };
type Fila = {
  nombre: string;
  activa: boolean;
  roles: { nombre: string; permisos: string[] } | null;
};
export async function obtenerPerfil(userId: string) {
  const { data, error } = await supabase
    .from("personas")
    .select("nombre, activa, roles(nombre, permisos)")
    .eq("usuario_id", userId)
    .maybeSingle();
  if (error) console.log(error.message);
  const fila = data as unknown as Fila | null;
  if (!fila || !fila.activa || !fila.roles) return null;

  return {
    nombre: fila.nombre,
    rol: fila.roles.nombre,
    permisos: fila.roles.permisos,
  } as Perfil;
}

export function puedeVer(perfil: Perfil | null, permisos?: string[]) {
  if (!perfil) return false;
  if (!permisos) return true;
  return permisos.some((p) => perfil.permisos.includes(p));
}
