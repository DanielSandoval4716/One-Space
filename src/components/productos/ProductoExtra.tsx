import { useEffect, useState } from "react";

import { ThemedCard } from "@/components/ThemedCard";
import { ThemedText } from "@/components/ThemedText";
import { ETIQUETA_TIPO, Movimiento, formatearFechaHora, obtenerMovimientos } from "@/movimientos";
import { supabase } from "@/supabase";

// Dónde está el producto (por ubicación) y sus últimos movimientos.
export function ProductoExtra({ productoId }: { productoId: string }) {
  const [ubicaciones, setUbicaciones] = useState<{ lugar: string; cantidad: number }[]>([]);
  const [movimientos, setMovimientos] = useState<Movimiento[]>([]);

  useEffect(() => {
    supabase
      .from("existencias")
      .select("cantidad, ubicacion:ubicaciones(nombre, bodegas(nombre))")
      .eq("producto_id", productoId)
      .neq("cantidad", 0)
      .then(({ data }) =>
        setUbicaciones(
          (data ?? []).map((f: any) => ({
            lugar: f.ubicacion?.bodegas ? `${f.ubicacion.bodegas.nombre} › ${f.ubicacion.nombre}` : (f.ubicacion?.nombre ?? "—"),
            cantidad: Number(f.cantidad),
          }))
        )
      );
    obtenerMovimientos({ productoId, limite: 10 }).then((r) => setMovimientos(r ?? []));
  }, [productoId]);

  return (
    <>
      <ThemedCard style={{ gap: 6 }}>
        <ThemedText style={{ fontWeight: "bold" }}>Ubicaciones</ThemedText>
        {ubicaciones.length === 0 && <ThemedText type="suave">Sin existencias en ninguna ubicación.</ThemedText>}
        {ubicaciones.map((u, i) => (
          <ThemedText key={i}>
            {u.lugar}: {u.cantidad}
          </ThemedText>
        ))}
      </ThemedCard>

      <ThemedCard style={{ gap: 6 }}>
        <ThemedText style={{ fontWeight: "bold" }}>Últimos movimientos</ThemedText>
        {movimientos.length === 0 && <ThemedText type="suave">Aún no hay movimientos.</ThemedText>}
        {movimientos.map((m) => (
          <ThemedText key={m.id} type="suave">
            {formatearFechaHora(m.fecha)} · {ETIQUETA_TIPO[m.tipo] ?? m.tipo} · {m.cantidad}
          </ThemedText>
        ))}
      </ThemedCard>
    </>
  );
}
