import { Pressable, View } from 'react-native';

import { ThemedCard } from '@/components/ThemedCard';
import { ThemedText } from '@/components/ThemedText';
import {
    ETIQUETA_TIPO,
    Movimiento,
    direccion,
    formatearFechaHora,
    nombreProducto,
    resumenUbicaciones,
    textoCantidad,
} from '@/movimientos';
import { useTheme } from '@/theme';

type Props = {
  movimiento: Movimiento;
  onPress: () => void;
};

export function MovimientoCard({ movimiento, onPress }: Props) {
  const colors = useTheme();
  const d = direccion(movimiento);
  const colorCantidad = d > 0 ? colors.exito : d < 0 ? colors.error : colors.texto;
  const lugar = resumenUbicaciones(movimiento);

  return (
    <Pressable onPress={onPress}>
      <ThemedCard style={{ gap: 6 }}>
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <ThemedText style={{ fontWeight: 'bold', color: colors.primario }}>
            {ETIQUETA_TIPO[movimiento.tipo] ?? movimiento.tipo}
          </ThemedText>
          <ThemedText style={{ fontSize: 18, fontWeight: 'bold', color: colorCantidad }}>
            {textoCantidad(movimiento)}
          </ThemedText>
        </View>

        <ThemedText style={{ fontSize: 19, fontWeight: 'bold' }}>
          {nombreProducto(movimiento)}
        </ThemedText>

        {lugar !== '' && <ThemedText type="suave">{lugar}</ThemedText>}
        <ThemedText type="suave">{formatearFechaHora(movimiento.fecha)}</ThemedText>

        <ThemedText style={{ color: colors.primario, fontWeight: 'bold', marginTop: 4 }}>
          Ver detalle →
        </ThemedText>
      </ThemedCard>
    </Pressable>
  );
}