import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Mensaje, preguntarAsistente } from '@/asistente';
import { SinPermiso } from '@/components/SinPermiso';
import { ThemedButton } from '@/components/ThemedButton';
import { ThemedCard } from '@/components/ThemedCard';
import { ThemedInput } from '@/components/ThemedInput';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { usePermiso } from '@/permisos';
import { useTheme } from '@/theme';

const SUGERENCIAS = [
  '¿Qué productos tienen stock bajo?',
  '¿Qué productos tienen unidades reservadas?',
  '¿Cuántos productos hay en total?',
];

export default function Asistente() {
  const permitido = usePermiso(['asistente.usar']);
  const router = useRouter();
  const colors = useTheme();
  const scroll = useRef<ScrollView>(null);

  const [mensajes, setMensajes] = useState<Mensaje[]>([]);
  const [texto, setTexto] = useState('');
  const [pensando, setPensando] = useState(false);
  const [error, setError] = useState('');

  async function enviar(pregunta: string) {
    const limpia = pregunta.trim();
    if (limpia === '' || pensando) return;

    const historial = mensajes;
    setMensajes([...historial, { rol: 'usuario', texto: limpia }]);
    setTexto('');
    setError('');
    setPensando(true);

    try {
      const respuesta = await preguntarAsistente(limpia, historial);
      setMensajes((prev) => [...prev, { rol: 'asistente', texto: respuesta }]);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo consultar al asistente.');
    }
    setPensando(false);
    setTimeout(() => scroll.current?.scrollToEnd({ animated: true }), 100);
  }

  if (permitido !== true) return <SinPermiso cargando={permitido === null} />;

  return (
    <ThemedView style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView
            ref={scroll}
            contentContainerStyle={{ padding: 24, gap: 12 }}
            keyboardShouldPersistTaps="handled"
          >
            <TouchableOpacity onPress={() => router.back()}>
              <ThemedText style={{ color: colors.primario, fontWeight: 'bold' }}>← Volver</ThemedText>
            </TouchableOpacity>
            <ThemedText type="titulo">Asistente</ThemedText>
            <ThemedText type="suave">
              Pregunta sobre el inventario. Solo consulta información, no modifica nada.
            </ThemedText>

            {mensajes.length === 0 &&
              SUGERENCIAS.map((s) => (
                <TouchableOpacity key={s} onPress={() => enviar(s)}>
                  <ThemedCard>
                    <ThemedText style={{ color: colors.primario }}>{s}</ThemedText>
                  </ThemedCard>
                </TouchableOpacity>
              ))}

            {mensajes.map((m, i) => (
              <View key={i} style={{ alignItems: m.rol === 'usuario' ? 'flex-end' : 'flex-start' }}>
                <ThemedCard style={{ maxWidth: '90%' }}>
                  <ThemedText type="suave">{m.rol === 'usuario' ? 'Tú' : 'Asistente'}</ThemedText>
                  <ThemedText>{m.texto}</ThemedText>
                </ThemedCard>
              </View>
            ))}

            {pensando && <ThemedText type="suave">Pensando...</ThemedText>}
            {error !== '' && <ThemedText type="error">{error}</ThemedText>}
          </ScrollView>

          <View style={{ padding: 16, gap: 8 }}>
            <ThemedInput
              placeholder="Escribe tu pregunta..."
              value={texto}
              onChangeText={setTexto}
              onSubmitEditing={() => enviar(texto)}
              returnKeyType="send"
            />
            <ThemedButton titulo="Enviar" onPress={() => enviar(texto)} cargando={pensando} />
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ThemedView>
  );
}
