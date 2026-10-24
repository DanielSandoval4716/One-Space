import { useEffect, useState } from 'react';
import { Alert, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { ThemedCard } from '@/components/ThemedCard';
import { ThemedInput } from '@/components/ThemedInput';
import { ThemedButton } from '@/components/ThemedButton';
import { obtenerSesion } from '@/auth';
import { usePermiso } from '@/permisos';
import { Bodega, Ubicacion, obtenerBodegas, crearBodega, obtenerUbicaciones, crearUbicacion, obtenerExistenciasDeBodega, editarBodega, eliminarBodega } from '@/bodegas';

export default function Bodegas() {
  const router = useRouter();

  const [bodega, setBodega] = useState<Bodega | null>(null);
  const [lista, setLista] = useState<(Bodega | Ubicacion)[]>([]);
  const [contenido, setContenido] = useState<Record<number, string[]>>({});
  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [error, setError] = useState('');
  const [guardando, setGuardando] = useState(false);

  // Edición de la bodega abierta (solo con permiso de configuración)
  const puedeAdministrar = usePermiso(['configuracion.gestionar']) === true;
  const [nombreEdit, setNombreEdit] = useState('');
  const [descEdit, setDescEdit] = useState('');
  const [errorEdit, setErrorEdit] = useState('');
  const [guardandoEdit, setGuardandoEdit] = useState(false);

  async function abrir(b: Bodega | null) {
    const datos = b ? await obtenerUbicaciones(b.id) : await obtenerBodegas();
    setBodega(b);
    setLista(datos);
    setContenido(b ? await obtenerExistenciasDeBodega(b.id) : {});
    setNombre('');
    setDescripcion('');
    setError('');
    setNombreEdit(b?.nombre ?? '');
    setDescEdit(b?.descripcion ?? '');
    setErrorEdit('');
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

  async function guardarCambios() {
    if (!bodega) return;
    if (nombreEdit.trim() === '') {
      setErrorEdit('Escribe un nombre.');
      return;
    }

    setErrorEdit('');
    setGuardandoEdit(true);
    const ok = await editarBodega(bodega.id, nombreEdit, descEdit, bodega.nombre);
    setGuardandoEdit(false);

    if (!ok) {
      setErrorEdit('No se pudo guardar. Revisa que tengas permiso.');
      return;
    }
    setBodega({ ...bodega, nombre: nombreEdit.trim(), descripcion: descEdit.trim() || null });
    Alert.alert('Listo', 'Bodega actualizada.');
  }

  function confirmarEliminar() {
    if (!bodega) return;
    const n = lista.length;
    Alert.alert(
      'Eliminar bodega',
      `¿Eliminar "${bodega.nombre}"${n > 0 ? ` y sus ${n} ubicación(es)` : ''}? Esta acción no se puede deshacer.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            const r = await eliminarBodega(bodega.id, bodega.nombre);
            if (!r.ok) {
              Alert.alert('No se pudo eliminar', r.mensaje);
              return;
            }
            abrir(null);
          },
        },
      ]
    );
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

          {bodega && puedeAdministrar && (
            <ThemedCard style={{ gap: 12 }}>
              <ThemedText>Administrar bodega</ThemedText>
              <ThemedInput placeholder="Nombre" value={nombreEdit} onChangeText={setNombreEdit} />
              <ThemedInput placeholder="Descripción (opcional)" value={descEdit} onChangeText={setDescEdit} />
              {errorEdit !== '' && <ThemedText type="error">{errorEdit}</ThemedText>}
              <ThemedButton titulo="Guardar cambios" onPress={guardarCambios} cargando={guardandoEdit} />
              <TouchableOpacity onPress={confirmarEliminar}>
                <ThemedText type="error">Eliminar bodega</ThemedText>
              </TouchableOpacity>
            </ThemedCard>
          )}

          {lista.length === 0 && <ThemedText type="suave">Aún no hay {bodega ? 'ubicaciones' : 'bodegas'}.</ThemedText>}
          {lista.map((item) => (
            <TouchableOpacity key={item.id} disabled={bodega !== null} onPress={() => abrir(item as Bodega)}>
              <ThemedCard>
                <ThemedText>{item.nombre}</ThemedText>
                {item.descripcion && <ThemedText type="suave">{item.descripcion}</ThemedText>}
                {bodega !== null && (contenido[item.id] ?? []).map((linea, i) => (
                  <ThemedText key={i} type="suave">
                    • {linea}
                  </ThemedText>
                ))}
                {bodega !== null && !contenido[item.id] && <ThemedText type="suave">Sin existencias</ThemedText>}
              </ThemedCard>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}
