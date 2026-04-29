import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, StatusBar, Alert, ActivityIndicator, Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTheme } from '@/hooks/useTheme';
import { ClientTopBar } from '@/components/client/ClientTopBar';
import { useAuthStore } from '@/store/auth.store';
import { useRoutinesStore } from '@/store/routines.store';
import { usePlansStore } from '@/store/plans.store';
import { ROUTINE_LEVEL_LABELS } from '@/types/routines';
import type { ClientRoutine, Exercise } from '@/types/routines';

// ─── Circular progress ────────────────────────────────────────
function CircularProgress({ pct, size = 52, color }: { pct: number; size?: number; color: string }) {
  const radius = (size - 6) / 2;
  const circumference = 2 * Math.PI * radius;
  const filled = circumference * (pct / 100);
  // Simple arc using border trick — works without SVG
  return (
    <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
      <View style={{
        width: size, height: size, borderRadius: size / 2,
        borderWidth: 4, borderColor: color + '30',
        justifyContent: 'center', alignItems: 'center',
        overflow: 'hidden',
      }}>
        {/* Filled arc approximation using background */}
        <View style={{
          position: 'absolute', width: size, height: size, borderRadius: size / 2,
          borderWidth: 4, borderColor: color,
          borderTopColor: pct >= 25 ? color : 'transparent',
          borderRightColor: pct >= 50 ? color : 'transparent',
          borderBottomColor: pct >= 75 ? color : 'transparent',
          borderLeftColor: pct >= 100 ? color : 'transparent',
          transform: [{ rotate: '-90deg' }],
        }} />
        <Text style={{ fontSize: 12, fontWeight: '800', color }}>{pct}%</Text>
      </View>
    </View>
  );
}

// ─── Exercise checklist item ──────────────────────────────────
function ExerciseCheckItem({ exercise, completed, onToggle, onDemo, T }: {
  exercise: Exercise; completed: boolean; onToggle: () => void; onDemo?: () => void; T: any;
}) {
  return (
    <TouchableOpacity
      onPress={onToggle}
      activeOpacity={0.75}
      style={[styles.checkItem, {
        backgroundColor: completed ? T.green + '10' : T.bg,
        borderColor: completed ? T.green + '44' : T.border,
      }]}
    >
      {/* Checkbox */}
      <View style={[styles.checkbox, {
        borderColor: completed ? T.green : T.border,
        backgroundColor: completed ? T.green : 'transparent',
      }]}>
        {completed && <Text style={{ color: '#fff', fontSize: 11, fontWeight: '900' }}>✓</Text>}
      </View>

      {/* Content */}
      <View style={{ flex: 1 }}>
        <Text style={[styles.checkName, {
          color: completed ? T.textMuted : T.text,
          textDecorationLine: completed ? 'line-through' : 'none',
        }]}>
          {exercise.name}
        </Text>
        <Text style={[styles.checkMeta, { color: T.textSecondary }]}>
          {exercise.sets} series × {exercise.reps} reps · {exercise.rest_seconds}s descanso
        </Text>
        {exercise.notes ? (
          <Text style={{ fontSize: 11, color: T.textMuted, marginTop: 2, fontStyle: 'italic' }}>
            💡 {exercise.notes}
          </Text>
        ) : null}
      </View>

      {/* Right column: demo button + muscle badge */}
      <View style={{ alignItems: 'flex-end', gap: 6 }}>
        {exercise.demo_video_storage_path && onDemo && (
          <TouchableOpacity
            onPress={(e) => { e.stopPropagation?.(); onDemo(); }}
            style={[styles.demoBadge, { backgroundColor: T.accent }]}
            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
          >
            <Text style={{ fontSize: 10, fontWeight: '800', color: '#fff' }}>▶ Demo</Text>
          </TouchableOpacity>
        )}
        <View style={[styles.muscleBadge, { backgroundColor: T.accent + '18' }]}>
          <Text style={{ fontSize: 9, fontWeight: '700', color: T.accent }}>{exercise.muscle}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ─── Routine accordion card ───────────────────────────────────
function RoutineAccordion({ routine, expanded, onToggleExpand, onToggleExercise, onDemo, T }: {
  routine: ClientRoutine;
  expanded: boolean;
  onToggleExpand: () => void;
  onToggleExercise: (exerciseId: string, completed: boolean) => void;
  onDemo: (exercise: Exercise) => void;
  T: any;
}) {
  const allDone = routine.completedCount === routine.totalCount && routine.totalCount > 0;
  const levelColor = { beginner: T.green, intermediate: T.accent, advanced: T.red }[routine.level] ?? T.accent;
  const progressColor = allDone ? T.green : T.accent;

  return (
    <View style={[styles.accordionCard, {
      backgroundColor: T.bgCard,
      borderColor: allDone ? T.green + '55' : T.border,
      borderRadius: T.radiusMd,
    }]}>
      {/* ── Header (always visible) ── */}
      <TouchableOpacity onPress={onToggleExpand} activeOpacity={0.8} style={styles.accordionHeader}>
        {/* Left: progress circle */}
        <CircularProgress pct={routine.progressPct} size={52} color={progressColor} />

        {/* Center: info */}
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={{ fontSize: 16, fontWeight: '800', color: T.text }} numberOfLines={1}>
            {routine.name}
          </Text>
          {routine.description ? (
            <Text style={{ fontSize: 12, color: T.textSecondary, marginTop: 2 }} numberOfLines={1}>
              {routine.description}
            </Text>
          ) : null}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 }}>
            <View style={[styles.levelBadge, { backgroundColor: levelColor + '20' }]}>
              <Text style={{ fontSize: 9, fontWeight: '700', color: levelColor }}>
                {ROUTINE_LEVEL_LABELS[routine.level]}
              </Text>
            </View>
            <Text style={{ fontSize: 11, color: T.textMuted }}>
              {routine.completedCount}/{routine.totalCount} ejercicios
            </Text>
            {allDone && <Text style={{ fontSize: 11, color: T.green, fontWeight: '700' }}>🎉 Completado</Text>}
          </View>
        </View>

        {/* Right: expand arrow */}
        <Text style={{ fontSize: 18, color: T.textMuted, marginLeft: 8 }}>
          {expanded ? '▲' : '▼'}
        </Text>
      </TouchableOpacity>

      {/* ── Progress bar ── */}
      <View style={{ paddingHorizontal: 16, paddingBottom: expanded ? 0 : 12 }}>
        <View style={[styles.progressBg, { backgroundColor: T.border }]}>
          <View style={[styles.progressFill, {
            width: `${routine.progressPct}%` as any,
            backgroundColor: progressColor,
          }]} />
        </View>
      </View>

      {/* ── Checklist (expanded) ── */}
      {expanded && (
        <View style={{ paddingHorizontal: 12, paddingBottom: 12, paddingTop: 8 }}>
          <View style={[styles.divider, { backgroundColor: T.border }]} />
          <Text style={[styles.sectionLabel, { color: T.textMuted }]}>
            EJERCICIOS — {routine.completedCount} de {routine.totalCount} completados
          </Text>
          {(routine.exercises ?? []).length === 0 ? (
            <Text style={{ color: T.textMuted, fontSize: 13, textAlign: 'center', paddingVertical: 16 }}>
              Esta rutina no tiene ejercicios aún.
            </Text>
          ) : (
            (routine.exercises ?? []).map((ex) => {
              const prog = routine.progress.find((p) => p.exercise_id === ex.id);
              return (
                <ExerciseCheckItem
                  key={ex.id}
                  exercise={ex}
                  completed={prog?.completed ?? false}
                  onToggle={() => onToggleExercise(ex.id, !(prog?.completed ?? false))}
                  onDemo={() => onDemo(ex)}
                  T={T}
                />
              );
            })
          )}

          {/* Complete all button */}
          {allDone && (
            <View style={[styles.completedBanner, { backgroundColor: T.green + '18', borderColor: T.green + '44' }]}>
              <Text style={{ color: T.green, fontWeight: '700', fontSize: 14, textAlign: 'center' }}>
                🎉 ¡Excelente! Rutina completada al 100%
              </Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────
export default function RoutineScreen() {
  const T = useTheme();
  const router = useRouter();
  const { user } = useAuthStore();
  const { mySubscription } = usePlansStore();
  const { clientRoutines, isLoadingClient, error, loadClientRoutines, toggleExerciseDone } = useRoutinesStore();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const clientPlan = mySubscription?.plan?.plan_tier ?? null;
  const clientLevel = user?.client_level ?? null;

  useEffect(() => {
    if (user?.id && user?.tenant_id) {
      loadClientRoutines(user.id, user.tenant_id, clientPlan, clientLevel);
    }
  }, [user?.id, user?.tenant_id, clientPlan, clientLevel]);

  // Auto-expand first routine on load
  useEffect(() => {
    if (clientRoutines.length > 0 && !expandedId) {
      setExpandedId(clientRoutines[0].id);
    }
  }, [clientRoutines.length]);

  const handleDemo = (exercise: Exercise) => {
    if (!exercise.demo_video_storage_path) return;
    router.push({
      pathname: '/(client)/exercise-demo',
      params: {
        storagePath: exercise.demo_video_storage_path,
        name: exercise.name,
        muscle: exercise.muscle,
      },
    } as any);
  };

  const handleToggle = async (routine: ClientRoutine, exerciseId: string, completed: boolean) => {
    if (!user?.id || !user?.tenant_id) return;
    try {
      await toggleExerciseDone(routine.id, exerciseId, user.id, user.tenant_id, completed);
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'No se pudo actualizar el progreso.');
    }
  };

  // Overall progress across all routines
  const totalExercises = clientRoutines.reduce((s, r) => s + r.totalCount, 0);
  const totalCompleted = clientRoutines.reduce((s, r) => s + r.completedCount, 0);
  const overallPct = totalExercises > 0 ? Math.round((totalCompleted / totalExercises) * 100) : 0;

  if (isLoadingClient) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: T.bg }} edges={['left', 'right']}>
        <ClientTopBar title="Rutina" />
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator color={T.accent} size="large" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: T.bg }]} edges={['left', 'right']}>
      <StatusBar barStyle="light-content" backgroundColor={T.bg} />
      <ClientTopBar title="Rutina" />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {clientRoutines.length === 0 ? (
          <View style={{ paddingVertical: 80, alignItems: 'center' }}>
            <Text style={{ fontSize: 48, marginBottom: 16 }}>💪</Text>
            <Text style={{ fontSize: 18, fontWeight: '700', color: T.text, marginBottom: 8 }}>
              Sin rutinas asignadas
            </Text>
            <Text style={{ fontSize: 14, color: T.textMuted, textAlign: 'center' }}>
              Tu coach asignará una rutina personalizada para ti pronto.
            </Text>
          </View>
        ) : (
          <>
            {/* Overall progress summary */}
            {clientRoutines.length > 1 && (
              <View style={[styles.summaryCard, { backgroundColor: T.bgCard, borderColor: T.border }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <View>
                    <Text style={{ fontSize: 13, color: T.textSecondary, marginBottom: 2 }}>Progreso total de hoy</Text>
                    <Text style={{ fontSize: 22, fontWeight: '800', color: T.text }}>
                      {totalCompleted}/{totalExercises}
                      <Text style={{ fontSize: 14, color: T.textMuted, fontWeight: '400' }}> ejercicios</Text>
                    </Text>
                  </View>
                  <CircularProgress pct={overallPct} size={60} color={overallPct === 100 ? T.green : T.accent} />
                </View>
                <View style={[styles.progressBg, { backgroundColor: T.border, marginTop: 10 }]}>
                  <View style={[styles.progressFill, {
                    width: `${overallPct}%` as any,
                    backgroundColor: overallPct === 100 ? T.green : T.accent,
                  }]} />
                </View>
              </View>
            )}

            {/* Routine accordions */}
            {clientRoutines.map((routine) => (
              <RoutineAccordion
                key={routine.id}
                routine={routine}
                expanded={expandedId === routine.id}
                onToggleExpand={() => setExpandedId(expandedId === routine.id ? null : routine.id)}
                onToggleExercise={(exerciseId, completed) => handleToggle(routine, exerciseId, completed)}
                onDemo={handleDemo}
                T={T}
              />
            ))}
          </>
        )}

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { padding: 16, gap: 12 },
  summaryCard: { borderWidth: 1, borderRadius: 14, padding: 16, marginBottom: 4 },
  accordionCard: { borderWidth: 1, overflow: 'hidden' },
  accordionHeader: { flexDirection: 'row', alignItems: 'center', padding: 14 },
  levelBadge: { borderRadius: 5, paddingHorizontal: 7, paddingVertical: 2 },
  progressBg: { height: 5, borderRadius: 3 },
  progressFill: { height: 5, borderRadius: 3 },
  divider: { height: 1, marginBottom: 10 },
  sectionLabel: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8 },
  checkItem: {
    flexDirection: 'row', alignItems: 'flex-start',
    borderWidth: 1, borderRadius: 10, padding: 12,
    marginBottom: 6, gap: 10,
  },
  checkbox: {
    width: 24, height: 24, borderRadius: 6, borderWidth: 2,
    justifyContent: 'center', alignItems: 'center', marginTop: 1,
  },
  checkName: { fontSize: 14, fontWeight: '700', marginBottom: 2 },
  checkMeta: { fontSize: 11 },
  muscleBadge: { borderRadius: 5, paddingHorizontal: 6, paddingVertical: 3, alignSelf: 'flex-start', marginTop: 2 },
  demoBadge: { borderRadius: 5, paddingHorizontal: 7, paddingVertical: 3 },
  completedBanner: {
    borderRadius: 10, borderWidth: 1, padding: 12, marginTop: 8,
  },
});
