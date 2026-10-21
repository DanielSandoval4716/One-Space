import { obtenerProductosOpcion, obtenerUbicacionesOpcion } from "@/opcionesInventario";
import { supabase } from "@/supabase";

// Pantalla Existencias: producto × ubicación × cantidad (solo consulta).

export type ExistenciaUbicacion = {
  ubicacionId: number;
  lugar: string; // "Bodega › Ubicación"
  cantidad: number;
};

export type ExistenciaProducto = {
  id: string;
  nombre: string; // "Marca Modelo"
  tipo: string;
  unidad: string;
  total: number; // suma de todas las ubicaciones
  stockBajo: boolean;
  ubicaciones: ExistenciaUbicacion[]; // solo donde hay cantidad
};

// Devuelve null si hubo un error (para poder avisarle al usuario)
export async function obtenerExistencias(): Promise<ExistenciaProducto[] | null> {
  const [productos, ubicaciones, vista, filas] = await Promise.all([
    obtenerProductosOpcion(),
    obtenerUbicacionesOpcion(),
    supabase.from("existencias_por_producto").select("producto_id, stock_bajo"),
    supabase.from("existencias").select("producto_id, ubicacion_id, cantidad"),
  ]);

  if (vista.error || filas.error) {
    console.log(vista.error?.message ?? filas.error?.message);
    return null;
  }

  const bajos = new Set(
    ((vista.data ?? []) as { producto_id: string; stock_bajo: boolean }[])
      .filter((f) => f.stock_bajo)
      .map((f) => f.producto_id),
  );

  const lugares = new Map(ubicaciones.map((u) => [u.id, `${u.bodega} › ${u.nombre}`]));

  const porProducto = new Map<string, ExistenciaUbicacion[]>();
  for (const f of (filas.data ?? []) as {
    producto_id: string;
    ubicacion_id: number;
    cantidad: number;
  }[]) {
    const lista = porProducto.get(f.producto_id) ?? [];
    lista.push({
      ubicacionId: f.ubicacion_id,
      lugar: lugares.get(f.ubicacion_id) ?? `Ubicación ${f.ubicacion_id}`,
      cantidad: Number(f.cantidad),
    });
    porProducto.set(f.producto_id, lista);
  }

  return productos.map((p) => ({
    id: p.id,
    nombre: p.nombre,
    tipo: p.tipo,
    unidad: p.unidad,
    total: p.total,
    stockBajo: bajos.has(p.id),
    ubicaciones: (porProducto.get(p.id) ?? [])
      .filter((u) => u.cantidad !== 0)
      .sort((a, b) => a.lugar.localeCompare(b.lugar)),
  }));
}
