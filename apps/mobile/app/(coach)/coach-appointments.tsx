import React, { useState, useEffect } from 'react';
import {
  View, Text, FlatList, StyleSheet, StatusBar, TouchableOpacity,
  Modal, TextInput, ActivityIndicator, Alert, ScrollView, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as ScreenOrientation from 'expo-screen-orientation';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/hooks/useTheme';
import { useAuthStore } from '@/store/auth.store';
import { useClientSelectionStore } from '@/store/clientSelection.store';
import { useAppointmentsCoach, APPOINTMENTS_KEYS } from '@/hooks/useAppointments';
import { checkAppointmentConflicts, createGroupAppointment, createIndividualAppointments } from '@/services/appointments.service';
import { createNotifications } from '@/services/notifications.service';
import { NOTIF_KEYS } from '@/hooks/useNotifications';
import { useQueryClient } from '@tanstack/react-query';
import { SkeletonCard } from '@/components/shared/SkeletonLoader';
import { StatusBadge } from '@/components/admin/StatusBadge';
import { ToastManager } from '@/components/shared/Toast';
import { CalendarDayView } from '@/components/admin/CalendarDayView';
import { DateStrip, HourPicker, DurationPicker, DayPreviewStrip, computeSlotConflicts, formatDateLabel, buildStartISO, buildEndISO } from '@/components/shared/AppointmentFormPickers';
import { useCoachSidebarStore } from '@/store/coachSidebar.store';
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
  const router = useRouter();
  const { user } = useAuthStore();
  const { open: openSidebar } = useCoachSidebarStore();
  const qc = useQueryClient();
  const { data: appointments = [], isLoading, error, refetch } = useAppointmentsCoach(user?.id);

  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [showCreate, setShowCreate] = useState(false);

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
  const [groupMode, setGroupMode] = useState<'individual' | 'group'>('individual');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCheckingConflicts, setIsCheckingConflicts] = useState(false);

  const upcoming = appointments.filter((a: Appointment) =>
    a.status === 'scheduled' || a.status === 'confirmed' || new Date(a.start_time) >= new Date()
  );

  const resetForm = () => {
    setTitle('');
    clientStore.clear();
    setStartDate(new Date()); setStartHour('09'); setStartMin('00');
    setDurationMin(60); setFormErrors([]);
    setAptType('in_person'); setLocation(''); setMeetingUrl(''); setNotes('');
    setGroupMode('individual');
  };

  const handleCreate = async () => {
    const startISO = buildStartISO(startDate, startHour, startMin);
    const endISO = buildEndISO(startISO, durationMin ?? 60);

    const errors: string[] = [];
    if (!title.trim()) errors.push(t('admin.appointments.errors.titleRequired'));
    if (selectedClients.length === 0) errors.push(t('admin.appointments.errors.clientRequired'));
    if (!durationMin) errors.push(t('admin.appointments.errors.durationRequired'));

    const now = new Date();
    const todayDateStr = now.toLocaleDateString('en-CA');
    const startDateStr = startDate.toLocaleDateString('en-CA');
    if (startDateStr < todayDateStr) {
      errors.push(t('admin.appointments.errors.pastDate', { date: startDateStr }));
    } else if (startDateStr === todayDateStr) {
      const startDt = new Date(startISO);
      if (startDt < now) {
        const limit = now.toLocaleTimeString('es-CR', { hour: '2-digit', minute: '2-digit' });
        errors.push(t('admin.appointments.errors.pastTime', { time: limit }));
      }
    }

    if (errors.length > 0) { setFormErrors(errors); return; }

    if (!user?.tenant_id || !user?.id) {
      Alert.alert(t('common.error'), t('admin.appointments.errors.noTenant'));
      return;
    }

    // ── Conflict detection ──────────────────────────────────
    setIsCheckingConflicts(true);
    const clientNames: Record<string, string> = {};
    selectedClients.forEach((c) => { clientNames[c.id] = c.full_name; });

    const conflict = await checkAppointmentConflicts({
      start_time: startISO,
      end_time: endISO,
      clientIds: selectedClients.map((c) => c.id),
      clientNames,
      coachId: user.id,
      coachName: user.full_name,
    });
    setIsCheckingConflicts(false);

    if (conflict.hasConflict) {
      setFormErrors(conflict.messages);
      return;
    }

    // ── Create appointments ─────────────────────────────────
    setIsSubmitting(true);
    try {
      const baseInput = {
        tenant_id: user.tenant_id,
        title: title.trim(),
        start_time: startISO,
        end_time: endISO,
        coach_id: user.id,
        appointment_type: aptType,
        location: aptType === 'in_person' ? (location.trim() || undefined) : undefined,
        meeting_url: aptType === 'virtual' ? (meetingUrl.trim() || undefined) : undefined,
        notes: notes.trim() || undefined,
      };

      let created: Appointment[];

      if (groupMode === 'group') {
        const apt = await createGroupAppointment(
          { ...baseInput, client_id: selectedClients[0].id },
          selectedClients.map((c) => c.id)
        );
        created = [apt];
      } else {
        created = await createIndividualAppointments(
          selectedClients.map((c) => ({ ...baseInput, client_id: c.id }))
        );
      }

      // ── Notifications ───────────────────────────────────
      const recipientSet = new Set<string>();
      selectedClients.forEach((c) => recipientSet.add(c.id));
      recipientSet.add(user.id);
      const recipientIds = Array.from(recipientSet);

      const notifInputs = created.flatMap((apt) =>
        recipientIds.map((recipientId) => {
          const isClient = recipientId === apt.client_id;
          return {
            user_id: recipientId,
            tenant_id: user.tenant_id!,
            type: 'appointment_created' as const,
            title: isClient ? 'Nueva cita programada' : 'Cita creada',
            message: isClient ? `Tu cita "${apt.title}" fue programada.` : `Creaste la cita "${apt.title}".`,
            related_entity_type: 'appointment',
            related_entity_id: apt.id,
          };
        })
      );

      qc.invalidateQueries({ queryKey: APPOINTMENTS_KEYS.coach(user.id) });

      try {
        await createNotifications(notifInputs);
        qc.invalidateQueries({ queryKey: NOTIF_KEYS.list(user.id) });
        qc.invalidateQueries({ queryKey: NOTIF_KEYS.unread(user.id) });
      } catch {
        // Non-fatal — appointment was already created
      }

      const count = created.length;
      ToastManager.show({
        message: groupMode === 'group'
          ? t('admin.appointments.toast.groupCreated', { count: selectedClients.length })
          : count === 1 ? t('admin.appointments.toast.singleCreated') : t('admin.appointments.toast.multipleCreated', { count }),
        type: 'success',
      });

      setShowCreate(false);
      resetForm();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t('admin.appointments.errors.createFailed');
      Alert.alert(t('common.error'), msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: T.bg }]} edges={['left', 'right']}>
      <StatusBar barStyle="light-content" backgroundColor={T.bg} />

      {/* Header */}
      <View style={[s.header, { borderBottomColor: T.border }]}>
        <TouchableOpacity onPress={openSidebar} style={[s.menuBtn, { backgroundColor: T.bgCard, borderColor: T.border }]} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <View style={[s.menuLine, { backgroundColor: T.textSecondary }]} />
          <View style={[s.menuLine, { width: 14, backgroundColor: T.textSecondary }]} />
          <View style={[s.menuLine, { backgroundColor: T.textSecondary }]} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={[s.title, { color: T.text }]}>{t('coach.appointments.title')}</Text>
          {!isLoading && !error && (
            <Text style={[s.subtitle, { color: T.textMuted }]}>
              {t('coach.appointments.scheduledCount', { count: upcoming.length })}
            </Text>
          )}
        </View>
        <TouchableOpacity onPress={() => setShowCreate(true)} style={[s.newBtn, { backgroundColor: T.accent }]}>
          <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>{t('admin.appointments.newAction')}</Text>
        </TouchableOpacity>
      </View>

      {/* View toggle */}
      <View style={s.viewToggle}>
        <TouchableOpacity
          onPress={() => setViewMode('list')}
          style={[s.toggleBtn, { backgroundColor: viewMode === 'list' ? T.accent : T.bgCard, borderColor: viewMode === 'list' ? T.accent : T.border }]}
        >
          <Text style={{ fontSize: 12, fontWeight: '700', color: viewMode === 'list' ? '#fff' : T.textSecondary }}>{t('admin.appointments.viewToggle.list')}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setViewMode('calendar')}
          style={[s.toggleBtn, { backgroundColor: viewMode === 'calendar' ? T.accent : T.bgCard, borderColor: viewMode === 'calendar' ? T.accent : T.border }]}
        >
          <Text style={{ fontSize: 12, fontWeight: '700', color: viewMode === 'calendar' ? '#fff' : T.textSecondary }}>{t('admin.appointments.viewToggle.calendar')}</Text>
        </TouchableOpacity>
      </View>

      {/* Calendar date strip — only in calendar mode */}
      {viewMode === 'calendar' && (
        <View style={[s.dateStripWrapper, { borderBottomColor: T.border }]}>
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
                  style={[s.calDateBtn, {
                    backgroundColor: active ? T.accent : T.bgCard,
                    borderColor: active ? T.accent : isToday ? T.accent + '66' : T.border,
                  }]}
                >
                  <Text style={{ fontSize: 9, color: active ? '#fff' : T.textMuted, fontWeight: '600' }}>
                    {d.toLocaleDateString('es-CR', { weekday: 'short' }).toUpperCase()}
                  </Text>
                  <Text style={{ fontSize: 16, fontWeight: '800', color: active ? '#fff' : T.text }}>{d.getDate()}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      )}

      {viewMode === 'calendar' ? (
        <View style={{ flex: 1 }}>
          <CalendarDayView appointments={appointments} selectedDate={calendarDate} />
        </View>
      ) : isLoading ? (
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
          onRefresh={refetch}
          refreshing={false}
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

      {/* ── Create form modal ── */}
      <Modal visible={showCreate} transparent animationType="slide" onRequestClose={() => { setShowCreate(false); resetForm(); }}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <View style={s.overlay}>
            <View style={[s.sheet, { backgroundColor: T.bgCard }]}>
              <View style={s.handle} />
              <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                <Text style={[s.sheetTitle, { color: T.text }]}>{t('admin.appointments.form.title')}</Text>

                {formErrors.length > 0 && (
                  <View style={[s.errorBox, { backgroundColor: T.redSoft, borderColor: T.red + '55' }]}>
                    {formErrors.map((e, i) => <Text key={i} style={{ color: T.red, fontSize: 13 }}>• {e}</Text>)}
                  </View>
                )}

                {/* Title */}
                <Text style={[s.label, { color: T.textSecondary }]}>{t('admin.appointments.form.titleLabel')}</Text>
                <TextInput
                  style={[s.input, { backgroundColor: T.bg, borderColor: T.border, color: T.text }]}
                  placeholder={t('admin.appointments.form.titlePlaceholder')}
                  placeholderTextColor={T.textMuted}
                  value={title}
                  onChangeText={(v) => { setTitle(v); setFormErrors([]); }}
                />

                {/* Clients — navigate to dedicated screen scoped to assigned clients */}
                <Text style={[s.label, { color: T.textSecondary }]}>{t('navigation.clients')}</Text>
                <TouchableOpacity
                  onPress={() => router.push('/(coach)/select-clients')}
                  style={[s.clientTrigger, { backgroundColor: T.bg, borderColor: selectedClients.length > 0 ? T.accent + '66' : T.border }]}
                >
                  {selectedClients.length === 0 ? (
                    <Text style={{ color: T.textMuted, fontSize: 15, flex: 1 }}>{t('admin.appointments.form.clientSearchPlaceholder')}</Text>
                  ) : (
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, flex: 1 }}>
                      {selectedClients.map((c) => (
                        <View key={c.id} style={[s.chip, { backgroundColor: T.accent + '22', borderColor: T.accent + '55' }]}>
                          <Text style={{ fontSize: 12, color: T.accent, fontWeight: '600' }}>{c.full_name.split(' ')[0]}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                  <Text style={{ color: T.accent, fontSize: 13, fontWeight: '700' }}>
                    {selectedClients.length > 0 ? t('admin.appointments.form.editArrow') : t('admin.appointments.form.selectArrow')}
                  </Text>
                </TouchableOpacity>

                {/* Modalidad — only when multiple clients selected */}
                {selectedClients.length > 1 && (
                  <>
                    <Text style={[s.label, { color: T.textSecondary, marginTop: 16 }]}>{t('admin.appointments.form.participationModeLabel')}</Text>
                    <View style={{ flexDirection: 'row', gap: 10, marginBottom: 12 }}>
                      {(['individual', 'group'] as const).map((mode) => {
                        const active = groupMode === mode;
                        return (
                          <TouchableOpacity key={mode} onPress={() => setGroupMode(mode)}
                            style={{ flex: 1, borderRadius: 12, borderWidth: 1, paddingVertical: 12, alignItems: 'center',
                              backgroundColor: active ? T.accent : T.bgCard, borderColor: active ? T.accent : T.border }}>
                            <Text style={{ fontSize: 14, fontWeight: '700', color: active ? '#fff' : T.textSecondary }}>
                              {mode === 'individual' ? t('admin.appointments.form.individualMode') : t('admin.appointments.form.groupMode')}
                            </Text>
                            <Text style={{ fontSize: 10, color: active ? '#ffffffCC' : T.textMuted, marginTop: 2 }}>
                              {mode === 'individual' ? t('admin.appointments.form.individualModeDesc', { count: selectedClients.length }) : t('admin.appointments.form.groupModeDesc')}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </>
                )}

                {/* Start date */}
                <Text style={[s.label, { color: T.textSecondary, marginTop: 16 }]}>{t('admin.appointments.form.startLabel')}</Text>
                <Text style={{ color: T.text, fontSize: 14, fontWeight: '600', marginBottom: 8 }}>{formatDateLabel(startDate)}</Text>
                <DateStrip selected={startDate} onChange={setStartDate} T={T} />
                <HourPicker hour={startHour} minute={startMin} onHour={setStartHour} onMinute={setStartMin} T={T} />

                {/* Duration */}
                <Text style={[s.label, { color: T.textSecondary, marginTop: 16 }]}>{t('admin.appointments.form.durationLabel')}</Text>
                <DurationPicker selected={durationMin} onSelect={setDurationMin} T={T} />

                {/* Live slot preview — tenue block where the appointment would
                    land, turns red if it overlaps the selected client(s) or you */}
                {durationMin && (() => {
                  const previewStartISO = buildStartISO(startDate, startHour, startMin);
                  const previewEndISO = buildEndISO(previewStartISO, durationMin);
                  const slot = computeSlotConflicts(
                    appointments,
                    previewStartISO,
                    previewEndISO,
                    selectedClients.map((c) => c.id),
                    user?.id
                  );
                  return (
                    <DayPreviewStrip
                      appointments={appointments}
                      date={startDate}
                      startISO={previewStartISO}
                      endISO={previewEndISO}
                      hasConflicts={slot.hasConflicts}
                      T={T}
                      t={t}
                    />
                  );
                })()}

                {/* Summary */}
                {durationMin && (
                  <View style={[s.summary, { backgroundColor: T.accent + '12', borderColor: T.accent + '33' }]}>
                    <Text style={{ color: T.accent, fontSize: 13 }}>
                      🕐 {formatDateLabel(startDate)} · {startHour}:{startMin} → {(() => {
                        const end = new Date(buildEndISO(buildStartISO(startDate, startHour, startMin), durationMin));
                        return end.toLocaleTimeString('es-CR', { hour: '2-digit', minute: '2-digit' });
                      })()}
                    </Text>
                  </View>
                )}

                {/* Tipo de cita */}
                <Text style={[s.label, { color: T.textSecondary, marginTop: 16 }]}>{t('admin.appointments.form.typeLabel')}</Text>
                <View style={{ flexDirection: 'row', gap: 10, marginBottom: 12 }}>
                  {(['in_person', 'virtual'] as const).map((type) => {
                    const active = aptType === type;
                    return (
                      <TouchableOpacity key={type} onPress={() => setAptType(type)}
                        style={{ flex: 1, borderRadius: 12, borderWidth: 1, paddingVertical: 12, alignItems: 'center',
                          backgroundColor: active ? T.accent : T.bgCard, borderColor: active ? T.accent : T.border }}>
                        <Text style={{ fontSize: 14, fontWeight: '700', color: active ? '#fff' : T.textSecondary }}>
                          {type === 'in_person' ? t('admin.appointments.form.inPersonType') : t('admin.appointments.form.virtualType')}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {aptType === 'in_person' ? (
                  <>
                    <Text style={[s.label, { color: T.textSecondary }]}>{t('admin.appointments.form.locationLabel')}</Text>
                    <TextInput
                      style={[s.input, { backgroundColor: T.bg, borderColor: T.border, color: T.text }]}
                      placeholder={t('admin.appointments.form.locationPlaceholder')}
                      placeholderTextColor={T.textMuted}
                      value={location}
                      onChangeText={setLocation}
                    />
                  </>
                ) : (
                  <>
                    <Text style={[s.label, { color: T.textSecondary }]}>{t('admin.appointments.form.meetingUrlLabel')}</Text>
                    <TextInput
                      style={[s.input, { backgroundColor: T.bg, borderColor: T.border, color: T.text }]}
                      placeholder={t('admin.appointments.form.meetingUrlPlaceholder')}
                      placeholderTextColor={T.textMuted}
                      value={meetingUrl}
                      onChangeText={setMeetingUrl}
                      autoCapitalize="none"
                      keyboardType="url"
                    />
                  </>
                )}

                {/* Notas */}
                <Text style={[s.label, { color: T.textSecondary }]}>{t('admin.appointments.form.notesLabel')}</Text>
                <TextInput
                  style={[s.input, { backgroundColor: T.bg, borderColor: T.border, color: T.text, minHeight: 64, textAlignVertical: 'top' }]}
                  placeholder={t('admin.appointments.form.notesPlaceholder')}
                  placeholderTextColor={T.textMuted}
                  value={notes}
                  onChangeText={setNotes}
                  multiline
                />

                {/* Actions */}
                <View style={s.actions}>
                  <TouchableOpacity onPress={() => { setShowCreate(false); resetForm(); }}
                    style={[s.btn, { borderColor: T.border, borderWidth: 1 }]}>
                    <Text style={{ color: T.text, fontWeight: '600' }}>{t('common.cancel')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={handleCreate} disabled={isSubmitting || isCheckingConflicts}
                    style={[s.btn, { backgroundColor: T.accent }]}>
                    {(isSubmitting || isCheckingConflicts)
                      ? <ActivityIndicator color="#fff" size="small" />
                      : <Text style={{ color: '#fff', fontWeight: '700' }}>
                          {groupMode === 'group' && selectedClients.length > 1
                            ? t('admin.appointments.form.submitGroup', { count: selectedClients.length })
                            : selectedClients.length > 1 ? t('admin.appointments.form.submitMultiple', { count: selectedClients.length }) : t('admin.appointments.form.submitSingle')}
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

const s = StyleSheet.create({
  safe: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth },
  menuBtn: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center', gap: 4, borderWidth: 1 },
  menuLine: { width: 18, height: 2, borderRadius: 1 },
  title: { fontSize: 22, fontWeight: '800' },
  subtitle: { fontSize: 13, marginTop: 2 },
  newBtn: { borderRadius: 20, paddingHorizontal: 16, paddingVertical: 9 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  card: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, padding: 14, marginBottom: 8 },
  icon: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  aptTitle: { fontSize: 15, fontWeight: '700' },
  aptMeta: { fontSize: 12, marginTop: 2 },
  aptTime: { fontSize: 11, marginTop: 2 },
  viewToggle: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingTop: 10, paddingBottom: 4 },
  toggleBtn: { borderRadius: 20, borderWidth: 1, paddingHorizontal: 16, paddingVertical: 7 },
  dateStripWrapper: { paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth },
  calDateBtn: { borderRadius: 10, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 8, alignItems: 'center', marginRight: 6, minWidth: 44 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: '92%' },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.2)', alignSelf: 'center', marginBottom: 16 },
  sheetTitle: { fontSize: 20, fontWeight: '800', marginBottom: 20 },
  label: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 8 },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, marginBottom: 16 },
  clientTrigger: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 4, minHeight: 48, flexWrap: 'wrap', gap: 4 },
  chip: { borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1 },
  errorBox: { borderRadius: 10, borderWidth: 1, padding: 12, marginBottom: 16, gap: 4 },
  summary: { borderRadius: 10, borderWidth: 1, padding: 12, marginTop: 12 },
  actions: { flexDirection: 'row', gap: 12, marginTop: 20 },
  btn: { flex: 1, borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
});
