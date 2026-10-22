import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { RefreshControl, ScrollView, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { obtenerSesion } from '@/auth';
import { ThemedButton } from '@/components/ThemedButton';
import { ThemedInput } from '@/components/ThemedInput';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Opciones } from '@/components/inventario/Opciones';
import { MovimientoCard } from '@/components/movimientos/MovimientoCard';
import { Movimiento, nombreProducto, obtenerMovimientos } from '@/movimientos';
import { useTheme } from '@/theme';

const FILTROS = [
  { valor: 'todos', titulo: 'Todos' },
  { valor: 'entrada', titulo: 'Entradas' },
  { valor: 'salida', titulo: 'Salidas' },
  { valor: 'transferencia', titulo: 'Transferencias' },
  { valor: 'ajuste', titulo: 'Ajustes' },
];

const POR_PAGINA = 30;

export default function Movimientos() {
  const router = useRouter();
  const colors = useTheme();
  // Opcional: /movimientos?productoId=... muestra solo los movimientos de ese producto
  const { productoId } = useLocalSearchParams<{ productoId?: string }>();

  const [tipo, setTipo] = useState('todos');
  const [busqueda, setBusqueda] = useState('');
  const [limite, setLimite] = useState(POR_PAGINA);
  const [lista, setLista] = useState<Movimiento[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  const cargar = useCallback(async () => {
    setCargando(true);
    const session = await obtenerSesion();
    if (!session) {
      router.replace('/login');
      return;
    }

    const datos = await obtenerMovimientos({
      tipo: tipo === 'todos' ? undefined : tipo,
      productoId,
      limite,
    });

    if (datos === null) {
      setError('No se pudieron cargar los movimientos.');
    } else {
      setError('');
      setLista(datos);
    }
    setCargando(false);
  }, [tipo, productoId, limite]);

  useFocusEffect(
    useCallback(() => {
      cargar();
    }, [cargar])
  );

  const texto = busqueda.trim().toLowerCase();
  const visibles = lista.filter(
    (m) =>
      nombreProducto(m).toLowerCase().includes(texto) ||
      (m.producto?.tipos_producto?.nombre ?? '').toLowerCase().includes(texto)
  );

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
            <ThemedText type="titulo">Movimientos</ThemedText>
            <ThemedText type="suave">
              Historial de las operaciones que han modificado las existencias.
            </ThemedText>
          </View>

          {productoId && (
            <ThemedText type="suave">Mostrando solo los movimientos de un producto.</ThemedText>
          )}

          <ThemedInput
            placeholder="Buscar por tipo, marca o modelo..."
            value={busqueda}
            onChangeText={setBusqueda}
          />

          <Opciones
            opciones={FILTROS}
            valor={tipo}
            onChange={(nuevo) => {
              setTipo(nuevo);
              setLimite(POR_PAGINA);
            }}
          />

          {error !== '' && <ThemedText type="error">{error}</ThemedText>}

          {visibles.map((m) => (
            <MovimientoCard
              key={m.id}
              movimiento={m}
              onPress={() =>
                router.push({
                  pathname: '/(mov)/movimiento-detalle' as never,
                  params: { id: String(m.id) },
                })
              }
            />
          ))}

          {!cargando && error === '' && visibles.length === 0 && (
            <ThemedText type="suave">No se encontraron movimientos.</ThemedText>
          )}

          {/* Si llegó al límite, probablemente hay más movimientos */}
          {lista.length >= limite && (
            <ThemedButton
              titulo="Ver más"
              onPress={() => setLimite(limite + POR_PAGINA)}
              cargando={cargando}
            />
          )}
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}