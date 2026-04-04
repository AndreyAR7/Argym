import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/hooks/useTheme';
import { VideoCard } from '@/components/client/VideoCard';
import { SectionHeader } from '@/components/client/SectionHeader';
import { EmptyState } from '@/components/client/EmptyState';
import { ClientTopBar } from '@/components/client/ClientTopBar';
import { MOCK_VIDEOS } from '@/data/clientMock';

const LEVELS = ['Todos', 'Principiante', 'Intermedio', 'Avanzado'] as const;
const LEVEL_MAP: Record<string, string> = {
  'Principiante': 'beginner', 'Intermedio': 'intermediate', 'Avanzado': 'advanced',
};

export default function VideosScreen() {
  const T = useTheme();
  const [activeLevel, setActiveLevel] = useState<string>('Todos');
  const filtered = MOCK_VIDEOS.filter((v) => activeLevel === 'Todos' || v.level === LEVEL_MAP[activeLevel]);
  const assigned = MOCK_VIDEOS.filter((v) => v.is_assigned);
  const featured = MOCK_VIDEOS.slice(0, 3);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: T.bg }]} edges={['left', 'right']}>
      <StatusBar barStyle="light-content" backgroundColor={T.bg} />
      <ClientTopBar title="Videos" />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: T.text }]}>Videos</Text>
          <Text style={[styles.subtitle, { color: T.textMuted }]}>{assigned.length} videos asignados para ti</Text>
        </View>

        <View style={styles.section}>
          <SectionHeader title="Destacados" subtitle="Selección de tu coach" />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -16 }} contentContainerStyle={{ paddingHorizontal: 16 }}>
            {featured.map((v) => <VideoCard key={v.id} video={v} onPress={() => {}} />)}
          </ScrollView>
        </View>

        <View style={styles.section}>
          <SectionHeader title="Explorar por nivel" />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }}>
            {LEVELS.map((l) => (
              <TouchableOpacity key={l} onPress={() => setActiveLevel(l)}
                style={[styles.filterChip, { backgroundColor: activeLevel === l ? T.accent : T.bgCard, borderColor: activeLevel === l ? T.accent : T.border }]}>
                <Text style={[styles.filterChipText, { color: activeLevel === l ? '#fff' : T.textSecondary }]}>{l}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          {filtered.length === 0
            ? <EmptyState icon="🎬" title="Sin videos en este nivel" description="Tu coach aún no ha asignado videos de este nivel." />
            : filtered.map((v) => <VideoCard key={v.id} video={v} horizontal onPress={() => {}} />)
          }
        </View>

        <View style={styles.section}>
          <SectionHeader title="Mis videos" subtitle="Asignados personalmente" />
          {assigned.length === 0
            ? <EmptyState icon="🔒" title="Sin videos asignados" description="Tu coach asignará videos personalizados para ti pronto." />
            : assigned.map((v) => <VideoCard key={v.id} video={v} horizontal onPress={() => {}} />)
          }
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
  section: { marginBottom: 24 },
  filterChip: { borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7, borderWidth: 1, marginRight: 8 },
  filterChipText: { fontSize: 13, fontWeight: '600' },
});
