import React, { useEffect, useState } from 'react';
import {
  View, Text, FlatList, StyleSheet, Modal, ScrollView, TouchableOpacity,
  ActivityIndicator, StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as WebBrowser from 'expo-web-browser';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/hooks/useTheme';
import { usePlansStore } from '@/store/plans.store';
import { useAuthStore } from '@/store/auth.store';
import { supabase } from '@/lib/supabase';
import { ClientTopBar } from '@/components/client/ClientTopBar';
import { PlanCard } from '@/components/plans/PlanCard';
import { PaymentModal } from '@/components/plans/PaymentModal';
import { getOfferPlans } from '@/services/offers.service';
import type { Plan, Promotion } from '@/store/plans.store';

function daysLeft(iso: string): number {
  return Math.max(0, Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000));
}

function typeLabel(type: Promotion['type'], t: (key: string) => string): string {
  if (type === 'discount') return t('client.promotions.type.discount');
  if (type === 'bundle') return t('client.promotions.type.bundle');
  return t('client.promotions.type.announcement');
}

function badgeLabel(promo: Promotion, t: (key: string, opts?: any) => string): string {
  if (promo.discount_percentage) return t('client.promotions.percentOff', { percent: promo.discount_percentage });
  if (promo.discount_amount) return `-${promo.discount_amount}`;
  return typeLabel(promo.type, t);
}

function PromoCard({ promo, onPress }: { promo: Promotion; onPress: (p: Promotion) => void }) {
  const { t } = useTranslation();
  const T = useTheme();
  const days = promo.end_date ? daysLeft(promo.end_date) : null;
  const isDiscount = promo.type === 'discount';

  return (
    <TouchableOpacity onPress={() => onPress(promo)} activeOpacity={0.88} style={styles.cardWrapper}>
      <LinearGradient
        colors={isDiscount ? ['#1E0A3C', '#2D1060', '#1A0A2E'] : ['#0A1628', '#0D2040', '#0A1628']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.card, { borderColor: isDiscount ? '#7C3AED55' : T.accent + '44' }]}
      >
        <View style={[styles.orb1, { backgroundColor: isDiscount ? '#7C3AED' : T.accent }]} />
        <View style={[styles.orb2, { backgroundColor: isDiscount ? '#4F46E5' : T.accent }]} />

        <View style={styles.topRow}>
          <View style={[styles.badge, { backgroundColor: isDiscount ? '#7C3AED' : T.accent }]}>
            <Text style={styles.badgeText}>{badgeLabel(promo, t)}</Text>
          </View>
          <Text style={[styles.typeTag, { color: isDiscount ? '#A78BFA' : T.textSecondary }]}>
            {typeLabel(promo.type, t)}
          </Text>
        </View>

        <Text style={styles.title} numberOfLines={2}>{promo.title}</Text>

        {promo.description ? (
          <Text style={styles.desc} numberOfLines={3}>{promo.description}</Text>
        ) : null}

        <View style={styles.footer}>
          {days !== null ? (
            <View style={styles.countdownRow}>
              <Text style={styles.countdownIcon}>⏱</Text>
              <Text style={styles.countdown}>
                {days === 0 ? t('client.promotions.lastDay') : t('client.promotions.daysLeft', { count: days })}
              </Text>
            </View>
          ) : (
            <Text style={styles.noExpiry}>{t('client.promotions.noExpiry')}</Text>
          )}
          <View style={[styles.ctaBtn, { backgroundColor: isDiscount ? '#7C3AED' : T.accent }]}>
            <Text style={styles.ctaText}>{t('client.promotions.viewPlans')}</Text>
          </View>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );
}

export default function ClientPromotionsScreen() {
  const { t } = useTranslation();
  const T = useTheme();
  const { user } = useAuthStore();
  const { promotions, isLoadingPromos, fetchPromotions, fetchMySubscription, mySubscriptions } = usePlansStore();

  const [selectedOffer, setSelectedOffer] = useState<Promotion | null>(null);
  const [offerPlans, setOfferPlans] = useState<Plan[]>([]);
  const [offerPlansLoading, setOfferPlansLoading] = useState(false);
  const [paymentPlan, setPaymentPlan] = useState<Plan | null>(null);

  useEffect(() => {
    if (user?.tenant_id) fetchPromotions(user.tenant_id);
  }, [user?.tenant_id]);

  useEffect(() => {
    if (!selectedOffer) { setOfferPlans([]); return; }
    setOfferPlansLoading(true);
    getOfferPlans(selectedOffer.id)
      .then(setOfferPlans)
      .catch(() => setOfferPlans([]))
      .finally(() => setOfferPlansLoading(false));
  }, [selectedOffer?.id]);

  const activePromos = promotions.filter((p) => p.is_active);
  const subscribedPlanIds = new Set(mySubscriptions.map((s) => s.plan_id));

  const offerPromo =
    selectedOffer?.type === 'discount' &&
    selectedOffer.is_active &&
    (selectedOffer.end_date === null || new Date(selectedOffer.end_date).getTime() > Date.now())
      ? selectedOffer
      : null;

  const handlePaymentConfirm = async (plan: Plan, promoId?: string) => {
    if (!user) throw new Error(t('client.promotions.errors.notAuthenticated'));

    const { data: { session: authSession } } = await supabase.auth.getSession();
    const token = authSession?.access_token;
    if (!token) throw new Error(t('client.promotions.errors.notAuthenticatedShort'));

    const siteUrl = process.env.EXPO_PUBLIC_SITE_URL;
    if (!siteUrl) throw new Error(t('client.promotions.errors.siteUrlNotConfigured'));

    const res = await fetch(`${siteUrl}/api/stripe/checkout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ planId: plan.id, promotionId: promoId ?? null }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error ?? `${t('common.error')} ${res.status}`);
    }

    const { url } = await res.json();
    await WebBrowser.openBrowserAsync(url);
    await fetchMySubscription(user.id, user.tenant_id);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: T.bg }} edges={['left', 'right']}>
      <StatusBar barStyle="light-content" backgroundColor={T.bg} />
      <ClientTopBar title={t('client.promotions.title')} />

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
              <Text style={[styles.pageTitle, { color: T.text }]}>{t('client.promotions.activeOffers')}</Text>
              <Text style={[styles.pageSubtitle, { color: T.textSecondary }]}>
                {activePromos.length === 0
                  ? t('client.promotions.noneActive')
                  : t('client.promotions.availableCount', { count: activePromos.length })}
              </Text>
            </View>
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={{ fontSize: 40, marginBottom: 12 }}>🎁</Text>
              <Text style={[styles.emptyTitle, { color: T.text }]}>{t('client.promotions.noneActive')}</Text>
              <Text style={[styles.emptyDesc, { color: T.textMuted }]}>
                {t('client.promotions.emptyDesc')}
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <PromoCard promo={item} onPress={setSelectedOffer} />
          )}
        />
      )}

      {/* Offer detail bottom sheet */}
      <Modal
        visible={!!selectedOffer}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedOffer(null)}
      >
        <View style={styles.sheetOverlay}>
          <TouchableOpacity style={styles.sheetBackdrop} onPress={() => setSelectedOffer(null)} />
          <View style={[styles.sheet, { backgroundColor: T.bgCard }]}>
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHeader}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.sheetTitle, { color: T.text }]} numberOfLines={2}>
                  {selectedOffer?.title}
                </Text>
                {selectedOffer?.description ? (
                  <Text style={[styles.sheetDesc, { color: T.textSecondary }]} numberOfLines={3}>
                    {selectedOffer.description}
                  </Text>
                ) : null}
              </View>
              <TouchableOpacity
                onPress={() => setSelectedOffer(null)}
                style={[styles.closeBtn, { backgroundColor: T.bg }]}
              >
                <Text style={{ color: T.textMuted, fontSize: 16 }}>✕</Text>
              </TouchableOpacity>
            </View>

            <Text style={[styles.plansLabel, { color: T.textMuted }]}>{t('client.promotions.availablePlans')}</Text>

            {offerPlansLoading ? (
              <View style={{ paddingVertical: 40, alignItems: 'center' }}>
                <ActivityIndicator color={T.accent} />
              </View>
            ) : offerPlans.length === 0 ? (
              <View style={{ paddingVertical: 40, alignItems: 'center' }}>
                <Text style={{ color: T.textMuted, fontSize: 14 }}>{t('client.promotions.noPlansForOffer')}</Text>
              </View>
            ) : (
              <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 32 }} showsVerticalScrollIndicator={false}>
                {offerPlans.map((plan) => (
                  <PlanCard
                    key={plan.id}
                    plan={plan}
                    activePromo={offerPromo}
                    isSubscribed={subscribedPlanIds.has(plan.id)}
                    onSubscribe={(p) => setPaymentPlan(p)}
                  />
                ))}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      <PaymentModal
        plan={paymentPlan}
        promotion={offerPromo}
        visible={!!paymentPlan}
        onClose={() => setPaymentPlan(null)}
        onConfirm={async (plan, promoId) => {
          await handlePaymentConfirm(plan, promoId);
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  pageTitle: { fontSize: 24, fontWeight: '800', marginBottom: 2 },
  pageSubtitle: { fontSize: 13 },
  empty: { alignItems: 'center', paddingVertical: 80 },
  emptyTitle: { fontSize: 18, fontWeight: '700', marginBottom: 8 },
  emptyDesc: { fontSize: 14, textAlign: 'center', lineHeight: 20 },

  cardWrapper: {
    borderRadius: 18, marginBottom: 16,
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4, shadowRadius: 16, elevation: 10,
  },
  card: { borderRadius: 18, padding: 20, borderWidth: 1, overflow: 'hidden' },
  orb1: { position: 'absolute', top: -30, left: -20, width: 120, height: 120, borderRadius: 60, opacity: 0.22 },
  orb2: { position: 'absolute', bottom: -20, right: 10, width: 90, height: 90, borderRadius: 45, opacity: 0.15 },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  badge: {
    borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4,
    shadowColor: '#7C3AED', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5, shadowRadius: 6, elevation: 4,
  },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: '900', letterSpacing: 1 },
  typeTag: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },
  title: { color: '#F5F0FF', fontSize: 18, fontWeight: '800', lineHeight: 24, marginBottom: 6 },
  desc: { color: '#C4B5FD', fontSize: 13, lineHeight: 19, marginBottom: 14 },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 },
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

  // Bottom sheet
  sheetOverlay: { flex: 1 },
  sheetBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' },
  sheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '82%', minHeight: '50%' },
  sheetHandle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignSelf: 'center', marginTop: 12, marginBottom: 16,
  },
  sheetHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingHorizontal: 16, paddingBottom: 12 },
  sheetTitle: { fontSize: 18, fontWeight: '800', marginBottom: 4 },
  sheetDesc: { fontSize: 13, lineHeight: 18 },
  closeBtn: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  plansLabel: { fontSize: 10, fontWeight: '800', letterSpacing: 1.5, paddingHorizontal: 16, paddingBottom: 4 },
});
