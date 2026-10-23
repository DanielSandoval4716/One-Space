import { supabase } from '@/supabase';

export type EstadoConteo = 'en_progreso' | 'finalizado';

export type DetalleConteo = {
  id: number;
  producto_id: string;
  cantidad_sistema: number;
  cantidad_fisica: number | null;
  diferencia: number | null;
  contado_en: string | null;
  producto: {
    id: string;
    modelo: string;
    marcas: { nombre: string } | null;
    tipos_producto: { nombre: string } | null;
    unidades_medida: { abreviatura: string } | null;
  } | null;
};

export type Conteo = {
  id: number;
  ubicacion_id: number;
  estado: EstadoConteo;
  observaciones: string | null;
  creado_por: string;
  creado_en: string;
  finalizado_en: string | null;
  ubicacion: {
    nombre: string;
    bodegas: { nombre: string } | null;
  } | null;
  detalles: DetalleConteo[];
};

export async function obtenerConteos(): Promise<Conteo[] | null> {
  const { data, error } = await supabase
    .from('conteos')
    .select(`
      id,
      ubicacion_id,
      estado,
      observaciones,
      creado_por,
      creado_en,
      finalizado_en,
      ubicacion:ubicaciones(
        nombre,
        bodegas(nombre)
      ),
      detalles:conteo_detalles(
        id,
        producto_id,
        cantidad_sistema,
        cantidad_fisica,
        diferencia,
        contado_en,
        producto:productos(
          id,
          modelo,
          marcas(nombre),
          tipos_producto(nombre),
          unidades_medida(abreviatura)
        )
      )
    `)
    .order('creado_en', { ascending: false })
    .limit(50);

  if (error) {
    console.error('Error al consultar conteos:', error.message);
    return null;
  }

  return ((data ?? []) as unknown as Conteo[]).map((c) => ({
    ...c,
    detalles: (c.detalles ?? [])
      .map((d) => ({
        ...d,
        cantidad_sistema: Number(d.cantidad_sistema),
        cantidad_fisica:
          d.cantidad_fisica === null ? null : Number(d.cantidad_fisica),
        diferencia: d.diferencia === null ? null : Number(d.diferencia),
      }))
      .sort((a, b) => a.id - b.id),
  }));
}

export async function crearConteo(
  ubicacionId: number,
  observaciones: string
): Promise<{ id: number | null; error?: string }> {
  const { data, error } = await supabase.rpc('crear_conteo', {
    p_ubicacion: ubicacionId,
    p_observaciones: observaciones.trim() || null,
  });

  if (error) {
    console.error('Error al iniciar conteo:', error.message);
    if (error.message.includes('conteos_un_abierto_por_ubicacion')) {
      return { id: null, error: 'Ya hay un conteo en progreso en esa ubicación. Confírmalo o termínalo primero.' };
    }
    return { id: null, error: error.message };
  }

  return { id: Number(data), error: undefined };
}

export async function agregarProductoConteo(
  conteoId: number,
  productoId: string
): Promise<{ ok: boolean; error?: string }> {
  const { error } = await supabase.rpc('agregar_producto_conteo', {
    p_conteo: conteoId,
    p_producto: productoId,
  });

  if (error) {
    console.error('Error al agregar producto:', error.message);
    if (error.message.includes('conteo_detalles_unico')) {
      return { ok: false, error: 'Ese producto ya está incluido en el conteo.' };
    }
    return { ok: false, error: error.message };
  }

  return { ok: true };
}

export async function quitarProductoConteo(
  detalleId: number
): Promise<{ ok: boolean; error?: string }> {
  const { error } = await supabase.rpc('quitar_producto_conteo', {
    p_detalle: detalleId,
  });

  if (error) {
    console.error('Error al quitar producto:', error.message);
    return { ok: false, error: error.message };
  }

  return { ok: true };
}

export async function registrarCantidadConteo(
  detalleId: number,
  cantidadFisica: number
): Promise<{ ok: boolean; error?: string }> {
  const { error } = await supabase.rpc('registrar_cantidad_conteo', {
    p_detalle: detalleId,
    p_cantidad_fisica: cantidadFisica,
  });

  if (error) {
    console.error('Error al guardar cantidad:', error.message);
    return { ok: false, error: error.message };
  }

  return { ok: true };
}

export async function finalizarConteo(
  conteoId: number
): Promise<{ ok: boolean; error?: string }> {
  const { error } = await supabase.rpc('finalizar_conteo', {
    p_conteo: conteoId,
  });

  if (error) {
    console.error('Error al finalizar conteo:', error.message);
    return { ok: false, error: error.message };
  }

  return { ok: true };
}

export function nombreProductoConteo(d: DetalleConteo): string {
  const nombre = [
    d.producto?.marcas?.nombre,
    d.producto?.modelo,
  ].filter(Boolean).join(' ');

  return nombre || 'Producto desconocido';
}

// Existencia ACTUAL de varios productos en una ubicación (si no hay fila, es 0).
export async function obtenerExistenciaActual(
  ubicacionId: number,
  productoIds: string[]
): Promise<Record<string, number> | null> {
  if (productoIds.length === 0) return {};

  const { data, error } = await supabase
    .from('existencias')
    .select('producto_id, cantidad')
    .eq('ubicacion_id', ubicacionId)
    .in('producto_id', productoIds);

  if (error) {
    console.error('Error al leer existencias:', error.message);
    return null;
  }

  const resultado: Record<string, number> = {};
  for (const id of productoIds) resultado[id] = 0;
  for (const f of (data ?? []) as { producto_id: string; cantidad: number }[]) {
    resultado[f.producto_id] = Number(f.cantidad);
  }
  return resultado;
}

export function tipoProductoConteo(d: DetalleConteo): string {
  return d.producto?.tipos_producto?.nombre ?? '';
}

// Cuántos productos del conteo ya tienen cantidad física guardada.
export function productosContados(c: Conteo): number {
  return c.detalles.filter((d) => d.cantidad_fisica !== null).length;
}

export function ubicacionConteo(c: Conteo): string {
  const bodega = c.ubicacion?.bodegas?.nombre;
  const ubicacion = c.ubicacion?.nombre;

  if (bodega && ubicacion) return `${bodega} › ${ubicacion}`;
  return ubicacion || bodega || `Ubicación ${c.ubicacion_id}`;
}

export function formatearFechaConteo(fecha: string): string {
  const f = new Date(fecha);
  const dos = (n: number) => String(n).padStart(2, '0');

  return `${dos(f.getDate())}/${dos(f.getMonth() + 1)}/${f.getFullYear()} ${dos(f.getHours())}:${dos(f.getMinutes())}`;
}