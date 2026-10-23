import { supabase } from '@/supabase';

export const AJUSTES_EN_SERVIDOR = true;

export type DatosAjuste = {
  productoId: string;
  ubicacionId: number;
  cantidadAnterior?: number;
  cantidadReal: number;
  motivoId: number;
  observaciones: string;
  documentoId?: number | null;
};

export type ResultadoAjuste = {
  ok: boolean;
  simulado: boolean;
  error?: string;
};

export type EstadoSolicitud = 'pendiente' | 'aprobada' | 'rechazada';

export type SolicitudAjuste = {
  id: number;
  estado: EstadoSolicitud;
  cantidad_anterior: number;
  cantidad_real: number;
  observaciones: string | null;
  solicitante: string | null;
  solicitada_en: string;
  movimiento_id: number | null;
  producto: {
    id: string;
    modelo: string;
    marcas: { nombre: string } | null;
    unidades_medida: { abreviatura: string } | null;
  } | null;
  ubicacion: {
    nombre: string;
    bodegas: { nombre: string } | null;
  } | null;
  motivo: { nombre: string } | null;
};

type SolicitudBD = Omit<SolicitudAjuste, 'solicitante'> & {
  solicitada_por: string;
};

export async function registrarAjuste(
  datos: DatosAjuste
): Promise<ResultadoAjuste> {
  if (!AJUSTES_EN_SERVIDOR) {
    console.log('Ajuste simulado:', datos);
    return { ok: true, simulado: true };
  }

  const { error } = await supabase.rpc('registrar_ajuste', {
    p_producto: datos.productoId,
    p_ubicacion: datos.ubicacionId,
    p_cantidad_real: datos.cantidadReal,
    p_motivo: datos.motivoId,
    p_observaciones: datos.observaciones.trim() || null,
    p_documento: datos.documentoId ?? null,
  });

  if (error) {
    console.error('Error al registrar ajuste:', error.message);
    return { ok: false, simulado: false, error: error.message };
  }

  return { ok: true, simulado: false };
}

export async function solicitarAutorizacionAjuste(
  datos: DatosAjuste
): Promise<ResultadoAjuste> {
  if (!AJUSTES_EN_SERVIDOR) {
    console.log('Solicitud de ajuste simulada:', datos);
    return { ok: true, simulado: true };
  }

  const { error } = await supabase.rpc('solicitar_ajuste', {
    p_producto: datos.productoId,
    p_ubicacion: datos.ubicacionId,
    p_cantidad_real: datos.cantidadReal,
    p_motivo: datos.motivoId,
    p_observaciones: datos.observaciones.trim() || null,
    p_documento: datos.documentoId ?? null,
  });

  if (error) {
    console.error('Error al solicitar autorización:', error.message);
    return { ok: false, simulado: false, error: error.message };
  }

  return { ok: true, simulado: false };
}

export async function obtenerSolicitudes(): Promise<SolicitudAjuste[] | null> {
  const { data, error } = await supabase
    .from('solicitudes_ajuste')
    .select(`
      id,
      estado,
      cantidad_anterior,
      cantidad_real,
      observaciones,
      solicitada_por,
      solicitada_en,
      movimiento_id,
      producto:productos(
        id,
        modelo,
        marcas(nombre),
        unidades_medida(abreviatura)
      ),
      ubicacion:ubicaciones(
        nombre,
        bodegas(nombre)
      ),
      motivo:motivos(nombre)
    `)
    .order('solicitada_en', { ascending: false })
    .limit(50);

  if (error) {
    console.error('Error al obtener solicitudes:', error.message);
    return null;
  }

  const filas = (data ?? []) as unknown as SolicitudBD[];

  // Buscar los nombres de las personas que solicitaron los ajustes.
  const usuariosIds = [
    ...new Set(filas.map((s) => s.solicitada_por).filter(Boolean)),
  ];

  const nombresPorUsuario = new Map<string, string>();

  if (usuariosIds.length > 0) {
    const { data: personas, error: errorPersonas } = await supabase
      .from('personas')
      .select('usuario_id, nombre')
      .in('usuario_id', usuariosIds);

    if (errorPersonas) {
      console.warn(
        'No se pudieron obtener los nombres de los solicitantes:',
        errorPersonas.message
      );
    } else {
      for (const persona of personas ?? []) {
        if (persona.usuario_id && persona.nombre) {
          nombresPorUsuario.set(persona.usuario_id, persona.nombre);
        }
      }
    }
  }

  return filas.map((s) => ({
    ...s,
    cantidad_anterior: Number(s.cantidad_anterior),
    cantidad_real: Number(s.cantidad_real),
    solicitante:
      nombresPorUsuario.get(s.solicitada_por) ??
      s.solicitada_por ??
      null,
  }));
}

export async function resolverSolicitud(
  id: number,
  aprobar: boolean,
  comentario?: string
): Promise<{ ok: boolean; error?: string }> {
  const { error } = await supabase.rpc('resolver_ajuste', {
    p_solicitud: id,
    p_aprobar: aprobar,
    p_comentario: comentario?.trim() || null,
  });

  if (error) {
    console.error('Error al resolver solicitud:', error.message);
    return { ok: false, error: error.message };
  }

  return { ok: true };
}

export function nombreProductoSolicitud(s: SolicitudAjuste): string {
  const modelo = s.producto?.modelo?.trim();
  return modelo || 'Producto sin nombre';
}

export function textoUbicacionSolicitud(s: SolicitudAjuste): string {
  const bodega = s.ubicacion?.bodegas?.nombre;
  const ubicacion = s.ubicacion?.nombre;

  if (bodega && ubicacion) return `${bodega} · ${ubicacion}`;
  return ubicacion || bodega || 'Ubicación no disponible';
}