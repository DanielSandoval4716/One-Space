import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { Alert, Linking, ScrollView, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { SelectorDocumento } from "@/components/SelectorDocumento";
import { ThemedCard } from "@/components/ThemedCard";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Documento, obtenerDocumentos, urlDocumento } from "@/documentos";
import { useTheme } from "@/theme";

export default function Documentos() {
  const router = useRouter();
  const colors = useTheme();
  const [lista, setLista] = useState<Documento[]>([]);

  const cargar = useCallback(async () => setLista(await obtenerDocumentos()), []);

  useFocusEffect(
    useCallback(() => {
      cargar();
    }, [cargar])
  );

  async function abrir(d: Documento) {
    const url = await urlDocumento(d.archivo_path);
    if (url) Linking.openURL(url);
    else Alert.alert("Error", "No se pudo abrir el documento.");
  }

  return (
    <ThemedView style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ padding: 24, gap: 16 }}>
          <TouchableOpacity onPress={() => router.back()}>
            <ThemedText style={{ color: colors.primario, fontWeight: "bold" }}>← Volver</ThemedText>
          </TouchableOpacity>

          <ThemedText type="titulo">Documentos</ThemedText>
          <ThemedText type="suave">Facturas, comprobantes, fotografías y otros respaldos.</ThemedText>

          <SelectorDocumento titulo="Agregar documento" onCambio={() => cargar()} />

          {lista.length === 0 && <ThemedText type="suave">Aún no hay documentos.</ThemedText>}

          {lista.map((d) => (
            <TouchableOpacity key={d.id} onPress={() => abrir(d)}>
              <ThemedCard style={{ gap: 4 }}>
                <ThemedText style={{ fontWeight: "bold" }}>{d.nombre}</ThemedText>
                <ThemedText type="suave">
                  {d.tipo} · {new Date(d.creado_en).toLocaleDateString()}
                </ThemedText>
              </ThemedCard>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}
