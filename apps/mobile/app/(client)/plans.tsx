import React, { useEffect, useState } from 'react';
import {
  View, Text, FlatList, Modal, ScrollView, Alert,
  StyleSheet, ActivityIndicator, StatusBar, TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as WebBrowser from 'expo-web-browser';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/hooks/useTheme';
import { usePlansStore } from '@/store/plans.store';
import { useAuthStore } from '@/store/auth.store';
import { supabase } from '@/lib/supabase';
import { PlanCard } from '@/components/plans/PlanCard';
import { OfferCard } from '@/components/plans/OfferCard';
import { PaymentModal } from '@/components/plans/PaymentModal';
import { ClientTopBar } from '@/components/client/ClientTopBar';
import { getOfferPlans } from '@/services/offers.service';
import type { Plan, Promotion } from '@/store/plans.store';

const LEVEL_LABEL: Record<string, string> = {
  beginner:     'client.plans.level.beginner',
  intermediate: 'client.plans.level.intermediate',
  advanced:     'client.plans.level.advanced',
};

function isPromoLive(p: Promotion): boolean {
  const now = Date.now();
  return (
    p.is_active &&
    new Date(p.start_date).getTime() <= now &&
    (p.end_date === null || new Date(p.end_date).getTime() > now)
  );
}

export default function ClientPlansScreen() {
  const { t } = useTranslation();
  const T = useTheme();
  const { user } = useAuthStore();
  const {
    promotions, mySubscriptions,
    isLoadingPromos, fetchPlans, fetchPromotions, fetchMySubscription,
    subscribeToRealtime,
  } = usePlansStore();

  // Offer drill-in state
  const [selectedOffer, setSelectedOffer] = useState<Promotion | null>(null);
  const [offerPlans, setOfferPlans] = useState<Plan[]>([]);
  const [offerPlansLoading, setOfferPlansLoading] = useState(false);

  // Payment state
  const [paymentPlan, setPaymentPlan] = useState<Plan | null>(null);

  const subscribedPlanIds = new Set(mySubscriptions.map((s) => s.plan_id));

  useEffect(() => {
    if (!user?.tenant_id) return;
    fetchPlans(user.tenant_id);
    fetchPromotions(user.tenant_id);
    fetchMySubscription(user.id, user.tenant_id);
    const unsub = subscribeToRealtime(user.tenant_id);
    return unsub;
  }, [user?.tenant_id]);

  // Load plans for the selected offer
  useEffect(() => {
    if (!selectedOffer) { setOfferPlans([]); return; }
    setOfferPlansLoading(true);
    getOfferPlans(selectedOffer.id)
      .then(setOfferPlans)
      .catch(() => setOfferPlans([]))
      .finally(() => setOfferPlansLoading(false));
  }, [selectedOffer?.id]);

  const myLevel = user?.client_level;

  // Offers visible to this client (matches their level or 'all')
  const visibleOffers = promotions.filter(
    (p) =>
      isPromoLive(p) &&
      (p.target_level === 'all' || !myLevel || p.target_level === myLevel)
  );

  const handlePaymentConfirm = async (plan: Plan, promoId?: string) => {
    if (!user) throw new Error(t('client.plans.errors.notAuthenticated'));

    const { data: { session: authSession } } = await supabase.auth.getSession();
    const token = authSession?.access_token;
    if (!token) throw new Error(t('client.plans.errors.notAuthenticatedShort'));

    const siteUrl = process.env.EXPO_PUBLIC_SITE_URL;
    if (!siteUrl) throw new Error(t('client.plans.errors.siteUrlMissing'));

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
      throw new Error(err.error ?? t('client.plans.errors.httpError', { status: res.status }));
    }

    const { url } = await res.json();
    await WebBrowser.openBrowserAsync(url);
    // Refresh subscription after browser closes (webhook may have already created it)
    await fetchMySubscription(user.id, user.tenant_id);
  };

  // The active discount promo for the current offer (if discount type)
  const offerPromo =
    selectedOffer?.type === 'discount' && isPromoLive(selectedOffer)
      ? selectedOffer
      : null;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: T.bg }} edges={['left', 'right']}>
      <StatusBar barStyle="light-content" backgroundColor={T.bg} />
      <ClientTopBar title={t('client.plans.title')} />

      {isLoadingPromos ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator color={T.accent} size="large" />
        </View>
      ) : (
        <FlatList
          data={visibleOffers}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
          ListHeaderComponent={
            <View style={{ marginBottom: 12 }}>
              <Text style={[styles.pageTitle, { color: T.text }]}>{t('client.plans.availableOffers')}</Text>
              {myLevel ? (
                <Text style={[styles.pageSubtitle, { color: T.textSecondary }]}>
                  {t(LEVEL_LABEL[myLevel])} · {t('client.plans.activeOffersCount', { count: visibleOffers.length })}
                </Text>
              ) : (
                <Text style={[styles.pageSubtitle, { color: T.textSecondary }]}>
                  {t('client.plans.activeOffersCount', { count: visibleOffers.length })}
                </Text>
              )}
            </View>
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={{ fontSize: 40, marginBottom: 12 }}>🎯</Text>
              <Text style={[styles.emptyTitle, { color: T.text }]}>{t('client.plans.empty.title')}</Text>
              <Text style={[styles.emptyText, { color: T.textMuted }]}>
                {t('client.plans.empty.message')}
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <OfferCard offer={item} onPress={setSelectedOffer} />
          )}
        />
      )}

      {/* ── Offer detail bottom sheet ── */}
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

            {/* Offer header */}
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

            <Text style={[styles.plansLabel, { color: T.textMuted }]}>{t('client.plans.availablePlans')}</Text>

            {offerPlansLoading ? (
              <View style={{ paddingVertical: 40, alignItems: 'center' }}>
                <ActivityIndicator color={T.accent} />
              </View>
            ) : offerPlans.length === 0 ? (
              <View style={{ paddingVertical: 40, alignItems: 'center' }}>
                <Text style={{ color: T.textMuted, fontSize: 14 }}>{t('client.plans.noPlansForOffer')}</Text>
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

      {/* Payment modal */}
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
  empty: { alignItems: 'center', paddingVertical: 60, paddingHorizontal: 32 },
  emptyTitle: { fontSize: 18, fontWeight: '800', marginBottom: 8 },
  emptyText: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
  sheetOverlay: { flex: 1 },
  sheetBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' },
  sheet: {
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    maxHeight: '82%', minHeight: '50%',
  },
  sheetHandle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignSelf: 'center', marginTop: 12, marginBottom: 16,
  },
  sheetHeader: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 12,
    paddingHorizontal: 16, paddingBottom: 12,
  },
  sheetTitle: { fontSize: 18, fontWeight: '800', marginBottom: 4 },
  sheetDesc: { fontSize: 13, lineHeight: 18 },
  closeBtn: {
    width: 32, height: 32, borderRadius: 16,
    justifyContent: 'center', alignItems: 'center',
  },
  plansLabel: {
    fontSize: 10, fontWeight: '800', letterSpacing: 1.5,
    paddingHorizontal: 16, paddingBottom: 4,
  },
});
