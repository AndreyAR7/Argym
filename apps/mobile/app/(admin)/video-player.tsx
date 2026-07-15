import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  StatusBar, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useVideoPlayer, VideoView } from 'expo-video';
import * as ScreenOrientation from 'expo-screen-orientation';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/hooks/useTheme';
import { useVideosStore } from '@/store/videos.store';
import { getVideoSignedUrl } from '@/services/videos.service';
import { formatDuration, VIDEO_STATUS_LABELS } from '@/types/videos';

export default function AdminVideoPlayerScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const T = useTheme();
  const { t } = useTranslation();
  const { adminVideos } = useVideosStore();

  const video = adminVideos.find((v) => v.id === id);

  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [loadingUrl, setLoadingUrl] = useState(true);
  const [urlError, setUrlError] = useState<string | null>(null);

  const currentTimeRef = useRef(0);

  const player = useVideoPlayer(signedUrl ?? '', (p) => {
    p.loop = false;
    p.play();
  });

  useEffect(() => {
    const interval = setInterval(() => {
      try { currentTimeRef.current = player.currentTime ?? 0; }
      catch { clearInterval(interval); }
    }, 2000);
    return () => clearInterval(interval);
  }, [player]);

  // Allow landscape
  useEffect(() => {
    ScreenOrientation.unlockAsync();
    return () => {
      ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
    };
  }, []);

  // Load signed URL
  useEffect(() => {
    if (!video?.video_storage_path) {
      setLoadingUrl(false);
      setUrlError(t('admin.videoPlayer.noFileAvailable'));
      return;
    }
    getVideoSignedUrl(video.video_storage_path)
      .then((url) => { setSignedUrl(url); setLoadingUrl(false); })
      .catch((e) => { setUrlError(e.message); setLoadingUrl(false); });
  }, [video?.video_storage_path]);

  if (!video) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#000' }}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Text style={{ color: '#fff' }}>{t('admin.videoPlayer.notFound')}</Text>
          <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 16 }}>
            <Text style={{ color: T.accent }}>{t('admin.videoPlayer.back')}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const LEVEL_LABELS: Record<string, string> = {
    beginner: t('admin.videoPlayer.levels.beginner'),
    intermediate: t('admin.videoPlayer.levels.intermediate'),
    advanced: t('admin.videoPlayer.levels.advanced'),
  };

  const levelColor = { beginner: T.green, intermediate: T.accent, advanced: T.red }[video.level] ?? T.accent;
  const statusColor = video.status === 'published' ? T.green : video.status === 'archived' ? T.textMuted : T.accent;

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      <StatusBar barStyle="light-content" backgroundColor="#000" hidden />

      {/* Player */}
      <View style={styles.playerWrapper}>
        {loadingUrl ? (
          <View style={styles.center}>
            <ActivityIndicator color="#fff" size="large" />
            <Text style={{ color: '#aaa', marginTop: 12, fontSize: 13 }}>{t('admin.videoPlayer.preparingVideo')}</Text>
          </View>
        ) : urlError ? (
          <View style={styles.center}>
            <Text style={{ fontSize: 36 }}>⚠️</Text>
            <Text style={{ color: '#fff', fontSize: 14, textAlign: 'center', marginTop: 12, paddingHorizontal: 24 }}>
              {urlError}
            </Text>
          </View>
        ) : (
          <VideoView
            player={player}
            style={StyleSheet.absoluteFill}
            nativeControls
            fullscreenOptions={{ isFullscreenButtonHidden: false }}
            allowsPictureInPicture
            contentFit="contain"
          />
        )}

        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backBtn}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text style={{ color: '#fff', fontSize: 16, fontWeight: '800' }}>←</Text>
        </TouchableOpacity>
      </View>

      {/* Video info */}
      <SafeAreaView style={{ flex: 1, backgroundColor: T.bg }} edges={['bottom', 'left', 'right']}>
        <View style={{ flex: 1, padding: 20 }}>
          {/* Badges row */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
            <View style={[styles.badge, { backgroundColor: levelColor + '22' }]}>
              <Text style={{ fontSize: 11, fontWeight: '700', color: levelColor }}>
                {LEVEL_LABELS[video.level] ?? video.level}
              </Text>
            </View>
            <View style={[styles.badge, { backgroundColor: statusColor + '22' }]}>
              <Text style={{ fontSize: 11, fontWeight: '700', color: statusColor }}>
                {VIDEO_STATUS_LABELS[video.status]}
              </Text>
            </View>
            {video.is_featured && (
              <View style={[styles.badge, { backgroundColor: T.gold + '22' }]}>
                <Text style={{ fontSize: 11, fontWeight: '700', color: T.gold }}>{`⭐ ${t('admin.videoPlayer.featured')}`}</Text>
              </View>
            )}
            {video.duration_seconds ? (
              <Text style={{ fontSize: 12, color: T.textMuted, marginLeft: 'auto' as any }}>
                {formatDuration(video.duration_seconds)}
              </Text>
            ) : null}
          </View>

          <Text style={{ fontSize: 20, fontWeight: '800', color: T.text, marginBottom: 6 }}>
            {video.title}
          </Text>

          {video.description ? (
            <Text style={{ fontSize: 14, color: T.textSecondary, lineHeight: 21, marginBottom: 12 }}>
              {video.description}
            </Text>
          ) : null}

          {/* Access info */}
          <View style={[styles.infoCard, { backgroundColor: T.bgCard, borderColor: T.border }]}>
            <Text style={{ fontSize: 12, color: T.textMuted, marginBottom: 6, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 }}>
              {t('admin.videoPlayer.access')}
            </Text>
            <Text style={{ fontSize: 13, color: T.textSecondary }}>
              {t('admin.videoPlayer.plansLabel')}: {video.allowed_plans.length === 0 ? t('admin.videoPlayer.all') : video.allowed_plans.join(', ')}
            </Text>
            <Text style={{ fontSize: 13, color: T.textSecondary, marginTop: 2 }}>
              {t('admin.videoPlayer.levelsLabel')}: {video.allowed_levels.length === 0 ? t('admin.videoPlayer.all') : video.allowed_levels.map((l) => LEVEL_LABELS[l] ?? l).join(', ')}
            </Text>
            <Text style={{ fontSize: 13, color: T.textSecondary, marginTop: 2 }}>
              {t('admin.videoPlayer.viewsLabel')}: {video.views_count}
            </Text>
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  playerWrapper: {
    width: '100%', aspectRatio: 16 / 9,
    backgroundColor: '#000', position: 'relative',
  },
  center: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center' },
  backBtn: {
    position: 'absolute', top: 12, left: 16,
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center', alignItems: 'center', zIndex: 10,
  },
  badge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  infoCard: { borderRadius: 12, borderWidth: 1, padding: 12, marginTop: 4 },
});
