import { Stack } from 'expo-router';
import { NativeTabs } from 'expo-router/build/native-tabs'; //TODO

export default function RootLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
