import { Text, TextProps } from 'react-native';
import { useTheme } from '@/theme';

type Props = TextProps & { type?: 'normal' | 'titulo' | 'suave' | 'error' };

export function ThemedText({ type = 'normal', style, ...props }: Props) {
  const colors = useTheme();

  let estilo = { color: colors.texto, fontSize: 16 } as const;
  if (type === 'titulo') estilo = { color: colors.texto, fontSize: 28, fontWeight: 'bold' } as any;
  if (type === 'suave') estilo = { color: colors.textoSuave, fontSize: 16 } as any;
  if (type === 'error') estilo = { color: colors.error, fontSize: 14 } as any;

  return <Text style={[estilo, style]} {...props} />;
}
