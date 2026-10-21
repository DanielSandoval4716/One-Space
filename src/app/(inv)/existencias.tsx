import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { obtenerSesion } from '@/auth';
import { ThemedCard } from '@/components/ThemedCard';
import { ThemedInput } from '@/components/ThemedInput';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { ExistenciaProducto, obtenerExistencias } from '@/existencias';
import { useTheme } from '@/theme';

export default function Existencias() {
  const router = useRouter();
  const colors = useTheme();

  const [productos, setProductos] = useState<ExistenciaProducto[]>([]);
  const [cargando, setCargando] = useState(true);
  const [fallo, setFallo] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [soloBajas, setSoloBajas] = useState(false);
  const [abierto, setAbierto] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    const session = await obtenerSesion();
    if (!session) {
      router.replace('/login');
      return;
    }
    const datos = await obtenerExistencias();
    setFallo(datos === null);
    if (datos) setProductos(datos);
    setCargando(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      cargar();
    }, [cargar])
  );

  const texto = busqueda.trim().toLowerCase();
  const visibles = productos.filter(
    (p) => `${p.nombre} ${p.tipo}`.toLowerCase().includes(texto) && (!soloBajas || p.stockBajo)
  );
  const cantidadBajas = productos.filter((p) => p.stockBajo).length;

  return (
    <ThemedView style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={{ padding: 24, gap: 16 }}
          keyboardShouldPersistTaps="handled"
          refreshControl={<RefreshControl refreshing={cargando} onRefresh={cargar} />}
        >
          <TouchableOpacity onPress={() => router.back()}>
            <ThemedText style={{ color: colors.primario, fontWeight: 'bold' }}>← Volver</ThemedText>
          </TouchableOpacity>

          <View>
            <ThemedText type="titulo">Existencias</ThemedText>
            <ThemedText type="suave">Cantidades por producto y ubicación.</ThemedText>
          </View>

          <ThemedInput
            placeholder="Buscar por tipo, marca o modelo..."
            value={busqueda}
            onChangeText={setBusqueda}
          />

          <Pressable
            onPress={() => setSoloBajas((v) => !v)}
            style={{
              alignSelf: 'flex-start',
              paddingVertical: 8,
              paddingHorizontal: 14,
              borderRadius: 20,
              borderWidth: 1,
              borderColor: soloBajas ? colors.aviso : colors.borde,
              backgroundColor: soloBajas ? colors.aviso : colors.tarjeta,
            }}
          >
            <ThemedText
              style={{
                fontSize: 14,
                color: soloBajas ? colors.textoSobrePrimario : colors.texto,
              }}
            >
              Solo existencias bajas ({cantidadBajas})
            </ThemedText>
          </Pressable>

          {fallo && (
            <ThemedText type="error">
              No se pudieron cargar las existencias. Revisa tu conexión o tus permisos.
            </ThemedText>
          )}

          {!cargando && !fallo && visibles.length === 0 && (
            <ThemedText type="suave">No se encontraron productos.</ThemedText>
          )}

          {visibles.map((p) => {
            const expandido = abierto === p.id;
            return (
              <Pressable key={p.id} onPress={() => setAbierto(expandido ? null : p.id)}>
                <ThemedCard style={{ gap: 6 }}>
                  <ThemedText style={{ fontSize: 18, fontWeight: 'bold' }}>{p.nombre}</ThemedText>
                  <ThemedText type="suave">{p.tipo}</ThemedText>

                  <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
                    <ThemedText style={{ fontSize: 28, fontWeight: 'bold' }}>{p.total}</ThemedText>
                    <ThemedText type="suave">{p.unidad || 'unidades'} en total</ThemedText>
                  </View>

                  {p.stockBajo && (
                    <ThemedText style={{ color: colors.aviso, fontWeight: 'bold' }}>
                      ⚠ Existencia baja
                    </ThemedText>
                  )}

                  {expandido && (
                    <View
                      style={{
                        gap: 6,
                        marginTop: 6,
                        paddingTop: 10,
                        borderTopWidth: 1,
                        borderTopColor: colors.borde,
                      }}
                    >
                      {p.ubicaciones.length === 0 && (
                        <ThemedText type="suave">Sin existencias en ninguna ubicación.</ThemedText>
                      )}
                      {p.ubicaciones.map((u) => (
                        <View
                          key={u.ubicacionId}
                          style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}
                        >
                          <ThemedText type="suave" style={{ flex: 1 }}>
                            {u.lugar}
                          </ThemedText>
                          <ThemedText style={{ fontWeight: 'bold' }}>
                            {u.cantidad} {p.unidad}
                          </ThemedText>
                        </View>
                      ))}
                    </View>
                  )}

                  <ThemedText style={{ color: colors.primario, fontWeight: 'bold', marginTop: 4 }}>
                    {expandido ? 'Ocultar ubicaciones' : 'Ver por ubicación'}
                  </ThemedText>
                </ThemedCard>
              </Pressable>
            );
          })}
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}
