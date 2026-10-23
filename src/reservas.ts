import { supabase } from "@/supabase";

export type EstadoReserva = "activa" | "cancelada" | "convertida";

export type Reserva = {
  id: number;
  cantidad: number;
  motivo: string; 
  estado: EstadoReserva;
  creada_en: string;
  movimiento_id: number | null; // la salida generada al convertirla
  producto: {
    id: string;
    modelo: string;
    marcas: { nombre: string } | null;
    unidades_medida: { abreviatura: string } | null;
  } | null;
  persona: { nombre: string } | null; 
};

const SELECT = `
  id, cantidad, motivo, estado, creada_en, movimiento_id,
  producto:productos(id, modelo, marcas(nombre), unidades_medida(abreviatura)),
  persona:personas(nombre)
`;

export async function obtenerReservas(soloActivas: boolean): Promise<Reserva[] | null> {
  let consulta = supabase
    .from("reservas")
    .select(SELECT)
    .order("creada_en", { ascending: false })
    .limit(100);

  if (soloActivas) consulta = consulta.eq("estado", "activa");

  const { data, error } = await consulta;
  if (error) {
    console.log(error.message);
    return null;
  }
  return (data ?? []) as unknown as Reserva[];
}

export function nombreProductoReserva(r: Reserva) {
  if (!r.producto) return "Producto desconocido";
  return [r.producto.marcas?.nombre, r.producto.modelo].filter(Boolean).join(" ");
}

export function unidadReserva(r: Reserva) {
  return r.producto?.unidades_medida?.abreviatura ?? "";
}


export type ResultadoReserva = { ok: boolean; error?: string };

async function llamar(funcion: string, parametros: Record<string, unknown>): Promise<ResultadoReserva> {
  const { error } = await supabase.rpc(funcion, parametros);
  if (error) {
    console.log(error.message);
    return { ok: false, error: error.message };
  }
  return { ok: true };
}

export function crearReserva(datos: {
  productoId: string;
  cantidad: number;
  motivo: string;
  personaId: number | null;
}) {
  return llamar("crear_reserva", {
    p_producto: datos.productoId,
    p_cantidad: datos.cantidad,
    p_motivo: datos.motivo,
    p_persona: datos.personaId,
  });
}

export function cancelarReserva(id: number) {
  return llamar("cancelar_reserva", { p_reserva: id });
}

export function convertirReservaEnSalida(id: number, ubicacionId: number, motivoId: number | null) {
  return llamar("convertir_reserva_en_salida", {
    p_reserva: id,
    p_ubicacion: ubicacionId,
    p_motivo: motivoId,
  });
}