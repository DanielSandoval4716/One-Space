import { ActivityIndicator, Text, TouchableOpacity } from 'react-native';
import { useTheme } from '@/theme';

type Props = {
  titulo: string;
  onPress: () => void;
  cargando?: boolean;
};

export function ThemedButton({ titulo, onPress, cargando = false }: Props) {
  const colors = useTheme();
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={cargando}
      style={{
        backgroundColor: colors.primario,
        padding: 14,
        borderRadius: 12,
        alignItems: 'center',
        opacity: cargando ? 0.6 : 1,
      }}
    >
      {cargando ? (
        <ActivityIndicator color={colors.textoSobrePrimario} />
      ) : (
        <Text style={{ color: colors.textoSobrePrimario, fontSize: 16, fontWeight: 'bold' }}>{titulo}</Text>
      )}
    </TouchableOpacity>
  );
}
