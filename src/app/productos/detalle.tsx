import { useLocalSearchParams, useRouter } from 'expo-router';
import { ScrollView, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedCard } from '@/components/ThemedCard';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { productosPrueba } from '@/data/productosPrueba';
import { useTheme } from '@/theme';

export default function DetalleProductoScreen() {
  const router = useRouter();
  const colors = useTheme();

  const { id } = useLocalSearchParams();

  const producto = productosPrueba.find(
    (item) => item.id === Number(id)
  );

  if (!producto) {
    return (
      <ThemedView
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          padding: 24,
        }}
      >
        <ThemedText>Producto no encontrado.</ThemedText>
      </ThemedView>
    );
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
              Fotografía del producto
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