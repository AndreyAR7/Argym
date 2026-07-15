import React, { useEffect, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, StatusBar, Alert, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/hooks/useTheme';
import { useNutritionStore } from '@/store/nutrition.store';
import { useAuthStore } from '@/store/auth.store';
import { NUTRITION_STATUS_LABELS } from '@/types/nutrition';
import type { NutritionPlan, NutritionStatus } from '@/types/nutrition';

const STATUS_COLORS: Record<NutritionStatus, string> = {
  draft:     '#f59e0b',
  published: '#22c55e',
  archived:  '#6b7280',
};

export default function CoachNutritionScreen() {
  const { t } = useTranslation();
  const T = useTheme();
  const { user } = useAuthStore();
  const { adminPlans, isLoading, loadAdminPlans } = useNutritionStore();
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (user?.tenant_id) loadAdminPlans(user.tenant_id);
  }, [user?.tenant_id]);

  const onRefresh = async () => {
    if (!user?.tenant_id) return;
    setRefreshing(true);
    await loadAdminPlans(user.tenant_id);
    setRefreshing(false);
  };

  const handleAssign = () => {
    Alert.alert(
      t('coach.nutrition.assignPlan'),
      t('coach.nutrition.assignPlanMessage'),
      [{ text: t('coach.nutrition.understood'), style: 'default' }],
    );
  };

  const renderPlan = ({ item }: { item: NutritionPlan }) => {
    const statusColor = STATUS_COLORS[item.status] ?? T.textMuted;
    return (
      <View style={[s.card, { backgroundColor: T.bgCard, borderColor: T.border }]}>
        <View style={[s.cardAccent, { backgroundColor: statusColor }]} />
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
            <Text style={[s.planName, { color: T.text }]} numberOfLines={1}>
              {item.name}
            </Text>
            <View style={[s.badge, { backgroundColor: statusColor + '22' }]}>
              <Text style={[s.badgeText, { color: statusColor }]}>
                {NUTRITION_STATUS_LABELS[item.status]}
              </Text>
            </View>
          </View>
          {item.goal ? (
            <Text style={[s.planGoal, { color: T.textSecondary }]} numberOfLines={1}>
              🎯 {item.goal}
            </Text>
          ) : null}
          {item.calories_target ? (
            <Text style={[s.calories, { color: T.textMuted }]}>
              🔥 {t('coach.nutrition.caloriesPerDay', { calories: item.calories_target })}
            </Text>
          ) : null}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: T.bg }]} edges={['left', 'right']}>
      <StatusBar barStyle="light-content" backgroundColor={T.bg} />

      {/* Header */}
      <View style={[s.header, { borderBottomColor: T.border }]}>
        <View>
          <Text style={[s.screenTitle, { color: T.text }]}>{t('navigation.nutrition')}</Text>
          <Text style={[s.screenSubtitle, { color: T.textSecondary }]}>{t('coach.nutrition.subtitle')}</Text>
        </View>
      </View>

      <FlatList
        data={adminPlans}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16, paddingBottom: 96 }}
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        refreshControl={
          <RefreshControl refreshing={refreshing || isLoading} onRefresh={onRefresh} tintColor={T.accent} />
        }
        renderItem={renderPlan}
        ListEmptyComponent={
          !isLoading ? (
            <View style={s.center}>
              <Text style={{ fontSize: 40, marginBottom: 12 }}>🥗</Text>
              <Text style={[s.emptyText, { color: T.textMuted }]}>{t('coach.nutrition.empty')}</Text>
            </View>
          ) : null
        }
      />

      {/* Floating action */}
      <View style={[s.fab, { borderTopColor: T.border, backgroundColor: T.bg }]}>
        <TouchableOpacity
          style={[s.fabBtn, { backgroundColor: T.accent }]}
          activeOpacity={0.85}
          onPress={handleAssign}
        >
          <Text style={s.fabText}>{t('coach.nutrition.assignPlan')}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:           { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  screenTitle:    { fontSize: 22, fontWeight: '800' },
  screenSubtitle: { fontSize: 13, marginTop: 1 },
  card: {
    flexDirection: 'row', alignItems: 'stretch',
    borderRadius: 14, borderWidth: 1, overflow: 'hidden',
  },
  cardAccent: { width: 4 },
  planName:   { fontSize: 15, fontWeight: '700', flex: 1, marginRight: 8 },
  planGoal:   { fontSize: 13, marginTop: 4 },
  calories:   { fontSize: 12, marginTop: 3 },
  badge: {
    borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3,
    alignSelf: 'flex-start',
  },
  badgeText:  { fontSize: 11, fontWeight: '700' },
  center:     { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  emptyText:  { fontSize: 15 },
  fab: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 16, paddingVertical: 12,
  },
  fabBtn: {
    borderRadius: 14, paddingVertical: 15,
    alignItems: 'center', justifyContent: 'center',
  },
  fabText: { color: '#fff', fontSize: 16, fontWeight: '800' },
});
