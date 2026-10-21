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

// Mostrar una confirmación y esperar la respuesta.
function confirmarCreacion(nombre: string): Promise<boolean> {
  return new Promise((resolve) => {
    Alert.alert(
      'Confirmar registro',
      `"${nombre}" no existe. ¿Deseas registrarlo?`,
      [
        {
          text: 'Cancelar',
          style: 'cancel',
          onPress: () => resolve(false),
        },
        {
          text: 'Crear',
          onPress: () => resolve(true),
        },
      ],
      {
        cancelable: false,
      }
    );
  });
}

// Buscar un tipo o marca y crearlo con confirmación.
async function buscarOCrear(
  tabla: 'tipos_producto' | 'marcas',
  nombre: string
): Promise<number | string | null> {
  const nombreLimpio = nombre.trim().replace(/\s+/g, ' ');

  const { data, error } = await supabase
    .from(tabla)
    .select('id, nombre')
    .ilike('nombre', nombreLimpio);

  if (error) throw error;

  const existente = data?.find(
    (item) =>
      item.nombre.trim().replace(/\s+/g, ' ').toLowerCase() ===
      nombreLimpio.toLowerCase()
  );

  if (existente) return existente.id;

  const confirmado = await confirmarCreacion(nombreLimpio);

  if (!confirmado) return null;

  const { data: nuevo, error: errorInsertar } = await supabase
    .from(tabla)
    .insert({ nombre: nombreLimpio })
    .select('id')
    .single();

  if (errorInsertar) {
    // Si otro usuario lo creó mientras confirmábamos,
    // intentamos encontrarlo nuevamente.
    const { data: repetidos, error: errorBuscar } = await supabase
      .from(tabla)
      .select('id, nombre')
      .ilike('nombre', nombreLimpio);

    if (errorBuscar) throw errorBuscar;

    const repetido = repetidos?.find(
      (item) =>
        item.nombre.trim().replace(/\s+/g, ' ').toLowerCase() ===
        nombreLimpio.toLowerCase()
    );

    if (repetido) return repetido.id;

    throw errorInsertar;
  }

  return nuevo.id;
}

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
      // Verificar o crear el tipo de producto.
      const tipoId = await buscarOCrear(
        'tipos_producto',
        tipo
      );

      if (tipoId === null) return;

      // Verificar o crear la marca.
      let marcaId: number | string | null = null;

      if (marca.trim()) {
        marcaId = await buscarOCrear('marcas', marca);

        if (marcaId === null) return;
      }

      // Buscar unidad de medida.
      const nombreUnidad = unidad.trim() || 'Unidad';

      const { data: unidades, error: unidadError } =
        await supabase
          .from('unidades_medida')
          .select('id, nombre')
          .ilike('nombre', nombreUnidad);

      if (unidadError) throw unidadError;

      const unidadData = unidades?.find(
        (item) =>
          item.nombre.trim().toLowerCase() ===
          nombreUnidad.toLowerCase()
      );

      if (!unidadData) {
        Alert.alert(
          'Aviso',
          'La unidad de medida no existe en la base de datos.'
        );
        return;
      }

      // Registrar producto.
      const { error: guardarError } = await supabase
        .from('productos')
        .insert({
          tipo_producto_id: tipoId,
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
