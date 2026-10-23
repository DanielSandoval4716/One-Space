import { cerrarSesion, obtenerSesion } from '@/auth';
import { ThemedButton } from '@/components/ThemedButton';
import { ThemedCard } from '@/components/ThemedCard';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Resumen, obtenerResumen } from '@/dashboard';
import { Perfil, obtenerPerfil, puedeVer } from '@/permisos';
import { useTheme } from '@/theme';
import { Href, useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, RefreshControl, ScrollView, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const modulos: { titulo: string; ruta?: Href; permisos?: string[] }[] = [
  { titulo: 'Productos', ruta: '/productos' },
  { titulo: 'Inventario', ruta: '/inventario' },
  { titulo: 'Bodegas', ruta: '/bodegas' },
  { titulo: 'Movimientos', ruta: '/movimientos' },
  { titulo: 'Conteos', ruta: '/conteos', permisos: ['conteos.realizar'] },
  { titulo: 'Directorio', ruta: '/directorio', permisos: ['proveedores.gestionar', 'personas.gestionar'] },
  { titulo: 'Documentos', ruta: '/documentos' },
  { titulo: 'Reportes', ruta: '/reportes', permisos: ['reportes.ver'] },
  { titulo: 'Auditoría', ruta: '/auditoria', permisos: ['auditoria.ver'] },
];

const TIPOS: Record<string, string> = {
  entrada: 'Entrada',
  salida: 'Salida',
  transferencia: 'Transferencia',
  ajuste: 'Ajuste',
};

function formatearFecha(fecha: string) {
  const f = new Date(fecha);
  const dos = (n: number) => String(n).padStart(2, '0');
  return `${dos(f.getDate())}/${dos(f.getMonth() + 1)} ${dos(f.getHours())}:${dos(f.getMinutes())}`;
}

export default function Dashboard() {
  const router = useRouter();
  const colors = useTheme();

  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const [resumen, setResumen] = useState<Resumen | null>(null);
  const [cargando, setCargando] = useState(true);

  //sesion
  const cargar = useCallback(async () => {
    setCargando(true);
    const session = await obtenerSesion();
    if (!session) {
      router.replace('/login');
      return;
    }

    const p = await obtenerPerfil(session.user.id);
    setPerfil(p);
    setResumen(p ? await obtenerResumen(p.permisos.includes('auditoria.ver')) : null);
    setCargando(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      cargar();
    }, [cargar])
  );

  function abrir(modulo: { titulo: string; ruta?: Href }) {
    if (modulo.ruta) router.push(modulo.ruta);
    else Alert.alert(modulo.titulo, 'Esta sección aún no está disponible.');
  }

  async function salir() {
    await cerrarSesion();
    router.replace('/login');
  }

  const subtitulo = { fontSize: 18, fontWeight: 'bold' } as const;

  // Alertas que se muestran en el dashboard.
  const p = resumen?.pendientes;
  const alertas = resumen
    ? [
        resumen.stockBajo > 0 && `${resumen.stockBajo} producto(s) con existencias bajas`,
        p && p.conteos > 0 && `${p.conteos} conteo(s) en progreso`,
        p && p.ajustes > 0 && `${p.ajustes} ajuste(s) por autorizar`,
        p && p.reservas > 0 && `${p.reservas} reserva(s) activa(s)`,
      ].filter((a): a is string => !!a)
    : [];

  return (
    <ThemedView style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={{ padding: 24, gap: 16 }}
          refreshControl={<RefreshControl refreshing={cargando} onRefresh={cargar} />}
        >
          <View>
            <ThemedText type="titulo">Dashboard</ThemedText>
            {perfil && (
              <ThemedText type="suave">
                {perfil.nombre} · {perfil.rol}
              </ThemedText>
            )}
          </View>

          {/* Sin rol, no hay permisos, no se muestra*/}
          {!cargando && !perfil && (
            <ThemedCard>
              <ThemedText type="error">
                Tu usuario no tiene un rol asignado. Pide a un administrador que lo configure.
              </ThemedText>
            </ThemedCard>
          )}

          {perfil && resumen && (
            <>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
                <Dato titulo="Productos registrados" valor={resumen.productos} />
                <Dato titulo="Existencias actuales" valor={resumen.existencias} />
                <Dato
                  titulo="Existencias bajas"
                  valor={resumen.stockBajo}
                  color={resumen.stockBajo > 0 ? colors.aviso : undefined}
                />
              </View>

              <ThemedText style={subtitulo}>Alertas</ThemedText>
              {alertas.length === 0 && <ThemedText type="suave">Sin alertas.</ThemedText>}
              {alertas.map((a) => (
                <ThemedCard key={a}>
                  <ThemedText style={{ color: colors.aviso }}>⚠ {a}</ThemedText>
                </ThemedCard>
              ))}

              {/* Accesos: solo las áreas que el rol permite */}
              <ThemedText style={subtitulo}>Accesos</ThemedText>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
                {modulos
                  .filter((m) => puedeVer(perfil, m.permisos))
                  .map((m) => (
                    <TouchableOpacity key={m.titulo} style={{ width: '47.5%' }} onPress={() => abrir(m)}>
                      <ThemedCard>
                        <ThemedText style={{ fontWeight: 'bold' }}>{m.titulo}</ThemedText>
                      </ThemedCard>
                    </TouchableOpacity>
                  ))}
              </View>

              {/* Movimientos recientes */}
              <ThemedText style={subtitulo}>Movimientos recientes</ThemedText>
              {resumen.movimientos.length === 0 && <ThemedText type="suave">Aún no hay movimientos.</ThemedText>}
              {resumen.movimientos.map((m) => (
                <ThemedCard key={m.id}>
                  <ThemedText>
                    {TIPOS[m.tipo] ?? m.tipo}: {m.cantidad} · {m.productos?.marcas?.nombre} {m.productos?.modelo}
                  </ThemedText>
                  <ThemedText type="suave">{formatearFecha(m.fecha)}</ThemedText>
                </ThemedCard>
              ))}

              {/* Operaciones recientes (solo con permiso de auditoría) */}
              {resumen.operaciones && (
                <>
                  <ThemedText style={subtitulo}>Operaciones recientes</ThemedText>
                  {resumen.operaciones.length === 0 && <ThemedText type="suave">Aún no hay operaciones.</ThemedText>}
                  {resumen.operaciones.map((o) => (
                    <ThemedCard key={o.id}>
                      <ThemedText>{o.accion}</ThemedText>
                      <ThemedText type="suave">{formatearFecha(o.fecha)}</ThemedText>
                    </ThemedCard>
                  ))}
                </>
              )}
            </>
          )}

          <ThemedButton titulo="Cerrar sesión" onPress={salir} />
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

function Dato({ titulo, valor, color }: { titulo: string; valor: number | string; color?: string }) {
  return (
    <ThemedCard style={{ width: '47.5%' }}>
      <ThemedText type="suave">{titulo}</ThemedText>
      <ThemedText style={[{ fontSize: 28, fontWeight: 'bold' }, color ? { color } : null]}>{valor}</ThemedText>
    </ThemedCard>
  );
}
