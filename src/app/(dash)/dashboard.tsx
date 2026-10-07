import { cerrarSesion, obtenerSesion } from '@/auth';
import { ThemedButton } from '@/components/ThemedButton';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function Dashboard() {
  const router = useRouter();

  useEffect(() => {
    obtenerSesion().then((session) => {
      if (!session) router.replace('/login');
    });
  }, []);

  async function salir() {
    await cerrarSesion();
    router.replace('/login');
  }

  return (
    <ThemedView style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ padding: 24, gap: 12 }}>
          <ThemedText type="titulo">Dashboard</ThemedText>
          <ThemedButton titulo="Productos" onPress={()=>{
            router.push('/productos')
          }} />
          <ThemedButton titulo="Cerrar sesión" onPress={salir} />
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}
