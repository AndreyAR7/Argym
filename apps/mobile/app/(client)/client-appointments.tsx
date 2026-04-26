import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, FlatList, StyleSheet, StatusBar,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as ScreenOrientation from 'expo-screen-orientation';
import { useTheme } from '@/hooks/useTheme';
import { ClientTopBar } from '@/components/client/ClientTopBar';
import { AppointmentCard } from '@/components/client/AppointmentCard';
import { EmptyState } from '@/components/client/EmptyState';
import { SkeletonCard } from '@/components/shared/SkeletonLoader';
import { CalendarDayView } from '@/components/admin/CalendarDayView';
import { useAuthStore } from '@/store/auth.store';
import { useAppointmentsClient } from '@/hooks/useAppointments';
import type { Appointment } from '@/types/appointments';

// ── Date strip ────────────────────────────────────────────────
function DateStrip({ selected, onChange, T }: { selected: Date; onChange: (d: Date) => void; T: any }) {
  const days = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() + i - 3); return d;
  });
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 0 }}>
      {days.map((d, i) => {
        const active = d.toDateString() === selected.toDateString();
        const isToday = d.toDateString() === new Date().toDateString();
        return (
          <TouchableOpacity
            key={i}
            onPress={() => onChange(new Date(d))}
            style={[styles.dayBtn, {
              backgroundColor: active ? T.accent : T.bgCard,
              borderColor: active ? T.accent : isToday ? T.accent + '66' : T.border,
            }]}
          >
            <Text style={{ fontSize: 9, color: active ? '#fff' : T.textMuted, fontWeight: '600' }}>
              {d.toLocaleDateString('es-CR', { weekday: 'short' }).toUpperCase()}
            </Text>
            <Text style={{ fontSize: 16, fontWeight: '800', color: active ? '#fff' : T.text }}>
              {d.getDate()}
            </Text>
            {isToday && !active && (
              <View style={[styles.todayDot, { backgroundColor: T.accent }]} />
            )}
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

export default function ClientAppointments() {
  const T = useTheme();
  const router = useRouter();
  const { user } = useAuthStore();
  const { data: appointments = [], isLoading, error, refetch } = useAppointmentsClient(user?.id);
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;

  const today = new Date();
  const todayStr = today.toDateString();
  const cutoff5Days = new Date(today.getTime() - 5 * 24 * 60 * 60 * 1000);

  // Hide appointments older than 5 days
  const visible = appointments.filter((a: Appointment) => new Date(a.start_time) >= cutoff5Days);

  type AptItem =
    | { _type: 'header'; id: string; label: string }
    | { _type: 'apt'; id: string; apt: Appointment };

  const sectionedList: AptItem[] = React.useMemo(() => {
    const past = visible.filter((a: Appointment) => {
      const d = new Date(a.start_time);
      return d < today && d.toDateString() !== todayStr;
    }).sort((a: Appointment, b: Appointment) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime());

    const todayApts = visible.filter((a: Appointment) =>
      new Date(a.start_time).toDateString() === todayStr
    ).sort((a: Appointment, b: Appointment) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());

    const upcoming = visible.filter((a: Appointment) => {
      const d = new Date(a.start_time);
      return d > today && d.toDateString() !== todayStr;
    }).sort((a: Appointment, b: Appointment) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());

    const items: AptItem[] = [];
    if (past.length > 0) {
      items.push({ _type: 'header', id: 'h-past', label: 'Pasadas' });
      past.forEach((a: Appointment) => items.push({ _type: 'apt', id: a.id, apt: a }));
    }
    if (todayApts.length > 0) {
      items.push({ _type: 'header', id: 'h-today', label: 'Hoy' });
      todayApts.forEach((a: Appointment) => items.push({ _type: 'apt', id: a.id, apt: a }));
    }
    if (upcoming.length > 0) {
      items.push({ _type: 'header', id: 'h-upcoming', label: 'Programadas' });
      upcoming.forEach((a: Appointment) => items.push({ _type: 'apt', id: a.id, apt: a }));
    }
    return items;
  }, [visible]);

  const paginatedList = sectionedList.slice(0, page * PAGE_SIZE);
  const hasMore = paginatedList.length < sectionedList.length;

  // Allow landscape when calendar is active
  useEffect(() => {
    if (viewMode === 'calendar') {
      ScreenOrientation.unlockAsync();
    } else {
      ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
    }
    return () => {
      ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
    };
  }, [viewMode]);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: T.bg }]} edges={['left', 'right']}>
      <StatusBar barStyle="light-content" backgroundColor={T.bg} />
      <ClientTopBar title="Mis Citas" />

      {/* View toggle */}
      <View style={[styles.toggleRow, { borderBottomColor: T.border }]}>
        <TouchableOpacity
          onPress={() => setViewMode('list')}
          style={[styles.toggleBtn, {
            backgroundColor: viewMode === 'list' ? T.accent : T.bgCard,
            borderColor: viewMode === 'list' ? T.accent : T.border,
          }]}
        >
          <Text style={{ fontSize: 12, fontWeight: '700', color: viewMode === 'list' ? '#fff' : T.textSecondary }}>
            ☰ Lista
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setViewMode('calendar')}
          style={[styles.toggleBtn, {
            backgroundColor: viewMode === 'calendar' ? T.accent : T.bgCard,
            borderColor: viewMode === 'calendar' ? T.accent : T.border,
          }]}
        >
          <Text style={{ fontSize: 12, fontWeight: '700', color: viewMode === 'calendar' ? '#fff' : T.textSecondary }}>
            📅 Calendario
          </Text>
        </TouchableOpacity>
      </View>

      {/* Calendar date strip */}
      {viewMode === 'calendar' && (
        <View style={[styles.dateStripWrapper, { borderBottomColor: T.border }]}>
          <Text style={{ color: T.text, fontSize: 12, fontWeight: '700', marginBottom: 8, textTransform: 'capitalize' }}>
            {calendarDate.toLocaleDateString('es-CR', { weekday: 'long', day: 'numeric', month: 'long' })}
          </Text>
          <DateStrip selected={calendarDate} onChange={setCalendarDate} T={T} />
        </View>
      )}

      {/* Content */}
      {viewMode === 'calendar' ? (
        <View style={{ flex: 1 }}>
          <CalendarDayView
            appointments={appointments}
            selectedDate={calendarDate}
            onEventPress={(apt) => router.push(`/(client)/appointment/${apt.id}` as any)}
          />
        </View>
      ) : isLoading ? (
        <View style={{ padding: 16 }}>
          <SkeletonCard lines={2} />
          <SkeletonCard lines={2} />
        </View>
      ) : error ? (
        <View style={{ alignItems: 'center', paddingVertical: 40 }}>
          <Text style={{ color: T.red, fontSize: 14, textAlign: 'center', marginBottom: 12 }}>
            No se pudieron cargar las citas.
          </Text>
          <TouchableOpacity onPress={() => refetch()}>
            <Text style={{ color: T.accent, fontWeight: '700' }}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={paginatedList}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          onRefresh={refetch}
          refreshing={false}
          ListEmptyComponent={
            <EmptyState
              icon="📅"
              title="Sin citas programadas"
              description="Tu coach programará tu próxima sesión pronto."
            />
          }
          ListFooterComponent={
            hasMore ? (
              <TouchableOpacity
                onPress={() => setPage((p) => p + 1)}
                style={[styles.loadMoreBtn, { borderColor: T.border }]}
              >
                <Text style={{ color: T.accent, fontWeight: '700', fontSize: 13 }}>Cargar más</Text>
              </TouchableOpacity>
            ) : null
          }
          renderItem={({ item }) => {
            if (item._type === 'header') {
              return (
                <View style={[styles.sectionHeader, { borderBottomColor: T.border }]}>
                  <Text style={[styles.sectionLabel, { color: T.textMuted }]}>{item.label}</Text>
                </View>
              );
            }
            const apt = item.apt;
            return (
              <View style={{ marginBottom: 10 }}>
                <AppointmentCard
                  appointment={{
                    title: apt.title,
                    coach_name: apt.coach_name ?? 'Coach',
                    start_time: apt.start_time,
                    location: apt.location ?? undefined,
                    meeting_url: apt.meeting_url ?? undefined,
                    appointment_type: apt.appointment_type ?? 'in_person',
                    notes: apt.notes ?? undefined,
                    status: apt.status,
                  }}
                  onPress={() => router.push(`/(client)/appointment/${apt.id}` as any)}
                />
              </View>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  toggleRow: {
    flexDirection: 'row', gap: 8, paddingHorizontal: 16,
    paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth,
  },
  toggleBtn: {
    flex: 1, borderRadius: 10, borderWidth: 1,
    paddingVertical: 8, alignItems: 'center',
  },
  dateStripWrapper: {
    paddingHorizontal: 16, paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  dayBtn: {
    width: 44, height: 56, borderRadius: 10, borderWidth: 1,
    marginRight: 8, alignItems: 'center', justifyContent: 'center', gap: 2,
  },
  todayDot: { width: 4, height: 4, borderRadius: 2, marginTop: 2 },
  listContent: { padding: 16, paddingBottom: 40 },
  sectionHeader: { paddingVertical: 8, marginBottom: 4, marginTop: 8, borderBottomWidth: StyleSheet.hairlineWidth },
  sectionLabel: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.6 },
  loadMoreBtn: { borderWidth: 1, borderRadius: 12, paddingVertical: 12, alignItems: 'center', marginTop: 8, marginBottom: 16 },
});
