import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, StatusBar, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/hooks/useTheme';
import { ClientTopBar } from '@/components/client/ClientTopBar';
import { useAuthStore } from '@/store/auth.store';
import { fetchClientNutritionPlan } from '@/services/nutrition.service';
import type { NutritionAssignment, NutritionPlan } from '@/types/nutrition';

// ─── Macro progress bar ───────────────────────────────────────
function MacroBar({
  label, value, unit = 'g', max, color, T,
}: {
  label: string; value: number; unit?: string; max: number; color: string; T: any;
}) {
  const { t } = useTranslation();
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <View style={{ flex: 1 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 }}>
        <Text style={[styles.macroLabel, { color: T.textSecondary }]}>{label}</Text>
        <Text style={[styles.macroValue, { color }]}>
          {value}{unit}
        </Text>
      </View>
      <View style={[styles.macroBg, { backgroundColor: T.border }]}>
        <View style={[styles.macroFill, { width: `${pct}%` as any, backgroundColor: color }]} />
      </View>
      <Text style={[styles.macroPct, { color: T.textMuted }]}>{t('client.nutrition.ofTargetPct', { pct })}</Text>
    </View>
  );
}

// ─── Stat chip ────────────────────────────────────────────────
function StatChip({ label, value, color, bg, T }: {
  label: string; value: string; color: string; bg: string; T: any;
}) {
  return (
    <View style={[styles.statChip, { backgroundColor: bg }]}>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: T.textMuted }]}>{label}</Text>
    </View>
  );
}

// ─── Empty state ──────────────────────────────────────────────
function EmptyState({ T }: { T: any }) {
  const { t } = useTranslation();
  return (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyIcon}>🥗</Text>
      <Text style={[styles.emptyTitle, { color: T.text }]}>
        {t('client.nutrition.empty.title')}
      </Text>
      <Text style={[styles.emptyMessage, { color: T.textMuted }]}>
        {t('client.nutrition.empty.message')}
      </Text>
    </View>
  );
}

// ─── Main screen ─────────────────────────────────────────────
export default function NutritionScreen() {
  const { t } = useTranslation();
  const T = useTheme();
  const { user } = useAuthStore();

  const [assignment, setAssignment] = useState<NutritionAssignment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.id || !user?.tenant_id) return;
    setLoading(true);
    setError(null);
    fetchClientNutritionPlan(user.tenant_id, user.id)
      .then((data) => setAssignment(data))
      .catch(() => setError(t('client.nutrition.error')))
      .finally(() => setLoading(false));
  }, [user?.id, user?.tenant_id]);

  const plan: NutritionPlan | undefined = assignment?.nutrition_plan;

  // ── Loading ──
  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: T.bg }} edges={['left', 'right']}>
        <StatusBar barStyle="light-content" backgroundColor={T.bg} />
        <ClientTopBar title={t('navigation.nutrition')} />
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator color={T.accent} size="large" />
        </View>
      </SafeAreaView>
    );
  }

  // ── Error ──
  if (error) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: T.bg }} edges={['left', 'right']}>
        <StatusBar barStyle="light-content" backgroundColor={T.bg} />
        <ClientTopBar title={t('navigation.nutrition')} />
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 }}>
          <Text style={{ fontSize: 36, marginBottom: 16 }}>⚠️</Text>
          <Text style={{ fontSize: 15, color: T.textMuted, textAlign: 'center', lineHeight: 22 }}>
            {error}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // ── Calorie ring values ──
  const calories = plan?.calories_target ?? 0;
  const protein = plan?.protein_g ?? 0;
  const carbs = plan?.carbs_g ?? 0;
  const fat = plan?.fat_g ?? 0;

  // Macros contribution to calories (for context display)
  const calsFromProtein = Math.round(protein * 4);
  const calsFromCarbs = Math.round(carbs * 4);
  const calsFromFat = Math.round(fat * 9);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: T.bg }]} edges={['left', 'right']}>
      <StatusBar barStyle="light-content" backgroundColor={T.bg} />
      <ClientTopBar title={t('navigation.nutrition')} />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* ── Empty state ── */}
        {!plan ? (
          <EmptyState T={T} />
        ) : (
          <>
            {/* ── Plan header ── */}
            <View style={styles.header}>
              <Text style={[styles.title, { color: T.text }]} numberOfLines={2}>
                {plan.name}
              </Text>
              {plan.goal ? (
                <View style={[styles.goalBadge, { backgroundColor: T.accent + '20', borderColor: T.accent + '40' }]}>
                  <Text style={[styles.goalText, { color: T.accent }]}>
                    {t('client.nutrition.goalLabel', { goal: plan.goal })}
                  </Text>
                </View>
              ) : null}
              {plan.description ? (
                <Text style={[styles.description, { color: T.textSecondary }]}>
                  {plan.description}
                </Text>
              ) : null}
            </View>

            {/* ── Calorie target card ── */}
            <View style={[styles.calCard, { backgroundColor: T.bgCard, borderColor: T.border, borderRadius: T.radiusMd }]}>
              <Text style={[styles.cardSectionLabel, { color: T.textMuted }]}>{t('client.nutrition.dailyCalorieTarget')}</Text>
              <View style={styles.calRow}>
                <View style={{ flex: 1 }}>
                  <View style={styles.calValueRow}>
                    <Text style={[styles.calValue, { color: T.green }]}>{calories}</Text>
                    <Text style={[styles.calUnit, { color: T.textMuted }]}>kcal</Text>
                  </View>
                  <Text style={[styles.calSubtitle, { color: T.textSecondary }]}>
                    {t('client.nutrition.perDay')}
                  </Text>
                </View>
                <View style={[styles.calCircle, { backgroundColor: T.greenSoft }]}>
                  <Text style={[styles.calCircleIcon, { color: T.green }]}>🔥</Text>
                </View>
              </View>

              {/* Macro calorie breakdown chips */}
              {(protein > 0 || carbs > 0 || fat > 0) && (
                <View style={styles.chipRow}>
                  <StatChip label={t('client.nutrition.protein')} value={`${calsFromProtein} kcal`} color={T.accent} bg={T.accent + '18'} T={T} />
                  <StatChip label={t('client.nutrition.carbsShort')} value={`${calsFromCarbs} kcal`} color={T.orange} bg={T.orange + '18'} T={T} />
                  <StatChip label={t('client.nutrition.fat')} value={`${calsFromFat} kcal`} color={T.gold} bg={T.gold + '18'} T={T} />
                </View>
              )}
            </View>

            {/* ── Macronutrients card ── */}
            {(protein > 0 || carbs > 0 || fat > 0) && (
              <View style={[styles.macrosCard, { backgroundColor: T.bgCard, borderColor: T.border, borderRadius: T.radiusMd }]}>
                <Text style={[styles.cardSectionLabel, { color: T.textMuted }]}>{t('client.nutrition.macroTargets')}</Text>

                <MacroBar
                  label={t('client.nutrition.protein')}
                  value={protein}
                  max={250}
                  color={T.accent}
                  T={T}
                />
                <View style={{ height: 14 }} />
                <MacroBar
                  label={t('client.nutrition.carbs')}
                  value={carbs}
                  max={400}
                  color={T.orange}
                  T={T}
                />
                <View style={{ height: 14 }} />
                <MacroBar
                  label={t('client.nutrition.fat')}
                  value={fat}
                  max={120}
                  color={T.gold}
                  T={T}
                />

                {/* Total grams summary */}
                <View style={[styles.totalRow, { borderTopColor: T.border }]}>
                  <Text style={[styles.totalLabel, { color: T.textMuted }]}>{t('client.nutrition.totalMacros')}</Text>
                  <Text style={[styles.totalValue, { color: T.text }]}>
                    {protein + carbs + fat}g
                  </Text>
                </View>
              </View>
            )}

            {/* ── Coach note ── */}
            {assignment?.note ? (
              <View style={[styles.noteCard, { backgroundColor: T.bgCard, borderColor: T.accent + '33', borderRadius: T.radiusMd }]}>
                <Text style={styles.noteIcon}>💬</Text>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.noteLabel, { color: T.accent }]}>{t('client.nutrition.coachNote')}</Text>
                  <Text style={[styles.noteText, { color: T.textSecondary }]}>{assignment.note}</Text>
                </View>
              </View>
            ) : null}

            {/* ── Tips card ── */}
            <View style={[styles.tipsCard, { backgroundColor: T.bgCard, borderColor: T.border, borderRadius: T.radiusMd }]}>
              <Text style={[styles.cardSectionLabel, { color: T.textMuted }]}>{t('client.nutrition.generalTips')}</Text>
              {[
                t('client.nutrition.tips.hydration'),
                t('client.nutrition.tips.mealFrequency'),
                t('client.nutrition.tips.proteinPriority'),
                t('client.nutrition.tips.avoidSugar'),
              ].map((tip, i) => (
                <View key={i} style={styles.tipRow}>
                  <View style={[styles.tipDot, { backgroundColor: T.accent }]} />
                  <Text style={[styles.tipText, { color: T.textSecondary }]}>{tip}</Text>
                </View>
              ))}
            </View>
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

  // Empty state
  emptyContainer: { paddingVertical: 80, alignItems: 'center', paddingHorizontal: 24 },
  emptyIcon: { fontSize: 52, marginBottom: 18 },
  emptyTitle: { fontSize: 20, fontWeight: '800', marginBottom: 10, textAlign: 'center' },
  emptyMessage: { fontSize: 14, lineHeight: 22, textAlign: 'center' },

  // Header
  header: { marginBottom: 4 },
  title: { fontSize: 24, fontWeight: '800', marginBottom: 8 },
  goalBadge: { alignSelf: 'flex-start', borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, marginBottom: 8 },
  goalText: { fontSize: 12, fontWeight: '700' },
  description: { fontSize: 14, lineHeight: 20 },

  // Calorie card
  calCard: { borderWidth: 1, padding: 16 },
  calRow: { flexDirection: 'row', alignItems: 'center', marginTop: 10, marginBottom: 12 },
  calValueRow: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
  calValue: { fontSize: 40, fontWeight: '800' },
  calUnit: { fontSize: 16, fontWeight: '600' },
  calSubtitle: { fontSize: 12, marginTop: 2 },
  calCircle: { width: 60, height: 60, borderRadius: 30, justifyContent: 'center', alignItems: 'center' },
  calCircleIcon: { fontSize: 28 },
  chipRow: { flexDirection: 'row', gap: 8, marginTop: 4 },

  // Stat chip
  statChip: { flex: 1, borderRadius: 8, padding: 8, alignItems: 'center' },
  statValue: { fontSize: 12, fontWeight: '800', marginBottom: 2 },
  statLabel: { fontSize: 10, fontWeight: '500' },

  // Macros card
  macrosCard: { borderWidth: 1, padding: 16 },
  cardSectionLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 0.8, marginBottom: 14 },
  macroLabel: { fontSize: 13, fontWeight: '600' },
  macroValue: { fontSize: 13, fontWeight: '800' },
  macroBg: { height: 5, borderRadius: 3 },
  macroFill: { height: 5, borderRadius: 3 },
  macroPct: { fontSize: 10, marginTop: 3 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, paddingTop: 12, borderTopWidth: 1 },
  totalLabel: { fontSize: 12, fontWeight: '600' },
  totalValue: { fontSize: 14, fontWeight: '800' },

  // Note card
  noteCard: { flexDirection: 'row', borderWidth: 1, padding: 14, gap: 10 },
  noteIcon: { fontSize: 20 },
  noteLabel: { fontSize: 11, fontWeight: '700', marginBottom: 4 },
  noteText: { fontSize: 13, lineHeight: 19 },

  // Tips card
  tipsCard: { borderWidth: 1, padding: 16 },
  tipRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 10 },
  tipDot: { width: 6, height: 6, borderRadius: 3, marginTop: 6, flexShrink: 0 },
  tipText: { flex: 1, fontSize: 13, lineHeight: 19 },
});
