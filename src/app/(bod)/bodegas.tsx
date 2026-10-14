import { useEffect, useState } from 'react';
import { ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { ThemedCard } from '@/components/ThemedCard';
import { ThemedInput } from '@/components/ThemedInput';
import { ThemedButton } from '@/components/ThemedButton';
import { obtenerSesion } from '@/auth';
import { Bodega, Ubicacion, obtenerBodegas, crearBodega, obtenerUbicaciones, crearUbicacion } from '@/bodegas';

export default function Bodegas() {
  const router = useRouter();

  const [bodega, setBodega] = useState<Bodega | null>(null);
  const [lista, setLista] = useState<(Bodega | Ubicacion)[]>([]);
  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [error, setError] = useState('');
  const [guardando, setGuardando] = useState(false);

  async function abrir(b: Bodega | null) {
    const datos = b ? await obtenerUbicaciones(b.id) : await obtenerBodegas();
    setBodega(b);
    setLista(datos);
    setNombre('');
    setDescripcion('');
    setError('');
  }

  useEffect(() => {
    obtenerSesion().then((session) => {
      if (session) abrir(null);
      else router.replace('/login');
    });
  }, []);

  async function guardar() {
    if (nombre.trim() === '') {
      setError('Escribe un nombre.');
      return;
    }

    setError('');
    setGuardando(true);
    const ok = bodega
      ? await crearUbicacion(bodega.id, nombre, descripcion)
      : await crearBodega(nombre, descripcion);
    setGuardando(false);

    if (!ok) setError('No se pudo guardar. Revisa que tengas permiso.');
    else abrir(bodega);
  }

  return (
    <ThemedView style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ padding: 24, gap: 12 }} keyboardShouldPersistTaps="handled">
          <TouchableOpacity onPress={bodega ? () => abrir(null) : () => router.back()}>
            <ThemedText type="suave">← Volver</ThemedText>
          </TouchableOpacity>

          <ThemedText type="titulo">{bodega ? bodega.nombre : 'Bodegas'}</ThemedText>
          {bodega?.descripcion && <ThemedText type="suave">{bodega.descripcion}</ThemedText>}

          <ThemedCard style={{ gap: 12 }}>
            <ThemedText>{bodega ? 'Nueva ubicación' : 'Nueva bodega'}</ThemedText>
            <ThemedInput placeholder="Nombre" value={nombre} onChangeText={setNombre} />
            <ThemedInput placeholder="Descripción (opcional)" value={descripcion} onChangeText={setDescripcion} />
            {error !== '' && <ThemedText type="error">{error}</ThemedText>}
            <ThemedButton titulo="Guardar" onPress={guardar} cargando={guardando} />
          </ThemedCard>

          {lista.length === 0 && <ThemedText type="suave">Aún no hay {bodega ? 'ubicaciones' : 'bodegas'}.</ThemedText>}
          {lista.map((item) => (
            <TouchableOpacity key={item.id} disabled={bodega !== null} onPress={() => abrir(item as Bodega)}>
              <ThemedCard>
                <ThemedText>{item.nombre}</ThemedText>
                {item.descripcion && <ThemedText type="suave">{item.descripcion}</ThemedText>}
              </ThemedCard>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}
