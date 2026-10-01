import { View, ViewProps } from 'react-native';
import { useTheme } from '@/theme';

export function ThemedCard({ style, ...props }: ViewProps) {
  const colors = useTheme();
  return (
    <View
      style={[
        {
          backgroundColor: colors.tarjeta,
          borderColor: colors.borde,
          borderWidth: 1,
          borderRadius: 16,
          padding: 16,
        },
        style,
      ]}
      {...props}
    />
  );
}
