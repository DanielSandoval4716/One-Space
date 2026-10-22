import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, RefreshControl, ScrollView, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { obtenerSesion } from '@/auth';
import { ThemedButton } from '@/components/ThemedButton';
import { ThemedCard } from '@/components/ThemedCard';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Opciones } from '@/components/inventario/Opciones';
import { formatearFechaHora } from '@/movimientos';
import {
  ExistenciaUbicacion,
  MotivoOpcion,
  obtenerExistenciasProducto,
  obtenerMotivos,
} from '@/opcionesInventario';
import { Perfil, obtenerPerfil, puedeVer } from '@/permisos';
import {
  Reserva,
  cancelarReserva,
  convertirReservaEnSalida,
  nombreProductoReserva,
  obtenerReservas,
  unidadReserva,
} from '@/reservas';
import { useTheme } from '@/theme';

const FILTROS = [
  { valor: 'activa', titulo: 'Activas' },
  { valor: 'todas', titulo: 'Todas' },
];

const ESTADOS = { activa: 'Activa', cancelada: 'Cancelada', convertida: 'Convertida en salida' };

export default function Reservas() {
  const router = useRouter();
  const colors = useTheme();

  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const [filtro, setFiltro] = useState('activa');
  const [reservas, setReservas] = useState<Reserva[]>([]);
  const [motivosSalida, setMotivosSalida] = useState<MotivoOpcion[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  // Panel para convertir una reserva en salida
  const [convirtiendo, setConvirtiendo] = useState<number | null>(null);
  const [existencias, setExistencias] = useState<ExistenciaUbicacion[]>([]);
  const [ubicacionId, setUbicacionId] = useState<number | null>(null);
  const [motivoId, setMotivoId] = useState<number | null>(null);
  const [errorConversion, setErrorConversion] = useState('');
  const [procesando, setProcesando] = useState(false);

  const cargar = useCallback(async () => {
    setCargando(true);
    const session = await obtenerSesion();
    if (!session) {
      router.replace('/login');
      return;
    }

    setPerfil(await obtenerPerfil(session.user.id));
    setMotivosSalida(await obtenerMotivos('salida'));

    const datos = await obtenerReservas(filtro === 'activa');
    if (datos === null) {
      setError('No se pudieron cargar las reservas.');
    } else {
      setError('');
      setReservas(datos);
    }
    setCargando(false);
  }, [filtro]);

  useFocusEffect(
    useCallback(() => {
      cargar();
    }, [cargar])
  );

  const puedeReservar = puedeVer(perfil, ['inventario.reserva']);

  function cancelar(reserva: Reserva) {
    Alert.alert(
      'Cancelar reserva',
      `¿Cancelar la reserva de ${reserva.cantidad} ${unidadReserva(reserva)} de ${nombreProductoReserva(reserva)}?`,
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Sí, cancelar',
          style: 'destructive',
          onPress: async () => {
            const resultado = await cancelarReserva(reserva.id);
            if (!resultado.ok) {
              Alert.alert('No se pudo cancelar', resultado.error ?? 'Intenta de nuevo.');
            }
            cargar();
          },
        },
      ]
    );
  }

  async function abrirConversion(reserva: Reserva) {
    setConvirtiendo(reserva.id);
    setUbicacionId(null);
    setMotivoId(null);
    setErrorConversion('');
    // Solo se ofrecen las ubicaciones donde el producto tiene unidades
    setExistencias(reserva.producto ? await obtenerExistenciasProducto(reserva.producto.id) : []);
  }

  async function confirmarConversion(reserva: Reserva) {
    if (ubicacionId === null) return setErrorConversion('Selecciona de dónde salen las unidades.');
    if (motivoId === null) return setErrorConversion('Selecciona el motivo de la salida.');

    setErrorConversion('');
    setProcesando(true);
    const resultado = await convertirReservaEnSalida(reserva.id, ubicacionId, motivoId);
    setProcesando(false);

    if (!resultado.ok) {
      setErrorConversion(resultado.error ?? 'No se pudo registrar la salida.');
      return;
    }

    setConvirtiendo(null);
    Alert.alert('Reserva', 'Salida registrada. La reserva quedó convertida.');
    cargar();
  }

  return (
    <ThemedView style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={{ padding: 24, gap: 16 }}
          keyboardShouldPersistTaps="handled"
          refreshControl={<RefreshControl refreshing={cargando} onRefresh={cargar} />}
        >
          <TouchableOpacity onPress={() => router.back()}>
            <ThemedText style={{ color: colors.primario, fontWeight: 'bold' }}>← Volver</ThemedText>
          </TouchableOpacity>

          <View>
            <ThemedText type="titulo">Reservas</ThemedText>
            <ThemedText type="suave">
              Unidades apartadas para una operación futura, sin hacer todavía una salida.
            </ThemedText>
          </View>

          {puedeReservar && (
            <ThemedButton titulo="+ Nueva reserva" onPress={() => router.push('/reserva-nueva')} />
          )}

          <Opciones opciones={FILTROS} valor={filtro} onChange={setFiltro} />

          {error !== '' && <ThemedText type="error">{error}</ThemedText>}

          {reservas.map((r) => (
            <ThemedCard key={r.id} style={{ gap: 6 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
                <ThemedText style={{ fontSize: 19, fontWeight: 'bold', flexShrink: 1 }}>
                  {nombreProductoReserva(r)}
                </ThemedText>
                <ThemedText style={{ fontSize: 19, fontWeight: 'bold', color: colors.primario }}>
                  {r.cantidad} {unidadReserva(r)}
                </ThemedText>
              </View>
              <ThemedText type="suave">Motivo o destino: {r.motivo}</ThemedText>
              <ThemedText type="suave">Responsable: {r.persona?.nombre ?? '—'}</ThemedText>
              <ThemedText type="suave">{formatearFechaHora(r.creada_en)}</ThemedText>
              <ThemedText
                style={{
                  fontWeight: 'bold',
                  color: r.estado === 'activa' ? colors.exito : colors.textoSuave,
                }}
              >
                {ESTADOS[r.estado]}
              </ThemedText>

              {r.estado === 'convertida' && r.movimiento_id !== null && (
                <TouchableOpacity
                  onPress={() =>
                    router.push({
                      pathname: '/movimiento-detalle',
                      params: { id: String(r.movimiento_id) },
                    })
                  }
                >
                  <ThemedText style={{ color: colors.primario, fontWeight: 'bold' }}>Ver salida →</ThemedText>
                </TouchableOpacity>
              )}

              {r.estado === 'activa' && puedeReservar && convirtiendo !== r.id && (
                <View style={{ flexDirection: 'row', gap: 16, marginTop: 4 }}>
                  <TouchableOpacity onPress={() => abrirConversion(r)}>
                    <ThemedText style={{ color: colors.primario, fontWeight: 'bold' }}>Convertir en salida</ThemedText>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => cancelar(r)}>
                    <ThemedText style={{ color: colors.error, fontWeight: 'bold' }}>Cancelar</ThemedText>
                  </TouchableOpacity>
                </View>
              )}

              {convirtiendo === r.id && (
                <View style={{ gap: 12, marginTop: 8 }}>
                  <ThemedText style={{ fontWeight: 'bold' }}>¿De dónde salen las unidades?</ThemedText>
                  {existencias.length === 0 && (
                    <ThemedText type="suave">Este producto no tiene unidades en ninguna ubicación.</ThemedText>
                  )}
                  <Opciones
                    opciones={existencias.map((e) => ({
                      valor: e.ubicacionId,
                      titulo: `${e.texto} (${e.cantidad})`,
                    }))}
                    valor={ubicacionId}
                    onChange={setUbicacionId}
                  />

                  <ThemedText style={{ fontWeight: 'bold' }}>Motivo de la salida</ThemedText>
                  <Opciones
                    opciones={motivosSalida.map((m) => ({ valor: m.id, titulo: m.nombre }))}
                    valor={motivoId}
                    onChange={setMotivoId}
                  />

                  {errorConversion !== '' && <ThemedText type="error">{errorConversion}</ThemedText>}

                  <ThemedButton
                    titulo="Confirmar salida"
                    onPress={() => confirmarConversion(r)}
                    cargando={procesando}
                  />
                  <TouchableOpacity onPress={() => setConvirtiendo(null)}>
                    <ThemedText style={{ color: colors.textoSuave, fontWeight: 'bold', textAlign: 'center' }}>
                      Cerrar
                    </ThemedText>
                  </TouchableOpacity>
                </View>
              )}
            </ThemedCard>
          ))}

          {!cargando && error === '' && reservas.length === 0 && (
            <ThemedText type="suave">
              {filtro === 'activa' ? 'No hay reservas activas.' : 'Aún no hay reservas.'}
            </ThemedText>
          )}
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}