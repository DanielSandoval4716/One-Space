import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

// Estos valores vienen del archivo .env
const url = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const key = process.env.EXPO_PUBLIC_SUPABASE_KEY!;

export const supabase = createClient(url, key, {
  auth: {
    storage: AsyncStorage, // guarda la sesión en el teléfono
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
