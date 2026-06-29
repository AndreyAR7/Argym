import React, { useEffect, useRef } from 'react';
import {
  View, Text, Image, TouchableOpacity, StyleSheet,
  Animated, Modal, Pressable, Platform, ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useSegments } from 'expo-router';
import { useTheme } from '@/hooks/useTheme';
import { useClientSidebarStore } from '@/store/clientSidebar.store';
import { useAuthStore } from '@/store/auth.store';
import { useProfileStore } from '@/store/profile.store';
import { usePlansStore } from '@/store/plans.store';
import { AppLogo } from '@/components/shared/AppLogo';

const SIDEBAR_WIDTH = 290;

const LEVEL_LABELS: Record<string, string> = {
  beginner: 'Principiante',
  intermediate: 'Intermedio',
  advanced: 'Avanzado',
};

const PLAN_TIER_LABELS: Record<string, string> = {
  basic: 'Básico',
  medium: 'Medio',
  premium: 'Premium',
};

interface NavItem {
  id: string;
  label: string;
  icon: string;
  route: string;
  accentKey: 'accent' | 'orange' | 'green' | 'blue' | 'gold' | 'accentSoft' | 'red';
}

// Homologated icons — all use consistent emoji style
const NAV_ITEMS: NavItem[] = [
  { id: 'inicio',              label: 'Inicio',        icon: '🏠', route: '/(client)/inicio',              accentKey: 'accent' },
  { id: 'client-appointments', label: 'Mis Citas',     icon: '📅', route: '/(client)/client-appointments',  accentKey: 'blue' },
  { id: 'progress',            label: 'Progreso',      icon: '📊', route: '/(client)/progress',             accentKey: 'orange' },
  { id: 'routine',             label: 'Rutina',        icon: '💪', route: '/(client)/routine',              accentKey: 'accent' },
  { id: 'nutrition',           label: 'Nutrición',     icon: '🥗', route: '/(client)/nutrition',            accentKey: 'green' },
  { id: 'videos',              label: 'Videos',        icon: '🎬', route: '/(client)/videos',               accentKey: 'blue' },
  { id: 'plans',               label: 'Planes',        icon: '💳', route: '/(client)/plans',                accentKey: 'gold' },
  { id: 'promotions',          label: 'Promociones',   icon: '🎁', route: '/(client)/promotions',           accentKey: 'accent' },
  { id: 'gamification',        label: 'Gamificación',  icon: '🏆', route: '/(client)/gamification',         accentKey: 'gold' },
  { id: 'profile',             label: 'Mi Perfil',     icon: '👤', route: '/(client)/profile',              accentKey: 'accentSoft' },
];

export function ClientSidebar() {
  const T = useTheme();
  const { isOpen, close } = useClientSidebarStore();
  const { user, signOut } = useAuthStore();
  const { avatarUrl, loadProfile } = useProfileStore();
  const { mySubscription, fetchMySubscription } = usePlansStore();
  const router = useRouter();
  const segments = useSegments();
  const insets = useSafeAreaInsets();

  const slideAnim = useRef(new Animated.Value(-SIDEBAR_WIDTH)).current;
  const overlayAnim = useRef(new Animated.Value(0)).current;

  // Load avatar and subscription when sidebar opens
  useEffect(() => {
    if (isOpen) {
      loadProfile();
      if (user?.id && user?.tenant_id && !mySubscription) {
        fetchMySubscription(user.id, user.tenant_id);
      }
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      Animated.parallel([
        Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, tension: 60, friction: 10 }),
        Animated.timing(overlayAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, { toValue: -SIDEBAR_WIDTH, duration: 220, useNativeDriver: true }),
        Animated.timing(overlayAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
      ]).start();
    }
  }, [isOpen]);

  const isActive = (item: NavItem) => {
    const path = '/' + segments.join('/');
    return path.includes(item.id);
  };

  const navigate = (route: string) => {
    close();
    setTimeout(() => router.push(route as any), 50);
  };

  const name = user?.full_name ?? 'Cliente';
  const firstName = name.split(' ')[0];
  const initials = name.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase();

  // Real plan and level
  const planName = mySubscription?.plan?.name ?? null;
  const planTier = mySubscription?.plan?.plan_tier ?? null;
  const clientLevel = user?.client_level ?? null;

  // Use avatar_url from auth store as fallback (set during upload)
  const displayAvatar = avatarUrl ?? (user as any)?.avatar_url ?? null;

  if (!isOpen) return null;

  return (
    <Modal transparent visible={isOpen} animationType="none" statusBarTranslucent onRequestClose={close}>
      <Animated.View style={[styles.overlay, { opacity: overlayAnim }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={close} />
      </Animated.View>

      <Animated.View style={[
        styles.sidebar,
        {
          borderRightColor: T.border,
          transform: [{ translateX: slideAnim }],
          paddingTop: insets.top + 12,
          paddingBottom: Math.max(insets.bottom, Platform.OS === 'android' ? 20 : 0),
        },
      ]}>
        {/* User header */}
        <TouchableOpacity
          onPress={() => navigate('/(client)/profile')}
          activeOpacity={0.8}
          style={[styles.header, { borderBottomColor: T.border }]}
        >
          {/* Brand logo */}
          <View style={{ alignItems: 'center', marginBottom: 12 }}>
            <AppLogo size={80} />
          </View>
          <View style={styles.headerTop}>
            {displayAvatar ? (
              <Image
                source={{ uri: displayAvatar }}
                style={[styles.avatar, { borderColor: T.accent + '55' }]}
              />
            ) : (
              <View style={[styles.avatar, { backgroundColor: T.accent + '30', borderColor: T.accent + '55' }]}>
                <Text style={{ fontSize: 20, fontWeight: '900', color: T.accent }}>{initials}</Text>
              </View>
            )}
            <TouchableOpacity
              onPress={close}
              style={[styles.closeBtn, { backgroundColor: T.bgCard }]}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={{ color: T.textSecondary, fontSize: 14 }}>✕</Text>
            </TouchableOpacity>
          </View>

          <Text style={{ fontSize: 17, fontWeight: '800', color: T.text, marginBottom: 8 }}>{name}</Text>

          <View style={styles.badgesRow}>
            {planName && (
              <View style={[styles.badge, { backgroundColor: T.accent + '25', borderColor: T.accent + '44' }]}>
                <Text style={{ fontSize: 11, fontWeight: '700', color: T.accent }}>
                  💳 {planName}
                </Text>
              </View>
            )}
            {clientLevel && (
              <View style={[styles.badge, { backgroundColor: T.green + '22', borderColor: T.green + '44' }]}>
                <Text style={{ fontSize: 11, fontWeight: '700', color: T.green }}>
                  ⭐ {LEVEL_LABELS[clientLevel] ?? clientLevel}
                </Text>
              </View>
            )}
            {!planName && !clientLevel && (
              <View style={[styles.badge, { backgroundColor: T.border, borderColor: T.border }]}>
                <Text style={{ fontSize: 11, color: T.textMuted }}>Sin plan asignado</Text>
              </View>
            )}
          </View>

          <Text style={{ fontSize: 10, color: T.accent, fontWeight: '600', marginTop: 4 }}>
            Toca para ver tu perfil →
          </Text>
        </TouchableOpacity>

        {/* Nav items */}
        <ScrollView
          style={styles.navSection}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingTop: 4, paddingBottom: 8 }}
        >
          {NAV_ITEMS.map((item) => {
            const active = isActive(item);
            const accent = T[item.accentKey] as string ?? T.accent;
            return (
              <TouchableOpacity
                key={item.id}
                onPress={() => navigate(item.route)}
                activeOpacity={0.75}
                style={[styles.navItem, active && { backgroundColor: accent + '18' }]}
              >
                <View style={[styles.iconBox, { backgroundColor: active ? accent + '30' : T.bgCard }]}>
                  <Text style={{ fontSize: 16 }}>{item.icon}</Text>
                </View>
                <Text style={[styles.navLabel, { color: active ? T.text : T.textSecondary, fontWeight: active ? '700' : '500' }]}>
                  {item.label}
                </Text>
                {active && <View style={[styles.activeBar, { backgroundColor: accent }]} />}
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Footer */}
        <View style={styles.footer}>
          <View style={[styles.footerDivider, { backgroundColor: T.border }]} />
          <TouchableOpacity
            onPress={() => { close(); signOut(); }}
            style={styles.signOutBtn}
          >
            <View style={[styles.iconBox, { backgroundColor: T.redSoft }]}>
              <Text style={{ fontSize: 16 }}>🚪</Text>
            </View>
            <Text style={{ fontSize: 14, color: T.red, fontWeight: '600' }}>Cerrar sesión</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.72)' },
  sidebar: {
    position: 'absolute', left: 0, top: 0, bottom: 0,
    width: SIDEBAR_WIDTH, backgroundColor: '#0F0F1A',
    borderRightWidth: 1, flexDirection: 'column',
  },
  header: { paddingHorizontal: 18, paddingBottom: 16, borderBottomWidth: 1 },
  headerTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 },
  avatar: { width: 56, height: 56, borderRadius: 18, borderWidth: 2, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  closeBtn: { width: 28, height: 28, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  badgesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 6 },
  badge: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1 },
  navSection: { flex: 1, paddingHorizontal: 10 },
  navItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 10, paddingVertical: 11, borderRadius: 12, marginBottom: 2, position: 'relative' },
  iconBox: { width: 34, height: 34, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  navLabel: { fontSize: 14, flex: 1 },
  activeBar: { position: 'absolute', right: 8, width: 4, height: 22, borderRadius: 2 },
  footer: { paddingHorizontal: 10, paddingBottom: 8 },
  footerDivider: { height: 1, marginBottom: 8 },
  signOutBtn: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 10, paddingVertical: 10, borderRadius: 10 },
});
