import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, StatusBar, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/hooks/useTheme';
import { VideoCard } from '@/components/client/VideoCard';
import { SectionHeader } from '@/components/client/SectionHeader';
import { EmptyState } from '@/components/client/EmptyState';
import { ClientTopBar } from '@/components/client/ClientTopBar';
import { useClientVideos } from '@/hooks/useVideos';
import type { ClientVideo, VideoLevel } from '@/types/videos';

export default function VideosScreen() {
  const { t } = useTranslation();
  const T = useTheme();
  const router = useRouter();
  const [activeLevel, setActiveLevel] = useState<VideoLevel | 'all'>('all');
  const { featured, assigned, accessible, isLoading, error, reload, openVideo, clientPlan, clientLevel } = useClientVideos();

  const LEVELS: { label: string; value: VideoLevel | 'all' }[] = [
    { label: t('client.videos.levels.all'), value: 'all' },
    { label: t('client.videos.levels.beginner'), value: 'beginner' },
    { label: t('client.videos.levels.intermediate'), value: 'intermediate' },
    { label: t('client.videos.levels.advanced'), value: 'advanced' },
  ];

  const filtered: ClientVideo[] = activeLevel === 'all'
    ? accessible
    : accessible.filter((v) => v.level === activeLevel);

  const handlePress = async (video: ClientVideo) => {
    await openVideo(video);
    router.push(`/(client)/video-player?id=${video.id}` as any);
  };

  if (isLoading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: T.bg }} edges={['left', 'right']}>
        <ClientTopBar title={t('client.videos.title')} />
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator color={T.accent} size="large" />
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: T.bg }} edges={['left', 'right']}>
        <ClientTopBar title={t('client.videos.title')} />
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 }}>
          <Text style={{ color: T.red, fontSize: 14, textAlign: 'center', marginBottom: 16 }}>
            {t('client.videos.loadError')}
          </Text>
          <TouchableOpacity onPress={reload}>
            <Text style={{ color: T.accent, fontWeight: '700' }}>{t('common.retry')}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: T.bg }]} edges={['left', 'right']}>
      <StatusBar barStyle="light-content" backgroundColor={T.bg} />
      <ClientTopBar title={t('client.videos.title')} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        <View style={styles.header}>
          <Text style={[styles.title, { color: T.text }]}>{t('client.videos.title')}</Text>
          <Text style={[styles.subtitle, { color: T.textMuted }]}>
            {t('client.videos.availableCount', { count: accessible.length })}
            {clientPlan ? ` · ${t('client.videos.planLabel', { plan: clientPlan })}` : ''}
            {clientLevel ? ` · ${clientLevel}` : ''}
          </Text>
        </View>

        {/* Featured */}
        {featured.length > 0 && (
          <View style={styles.section}>
            <SectionHeader title={t('client.videos.featuredTitle')} subtitle={t('client.videos.featuredSubtitle')} />
            <ScrollView
              horizontal showsHorizontalScrollIndicator={false}
              style={{ marginHorizontal: -16 }}
              contentContainerStyle={{ paddingHorizontal: 16 }}
            >
              {featured.map((v) => (
                <VideoCard key={v.id} video={v} onPress={() => handlePress(v)} />
              ))}
            </ScrollView>
          </View>
        )}

        {/* Explore by level */}
        <View style={styles.section}>
          <SectionHeader title={t('client.videos.exploreByLevel')} />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }}>
            {LEVELS.map((l) => (
              <TouchableOpacity
                key={l.value}
                onPress={() => setActiveLevel(l.value)}
                style={[styles.filterChip, {
                  backgroundColor: activeLevel === l.value ? T.accent : T.bgCard,
                  borderColor: activeLevel === l.value ? T.accent : T.border,
                }]}
              >
                <Text style={[styles.filterChipText, {
                  color: activeLevel === l.value ? '#fff' : T.textSecondary,
                }]}>
                  {l.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          {filtered.length === 0
            ? <EmptyState icon="🎬" title={t('client.videos.emptyLevelTitle')} description={t('client.videos.emptyLevelDescription')} />
            : filtered.map((v) => (
              <VideoCard key={v.id} video={v} horizontal onPress={() => handlePress(v)} />
            ))
          }
        </View>

        {/* Assigned to me */}
        <View style={styles.section}>
          <SectionHeader title={t('client.videos.myVideosTitle')} subtitle={t('client.videos.myVideosSubtitle')} />
          {assigned.length === 0
            ? <EmptyState icon="🔒" title={t('client.videos.emptyAssignedTitle')} description={t('client.videos.emptyAssignedDescription')} />
            : assigned.map((v) => (
              <VideoCard key={v.id} video={v} horizontal onPress={() => handlePress(v)} />
            ))
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
