import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
    Alert,
    ScrollView,
    TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedButton } from '@/components/ThemedButton';
import { ThemedCard } from '@/components/ThemedCard';
import { ThemedInput } from '@/components/ThemedInput';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useTheme } from '@/theme';

export default function NuevoProductoScreen() {
  const router = useRouter();
  const colors = useTheme();

  const [tipo, setTipo] = useState('');
  const [marca, setMarca] = useState('');
  const [modelo, setModelo] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [unidad, setUnidad] = useState('');

  function guardarProducto() {
    Alert.alert(
      'Producto',
      'Producto guardado de forma provisional.'
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
            Nuevo producto
          </ThemedText>

          <ThemedText type="suave">
            Ingresa la información del producto.
          </ThemedText>

          <ThemedCard style={{ gap: 14 }}>
            <ThemedText>Tipo de producto</ThemedText>

            <ThemedInput
              placeholder="Ej. Mouse"
              value={tipo}
              onChangeText={setTipo}
            />

            <ThemedText>Marca</ThemedText>

            <ThemedInput
              placeholder="Ej. Logitech"
              value={marca}
              onChangeText={setMarca}
            />

            <ThemedText>Modelo</ThemedText>

            <ThemedInput
              placeholder="Ej. G502"
              value={modelo}
              onChangeText={setModelo}
            />

            <ThemedText>Descripción</ThemedText>

            <ThemedInput
              placeholder="Descripción del producto"
              value={descripcion}
              onChangeText={setDescripcion}
              multiline
              style={{
                minHeight: 90,
                textAlignVertical: 'top',
              }}
            />

            <ThemedText>Unidad de medida</ThemedText>

            <ThemedInput
              placeholder="Ej. Unidad"
              value={unidad}
              onChangeText={setUnidad}
            />
          </ThemedCard>

          <ThemedCard
            style={{
              alignItems: 'center',
              gap: 10,
            }}
          >
            <ThemedText
              style={{
                fontWeight: 'bold',
              }}
            >
              Fotografía del producto
            </ThemedText>

            <ThemedText type="suave">
              No se ha seleccionado una fotografía.
            </ThemedText>

            <TouchableOpacity
              onPress={() =>
                Alert.alert(
                  'Fotografía',
                  'Esta función se implementará posteriormente.'
                )
              }
              style={{
                borderColor: colors.primario,
                borderWidth: 1,
                padding: 12,
                borderRadius: 12,
              }}
            >
              <ThemedText
                style={{
                  color: colors.primario,
                  fontWeight: 'bold',
                }}
              >
                Seleccionar fotografía
              </ThemedText>
            </TouchableOpacity>
          </ThemedCard>

          <ThemedButton
            titulo="Guardar producto"
            onPress={guardarProducto}
          />
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}