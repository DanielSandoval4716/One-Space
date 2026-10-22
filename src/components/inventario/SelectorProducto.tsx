import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { ThemedCard } from '@/components/ThemedCard';
import { ThemedInput } from '@/components/ThemedInput';
import { ThemedText } from '@/components/ThemedText';
import { ProductoOpcion } from '@/opcionesInventario';
import { useTheme } from '@/theme';

type Props = {
  productos: ProductoOpcion[];
  seleccionado: ProductoOpcion | null;
  onSelect: (producto: ProductoOpcion | null) => void;
};

// Buscador de productos: al elegir uno, se muestra su resumen con opción de cambiarlo.
export function SelectorProducto({ productos, seleccionado, onSelect }: Props) {
  const colors = useTheme();
  const [busqueda, setBusqueda] = useState('');

  if (seleccionado) {
    return (
      <ThemedCard style={{ gap: 4 }}>
        <ThemedText style={{ fontSize: 18, fontWeight: 'bold' }}>{seleccionado.nombre}</ThemedText>
        <ThemedText type="suave">
          {seleccionado.tipo} · Existencia total: {seleccionado.total} {seleccionado.unidad}
        </ThemedText>
        <Pressable onPress={() => onSelect(null)}>
          <ThemedText style={{ color: colors.primario, fontWeight: 'bold', marginTop: 4 }}>
            Cambiar producto
          </ThemedText>
        </Pressable>
      </ThemedCard>
    );
  }

  const texto = busqueda.trim().toLowerCase();
  const resultados = productos
    .filter((p) => `${p.nombre} ${p.tipo}`.toLowerCase().includes(texto))
    .slice(0, 8);

  return (
    <View style={{ gap: 8 }}>
      <ThemedInput
        placeholder="Buscar por tipo, marca o modelo..."
        value={busqueda}
        onChangeText={setBusqueda}
      />

      {resultados.map((p) => (
        <Pressable
          key={p.id}
          onPress={() => {
            setBusqueda('');
            onSelect(p);
          }}
        >
          <ThemedCard style={{ gap: 2 }}>
            <ThemedText style={{ fontWeight: 'bold' }}>{p.nombre}</ThemedText>
            <ThemedText type="suave">
              {p.tipo} · {p.total} {p.unidad}
            </ThemedText>
          </ThemedCard>
        </Pressable>
      ))}

      {resultados.length === 0 && (
        <ThemedText type="suave">No se encontraron productos.</ThemedText>
      )}
    </View>
  );
}