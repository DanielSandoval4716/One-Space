import { SinPermiso } from '@/components/SinPermiso';
import { usePermiso } from '@/permisos';
import { useEffect, useState } from 'react';
import { ScrollView, Switch, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { ThemedCard } from '@/components/ThemedCard';
import { BotonVolver } from '@/components/BotonVolver';
import { Chips } from '@/components/Chips';
import { Regla, actualizarRegla, obtenerReglas } from '@/configuracion';
import { useTheme } from '@/theme';

const NOMBRES: Record<string, string> = {
  entrada: 'Entrada',
  salida: 'Salida',
  transferencia: 'Transferencia',
  ajuste: 'Ajuste',
  reserva: 'Reserva',
};

const EVIDENCIAS = [
  { valor: 'obligatoria', etiqueta: 'Obligatoria' },
  { valor: 'opcional', etiqueta: 'Opcional' },
  { valor: 'innecesaria', etiqueta: 'Innecesaria' },
];

export default function Reglas() {
  const permitido = usePermiso(['configuracion.gestionar']);
  const colors = useTheme();
  const [reglas, setReglas] = useState<Regla[]>([]);
  const [error, setError] = useState('');

  async function cargar() {
    setReglas(await obtenerReglas());
  }

  useEffect(() => {
    cargar();
  }, []);

  async function cambiar(tipo: string, cambios: Partial<Regla>) {
    const mensaje = await actualizarRegla(tipo, cambios);
    if (mensaje) {
      setError(mensaje);
      return;
    }
    setError('');
    cargar();
  }

  if (permitido !== true) return <SinPermiso cargando={permitido === null} />;

  return (
    <ThemedView style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ padding: 24, gap: 12 }}>
          <BotonVolver />
          <ThemedText type="titulo">Reglas de las operaciones</ThemedText>
          <ThemedText type="suave">Los cambios se guardan al instante.</ThemedText>

          {error !== '' && <ThemedText type="error">{error}</ThemedText>}

          {reglas.map((r) => (
            <ThemedCard key={r.tipo} style={{ gap: 12 }}>
              <ThemedText style={{ fontWeight: 'bold' }}>{NOMBRES[r.tipo] ?? r.tipo}</ThemedText>

              <ThemedText type="suave">Documento de respaldo</ThemedText>
              <Chips opciones={EVIDENCIAS} valor={r.evidencia} onCambio={(v) => cambiar(r.tipo, { evidencia: v })} />

              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <ThemedText>Requiere autorización</ThemedText>
                <Switch
                  value={r.requiere_autorizacion}
                  onValueChange={(v) => cambiar(r.tipo, { requiere_autorizacion: v })}
                  trackColor={{ true: colors.primario }}
                />
              </View>
            </ThemedCard>
          ))}
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}
