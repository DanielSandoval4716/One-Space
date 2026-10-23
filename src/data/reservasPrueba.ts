export type EstadoReserva = "activa" | "cancelada" | "convertida";

export type Reserva = {
  id: number;
  productoId: string;
  producto: string; // "Marca Modelo"
  unidad: string;
  cantidad: number;
  responsable: string;
  motivo: string; // destino o motivo de la reserva
  fecha: string; // ISO
  estado: EstadoReserva;
};

export const reservasPrueba: Reserva[] = [];

// Unidades de un producto que están apartadas en reservas activas.
// exceptoReservaId: no cuenta esa reserva (sirve al convertirla en salida).
export function reservadoDe(productoId: string, exceptoReservaId?: number) {
  return reservasPrueba
    .filter(
      (r) =>
        r.estado === "activa" &&
        r.productoId === productoId &&
        r.id !== exceptoReservaId,
    )
    .reduce((suma, r) => suma + r.cantidad, 0);
}

export function crearReserva(datos: Omit<Reserva, "id" | "fecha" | "estado">) {
  const id = reservasPrueba.reduce((max, r) => Math.max(max, r.id), 0) + 1;
  reservasPrueba.push({
    ...datos,
    id,
    fecha: new Date().toISOString(),
    estado: "activa",
  });
}

// Marca la reserva como convertida en salida (se llama después de registrar la salida).
export function convertirReserva(id: number) {
  const reserva = reservasPrueba.find((r) => r.id === id);
  if (reserva && reserva.estado === "activa") reserva.estado = "convertida";
}

export function cancelarReserva(id: number) {
  const reserva = reservasPrueba.find((r) => r.id === id);
  if (reserva && reserva.estado === "activa") reserva.estado = "cancelada";
}
