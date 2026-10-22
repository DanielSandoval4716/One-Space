import { Href, useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, ScrollView, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { obtenerSesion } from '@/auth';
import { ThemedButton } from '@/components/ThemedButton';
import { ThemedCard } from '@/components/ThemedCard';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Opciones } from '@/components/inventario/Opciones';
import { Reserva, cancelarReserva, reservasPrueba } from '@/data/reservasPrueba';
import { formatearFechaHora } from '@/movimientos';
import { Perfil, obtenerPerfil, puedeVer } from '@/permisos';
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
  // Se guarda una copia en el estado para que la pantalla se actualice al cambiar
  const [reservas, setReservas] = useState<Reserva[]>([]);

  useFocusEffect(
    useCallback(() => {
      obtenerSesion().then(async (session) => {
        if (!session) {
          router.replace('/login');
          return;
        }
        setPerfil(await obtenerPerfil(session.user.id));
        setReservas([...reservasPrueba]);
      });
    }, [])
  );

  function cancelar(reserva: Reserva) {
    Alert.alert('Cancelar reserva', `¿Cancelar la reserva de ${reserva.cantidad} ${reserva.unidad} de ${reserva.producto}?`, [
      { text: 'No', style: 'cancel' },
      {
        text: 'Sí, cancelar',
        style: 'destructive',
        onPress: () => {
          // TODO: guardar en Supabase y registrar la operación en Auditoría.
          cancelarReserva(reserva.id);
          setReservas([...reservasPrueba]);
        },
      },
    ]);
  }

  // Abre el formulario de Salida con los datos de la reserva ya llenos.
  // Al guardar la salida, la reserva queda como convertida (ver operacion.tsx).
  function convertirEnSalida(reserva: Reserva) {
    const datos = [
      ['tipo', 'salida'],
      ['productoId', reserva.productoId],
      ['cantidad', String(reserva.cantidad)],
      ['reservaId', String(reserva.id)],
      ['responsable', reserva.responsable],
      ['nota', `Reserva: ${reserva.motivo}`],
    ];
    const consulta = datos.map(([clave, valor]) => `${clave}=${encodeURIComponent(valor)}`).join('&');
    router.push(`/operacion?${consulta}` as Href);
  }

  const visibles = reservas
    .filter((r) => filtro === 'todas' || r.estado === 'activa')
    .sort((a, b) => b.fecha.localeCompare(a.fecha));

  return (
    <ThemedView style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ padding: 24, gap: 16 }}>
          <TouchableOpacity onPress={() => router.back()}>
            <ThemedText style={{ color: colors.primario, fontWeight: 'bold' }}>← Volver</ThemedText>
          </TouchableOpacity>

          <View>
            <ThemedText type="titulo">Reservas</ThemedText>
            <ThemedText type="suave">
              Unidades apartadas para una operación futura, sin hacer todavía una salida.
            </ThemedText>
          </View>

          {puedeVer(perfil, ['inventario.reserva']) && (
            <ThemedButton titulo="+ Nueva reserva" onPress={() => router.push('/reserva-nueva')} />
          )}

          {/* TODO: quitar este aviso cuando las reservas se guarden en Supabase */}
          <ThemedText type="suave" style={{ fontSize: 14 }}>
            Por ahora las reservas se guardan solo en el teléfono (datos de prueba).
          </ThemedText>

          <Opciones opciones={FILTROS} valor={filtro} onChange={setFiltro} />

          {visibles.map((r) => (
            <ThemedCard key={r.id} style={{ gap: 6 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
                <ThemedText style={{ fontSize: 19, fontWeight: 'bold', flexShrink: 1 }}>{r.producto}</ThemedText>
                <ThemedText style={{ fontSize: 19, fontWeight: 'bold', color: colors.primario }}>
                  {r.cantidad} {r.unidad}
                </ThemedText>
              </View>
              <ThemedText type="suave">Motivo o destino: {r.motivo}</ThemedText>
              <ThemedText type="suave">Responsable: {r.responsable || '—'}</ThemedText>
              <ThemedText type="suave">{formatearFechaHora(r.fecha)}</ThemedText>
              <ThemedText
                style={{
                  fontWeight: 'bold',
                  color: r.estado === 'activa' ? colors.exito : colors.textoSuave,
                }}
              >
                {ESTADOS[r.estado]}
              </ThemedText>

              {r.estado === 'activa' && puedeVer(perfil, ['inventario.reserva']) && (
                <View style={{ flexDirection: 'row', gap: 16, marginTop: 4 }}>
                  <TouchableOpacity onPress={() => convertirEnSalida(r)}>
                    <ThemedText style={{ color: colors.primario, fontWeight: 'bold' }}>Convertir en salida</ThemedText>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => cancelar(r)}>
                    <ThemedText style={{ color: colors.error, fontWeight: 'bold' }}>Cancelar</ThemedText>
                  </TouchableOpacity>
                </View>
              )}
            </ThemedCard>
          ))}

          {visibles.length === 0 && (
            <ThemedText type="suave">
              {filtro === 'activa' ? 'No hay reservas activas.' : 'Aún no hay reservas.'}
            </ThemedText>
          )}
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}