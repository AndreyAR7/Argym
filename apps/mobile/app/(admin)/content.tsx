import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Image,
  StatusBar, Switch, ActivityIndicator, Alert, Modal,
  TextInput, KeyboardAvoidingView, Platform, RefreshControl,
  useWindowDimensions,
} from 'react-native';
import { showToast, ToastNotification } from '@/components/ui/Toast';
import { ActionSheet, type SheetAction } from '@/components/ui/ActionSheet';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '@/hooks/useTheme';
import { AdminTopBar } from '@/components/admin/AdminTopBar';
import { StatusBadge } from '@/components/admin/StatusBadge';
import { useAdminVideos } from '@/hooks/useVideos';
import { useVideosStore } from '@/store/videos.store';
import { useRoutinesStore } from '@/store/routines.store';
import { useAuthStore } from '@/store/auth.store';
import { useClientsWithPlan } from '@/hooks/useProfiles';
import { useRouter } from 'expo-router';
import { uploadVideoFile, uploadThumbnail, getThumbnailPublicUrl, assignVideoToClient } from '@/services/videos.service';
import { addExercise, updateExercise, uploadExerciseDemoVideo, deleteExerciseDemoVideo } from '@/services/routines.service';
import type { Video, VideoLevel, VideoPlan } from '@/types/videos';
import type { Routine, Exercise, RoutineLevel, ExerciseMuscle, RoutinePlan } from '@/types/routines';
import type { NutritionPlan, NutritionStatus } from '@/types/nutrition';
import { NUTRITION_STATUS_LABELS } from '@/types/nutrition';
import { useNutritionStore } from '@/store/nutrition.store';
import { formatDuration, VIDEO_STATUS_LABELS } from '@/types/videos';
import { ROUTINE_LEVEL_LABELS, ROUTINE_PLAN_LABELS, ROUTINE_PLAN_OPTIONS, ROUTINE_LEVEL_OPTIONS, MUSCLE_OPTIONS } from '@/types/routines';

const TABS = ['Rutinas', 'Nutrición', 'Videos'];

const LEVEL_OPTIONS: VideoLevel[] = ['beginner', 'intermediate', 'advanced'];
const LEVEL_LABELS: Record<VideoLevel, string> = {
  beginner: 'Principiante', intermediate: 'Intermedio', advanced: 'Avanzado',
};
const PLAN_OPTIONS: VideoPlan[] = ['basic', 'medium', 'premium'];
const PLAN_LABELS: Record<VideoPlan, string> = { basic: 'Básico', medium: 'Medio', premium: 'Premium' };
const THUMB_COLORS = ['#6C63FF', '#00D68F', '#FF8C42', '#FF4D6D', '#4DA6FF', '#F59E0B', '#10B981'];

// ─── Create/Edit Routine Modal ────────────────────────────────
function RoutineFormModal({ routine, visible, onClose, onSaved, tenantId }: {
  routine?: Routine | null; visible: boolean; onClose: () => void; onSaved: () => void; tenantId: string;
}) {
  const T = useTheme();
  const { user } = useAuthStore();
  const { addRoutine, editRoutine } = useRoutinesStore();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [level, setLevel] = useState<RoutineLevel>('beginner');
  const [allowedPlans, setAllowedPlans] = useState<RoutinePlan[]>([]);
  const [allowedLevels, setAllowedLevels] = useState<RoutineLevel[]>([]);
  const [isTemplate, setIsTemplate] = useState(false);
  const [saving, setSaving] = useState(false);
  const isEdit = !!routine;

  useEffect(() => {
    if (visible) {
      setName(routine?.name ?? '');
      setDescription(routine?.description ?? '');
      setLevel(routine?.level ?? 'beginner');
      setAllowedPlans((routine?.allowed_plans ?? []) as RoutinePlan[]);
      setAllowedLevels((routine?.allowed_levels ?? []) as RoutineLevel[]);
      setIsTemplate(routine?.is_template ?? false);
    }
  }, [visible, routine]);

  const togglePlan = (p: RoutinePlan) =>
    setAllowedPlans((prev) => prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]);
  const toggleAccessLevel = (l: RoutineLevel) =>
    setAllowedLevels((prev) => prev.includes(l) ? prev.filter((x) => x !== l) : [...prev, l]);

  const handleSave = async () => {
    if (!name.trim()) { Alert.alert('Error', 'El nombre es requerido.'); return; }
    setSaving(true);
    try {
      if (isEdit && routine) {
        await editRoutine(routine.id, {
          name: name.trim(), description: description.trim() || null,
          level, allowed_plans: allowedPlans, allowed_levels: allowedLevels, is_template: isTemplate,
        });
      } else {
        await addRoutine({
          tenant_id: tenantId, name: name.trim(), description: description.trim() || null,
          level, allowed_plans: allowedPlans, allowed_levels: allowedLevels,
          is_active: true, is_template: isTemplate, created_by: user?.id ?? null,
        });
      }
      onSaved(); onClose();
    } catch (e: any) { Alert.alert('Error', e.message); }
    finally { setSaving(false); }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <View style={styles.modalOverlay}>
          <View style={[styles.sheet, { backgroundColor: T.bgCard }]}>
            <View style={styles.handle} />
            <ScrollView keyboardShouldPersistTaps="handled">
              <Text style={[styles.sheetTitle, { color: T.text }]}>{isEdit ? 'Editar rutina' : 'Nueva rutina'}</Text>

              <Text style={[styles.label, { color: T.textSecondary }]}>Nombre *</Text>
              <TextInput style={[styles.input, { backgroundColor: T.bg, borderColor: T.border, color: T.text }]}
                value={name} onChangeText={setName} placeholder="Ej: Fuerza — Tren Superior" placeholderTextColor={T.textMuted} />

              <Text style={[styles.label, { color: T.textSecondary }]}>Descripción</Text>
              <TextInput style={[styles.input, { backgroundColor: T.bg, borderColor: T.border, color: T.text, minHeight: 64, textAlignVertical: 'top' }]}
                value={description} onChangeText={setDescription} placeholder="Descripción de la rutina..." placeholderTextColor={T.textMuted} multiline />

              <Text style={[styles.label, { color: T.textSecondary }]}>Nivel de rutina</Text>
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
                {ROUTINE_LEVEL_OPTIONS.map((l) => (
                  <TouchableOpacity key={`rl-${l}`} onPress={() => setLevel(l)}
                    style={[styles.chip, { flex: 1, justifyContent: 'center', backgroundColor: level === l ? T.accent : T.bg, borderColor: level === l ? T.accent : T.border }]}>
                    <Text style={{ fontSize: 11, fontWeight: '600', color: level === l ? '#fff' : T.textSecondary, textAlign: 'center' }}>{ROUTINE_LEVEL_LABELS[l]}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={[styles.label, { color: T.textSecondary }]}>Plan con acceso (vacío = todos)</Text>
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
                {ROUTINE_PLAN_OPTIONS.map((p) => (
                  <TouchableOpacity key={`rp-${p}`} onPress={() => togglePlan(p)}
                    style={[styles.chip, { flex: 1, justifyContent: 'center', backgroundColor: allowedPlans.includes(p) ? T.accent : T.bg, borderColor: allowedPlans.includes(p) ? T.accent : T.border }]}>
                    <Text style={{ fontSize: 11, fontWeight: '600', color: allowedPlans.includes(p) ? '#fff' : T.textSecondary, textAlign: 'center' }}>{ROUTINE_PLAN_LABELS[p]}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={[styles.label, { color: T.textSecondary }]}>Niveles con acceso (vacío = todos)</Text>
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
                {ROUTINE_LEVEL_OPTIONS.map((l) => (
                  <TouchableOpacity key={`ral-${l}`} onPress={() => toggleAccessLevel(l)}
                    style={[styles.chip, { flex: 1, justifyContent: 'center', backgroundColor: allowedLevels.includes(l) ? T.accent : T.bg, borderColor: allowedLevels.includes(l) ? T.accent : T.border }]}>
                    <Text style={{ fontSize: 11, fontWeight: '600', color: allowedLevels.includes(l) ? '#fff' : T.textSecondary, textAlign: 'center' }}>{ROUTINE_LEVEL_LABELS[l]}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                <Text style={[styles.label, { color: T.textSecondary, marginBottom: 0 }]}>Plantilla reutilizable</Text>
                <Switch value={isTemplate} onValueChange={setIsTemplate} trackColor={{ true: T.accent, false: T.border }} />
              </View>

              <View style={{ flexDirection: 'row', gap: 12 }}>
                <TouchableOpacity onPress={onClose} style={[styles.btn, { borderColor: T.border, borderWidth: 1, flex: 1 }]}>
                  <Text style={{ color: T.text, fontWeight: '600' }}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleSave} disabled={saving} style={[styles.btn, { backgroundColor: T.accent, flex: 1 }]}>
                  <Text style={{ color: '#fff', fontWeight: '700' }}>{saving ? 'Guardando...' : 'Guardar'}</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Exercise Form Modal ──────────────────────────────────────
function ExerciseFormModal({ routineId, tenantId, exercise, visible, onClose, onSaved }: {
  routineId: string; tenantId: string; exercise?: Exercise | null;
  visible: boolean; onClose: () => void; onSaved: () => void;
}) {
  const T = useTheme();
  const { editExercise } = useRoutinesStore();
  const [name, setName] = useState('');
  const [muscle, setMuscle] = useState<ExerciseMuscle>('General');
  const [sets, setSets] = useState('3');
  const [reps, setReps] = useState('10');
  const [rest, setRest] = useState('60');
  const [notes, setNotes] = useState('');

  // Demo video state
  const [demoVideoPath, setDemoVideoPath] = useState<string | null>(null);
  const [localDemoUri, setLocalDemoUri] = useState<string | null>(null);
  const [localDemoMime, setLocalDemoMime] = useState('video/mp4');
  const [pendingDeleteDemo, setPendingDeleteDemo] = useState(false);
  const [uploadMsg, setUploadMsg] = useState('');

  const [saving, setSaving] = useState(false);
  const isEdit = !!exercise;

  useEffect(() => {
    if (visible) {
      setName(exercise?.name ?? '');
      setMuscle(exercise?.muscle ?? 'General');
      setSets(String(exercise?.sets ?? 3));
      setReps(String(exercise?.reps ?? 10));
      setRest(String(exercise?.rest_seconds ?? 60));
      setNotes(exercise?.notes ?? '');
      setDemoVideoPath(exercise?.demo_video_storage_path ?? null);
      setLocalDemoUri(null);
      setPendingDeleteDemo(false);
      setUploadMsg('');
    }
  }, [visible, exercise]);

  const pickDemoVideo = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'videos' as any,
      quality: 1,
      videoMaxDuration: 300,
    });
    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];
    setLocalDemoUri(asset.uri);
    setLocalDemoMime(asset.mimeType ?? 'video/mp4');
    setPendingDeleteDemo(false);
  };

  const recordDemoVideo = async () => {
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: 'videos' as any,
      quality: 1,
      videoMaxDuration: 300,
    });
    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];
    setLocalDemoUri(asset.uri);
    setLocalDemoMime(asset.mimeType ?? 'video/mp4');
    setPendingDeleteDemo(false);
  };

  const handleRemoveDemo = () => {
    setLocalDemoUri(null);
    setDemoVideoPath(null);
    setPendingDeleteDemo(true);
  };

  const handleSave = async () => {
    if (!name.trim()) { Alert.alert('Error', 'El nombre es requerido.'); return; }
    setSaving(true);
    try {
      const basicFields = {
        name: name.trim(), muscle,
        sets: parseInt(sets) || 3, reps: parseInt(reps) || 10,
        rest_seconds: parseInt(rest) || 60, notes: notes.trim() || null,
      };

      let exerciseId: string;

      if (isEdit && exercise) {
        // Delete old video from storage if replacing or removing
        if ((pendingDeleteDemo || localDemoUri) && exercise.demo_video_storage_path) {
          await deleteExerciseDemoVideo(exercise.demo_video_storage_path).catch(() => {});
        }
        const demoFields = pendingDeleteDemo && !localDemoUri
          ? { demo_video_storage_path: null, demo_video_bucket: null, demo_video_mime_type: null }
          : {};
        await editExercise(exercise.id, { ...basicFields, ...demoFields });
        exerciseId = exercise.id;
      } else {
        // Create exercise first (need the ID for storage path)
        const created = await addExercise({
          routine_id: routineId, tenant_id: tenantId, sort_order: 0,
          demo_video_storage_path: null, demo_video_bucket: null,
          demo_video_mime_type: null, demo_duration_seconds: null,
          ...basicFields,
        });
        exerciseId = created.id;
      }

      // Upload new demo video if selected
      if (localDemoUri) {
        setUploadMsg('Subiendo video demo...');
        const ext = localDemoUri.split('.').pop()?.split('?')[0] ?? 'mp4';
        const storagePath = await uploadExerciseDemoVideo(
          tenantId, exerciseId,
          { uri: localDemoUri, mimeType: localDemoMime, extension: ext },
          (pct) => setUploadMsg(`Subiendo video... ${pct}%`),
        );
        await updateExercise(exerciseId, {
          demo_video_storage_path: storagePath,
          demo_video_bucket: 'exercise-demos',
          demo_video_mime_type: localDemoMime,
        });
      }

      onSaved(); onClose();
    } catch (e: any) { Alert.alert('Error', e.message); }
    finally { setSaving(false); setUploadMsg(''); }
  };

  const hasDemo = (demoVideoPath || localDemoUri) && !pendingDeleteDemo;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <View style={styles.modalOverlay}>
          <View style={[styles.sheet, { backgroundColor: T.bgCard }]}>
            <View style={styles.handle} />
            <ScrollView keyboardShouldPersistTaps="handled">
              <Text style={[styles.sheetTitle, { color: T.text }]}>{isEdit ? 'Editar ejercicio' : 'Nuevo ejercicio'}</Text>
              <Text style={[styles.label, { color: T.textSecondary }]}>Nombre *</Text>
              <TextInput style={[styles.input, { backgroundColor: T.bg, borderColor: T.border, color: T.text }]}
                value={name} onChangeText={setName} placeholder="Ej: Press de Banca" placeholderTextColor={T.textMuted} />
              <Text style={[styles.label, { color: T.textSecondary }]}>Músculo</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
                {MUSCLE_OPTIONS.map((m) => (
                  <TouchableOpacity key={m} onPress={() => setMuscle(m)}
                    style={[styles.chip, { marginRight: 8, backgroundColor: muscle === m ? T.accent : T.bg, borderColor: muscle === m ? T.accent : T.border }]}>
                    <Text style={{ fontSize: 12, fontWeight: '600', color: muscle === m ? '#fff' : T.textSecondary }}>{m}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}>
                {[{ label: 'Series', value: sets, set: setSets }, { label: 'Reps', value: reps, set: setReps }, { label: 'Descanso (s)', value: rest, set: setRest }].map((f) => (
                  <View key={f.label} style={{ flex: 1 }}>
                    <Text style={[styles.label, { color: T.textSecondary }]}>{f.label}</Text>
                    <TextInput style={[styles.input, { backgroundColor: T.bg, borderColor: T.border, color: T.text, marginBottom: 0 }]}
                      value={f.value} onChangeText={f.set} keyboardType="numeric" placeholderTextColor={T.textMuted} />
                  </View>
                ))}
              </View>
              <Text style={[styles.label, { color: T.textSecondary }]}>Notas</Text>
              <TextInput style={[styles.input, { backgroundColor: T.bg, borderColor: T.border, color: T.text }]}
                value={notes} onChangeText={setNotes} placeholder="Instrucciones opcionales..." placeholderTextColor={T.textMuted} />

              {/* ── Video de demostración ── */}
              <Text style={[styles.label, { color: T.textSecondary }]}>Video de demostración</Text>
              {hasDemo ? (
                <View style={[styles.demoVideoRow, { backgroundColor: T.bg, borderColor: T.green + '66' }]}>
                  <Text style={{ fontSize: 22 }}>🎬</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: T.green }}>
                      {localDemoUri ? 'Video listo para guardar' : 'Video guardado ✓'}
                    </Text>
                    <Text style={{ fontSize: 11, color: T.textMuted, marginTop: 2 }}>
                      {localDemoUri ? 'Se subirá al guardar el ejercicio' : 'Los clientes podrán verlo en su rutina'}
                    </Text>
                  </View>
                  <TouchableOpacity onPress={handleRemoveDemo} style={{ padding: 4 }}>
                    <Text style={{ fontSize: 11, color: T.red, fontWeight: '700' }}>Eliminar</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
                  <TouchableOpacity onPress={pickDemoVideo}
                    style={[styles.demoBtn, { flex: 1, borderColor: T.border, backgroundColor: T.bg }]}>
                    <Text style={{ fontSize: 20 }}>📁</Text>
                    <Text style={{ fontSize: 12, fontWeight: '600', color: T.textSecondary, marginTop: 4 }}>Galería</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={recordDemoVideo}
                    style={[styles.demoBtn, { flex: 1, borderColor: T.accent + '66', backgroundColor: T.accent + '10' }]}>
                    <Text style={{ fontSize: 20 }}>🎥</Text>
                    <Text style={{ fontSize: 12, fontWeight: '600', color: T.accent, marginTop: 4 }}>Grabar</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Upload progress */}
              {uploadMsg ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12, padding: 12, borderRadius: 10, backgroundColor: T.accent + '12' }}>
                  <ActivityIndicator size="small" color={T.accent} />
                  <Text style={{ color: T.accent, fontSize: 13, fontWeight: '600' }}>{uploadMsg}</Text>
                </View>
              ) : null}

              <View style={{ flexDirection: 'row', gap: 12 }}>
                <TouchableOpacity onPress={onClose} style={[styles.btn, { borderColor: T.border, borderWidth: 1, flex: 1 }]}>
                  <Text style={{ color: T.text, fontWeight: '600' }}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleSave} disabled={saving} style={[styles.btn, { backgroundColor: T.accent, flex: 1 }]}>
                  <Text style={{ color: '#fff', fontWeight: '700' }}>{saving ? (uploadMsg || 'Guardando...') : 'Guardar'}</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Client Picker Sheet ──────────────────────────────────────
type PickerLevel = 'all' | 'beginner' | 'intermediate' | 'advanced';

const PICKER_LEVEL_TABS: { key: PickerLevel; emoji: string; label: string }[] = [
  { key: 'all',          emoji: '👥', label: 'Todos' },
  { key: 'beginner',     emoji: '🌱', label: 'Principiante' },
  { key: 'intermediate', emoji: '💪', label: 'Intermedio' },
  { key: 'advanced',     emoji: '🏆', label: 'Avanzado' },
];

function ClientPickerSheet({
  clients, loading, error, selectedId, onSelect, onRetry, resetKey,
}: {
  clients: any[]; loading: boolean; error: any;
  selectedId: string | null; onSelect: (id: string) => void;
  onRetry?: () => void; resetKey?: number;
}) {
  const T = useTheme();
  const [search, setSearch] = useState('');
  const [levelFilter, setLevelFilter] = useState<PickerLevel>('all');

  useEffect(() => { setSearch(''); setLevelFilter('all'); }, [resetKey]);

  const unique = useMemo(
    () => clients.filter((c, i, arr) => arr.findIndex((x) => x.id === c.id) === i),
    [clients]
  );

  const levelCounts = useMemo(() => ({
    all:          unique.length,
    beginner:     unique.filter((c) => c.client_level === 'beginner').length,
    intermediate: unique.filter((c) => c.client_level === 'intermediate').length,
    advanced:     unique.filter((c) => c.client_level === 'advanced').length,
  }), [unique]);

  const filtered = useMemo(() => {
    let list = levelFilter === 'all' ? unique : unique.filter((c) => c.client_level === levelFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((c) => (c.full_name ?? '').toLowerCase().includes(q));
    }
    return list;
  }, [unique, levelFilter, search]);

  if (loading) {
    return (
      <View style={{ paddingVertical: 32, alignItems: 'center' }}>
        <ActivityIndicator color={T.accent} />
        <Text style={{ color: T.textMuted, fontSize: 13, marginTop: 8 }}>Cargando clientes...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={{ paddingVertical: 24, alignItems: 'center', gap: 8 }}>
        <Text style={{ color: T.red, fontSize: 13, textAlign: 'center' }}>
          Error al cargar clientes.{'\n'}{(error as any)?.message}
        </Text>
        {onRetry && (
          <TouchableOpacity onPress={onRetry}>
            <Text style={{ color: T.accent, fontWeight: '700' }}>Reintentar</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <View style={[pickerStyles.searchBar, { backgroundColor: T.bg, borderColor: T.border }]}>
        <Text style={{ fontSize: 15, marginRight: 8 }}>🔍</Text>
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Buscar por nombre..."
          placeholderTextColor={T.textMuted}
          style={{ flex: 1, color: T.text, fontSize: 14 }}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Text style={{ color: T.textMuted, fontSize: 16, paddingLeft: 4 }}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false}
        style={{ height: 44, marginBottom: 10 }}
        contentContainerStyle={{ gap: 6, paddingRight: 4, alignItems: 'center' }}>
        {PICKER_LEVEL_TABS.map((tab) => {
          const active = levelFilter === tab.key;
          const count = levelCounts[tab.key];
          return (
            <TouchableOpacity key={tab.key} onPress={() => setLevelFilter(tab.key)}
              style={[pickerStyles.levelTab, {
                backgroundColor: active ? T.accent + '18' : T.bg,
                borderColor: active ? T.accent : T.border,
              }]}>
              <Text style={{ fontSize: 13 }}>{tab.emoji}</Text>
              <Text style={{ fontSize: 12, fontWeight: active ? '700' : '500', color: active ? T.accent : T.textSecondary }}>
                {tab.label}
              </Text>
              <View style={[pickerStyles.countBadge, { backgroundColor: active ? T.accent : T.bgCard }]}>
                <Text style={{ fontSize: 10, fontWeight: '700', color: active ? '#fff' : T.textMuted }}>{count}</Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
        {filtered.length === 0 ? (
          <View style={{ paddingVertical: 24, alignItems: 'center' }}>
            <Text style={{ fontSize: 28, marginBottom: 8 }}>👤</Text>
            <Text style={{ color: T.textMuted, fontSize: 13, textAlign: 'center' }}>
              {search.trim() ? 'Sin resultados para tu búsqueda.' : 'Sin clientes en este nivel.'}
            </Text>
          </View>
        ) : (
          filtered.map((c: any) => {
            const active = selectedId === c.id;
            const levelEmoji = c.client_level === 'beginner' ? '🌱'
              : c.client_level === 'intermediate' ? '💪'
              : c.client_level === 'advanced' ? '🏆' : null;
            return (
              <TouchableOpacity key={`picker-${c.id}`} onPress={() => onSelect(c.id)}
                style={[pickerStyles.clientRow, { borderBottomColor: T.border, backgroundColor: active ? T.accent + '0D' : 'transparent' }]}>
                <View style={[pickerStyles.avatar, { backgroundColor: active ? T.accent + '30' : T.bgCard }]}>
                  <Text style={{ fontSize: 13, fontWeight: '800', color: active ? T.accent : T.textSecondary }}>
                    {c.full_name?.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase()}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: T.text, fontSize: 14, fontWeight: active ? '700' : '400' }}>{c.full_name}</Text>
                  <View style={{ flexDirection: 'row', gap: 6, marginTop: 2, flexWrap: 'wrap' }}>
                    {levelEmoji && (
                      <Text style={{ fontSize: 11, color: T.textMuted }}>{levelEmoji} {LEVEL_LABELS[c.client_level as VideoLevel]}</Text>
                    )}
                    {c.plan_name && <Text style={{ fontSize: 11, color: T.textMuted }}>· {c.plan_name}</Text>}
                  </View>
                </View>
                {active && (
                  <View style={[pickerStyles.checkCircle, { backgroundColor: T.accent }]}>
                    <Text style={{ color: '#fff', fontSize: 11, fontWeight: '800' }}>✓</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

const pickerStyles = StyleSheet.create({
  searchBar: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1, borderRadius: 12,
    paddingHorizontal: 12, paddingVertical: 10,
    marginBottom: 10,
  },
  levelTab: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingVertical: 7, paddingHorizontal: 10,
    borderRadius: 20, borderWidth: 1,
  },
  countBadge: {
    minWidth: 18, height: 18, borderRadius: 9,
    justifyContent: 'center', alignItems: 'center', paddingHorizontal: 4,
  },
  clientRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 11, borderBottomWidth: StyleSheet.hairlineWidth, gap: 12,
  },
  avatar: {
    width: 36, height: 36, borderRadius: 10,
    justifyContent: 'center', alignItems: 'center',
  },
  checkCircle: {
    width: 22, height: 22, borderRadius: 11,
    justifyContent: 'center', alignItems: 'center',
  },
});

// ─── Assign Routine Modal ─────────────────────────────────────
function AssignRoutineModal({ routine, visible, onClose, tenantId }: {
  routine: Routine | null; visible: boolean; onClose: () => void; tenantId: string;
}) {
  const T = useTheme();
  const { user } = useAuthStore();
  const { data: clients = [], isLoading: loadingClients, error: clientsError, refetch } = useClientsWithPlan();
  const { assignRoutine } = useRoutinesStore();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [resetKey, setResetKey] = useState(0);

  useEffect(() => { if (visible) { setSelectedId(null); setResetKey((k) => k + 1); refetch(); } }, [visible]);

  const handleAssign = async () => {
    if (!routine || !selectedId || !user?.id) return;
    setSaving(true);
    try {
      await assignRoutine(routine.id, selectedId, tenantId, user.id);
      showToast('Rutina asignada correctamente');
      onClose();
    } catch (e: any) { Alert.alert('Error', e.message); }
    finally { setSaving(false); }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={[styles.sheet, { backgroundColor: T.bgCard, height: '82%' }]}>
          <View style={styles.handle} />
          <Text style={[styles.sheetTitle, { color: T.text }]}>Asignar rutina</Text>
          {routine && (
            <Text style={{ fontSize: 13, color: T.textSecondary, marginBottom: 12, marginTop: -12 }}>
              {routine.name}
            </Text>
          )}
          <ClientPickerSheet
            clients={clients} loading={loadingClients} error={clientsError}
            selectedId={selectedId} onSelect={setSelectedId} onRetry={refetch}
            resetKey={resetKey}
          />
          <View style={{ flexDirection: 'row', gap: 12, marginTop: 16 }}>
            <TouchableOpacity onPress={onClose} style={[styles.btn, { borderColor: T.border, borderWidth: 1, flex: 1 }]}>
              <Text style={{ color: T.text, fontWeight: '600' }}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleAssign} disabled={!selectedId || saving} style={[styles.btn, { backgroundColor: selectedId ? T.accent : T.bgCard, flex: 1, opacity: selectedId ? 1 : 0.5 }]}>
              <Text style={{ color: selectedId ? '#fff' : T.textMuted, fontWeight: '700' }}>{saving ? 'Asignando...' : 'Asignar'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ─── Edit Video Modal ─────────────────────────────────────────
function EditVideoModal({ video, visible, onClose, onSaved }: {
  video: Video | null; visible: boolean; onClose: () => void; onSaved: () => void;
}) {
  const T = useTheme();
  const { editVideo } = useVideosStore();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [level, setLevel] = useState<VideoLevel>('beginner');
  const [allowedPlans, setAllowedPlans] = useState<VideoPlan[]>([]);
  const [allowedLevels, setAllowedLevels] = useState<VideoLevel[]>([]);
  const [isFeatured, setIsFeatured] = useState(false);
  const [isFree, setIsFree] = useState(false);
  const [saving, setSaving] = useState(false);

  React.useEffect(() => {
    if (video && visible) {
      setTitle(video.title);
      setDescription(video.description ?? '');
      setLevel(video.level);
      setAllowedPlans((video.allowed_plans ?? []) as VideoPlan[]);
      setAllowedLevels((video.allowed_levels ?? []) as VideoLevel[]);
      setIsFeatured(video.is_featured);
      setIsFree(video.is_free ?? false);
    }
  }, [video, visible]);

  const togglePlan = (p: VideoPlan) =>
    setAllowedPlans((prev) => prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]);
  const toggleLevel = (l: VideoLevel) =>
    setAllowedLevels((prev) => prev.includes(l) ? prev.filter((x) => x !== l) : [...prev, l]);

  const handleSave = async () => {
    if (!video || !title.trim()) { Alert.alert('Error', 'El título es requerido.'); return; }
    setSaving(true);
    try {
      await editVideo(video.id, {
        title: title.trim(),
        description: description.trim() || null,
        level,
        allowed_plans: allowedPlans,
        allowed_levels: allowedLevels,
        is_featured: isFeatured,
        is_free: isFree,
      });
      onSaved(); onClose();
    } catch (e: any) { Alert.alert('Error', e.message); }
    finally { setSaving(false); }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <View style={styles.modalOverlay}>
          <View style={[styles.sheet, { backgroundColor: T.bgCard }]}>
            <View style={styles.handle} />
            <ScrollView keyboardShouldPersistTaps="handled">
              <Text style={[styles.sheetTitle, { color: T.text }]}>Editar video</Text>

              <Text style={[styles.label, { color: T.textSecondary }]}>Título *</Text>
              <TextInput style={[styles.input, { backgroundColor: T.bg, borderColor: T.border, color: T.text }]}
                value={title} onChangeText={setTitle} placeholder="Título del video" placeholderTextColor={T.textMuted} />

              <Text style={[styles.label, { color: T.textSecondary }]}>Descripción</Text>
              <TextInput style={[styles.input, { backgroundColor: T.bg, borderColor: T.border, color: T.text, minHeight: 64, textAlignVertical: 'top' }]}
                value={description} onChangeText={setDescription} placeholder="Descripción..." placeholderTextColor={T.textMuted} multiline />

              <Text style={[styles.label, { color: T.textSecondary }]}>Nivel del video</Text>
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
                {LEVEL_OPTIONS.map((l) => (
                  <TouchableOpacity key={`edit-level-${l}`} onPress={() => setLevel(l)}
                    style={[styles.chip, { flex: 1, justifyContent: 'center', backgroundColor: level === l ? T.accent : T.bg, borderColor: level === l ? T.accent : T.border }]}>
                    <Text style={{ fontSize: 11, fontWeight: '600', color: level === l ? '#fff' : T.textSecondary, textAlign: 'center' }}>{LEVEL_LABELS[l]}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={[styles.label, { color: T.textSecondary }]}>Planes con acceso (vacío = todos)</Text>
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
                {PLAN_OPTIONS.map((p) => (
                  <TouchableOpacity key={`edit-plan-${p}`} onPress={() => togglePlan(p)}
                    style={[styles.chip, { flex: 1, justifyContent: 'center', backgroundColor: allowedPlans.includes(p) ? T.accent : T.bg, borderColor: allowedPlans.includes(p) ? T.accent : T.border }]}>
                    <Text style={{ fontSize: 11, fontWeight: '600', color: allowedPlans.includes(p) ? '#fff' : T.textSecondary, textAlign: 'center' }}>{PLAN_LABELS[p]}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={[styles.label, { color: T.textSecondary }]}>Niveles con acceso (vacío = todos)</Text>
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
                {LEVEL_OPTIONS.map((l) => (
                  <TouchableOpacity key={`edit-access-${l}`} onPress={() => toggleLevel(l)}
                    style={[styles.chip, { flex: 1, justifyContent: 'center', backgroundColor: allowedLevels.includes(l) ? T.accent : T.bg, borderColor: allowedLevels.includes(l) ? T.accent : T.border }]}>
                    <Text style={{ fontSize: 11, fontWeight: '600', color: allowedLevels.includes(l) ? '#fff' : T.textSecondary, textAlign: 'center' }}>{LEVEL_LABELS[l]}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <Text style={[styles.label, { color: T.textSecondary, marginBottom: 0 }]}>Destacado</Text>
                <Switch value={isFeatured} onValueChange={setIsFeatured} trackColor={{ true: T.accent, false: T.border }} />
              </View>

              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.label, { color: T.textSecondary, marginBottom: 0 }]}>Acceso libre</Text>
                  <Text style={{ fontSize: 11, color: T.textMuted, marginBottom: 16 }}>Visible para todos sin suscripción</Text>
                </View>
                <Switch value={isFree} onValueChange={setIsFree} trackColor={{ true: T.green, false: T.border }} />
              </View>

              <View style={{ flexDirection: 'row', gap: 12 }}>
                <TouchableOpacity onPress={onClose} style={[styles.btn, { borderColor: T.border, borderWidth: 1, flex: 1 }]}>
                  <Text style={{ color: T.text, fontWeight: '600' }}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleSave} disabled={saving} style={[styles.btn, { backgroundColor: T.accent, flex: 1 }]}>
                  <Text style={{ color: '#fff', fontWeight: '700' }}>{saving ? 'Guardando...' : 'Guardar'}</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Assign Video Modal ───────────────────────────────────────
// Two modes:
//   "Por Nivel"       → updates video.allowed_levels[] (global access for all clients at those levels)
//   "Usuario Directo" → inserts into video_assignments (direct per-client access)
function AssignVideoModal({ video, visible, onClose, onSaved }: {
  video: Video | null; visible: boolean; onClose: () => void; onSaved?: () => void;
}) {
  const T = useTheme();
  const { user } = useAuthStore();
  const { data: clients = [], isLoading: loadingClients, error: clientsError, refetch } = useClientsWithPlan();
  const { editVideo } = useVideosStore();
  const [mode, setMode] = useState<'level' | 'direct'>('level');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedLevels, setSelectedLevels] = useState<VideoLevel[]>([]);
  const [saving, setSaving] = useState(false);
  const [pickerResetKey, setPickerResetKey] = useState(0);

  useEffect(() => {
    if (visible) {
      setSelectedId(null);
      setSelectedLevels((video?.allowed_levels ?? []) as VideoLevel[]);
      setMode('level');
      setPickerResetKey((k) => k + 1);
      refetch();
    }
  }, [visible, video]);

  const toggleLevel = (l: VideoLevel) =>
    setSelectedLevels((prev) => prev.includes(l) ? prev.filter((x) => x !== l) : [...prev, l]);

  const handleAssignByLevel = async () => {
    if (!video) return;
    setSaving(true);
    try {
      await editVideo(video.id, { allowed_levels: selectedLevels });
      const msg = selectedLevels.length === 0
        ? 'Acceso por nivel desactivado'
        : `Acceso global: ${selectedLevels.map((l) => LEVEL_LABELS[l]).join(', ')}`;
      showToast(msg);
      onSaved?.();
      onClose();
    } catch (e: any) { Alert.alert('Error', e.message); }
    finally { setSaving(false); }
  };

  const handleAssignDirect = async () => {
    if (!video || !selectedId || !user?.id || !user?.tenant_id) return;
    setSaving(true);
    try {
      await assignVideoToClient(video.id, selectedId, user.tenant_id, user.id);
      showToast('Video asignado al cliente');
      onClose();
    } catch (e: any) { Alert.alert('Error', e.message); }
    finally { setSaving(false); }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={[styles.sheet, { backgroundColor: T.bgCard, height: '85%' }]}>
          <View style={styles.handle} />
          <Text style={[styles.sheetTitle, { color: T.text }]}>Asignar video</Text>
          {video && (
            <Text style={{ fontSize: 12, color: T.textSecondary, marginTop: -16, marginBottom: 16 }} numberOfLines={1}>
              {video.title}
            </Text>
          )}

          {/* Mode selector */}
          <View style={{ flexDirection: 'row', gap: 6, marginBottom: 20, backgroundColor: T.bg, borderRadius: 10, padding: 4 }}>
            <TouchableOpacity onPress={() => setMode('level')} style={{
              flex: 1, paddingVertical: 9, alignItems: 'center', borderRadius: 8,
              backgroundColor: mode === 'level' ? T.accent : 'transparent',
            }}>
              <Text style={{ fontSize: 12, fontWeight: '700', color: mode === 'level' ? '#fff' : T.textMuted }}>
                🎯 Por Nivel
              </Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setMode('direct')} style={{
              flex: 1, paddingVertical: 9, alignItems: 'center', borderRadius: 8,
              backgroundColor: mode === 'direct' ? T.accent : 'transparent',
            }}>
              <Text style={{ fontSize: 12, fontWeight: '700', color: mode === 'direct' ? '#fff' : T.textMuted }}>
                👤 Usuario Directo
              </Text>
            </TouchableOpacity>
          </View>

          {/* ── Level mode ── */}
          {mode === 'level' && (
            <>
              <Text style={{ fontSize: 13, color: T.textSecondary, marginBottom: 4 }}>
                Elige los niveles con acceso global a este video.
              </Text>
              <Text style={{ fontSize: 11, color: T.textMuted, marginBottom: 16 }}>
                Sin selección = solo clientes con asignación directa pueden verlo.
              </Text>
              <View style={{ flexDirection: 'row', gap: 10, marginBottom: 24 }}>
                {LEVEL_OPTIONS.map((l) => {
                  const active = selectedLevels.includes(l);
                  return (
                    <TouchableOpacity key={`lvl-${l}`} onPress={() => toggleLevel(l)} style={{ flex: 1 }}>
                      <View style={[styles.chip, {
                        paddingVertical: 14, justifyContent: 'center',
                        backgroundColor: active ? T.accent + '18' : T.bg,
                        borderColor: active ? T.accent : T.border,
                        borderWidth: active ? 2 : 1,
                      }]}>
                        <Text style={{ fontSize: 20, textAlign: 'center', marginBottom: 4 }}>
                          {l === 'beginner' ? '🌱' : l === 'intermediate' ? '💪' : '🏆'}
                        </Text>
                        <Text style={{ fontSize: 11, fontWeight: '600', color: active ? T.accent : T.textSecondary, textAlign: 'center' }}>
                          {LEVEL_LABELS[l]}
                        </Text>
                        {active && (
                          <Text style={{ fontSize: 10, color: T.accent, textAlign: 'center', marginTop: 2, fontWeight: '700' }}>✓</Text>
                        )}
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
              <View style={{ flexDirection: 'row', gap: 12 }}>
                <TouchableOpacity onPress={onClose} style={[styles.btn, { borderColor: T.border, borderWidth: 1, flex: 1 }]}>
                  <Text style={{ color: T.text, fontWeight: '600' }}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleAssignByLevel} disabled={saving}
                  style={[styles.btn, { backgroundColor: T.accent, flex: 1 }]}>
                  <Text style={{ color: '#fff', fontWeight: '700' }}>{saving ? 'Guardando...' : 'Guardar acceso'}</Text>
                </TouchableOpacity>
              </View>
            </>
          )}

          {/* ── Direct mode ── */}
          {mode === 'direct' && (
            <View style={{ flex: 1 }}>
              <ClientPickerSheet
                clients={clients} loading={loadingClients} error={clientsError}
                selectedId={selectedId} onSelect={setSelectedId} onRetry={refetch}
                resetKey={pickerResetKey}
              />
              <View style={{ flexDirection: 'row', gap: 12, marginTop: 16 }}>
                <TouchableOpacity onPress={onClose} style={[styles.btn, { borderColor: T.border, borderWidth: 1, flex: 1 }]}>
                  <Text style={{ color: T.text, fontWeight: '600' }}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleAssignDirect} disabled={!selectedId || saving}
                  style={[styles.btn, { backgroundColor: selectedId ? T.accent : T.bgCard, flex: 1, opacity: selectedId ? 1 : 0.5 }]}>
                  <Text style={{ color: selectedId ? '#fff' : T.textMuted, fontWeight: '700' }}>{saving ? 'Asignando...' : 'Asignar'}</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

// ─── Upload Video Modal ───────────────────────────────────────
function UploadVideoModal({ visible, onClose, tenantId }: {
  visible: boolean; onClose: () => void; tenantId: string;
}) {
  const T = useTheme();
  const { user } = useAuthStore();
  const { addVideo, editVideo, changeVideoStatus } = useVideosStore();

  const [step, setStep] = useState<'meta' | 'uploading' | 'done'>('meta');
  const [uploadProgress, setUploadProgress] = useState('');

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [categorySlug, setCategorySlug] = useState('general');
  const [level, setLevel] = useState<VideoLevel>('beginner');
  const [allowedPlans, setAllowedPlans] = useState<VideoPlan[]>([]);
  const [allowedLevels, setAllowedLevels] = useState<VideoLevel[]>([]);
  const [isFeatured, setIsFeatured] = useState(false);
  const [isFree, setIsFree] = useState(false);
  const [thumbColor, setThumbColor] = useState(THUMB_COLORS[0]);
  const [errors, setErrors] = useState<string[]>([]);

  // File state
  const [videoFile, setVideoFile] = useState<{ uri: string; name: string; mimeType: string; size: number } | null>(null);
  const [thumbFile, setThumbFile] = useState<{ uri: string; mimeType: string } | null>(null);

  const togglePlan = (p: VideoPlan) =>
    setAllowedPlans((prev) => prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]);
  const toggleLevel = (l: VideoLevel) =>
    setAllowedLevels((prev) => prev.includes(l) ? prev.filter((x) => x !== l) : [...prev, l]);

  const pickVideo = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['video/mp4', 'video/quicktime', 'video/webm', 'video/*'],
      copyToCacheDirectory: true,
    });
    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];
    setVideoFile({
      uri: asset.uri,
      name: asset.name,
      mimeType: asset.mimeType ?? 'video/mp4',
      size: asset.size ?? 0,
    });
  };

  const pickThumbnail = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      allowsEditing: true,
      aspect: [16, 9],
    });
    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];
    setThumbFile({ uri: asset.uri, mimeType: 'image/jpeg' });
  };

  const reset = () => {
    setStep('meta'); setTitle(''); setDescription(''); setCategorySlug('general');
    setLevel('beginner'); setAllowedPlans([]); setAllowedLevels([]);
    setIsFeatured(false); setIsFree(false); setThumbColor(THUMB_COLORS[0]); setErrors([]);
    setVideoFile(null); setThumbFile(null); setUploadProgress('');
  };

  const handleSave = async () => {
    const errs: string[] = [];
    if (!title.trim()) errs.push('El título es obligatorio.');
    if (errs.length) { setErrors(errs); return; }

    setStep('uploading');

    try {
      // 1. Create video record in draft state
      setUploadProgress('Creando registro...');
      const created = await addVideo({
        tenant_id: tenantId,
        title: title.trim(),
        description: description.trim() || null,
        category_id: null, // resolved from slug in a real implementation
        level,
        video_bucket: 'videos',
        video_storage_path: null,
        video_mime_type: videoFile?.mimeType ?? null,
        video_file_size_bytes: videoFile?.size ?? null,
        thumbnail_bucket: 'video-thumbnails',
        thumbnail_storage_path: null,
        thumbnail_color: thumbColor,
        duration_seconds: null,
        allowed_plans: allowedPlans,
        allowed_levels: allowedLevels,
        status: 'draft',
        is_featured: isFeatured,
        is_free: isFree,
        sort_order: 0,
        created_by: user?.id ?? null,
        updated_by: null,
      });

      // 2. Upload video file if selected
      if (videoFile) {
        setUploadProgress('Subiendo video... 0%');
        await changeVideoStatus(created.id, 'uploading', user?.id ?? '');
        const ext = videoFile.name.split('.').pop() ?? 'mp4';
        const { path } = await uploadVideoFile(
          tenantId,
          created.id,
          { uri: videoFile.uri, mimeType: videoFile.mimeType, extension: ext, size: videoFile.size },
          (pct) => setUploadProgress(`Subiendo video... ${pct}%`),
        );
        await editVideo(created.id, { video_storage_path: path });
      }

      // 3. Upload thumbnail if selected
      if (thumbFile) {
        setUploadProgress('Subiendo miniatura...');
        const thumbPath = await uploadThumbnail(tenantId, created.id, {
          uri: thumbFile.uri,
          mimeType: thumbFile.mimeType,
          extension: 'jpg',
        });
        await editVideo(created.id, { thumbnail_storage_path: thumbPath });
      }

      // 4. Publish
      setUploadProgress('Publicando...');
      await changeVideoStatus(created.id, 'published', user?.id ?? '');

      setStep('done');
    } catch (e: any) {
      Alert.alert('Error al subir', e.message ?? 'Ocurrió un error inesperado.');
      setStep('meta');
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={() => { reset(); onClose(); }}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <View style={styles.modalOverlay}>
          <View style={[styles.sheet, { backgroundColor: T.bgCard }]}>
            <View style={styles.handle} />

            {/* Uploading state */}
            {step === 'uploading' && (
              <View style={{ alignItems: 'center', paddingVertical: 40 }}>
                <ActivityIndicator color={T.accent} size="large" />
                <Text style={{ color: T.text, fontSize: 16, fontWeight: '700', marginTop: 16 }}>{uploadProgress}</Text>
                <Text style={{ color: T.textMuted, fontSize: 13, marginTop: 8 }}>No cierres esta pantalla</Text>
              </View>
            )}

            {/* Done state */}
            {step === 'done' && (
              <View style={{ alignItems: 'center', paddingVertical: 40 }}>
                <Text style={{ fontSize: 48 }}>✅</Text>
                <Text style={{ color: T.text, fontSize: 18, fontWeight: '800', marginTop: 16 }}>Video publicado</Text>
                <TouchableOpacity onPress={() => { reset(); onClose(); }}
                  style={[styles.btn, { backgroundColor: T.accent, marginTop: 24, paddingHorizontal: 32 }]}>
                  <Text style={{ color: '#fff', fontWeight: '700' }}>Listo</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Form state */}
            {step === 'meta' && (
              <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                <Text style={[styles.sheetTitle, { color: T.text }]}>Nuevo video</Text>

                {errors.length > 0 && (
                  <View style={[styles.errorBox, { backgroundColor: T.redSoft, borderColor: T.red + '55' }]}>
                    {errors.map((e, i) => <Text key={i} style={{ color: T.red, fontSize: 13 }}>• {e}</Text>)}
                  </View>
                )}

                {/* Video file picker */}
                <Text style={[styles.label, { color: T.textSecondary }]}>Archivo de video</Text>
                <TouchableOpacity onPress={pickVideo}
                  style={[styles.filePicker, { borderColor: videoFile ? T.accent : T.border, backgroundColor: T.bg }]}>
                  <Text style={{ fontSize: 20 }}>🎬</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: videoFile ? T.text : T.textMuted, fontSize: 14, fontWeight: videoFile ? '600' : '400' }}>
                      {videoFile ? videoFile.name : 'Seleccionar video (MP4, MOV, WebM)'}
                    </Text>
                    {videoFile?.size ? (
                      <Text style={{ color: T.textMuted, fontSize: 11, marginTop: 2 }}>
                        {(videoFile.size / 1024 / 1024).toFixed(1)} MB
                      </Text>
                    ) : null}
                  </View>
                  <Text style={{ color: T.accent, fontWeight: '700', fontSize: 13 }}>
                    {videoFile ? 'Cambiar' : 'Elegir'}
                  </Text>
                </TouchableOpacity>

                {/* Thumbnail picker */}
                <Text style={[styles.label, { color: T.textSecondary }]}>Miniatura (opcional)</Text>
                <TouchableOpacity onPress={pickThumbnail}
                  style={[styles.filePicker, { borderColor: thumbFile ? T.accent : T.border, backgroundColor: T.bg }]}>
                  <Text style={{ fontSize: 20 }}>🖼️</Text>
                  <Text style={{ flex: 1, color: thumbFile ? T.text : T.textMuted, fontSize: 14 }}>
                    {thumbFile ? 'Miniatura seleccionada' : 'Seleccionar imagen (16:9)'}
                  </Text>
                  <Text style={{ color: T.accent, fontWeight: '700', fontSize: 13 }}>
                    {thumbFile ? 'Cambiar' : 'Elegir'}
                  </Text>
                </TouchableOpacity>

                <Text style={[styles.label, { color: T.textSecondary }]}>Título *</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: T.bg, borderColor: T.border, color: T.text }]}
                  placeholder="Ej: Técnica de sentadilla"
                  placeholderTextColor={T.textMuted}
                  value={title}
                  onChangeText={(v) => { setTitle(v); setErrors([]); }}
                />

                <Text style={[styles.label, { color: T.textSecondary }]}>Descripción</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: T.bg, borderColor: T.border, color: T.text, minHeight: 72, textAlignVertical: 'top' }]}
                  placeholder="Descripción breve..."
                  placeholderTextColor={T.textMuted}
                  value={description}
                  onChangeText={setDescription}
                  multiline
                />

                <Text style={[styles.label, { color: T.textSecondary }]}>Nivel del video</Text>
                <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
                  {LEVEL_OPTIONS.map((l) => (
                    <TouchableOpacity key={l} onPress={() => setLevel(l)}
                      style={[styles.chip, { flex: 1, justifyContent: 'center', backgroundColor: level === l ? T.accent : T.bg, borderColor: level === l ? T.accent : T.border }]}>
                      <Text style={{ fontSize: 12, fontWeight: '600', color: level === l ? '#fff' : T.textSecondary, textAlign: 'center' }}>{LEVEL_LABELS[l]}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={[styles.label, { color: T.textSecondary }]}>Planes con acceso (vacío = todos)</Text>
                <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
                  {PLAN_OPTIONS.map((p) => (
                    <TouchableOpacity key={p} onPress={() => togglePlan(p)}
                      style={[styles.chip, { flex: 1, justifyContent: 'center', backgroundColor: allowedPlans.includes(p) ? T.accent : T.bg, borderColor: allowedPlans.includes(p) ? T.accent : T.border }]}>
                      <Text style={{ fontSize: 12, fontWeight: '600', color: allowedPlans.includes(p) ? '#fff' : T.textSecondary, textAlign: 'center' }}>{PLAN_LABELS[p]}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={[styles.label, { color: T.textSecondary }]}>Niveles con acceso (vacío = todos)</Text>
                <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
                  {LEVEL_OPTIONS.map((l) => (
                    <TouchableOpacity key={l} onPress={() => toggleLevel(l)}
                      style={[styles.chip, { flex: 1, justifyContent: 'center', backgroundColor: allowedLevels.includes(l) ? T.accent : T.bg, borderColor: allowedLevels.includes(l) ? T.accent : T.border }]}>
                      <Text style={{ fontSize: 12, fontWeight: '600', color: allowedLevels.includes(l) ? '#fff' : T.textSecondary, textAlign: 'center' }}>{LEVEL_LABELS[l]}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={[styles.label, { color: T.textSecondary }]}>Color de miniatura (fallback)</Text>
                <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}>
                  {THUMB_COLORS.map((c) => (
                    <TouchableOpacity key={c} onPress={() => setThumbColor(c)}
                      style={[styles.colorDot, { backgroundColor: c, borderWidth: thumbColor === c ? 3 : 0, borderColor: '#fff' }]} />
                  ))}
                </View>

                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                  <Text style={[styles.label, { color: T.textSecondary, marginBottom: 0 }]}>Marcar como destacado</Text>
                  <Switch value={isFeatured} onValueChange={setIsFeatured} trackColor={{ true: T.accent, false: T.border }} />
                </View>

                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.label, { color: T.textSecondary, marginBottom: 0 }]}>Acceso libre</Text>
                    <Text style={{ fontSize: 11, color: T.textMuted, marginBottom: 16 }}>Visible para todos sin suscripción</Text>
                  </View>
                  <Switch value={isFree} onValueChange={setIsFree} trackColor={{ true: T.green, false: T.border }} />
                </View>

                <View style={{ flexDirection: 'row', gap: 12, marginBottom: 8 }}>
                  <TouchableOpacity onPress={() => { reset(); onClose(); }}
                    style={[styles.btn, { borderColor: T.border, borderWidth: 1, flex: 1 }]}>
                    <Text style={{ color: T.text, fontWeight: '600' }}>Cancelar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={handleSave}
                    style={[styles.btn, { backgroundColor: T.accent, flex: 1 }]}>
                    <Text style={{ color: '#fff', fontWeight: '700' }}>
                      {videoFile ? 'Subir y publicar' : 'Guardar borrador'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Nutrition Form Modal ─────────────────────────────────────
function NutritionFormModal({ plan, visible, onClose, onSaved, tenantId }: {
  plan?: NutritionPlan | null; visible: boolean; onClose: () => void; onSaved: () => void; tenantId: string;
}) {
  const T = useTheme();
  const { user } = useAuthStore();
  const { addPlan, editPlan } = useNutritionStore();
  const isEdit = !!plan;

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [goal, setGoal] = useState('');
  const [calories, setCalories] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fat, setFat] = useState('');
  const [status, setStatus] = useState<NutritionStatus>('draft');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible) {
      setName(plan?.name ?? '');
      setDescription(plan?.description ?? '');
      setGoal(plan?.goal ?? '');
      setCalories(plan?.calories_target?.toString() ?? '');
      setProtein(plan?.protein_g?.toString() ?? '');
      setCarbs(plan?.carbs_g?.toString() ?? '');
      setFat(plan?.fat_g?.toString() ?? '');
      setStatus(plan?.status ?? 'draft');
    }
  }, [visible, plan]);

  const handleSave = async () => {
    if (!name.trim()) { Alert.alert('Error', 'El nombre es requerido.'); return; }
    setSaving(true);
    try {
      const payload = {
        tenant_id: tenantId,
        name: name.trim(),
        description: description.trim() || null,
        goal: goal.trim() || null,
        calories_target: calories ? parseInt(calories, 10) : null,
        protein_g: protein ? parseInt(protein, 10) : null,
        carbs_g: carbs ? parseInt(carbs, 10) : null,
        fat_g: fat ? parseInt(fat, 10) : null,
        status,
        is_template: false,
        sort_order: 0,
        created_by: user?.id ?? null,
      };
      if (isEdit && plan) {
        await editPlan(plan.id, payload);
      } else {
        await addPlan(payload);
      }
      onSaved(); onClose();
    } catch (e: any) { Alert.alert('Error', e.message); }
    finally { setSaving(false); }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <View style={styles.modalOverlay}>
          <View style={[styles.sheet, { backgroundColor: T.bgCard }]}>
            <View style={styles.handle} />
            <ScrollView keyboardShouldPersistTaps="handled">
              <Text style={[styles.sheetTitle, { color: T.text }]}>{isEdit ? 'Editar plan' : 'Nuevo plan nutricional'}</Text>

              <Text style={[styles.label, { color: T.textSecondary }]}>Nombre *</Text>
              <TextInput style={[styles.input, { backgroundColor: T.bg, borderColor: T.border, color: T.text }]}
                value={name} onChangeText={setName} placeholder="Ej: Plan Proteico Fase 1" placeholderTextColor={T.textMuted} />

              <Text style={[styles.label, { color: T.textSecondary }]}>Objetivo</Text>
              <TextInput style={[styles.input, { backgroundColor: T.bg, borderColor: T.border, color: T.text }]}
                value={goal} onChangeText={setGoal} placeholder="Ej: Ganancia muscular" placeholderTextColor={T.textMuted} />

              <Text style={[styles.label, { color: T.textSecondary }]}>Descripción</Text>
              <TextInput style={[styles.input, { backgroundColor: T.bg, borderColor: T.border, color: T.text, minHeight: 60, textAlignVertical: 'top' }]}
                value={description} onChangeText={setDescription} placeholder="Descripción del plan..." placeholderTextColor={T.textMuted} multiline />

              <Text style={[styles.label, { color: T.textSecondary }]}>Macros diarios</Text>
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
                {([
                  { label: 'Calorías', value: calories, set: setCalories, unit: 'kcal' },
                  { label: 'Proteína', value: protein, set: setProtein, unit: 'g' },
                  { label: 'Carbs', value: carbs, set: setCarbs, unit: 'g' },
                  { label: 'Grasa', value: fat, set: setFat, unit: 'g' },
                ] as { label: string; value: string; set: (v: string) => void; unit: string }[]).map((m) => (
                  <View key={m.label} style={{ flex: 1 }}>
                    <Text style={{ fontSize: 11, color: T.textMuted, marginBottom: 4, textAlign: 'center' }}>{m.label}</Text>
                    <TextInput
                      style={[styles.input, { backgroundColor: T.bg, borderColor: T.border, color: T.text, marginBottom: 0, textAlign: 'center', fontSize: 14, paddingHorizontal: 6 }]}
                      value={m.value} onChangeText={m.set}
                      placeholder="—" placeholderTextColor={T.textMuted}
                      keyboardType="numeric"
                    />
                    <Text style={{ fontSize: 10, color: T.textMuted, textAlign: 'center', marginTop: 2 }}>{m.unit}</Text>
                  </View>
                ))}
              </View>

              <Text style={[styles.label, { color: T.textSecondary }]}>Estado</Text>
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 24 }}>
                {(['draft', 'published', 'archived'] as NutritionStatus[]).map((s) => (
                  <TouchableOpacity key={s} onPress={() => setStatus(s)}
                    style={[styles.chip, { flex: 1, justifyContent: 'center', backgroundColor: status === s ? T.accent : T.bg, borderColor: status === s ? T.accent : T.border }]}>
                    <Text style={{ fontSize: 11, fontWeight: '600', color: status === s ? '#fff' : T.textSecondary, textAlign: 'center' }}>
                      {NUTRITION_STATUS_LABELS[s]}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={{ flexDirection: 'row', gap: 12 }}>
                <TouchableOpacity onPress={onClose} style={[styles.btn, { borderColor: T.border, borderWidth: 1, flex: 1 }]}>
                  <Text style={{ color: T.text, fontWeight: '600' }}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleSave} disabled={saving} style={[styles.btn, { backgroundColor: T.accent, flex: 1 }]}>
                  <Text style={{ color: '#fff', fontWeight: '700' }}>{saving ? 'Guardando...' : 'Guardar'}</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Assign Nutrition Modal ───────────────────────────────────
function AssignNutritionModal({ plan, visible, onClose, tenantId }: {
  plan: NutritionPlan | null; visible: boolean; onClose: () => void; tenantId: string;
}) {
  const T = useTheme();
  const { user } = useAuthStore();
  const { data: clients = [], isLoading: loadingClients, error: clientsError, refetch } = useClientsWithPlan();
  const { assignPlan } = useNutritionStore();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [resetKey, setResetKey] = useState(0);

  useEffect(() => {
    if (visible) { setSelectedId(null); setResetKey((k) => k + 1); refetch(); }
  }, [visible]);

  const handleAssign = async () => {
    if (!plan || !selectedId || !user?.id || !user?.tenant_id) return;
    setSaving(true);
    try {
      await assignPlan(plan.id, selectedId, user.tenant_id, user.id);
      showToast('Plan nutricional asignado correctamente');
      onClose();
    } catch (e: any) { Alert.alert('Error', e.message); }
    finally { setSaving(false); }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={[styles.sheet, { backgroundColor: T.bgCard, height: '82%' }]}>
          <View style={styles.handle} />
          <Text style={[styles.sheetTitle, { color: T.text }]}>Asignar plan nutricional</Text>
          {plan && (
            <Text style={{ fontSize: 13, color: T.textSecondary, marginBottom: 12, marginTop: -12 }}>
              {plan.name}
            </Text>
          )}
          <ClientPickerSheet
            clients={clients} loading={loadingClients} error={clientsError}
            selectedId={selectedId} onSelect={setSelectedId} onRetry={refetch}
            resetKey={resetKey}
          />
          <View style={{ flexDirection: 'row', gap: 12, marginTop: 16 }}>
            <TouchableOpacity onPress={onClose} style={[styles.btn, { borderColor: T.border, borderWidth: 1, flex: 1 }]}>
              <Text style={{ color: T.text, fontWeight: '600' }}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleAssign} disabled={!selectedId || saving}
              style={[styles.btn, { backgroundColor: selectedId ? T.accent : T.bgCard, flex: 1, opacity: selectedId ? 1 : 0.5 }]}>
              <Text style={{ color: selectedId ? '#fff' : T.textMuted, fontWeight: '700' }}>
                {saving ? 'Asignando...' : 'Asignar'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ─── Main Screen ──────────────────────────────────────────────
export default function AdminContentScreen() {
  const T = useTheme();
  const { user } = useAuthStore();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const [tab, setTab] = useState('Rutinas');
  const [showCreate, setShowCreate] = useState(false);
  const [editTarget, setEditTarget] = useState<Video | null>(null);
  const [assignTarget, setAssignTarget] = useState<Video | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // ActionSheet state
  const [sheet, setSheet] = useState<{
    visible: boolean; title?: string; subtitle?: string; actions: SheetAction[];
  }>({ visible: false, actions: [] });
  const openSheet = useCallback((title: string, subtitle: string, actions: SheetAction[]) => {
    setSheet({ visible: true, title, subtitle, actions });
  }, []);

  // Routines state
  const { adminRoutines, isLoadingAdmin: routinesLoading, loadAdminRoutines, removeRoutine, toggleActive: toggleRoutineActive } = useRoutinesStore();
  const [showRoutineForm, setShowRoutineForm] = useState(false);
  const [editRoutineTarget, setEditRoutineTarget] = useState<Routine | null>(null);
  const [assignRoutineTarget, setAssignRoutineTarget] = useState<Routine | null>(null);
  const [expandedRoutineId, setExpandedRoutineId] = useState<string | null>(null);
  const [showExerciseForm, setShowExerciseForm] = useState(false);
  const [editExerciseTarget, setEditExerciseTarget] = useState<{ routineId: string; exercise?: Exercise } | null>(null);

  // Nutrition state
  const { adminPlans: nutritionPlans, isLoading: nutritionLoading, loadAdminPlans, removePlan: removeNutritionPlan, changePlanStatus } = useNutritionStore();
  const [showNutritionForm, setShowNutritionForm] = useState(false);
  const [editNutritionTarget, setEditNutritionTarget] = useState<NutritionPlan | null>(null);
  const [assignNutritionTarget, setAssignNutritionTarget] = useState<NutritionPlan | null>(null);

  useEffect(() => {
    if (user?.tenant_id) {
      loadAdminRoutines(user.tenant_id);
      loadAdminPlans(user.tenant_id);
    }
  }, [user?.tenant_id]);

  const { videos, isLoading, publish, archive, reload } = useAdminVideos();
  const { removeVideo } = useVideosStore();

  const onRefresh = useCallback(async () => {
    if (!user?.tenant_id) return;
    setRefreshing(true);
    try {
      reload();
      await Promise.all([
        loadAdminRoutines(user.tenant_id),
        loadAdminPlans(user.tenant_id),
      ]);
    } finally {
      setRefreshing(false);
    }
  }, [user?.tenant_id]);

  const statusColor = (status: string) => {
    if (status === 'published') return T.green;
    if (status === 'archived') return T.textMuted;
    if (status === 'failed') return T.red;
    return T.accent;
  };

  const handleDelete = (v: Video) => {
    Alert.alert('Eliminar video', `¿Eliminar "${v.title}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: async () => {
        try {
          await removeVideo(v.id);
          showToast('Video eliminado', 'info');
        } catch (e: any) { Alert.alert('Error', e.message); }
      }},
    ]);
  };

  const isTablet = width >= 768;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: T.bg }]} edges={['left', 'right']}>
      <StatusBar barStyle="light-content" backgroundColor={T.bg} />
      <AdminTopBar
        title="Contenido"
        subtitle="Rutinas · Nutrición · Videos"
        actionLabel="+ Nuevo"
        onAction={() => {
          if (tab === 'Videos') setShowCreate(true);
          if (tab === 'Rutinas') { setEditRoutineTarget(null); setShowRoutineForm(true); }
          if (tab === 'Nutrición') { setEditNutritionTarget(null); setShowNutritionForm(true); }
        }}
      />

      <View style={[styles.tabRow, { backgroundColor: T.bgCard, borderColor: T.border, borderRadius: T.radiusMd }]}>
        {TABS.map((t) => (
          <TouchableOpacity key={t} onPress={() => setTab(t)}
            style={[styles.tabBtn, tab === t && { backgroundColor: T.accent }, { borderRadius: T.radiusSm }]}>
            <Text style={[styles.tabText, { color: tab === t ? '#fff' : T.textMuted }]}>{t}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        contentContainerStyle={{ padding: isTablet ? 24 : 16 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={T.accent}
            colors={[T.accent]}
          />
        }
      >

        {tab === 'Rutinas' && (
          routinesLoading ? (
            <View style={{ paddingVertical: 40, alignItems: 'center' }}><ActivityIndicator color={T.accent} /></View>
          ) : adminRoutines.length === 0 ? (
            <View style={{ paddingVertical: 60, alignItems: 'center' }}>
              <Text style={{ fontSize: 36, marginBottom: 12 }}>💪</Text>
              <Text style={{ color: T.textMuted, fontSize: 15, textAlign: 'center' }}>
                No hay rutinas.{'\n'}Toca "+ Nuevo" para crear la primera.
              </Text>
            </View>
          ) : (
            adminRoutines.map((r) => {
              const expanded = expandedRoutineId === r.id;
              return (
                <View key={r.id} style={[styles.card, { backgroundColor: T.bgCard, borderColor: T.border, borderRadius: T.radiusMd, flexDirection: 'column', padding: 0, overflow: 'hidden' }]}>
                  {/* Header row */}
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 }}>
                    <TouchableOpacity onPress={() => setExpandedRoutineId(expanded ? null : r.id)} activeOpacity={0.7}
                      style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
                      <View style={[styles.cardIcon, { backgroundColor: T.accentGlow }]}><Text style={{ fontSize: 20 }}>💪</Text></View>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.cardTitle, { color: T.text }]}>{r.name}</Text>
                        <Text style={[styles.cardMeta, { color: T.textSecondary }]}>
                          {ROUTINE_LEVEL_LABELS[r.level]} · {r.exercises?.length ?? 0} ejercicios
                          {r.is_template ? ' · Plantilla' : ''}
                        </Text>
                      </View>
                    </TouchableOpacity>
                    <Switch value={r.is_active} onValueChange={(v) => toggleRoutineActive(r.id, v)} trackColor={{ true: T.green, false: T.border }} />
                    <TouchableOpacity
                      onPress={() => openSheet('Rutina', r.name, [
                        { icon: '✏️', label: 'Editar', onPress: () => { setEditRoutineTarget(r); setShowRoutineForm(true); } },
                        { icon: '👤', label: 'Asignar a cliente', onPress: () => setAssignRoutineTarget(r) },
                        { icon: '➕', label: 'Agregar ejercicio', onPress: () => { setEditExerciseTarget({ routineId: r.id }); setShowExerciseForm(true); } },
                        { icon: '🗑', label: 'Eliminar', destructive: true, onPress: () =>
                          Alert.alert('Eliminar', `¿Eliminar "${r.name}"?`, [
                            { text: 'Cancelar', style: 'cancel' },
                            { text: 'Eliminar', style: 'destructive', onPress: () => {
                              removeRoutine(r.id).then(() => showToast('Rutina eliminada', 'info')).catch((e: any) => Alert.alert('Error', e.message));
                            }},
                          ])
                        },
                      ])}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      style={[styles.menuBtn, { backgroundColor: T.bg, borderColor: T.border }]}
                    >
                      <Text style={{ color: T.textSecondary, fontSize: 16, fontWeight: '700' }}>⋯</Text>
                    </TouchableOpacity>
                  </View>

                  {/* Exercises list (expanded) */}
                  {expanded && (r.exercises ?? []).map((ex) => (
                    <View key={ex.id} style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: T.border, gap: 10 }}>
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Text style={{ fontSize: 13, fontWeight: '700', color: T.text }}>{ex.name}</Text>
                          {ex.demo_video_storage_path && (
                            <View style={{ backgroundColor: T.green + '20', borderRadius: 4, paddingHorizontal: 5, paddingVertical: 1 }}>
                              <Text style={{ fontSize: 9, fontWeight: '700', color: T.green }}>🎬 DEMO</Text>
                            </View>
                          )}
                        </View>
                        <Text style={{ fontSize: 11, color: T.textSecondary }}>{ex.sets}×{ex.reps} · {ex.rest_seconds}s · {ex.muscle}</Text>
                      </View>
                      <TouchableOpacity onPress={() => { setEditExerciseTarget({ routineId: r.id, exercise: ex }); setShowExerciseForm(true); }}>
                        <Text style={{ fontSize: 11, color: T.accent, fontWeight: '700' }}>✏️</Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              );
            })
          )
        )}

        {tab === 'Nutrición' && (
          nutritionLoading ? (
            <View style={{ paddingVertical: 40, alignItems: 'center' }}><ActivityIndicator color={T.accent} /></View>
          ) : nutritionPlans.length === 0 ? (
            <View style={{ paddingVertical: 60, alignItems: 'center' }}>
              <Text style={{ fontSize: 36, marginBottom: 12 }}>🥗</Text>
              <Text style={{ color: T.textMuted, fontSize: 15, textAlign: 'center' }}>
                No hay planes nutricionales.{'\n'}Toca "+ Nuevo" para crear el primero.
              </Text>
            </View>
          ) : (
            nutritionPlans.map((n) => {
              const isPublished = n.status === 'published';
              const macroText = [
                n.calories_target ? `${n.calories_target} kcal` : null,
                n.protein_g ? `P ${n.protein_g}g` : null,
                n.carbs_g ? `C ${n.carbs_g}g` : null,
                n.fat_g ? `G ${n.fat_g}g` : null,
              ].filter(Boolean).join(' · ');
              return (
                <View key={n.id} style={[styles.card, { backgroundColor: T.bgCard, borderColor: T.border, borderRadius: T.radiusMd, flexDirection: 'column', padding: 0, overflow: 'hidden' }]}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 }}>
                    <View style={[styles.cardIcon, { backgroundColor: T.greenSoft }]}><Text style={{ fontSize: 20 }}>🥗</Text></View>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <Text style={[styles.cardTitle, { color: T.text }]} numberOfLines={1}>{n.name}</Text>
                        <View style={{ paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, backgroundColor: isPublished ? T.green + '20' : T.accent + '20' }}>
                          <Text style={{ fontSize: 10, fontWeight: '700', color: isPublished ? T.green : T.accent }}>
                            {NUTRITION_STATUS_LABELS[n.status]}
                          </Text>
                        </View>
                      </View>
                      {macroText ? <Text style={[styles.cardMeta, { color: T.textSecondary }]}>{macroText}</Text> : null}
                      {n.goal ? <Text style={[styles.cardSub, { color: T.textMuted }]}>{n.goal}</Text> : null}
                    </View>
                    <TouchableOpacity
                      onPress={() => openSheet('Plan nutricional', n.name, [
                        { icon: '✏️', label: 'Editar', onPress: () => { setEditNutritionTarget(n); setShowNutritionForm(true); } },
                        { icon: '👤', label: 'Asignar a cliente', onPress: () => setAssignNutritionTarget(n) },
                        { icon: isPublished ? '📦' : '✅', label: isPublished ? 'Archivar' : 'Publicar',
                          color: isPublished ? T.textMuted : T.green,
                          onPress: () => {
                            changePlanStatus(n.id, isPublished ? 'archived' : 'published')
                              .then(() => showToast(isPublished ? 'Plan archivado' : 'Plan publicado'))
                              .catch((e: any) => Alert.alert('Error', e.message));
                          },
                        },
                        { icon: '🗑', label: 'Eliminar', destructive: true, onPress: () =>
                          Alert.alert('Eliminar', `¿Eliminar "${n.name}"?`, [
                            { text: 'Cancelar', style: 'cancel' },
                            { text: 'Eliminar', style: 'destructive', onPress: () =>
                              removeNutritionPlan(n.id)
                                .then(() => showToast('Plan eliminado', 'info'))
                                .catch((e: any) => Alert.alert('Error', e.message))
                            },
                          ])
                        },
                      ])}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      style={[styles.menuBtn, { backgroundColor: T.bg, borderColor: T.border }]}
                    >
                      <Text style={{ color: T.textSecondary, fontSize: 16, fontWeight: '700' }}>⋯</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })
          )
        )}

        {tab === 'Videos' && (
          isLoading ? (
            <View style={{ paddingVertical: 40, alignItems: 'center' }}>
              <ActivityIndicator color={T.accent} />
            </View>
          ) : videos.length === 0 ? (
            <View style={{ paddingVertical: 60, alignItems: 'center' }}>
              <Text style={{ fontSize: 36, marginBottom: 12 }}>🎬</Text>
              <Text style={{ color: T.textMuted, fontSize: 15, textAlign: 'center' }}>
                No hay videos aún.{'\n'}Toca "+ Nuevo" para agregar el primero.
              </Text>
            </View>
          ) : (
            videos.map((v) => {
              const thumbUrl = v.thumbnail_storage_path ? getThumbnailPublicUrl(v.thumbnail_storage_path) : null;
              return (
                <View key={v.id} style={[styles.card, { backgroundColor: T.bgCard, borderColor: T.border, borderRadius: T.radiusMd }]}>
                  {/* Thumbnail */}
                  <View style={[styles.videoThumb, { backgroundColor: v.thumbnail_color + '33' }]}>
                    {thumbUrl ? (
                      <Image source={{ uri: thumbUrl }} style={StyleSheet.absoluteFill as any} resizeMode="cover" />
                    ) : (
                      <Text style={{ fontSize: 22 }}>▶</Text>
                    )}
                    {v.duration_seconds ? (
                      <Text style={styles.duration}>{formatDuration(v.duration_seconds)}</Text>
                    ) : null}
                  </View>

                  {/* Info */}
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.cardTitle, { color: T.text }]} numberOfLines={1}>{v.title}</Text>
                    <Text style={[styles.cardMeta, { color: T.textSecondary }]}>
                      {LEVEL_LABELS[v.level]}
                      {v.allowed_plans.length > 0 ? ` · ${v.allowed_plans.map((p) => PLAN_LABELS[p]).join(', ')}` : ' · Todos'}
                    </Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
                      <View style={[styles.statusDot, { backgroundColor: statusColor(v.status) }]} />
                      <Text style={{ fontSize: 11, color: statusColor(v.status), fontWeight: '600' }}>
                        {VIDEO_STATUS_LABELS[v.status]}
                      </Text>
                      {v.is_featured && <Text style={{ fontSize: 11, color: T.gold }}>⭐</Text>}
                    </View>
                  </View>

                  {/* ⋯ menu */}
                  <TouchableOpacity
                    onPress={() => {
                      const acts: SheetAction[] = [];
                      if (v.video_storage_path) acts.push({ icon: '▶', label: 'Ver video', color: T.blue, onPress: () => router.push(`/(admin)/video-player?id=${v.id}` as any) });
                      acts.push({ icon: '✏️', label: 'Editar', onPress: () => setEditTarget(v) });
                      acts.push({ icon: '👤', label: 'Asignar a cliente', onPress: () => setAssignTarget(v) });
                      if (v.status !== 'published' && v.status !== 'uploading') acts.push({ icon: '✅', label: 'Publicar', color: T.green, onPress: () => publish(v.id).then(() => showToast('Video publicado')).catch((e: any) => Alert.alert('Error', e.message)) });
                      if (v.status === 'published') acts.push({ icon: '📦', label: 'Archivar', color: T.textMuted, onPress: () => archive(v.id).then(() => showToast('Video archivado', 'info')).catch((e: any) => Alert.alert('Error', e.message)) });
                      acts.push({ icon: '🗑', label: 'Eliminar', destructive: true, onPress: () => handleDelete(v) });
                      openSheet('Video', v.title, acts);
                    }}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    style={[styles.menuBtn, { backgroundColor: T.bg, borderColor: T.border }]}
                  >
                    <Text style={{ color: T.textSecondary, fontSize: 16, fontWeight: '700' }}>⋯</Text>
                  </TouchableOpacity>
                </View>
              );
            })
          )
        )}
      </ScrollView>

      {user?.tenant_id && (
        <UploadVideoModal
          visible={showCreate}
          onClose={() => { setShowCreate(false); reload(); }}
          tenantId={user.tenant_id}
        />
      )}
      <EditVideoModal
        video={editTarget}
        visible={!!editTarget}
        onClose={() => setEditTarget(null)}
        onSaved={() => { setEditTarget(null); reload(); }}
      />
      <AssignVideoModal
        video={assignTarget}
        visible={!!assignTarget}
        onClose={() => setAssignTarget(null)}
        onSaved={() => { setAssignTarget(null); reload(); }}
      />
      {/* Routine modals */}
      <RoutineFormModal
        routine={editRoutineTarget}
        visible={showRoutineForm}
        onClose={() => { setShowRoutineForm(false); setEditRoutineTarget(null); }}
        onSaved={() => { if (user?.tenant_id) loadAdminRoutines(user.tenant_id); }}
        tenantId={user?.tenant_id ?? ''}
      />
      <ExerciseFormModal
        routineId={editExerciseTarget?.routineId ?? ''}
        tenantId={user?.tenant_id ?? ''}
        exercise={editExerciseTarget?.exercise}
        visible={showExerciseForm}
        onClose={() => { setShowExerciseForm(false); setEditExerciseTarget(null); }}
        onSaved={() => { if (user?.tenant_id) loadAdminRoutines(user.tenant_id); }}
      />
      <AssignRoutineModal
        routine={assignRoutineTarget}
        visible={!!assignRoutineTarget}
        onClose={() => setAssignRoutineTarget(null)}
        tenantId={user?.tenant_id ?? ''}
      />
      {/* Nutrition modals */}
      <NutritionFormModal
        plan={editNutritionTarget}
        visible={showNutritionForm}
        onClose={() => { setShowNutritionForm(false); setEditNutritionTarget(null); }}
        onSaved={() => { if (user?.tenant_id) loadAdminPlans(user.tenant_id); }}
        tenantId={user?.tenant_id ?? ''}
      />
      <AssignNutritionModal
        plan={assignNutritionTarget}
        visible={!!assignNutritionTarget}
        onClose={() => setAssignNutritionTarget(null)}
        tenantId={user?.tenant_id ?? ''}
      />

      {/* Global ActionSheet */}
      <ActionSheet
        visible={sheet.visible}
        title={sheet.title}
        subtitle={sheet.subtitle}
        actions={sheet.actions}
        onClose={() => setSheet((s) => ({ ...s, visible: false }))}
      />

      {/* Toast — rendered last so it floats above everything */}
      <ToastNotification />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  tabRow: { flexDirection: 'row', marginHorizontal: 16, marginVertical: 12, padding: 4, borderWidth: 1 },
  tabBtn: { flex: 1, paddingVertical: 8, alignItems: 'center' },
  tabText: { fontSize: 13, fontWeight: '600' },
  card: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, padding: 14, marginBottom: 8 },
  cardIcon: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  cardTitle: { fontSize: 14, fontWeight: '700', marginBottom: 2 },
  cardMeta: { fontSize: 12 },
  cardSub: { fontSize: 11, marginTop: 2 },
  videoThumb: { width: 70, height: 50, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  duration: {
    position: 'absolute', bottom: 3, right: 3,
    backgroundColor: 'rgba(0,0,0,0.7)', borderRadius: 3,
    paddingHorizontal: 4, paddingVertical: 1,
    fontSize: 9, color: '#fff', fontWeight: '600',
  },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  menuBtn: {
    width: 34, height: 34, borderRadius: 10, borderWidth: StyleSheet.hairlineWidth,
    justifyContent: 'center', alignItems: 'center',
  },
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.6)' },
  sheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: '94%' },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#444', alignSelf: 'center', marginBottom: 16 },
  sheetTitle: { fontSize: 20, fontWeight: '800', marginBottom: 20 },
  label: { fontSize: 13, fontWeight: '600', marginBottom: 8 },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11, fontSize: 15, marginBottom: 16 },
  chip: { borderRadius: 10, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 8 },
  colorDot: { width: 28, height: 28, borderRadius: 14 },
  btn: { borderRadius: 12, paddingVertical: 13, alignItems: 'center' },
  errorBox: { borderRadius: 10, borderWidth: 1, padding: 12, marginBottom: 16, gap: 4 },
  filePicker: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderWidth: 1, borderRadius: 12, padding: 14, marginBottom: 16,
    borderStyle: 'dashed',
  },
  demoVideoRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderWidth: 1, borderRadius: 12, padding: 12, marginBottom: 16,
  },
  demoBtn: {
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderRadius: 12, paddingVertical: 14,
    marginBottom: 16,
  },
});
