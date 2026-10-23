import { CameraView, useCameraPermissions } from "expo-camera";
import { useEffect, useState } from "react";
import { Modal, Text, View } from "react-native";

import { ThemedButton } from "@/components/ThemedButton";

type Props = {
  visible: boolean;
  onLeido: (texto: string) => void; // recibe el contenido del QR
  onCerrar: () => void;
};

// Pantalla completa con la cámara para leer un código QR.
export function EscanerQR({ visible, onLeido, onCerrar }: Props) {
  const [permiso, pedirPermiso] = useCameraPermissions();
  const [leido, setLeido] = useState(false);

  useEffect(() => {
    if (visible) setLeido(false);
  }, [visible]);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onCerrar}>
      <View style={{ flex: 1, backgroundColor: "black" }}>
        {permiso?.granted ? (
          <CameraView
            style={{ flex: 1 }}
            barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
            onBarcodeScanned={
              leido
                ? undefined
                : ({ data }) => {
                    setLeido(true);
                    onLeido(data);
                  }
            }
          />
        ) : (
          <View style={{ flex: 1, justifyContent: "center", padding: 24, gap: 16 }}>
            <Text style={{ color: "white", fontSize: 16 }}>Se necesita permiso para usar la cámara.</Text>
            <ThemedButton titulo="Dar permiso" onPress={pedirPermiso} />
          </View>
        )}
        <View style={{ padding: 16 }}>
          <ThemedButton titulo="Cerrar" onPress={onCerrar} />
        </View>
      </View>
    </Modal>
  );
}
