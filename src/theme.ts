import { useColorScheme } from 'react-native';

// Colores de la app. Si quieres cambiar el look, solo edita este archivo.
const claro = {
  fondo: '#F4F6F8',
  tarjeta: '#FFFFFF',
  borde: '#DDE3EA',
  texto: '#0F1B2D',
  textoSuave: '#5B6B7F',
  primario: '#0E7C86',
  textoSobrePrimario: '#FFFFFF',
  error: '#D64545',
  exito: '#1E9E5A',
  aviso: '#B7791F',
};

const oscuro: typeof claro = {
  fondo: '#0B121B',
  tarjeta: '#131D2A',
  borde: '#263548',
  texto: '#E8EEF5',
  textoSuave: '#94A3B8',
  primario: '#2BB5C0',
  textoSobrePrimario: '#04262A',
  error: '#F26D6D',
  exito: '#3DCB85',
  aviso: '#F2B84B',
};

// Devuelve los colores según el modo claro/oscuro del teléfono.
export function useTheme() {
  const modo = useColorScheme();
  return modo === 'dark' ? oscuro : claro;
}
