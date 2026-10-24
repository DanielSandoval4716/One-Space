import { useEffect, useState } from 'react';
import { Alert, ScrollView, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { ThemedCard } from '@/components/ThemedCard';
import { obtenerSesion } from '@/auth';
import { obtenerPerfil, puedeVer } from '@/permisos';

const catalogos = [
  { titulo: 'Tipos de producto', tabla: 'tipos_producto' },
  { titulo: 'Marcas', tabla: 'marcas' },
  { titulo: 'Unidades de medida', tabla: 'unidades_medida' },
  { titulo: 'Motivos', tabla: 'motivos' },
  { titulo: 'Responsabilidades', tabla: 'responsabilidades' },
];

export default function Configuracion() {
  const router = useRouter();
  const [permitido, setPermitido] = useState<boolean | null>(null);

  useEffect(() => {
    obtenerSesion().then(async (session) => {
      if (!session) {
        router.replace('/login');
        return;
      }
      const perfil = await obtenerPerfil(session.user.id);
      setPermitido(puedeVer(perfil, ['configuracion.gestionar']));
    });
  }, []);

  const subtitulo = { fontSize: 18, fontWeight: 'bold' } as const;

if (!permitido) {
  return (
    <ThemedView style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <ScrollView contentContainerStyle={{ padding: 24, gap: 12 }}>
          <ThemedText type="titulo">Configuración</ThemedText>
          <ThemedCard>
            <ThemedText type="error">No tienes permiso para ver esta sección.</ThemedText>
          </ThemedCard>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

return (
  <ThemedView style={{ flex: 1 }}>
    <SafeAreaView style={{ flex: 1 }} edges={['top']}>
      <ScrollView contentContainerStyle={{ padding: 24, gap: 12 }}>
        <ThemedText type="titulo">Configuración</ThemedText>

        <ThemedText style={subtitulo}>Catálogos</ThemedText>
        {catalogos.map((c) => (
          <Acceso
            key={c.tabla}
            titulo={c.titulo}
            onPress={() => router.push({ pathname: '/catalogo', params: { tabla: c.tabla } })}
          />
        ))}

        <ThemedText style={subtitulo}>Operaciones</ThemedText>
        <Acceso titulo="Reglas de las operaciones" onPress={() => router.push('/reglas')} />

        <ThemedText style={subtitulo}>Seguridad</ThemedText>
        <Acceso titulo="Roles y permisos" onPress={() => router.push('/roles')} />
        <Acceso titulo="Usuarios" onPress={() => router.push('/usuarios')} />

      </ScrollView>
    </SafeAreaView>
  </ThemedView>
);

function Acceso({ titulo, descripcion, onPress }: { titulo: string; descripcion?: string; onPress: () => void }) {
  return (
    <TouchableOpacity onPress={onPress}>
      <ThemedCard>
        <View>
          <ThemedText style={{ fontWeight: 'bold' }}>{titulo}</ThemedText>
          {descripcion && <ThemedText type="suave">{descripcion}</ThemedText>}
        </View>
      </ThemedCard>
    </TouchableOpacity>
  );
}}
