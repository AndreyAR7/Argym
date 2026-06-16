import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, StatusBar, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { AdminStatCard } from '@/components/admin/AdminStatCard';
import { StatusBadge } from '@/components/admin/StatusBadge';
import { AdminTopBar } from '@/components/admin/AdminTopBar';
import { useAuthStore } from '@/store/auth.store';
import { useTenantStore } from '@/store/tenant.store';
import { useTheme } from '@/hooks/useTheme';
import { useAppointmentsAdmin } from '@/hooks/useAppointments';
import { useClientsWithPlan } from '@/hooks/useProfiles';
import { useNotifications } from '@/hooks/useNotifications';
import { useAdminStats } from '@/hooks/useAdminStats';
import { formatRelativeTime, formatTime } from '@/lib/timeUtils';
import type { Appointment } from '@/types/appointments';
import type { AppNotification } from '@/services/notifications.service';

const NOTIF_ICON: Record<string, string> = {
  appointment_created:     '📅',
  appointment_confirmed:   '✅',
  appointment_cancelled:   '❌',
  appointment_completed:   '🏁',
  appointment_rescheduled: '🔄',
};

const NOTIF_COLOR: Record<string, string> = {
  appointment_created:     '#3B82F6',
  appointment_confirmed:   '#10B981',
  appointment_cancelled:   '#EF4444',
  appointment_completed:   '#8B5CF6',
  appointment_rescheduled: '#F59E0B',
};

function formatRevenue(amount: number): string {
  if (amount >= 1_000_000) return `₡${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `₡${(amount / 1_000).toFixed(0)}K`;
  return `₡${Math.round(amount)}`;
}

export default function AdminDashboard() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { tenant } = useTenantStore();
  const T = useTheme();
  const [refreshing, setRefreshing] = useState(false);

  const tenantId = user?.tenant_id ?? '';

  const { data: appointments = [], isLoading: isLoadingAppts, refetch: refetchAppts } = useAppointmentsAdmin(tenantId || undefined);
  const { data: clients = [] } = useClientsWithPlan();
  const { data: notifPages, refetch: refetchNotifs } = useNotifications(user?.id);
  const { data: stats, isLoading: isLoadingStats, refetch: refetchStats } = useAdminStats(tenantId || undefined);

  const activeClientsCount = clients.filter((c: any) => c.is_active !== false).length;
  const recentActivity: AppNotification[] = (notifPages?.pages?.[0] ?? []).slice(0, 6);

  const today = new Date();
  const todayAppts = appointments.filter((a: Appointment) =>
    new Date(a.start_time).toDateString() === today.toDateString()
  );
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - today.getDay());
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  const weekCount = appointments.filter((a: Appointment) => {
    const d = new Date(a.start_time);
    return d >= weekStart && d <= weekEnd;
  }).length;

  // Client growth trend: new this month vs last month
  const clientTrend = (() => {
    const cur = stats?.newClientsThisMonth ?? 0;
    const prev = stats?.lastMonthNewClients ?? 0;
    if (prev === 0) return cur > 0 ? 100 : 0;
    return Math.round(((cur - prev) / prev) * 100);
  })();

  // Dynamic alerts from real data
  const dynamicAlerts: Array<{ id: string; type: 'warning' | 'info'; text: string; action: string; route?: string }> = [];
  if ((stats?.pendingApprovals ?? 0) > 0) {
    dynamicAlerts.push({
      id: 'pending',
      type: 'info',
      text: `${stats!.pendingApprovals} usuario(s) pendiente(s) de aprobación`,
      action: 'Revisar',
      route: '/(admin)/user-approval',
    });
  }
  if ((stats?.clientsWithoutPlan ?? 0) > 0) {
    dynamicAlerts.push({
      id: 'noplan',
      type: 'warning',
      text: `${stats!.clientsWithoutPlan} cliente(s) sin plan activo`,
      action: 'Ver',
      route: '/(admin)/clients',
    });
  }
  if ((stats?.expiringSubscriptions ?? 0) > 0) {
    dynamicAlerts.push({
      id: 'expiring',
      type: 'warning',
      text: `${stats!.expiringSubscriptions} suscripción(es) vencen en 7 días`,
      action: 'Ver',
      route: '/(admin)/clients',
    });
  }

  const firstName = user?.full_name?.split(' ')[0] ?? 'Admin';

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refetchAppts(), refetchNotifs(), refetchStats()]);
    setRefreshing(false);
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: T.bg }]} edges={['left', 'right']}>
      <StatusBar barStyle="light-content" backgroundColor={T.bg} />
      <AdminTopBar title={tenant?.name ?? 'Mi Centro'} subtitle={`Hola, ${firstName} 👋`} />
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={T.accent} />}
      >
        {/* Dynamic Alerts */}
        {dynamicAlerts.map((alert) => (
          <TouchableOpacity
            key={alert.id}
            onPress={() => alert.route && router.push(alert.route as any)}
            style={[styles.alertCard, {
              backgroundColor: T.card,
              borderColor: alert.type === 'warning' ? T.orange + '44' : T.accent + '44',
            }]}
          >
            <Text style={{ fontSize: 16 }}>{alert.type === 'warning' ? '⚠️' : 'ℹ️'}</Text>
            <Text style={[styles.alertText, { color: alert.type === 'warning' ? T.orange : T.accent }]}>
              {alert.text}
            </Text>
            <Text style={[styles.alertAction, { color: alert.type === 'warning' ? T.orange : T.accent }]}>
              {alert.action} →
            </Text>
          </TouchableOpacity>
        ))}

        {/* KPI Grid */}
        <Text style={[styles.sectionTitle, { color: T.text }]}>Métricas del negocio</Text>
        {isLoadingStats ? (
          <View>
            <View style={styles.kpiRow}>
              <View style={{ flex: 1, height: 80, borderRadius: 12, borderWidth: 1, borderColor: T.border, backgroundColor: T.card }} />
              <View style={{ width: 10 }} />
              <View style={{ flex: 1, height: 80, borderRadius: 12, borderWidth: 1, borderColor: T.border, backgroundColor: T.card }} />
            </View>
            <View style={[styles.kpiRow, { marginTop: 10 }]}>
              <View style={{ flex: 1, height: 80, borderRadius: 12, borderWidth: 1, borderColor: T.border, backgroundColor: T.card }} />
              <View style={{ width: 10 }} />
              <View style={{ flex: 1, height: 80, borderRadius: 12, borderWidth: 1, borderColor: T.border, backgroundColor: T.card }} />
            </View>
          </View>
        ) : (
          <View>
            <View style={styles.kpiRow}>
              <AdminStatCard
                label="Clientes activos"
                value={activeClientsCount}
                icon="👥"
                accent={T.accent}
                trend={clientTrend !== 0 ? { value: Math.abs(clientTrend), label: clientTrend >= 0 ? 'más este mes' : 'menos este mes' } : undefined}
                onPress={() => router.push('/(admin)/clients')}
              />
              <View style={{ width: 10 }} />
              <AdminStatCard
                label="Citas hoy"
                value={todayAppts.length}
                sub={`${weekCount} esta semana`}
                icon="📅"
                accent={T.green}
                onPress={() => router.push('/(admin)/admin-appointments')}
              />
            </View>
            <View style={[styles.kpiRow, { marginTop: 10 }]}>
              <AdminStatCard
                label="Ingresos mensuales"
                value={formatRevenue(stats?.monthlyRevenue ?? 0)}
                icon="💰"
                accent={T.orange}
                sub="suscripciones activas"
                onPress={() => router.push('/(admin)/revenue')}
              />
              <View style={{ width: 10 }} />
              <AdminStatCard
                label="Planes activos"
                value={stats?.activePlans ?? 0}
                sub={`${stats?.activePromotions ?? 0} promos activas`}
                icon="💳"
                accent={T.purple}
                onPress={() => router.push('/(admin)/monetization')}
              />
            </View>
          </View>
        )}

        {/* Quick actions */}
        <Text style={[styles.sectionTitle, { color: T.text }]}>Acciones rápidas</Text>
        <View style={styles.quickGrid}>
          {[
            { icon: '👤', label: 'Clientes', route: '/(admin)/clients', color: T.accent },
            { icon: '🏋️', label: 'Coaches', route: '/(admin)/coaches', color: T.teal },
            { icon: '📅', label: 'Nueva cita', route: '/(admin)/admin-appointments', color: T.green },
            { icon: '💳', label: 'Planes', route: '/(admin)/monetization', color: T.purple },
            { icon: '🏷️', label: 'Promos', route: '/(admin)/monetization', color: T.orange },
            { icon: '🎬', label: 'Contenido', route: '/(admin)/content', color: T.red },
          ].map((a) => (
            <TouchableOpacity
              key={a.label}
              onPress={() => router.push(a.route as any)}
              style={[styles.quickBtn, { backgroundColor: T.card, borderColor: a.color + '33' }]}
            >
              <View style={[styles.quickIcon, { backgroundColor: a.color + '20' }]}>
                <Text style={{ fontSize: 20 }}>{a.icon}</Text>
              </View>
              <Text style={[styles.quickLabel, { color: T.textSecondary }]}>{a.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Today's appointments */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: T.text, marginTop: 0, marginBottom: 0 }]}>Citas de hoy</Text>
          <TouchableOpacity onPress={() => router.push('/(admin)/admin-appointments')}>
            <Text style={[styles.seeAll, { color: T.accent }]}>Ver todas →</Text>
          </TouchableOpacity>
        </View>
        {isLoadingAppts ? (
          <View style={[styles.emptyCard, { backgroundColor: T.card, borderColor: T.border, height: 80 }]} />
        ) : todayAppts.length === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: T.card, borderColor: T.border, gap: 8 }]}>
            <Text style={{ fontSize: 24 }}>📅</Text>
            <Text style={[styles.emptyText, { color: T.textSecondary }]}>No hay citas programadas para hoy</Text>
            <TouchableOpacity
              onPress={() => router.push('/(admin)/admin-appointments')}
              style={{ paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8, backgroundColor: T.accent + '22', borderWidth: 1, borderColor: T.accent + '44' }}
            >
              <Text style={{ color: T.accent, fontSize: 13, fontWeight: '600' }}>Agendar cita →</Text>
            </TouchableOpacity>
          </View>
        ) : (
          todayAppts.map((apt: Appointment) => (
            <TouchableOpacity
              key={apt.id}
              onPress={() => router.push(`/(admin)/appointment/${apt.id}` as any)}
              style={[styles.aptCard, { backgroundColor: T.card, borderColor: T.border }]}
            >
              <View style={[styles.aptTime, { backgroundColor: T.accent + '22' }]}>
                <Text style={[styles.aptTimeText, { color: T.accent }]}>{formatTime(apt.start_time)}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.aptTitle, { color: T.text }]}>{apt.title}</Text>
                <Text style={[styles.aptClient, { color: T.textSecondary }]}>
                  {apt.client_name ?? '—'}{apt.coach_name ? ` · ${apt.coach_name}` : ''}
                </Text>
              </View>
              <StatusBadge status={apt.status} size="sm" />
            </TouchableOpacity>
          ))
        )}

        {/* Recent activity */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: T.text, marginTop: 0, marginBottom: 0 }]}>Actividad reciente</Text>
          <TouchableOpacity onPress={() => router.push('/(admin)/notifications')}>
            <Text style={[styles.seeAll, { color: T.accent }]}>Ver todas →</Text>
          </TouchableOpacity>
        </View>
        <View style={[styles.activityCard, { backgroundColor: T.card, borderColor: T.border }]}>
          {recentActivity.length === 0 ? (
            <View style={{ padding: 20, alignItems: 'center' }}>
              <Text style={{ color: T.textMuted, fontSize: 14 }}>Sin actividad reciente</Text>
            </View>
          ) : (
            recentActivity.map((item, i) => {
              const color = NOTIF_COLOR[item.type] ?? T.accent;
              return (
                <View
                  key={item.id}
                  style={[
                    styles.activityRow,
                    i < recentActivity.length - 1 && [styles.activityDivider, { borderBottomColor: T.border }],
                  ]}
                >
                  <View style={[styles.activityIcon, { backgroundColor: color + '20' }]}>
                    <Text style={{ fontSize: 14 }}>{NOTIF_ICON[item.type] ?? '🔔'}</Text>
                  </View>
                  <Text style={[styles.activityText, { color: T.textSecondary }]} numberOfLines={1}>
                    {item.message}
                  </Text>
                  <Text style={[styles.activityTime, { color: T.textMuted }]}>
                    {formatRelativeTime(item.created_at)}
                  </Text>
                </View>
              );
            })
          )}
        </View>

        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { paddingBottom: 16 },
  alertCard: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderRadius: 14, borderWidth: 1,
    marginHorizontal: 16, marginBottom: 8, padding: 12, marginTop: 12,
  },
  alertText: { flex: 1, fontSize: 13, fontWeight: '500' },
  alertAction: { fontSize: 12, fontWeight: '700' },
  sectionTitle: { fontSize: 15, fontWeight: '700', paddingHorizontal: 16, marginTop: 20, marginBottom: 12 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, marginTop: 20, marginBottom: 12 },
  seeAll: { fontSize: 13, fontWeight: '600' },
  kpiRow: { flexDirection: 'row', paddingHorizontal: 16 },
  quickGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 12, gap: 8 },
  quickBtn: { width: '30%', borderRadius: 14, borderWidth: 1, padding: 12, alignItems: 'center', gap: 6 },
  quickIcon: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  quickLabel: { fontSize: 11, fontWeight: '600', textAlign: 'center' },
  aptCard: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 14, borderWidth: 1, marginHorizontal: 16, marginBottom: 8, padding: 12 },
  aptTime: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, minWidth: 56, alignItems: 'center' },
  aptTimeText: { fontSize: 13, fontWeight: '800' },
  aptTitle: { fontSize: 14, fontWeight: '700' },
  aptClient: { fontSize: 12, marginTop: 1 },
  emptyCard: { borderRadius: 14, borderWidth: 1, marginHorizontal: 16, padding: 20, alignItems: 'center' },
  emptyText: { fontSize: 14 },
  activityCard: { borderRadius: 14, borderWidth: 1, marginHorizontal: 16, overflow: 'hidden' },
  activityRow: { flexDirection: 'row', alignItems: 'center', padding: 12, gap: 10 },
  activityDivider: { borderBottomWidth: 1 },
  activityIcon: { width: 32, height: 32, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  activityText: { flex: 1, fontSize: 13 },
  activityTime: { fontSize: 11 },
});
