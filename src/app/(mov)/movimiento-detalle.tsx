import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { obtenerSesion } from '@/auth';
import { ThemedCard } from '@/components/ThemedCard';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import {
    ETIQUETA_TIPO,
    Movimiento,
    RegistroAuditoria,
    formatearFechaHora,
    nombreProducto,
    obtenerAuditoriaDeMovimiento,
    obtenerMovimiento,
    obtenerNombreUsuario,
    textoCantidad,
    textoLugar,
} from '@/movimientos';
import { obtenerPerfil, puedeVer } from '@/permisos';
import { useTheme } from '@/theme';

export default function MovimientoDetalle() {
  const router = useRouter();
  const colors = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [movimiento, setMovimiento] = useState<Movimiento | null>(null);
  const [usuario, setUsuario] = useState<string | null>(null);
  // null = el usuario no tiene permiso para ver la auditoría
  const [auditoria, setAuditoria] = useState<RegistroAuditoria[] | null>(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    async function cargar() {
      const session = await obtenerSesion();
      if (!session) {
        router.replace('/login');
        return;
      }

      const m = await obtenerMovimiento(Number(id));
      setMovimiento(m);

      if (m) {
        setUsuario(await obtenerNombreUsuario(m.usuario_id));
        const perfil = await obtenerPerfil(session.user.id);
        if (puedeVer(perfil, ['auditoria.ver'])) {
          setAuditoria(await obtenerAuditoriaDeMovimiento(m.id));
        }
      }
      setCargando(false);
    }
    cargar();
  }, [id]);

  if (cargando || !movimiento) {
    return (
      <ThemedView style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 }}>
        <ThemedText>{cargando ? 'Cargando...' : 'Movimiento no encontrado.'}</ThemedText>
        {!cargando && (
          <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 16 }}>
            <ThemedText style={{ color: colors.primario, fontWeight: 'bold' }}>← Volver</ThemedText>
          </TouchableOpacity>
        )}
      </ThemedView>
    );
  }

  const filas: [string, string | null][] = [
    ['Fecha y hora', formatearFechaHora(movimiento.fecha)],
    ['Tipo de movimiento', ETIQUETA_TIPO[movimiento.tipo] ?? movimiento.tipo],
    ['Producto', nombreProducto(movimiento)],
    ['Tipo de producto', movimiento.producto?.tipos_producto?.nombre ?? null],
    ['Cantidad', textoCantidad(movimiento)],
    ['Ubicación de origen', textoLugar(movimiento.origen)],
    ['Ubicación de destino', textoLugar(movimiento.destino)],
    ['Motivo', movimiento.motivo?.nombre ?? '—'],
    ['Proveedor', movimiento.proveedor?.nombre ?? null],
    ['Persona responsable', movimiento.persona?.nombre ?? null],
    [
      'Evidencia',
      movimiento.documento ? `${movimiento.documento.nombre} (${movimiento.documento.tipo})` : null,
    ],
    ['Observaciones', movimiento.observaciones || '—'],
    ['Registrado por', usuario ?? '—'],
  ];

  return (
    <ThemedView style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ padding: 24, gap: 16 }}>
          <TouchableOpacity onPress={() => router.back()}>
            <ThemedText style={{ color: colors.primario, fontWeight: 'bold' }}>← Volver</ThemedText>
          </TouchableOpacity>

          <ThemedText type="titulo">Detalle del movimiento</ThemedText>

          <ThemedCard style={{ gap: 12 }}>
            <ThemedText style={{ fontSize: 22, fontWeight: 'bold' }}>
              {ETIQUETA_TIPO[movimiento.tipo] ?? movimiento.tipo} · {nombreProducto(movimiento)}
            </ThemedText>
            {filas.map(([titulo, valor]) =>
              valor === null ? null : <Dato key={titulo} titulo={titulo} valor={valor} />
            )}
          </ThemedCard>

          {/* Solo con permiso de auditoría */}
          {auditoria && (
            <ThemedCard style={{ gap: 8 }}>
              <ThemedText style={{ fontWeight: 'bold' }}>Auditoría</ThemedText>
              {auditoria.length === 0 && (
                <ThemedText type="suave">
                  No se encontró un registro de auditoría para este movimiento.
                </ThemedText>
              )}
              {auditoria.map((a) => (
                <View key={a.id}>
                  <ThemedText>{a.accion}</ThemedText>
                  <ThemedText type="suave">{formatearFechaHora(a.fecha)}</ThemedText>
                </View>
              ))}
            </ThemedCard>
          )}
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

function Dato({ titulo, valor }: { titulo: string; valor: string }) {
  return (
    <View>
      <ThemedText type="suave">{titulo}</ThemedText>
      <ThemedText>{valor}</ThemedText>
    </View>
  );
}