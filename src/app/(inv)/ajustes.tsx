import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { RefreshControl, ScrollView, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { obtenerSesion } from '@/auth';
import { ThemedButton } from '@/components/ThemedButton';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { MovimientoCard } from '@/components/movimientos/MovimientoCard';
import { Movimiento, obtenerMovimientos } from '@/movimientos';
import { Perfil, obtenerPerfil, puedeVer } from '@/permisos';
import { useTheme } from '@/theme';

export default function Ajustes() {
  const router = useRouter();
  const colors = useTheme();

  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const [lista, setLista] = useState<Movimiento[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  const cargar = useCallback(async () => {
    setCargando(true);
    const session = await obtenerSesion();
    if (!session) {
      router.replace('/login');
      return;
    }

    setPerfil(await obtenerPerfil(session.user.id));

    const datos = await obtenerMovimientos({ tipo: 'ajuste', limite: 50 });
    if (datos === null) {
      setError('No se pudieron cargar los ajustes.');
    } else {
      setError('');
      setLista(datos);
    }
    setCargando(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      cargar();
    }, [cargar])
  );

  return (
    <ThemedView style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={{ padding: 24, gap: 16 }}
          refreshControl={<RefreshControl refreshing={cargando} onRefresh={cargar} />}
        >
          <TouchableOpacity onPress={() => router.back()}>
            <ThemedText style={{ color: colors.primario, fontWeight: 'bold' }}>← Volver</ThemedText>
          </TouchableOpacity>

          <View>
            <ThemedText type="titulo">Ajustes</ThemedText>
            <ThemedText type="suave">
              Corrigen diferencias entre la cantidad registrada y la cantidad física.
            </ThemedText>
          </View>

          {puedeVer(perfil, ['inventario.ajuste']) && (
            <ThemedButton titulo="+ Nuevo ajuste" onPress={() => router.push('/ajuste-nuevo')} />
          )}

          {puedeVer(perfil, ['productos.gestionar']) && (
            <TouchableOpacity
              onPress={() => router.push('/ajuste-precio' as never)}
              style={{
                borderColor: colors.primario,
                borderWidth: 1,
                padding: 14,
                borderRadius: 12,
                alignItems: 'center',
              }}
            >
              <ThemedText style={{ color: colors.primario, fontWeight: 'bold' }}>
                Ajustar precio de un producto
              </ThemedText>
            </TouchableOpacity>
          )}

          <ThemedText style={{ fontSize: 18, fontWeight: 'bold' }}>Ajustes registrados</ThemedText>

          {error !== '' && <ThemedText type="error">{error}</ThemedText>}

          {lista.map((m) => (
            <MovimientoCard
              key={m.id}
              movimiento={m}
              onPress={() =>
                router.push({
                  pathname: '/movimiento-detalle' as never,
                  params: { id: String(m.id) },
                })
              }
            />
          ))}

          {!cargando && error === '' && lista.length === 0 && (
            <ThemedText type="suave">Aún no hay ajustes registrados.</ThemedText>
          )}
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}
