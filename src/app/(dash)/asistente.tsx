import { Mensaje, construirContexto, preguntar } from '@/agente';
import { Chips } from '@/components/Chips';
import { ThemedButton } from '@/components/ThemedButton';
import { ThemedInput } from '@/components/ThemedInput';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useTheme } from '@/theme';
import { useRef, useState } from 'react';
import { FlatList, KeyboardAvoidingView, Platform, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const PERIODOS = [
  { valor: '1', etiqueta: 'Hoy' },
  { valor: '7', etiqueta: '7 días' },
  { valor: '30', etiqueta: '30 días' },
  { valor: '90', etiqueta: '90 días' },
];

export default function Asistente() {
  const colors = useTheme();
  const [mensajes, setMensajes] = useState<Mensaje[]>([]);
  const [texto, setTexto] = useState('');
  const [cargando, setCargando] = useState(false);
  const [periodo, setPeriodo] = useState('30');
  const lista = useRef<FlatList>(null);

  async function enviar(pregunta: string) {
    if (!pregunta.trim() || cargando) return;
    const nuevos: Mensaje[] = [...mensajes, { role: 'user', content: pregunta.trim() }];
    setMensajes(nuevos);
    setTexto('');
    setCargando(true);
    try {
      // Se arma el contexto en cada pregunta para tener datos al día
      const contexto = await construirContexto(Number(periodo));
      const respuesta = await preguntar(nuevos, contexto);
      setMensajes([...nuevos, { role: 'assistant', content: respuesta }]);
    } catch (e: any) {
      setMensajes([...nuevos, { role: 'assistant', content: `No pude responder (${e.message}).` }]);
    }
    setCargando(false);
  }

  const etiquetaPeriodo = PERIODOS.find((p) => p.valor === periodo)?.etiqueta.toLowerCase();

  return (
    <ThemedView style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={{ padding: 16, gap: 10 }}>
            <ThemedText type="titulo">Asistente</ThemedText>
            <ThemedText type="suave">Periodo de movimientos a analizar:</ThemedText>
            <Chips opciones={PERIODOS} valor={periodo} onCambio={setPeriodo} deshabilitado={cargando} />
            <TouchableOpacity
              disabled={cargando}
              onPress={() =>
                enviar(
                  `Hazme un resumen del inventario y de los movimientos de ${etiquetaPeriodo === 'hoy' ? 'hoy' : `los últimos ${periodo} días`}: ` +
                    'existencias y valor, entradas y salidas, stock bajo, ajustes y cualquier cosa inusual.'
                )
              }
            >
              <ThemedText style={{ color: colors.primario, fontWeight: 'bold' }}>Generar resumen →</ThemedText>
            </TouchableOpacity>
            <ThemedButton
              titulo="Realizar análisis"
              cargando={cargando}
              onPress={() =>
                enviar(
                  `Realiza un análisis estadístico y económico del inventario de ${etiquetaPeriodo === 'hoy' ? 'hoy' : `los últimos ${periodo} días`}. ` +
                    'Usa solo las cifras ya calculadas en ANÁLISIS ESTADÍSTICO y ELASTICIDAD, sin recalcular. Estructura la respuesta en: ' +
                    '1) Estadístico: variabilidad de la demanda (varianza, desviación y CV) de los productos principales, productos con demanda errática, tendencia y clasificación ABC. ' +
                    '2) Económico: valor del inventario y su concentración, rotación y cobertura, y elasticidad e ingreso marginal si hubo cambios de precio (si no los hubo, dilo sin inventar). ' +
                    '3) Recomendaciones: máximo 3, incluyendo puntos de reorden. ' +
                    'Menciona brevemente los supuestos y límites de los datos.'
                )
              }
            />
          </View>

          <FlatList
            ref={lista}
            data={mensajes}
            keyExtractor={(_, i) => String(i)}
            contentContainerStyle={{ padding: 16, gap: 10 }}
            onContentSizeChange={() => lista.current?.scrollToEnd()}
            renderItem={({ item }) => (
              <View
                style={{
                  alignSelf: item.role === 'user' ? 'flex-end' : 'flex-start',
                  maxWidth: '85%',
                  padding: 12,
                  borderRadius: 14,
                  backgroundColor: item.role === 'user' ? colors.primario : colors.tarjeta,
                  borderWidth: item.role === 'user' ? 0 : 1,
                  borderColor: colors.borde,
                }}
              >
                <ThemedText style={{ color: item.role === 'user' ? colors.textoSobrePrimario : colors.texto }}>
                  {item.content}
                </ThemedText>
              </View>
            )}
            ListFooterComponent={cargando ? <ThemedText type="suave">Pensando…</ThemedText> : null}
          />

          <View style={{ padding: 12, gap: 8 }}>
            <ThemedInput
              value={texto}
              onChangeText={setTexto}
              placeholder="Pregunta sobre el inventario…"
              onSubmitEditing={() => enviar(texto)}
            />
            <ThemedButton titulo="Enviar" onPress={() => enviar(texto)} cargando={cargando} />
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ThemedView>
  );
}
