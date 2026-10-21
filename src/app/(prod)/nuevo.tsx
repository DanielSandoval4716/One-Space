
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
import { supabase } from '@/supabase';
import { useTheme } from '@/theme';

export default function NuevoProductoScreen() {
  const router = useRouter();
  const colors = useTheme();

  const [tipo, setTipo] = useState('');
  const [marca, setMarca] = useState('');
  const [modelo, setModelo] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [unidad, setUnidad] = useState('');
  const [guardando, setGuardando] = useState(false);

  async function guardarProducto() {
    if (guardando) return;

    if (!tipo.trim() || !modelo.trim()) {
      Alert.alert(
        'Aviso',
        'Ingresa el tipo y modelo del producto.'
      );
      return;
    }

    setGuardando(true);

    try {
      // Buscar tipo de producto
      const { data: tipoData, error: tipoError } =
        await supabase
          .from('tipos_producto')
          .select('id')
          .ilike('nombre', tipo.trim())
          .maybeSingle();

      if (tipoError) throw tipoError;

      if (!tipoData) {
        Alert.alert(
          'Aviso',
          'El tipo de producto no existe en la base de datos.'
        );
        return;
      }

      // Buscar marca
      let marcaId: number | null = null;

      if (marca.trim()) {
        const { data: marcaData, error: marcaError } =
          await supabase
            .from('marcas')
            .select('id')
            .ilike('nombre', marca.trim())
            .maybeSingle();

        if (marcaError) throw marcaError;

        if (!marcaData) {
          Alert.alert(
            'Aviso',
            'La marca no existe en la base de datos.'
          );
          return;
        }

        marcaId = marcaData.id;
      }

      // Buscar unidad de medida
      const { data: unidadData, error: unidadError } =
        await supabase
          .from('unidades_medida')
          .select('id')
          .ilike('nombre', unidad.trim() || 'Unidad')
          .maybeSingle();

      if (unidadError) throw unidadError;

      if (!unidadData) {
        Alert.alert(
          'Aviso',
          'La unidad de medida no existe.'
        );
        return;
      }

      // Guardar producto en Supabase
      const { error: guardarError } = await supabase
        .from('productos')
        .insert({
          tipo_producto_id: tipoData.id,
          marca_id: marcaId,
          modelo: modelo.trim(),
          descripcion: descripcion.trim() || null,
          unidad_medida_id: unidadData.id,
        });

      if (guardarError) throw guardarError;

      Alert.alert(
        'Éxito',
        'Producto guardado correctamente.',
        [
          {
            text: 'Aceptar',
            onPress: () => router.back(),
          },
        ]
      );
    } catch (error: any) {
      Alert.alert(
        'Error',
        error.message || 'No se pudo guardar el producto.'
      );
    } finally {
      setGuardando(false);
    }
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

            <ThemedText>
              Unidad de medida (opcional)
            </ThemedText>
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
            titulo={guardando ? 'Guardando...' : 'Guardar producto'}
            onPress={guardarProducto}
          />
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}
