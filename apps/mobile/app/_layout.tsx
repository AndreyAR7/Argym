import React, { useEffect, useRef } from 'react';
import { View, ActivityIndicator, useColorScheme, Text, TouchableOpacity } from 'react-native';
import { Slot, useSegments, useRouter, useRootNavigationState } from 'expo-router';
import { QueryClientProvider } from '@tanstack/react-query';
import { I18nextProvider } from 'react-i18next';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { i18n } from '@/i18n';
import { useAuthStore } from '@/store/auth.store';
import { useProfileStore, getThemeConfig } from '@/store/profile.store';
import { useTenantStore } from '@/store/tenant.store';
import { useOnboardingStore } from '@/store/onboarding.store';
import { AppThemeContext } from '@/context/ThemeContext';
import { OfflineBanner } from '@/components/shared/OfflineBanner';
import { ToastContainer } from '@/components/shared/Toast';
import { queryClient } from '@/lib/queryClient';
import {
  addNotificationListeners,
  removeNotificationListeners,
  type NotificationListener,
  type ResponseListener,
} from '@/lib/pushNotifications';

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { session, user, isLoading, initialize, approvalStatus, signOut } = useAuthStore();
  const { theme } = useProfileStore();
  const { loadTenant } = useTenantStore();
  const { seenByUser, checkedByUser, checkSeen } = useOnboardingStore();
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

  // Load the "has this user seen the onboarding tour" flag once we know who they are
  useEffect(() => {
    if (user?.id) checkSeen(user.id);
  }, [user?.id]);

  const onboardingSeen = user?.id
    ? (checkedByUser[user.id] ? seenByUser[user.id] : null)
    : null;

  // An approved profile with no role assigned (e.g. a user_roles row missing
  // or deleted out from under them) makes AuthGuard wait silently forever —
  // there's no route to redirect to and no error is ever surfaced, so the
  // user just sees a frozen loading screen with no way to recover. Give that
  // wait a ceiling so it degrades to a visible, actionable error instead.
  const [roleTimedOut, setRoleTimedOut] = React.useState(false);
  const awaitingRole = approvalStatus === 'approved' && !!session && !user?.primaryRole;

  useEffect(() => {
    if (!awaitingRole) {
      setRoleTimedOut(false);
      return;
    }
    const timer = setTimeout(() => setRoleTimedOut(true), 10000);
    return () => clearTimeout(timer);
  }, [awaitingRole]);

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
    const inOnboarding = seg0 === 'onboarding';
    const inPending = inAuth && seg1 === 'pending-approval';
    const inAccountSuspended = inAuth && seg1 === 'account-suspended';

    const redirect = (path: string) => {
      if (redirecting.current) return;
      redirecting.current = true;
      console.log('[AuthGuard] replacing to', path, '| segments:', segments);
      // Use setTimeout to ensure sub-navigators are mounted before navigating
      setTimeout(() => {
        try {
          router.replace(path as any);
        } catch (err) {
          // An unmatched route (e.g. a brand-new route file Metro hasn't
          // picked up yet) must not leave redirecting stuck true forever —
          // that would silently block every future redirect app-wide.
          console.warn('[AuthGuard] router.replace failed for', path, err);
        } finally {
          setTimeout(() => { redirecting.current = false; }, 600);
        }
      }, 50);
    };

    // ── No session ──────────────────────────────────────────
    if (!session) {
      if (!inAuth || inPending) redirect('/(auth)/login');
      return;
    }

    // ── Pending / rejected / blocked (3rd rejection) ─────────
    if (approvalStatus === 'pending' || approvalStatus === 'rejected' || approvalStatus === 'blocked') {
      if (!inPending) redirect('/(auth)/pending-approval');
      return;
    }

    // ── Account suspended (e.g. lapsed unpaid gym membership) ─
    if (user?.is_active === false) {
      if (!inAccountSuspended) redirect('/(auth)/account-suspended');
      return;
    }

    // ── Approved but role not loaded yet ────────────────────
    if (approvalStatus === 'approved' && !user?.primaryRole) return;

    // ── Approved with role, but we don't know yet if they've seen the tour ──
    if (approvalStatus === 'approved' && user?.primaryRole && onboardingSeen === null) return;

    // ── First run: send them through the onboarding tour first ─────────
    if (approvalStatus === 'approved' && user?.primaryRole && onboardingSeen === false) {
      if (!inOnboarding) redirect('/onboarding');
      return;
    }

    // ── Approved with role ──────────────────────────────────
    if (approvalStatus === 'approved' && user?.primaryRole) {
      const role = user.primaryRole;

      const isAdminRole = role === 'admin' || role === 'full_access';
      const correctSection =
        (isAdminRole       && inAdmin)  ||
        (role === 'coach'  && inCoach)  ||
        (role === 'client' && inClient);

      // Already in the right section — nothing to do
      if (correctSection) return;

      // On root (/) or wrong section → redirect to role home
      if (isAdminRole)       { redirect('/(admin)/dashboard');          return; }
      if (role === 'coach')  { redirect('/(coach)/coach-appointments');  return; }
      if (role === 'client') { redirect('/(client)/inicio');             return; }
    }
  }, [isLoading, session, user?.primaryRole, user?.is_active, approvalStatus, segments, navigationState?.key, onboardingSeen]);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: themeConfig.bg }}>
        <ActivityIndicator size="large" color={themeConfig.accent} />
      </View>
    );
  }

  if (roleTimedOut) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: themeConfig.bg, padding: 24 }}>
        <Text style={{ color: themeConfig.text, fontSize: 16, textAlign: 'center', marginBottom: 24 }}>
          No se pudo cargar tu cuenta. Es posible que no tengas un rol asignado — contacta al administrador del gimnasio.
        </Text>
        <TouchableOpacity
          onPress={() => initialize()}
          style={{ backgroundColor: themeConfig.accent, paddingVertical: 12, paddingHorizontal: 24, borderRadius: 8, marginBottom: 12 }}
        >
          <Text style={{ color: '#fff', fontWeight: '600' }}>Reintentar</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => signOut()}>
          <Text style={{ color: themeConfig.text, textDecorationLine: 'underline' }}>Cerrar sesión</Text>
        </TouchableOpacity>
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
  const { user } = useAuthStore();
  const notifRef = useRef<NotificationListener | null>(null);
  const responseRef = useRef<ResponseListener | null>(null);

  useEffect(() => {
    const { notifListener, responseListener } = addNotificationListeners(
      () => {
        // Foreground: expo-notifications shows the banner automatically
        // (configured in setNotificationHandler inside pushNotifications.ts)
      },
      (response) => {
        // User tapped the notification — navigate to notifications screen.
        // The queue-driven push payload doesn't actually carry a role
        // today (process_notification_queue() never sets one), so fall
        // back to the signed-in user's own role — also covers full_access,
        // which the payload-role branch never accounted for either.
        const data = response.notification.request.content.data as Record<string, unknown>;
        const role = (data?.role as string | undefined) ?? user?.primaryRole;
        if (role === 'admin' || role === 'full_access') router.push('/(admin)/notifications' as any);
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
