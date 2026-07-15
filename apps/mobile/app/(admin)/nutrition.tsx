import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { AdminTopBar } from '@/components/admin/AdminTopBar';
import { useTheme } from '@/hooks/useTheme';
import { useNutritionStore } from '@/store/nutrition.store';

// ─── Quick stat card ──────────────────────────────────────────
function StatCard({ label, value, color }: { label: string; value: string; color: string }) {
  const T = useTheme();
  return (
    <View style={[styles.statCard, { backgroundColor: T.bgCard, borderColor: T.border }]}>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: T.textMuted }]}>{label}</Text>
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────
export default function AdminNutritionScreen() {
  const T = useTheme();
  const router = useRouter();
  const { t } = useTranslation();
  const { adminPlans } = useNutritionStore();

  const activePlans  = adminPlans.filter((p) => p.status === 'active').length;
  const draftPlans   = adminPlans.filter((p) => p.status === 'draft').length;
  const assigned     = adminPlans.filter((p) => p.status === 'active' && (p as any).assigned_count > 0).length;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: T.bg }]} edges={['left', 'right']}>
      <StatusBar barStyle="light-content" backgroundColor={T.bg} />
      <AdminTopBar title={t('navigation.nutrition')} />

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>

        {/* Info card */}
        <View style={[styles.infoCard, { backgroundColor: T.bgCard, borderColor: T.accent + '44' }]}>
          <Text style={{ fontSize: 22, marginBottom: 8 }}>🥗</Text>
          <Text style={[styles.infoTitle, { color: T.text }]}>{t('admin.nutrition.infoTitle')}</Text>
          <Text style={[styles.infoBody, { color: T.textSecondary }]}>
            {t('admin.nutrition.infoBody')}
          </Text>
          <TouchableOpacity
            onPress={() => router.push('/(admin)/content')}
            style={[styles.goBtn, { backgroundColor: T.accent }]}
          >
            <Text style={styles.goBtnText}>{t('admin.nutrition.goToContent')}</Text>
          </TouchableOpacity>
        </View>

        {/* Quick stats */}
        <Text style={[styles.sectionTitle, { color: T.textMuted }]}>{t('admin.nutrition.summary')}</Text>
        <View style={styles.statsRow}>
          <StatCard label={t('admin.nutrition.stats.active')}   value={adminPlans.length ? String(activePlans) : '--'} color={T.green} />
          <StatCard label={t('admin.nutrition.stats.assigned')} value={adminPlans.length ? String(assigned)    : '--'} color={T.accent} />
          <StatCard label={t('admin.nutrition.stats.drafts')}   value={adminPlans.length ? String(draftPlans)  : '--'} color={T.orange} />
        </View>

        {/* Tip */}
        <View style={[styles.tipCard, { backgroundColor: T.teal + '18', borderColor: T.teal + '44' }]}>
          <Text style={[styles.tipText, { color: T.textSecondary }]}>
            {t('admin.nutrition.tip')}
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  infoCard: {
    borderRadius: 18, borderWidth: 1.5, padding: 20,
    alignItems: 'center', marginBottom: 24,
  },
  infoTitle: { fontSize: 17, fontWeight: '800', marginBottom: 8, textAlign: 'center' },
  infoBody: { fontSize: 14, lineHeight: 20, textAlign: 'center', marginBottom: 20 },
  goBtn: { borderRadius: 12, paddingHorizontal: 28, paddingVertical: 13 },
  goBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  sectionTitle: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10 },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  statCard: { flex: 1, borderRadius: 14, borderWidth: 1, padding: 14, alignItems: 'center' },
  statValue: { fontSize: 22, fontWeight: '800', marginBottom: 4 },
  statLabel: { fontSize: 10, fontWeight: '600', textAlign: 'center' },
  tipCard: { borderRadius: 12, borderWidth: 1, padding: 14 },
  tipText: { fontSize: 13, lineHeight: 19 },
});
