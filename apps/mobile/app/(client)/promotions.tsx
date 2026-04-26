import React, { useEffect } from 'react';
import {
  View, Text, FlatList, StyleSheet,
  ActivityIndicator, StatusBar, TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/hooks/useTheme';
import { usePlansStore } from '@/store/plans.store';
import { useAuthStore } from '@/store/auth.store';
import { ClientTopBar } from '@/components/client/ClientTopBar';
import { useRouter } from 'expo-router';
import type { Promotion } from '@/store/plans.store';

function daysLeft(iso: string): number {
  return Math.max(0, Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000));
}

function typeLabel(type: Promotion['type']): string {
  if (type === 'discount') return 'DESCUENTO';
  if (type === 'bundle') return 'BUNDLE';
  return 'ANUNCIO';
}

function badgeLabel(promo: Promotion): string {
  if (promo.discount_percentage) return `${promo.discount_percentage}% OFF`;
  if (promo.discount_amount) return `-${promo.discount_amount}`;
  return typeLabel(promo.type);
}

function PromoCard({ promo, onPress }: { promo: Promotion; onPress: () => void }) {
  const T = useTheme();
  const days = promo.end_date ? daysLeft(promo.end_date) : null;
  const isDiscount = promo.type === 'discount';

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.88} style={styles.cardWrapper}>
      <LinearGradient
        colors={isDiscount ? ['#1E0A3C', '#2D1060', '#1A0A2E'] : ['#0A1628', '#0D2040', '#0A1628']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.card, { borderColor: isDiscount ? '#7C3AED55' : T.accent + '44' }]}
      >
        {/* Glow orbs */}
        <View style={[styles.orb1, { backgroundColor: isDiscount ? '#7C3AED' : T.accent }]} />
        <View style={[styles.orb2, { backgroundColor: isDiscount ? '#4F46E5' : T.accent }]} />

        {/* Top row: badge + type */}
        <View style={styles.topRow}>
          <View style={[styles.badge, { backgroundColor: isDiscount ? '#7C3AED' : T.accent }]}>
            <Text style={styles.badgeText}>{badgeLabel(promo)}</Text>
          </View>
          <Text style={[styles.typeTag, { color: isDiscount ? '#A78BFA' : T.textSecondary }]}>
            {typeLabel(promo.type)}
          </Text>
        </View>

        {/* Title */}
        <Text style={styles.title} numberOfLines={2}>{promo.title}</Text>

        {/* Description */}
        {promo.description ? (
          <Text style={styles.desc} numberOfLines={3}>{promo.description}</Text>
        ) : null}

        {/* Footer: countdown + CTA */}
        <View style={styles.footer}>
          {days !== null ? (
            <View style={styles.countdownRow}>
              <Text style={styles.countdownIcon}>⏱</Text>
              <Text style={styles.countdown}>
                {days === 0 ? 'Último día' : `${days} ${days === 1 ? 'día restante' : 'días restantes'}`}
              </Text>
            </View>
          ) : (
            <Text style={styles.noExpiry}>Sin fecha de vencimiento</Text>
          )}
          <View style={[styles.ctaBtn, { backgroundColor: isDiscount ? '#7C3AED' : T.accent }]}>
            <Text style={styles.ctaText}>Ver planes →</Text>
          </View>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );
}

export default function ClientPromotionsScreen() {
  const T = useTheme();
  const router = useRouter();
  const { user } = useAuthStore();
  const { promotions, isLoadingPromos, fetchPromotions } = usePlansStore();

  useEffect(() => {
    if (user?.tenant_id) fetchPromotions(user.tenant_id);
  }, [user?.tenant_id]);

  const activePromos = promotions.filter((p) => p.is_active);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: T.bg }} edges={['left', 'right']}>
      <StatusBar barStyle="light-content" backgroundColor={T.bg} />
      <ClientTopBar title="Promociones" />

      {isLoadingPromos ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator color={T.accent} size="large" />
        </View>
      ) : (
        <FlatList
          data={activePromos}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
          ListHeaderComponent={
            <View style={{ marginBottom: 16 }}>
              <Text style={[styles.pageTitle, { color: T.text }]}>Ofertas activas</Text>
              <Text style={[styles.pageSubtitle, { color: T.textSecondary }]}>
                {activePromos.length === 0
                  ? 'Sin promociones activas'
                  : `${activePromos.length} ${activePromos.length === 1 ? 'promoción disponible' : 'promociones disponibles'}`}
              </Text>
            </View>
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={{ fontSize: 40, marginBottom: 12 }}>🎁</Text>
              <Text style={[styles.emptyTitle, { color: T.text }]}>Sin promociones activas</Text>
              <Text style={[styles.emptyDesc, { color: T.textMuted }]}>
                Cuando haya ofertas disponibles aparecerán aquí.
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <PromoCard
              promo={item}
              onPress={() => router.push('/(client)/plans')}
            />
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  pageTitle: { fontSize: 24, fontWeight: '800', marginBottom: 2 },
  pageSubtitle: { fontSize: 13 },
  empty: { alignItems: 'center', paddingVertical: 80 },
  emptyTitle: { fontSize: 18, fontWeight: '700', marginBottom: 8 },
  emptyDesc: { fontSize: 14, textAlign: 'center', lineHeight: 20 },

  // Card
  cardWrapper: {
    borderRadius: 18, marginBottom: 16,
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 10,
  },
  card: {
    borderRadius: 18, padding: 20,
    borderWidth: 1, overflow: 'hidden',
  },
  orb1: {
    position: 'absolute', top: -30, left: -20,
    width: 120, height: 120, borderRadius: 60, opacity: 0.22,
  },
  orb2: {
    position: 'absolute', bottom: -20, right: 10,
    width: 90, height: 90, borderRadius: 45, opacity: 0.15,
  },
  topRow: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: 10,
  },
  badge: {
    borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4,
    shadowColor: '#7C3AED', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5, shadowRadius: 6, elevation: 4,
  },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: '900', letterSpacing: 1 },
  typeTag: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },
  title: { color: '#F5F0FF', fontSize: 18, fontWeight: '800', lineHeight: 24, marginBottom: 6 },
  desc: { color: '#C4B5FD', fontSize: 13, lineHeight: 19, marginBottom: 14 },
  footer: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginTop: 4,
  },
  countdownRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  countdownIcon: { fontSize: 12 },
  countdown: { color: '#FCD34D', fontSize: 12, fontWeight: '700' },
  noExpiry: { color: '#6B7280', fontSize: 11 },
  ctaBtn: {
    borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8,
    shadowColor: '#7C3AED', shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.45, shadowRadius: 8, elevation: 5,
  },
  ctaText: { color: '#fff', fontSize: 13, fontWeight: '800' },
});
