import { supabase } from "@/supabase";

// Listas que usan los formularios de inventario (ajustes, reservas...).

export type ProductoOpcion = {
  id: string;
  nombre: string; // "Marca Modelo"
  tipo: string;
  unidad: string; // abreviatura
  total: number; // existencia total en todas las ubicaciones
};

type FilaProducto = {
  id: string;
  modelo: string;
  marcas: { nombre: string } | null;
  tipos_producto: { nombre: string } | null;
  unidades_medida: { abreviatura: string } | null;
};

export async function obtenerProductosOpcion(): Promise<ProductoOpcion[]> {
  const [prod, exist] = await Promise.all([
    supabase
      .from("productos")
      .select("id, modelo, marcas(nombre), tipos_producto(nombre), unidades_medida(abreviatura)")
      .eq("activo", true)
      .order("modelo"),
    supabase.from("existencias_por_producto").select("producto_id, total"),
  ]);
  for (const r of [prod, exist]) {
    if (r.error) console.log(r.error.message);
  }

  const totales = new Map<string, number>();
  for (const e of (exist.data ?? []) as { producto_id: string; total: number }[]) {
    totales.set(e.producto_id, Number(e.total));
  }

  return ((prod.data ?? []) as unknown as FilaProducto[]).map((p) => ({
    id: p.id,
    nombre: [p.marcas?.nombre, p.modelo].filter(Boolean).join(" "),
    tipo: p.tipos_producto?.nombre ?? "",
    unidad: p.unidades_medida?.abreviatura ?? "",
    total: totales.get(p.id) ?? 0,
  }));
}

export type UbicacionOpcion = { id: number; nombre: string; bodega: string };

export async function obtenerUbicacionesOpcion(): Promise<UbicacionOpcion[]> {
  const { data, error } = await supabase
    .from("ubicaciones")
    .select("id, nombre, bodegas(nombre)")
    .order("nombre");
  if (error) console.log(error.message);

  const filas = (data ?? []) as unknown as {
    id: number;
    nombre: string;
    bodegas: { nombre: string } | null;
  }[];

  return filas
    .map((u) => ({ id: u.id, nombre: u.nombre, bodega: u.bodegas?.nombre ?? "" }))
    .sort((a, b) => a.bodega.localeCompare(b.bodega) || a.nombre.localeCompare(b.nombre));
}

// Cantidad registrada de un producto en una ubicación (0 si nunca ha tenido)
export async function obtenerExistencia(productoId: string, ubicacionId: number) {
  const { data, error } = await supabase
    .from("existencias")
    .select("cantidad")
    .eq("producto_id", productoId)
    .eq("ubicacion_id", ubicacionId)
    .maybeSingle();
  if (error) console.log(error.message);
  return Number(data?.cantidad ?? 0);
}

export type MotivoOpcion = { id: number; nombre: string };

// aplica_a: entrada, salida, transferencia, ajuste o reserva
export async function obtenerMotivos(aplicaA: string) {
  const { data, error } = await supabase
    .from("motivos")
    .select("id, nombre")
    .eq("aplica_a", aplicaA)
    .order("nombre");
  if (error) console.log(error.message);
  return (data ?? []) as MotivoOpcion[];
}

export type ReglaOperacion = {
  evidencia: "obligatoria" | "opcional" | "innecesaria";
  requiere_autorizacion: boolean;
};

export async function obtenerRegla(tipo: string): Promise<ReglaOperacion> {
  const { data, error } = await supabase
    .from("reglas_operacion")
    .select("evidencia, requiere_autorizacion")
    .eq("tipo", tipo)
    .maybeSingle();
  if (error) console.log(error.message);
  return (data as ReglaOperacion | null) ?? { evidencia: "opcional", requiere_autorizacion: false };
}

export type PersonaOpcion = { id: number; nombre: string };

export async function obtenerPersonasOpcion() {
  const { data, error } = await supabase
    .from("personas")
    .select("id, nombre")
    .eq("activa", true)
    .order("nombre");
  if (error) console.log(error.message);
  return (data ?? []) as PersonaOpcion[];
}

// Convierte el texto de un campo ("23", "2,5") en número. null si no es válido.
export function leerCantidad(texto: string): number | null {
  const limpio = texto.trim().replace(",", ".");
  if (limpio === "") return null;
  const numero = Number(limpio);
  return Number.isFinite(numero) ? numero : null;
}