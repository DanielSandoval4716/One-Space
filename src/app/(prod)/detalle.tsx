
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedCard } from '@/components/ThemedCard';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
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

export default function DetalleProductoScreen() {
  const router = useRouter();
  const colors = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [producto, setProducto] = useState<Producto | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function cargarDetalle() {
      setCargando(true);
      setError('');
      setProducto(null);

      if (!id) {
        setError('No se recibió el ID del producto.');
        setCargando(false);
        return;
      }

      try {
        // Consultar producto en Supabase
        const { data, error: errorProducto } = await supabase
          .from('productos')
          .select(`
            id,
            modelo,
            descripcion,
            tipos_producto(nombre),
            marcas(nombre),
            unidades_medida(nombre)
          `)
          .eq('id', id)
          .maybeSingle();

        if (errorProducto) throw errorProducto;

        if (!data) {
          setError('Producto no encontrado.');
          return;
        }

        // Consultar existencias
        const { data: stock, error: errorStock } = await supabase
          .from('existencias_por_producto')
          .select('total')
          .eq('producto_id', id)
          .maybeSingle();

        if (errorStock) throw errorStock;

        // Obtener tipo, marca y unidad
        const tipoData = Array.isArray(data.tipos_producto)
          ? data.tipos_producto[0]
          : data.tipos_producto;

        const marcaData = Array.isArray(data.marcas)
          ? data.marcas[0]
          : data.marcas;

        const unidadData = Array.isArray(data.unidades_medida)
          ? data.unidades_medida[0]
          : data.unidades_medida;

        const tipo = tipoData?.nombre ?? 'Sin tipo';
        const marca = marcaData?.nombre ?? 'Sin marca';
        const unidad = unidadData?.nombre ?? '';

        setProducto({
          id: String(data.id),
          tipo,
          marca,
          modelo: data.modelo,
          descripcion: data.descripcion ?? '',
          unidad,
          existencias: Number(stock?.total ?? 0),
        });
      } catch (e: any) {
        setError(e.message ?? 'Error al cargar el producto.');
      } finally {
        setCargando(false);
      }
    }

    cargarDetalle();
  }, [id]);

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

          {cargando ? (
            <ActivityIndicator size="large" />
          ) : error || !producto ? (
            <ThemedText>
              {error || 'Producto no encontrado.'}
            </ThemedText>
          ) : (
            <>
              <ThemedText type="titulo">
                Detalle del producto
              </ThemedText>

              <ThemedCard
                style={{
                  height: 180,
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
              >
                <ThemedText type="suave">
                  Imagen del producto no disponible
                </ThemedText>
              </ThemedCard>

              <ThemedCard style={{ gap: 12 }}>
                <ThemedText
                  style={{
                    fontSize: 22,
                    fontWeight: 'bold',
                  }}
                >
                  {producto.marca} {producto.modelo}
                </ThemedText>

                <Dato titulo="Tipo" valor={producto.tipo} />
                <Dato titulo="Marca" valor={producto.marca} />
                <Dato titulo="Modelo" valor={producto.modelo} />

                <Dato
                  titulo="Identificador"
                  valor={`PROD-${producto.id}`}
                />

                <Dato
                  titulo="Unidad de medida"
                  valor={producto.unidad}
                />

                <Dato
                  titulo="Descripción"
                  valor={producto.descripcion}
                />
              </ThemedCard>

              <ThemedCard>
                <ThemedText type="suave">
                  Existencias actuales
                </ThemedText>

                <ThemedText
                  style={{
                    fontSize: 30,
                    fontWeight: 'bold',
                    marginTop: 5,
                  }}
                >
                  {producto.existencias}
                </ThemedText>

                <ThemedText type="suave">
                  unidades
                </ThemedText>
              </ThemedCard>
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

function Dato({
  titulo,
  valor,
}: {
  titulo: string;
  valor: string;
}) {
  return (
    <View>
      <ThemedText type="suave">
        {titulo}
      </ThemedText>

      <ThemedText>
        {valor}
      </ThemedText>
    </View>
  );
}
