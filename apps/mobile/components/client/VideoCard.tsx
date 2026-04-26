import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import { formatDuration } from '@/types/videos';
import type { ClientVideo } from '@/types/videos';

const LEVEL_LABELS = {
  beginner: 'Principiante',
  intermediate: 'Intermedio',
  advanced: 'Avanzado',
};

interface Props {
  video: ClientVideo;
  onPress?: () => void;
  horizontal?: boolean;
}

export function VideoCard({ video, onPress, horizontal }: Props) {
  const T = useTheme();
  const LEVEL_COLORS = { beginner: T.green, intermediate: T.accent, advanced: T.red };
  const levelColor = LEVEL_COLORS[video.level];
  const locked = !video.is_accessible;
  const duration = formatDuration(video.duration_seconds);
  const views = video.views_count >= 1000
    ? `${(video.views_count / 1000).toFixed(1)}k`
    : String(video.views_count);

  if (horizontal) {
    return (
      <TouchableOpacity
        onPress={locked ? undefined : onPress}
        activeOpacity={locked ? 1 : 0.85}
        style={[styles.hCard, {
          backgroundColor: T.bgCard, borderColor: T.border,
          borderRadius: T.radiusMd, opacity: locked ? 0.5 : 1, ...T.shadowCard,
        }]}
      >
        <View style={[styles.hThumb, { backgroundColor: video.thumbnail_color + '33' }]}>
          {video.thumbnail_public_url ? (
            <Image
              source={{ uri: video.thumbnail_public_url }}
              style={StyleSheet.absoluteFill}
              resizeMode="cover"
            />
          ) : (
            <Text style={{ fontSize: 28 }}>{locked ? '🔒' : '▶'}</Text>
          )}
          {locked && (
            <View style={[StyleSheet.absoluteFill, styles.lockedOverlay]}>
              <Text style={{ fontSize: 22 }}>🔒</Text>
            </View>
          )}
          {duration ? (
            <View style={styles.durationBadge}>
              <Text style={styles.durationText}>{duration}</Text>
            </View>
          ) : null}
          {video.progress?.completed && (
            <View style={[styles.completedBadge, { backgroundColor: T.green }]}>
              <Text style={styles.completedText}>✓</Text>
            </View>
          )}
        </View>
        <View style={styles.hInfo}>
          <View style={[styles.levelBadge, { backgroundColor: levelColor + '22' }]}>
            <Text style={[styles.levelText, { color: levelColor }]}>{LEVEL_LABELS[video.level]}</Text>
          </View>
          <Text style={[styles.hTitle, { color: T.text }]} numberOfLines={2}>{video.title}</Text>
          <Text style={[styles.hCategory, { color: T.textMuted }]}>
            {video.category}{views ? ` · ${views} vistas` : ''}
          </Text>
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      onPress={locked ? undefined : onPress}
      activeOpacity={locked ? 1 : 0.85}
      style={[styles.vCard, {
        backgroundColor: T.bgCard, borderColor: T.border,
        borderRadius: T.radiusMd, opacity: locked ? 0.5 : 1, ...T.shadowCard,
      }]}
    >
      <View style={[styles.vThumb, { backgroundColor: video.thumbnail_color + '33' }]}>
        {video.thumbnail_public_url ? (
          <Image
            source={{ uri: video.thumbnail_public_url }}
            style={StyleSheet.absoluteFill}
            resizeMode="cover"
          />
        ) : (
          <Text style={{ fontSize: 36 }}>{locked ? '🔒' : '▶'}</Text>
        )}
        {locked && (
          <View style={[StyleSheet.absoluteFill, styles.lockedOverlay]}>
            <Text style={{ fontSize: 28 }}>🔒</Text>
          </View>
        )}
        {duration ? (
          <View style={styles.durationBadge}>
            <Text style={styles.durationText}>{duration}</Text>
          </View>
        ) : null}
        <View style={[styles.levelBadgeAbsolute, { backgroundColor: levelColor }]}>
          <Text style={styles.levelBadgeAbsoluteText}>{LEVEL_LABELS[video.level]}</Text>
        </View>
        {video.progress?.completed && (
          <View style={[styles.completedBadge, { backgroundColor: T.green }]}>
            <Text style={styles.completedText}>✓</Text>
          </View>
        )}
      </View>
      <View style={{ padding: 12 }}>
        <Text style={[styles.vTitle, { color: T.text }]} numberOfLines={2}>{video.title}</Text>
        <Text style={[styles.vMeta, { color: T.textMuted }]}>
          {video.category}{views ? ` · ${views} vistas` : ''}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  hCard: { flexDirection: 'row', overflow: 'hidden', marginBottom: 10, borderWidth: 1 },
  hThumb: { width: 110, height: 80, justifyContent: 'center', alignItems: 'center' },
  hInfo: { flex: 1, padding: 12, justifyContent: 'center', gap: 4 },
  hTitle: { fontSize: 14, fontWeight: '700', lineHeight: 19 },
  hCategory: { fontSize: 11 },
  vCard: { overflow: 'hidden', width: 180, marginRight: 12, borderWidth: 1 },
  vThumb: { height: 110, justifyContent: 'center', alignItems: 'center' },
  vTitle: { fontSize: 13, fontWeight: '700', lineHeight: 18, marginBottom: 4 },
  vMeta: { fontSize: 11 },
  durationBadge: {
    position: 'absolute', bottom: 6, right: 6,
    backgroundColor: 'rgba(0,0,0,0.7)', borderRadius: 4,
    paddingHorizontal: 5, paddingVertical: 2,
  },
  durationText: { color: '#fff', fontSize: 10, fontWeight: '600' },
  levelBadge: { borderRadius: 5, paddingHorizontal: 7, paddingVertical: 2, alignSelf: 'flex-start' },
  levelText: { fontSize: 10, fontWeight: '700' },
  levelBadgeAbsolute: {
    position: 'absolute', top: 6, left: 6,
    borderRadius: 5, paddingHorizontal: 6, paddingVertical: 2,
  },
  levelBadgeAbsoluteText: { color: '#fff', fontSize: 9, fontWeight: '700' },
  completedBadge: {
    position: 'absolute', top: 6, right: 6,
    width: 20, height: 20, borderRadius: 10,
    justifyContent: 'center', alignItems: 'center',
  },
  completedText: { color: '#fff', fontSize: 10, fontWeight: '800' },
  lockedOverlay: {
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center', alignItems: 'center',
  },
});
