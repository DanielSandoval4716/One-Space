import { useEffect, useState } from 'react';
import { NativeTabs } from 'expo-router/unstable-native-tabs';
import { obtenerSesion } from '@/auth';
import { obtenerPerfil, puedeVer } from '@/permisos';
import { useTheme } from '@/theme';

export default function TabsLayout() {
  const colors = useTheme();
  const [puedeConfigurar, setPuedeConfigurar] = useState(false);

  useEffect(() => {
    obtenerSesion().then(async (session) => {
      if (session) setPuedeConfigurar(puedeVer(await obtenerPerfil(session.user.id), ['configuracion.gestionar']));
    });
  }, []);

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

      <NativeTabs.Trigger name="configuracion" hidden={!puedeConfigurar}>
        <NativeTabs.Trigger.Label>Configuración</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon md="settings" />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
