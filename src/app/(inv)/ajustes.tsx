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

    // Los ajustes realizados son movimientos de tipo "ajuste"
    const [movimientos, pedidos] = await Promise.all([
      obtenerMovimientos({ tipo: 'ajuste', limite: 50 }),
      obtenerSolicitudes(),
    ]);

    if (movimientos === null) {
      setError('No se pudieron cargar los ajustes.');
    } else {
      setError('');
      setLista(movimientos);
    }
    setSolicitudes(pedidos ?? []);
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

          {/* Quien puede autorizar ve todas las solicitudes; los demás solo las suyas */}
          {solicitudes.length > 0 && (
            <View style={{ gap: 12 }}>
              <ThemedText style={{ fontSize: 18, fontWeight: 'bold' }}>
                {puedeAutorizar ? 'Solicitudes de ajuste' : 'Mis solicitudes'}
              </ThemedText>

              {solicitudes.map((s) => {
                const diferencia = s.cantidad_real - s.cantidad_anterior;
                const unidad = s.producto?.unidades_medida?.abreviatura ?? '';
                const colorEstado =
                  s.estado === 'pendiente' ? colors.aviso : s.estado === 'aprobada' ? colors.exito : colors.error;

                return (
                  <ThemedCard key={s.id} style={{ gap: 6 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
                      <ThemedText style={{ fontSize: 18, fontWeight: 'bold', flexShrink: 1 }}>
                        {nombreProductoSolicitud(s)}
                      </ThemedText>
                      <ThemedText style={{ fontWeight: 'bold', color: colorEstado }}>
                        {s.estado === 'pendiente' ? 'Pendiente' : s.estado === 'aprobada' ? 'Aprobada' : 'Rechazada'}
                      </ThemedText>
                    </View>

                    <ThemedText type="suave">{textoUbicacionSolicitud(s)}</ThemedText>
                    <ThemedText>
                      Registrado: {s.cantidad_anterior} → Real: {s.cantidad_real} {unidad} (
                      {diferencia > 0 ? '+' : diferencia < 0 ? '−' : ''}
                      {Math.abs(diferencia)})
                    </ThemedText>
                    <ThemedText type="suave">Motivo: {s.motivo?.nombre ?? '—'}</ThemedText>
                    {s.observaciones && <ThemedText type="suave">{s.observaciones}</ThemedText>}
                    <ThemedText type="suave">
                      {s.solicitante ?? 'Alguien'} · {formatearFechaHora(s.solicitada_en)}
                    </ThemedText>

                    {s.estado === 'aprobada' && s.movimiento_id !== null && (
                      <TouchableOpacity
                        onPress={() =>
                          router.push({
                            pathname: '/movimiento-detalle',
                            params: { id: String(s.movimiento_id) },
                          })
                        }
                      >
                        <ThemedText style={{ color: colors.primario, fontWeight: 'bold' }}>
                          Ver movimiento →
                        </ThemedText>
                      </TouchableOpacity>
                    )}

                    {s.estado === 'pendiente' && puedeAutorizar && (
                      <View style={{ flexDirection: 'row', gap: 16, marginTop: 4 }}>
                        <TouchableOpacity disabled={procesando === s.id} onPress={() => resolver(s, true)}>
                          <ThemedText style={{ color: colors.exito, fontWeight: 'bold' }}>Aprobar</ThemedText>
                        </TouchableOpacity>
                        <TouchableOpacity disabled={procesando === s.id} onPress={() => resolver(s, false)}>
                          <ThemedText style={{ color: colors.error, fontWeight: 'bold' }}>Rechazar</ThemedText>
                        </TouchableOpacity>
                      </View>
                    )}
                  </ThemedCard>
                );
              })}
            </View>
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