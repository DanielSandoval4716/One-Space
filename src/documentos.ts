import { Archivo, subirArchivo } from "@/archivos";
import { supabase } from "@/supabase";

export type Documento = {
  id: number;
  nombre: string;
  tipo: string;
  archivo_path: string;
  creado_en: string;
};

export async function obtenerDocumentos(): Promise<Documento[]> {
  const { data, error } = await supabase
    .from("documentos")
    .select("id, nombre, tipo, archivo_path, creado_en")
    .order("creado_en", { ascending: false })
    .limit(100);
  if (error) console.log(error.message);
  return (data ?? []) as Documento[];
}
// Sube el archivo y crea el documento. Devuelve su id, o null si falla.
export async function crearDocumento(
  archivo: Archivo,
  tipo: string,
): Promise<number | null> {
  const ruta = `${Date.now()}-${archivo.nombre.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
  if (!(await subirArchivo("documentos", ruta, archivo))) return null;

  const { data, error } = await supabase
    .from("documentos")
    .insert({ nombre: archivo.nombre, tipo, archivo_path: ruta })
    .select("id")
    .single();
  if (error) {
    console.log(error.message);
    return null;
  }
  return data.id as number;
}
// Enlace temporal (5 min) para abrir un documento privado.
export async function urlDocumento(ruta: string) {
  const { data } = await supabase.storage
    .from("documentos")
    .createSignedUrl(ruta, 300);
  return data?.signedUrl ?? null;
}
