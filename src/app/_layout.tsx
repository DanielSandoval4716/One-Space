import { NativeTabs } from 'expo-router/unstable-native-tabs';
import { useTheme } from '@/theme';

export default function TabsLayout() {
  const colors = useTheme();

  return (
    <NativeTabs
      backgroundColor={colors.tarjeta}
      indicatorColor={colors.primario}
      iconColor={{ default: colors.textoSuave, selected: colors.textoSobrePrimario }}
      labelStyle={{ default: { color: colors.textoSuave }, selected: { color: colors.texto } }}
    >
      <NativeTabs.Trigger name="dashboard">
        <NativeTabs.Trigger.Label>Dashboard</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon md="home" />
      </NativeTabs.Trigger>

      {/* TODO: mostrar esta pestaña solo si el rol tiene el permiso configuracion.gestionar */}
      <NativeTabs.Trigger name="configuracion">
        <NativeTabs.Trigger.Label>Configuración</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon md="settings" />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
