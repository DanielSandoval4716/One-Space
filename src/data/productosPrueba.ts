export type Producto = {
  id: number;
  tipo: string;
  marca: string;
  modelo: string;
  descripcion: string;
  unidad: string;
  existencias: number;
};

export const productosPrueba: Producto[] = [
  {
    id: 1,
    tipo: 'Mouse',
    marca: 'eTouch',
    modelo: 'ET-M10',
    descripcion: 'Mouse inalámbrico para oficina',
    unidad: 'Unidad',
    existencias: 35,
  },
  {
    id: 2,
    tipo: 'Mouse',
    marca: 'Logitech',
    modelo: 'G502',
    descripcion: 'Mouse para computadora',
    unidad: 'Unidad',
    existencias: 18,
  },
  {
    id: 3,
    tipo: 'Teclado',
    marca: 'Redragon',
    modelo: 'K552',
    descripcion: 'Teclado mecánico',
    unidad: 'Unidad',
    existencias: 12,
  },
];