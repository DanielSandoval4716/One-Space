import { useEffect, useState } from "react";
import { Alert, Image } from "react-native";
import QRCode from "react-native-qrcode-svg";
import { ThemedButton } from "@/components/ThemedButton";
import { ThemedCard } from "@/components/ThemedCard";
import { ThemedText } from "@/components/ThemedText";
import { compartirQREnPDF } from "@/qrPdf";
import { supabase } from "@/supabase";

// Foto del producto + su código QR (productos.codigo_qr).
export function FotoYQR({ productoId, nombre, detalle }: { productoId: string; nombre?: string; detalle?: string }) {
  const [foto, setFoto] = useState<string | null>(null);
  const [codigo, setCodigo] = useState<string | null>(null);
  const [generando, setGenerando] = useState(false);

  async function imprimir() {
    if (!codigo) return;
    setGenerando(true);
    const error = await compartirQREnPDF(codigo, nombre ?? "Producto", detalle);
    setGenerando(false);
    if (error) Alert.alert("No se pudo generar el PDF", error);
  }

  useEffect(() => {
    supabase
      .from("productos")
      .select("foto_path, codigo_qr")
      .eq("id", productoId)
      .maybeSingle()
      .then(({ data }) => {
        setCodigo(data?.codigo_qr ?? null);
        setFoto(data?.foto_path ? supabase.storage.from("productos").getPublicUrl(data.foto_path).data.publicUrl : null);
      });
  }, [productoId]);

  return (
    <>
      <ThemedCard style={{ height: 180, justifyContent: "center", alignItems: "center", overflow: "hidden" }}>
        {foto ? (
          <Image source={{ uri: foto }} style={{ width: "100%", height: "100%" }} resizeMode="cover" />
        ) : (
          <ThemedText type="suave">Sin fotografía</ThemedText>
        )}
      </ThemedCard>

      {codigo && (
        <ThemedCard style={{ alignItems: "center", gap: 8 }}>
          <QRCode value={codigo} size={140} backgroundColor="white" />
          <ThemedText type="suave">Código QR del producto</ThemedText>
          <ThemedButton titulo="Imprimir QR (PDF)" onPress={imprimir} cargando={generando} />
        </ThemedCard>
      )}
    </>
  );
}
