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
import { useAuthStore } from '@/store/auth.store';
import { getVideoSignedUrl, upsertVideoProgress, recordVideoView } from '@/services/videos.service';
import { formatDuration } from '@/types/videos';

export default function VideoPlayerScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const T = useTheme();
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const { clientVideos } = useVideosStore();

  const video = clientVideos.find((v) => v.id === id);

  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [loadingUrl, setLoadingUrl] = useState(true);
  const [urlError, setUrlError] = useState<string | null>(null);
  const [sessionStart] = useState(Date.now());

  // Track currentTime in a ref so we can read it safely after player is released
  const currentTimeRef = useRef(0);

  const player = useVideoPlayer(signedUrl ?? '', (p) => {
    p.loop = false;
    p.play();
  });

  // Keep currentTimeRef in sync while playing — safe to read at any time
  useEffect(() => {
    const interval = setInterval(() => {
      try {
        currentTimeRef.current = player.currentTime ?? 0;
      } catch {
        // player already released — stop polling
        clearInterval(interval);
      }
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
      setUrlError(t('client.videoPlayer.noFileAvailable'));
      return;
    }
    getVideoSignedUrl(video.video_storage_path)
      .then((url) => { setSignedUrl(url); setLoadingUrl(false); })
      .catch((e) => { setUrlError(e.message); setLoadingUrl(false); });
  }, [video?.video_storage_path]);

  // Record view on mount
  useEffect(() => {
    if (!video || !user?.id || !user?.tenant_id) return;
    recordVideoView(video.id, user.id, user.tenant_id).catch(() => {});
  }, [video?.id]);

  // Save progress — reads from ref, never from player directly
  const saveProgress = () => {
    if (!video || !user?.id || !user?.tenant_id) return;
    const watched = Math.floor(currentTimeRef.current);
    const duration = video.duration_seconds ?? 0;
    const completed = duration > 0 && watched >= duration * 0.9;
    const sessionSecs = Math.floor((Date.now() - sessionStart) / 1000);
    // Fire and forget — don't await in cleanup
    upsertVideoProgress(video.id, user.id, user.tenant_id, watched, completed).catch(() => {});
    recordVideoView(video.id, user.id, user.tenant_id, sessionSecs).catch(() => {});
  };

  // Save on unmount — sync call using ref values, no async needed
  useEffect(() => {
    return () => { saveProgress(); };
  }, [video?.id, user?.id]);

  const handleBack = () => {
    saveProgress();
    router.back();
  };

  if (!video) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#000' }}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Text style={{ color: '#fff' }}>{t('client.videoPlayer.notFound')}</Text>
          <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 16 }}>
            <Text style={{ color: T.accent }}>{t('client.videoPlayer.back')}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const LEVEL_LABELS: Record<string, string> = {
    beginner: t('client.videoPlayer.levels.beginner'),
    intermediate: t('client.videoPlayer.levels.intermediate'),
    advanced: t('client.videoPlayer.levels.advanced'),
  };
  const LEVEL_COLORS: Record<string, string> = {
    beginner: T.green, intermediate: T.accent, advanced: T.red,
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      <StatusBar barStyle="light-content" backgroundColor="#000" hidden />

      <View style={styles.playerWrapper}>
        {loadingUrl ? (
          <View style={styles.center}>
            <ActivityIndicator color="#fff" size="large" />
            <Text style={{ color: '#aaa', marginTop: 12, fontSize: 13 }}>{t('client.videoPlayer.preparingVideo')}</Text>
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
          onPress={handleBack}
          style={styles.backBtn}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text style={{ color: '#fff', fontSize: 16, fontWeight: '800' }}>←</Text>
        </TouchableOpacity>
      </View>

      <SafeAreaView style={{ flex: 1, backgroundColor: T.bg }} edges={['bottom', 'left', 'right']}>
        <View style={{ flex: 1, padding: 20 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <View style={[styles.levelBadge, { backgroundColor: (LEVEL_COLORS[video.level] ?? T.accent) + '22' }]}>
              <Text style={{ fontSize: 11, fontWeight: '700', color: LEVEL_COLORS[video.level] ?? T.accent }}>
                {LEVEL_LABELS[video.level] ?? video.level}
              </Text>
            </View>
            {video.category && (
              <Text style={{ fontSize: 12, color: T.textMuted }}>
                {(video.category as any)?.label ?? video.category}
              </Text>
            )}
            {video.duration_seconds ? (
              <Text style={{ fontSize: 12, color: T.textMuted, marginLeft: 'auto' as any }}>
                {formatDuration(video.duration_seconds)}
              </Text>
            ) : null}
          </View>

          <Text style={{ fontSize: 20, fontWeight: '800', color: T.text, marginBottom: 8 }}>
            {video.title}
          </Text>

          {video.description ? (
            <Text style={{ fontSize: 14, color: T.textSecondary, lineHeight: 21 }}>
              {video.description}
            </Text>
          ) : null}

          {video.progress?.completed && (
            <View style={[styles.completedBanner, { backgroundColor: T.green + '22', borderColor: T.green + '44' }]}>
              <Text style={{ color: T.green, fontWeight: '700', fontSize: 14 }}>{`✓ ${t('client.videoPlayer.completed')}`}</Text>
            </View>
          )}
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  playerWrapper: {
    width: '100%',
    aspectRatio: 16 / 9,
    backgroundColor: '#000',
    position: 'relative',
  },
  center: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backBtn: {
    position: 'absolute', top: 12, left: 16,
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center', alignItems: 'center',
    zIndex: 10,
  },
  levelBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  completedBanner: {
    marginTop: 16, borderRadius: 10, borderWidth: 1,
    padding: 12, alignItems: 'center',
  },
});
