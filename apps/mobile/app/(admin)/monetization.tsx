import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, StatusBar, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTheme } from '@/hooks/useTheme';
import { AdminTopBar } from '@/components/admin/AdminTopBar';
import { StatusBadge } from '@/components/admin/StatusBadge';
import { usePlansStore } from '@/store/plans.store';
import { useAuthStore } from '@/store/auth.store';
import { ADMIN_KPI } from '@/data/adminMock';

const TABS = ['Planes', 'Promociones'];

export default function AdminMonetizationScreen() {
  const T = useTheme();
  const router = useRouter();
  const [tab, setTab] = useState('Planes');
  const { user } = useAuthStore();
  const { plans, promotions, fetchPlans, fetchPromotions, togglePlan, togglePromotion } = usePlansStore();

  useEffect(() => {
    if (user?.tenant_id) { fetchPlans(user.tenant_id); fetchPromotions(user.tenant_id); }
  }, [user?.tenant_id]);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: T.bg }]} edges={['left', 'right']}>
      <StatusBar barStyle="light-content" backgroundColor={T.bg} />
      <AdminTopBar title="Monetización" subtitle="Planes · Promociones"
        actionLabel={tab === 'Planes' ? '+ Plan' : '+ Promo'}
        onAction={() => router.push(tab === 'Planes' ? '/(admin)/plans/create' : '/(admin)/promotions/create')} />

      <View style={[styles.revCard, { backgroundColor: T.bgCard, borderColor: T.border, borderRadius: T.radiusMd }]}>
        <View style={styles.revItem}>
          <Text style={[styles.revLabel, { color: T.textMuted }]}>Revenue mensual</Text>
          <Text style={[styles.revValue, { color: T.text }]}>₡{ADMIN_KPI.monthlyRevenue.toLocaleString('es-CR')}</Text>
        </View>
        <View style={[styles.revDivider, { backgroundColor: T.border }]} />
        <View style={styles.revItem}>
          <Text style={[styles.revLabel, { color: T.textMuted }]}>Planes activos</Text>
          <Text style={[styles.revValue, { color: T.green }]}>{plans.filter((p) => p.is_active).length}</Text>
        </View>
        <View style={[styles.revDivider, { backgroundColor: T.border }]} />
        <View style={styles.revItem}>
          <Text style={[styles.revLabel, { color: T.textMuted }]}>Promos activas</Text>
          <Text style={[styles.revValue, { color: T.orange }]}>{promotions.filter((p) => p.is_active).length}</Text>
        </View>
      </View>

      <View style={[styles.tabRow, { backgroundColor: T.bgCard, borderColor: T.border, borderRadius: T.radiusMd }]}>
        {TABS.map((t) => (
          <TouchableOpacity key={t} onPress={() => setTab(t)}
            style={[styles.tabBtn, tab === t && { backgroundColor: T.accent }, { borderRadius: T.radiusSm }]}>
            <Text style={[styles.tabText, { color: tab === t ? '#fff' : T.textMuted }]}>{t}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView contentContainerStyle={{ padding: 16 }} showsVerticalScrollIndicator={false}>
        {tab === 'Planes' && (
          <>
            {plans.length === 0 && (
              <View style={styles.empty}>
                <Text style={{ fontSize: 40, marginBottom: 12 }}>💳</Text>
                <Text style={[styles.emptyTitle, { color: T.textMuted }]}>Sin planes creados</Text>
                <TouchableOpacity onPress={() => router.push('/(admin)/plans/create')} style={[styles.emptyBtn, { backgroundColor: T.accent, borderRadius: T.radiusMd }]}>
                  <Text style={styles.emptyBtnText}>Crear primer plan</Text>
                </TouchableOpacity>
              </View>
            )}
            {plans.map((plan) => (
              <View key={plan.id} style={[styles.planCard, { backgroundColor: T.bgCard, borderColor: T.border, borderRadius: T.radiusMd }]}>
                <View style={styles.planTop}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.planName, { color: T.text }]}>{plan.name}</Text>
                    <Text style={[styles.planPrice, { color: T.accent }]}>
                      {plan.currency} {plan.price.toLocaleString()}
                      <Text style={[styles.planCycle, { color: T.textMuted }]}>/{plan.billing_cycle === 'monthly' ? 'mes' : plan.billing_cycle === 'yearly' ? 'año' : 'único'}</Text>
                    </Text>
                  </View>
                  <Switch value={plan.is_active} onValueChange={(v) => togglePlan(plan.id, v)} trackColor={{ true: T.green, false: T.border }} />
                </View>
                <View style={styles.planFeatures}>
                  {plan.features.slice(0, 3).map((f, i) => <Text key={i} style={[styles.featureItem, { color: T.textSecondary }]}>✓ {f.name}</Text>)}
                  {plan.features.length > 3 && <Text style={{ fontSize: 11, color: T.textMuted }}>+{plan.features.length - 3} más</Text>}
                </View>
                <TouchableOpacity onPress={() => router.push({ pathname: '/(admin)/plans/edit' as any, params: { id: plan.id } })}>
                  <Text style={{ fontSize: 13, color: T.accent, fontWeight: '600' }}>Editar plan →</Text>
                </TouchableOpacity>
              </View>
            ))}
          </>
        )}

        {tab === 'Promociones' && (
          <>
            {promotions.length === 0 && (
              <View style={styles.empty}>
                <Text style={{ fontSize: 40, marginBottom: 12 }}>🏷️</Text>
                <Text style={[styles.emptyTitle, { color: T.textMuted }]}>Sin promociones</Text>
                <TouchableOpacity onPress={() => router.push('/(admin)/promotions/create')} style={[styles.emptyBtn, { backgroundColor: T.accent, borderRadius: T.radiusMd }]}>
                  <Text style={styles.emptyBtnText}>Crear primera promoción</Text>
                </TouchableOpacity>
              </View>
            )}
            {promotions.map((promo) => {
              const expired = promo.end_date && new Date(promo.end_date) < new Date();
              return (
                <View key={promo.id} style={[styles.promoCard, { backgroundColor: T.bgCard, borderColor: promo.is_active && !expired ? T.purple + '44' : T.border, borderRadius: T.radiusMd }]}>
                  <View style={styles.promoTop}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.promoTitle, { color: T.text }]}>{promo.title}</Text>
                      {promo.discount_percentage && <Text style={{ fontSize: 14, fontWeight: '700', color: T.purple }}>{promo.discount_percentage}% de descuento</Text>}
                      {promo.end_date && <Text style={{ fontSize: 11, color: T.textMuted, marginTop: 2 }}>Hasta: {new Date(promo.end_date).toLocaleDateString('es-CR')}</Text>}
                    </View>
                    <View style={{ alignItems: 'flex-end', gap: 8 }}>
                      <Switch value={promo.is_active} onValueChange={(v) => togglePromotion(promo.id, v)} trackColor={{ true: T.purple, false: T.border }} />
                      {expired && <StatusBadge status="cancelled" size="sm" />}
                    </View>
                  </View>
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
  revCard: { flexDirection: 'row', marginHorizontal: 16, marginTop: 12, borderWidth: 1, padding: 14 },
  revItem: { flex: 1, alignItems: 'center' },
  revLabel: { fontSize: 10, fontWeight: '600', textTransform: 'uppercase', marginBottom: 4 },
  revValue: { fontSize: 18, fontWeight: '800' },
  revDivider: { width: 1, marginHorizontal: 8 },
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
