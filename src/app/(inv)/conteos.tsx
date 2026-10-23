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
  obtenerExistenciaActual,
  productosContados,
  quitarProductoConteo,
  registrarCantidadConteo,
  tipoProductoConteo,
  ubicacionConteo,
} from '@/conteos';
import {
  obtenerProductosOpcion,
  obtenerUbicacionesOpcion,
  ProductoOpcion,
  UbicacionOpcion,
} from '@/opcionesInventario';
import { obtenerPerfil, Perfil, puedeVer } from '@/permisos';
import { useTheme } from '@/theme';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  RefreshControl,
  ScrollView,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Convierte el texto escrito en número. Devuelve null si no es válido.
function leerNumero(texto: string): number | null {
  const limpio = texto.trim().replace(',', '.');
  if (limpio === '') return null;
  const n = Number(limpio);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

// Código corto para distinguir productos que se llaman igual.
const refCorta = (id: string) => id.slice(0, 4);

export default function Conteos() {
  const router = useRouter();
  const colors = useTheme();
  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const [conteos, setConteos] = useState<Conteo[]>([]);
  const [ubicaciones, setUbicaciones] = useState<UbicacionOpcion[]>([]);
  const [productos, setProductos] = useState<ProductoOpcion[]>([]);
  const [seleccionadoId, setSeleccionadoId] = useState<number | null>(null);

  const [cargando, setCargando] = useState(true);
  const [creando, setCreando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [agregando, setAgregando] = useState(false);
  const [guardandoDetalle, setGuardandoDetalle] = useState<number | null>(null);
  const [ubicacionId, setUbicacionId] = useState<number | null>(null);
  const [observaciones, setObservaciones] = useState('');
  const [cantidades, setCantidades] = useState<Record<number, string>>({});
  const [busqueda, setBusqueda] = useState('');
  const [error, setError] = useState('');
  // Existencia actual (por producto) del conteo finalizado que se está viendo
  const [actuales, setActuales] = useState<Record<string, number> | null>(null);

  const seleccionado = conteos.find((c) => c.id === seleccionadoId) ?? null;
  const autorizado = puedeVer(perfil, ['conteos.realizar']);
  const puedeAjustar = puedeVer(perfil, ['inventario.ajuste']);

  // Un producto cuenta como "contado" si ya tiene cantidad guardada
  // o si el usuario ya escribió una cantidad válida (aunque no haya pulsado Guardar).
  function estaContado(d: DetalleConteo) {
    return d.cantidad_fisica !== null || leerNumero(cantidades[d.id] ?? '') !== null;
  }

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

  // En un conteo finalizado, se lee la existencia actual para saber qué diferencias ya se ajustaron.
  useEffect(() => {
    setActuales(null);
    if (!seleccionado || seleccionado.estado !== 'finalizado') return;

    let vigente = true;
    const conDiferencia = seleccionado.detalles
      .filter((d) => d.diferencia !== null && d.diferencia !== 0)
      .map((d) => d.producto_id);

    obtenerExistenciaActual(seleccionado.ubicacion_id, conDiferencia).then((r) => {
      if (vigente) setActuales(r);
    });
    return () => {
      vigente = false;
    };
  }, [seleccionado]);

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
    const texto =
      cantidades[detalle.id] ??
      (detalle.cantidad_fisica === null ? '' : String(detalle.cantidad_fisica));

    const numero = leerNumero(texto);

    if (numero === null) {
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

  // Guarda todas las cantidades escritas que todavía no se hayan guardado.
  // Devuelve false si alguna falló (ya avisó al usuario).
  async function guardarBorradores(conteo: Conteo): Promise<boolean> {
    for (const d of conteo.detalles) {
      const texto = cantidades[d.id];
      if (texto === undefined || texto.trim() === '') continue;

      const numero = leerNumero(texto);
      if (numero === null) {
        Alert.alert('Cantidad inválida', `Revisa la cantidad de ${nombreProductoConteo(d)}.`);
        return false;
      }
      if (numero === d.cantidad_fisica) continue; // ya estaba guardada

      const resultado = await registrarCantidadConteo(d.id, numero);
      if (!resultado.ok) {
        Alert.alert(
          `No se pudo guardar ${nombreProductoConteo(d)}`,
          resultado.error ?? 'Intenta de nuevo.'
        );
        return false;
      }
    }
    return true;
  }

  async function agregarProducto(producto: ProductoOpcion) {
    if (!seleccionado || seleccionado.estado !== 'en_progreso' || agregando) return;

    setAgregando(true);
    const resultado = await agregarProductoConteo(seleccionado.id, producto.id);
    setAgregando(false);

    if (!resultado.ok) {
      Alert.alert('No se pudo agregar', resultado.error ?? 'Revisa si el producto ya está incluido.');
      return;
    }

    setBusqueda('');
    await actualizarConteos(seleccionado.id);
  }

  function quitarProducto(d: DetalleConteo) {
    Alert.alert(
      'Quitar producto',
      `¿Quitar ${nombreProductoConteo(d)} de este conteo?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Quitar',
          style: 'destructive',
          onPress: async () => {
            setGuardandoDetalle(d.id);
            const resultado = await quitarProductoConteo(d.id);
            setGuardandoDetalle(null);

            if (!resultado.ok) {
              Alert.alert('No se pudo quitar', resultado.error ?? 'Intenta de nuevo.');
              return;
            }

            setCantidades((actual) => {
              const { [d.id]: _quitado, ...resto } = actual;
              return resto;
            });
            await actualizarConteos(seleccionadoId ?? undefined);
          },
        },
      ]
    );
  }

  function confirmarFinalizacion() {
    if (!seleccionado || guardando) return;
    const conteo = seleccionado;

    if (conteo.detalles.length === 0) {
      Alert.alert('Conteo vacío', 'Agrega al menos un producto antes de confirmar el conteo.');
      return;
    }

    const pendientes = conteo.detalles.filter((d) => !estaContado(d)).length;

    if (pendientes > 0) {
      Alert.alert(
        'Faltan cantidades',
        `Todavía debes registrar la cantidad física de ${pendientes} producto(s). ` +
          'Si alguno no está en esta ubicación, quítalo del conteo.'
      );
      return;
    }

    Alert.alert(
      'Confirmar conteo',
      'Se guardarán las cantidades y la comparación con el sistema. Las existencias del inventario no cambiarán.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Confirmar',
          onPress: async () => {
            setGuardando(true);

            // 1) guarda lo escrito que no se haya guardado, 2) finaliza
            const todoGuardado = await guardarBorradores(conteo);
            if (!todoGuardado) {
              setGuardando(false);
              await actualizarConteos(conteo.id);
              return;
            }

            const resultado = await finalizarConteo(conteo.id);
            setGuardando(false);

            if (!resultado.ok) {
              Alert.alert('No se pudo confirmar', resultado.error ?? 'Intenta de nuevo.');
              await actualizarConteos(conteo.id);
              return;
            }

            await actualizarConteos(conteo.id);
            Alert.alert('Conteo confirmado', 'El conteo quedó finalizado y las diferencias guardadas.');
          },
        },
      ]
    );
  }

  const productosFiltrados = productos
    .filter((p) => {
      const texto = `${p.nombre} ${p.tipo}`.toLowerCase();
      const coincide = texto.includes(busqueda.trim().toLowerCase());
      const noAgregado = !seleccionado?.detalles.some((d) => d.producto_id === p.id);
      return coincide && noAgregado;
    })
    .slice(0, 8);

  const contados = seleccionado ? seleccionado.detalles.filter(estaContado).length : 0;
  const total = seleccionado?.detalles.length ?? 0;
  const enProgreso = seleccionado?.estado === 'en_progreso';

  return (
    <ThemedView style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 24, gap: 14 }}
          keyboardShouldPersistTaps="handled"
          refreshControl={<RefreshControl refreshing={cargando} onRefresh={cargar} />}
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
                <ThemedButton titulo="+ Nuevo conteo" onPress={() => setCreando(true)} />
              )}

              {creando && (
                <ThemedCard style={{ gap: 12 }}>
                  <ThemedText style={{ fontSize: 18, fontWeight: 'bold' }}>
                    Nuevo conteo
                  </ThemedText>

                  <ThemedText>Selecciona la ubicación (toca otra vez para quitarla):</ThemedText>

                  {ubicaciones.map((u) => (
                    <TouchableOpacity
                      key={u.id}
                      onPress={() => setUbicacionId(ubicacionId === u.id ? null : u.id)}
                    >
                      <ThemedCard
                        style={{
                          borderWidth: 1,
                          borderColor: ubicacionId === u.id ? colors.primario : colors.borde,
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

                  <ThemedButton titulo="Iniciar conteo" onPress={iniciarConteo} cargando={guardando} />

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
                <ThemedText type="suave">Todavía no hay conteos registrados.</ThemedText>
              )}

              {conteos.map((c) => {
                const diferencias = c.detalles.filter(
                  (d) => d.cantidad_fisica !== null && d.diferencia !== 0
                ).length;
                const abierto = c.estado === 'en_progreso';

                return (
                  <TouchableOpacity key={c.id} onPress={() => setSeleccionadoId(c.id)}>
                    <ThemedCard
                      style={{
                        gap: 6,
                        borderWidth: abierto ? 1 : 0,
                        borderColor: colors.aviso,
                      }}
                    >
                      <ThemedText style={{ fontSize: 17, fontWeight: 'bold' }}>
                        Conteo #{c.id}
                      </ThemedText>
                      <ThemedText>{ubicacionConteo(c)}</ThemedText>
                      <ThemedText type="suave">{formatearFechaConteo(c.creado_en)}</ThemedText>
                      <ThemedText
                        style={{
                          color: abierto ? colors.aviso : colors.exito,
                          fontWeight: 'bold',
                        }}
                      >
                        {abierto ? 'En progreso · falta confirmar' : 'Finalizado'}
                      </ThemedText>
                      <ThemedText type="suave">
                        {abierto
                          ? `${productosContados(c)} de ${c.detalles.length} producto(s) contados`
                          : `${c.detalles.length} producto(s) · ${diferencias} con diferencia`}
                      </ThemedText>
                      {abierto && (
                        <ThemedText style={{ color: colors.primario, fontWeight: 'bold' }}>
                          Toca para continuar y confirmar →
                        </ThemedText>
                      )}
                    </ThemedCard>
                  </TouchableOpacity>
                );
              })}
            </>
          )}

          {autorizado && seleccionado && (
            <>
              <ThemedCard style={{ gap: 6 }}>
                <ThemedText style={{ fontWeight: 'bold' }}>{ubicacionConteo(seleccionado)}</ThemedText>
                <ThemedText type="suave">
                  Iniciado: {formatearFechaConteo(seleccionado.creado_en)}
                </ThemedText>
                <ThemedText
                  style={{
                    color: enProgreso ? colors.aviso : colors.exito,
                    fontWeight: 'bold',
                  }}
                >
                  {enProgreso ? 'En progreso' : 'Finalizado'}
                </ThemedText>
                {seleccionado.observaciones && (
                  <ThemedText type="suave">{seleccionado.observaciones}</ThemedText>
                )}
              </ThemedCard>

              {enProgreso && (
                <ThemedCard style={{ gap: 10 }}>
                  <ThemedText style={{ fontSize: 17, fontWeight: 'bold' }}>
                    Agregar producto
                  </ThemedText>

                  <ThemedInput
                    placeholder="Buscar por tipo, marca o modelo"
                    value={busqueda}
                    onChangeText={setBusqueda}
                    autoCapitalize="none"
                  />

                  {productosFiltrados.map((p) => (
                    <TouchableOpacity
                      key={p.id}
                      disabled={agregando}
                      onPress={() => agregarProducto(p)}
                      style={{ opacity: agregando ? 0.5 : 1, paddingVertical: 6 }}
                    >
                      <ThemedText style={{ color: colors.primario }}>
                        + {p.nombre}
                      </ThemedText>
                      <ThemedText type="suave">
                        {[p.tipo, `${p.total} ${p.unidad}`.trim(), `ref. ${refCorta(p.id)}`]
                          .filter(Boolean)
                          .join(' · ')}
                      </ThemedText>
                    </TouchableOpacity>
                  ))}

                  {productosFiltrados.length === 0 && (
                    <ThemedText type="suave">No hay más productos que coincidan.</ThemedText>
                  )}
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
                const tipo = tipoProductoConteo(d);

                return (
                  <ThemedCard key={d.id} style={{ gap: 8 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
                      <View style={{ flexShrink: 1, gap: 2 }}>
                        <ThemedText style={{ fontSize: 16, fontWeight: 'bold' }}>
                          {nombreProductoConteo(d)}
                        </ThemedText>
                        <ThemedText type="suave">
                          {[tipo, `ref. ${refCorta(d.producto_id)}`].filter(Boolean).join(' · ')}
                        </ThemedText>
                      </View>

                      {enProgreso && (
                        <TouchableOpacity
                          disabled={guardandoDetalle === d.id}
                          onPress={() => quitarProducto(d)}
                        >
                          <ThemedText style={{ color: colors.error, fontWeight: 'bold' }}>
                            Quitar
                          </ThemedText>
                        </TouchableOpacity>
                      )}
                    </View>

                    <ThemedText type="suave">
                      Registrado en sistema: {d.cantidad_sistema}
                      {d.producto?.unidades_medida?.abreviatura
                        ? ` ${d.producto.unidades_medida.abreviatura}`
                        : ''}
                    </ThemedText>

                    {enProgreso ? (
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
                          color: diferencia === 0 ? colors.exito : colors.aviso,
                        }}
                      >
                        Diferencia: {(diferencia ?? 0) > 0 ? '+' : ''}
                        {diferencia ?? 0}
                        {diferencia === 0 ? ' · Coincide' : ' · Revisar diferencia'}
                      </ThemedText>
                    )}

                    {/* Conteo finalizado con diferencia: ajustar o confirmar que ya se ajustó */}
                    {!enProgreso && diferencia !== null && diferencia !== 0 && actuales && (
                      actuales[d.producto_id] === d.cantidad_fisica ? (
                        <ThemedText style={{ color: colors.exito, fontWeight: 'bold' }}>
                          ✔ Ajustado: la existencia actual ya coincide con lo contado
                        </ThemedText>
                      ) : (
                        <>
                          <ThemedText type="suave">
                            Existencia actual en el sistema: {actuales[d.producto_id] ?? 0}
                          </ThemedText>
                          {puedeAjustar && (
                            <TouchableOpacity
                              onPress={() =>
                                router.push({
                                  pathname: '/ajuste-nuevo',
                                  params: {
                                    producto: d.producto_id,
                                    ubicacion: String(seleccionado.ubicacion_id),
                                    real: String(d.cantidad_fisica),
                                  },
                                })
                              }
                            >
                              <ThemedText style={{ color: colors.primario, fontWeight: 'bold' }}>
                                Crear ajuste con la cantidad contada →
                              </ThemedText>
                            </TouchableOpacity>
                          )}
                        </>
                      )
                    )}
                  </ThemedCard>
                );
              })}

              {seleccionado.estado === 'finalizado' && (
                <ThemedCard>
                  <ThemedText style={{ fontWeight: 'bold' }}>Conteo finalizado</ThemedText>
                  <ThemedText type="suave">
                    Las diferencias se guardaron para revisión. Este proceso no modificó las existencias:
                    usa "Crear ajuste" en cada diferencia para corregirlas.
                  </ThemedText>
                </ThemedCard>
              )}
            </>
          )}

          {error !== '' && <ThemedText type="error">{error}</ThemedText>}
        </ScrollView>

        {/* Barra fija: el botón de confirmar siempre está a la vista */}
        {autorizado && seleccionado && enProgreso && (
          <View
            style={{
              padding: 16,
              gap: 8,
              borderTopWidth: 1,
              borderTopColor: colors.borde,
              backgroundColor: colors.tarjeta,
            }}
          >
            <ThemedText type="suave">
              {contados} de {total} producto(s) contados
              {contados < total ? ' · faltan cantidades' : ' · listo para confirmar'}
            </ThemedText>
            <ThemedButton
              titulo="Confirmar conteo"
              onPress={confirmarFinalizacion}
              cargando={guardando}
            />
          </View>
        )}
      </SafeAreaView>
    </ThemedView>
  );
}
