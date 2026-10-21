import { Pressable, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { useTheme } from '@/theme';

type Opcion<T> = { valor: T; titulo: string };

type Props<T> = {
  opciones: Opcion<T>[];
  valor: T | null;
  onChange: (valor: T) => void;
};

// Lista de botones redondos para elegir una opción (como los roles de Directorio).
export function Opciones<T extends string | number>({ opciones, valor, onChange }: Props<T>) {
  const colors = useTheme();

  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      {opciones.map((opcion) => {
        const activo = opcion.valor === valor;
        return (
          <Pressable
            key={String(opcion.valor)}
            onPress={() => onChange(opcion.valor)}
            style={{
              paddingVertical: 8,
              paddingHorizontal: 12,
              borderRadius: 20,
              borderWidth: 1,
              borderColor: activo ? colors.primario : colors.borde,
              backgroundColor: activo ? colors.primario : colors.tarjeta,
            }}
          >
            <ThemedText
              style={{
                fontSize: 14,
                color: activo ? colors.textoSobrePrimario : colors.texto,
              }}
            >
              {opcion.titulo}
            </ThemedText>
          </Pressable>
        );
      })}
    </View>
  );
}