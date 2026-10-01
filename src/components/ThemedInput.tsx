import { TextInput, TextInputProps } from 'react-native';
import { useTheme } from '@/theme';

export function ThemedInput({ style, ...props }: TextInputProps) {
  const colors = useTheme();
  return (
    <TextInput
      placeholderTextColor={colors.textoSuave}
      style={[
        {
          backgroundColor: colors.tarjeta,
          borderColor: colors.borde,
          borderWidth: 1,
          borderRadius: 12,
          padding: 12,
          fontSize: 16,
          color: colors.texto,
        },
        style,
      ]}
      {...props}
    />
  );
}
