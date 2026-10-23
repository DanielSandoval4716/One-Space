import { supabase } from "@/supabase";

export type TipoContacto = "proveedor" | "persona";
export type Responsabilidad = { id: number; nombre: string };

export type Proveedor = {
  id: number;
  nombre: string;
  identificacion: string;
  contacto: string;
  telefono: string;
  correo: string;
  direccion: string;
};

export type Persona = {
  id: number;
  nombre: string;
  identificacion: string;
  cargo: string;
  telefono: string;
  correo: string;
  roles: Responsabilidad[];
};

export type EntradaProveedor = {
  id: number;
  fecha: string;
  cantidad: number;
  producto: string;
};

export async function obtenerProveedores(): Promise<Proveedor[]> {
  const { data, error } = await supabase
    .from("proveedores")
    .select("*")
    .eq("activo", true)
    .order("nombre");
  if (error) console.log(error.message);
  return (data ?? []).map((p: any) => ({
    id: p.id,
    nombre: p.nombre,
    identificacion: p.identificacion ?? "",
    contacto: p.contacto ?? "",
    telefono: p.telefono ?? "",
    correo: p.email ?? "",
    direccion: p.direccion ?? "",
  }));
}

export async function obtenerPersonas(): Promise<Persona[]> {
  const { data, error } = await supabase
    .from("personas")
    .select(
      "id, nombre, identificacion, cargo, telefono, email, persona_responsabilidades(responsabilidades(id, nombre))",
    )
    .eq("activa", true)
    .order("nombre");
  if (error) console.log(error.message);
  return (data ?? []).map((p: any) => ({
    id: p.id,
    nombre: p.nombre,
    identificacion: p.identificacion ?? "",
    cargo: p.cargo ?? "",
    telefono: p.telefono ?? "",
    correo: p.email ?? "",
    roles: (p.persona_responsabilidades ?? [])
      .map((r: any) => r.responsabilidades)
      .filter(Boolean),
  }));
}

export async function obtenerResponsabilidades(): Promise<Responsabilidad[]> {
  const { data } = await supabase
    .from("responsabilidades")
    .select("id, nombre")
    .order("nombre");
  return (data ?? []) as Responsabilidad[];
}

// Cada función de guardar devuelve null si salió bien, o el mensaje de error.
export async function guardarProveedor(
  datos: Omit<Proveedor, "id"> & { id?: number },
): Promise<string | null> {
  const { id, correo, ...resto } = datos;
  const campos = { ...resto, email: correo };
  const r = id
    ? await supabase.from("proveedores").update(campos).eq("id", id).select()
    : await supabase
        .from("proveedores")
        .insert({ ...campos, activo: true })
        .select();
  if (r.error) return r.error.message;
  if (!r.data || r.data.length === 0) return "No tienes permiso para guardar.";
  return null;
}

export async function guardarPersona(
  datos: Omit<Persona, "id" | "roles"> & { id?: number },
  rolesIds: number[],
): Promise<string | null> {
  const { id, correo, ...resto } = datos;
  const campos = { ...resto, email: correo };
  const r = id
    ? await supabase.from("personas").update(campos).eq("id", id).select()
    : await supabase
        .from("personas")
        .insert({ ...campos, activa: true })
        .select();
  if (r.error) return r.error.message;
  if (!r.data || r.data.length === 0) return "No tienes permiso para guardar.";

  const personaId = r.data[0].id;
  await supabase
    .from("persona_responsabilidades")
    .delete()
    .eq("persona_id", personaId);
  if (rolesIds.length > 0) {
    const { error } = await supabase.from("persona_responsabilidades").insert(
      rolesIds.map((rid) => ({
        persona_id: personaId,
        responsabilidad_id: rid,
      })),
    );
    if (error) return error.message;
  }
  return null;
}

export async function obtenerEntradasDeProveedor(
  proveedorId: number,
): Promise<EntradaProveedor[]> {
  const { data, error } = await supabase
    .from("movimientos")
    .select("id, fecha, cantidad, productos(modelo, marcas(nombre))")
    .eq("proveedor_id", proveedorId)
    .eq("tipo", "entrada")
    .order("fecha", { ascending: false })
    .limit(20);
  if (error) console.log(error.message);
  return (data ?? []).map((m: any) => ({
    id: m.id,
    fecha: m.fecha,
    cantidad: Number(m.cantidad),
    producto: [m.productos?.marcas?.nombre, m.productos?.modelo]
      .filter(Boolean)
      .join(" "),
  }));
}
