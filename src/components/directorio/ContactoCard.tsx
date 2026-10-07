import { Pressable } from 'react-native';

import { ThemedCard } from '@/components/ThemedCard';
import { ThemedText } from '@/components/ThemedText';
import { useTheme } from '@/theme';

type Props = {
  titulo: string;
  lineas: string[];
  onPress: () => void;
};

export function ContactoCard({ titulo, lineas, onPress }: Props) {
  const colors = useTheme();

  return (
    <Pressable onPress={onPress}>
      <ThemedCard style={{ gap: 8 }}>
        <ThemedText
          style={{
            fontSize: 19,
            fontWeight: 'bold',
          }}
        >
          {titulo}
        </ThemedText>

        {lineas.map((linea, i) => (
          <ThemedText key={i} type="suave">
            {linea}
          </ThemedText>
        ))}

        <ThemedText
          style={{
            color: colors.primario,
            fontWeight: 'bold',
            marginTop: 4,
          }}
        >
          Ver detalle →
        </ThemedText>
      </ThemedCard>
    </Pressable>
  );
}
