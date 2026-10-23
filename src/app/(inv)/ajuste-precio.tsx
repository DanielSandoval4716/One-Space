import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedButton } from '@/components/ThemedButton';
import { ThemedCard } from '@/components/ThemedCard';
import { ThemedInput } from '@/components/ThemedInput';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { SelectorProducto } from '@/components/inventario/SelectorProducto';
import { ProductoOpcion, obtenerProductosOpcion } from '@/opcionesInventario';
import { formatearPrecio, guardarPrecio, leerPrecio, MONEDA } from '@/precios';
import { supabase } from '@/supabase';
import { useTheme } from '@/theme';

export default function AjustePrecio() {
  const router = useRouter();
  const colors = useTheme();

  const [productos, setProductos] = useState<ProductoOpcion[]>([]);
  const [producto, setProducto] = useState<ProductoOpcion | null>(null);
  const [precioActual, setPrecioActual] = useState<number | null>(null);
  const [texto, setTexto] = useState('');
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    obtenerProductosOpcion().then(setProductos);
  }, []);

  // Al elegir un producto, se consulta su precio actual
  useEffect(() => {
    setPrecioActual(null);
    setTexto('');
    if (!producto) return;
    supabase
      .from('productos')
      .select('precio')
      .eq('id', producto.id)
      .maybeSingle()
      .then(({ data }) => {
        const p = data?.precio === null || data?.precio === undefined ? null : Number(data.precio);
        setPrecioActual(p);
        setTexto(p === null ? '' : String(p));
      });
  }, [producto]);

  async function guardar() {
    if (!producto || guardando) return;

    const r = leerPrecio(texto);
    if (!r.ok) {
      Alert.alert('Aviso', 'Ingresa un precio válido (número mayor o igual a 0).');
      return;
    }
    if (r.valor === precioActual) {
      Alert.alert('Aviso', 'El precio es el mismo que ya tiene el producto.');
      return;
    }

    setGuardando(true);
    const error = await guardarPrecio(producto.id, r.valor);
    setGuardando(false);

    if (error) {
      Alert.alert('Error', error);
      return;
    }
    Alert.alert('Listo', 'Precio actualizado.', [{ text: 'Aceptar', onPress: () => router.back() }]);
  }

  return (
    <ThemedView style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ padding: 24, gap: 16 }} keyboardShouldPersistTaps="handled">
          <TouchableOpacity onPress={() => router.back()}>
            <ThemedText style={{ color: colors.primario, fontWeight: 'bold' }}>← Volver</ThemedText>
          </TouchableOpacity>

          <ThemedText type="titulo">Ajustar precio</ThemedText>
          <ThemedText type="suave">
            Actualiza el precio unitario de un producto. El cambio queda registrado en la auditoría.
          </ThemedText>

          <SelectorProducto productos={productos} seleccionado={producto} onSelect={setProducto} />

          {producto && (
            <ThemedCard style={{ gap: 12 }}>
              <ThemedText type="suave">
                Precio actual: {precioActual === null ? 'Sin precio' : formatearPrecio(precioActual)}
              </ThemedText>

              <ThemedText>Nuevo precio</ThemedText>
              <ThemedInput
                value={texto}
                onChangeText={setTexto}
                keyboardType="decimal-pad"
                placeholder={`Ej. ${MONEDA} 125.50`}
              />

              <ThemedButton titulo="Guardar precio" onPress={guardar} cargando={guardando} />
            </ThemedCard>
          )}
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}
