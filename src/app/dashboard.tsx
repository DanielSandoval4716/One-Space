import { useEffect, useState } from 'react';
import { ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { ThemedCard } from '@/components/ThemedCard';
import { ThemedButton } from '@/components/ThemedButton';
import { obtenerSesion, cerrarSesion } from '@/auth';

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
              <ThemedText>{nombre}</ThemedText>
            </ThemedCard>
          ))}

          <ThemedButton titulo="Cerrar sesión" onPress={salir} />
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}
