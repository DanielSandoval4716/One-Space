import { useRouter } from 'expo-router';
import { TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useTheme } from '@/theme';

// Pantalla que se muestra cuando el usuario no tiene permiso (o aún se está comprobando).
export function SinPermiso({ cargando = false }: { cargando?: boolean }) {
  const router = useRouter();
  const colors = useTheme();

  return (
    <ThemedView style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1, padding: 24, gap: 16 }}>
        <TouchableOpacity onPress={() => router.back()}>
          <ThemedText style={{ color: colors.primario, fontWeight: 'bold' }}>← Volver</ThemedText>
        </TouchableOpacity>
        {cargando ? (
          <ThemedText type="suave">Cargando...</ThemedText>
        ) : (
          <ThemedText type="error">No tienes permiso para ver esta sección.</ThemedText>
        )}
      </SafeAreaView>
    </ThemedView>
  );
}
