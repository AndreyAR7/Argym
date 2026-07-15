import React, { useState, useMemo } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, StatusBar, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/hooks/useTheme';
import { useAdminVideos } from '@/hooks/useVideos';
import { useAuthStore } from '@/store/auth.store';
import { formatDuration, VIDEO_STATUS_LABELS } from '@/types/videos';
import type { Video, VideoLevel } from '@/types/videos';

const LEVEL_COLORS: Record<VideoLevel, string> = {
  beginner:     '#22c55e',
  intermediate: '#f59e0b',
  advanced:     '#ef4444',
};

export default function CoachVideosScreen() {
  const { t } = useTranslation();
  const T = useTheme();
  const router = useRouter();
  const { user } = useAuthStore();
  const { videos, isLoading } = useAdminVideos();
  const [activeLevel, setActiveLevel] = useState<VideoLevel | 'all'>('all');

  const LEVELS: Array<{ key: VideoLevel | 'all'; label: string }> = [
    { key: 'all',          label: t('coach.videos.levels.all') },
    { key: 'beginner',     label: t('coach.videos.levels.beginner') },
    { key: 'intermediate', label: t('coach.videos.levels.intermediate') },
    { key: 'advanced',     label: t('coach.videos.levels.advanced') },
  ];

  const LEVEL_LABELS: Record<VideoLevel, string> = {
    beginner:     t('coach.videos.levels.beginner'),
    intermediate: t('coach.videos.levels.intermediate'),
    advanced:     t('coach.videos.levels.advanced'),
  };

  const filtered = useMemo(() => {
    if (activeLevel === 'all') return videos;
    return videos.filter((v) => v.level === activeLevel);
  }, [videos, activeLevel]);

  const renderVideo = ({ item }: { item: Video }) => (
    <TouchableOpacity
      style={[s.card, { backgroundColor: T.bgCard, borderColor: T.border }]}
      activeOpacity={0.8}
      onPress={() => router.push({ pathname: '/(coach)/video-player', params: { videoId: item.id } })}
    >
      {/* Thumbnail block */}
      <View style={[s.thumbnail, { backgroundColor: item.thumbnail_color || T.accent + '33' }]}>
        <Text style={{ fontSize: 28 }}>🎬</Text>
      </View>

      {/* Info */}
      <View style={{ flex: 1, justifyContent: 'space-between' }}>
        <Text style={[s.videoTitle, { color: T.text }]} numberOfLines={2}>
          {item.title}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 }}>
          <View style={[s.badge, { backgroundColor: LEVEL_COLORS[item.level] + '22' }]}>
            <Text style={[s.badgeText, { color: LEVEL_COLORS[item.level] }]}>
              {LEVEL_LABELS[item.level]}
            </Text>
          </View>
          {item.duration_seconds ? (
            <Text style={[s.duration, { color: T.textMuted }]}>
              ⏱ {formatDuration(item.duration_seconds)}
            </Text>
          ) : null}
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: T.bg }]} edges={['left', 'right']}>
      <StatusBar barStyle="light-content" backgroundColor={T.bg} />

      {/* Header */}
      <View style={[s.header, { borderBottomColor: T.border }]}>
        <View>
          <Text style={[s.screenTitle, { color: T.text }]}>{t('coach.videos.title')}</Text>
          <Text style={[s.screenSubtitle, { color: T.textSecondary }]}>{t('coach.videos.subtitle')}</Text>
        </View>
      </View>

      {/* Filter chips */}
      <View style={[s.filterRow, { borderBottomColor: T.border }]}>
        {LEVELS.map((lv) => {
          const active = activeLevel === lv.key;
          return (
            <TouchableOpacity
              key={lv.key}
              onPress={() => setActiveLevel(lv.key)}
              style={[
                s.chip,
                active
                  ? { backgroundColor: T.accent, borderColor: T.accent }
                  : { backgroundColor: T.bgCard, borderColor: T.border },
              ]}
              activeOpacity={0.75}
            >
              <Text style={[s.chipText, { color: active ? '#fff' : T.textSecondary }]}>
                {lv.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {isLoading ? (
        <View style={s.center}>
          <ActivityIndicator color={T.accent} size="large" />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          renderItem={renderVideo}
          ListEmptyComponent={
            <View style={s.center}>
              <Text style={{ fontSize: 40, marginBottom: 12 }}>🎬</Text>
              <Text style={[s.emptyText, { color: T.textMuted }]}>{t('coach.videos.empty')}</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:           { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  screenTitle:    { fontSize: 22, fontWeight: '800' },
  screenSubtitle: { fontSize: 13, marginTop: 1 },
  filterRow: {
    flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  chip: {
    borderRadius: 20, borderWidth: 1,
    paddingHorizontal: 14, paddingVertical: 6,
  },
  chipText:   { fontSize: 13, fontWeight: '600' },
  card: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 12,
    borderRadius: 14, borderWidth: 1, padding: 12,
  },
  thumbnail: {
    width: 72, height: 72, borderRadius: 10,
    justifyContent: 'center', alignItems: 'center',
  },
  videoTitle: { fontSize: 14, fontWeight: '600', lineHeight: 20 },
  badge: {
    borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3,
  },
  badgeText: { fontSize: 11, fontWeight: '700' },
  duration:  { fontSize: 12 },
  center:    { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  emptyText: { fontSize: 15 },
});
