import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import {
  Alert,
  KeyboardTypeOptions,
  Pressable,
  ScrollView,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedButton } from '@/components/ThemedButton';
import { ThemedCard } from '@/components/ThemedCard';
import { ThemedInput } from '@/components/ThemedInput';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import {
  guardarPersona,
  guardarProveedor,
  personasPrueba,
  proveedoresPrueba,
  RolPersona,
  ROLES_PERSONA,
  TipoContacto,
} from '@/data/directorioPrueba';
import { useTheme } from '@/theme';

type Campo = {
  clave: string;
  etiqueta: string;
  placeholder: string;
  teclado?: KeyboardTypeOptions;
};

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
  const router = useRouter();
  const colors = useTheme();
  const params = useLocalSearchParams<{ tipo?: string; id?: string }>();

  const tipo: TipoContacto = params.tipo === 'persona' ? 'persona' : 'proveedor';
  const id = params.id ? Number(params.id) : undefined;
  const esProveedor = tipo === 'proveedor';
  const campos = CAMPOS[tipo];

  // Se lee en cada render para ver siempre el dato actualizado.
  const existente = id
    ? esProveedor
      ? proveedoresPrueba.find((p) => p.id === id)
      : personasPrueba.find((p) => p.id === id)
    : undefined;

  const esNuevo = id === undefined;
  const [editando, setEditando] = useState(esNuevo);
  const [valores, setValores] = useState<Record<string, string>>(() =>
    valoresDe(existente as Record<string, unknown> | undefined, campos)
  );
  const [roles, setRoles] = useState<RolPersona[]>(() =>
    existente && 'roles' in existente ? existente.roles : []
  );

  if (!esNuevo && !existente) {
    return (
      <ThemedView
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          padding: 24,
        }}
      >
        <ThemedText>
          {esProveedor ? 'Proveedor no encontrado.' : 'Persona no encontrada.'}
        </ThemedText>
      </ThemedView>
    );
  }

  function cambiar(clave: string, valor: string) {
    setValores((actual) => ({ ...actual, [clave]: valor }));
  }

  function alternarRol(rol: RolPersona) {
    setRoles((actual) =>
      actual.includes(rol) ? actual.filter((r) => r !== rol) : [...actual, rol]
    );
  }

  function cancelarEdicion() {
    if (esNuevo) {
      router.back();
      return;
    }
    setValores(valoresDe(existente as Record<string, unknown>, campos));
    setRoles(existente && 'roles' in existente ? existente.roles : []);
    setEditando(false);
  }

  function guardar() {
    const v = (clave: string) => (valores[clave] ?? '').trim();

    if (!v('nombre')) {
      Alert.alert('Falta información', 'El nombre es obligatorio.');
      return;
    }

    // TODO: guardar en Supabase y registrar la operación en Auditoría.
    if (esProveedor) {
      guardarProveedor({
        id,
        nombre: v('nombre'),
        identificacion: v('identificacion'),
        contacto: v('contacto'),
        telefono: v('telefono'),
        correo: v('correo'),
        direccion: v('direccion'),
      });
    } else {
      guardarPersona({
        id,
        nombre: v('nombre'),
        identificacion: v('identificacion'),
        cargo: v('cargo'),
        telefono: v('telefono'),
        correo: v('correo'),
        roles,
      });
    }

    if (esNuevo) {
      router.back();
    } else {
      setEditando(false);
    }
  }

  const titulo = esNuevo
    ? esProveedor
      ? 'Nuevo proveedor'
      : 'Nueva persona'
    : editando
      ? esProveedor
        ? 'Editar proveedor'
        : 'Editar persona'
      : esProveedor
        ? 'Detalle del proveedor'
        : 'Detalle de la persona';

  const actual = existente as Record<string, unknown> | undefined;

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
                  <ThemedText style={{ fontWeight: 'bold' }}>Roles</ThemedText>
                  <ThemedText type="suave">
                    Actividades en las que participa esta persona.
                  </ThemedText>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                    {ROLES_PERSONA.map((rol) => {
                      const activo = roles.includes(rol);
                      return (
                        <Pressable
                          key={rol}
                          onPress={() => alternarRol(rol)}
                          style={{
                            paddingVertical: 8,
                            paddingHorizontal: 12,
                            borderRadius: 20,
                            borderWidth: 1,
                            borderColor: activo ? colors.primario : colors.borde,
                            backgroundColor: activo ? colors.primario : colors.tarjeta,
                          }}
                        >
                          <ThemedText
                            style={{
                              fontSize: 14,
                              color: activo ? colors.textoSobrePrimario : colors.texto,
                            }}
                          >
                            {rol}
                          </ThemedText>
                        </Pressable>
                      );
                    })}
                  </View>
                </ThemedCard>
              )}

              <ThemedButton titulo="Guardar" onPress={guardar} />
              <TouchableOpacity onPress={cancelarEdicion} style={{ alignItems: 'center', padding: 8 }}>
                <ThemedText style={{ color: colors.primario, fontWeight: 'bold' }}>
                  Cancelar
                </ThemedText>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <ThemedCard style={{ gap: 12 }}>
                <ThemedText style={{ fontSize: 22, fontWeight: 'bold' }}>
                  {String(actual?.nombre ?? '')}
                </ThemedText>
                {campos
                  .filter((campo) => campo.clave !== 'nombre')
                  .map((campo) => (
                    <Dato
                      key={campo.clave}
                      titulo={campo.etiqueta}
                      valor={String(actual?.[campo.clave] ?? '') || '—'}
                    />
                  ))}
                {!esProveedor && (
                  <Dato
                    titulo="Roles"
                    valor={roles.length > 0 ? roles.join(', ') : '—'}
                  />
                )}
              </ThemedCard>

              {esProveedor && (
                <ThemedCard style={{ gap: 6 }}>
                  <ThemedText style={{ fontWeight: 'bold' }}>
                    Productos y entradas relacionadas
                  </ThemedText>
                  <ThemedText type="suave">
                    Esta información se mostrará cuando exista el módulo de Entradas.
                  </ThemedText>
                </ThemedCard>
              )}

              <ThemedCard style={{ gap: 6 }}>
                <ThemedText style={{ fontWeight: 'bold' }}>
                  Documentos y evidencias
                </ThemedText>
                <ThemedText type="suave">
                  Se podrán adjuntar archivos cuando exista el módulo de Documentos.
                </ThemedText>
              </ThemedCard>

              <ThemedButton titulo="Editar" onPress={() => setEditando(true)} />
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

function valoresDe(
  registro: Record<string, unknown> | undefined,
  campos: Campo[]
): Record<string, string> {
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
