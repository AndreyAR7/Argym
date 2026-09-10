import React, { useEffect, useRef, useState } from 'react';
import { View, Text, ActivityIndicator, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/store/auth.store';
import { useTheme } from '@/hooks/useTheme';

// expo-router owns any deep link matching a registered app scheme, and it
// wins the race against expo-web-browser's own redirect listener — so the
// Google OAuth code lands here (as a `?code=` query param) rather than in
// signInWithGoogle()'s WebBrowser.openAuthSessionAsync() result. This
// screen exists purely to hand that code to finishOAuthCallback(); AuthGuard
// (app/_layout.tsx) takes over navigation once the session is set.
export default function AuthCallbackScreen() {
  const { code, error: oauthError } = useLocalSearchParams<{ code?: string; error?: string }>();
  const { finishOAuthCallback, error } = useAuthStore();
  const T = useTheme();
  const { t } = useTranslation();
  const router = useRouter();
  const started = useRef(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    if (oauthError || !code) {
      setFailed(true);
      return;
    }
    finishOAuthCallback(code).then(() => {
      if (useAuthStore.getState().error) setFailed(true);
    });
  }, [code, oauthError]);

  if (failed || error) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: T.bg }}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32, gap: 16 }}>
          <Text style={{ fontSize: 15, color: T.textSecondary, textAlign: 'center' }}>
            {t('auth.errors.generic')}
          </Text>
          <TouchableOpacity
            onPress={() => router.replace('/(auth)/login')}
            style={{ paddingVertical: 12, paddingHorizontal: 32, borderRadius: 12, borderWidth: 1, borderColor: T.border }}
          >
            <Text style={{ color: T.textSecondary, fontSize: 14, fontWeight: '600' }}>{t('auth.login')}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: T.bg }}>
      <ActivityIndicator size="large" color={T.accent} />
    </View>
  );
}
