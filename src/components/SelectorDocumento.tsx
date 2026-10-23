import { useState } from "react";
import { Alert } from "react-native";

import { Archivo, elegirArchivo, tomarFoto } from "@/archivos";
import { ThemedButton } from "@/components/ThemedButton";
import { ThemedCard } from "@/components/ThemedCard";
import { ThemedText } from "@/components/ThemedText";
import { crearDocumento } from "@/documentos";
import { useTheme } from "@/theme";

type Props = {
  documentoId?: number | null;
  onCambio: (id: number | null) => void;
  obligatorio?: boolean;
  titulo?: string;
};

// Tarjeta para adjuntar una foto o archivo. Lo sube y avisa con el id del documento.
export function SelectorDocumento({ documentoId = null, onCambio, obligatorio = false, titulo = "Evidencia" }: Props) {
  const colors = useTheme();
  const [nombre, setNombre] = useState("");
  const [subiendo, setSubiendo] = useState(false);

  async function subir(archivo: Archivo | null, tipo: string) {
    if (!archivo) return;
    setSubiendo(true);
    const id = await crearDocumento(archivo, tipo);
    setSubiendo(false);

    if (id === null) {
      Alert.alert("Error", "No se pudo subir el archivo.");
      return;
    }
    setNombre(archivo.nombre);
    onCambio(id);
  }

  return (
    <ThemedCard style={{ gap: 10 }}>
      <ThemedText style={{ fontWeight: "bold" }}>
        {titulo}
        {obligatorio ? " (obligatoria)" : ""}
      </ThemedText>
      {documentoId !== null && <ThemedText style={{ color: colors.exito }}>Adjunto: {nombre}</ThemedText>}
      <ThemedButton titulo="Tomar foto" cargando={subiendo} onPress={async () => subir(await tomarFoto(), "fotografia")} />
      <ThemedButton titulo="Elegir archivo" cargando={subiendo} onPress={async () => subir(await elegirArchivo(), "otro")} />
    </ThemedCard>
  );
}
