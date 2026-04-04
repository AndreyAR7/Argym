import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/hooks/useTheme';
import { SectionHeader } from '@/components/client/SectionHeader';
import { ClientTopBar } from '@/components/client/ClientTopBar';
import { MOCK_NUTRITION } from '@/data/clientMock';

function MacroBar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pct = Math.min(100, Math.round((value / max) * 100));
  return (
    <View style={{ flex: 1 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
        <Text style={styles.macroLabel}>{label}</Text>
        <Text style={[styles.macroValue, { color }]}>{value}g</Text>
      </View>
      <View style={styles.macroBg}>
        <View style={[styles.macroFill, { width: `${pct}%` as any, backgroundColor: color }]} />
      </View>
    </View>
  );
}

export default function NutritionScreen() {
  const T = useTheme();
  const [meals, setMeals] = useState(MOCK_NUTRITION.meals);
  const completed = meals.filter((m) => m.completed).length;
  const totalCals = meals.reduce((s, m) => s + m.calories, 0);
  const consumedCals = meals.filter((m) => m.completed).reduce((s, m) => s + m.calories, 0);
  const toggleMeal = (id: string) => setMeals((prev) => prev.map((m) => m.id === id ? { ...m, completed: !m.completed } : m));

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: T.bg }]} edges={['left', 'right']}>
      <StatusBar barStyle="light-content" backgroundColor={T.bg} />
      <ClientTopBar title="Nutrición" />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: T.text }]}>{MOCK_NUTRITION.name}</Text>
          <Text style={[styles.subtitle, { color: T.textSecondary }]}>{completed}/{meals.length} comidas completadas hoy</Text>
        </View>

        <View style={[styles.calCard, { backgroundColor: T.bgCard, borderColor: T.border, borderRadius: T.radiusMd }]}>
          <View style={styles.calRow}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.calLabel, { color: T.textMuted }]}>Calorías consumidas</Text>
              <View style={styles.calValueRow}>
                <Text style={[styles.calValue, { color: T.green }]}>{consumedCals}</Text>
                <Text style={[styles.calMax, { color: T.textMuted }]}>/ {totalCals} kcal</Text>
              </View>
            </View>
            <View style={[styles.calCircle, { backgroundColor: T.greenSoft }]}>
              <Text style={[styles.calPct, { color: T.green }]}>{Math.round((consumedCals / totalCals) * 100)}%</Text>
            </View>
          </View>
          <View style={[styles.calBg, { backgroundColor: T.border }]}>
            <View style={[styles.calFill, { width: `${(consumedCals / totalCals) * 100}%` as any, backgroundColor: T.green }]} />
          </View>
        </View>

        <View style={[styles.macrosCard, { backgroundColor: T.bgCard, borderColor: T.border, borderRadius: T.radiusMd }]}>
          <Text style={[styles.macrosTitle, { color: T.textMuted }]}>Macronutrientes objetivo</Text>
          <View style={styles.macrosRow}>
            <MacroBar label="Proteína" value={MOCK_NUTRITION.protein_g} max={200} color={T.accent} />
            <View style={{ width: 12 }} />
            <MacroBar label="Carbos" value={MOCK_NUTRITION.carbs_g} max={300} color={T.orange} />
            <View style={{ width: 12 }} />
            <MacroBar label="Grasas" value={MOCK_NUTRITION.fat_g} max={100} color={T.gold} />
          </View>
        </View>

        {MOCK_NUTRITION.coach_note && (
          <View style={[styles.noteCard, { backgroundColor: T.bgCard, borderColor: T.accent + '33', borderRadius: T.radiusMd }]}>
            <Text style={styles.noteIcon}>💬</Text>
            <View style={{ flex: 1 }}>
              <Text style={[styles.noteLabel, { color: T.accent }]}>Nota de tu coach</Text>
              <Text style={[styles.noteText, { color: T.textSecondary }]}>{MOCK_NUTRITION.coach_note}</Text>
            </View>
          </View>
        )}

        <View style={styles.section}>
          <SectionHeader title="Comidas del día" />
          {meals.map((meal) => (
            <TouchableOpacity key={meal.id} onPress={() => toggleMeal(meal.id)} activeOpacity={0.85}
              style={[styles.mealCard, { backgroundColor: T.bgCard, borderColor: meal.completed ? T.green + '33' : T.border, borderRadius: T.radiusMd }]}>
              <View style={styles.mealLeft}>
                <View style={[styles.mealCheck, { borderColor: meal.completed ? T.green : T.border, backgroundColor: meal.completed ? T.green : 'transparent' }]}>
                  {meal.completed && <Text style={{ color: '#fff', fontSize: 11, fontWeight: '800' }}>✓</Text>}
                </View>
                <View style={{ flex: 1 }}>
                  <View style={styles.mealTitleRow}>
                    <Text style={[styles.mealName, { color: meal.completed ? T.textMuted : T.text }]}>{meal.name}</Text>
                    <Text style={[styles.mealTime, { color: T.textMuted }]}>{meal.time}</Text>
                  </View>
                  <Text style={[styles.mealFoods, { color: T.textSecondary }]} numberOfLines={2}>{meal.foods.join(' · ')}</Text>
                </View>
              </View>
              <View style={[styles.calBadge, { backgroundColor: meal.completed ? T.greenSoft : T.bgSurface }]}>
                <Text style={[styles.calBadgeText, { color: meal.completed ? T.green : T.textMuted }]}>{meal.calories} kcal</Text>
              </View>
            </TouchableOpacity>
          ))}
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
  title: { fontSize: 24, fontWeight: '800' },
  subtitle: { fontSize: 14, marginTop: 4 },
  calCard: { borderWidth: 1, padding: 16, marginBottom: 12 },
  calRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  calLabel: { fontSize: 12, marginBottom: 4 },
  calValueRow: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
  calValue: { fontSize: 28, fontWeight: '800' },
  calMax: { fontSize: 14 },
  calCircle: { width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center' },
  calPct: { fontSize: 16, fontWeight: '800' },
  calBg: { height: 6, borderRadius: 3 },
  calFill: { height: 6, borderRadius: 3 },
  macrosCard: { borderWidth: 1, padding: 16, marginBottom: 12 },
  macrosTitle: { fontSize: 13, fontWeight: '600', marginBottom: 12 },
  macrosRow: { flexDirection: 'row' },
  macroLabel: { fontSize: 11, fontWeight: '500' },
  macroValue: { fontSize: 12, fontWeight: '700' },
  macroBg: { height: 4, borderRadius: 2 },
  macroFill: { height: 4, borderRadius: 2 },
  noteCard: { flexDirection: 'row', borderWidth: 1, padding: 14, gap: 10, marginBottom: 20 },
  noteIcon: { fontSize: 20 },
  noteLabel: { fontSize: 11, fontWeight: '700', marginBottom: 4 },
  noteText: { fontSize: 13, lineHeight: 19 },
  section: { marginBottom: 24 },
  mealCard: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, padding: 14, marginBottom: 8, gap: 12 },
  mealLeft: { flex: 1, flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  mealCheck: { width: 26, height: 26, borderRadius: 13, borderWidth: 2, justifyContent: 'center', alignItems: 'center', marginTop: 2 },
  mealTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 3 },
  mealName: { fontSize: 15, fontWeight: '700' },
  mealTime: { fontSize: 12 },
  mealFoods: { fontSize: 12, lineHeight: 17 },
  calBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  calBadgeText: { fontSize: 11, fontWeight: '700' },
});
