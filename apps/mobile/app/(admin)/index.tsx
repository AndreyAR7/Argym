import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, StatusBar, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { AdminTheme as AdminT } from '@/constants/adminTheme';
import { AdminStatCard } from '@/components/admin/AdminStatCard';
import { AdminListCard } from '@/components/admin/AdminListCard';
import { StatusBadge } from '@/components/admin/StatusBadge';
import { AdminTopBar } from '@/components/admin/AdminTopBar';
import { useAuthStore } from '@/store/auth.store';
import { useTenantStore } from '@/store/tenant.store';
import { useTheme } from '@/hooks/useTheme';
import { ADMIN_KPI, ADMIN_RECENT_ACTIVITY, ADMIN_ALERTS, MOCK_APPOINTMENTS } from '@/data/adminMock';
function formatCurrency(amount: number, currency: string) {
  return `${currency} ${amount.toLocaleString('es-CR')}`;
}

function formatTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString('es-CR', { hour: '2-digit', minute: '2-digit' });
}

export default function AdminDashboard() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { tenant } = useTenantStore();
  const T = useTheme(); // ← reactive theme
  const [refreshing, setRefreshing] = useState(false);

  const firstName = user?.full_name?.split(' ')[0] ?? 'Admin';
  const todayAppts = MOCK_APPOINTMENTS.filter((a) => {
    const d = new Date(a.start_time);
    const today = new Date();
    return d.toDateString() === today.toDateString();
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await new Promise((r) => setTimeout(r, 800));
    setRefreshing(false);
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: T.bg }]} edges={['left', 'right']}>
      <StatusBar barStyle="light-content" backgroundColor={T.bg} />
      <AdminTopBar
        title={tenant?.name ?? 'Centro Demo'}
        subtitle={`Hola, ${firstName} 👋`}
      />
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={T.accent} />}
      >
        {/* ✅ GLOBAL THEMING WORKING */}
        <View style={[styles.markerBanner, { backgroundColor: T.accent }]}>
          <Text style={styles.markerText}>✅ GLOBAL THEMING WORKING · Tema: {T.id ?? 'activo'}</Text>
        </View>

        {/* Alerts */}
        {ADMIN_ALERTS.map((alert) => (
          <TouchableOpacity key={alert.id} style={[styles.alertCard, {
            backgroundColor: T.card,
            borderColor: alert.type === 'warning' ? AdminT.orange + '44' : T.accent + '44',
          }]}>
            <Text style={{ fontSize: 16 }}>{alert.type === 'warning' ? '⚠️' : 'ℹ️'}</Text>
            <Text style={[styles.alertText, { color: alert.type === 'warning' ? AdminT.orange : T.accent }]}>{alert.text}</Text>
            <Text style={[styles.alertAction, { color: alert.type === 'warning' ? AdminT.orange : T.accent }]}>{alert.action} →</Text>
          </TouchableOpacity>
        ))}

        {/* KPI Grid */}
        <Text style={[styles.sectionTitle, { color: T.text }]}>Métricas del negocio</Text>
        <View style={styles.kpiRow}>
          <AdminStatCard label="Clientes activos" value={ADMIN_KPI.activeClients} icon="👥" accent={T.accent} trend={{ value: 14, label: 'este mes' }} onPress={() => router.push('/(admin)/clients')} />
          <View style={{ width: 10 }} />
          <AdminStatCard label="Citas hoy" value={ADMIN_KPI.appointmentsToday} sub={`${ADMIN_KPI.appointmentsWeek} esta semana`} icon="📅" accent={AdminT.green} onPress={() => router.push('/(admin)/appointments')} />
        </View>
        <View style={[styles.kpiRow, { marginTop: 10 }]}>
          <AdminStatCard label="Revenue mensual" value={`₡${(ADMIN_KPI.monthlyRevenue / 1000).toFixed(0)}K`} icon="💰" accent={AdminT.orange} trend={{ value: 8, label: 'vs mes anterior' }} />
          <View style={{ width: 10 }} />
          <AdminStatCard label="Planes activos" value={ADMIN_KPI.activePlans} sub={`${ADMIN_KPI.activePromotions} promos activas`} icon="💳" accent={AdminT.purple} onPress={() => router.push('/(admin)/monetization')} />
        </View>

        {/* Quick actions */}
        <Text style={[styles.sectionTitle, { color: T.text }]}>Acciones rápidas</Text>
        <View style={styles.quickGrid}>
          {[
            { icon: '👤', label: 'Nuevo cliente', route: '/(admin)/clients', color: T.accent },
            { icon: '📅', label: 'Nueva cita', route: '/(admin)/appointments', color: AdminT.green },
            { icon: '💳', label: 'Nuevo plan', route: '/(admin)/monetization', color: AdminT.purple },
            { icon: '🏷️', label: 'Nueva promo', route: '/(admin)/monetization', color: AdminT.orange },
            { icon: '💪', label: 'Nueva rutina', route: '/(admin)/content', color: AdminT.teal },
            { icon: '🎬', label: 'Subir video', route: '/(admin)/content', color: AdminT.red },
          ].map((a) => (
            <TouchableOpacity key={a.label} onPress={() => router.push(a.route as any)} style={[styles.quickBtn, { backgroundColor: T.card, borderColor: a.color + '33' }]}>
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
          <TouchableOpacity onPress={() => router.push('/(admin)/appointments')}>
            <Text style={[styles.seeAll, { color: T.accent }]}>Ver todas →</Text>
          </TouchableOpacity>
        </View>
        {todayAppts.length === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: T.card, borderColor: T.border }]}>
            <Text style={[styles.emptyText, { color: T.textSecondary }]}>No hay citas programadas para hoy</Text>
          </View>
        ) : (
          todayAppts.map((apt) => (
            <View key={apt.id} style={[styles.aptCard, { backgroundColor: T.card, borderColor: T.border }]}>
              <View style={[styles.aptTime, { backgroundColor: T.accent + '22' }]}>
                <Text style={[styles.aptTimeText, { color: T.accent }]}>{formatTime(apt.start_time)}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.aptTitle, { color: T.text }]}>{apt.title}</Text>
                <Text style={[styles.aptClient, { color: T.textSecondary }]}>{apt.client} · {apt.coach}</Text>
              </View>
              <StatusBadge status={apt.status} size="sm" />
            </View>
          ))
        )}

        {/* Recent activity */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: T.text, marginTop: 0, marginBottom: 0 }]}>Actividad reciente</Text>
        </View>
        <View style={[styles.activityCard, { backgroundColor: T.card, borderColor: T.border }]}>
          {ADMIN_RECENT_ACTIVITY.map((item, i) => (
            <View key={item.id} style={[styles.activityRow, i < ADMIN_RECENT_ACTIVITY.length - 1 && [styles.activityDivider, { borderBottomColor: T.border }]]}>
              <View style={[styles.activityIcon, { backgroundColor: item.color + '20' }]}>
                <Text style={{ fontSize: 14 }}>{item.icon}</Text>
              </View>
              <Text style={[styles.activityText, { color: T.textSecondary }]} numberOfLines={1}>{item.text}</Text>
              <Text style={[styles.activityTime, { color: T.textSecondary }]}>{item.time}</Text>
            </View>
          ))}
        </View>

        {/* DEV: Preview client */}
        <TouchableOpacity onPress={() => router.push('/(client)' as any)} style={[styles.devBtn, { backgroundColor: T.card, borderColor: AdminT.purple + '44' }]}>
          <Text style={[styles.devBtnText, { color: AdminT.purple }]}>👁 Preview Vista Cliente (DEV)</Text>
        </TouchableOpacity>

        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 }, // backgroundColor set inline via T.bg
  content: { paddingBottom: 16 },

  markerBanner: { paddingVertical: 8, alignItems: 'center' },
  markerText: { color: '#fff', fontWeight: '900', fontSize: 13, letterSpacing: 1 },

  header: {
    flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between',
    padding: 16, paddingBottom: 8,
  },
  tenantName: { fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  greeting: { fontSize: 22, fontWeight: '800', marginTop: 2 },
  date: { fontSize: 13, marginTop: 2, textTransform: 'capitalize' },
  adminBadge: {
    borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1,
  },
  adminBadgeText: { fontSize: 11, fontWeight: '800', letterSpacing: 1 },

  alertCard: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderRadius: AdminT.radiusMd, borderWidth: 1,
    marginHorizontal: 16, marginBottom: 8, padding: 12,
  },
  alertText: { flex: 1, fontSize: 13, fontWeight: '500' },
  alertAction: { fontSize: 12, fontWeight: '700' },

  sectionTitle: { fontSize: 15, fontWeight: '700', paddingHorizontal: 16, marginTop: 20, marginBottom: 12 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, marginTop: 20, marginBottom: 12 },
  seeAll: { fontSize: 13, fontWeight: '600' },

  kpiRow: { flexDirection: 'row', paddingHorizontal: 16 },

  quickGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 12, gap: 8 },
  quickBtn: {
    width: '30%', borderRadius: AdminT.radiusMd, borderWidth: 1,
    padding: 12, alignItems: 'center', gap: 6,
  },
  quickIcon: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  quickLabel: { fontSize: 11, fontWeight: '600', textAlign: 'center' },

  aptCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderRadius: AdminT.radiusMd, borderWidth: 1,
    marginHorizontal: 16, marginBottom: 8, padding: 12,
  },
  aptTime: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, minWidth: 56, alignItems: 'center' },
  aptTimeText: { fontSize: 13, fontWeight: '800' },
  aptTitle: { fontSize: 14, fontWeight: '700' },
  aptClient: { fontSize: 12, marginTop: 1 },

  emptyCard: {
    borderRadius: AdminT.radiusMd, borderWidth: 1,
    marginHorizontal: 16, padding: 20, alignItems: 'center',
  },
  emptyText: { fontSize: 14 },

  activityCard: {
    borderRadius: AdminT.radiusMd, borderWidth: 1,
    marginHorizontal: 16, overflow: 'hidden',
  },
  activityRow: { flexDirection: 'row', alignItems: 'center', padding: 12, gap: 10 },
  activityDivider: { borderBottomWidth: 1 },
  activityIcon: { width: 32, height: 32, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  activityText: { flex: 1, fontSize: 13 },
  activityTime: { fontSize: 11 },

  devBtn: {
    borderRadius: AdminT.radiusMd, borderWidth: 1,
    marginHorizontal: 16, marginTop: 20, padding: 14, alignItems: 'center',
  },
  devBtnText: { fontWeight: '700', fontSize: 13 },
});
