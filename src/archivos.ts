import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import { supabase } from "@/supabase";

export type Archivo = { uri: string; nombre: string; tipo: string };

// Abre la cámara y devuelve la foto (o null si se cancela).
export async function tomarFoto(): Promise<Archivo | null> {
  const permiso = await ImagePicker.requestCameraPermissionsAsync();
  if (!permiso.granted) return null;

  const r = await ImagePicker.launchCameraAsync({ quality: 0.5 });
  if (r.canceled) return null;
  return { uri: r.assets[0].uri, nombre: `foto-${Date.now()}.jpg`, tipo: "image/jpeg" };
}

// Abre el selector de archivos (PDF, imágenes, etc.).
export async function elegirArchivo(): Promise<Archivo | null> {
  const r = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true });
  if (r.canceled) return null;
  const a = r.assets[0];
  return { uri: a.uri, nombre: a.name, tipo: a.mimeType ?? "application/octet-stream" };
}

// Sube el archivo a Supabase Storage. Devuelve la ruta guardada o null si falla.
export async function subirArchivo(bucket: string, ruta: string, archivo: Archivo) {
  const formulario = new FormData();
  formulario.append("file", { uri: archivo.uri, name: archivo.nombre, type: archivo.tipo } as any);

  const { error } = await supabase.storage.from(bucket).upload(ruta, formulario, { upsert: true });
  if (error) {
    console.log(error.message);
    return null;
  }
  return ruta;
}
