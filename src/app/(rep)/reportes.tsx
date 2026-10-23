import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ScrollView, Share, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { obtenerSesion } from "@/auth";
import { ThemedButton } from "@/components/ThemedButton";
import { ThemedCard } from "@/components/ThemedCard";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Perfil, obtenerPerfil, puedeVer } from "@/permisos";
import { REPORTES } from "@/reportes";
import { useTheme } from "@/theme";

export default function Reportes() {
  const router = useRouter();
  const colors = useTheme();
  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const [titulo, setTitulo] = useState("");
  const [lineas, setLineas] = useState<string[]>([]);
  const [cargando, setCargando] = useState(false);

  useEffect(() => {
    obtenerSesion().then(async (sesion) => {
      if (!sesion) router.replace("/login");
      else setPerfil(await obtenerPerfil(sesion.user.id));
    });
  }, []);

  async function generar(reporte: (typeof REPORTES)[number]) {
    setCargando(true);
    setTitulo(reporte.titulo);
    setLineas(await reporte.generar());
    setCargando(false);
  }

  return (
    <ThemedView style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ padding: 24, gap: 12 }}>
          <TouchableOpacity onPress={() => router.back()}>
            <ThemedText style={{ color: colors.primario, fontWeight: "bold" }}>← Volver</ThemedText>
          </TouchableOpacity>
          <ThemedText type="titulo">Reportes</ThemedText>

          {perfil && !puedeVer(perfil, ["reportes.ver"]) && (
            <ThemedText type="error">No tienes permiso para ver reportes.</ThemedText>
          )}

          {perfil && puedeVer(perfil, ["reportes.ver"]) && (
            <>
              {REPORTES.map((r) => (
                <ThemedButton key={r.id} titulo={r.titulo} onPress={() => generar(r)} cargando={cargando} />
              ))}

              {titulo !== "" && (
                <ThemedCard style={{ gap: 6 }}>
                  <ThemedText style={{ fontSize: 18, fontWeight: "bold" }}>{titulo}</ThemedText>
                  {lineas.length === 0 && <ThemedText type="suave">Sin datos.</ThemedText>}
                  {lineas.map((l, i) => (
                    <ThemedText key={i} type={l === "" ? undefined : "suave"}>
                      {l}
                    </ThemedText>
                  ))}
                </ThemedCard>
              )}

              {lineas.length > 0 && (
                <ThemedButton
                  titulo="Compartir reporte"
                  onPress={() => Share.share({ message: `${titulo}\n\n${lineas.join("\n")}` })}
                />
              )}
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}
