import React, { useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/hooks/useTheme';

interface Props {
  title: string;
  description?: string | null;
  discountPct?: number | null;
  discountAmount?: number | null;
  currency?: string;
  endDate?: string | null;
  type?: 'discount' | 'announcement' | 'bundle';
  onPress?: () => void;
  onDismiss?: () => void;
}

function daysLeft(iso: string): number {
  return Math.max(0, Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000));
}

function badgeLabel(
  type: Props['type'],
  discountPct?: number | null,
  discountAmount?: number | null,
  currency?: string,
): string | null {
  if (discountPct) return `${discountPct}% OFF`;
  if (discountAmount) return `-${currency ?? '₡'}${discountAmount}`;
  if (type === 'bundle') return 'BUNDLE';
  if (type === 'announcement') return '¡NUEVO!';
  return null;
}

export function ClientPromoBanner({
  title, description, discountPct, discountAmount, currency,
  endDate, type = 'discount', onPress, onDismiss,
}: Props) {
  const T = useTheme();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(-8)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 380, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, tension: 80, friction: 12, useNativeDriver: true }),
    ]).start();
  }, []);

  const days = endDate ? daysLeft(endDate) : null;
  const badge = badgeLabel(type, discountPct, discountAmount, currency);

  return (
    <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }], marginBottom: 20 }}>
      <TouchableOpacity onPress={onPress} activeOpacity={0.88} style={styles.wrapper}>
        <LinearGradient
          colors={['#1E0A3C', '#2D1060', '#1A0A2E']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradient}
        >
          {/* Glow orbs */}
          <View style={[styles.orb1, { backgroundColor: '#7C3AED' }]} />
          <View style={[styles.orb2, { backgroundColor: '#4F46E5' }]} />

          {/* Border glow overlay */}
          <View style={styles.borderGlow} />

          <View style={styles.content}>
            {/* Left section */}
            <View style={styles.left}>
              {badge && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{badge}</Text>
                </View>
              )}
              <Text style={styles.title} numberOfLines={2}>{title}</Text>
              {description ? (
                <Text style={styles.desc} numberOfLines={2}>{description}</Text>
              ) : null}
              {days !== null && (
                <View style={styles.countdownRow}>
                  <Text style={styles.countdownIcon}>⏱</Text>
                  <Text style={styles.countdown}>
                    {days === 0 ? 'Último día' : `${days} ${days === 1 ? 'día restante' : 'días restantes'}`}
                  </Text>
                </View>
              )}
            </View>

            {/* Right section */}
            <View style={styles.right}>
              {onDismiss && (
                <TouchableOpacity
                  onPress={onDismiss}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  style={styles.dismissBtn}
                >
                  <Text style={styles.dismissText}>✕</Text>
                </TouchableOpacity>
              )}
              <View style={styles.ctaBtn}>
                <Text style={styles.ctaText}>Ver</Text>
                <Text style={styles.ctaArrow}>→</Text>
              </View>
            </View>
          </View>
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    borderRadius: 18,
    overflow: 'hidden',
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 18,
    elevation: 12,
  },
  gradient: {
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: '#7C3AED55',
    overflow: 'hidden',
  },
  orb1: {
    position: 'absolute', top: -30, left: -20,
    width: 110, height: 110, borderRadius: 55, opacity: 0.25,
  },
  orb2: {
    position: 'absolute', bottom: -20, right: 20,
    width: 80, height: 80, borderRadius: 40, opacity: 0.18,
  },
  borderGlow: {
    position: 'absolute', inset: 0,
    borderRadius: 18, borderWidth: 1,
    borderColor: '#A78BFA22',
  },
  content: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
  },
  left: { flex: 1, gap: 5 },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: '#7C3AED',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginBottom: 2,
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.6,
    shadowRadius: 6,
    elevation: 4,
  },
  badgeText: {
    color: '#fff', fontSize: 11, fontWeight: '900', letterSpacing: 1,
  },
  title: {
    color: '#F5F0FF', fontSize: 16, fontWeight: '800', lineHeight: 22,
  },
  desc: {
    color: '#C4B5FD', fontSize: 12, lineHeight: 17, fontWeight: '400',
  },
  countdownRow: {
    flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2,
  },
  countdownIcon: { fontSize: 11 },
  countdown: {
    color: '#FCD34D', fontSize: 11, fontWeight: '700',
  },
  right: {
    alignItems: 'flex-end', justifyContent: 'space-between',
    gap: 12, minWidth: 56,
  },
  dismissBtn: {
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: '#FFFFFF18',
    justifyContent: 'center', alignItems: 'center',
  },
  dismissText: { color: '#C4B5FD', fontSize: 11, fontWeight: '700' },
  ctaBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#7C3AED',
    borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 8,
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 6,
  },
  ctaText: { color: '#fff', fontSize: 13, fontWeight: '800' },
  ctaArrow: { color: '#E9D5FF', fontSize: 13, fontWeight: '800' },
});
