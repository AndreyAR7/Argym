import React, { useState } from 'react';
import { View, Text, FlatList, StyleSheet, StatusBar, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/hooks/useTheme';
import { AdminTopBar } from '@/components/admin/AdminTopBar';
import { StatusBadge } from '@/components/admin/StatusBadge';
import { MOCK_APPOINTMENTS } from '@/data/adminMock';

const FILTERS = ['Todas', 'Hoy', 'Programadas', 'Completadas', 'Canceladas'];

function formatDateTime(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  const isToday = d.toDateString() === today.toDateString();
  const time = d.toLocaleTimeString('es-CR', { hour: '2-digit', minute: '2-digit' });
  const date = isToday ? 'Hoy' : d.toLocaleDateString('es-CR', { weekday: 'short', day: 'numeric', month: 'short' });
  return `${date} · ${time}`;
}

export default function AdminAppointmentsScreen() {
  const T = useTheme();
  const [filter, setFilter] = useState('Todas');
  const today = new Date();
  const filtered = MOCK_APPOINTMENTS.filter((a) => {
    if (filter === 'Hoy') return new Date(a.start_time).toDateString() === today.toDateString();
    if (filter === 'Programadas') return a.status === 'scheduled';
    if (filter === 'Completadas') return a.status === 'completed';
    if (filter === 'Canceladas') return a.status === 'cancelled';
    return true;
  });

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: T.bg }]} edges={['left', 'right']}>
      <StatusBar barStyle="light-content" backgroundColor={T.bg} />
      <AdminTopBar title="Citas" subtitle={`${MOCK_APPOINTMENTS.filter((a) => a.status === 'scheduled').length} programadas`} actionLabel="+ Nueva" onAction={() => {}} />
      <View style={styles.filterRow}>
        {FILTERS.map((f) => (
          <TouchableOpacity key={f} onPress={() => setFilter(f)}
            style={[styles.chip, { backgroundColor: filter === f ? T.accent : T.bgCard, borderColor: filter === f ? T.accent : T.border }]}>
            <Text style={[styles.chipText, { color: filter === f ? '#fff' : T.textSecondary }]}>{f}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16 }}
        ListEmptyComponent={<View style={styles.empty}><Text style={{ color: T.textMuted, fontSize: 14 }}>No hay citas en esta categoría</Text></View>}
        renderItem={({ item }) => (
          <TouchableOpacity activeOpacity={0.8} style={[styles.card, { backgroundColor: T.bgCard, borderColor: T.border, borderRadius: T.radiusMd }]}>
            <View style={[styles.typeIcon, { backgroundColor: item.type === 'virtual' ? T.blueSoft : T.greenSoft }]}>
              <Text style={{ fontSize: 18 }}>{item.type === 'virtual' ? '📹' : '🏋️'}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.aptTitle, { color: T.text }]}>{item.title}</Text>
              <Text style={[styles.aptMeta, { color: T.textSecondary }]}>{item.client} · {item.coach}</Text>
              <Text style={[styles.aptTime, { color: T.textMuted }]}>{formatDateTime(item.start_time)}</Text>
            </View>
            <View style={{ alignItems: 'flex-end', gap: 8 }}>
              <StatusBadge status={item.status} size="sm" />
              <Text style={{ fontSize: 12, color: T.accent, fontWeight: '600' }}>Editar</Text>
            </View>
          </TouchableOpacity>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  filterRow: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 10, gap: 8 },
  chip: { borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1 },
  chipText: { fontSize: 11, fontWeight: '600' },
  card: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, padding: 14, marginBottom: 8 },
  typeIcon: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  aptTitle: { fontSize: 15, fontWeight: '700' },
  aptMeta: { fontSize: 12, marginTop: 2 },
  aptTime: { fontSize: 11, marginTop: 2 },
  empty: { padding: 40, alignItems: 'center' },
});
