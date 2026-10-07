import { useState } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { ThemedCard } from '@/components/ThemedCard';
import { ThemedInput } from '@/components/ThemedInput';
import { ThemedButton } from '@/components/ThemedButton';
import { iniciarSesion } from '@/auth';

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);

  async function entrar() {
    if (email === '' || password === '') {
      setError('Escribe tu correo y tu contraseña.');
      return;
    }

    setError('');
    setCargando(true);
    const correcto = await iniciarSesion(email, password);
    setCargando(false);

    if (correcto) {
      router.replace('/dashboard');
    } else {
      setError('Los datos proporcionados no son válidos.');
    }
  }
  return (
    <ThemedView style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1, justifyContent: 'center', padding: 24 }}>
        <View style={{ alignItems: 'center', marginBottom: 24 }}>
          <ThemedText type="titulo">One Space</ThemedText>
          <ThemedText type="suave">Inicia sesión para continuar</ThemedText>
        </View>

        <ThemedCard style={{ gap: 12 }}>
          <ThemedInput
            placeholder="Correo electrónico"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <ThemedInput
            placeholder="Contraseña"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoCapitalize="none"
          />
          {error !== '' && <ThemedText type="error">{error}</ThemedText>}
          <ThemedButton titulo="Iniciar sesión" onPress={entrar} cargando={cargando} />
        </ThemedCard>
      </SafeAreaView>
    </ThemedView>
  );
}
