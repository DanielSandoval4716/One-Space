import { supabase } from "@/supabase";

export const MONEDA = "Q";
export function leerPrecio(texto: string): {
  ok: boolean;
  valor: number | null;
} {
  const t = texto.trim().replace(",", ".");
  if (t === "") return { ok: true, valor: null };
  const n = Number(t);
  if (!Number.isFinite(n) || n < 0) return { ok: false, valor: null };
  return { ok: true, valor: Math.round(n * 100) / 100 };
}

export function formatearPrecio(n: number) {
  const [entero, decimales] = n.toFixed(2).split(".");
  return `${MONEDA} ${entero.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}.${decimales}`;
}

export async function guardarPrecio(
  productoId: string,
  precio: number | null,
): Promise<string | null> {
  const { data, error } = await supabase
    .from("productos")
    .update({ precio })
    .eq("id", productoId)
    .select("id");
  if (error) console.log(error.message);
  if (error || !data || data.length === 0) {
    return "No se pudo guardar el precio. Verifica que tengas permiso.";
  }
  return null;
}
