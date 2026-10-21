// Datos de prueba de Reservas (se pierden al cerrar la app).
// TODO: reemplazar por Supabase cuando exista la tabla de reservas.

export type EstadoReserva = 'activa' | 'cancelada' | 'convertida';

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

// Unidades de un producto que están apartadas en reservas activas
export function reservadoDe(productoId: string) {
  return reservasPrueba
    .filter((r) => r.estado === 'activa' && r.productoId === productoId)
    .reduce((suma, r) => suma + r.cantidad, 0);
}

export function crearReserva(datos: Omit<Reserva, 'id' | 'fecha' | 'estado'>) {
  const id = reservasPrueba.reduce((max, r) => Math.max(max, r.id), 0) + 1;
  reservasPrueba.push({ ...datos, id, fecha: new Date().toISOString(), estado: 'activa' });
}

export function cancelarReserva(id: number) {
  const reserva = reservasPrueba.find((r) => r.id === id);
  if (reserva && reserva.estado === 'activa') reserva.estado = 'cancelada';
}