import React, { useEffect, useRef } from 'react';
import {
  View, Text, Image, TouchableOpacity, StyleSheet,
  Animated, Modal, Pressable, Platform, ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useSegments } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/hooks/useTheme';
import { useCoachSidebarStore } from '@/store/coachSidebar.store';
import { useAuthStore } from '@/store/auth.store';
import { AppLogo } from '@/components/shared/AppLogo';

const SIDEBAR_WIDTH = 290;

interface NavItem {
  id: string;
  labelKey: string;
  icon: string;
  route: string;
  accentKey: 'accent' | 'orange' | 'green' | 'blue' | 'gold' | 'accentSoft' | 'red';
}

const NAV_ITEMS: NavItem[] = [
  { id: 'index',              labelKey: 'coach.sidebar.dashboard',    icon: '🏠', route: '/(coach)/index',              accentKey: 'accent' },
  { id: 'coach-appointments', labelKey: 'coach.sidebar.appointments', icon: '📅', route: '/(coach)/coach-appointments', accentKey: 'blue' },
  { id: 'clients',            labelKey: 'coach.sidebar.clients',      icon: '👥', route: '/(coach)/clients',            accentKey: 'orange' },
  { id: 'routines',           labelKey: 'coach.sidebar.routines',     icon: '💪', route: '/(coach)/routines',           accentKey: 'green' },
  { id: 'nutrition',          labelKey: 'coach.sidebar.nutrition',    icon: '🥗', route: '/(coach)/nutrition',          accentKey: 'green' },
  { id: 'videos',             labelKey: 'coach.sidebar.videos',       icon: '🎬', route: '/(coach)/videos',             accentKey: 'blue' },
  { id: 'notifications',      labelKey: 'coach.sidebar.notifications', icon: '🔔', route: '/(coach)/notifications',     accentKey: 'red' },
];

export function CoachSidebar() {
  const T = useTheme();
  const { t } = useTranslation();
  const { isOpen, close } = useCoachSidebarStore();
  const { user, signOut } = useAuthStore();
  const router = useRouter();
  const segments = useSegments();
  const insets = useSafeAreaInsets();

  const slideAnim = useRef(new Animated.Value(-SIDEBAR_WIDTH)).current;
  const overlayAnim = useRef(new Animated.Value(0)).current;

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

  const name = user?.full_name ?? t('coach.sidebar.defaultName');
  const initials = name.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase();
  const displayAvatar = (user as any)?.avatar_url ?? null;

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
        <View style={[styles.header, { borderBottomColor: T.border }]}>
          <View style={{ alignItems: 'center', marginBottom: 12 }}>
            <AppLogo size={80} />
          </View>
          <View style={styles.headerTop}>
            {displayAvatar ? (
              <Image source={{ uri: displayAvatar }} style={[styles.avatar, { borderColor: T.accent + '55' }]} />
            ) : (
              <View style={[styles.avatar, { backgroundColor: T.accent + '30', borderColor: T.accent + '55' }]}>
                <Text style={{ fontSize: 20, fontWeight: '900', color: T.accent }}>{initials}</Text>
              </View>
            )}
            <TouchableOpacity onPress={close} style={[styles.closeBtn, { backgroundColor: T.bgCard }]} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={{ color: T.textSecondary, fontSize: 14 }}>✕</Text>
            </TouchableOpacity>
          </View>
          <Text style={{ fontSize: 17, fontWeight: '800', color: T.text, marginBottom: 4 }}>{name}</Text>
          <Text style={{ fontSize: 11, color: T.textMuted }}>{t('coach.sidebar.roleLabel')}</Text>
        </View>

        <ScrollView style={styles.navSection} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingTop: 4, paddingBottom: 8 }}>
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
                  {t(item.labelKey)}
                </Text>
                {active && <View style={[styles.activeBar, { backgroundColor: accent }]} />}
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <View style={styles.footer}>
          <View style={[styles.footerDivider, { backgroundColor: T.border }]} />
          <TouchableOpacity onPress={() => { close(); signOut(); }} style={styles.signOutBtn}>
            <View style={[styles.iconBox, { backgroundColor: T.redSoft }]}>
              <Text style={{ fontSize: 16 }}>🚪</Text>
            </View>
            <Text style={{ fontSize: 14, color: T.red, fontWeight: '600' }}>{t('coach.sidebar.signOut')}</Text>
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
  navSection: { flex: 1, paddingHorizontal: 10 },
  navItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 10, paddingVertical: 11, borderRadius: 12, marginBottom: 2, position: 'relative' },
  iconBox: { width: 34, height: 34, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  navLabel: { fontSize: 14, flex: 1 },
  activeBar: { position: 'absolute', right: 8, width: 4, height: 22, borderRadius: 2 },
  footer: { paddingHorizontal: 10, paddingBottom: 8 },
  footerDivider: { height: 1, marginBottom: 8 },
  signOutBtn: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 10, paddingVertical: 10, borderRadius: 10 },
});
