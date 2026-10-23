
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { obtenerSesion } from '@/auth';
import { ThemedButton } from '@/components/ThemedButton';
import { ThemedCard } from '@/components/ThemedCard';
import { ThemedInput } from '@/components/ThemedInput';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { FotoYQR } from '@/components/productos/FotoYQR';
import { obtenerPerfil, puedeVer } from '@/permisos';
import { formatearPrecio, guardarPrecio as guardarPrecioDB, leerPrecio, MONEDA } from '@/precios';
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
  precio: number | null;
};

export default function DetalleProductoScreen() {
  const router = useRouter();
  const colors = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [producto, setProducto] = useState<Producto | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  const [puedeEditar, setPuedeEditar] = useState(false);
  const [editando, setEditando] = useState(false);
  const [textoPrecio, setTextoPrecio] = useState('');
  const [guardandoPrecio, setGuardandoPrecio] = useState(false);

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
            precio,
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

        const { data: stock, error: errorStock } = await supabase
          .from('existencias_por_producto')
          .select('total')
          .eq('producto_id', id)
          .maybeSingle();

        if (errorStock) throw errorStock;

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
          precio: data.precio === null ? null : Number(data.precio),
        });

        const session = await obtenerSesion();
        if (session) {
          setPuedeEditar(puedeVer(await obtenerPerfil(session.user.id), ['productos.gestionar']));
        }
      } catch (e: any) {
        setError(e.message ?? 'Error al cargar el producto.');
      } finally {
        setCargando(false);
      }
    }

    cargarDetalle();
  }, [id]);

  async function guardarPrecio() {
    const r = leerPrecio(textoPrecio);
    if (!r.ok) {
      Alert.alert('Aviso', 'Ingresa un precio válido (número mayor o igual a 0).');
      return;
    }

    setGuardandoPrecio(true);
    const errorPrecio = await guardarPrecioDB(id, r.valor);
    setGuardandoPrecio(false);

    if (errorPrecio) {
      Alert.alert('Error', errorPrecio);
      return;
    }

    setProducto((p) => (p ? { ...p, precio: r.valor } : p));
    setEditando(false);
  }

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

              <FotoYQR productoId={producto.id} />

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

              <ThemedCard style={{ gap: 8 }}>
                <ThemedText type="suave">Precio unitario</ThemedText>

                {editando ? (
                  <>
                    <ThemedInput
                      value={textoPrecio}
                      onChangeText={setTextoPrecio}
                      keyboardType="decimal-pad"
                      placeholder={`Ej. ${MONEDA} 125.50`}
                    />
                    <ThemedButton
                      titulo="Guardar precio"
                      onPress={guardarPrecio}
                      cargando={guardandoPrecio}
                    />
                    <TouchableOpacity onPress={() => setEditando(false)}>
                      <ThemedText
                        style={{ color: colors.primario, textAlign: 'center' }}
                      >
                        Cancelar
                      </ThemedText>
                    </TouchableOpacity>
                  </>
                ) : (
                  <>
                    <ThemedText style={{ fontSize: 30, fontWeight: 'bold' }}>
                      {producto.precio === null
                        ? 'Sin precio'
                        : formatearPrecio(producto.precio)}
                    </ThemedText>

                    {producto.precio !== null && (
                      <ThemedText type="suave">
                        Valor en inventario:{' '}
                        {formatearPrecio(producto.precio * producto.existencias)}
                      </ThemedText>
                    )}

                    {puedeEditar && (
                      <TouchableOpacity
                        onPress={() => {
                          setTextoPrecio(
                            producto.precio === null ? '' : String(producto.precio)
                          );
                          setEditando(true);
                        }}
                      >
                        <ThemedText
                          style={{ color: colors.primario, fontWeight: 'bold' }}
                        >
                          {producto.precio === null ? 'Asignar precio' : 'Cambiar precio'}
                        </ThemedText>
                      </TouchableOpacity>
                    )}
                  </>
                )}
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
