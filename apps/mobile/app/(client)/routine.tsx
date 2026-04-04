import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, StatusBar, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/hooks/useTheme';
import { SectionHeader } from '@/components/client/SectionHeader';
import { ClientTopBar } from '@/components/client/ClientTopBar';
import { MOCK_ROUTINE, MOCK_VIDEOS } from '@/data/clientMock';

function ExerciseItem({ exercise, onToggle, T }: {
  exercise: typeof MOCK_ROUTINE.exercises[0]; onToggle: () => void; T: any;
}) {
  return (
    <TouchableOpacity onPress={onToggle} activeOpacity={0.85}
      style={[styles.exerciseCard, { backgroundColor: T.bgCard, borderColor: exercise.completed ? T.green + '44' : T.border, borderRadius: T.radiusMd }]}>
      <View style={[styles.checkCircle, { borderColor: exercise.completed ? T.green : T.border, backgroundColor: exercise.completed ? T.green : 'transparent' }]}>
        {exercise.completed && <Text style={{ color: '#fff', fontSize: 12, fontWeight: '800' }}>✓</Text>}
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.exerciseName, { color: exercise.completed ? T.textMuted : T.text, textDecorationLine: exercise.completed ? 'line-through' : 'none' }]}>
          {exercise.name}
        </Text>
        <Text style={[styles.exerciseMeta, { color: T.textSecondary }]}>
          {exercise.sets} series × {exercise.reps} reps · {exercise.rest}s descanso
        </Text>
        <View style={[styles.muscleBadge, { backgroundColor: T.accent + '22' }]}>
          <Text style={[styles.muscleText, { color: T.accent }]}>{exercise.muscle}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default function RoutineScreen() {
  const T = useTheme();
  const [exercises, setExercises] = useState(MOCK_ROUTINE.exercises);
  const completed = exercises.filter((e) => e.completed).length;
  const total = exercises.length;
  const progress = Math.round((completed / total) * 100);
  const allDone = completed === total;

  const toggleExercise = (id: string) => setExercises((prev) => prev.map((e) => e.id === id ? { ...e, completed: !e.completed } : e));
  const handleComplete = () => Alert.alert('¡Entrenamiento completado!', '🎉 Excelente trabajo. Tu progreso ha sido registrado.', [{ text: 'Cerrar' }]);
  const relatedVideos = MOCK_VIDEOS.filter((v) => v.is_assigned && v.category === 'Fuerza');

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: T.bg }]} edges={['left', 'right']}>
      <StatusBar barStyle="light-content" backgroundColor={T.bg} />
      <ClientTopBar title="Rutina" />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: T.text }]}>{MOCK_ROUTINE.name}</Text>
          <Text style={[styles.subtitle, { color: T.textSecondary }]}>{MOCK_ROUTINE.description}</Text>
        </View>

        <View style={[styles.progressCard, { backgroundColor: T.bgCard, borderColor: T.border, borderRadius: T.radiusMd }]}>
          <View style={styles.progressTop}>
            <Text style={[styles.progressLabel, { color: T.textSecondary }]}>Progreso de hoy</Text>
            <Text style={[styles.progressPct, { color: allDone ? T.green : T.accent }]}>{completed}/{total} ejercicios</Text>
          </View>
          <View style={[styles.progressBg, { backgroundColor: T.border }]}>
            <View style={[styles.progressFill, { width: `${progress}%` as any, backgroundColor: allDone ? T.green : T.accent }]} />
          </View>
          {allDone && <Text style={[styles.allDoneText, { color: T.green }]}>🎉 ¡Todos los ejercicios completados!</Text>}
        </View>

        <View style={styles.section}>
          <SectionHeader title="Ejercicios" subtitle={`${total} ejercicios programados`} />
          {exercises.map((ex) => <ExerciseItem key={ex.id} exercise={ex} onToggle={() => toggleExercise(ex.id)} T={T} />)}
        </View>

        <TouchableOpacity onPress={handleComplete}
          style={[styles.ctaBtn, { backgroundColor: allDone ? T.green : T.bgCardElevated, borderColor: allDone ? T.green : T.border, borderRadius: T.radiusMd }]}>
          <Text style={[styles.ctaBtnText, { color: allDone ? '#fff' : T.textMuted }]}>
            {allDone ? '✓ Marcar entrenamiento como completado' : `Completa todos los ejercicios (${total - completed} restantes)`}
          </Text>
        </TouchableOpacity>

        {relatedVideos.length > 0 && (
          <View style={styles.section}>
            <SectionHeader title="Videos relacionados" subtitle="Técnica y guía" />
            {relatedVideos.map((v) => (
              <View key={v.id} style={[styles.videoRow, { backgroundColor: T.bgCard, borderColor: T.border, borderRadius: T.radiusMd }]}>
                <View style={[styles.videoThumb, { backgroundColor: v.thumbnail_color + '33' }]}>
                  <Text style={{ fontSize: 20 }}>▶</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.videoTitle, { color: T.text }]}>{v.title}</Text>
                  <Text style={[styles.videoMeta, { color: T.textMuted }]}>{v.duration} · {v.category}</Text>
                </View>
              </View>
            ))}
          </View>
        )}
        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { padding: 16 },
  header: { marginBottom: 20 },
  title: { fontSize: 24, fontWeight: '800' },
  subtitle: { fontSize: 14, marginTop: 4 },
  progressCard: { borderWidth: 1, padding: 16, marginBottom: 24 },
  progressTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  progressLabel: { fontSize: 14, fontWeight: '500' },
  progressPct: { fontSize: 14, fontWeight: '700' },
  progressBg: { height: 6, borderRadius: 3 },
  progressFill: { height: 6, borderRadius: 3 },
  allDoneText: { fontSize: 13, fontWeight: '600', marginTop: 10, textAlign: 'center' },
  section: { marginBottom: 24 },
  exerciseCard: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, padding: 14, marginBottom: 8, gap: 12 },
  checkCircle: { width: 28, height: 28, borderRadius: 14, borderWidth: 2, justifyContent: 'center', alignItems: 'center' },
  exerciseName: { fontSize: 15, fontWeight: '700', marginBottom: 2 },
  exerciseMeta: { fontSize: 12, marginBottom: 6 },
  muscleBadge: { alignSelf: 'flex-start', borderRadius: 5, paddingHorizontal: 7, paddingVertical: 2 },
  muscleText: { fontSize: 10, fontWeight: '700' },
  ctaBtn: { borderWidth: 1, paddingVertical: 16, alignItems: 'center', marginBottom: 24 },
  ctaBtnText: { fontSize: 15, fontWeight: '700' },
  videoRow: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, padding: 12, marginBottom: 8 },
  videoThumb: { width: 60, height: 44, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  videoTitle: { fontSize: 13, fontWeight: '700', marginBottom: 2 },
  videoMeta: { fontSize: 11 },
});
