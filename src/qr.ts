import { supabase } from "@/supabase";
// Convierte el texto de un QR (productos.codigo_qr) en el id del producto.
export async function idDeProductoPorQR(texto: string): Promise<string | null> {
  const { data } = await supabase
    .from("productos")
    .select("id")
    .eq("codigo_qr", texto.trim())
    .maybeSingle();
  return (data?.id as string | undefined) ?? null;
}
