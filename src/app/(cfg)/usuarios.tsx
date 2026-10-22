import { useEffect, useState } from 'react';
import { ScrollView, Switch, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { ThemedCard } from '@/components/ThemedCard';
import { ThemedInput } from '@/components/ThemedInput';
import { ThemedButton } from '@/components/ThemedButton';
import { BotonVolver } from '@/components/BotonVolver';
import { Chips } from '@/components/Chips';
import { obtenerSesion } from '@/auth';
import { Rol, Usuario, actualizarUsuario, crearUsuario, obtenerRoles, obtenerUsuarios } from '@/configuracion';
import { useTheme } from '@/theme';

const formVacio = { nombre: '', email: '', password: '', rol_id: '' };

export default function Usuarios() {
  const colors = useTheme();
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [roles, setRoles] = useState<Rol[]>([]);
  const [miId, setMiId] = useState('');
  const [form, setForm] = useState(formVacio);
  const [error, setError] = useState('');
  const [aviso, setAviso] = useState('');
  const [creando, setCreando] = useState(false);

  async function cargar() {
    const session = await obtenerSesion();
    setMiId(session?.user.id ?? '');
    setRoles(await obtenerRoles());
    setUsuarios(await obtenerUsuarios());
  }

  useEffect(() => {
    cargar();
  }, []);

  const opcionesRol = roles.map((r) => ({ valor: String(r.id), etiqueta: r.nombre }));

  async function crear() {
    if (!form.nombre.trim() || !form.email.trim() || !form.password || !form.rol_id) {
      setError('Completa todos los campos.');
      return;
    }
    if (form.password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres.');
      return;
    }

    setError('');
    setAviso('');
    setCreando(true);
    const mensaje = await crearUsuario({
      nombre: form.nombre,
      email: form.email,
      password: form.password,
      rol_id: Number(form.rol_id),
    });
    setCreando(false);

    if (mensaje) {
      setError(mensaje);
      return;
    }
    setForm(formVacio);
    setAviso('Usuario creado. Ya puede iniciar sesión.');
    cargar();
  }

  async function cambiar(u: Usuario, cambios: { rol_id?: number; activa?: boolean }) {
    const mensaje = await actualizarUsuario(u.id, cambios);
    setAviso('');
    if (mensaje) {
      setError(mensaje);
      return;
    }
    setError('');
    cargar();
  }

  return (
    <ThemedView style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ padding: 24, gap: 12 }} keyboardShouldPersistTaps="handled">
          <BotonVolver />
          <ThemedText type="titulo">Usuarios</ThemedText>

          <ThemedCard style={{ gap: 12 }}>
            <ThemedText>Nuevo usuario</ThemedText>
            <ThemedInput
              placeholder="Nombre"
              value={form.nombre}
              onChangeText={(t) => setForm({ ...form, nombre: t })}
            />
            <ThemedInput
              placeholder="Correo electrónico"
              value={form.email}
              onChangeText={(t) => setForm({ ...form, email: t })}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <ThemedInput
              placeholder="Contraseña (mínimo 8 caracteres)"
              value={form.password}
              onChangeText={(t) => setForm({ ...form, password: t })}
              secureTextEntry
              autoCapitalize="none"
            />
            <ThemedText type="suave">Rol</ThemedText>
            <Chips opciones={opcionesRol} valor={form.rol_id} onCambio={(v) => setForm({ ...form, rol_id: v })} />

            {error !== '' && <ThemedText type="error">{error}</ThemedText>}
            {aviso !== '' && <ThemedText style={{ color: colors.exito }}>{aviso}</ThemedText>}
            <ThemedButton titulo="Crear usuario" onPress={crear} cargando={creando} />
          </ThemedCard>
          <ThemedText style={{ fontSize: 18, fontWeight: 'bold' }}>Usuarios con acceso</ThemedText>
          {usuarios.length === 0 && <ThemedText type="suave">Aún no hay usuarios.</ThemedText>}
          {usuarios.map((u) => {
            const soyYo = u.usuario_id === miId;
            return (
              <ThemedCard key={u.id} style={{ gap: 12 }}>
                <View>
                  <ThemedText style={{ fontWeight: 'bold' }}>
                    {u.nombre}
                    {soyYo ? ' (tú)' : ''}
                  </ThemedText>
                  {u.email && <ThemedText type="suave">{u.email}</ThemedText>}
                </View>

                <Chips
                  opciones={opcionesRol}
                  valor={u.rol_id ? String(u.rol_id) : ''}
                  onCambio={(v) => cambiar(u, { rol_id: Number(v) })}
                  deshabilitado={soyYo}
                />

                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <ThemedText>{u.activa ? 'Activo' : 'Inactivo'}</ThemedText>
                  <Switch
                    value={u.activa}
                    disabled={soyYo}
                    onValueChange={(v) => cambiar(u, { activa: v })}
                    trackColor={{ true: colors.primario }}
                  />
                </View>
              </ThemedCard>
            );
          })}
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}
