import React, { useEffect, useRef } from 'react';
import {
  View, Text, Image, TouchableOpacity, StyleSheet,
  Animated, Modal, Pressable, Platform, ScrollView,
} from 'react-native';import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useSegments } from 'expo-router';
import { useTheme } from '@/hooks/useTheme';
import { useSidebarStore } from '@/store/sidebar.store';
import { useAuthStore } from '@/store/auth.store';
import { useProfileStore } from '@/store/profile.store';
import { useTenantStore } from '@/store/tenant.store';
import { useUnreadCount } from '@/hooks/useNotifications';
import { AppLogo } from '@/components/shared/AppLogo';

const SIDEBAR_WIDTH = 280;

interface NavItem {
  id: string;
  label: string;
  icon: string;
  route: string;
  badge?: number;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'dashboard',          label: 'Dashboard',      icon: '🏠', route: '/(admin)/dashboard' },
  { id: 'clients',            label: 'Clientes',        icon: '👥', route: '/(admin)/clients' },
  { id: 'coaches',            label: 'Coaches',         icon: '🏋️', route: '/(admin)/coaches' },
  { id: 'admin-appointments', label: 'Citas',           icon: '📅', route: '/(admin)/admin-appointments' },
  { id: 'content',            label: 'Contenido',       icon: '🎬', route: '/(admin)/content' },
  { id: 'monetization',       label: 'Monetización',    icon: '💳', route: '/(admin)/monetization' },
  { id: 'user-approval',      label: 'Aprobaciones',    icon: '✅', route: '/(admin)/user-approval' },
  { id: 'notifications',      label: 'Notificaciones',  icon: '🔔', route: '/(admin)/notifications' },
  { id: 'settings',           label: 'Configuración',   icon: '⚙️', route: '/(admin)/settings' },
];

// NavIcon receives colors as props — no module-level T reference
function NavIcon({ icon, active, accent, bgSurface }: {
  icon: string; active: boolean; accent: string; bgSurface: string;
}) {
  return (
    <View style={[
      styles.iconBox,
      { backgroundColor: active ? accent + '25' : bgSurface },
    ]}>
      <Text style={[styles.iconText, { color: active ? accent : '#5A5A7A' }]}>{icon}</Text>
    </View>
  );
}

export function AdminSidebar() {
  const T = useTheme(); // ← reactive, called inside component
  const { isOpen, close } = useSidebarStore();
  const { user, signOut } = useAuthStore();
  const { tenant } = useTenantStore();
  const { avatarUrl } = useProfileStore();
  const { data: unreadCount = 0 } = useUnreadCount(user?.id);
  const router = useRouter();
  const segments = useSegments();
  const insets = useSafeAreaInsets();

  const slideAnim = useRef(new Animated.Value(-SIDEBAR_WIDTH)).current;
  const overlayAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isOpen) {
      Animated.parallel([
        Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, tension: 65, friction: 11 }),
        Animated.timing(overlayAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, { toValue: -SIDEBAR_WIDTH, duration: 220, useNativeDriver: true }),
        Animated.timing(overlayAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
      ]).start();
    }
  }, [isOpen]);

  const currentRoute = '/' + segments.join('/');
  const isActive = (item: NavItem) => {
    const last = segments[segments.length - 1] as string;
    if (item.id === 'index') return last === '(admin)' || last === 'index';
    return currentRoute.includes(item.id);
  };

  const navigate = (route: string) => {
    close();
    setTimeout(() => router.push(route as any), 50);
  };

  const initials = (user?.full_name ?? 'AD').split(' ').map((n) => n[0]).slice(0, 2).join('');

  if (!isOpen) return null;

  return (
    <Modal transparent visible={isOpen} animationType="none" statusBarTranslucent onRequestClose={close}>
      <Animated.View style={[styles.overlay, { opacity: overlayAnim }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={close} />
      </Animated.View>

      <Animated.View style={[
        styles.sidebar,
        {
          backgroundColor: T.bgCard,
          borderRightColor: T.borderStrong,
          transform: [{ translateX: slideAnim }],
          paddingTop: insets.top + 8,
          paddingBottom: Math.max(insets.bottom, Platform.OS === 'android' ? 16 : 0),
        },
      ]}>
        {/* Header */}
        <View style={[styles.sidebarHeader, { borderBottomColor: T.border }]}>
          <View style={styles.tenantRow}>
            <AppLogo size={36} style={{ borderRadius: 8 }} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.tenantName, { color: T.text }]} numberOfLines={1}>
                {tenant?.name ?? 'Centro Demo'}
              </Text>
              <View style={[styles.adminBadge, { backgroundColor: T.accentGlow }]}>
                <Text style={[styles.adminBadgeText, { color: T.accent }]}>ADMIN</Text>
              </View>
            </View>
            <TouchableOpacity onPress={close} style={[styles.closeBtn, { backgroundColor: T.bgSurface }]}>
              <Text style={{ color: T.textSecondary, fontSize: 14 }}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* User row — tappable → settings */}
          <TouchableOpacity onPress={() => navigate('/(admin)/settings')} activeOpacity={0.8} style={styles.userRow}>
            {avatarUrl ? (
              <Image source={{ uri: avatarUrl }} style={[styles.userAvatar, { backgroundColor: T.accentGlow, borderColor: T.accent + '44' }]} />
            ) : (
              <View style={[styles.userAvatar, { backgroundColor: T.accentGlow, borderColor: T.accent + '44' }]}>
                <Text style={{ fontSize: 14, fontWeight: '800', color: T.accent }}>{initials}</Text>
              </View>
            )}
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 13, fontWeight: '700', color: T.text }} numberOfLines={1}>
                {user?.full_name ?? 'Administrador'}
              </Text>
              <Text style={{ fontSize: 11, color: T.textSecondary, marginTop: 1 }}>
                Administrador del sistema
              </Text>
              <Text style={{ fontSize: 10, color: T.accent, fontWeight: '600', marginTop: 2 }}>
                Toca para configuración →
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Nav items */}
        <ScrollView style={styles.navSection} showsVerticalScrollIndicator={false}>
          <Text style={[styles.navSectionLabel, { color: T.textSecondary }]}>NAVEGACIÓN</Text>
          {NAV_ITEMS.map((item) => {
            const active = isActive(item);
            return (
              <TouchableOpacity
                key={item.id}
                onPress={() => navigate(item.route)}
                activeOpacity={0.75}
                style={[styles.navItem, active && { backgroundColor: T.accentGlow }]}
              >
                <NavIcon icon={item.icon} active={active} accent={T.accent} bgSurface={T.bgSurface} />
                <Text style={[styles.navLabel, { color: active ? T.text : T.textSecondary, fontWeight: active ? '700' : '500' }]}>
                  {item.label}
                </Text>
                {item.badge ? (
                  <View style={[styles.navBadge, { backgroundColor: T.accent }]}>
                    <Text style={styles.navBadgeText}>{item.badge}</Text>
                  </View>
                ) : item.id === 'notifications' && unreadCount > 0 ? (
                  <View style={[styles.navBadge, { backgroundColor: T.red }]}>
                    <Text style={styles.navBadgeText}>{unreadCount > 99 ? '99+' : unreadCount}</Text>
                  </View>
                ) : null}
                {active && <View style={[styles.activeIndicator, { backgroundColor: T.accent }]} />}
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Footer */}
        <View style={styles.sidebarFooter}>
          <View style={[styles.footerDivider, { backgroundColor: T.border }]} />
          <TouchableOpacity onPress={() => { close(); signOut(); }} style={styles.signOutBtn}>
            <View style={[styles.iconBox, { backgroundColor: T.redSoft }]}>
              <Text style={[styles.iconText, { color: T.red }]}>🚪</Text>
            </View>
            <Text style={{ fontSize: 14, color: T.red, fontWeight: '600' }}>Cerrar sesión</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </Modal>
  );
}

// StyleSheet contains ONLY layout/spacing — NO color references
const styles = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.65)' },
  sidebar: {
    position: 'absolute', left: 0, top: 0, bottom: 0,
    width: SIDEBAR_WIDTH, borderRightWidth: 1, flexDirection: 'column',
  },
  sidebarHeader: { paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1 },
  tenantRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },
  tenantIcon: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  tenantName: { fontSize: 14, fontWeight: '700' },
  adminBadge: { alignSelf: 'flex-start', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 1, marginTop: 2 },
  adminBadgeText: { fontSize: 9, fontWeight: '800', letterSpacing: 0.5 },
  closeBtn: { width: 28, height: 28, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  userRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  userAvatar: { width: 38, height: 38, borderRadius: 12, borderWidth: 2, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  navSection: { flex: 1, paddingHorizontal: 10, paddingTop: 4 },
  navSectionLabel: { fontSize: 9, fontWeight: '700', letterSpacing: 1, paddingHorizontal: 8, marginBottom: 6, marginTop: 4 },
  navItem: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 8, paddingVertical: 11, borderRadius: 10, marginBottom: 2, position: 'relative' },
  iconBox: { width: 32, height: 32, borderRadius: 9, justifyContent: 'center', alignItems: 'center' },
  iconText: { fontSize: 16, fontWeight: '700' },
  navLabel: { fontSize: 14, flex: 1 },
  navBadge: { borderRadius: 10, paddingHorizontal: 6, paddingVertical: 2 },
  navBadgeText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  activeIndicator: { position: 'absolute', right: 8, width: 4, height: 20, borderRadius: 2 },
  sidebarFooter: { paddingHorizontal: 10, paddingBottom: 8 },
  footerDivider: { height: 1, marginBottom: 8 },
  signOutBtn: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 8, paddingVertical: 10, borderRadius: 10 },
});
