import { supabase } from "@/supabase";

// Entradas, salidas y transferencias de inventario.
// Las tablas existencias y movimientos no se modifican directamente: todo pasa por
// la función registrar_movimiento de Supabase, que actualiza la existencia, guarda
// el movimiento y registra la auditoría.
//   solo destino = entrada · solo origen = salida · origen y destino = transferencia

export type TipoOperacion = "entrada" | "salida" | "transferencia";

export function esTipoOperacion(valor: unknown): valor is TipoOperacion {
  return valor === "entrada" || valor === "salida" || valor === "transferencia";
}

// Qué pide y cómo se llama cada tipo de operación.
export type ConfigOperacion = {
  nombre: string; // para el aviso al terminar ("Entrada registrada.")
  titulo: string;
  subtitulo: string;
  permiso: string; // permiso que necesita el usuario (roles.permisos)
  boton: string;
  exito: string;
  etiquetaOrigen: string | null; // null = esta operación no usa ubicación de origen
  etiquetaDestino: string | null; // null = esta operación no usa ubicación de destino
  usaProveedor: boolean;
  usaPersona: boolean;
};

export const CONFIG_OPERACION: Record<TipoOperacion, ConfigOperacion> = {
  entrada: {
    nombre: "Entrada",
    titulo: "Nueva entrada",
    subtitulo: "Registra productos que ingresan al inventario.",
    permiso: "inventario.entrada",
    boton: "Confirmar entrada",
    exito: "Entrada registrada.",
    etiquetaOrigen: null,
    etiquetaDestino: "Ubicación donde ingresa",
    usaProveedor: true,
    usaPersona: false,
  },
  salida: {
    nombre: "Salida",
    titulo: "Nueva salida",
    subtitulo: "Registra unidades que salen de una ubicación.",
    permiso: "inventario.salida",
    boton: "Confirmar salida",
    exito: "Salida registrada.",
    etiquetaOrigen: "Ubicación de donde sale",
    etiquetaDestino: null,
    usaProveedor: false,
    usaPersona: true,
  },
  transferencia: {
    nombre: "Transferencia",
    titulo: "Nueva transferencia",
    subtitulo: "Mueve existencias de una ubicación a otra.",
    permiso: "inventario.transferencia",
    boton: "Confirmar transferencia",
    exito: "Transferencia registrada.",
    etiquetaOrigen: "Ubicación de origen",
    etiquetaDestino: "Ubicación de destino",
    usaProveedor: false,
    usaPersona: false,
  },
};

export type DatosMovimiento = {
  productoId: string;
  cantidad: number;
  origenId?: number | null;
  destinoId?: number | null;
  motivoId?: number | null;
  proveedorId?: number | null;
  personaId?: number | null;
  documentoId?: number | null;
  observaciones?: string;
};

export type ResultadoMovimiento = { ok: boolean; id?: number; error?: string };

export async function registrarMovimiento(datos: DatosMovimiento): Promise<ResultadoMovimiento> {
  const { data, error } = await supabase.rpc("registrar_movimiento", {
    p_producto: datos.productoId,
    p_cantidad: datos.cantidad,
    p_origen: datos.origenId ?? null,
    p_destino: datos.destinoId ?? null,
    p_motivo: datos.motivoId ?? null,
    p_proveedor: datos.proveedorId ?? null,
    p_persona: datos.personaId ?? null,
    p_documento: datos.documentoId ?? null,
    p_observaciones: datos.observaciones?.trim() || null,
  });

  if (error) {
    console.log(error.message);
    return { ok: false, error: error.message };
  }
  return { ok: true, id: Number(data) };
}

export type ProveedorOpcion = { id: number; nombre: string };

export async function obtenerProveedoresOpcion() {
  const { data, error } = await supabase
    .from("proveedores")
    .select("id, nombre")
    .eq("activo", true)
    .order("nombre");
  if (error) console.log(error.message);
  return (data ?? []) as ProveedorOpcion[];
}

export type EstadoFormulario = {
  productoId: string | null;
  cantidad: number | null;
  origenId: number | null;
  destinoId: number | null;
  motivoId: number | null;
  personaId: number | null;
  existenciaOrigen: number | null; // cantidad registrada en el origen (null si no se ha leído)
  // Solo salidas: existencia total del producto menos lo reservado por otras operaciones.
  disponibleSinReservas?: number | null;
};

// Devuelve el mensaje del primer problema que encuentre, o null si todo está bien.
export function validarOperacion(tipo: TipoOperacion, e: EstadoFormulario): string | null {
  if (!e.productoId) return "Selecciona un producto.";
  if (e.cantidad === null || e.cantidad <= 0) return "Escribe una cantidad mayor que 0.";

  if (tipo === "entrada" && e.destinoId === null) {
    return "Selecciona la ubicación donde ingresará.";
  }
  if (tipo === "salida" && e.origenId === null) {
    return "Selecciona la ubicación de donde sale.";
  }
  if (tipo === "transferencia") {
    if (e.origenId === null) return "Selecciona la ubicación de origen.";
    if (e.destinoId === null) return "Selecciona la ubicación de destino.";
    if (e.origenId === e.destinoId) return "El origen y el destino deben ser distintos.";
  }

  if (tipo !== "entrada" && e.existenciaOrigen !== null && e.cantidad > e.existenciaOrigen) {
    return `No hay suficiente existencia en esa ubicación (disponible: ${e.existenciaOrigen}).`;
  }

  if (tipo === "salida" && e.disponibleSinReservas != null && e.cantidad > e.disponibleSinReservas) {
    return `Solo hay ${e.disponibleSinReservas} disponibles; el resto está reservado.`;
  }

  if (tipo === "salida" && e.personaId === null) {
    return "Selecciona la persona responsable o el destinatario.";
  }
  if (e.motivoId === null) return "Selecciona el motivo.";
  return null;
}
