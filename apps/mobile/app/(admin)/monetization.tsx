import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, StatusBar, Switch, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTheme } from '@/hooks/useTheme';
import { AdminTopBar } from '@/components/admin/AdminTopBar';
import { StatusBadge } from '@/components/admin/StatusBadge';
import { usePlansStore } from '@/store/plans.store';
import { useAuthStore } from '@/store/auth.store';
import { useAdminStats } from '@/hooks/useAdminStats';
import { supabase } from '@/lib/supabase';
import type { Promotion } from '@/store/plans.store';

const TABS = ['Planes', 'Promociones'];

function formatRevenue(amount: number): string {
  if (amount >= 1_000_000) return `₡${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `₡${(amount / 1_000).toFixed(0)}K`;
  return `₡${Math.round(amount)}`;
}

export default function AdminMonetizationScreen() {
  const T = useTheme();
  const router = useRouter();
  const [tab, setTab] = useState('Planes');
  const { user } = useAuthStore();
  const { plans, fetchPlans, togglePlan, togglePromotion } = usePlansStore();

  const tenantId = user?.tenant_id ?? '';

  // Load ALL promotions (including inactive/expired) for admin view
  const [allPromos, setAllPromos] = useState<Promotion[]>([]);
  const [loadingPromos, setLoadingPromos] = useState(true);

  const { data: stats } = useAdminStats(tenantId || undefined);

  useEffect(() => {
    if (!tenantId) return;
    fetchPlans(tenantId);
    loadAllPromos();
  }, [tenantId]);

  const loadAllPromos = async () => {
    if (!tenantId) return;
    setLoadingPromos(true);
    const { data } = await supabase
      .from('promotions')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false });
    setAllPromos((data ?? []) as Promotion[]);
    setLoadingPromos(false);
  };

  const handleTogglePromo = async (id: string, value: boolean) => {
    await togglePromotion(id, value);
    setAllPromos((prev) => prev.map((p) => p.id === id ? { ...p, is_active: value } : p));
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: T.bg }]} edges={['left', 'right']}>
      <StatusBar barStyle="light-content" backgroundColor={T.bg} />
      <AdminTopBar
        title="Monetización"
        subtitle="Planes · Promociones"
        actionLabel={tab === 'Planes' ? '+ Plan' : '+ Promo'}
        onAction={() => router.push(tab === 'Planes' ? '/(admin)/plans/create' : '/(admin)/promotions/create')}
      />

      {/* Revenue summary */}
      <View style={[styles.revCard, { backgroundColor: T.bgCard, borderColor: T.border, borderRadius: T.radiusMd }]}>
        <View style={styles.revItem}>
          <Text style={[styles.revLabel, { color: T.textMuted }]}>MRR</Text>
          <Text style={[styles.revValue, { color: T.text }]}>{formatRevenue(stats?.monthlyRevenue ?? 0)}</Text>
        </View>
        <View style={[styles.revDivider, { backgroundColor: T.border }]} />
        <View style={styles.revItem}>
          <Text style={[styles.revLabel, { color: T.textMuted }]}>Planes activos</Text>
          <Text style={[styles.revValue, { color: T.green }]}>{plans.filter((p) => p.is_active).length}</Text>
        </View>
        <View style={[styles.revDivider, { backgroundColor: T.border }]} />
        <View style={styles.revItem}>
          <Text style={[styles.revLabel, { color: T.textMuted }]}>Promos activas</Text>
          <Text style={[styles.revValue, { color: T.orange }]}>{stats?.activePromotions ?? allPromos.filter((p) => p.is_active).length}</Text>
        </View>
        <View style={[styles.revDivider, { backgroundColor: T.border }]} />
        <View style={styles.revItem}>
          <Text style={[styles.revLabel, { color: T.textMuted }]}>Por cobrar</Text>
          <Text style={[styles.revValue, { color: T.red }]}>{stats?.expiringSubscriptions ?? 0}</Text>
        </View>
      </View>

      <View style={[styles.tabRow, { backgroundColor: T.bgCard, borderColor: T.border, borderRadius: T.radiusMd }]}>
        {TABS.map((t) => (
          <TouchableOpacity
            key={t}
            onPress={() => setTab(t)}
            style={[styles.tabBtn, tab === t && { backgroundColor: T.accent }, { borderRadius: T.radiusSm }]}
          >
            <Text style={[styles.tabText, { color: tab === t ? '#fff' : T.textMuted }]}>{t}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView contentContainerStyle={{ padding: 16 }} showsVerticalScrollIndicator={false}>
        {/* ── PLANES ── */}
        {tab === 'Planes' && (
          <>
            {plans.length === 0 && (
              <View style={styles.empty}>
                <Text style={{ fontSize: 40, marginBottom: 12 }}>💳</Text>
                <Text style={[styles.emptyTitle, { color: T.textMuted }]}>Sin planes creados</Text>
                <TouchableOpacity
                  onPress={() => router.push('/(admin)/plans/create')}
                  style={[styles.emptyBtn, { backgroundColor: T.accent, borderRadius: T.radiusMd }]}
                >
                  <Text style={styles.emptyBtnText}>Crear primer plan</Text>
                </TouchableOpacity>
              </View>
            )}
            {plans.map((plan) => (
              <View key={plan.id} style={[styles.planCard, { backgroundColor: T.bgCard, borderColor: plan.is_active ? T.border : T.border + '60', borderRadius: T.radiusMd }]}>
                <View style={styles.planTop}>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                      <Text style={[styles.planName, { color: plan.is_active ? T.text : T.textMuted }]}>{plan.name}</Text>
                      {!plan.is_active && <StatusBadge status="cancelled" size="sm" />}
                    </View>
                    <Text style={[styles.planPrice, { color: plan.is_active ? T.accent : T.textMuted }]}>
                      {plan.currency} {plan.price.toLocaleString()}
                      <Text style={[styles.planCycle, { color: T.textMuted }]}>
                        /{plan.billing_cycle === 'monthly' ? 'mes' : plan.billing_cycle === 'yearly' ? 'año' : 'único'}
                      </Text>
                    </Text>
                  </View>
                  <Switch
                    value={plan.is_active}
                    onValueChange={(v) => togglePlan(plan.id, v)}
                    trackColor={{ true: T.green, false: T.border }}
                  />
                </View>
                <View style={styles.planFeatures}>
                  {plan.features.slice(0, 3).map((f, i) => (
                    <Text key={i} style={[styles.featureItem, { color: T.textSecondary }]}>✓ {f.name}</Text>
                  ))}
                  {plan.features.length > 3 && (
                    <Text style={{ fontSize: 11, color: T.textMuted }}>+{plan.features.length - 3} más</Text>
                  )}
                </View>
                <TouchableOpacity onPress={() => router.push({ pathname: '/(admin)/plans/edit' as any, params: { id: plan.id } })}>
                  <Text style={{ fontSize: 13, color: T.accent, fontWeight: '600' }}>Editar plan →</Text>
                </TouchableOpacity>
              </View>
            ))}
          </>
        )}

        {/* ── PROMOCIONES ── */}
        {tab === 'Promociones' && (
          <>
            {loadingPromos && <ActivityIndicator color={T.accent} style={{ marginTop: 24 }} />}
            {!loadingPromos && allPromos.length === 0 && (
              <View style={styles.empty}>
                <Text style={{ fontSize: 40, marginBottom: 12 }}>🏷️</Text>
                <Text style={[styles.emptyTitle, { color: T.textMuted }]}>Sin promociones</Text>
                <TouchableOpacity
                  onPress={() => router.push('/(admin)/promotions/create')}
                  style={[styles.emptyBtn, { backgroundColor: T.accent, borderRadius: T.radiusMd }]}
                >
                  <Text style={styles.emptyBtnText}>Crear primera promoción</Text>
                </TouchableOpacity>
              </View>
            )}
            {allPromos.map((promo) => {
              const expired = promo.end_date ? new Date(promo.end_date) < new Date() : false;
              const accentColor = promo.is_active && !expired ? T.purple : T.border;
              return (
                <View
                  key={promo.id}
                  style={[styles.promoCard, { backgroundColor: T.bgCard, borderColor: accentColor + '66', borderRadius: T.radiusMd }]}
                >
                  <View style={styles.promoTop}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.promoTitle, { color: promo.is_active && !expired ? T.text : T.textMuted }]}>
                        {promo.title}
                      </Text>
                      {promo.discount_percentage != null && (
                        <Text style={{ fontSize: 14, fontWeight: '700', color: promo.is_active && !expired ? T.purple : T.textMuted }}>
                          {promo.discount_percentage}% de descuento
                        </Text>
                      )}
                      {promo.discount_amount != null && promo.discount_percentage == null && (
                        <Text style={{ fontSize: 14, fontWeight: '700', color: promo.is_active && !expired ? T.purple : T.textMuted }}>
                          ₡{promo.discount_amount.toLocaleString()} de descuento
                        </Text>
                      )}
                      {promo.end_date && (
                        <Text style={{ fontSize: 11, color: expired ? T.red : T.textMuted, marginTop: 2 }}>
                          {expired ? 'Venció: ' : 'Hasta: '}
                          {new Date(promo.end_date).toLocaleDateString('es-CR')}
                        </Text>
                      )}
                      {!promo.end_date && (
                        <Text style={{ fontSize: 11, color: T.textMuted, marginTop: 2 }}>Sin fecha de vencimiento</Text>
                      )}
                    </View>
                    <View style={{ alignItems: 'flex-end', gap: 8 }}>
                      <Switch
                        value={promo.is_active && !expired}
                        onValueChange={(v) => handleTogglePromo(promo.id, v)}
                        disabled={expired}
                        trackColor={{ true: T.purple, false: T.border }}
                      />
                      {expired && <StatusBadge status="cancelled" size="sm" />}
                    </View>
                  </View>
                  <TouchableOpacity
                    onPress={() => router.push({ pathname: '/(admin)/promotions/edit' as any, params: { id: promo.id } })}
                    style={{ marginTop: 8 }}
                  >
                    <Text style={{ fontSize: 13, color: T.accent, fontWeight: '600' }}>Editar promoción →</Text>
                  </TouchableOpacity>
                </View>
              );
            })}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  revCard: { flexDirection: 'row', marginHorizontal: 16, marginTop: 12, borderWidth: 1, padding: 12 },
  revItem: { flex: 1, alignItems: 'center' },
  revLabel: { fontSize: 9, fontWeight: '600', textTransform: 'uppercase', marginBottom: 4 },
  revValue: { fontSize: 16, fontWeight: '800' },
  revDivider: { width: 1, marginHorizontal: 4 },
  tabRow: { flexDirection: 'row', marginHorizontal: 16, marginVertical: 12, padding: 4, borderWidth: 1 },
  tabBtn: { flex: 1, paddingVertical: 8, alignItems: 'center' },
  tabText: { fontSize: 13, fontWeight: '600' },
  planCard: { borderWidth: 1, padding: 14, marginBottom: 10 },
  planTop: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10 },
  planName: { fontSize: 16, fontWeight: '700', marginBottom: 2 },
  planPrice: { fontSize: 20, fontWeight: '800' },
  planCycle: { fontSize: 13, fontWeight: '400' },
  planFeatures: { gap: 3, marginBottom: 10 },
  featureItem: { fontSize: 12 },
  promoCard: { borderWidth: 1, padding: 14, marginBottom: 8 },
  promoTop: { flexDirection: 'row', alignItems: 'flex-start' },
  promoTitle: { fontSize: 15, fontWeight: '700', marginBottom: 4 },
  empty: { alignItems: 'center', paddingVertical: 40 },
  emptyTitle: { fontSize: 16, marginBottom: 16 },
  emptyBtn: { paddingHorizontal: 20, paddingVertical: 10 },
  emptyBtnText: { color: '#fff', fontWeight: '700' },
});
