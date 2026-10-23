import { Href, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { obtenerSesion } from '@/auth';
import { ThemedCard } from '@/components/ThemedCard';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Perfil, obtenerPerfil, puedeVer } from '@/permisos';
import { useTheme } from '@/theme';

// Entradas, salidas y transferencias usan la misma pantalla (operacion.tsx).
const rutaOperacion = (tipo: string) => `/operacion?tipo=${tipo}` as Href;

// Para agregar una sección nueva basta con ponerle su "ruta".
const secciones: { titulo: string; descripcion: string; ruta?: Href; permisos?: string[] }[] = [
  { titulo: 'Existencias', descripcion: 'Consultar cantidades por producto y ubicación.', ruta: '/existencias' as Href },
  { titulo: 'Entradas', descripcion: 'Registrar productos que ingresan.', ruta: rutaOperacion('entrada'), permisos: ['inventario.entrada'] },
  { titulo: 'Salidas', descripcion: 'Registrar unidades que salen.', ruta: rutaOperacion('salida'), permisos: ['inventario.salida'] },
  { titulo: 'Transferencias', descripcion: 'Mover existencias entre ubicaciones.', ruta: rutaOperacion('transferencia'), permisos: ['inventario.transferencia'] },
  {
    titulo: 'Ajustes',
    descripcion: 'Corregir diferencias entre lo registrado y lo físico.',
    ruta: '/ajustes' as Href,
    permisos: ['inventario.ajuste'],
  },
  {
    titulo: 'Reservas',
    descripcion: 'Apartar unidades para una operación futura.',
    ruta: '/reservas' as Href,
    permisos: ['inventario.reserva'],
  },
  {
    titulo: 'Conteos',
    descripcion: 'Realizar conteos físicos y revisar diferencias.',
    ruta: '/conteos' as Href,
    permisos: ['conteos.realizar'],
  },
];

export default function Inventario() {
  const router = useRouter();
  const colors = useTheme();
  const [perfil, setPerfil] = useState<Perfil | null>(null);

  useEffect(() => {
    obtenerSesion().then(async (session) => {
      if (!session) {
        router.replace('/login');
        return;
      }
      setPerfil(await obtenerPerfil(session.user.id));
    });
  }, []);

  function abrir(seccion: { titulo: string; ruta?: Href }) {
    if (seccion.ruta) router.push(seccion.ruta);
    else Alert.alert(seccion.titulo, 'Esta sección aún no está disponible.');
  }

  return (
    <ThemedView style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ padding: 24, gap: 16 }}>
          <TouchableOpacity onPress={() => router.back()}>
            <ThemedText style={{ color: colors.primario, fontWeight: 'bold' }}>← Volver</ThemedText>
          </TouchableOpacity>

          <ThemedText type="titulo">Inventario</ThemedText>
          <ThemedText type="suave">Operaciones que modifican las existencias.</ThemedText>

          {secciones
            .filter((s) => puedeVer(perfil, s.permisos))
            .map((s) => (
              <TouchableOpacity key={s.titulo} onPress={() => abrir(s)}>
                <ThemedCard style={{ gap: 4 }}>
                  <ThemedText style={{ fontSize: 18, fontWeight: 'bold' }}>{s.titulo}</ThemedText>
                  <ThemedText type="suave">{s.descripcion}</ThemedText>
                </ThemedCard>
              </TouchableOpacity>
            ))}
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}