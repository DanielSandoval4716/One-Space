import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Alert, ScrollView, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { obtenerSesion } from '@/auth';
import { ThemedButton } from '@/components/ThemedButton';
import { ThemedCard } from '@/components/ThemedCard';
import { ThemedInput } from '@/components/ThemedInput';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Opciones } from '@/components/inventario/Opciones';
import { SelectorProducto } from '@/components/inventario/SelectorProducto';
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
  ProveedorOpcion,
  TipoOperacion,
  esTipoOperacion,
  obtenerProveedoresOpcion,
  registrarMovimiento,
  validarOperacion,
} from '@/operaciones';
import { Perfil, obtenerPerfil, puedeVer } from '@/permisos';
import { useTheme } from '@/theme';

// Entradas, salidas y transferencias comparten esta misma pantalla.
const CONFIG: Record<
  TipoOperacion,
  {
    titulo: string;
    subtitulo: string;
    permiso: string;
    boton: string;
    exito: string;
    etiquetaOrigen: string | null;
    etiquetaDestino: string | null;
    usaProveedor: boolean;
    usaPersona: boolean;
  }
> = {
  entrada: {
    titulo: 'Nueva entrada',
    subtitulo: 'Registra productos que ingresan al inventario.',
    permiso: 'inventario.entrada',
    boton: 'Confirmar entrada',
    exito: 'Entrada registrada.',
    etiquetaOrigen: null,
    etiquetaDestino: 'Ubicación donde ingresa',
    usaProveedor: true,
    usaPersona: false,
  },
  salida: {
    titulo: 'Nueva salida',
    subtitulo: 'Registra unidades que salen de una ubicación.',
    permiso: 'inventario.salida',
    boton: 'Confirmar salida',
    exito: 'Salida registrada.',
    etiquetaOrigen: 'Ubicación de donde sale',
    etiquetaDestino: null,
    usaProveedor: false,
    usaPersona: true,
  },
  transferencia: {
    titulo: 'Nueva transferencia',
    subtitulo: 'Mueve existencias de una ubicación a otra.',
    permiso: 'inventario.transferencia',
    boton: 'Confirmar transferencia',
    exito: 'Transferencia registrada.',
    etiquetaOrigen: 'Ubicación de origen',
    etiquetaDestino: 'Ubicación de destino',
    usaProveedor: false,
    usaPersona: false,
  },
};

const SIN_PROVEEDOR = 0;

export default function Operacion() {
  const router = useRouter();
  const colors = useTheme();
  const params = useLocalSearchParams<{ tipo?: string }>();

  if (!esTipoOperacion(params.tipo)) {
    return (
      <ThemedView style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 }}>
        <ThemedText type="error">Operación no válida.</ThemedText>
      </ThemedView>
    );
  }

  return <Formulario tipo={params.tipo} />;
}

function Formulario({ tipo }: { tipo: TipoOperacion }) {
  const router = useRouter();
  const colors = useTheme();
  const cfg = CONFIG[tipo];

  // Datos que vienen de la base de datos
  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const [productos, setProductos] = useState<ProductoOpcion[]>([]);
  const [ubicaciones, setUbicaciones] = useState<UbicacionOpcion[]>([]);
  const [motivos, setMotivos] = useState<MotivoOpcion[]>([]);
  const [proveedores, setProveedores] = useState<ProveedorOpcion[]>([]);
  const [personas, setPersonas] = useState<PersonaOpcion[]>([]);
  const [regla, setRegla] = useState<ReglaOperacion>({ evidencia: 'opcional', requiere_autorizacion: false });
  const [cargando, setCargando] = useState(true);

  // Lo que el usuario va llenando
  const [producto, setProducto] = useState<ProductoOpcion | null>(null);
  const [origenId, setOrigenId] = useState<number | null>(null);
  const [destinoId, setDestinoId] = useState<number | null>(null);
  const [existOrigen, setExistOrigen] = useState<number | null>(null);
  const [existDestino, setExistDestino] = useState<number | null>(null);
  const [cantidadTexto, setCantidadTexto] = useState('');
  const [motivoId, setMotivoId] = useState<number | null>(null);
  const [proveedorId, setProveedorId] = useState<number | null>(null);
  const [personaId, setPersonaId] = useState<number | null>(null);
  const [observaciones, setObservaciones] = useState('');
  const [error, setError] = useState('');
  const [guardando, setGuardando] = useState(false);

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
      setCargando(false);
    }
    cargar();
  }, []);

  // Lee la existencia registrada en origen y destino. Si el usuario cambia algo
  // mientras se lee, se ignora la respuesta anterior.
  const pedido = useRef(0);
  async function leerExistencias(p: ProductoOpcion | null, origen: number | null, destino: number | null) {
    const mio = ++pedido.current;
    const [eo, ed] = await Promise.all([
      p && origen !== null && cfg.etiquetaOrigen ? obtenerExistencia(p.id, origen) : Promise.resolve(null),
      p && destino !== null && cfg.etiquetaDestino ? obtenerExistencia(p.id, destino) : Promise.resolve(null),
    ]);
    if (mio !== pedido.current) return;
    setExistOrigen(eo);
    setExistDestino(ed);
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
  const opcionesUbicacion = ubicaciones.map((u) => ({ valor: u.id, titulo: `${u.bodega} › ${u.nombre}` }));

  async function confirmar() {
    const problema = validarOperacion(tipo, {
      productoId: producto?.id ?? null,
      cantidad,
      origenId: cfg.etiquetaOrigen ? origenId : null,
      destinoId: cfg.etiquetaDestino ? destinoId : null,
      motivoId,
      personaId: cfg.usaPersona ? personaId : null,
      existenciaOrigen: existOrigen,
    });
    if (problema) return setError(problema);

    // TODO: cuando exista el módulo de Documentos, adjuntar la evidencia en lugar de bloquear.
    if (regla.evidencia === 'obligatoria') {
      return setError('Esta operación requiere evidencia y todavía no se puede adjuntar (falta el módulo de Documentos).');
    }
    // TODO: solicitudes de autorización (hace falta su tabla en la base de datos).
    if (regla.requiere_autorizacion) {
      return setError('Esta operación requiere autorización y todavía no está disponible.');
    }

    setError('');
    setGuardando(true);
    const resultado = await registrarMovimiento({
      productoId: producto!.id,
      cantidad: cantidad!,
      origenId: cfg.etiquetaOrigen ? origenId : null,
      destinoId: cfg.etiquetaDestino ? destinoId : null,
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
    Alert.alert(cfg.titulo.replace('Nueva ', '').replace('Nuevo ', ''), cfg.exito, [
      { text: 'OK', onPress: () => router.back() },
    ]);
  }

  if (!cargando && perfil && !puedeVer(perfil, [cfg.permiso])) {
    return (
      <ThemedView style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 }}>
        <ThemedText type="error">No tienes permiso para esta operación.</ThemedText>
      </ThemedView>
    );
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

          {cargando && <ThemedText type="suave">Cargando...</ThemedText>}

          {!cargando && (
            <>
              <ThemedCard style={{ gap: 12 }}>
                <ThemedText style={{ fontWeight: 'bold' }}>Producto</ThemedText>
                <SelectorProducto productos={productos} seleccionado={producto} onSelect={elegirProducto} />
              </ThemedCard>

              {cfg.etiquetaOrigen && (
                <ThemedCard style={{ gap: 12 }}>
                  <ThemedText style={{ fontWeight: 'bold' }}>{cfg.etiquetaOrigen}</ThemedText>
                  {ubicaciones.length === 0 && <ThemedText type="suave">No hay ubicaciones registradas.</ThemedText>}
                  <Opciones opciones={opcionesUbicacion} valor={origenId} onChange={elegirOrigen} />
                  {existOrigen !== null && (
                    <ThemedText type="suave">
                      Disponible en esa ubicación: {existOrigen} {unidad}
                    </ThemedText>
                  )}
                </ThemedCard>
              )}

              {cfg.etiquetaDestino && (
                <ThemedCard style={{ gap: 12 }}>
                  <ThemedText style={{ fontWeight: 'bold' }}>{cfg.etiquetaDestino}</ThemedText>
                  {ubicaciones.length === 0 && <ThemedText type="suave">No hay ubicaciones registradas.</ThemedText>}
                  <Opciones opciones={opcionesUbicacion} valor={destinoId} onChange={elegirDestino} />
                  {existDestino !== null && (
                    <ThemedText type="suave">
                      Existencia actual en esa ubicación: {existDestino} {unidad}
                    </ThemedText>
                  )}
                </ThemedCard>
              )}

              <ThemedCard style={{ gap: 12 }}>
                <ThemedText style={{ fontWeight: 'bold' }}>Cantidad</ThemedText>
                <ThemedInput
                  placeholder={`Cantidad${unidad ? ` (${unidad})` : ''}`}
                  value={cantidadTexto}
                  onChangeText={setCantidadTexto}
                  keyboardType="decimal-pad"
                />
              </ThemedCard>

              {/* Cómo quedan las existencias */}
              {cantidad !== null && cantidad > 0 && (existOrigen !== null || existDestino !== null) && (
                <ThemedCard style={{ gap: 6 }}>
                  <ThemedText style={{ fontWeight: 'bold' }}>Así quedarán las existencias</ThemedText>
                  {existOrigen !== null && (
                    <Cambio
                      titulo="Origen"
                      antes={existOrigen}
                      despues={existOrigen - cantidad}
                      unidad={unidad}
                    />
                  )}
                  {existDestino !== null && (
                    <Cambio
                      titulo="Destino"
                      antes={existDestino}
                      despues={existDestino + cantidad}
                      unidad={unidad}
                    />
                  )}
                </ThemedCard>
              )}

              {cfg.usaProveedor && (
                <ThemedCard style={{ gap: 12 }}>
                  <ThemedText style={{ fontWeight: 'bold' }}>Proveedor (opcional)</ThemedText>
                  <Opciones
                    opciones={[
                      { valor: SIN_PROVEEDOR, titulo: 'Sin proveedor' },
                      ...proveedores.map((p) => ({ valor: p.id, titulo: p.nombre })),
                    ]}
                    valor={proveedorId ?? SIN_PROVEEDOR}
                    onChange={setProveedorId}
                  />
                </ThemedCard>
              )}

              {cfg.usaPersona && (
                <ThemedCard style={{ gap: 12 }}>
                  <ThemedText style={{ fontWeight: 'bold' }}>Responsable o destinatario</ThemedText>
                  {personas.length === 0 && <ThemedText type="suave">No hay personas registradas.</ThemedText>}
                  <Opciones
                    opciones={personas.map((p) => ({ valor: p.id, titulo: p.nombre }))}
                    valor={personaId}
                    onChange={setPersonaId}
                  />
                </ThemedCard>
              )}

              <ThemedCard style={{ gap: 12 }}>
                <ThemedText style={{ fontWeight: 'bold' }}>Motivo</ThemedText>
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
              </ThemedCard>

              {regla.evidencia === 'obligatoria' && (
                <ThemedText style={{ color: colors.aviso }}>
                  Este tipo de operación requiere evidencia. Se podrá adjuntar cuando exista el módulo de Documentos.
                </ThemedText>
              )}
              {regla.requiere_autorizacion && (
                <ThemedText style={{ color: colors.aviso }}>
                  Este tipo de operación requiere autorización.
                </ThemedText>
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

function Cambio({ titulo, antes, despues, unidad }: { titulo: string; antes: number; despues: number; unidad: string }) {
  const colors = useTheme();
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
      <ThemedText type="suave">{titulo}</ThemedText>
      <ThemedText style={{ fontWeight: 'bold', color: despues < 0 ? colors.error : colors.texto }}>
        {antes} → {despues} {unidad}
      </ThemedText>
    </View>
  );
}
