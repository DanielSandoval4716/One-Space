import { supabase } from "@/supabase";

// TODO (base de datos): la función registrar_movimiento solo crea entradas, salidas
// y transferencias, y las tablas existencias/movimientos no se pueden modificar
// directamente. Para guardar ajustes de verdad hace falta una función en Supabase
// (aquí se llama registrar_ajuste, con los parámetros de abajo) que:
//   1) calcule la diferencia contra existencias,
//   2) inserte un movimiento de tipo 'ajuste' (solo destino si sobra, solo origen si falta),
//   3) actualice existencias y registre la auditoría.
// Cuando exista, cambia esta constante a true.
export const AJUSTES_EN_SERVIDOR = false;

export type DatosAjuste = {
  productoId: string;
  ubicacionId: number;
  cantidadAnterior: number; // existencia registrada
  cantidadReal: number; // lo que se encontró físicamente
  motivoId: number;
  observaciones: string;
};

export type ResultadoAjuste = { ok: boolean; simulado: boolean; error?: string };

export async function registrarAjuste(datos: DatosAjuste): Promise<ResultadoAjuste> {
  if (!AJUSTES_EN_SERVIDOR) {
    console.log("Ajuste (simulado):", datos);
    return { ok: true, simulado: true };
  }

  const { error } = await supabase.rpc("registrar_ajuste", {
    p_producto: datos.productoId,
    p_ubicacion: datos.ubicacionId,
    p_cantidad_real: datos.cantidadReal,
    p_motivo: datos.motivoId,
    p_observaciones: datos.observaciones.trim() || null,
  });

  if (error) {
    console.log(error.message);
    return { ok: false, simulado: false, error: error.message };
  }
  return { ok: true, simulado: false };
}

// TODO (base de datos): hace falta una tabla para guardar las solicitudes de
// autorización de ajustes (con su estado: pendiente, aprobado, rechazado).
export async function solicitarAutorizacionAjuste(datos: DatosAjuste): Promise<ResultadoAjuste> {
  console.log("Solicitud de autorización (simulada):", datos);
  return { ok: true, simulado: true };
}