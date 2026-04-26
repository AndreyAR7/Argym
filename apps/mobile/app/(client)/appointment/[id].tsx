import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, StatusBar, ActivityIndicator, Alert, Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTheme } from '@/hooks/useTheme';
import { useAuthStore } from '@/store/auth.store';
import { useAppointment, useUpdateAppointmentClient } from '@/hooks/useAppointments';
import { createNotifications } from '@/services/notifications.service';
import { useQueryClient } from '@tanstack/react-query';
import { NOTIF_KEYS } from '@/hooks/useNotifications';
import { SkeletonCard } from '@/components/shared/SkeletonLoader';
import { ToastManager } from '@/components/shared/Toast';

function formatDateTime(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  const isToday = d.toDateString() === today.toDateString();
  const isTomorrow = d.toDateString() === tomorrow.toDateString();
  const time = d.toLocaleTimeString('es-CR', { hour: '2-digit', minute: '2-digit' });
  const date = isToday
    ? 'Hoy'
    : isTomorrow
    ? 'Mañana'
    : d.toLocaleDateString('es-CR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  return `${date} · ${time}`;
}

function getDurationLabel(startISO: string, endISO: string) {
  const diff = Math.round((new Date(endISO).getTime() - new Date(startISO).getTime()) / 60000);
  if (diff < 60) return `${diff} min`;
  const h = Math.floor(diff / 60);
  const m = diff % 60;
  return m > 0 ? `${h}h ${m}min` : `${h}h`;
}

const STATUS_LABEL: Record<string, string> = {
  scheduled: 'Programada',
  confirmed: 'Confirmada',
  completed: 'Completada',
  cancelled: 'Cancelada',
  no_show: 'No asistió',
};

const STATUS_COLOR: Record<string, string> = {
  scheduled: '#F59E0B',
  confirmed: '#10B981',
  completed: '#3B82F6',
  cancelled: '#EF4444',
  no_show: '#6B7280',
};

export default function ClientAppointmentDetail() {
  const T = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuthStore();

  const { data: apt, isLoading, error } = useAppointment(id);
  const updateMutation = useUpdateAppointmentClient(user?.id);
  const qc = useQueryClient();
  const [actionLoading, setActionLoading] = useState<'confirm' | 'cancel' | null>(null);

  const tenantId = user?.tenant_id ?? '';

  const fireNotif = (type: 'appointment_confirmed' | 'appointment_cancelled', title: string, message: string) => {
    if (!apt || !tenantId || !user?.id) return;
    const recipientSet = new Set<string>([user.id]);
    if (apt.coach_id) recipientSet.add(apt.coach_id);
    const inputs = Array.from(recipientSet).map((uid) => ({
      user_id: uid,
      tenant_id: tenantId,
      type,
      title,
      message,
      related_entity_type: 'appointment',
      related_entity_id: id!,
    }));
    createNotifications(inputs).catch((e) => console.warn('[ClientAppointment] notif error:', e));
    qc.invalidateQueries({ queryKey: NOTIF_KEYS.list(user.id) });
    qc.invalidateQueries({ queryKey: NOTIF_KEYS.unread(user.id) });
  };

  const isBusy = actionLoading !== null;

  const handleConfirm = async () => {
    if (!id || !apt) return;
    Alert.alert(
      'Confirmar cita',
      `¿Deseas confirmar la cita "${apt.title}"?`,
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Confirmar',
          onPress: async () => {
            setActionLoading('confirm');
            try {
              await updateMutation.mutateAsync({ id, input: { status: 'confirmed' } });
              fireNotif('appointment_confirmed', 'Cita confirmada', `Confirmaste tu asistencia a "${apt.title}".`);
              ToastManager.show({ message: 'Cita confirmada', type: 'success' });
              router.back();
            } catch (err: any) {
              Alert.alert('Error', err.message ?? 'No se pudo confirmar la cita.');
            } finally {
              setActionLoading(null);
            }
          },
        },
      ]
    );
  };

  const handleCancel = () => {
    if (!id || !apt) return;
    Alert.alert(
      'Cancelar cita',
      `¿Deseas cancelar la cita "${apt.title}"? Esta acción notificará a tu coach.`,
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Sí, cancelar',
          style: 'destructive',
          onPress: async () => {
            setActionLoading('cancel');
            try {
              await updateMutation.mutateAsync({ id, input: { status: 'cancelled' } });
              fireNotif('appointment_cancelled', 'Cita cancelada', `Cancelaste la cita "${apt.title}".`);
              ToastManager.show({ message: 'Cita cancelada', type: 'info' });
              router.back();
            } catch (err: any) {
              Alert.alert('Error', err.message ?? 'No se pudo cancelar la cita.');
            } finally {
              setActionLoading(null);
            }
          },
        },
      ]
    );
  };

  const handleOpenLink = () => {
    if (!apt?.meeting_url) return;
    Linking.openURL(apt.meeting_url).catch(() =>
      Alert.alert('Error', 'No se pudo abrir el link de la reunión.')
    );
  };

  // ── Loading ──
  if (isLoading) {
    return (
      <SafeAreaView style={[s.safe, { backgroundColor: T.bg }]} edges={['left', 'right']}>
        <View style={[s.topBar, { borderBottomColor: T.border }]}>
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

  // ── Error ──
  if (error || !apt) {
    return (
      <SafeAreaView style={[s.safe, { backgroundColor: T.bg }]} edges={['left', 'right']}>
        <View style={[s.topBar, { borderBottomColor: T.border }]}>
          <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
            <Text style={{ color: T.accent, fontSize: 15 }}>← Volver</Text>
          </TouchableOpacity>
          <Text style={[s.topTitle, { color: T.text }]}>Detalle de cita</Text>
          <View style={{ width: 70 }} />
        </View>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
          <Text style={{ fontSize: 32, marginBottom: 12 }}>❌</Text>
          <Text style={{ color: T.red, fontSize: 15, textAlign: 'center' }}>No se pudo cargar la cita.</Text>
          <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 16 }}>
            <Text style={{ color: T.accent, fontWeight: '700' }}>Volver</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const isVirtual = apt.appointment_type === 'virtual';
  const statusColor = STATUS_COLOR[apt.status] ?? '#6B7280';
  const canConfirm = apt.status === 'scheduled';
  const canCancel = apt.status === 'scheduled' || apt.status === 'confirmed';

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: T.bg }]} edges={['left', 'right']}>
      <StatusBar barStyle="light-content" backgroundColor={T.bg} />

      {/* Header */}
      <View style={[s.topBar, { borderBottomColor: T.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Text style={{ color: T.accent, fontSize: 15 }}>← Volver</Text>
        </TouchableOpacity>
        <Text style={[s.topTitle, { color: T.text }]}>Mi cita</Text>
        <View style={{ width: 70 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>

        {/* Status badge */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <View style={[s.statusBadge, { backgroundColor: statusColor + '22', borderColor: statusColor + '55' }]}>
            <View style={[s.statusDot, { backgroundColor: statusColor }]} />
            <Text style={{ color: statusColor, fontSize: 13, fontWeight: '700' }}>
              {STATUS_LABEL[apt.status] ?? apt.status}
            </Text>
          </View>
          <View style={[s.typeBadge, { backgroundColor: isVirtual ? T.blueSoft : T.greenSoft }]}>
            <Text style={{ color: isVirtual ? T.blue : T.green, fontSize: 12, fontWeight: '700' }}>
              {isVirtual ? '📹 Virtual' : '🏋️ Presencial'}
            </Text>
          </View>
        </View>

        {/* Title */}
        <Text style={{ fontSize: 24, fontWeight: '800', color: T.text, marginBottom: 4 }}>{apt.title}</Text>

        {/* Coach */}
        {apt.coach_name && (
          <Text style={{ fontSize: 15, color: T.textSecondary, marginBottom: 16 }}>con {apt.coach_name}</Text>
        )}

        {/* Info cards */}
        <View style={[s.infoCard, { backgroundColor: T.bgCard, borderColor: T.border }]}>
          <InfoRow icon="🗓" label="Fecha y hora" value={formatDateTime(apt.start_time)} T={T} />
          <View style={[s.divider, { backgroundColor: T.border }]} />
          <InfoRow icon="⏱" label="Duración" value={getDurationLabel(apt.start_time, apt.end_time)} T={T} />
          {apt.location && (
            <>
              <View style={[s.divider, { backgroundColor: T.border }]} />
              <InfoRow icon="📍" label="Ubicación" value={apt.location} T={T} />
            </>
          )}
          {apt.meeting_url && (
            <>
              <View style={[s.divider, { backgroundColor: T.border }]} />
              <TouchableOpacity onPress={handleOpenLink}>
                <InfoRow icon="🔗" label="Reunión virtual" value="Toca para unirte" T={T} accent={T.blue} />
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* Notes */}
        {apt.notes && (
          <View style={[s.notesCard, { backgroundColor: T.bgCard, borderColor: T.border }]}>
            <Text style={{ fontSize: 11, fontWeight: '700', color: T.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>
              Notas
            </Text>
            <Text style={{ fontSize: 14, color: T.textSecondary, lineHeight: 20 }}>{apt.notes}</Text>
          </View>
        )}

        {/* Description */}
        {apt.description && (
          <View style={[s.notesCard, { backgroundColor: T.bgCard, borderColor: T.border }]}>
            <Text style={{ fontSize: 11, fontWeight: '700', color: T.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>
              Descripción
            </Text>
            <Text style={{ fontSize: 14, color: T.textSecondary, lineHeight: 20 }}>{apt.description}</Text>
          </View>
        )}

        {/* Actions */}
        {(canConfirm || canCancel) && (
          <View style={{ marginTop: 24, gap: 12 }}>
            {/* Join meeting button — always visible if virtual */}
            {isVirtual && apt.meeting_url && (
              <TouchableOpacity
                onPress={handleOpenLink}
                style={[s.actionBtn, { backgroundColor: T.blue, opacity: isBusy ? 0.7 : 1 }]}
              >
                <Text style={{ color: '#fff', fontWeight: '700', fontSize: 16 }}>🔗 Unirse a la reunión</Text>
              </TouchableOpacity>
            )}

            {canConfirm && (
              <TouchableOpacity
                onPress={handleConfirm}
                disabled={isBusy}
                style={[s.actionBtn, { backgroundColor: T.green, opacity: isBusy ? 0.7 : 1 }]}
              >
                {actionLoading === 'confirm'
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Text style={{ color: '#fff', fontWeight: '700', fontSize: 16 }}>✅ Confirmar asistencia</Text>
                }
              </TouchableOpacity>
            )}

            {canCancel && (
              <TouchableOpacity
                onPress={handleCancel}
                disabled={isBusy}
                style={[s.actionBtnOutline, { borderColor: T.red + '66', opacity: isBusy ? 0.7 : 1 }]}
              >
                {actionLoading === 'cancel'
                  ? <ActivityIndicator color={T.red} size="small" />
                  : <Text style={{ color: T.red, fontWeight: '700', fontSize: 15 }}>❌ Cancelar cita</Text>
                }
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Completed / cancelled notice */}
        {(apt.status === 'completed' || apt.status === 'cancelled' || apt.status === 'no_show') && (
          <View style={[s.noticeBanner, { backgroundColor: T.bgCard, borderColor: T.border, marginTop: 24 }]}>
            <Text style={{ color: T.textMuted, fontSize: 13, textAlign: 'center' }}>
              {apt.status === 'completed' && '✅ Esta cita fue completada'}
              {apt.status === 'cancelled' && '❌ Esta cita fue cancelada'}
              {apt.status === 'no_show' && '⚠️ No asististe a esta cita'}
            </Text>
          </View>
        )}

        {/* Virtual join button even for confirmed */}
        {apt.status === 'confirmed' && isVirtual && apt.meeting_url && (
          <TouchableOpacity
            onPress={handleOpenLink}
            style={[s.actionBtn, { backgroundColor: T.blue, marginTop: 24 }]}
          >
            <Text style={{ color: '#fff', fontWeight: '700', fontSize: 16 }}>🔗 Unirse a la reunión</Text>
          </TouchableOpacity>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

function InfoRow({ icon, label, value, T, accent }: {
  icon: string; label: string; value: string; T: any; accent?: string;
}) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 14 }}>
      <Text style={{ fontSize: 18, width: 24, textAlign: 'center' }}>{icon}</Text>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 11, color: T.textMuted, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 2 }}>{label}</Text>
        <Text style={{ fontSize: 14, color: accent ?? T.text, fontWeight: '500' }}>{value}</Text>
      </View>
    </View>
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
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 20, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 5 },
  statusDot: { width: 7, height: 7, borderRadius: 4 },
  typeBadge: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5 },
  infoCard: { borderRadius: 14, borderWidth: 1, overflow: 'hidden', marginBottom: 12 },
  divider: { height: StyleSheet.hairlineWidth, marginHorizontal: 14 },
  notesCard: { borderRadius: 14, borderWidth: 1, padding: 14, marginBottom: 12 },
  actionBtn: { borderRadius: 14, paddingVertical: 16, alignItems: 'center' },
  actionBtnOutline: { borderRadius: 14, borderWidth: 1, paddingVertical: 14, alignItems: 'center' },
  noticeBanner: { borderRadius: 12, borderWidth: 1, padding: 14, alignItems: 'center' },
});
