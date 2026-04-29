import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, FlatList, StyleSheet, StatusBar, TouchableOpacity,
  Modal, TextInput, ActivityIndicator, Alert, ScrollView, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as ScreenOrientation from 'expo-screen-orientation';
import { useTheme } from '@/hooks/useTheme';
import { AdminTopBar } from '@/components/admin/AdminTopBar';
import { StatusBadge } from '@/components/admin/StatusBadge';
import { SkeletonCard } from '@/components/shared/SkeletonLoader';
import { useAppointmentsAdmin, useCreateAppointment, APPOINTMENTS_KEYS } from '@/hooks/useAppointments';
import { useAuthStore } from '@/store/auth.store';
import { useClientSelectionStore } from '@/store/clientSelection.store';
import { useCoaches } from '@/hooks/useProfiles';
import { createNotifications } from '@/services/notifications.service';
import { checkAppointmentConflicts, createGroupAppointment, createIndividualAppointments, cancelExpiredAppointments } from '@/services/appointments.service';
import { ToastManager } from '@/components/shared/Toast';
import { useQueryClient } from '@tanstack/react-query';
import { NOTIF_KEYS } from '@/hooks/useNotifications';
import { CalendarDayView } from '@/components/admin/CalendarDayView';
import { formatAppointmentDateTime } from '@/lib/timeUtils';
import type { Appointment } from '@/types/appointments';

// ─── Constants ────────────────────────────────────────────────
const FILTERS = ['Todas', 'Hoy', 'Programadas', 'Completadas', 'Canceladas'];
const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
const MINUTES = ['00', '15', '30', '45'];
const DURATIONS = [
  { label: '30 min', minutes: 30 },
  { label: '45 min', minutes: 45 },
  { label: '1 hora', minutes: 60 },
  { label: '1h 30', minutes: 90 },
  { label: '2 horas', minutes: 120 },
  { label: '3 horas', minutes: 180 },
  { label: '4 horas', minutes: 240 },
  { label: '5 horas', minutes: 300 },
];

// ─── Helpers ──────────────────────────────────────────────────
const formatDateTime = formatAppointmentDateTime;

function formatDateLabel(d: Date) {
  return d.toLocaleDateString('es-CR', { weekday: 'long', day: 'numeric', month: 'long' });
}

function buildStartISO(date: Date, hour: string, minute: string) {
  const d = new Date(date);
  d.setHours(parseInt(hour, 10), parseInt(minute, 10), 0, 0);
  return d.toISOString();
}

function buildEndISO(startISO: string, durationMinutes: number) {
  const d = new Date(startISO);
  d.setMinutes(d.getMinutes() + durationMinutes);
  return d.toISOString();
}

// ─── Date strip (14 days) ─────────────────────────────────────
function DateStrip({ selected, onChange, T }: { selected: Date; onChange: (d: Date) => void; T: any }) {
  const days = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() + i); return d;
  });
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
      {days.map((d, i) => {
        const active = d.toDateString() === selected.toDateString();
        return (
          <TouchableOpacity key={i} onPress={() => onChange(d)}
            style={[st.dayBtn, { backgroundColor: active ? T.accent : T.bgCardElevated, borderColor: active ? T.accent : T.border }]}>
            <Text style={{ fontSize: 10, color: active ? '#fff' : T.textMuted, fontWeight: '600' }}>
              {d.toLocaleDateString('es-CR', { weekday: 'short' }).toUpperCase()}
            </Text>
            <Text style={{ fontSize: 16, fontWeight: '800', color: active ? '#fff' : T.text }}>{d.getDate()}</Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

// ─── Hour picker ──────────────────────────────────────────────
function HourPicker({ hour, minute, onHour, onMinute, T }: {
  hour: string; minute: string; onHour: (h: string) => void; onMinute: (m: string) => void; T: any;
}) {
  return (
    <View style={{ gap: 8 }}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {HOURS.map((h) => {
          const active = h === hour;
          return (
            <TouchableOpacity key={h} onPress={() => onHour(h)}
              style={[st.timeBtn, { backgroundColor: active ? T.accent : T.bgCardElevated, borderColor: active ? T.accent : T.border }]}>
              <Text style={{ fontSize: 14, fontWeight: '700', color: active ? '#fff' : T.text }}>{h}h</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        {MINUTES.map((m) => {
          const active = m === minute;
          return (
            <TouchableOpacity key={m} onPress={() => onMinute(m)}
              style={[st.timeBtn, { backgroundColor: active ? T.accent : T.bgCardElevated, borderColor: active ? T.accent : T.border, flex: 1 }]}>
              <Text style={{ fontSize: 14, fontWeight: '700', color: active ? '#fff' : T.text }}>:{m}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

// ─── Duration picker ──────────────────────────────────────────
function DurationPicker({ selected, onSelect, T }: { selected: number | null; onSelect: (m: number) => void; T: any }) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      {DURATIONS.map((d) => {
        const active = selected === d.minutes;
        return (
          <TouchableOpacity key={d.minutes} onPress={() => onSelect(d.minutes)}
            style={[st.durationBtn, { backgroundColor: active ? T.accent : T.bgCardElevated, borderColor: active ? T.accent : T.border }]}>
            <Text style={{ fontSize: 13, fontWeight: '700', color: active ? '#fff' : T.text }}>{d.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

// ─── Main screen ─────────────────────────────────────────────
export default function AdminAppointmentsScreen() {
  const T = useTheme();
  const router = useRouter();
  const { user } = useAuthStore();
  const qc = useQueryClient();
  const [filter, setFilter] = useState('Todas');
  const [showCreate, setShowCreate] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [page, setPage] = React.useState(1);

  // Reset page when filter changes
  React.useEffect(() => { setPage(1); }, [filter]);

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

  // Use user.tenant_id from auth store — always available when admin is logged in
  const authTenantId = user?.tenant_id ?? '';

  const { data: appointments = [], isLoading, error, refetch } = useAppointmentsAdmin(authTenantId || undefined);
  const createMutation = useCreateAppointment(authTenantId || undefined);

  useEffect(() => {
    if (!authTenantId || cancelledExpired.current) return;
    cancelledExpired.current = true;
    cancelExpiredAppointments(authTenantId)
      .then(() => refetch())
      .catch(() => {});
  }, [authTenantId]);

  // Client selection via dedicated screen
  const clientStore = useClientSelectionStore();
  const selectedClients = clientStore.selected;

  // Form state
  const [title, setTitle] = useState('');
  const [startDate, setStartDate] = useState(new Date());
  const [startHour, setStartHour] = useState('09');
  const [startMin, setStartMin] = useState('00');
  const [durationMin, setDurationMin] = useState<number | null>(60);
  const [formErrors, setFormErrors] = useState<string[]>([]);
  const [aptType, setAptType] = useState<'in_person' | 'virtual'>('in_person');
  const [location, setLocation] = useState('');
  const [meetingUrl, setMeetingUrl] = useState('');
  const [notes, setNotes] = useState('');
  const [selectedCoachId, setSelectedCoachId] = useState<string | null>(null);
  const [groupMode, setGroupMode] = useState<'individual' | 'group'>('individual');
  const [isCheckingConflicts, setIsCheckingConflicts] = useState(false);
  const cancelledExpired = useRef(false);

  const { data: coaches = [] } = useCoaches();

  const today = new Date();
  const todayStr = today.toDateString();
  const cutoff5Days = new Date(today.getTime() - 5 * 24 * 60 * 60 * 1000);

  // Base filter: hide appointments older than 5 days
  const visibleAppointments = appointments.filter((a: Appointment) => {
    const d = new Date(a.start_time);
    // Always show future and today; hide past > 5 days
    return d >= cutoff5Days;
  });

  const filtered = visibleAppointments.filter((a: Appointment) => {
    if (filter === 'Hoy') return new Date(a.start_time).toDateString() === todayStr;
    if (filter === 'Programadas') return a.status === 'scheduled' || a.status === 'confirmed';
    if (filter === 'Completadas') return a.status === 'completed';
    if (filter === 'Canceladas') return a.status === 'cancelled';
    return true;
  });

  // Sectioned list: Pasadas / Hoy / Programadas
  type AptListItem =
    | { _type: 'header'; id: string; label: string }
    | { _type: 'apt'; id: string; apt: Appointment };

  const sectionedList: AptListItem[] = React.useMemo(() => {
    const past = filtered.filter((a) => {
      const d = new Date(a.start_time);
      return d < today && d.toDateString() !== todayStr;
    }).sort((a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime());

    const todayApts = filtered.filter((a) =>
      new Date(a.start_time).toDateString() === todayStr
    ).sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());

    const upcoming = filtered.filter((a) => {
      const d = new Date(a.start_time);
      return d > today && d.toDateString() !== todayStr;
    }).sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());

    const items: AptListItem[] = [];
    if (past.length > 0) {
      items.push({ _type: 'header', id: 'h-past', label: 'Pasadas' });
      past.forEach((a) => items.push({ _type: 'apt', id: a.id, apt: a }));
    }
    if (todayApts.length > 0) {
      items.push({ _type: 'header', id: 'h-today', label: 'Hoy' });
      todayApts.forEach((a) => items.push({ _type: 'apt', id: a.id, apt: a }));
    }
    if (upcoming.length > 0) {
      items.push({ _type: 'header', id: 'h-upcoming', label: 'Programadas' });
      upcoming.forEach((a) => items.push({ _type: 'apt', id: a.id, apt: a }));
    }
    return items;
  }, [filtered]);

  // Pagination: show 10 items at a time
  const PAGE_SIZE = 10;
  const paginatedList = sectionedList.slice(0, page * PAGE_SIZE);
  const hasMore = paginatedList.length < sectionedList.length;

  const scheduledCount = appointments.filter((a: Appointment) =>
    a.status === 'scheduled' || a.status === 'confirmed'
  ).length;

  const resetForm = () => {
    setTitle('');
    clientStore.clear();
    setStartDate(new Date()); setStartHour('09'); setStartMin('00');
    setDurationMin(60); setFormErrors([]);
    setAptType('in_person'); setLocation(''); setMeetingUrl(''); setNotes('');
    setSelectedCoachId(null);
    setGroupMode('individual');
  };

  const handleCreate = async () => {
    const startISO = buildStartISO(startDate, startHour, startMin);
    const endISO = buildEndISO(startISO, durationMin ?? 60);

    const errors: string[] = [];
    if (!title.trim()) errors.push('Ingresa un título para la cita.');
    if (selectedClients.length === 0) errors.push('Selecciona al menos un cliente.');
    if (!durationMin) errors.push('Selecciona una duración.');
    if (errors.length > 0) { setFormErrors(errors); return; }

    if (!authTenantId) {
      Alert.alert('Error', 'No se pudo determinar el tenant actual.');
      return;
    }

    // ── Conflict detection ──────────────────────────────────
    setIsCheckingConflicts(true);
    const clientNames: Record<string, string> = {};
    selectedClients.forEach((c) => { clientNames[c.id] = c.full_name; });
    const selectedCoach = coaches.find((c) => c.id === selectedCoachId);

    const conflict = await checkAppointmentConflicts({
      start_time: startISO,
      end_time: endISO,
      clientIds: selectedClients.map((c) => c.id),
      clientNames,
      coachId: selectedCoachId,
      coachName: selectedCoach?.full_name,
    });
    setIsCheckingConflicts(false);

    if (conflict.hasConflict) {
      setFormErrors(conflict.messages);
      return;
    }

    // ── Create appointments ─────────────────────────────────
    try {
      const baseInput = {
        tenant_id: authTenantId,
        title: title.trim(),
        start_time: startISO,
        end_time: endISO,
        coach_id: selectedCoachId ?? undefined,
        appointment_type: aptType,
        location: aptType === 'in_person' ? (location.trim() || undefined) : undefined,
        meeting_url: aptType === 'virtual' ? (meetingUrl.trim() || undefined) : undefined,
        notes: notes.trim() || undefined,
      };

      let created: Appointment[];

      if (groupMode === 'group') {
        // One appointment, all clients as participants
        const apt = await createGroupAppointment(
          { ...baseInput, client_id: selectedClients[0].id },
          selectedClients.map((c) => c.id)
        );
        created = [apt];
      } else {
        // One appointment per client
        created = await createIndividualAppointments(
          selectedClients.map((c) => ({ ...baseInput, client_id: c.id }))
        );
      }

      // ── Notifications ───────────────────────────────────
      const adminId = user?.id ?? null;
      const recipientSet = new Set<string>();
      selectedClients.forEach((c) => recipientSet.add(c.id));
      if (adminId) recipientSet.add(adminId);
      if (selectedCoachId && selectedCoachId !== adminId) recipientSet.add(selectedCoachId);
      const recipientIds = Array.from(recipientSet);

      const notifInputs = created.flatMap((apt) =>
        recipientIds.map((recipientId) => {
          const isClient = recipientId === apt.client_id;
          const isAdmin = recipientId === adminId;
          return {
            user_id: recipientId,
            tenant_id: authTenantId,
            type: 'appointment_created' as const,
            title: isAdmin && !isClient ? 'Cita creada' : 'Nueva cita programada',
            message: isAdmin && !isClient
              ? `Creaste la cita "${apt.title}".`
              : `Tu cita "${apt.title}" fue programada.`,
            related_entity_type: 'appointment',
            related_entity_id: apt.id,
          };
        })
      );

      // Invalidate appointments cache so list and calendar update immediately
      qc.invalidateQueries({ queryKey: APPOINTMENTS_KEYS.tenant(authTenantId) });

      try {
        await createNotifications(notifInputs);
        if (user?.id) {
          qc.invalidateQueries({ queryKey: NOTIF_KEYS.list(user.id) });
          qc.invalidateQueries({ queryKey: NOTIF_KEYS.unread(user.id) });
        }
      } catch {
        // Non-fatal — appointment was already created
      }

      const count = created.length;
      ToastManager.show({
        message: groupMode === 'group'
          ? `Cita grupal creada con ${selectedClients.length} participantes`
          : count === 1 ? 'Cita creada correctamente' : `${count} citas creadas correctamente`,
        type: 'success',
      });

      setShowCreate(false);
      resetForm();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'No se pudo crear la cita.';
      Alert.alert('Error', msg);
    }
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: T.bg }]} edges={['left', 'right']}>
      <StatusBar barStyle="light-content" backgroundColor={T.bg} />
      <AdminTopBar title="Citas" subtitle={`${scheduledCount} programadas`} actionLabel="+ Nueva" onAction={() => setShowCreate(true)} />

      {/* View toggle */}
      <View style={styles.viewToggle}>
        <TouchableOpacity
          onPress={() => setViewMode('list')}
          style={[styles.toggleBtn, { backgroundColor: viewMode === 'list' ? T.accent : T.bgCard, borderColor: viewMode === 'list' ? T.accent : T.border }]}
        >
          <Text style={{ fontSize: 12, fontWeight: '700', color: viewMode === 'list' ? '#fff' : T.textSecondary }}>☰ Lista</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setViewMode('calendar')}
          style={[styles.toggleBtn, { backgroundColor: viewMode === 'calendar' ? T.accent : T.bgCard, borderColor: viewMode === 'calendar' ? T.accent : T.border }]}
        >
          <Text style={{ fontSize: 12, fontWeight: '700', color: viewMode === 'calendar' ? '#fff' : T.textSecondary }}>📅 Calendario</Text>
        </TouchableOpacity>
      </View>

      {/* Filters — only in list mode */}
      {viewMode === 'list' && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filterRow}
          contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 10, gap: 8, alignItems: 'center' }}
        >
          {FILTERS.map((f) => (
            <TouchableOpacity key={f} onPress={() => setFilter(f)}
              style={[styles.filterChip, { backgroundColor: filter === f ? T.accent : T.bgCard, borderColor: filter === f ? T.accent : T.border }]}>
              <Text style={[styles.filterChipText, { color: filter === f ? '#fff' : T.textSecondary }]}>{f}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* Calendar date strip — only in calendar mode */}
      {viewMode === 'calendar' && (
        <View style={[styles.dateStripWrapper, { borderBottomColor: T.border }]}>
          <Text style={{ color: T.text, fontSize: 12, fontWeight: '700', marginBottom: 8, textTransform: 'capitalize' }}>
            {calendarDate.toLocaleDateString('es-CR', { weekday: 'long', day: 'numeric', month: 'long' })}
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {Array.from({ length: 14 }, (_, i) => {
              const d = new Date(); d.setDate(d.getDate() + i - 3);
              const active = d.toDateString() === calendarDate.toDateString();
              const isToday = d.toDateString() === new Date().toDateString();
              return (
                <TouchableOpacity
                  key={i}
                  onPress={() => setCalendarDate(new Date(d))}
                  style={[styles.calDateBtn, {
                    backgroundColor: active ? T.accent : T.bgCard,
                    borderColor: active ? T.accent : isToday ? T.accent + '66' : T.border,
                  }]}
                >
                  <Text style={{ fontSize: 9, color: active ? '#fff' : T.textMuted, fontWeight: '600' }}>
                    {d.toLocaleDateString('es-CR', { weekday: 'short' }).toUpperCase()}
                  </Text>
                  <Text style={{ fontSize: 16, fontWeight: '800', color: active ? '#fff' : T.text }}>{d.getDate()}</Text>
                  {isToday && !active && <View style={[styles.todayDot, { backgroundColor: T.accent }]} />}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      )}

      {/* Calendar view / List view */}
      {viewMode === 'calendar' ? (
        <View style={{ flex: 1 }}>
        <CalendarDayView
            appointments={appointments}
            selectedDate={calendarDate}
            onEventPress={(apt) => router.push(`/(admin)/appointment/${apt.id}` as any)}
          />
        </View>
      ) : isLoading ? (
        <View style={{ padding: 16 }}>{[1, 2, 3].map((i) => <SkeletonCard key={i} lines={2} />)}</View>
      ) : error ? (
        <View style={styles.empty}>
          <Text style={{ color: T.red, fontSize: 14, textAlign: 'center' }}>Error al cargar citas.</Text>
          <TouchableOpacity onPress={() => refetch()} style={{ marginTop: 12 }}>
            <Text style={{ color: T.accent, fontWeight: '700' }}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={paginatedList}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
          onRefresh={refetch}
          refreshing={false}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={{ color: T.textMuted, fontSize: 14 }}>No hay citas en esta categoría</Text>
            </View>
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
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => router.push(`/(admin)/appointment/${apt.id}` as any)}
                style={[styles.card, { backgroundColor: T.bgCard, borderColor: T.border, borderRadius: T.radiusMd }]}
              >
                <View style={[styles.typeIcon, { backgroundColor: T.greenSoft }]}>
                  <Text style={{ fontSize: 18 }}>📅</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.aptTitle, { color: T.text }]}>{apt.title}</Text>
                  <Text style={[styles.aptMeta, { color: T.textSecondary }]}>
                    {apt.client_name ?? 'Cliente'}{apt.coach_name ? ` · ${apt.coach_name}` : ''}
                  </Text>
                  <Text style={[styles.aptTime, { color: T.textMuted }]}>{formatDateTime(apt.start_time)}</Text>
                </View>
                <StatusBadge status={apt.status} size="sm" />
              </TouchableOpacity>
            );
          }}
        />
      )}

      {/* ── Create form modal ── */}
      <Modal visible={showCreate} transparent animationType="slide" onRequestClose={() => { setShowCreate(false); resetForm(); }}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <View style={styles.overlay}>
            <View style={[styles.sheet, { backgroundColor: T.bgCard }]}>
              <View style={styles.handle} />
              <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                <Text style={[styles.sheetTitle, { color: T.text }]}>Nueva cita</Text>

                {/* Errors */}
                {formErrors.length > 0 && (
                  <View style={[styles.errorBox, { backgroundColor: T.redSoft, borderColor: T.red + '55' }]}>
                    {formErrors.map((e, i) => <Text key={i} style={{ color: T.red, fontSize: 13 }}>• {e}</Text>)}
                  </View>
                )}

                {/* Title */}
                <Text style={[styles.label, { color: T.textSecondary }]}>Título</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: T.bg, borderColor: T.border, color: T.text }]}
                  placeholder="Ej: Sesión de fuerza"
                  placeholderTextColor={T.textMuted}
                  value={title}
                  onChangeText={(v) => { setTitle(v); setFormErrors([]); }}
                />

                {/* Clients — navigate to dedicated screen */}
                <Text style={[styles.label, { color: T.textSecondary }]}>Clientes</Text>
                <TouchableOpacity
                  onPress={() => router.push('/(admin)/select-clients')}
                  style={[styles.clientTrigger, { backgroundColor: T.bg, borderColor: selectedClients.length > 0 ? T.accent + '66' : T.border }]}
                >
                  {selectedClients.length === 0 ? (
                    <Text style={{ color: T.textMuted, fontSize: 15, flex: 1 }}>Buscar cliente...</Text>
                  ) : (
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, flex: 1 }}>
                      {selectedClients.map((c) => (
                        <View key={c.id} style={[st.chip, { backgroundColor: T.accent + '22', borderColor: T.accent + '55' }]}>
                          <Text style={{ fontSize: 12, color: T.accent, fontWeight: '600' }}>{c.full_name.split(' ')[0]}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                  <Text style={{ color: T.accent, fontSize: 13, fontWeight: '700' }}>
                    {selectedClients.length > 0 ? 'Editar →' : 'Seleccionar →'}
                  </Text>
                </TouchableOpacity>

                {/* Modalidad — only show when multiple clients selected */}
                {selectedClients.length > 1 && (
                  <>
                    <Text style={[styles.label, { color: T.textSecondary, marginTop: 16 }]}>Modalidad de participación</Text>
                    <View style={{ flexDirection: 'row', gap: 10, marginBottom: 12 }}>
                      {(['individual', 'group'] as const).map((mode) => {
                        const active = groupMode === mode;
                        return (
                          <TouchableOpacity key={mode} onPress={() => setGroupMode(mode)}
                            style={{ flex: 1, borderRadius: 12, borderWidth: 1, paddingVertical: 12, alignItems: 'center',
                              backgroundColor: active ? T.accent : T.bgCard, borderColor: active ? T.accent : T.border }}>
                            <Text style={{ fontSize: 14, fontWeight: '700', color: active ? '#fff' : T.textSecondary }}>
                              {mode === 'individual' ? '👤 Individual' : '👥 Grupal'}
                            </Text>
                            <Text style={{ fontSize: 10, color: active ? '#ffffffCC' : T.textMuted, marginTop: 2 }}>
                              {mode === 'individual' ? `${selectedClients.length} citas separadas` : '1 cita compartida'}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </>
                )}

                {/* Coach selector */}
                <Text style={[styles.label, { color: T.textSecondary, marginTop: 16 }]}>Coach (opcional)</Text>                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
                  <TouchableOpacity
                    onPress={() => setSelectedCoachId(null)}
                    style={[st.coachChip, {
                      backgroundColor: selectedCoachId === null ? T.accent : T.bgCardElevated,
                      borderColor: selectedCoachId === null ? T.accent : T.border,
                    }]}
                  >
                    <Text style={{ fontSize: 12, fontWeight: '600', color: selectedCoachId === null ? '#fff' : T.textMuted }}>
                      Sin coach
                    </Text>
                  </TouchableOpacity>
                  {coaches.filter((c) => c.is_active !== false).map((coach) => {
                    const active = selectedCoachId === coach.id;
                    return (
                      <TouchableOpacity
                        key={coach.id}
                        onPress={() => setSelectedCoachId(coach.id)}
                        style={[st.coachChip, {
                          backgroundColor: active ? T.accent : T.bgCardElevated,
                          borderColor: active ? T.accent : T.border,
                        }]}
                      >
                        <Text style={{ fontSize: 12, fontWeight: '600', color: active ? '#fff' : T.text }}>
                          {coach.full_name}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>

                {/* Start date */}
                <Text style={[styles.label, { color: T.textSecondary, marginTop: 16 }]}>Inicio</Text>                <Text style={{ color: T.text, fontSize: 14, fontWeight: '600', marginBottom: 8 }}>{formatDateLabel(startDate)}</Text>
                <DateStrip selected={startDate} onChange={setStartDate} T={T} />
                <HourPicker hour={startHour} minute={startMin} onHour={setStartHour} onMinute={setStartMin} T={T} />

                {/* Duration */}
                <Text style={[styles.label, { color: T.textSecondary, marginTop: 16 }]}>Duración</Text>
                <DurationPicker selected={durationMin} onSelect={setDurationMin} T={T} />

                {/* Summary */}
                {durationMin && (
                  <View style={[styles.summary, { backgroundColor: T.accent + '12', borderColor: T.accent + '33' }]}>
                    <Text style={{ color: T.accent, fontSize: 13 }}>
                      🕐 {formatDateLabel(startDate)} · {startHour}:{startMin} → {(() => {
                        const end = new Date(buildEndISO(buildStartISO(startDate, startHour, startMin), durationMin));
                        return end.toLocaleTimeString('es-CR', { hour: '2-digit', minute: '2-digit' });
                      })()}
                    </Text>
                  </View>
                )}

                {/* Tipo de cita */}
                <Text style={[styles.label, { color: T.textSecondary, marginTop: 16 }]}>Tipo de cita</Text>
                <View style={{ flexDirection: 'row', gap: 10, marginBottom: 12 }}>
                  {(['in_person', 'virtual'] as const).map((type) => {
                    const active = aptType === type;
                    return (
                      <TouchableOpacity key={type} onPress={() => setAptType(type)}
                        style={{ flex: 1, borderRadius: 12, borderWidth: 1, paddingVertical: 12, alignItems: 'center',
                          backgroundColor: active ? T.accent : T.bgCard, borderColor: active ? T.accent : T.border }}>
                        <Text style={{ fontSize: 14, fontWeight: '700', color: active ? '#fff' : T.textSecondary }}>
                          {type === 'in_person' ? '🏋️ Presencial' : '📹 Virtual'}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Condicional: ubicación o link */}
                {aptType === 'in_person' ? (
                  <>
                    <Text style={[styles.label, { color: T.textSecondary }]}>Ubicación (opcional)</Text>
                    <TextInput
                      style={[styles.input, { backgroundColor: T.bg, borderColor: T.border, color: T.text }]}
                      placeholder="Ej: Sala principal, Gimnasio..."
                      placeholderTextColor={T.textMuted}
                      value={location}
                      onChangeText={setLocation}
                    />
                  </>
                ) : (
                  <>
                    <Text style={[styles.label, { color: T.textSecondary }]}>Link de reunión (opcional)</Text>
                    <TextInput
                      style={[styles.input, { backgroundColor: T.bg, borderColor: T.border, color: T.text }]}
                      placeholder="https://meet.google.com/..."
                      placeholderTextColor={T.textMuted}
                      value={meetingUrl}
                      onChangeText={setMeetingUrl}
                      autoCapitalize="none"
                      keyboardType="url"
                    />
                  </>
                )}

                {/* Notas */}
                <Text style={[styles.label, { color: T.textSecondary }]}>Notas (opcional)</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: T.bg, borderColor: T.border, color: T.text, minHeight: 64, textAlignVertical: 'top' }]}
                  placeholder="Instrucciones, recordatorios..."
                  placeholderTextColor={T.textMuted}
                  value={notes}
                  onChangeText={setNotes}
                  multiline
                />

                {/* Actions */}
                <View style={styles.actions}>
                  <TouchableOpacity onPress={() => { setShowCreate(false); resetForm(); }}
                    style={[styles.btn, { borderColor: T.border, borderWidth: 1 }]}>
                    <Text style={{ color: T.text, fontWeight: '600' }}>Cancelar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={handleCreate} disabled={createMutation.isPending || isCheckingConflicts}
                    style={[styles.btn, { backgroundColor: T.accent }]}>
                    {(createMutation.isPending || isCheckingConflicts)
                      ? <ActivityIndicator color="#fff" size="small" />
                      : <Text style={{ color: '#fff', fontWeight: '700' }}>
                          {groupMode === 'group' && selectedClients.length > 1
                            ? `Crear cita grupal (${selectedClients.length})`
                            : selectedClients.length > 1 ? `Crear ${selectedClients.length} citas` : 'Crear cita'}
                        </Text>
                    }
                  </TouchableOpacity>
                </View>
                <View style={{ height: 32 }} />
              </ScrollView>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe: { flex: 1 },
  filterRow: { flexShrink: 0 },
  filterChip: {
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
  },
  filterChipText: { fontSize: 13, fontWeight: '600' },
  chip: { borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1 },
  chipText: { fontSize: 11, fontWeight: '600' },
  card: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, padding: 14, marginBottom: 8 },
  typeIcon: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  aptTitle: { fontSize: 15, fontWeight: '700' },
  aptMeta: { fontSize: 12, marginTop: 2 },
  aptTime: { fontSize: 11, marginTop: 2 },
  empty: { padding: 40, alignItems: 'center' },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: '92%' },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.2)', alignSelf: 'center', marginBottom: 16 },
  sheetTitle: { fontSize: 20, fontWeight: '800', marginBottom: 20 },
  label: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 8 },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, marginBottom: 16 },
  clientTrigger: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 4, minHeight: 48, flexWrap: 'wrap', gap: 4 },
  errorBox: { borderRadius: 10, borderWidth: 1, padding: 12, marginBottom: 16, gap: 4 },
  summary: { borderRadius: 10, borderWidth: 1, padding: 12, marginTop: 12 },
  actions: { flexDirection: 'row', gap: 12, marginTop: 20 },
  btn: { flex: 1, borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  viewToggle: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingTop: 10, paddingBottom: 4 },
  toggleBtn: { borderRadius: 20, borderWidth: 1, paddingHorizontal: 16, paddingVertical: 7 },
  calDateBtn: { borderRadius: 10, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 8, alignItems: 'center', marginRight: 6, minWidth: 44 },
  todayDot: { width: 4, height: 4, borderRadius: 2, marginTop: 2 },
  dateStripWrapper: { paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth },
  sectionHeader: { paddingVertical: 8, marginBottom: 4, marginTop: 8, borderBottomWidth: StyleSheet.hairlineWidth },
  sectionLabel: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.6 },
  loadMoreBtn: { borderWidth: 1, borderRadius: 12, paddingVertical: 12, alignItems: 'center', marginTop: 8, marginBottom: 16 },});

const st = StyleSheet.create({
  dayBtn: { borderRadius: 10, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 8, alignItems: 'center', marginRight: 6, minWidth: 48 },
  timeBtn: { borderRadius: 8, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 8, alignItems: 'center', marginRight: 6 },
  durationBtn: { borderRadius: 20, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 8 },
  searchBox: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 8 },
  clientRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderBottomWidth: 1 },
  avatar: { width: 38, height: 38, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  checkBox: { width: 24, height: 24, borderRadius: 6, borderWidth: 2, justifyContent: 'center', alignItems: 'center' },
  chip: { flexDirection: 'row', alignItems: 'center', borderRadius: 20, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 4 },
  coachChip: { borderRadius: 20, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 8, marginRight: 8 },
});
