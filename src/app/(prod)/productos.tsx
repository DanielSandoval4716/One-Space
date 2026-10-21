import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedButton } from '@/components/ThemedButton';
import { ThemedInput } from '@/components/ThemedInput';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { ProductoCard } from '@/components/productos/ProductoCard';
import { supabase } from '@/supabase';

type Producto = {
  id: string;
  tipo: string;
  marca: string;
  modelo: string;
  descripcion: string;
  unidad: string;
  existencias: number;
};

export default function ProductosScreen() {
  const router = useRouter();
  const [busqueda, setBusqueda] = useState('');
  const [productos, setProductos] = useState<Producto[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  const cargarProductos = useCallback(async () => {
    setCargando(true);
    setError('');

    try {
      const { data, error: errorProductos } = await supabase
        .from('productos')
        .select(`
          id,
          modelo,
          descripcion,
          tipos_producto(nombre),
          marcas(nombre),
          unidades_medida(nombre)
        `)
        .eq('activo', true)
        .order('modelo');

      if (errorProductos) throw errorProductos;

      const { data: existencias, error: errorStock } =
        await supabase
          .from('existencias_por_producto')
          .select('producto_id, total');

      if (errorStock) throw errorStock;

      const lista: Producto[] = (data ?? []).map((p: any) => {
        const tipo = Array.isArray(p.tipos_producto)
          ? p.tipos_producto[0]
          : p.tipos_producto;

        const marca = Array.isArray(p.marcas)
          ? p.marcas[0]
          : p.marcas;

        const unidad = Array.isArray(p.unidades_medida)
          ? p.unidades_medida[0]
          : p.unidades_medida;

        const stock = existencias?.find(
          (e) => e.producto_id === p.id
        );

        return {
          id: p.id,
          tipo: tipo?.nombre ?? 'Sin tipo',
          marca: marca?.nombre ?? 'Sin marca',
          modelo: p.modelo,
          descripcion: p.descripcion ?? '',
          unidad: unidad?.nombre ?? '',
          existencias: Number(stock?.total ?? 0),
        };
      });

      setProductos(lista);
    } catch (e: any) {
      setError(e.message ?? 'Error al cargar productos');
    } finally {
      setCargando(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      cargarProductos();
    }, [cargarProductos])
  );

  const productosFiltrados = productos.filter((producto) => {
    const texto = busqueda.toLowerCase();

    return (
      producto.tipo.toLowerCase().includes(texto) ||
      producto.marca.toLowerCase().includes(texto) ||
      producto.modelo.toLowerCase().includes(texto)
    );
  });

  return (
    <ThemedView style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={{
            padding: 24,
            gap: 16,
          }}
        >
          <View>
            <ThemedText type="titulo">
              Productos
            </ThemedText>

            <ThemedText type="suave">
              Consulta los productos registrados en One Space.
            </ThemedText>
          </View>

          <ThemedInput
            placeholder="Buscar por tipo, marca o modelo..."
            value={busqueda}
            onChangeText={setBusqueda}
          />

          <ThemedButton
            titulo="+ Nuevo producto"
            onPress={() => router.push('/nuevo')}
          />

          <ThemedText
            style={{
              fontSize: 18,
              fontWeight: 'bold',
            }}
          >
            Productos registrados
          </ThemedText>

          {cargando && <ActivityIndicator size="large" />}

          {!!error && (
            <ThemedText>
              Error: {error}
            </ThemedText>
          )}

          {!cargando && !error &&
            productosFiltrados.map((producto) => (
              <ProductoCard
                key={producto.id}
                producto={producto}
                onPress={() =>
                  router.push({
                    pathname: '/detalle',
                    params: { id: producto.id },
                  })
                }
              />
            ))}

          {!cargando && !error &&
            productosFiltrados.length === 0 && (
              <ThemedText type="suave">
                No se encontraron productos.
              </ThemedText>
            )}
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}
