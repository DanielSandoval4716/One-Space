import { cerrarSesion, obtenerSesion } from '@/auth';
import { ThemedButton } from '@/components/ThemedButton';
import { ThemedCard } from '@/components/ThemedCard';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const areas = [
  'Productos', 'Inventario', 'Bodegas', 'Movimientos', 'Conteos',
  'Proveedores', 'Personas', 'Reportes', 'Auditoría', 'Configuración',
];

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

          {areas.map((nombre) => (
            <ThemedCard key={nombre}>
              <ThemedText
                onPress={() => {
                  if (nombre === 'Productos') {
                    router.push('/productos');
                  }
                }}
              >
                {nombre}
              </ThemedText>
            </ThemedCard>
          ))}

          <ThemedButton titulo="Cerrar sesión" onPress={salir} />
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}
