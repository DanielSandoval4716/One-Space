import { SafeAreaView } from 'react-native-safe-area-context';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';

export default function Configuracion() {
  return (
    <ThemedView style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1, padding: 24, gap: 12 }} edges={['top']}>
        <ThemedText type="titulo">Configuración</ThemedText>

        {/* TODO: pantalla Configuración:
            - catálogos (tipos de producto, marcas, unidades, motivos, responsabilidades)
            - reglas de las operaciones
            - usuarios, roles y permisos */}
      </SafeAreaView>
    </ThemedView>
  );
}
