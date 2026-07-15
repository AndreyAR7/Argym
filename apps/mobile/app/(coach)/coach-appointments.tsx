import React from 'react';
import { View, Text, FlatList, StyleSheet, StatusBar, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/hooks/useTheme';
import { useAuthStore } from '@/store/auth.store';
import { useAppointmentsCoach } from '@/hooks/useAppointments';
import { SkeletonCard } from '@/components/shared/SkeletonLoader';
import { StatusBadge } from '@/components/admin/StatusBadge';
import type { Appointment } from '@/types/appointments';

function formatDateTime(iso: string, t: (key: string) => string) {
  const d = new Date(iso);
  const today = new Date();
  const isToday = d.toDateString() === today.toDateString();
  const time = d.toLocaleTimeString('es-CR', { hour: '2-digit', minute: '2-digit' });
  const date = isToday ? t('coach.appointments.today') : d.toLocaleDateString('es-CR', { weekday: 'short', day: 'numeric', month: 'short' });
  return `${date} · ${time}`;
}

export default function CoachAppointments() {
  const T = useTheme();
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const { data: appointments = [], isLoading, error, refetch } = useAppointmentsCoach(user?.id);

  const upcoming = appointments.filter((a: Appointment) =>
    a.status === 'scheduled' || a.status === 'confirmed' || new Date(a.start_time) >= new Date()
  );

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: T.bg }]} edges={['left', 'right']}>
      <StatusBar barStyle="light-content" backgroundColor={T.bg} />

      {/* Header */}
      <View style={[s.header, { borderBottomColor: T.border }]}>
        <Text style={[s.title, { color: T.text }]}>{t('coach.appointments.title')}</Text>
        {!isLoading && !error && (
          <Text style={[s.subtitle, { color: T.textMuted }]}>
            {t('coach.appointments.scheduledCount', { count: upcoming.length })}
          </Text>
        )}
      </View>

      {isLoading ? (
        <View style={{ padding: 16 }}>
          <SkeletonCard lines={2} />
          <SkeletonCard lines={2} />
        </View>
      ) : error ? (
        <View style={s.center}>
          <Text style={{ color: T.red, fontSize: 14, textAlign: 'center', marginBottom: 12 }}>
            {t('coach.appointments.loadError')}
          </Text>
          <TouchableOpacity onPress={() => refetch()}>
            <Text style={{ color: T.accent, fontWeight: '700' }}>{t('common.retry')}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={appointments}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16 }}
          ListEmptyComponent={
            <View style={s.center}>
              <Text style={{ fontSize: 40, marginBottom: 12 }}>📅</Text>
              <Text style={{ color: T.textMuted, fontSize: 15 }}>{t('coach.appointments.emptyState')}</Text>
            </View>
          }
          renderItem={({ item }: { item: Appointment }) => (
            <View style={[s.card, { backgroundColor: T.bgCard, borderColor: T.border, borderRadius: T.radiusMd }]}>
              <View style={[s.icon, { backgroundColor: T.greenSoft }]}>
                <Text style={{ fontSize: 18 }}>📅</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[s.aptTitle, { color: T.text }]}>{item.title}</Text>
                <Text style={[s.aptMeta, { color: T.textSecondary }]}>
                  {item.client_name ?? t('coach.appointments.defaultClientName')}
                </Text>
                <Text style={[s.aptTime, { color: T.textMuted }]}>{formatDateTime(item.start_time, t)}</Text>
              </View>
              <StatusBadge status={item.status} size="sm" />
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1 },
  header: { paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth },
  title: { fontSize: 22, fontWeight: '800' },
  subtitle: { fontSize: 13, marginTop: 2 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  card: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, padding: 14, marginBottom: 8 },
  icon: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  aptTitle: { fontSize: 15, fontWeight: '700' },
  aptMeta: { fontSize: 12, marginTop: 2 },
  aptTime: { fontSize: 11, marginTop: 2 },
});
