import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  Alert,
  Image,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Archivo, subirArchivo, tomarFoto } from '@/archivos';
import { ThemedButton } from '@/components/ThemedButton';
import { ThemedCard } from '@/components/ThemedCard';
import { ThemedInput } from '@/components/ThemedInput';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { leerPrecio, MONEDA } from '@/precios';
import { supabase } from '@/supabase';
import { useTheme } from '@/theme';

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
  const [precio, setPrecio] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [foto, setFoto] = useState<Archivo | null>(null);

  async function guardarProducto() {
    if (guardando) return;

    if (!tipo.trim() || !modelo.trim()) {
      Alert.alert(
        'Aviso',
        'Ingresa el tipo y modelo del producto.'
      );
      return;
    }

    const precioLeido = leerPrecio(precio);
    if (!precioLeido.ok) {
      Alert.alert('Aviso', 'Ingresa un precio válido (número mayor o igual a 0).');
      return;
    }

    setGuardando(true);

    try {
      const tipoId = await buscarOCrear(
        'tipos_producto',
        tipo
      );

      if (tipoId === null) return;

      let marcaId: number | string | null = null;

      if (marca.trim()) {
        marcaId = await buscarOCrear('marcas', marca);

        if (marcaId === null) return;
      }

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
      const { data: creado, error: guardarError } = await supabase
        .from('productos')
        .insert({
          tipo_producto_id: tipoId,
          marca_id: marcaId,
          modelo: modelo.trim(),
          descripcion: descripcion.trim() || null,
          unidad_medida_id: unidadData.id,
          precio: precioLeido.valor,
        })
        .select('id')
        .single();

      if (guardarError) throw guardarError;

      // Subir la fotografía y guardar su enlace en el producto.
      if (foto && creado) {
        const ruta = await subirArchivo('productos', `${creado.id}.jpg`, foto);
        if (ruta) await supabase.from('productos').update({ foto_path: ruta }).eq('id', creado.id);
      }

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

            <ThemedText>Precio unitario (opcional)</ThemedText>
            <ThemedInput
              placeholder={`Ej. ${MONEDA} 125.50`}
              value={precio}
              onChangeText={setPrecio}
              keyboardType="decimal-pad"
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

            {foto ? (
              <Image source={{ uri: foto.uri }} style={{ width: 160, height: 160, borderRadius: 12 }} />
            ) : (
              <ThemedText type="suave">No se ha seleccionado una fotografía.</ThemedText>
            )}

            <TouchableOpacity
              onPress={async () => {
                const nueva = await tomarFoto();
                if (nueva) setFoto(nueva);
              }}
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
                {foto ? 'Cambiar fotografía' : 'Tomar fotografía'}
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
