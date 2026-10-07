import { Pressable, View } from 'react-native';

import { ThemedCard } from '@/components/ThemedCard';
import { ThemedText } from '@/components/ThemedText';
import { Producto } from '@/data/productosPrueba';
import { useTheme } from '@/theme';

type Props = {
  producto: Producto;
  onPress: () => void;
};

export function ProductoCard({ producto, onPress }: Props) {
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
          {producto.marca} {producto.modelo}
        </ThemedText>

        <View>
          <ThemedText type="suave">
            Tipo: {producto.tipo}
          </ThemedText>

          <ThemedText type="suave">
            Marca: {producto.marca}
          </ThemedText>

          <ThemedText type="suave">
            Existencias: {producto.existencias}
          </ThemedText>
        </View>

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