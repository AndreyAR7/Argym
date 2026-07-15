import React, { useState } from 'react';
import {
  View, Text, ScrollView, RefreshControl, TouchableOpacity, StyleSheet, StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/store/auth.store';
import { useTheme } from '@/hooks/useTheme';
import { useAppointmentsCoach } from '@/hooks/useAppointments';
import { SkeletonCard } from '@/components/shared/SkeletonLoader';
import { StatusBadge } from '@/components/admin/StatusBadge';
import type { Appointment } from '@/types/appointments';

type TFunc = ReturnType<typeof useTranslation>['t'];

function formatTime(iso: string, t: TFunc) {
  const d = new Date(iso);
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  const isToday = d.toDateString() === today.toDateString();
  const isTomorrow = d.toDateString() === tomorrow.toDateString();
  const time = d.toLocaleTimeString('es-CR', { hour: '2-digit', minute: '2-digit' });
  const day = isToday ? t('coach.dashboard.today') : isTomorrow ? t('coach.dashboard.tomorrow') : d.toLocaleDateString('es-CR', { weekday: 'short', day: 'numeric', month: 'short' });
  return `${day} · ${time}`;
}

function getGreeting(t: TFunc) {
  const h = new Date().getHours();
  if (h < 12) return t('coach.dashboard.greeting.morning');
  if (h < 18) return t('coach.dashboard.greeting.afternoon');
  return t('coach.dashboard.greeting.evening');
}

export default function CoachDashboard() {
  const { t } = useTranslation();
  const router = useRouter();
  const { user } = useAuthStore();
  const T = useTheme();
  const [refreshing, setRefreshing] = useState(false);

  const { data: appointments = [], isLoading, refetch } = useAppointmentsCoach(user?.id);

  const today = new Date();
  const upcoming = appointments
    .filter((a: Appointment) =>
      (a.status === 'scheduled' || a.status === 'confirmed') &&
      new Date(a.start_time) >= today
    )
    .sort((a: Appointment, b: Appointment) =>
      new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
    )
    .slice(0, 5);

  const todayCount = appointments.filter((a: Appointment) =>
    new Date(a.start_time).toDateString() === today.toDateString()
  ).length;

  const completedCount = appointments.filter((a: Appointment) => a.status === 'completed').length;

  // Unique clients from appointments
  const uniqueClients = new Set(appointments.map((a: Appointment) => a.client_id)).size;

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const firstName = user?.full_name?.split(' ')[0] ?? t('coach.dashboard.defaultName');

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: T.bg }]} edges={['left', 'right']}>
      <StatusBar barStyle="light-content" backgroundColor={T.bg} />
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={T.accent} />}
      >
        {/* Header */}
        <View style={{ marginBottom: 24 }}>
          <Text style={{ fontSize: 14, color: T.textSecondary, fontWeight: '500' }}>{getGreeting(t)},</Text>
          <Text style={{ fontSize: 26, fontWeight: '800', color: T.text }}>{firstName} 👋</Text>
          <Text style={{ fontSize: 13, color: T.textMuted, marginTop: 2 }}>{t('dashboard.coach.title')}</Text>
        </View>

        {/* Metrics */}
        <View style={{ flexDirection: 'row', gap: 10, marginBottom: 10 }}>
          <MetricCard
            label={t('coach.dashboard.metrics.todayAppointments')} value={isLoading ? '—' : String(todayCount)}
            color={T.accent} bg={T.bgCard} border={T.border} text={T.text} muted={T.textSecondary}
          />
          <MetricCard
            label={t('coach.dashboard.metrics.upcoming')} value={isLoading ? '—' : String(upcoming.length)}
            color={T.green} bg={T.bgCard} border={T.border} text={T.text} muted={T.textSecondary}
          />
        </View>
        <View style={{ flexDirection: 'row', gap: 10, marginBottom: 24 }}>
          <MetricCard
            label={t('coach.dashboard.metrics.completed')} value={isLoading ? '—' : String(completedCount)}
            color={T.blue} bg={T.bgCard} border={T.border} text={T.text} muted={T.textSecondary}
          />
          <MetricCard
            label={t('coach.dashboard.metrics.clients')} value={isLoading ? '—' : String(uniqueClients)}
            color={T.orange} bg={T.bgCard} border={T.border} text={T.text} muted={T.textSecondary}
          />
        </View>

        {/* Upcoming appointments */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <Text style={{ fontSize: 16, fontWeight: '700', color: T.text }}>{t('dashboard.coach.upcomingAppointments')}</Text>
          <TouchableOpacity onPress={() => router.push('/(coach)/coach-appointments')}>
            <Text style={{ fontSize: 13, fontWeight: '600', color: T.accent }}>{t('coach.dashboard.seeAll')}</Text>
          </TouchableOpacity>
        </View>

        {isLoading ? (
          <>
            <SkeletonCard lines={2} />
            <SkeletonCard lines={2} />
          </>
        ) : upcoming.length === 0 ? (
          <View style={[s.emptyCard, { backgroundColor: T.bgCard, borderColor: T.border }]}>
            <Text style={{ color: T.textMuted, fontSize: 14 }}>{t('coach.dashboard.noUpcomingAppointments')}</Text>
          </View>
        ) : (
          <View style={[s.listCard, { backgroundColor: T.bgCard, borderColor: T.border }]}>
            {upcoming.map((apt: Appointment, i: number) => (
              <View
                key={apt.id}
                style={[
                  s.aptRow,
                  i < upcoming.length - 1 && { borderBottomWidth: 1, borderBottomColor: T.border },
                ]}
              >
                <View style={[s.timeChip, { backgroundColor: T.accent + '20' }]}>
                  <Text style={{ color: T.accent, fontSize: 11, fontWeight: '700' }}>
                    {formatTime(apt.start_time, t)}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: T.text, fontSize: 14, fontWeight: '600' }} numberOfLines={1}>
                    {apt.title}
                  </Text>
                  <Text style={{ color: T.textSecondary, fontSize: 12, marginTop: 1 }}>
                    {apt.client_name ?? t('coach.dashboard.defaultClientName')}
                    {apt.appointment_type === 'virtual' ? ` · 📹 ${t('coach.dashboard.virtual')}` : apt.location ? ` · 📍 ${apt.location}` : ''}
                  </Text>
                </View>
                <StatusBadge status={apt.status} size="sm" />
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function MetricCard({ label, value, color, bg, border, text, muted }: {
  label: string; value: string; color: string;
  bg: string; border: string; text: string; muted: string;
}) {
  return (
    <View style={{
      flex: 1, backgroundColor: bg, borderRadius: 12, borderWidth: 1,
      borderColor: border, borderLeftWidth: 4, borderLeftColor: color, padding: 14,
    }}>
      <Text style={{ fontSize: 12, color: muted, marginBottom: 4 }}>{label}</Text>
      <Text style={{ fontSize: 28, fontWeight: '800', color: text }}>{value}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1 },
  emptyCard: { borderRadius: 12, borderWidth: 1, padding: 20, alignItems: 'center' },
  listCard: { borderRadius: 12, borderWidth: 1, overflow: 'hidden' },
  aptRow: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12 },
  timeChip: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4, minWidth: 80, alignItems: 'center' },
});
