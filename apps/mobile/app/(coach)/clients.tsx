import React, { useState, useMemo } from 'react';
import {
  View, Text, FlatList, StyleSheet, StatusBar,
  TextInput, TouchableOpacity, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/hooks/useTheme';
import { useClients } from '@/hooks/useProfiles';
import { SkeletonCard } from '@/components/shared/SkeletonLoader';
import { CLIENT_LEVEL_LABELS } from '@/services/profiles.service';
import type { ProfileRecord } from '@/services/profiles.service';

const LEVEL_COLORS: Record<string, string> = {
  beginner:     '#22c55e',
  intermediate: '#6C63FF',
  advanced:     '#f97316',
};

function getInitials(name: string) {
  return name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
}

function ClientRow({ item, T }: { item: ProfileRecord; T: ReturnType<typeof useTheme> }) {
  const levelColor = item.client_level ? LEVEL_COLORS[item.client_level] : T.textMuted;
  const isPending = item.approval_status === 'pending';

  return (
    <View style={[s.row, { backgroundColor: T.bgCard, borderColor: T.border }]}>
      {/* Avatar */}
      <View style={[s.avatar, { backgroundColor: T.accent + '22', borderColor: T.accent + '44' }]}>
        <Text style={{ color: T.accent, fontWeight: '700', fontSize: 15 }}>
          {getInitials(item.full_name ?? '?')}
        </Text>
      </View>

      {/* Info */}
      <View style={{ flex: 1, gap: 3 }}>
        <Text style={{ color: T.text, fontWeight: '600', fontSize: 14 }} numberOfLines={1}>
          {item.full_name}
        </Text>
        <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
          {item.client_level ? (
            <View style={[s.badge, { backgroundColor: levelColor + '22', borderColor: levelColor + '44' }]}>
              <Text style={{ color: levelColor, fontSize: 11, fontWeight: '600' }}>
                {CLIENT_LEVEL_LABELS[item.client_level] ?? item.client_level}
              </Text>
            </View>
          ) : (
            <View style={[s.badge, { backgroundColor: T.border, borderColor: T.border }]}>
              <Text style={{ color: T.textMuted, fontSize: 11 }}>Sin nivel</Text>
            </View>
          )}
          {isPending && (
            <View style={[s.badge, { backgroundColor: T.orange + '22', borderColor: T.orange + '44' }]}>
              <Text style={{ color: T.orange, fontSize: 11, fontWeight: '600' }}>Pendiente</Text>
            </View>
          )}
          {item.is_active === false && (
            <View style={[s.badge, { backgroundColor: T.border, borderColor: T.border }]}>
              <Text style={{ color: T.textMuted, fontSize: 11 }}>Inactivo</Text>
            </View>
          )}
        </View>
      </View>

      {/* Status dot */}
      <View style={[s.dot, { backgroundColor: item.is_active !== false ? T.green : T.textMuted }]} />
    </View>
  );
}

export default function CoachClients() {
  const T = useTheme();
  const [search, setSearch] = useState('');
  const { data: clients = [], isLoading, refetch } = useClients();
  const [refreshing, setRefreshing] = useState(false);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return clients;
    return clients.filter(c =>
      c.full_name?.toLowerCase().includes(q) ||
      c.phone?.includes(q)
    );
  }, [clients, search]);

  const active   = filtered.filter(c => c.is_active !== false && c.approval_status === 'approved');
  const pending  = filtered.filter(c => c.approval_status === 'pending');
  const inactive = filtered.filter(c => c.is_active === false);

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: T.bg }]} edges={['left', 'right']}>
      <StatusBar barStyle="light-content" backgroundColor={T.bg} />

      {/* Header */}
      <View style={[s.header, { borderBottomColor: T.border }]}>
        <Text style={{ fontSize: 20, fontWeight: '800', color: T.text }}>Mis Clientes</Text>
        <View style={[s.countBadge, { backgroundColor: T.accent + '22' }]}>
          <Text style={{ color: T.accent, fontSize: 13, fontWeight: '700' }}>{active.length}</Text>
        </View>
      </View>

      {/* Search */}
      <View style={[s.searchWrap, { backgroundColor: T.bgCard, borderColor: T.border }]}>
        <Text style={{ fontSize: 16, color: T.textMuted }}>🔍</Text>
        <TextInput
          style={[s.searchInput, { color: T.text }]}
          value={search}
          onChangeText={setSearch}
          placeholder="Buscar cliente..."
          placeholderTextColor={T.textMuted}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Text style={{ color: T.textMuted, fontSize: 16 }}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Stats row */}
      {!isLoading && (
        <View style={[s.statsRow, { borderBottomColor: T.border }]}>
          <StatChip label="Activos" value={active.length} color={T.green} bg={T.bgCard} border={T.border} />
          <StatChip label="Pendientes" value={pending.length} color={T.orange} bg={T.bgCard} border={T.border} />
          <StatChip label="Inactivos" value={inactive.length} color={T.textMuted} bg={T.bgCard} border={T.border} />
        </View>
      )}

      {isLoading ? (
        <View style={{ padding: 16, gap: 10 }}>
          <SkeletonCard lines={2} />
          <SkeletonCard lines={2} />
          <SkeletonCard lines={2} />
        </View>
      ) : filtered.length === 0 ? (
        <View style={s.empty}>
          <Text style={{ fontSize: 36, marginBottom: 12 }}>👥</Text>
          <Text style={{ color: T.text, fontWeight: '700', fontSize: 16, marginBottom: 4 }}>
            {search ? 'Sin resultados' : 'Sin clientes aún'}
          </Text>
          <Text style={{ color: T.textMuted, fontSize: 13, textAlign: 'center' }}>
            {search ? 'Prueba con otro nombre o número' : 'Los clientes asignados aparecerán aquí'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={item => item.id}
          contentContainerStyle={{ padding: 12, gap: 8 }}
          renderItem={({ item }) => <ClientRow item={item} T={T} />}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={T.accent} />}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

function StatChip({ label, value, color, bg, border }: {
  label: string; value: number; color: string; bg: string; border: string;
}) {
  return (
    <View style={[s.chip, { backgroundColor: bg, borderColor: border }]}>
      <Text style={{ fontSize: 18, fontWeight: '800', color }}>{value}</Text>
      <Text style={{ fontSize: 11, color, marginTop: 2 }}>{label}</Text>
    </View>
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
  avatar:      { width: 44, height: 44, borderRadius: 14, borderWidth: 2, justifyContent: 'center', alignItems: 'center' },
  badge:       { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2, borderWidth: 1 },
  dot:         { width: 8, height: 8, borderRadius: 4 },
  empty:       { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
});
