// Pantalla para registrar una entrada, una salida o una transferencia de inventario.
// Las tres comparten esta pantalla: el tipo llega en la ruta (/operacion?tipo=entrada) y
// lo que cambia entre ellas (qué campos se piden, textos, permisos) está en CONFIG_OPERACION.
//
// Pasos: 1) cargar listas  2) el usuario llena el formulario  3) validar  4) guardar.

import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Alert, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { obtenerSesion } from '@/auth';
import { ThemedButton } from '@/components/ThemedButton';
import { ThemedInput } from '@/components/ThemedInput';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { CambioExistencia } from '@/components/inventario/CambioExistencia';
import { Opciones } from '@/components/inventario/Opciones';
import { Seccion } from '@/components/inventario/Seccion';
import { SelectorProducto } from '@/components/inventario/SelectorProducto';
import { convertirReserva, reservadoDe } from '@/data/reservasPrueba';
import {
  MotivoOpcion,
  PersonaOpcion,
  ProductoOpcion,
  ReglaOperacion,
  UbicacionOpcion,
  leerCantidad,
  obtenerExistencia,
  obtenerMotivos,
  obtenerPersonasOpcion,
  obtenerProductosOpcion,
  obtenerRegla,
  obtenerUbicacionesOpcion,
} from '@/opcionesInventario';
import {
  CONFIG_OPERACION,
  ProveedorOpcion,
  TipoOperacion,
  esTipoOperacion,
  obtenerProveedoresOpcion,
  registrarMovimiento,
  validarOperacion,
} from '@/operaciones';
import { Perfil, obtenerPerfil, puedeVer } from '@/permisos';
import { useTheme } from '@/theme';

// "Sin proveedor" es una opción más de la lista; se guarda como "ningún proveedor".
const SIN_PROVEEDOR = 0;

// Datos que llegan cuando una salida viene de "Convertir en salida" (pantalla Reservas).
type DatosIniciales = {
  productoId?: string;
  cantidad?: string;
  reservaId?: number;
  responsable?: string; // nombre de la persona
  nota?: string;
};

export default function Operacion() {
  const params = useLocalSearchParams<{
    tipo?: string;
    productoId?: string;
    cantidad?: string;
    reservaId?: string;
    responsable?: string;
    nota?: string;
  }>();

  if (!esTipoOperacion(params.tipo)) return <MensajeCentrado texto="Operación no válida." />;

  const inicial: DatosIniciales = {
    productoId: params.productoId,
    cantidad: params.cantidad,
    reservaId: params.reservaId ? Number(params.reservaId) : undefined,
    responsable: params.responsable,
    nota: params.nota,
  };
  return <FormularioOperacion tipo={params.tipo} inicial={inicial} />;
}

function FormularioOperacion({ tipo, inicial }: { tipo: TipoOperacion; inicial: DatosIniciales }) {
  const router = useRouter();
  const colors = useTheme();
  const cfg = CONFIG_OPERACION[tipo];
  const usaOrigen = cfg.etiquetaOrigen !== null;
  const usaDestino = cfg.etiquetaDestino !== null;

  // Si es una salida que convierte una reserva, el producto y la cantidad vienen fijos.
  const reservaId = tipo === 'salida' ? inicial.reservaId : undefined;
  const desdeReserva = reservaId !== undefined;

  // --- Datos que vienen de la base de datos ---
  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const [productos, setProductos] = useState<ProductoOpcion[]>([]);
  const [ubicaciones, setUbicaciones] = useState<UbicacionOpcion[]>([]);
  const [motivos, setMotivos] = useState<MotivoOpcion[]>([]);
  const [proveedores, setProveedores] = useState<ProveedorOpcion[]>([]);
  const [personas, setPersonas] = useState<PersonaOpcion[]>([]);
  const [regla, setRegla] = useState<ReglaOperacion>({ evidencia: 'opcional', requiere_autorizacion: false });
  const [cargando, setCargando] = useState(true);

  // --- Lo que el usuario va llenando ---
  const [producto, setProducto] = useState<ProductoOpcion | null>(null);
  const [origenId, setOrigenId] = useState<number | null>(null);
  const [destinoId, setDestinoId] = useState<number | null>(null);
  const [cantidadTexto, setCantidadTexto] = useState(desdeReserva ? (inicial.cantidad ?? '') : '');
  const [motivoId, setMotivoId] = useState<number | null>(null);
  const [proveedorId, setProveedorId] = useState<number | null>(null);
  const [personaId, setPersonaId] = useState<number | null>(null);
  const [observaciones, setObservaciones] = useState(desdeReserva ? (inicial.nota ?? '') : '');

  // --- Existencia registrada hoy en el origen y el destino elegidos ---
  const [existOrigen, setExistOrigen] = useState<number | null>(null);
  const [existDestino, setExistDestino] = useState<number | null>(null);

  const [error, setError] = useState('');
  const [guardando, setGuardando] = useState(false);

  // Paso 1: al abrir la pantalla se cargan las listas que necesita este tipo de operación.
  useEffect(() => {
    async function cargar() {
      const session = await obtenerSesion();
      if (!session) {
        router.replace('/login');
        return;
      }

      const [p, prod, ubic, mot, reg, prov, pers] = await Promise.all([
        obtenerPerfil(session.user.id),
        obtenerProductosOpcion(),
        obtenerUbicacionesOpcion(),
        obtenerMotivos(tipo),
        obtenerRegla(tipo),
        cfg.usaProveedor ? obtenerProveedoresOpcion() : Promise.resolve([]),
        cfg.usaPersona ? obtenerPersonasOpcion() : Promise.resolve([]),
      ]);
      setPerfil(p);
      setProductos(prod);
      setUbicaciones(ubic);
      setMotivos(mot);
      setRegla(reg);
      setProveedores(prov);
      setPersonas(pers);

      if (desdeReserva) {
        const personasCargadas: PersonaOpcion[] = pers;
        setProducto(prod.find((p) => p.id === inicial.productoId) ?? null);
        setPersonaId(personasCargadas.find((p) => p.nombre === inicial.responsable)?.id ?? null);
      }
      setCargando(false);
    }
    cargar();
  }, []);

  // Paso 2: cada vez que cambia el producto o una ubicación, se lee la existencia registrada.
  // Si el usuario cambia otra cosa mientras se lee, se descarta la respuesta vieja.
  const lecturaActual = useRef(0);
  async function leerExistencias(p: ProductoOpcion | null, origen: number | null, destino: number | null) {
    const numeroDeLectura = ++lecturaActual.current;
    const [enOrigen, enDestino] = await Promise.all([
      p && usaOrigen && origen !== null ? obtenerExistencia(p.id, origen) : Promise.resolve(null),
      p && usaDestino && destino !== null ? obtenerExistencia(p.id, destino) : Promise.resolve(null),
    ]);
    if (numeroDeLectura !== lecturaActual.current) return;
    setExistOrigen(enOrigen);
    setExistDestino(enDestino);
  }

  function elegirProducto(p: ProductoOpcion | null) {
    setProducto(p);
    leerExistencias(p, origenId, destinoId);
  }

  function elegirOrigen(id: number) {
    setOrigenId(id);
    leerExistencias(producto, id, destinoId);
  }

  function elegirDestino(id: number) {
    setDestinoId(id);
    leerExistencias(producto, origenId, id);
  }

  const cantidad = leerCantidad(cantidadTexto);
  const unidad = producto?.unidad ?? '';
  // Lo reservado por otras operaciones no se puede sacar (la reserva que se convierte sí).
  const reservadoPorOtros = tipo === 'salida' && producto ? reservadoDe(producto.id, reservaId) : 0;
  const disponibleSinReservas = tipo === 'salida' && producto ? producto.total - reservadoPorOtros : null;
  const opcionesUbicacion = ubicaciones.map((u) => ({ valor: u.id, titulo: `${u.bodega} › ${u.nombre}` }));

  // Paso 3: devuelve el primer problema que impide guardar, o null si todo está bien.
  function buscarProblema(): string | null {
    const problema = validarOperacion(tipo, {
      productoId: producto?.id ?? null,
      cantidad,
      origenId: usaOrigen ? origenId : null,
      destinoId: usaDestino ? destinoId : null,
      motivoId,
      personaId: cfg.usaPersona ? personaId : null,
      existenciaOrigen: existOrigen,
      disponibleSinReservas,
    });
    if (problema) return problema;

    // TODO: cuando exista el módulo de Documentos, adjuntar la evidencia en lugar de bloquear.
    if (regla.evidencia === 'obligatoria') {
      return 'Esta operación requiere evidencia y todavía no se puede adjuntar (falta el módulo de Documentos).';
    }
    // TODO: solicitudes de autorización (hace falta su tabla en la base de datos).
    if (regla.requiere_autorizacion) {
      return 'Esta operación requiere autorización y todavía no está disponible.';
    }
    return null;
  }

  // Paso 4: guardar con la función registrar_movimiento de Supabase.
  async function confirmar() {
    const problema = buscarProblema();
    if (problema) {
      setError(problema);
      return;
    }

    setError('');
    setGuardando(true);
    const resultado = await registrarMovimiento({
      productoId: producto!.id,
      cantidad: cantidad!,
      origenId: usaOrigen ? origenId : null,
      destinoId: usaDestino ? destinoId : null,
      motivoId,
      proveedorId: cfg.usaProveedor ? proveedorId || null : null,
      personaId: cfg.usaPersona ? personaId : null,
      observaciones,
    });
    setGuardando(false);

    if (!resultado.ok) {
      setError(`No se pudo registrar: ${resultado.error ?? 'revisa que tengas permiso.'}`);
      return;
    }
    if (reservaId !== undefined) convertirReserva(reservaId);
    const mensaje = desdeReserva ? 'Salida registrada y reserva convertida.' : cfg.exito;
    Alert.alert(cfg.nombre, mensaje, [{ text: 'OK', onPress: () => router.back() }]);
  }

  if (!cargando && perfil && !puedeVer(perfil, [cfg.permiso])) {
    return <MensajeCentrado texto="No tienes permiso para esta operación." />;
  }

  return (
    <ThemedView style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ padding: 24, gap: 16 }} keyboardShouldPersistTaps="handled">
          <TouchableOpacity onPress={() => router.back()}>
            <ThemedText style={{ color: colors.primario, fontWeight: 'bold' }}>← Volver</ThemedText>
          </TouchableOpacity>

          <ThemedText type="titulo">{cfg.titulo}</ThemedText>
          <ThemedText type="suave">{cfg.subtitulo}</ThemedText>

          {desdeReserva && (
            <ThemedText style={{ color: colors.aviso }}>
              Esta salida convierte una reserva: se sacan las unidades que estaban apartadas.
            </ThemedText>
          )}

          {cargando && <ThemedText type="suave">Cargando...</ThemedText>}

          {!cargando && (
            <>
              <Seccion titulo="Producto">
                {desdeReserva ? (
                  producto ? (
                    <ThemedText>
                      {producto.nombre} · existencia total: {producto.total} {producto.unidad}
                    </ThemedText>
                  ) : (
                    <ThemedText type="error">El producto de la reserva ya no está disponible.</ThemedText>
                  )
                ) : (
                  <SelectorProducto productos={productos} seleccionado={producto} onSelect={elegirProducto} />
                )}
                {producto && reservadoPorOtros > 0 && (
                  <ThemedText type="suave">
                    Hay {reservadoPorOtros} {unidad} reservadas; disponibles para sacar:{' '}
                    {producto.total - reservadoPorOtros} {unidad}.
                  </ThemedText>
                )}
              </Seccion>

              {cfg.etiquetaOrigen && (
                <Seccion titulo={cfg.etiquetaOrigen}>
                  {ubicaciones.length === 0 && <ThemedText type="suave">No hay ubicaciones registradas.</ThemedText>}
                  <Opciones opciones={opcionesUbicacion} valor={origenId} onChange={elegirOrigen} />
                  {existOrigen !== null && (
                    <ThemedText type="suave">
                      Disponible en esa ubicación: {existOrigen} {unidad}
                    </ThemedText>
                  )}
                </Seccion>
              )}

              {cfg.etiquetaDestino && (
                <Seccion titulo={cfg.etiquetaDestino}>
                  {ubicaciones.length === 0 && <ThemedText type="suave">No hay ubicaciones registradas.</ThemedText>}
                  <Opciones opciones={opcionesUbicacion} valor={destinoId} onChange={elegirDestino} />
                  {existDestino !== null && (
                    <ThemedText type="suave">
                      Existencia actual en esa ubicación: {existDestino} {unidad}
                    </ThemedText>
                  )}
                </Seccion>
              )}

              <Seccion titulo="Cantidad">
                <ThemedInput
                  placeholder={`Cantidad${unidad ? ` (${unidad})` : ''}`}
                  value={cantidadTexto}
                  onChangeText={setCantidadTexto}
                  keyboardType="decimal-pad"
                  editable={!desdeReserva}
                />
              </Seccion>

              {/* Vista previa: cómo quedarán las existencias si se confirma */}
              {cantidad !== null && cantidad > 0 && (existOrigen !== null || existDestino !== null) && (
                <Seccion titulo="Así quedarán las existencias">
                  {existOrigen !== null && (
                    <CambioExistencia titulo="Origen" antes={existOrigen} despues={existOrigen - cantidad} unidad={unidad} />
                  )}
                  {existDestino !== null && (
                    <CambioExistencia titulo="Destino" antes={existDestino} despues={existDestino + cantidad} unidad={unidad} />
                  )}
                </Seccion>
              )}

              {cfg.usaProveedor && (
                <Seccion titulo="Proveedor (opcional)">
                  <Opciones
                    opciones={[
                      { valor: SIN_PROVEEDOR, titulo: 'Sin proveedor' },
                      ...proveedores.map((p) => ({ valor: p.id, titulo: p.nombre })),
                    ]}
                    valor={proveedorId ?? SIN_PROVEEDOR}
                    onChange={setProveedorId}
                  />
                </Seccion>
              )}

              {cfg.usaPersona && (
                <Seccion titulo="Responsable o destinatario">
                  {personas.length === 0 && <ThemedText type="suave">No hay personas registradas.</ThemedText>}
                  <Opciones
                    opciones={personas.map((p) => ({ valor: p.id, titulo: p.nombre }))}
                    valor={personaId}
                    onChange={setPersonaId}
                  />
                </Seccion>
              )}

              <Seccion titulo="Motivo">
                {motivos.length === 0 && <ThemedText type="suave">No hay motivos registrados.</ThemedText>}
                <Opciones
                  opciones={motivos.map((m) => ({ valor: m.id, titulo: m.nombre }))}
                  valor={motivoId}
                  onChange={setMotivoId}
                />
                <ThemedInput
                  placeholder="Observaciones (opcional)"
                  value={observaciones}
                  onChangeText={setObservaciones}
                  multiline
                  style={{ minHeight: 70, textAlignVertical: 'top' }}
                />
              </Seccion>

              {regla.evidencia === 'obligatoria' && (
                <ThemedText style={{ color: colors.aviso }}>
                  Este tipo de operación requiere evidencia. Se podrá adjuntar cuando exista el módulo de Documentos.
                </ThemedText>
              )}
              {regla.requiere_autorizacion && (
                <ThemedText style={{ color: colors.aviso }}>Este tipo de operación requiere autorización.</ThemedText>
              )}

              {error !== '' && <ThemedText type="error">{error}</ThemedText>}

              <ThemedButton titulo={cfg.boton} onPress={confirmar} cargando={guardando} />
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

function MensajeCentrado({ texto }: { texto: string }) {
  return (
    <ThemedView style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 }}>
      <ThemedText type="error">{texto}</ThemedText>
    </ThemedView>
  );
}
