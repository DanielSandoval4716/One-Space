// Datos de prueba del Directorio (Proveedores y Personas).
// TODO: reemplazar por Supabase cuando existan las tablas.

export type TipoContacto = 'proveedor' | 'persona';

export type Proveedor = {
  id: number;
  nombre: string;
  identificacion: string; // NIT u otro dato de identificación
  contacto: string; // persona de contacto en la empresa
  telefono: string;
  correo: string;
  direccion: string;
};

// Roles que una persona puede tener dentro de las operaciones.
// TODO: en el futuro vendrán de Configuración.
export const ROLES_PERSONA = [
  'Usuario del sistema',
  'Responsable de salida',
  'Responsable de conteo',
  'Recibe productos',
  'Autoriza operaciones',
] as const;

export type RolPersona = (typeof ROLES_PERSONA)[number];

export type Persona = {
  id: number;
  nombre: string;
  identificacion: string;
  cargo: string;
  telefono: string;
  correo: string;
  roles: RolPersona[];
};

export const proveedoresPrueba: Proveedor[] = [
  {
    id: 1,
    nombre: 'Distribuidora Tecno, S.A.',
    identificacion: '1234567-8',
    contacto: 'Ana López',
    telefono: '5555-0101',
    correo: 'ventas@tecno.example',
    direccion: 'Zona 4, Ciudad de Guatemala',
  },
  {
    id: 2,
    nombre: 'Importaciones del Norte',
    identificacion: '7654321-0',
    contacto: 'Carlos Pérez',
    telefono: '5555-0202',
    correo: 'contacto@norte.example',
    direccion: 'Zona 9, Ciudad de Guatemala',
  },
];

export const personasPrueba: Persona[] = [
  {
    id: 1,
    nombre: 'María Gómez',
    identificacion: 'ID-0001',
    cargo: 'Encargada de bodega',
    telefono: '5555-0303',
    correo: 'maria@onespace.example',
    roles: ['Usuario del sistema', 'Responsable de conteo'],
  },
  {
    id: 2,
    nombre: 'Luis Herrera',
    identificacion: 'ID-0002',
    cargo: 'Supervisor',
    telefono: '5555-0404',
    correo: 'luis@onespace.example',
    roles: ['Usuario del sistema', 'Autoriza operaciones'],
  },
  {
    id: 3,
    nombre: 'Sofía Ramírez',
    identificacion: 'ID-0003',
    cargo: 'Ventas',
    telefono: '5555-0505',
    correo: 'sofia@onespace.example',
    roles: ['Recibe productos', 'Responsable de salida'],
  },
];

function siguienteId(lista: { id: number }[]) {
  return lista.reduce((max, item) => Math.max(max, item.id), 0) + 1;
}

// Crea (sin id) o actualiza (con id) un proveedor en memoria.
export function guardarProveedor(datos: Omit<Proveedor, 'id'> & { id?: number }) {
  const indice = datos.id ? proveedoresPrueba.findIndex((p) => p.id === datos.id) : -1;
  if (indice >= 0) {
    proveedoresPrueba[indice] = { ...datos, id: proveedoresPrueba[indice].id };
  } else {
    proveedoresPrueba.push({ ...datos, id: siguienteId(proveedoresPrueba) });
  }
}

// Crea (sin id) o actualiza (con id) una persona en memoria.
export function guardarPersona(datos: Omit<Persona, 'id'> & { id?: number }) {
  const indice = datos.id ? personasPrueba.findIndex((p) => p.id === datos.id) : -1;
  if (indice >= 0) {
    personasPrueba[indice] = { ...datos, id: personasPrueba[indice].id };
  } else {
    personasPrueba.push({ ...datos, id: siguienteId(personasPrueba) });
  }
}
