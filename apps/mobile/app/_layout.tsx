import React, { useEffect, useRef } from 'react';
import { View, ActivityIndicator, useColorScheme } from 'react-native';
import { Slot, useSegments, useRouter, useRootNavigationState } from 'expo-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { I18nextProvider } from 'react-i18next';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { i18n } from '@/i18n';
import { useAuthStore } from '@/store/auth.store';
import { useProfileStore, getThemeConfig } from '@/store/profile.store';
import { useTenantStore } from '@/store/tenant.store';
import { AppThemeContext } from '@/context/ThemeContext';
import { OfflineBanner } from '@/components/shared/OfflineBanner';
import { ToastContainer } from '@/components/shared/Toast';
import {
  addNotificationListeners,
  removeNotificationListeners,
  type NotificationListener,
  type ResponseListener,
} from '@/lib/pushNotifications';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 5 * 60 * 1000, retry: 2 },
  },
});

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { session, user, isLoading, initialize, approvalStatus } = useAuthStore();
  const { theme } = useProfileStore();
  const { loadTenant } = useTenantStore();
  const systemScheme = useColorScheme();

  const effectiveTheme = theme === 'system'
    ? (systemScheme === 'light' ? 'light' : 'dark')
    : theme;
  const themeConfig = getThemeConfig(effectiveTheme);

  const segments = useSegments();
  const router = useRouter();
  const navigationState = useRootNavigationState();

  // Prevent multiple redirects firing in the same navigation cycle
  const redirecting = useRef(false);

  useEffect(() => { initialize(); }, []);

  // Load tenant data once user is authenticated
  useEffect(() => {
    if (user?.tenant_id) loadTenant(user.tenant_id);
  }, [user?.tenant_id]);

  useEffect(() => {
    // Wait until the root navigator is fully mounted before any redirect
    if (!navigationState?.key) return;

    if (isLoading) return;
    if (session && approvalStatus === null) return; // profile not loaded yet

    // Debounce: skip if a redirect is already in flight
    if (redirecting.current) return;

    const seg0 = segments[0] as string | undefined;
    const seg1 = segments[1] as string | undefined;

    const inAuth   = seg0 === '(auth)';
    const inAdmin  = seg0 === '(admin)';
    const inCoach  = seg0 === '(coach)';
    const inClient = seg0 === '(client)';
    const inPending = inAuth && seg1 === 'pending-approval';

    const redirect = (path: string) => {
      if (redirecting.current) return;
      redirecting.current = true;
      console.log('[AuthGuard] replacing to', path, '| segments:', segments);
      // Use setTimeout to ensure sub-navigators are mounted before navigating
      setTimeout(() => {
        router.replace(path as any);
        setTimeout(() => { redirecting.current = false; }, 600);
      }, 50);
    };

    // ── No session ──────────────────────────────────────────
    if (!session) {
      if (!inAuth || inPending) redirect('/(auth)/login');
      return;
    }

    // ── Pending / rejected ──────────────────────────────────
    if (approvalStatus === 'pending' || approvalStatus === 'rejected') {
      if (!inPending) redirect('/(auth)/pending-approval');
      return;
    }

    // ── Approved but role not loaded yet ────────────────────
    if (approvalStatus === 'approved' && !user?.primaryRole) return;

    // ── Approved with role ──────────────────────────────────
    if (approvalStatus === 'approved' && user?.primaryRole) {
      const role = user.primaryRole;

      const correctSection =
        (role === 'admin'  && inAdmin)  ||
        (role === 'coach'  && inCoach)  ||
        (role === 'client' && inClient);

      // Already in the right section — nothing to do
      if (correctSection) return;

      // On root (/) or wrong section → redirect to role home
      if (role === 'admin')  { redirect('/(admin)/dashboard');          return; }
      if (role === 'coach')  { redirect('/(coach)/coach-appointments');  return; }
      if (role === 'client') { redirect('/(client)/inicio');             return; }
    }
  }, [isLoading, session, user?.primaryRole, approvalStatus, segments, navigationState?.key]);

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

function NotificationSetup() {
  const router = useRouter();
  const notifRef = useRef<NotificationListener | null>(null);
  const responseRef = useRef<ResponseListener | null>(null);

  useEffect(() => {
    const { notifListener, responseListener } = addNotificationListeners(
      () => {
        // Foreground: expo-notifications shows the banner automatically
        // (configured in setNotificationHandler inside pushNotifications.ts)
      },
      (response) => {
        // User tapped the notification — navigate to notifications screen
        const data = response.notification.request.content.data as Record<string, unknown>;
        const role = data?.role as string | undefined;
        if (role === 'admin')  router.push('/(admin)/notifications' as any);
        else if (role === 'coach') router.push('/(coach)/notifications' as any);
        else router.push('/(client)/notifications' as any);
      }
    );
    notifRef.current = notifListener;
    responseRef.current = responseListener;

    return () => {
      if (notifRef.current && responseRef.current) {
        removeNotificationListeners(notifRef.current, responseRef.current);
      }
    };
  }, []);

  return null;
}

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <I18nextProvider i18n={i18n}>
        <SafeAreaProvider>
          <NotificationSetup />
          <OfflineBanner />
          <ToastContainer />
          <AuthGuard>
            <Slot />
          </AuthGuard>
        </SafeAreaProvider>
      </I18nextProvider>
    </QueryClientProvider>
  );
}
