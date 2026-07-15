import React from 'react';
import { View, Text, ScrollView, StyleSheet, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { AdminTopBar } from '@/components/admin/AdminTopBar';
import { useTheme } from '@/hooks/useTheme';
import { useAdminStats } from '@/hooks/useAdminStats';
import { useAuthStore } from '@/store/auth.store';

function currentMonthLabel(): string {
  return new Date().toLocaleDateString('es-CR', { month: 'long', year: 'numeric' });
}

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export default function AdminAnalyticsScreen() {
  const T = useTheme();
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const tenantId = user?.tenant_id ?? '';
  const { data: stats, isLoading } = useAdminStats(tenantId || undefined);

  const dash = isLoading ? '--' : undefined;

  const activeClients   = dash ?? (stats?.newClientsThisMonth ?? '--');
  const retention       = '--';
  const appointments    = '--';
  const revenue         = isLoading ? '--' : stats ? `₡${stats.monthlyRevenue.toLocaleString('es-CR')}` : '--';

  const kpis = [
    { label: t('admin.analytics.kpis.activeClients'),         value: activeClients,  accent: T.accent  },
    { label: t('admin.analytics.kpis.appointmentsCompleted'), value: appointments,   accent: T.green   },
    { label: t('admin.analytics.kpis.monthlyRevenue'),        value: revenue,        accent: T.teal    },
    { label: t('admin.analytics.kpis.retention'),             value: retention,      accent: T.purple  },
  ];

  const trends = [
    { label: t('admin.analytics.trends.newClientsThisWeek'), value: isLoading ? '--' : (stats?.newClientsThisMonth ?? '--'), color: T.green  },
    { label: t('admin.analytics.trends.cancelledAppointments'),            value: '--',                                                    color: T.red    },
    { label: t('admin.analytics.trends.mostPopularPlan'),            value: '--',                                                    color: T.accent },
  ];

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: T.bg }]} edges={['left', 'right']}>
      <StatusBar barStyle="light-content" backgroundColor={T.bg} />
      <AdminTopBar
        title={t('admin.analytics.title')}
        subtitle={capitalize(currentMonthLabel())}
      />

      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>

        {/* KPI 2x2 grid */}
        <Text style={[s.sectionLabel, { color: T.textMuted }]}>{t('admin.analytics.sectionSummary')}</Text>
        <View style={s.kpiGrid}>
          {kpis.map((kpi) => (
            <View
              key={kpi.label}
              style={[s.kpiCard, { backgroundColor: T.bgCard, borderColor: T.border, borderLeftColor: kpi.accent }]}
            >
              <Text style={[s.kpiValue, { color: kpi.accent }]}>{kpi.value}</Text>
              <Text style={[s.kpiLabel, { color: T.textMuted }]}>{kpi.label}</Text>
            </View>
          ))}
        </View>

        {/* Info banner */}
        <View style={[s.banner, { backgroundColor: T.bgCard, borderColor: T.border }]}>
          <Text style={{ fontSize: 22, marginBottom: 8 }}>📊</Text>
          <Text style={[s.bannerTitle, { color: T.text }]}>
            {t('admin.analytics.banner.title')}
          </Text>
          <Text style={[s.bannerDesc, { color: T.textMuted }]}>
            {t('admin.analytics.banner.description')}
          </Text>
        </View>

        {/* Tendencias */}
        <Text style={[s.sectionLabel, { color: T.textMuted }]}>{t('admin.analytics.sectionTrends')}</Text>
        <View style={[s.trendBox, { backgroundColor: T.bgCard, borderColor: T.border }]}>
          {trends.map((item, i) => (
            <View
              key={item.label}
              style={[
                s.trendRow,
                { borderBottomColor: T.border },
                i === trends.length - 1 && { borderBottomWidth: 0 },
              ]}
            >
              <Text style={[s.trendLabel, { color: T.textSecondary }]}>{item.label}</Text>
              <Text style={[s.trendValue, { color: item.color }]}>{item.value}</Text>
            </View>
          ))}
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:    { flex: 1 },
  content: { padding: 16, paddingBottom: 40 },

  sectionLabel: {
    fontSize: 11, fontWeight: '700', textTransform: 'uppercase',
    letterSpacing: 0.8, marginBottom: 10,
  },

  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 },
  kpiCard: {
    width: '47.5%', borderRadius: 12, borderWidth: 1, borderLeftWidth: 4,
    padding: 16, minHeight: 80, justifyContent: 'center',
  },
  kpiValue: { fontSize: 22, fontWeight: '900', marginBottom: 4 },
  kpiLabel: { fontSize: 11, fontWeight: '600' },

  banner: {
    borderRadius: 14, borderWidth: 1,
    padding: 18, marginBottom: 20, alignItems: 'center',
  },
  bannerTitle: { fontSize: 15, fontWeight: '700', textAlign: 'center', marginBottom: 6 },
  bannerDesc:  { fontSize: 13, lineHeight: 18, textAlign: 'center' },

  trendBox: {
    borderRadius: 14, borderWidth: 1,
    overflow: 'hidden', marginBottom: 16,
  },
  trendRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 14, paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  trendLabel: { fontSize: 13, flex: 1 },
  trendValue: { fontSize: 15, fontWeight: '800', marginLeft: 12 },
});
