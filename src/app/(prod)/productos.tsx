import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedButton } from '@/components/ThemedButton';
import { ThemedInput } from '@/components/ThemedInput';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { ProductoCard } from '@/components/productos/ProductoCard';
import { productosPrueba } from '@/data/productosPrueba';

export default function ProductosScreen() {
  const router = useRouter();
  const [busqueda, setBusqueda] = useState('');

  const productosFiltrados = productosPrueba.filter((producto) => {
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

          {productosFiltrados.map((producto) => (
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

          {productosFiltrados.length === 0 && (
            <ThemedText type="suave">
              No se encontraron productos.
            </ThemedText>
          )}
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}
