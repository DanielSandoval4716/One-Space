import { View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { useTheme } from '@/theme';

type Props = {
  titulo: string;
  antes: number;
  despues: number;
  unidad: string;
};

// Una línea como "Origen    10 → 7 u". Se pinta de rojo si la existencia quedaría negativa.
export function CambioExistencia({ titulo, antes, despues, unidad }: Props) {
  const colors = useTheme();

  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
      <ThemedText type="suave">{titulo}</ThemedText>
      <ThemedText style={{ fontWeight: 'bold', color: despues < 0 ? colors.error : colors.texto }}>
        {antes} → {despues} {unidad}
      </ThemedText>
    </View>
  );
}
