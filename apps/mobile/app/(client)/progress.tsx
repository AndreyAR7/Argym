import React from 'react';
import { View, Text, ScrollView, StyleSheet, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/hooks/useTheme';
import { StatCard } from '@/components/client/StatCard';
import { SectionHeader } from '@/components/client/SectionHeader';
import { ClientTopBar } from '@/components/client/ClientTopBar';
import { MOCK_PROGRESS } from '@/data/clientMock';

function WeekBar({ day, completed, minutes, accent, border, bgSurface }: {
  day: string; completed: boolean; minutes: number; accent: string; border: string; bgSurface: string;
}) {
  const maxH = 60;
  const h = minutes > 0 ? Math.max(8, (minutes / 70) * maxH) : 4;
  return (
    <View style={{ alignItems: 'center', gap: 6, flex: 1 }}>
      <View style={[styles.barBg, { height: maxH, backgroundColor: bgSurface }]}>
        <View style={[styles.barFill, { height: h, backgroundColor: completed ? accent : border }]} />
      </View>
      <Text style={[styles.dayLabel, { color: completed ? '#F0F0FF' : '#5A5A7A' }]}>{day}</Text>
      {completed && <View style={[styles.dot, { backgroundColor: accent }]} />}
    </View>
  );
}

function MiniChart({ values, color }: { values: number[]; color: string }) {
  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = max - min || 1;
  return (
    <View style={styles.miniChart}>
      {values.map((v, i) => {
        const h = ((v - min) / range) * 40 + 8;
        return (
          <View key={i} style={{ flex: 1, justifyContent: 'flex-end', alignItems: 'center' }}>
            <View style={[styles.miniBar, { height: h, backgroundColor: i === values.length - 1 ? color : color + '55' }]} />
          </View>
        );
      })}
    </View>
  );
}

export default function ProgressScreen() {
  const T = useTheme();
  const p = MOCK_PROGRESS;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: T.bg }]} edges={['left', 'right']}>
      <StatusBar barStyle="light-content" backgroundColor={T.bg} />
      <ClientTopBar title="Mi Progreso" />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: T.text }]}>Mi Progreso</Text>
          <Text style={[styles.subtitle, { color: T.textMuted }]}>Semana actual</Text>
        </View>

        <View style={[styles.weekCard, { backgroundColor: T.bgCard, borderColor: T.border, borderRadius: T.radiusMd, ...T.shadowCard }]}>
          <View style={styles.weekHeader}>
            <View>
              <Text style={[styles.cardTitle, { color: T.text }]}>Actividad semanal</Text>
              <Text style={[styles.cardSub, { color: T.textMuted }]}>{p.weeklyActivity.filter((d) => d.completed).length} de 7 días completados</Text>
            </View>
            <View style={[styles.completionBadge, { backgroundColor: T.accentGlow }]}>
              <Text style={[styles.completionText, { color: T.accent }]}>{p.completionRate}%</Text>
            </View>
          </View>
          <View style={styles.weekBars}>
            {p.weeklyActivity.map((d) => (
              <WeekBar key={d.day} day={d.day} completed={d.completed} minutes={d.minutes} accent={T.accent} border={T.border} bgSurface={T.bgSurface} />
            ))}
          </View>
        </View>

        <View style={styles.statsRow}>
          <StatCard label="Entrenamientos" value={p.totalWorkouts} icon="💪" accent={T.accent} />
          <View style={{ width: 10 }} />
          <StatCard label="Minutos activos" value={p.totalMinutes} icon="⏱" accent={T.green} />
        </View>

        <View style={styles.section}>
          <SectionHeader title="Métricas corporales" subtitle="Última medición" />
          {p.metrics.map((m) => (
            <View key={m.label} style={[styles.metricRow, { backgroundColor: T.bgCard, borderColor: T.border, borderRadius: T.radiusMd, ...T.shadowCard }]}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.metricLabel, { color: T.textMuted }]}>{m.label}</Text>
                <View style={styles.metricValueRow}>
                  <Text style={[styles.metricValue, { color: T.text }]}>{m.value}</Text>
                  <Text style={[styles.metricUnit, { color: T.textSecondary }]}>{m.unit}</Text>
                </View>
              </View>
              <View style={styles.changeContainer}>
                <Text style={[styles.changeText, { color: m.change < 0 ? T.green : T.orange }]}>
                  {m.change > 0 ? '+' : ''}{m.change} {m.unit}
                </Text>
                <Text style={[styles.changeDate, { color: T.textMuted }]}>{new Date(m.date).toLocaleDateString('es-CR', { day: 'numeric', month: 'short' })}</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <SectionHeader title="Evolución de peso" subtitle="Últimas 6 semanas" />
          <View style={[styles.chartCard, { backgroundColor: T.bgCard, borderColor: T.border, borderRadius: T.radiusMd }]}>
            <MiniChart values={p.weightHistory} color={T.accent} />
            <View style={styles.chartLabels}>
              {p.weekLabels.map((l) => <Text key={l} style={[styles.chartLabel, { color: T.textMuted }]}>{l}</Text>)}
            </View>
            <View style={styles.chartLegend}>
              <Text style={[styles.chartLegendText, { color: T.textSecondary }]}>
                Inicio: {p.weightHistory[0]} kg → Actual: {p.weightHistory[p.weightHistory.length - 1]} kg
              </Text>
              <Text style={[styles.chartLegendChange, { color: T.green }]}>
                {(p.weightHistory[p.weightHistory.length - 1] - p.weightHistory[0]).toFixed(1)} kg
              </Text>
            </View>
          </View>
        </View>

        <View style={[styles.streakCard, { backgroundColor: T.bgCard, borderColor: T.orange + '44', borderRadius: T.radiusMd, ...T.shadowCard }]}>
          <Text style={{ fontSize: 32 }}>🔥</Text>
          <View style={{ flex: 1, marginLeft: 14 }}>
            <Text style={[styles.streakTitle, { color: T.text }]}>¡Racha activa!</Text>
            <Text style={[styles.streakDesc, { color: T.textSecondary }]}>Llevas 7 días consecutivos entrenando. ¡Sigue así!</Text>
          </View>
          <Text style={[styles.streakNumber, { color: T.orange }]}>7</Text>
        </View>

        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { padding: 16 },
  header: { marginBottom: 20 },
  title: { fontSize: 26, fontWeight: '800' },
  subtitle: { fontSize: 14, marginTop: 2 },
  weekCard: { padding: 16, marginBottom: 14, borderWidth: 1 },
  weekHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  cardTitle: { fontSize: 15, fontWeight: '700' },
  cardSub: { fontSize: 12, marginTop: 2 },
  completionBadge: { borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6 },
  completionText: { fontSize: 18, fontWeight: '800' },
  weekBars: { flexDirection: 'row', alignItems: 'flex-end', gap: 4 },
  barBg: { width: '100%', borderRadius: 4, justifyContent: 'flex-end', overflow: 'hidden' },
  barFill: { width: '100%', borderRadius: 4 },
  dayLabel: { fontSize: 11, fontWeight: '600' },
  dot: { width: 5, height: 5, borderRadius: 3 },
  statsRow: { flexDirection: 'row', marginBottom: 24 },
  section: { marginBottom: 24 },
  metricRow: { flexDirection: 'row', alignItems: 'center', padding: 14, marginBottom: 8, borderWidth: 1 },
  metricLabel: { fontSize: 12, fontWeight: '500', marginBottom: 2 },
  metricValueRow: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
  metricValue: { fontSize: 22, fontWeight: '800' },
  metricUnit: { fontSize: 13 },
  changeContainer: { alignItems: 'flex-end' },
  changeText: { fontSize: 14, fontWeight: '700' },
  changeDate: { fontSize: 11, marginTop: 2 },
  miniChart: { flexDirection: 'row', alignItems: 'flex-end', height: 56, gap: 4, marginBottom: 8 },
  miniBar: { width: '100%', borderRadius: 3 },
  chartCard: { padding: 16, borderWidth: 1 },
  chartLabels: { flexDirection: 'row', justifyContent: 'space-between' },
  chartLabel: { fontSize: 10, flex: 1, textAlign: 'center' },
  chartLegend: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
  chartLegendText: { fontSize: 12 },
  chartLegendChange: { fontSize: 13, fontWeight: '700' },
  streakCard: { flexDirection: 'row', alignItems: 'center', padding: 16, borderWidth: 1, marginBottom: 8 },
  streakTitle: { fontSize: 15, fontWeight: '700' },
  streakDesc: { fontSize: 12, marginTop: 2 },
  streakNumber: { fontSize: 36, fontWeight: '900' },
});
