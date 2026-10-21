import { TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { ThemedText } from '@/components/ThemedText';

export function BotonVolver({ onPress }: { onPress?: () => void }) {
  const router = useRouter();

  return (
    <TouchableOpacity onPress={onPress ?? (() => router.back())}>
      <ThemedText type="suave">← Volver</ThemedText>
    </TouchableOpacity>
  );
}
