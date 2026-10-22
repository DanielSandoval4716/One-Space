import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { obtenerSesion } from '@/auth';
import { ThemedButton } from '@/components/ThemedButton';
import { ThemedCard } from '@/components/ThemedCard';
import { ThemedInput } from '@/components/ThemedInput';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Opciones } from '@/components/inventario/Opciones';
import { SelectorProducto } from '@/components/inventario/SelectorProducto';
import { crearReserva, reservadoDe } from '@/data/reservasPrueba';
import {
    PersonaOpcion,
    ProductoOpcion,
    leerCantidad,
    obtenerPersonasOpcion,
    obtenerProductosOpcion,
} from '@/opcionesInventario';
import { Perfil, obtenerPerfil, puedeVer } from '@/permisos';
import { useTheme } from '@/theme';

export default function ReservaNueva() {
  const router = useRouter();
  const colors = useTheme();

  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const [productos, setProductos] = useState<ProductoOpcion[]>([]);
  const [personas, setPersonas] = useState<PersonaOpcion[]>([]);
  const [cargando, setCargando] = useState(true);

  const [producto, setProducto] = useState<ProductoOpcion | null>(null);
  const [cantidad, setCantidad] = useState('');
  const [responsableId, setResponsableId] = useState<number | null>(null);
  const [motivo, setMotivo] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    async function cargar() {
      const session = await obtenerSesion();
      if (!session) {
        router.replace('/login');
        return;
      }

      const [p, prod, pers] = await Promise.all([
        obtenerPerfil(session.user.id),
        obtenerProductosOpcion(),
        obtenerPersonasOpcion(),
      ]);
      setPerfil(p);
      setProductos(prod);
      setPersonas(pers);
      setCargando(false);
    }
    cargar();
  }, []);

  // Existencia = lo que hay físicamente. Disponible = existencia - reservado.
  const reservado = producto ? reservadoDe(producto.id) : 0;
  const disponible = producto ? producto.total - reservado : 0;
  const unidad = producto?.unidad ?? '';

  function confirmar() {
    const n = leerCantidad(cantidad);

    if (!producto) return setError('Selecciona un producto.');
    if (n === null || n <= 0) return setError('Escribe una cantidad mayor que 0.');
    if (n > disponible) return setError(`Solo hay ${disponible} ${unidad} disponibles para reservar.`);
    if (motivo.trim() === '') return setError('Indica el destino o el motivo de la reserva.');

    // TODO: guardar en Supabase y registrar la operación en Auditoría.
    crearReserva({
      productoId: producto.id,
      producto: producto.nombre,
      unidad,
      cantidad: n,
      responsable: personas.find((p) => p.id === responsableId)?.nombre ?? '',
      motivo: motivo.trim(),
    });

    Alert.alert('Reserva', 'Reserva creada.', [{ text: 'OK', onPress: () => router.back() }]);
  }

  if (!cargando && perfil && !puedeVer(perfil, ['inventario.reserva'])) {
    return (
      <ThemedView style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 }}>
        <ThemedText type="error">No tienes permiso para crear reservas.</ThemedText>
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

          <ThemedText type="titulo">Nueva reserva</ThemedText>
          <ThemedText type="suave">Aparta unidades sin sacarlas todavía del inventario.</ThemedText>

          {cargando && <ThemedText type="suave">Cargando...</ThemedText>}

          {!cargando && (
            <>
              <ThemedCard style={{ gap: 12 }}>
                <ThemedText style={{ fontWeight: 'bold' }}>1. Producto</ThemedText>
                <SelectorProducto productos={productos} seleccionado={producto} onSelect={setProducto} />
              </ThemedCard>

              {producto && (
                <ThemedCard style={{ gap: 6 }}>
                  <ThemedText type="suave">
                    Existencia: {producto.total} {unidad}
                  </ThemedText>
                  <ThemedText type="suave">
                    Reservadas: {reservado} {unidad}
                  </ThemedText>
                  <ThemedText style={{ fontSize: 22, fontWeight: 'bold', color: colors.primario }}>
                    Disponibles: {disponible} {unidad}
                  </ThemedText>
                </ThemedCard>
              )}

              <ThemedCard style={{ gap: 12 }}>
                <ThemedText style={{ fontWeight: 'bold' }}>2. Cantidad a reservar</ThemedText>
                <ThemedInput
                  placeholder="Cantidad"
                  value={cantidad}
                  onChangeText={setCantidad}
                  keyboardType="decimal-pad"
                />
              </ThemedCard>

              <ThemedCard style={{ gap: 12 }}>
                <ThemedText style={{ fontWeight: 'bold' }}>3. Responsable (opcional)</ThemedText>
                {personas.length === 0 && <ThemedText type="suave">No hay personas registradas.</ThemedText>}
                <Opciones
                  opciones={personas.map((p) => ({ valor: p.id, titulo: p.nombre }))}
                  valor={responsableId}
                  onChange={setResponsableId}
                />
              </ThemedCard>

              <ThemedCard style={{ gap: 12 }}>
                <ThemedText style={{ fontWeight: 'bold' }}>4. Destino o motivo</ThemedText>
                <ThemedInput
                  placeholder="Ej. Pedido de la sucursal norte"
                  value={motivo}
                  onChangeText={setMotivo}
                />
              </ThemedCard>

              {error !== '' && <ThemedText type="error">{error}</ThemedText>}

              <ThemedButton titulo="Confirmar reserva" onPress={confirmar} />
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}