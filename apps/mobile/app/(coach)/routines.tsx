import React, { useState, useMemo, useEffect } from 'react';
import {
  View, Text, FlatList, StyleSheet, StatusBar,
  TextInput, TouchableOpacity, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/hooks/useTheme';
import { useRoutinesStore } from '@/store/routines.store';
import { useAuthStore } from '@/store/auth.store';
import { SkeletonCard } from '@/components/shared/SkeletonLoader';
import type { Routine } from '@/types/routines';

const LEVEL_CONFIG: Record<string, { label: string; color: string }> = {
  beginner:     { label: 'Principiante', color: '#22c55e' },
  intermediate: { label: 'Intermedio',   color: '#6C63FF' },
  advanced:     { label: 'Avanzado',     color: '#f97316' },
};

function RoutineRow({ item, T }: { item: Routine; T: ReturnType<typeof useTheme> }) {
  const level = item.level ? LEVEL_CONFIG[item.level] : null;
  const exerciseCount = item.exercises?.length ?? 0;

  return (
    <View style={[s.row, { backgroundColor: T.bgCard, borderColor: T.border }]}>
      {/* Icon */}
      <View style={[s.iconBox, { backgroundColor: T.accent + '20' }]}>
        <Text style={{ fontSize: 22 }}>💪</Text>
      </View>

      {/* Info */}
      <View style={{ flex: 1, gap: 4 }}>
        <Text style={{ color: T.text, fontWeight: '700', fontSize: 14 }} numberOfLines={1}>
          {item.name}
        </Text>
        <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
          {level && (
            <View style={[s.badge, { backgroundColor: level.color + '22', borderColor: level.color + '44' }]}>
              <Text style={{ color: level.color, fontSize: 11, fontWeight: '600' }}>{level.label}</Text>
            </View>
          )}
          <View style={[s.badge, { backgroundColor: T.blue + '22', borderColor: T.blue + '44' }]}>
            <Text style={{ color: T.blue, fontSize: 11, fontWeight: '600' }}>
              {exerciseCount} {exerciseCount === 1 ? 'ejercicio' : 'ejercicios'}
            </Text>
          </View>
        </View>
        {item.description ? (
          <Text style={{ color: T.textMuted, fontSize: 12 }} numberOfLines={1}>
            {item.description}
          </Text>
        ) : null}
      </View>

      {/* Status */}
      <View style={[s.statusDot, { backgroundColor: item.is_active ? T.green : T.textMuted }]} />
    </View>
  );
}

export default function CoachRoutines() {
  const T = useTheme();
  const { user } = useAuthStore();
  const { adminRoutines, isLoadingAdmin, loadAdminRoutines } = useRoutinesStore();
  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (user?.tenant_id) loadAdminRoutines(user.tenant_id);
  }, [user?.tenant_id]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    const active = adminRoutines.filter(r => r.is_active);
    if (!q) return active;
    return active.filter(r =>
      r.name.toLowerCase().includes(q) ||
      r.description?.toLowerCase().includes(q)
    );
  }, [adminRoutines, search]);

  const byLevel = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const r of filtered) {
      const k = r.level ?? 'sin_nivel';
      counts[k] = (counts[k] ?? 0) + 1;
    }
    return counts;
  }, [filtered]);

  const onRefresh = async () => {
    if (!user?.tenant_id) return;
    setRefreshing(true);
    await loadAdminRoutines(user.tenant_id);
    setRefreshing(false);
  };

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: T.bg }]} edges={['left', 'right']}>
      <StatusBar barStyle="light-content" backgroundColor={T.bg} />

      {/* Header */}
      <View style={[s.header, { borderBottomColor: T.border }]}>
        <Text style={{ fontSize: 20, fontWeight: '800', color: T.text }}>Rutinas</Text>
        <View style={[s.countBadge, { backgroundColor: T.accent + '22' }]}>
          <Text style={{ color: T.accent, fontSize: 13, fontWeight: '700' }}>{filtered.length}</Text>
        </View>
      </View>

      {/* Search */}
      <View style={[s.searchWrap, { backgroundColor: T.bgCard, borderColor: T.border }]}>
        <Text style={{ fontSize: 16, color: T.textMuted }}>🔍</Text>
        <TextInput
          style={[s.searchInput, { color: T.text }]}
          value={search}
          onChangeText={setSearch}
          placeholder="Buscar rutina..."
          placeholderTextColor={T.textMuted}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Text style={{ color: T.textMuted, fontSize: 16 }}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Level summary chips */}
      {!isLoadingAdmin && filtered.length > 0 && (
        <View style={[s.statsRow, { borderBottomColor: T.border }]}>
          {Object.entries(LEVEL_CONFIG).map(([key, cfg]) => (
            <View key={key} style={[s.chip, { backgroundColor: T.bgCard, borderColor: T.border }]}>
              <Text style={{ fontSize: 16, fontWeight: '800', color: cfg.color }}>
                {byLevel[key] ?? 0}
              </Text>
              <Text style={{ fontSize: 10, color: T.textMuted, marginTop: 1 }}>{cfg.label}</Text>
            </View>
          ))}
        </View>
      )}

      {isLoadingAdmin ? (
        <View style={{ padding: 16, gap: 10 }}>
          <SkeletonCard lines={2} />
          <SkeletonCard lines={2} />
          <SkeletonCard lines={2} />
        </View>
      ) : filtered.length === 0 ? (
        <View style={s.empty}>
          <Text style={{ fontSize: 36, marginBottom: 12 }}>💪</Text>
          <Text style={{ color: T.text, fontWeight: '700', fontSize: 16, marginBottom: 4 }}>
            {search ? 'Sin resultados' : 'Sin rutinas activas'}
          </Text>
          <Text style={{ color: T.textMuted, fontSize: 13, textAlign: 'center' }}>
            {search
              ? 'Prueba con otro nombre'
              : 'El admin puede crear rutinas desde el panel de administración'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={item => item.id}
          contentContainerStyle={{ padding: 12, gap: 8 }}
          renderItem={({ item }) => <RoutineRow item={item} T={T} />}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={T.accent} />}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:        { flex: 1 },
  header:      { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingTop: 16, paddingBottom: 12, borderBottomWidth: 1 },
  countBadge:  { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  searchWrap:  { flexDirection: 'row', alignItems: 'center', gap: 10, marginHorizontal: 12, marginTop: 12, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 12, borderWidth: 1 },
  searchInput: { flex: 1, fontSize: 14 },
  statsRow:    { flexDirection: 'row', gap: 8, paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1 },
  chip:        { flex: 1, borderRadius: 10, borderWidth: 1, paddingVertical: 10, alignItems: 'center' },
  row:         { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 12, borderWidth: 1, padding: 12 },
  iconBox:     { width: 46, height: 46, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  badge:       { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2, borderWidth: 1 },
  statusDot:   { width: 8, height: 8, borderRadius: 4 },
  empty:       { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
});
