import { useEffect, useState } from 'react';
import { Alert, ScrollView, Switch, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { ThemedCard } from '@/components/ThemedCard';
import { ThemedInput } from '@/components/ThemedInput';
import { ThemedButton } from '@/components/ThemedButton';
import { BotonVolver } from '@/components/BotonVolver';
import { PERMISOS, Rol, borrarRol, guardarRol, obtenerRoles } from '@/configuracion';
import { useTheme } from '@/theme';
type Edicion = { id?: number; nombre: string; descripcion: string; permisos: string[]; protegido: boolean };

export default function Roles() {
  const colors = useTheme();
  const [roles, setRoles] = useState<Rol[]>([]);
  const [edicion, setEdicion] = useState<Edicion | null>(null);
  const [error, setError] = useState('');
  const [guardando, setGuardando] = useState(false);
  async function cargar() {
    setRoles(await obtenerRoles());
  }
  useEffect(() => {
    cargar();
  }, []);
  function nuevo() {
    setError('');
    setEdicion({ nombre: '', descripcion: '', permisos: [], protegido: false });
  }
  function abrir(r: Rol) {
    setError('');
    setEdicion({
      id: r.id,
      nombre: r.nombre,
      descripcion: r.descripcion ?? '',
      permisos: r.permisos,
      protegido: r.nombre === 'administrador',
    });
  }

  function alternarPermiso(clave: string) {
    if (!edicion) return;
    const tiene = edicion.permisos.includes(clave);
    setEdicion({
      ...edicion,
      permisos: tiene ? edicion.permisos.filter((p) => p !== clave) : [...edicion.permisos, clave],
    });
  }

  async function guardar() {
    if (!edicion) return;
    if (edicion.nombre.trim() === '') {
      setError('Escribe un nombre para el rol.');
      return;
    }

    setError('');
    setGuardando(true);
    const mensaje = await guardarRol(edicion, edicion.id);
    setGuardando(false);

    if (mensaje) {
      setError(mensaje);
      return;
    }
    setEdicion(null);
    cargar();
  }

  function confirmarBorrado() {
    if (!edicion?.id) return;
    const id = edicion.id;
    Alert.alert('Eliminar rol', `¿Eliminar el rol "${edicion.nombre}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          const mensaje = await borrarRol(id);
          if (mensaje) {
            setError(mensaje);
            return;
          }
          setEdicion(null);
          cargar();
        },
      },
    ]);
  }

  return (
    <ThemedView style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ padding: 24, gap: 12 }} keyboardShouldPersistTaps="handled">
          <BotonVolver onPress={edicion ? () => setEdicion(null) : undefined} />
          <ThemedText type="titulo">{edicion ? (edicion.id ? 'Editar rol' : 'Nuevo rol') : 'Roles y permisos'}</ThemedText>

          {edicion && (
            <ThemedCard style={{ gap: 12 }}>
              <ThemedInput
                placeholder="Nombre del rol"
                value={edicion.nombre}
                onChangeText={(t) => setEdicion({ ...edicion, nombre: t })}
                editable={!edicion.protegido}
              />
              <ThemedInput
                placeholder="Descripción (opcional)"
                value={edicion.descripcion}
                onChangeText={(t) => setEdicion({ ...edicion, descripcion: t })}
              />

              <ThemedText style={{ fontWeight: 'bold' }}>Permisos</ThemedText>
              {PERMISOS.map((p) => {
                const bloqueado = edicion.protegido && p.clave === 'configuracion.gestionar';
                return (
                  <View key={p.clave} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <ThemedText style={{ flex: 1 }}>{p.etiqueta}</ThemedText>
                    <Switch
                      value={edicion.permisos.includes(p.clave)}
                      disabled={bloqueado}
                      onValueChange={() => alternarPermiso(p.clave)}
                      trackColor={{ true: colors.primario }}
                    />
                  </View>
                );
              })}
              {edicion.protegido && (
                <ThemedText type="suave">
                  El rol administrador no se puede renombrar ni borrar, y siempre conserva el permiso de configuración.
                </ThemedText>
              )}

              {error !== '' && <ThemedText type="error">{error}</ThemedText>}
              <ThemedButton titulo="Guardar" onPress={guardar} cargando={guardando} />

              {edicion.id && !edicion.protegido && (
                <TouchableOpacity onPress={confirmarBorrado}>
                  <ThemedText type="error" style={{ textAlign: 'center' }}>
                    Eliminar rol
                  </ThemedText>
                </TouchableOpacity>
              )}
            </ThemedCard>
          )}

          {!edicion && (
            <>
              <ThemedButton titulo="Nuevo rol" onPress={nuevo} />
              {roles.map((r) => (
                <TouchableOpacity key={r.id} onPress={() => abrir(r)}>
                  <ThemedCard>
                    <ThemedText>{r.nombre}</ThemedText>
                    {r.descripcion && <ThemedText type="suave">{r.descripcion}</ThemedText>}
                    <ThemedText type="suave">
                      {r.permisos.length} permiso{r.permisos.length === 1 ? '' : 's'}
                    </ThemedText>
                  </ThemedCard>
                </TouchableOpacity>
              ))}
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}
