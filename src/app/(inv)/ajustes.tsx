import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, RefreshControl, ScrollView, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  SolicitudAjuste,
  nombreProductoSolicitud,
  obtenerSolicitudes,
  resolverSolicitud,
  textoUbicacionSolicitud,
} from '@/ajustes';
import { obtenerSesion } from '@/auth';
import { ThemedButton } from '@/components/ThemedButton';
import { ThemedCard } from '@/components/ThemedCard';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { MovimientoCard } from '@/components/movimientos/MovimientoCard';
import { Movimiento, formatearFechaHora, obtenerMovimientos } from '@/movimientos';
import { Perfil, obtenerPerfil, puedeVer } from '@/permisos';
import { useTheme } from '@/theme';

export default function Ajustes() {
  const router = useRouter();
  const colors = useTheme();

  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const [lista, setLista] = useState<Movimiento[]>([]);
  const [solicitudes, setSolicitudes] = useState<SolicitudAjuste[]>([]);
  const [cargando, setCargando] = useState(true);
  const [procesando, setProcesando] = useState<number | null>(null);
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
    setSolicitudes((await obtenerSolicitudes()) ?? []);
    setCargando(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      cargar();
    }, [cargar])
  );

  const puedeAutorizar = puedeVer(perfil, ['inventario.autorizar_ajuste']);

  function resolver(s: SolicitudAjuste, aprobar: boolean) {
    const mensaje = aprobar
      ? `Se ajustará ${nombreProductoSolicitud(s)} a ${s.cantidad_real}.`
      : 'La solicitud se marcará como rechazada.';

    Alert.alert(aprobar ? 'Aprobar ajuste' : 'Rechazar ajuste', mensaje, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: aprobar ? 'Aprobar' : 'Rechazar',
        style: aprobar ? 'default' : 'destructive',
        onPress: async () => {
          setProcesando(s.id);
          const resultado = await resolverSolicitud(s.id, aprobar);
          setProcesando(null);
          if (!resultado.ok) {
            Alert.alert('No se pudo completar', resultado.error ?? 'Intenta de nuevo.');
          }
          cargar();
        },
      },
    ]);
  }

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
                  pathname: '/movimiento-detalle',
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
