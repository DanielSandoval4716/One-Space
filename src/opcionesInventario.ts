import { supabase } from "@/supabase";


export type ProductoOpcion = {
  id: string;
  nombre: string; 
  tipo: string;
  unidad: string; 
  total: number; 
  reservado: number; 
  disponible: number; 
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
    supabase.from("existencias_disponibles").select("producto_id, total, reservado, disponible"),
  ]);
  for (const r of [prod, exist]) {
    if (r.error) console.log(r.error.message);
  }

  const cifras = new Map<string, { total: number; reservado: number; disponible: number }>();
  for (const e of (exist.data ?? []) as {
    producto_id: string;
    total: number;
    reservado: number;
    disponible: number;
  }[]) {
    cifras.set(e.producto_id, {
      total: Number(e.total),
      reservado: Number(e.reservado),
      disponible: Number(e.disponible),
    });
  }

  return ((prod.data ?? []) as unknown as FilaProducto[]).map((p) => {
    const c = cifras.get(p.id);
    return {
      id: p.id,
      nombre: [p.marcas?.nombre, p.modelo].filter(Boolean).join(" "),
      tipo: p.tipos_producto?.nombre ?? "",
      unidad: p.unidades_medida?.abreviatura ?? "",
      total: c?.total ?? 0,
      reservado: c?.reservado ?? 0,
      disponible: c?.disponible ?? 0,
    };
  });
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

export type ExistenciaUbicacion = { ubicacionId: number; texto: string; cantidad: number };

export async function obtenerExistenciasProducto(productoId: string): Promise<ExistenciaUbicacion[]> {
  const { data, error } = await supabase
    .from("existencias")
    .select("ubicacion_id, cantidad, ubicaciones(nombre, bodegas(nombre))")
    .eq("producto_id", productoId)
    .gt("cantidad", 0);
  if (error) console.log(error.message);

  const filas = (data ?? []) as unknown as {
    ubicacion_id: number;
    cantidad: number;
    ubicaciones: { nombre: string; bodegas: { nombre: string } | null } | null;
  }[];

  return filas.map((f) => ({
    ubicacionId: f.ubicacion_id,
    texto: f.ubicaciones
      ? `${f.ubicaciones.bodegas?.nombre ?? ""} › ${f.ubicaciones.nombre}`
      : String(f.ubicacion_id),
    cantidad: Number(f.cantidad),
  }));
}

export type MotivoOpcion = { id: number; nombre: string };

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

export function leerCantidad(texto: string): number | null {
  const limpio = texto.trim().replace(",", ".");
  if (limpio === "") return null;
  const numero = Number(limpio);
  return Number.isFinite(numero) ? numero : null;
}