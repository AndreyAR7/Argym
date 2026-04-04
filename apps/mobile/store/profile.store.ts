import { create } from 'zustand';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from './auth.store';

export type AppTheme = 'system' | 'light' | 'dark' | 'midnight' | 'violet' | 'emerald';

/**
 * ThemeConfig — full token set used by ALL screens.
 * Matches the shape of ClientTheme/AdminTheme so screens can swap
 * `import { ClientTheme as T }` → `const T = useTheme()` with no other changes.
 */
export interface ThemeConfig {
  id: AppTheme;
  label: string;
  preview: string;

  // Backgrounds
  bg: string;
  bgCard: string;
  bgCardElevated: string;
  bgSurface: string;
  card: string; // alias for bgCard (used by some screens)

  // Accent
  accent: string;
  accentSoft: string;
  accentGlow: string;

  // Semantic colors (consistent across themes)
  green: string;
  greenSoft: string;
  orange: string;
  orangeSoft: string;
  red: string;
  redSoft: string;
  blue: string;
  blueSoft: string;
  gold: string;
  goldSoft: string;
  purple: string;
  purpleSoft: string;
  teal: string;
  tealSoft: string;

  // Text
  text: string;       // primary text
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  textInverse: string;

  // Borders
  border: string;
  borderStrong: string;

  // Radius (static — same across themes)
  radiusSm: number;
  radiusMd: number;
  radiusLg: number;
  radiusXl: number;

  // Shadows (static)
  shadowCard: {
    shadowColor: string;
    shadowOffset: { width: number; height: number };
    shadowOpacity: number;
    shadowRadius: number;
    elevation: number;
  };
}

function makeTheme(
  id: AppTheme,
  label: string,
  preview: string,
  bg: string,
  bgCard: string,
  bgCardElevated: string,
  bgSurface: string,
  accent: string,
  accentSoft: string,
  text: string,
  textSecondary: string,
  textMuted: string,
  border: string,
  borderStrong: string,
): ThemeConfig {
  return {
    id, label, preview,
    bg, bgCard, bgCardElevated, bgSurface,
    card: bgCard, // alias
    accent, accentSoft,
    accentGlow: accent + '28',
    green: '#00D68F', greenSoft: 'rgba(0,214,143,0.15)',
    orange: '#FF8C42', orangeSoft: 'rgba(255,140,66,0.15)',
    red: '#FF4D6D', redSoft: 'rgba(255,77,109,0.15)',
    blue: '#4DA6FF', blueSoft: 'rgba(77,166,255,0.15)',
    gold: '#FFD166', goldSoft: 'rgba(255,209,102,0.15)',
    purple: '#8B5CF6', purpleSoft: 'rgba(139,92,246,0.15)',
    teal: '#14B8A6', tealSoft: 'rgba(20,184,166,0.15)',
    text, textPrimary: text, textSecondary, textMuted,
    textInverse: bg,
    border, borderStrong,
    radiusSm: 10, radiusMd: 14, radiusLg: 20, radiusXl: 28,
    shadowCard: {
      shadowColor: accent,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.12,
      shadowRadius: 12,
      elevation: 6,
    },
  };
}

export const THEMES: ThemeConfig[] = [
  makeTheme('dark',     'Oscuro',    '🌑', '#0A0A0F', '#13131A', '#1C1C26', '#1A1A24', '#6C63FF', '#8B85FF', '#F0F0FF', '#9090B0', '#5A5A7A', 'rgba(255,255,255,0.08)', 'rgba(255,255,255,0.14)'),
  makeTheme('midnight', 'Midnight',  '🌌', '#080B14', '#0F1420', '#161D2E', '#131929', '#3B82F6', '#60A5FA', '#F1F5F9', '#94A3B8', '#475569', 'rgba(255,255,255,0.07)', 'rgba(255,255,255,0.12)'),
  makeTheme('violet',   'Violeta',   '💜', '#0D0A1A', '#160F2A', '#1E1535', '#130E22', '#8B5CF6', '#A78BFA', '#EDE9FE', '#C4B5FD', '#7C3AED', 'rgba(139,92,246,0.15)',  'rgba(139,92,246,0.25)'),
  makeTheme('emerald',  'Esmeralda', '💚', '#061210', '#0A1F1C', '#0F2E29', '#0C1A18', '#10B981', '#34D399', '#ECFDF5', '#6EE7B7', '#059669', 'rgba(16,185,129,0.15)',  'rgba(16,185,129,0.25)'),
  makeTheme('light',    'Claro',     '☀️', '#F8FAFC', '#FFFFFF', '#F1F5F9', '#F8FAFC', '#2563EB', '#3B82F6', '#0F172A', '#64748B', '#94A3B8', '#E2E8F0',                '#CBD5E1'),
  makeTheme('system',   'Sistema',   '📱', '#0A0A0F', '#13131A', '#1C1C26', '#1A1A24', '#6C63FF', '#8B85FF', '#F0F0FF', '#9090B0', '#5A5A7A', 'rgba(255,255,255,0.08)', 'rgba(255,255,255,0.14)'),
];

export function getThemeConfig(theme: AppTheme): ThemeConfig {
  return THEMES.find((t) => t.id === theme) ?? THEMES[0];
}

interface ProfileStore {
  avatarUrl: string | null;
  theme: AppTheme;
  isUploadingAvatar: boolean;
  isSavingTheme: boolean;
  uploadError: string | null;

  loadProfile: () => Promise<void>;
  pickAndUploadAvatar: () => Promise<void>;
  removeAvatar: () => Promise<void>;
  setTheme: (theme: AppTheme) => Promise<void>;
  clearError: () => void;
}

function base64ToUint8Array(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

export const useProfileStore = create<ProfileStore>()((set) => ({
  avatarUrl: null,
  theme: 'dark',
  isUploadingAvatar: false,
  isSavingTheme: false,
  uploadError: null,

  loadProfile: async () => {
    const userId = useAuthStore.getState().user?.id;
    if (!userId) return;
    const { data } = await supabase
      .from('profiles')
      .select('avatar_url, theme')
      .eq('id', userId)
      .single();
    if (data) {
      set({
        avatarUrl: data.avatar_url ?? null,
        theme: (data.theme as AppTheme) ?? 'dark',
      });
    }
  },

  pickAndUploadAvatar: async () => {
    const user = useAuthStore.getState().user;
    if (!user) return;

    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      set({ uploadError: 'Se necesita permiso para acceder a la galería.' });
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.6,
      base64: true,
    });

    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];

    if (!asset.base64) {
      set({ uploadError: 'No se pudo leer la imagen seleccionada.' });
      return;
    }

    set({ isUploadingAvatar: true, uploadError: null });

    try {
      const ext = (asset.uri.split('.').pop()?.toLowerCase() ?? 'jpg').replace('jpeg', 'jpg');
      const mimeType = ext === 'png' ? 'image/png' : 'image/jpeg';
      const storagePath = `${user.id}/avatar.${ext}`;

      const bytes = base64ToUint8Array(asset.base64);

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(storagePath, bytes, { contentType: mimeType, upsert: true });

      if (uploadError) {
        const msg = uploadError.message?.includes('Bucket not found')
          ? 'No se encontró el bucket "avatars". Créalo en Supabase Storage.'
          : uploadError.message?.includes('policy') || uploadError.message?.includes('403')
          ? 'Permisos insuficientes. Verifica las políticas del bucket.'
          : `No se pudo subir la foto: ${uploadError.message}`;
        throw new Error(msg);
      }

      const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(storagePath);
      const avatarUrl = urlData.publicUrl;

      const { error: dbError } = await supabase
        .from('profiles')
        .update({ avatar_url: avatarUrl })
        .eq('id', user.id);

      if (dbError) throw new Error(`Error al actualizar el perfil: ${dbError.message}`);

      set({ avatarUrl, isUploadingAvatar: false });
      useAuthStore.setState((s) => ({
        user: s.user ? { ...s.user, avatar_url: avatarUrl } : s.user,
      }));
    } catch (err: any) {
      console.error('[Avatar] Upload failed:', err);
      set({ isUploadingAvatar: false, uploadError: err?.message ?? 'No se pudo subir la foto.' });
    }
  },

  removeAvatar: async () => {
    const user = useAuthStore.getState().user;
    if (!user) return;
    set({ isUploadingAvatar: true, uploadError: null });
    try {
      await supabase.storage.from('avatars').remove([
        `${user.id}/avatar.jpg`, `${user.id}/avatar.jpeg`,
        `${user.id}/avatar.png`, `${user.id}/avatar.webp`,
      ]);
      const { error: dbError } = await supabase
        .from('profiles').update({ avatar_url: null }).eq('id', user.id);
      if (dbError) throw new Error(`Error al actualizar el perfil: ${dbError.message}`);
      set({ avatarUrl: null, isUploadingAvatar: false });
      useAuthStore.setState((s) => ({
        user: s.user ? { ...s.user, avatar_url: null } : s.user,
      }));
    } catch (err: any) {
      set({ isUploadingAvatar: false, uploadError: err?.message ?? 'Error al eliminar la foto.' });
    }
  },

  setTheme: async (theme: AppTheme) => {
    const user = useAuthStore.getState().user;
    set({ theme, isSavingTheme: true });
    if (user) {
      const { error } = await supabase.from('profiles').update({ theme }).eq('id', user.id);
      if (error) console.error('[Theme] Failed to persist:', error);
    }
    set({ isSavingTheme: false });
  },

  clearError: () => set({ uploadError: null }),
}));
