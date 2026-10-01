import { supabase } from "@/supabase";

//comprobar si ya hay sesion
export async function obtenerSesion() {
  const { data } = await supabase.auth.getSession();
  return data.session;
}

//true si inicia
export async function iniciarSesion(email: string, password: string) {
  const { error } = await supabase.auth.signInWithPassword({
    email: email.trim(),
    password,
  });
  return error === null;
}

export async function cerrarSesion() {
  await supabase.auth.signOut();
}
