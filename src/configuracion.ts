import { supabase } from "@/supabase";

function mensajeError(error: { code?: string; message: string }) {
  console.log(error.message);
  if (error.code === "23505") return "Ya existe un elemento con ese nombre.";
  if (error.code === "42501") return "No tienes permiso para hacer esto.";
  return "No se pudo guardar. Inténtalo de nuevo.";
}

const SIN_PERMISO = "No tienes permiso para hacer esto.";

export type Campo = {
  clave: string;
  etiqueta: string;
  obligatorio?: boolean;
  opciones?: { valor: string; etiqueta: string }[];
};

export const CATALOGOS: Record<string, { titulo: string; campos: Campo[] }> = {
  tipos_producto: {
    titulo: "Tipos de producto",
    campos: [
      { clave: "nombre", etiqueta: "Nombre", obligatorio: true },
      { clave: "categoria", etiqueta: "Categoría (opcional)" },
    ],
  },
  marcas: {
    titulo: "Marcas",
    campos: [{ clave: "nombre", etiqueta: "Nombre", obligatorio: true }],
  },
  unidades_medida: {
    titulo: "Unidades de medida",
    campos: [
      {
        clave: "nombre",
        etiqueta: "Nombre (ej. Kilogramo)",
        obligatorio: true,
      },
      {
        clave: "abreviatura",
        etiqueta: "Abreviatura (ej. kg)",
        obligatorio: true,
      },
    ],
  },
  motivos: {
    titulo: "Motivos",
    campos: [
      { clave: "nombre", etiqueta: "Nombre", obligatorio: true },
      {
        clave: "aplica_a",
        etiqueta: "Aplica a",
        obligatorio: true,
        opciones: [
          { valor: "entrada", etiqueta: "Entrada" },
          { valor: "salida", etiqueta: "Salida" },
          { valor: "transferencia", etiqueta: "Transferencia" },
          { valor: "ajuste", etiqueta: "Ajuste" },
          { valor: "reserva", etiqueta: "Reserva" },
        ],
      },
    ],
  },
  responsabilidades: {
    titulo: "Responsabilidades",
    campos: [{ clave: "nombre", etiqueta: "Nombre", obligatorio: true }],
  },
};

export type Elemento = { id: number; [campo: string]: any };

export async function obtenerCatalogo(tabla: string) {
  const { data, error } = await supabase
    .from(tabla)
    .select("*")
    .order("nombre");
  if (error) console.log(error.message);
  return (data ?? []) as Elemento[];
}
export async function guardarElemento(
  tabla: string,
  valores: Record<string, string>,
  id?: number,
) {
  const datos = Object.fromEntries(
    Object.entries(valores).map(([clave, valor]) => [
      clave,
      valor.trim() === "" ? null : valor.trim(),
    ]),
  );
  const { data, error } = id
    ? await supabase.from(tabla).update(datos).eq("id", id).select()
    : await supabase.from(tabla).insert(datos).select();
  if (error) return mensajeError(error);
  if (!data || data.length === 0) return SIN_PERMISO;
  return null;
}
export async function borrarElemento(tabla: string, id: number) {
  if (tabla === "responsabilidades") {
    const { count } = await supabase
      .from("persona_responsabilidades")
      .select("*", { count: "exact", head: true })
      .eq("responsabilidad_id", id);
    if (count)
      return "No se puede borrar: hay personas con esta responsabilidad.";
  }

  const { data, error } = await supabase
    .from(tabla)
    .delete()
    .eq("id", id)
    .select();
  if (error)
    return error.code === "23503"
      ? "No se puede borrar: está en uso."
      : mensajeError(error);
  if (!data || data.length === 0) return SIN_PERMISO;
  return null;
}
export type Regla = {
  tipo: string;
  evidencia: string;
  requiere_autorizacion: boolean;
};
const ORDEN_REGLAS = [
  "entrada",
  "salida",
  "transferencia",
  "ajuste",
  "reserva",
];
export async function obtenerReglas() {
  const { data, error } = await supabase.from("reglas_operacion").select("*");
  if (error) console.log(error.message);
  const reglas = (data ?? []) as Regla[];
  return reglas.sort(
    (a, b) => ORDEN_REGLAS.indexOf(a.tipo) - ORDEN_REGLAS.indexOf(b.tipo),
  );
}

export async function actualizarRegla(tipo: string, cambios: Partial<Regla>) {
  const { data, error } = await supabase
    .from("reglas_operacion")
    .update(cambios)
    .eq("tipo", tipo)
    .select();
  if (error) return mensajeError(error);
  if (!data || data.length === 0) return SIN_PERMISO;
  return null;
}
export const PERMISOS = [
  { clave: "productos.gestionar", etiqueta: "Crear y editar productos" },
  {
    clave: "bodegas.gestionar",
    etiqueta: "Crear y editar bodegas y ubicaciones",
  },
  { clave: "proveedores.gestionar", etiqueta: "Crear y editar proveedores" },
  { clave: "personas.gestionar", etiqueta: "Crear y editar personas" },
  {
    clave: "configuracion.gestionar",
    etiqueta: "Administrar la configuración",
  },
  { clave: "inventario.entrada", etiqueta: "Registrar entradas" },
  { clave: "inventario.salida", etiqueta: "Registrar salidas" },
  { clave: "inventario.transferencia", etiqueta: "Registrar transferencias" },
  { clave: "inventario.ajuste", etiqueta: "Solicitar ajustes" },
  {
    clave: "inventario.autorizar_ajuste",
    etiqueta: "Aprobar o rechazar ajustes",
  },
  { clave: "inventario.reserva", etiqueta: "Crear y cancelar reservas" },
  { clave: "conteos.realizar", etiqueta: "Realizar conteos" },
  { clave: "reportes.ver", etiqueta: "Consultar reportes" },
  { clave: "auditoria.ver", etiqueta: "Consultar la auditoría" },
];

export type Rol = {
  id: number;
  nombre: string;
  descripcion: string | null;
  permisos: string[];
};

export async function obtenerRoles() {
  const { data, error } = await supabase
    .from("roles")
    .select("*")
    .order("nombre");
  if (error) console.log(error.message);
  return (data ?? []) as Rol[];
}

export async function guardarRol(
  rol: { nombre: string; descripcion: string; permisos: string[] },
  id?: number,
) {
  const datos = {
    nombre: rol.nombre.trim(),
    descripcion: rol.descripcion.trim() || null,
    permisos: rol.permisos,
  };

  const { data, error } = id
    ? await supabase.from("roles").update(datos).eq("id", id).select()
    : await supabase.from("roles").insert(datos).select();

  if (error) return mensajeError(error);
  if (!data || data.length === 0) return SIN_PERMISO;
  return null;
}

export async function borrarRol(id: number) {
  const { data, error } = await supabase
    .from("roles")
    .delete()
    .eq("id", id)
    .select();
  if (error)
    return error.code === "23503"
      ? "No se puede borrar: hay usuarios con este rol."
      : mensajeError(error);
  if (!data || data.length === 0) return SIN_PERMISO;
  return null;
}

export type Usuario = {
  id: number;
  nombre: string;
  email: string | null;
  activa: boolean;
  rol_id: number | null;
  usuario_id: string;
};

export async function obtenerUsuarios() {
  const { data, error } = await supabase
    .from("personas")
    .select("id, nombre, email, activa, rol_id, usuario_id")
    .not("usuario_id", "is", null)
    .order("nombre");
  if (error) console.log(error.message);
  return (data ?? []) as Usuario[];
}

export async function actualizarUsuario(
  personaId: number,
  cambios: { rol_id?: number; activa?: boolean },
) {
  const { data, error } = await supabase
    .from("personas")
    .update(cambios)
    .eq("id", personaId)
    .select();
  if (error) return mensajeError(error);
  if (!data || data.length === 0) return SIN_PERMISO;
  return null;
}

export async function crearUsuario(datos: {
  nombre: string;
  email: string;
  password: string;
  rol_id: number;
}) {
  const { error } = await supabase.functions.invoke("crear-usuario", {
    body: datos,
  });
  if (!error) return null;
  try {
    const respuesta = (error as any).context as Response;
    if (respuesta.status === 404)
      return "La función crear-usuario no está publicada en Supabase.";
    const cuerpo = await respuesta.json();
    if (cuerpo?.error) return cuerpo.error as string;
  } catch {}
  return "No se pudo crear el usuario.";
}
