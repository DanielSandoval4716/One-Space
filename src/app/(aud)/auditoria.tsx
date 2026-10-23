import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ScrollView, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Registro, obtenerAuditoria } from "@/auditoria";
import { obtenerSesion } from "@/auth";
import { ThemedCard } from "@/components/ThemedCard";
import { ThemedInput } from "@/components/ThemedInput";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { formatearFechaHora } from "@/movimientos";
import { Perfil, obtenerPerfil, puedeVer } from "@/permisos";
import { useTheme } from "@/theme";

export default function Auditoria() {
  const router = useRouter();
  const colors = useTheme();
  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const [registros, setRegistros] = useState<Registro[] | null>([]);
  const [busqueda, setBusqueda] = useState("");

  useEffect(() => {
    async function cargar() {
      const sesion = await obtenerSesion();
      if (!sesion) return router.replace("/login");
      setPerfil(await obtenerPerfil(sesion.user.id));
      setRegistros(await obtenerAuditoria());
    }
    cargar();
  }, []);

  const texto = busqueda.trim().toLowerCase();
  const lista = (registros ?? []).filter((r) => `${r.accion} ${r.entidad ?? ""}`.toLowerCase().includes(texto));

  return (
    <ThemedView style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ padding: 24, gap: 12 }} keyboardShouldPersistTaps="handled">
          <TouchableOpacity onPress={() => router.back()}>
            <ThemedText style={{ color: colors.primario, fontWeight: "bold" }}>← Volver</ThemedText>
          </TouchableOpacity>
          <ThemedText type="titulo">Auditoría</ThemedText>

          {perfil && !puedeVer(perfil, ["auditoria.ver"]) && (
            <ThemedText type="error">No tienes permiso para ver la auditoría.</ThemedText>
          )}
          {registros === null && <ThemedText type="error">No se pudo cargar la auditoría.</ThemedText>}

          {perfil && puedeVer(perfil, ["auditoria.ver"]) && (
            <>
              <ThemedInput placeholder="Buscar por acción o entidad..." value={busqueda} onChangeText={setBusqueda} />
              {lista.length === 0 && <ThemedText type="suave">No hay registros.</ThemedText>}
              {lista.map((r) => (
                <ThemedCard key={r.id} style={{ gap: 4 }}>
                  <ThemedText style={{ fontWeight: "bold" }}>{r.accion}</ThemedText>
                  <ThemedText type="suave">
                    {[r.entidad, r.entidad_id && `#${r.entidad_id}`].filter(Boolean).join(" ")} · {formatearFechaHora(r.fecha)}
                  </ThemedText>
                </ThemedCard>
              ))}
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}
