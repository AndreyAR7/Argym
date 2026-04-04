import React, { useEffect } from 'react';
import { View, ActivityIndicator, useColorScheme } from 'react-native';
import { Slot, useSegments, useRouter } from 'expo-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { I18nextProvider } from 'react-i18next';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { i18n } from '@/i18n';
import { useAuthStore } from '@/store/auth.store';
import { useProfileStore, getThemeConfig } from '@/store/profile.store';
import { AppThemeContext } from '@/context/ThemeContext';
import { OfflineBanner } from '@/components/shared/OfflineBanner';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 5 * 60 * 1000, retry: 2 },
  },
});

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { session, user, isLoading, initialize, approvalStatus } = useAuthStore();
  const { theme } = useProfileStore();
  const systemScheme = useColorScheme();

  const effectiveTheme = theme === 'system'
    ? (systemScheme === 'light' ? 'light' : 'dark')
    : theme;
  const themeConfig = getThemeConfig(effectiveTheme);

  const segments = useSegments();
  const router = useRouter();

  useEffect(() => { initialize(); }, []);

  useEffect(() => {
    if (isLoading) return;

    // approvalStatus is null when profile hasn't loaded yet — wait
    if (session && approvalStatus === null) return;

    const inAuth = segments[0] === '(auth)';
    const inAdmin = segments[0] === '(admin)';
    const inCoach = segments[0] === '(coach)';
    const inClient = segments[0] === '(client)';
    // pending-approval is at /(auth)/pending-approval → segments = ['(auth)', 'pending-approval']
    const inPending = inAuth && segments[1] === 'pending-approval';

    // No session → go to login (covers all routes including pending-approval)
    if (!session) {
      if (!inAuth || inPending) {
        router.replace('/(auth)/login');
      }
      return;
    }

    // Has session but not yet approved
    if (session && (approvalStatus === 'pending' || approvalStatus === 'rejected')) {
      if (!inPending) {
        router.replace('/(auth)/pending-approval');
      }
      return;
    }

    // Approved user on pending screen → redirect to app
    if (session && inPending && approvalStatus === 'approved') {
      const role = user?.primaryRole;
      if (role === 'admin') router.replace('/(admin)');
      else if (role === 'coach') router.replace('/(coach)');
      else router.replace('/(client)');
      return;
    }

    // Approved user on auth screens (login/register) → redirect to app
    if (session && inAuth && !inPending && approvalStatus === 'approved') {
      const role = user?.primaryRole;
      if (role === 'admin') router.replace('/(admin)');
      else if (role === 'coach') router.replace('/(coach)');
      else router.replace('/(client)');
      return;
    }

    // Approved user in wrong role section → redirect to correct section
    if (session && approvalStatus === 'approved' && user?.primaryRole) {
      const role = user.primaryRole;
      if (role === 'admin' && !inAdmin && !inClient && !inAuth) router.replace('/(admin)');
      else if (role === 'coach' && !inCoach && !inClient && !inAuth) router.replace('/(coach)');
      else if (role === 'client' && !inClient && !inAuth) router.replace('/(client)');
    }
  }, [session, user, isLoading, segments, approvalStatus]);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: themeConfig.bg }}>
        <ActivityIndicator size="large" color={themeConfig.accent} />
      </View>
    );
  }

  return (
    <AppThemeContext.Provider value={themeConfig}>
      <View style={{ flex: 1, backgroundColor: themeConfig.bg }}>
        {children}
      </View>
    </AppThemeContext.Provider>
  );
}

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <I18nextProvider i18n={i18n}>
        <SafeAreaProvider>
          <OfflineBanner />
          <AuthGuard>
            <Slot />
          </AuthGuard>
        </SafeAreaProvider>
      </I18nextProvider>
    </QueryClientProvider>
  );
}
