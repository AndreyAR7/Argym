import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, StatusBar,
  ActivityIndicator, Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/hooks/useTheme';
import { ClientTopBar } from '@/components/client/ClientTopBar';
import { useAuthStore } from '@/store/auth.store';
import { useProgressStore } from '@/store/progress.store';
import { computeBodyComposition, getCurrentWeekRange } from '@/services/progress.service';
import { MeasurementWizard } from '@/components/measurements/MeasurementWizard';
import type { BodyMeasurement } from '@/types/progress';
import type { Gender } from '@/lib/types';

const SCREEN_W = Dimensions.get('window').width;
const CHART_W = SCREEN_W - 64; // 16 scroll + 16 card * 2

// ─── Tab config ───────────────────────────────────────────────
const TABS = [
  { id: 'routines', emoji: '💪', labelKey: 'client.progress.tabs.routines' },
  { id: 'measures', emoji: '📏', labelKey: 'client.progress.tabs.measures' },
  { id: 'streak',   emoji: '🔥', labelKey: 'client.progress.tabs.streak'   },
] as const;
type TabId = typeof TABS[number]['id'];

// ─── Bar Chart ────────────────────────────────────────────────
function BarChart({ data, T }: {
  data: { label: string; pct: number }[];
  T: any;
}) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', height: 90, gap: 3 }}>
      {data.map((d, i) => {
        const h = Math.max(3, (d.pct / 100) * 64);
        const color = d.pct === 100 ? T.green : d.pct > 0 ? T.orange : T.border;
        return (
          <View key={i} style={{ flex: 1, alignItems: 'center' }}>
            {d.pct > 0 && (
              <Text style={{ fontSize: 8, color: T.textMuted, marginBottom: 2 }}>{d.pct}%</Text>
            )}
            <View style={{ flex: 1, justifyContent: 'flex-end', width: '80%' }}>
              <View style={{ height: h, backgroundColor: color, borderRadius: 3 }} />
            </View>
            <Text style={{ fontSize: 10, color: T.textMuted, marginTop: 3 }}>{d.label}</Text>
          </View>
        );
      })}
    </View>
  );
}

// ─── Line Sparkline (pure RN, no SVG) ────────────────────────
function Sparkline({ values, color }: { values: number[]; color: string }) {
  if (values.length < 2) return null;
  const w = CHART_W - 32;
  const h = 70;
  const pad = 8;
  const maxV = Math.max(...values);
  const minV = Math.min(...values);
  const range = maxV - minV || 1;

  const pts = values.map((v, i) => ({
    x: (i / (values.length - 1)) * w,
    y: pad + (h - pad * 2) - ((v - minV) / range) * (h - pad * 2),
  }));

  return (
    <View style={{ width: w, height: h, position: 'relative', alignSelf: 'center' }}>
      {pts.slice(1).map((p, i) => {
        const prev = pts[i];
        const dx = p.x - prev.x;
        const dy = p.y - prev.y;
        const len = Math.sqrt(dx * dx + dy * dy);
        const angle = Math.atan2(dy, dx) * (180 / Math.PI);
        return (
          <View
            key={`l${i}`}
            style={{
              position: 'absolute',
              left: (prev.x + p.x) / 2 - len / 2,
              top: (prev.y + p.y) / 2 - 1,
              width: len,
              height: 2,
              backgroundColor: color + 'AA',
              transform: [{ rotate: `${angle}deg` }],
            }}
          />
        );
      })}
      {pts.map((p, i) => (
        <View
          key={`d${i}`}
          style={{
            position: 'absolute',
            left: p.x - 5,
            top: p.y - 5,
            width: 10,
            height: 10,
            borderRadius: 5,
            backgroundColor: i === pts.length - 1 ? color : color + '66',
            borderWidth: i === pts.length - 1 ? 2 : 0,
            borderColor: '#fff',
          }}
        />
      ))}
    </View>
  );
}

// ─── Streak Calendar ──────────────────────────────────────────
function StreakCalendar({ activeDates, T }: { activeDates: string[]; T: any }) {
  const { t } = useTranslation();
  const today = new Date();
  // Align to Monday of current week, go back 4 more weeks = 5 weeks total
  const dow = today.getDay(); // 0=Sun
  const daysFromMon = dow === 0 ? 6 : dow - 1;
  const startMon = new Date(today);
  startMon.setDate(today.getDate() - daysFromMon - 28);

  const activeSet = new Set(activeDates);
  const weeks: { date: string; dayNum: number; active: boolean; future: boolean }[][] = [];

  for (let w = 0; w < 5; w++) {
    const week = [];
    for (let d = 0; d < 7; d++) {
      const cell = new Date(startMon);
      cell.setDate(startMon.getDate() + w * 7 + d);
      const dateStr = cell.toISOString().split('T')[0];
      week.push({
        date: dateStr,
        dayNum: cell.getDate(),
        active: cell <= today && activeSet.has(dateStr),
        future: cell > today,
      });
    }
    weeks.push(week);
  }

  const dayLabels = t('client.progress.streak.dayLabels', { returnObjects: true }) as unknown as string[];

  return (
    <View>
      <View style={{ flexDirection: 'row', marginBottom: 6 }}>
        {dayLabels.map((d) => (
          <View key={d} style={{ flex: 1, alignItems: 'center' }}>
            <Text style={{ fontSize: 10, color: T.textMuted, fontWeight: '600' }}>{d}</Text>
          </View>
        ))}
      </View>
      {weeks.map((week, wi) => (
        <View key={wi} style={{ flexDirection: 'row', marginBottom: 5 }}>
          {week.map((day) => (
            <View key={day.date} style={{ flex: 1, alignItems: 'center' }}>
              <View style={[
                styles.calCell,
                day.future
                  ? { backgroundColor: 'transparent', borderColor: 'transparent' }
                  : day.active
                  ? { backgroundColor: T.green + 'CC', borderColor: T.green + '55' }
                  : { backgroundColor: T.bgSurface, borderColor: T.border },
              ]}>
                {!day.future && (
                  <Text style={{ fontSize: 9, color: day.active ? '#fff' : T.textMuted, fontWeight: day.active ? '700' : '400' }}>
                    {day.dayNum}
                  </Text>
                )}
              </View>
            </View>
          ))}
        </View>
      ))}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 }}>
        <View style={{ width: 12, height: 12, borderRadius: 3, backgroundColor: T.green }} />
        <Text style={{ fontSize: 11, color: T.textMuted }}>{t('client.progress.streak.activeDayLegend')}</Text>
        <View style={{ width: 12, height: 12, borderRadius: 3, backgroundColor: T.bgSurface, borderWidth: 1, borderColor: T.border }} />
        <Text style={{ fontSize: 11, color: T.textMuted }}>{t('client.progress.streak.noActivityLegend')}</Text>
      </View>
    </View>
  );
}

// ─── Routines Tab ─────────────────────────────────────────────
function RoutinesTab({ T }: { T: any }) {
  const { t } = useTranslation();
  const { dailyProgress, routineStreak } = useProgressStore();
  const dayAbbr = t('client.progress.dayAbbr', { returnObjects: true }) as unknown as string[];
  const last7 = dailyProgress.slice(-7);
  const barData = last7.map((d) => ({
    label: dayAbbr[new Date(d.date + 'T12:00:00').getDay()],
    pct: d.pct,
  }));

  const activeDays = dailyProgress.filter((d) => d.pct > 0).length;
  const activeDaysWithExercises = dailyProgress.filter((d) => d.pct > 0);
  const avgPct = activeDaysWithExercises.length > 0
    ? Math.round(activeDaysWithExercises.reduce((s, d) => s + d.pct, 0) / activeDaysWithExercises.length)
    : 0;

  return (
    <View style={{ gap: 12 }}>
      <View style={[styles.card, { backgroundColor: T.bgCard, borderColor: T.border }]}>
        <Text style={[styles.cardTitle, { color: T.text }]}>{t('client.progress.routines.activityTitle')}</Text>
        <Text style={{ fontSize: 12, color: T.textMuted, marginBottom: 12 }}>
          {t('client.progress.routines.activeDaysOfWeek', { count: barData.filter((d) => d.pct > 0).length })}
        </Text>
        <BarChart data={barData} T={T} />
      </View>

      <View style={{ flexDirection: 'row', gap: 10 }}>
        <View style={[styles.statMini, { backgroundColor: T.bgCard, borderColor: T.border }]}>
          <Text style={{ fontSize: 28, fontWeight: '900', color: T.orange }}>{activeDays}</Text>
          <Text style={{ fontSize: 11, color: T.textMuted, marginTop: 2, textAlign: 'center' }}>{t('client.progress.routines.activeDaysLabel')}</Text>
          <Text style={{ fontSize: 10, color: T.textMuted, textAlign: 'center' }}>{t('client.progress.routines.last2Weeks')}</Text>
        </View>
        <View style={[styles.statMini, { backgroundColor: T.bgCard, borderColor: T.border }]}>
          <Text style={{ fontSize: 28, fontWeight: '900', color: T.green }}>{avgPct}%</Text>
          <Text style={{ fontSize: 11, color: T.textMuted, marginTop: 2, textAlign: 'center' }}>{t('client.progress.routines.averageLabel')}</Text>
          <Text style={{ fontSize: 10, color: T.textMuted, textAlign: 'center' }}>{t('client.progress.routines.completedLabel')}</Text>
        </View>
        <View style={[styles.statMini, { backgroundColor: T.bgCard, borderColor: T.border }]}>
          <Text style={{ fontSize: 26, fontWeight: '900', color: T.orange }}>
            {routineStreak?.currentStreak ?? 0}🔥
          </Text>
          <Text style={{ fontSize: 11, color: T.textMuted, marginTop: 2, textAlign: 'center' }}>{t('client.progress.routines.currentStreakLabel')}</Text>
          <Text style={{ fontSize: 10, color: T.textMuted, textAlign: 'center' }}>{t('client.progress.routines.consecutiveDaysLabel')}</Text>
        </View>
      </View>
    </View>
  );
}

// ─── Composition metric row ───────────────────────────────────
function CompRow({ label, value, unit, color, T }: {
  label: string; value: string | number | null; unit: string; color: string; T: any;
}) {
  if (value == null) return null;
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8,
      borderBottomWidth: 1, borderColor: T.border + '44' }}>
      <Text style={{ fontSize: 13, color: T.textSecondary }}>{label}</Text>
      <Text style={{ fontSize: 13, fontWeight: '700', color }}>
        {value} <Text style={{ fontWeight: '400', color: T.textMuted }}>{unit}</Text>
      </Text>
    </View>
  );
}

// ─── Before / After comparison card ──────────────────────────
function ComparisonCard({ measurements, T }: { measurements: BodyMeasurement[]; T: any }) {
  const { t } = useTranslation();
  if (measurements.length < 2) return null;
  const latest = measurements[0];
  const first  = measurements[measurements.length - 1];

  type MetricDef = { label: string; key: keyof BodyMeasurement; unit: string; lowerIsBetter: boolean | null };
  const metrics: MetricDef[] = [
    { label: t('measurements.labels.weight'),        key: 'weight_kg',    unit: 'kg', lowerIsBetter: true  },
    { label: t('client.progress.metrics.bodyFatPctShort'), key: 'body_fat_pct', unit: '%',  lowerIsBetter: true  },
    { label: t('measurements.labels.leanMass'),  key: 'muscle_mass_kg', unit: 'kg', lowerIsBetter: false },
    { label: t('measurements.labels.waist'),     key: 'waist_cm',     unit: 'cm', lowerIsBetter: true  },
    { label: t('client.progress.metrics.abdomen'),     key: 'abdomen_cm',   unit: 'cm', lowerIsBetter: true  },
    { label: t('measurements.labels.hip'),      key: 'hip_cm',       unit: 'cm', lowerIsBetter: null  },
    { label: t('measurements.labels.arm'),       key: 'arm_cm',       unit: 'cm', lowerIsBetter: false },
    { label: t('client.progress.metrics.thigh'),       key: 'thigh_cm',     unit: 'cm', lowerIsBetter: false },
    { label: t('client.progress.metrics.calf'), key: 'calf_cm',      unit: 'cm', lowerIsBetter: false },
  ];

  const rows = metrics.filter((m) => first[m.key] != null && latest[m.key] != null);
  if (!rows.length) return null;

  return (
    <View style={[styles.card, { backgroundColor: T.bgCard, borderColor: T.border }]}>
      <Text style={[styles.cardTitle, { color: T.text, marginBottom: 4 }]}>{t('client.progress.comparison.title')}</Text>
      <Text style={{ fontSize: 11, color: T.textMuted, marginBottom: 12 }}>
        {new Date(first.measured_at + 'T12:00:00').toLocaleDateString('es-CR', { day: 'numeric', month: 'short', year: 'numeric' })}
        {' → '}
        {new Date(latest.measured_at + 'T12:00:00').toLocaleDateString('es-CR', { day: 'numeric', month: 'short', year: 'numeric' })}
      </Text>
      {rows.map((m) => {
        const a = first[m.key] as number;
        const b = latest[m.key] as number;
        const delta = b - a;
        const improved =
          m.lowerIsBetter === null ? null :
          m.lowerIsBetter ? delta < 0 : delta > 0;
        const deltaColor = improved === null ? T.textMuted : improved ? T.green : T.orange;
        const sign = delta > 0 ? '+' : '';
        return (
          <View key={m.key} style={{
            flexDirection: 'row', alignItems: 'center',
            paddingVertical: 7, borderBottomWidth: 1, borderColor: T.border + '33',
          }}>
            <Text style={{ flex: 1, fontSize: 13, color: T.textSecondary }}>{m.label}</Text>
            <Text style={{ fontSize: 13, color: T.textMuted, width: 56, textAlign: 'right' }}>
              {a} {m.unit}
            </Text>
            <Text style={{ fontSize: 12, color: deltaColor, fontWeight: '700', width: 54, textAlign: 'right' }}>
              {sign}{delta.toFixed(1)} {m.unit}
            </Text>
            <Text style={{ fontSize: 13, color: T.text, fontWeight: '700', width: 56, textAlign: 'right' }}>
              {b} {m.unit}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

// ─── Medidas Tab ──────────────────────────────────────────────
function MedidasTab({ onAdd, T }: { onAdd: () => void; T: any }) {
  const { t } = useTranslation();
  const { measurements, thisWeekMeasurement } = useProgressStore();
  const latest = measurements[0];
  const weekRange = getCurrentWeekRange();
  const hasThisWeek = !!thisWeekMeasurement;

  const comp = latest ? computeBodyComposition(latest) : null;

  const weightHistory = [...measurements]
    .filter((m) => m.weight_kg != null)
    .reverse()
    .slice(-10)
    .map((m) => m.weight_kg as number);

  const firstWeight = weightHistory[0];
  const lastWeight = weightHistory[weightHistory.length - 1];
  const weightChange = weightHistory.length >= 2 && firstWeight != null && lastWeight != null
    ? lastWeight - firstWeight : null;

  const hasCircumferences = latest && (
    latest.neck_cm != null || latest.shoulder_cm != null || latest.abdomen_cm != null ||
    latest.thigh_cm != null || latest.calf_cm != null ||
    latest.waist_cm != null || latest.hip_cm != null || latest.arm_cm != null
  );

  return (
    <View style={{ gap: 12 }}>
      {/* Weekly limit notice */}
      {hasThisWeek && (
        <View style={[styles.card, { backgroundColor: T.orange + '12', borderColor: T.orange + '44' }]}>
          <Text style={{ fontSize: 13, color: T.orange, fontWeight: '700', marginBottom: 2 }}>
            📅 {t('client.progress.measures.thisWeekRegisteredTitle')}
          </Text>
          <Text style={{ fontSize: 12, color: T.textMuted }}>
            {t('client.progress.measures.thisWeekRange', { start: weekRange.start, end: weekRange.end })}
          </Text>
        </View>
      )}

      {/* Latest measurement summary */}
      {latest && (
        <View style={[styles.card, { backgroundColor: T.bgCard, borderColor: T.border }]}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <Text style={[styles.cardTitle, { color: T.text }]}>{t('client.progress.measures.bodyCompositionTitle')}</Text>
            <Text style={{ fontSize: 11, color: T.textMuted }}>
              {new Date(latest.measured_at + 'T12:00:00').toLocaleDateString('es-CR', { day: 'numeric', month: 'short', year: 'numeric' })}
            </Text>
          </View>

          {/* Primary metrics row */}
          <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
            {latest.weight_kg != null && (
              <View style={[styles.measureBadge, { borderColor: T.orange + '44', backgroundColor: T.orange + '18' }]}>
                <Text style={{ fontSize: 22, fontWeight: '900', color: T.orange }}>{latest.weight_kg}</Text>
                <Text style={{ fontSize: 10, color: T.textMuted }}>{t('client.progress.measures.weightKgLabel')}</Text>
              </View>
            )}
            {latest.height_cm != null && (
              <View style={[styles.measureBadge, { borderColor: T.accent + '44', backgroundColor: T.accent + '18' }]}>
                <Text style={{ fontSize: 22, fontWeight: '900', color: T.accent }}>{latest.height_cm}</Text>
                <Text style={{ fontSize: 10, color: T.textMuted }}>{t('client.progress.measures.heightCmLabel')}</Text>
              </View>
            )}
            {comp?.bmi != null && comp.bmiCategory && (
              <View style={[styles.measureBadge, { borderColor: comp.bmiCategory.color + '44', backgroundColor: comp.bmiCategory.color + '18' }]}>
                <Text style={{ fontSize: 22, fontWeight: '900', color: comp.bmiCategory.color }}>{comp.bmi}</Text>
                <Text style={{ fontSize: 10, color: T.textMuted }}>{t('measurements.labels.bmi')}</Text>
                <Text style={{ fontSize: 9, color: comp.bmiCategory.color, fontWeight: '700' }}>{comp.bmiCategory.label}</Text>
              </View>
            )}
          </View>

          {/* Body composition */}
          {(comp?.fatMassKg != null || comp?.leanMassKg != null || latest.body_fat_pct != null) && (
            <View style={{ marginBottom: hasCircumferences ? 12 : 0 }}>
              <Text style={{ fontSize: 11, fontWeight: '700', color: T.textMuted, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 4 }}>
                {t('client.progress.measures.compositionSectionLabel')}
              </Text>
              <CompRow label={t('measurements.labels.fatMass')}       value={comp?.fatMassKg ?? null}  unit="kg" color={T.orange} T={T} />
              <CompRow label={t('measurements.labels.bodyFat')}       value={comp?.fatPct ?? null}     unit="%" color={T.orange} T={T} />
              <CompRow label={t('measurements.labels.leanMass')}      value={comp?.leanMassKg ?? null} unit="kg" color={T.green} T={T} />
              <CompRow label={t('client.progress.measures.leanMassPct')} value={comp?.leanPct ?? null}    unit="%" color={T.green} T={T} />
            </View>
          )}

          {/* Circumferences */}
          {hasCircumferences && (
            <View>
              <Text style={{ fontSize: 11, fontWeight: '700', color: T.textMuted, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 4 }}>
                {t('client.progress.measures.circumferencesLabel')}
              </Text>
              <CompRow label={t('measurements.labels.neck')}          value={latest.neck_cm}     unit="cm" color={T.accent} T={T} />
              <CompRow label={t('client.progress.metrics.shoulder')}  value={latest.shoulder_cm} unit="cm" color={T.accent} T={T} />
              <CompRow label={t('client.progress.metrics.chest')}    value={latest.chest_cm}    unit="cm" color={T.accent} T={T} />
              <CompRow label={t('measurements.labels.waist')}         value={latest.waist_cm}    unit="cm" color={T.accent} T={T} />
              <CompRow label={t('client.progress.metrics.abdomen')}  value={latest.abdomen_cm}  unit="cm" color={T.accent} T={T} />
              <CompRow label={t('measurements.labels.hip')}           value={latest.hip_cm}      unit="cm" color={T.accent} T={T} />
              <CompRow label={t('measurements.labels.arm')}           value={latest.arm_cm}      unit="cm" color={T.accent} T={T} />
              <CompRow label={t('client.progress.metrics.thigh')}    value={latest.thigh_cm}    unit="cm" color={T.accent} T={T} />
              <CompRow label={t('client.progress.metrics.calf')}     value={latest.calf_cm}     unit="cm" color={T.accent} T={T} />
            </View>
          )}
        </View>
      )}

      {/* Weight trend sparkline */}
      {weightHistory.length >= 2 && (
        <View style={[styles.card, { backgroundColor: T.bgCard, borderColor: T.border }]}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <Text style={[styles.cardTitle, { color: T.text }]}>{t('client.progress.measures.weightEvolutionTitle')}</Text>
            {weightChange != null && (
              <Text style={{ fontSize: 13, fontWeight: '700', color: weightChange < 0 ? T.green : weightChange > 0 ? T.orange : T.textMuted }}>
                {weightChange > 0 ? '+' : ''}{weightChange.toFixed(1)} {t('measurements.labels.kg')}
              </Text>
            )}
          </View>
          <Sparkline values={weightHistory} color={T.orange} />
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 }}>
            <Text style={{ fontSize: 11, color: T.textMuted }}>{t('client.progress.measures.min')}: {Math.min(...weightHistory)} {t('measurements.labels.kg')}</Text>
            <Text style={{ fontSize: 11, color: T.textMuted }}>{t('client.progress.measures.max')}: {Math.max(...weightHistory)} {t('measurements.labels.kg')}</Text>
          </View>
        </View>
      )}

      {/* Before / After comparison */}
      <ComparisonCard measurements={measurements} T={T} />

      {/* Add / Edit button */}
      <TouchableOpacity
        onPress={onAdd}
        style={{ backgroundColor: T.orange, borderRadius: 12, padding: 14, alignItems: 'center' }}
      >
        <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15 }}>
          {hasThisWeek ? `✏️ ${t('client.progress.measures.editThisWeek')}` : `+ ${t('client.progress.measures.registerToday')}`}
        </Text>
      </TouchableOpacity>

      {!hasThisWeek && measurements.length > 0 && (
        <View style={{ paddingHorizontal: 4 }}>
          <Text style={{ fontSize: 11, color: T.textMuted, textAlign: 'center' }}>
            {t('client.progress.measures.weeklyLimitNote')}
          </Text>
        </View>
      )}

      {/* History list */}
      {measurements.length > 0 ? (
        <View style={[styles.card, { backgroundColor: T.bgCard, borderColor: T.border }]}>
          <Text style={[styles.cardTitle, { color: T.text, marginBottom: 12 }]}>{t('client.progress.measures.historyTitle')}</Text>
          {measurements.slice(0, 12).map((m, idx) => {
            const c = computeBodyComposition(m);
            const circumStr = [
              m.waist_cm   ? `${t('client.progress.measures.abbr.waist')}: ${m.waist_cm}` : null,
              m.abdomen_cm ? `${t('client.progress.measures.abbr.abdomen')}: ${m.abdomen_cm}` : null,
              m.hip_cm     ? `${t('client.progress.measures.abbr.hip')}: ${m.hip_cm}` : null,
              m.arm_cm     ? `${t('client.progress.measures.abbr.arm')}: ${m.arm_cm}` : null,
              m.thigh_cm   ? `${t('client.progress.measures.abbr.thigh')}: ${m.thigh_cm}` : null,
              m.calf_cm    ? `${t('client.progress.measures.abbr.calf')}: ${m.calf_cm}` : null,
            ].filter(Boolean).join(' · ');
            return (
              <View key={m.id} style={{
                paddingVertical: 10,
                borderBottomWidth: idx < Math.min(measurements.length, 12) - 1 ? 1 : 0,
                borderColor: T.border + '55',
              }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 13, fontWeight: '600', color: T.text }}>
                      {new Date(m.measured_at + 'T12:00:00').toLocaleDateString('es-CR', { weekday: 'short', day: 'numeric', month: 'short' })}
                    </Text>
                    {m.notes ? <Text style={{ fontSize: 11, color: T.textMuted, marginTop: 2 }}>{m.notes}</Text> : null}
                    {circumStr ? (
                      <Text style={{ fontSize: 10, color: T.textMuted, marginTop: 3 }}>{circumStr} {t('measurements.labels.cm')}</Text>
                    ) : null}
                  </View>
                  <View style={{ alignItems: 'flex-end', gap: 2 }}>
                    {m.weight_kg != null && (
                      <Text style={{ fontSize: 14, fontWeight: '700', color: T.orange }}>{m.weight_kg} {t('measurements.labels.kg')}</Text>
                    )}
                    {c.bmi != null && c.bmiCategory && (
                      <Text style={{ fontSize: 11, color: c.bmiCategory.color, fontWeight: '600' }}>
                        {t('measurements.labels.bmi')} {c.bmi} · {c.bmiCategory.label}
                      </Text>
                    )}
                    {m.body_fat_pct != null && (
                      <Text style={{ fontSize: 10, color: T.textMuted }}>{m.body_fat_pct}% {t('client.progress.measures.fatAbbr')}</Text>
                    )}
                  </View>
                </View>
              </View>
            );
          })}
        </View>
      ) : (
        <View style={{ paddingVertical: 40, alignItems: 'center' }}>
          <Text style={{ fontSize: 40, marginBottom: 12 }}>📏</Text>
          <Text style={{ fontSize: 16, fontWeight: '700', color: T.text, marginBottom: 6 }}>{t('client.progress.measures.emptyTitle')}</Text>
          <Text style={{ fontSize: 13, color: T.textMuted, textAlign: 'center', paddingHorizontal: 20 }}>
            {t('client.progress.measures.emptyBody')}
          </Text>
        </View>
      )}
    </View>
  );
}

// ─── Racha Tab ────────────────────────────────────────────────
function RachaTab({ T }: { T: any }) {
  const { t } = useTranslation();
  const { routineStreak, dailyProgress } = useProgressStore();
  const current = routineStreak?.currentStreak ?? 0;
  const longest = routineStreak?.longestStreak ?? 0;
  const totalActive = dailyProgress.filter((d) => d.pct > 0).length;

  const msg = current === 0 ? t('client.progress.streak.msg.start')
    : current < 3   ? t('client.progress.streak.msg.goodStart')
    : current < 7   ? t('client.progress.streak.msg.goingWell')
    : current < 14  ? t('client.progress.streak.msg.weeksInARow')
    : current < 30  ? t('client.progress.streak.msg.incredible')
    : t('client.progress.streak.msg.legend');

  return (
    <View style={{ gap: 12 }}>
      <View style={[styles.card, { backgroundColor: T.bgCard, borderColor: T.orange + '44', alignItems: 'center', paddingVertical: 28 }]}>
        <Text style={{ fontSize: 56 }}>🔥</Text>
        <Text style={{ fontSize: 72, fontWeight: '900', color: T.orange, lineHeight: 82 }}>{current}</Text>
        <Text style={{ fontSize: 16, fontWeight: '700', color: T.text }}>{t('client.progress.streak.daysLabel')}</Text>
        <Text style={{ fontSize: 13, color: T.textMuted, marginTop: 4 }}>{msg}</Text>
      </View>

      <View style={{ flexDirection: 'row', gap: 10 }}>
        <View style={[styles.card, { flex: 1, backgroundColor: T.bgCard, borderColor: T.border, alignItems: 'center' }]}>
          <Text style={{ fontSize: 30, fontWeight: '900', color: T.orange }}>{current}</Text>
          <Text style={{ fontSize: 11, color: T.textMuted, textAlign: 'center', marginTop: 2 }}>{t('client.progress.routines.currentStreakLabel')}</Text>
        </View>
        <View style={[styles.card, { flex: 1, backgroundColor: T.bgCard, borderColor: T.border, alignItems: 'center' }]}>
          <Text style={{ fontSize: 30, fontWeight: '900', color: T.green }}>{longest}</Text>
          <Text style={{ fontSize: 11, color: T.textMuted, textAlign: 'center', marginTop: 2 }}>{t('client.progress.streak.bestStreakLabel')}</Text>
        </View>
        <View style={[styles.card, { flex: 1, backgroundColor: T.bgCard, borderColor: T.border, alignItems: 'center' }]}>
          <Text style={{ fontSize: 30, fontWeight: '900', color: T.accent }}>{totalActive}</Text>
          <Text style={{ fontSize: 11, color: T.textMuted, textAlign: 'center', marginTop: 2 }}>{t('client.progress.routines.activeDaysLabel')}</Text>
          <Text style={{ fontSize: 10, color: T.textMuted, textAlign: 'center' }}>{t('client.progress.routines.last2Weeks')}</Text>
        </View>
      </View>

      <View style={[styles.card, { backgroundColor: T.bgCard, borderColor: T.border }]}>
        <Text style={[styles.cardTitle, { color: T.text, marginBottom: 14 }]}>{t('client.progress.streak.last5WeeksTitle')}</Text>
        <StreakCalendar activeDates={routineStreak?.activeDates ?? []} T={T} />
      </View>

      {current === 0 && (
        <View style={[styles.card, { backgroundColor: T.bgCard, borderColor: T.orange + '33' }]}>
          <Text style={{ fontSize: 14, fontWeight: '700', color: T.text, marginBottom: 4 }}>💡 {t('client.progress.streak.howItWorksTitle')}</Text>
          <Text style={{ fontSize: 13, color: T.textMuted, lineHeight: 20 }}>
            {t('client.progress.streak.howItWorksBody')}
          </Text>
        </View>
      )}
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────
export default function ProgressScreen() {
  const T = useTheme();
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const { isLoading, error, measurements, thisWeekMeasurement, loadAll, addMeasurement } = useProgressStore();
  const [activeTab, setActiveTab] = useState<TabId>('routines');
  const [showAddMeasure, setShowAddMeasure] = useState(false);

  useEffect(() => {
    if (user?.id && user?.tenant_id) loadAll(user.id, user.tenant_id);
  }, [user?.id, user?.tenant_id]);

  const lastHeight = measurements.find((m) => m.height_cm != null)?.height_cm?.toString() ?? '';

  const handleAddMeasurement = async (m: Partial<BodyMeasurement> & { notes?: string | null }) => {
    if (!user?.id || !user?.tenant_id) return;
    await addMeasurement({
      client_id: user.id,
      tenant_id: user.tenant_id,
      measured_at: new Date().toISOString().split('T')[0],
      weight_kg: m.weight_kg ?? null,
      height_cm: m.height_cm ?? null,
      body_fat_pct: m.body_fat_pct ?? null,
      muscle_mass_kg: m.muscle_mass_kg ?? null,
      neck_cm: m.neck_cm ?? null,
      shoulder_cm: m.shoulder_cm ?? null,
      chest_cm: m.chest_cm ?? null,
      waist_cm: m.waist_cm ?? null,
      abdomen_cm: m.abdomen_cm ?? null,
      hip_cm: m.hip_cm ?? null,
      arm_cm: m.arm_cm ?? null,
      thigh_cm: m.thigh_cm ?? null,
      calf_cm: m.calf_cm ?? null,
      notes: m.notes ?? null,
    });
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: T.bg }]} edges={['left', 'right']}>
      <StatusBar barStyle="light-content" backgroundColor={T.bg} />
      <ClientTopBar title={t('client.progress.title')} />

      {/* Tab pills */}
      <View style={[styles.tabRow, { borderBottomColor: T.border }]}>
        {TABS.map((tab) => (
          <TouchableOpacity
            key={tab.id}
            onPress={() => setActiveTab(tab.id)}
            style={[
              styles.tabPill,
              activeTab === tab.id
                ? { backgroundColor: T.orange, borderColor: T.orange }
                : { backgroundColor: T.bgCard, borderColor: T.border },
            ]}
          >
            <Text style={{ fontSize: 12, fontWeight: '700', color: activeTab === tab.id ? '#fff' : T.textMuted }}>
              {tab.emoji} {t(tab.labelKey)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {isLoading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator color={T.orange} size="large" />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {error ? (
            <View style={{ padding: 16, borderRadius: 10, backgroundColor: T.redSoft, marginBottom: 8 }}>
              <Text style={{ color: T.red, fontSize: 13 }}>{t('client.progress.loadError', { error })}</Text>
            </View>
          ) : null}

          {activeTab === 'routines' && <RoutinesTab T={T} />}
          {activeTab === 'measures' && <MedidasTab onAdd={() => setShowAddMeasure(true)} T={T} />}
          {activeTab === 'streak' && <RachaTab T={T} />}

          <View style={{ height: 32 }} />
        </ScrollView>
      )}

      <MeasurementWizard
        visible={showAddMeasure}
        onClose={() => setShowAddMeasure(false)}
        onSave={handleAddMeasurement}
        gender={(user as any)?.gender as Gender | null}
        existing={thisWeekMeasurement}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { padding: 16, gap: 12 },
  tabRow: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 10, gap: 8, borderBottomWidth: 1 },
  tabPill: { flex: 1, paddingVertical: 8, borderRadius: 10, borderWidth: 1, alignItems: 'center' },
  card: { borderWidth: 1, borderRadius: 14, padding: 16 },
  cardTitle: { fontSize: 15, fontWeight: '700' },
  statMini: { flex: 1, borderWidth: 1, borderRadius: 12, padding: 12, alignItems: 'center' },
  measureBadge: { borderWidth: 1, borderRadius: 10, padding: 10, alignItems: 'center', minWidth: 64 },
  calCell: { width: 28, height: 28, borderRadius: 6, borderWidth: 1, justifyContent: 'center', alignItems: 'center' },
});
