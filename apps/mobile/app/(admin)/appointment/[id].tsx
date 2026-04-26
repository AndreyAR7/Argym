import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, ScrollView, TouchableOpacity,
  StyleSheet, StatusBar, ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTheme } from '@/hooks/useTheme';
import { useAuthStore } from '@/store/auth.store';
import { useAppointment, useUpdateAppointment } from '@/hooks/useAppointments';
import { useCoaches } from '@/hooks/useProfiles';
import { createNotifications } from '@/services/notifications.service';
import { ToastManager } from '@/components/shared/Toast';
import { SkeletonCard } from '@/components/shared/SkeletonLoader';
import { StatusBadge } from '@/components/admin/StatusBadge';
import type { AppointmentStatus, UpdateAppointmentInput } from '@/types/appointments';
import { useQueryClient } from '@tanstack/react-query';
import { NOTIF_KEYS } from '@/hooks/useNotifications';

// ─── Constants ────────────────────────────────────────────────
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
const STATUSES: { value: AppointmentStatus; label: string }[] = [
  { value: 'scheduled', label: 'Programada' },
  { value: 'confirmed', label: 'Confirmada' },
  { value: 'completed', label: 'Completada' },
  { value: 'cancelled', label: 'Cancelada' },
  { value: 'no_show', label: 'No asistió' },
];

// ─── Helpers ──────────────────────────────────────────────────
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

function formatDateLabel(d: Date) {
  return d.toLocaleDateString('es-CR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

function getDurationMinutes(startISO: string, endISO: string): number {
  const diff = new Date(endISO).getTime() - new Date(startISO).getTime();
  return Math.round(diff / 60000);
}

// ─── Sub-components ───────────────────────────────────────────
function DateStrip({ selected, onChange, T }: { selected: Date; onChange: (d: Date) => void; T: any }) {
  const days = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() + i - 7); return d; // ±7 days
  });
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
      {days.map((d, i) => {
        const active = d.toDateString() === selected.toDateString();
        return (
          <TouchableOpacity key={i} onPress={() => onChange(d)}
            style={[s.dayBtn, { backgroundColor: active ? T.accent : T.bgCardElevated, borderColor: active ? T.accent : T.border }]}>
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
              style={[s.timeBtn, { backgroundColor: active ? T.accent : T.bgCardElevated, borderColor: active ? T.accent : T.border }]}>
              <Text style={{ fontSize: 13, fontWeight: '700', color: active ? '#fff' : T.text }}>{h}h</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        {MINUTES.map((m) => {
          const active = m === minute;
          return (
            <TouchableOpacity key={m} onPress={() => onMinute(m)}
              style={[s.timeBtn, { flex: 1, backgroundColor: active ? T.accent : T.bgCardElevated, borderColor: active ? T.accent : T.border }]}>
              <Text style={{ fontSize: 13, fontWeight: '700', color: active ? '#fff' : T.text }}>:{m}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

function DurationPicker({ selected, onSelect, T }: { selected: number; onSelect: (m: number) => void; T: any }) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      {DURATIONS.map((d) => {
        const active = selected === d.minutes;
        return (
          <TouchableOpacity key={d.minutes} onPress={() => onSelect(d.minutes)}
            style={[s.durationBtn, { backgroundColor: active ? T.accent : T.bgCardElevated, borderColor: active ? T.accent : T.border }]}>
            <Text style={{ fontSize: 12, fontWeight: '700', color: active ? '#fff' : T.text }}>{d.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

// ─── Main screen ─────────────────────────────────────────────
export default function AppointmentDetailScreen() {
  const T = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuthStore();
  const qc = useQueryClient();

  const authTenantId = user?.tenant_id ?? '';
  const { data: apt, isLoading, error } = useAppointment(id);
  const updateMutation = useUpdateAppointment(authTenantId || undefined);
  const { data: coaches = [] } = useCoaches();

  // Form state — initialized from loaded appointment
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState(new Date());
  const [startHour, setStartHour] = useState('09');
  const [startMin, setStartMin] = useState('00');
  const [durationMin, setDurationMin] = useState(60);
  const [status, setStatus] = useState<AppointmentStatus>('scheduled');
  const [aptType, setAptType] = useState<'in_person' | 'virtual'>('in_person');
  const [location, setLocation] = useState('');
  const [meetingUrl, setMeetingUrl] = useState('');
  const [notes, setNotes] = useState('');
  const [selectedCoachId, setSelectedCoachId] = useState<string | null>(null);
  const [formErrors, setFormErrors] = useState<string[]>([]);
  const [actionLoading, setActionLoading] = useState<'save' | 'cancel' | 'complete' | null>(null);

  // Populate form when appointment loads
  useEffect(() => {
    if (!apt) return;
    setTitle(apt.title);
    setDescription(apt.description ?? '');
    const start = new Date(apt.start_time);
    setStartDate(start);
    setStartHour(String(start.getHours()).padStart(2, '0'));
    setStartMin(String(start.getMinutes()).padStart(2, '0'));
    const dur = getDurationMinutes(apt.start_time, apt.end_time);
    const closest = DURATIONS.reduce((prev, curr) =>
      Math.abs(curr.minutes - dur) < Math.abs(prev.minutes - dur) ? curr : prev
    );
    setDurationMin(closest.minutes);
    setStatus(apt.status);
    setAptType(apt.appointment_type ?? 'in_person');
    setLocation(apt.location ?? '');
    setMeetingUrl(apt.meeting_url ?? '');
    setNotes(apt.notes ?? '');
    setSelectedCoachId(apt.coach_id ?? null);
  }, [apt]);

  // ── Shared notification helper ────────────────────────────
  const fireNotif = (notifTitle: string, notifMessage: string, type: 'appointment_created' | 'appointment_cancelled' | 'appointment_completed' | 'appointment_rescheduled') => {
    if (!apt || !authTenantId || !user?.id) return;
    const recipientSet = new Set<string>([apt.client_id, user.id]);
    if (apt.coach_id) recipientSet.add(apt.coach_id);
    const inputs = Array.from(recipientSet).map((uid) => ({
      user_id: uid,
      tenant_id: authTenantId,
      type,
      title: notifTitle,
      message: notifMessage,
      related_entity_type: 'appointment',
      related_entity_id: id!,
    }));
    createNotifications(inputs).catch((e) => console.warn('[AppointmentDetail] notif error:', e));
    qc.invalidateQueries({ queryKey: NOTIF_KEYS.list(user.id) });
    qc.invalidateQueries({ queryKey: NOTIF_KEYS.unread(user.id) });
  };

  // ── Save (reprogramar + editar título/descripción/estado) ──
  const handleSave = async () => {
    const errors: string[] = [];
    if (!title.trim()) errors.push('El título es requerido.');
    if (!durationMin) errors.push('Selecciona una duración.');
    if (errors.length > 0) { setFormErrors(errors); return; }
    if (!id || !apt) return;

    const startISO = buildStartISO(startDate, startHour, startMin);
    const endISO = buildEndISO(startISO, durationMin);
    const input: UpdateAppointmentInput = {
      title: title.trim(),
      description: description.trim() || undefined,
      start_time: startISO,
      end_time: endISO,
      status,
      coach_id: selectedCoachId ?? undefined,
      appointment_type: aptType,
      location: aptType === 'in_person' ? (location.trim() || undefined) : undefined,
      meeting_url: aptType === 'virtual' ? (meetingUrl.trim() || undefined) : undefined,
      notes: notes.trim() || undefined,
    };

    console.log('[AppointmentDetail] handleSave id:', id, '| payload:', input);
    setActionLoading('save');
    try {
      await updateMutation.mutateAsync({ id, input });
      console.log('[AppointmentDetail] update success');

      const timeChanged = startISO !== apt.start_time || endISO !== apt.end_time;
      const statusChanged = status !== apt.status;

      if (timeChanged) {
        fireNotif('Cita reprogramada', `La cita "${title.trim()}" cambió de horario.`, 'appointment_rescheduled');
      } else if (statusChanged && status === 'cancelled') {
        fireNotif('Cita cancelada', `La cita "${title.trim()}" fue cancelada.`, 'appointment_cancelled');
      } else if (statusChanged && status === 'completed') {
        fireNotif('Cita completada', `La cita "${title.trim()}" fue marcada como completada.`, 'appointment_completed');
      }

      ToastManager.show({ message: 'Cita actualizada correctamente', type: 'success' });
      router.back();
    } catch (err: any) {
      console.error('[AppointmentDetail] update failed:', err);
      Alert.alert('Error', err.message ?? 'No se pudo guardar la cita.');
    } finally {
      setActionLoading(null);
    }
  };

  // ── Cancelar cita ─────────────────────────────────────────
  const handleCancel = () => {
    if (!id || !apt) return;
    Alert.alert(
      'Cancelar cita',
      `¿Deseas cancelar la cita "${apt.title}"? Esta acción notificará a los involucrados.`,
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Sí, cancelar',
          style: 'destructive',
          onPress: async () => {
            console.log('[AppointmentDetail] cancelling id:', id);
            setActionLoading('cancel');
            try {
              await updateMutation.mutateAsync({ id, input: { status: 'cancelled' } });
              fireNotif('Cita cancelada', `La cita "${apt.title}" fue cancelada.`, 'appointment_cancelled');
              ToastManager.show({ message: 'Cita cancelada', type: 'info' });
              router.back();
            } catch (err: any) {
              console.error('[AppointmentDetail] cancel failed:', err);
              Alert.alert('Error', err.message ?? 'No se pudo cancelar la cita.');
            } finally {
              setActionLoading(null);
            }
          },
        },
      ]
    );
  };

  // ── Marcar como completada ────────────────────────────────
  const handleComplete = async () => {
    if (!id || !apt) return;
    console.log('[AppointmentDetail] completing id:', id);
    setActionLoading('complete');
    try {
      await updateMutation.mutateAsync({ id, input: { status: 'completed' } });
      fireNotif('Cita completada', `La cita "${apt.title}" fue marcada como completada.`, 'appointment_completed');
      ToastManager.show({ message: 'Cita marcada como completada', type: 'success' });
      router.back();
    } catch (err: any) {
      console.error('[AppointmentDetail] complete failed:', err);
      Alert.alert('Error', err.message ?? 'No se pudo completar la cita.');
    } finally {
      setActionLoading(null);
    }
  };

  const isBusy = actionLoading !== null;

  // ── Render ──
  if (isLoading) {
    return (
      <SafeAreaView style={[s.safe, { backgroundColor: T.bg }]} edges={['left', 'right']}>
        <View style={s.topBar}>
          <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
            <Text style={{ color: T.accent, fontSize: 15 }}>← Volver</Text>
          </TouchableOpacity>
          <Text style={[s.topTitle, { color: T.text }]}>Detalle de cita</Text>
          <View style={{ width: 70 }} />
        </View>
        <View style={{ padding: 16 }}>
          <SkeletonCard lines={3} />
          <SkeletonCard lines={2} />
        </View>
      </SafeAreaView>
    );
  }

  if (error || !apt) {
    return (
      <SafeAreaView style={[s.safe, { backgroundColor: T.bg }]} edges={['left', 'right']}>
        <View style={s.topBar}>
          <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
            <Text style={{ color: T.accent, fontSize: 15 }}>← Volver</Text>
          </TouchableOpacity>
          <Text style={[s.topTitle, { color: T.text }]}>Detalle de cita</Text>
          <View style={{ width: 70 }} />
        </View>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
          <Text style={{ fontSize: 32, marginBottom: 12 }}>❌</Text>
          <Text style={{ color: T.red, fontSize: 15, textAlign: 'center' }}>
            No se pudo cargar la cita.
          </Text>
          <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 16 }}>
            <Text style={{ color: T.accent, fontWeight: '700' }}>Volver</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: T.bg }]} edges={['left', 'right']}>
      <StatusBar barStyle="light-content" backgroundColor={T.bg} />

      {/* Header */}
      <View style={[s.topBar, { borderBottomColor: T.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Text style={{ color: T.accent, fontSize: 15 }}>← Volver</Text>
        </TouchableOpacity>
        <Text style={[s.topTitle, { color: T.text }]}>Editar cita</Text>
        <View style={{ width: 70 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>

        {/* Errors */}
        {formErrors.length > 0 && (
          <View style={[s.errorBox, { backgroundColor: T.redSoft, borderColor: T.red + '55' }]}>
            {formErrors.map((e, i) => <Text key={i} style={{ color: T.red, fontSize: 13 }}>• {e}</Text>)}
          </View>
        )}

        {/* Title */}
        <Text style={[s.label, { color: T.textSecondary }]}>Título</Text>
        <TextInput
          style={[s.input, { backgroundColor: T.bgCard, borderColor: T.border, color: T.text }]}
          value={title}
          onChangeText={(v) => { setTitle(v); setFormErrors([]); }}
          placeholder="Título de la cita"
          placeholderTextColor={T.textMuted}
        />

        {/* Description */}
        <Text style={[s.label, { color: T.textSecondary }]}>Descripción (opcional)</Text>
        <TextInput
          style={[s.input, { backgroundColor: T.bgCard, borderColor: T.border, color: T.text, minHeight: 72, textAlignVertical: 'top' }]}
          value={description}
          onChangeText={setDescription}
          placeholder="Notas adicionales..."
          placeholderTextColor={T.textMuted}
          multiline
        />

        {/* Start date */}
        <Text style={[s.label, { color: T.textSecondary }]}>Inicio</Text>
        <Text style={{ color: T.text, fontSize: 14, fontWeight: '600', marginBottom: 8 }}>{formatDateLabel(startDate)}</Text>
        <DateStrip selected={startDate} onChange={setStartDate} T={T} />
        <HourPicker hour={startHour} minute={startMin} onHour={setStartHour} onMinute={setStartMin} T={T} />

        {/* Duration */}
        <Text style={[s.label, { color: T.textSecondary, marginTop: 16 }]}>Duración</Text>
        <DurationPicker selected={durationMin} onSelect={setDurationMin} T={T} />

        {/* Summary */}
        <View style={[s.summary, { backgroundColor: T.accent + '12', borderColor: T.accent + '33' }]}>
          <Text style={{ color: T.accent, fontSize: 13 }}>
            🕐 {formatDateLabel(startDate)} · {startHour}:{startMin} → {(() => {
              const end = new Date(buildEndISO(buildStartISO(startDate, startHour, startMin), durationMin));
              return end.toLocaleTimeString('es-CR', { hour: '2-digit', minute: '2-digit' });
            })()}
          </Text>
        </View>

        {/* Status */}
        <Text style={[s.label, { color: T.textSecondary, marginTop: 16 }]}>Estado</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {STATUSES.map((st) => {
            const active = status === st.value;
            return (
              <TouchableOpacity key={st.value} onPress={() => setStatus(st.value)}
                style={[s.statusBtn, {
                  backgroundColor: active ? T.accent : T.bgCard,
                  borderColor: active ? T.accent : T.border,
                }]}>
                <Text style={{ fontSize: 13, fontWeight: '600', color: active ? '#fff' : T.textSecondary }}>
                  {st.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Current status badge */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 }}>
          <Text style={{ color: T.textMuted, fontSize: 12 }}>Estado actual:</Text>
          <StatusBadge status={status} size="sm" />
        </View>

        {/* Tipo de cita */}
        <Text style={[s.label, { color: T.textSecondary, marginTop: 16 }]}>Tipo de cita</Text>
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

        {aptType === 'in_person' ? (
          <>
            <Text style={[s.label, { color: T.textSecondary }]}>Ubicación (opcional)</Text>
            <TextInput
              style={[s.input, { backgroundColor: T.bgCard, borderColor: T.border, color: T.text }]}
              value={location}
              onChangeText={setLocation}
              placeholder="Ej: Sala principal, Gimnasio..."
              placeholderTextColor={T.textMuted}
            />
          </>
        ) : (
          <>
            <Text style={[s.label, { color: T.textSecondary }]}>Link de reunión (opcional)</Text>
            <TextInput
              style={[s.input, { backgroundColor: T.bgCard, borderColor: T.border, color: T.text }]}
              value={meetingUrl}
              onChangeText={setMeetingUrl}
              placeholder="https://meet.google.com/..."
              placeholderTextColor={T.textMuted}
              autoCapitalize="none"
              keyboardType="url"
            />
          </>
        )}

        {/* Notas */}
        <Text style={[s.label, { color: T.textSecondary }]}>Notas (opcional)</Text>
        <TextInput
          style={[s.input, { backgroundColor: T.bgCard, borderColor: T.border, color: T.text, minHeight: 64, textAlignVertical: 'top' }]}
          value={notes}
          onChangeText={setNotes}
          placeholder="Instrucciones, recordatorios..."
          placeholderTextColor={T.textMuted}
          multiline
        />

        {/* Coach */}
        <Text style={[s.label, { color: T.textSecondary }]}>Coach (opcional)</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
          <TouchableOpacity
            onPress={() => setSelectedCoachId(null)}
            style={[s.coachChip, {
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
                style={[s.coachChip, {
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

        {/* Save button */}
        <TouchableOpacity
          onPress={handleSave}
          disabled={isBusy}
          style={[s.saveBtn, { backgroundColor: T.accent, marginTop: 24, opacity: isBusy ? 0.7 : 1 }]}
        >
          {actionLoading === 'save'
            ? <ActivityIndicator color="#fff" size="small" />
            : <Text style={{ color: '#fff', fontWeight: '700', fontSize: 16 }}>💾 Guardar cambios</Text>
          }
        </TouchableOpacity>

        {/* Quick actions — only show if not already cancelled/completed */}
        {apt.status !== 'cancelled' && apt.status !== 'completed' && (
          <View style={{ marginTop: 16, gap: 10 }}>
            {/* Mark as completed */}
            <TouchableOpacity
              onPress={handleComplete}
              disabled={isBusy}
              style={[s.actionBtn, { backgroundColor: T.green + '18', borderColor: T.green + '55', opacity: isBusy ? 0.7 : 1 }]}
            >
              {actionLoading === 'complete'
                ? <ActivityIndicator color={T.green} size="small" />
                : <Text style={{ color: T.green, fontWeight: '700', fontSize: 15 }}>✅ Marcar como completada</Text>
              }
            </TouchableOpacity>

            {/* Cancel */}
            <TouchableOpacity
              onPress={handleCancel}
              disabled={isBusy}
              style={[s.actionBtn, { backgroundColor: T.red + '12', borderColor: T.red + '44', opacity: isBusy ? 0.7 : 1 }]}
            >
              {actionLoading === 'cancel'
                ? <ActivityIndicator color={T.red} size="small" />
                : <Text style={{ color: T.red, fontWeight: '700', fontSize: 15 }}>❌ Cancelar cita</Text>
              }
            </TouchableOpacity>
          </View>
        )}

        {/* Already cancelled/completed notice */}
        {(apt.status === 'cancelled' || apt.status === 'completed') && (
          <View style={[s.noticeBanner, { backgroundColor: T.bgSurface, borderColor: T.border }]}>
            <Text style={{ color: T.textMuted, fontSize: 13, textAlign: 'center' }}>
              {apt.status === 'cancelled' ? '❌ Esta cita fue cancelada' : '✅ Esta cita fue completada'}
            </Text>
          </View>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1 },
  topBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: { minWidth: 70 },
  topTitle: { fontSize: 17, fontWeight: '700' },
  label: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 8, marginTop: 16 },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, marginBottom: 4 },
  errorBox: { borderRadius: 10, borderWidth: 1, padding: 12, marginBottom: 16, gap: 4 },
  summary: { borderRadius: 10, borderWidth: 1, padding: 12, marginTop: 12 },
  saveBtn: { borderRadius: 14, paddingVertical: 16, alignItems: 'center' },
  dayBtn: { borderRadius: 10, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 8, alignItems: 'center', marginRight: 6, minWidth: 48 },
  timeBtn: { borderRadius: 8, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 8, alignItems: 'center', marginRight: 6 },
  durationBtn: { borderRadius: 20, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 8 },
  statusBtn: { borderRadius: 20, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 8 },
  actionBtn: { borderRadius: 14, borderWidth: 1, paddingVertical: 14, alignItems: 'center' },
  noticeBanner: { borderRadius: 12, borderWidth: 1, padding: 14, marginTop: 16, alignItems: 'center' },
  coachChip: { borderRadius: 20, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 8, marginRight: 8 },
});
