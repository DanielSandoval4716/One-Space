import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, ScrollView, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DatosAjuste, registrarAjuste, solicitarAutorizacionAjuste } from '@/ajustes';
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
    ProductoOpcion,
    ReglaOperacion,
    UbicacionOpcion,
    leerCantidad,
    obtenerExistencia,
    obtenerMotivos,
    obtenerProductosOpcion,
    obtenerRegla,
    obtenerUbicacionesOpcion,
} from '@/opcionesInventario';
import { Perfil, obtenerPerfil, puedeVer } from '@/permisos';
import { useTheme } from '@/theme';

export default function AjusteNuevo() {
  const router = useRouter();
  const colors = useTheme();

  // Datos que vienen de la base de datos
  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const [productos, setProductos] = useState<ProductoOpcion[]>([]);
  const [ubicaciones, setUbicaciones] = useState<UbicacionOpcion[]>([]);
  const [motivos, setMotivos] = useState<MotivoOpcion[]>([]);
  const [regla, setRegla] = useState<ReglaOperacion>({ evidencia: 'opcional', requiere_autorizacion: false });
  const [cargando, setCargando] = useState(true);

  // Lo que el usuario va llenando
  const [producto, setProducto] = useState<ProductoOpcion | null>(null);
  const [ubicacionId, setUbicacionId] = useState<number | null>(null);
  const [existencia, setExistencia] = useState<number | null>(null);
  const [cantidadReal, setCantidadReal] = useState('');
  const [motivoId, setMotivoId] = useState<number | null>(null);
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

      const [p, prod, ubic, mot, reg] = await Promise.all([
        obtenerPerfil(session.user.id),
        obtenerProductosOpcion(),
        obtenerUbicacionesOpcion(),
        obtenerMotivos('ajuste'),
        obtenerRegla('ajuste'),
      ]);
      setPerfil(p);
      setProductos(prod);
      setUbicaciones(ubic);
      setMotivos(mot);
      setRegla(reg);
      setCargando(false);
    }
    cargar();
  }, []);

  // Cada vez que cambia el producto o la ubicación se lee la existencia registrada
  async function leerExistencia(p: ProductoOpcion | null, u: number | null) {
    if (p && u !== null) setExistencia(await obtenerExistencia(p.id, u));
    else setExistencia(null);
  }

  function elegirProducto(p: ProductoOpcion | null) {
    setProducto(p);
    leerExistencia(p, ubicacionId);
  }

  function elegirUbicacion(id: number) {
    setUbicacionId(id);
    leerExistencia(producto, id);
  }

  const real = leerCantidad(cantidadReal);
  const diferencia = existencia !== null && real !== null ? real - existencia : null;
  const unidad = producto?.unidad ?? '';

  // Si la regla pide autorización y el usuario no puede autorizar, solo la solicita
  const necesitaAutorizacion =
    regla.requiere_autorizacion && !puedeVer(perfil, ['inventario.autorizar_ajuste']);

  async function confirmar() {
    if (!producto) return setError('Selecciona un producto.');
    if (ubicacionId === null) return setError('Selecciona la ubicación.');
    if (real === null || real < 0) return setError('Escribe la cantidad real encontrada (0 o más).');
    if (diferencia === 0) return setError('La cantidad real es igual a la registrada: no hay nada que ajustar.');
    if (motivoId === null) return setError('Selecciona el motivo del ajuste.');

    const datos: DatosAjuste = {
      productoId: producto.id,
      ubicacionId,
      cantidadAnterior: existencia ?? 0,
      cantidadReal: real,
      motivoId,
      observaciones,
    };

    setError('');
    setGuardando(true);
    const resultado = necesitaAutorizacion
      ? await solicitarAutorizacionAjuste(datos)
      : await registrarAjuste(datos);
    setGuardando(false);

    if (!resultado.ok) {
      setError(resultado.error ?? 'No se pudo guardar el ajuste. Revisa que tengas permiso.');
      return;
    }

    const mensaje = necesitaAutorizacion
      ? 'Solicitud simulada: todavía no se guarda en el servidor.'
      : resultado.simulado
        ? 'Ajuste simulado: todavía no se guardó en la base de datos.'
        : 'Ajuste registrado.';
    Alert.alert('Ajuste', mensaje, [{ text: 'OK', onPress: () => router.back() }]);
  }

  if (!cargando && perfil && !puedeVer(perfil, ['inventario.ajuste'])) {
    return (
      <ThemedView style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 }}>
        <ThemedText type="error">No tienes permiso para registrar ajustes.</ThemedText>
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

          <ThemedText type="titulo">Nuevo ajuste</ThemedText>
          <ThemedText type="suave">
            Indica la cantidad real encontrada y One Space calculará la diferencia.
          </ThemedText>

          {cargando && <ThemedText type="suave">Cargando...</ThemedText>}

          {!cargando && (
            <>
              <ThemedCard style={{ gap: 12 }}>
                <ThemedText style={{ fontWeight: 'bold' }}>1. Producto</ThemedText>
                <SelectorProducto productos={productos} seleccionado={producto} onSelect={elegirProducto} />
              </ThemedCard>

              <ThemedCard style={{ gap: 12 }}>
                <ThemedText style={{ fontWeight: 'bold' }}>2. Ubicación</ThemedText>
                {ubicaciones.length === 0 && <ThemedText type="suave">No hay ubicaciones registradas.</ThemedText>}
                <Opciones
                  opciones={ubicaciones.map((u) => ({ valor: u.id, titulo: `${u.bodega} › ${u.nombre}` }))}
                  valor={ubicacionId}
                  onChange={elegirUbicacion}
                />
              </ThemedCard>

              <ThemedCard style={{ gap: 12 }}>
                <ThemedText style={{ fontWeight: 'bold' }}>3. Cantidad real</ThemedText>
                <ThemedInput
                  placeholder="Cantidad encontrada físicamente"
                  value={cantidadReal}
                  onChangeText={setCantidadReal}
                  keyboardType="decimal-pad"
                />
              </ThemedCard>

              {/* Revisión de la diferencia */}
              {existencia !== null && (
                <ThemedCard style={{ gap: 6 }}>
                  <ThemedText style={{ fontWeight: 'bold' }}>Diferencia</ThemedText>
                  <ThemedText type="suave">
                    Existencia registrada: {existencia} {unidad}
                  </ThemedText>
                  <ThemedText type="suave">
                    Cantidad real: {real === null ? '—' : `${real} ${unidad}`}
                  </ThemedText>
                  {diferencia !== null && (
                    <ThemedText
                      style={{
                        fontSize: 22,
                        fontWeight: 'bold',
                        color: diferencia > 0 ? colors.exito : diferencia < 0 ? colors.error : colors.texto,
                      }}
                    >
                      {diferencia > 0 ? '+' : diferencia < 0 ? '−' : ''}
                      {Math.abs(diferencia)} {unidad}
                    </ThemedText>
                  )}
                </ThemedCard>
              )}

              <ThemedCard style={{ gap: 12 }}>
                <ThemedText style={{ fontWeight: 'bold' }}>4. Motivo</ThemedText>
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
                  {/* TODO: adjuntar evidencia cuando exista el módulo de Documentos */}
                   Este tipo de ajuste requiere evidencia. Podrás adjuntarla cuando exista el módulo de Documentos.
                </ThemedText>
              )}
              {necesitaAutorizacion && (
                <ThemedText style={{ color: colors.aviso }}>
                   Este ajuste necesita autorización de un administrador antes de modificar las existencias.
                </ThemedText>
              )}

              {error !== '' && <ThemedText type="error">{error}</ThemedText>}

              <View style={{ gap: 12 }}>
                <ThemedButton
                  titulo={necesitaAutorizacion ? 'Solicitar autorización' : 'Confirmar ajuste'}
                  onPress={confirmar}
                  cargando={guardando}
                />
              </View>
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}