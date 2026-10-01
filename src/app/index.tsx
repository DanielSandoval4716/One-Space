import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { obtenerSesion } from '@/auth';

export default function Index() {
  const router = useRouter();

  useEffect(() => {
    obtenerSesion().then((session) => {
      if (session) router.replace('/dashboard');
      else router.replace('/login');
    });
  }, []);

  return (
    <ThemedView style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <ThemedText>Cargando...</ThemedText>
    </ThemedView>
  );
}
