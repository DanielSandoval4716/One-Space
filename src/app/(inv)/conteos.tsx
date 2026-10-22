import { obtenerSesion } from '@/auth';
import { ThemedButton } from '@/components/ThemedButton';
import { ThemedCard } from '@/components/ThemedCard';
import { ThemedInput } from '@/components/ThemedInput';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import {
    agregarProductoConteo,
    Conteo,
    crearConteo,
    DetalleConteo,
    finalizarConteo,
    formatearFechaConteo,
    nombreProductoConteo,
    obtenerConteos,
    registrarCantidadConteo,
    ubicacionConteo,
} from '@/conteos';
import {
    obtenerProductosOpcion,
    obtenerUbicacionesOpcion,
} from '@/opcionesInventario';
import { obtenerPerfil, Perfil, puedeVer } from '@/permisos';
import { useTheme } from '@/theme';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
    Alert,
    RefreshControl,
    ScrollView,
    TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function Conteos() {
  const router = useRouter();
  const colors = useTheme();
  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const [conteos, setConteos] = useState<Conteo[]>([]);
  const [ubicaciones, setUbicaciones] = useState<any[]>([]);
  const [productos, setProductos] = useState<any[]>([]);
  const [seleccionadoId, setSeleccionadoId] = useState<number | null>(null);

  const [cargando, setCargando] = useState(true);
  const [creando, setCreando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [guardandoDetalle, setGuardandoDetalle] = useState<number | null>(null);
  const [ubicacionId, setUbicacionId] = useState<number | null>(null);
  const [observaciones, setObservaciones] = useState('');
  const [cantidades, setCantidades] = useState<Record<number, string>>({});
  const [busqueda, setBusqueda] = useState('');
  const [error, setError] = useState('');

  const seleccionado =
    conteos.find((c) => c.id === seleccionadoId) ?? null;

  const autorizado = puedeVer(perfil, ['conteos.realizar']);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError('');

    const session = await obtenerSesion();

    if (!session) {
      setCargando(false);
      router.replace('/login');
      return;
    }

    const p = await obtenerPerfil(session.user.id);
    setPerfil(p);

    if (!puedeVer(p, ['conteos.realizar'])) {
      setCargando(false);
      return;
    }

    const [lista, lugares, productosDisponibles] = await Promise.all([
      obtenerConteos(),
      obtenerUbicacionesOpcion(),
      obtenerProductosOpcion(),
    ]);

    if (lista === null) {
      setError('No se pudieron cargar los conteos. Revisa la conexión y los permisos de Supabase.');
    } else {
      setConteos(lista);
    }

    setUbicaciones(lugares);
    setProductos(productosDisponibles);
    setCargando(false);
  }, [router]);

  useFocusEffect(
    useCallback(() => {
      cargar();
    }, [cargar])
  );

  async function actualizarConteos(idPreferido?: number) {
    const lista = await obtenerConteos();

    if (lista === null) {
      Alert.alert('Error', 'No se pudieron actualizar los conteos.');
      return;
    }

    setConteos(lista);

    if (idPreferido !== undefined) {
      setSeleccionadoId(idPreferido);
    }
  }

  async function iniciarConteo() {
    if (ubicacionId === null) {
      Alert.alert('Falta la ubicación', 'Selecciona una ubicación para iniciar el conteo.');
      return;
    }

    setGuardando(true);

    const resultado = await crearConteo(ubicacionId, observaciones);

    setGuardando(false);

    if (resultado.id === null) {
      Alert.alert('No se pudo iniciar el conteo', resultado.error ?? 'Intenta de nuevo.');
      return;
    }

    setCreando(false);
    setUbicacionId(null);
    setObservaciones('');
    setCantidades({});
    await actualizarConteos(resultado.id);
  }

  async function guardarCantidad(detalle: DetalleConteo) {
    const texto = cantidades[detalle.id] ??
      (detalle.cantidad_fisica === null ? '' : String(detalle.cantidad_fisica));

    const numero = Number(texto.trim().replace(',', '.'));

    if (texto.trim() === '' || !Number.isFinite(numero) || numero < 0) {
      Alert.alert('Cantidad inválida', 'Escribe una cantidad igual o mayor que cero.');
      return;
    }

    setGuardandoDetalle(detalle.id);

    const resultado = await registrarCantidadConteo(detalle.id, numero);

    setGuardandoDetalle(null);

    if (!resultado.ok) {
      Alert.alert('No se pudo guardar', resultado.error ?? 'Intenta de nuevo.');
      return;
    }

    await actualizarConteos(seleccionadoId ?? undefined);
  }

  async function agregarProducto(producto: any) {
    if (!seleccionado || seleccionado.estado !== 'en_progreso') return;

    const resultado = await agregarProductoConteo(
      seleccionado.id,
      producto.id
    );

    if (!resultado.ok) {
      Alert.alert('No se pudo agregar', resultado.error ?? 'Revisa si el producto ya está incluido.');
      return;
    }

    setBusqueda('');
    await actualizarConteos(seleccionado.id);
  }

  function confirmarFinalizacion() {
    if (!seleccionado) return;

    const pendientes = seleccionado.detalles.filter(
      (d) => d.cantidad_fisica === null
    ).length;

    if (pendientes > 0) {
      Alert.alert(
        'Faltan cantidades',
        `Todavía debes registrar la cantidad física de ${pendientes} producto(s).`
      );
      return;
    }

    Alert.alert(
      'Finalizar conteo',
      'Se guardará la comparación. Las existencias del inventario no cambiarán.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Finalizar',
          onPress: async () => {
            setGuardando(true);
            const resultado = await finalizarConteo(seleccionado.id);
            setGuardando(false);

            if (!resultado.ok) {
              Alert.alert('No se pudo finalizar', resultado.error ?? 'Intenta de nuevo.');
              return;
            }

            await actualizarConteos(seleccionado.id);
          },
        },
      ]
    );
  }

  const productosFiltrados = productos
    .filter((p) => {
      const texto = `${p.nombre} ${p.tipo} ${p.id}`.toLowerCase();
      const coincide = texto.includes(busqueda.trim().toLowerCase());
      const noAgregado = !seleccionado?.detalles.some(
        (d) => d.producto_id === p.id
      );
      return coincide && noAgregado;
    })
    .slice(0, 8);

  return (
    <ThemedView style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={{ padding: 24, gap: 14 }}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl refreshing={cargando} onRefresh={cargar} />
          }
        >
          <TouchableOpacity
            onPress={() => {
              if (seleccionadoId !== null) {
                setSeleccionadoId(null);
              } else {
                router.back();
              }
            }}
          >
            <ThemedText style={{ color: colors.primario, fontWeight: 'bold' }}>
              ← {seleccionadoId !== null ? 'Volver a conteos' : 'Volver'}
            </ThemedText>
          </TouchableOpacity>

          <ThemedText type="titulo">
            {seleccionado ? `Conteo #${seleccionado.id}` : 'Conteos'}
          </ThemedText>

          <ThemedText type="suave">
            Registra las cantidades físicas y compara los resultados sin modificar directamente las existencias.
          </ThemedText>

          {!cargando && !autorizado && (
            <ThemedCard>
              <ThemedText type="error">
                No tienes permiso para realizar conteos. Solicita que te asignen el permiso conteos.realizar.
              </ThemedText>
            </ThemedCard>
          )}

          {autorizado && !seleccionado && (
            <>
              {!creando && (
                <ThemedButton
                  titulo="+ Nuevo conteo"
                  onPress={() => setCreando(true)}
                />
              )}

              {creando && (
                <ThemedCard style={{ gap: 12 }}>
                  <ThemedText style={{ fontSize: 18, fontWeight: 'bold' }}>
                    Nuevo conteo
                  </ThemedText>

                  <ThemedText>Selecciona la ubicación:</ThemedText>

                  {ubicaciones.map((u) => (
                    <TouchableOpacity
                      key={u.id}
                      onPress={() => setUbicacionId(u.id)}
                    >
                      <ThemedCard
                        style={{
                          borderWidth: 1,
                          borderColor:
                            ubicacionId === u.id ? colors.primario : colors.borde,
                          gap: 4,
                        }}
                      >
                        <ThemedText style={{ fontWeight: 'bold' }}>
                          {u.bodega || 'Bodega'} › {u.nombre}
                        </ThemedText>
                        {ubicacionId === u.id && (
                          <ThemedText style={{ color: colors.primario }}>
                            Ubicación seleccionada
                          </ThemedText>
                        )}
                      </ThemedCard>
                    </TouchableOpacity>
                  ))}

                  {ubicaciones.length === 0 && (
                    <ThemedText type="suave">
                      No hay ubicaciones registradas. Crea una desde Bodegas.
                    </ThemedText>
                  )}

                  <ThemedInput
                    placeholder="Observaciones (opcional)"
                    value={observaciones}
                    onChangeText={setObservaciones}
                    multiline
                  />

                  <ThemedButton
                    titulo="Iniciar conteo"
                    onPress={iniciarConteo}
                    cargando={guardando}
                  />

                  <ThemedButton
                    titulo="Cancelar"
                    onPress={() => {
                      setCreando(false);
                      setUbicacionId(null);
                      setObservaciones('');
                    }}
                  />
                </ThemedCard>
              )}

              <ThemedText style={{ fontSize: 18, fontWeight: 'bold' }}>
                Historial de conteos
              </ThemedText>

              {conteos.length === 0 && !cargando && (
                <ThemedText type="suave">
                  Todavía no hay conteos registrados.
                </ThemedText>
              )}

              {conteos.map((c) => {
                const diferencias = c.detalles.filter(
                  (d) => d.cantidad_fisica !== null && d.diferencia !== 0
                ).length;

                return (
                  <TouchableOpacity
                    key={c.id}
                    onPress={() => setSeleccionadoId(c.id)}
                  >
                    <ThemedCard style={{ gap: 6 }}>
                      <ThemedText style={{ fontSize: 17, fontWeight: 'bold' }}>
                        Conteo #{c.id}
                      </ThemedText>
                      <ThemedText>{ubicacionConteo(c)}</ThemedText>
                      <ThemedText type="suave">
                        {formatearFechaConteo(c.creado_en)}
                      </ThemedText>
                      <ThemedText
                        style={{
                          color: c.estado === 'en_progreso' ? colors.aviso : colors.exito,
                          fontWeight: 'bold',
                        }}
                      >
                        {c.estado === 'en_progreso' ? 'En progreso' : 'Finalizado'}
                      </ThemedText>
                      <ThemedText type="suave">
                        {c.detalles.length} producto(s)
                        {c.estado === 'finalizado'
                          ? ` · ${diferencias} con diferencia`
                          : ''}
                      </ThemedText>
                    </ThemedCard>
                  </TouchableOpacity>
                );
              })}
            </>
          )}

          {autorizado && seleccionado && (
            <>
              <ThemedCard style={{ gap: 6 }}>
                <ThemedText style={{ fontWeight: 'bold' }}>
                  {ubicacionConteo(seleccionado)}
                </ThemedText>
                <ThemedText type="suave">
                  Iniciado: {formatearFechaConteo(seleccionado.creado_en)}
                </ThemedText>
                <ThemedText
                  style={{
                    color: seleccionado.estado === 'en_progreso' ? colors.aviso : colors.exito,
                    fontWeight: 'bold',
                  }}
                >
                  {seleccionado.estado === 'en_progreso' ? 'En progreso' : 'Finalizado'}
                </ThemedText>
                {seleccionado.observaciones && (
                  <ThemedText type="suave">{seleccionado.observaciones}</ThemedText>
                )}
              </ThemedCard>

              {seleccionado.estado === 'en_progreso' && (
                <ThemedCard style={{ gap: 10 }}>
                  <ThemedText style={{ fontSize: 17, fontWeight: 'bold' }}>
                    Agregar producto
                  </ThemedText>

                  <ThemedInput
                    placeholder="Buscar producto por nombre o UUID"
                    value={busqueda}
                    onChangeText={setBusqueda}
                    autoCapitalize="none"
                  />

                  {productosFiltrados.map((p) => (
                    <TouchableOpacity
                      key={p.id}
                      onPress={() => agregarProducto(p)}
                    >
                      <ThemedText style={{ color: colors.primario, paddingVertical: 7 }}>
                        + {p.nombre} {p.unidad ? `(${p.unidad})` : ''}
                      </ThemedText>
                    </TouchableOpacity>
                  ))}
                </ThemedCard>
              )}

              <ThemedText style={{ fontSize: 18, fontWeight: 'bold' }}>
                Productos del conteo
              </ThemedText>

              {seleccionado.detalles.length === 0 && (
                <ThemedText type="suave">
                  No hay productos incluidos en este conteo todavía.
                </ThemedText>
              )}

              {seleccionado.detalles.map((d) => {
                const diferencia = d.diferencia;
                const cantidadTexto =
                  cantidades[d.id] ??
                  (d.cantidad_fisica === null ? '' : String(d.cantidad_fisica));

                return (
                  <ThemedCard key={d.id} style={{ gap: 8 }}>
                    <ThemedText style={{ fontSize: 16, fontWeight: 'bold' }}>
                      {nombreProductoConteo(d)}
                    </ThemedText>

                    <ThemedText type="suave">
                      Registrado en sistema: {d.cantidad_sistema}
                      {d.producto?.unidades_medida?.abreviatura
                        ? ` ${d.producto.unidades_medida.abreviatura}`
                        : ''}
                    </ThemedText>

                    {seleccionado.estado === 'en_progreso' ? (
                      <>
                        <ThemedInput
                          placeholder="Cantidad física encontrada"
                          keyboardType="decimal-pad"
                          value={cantidadTexto}
                          onChangeText={(v) =>
                            setCantidades((actual) => ({ ...actual, [d.id]: v }))
                          }
                        />

                        <ThemedButton
                          titulo="Guardar cantidad"
                          cargando={guardandoDetalle === d.id}
                          onPress={() => guardarCantidad(d)}
                        />
                      </>
                    ) : (
                      <ThemedText>
                        Cantidad física: {d.cantidad_fisica ?? 'Sin registrar'}
                      </ThemedText>
                    )}

                    {d.cantidad_fisica !== null && (
                      <ThemedText
                        style={{
                          fontWeight: 'bold',
                          color:
                            diferencia === 0
                              ? colors.exito
                              : colors.aviso,
                        }}
                      >
                        Diferencia: {(diferencia ?? 0) > 0 ? '+' : ''}
                        {diferencia ?? 0}
                        {diferencia === 0
                          ? ' · Coincide'
                          : ' · Revisar diferencia'}
                      </ThemedText>
                    )}
                  </ThemedCard>
                );
              })}

              {seleccionado.estado === 'en_progreso' && (
                <ThemedButton
                  titulo="Finalizar conteo"
                  onPress={confirmarFinalizacion}
                  cargando={guardando}
                />
              )}

              {seleccionado.estado === 'finalizado' && (
                <ThemedCard>
                  <ThemedText style={{ fontWeight: 'bold' }}>
                    Conteo finalizado
                  </ThemedText>
                  <ThemedText type="suave">
                    Las diferencias se guardaron para revisión. Este proceso no modificó las existencias.
                  </ThemedText>
                </ThemedCard>
              )}
            </>
          )}

          {error !== '' && <ThemedText type="error">{error}</ThemedText>}
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}