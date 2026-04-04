import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, StatusBar, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/hooks/useTheme';
import { AdminTopBar } from '@/components/admin/AdminTopBar';
import { StatusBadge } from '@/components/admin/StatusBadge';
import { MOCK_ROUTINES, MOCK_NUTRITION_PLANS, MOCK_ADMIN_VIDEOS } from '@/data/adminMock';

const TABS = ['Rutinas', 'Nutrición', 'Videos'];

export default function AdminContentScreen() {
  const T = useTheme();
  const [tab, setTab] = useState('Rutinas');

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: T.bg }]} edges={['left', 'right']}>
      <StatusBar barStyle="light-content" backgroundColor={T.bg} />
      <AdminTopBar title="Contenido" subtitle="Rutinas · Nutrición · Videos" actionLabel="+ Nuevo" onAction={() => {}} />

      <View style={[styles.tabRow, { backgroundColor: T.bgCard, borderColor: T.border, borderRadius: T.radiusMd }]}>
        {TABS.map((t) => (
          <TouchableOpacity key={t} onPress={() => setTab(t)}
            style={[styles.tabBtn, tab === t && { backgroundColor: T.accent }, { borderRadius: T.radiusSm }]}>
            <Text style={[styles.tabText, { color: tab === t ? '#fff' : T.textMuted }]}>{t}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView contentContainerStyle={{ padding: 16 }} showsVerticalScrollIndicator={false}>
        {tab === 'Rutinas' && MOCK_ROUTINES.map((r) => (
          <TouchableOpacity key={r.id} activeOpacity={0.8}
            style={[styles.card, { backgroundColor: T.bgCard, borderColor: T.border, borderRadius: T.radiusMd }]}>
            <View style={[styles.cardIcon, { backgroundColor: T.accentGlow }]}><Text style={{ fontSize: 20 }}>💪</Text></View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.cardTitle, { color: T.text }]}>{r.name}</Text>
              <Text style={[styles.cardMeta, { color: T.textSecondary }]}>{r.exercises} ejercicios · {r.assigned_to} clientes</Text>
              <Text style={[styles.cardSub, { color: T.textMuted }]}>Por {r.created_by}</Text>
            </View>
            <View style={{ alignItems: 'flex-end', gap: 6 }}>
              <StatusBadge status={r.level} size="sm" />
              <Text style={{ fontSize: 12, color: T.accent, fontWeight: '700' }}>Asignar</Text>
            </View>
          </TouchableOpacity>
        ))}

        {tab === 'Nutrición' && MOCK_NUTRITION_PLANS.map((n) => (
          <TouchableOpacity key={n.id} activeOpacity={0.8}
            style={[styles.card, { backgroundColor: T.bgCard, borderColor: T.border, borderRadius: T.radiusMd }]}>
            <View style={[styles.cardIcon, { backgroundColor: T.greenSoft }]}><Text style={{ fontSize: 20 }}>🥗</Text></View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.cardTitle, { color: T.text }]}>{n.name}</Text>
              <Text style={[styles.cardMeta, { color: T.textSecondary }]}>{n.calories} kcal/día · {n.clients} clientes</Text>
              <Text style={[styles.cardSub, { color: T.textMuted }]}>{n.goal}</Text>
            </View>
            <Text style={{ fontSize: 12, color: T.accent, fontWeight: '700' }}>Asignar</Text>
          </TouchableOpacity>
        ))}

        {tab === 'Videos' && MOCK_ADMIN_VIDEOS.map((v) => (
          <View key={v.id} style={[styles.card, { backgroundColor: T.bgCard, borderColor: T.border, borderRadius: T.radiusMd }]}>
            <View style={[styles.videoThumb, { backgroundColor: T.purpleSoft }]}>
              <Text style={{ fontSize: 22 }}>▶</Text>
              <Text style={styles.duration}>{v.duration}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.cardTitle, { color: T.text }]}>{v.title}</Text>
              <Text style={[styles.cardMeta, { color: T.textSecondary }]}>{v.category} · {v.assigned_clients} clientes</Text>
              <StatusBadge status={v.level} size="sm" />
            </View>
            <Switch value={v.is_active} trackColor={{ true: T.green, false: T.border }} onValueChange={() => {}} />
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  tabRow: { flexDirection: 'row', marginHorizontal: 16, marginVertical: 12, padding: 4, borderWidth: 1 },
  tabBtn: { flex: 1, paddingVertical: 8, alignItems: 'center' },
  tabText: { fontSize: 13, fontWeight: '600' },
  card: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, padding: 14, marginBottom: 8 },
  cardIcon: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  cardTitle: { fontSize: 14, fontWeight: '700', marginBottom: 2 },
  cardMeta: { fontSize: 12 },
  cardSub: { fontSize: 11, marginTop: 2 },
  videoThumb: { width: 70, height: 50, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  duration: { position: 'absolute', bottom: 3, right: 3, backgroundColor: 'rgba(0,0,0,0.7)', borderRadius: 3, paddingHorizontal: 4, paddingVertical: 1, fontSize: 9, color: '#fff', fontWeight: '600' },
});
