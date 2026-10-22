import { useEffect, useState } from 'react';
import { Alert, ScrollView, TouchableOpacity, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { ThemedCard } from '@/components/ThemedCard';
import { ThemedInput } from '@/components/ThemedInput';
import { ThemedButton } from '@/components/ThemedButton';
import { BotonVolver } from '@/components/BotonVolver';
import { Chips } from '@/components/Chips';
import { CATALOGOS, Elemento, borrarElemento, guardarElemento, obtenerCatalogo } from '@/configuracion';
import { useTheme } from '@/theme';

export default function Catalogo() {
  const colors = useTheme();
  const { tabla } = useLocalSearchParams<{ tabla: string }>();
  const config = CATALOGOS[tabla];

  const [lista, setLista] = useState<Elemento[]>([]);
  const [editando, setEditando] = useState<Elemento | null>(null);
  const [valores, setValores] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  const [guardando, setGuardando] = useState(false);

  async function cargar() {
    setLista(await obtenerCatalogo(tabla));
  }

  useEffect(() => {
    if (config) cargar();
  }, []);

  if (!config) {
    return (
      <ThemedView style={{ flex: 1, padding: 24 }}>
        <SafeAreaView>
          <BotonVolver />
          <ThemedText type="error">Catálogo no encontrado.</ThemedText>
        </SafeAreaView>
      </ThemedView>
    );
  }

  function limpiar() {
    setEditando(null);
    setValores({});
    setError('');
  }

  function editar(el: Elemento) {
    setEditando(el);
    setError('');
    setValores(Object.fromEntries(config.campos.map((c) => [c.clave, String(el[c.clave] ?? '')])));
  }

  async function guardar() {
    const falta = config.campos.find((c) => c.obligatorio && !(valores[c.clave] ?? '').trim());
    if (falta) {
      setError(`Completa: ${falta.etiqueta}`);
      return;
    }

    setError('');
    setGuardando(true);
    const mensaje = await guardarElemento(tabla, valores, editando?.id);
    setGuardando(false);

    if (mensaje) {
      setError(mensaje);
      return;
    }
    limpiar();
    cargar();
  }

  function confirmarBorrado() {
    if (!editando) return;
    Alert.alert('Eliminar', `¿Eliminar "${editando.nombre}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          const mensaje = await borrarElemento(tabla, editando.id);
          if (mensaje) {
            setError(mensaje);
            return;
          }
          limpiar();
          cargar();
        },
      },
    ]);
  }

  function detalle(el: Elemento) {
    return config.campos
      .filter((c) => c.clave !== 'nombre')
      .map((c) => c.opciones?.find((o) => o.valor === el[c.clave])?.etiqueta ?? el[c.clave])
      .filter(Boolean)
      .join(' · ');
  }

  return (
    <ThemedView style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ padding: 24, gap: 12 }} keyboardShouldPersistTaps="handled">
          <BotonVolver />
          <ThemedText type="titulo">{config.titulo}</ThemedText>

          <ThemedCard style={{ gap: 12 }}>
            <ThemedText>{editando ? 'Editar' : 'Nuevo'}</ThemedText>

            {config.campos.map((c) =>
              c.opciones ? (
                <View key={c.clave} style={{ gap: 8 }}>
                  <ThemedText type="suave">{c.etiqueta}</ThemedText>
                  <Chips
                    opciones={c.opciones}
                    valor={valores[c.clave] ?? ''}
                    onCambio={(v) => setValores({ ...valores, [c.clave]: v })}
                  />
                </View>
              ) : (
                <ThemedInput
                  key={c.clave}
                  placeholder={c.etiqueta}
                  value={valores[c.clave] ?? ''}
                  onChangeText={(t) => setValores({ ...valores, [c.clave]: t })}
                />
              )
            )}

            {error !== '' && <ThemedText type="error">{error}</ThemedText>}
            <ThemedButton titulo={editando ? 'Guardar cambios' : 'Guardar'} onPress={guardar} cargando={guardando} />

            {editando && (
              <>
                <TouchableOpacity onPress={limpiar}>
                  <ThemedText type="suave" style={{ textAlign: 'center' }}>
                    Cancelar
                  </ThemedText>
                </TouchableOpacity>
                <TouchableOpacity onPress={confirmarBorrado}>
                  <ThemedText type="error" style={{ textAlign: 'center' }}>
                    Eliminar
                  </ThemedText>
                </TouchableOpacity>
              </>
            )}
          </ThemedCard>

          {lista.length === 0 && <ThemedText type="suave">Aún no hay elementos.</ThemedText>}
          {lista.map((el) => (
            <TouchableOpacity key={el.id} onPress={() => editar(el)}>
              <ThemedCard style={editando?.id === el.id ? { borderColor: colors.primario } : null}>
                <ThemedText>{el.nombre}</ThemedText>
                {detalle(el) !== '' && <ThemedText type="suave">{detalle(el)}</ThemedText>}
              </ThemedCard>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}
