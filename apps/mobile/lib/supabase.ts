import 'react-native-url-polyfill/auto';
import * as SecureStore from 'expo-secure-store';
import { createClient } from '@supabase/supabase-js';
import Constants from 'expo-constants';

const supabaseUrl =
  (Constants.expoConfig?.extra?.supabaseUrl as string) ||
  process.env.EXPO_PUBLIC_SUPABASE_URL ||
  '';

const supabaseAnonKey =
  (Constants.expoConfig?.extra?.supabaseAnonKey as string) ||
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
  '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    '[Supabase] Missing env vars: EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY'
  );
}

// SecureStore has a 248-char key limit and 2048-byte value limit on iOS.
// This adapter sanitizes keys and chunks large values automatically.
const CHUNK_SIZE = 1900;

function sanitizeKey(key: string): string {
  return key.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 200);
}

const SecureStoreAdapter = {
  async getItem(key: string): Promise<string | null> {
    const k = sanitizeKey(key);
    const countStr = await SecureStore.getItemAsync(`${k}__n`);
    if (countStr) {
      const n = parseInt(countStr, 10);
      const parts = await Promise.all(
        Array.from({ length: n }, (_, i) => SecureStore.getItemAsync(`${k}__${i}`))
      );
      return parts.some((p) => p === null) ? null : parts.join('');
    }
    return SecureStore.getItemAsync(k);
  },

  async setItem(key: string, value: string): Promise<void> {
    const k = sanitizeKey(key);
    if (value.length <= CHUNK_SIZE) {
      await SecureStore.setItemAsync(k, value);
      await SecureStore.deleteItemAsync(`${k}__n`);
    } else {
      const chunks: string[] = [];
      for (let i = 0; i < value.length; i += CHUNK_SIZE) {
        chunks.push(value.slice(i, i + CHUNK_SIZE));
      }
      await Promise.all(
        chunks.map((chunk, i) => SecureStore.setItemAsync(`${k}__${i}`, chunk))
      );
      await SecureStore.setItemAsync(`${k}__n`, String(chunks.length));
      await SecureStore.deleteItemAsync(k);
    }
  },

  async removeItem(key: string): Promise<void> {
    const k = sanitizeKey(key);
    const countStr = await SecureStore.getItemAsync(`${k}__n`);
    if (countStr) {
      const n = parseInt(countStr, 10);
      await Promise.all(
        Array.from({ length: n }, (_, i) => SecureStore.deleteItemAsync(`${k}__${i}`))
      );
      await SecureStore.deleteItemAsync(`${k}__n`);
    }
    await SecureStore.deleteItemAsync(k);
  },
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: SecureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Exported for use in TUS resumable uploads
export { supabaseUrl, supabaseAnonKey };
