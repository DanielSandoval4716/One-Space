import { SinPermiso } from '@/components/SinPermiso';
import { usePermiso } from '@/permisos';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, KeyboardTypeOptions, Pressable, ScrollView, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedButton } from '@/components/ThemedButton';
import { ThemedCard } from '@/components/ThemedCard';
import { ThemedInput } from '@/components/ThemedInput';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import {
  EntradaProveedor,
  Responsabilidad,
  TipoContacto,
  guardarPersona,
  guardarProveedor,
  obtenerEntradasDeProveedor,
  obtenerPersonas,
  obtenerProveedores,
  obtenerResponsabilidades,
} from '@/directorio';
import { formatearFechaHora } from '@/movimientos';
import { useTheme } from '@/theme';

type Campo = { clave: string; etiqueta: string; placeholder: string; teclado?: KeyboardTypeOptions };

const CAMPOS: Record<TipoContacto, Campo[]> = {
  proveedor: [
    { clave: 'nombre', etiqueta: 'Nombre', placeholder: 'Ej. Distribuidora Tecno, S.A.' },
    { clave: 'identificacion', etiqueta: 'Identificación (NIT)', placeholder: 'Ej. 1234567-8' },
    { clave: 'contacto', etiqueta: 'Persona de contacto', placeholder: 'Ej. Ana López' },
    { clave: 'telefono', etiqueta: 'Teléfono', placeholder: 'Ej. 5555-0000', teclado: 'phone-pad' },
    { clave: 'correo', etiqueta: 'Correo electrónico', placeholder: 'Ej. ventas@empresa.com', teclado: 'email-address' },
    { clave: 'direccion', etiqueta: 'Dirección', placeholder: 'Dirección del proveedor' },
  ],
  persona: [
    { clave: 'nombre', etiqueta: 'Nombre', placeholder: 'Ej. María Gómez' },
    { clave: 'identificacion', etiqueta: 'Identificación', placeholder: 'Documento de identificación' },
    { clave: 'cargo', etiqueta: 'Cargo', placeholder: 'Ej. Encargada de bodega' },
    { clave: 'telefono', etiqueta: 'Teléfono', placeholder: 'Ej. 5555-0000', teclado: 'phone-pad' },
    { clave: 'correo', etiqueta: 'Correo electrónico', placeholder: 'Ej. persona@correo.com', teclado: 'email-address' },
  ],
};

export default function ContactoScreen() {
  const permitido = usePermiso(['proveedores.gestionar', 'personas.gestionar']);
  const router = useRouter();
  const colors = useTheme();
  const params = useLocalSearchParams<{ tipo?: string; id?: string }>();

  const tipo: TipoContacto = params.tipo === 'persona' ? 'persona' : 'proveedor';
  const id = params.id ? Number(params.id) : undefined;
  const esProveedor = tipo === 'proveedor';
  const esNuevo = id === undefined;
  const campos = CAMPOS[tipo];

  const [existente, setExistente] = useState<Record<string, any> | undefined>();
  const [catalogo, setCatalogo] = useState<Responsabilidad[]>([]); // responsabilidades disponibles
  const [entradas, setEntradas] = useState<EntradaProveedor[]>([]);
  const [cargando, setCargando] = useState(!esNuevo);
  const [editando, setEditando] = useState(esNuevo);
  const [guardando, setGuardando] = useState(false);
  const [valores, setValores] = useState<Record<string, string>>({});
  const [roles, setRoles] = useState<number[]>([]); // ids de responsabilidades elegidas

  // Lee el registro (y lo que necesita) desde Supabase.
  useEffect(() => {
    async function cargar() {
      if (!esProveedor) setCatalogo(await obtenerResponsabilidades());
      if (id !== undefined) {
        const lista: any[] = esProveedor ? await obtenerProveedores() : await obtenerPersonas();
        const encontrado = lista.find((x) => x.id === id);
        setExistente(encontrado);
        setValores(valoresDe(encontrado, campos));
        setRoles((encontrado?.roles ?? []).map((r: Responsabilidad) => r.id));
        if (esProveedor) setEntradas(await obtenerEntradasDeProveedor(id));
      }
      setCargando(false);
    }
    cargar();
  }, []);

  function cambiar(clave: string, valor: string) {
    setValores((actual) => ({ ...actual, [clave]: valor }));
  }

  function alternarRol(rolId: number) {
    setRoles((actual) => (actual.includes(rolId) ? actual.filter((r) => r !== rolId) : [...actual, rolId]));
  }

  function cancelarEdicion() {
    if (esNuevo) return router.back();
    setValores(valoresDe(existente, campos));
    setRoles((existente?.roles ?? []).map((r: Responsabilidad) => r.id));
    setEditando(false);
  }

  async function guardar() {
    const v = (clave: string) => (valores[clave] ?? '').trim();
    if (!v('nombre')) {
      Alert.alert('Falta información', 'El nombre es obligatorio.');
      return;
    }

    setGuardando(true);
    const error = esProveedor
      ? await guardarProveedor({
          id,
          nombre: v('nombre'),
          identificacion: v('identificacion'),
          contacto: v('contacto'),
          telefono: v('telefono'),
          correo: v('correo'),
          direccion: v('direccion'),
        })
      : await guardarPersona(
          {
            id,
            nombre: v('nombre'),
            identificacion: v('identificacion'),
            cargo: v('cargo'),
            telefono: v('telefono'),
            correo: v('correo'),
          },
          roles
        );
    setGuardando(false);

    if (error) {
      Alert.alert('No se pudo guardar', error);
      return;
    }
    router.back();
  }

  if (cargando) {
    return (
      <ThemedView style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ThemedText type="suave">Cargando...</ThemedText>
      </ThemedView>
    );
  }

  if (!esNuevo && !existente) {
    return (
      <ThemedView style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 }}>
        <ThemedText>{esProveedor ? 'Proveedor no encontrado.' : 'Persona no encontrada.'}</ThemedText>
      </ThemedView>
    );
  }

  const nombreTipo = esProveedor ? 'proveedor' : 'persona';
  const titulo = esNuevo ? `Nuevo ${nombreTipo}` : editando ? `Editar ${nombreTipo}` : `Detalle del ${nombreTipo}`;

  if (permitido !== true) return <SinPermiso cargando={permitido === null} />;

  return (
    <ThemedView style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ padding: 24, gap: 16 }} keyboardShouldPersistTaps="handled">
          <TouchableOpacity onPress={() => router.back()}>
            <ThemedText style={{ color: colors.primario, fontWeight: 'bold' }}>← Volver</ThemedText>
          </TouchableOpacity>

          <ThemedText type="titulo">{titulo}</ThemedText>

          {editando ? (
            <>
              <ThemedCard style={{ gap: 14 }}>
                {campos.map((campo) => (
                  <View key={campo.clave} style={{ gap: 6 }}>
                    <ThemedText>{campo.etiqueta}</ThemedText>
                    <ThemedInput
                      placeholder={campo.placeholder}
                      value={valores[campo.clave] ?? ''}
                      onChangeText={(texto) => cambiar(campo.clave, texto)}
                      keyboardType={campo.teclado}
                      autoCapitalize={campo.teclado === 'email-address' ? 'none' : 'sentences'}
                    />
                  </View>
                ))}
              </ThemedCard>

              {!esProveedor && (
                <ThemedCard style={{ gap: 12 }}>
                  <ThemedText style={{ fontWeight: 'bold' }}>Responsabilidades</ThemedText>
                  <ThemedText type="suave">Se administran en Configuración.</ThemedText>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                    {catalogo.map((rol) => {
                      const activo = roles.includes(rol.id);
                      return (
                        <Pressable
                          key={rol.id}
                          onPress={() => alternarRol(rol.id)}
                          style={{
                            paddingVertical: 8,
                            paddingHorizontal: 12,
                            borderRadius: 20,
                            borderWidth: 1,
                            borderColor: activo ? colors.primario : colors.borde,
                            backgroundColor: activo ? colors.primario : colors.tarjeta,
                          }}
                        >
                          <ThemedText style={{ fontSize: 14, color: activo ? colors.textoSobrePrimario : colors.texto }}>
                            {rol.nombre}
                          </ThemedText>
                        </Pressable>
                      );
                    })}
                  </View>
                </ThemedCard>
              )}

              <ThemedButton titulo="Guardar" onPress={guardar} cargando={guardando} />
              <TouchableOpacity onPress={cancelarEdicion} style={{ alignItems: 'center', padding: 8 }}>
                <ThemedText style={{ color: colors.primario, fontWeight: 'bold' }}>Cancelar</ThemedText>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <ThemedCard style={{ gap: 12 }}>
                <ThemedText style={{ fontSize: 22, fontWeight: 'bold' }}>{String(existente?.nombre ?? '')}</ThemedText>
                {campos
                  .filter((campo) => campo.clave !== 'nombre')
                  .map((campo) => (
                    <Dato key={campo.clave} titulo={campo.etiqueta} valor={String(existente?.[campo.clave] ?? '') || '—'} />
                  ))}
                {!esProveedor && (
                  <Dato
                    titulo="Responsabilidades"
                    valor={(existente?.roles ?? []).map((r: Responsabilidad) => r.nombre).join(', ') || '—'}
                  />
                )}
              </ThemedCard>

              {esProveedor && (
                <ThemedCard style={{ gap: 6 }}>
                  <ThemedText style={{ fontWeight: 'bold' }}>Entradas relacionadas</ThemedText>
                  {entradas.length === 0 && <ThemedText type="suave">Aún no hay entradas de este proveedor.</ThemedText>}
                  {entradas.map((e) => (
                    <ThemedText key={e.id} type="suave">
                      {formatearFechaHora(e.fecha)} · {e.producto} · {e.cantidad}
                    </ThemedText>
                  ))}
                </ThemedCard>
              )}

              <ThemedButton titulo="Ver documentos" onPress={() => router.push('/documentos')} />
              <ThemedButton titulo="Editar" onPress={() => setEditando(true)} />
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

function valoresDe(registro: Record<string, any> | undefined, campos: Campo[]): Record<string, string> {
  const resultado: Record<string, string> = {};
  campos.forEach((campo) => {
    resultado[campo.clave] = registro ? String(registro[campo.clave] ?? '') : '';
  });
  return resultado;
}

function Dato({ titulo, valor }: { titulo: string; valor: string }) {
  return (
    <View>
      <ThemedText type="suave">{titulo}</ThemedText>
      <ThemedText>{valor}</ThemedText>
    </View>
  );
}
