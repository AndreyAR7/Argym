import React, { useState } from 'react';
import { View, Text, FlatList, StyleSheet, StatusBar, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/hooks/useTheme';
import { AdminTopBar } from '@/components/admin/AdminTopBar';
import { SearchBar } from '@/components/admin/SearchBar';
import { StatusBadge } from '@/components/admin/StatusBadge';
import { MOCK_CLIENTS } from '@/data/adminMock';

const FILTERS = ['Todos', 'Activos', 'Inactivos'];

function ClientRow({ client, onPress }: { client: typeof MOCK_CLIENTS[0]; onPress: () => void }) {
  const T = useTheme();
  const initials = client.full_name.split(' ').map((n) => n[0]).slice(0, 2).join('');
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8} style={[styles.row, { backgroundColor: T.bg }]}>
      <View style={[styles.avatar, { backgroundColor: T.accentGlow }]}>
        <Text style={[styles.avatarText, { color: T.accent }]}>{initials}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.name, { color: T.text }]}>{client.full_name}</Text>
        <Text style={[styles.email, { color: T.textSecondary }]}>{client.email}</Text>
        <Text style={[styles.meta, { color: T.textMuted }]}>{client.plan ?? 'Sin plan'} · {client.coach ?? 'Sin coach'}</Text>
      </View>
      <View style={{ alignItems: 'flex-end', gap: 6 }}>
        <StatusBadge status={client.status} size="sm" />
        <StatusBadge status={client.level} size="sm" />
      </View>
    </TouchableOpacity>
  );
}

export default function AdminClientsScreen() {
  const T = useTheme();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('Todos');

  const filtered = MOCK_CLIENTS.filter((c) => {
    const matchSearch = c.full_name.toLowerCase().includes(search.toLowerCase()) || c.email.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === 'Todos' || (filter === 'Activos' && c.status === 'active') || (filter === 'Inactivos' && c.status === 'inactive');
    return matchSearch && matchFilter;
  });

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: T.bg }]} edges={['left', 'right']}>
      <StatusBar barStyle="light-content" backgroundColor={T.bg} />
      <AdminTopBar title="Clientes" subtitle={`${MOCK_CLIENTS.filter((c) => c.status === 'active').length} activos`} actionLabel="+ Nuevo" onAction={() => {}} />
      <View style={styles.toolbar}>
        <SearchBar value={search} onChangeText={setSearch} placeholder="Buscar cliente..." />
        <View style={styles.filters}>
          {FILTERS.map((f) => (
            <TouchableOpacity key={f} onPress={() => setFilter(f)}
              style={[styles.chip, { backgroundColor: filter === f ? T.accent : T.bgCard, borderColor: filter === f ? T.accent : T.border }]}>
              <Text style={[styles.chipText, { color: filter === f ? '#fff' : T.textSecondary }]}>{f}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16 }}
        ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: T.border }} />}
        ListEmptyComponent={<View style={styles.empty}><Text style={{ color: T.textMuted, fontSize: 14 }}>No se encontraron clientes</Text></View>}
        renderItem={({ item }) => <ClientRow client={item} onPress={() => {}} />}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  toolbar: { padding: 16, gap: 10 },
  filters: { flexDirection: 'row', gap: 8 },
  chip: { borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6, borderWidth: 1 },
  chipText: { fontSize: 12, fontWeight: '600' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14 },
  avatar: { width: 44, height: 44, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontSize: 15, fontWeight: '800' },
  name: { fontSize: 15, fontWeight: '700' },
  email: { fontSize: 12, marginTop: 1 },
  meta: { fontSize: 11, marginTop: 2 },
  empty: { padding: 40, alignItems: 'center' },
});
