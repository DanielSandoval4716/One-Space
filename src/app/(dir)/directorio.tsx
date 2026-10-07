import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedButton } from '@/components/ThemedButton';
import { ThemedInput } from '@/components/ThemedInput';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { ContactoCard } from '@/components/directorio/ContactoCard';
import {
  personasPrueba,
  proveedoresPrueba,
  TipoContacto,
} from '@/data/directorioPrueba';
import { useTheme } from '@/theme';

const PESTANAS: { tipo: TipoContacto; titulo: string }[] = [
  { tipo: 'proveedor', titulo: 'Proveedores' },
  { tipo: 'persona', titulo: 'Personas' },
];

export default function DirectorioScreen() {
  const router = useRouter();
  const colors = useTheme();
  const [pestana, setPestana] = useState<TipoContacto>('proveedor');
  const [busqueda, setBusqueda] = useState('');
  const [, setVersion] = useState(0);

  // Al volver desde el detalle, se vuelve a leer la lista.
  useFocusEffect(
    useCallback(() => {
      setVersion((v) => v + 1);
    }, [])
  );

  const texto = busqueda.toLowerCase();

  const proveedores = proveedoresPrueba.filter(
    (p) =>
      p.nombre.toLowerCase().includes(texto) ||
      p.identificacion.toLowerCase().includes(texto) ||
      p.contacto.toLowerCase().includes(texto)
  );

  const personas = personasPrueba.filter(
    (p) =>
      p.nombre.toLowerCase().includes(texto) ||
      p.identificacion.toLowerCase().includes(texto) ||
      p.cargo.toLowerCase().includes(texto)
  );

  const esProveedor = pestana === 'proveedor';
  const cantidad = esProveedor ? proveedores.length : personas.length;

  function abrir(tipo: TipoContacto, id?: number) {
    router.push({
      pathname: '/contacto',
      params: id ? { tipo, id: String(id) } : { tipo },
    });
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

          <View>
            <ThemedText type="titulo">Directorio</ThemedText>
            <ThemedText type="suave">
              Proveedores y personas relacionadas con las operaciones.
            </ThemedText>
          </View>

          <View style={{ flexDirection: 'row', gap: 8 }}>
            {PESTANAS.map((p) => {
              const activa = p.tipo === pestana;
              return (
                <Pressable
                  key={p.tipo}
                  onPress={() => setPestana(p.tipo)}
                  style={{
                    flex: 1,
                    padding: 12,
                    borderRadius: 12,
                    alignItems: 'center',
                    borderWidth: 1,
                    borderColor: activa ? colors.primario : colors.borde,
                    backgroundColor: activa ? colors.primario : colors.tarjeta,
                  }}
                >
                  <ThemedText
                    style={{
                      fontWeight: 'bold',
                      color: activa ? colors.textoSobrePrimario : colors.texto,
                    }}
                  >
                    {p.titulo}
                  </ThemedText>
                </Pressable>
              );
            })}
          </View>

          <ThemedInput
            placeholder={
              esProveedor
                ? 'Buscar por nombre, identificación o contacto...'
                : 'Buscar por nombre, identificación o cargo...'
            }
            value={busqueda}
            onChangeText={setBusqueda}
          />

          <ThemedButton
            titulo={esProveedor ? '+ Nuevo proveedor' : '+ Nueva persona'}
            onPress={() => abrir(pestana)}
          />

          <ThemedText
            style={{
              fontSize: 18,
              fontWeight: 'bold',
            }}
          >
            {esProveedor ? 'Proveedores registrados' : 'Personas registradas'} (
            {cantidad})
          </ThemedText>

          {esProveedor &&
            proveedores.map((p) => (
              <ContactoCard
                key={p.id}
                titulo={p.nombre}
                lineas={[
                  p.identificacion && `Identificación: ${p.identificacion}`,
                  p.telefono && `Teléfono: ${p.telefono}`,
                  p.correo && `Correo: ${p.correo}`,
                ].filter((l): l is string => !!l)}
                onPress={() => abrir('proveedor', p.id)}
              />
            ))}

          {!esProveedor &&
            personas.map((p) => (
              <ContactoCard
                key={p.id}
                titulo={p.nombre}
                lineas={[
                  p.cargo && `Cargo: ${p.cargo}`,
                  p.roles.length > 0 && `Roles: ${p.roles.join(', ')}`,
                ].filter((l): l is string => !!l)}
                onPress={() => abrir('persona', p.id)}
              />
            ))}

          {cantidad === 0 && (
            <ThemedText type="suave">
              {esProveedor
                ? 'No se encontraron proveedores.'
                : 'No se encontraron personas.'}
            </ThemedText>
          )}
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}
