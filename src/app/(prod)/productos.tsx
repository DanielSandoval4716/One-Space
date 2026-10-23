import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EscanerQR } from '@/components/EscanerQR';
import { idDeProductoPorQR } from '@/qr';
import { ThemedButton } from '@/components/ThemedButton';
import { ThemedInput } from '@/components/ThemedInput';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { ProductoCard } from '@/components/productos/ProductoCard';
import { usePermiso } from '@/permisos';
import { supabase } from '@/supabase';
import { useTheme } from '@/theme';

type Producto = {
  id: string;
  tipo: string;
  marca: string;
  modelo: string;
  descripcion: string;
  unidad: string;
  existencias: number;
};

type Relacion = {
  nombre: string;
} | {
  nombre: string;
}[] | null;

// Obtener el nombre de una relación de Supabase.
function obtenerNombre(
  relacion: Relacion,
  valorDefecto: string
): string {
  if (Array.isArray(relacion)) {
    return relacion[0]?.nombre ?? valorDefecto;
  }

  return relacion?.nombre ?? valorDefecto;
}

export default function ProductosScreen() {
  const router = useRouter();
  const colors = useTheme();
  const [escaneando, setEscaneando] = useState(false);
  const puedeCrear = usePermiso(['productos.gestionar']) === true;

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

      const lista: Producto[] = (data ?? []).map((p) => {
        const tipo = obtenerNombre(
          p.tipos_producto,
          'Sin tipo'
        );

        const marca = obtenerNombre(
          p.marcas,
          'Sin marca'
        );

        const unidad = obtenerNombre(
          p.unidades_medida,
          ''
        );

        const stock = existencias?.find(
          (e) => e.producto_id === p.id
        );

        return {
          id: String(p.id),
          tipo,
          marca,
          modelo: p.modelo,
          descripcion: p.descripcion ?? '',
          unidad,
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
    const texto = busqueda.trim().toLowerCase();

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
          <TouchableOpacity onPress={() => router.back()}>
            <ThemedText
              style={{
                color: colors.primario,
                fontWeight: 'bold',
              }}
            >
              ← Volver
            </ThemedText>
          </TouchableOpacity>

          <View>
            <ThemedText type="titulo">
              Productos
            </ThemedText>

            <ThemedText type="suave">
              Consulta los productos registrados en One Space.
            </ThemedText>
          </View>

          <ThemedButton titulo="Escanear QR" onPress={() => setEscaneando(true)} />
          <EscanerQR
            visible={escaneando}
            onCerrar={() => setEscaneando(false)}
            onLeido={async (texto) => {
              setEscaneando(false);
              const id = await idDeProductoPorQR(texto);
              if (id) router.push({ pathname: '/detalle', params: { id } });
              else Alert.alert('QR no reconocido', 'Ese código no es de un producto.');
            }}
          />

          <ThemedInput
            placeholder="Buscar por tipo, marca o modelo..."
            value={busqueda}
            onChangeText={setBusqueda}
          />

          {puedeCrear && (
            <ThemedButton
              titulo="+ Nuevo producto"
              onPress={() => router.push('/nuevo')}
            />
          )}

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
