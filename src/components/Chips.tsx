import { TouchableOpacity, View } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { useTheme } from '@/theme';

type Props = {
  opciones: { valor: string; etiqueta: string }[];
  valor: string;
  onCambio: (valor: string) => void;
  deshabilitado?: boolean;
};
export function Chips({ opciones, valor, onCambio, deshabilitado = false }: Props) {
  const colors = useTheme();

  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      {opciones.map((o) => {
        const activo = o.valor === valor;
        return (
          <TouchableOpacity
            key={o.valor}
            disabled={deshabilitado}
            onPress={() => onCambio(o.valor)}
            style={{
              paddingVertical: 8,
              paddingHorizontal: 14,
              borderRadius: 999,
              borderWidth: 1,
              borderColor: activo ? colors.primario : colors.borde,
              backgroundColor: activo ? colors.primario : colors.tarjeta,
              opacity: deshabilitado ? 0.5 : 1,
            }}
          >
            <ThemedText style={{ color: activo ? colors.textoSobrePrimario : colors.texto }}>{o.etiqueta}</ThemedText>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}
