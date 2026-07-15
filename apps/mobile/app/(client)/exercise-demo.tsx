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
import { getExerciseDemoSignedUrl } from '@/services/routines.service';

export default function ExerciseDemoScreen() {
  const { storagePath, name, muscle } = useLocalSearchParams<{
    storagePath: string;
    name: string;
    muscle: string;
  }>();
  const router = useRouter();
  const T = useTheme();
  const { t } = useTranslation();

  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  useEffect(() => {
    ScreenOrientation.unlockAsync();
    return () => {
      ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
    };
  }, []);

  useEffect(() => {
    if (!storagePath) {
      setError(t('client.exerciseDemo.videoUnavailable'));
      setLoading(false);
      return;
    }
    getExerciseDemoSignedUrl(storagePath)
      .then((url) => { setSignedUrl(url); setLoading(false); })
      .catch((e) => { setError(e.message ?? t('client.exerciseDemo.loadError')); setLoading(false); });
  }, [storagePath]);

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      <StatusBar barStyle="light-content" backgroundColor="#000" hidden />

      <View style={styles.playerWrapper}>
        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator color="#fff" size="large" />
            <Text style={{ color: '#aaa', marginTop: 12, fontSize: 13 }}>{t('client.exerciseDemo.loading')}</Text>
          </View>
        ) : error ? (
          <View style={styles.center}>
            <Text style={{ fontSize: 36 }}>⚠️</Text>
            <Text style={{ color: '#fff', fontSize: 14, textAlign: 'center', marginTop: 12, paddingHorizontal: 24 }}>
              {error}
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

      <SafeAreaView style={{ flex: 1, backgroundColor: T.bg }} edges={['bottom', 'left', 'right']}>
        <View style={{ padding: 20 }}>
          {muscle ? (
            <View style={[styles.badge, { backgroundColor: T.accent + '20', marginBottom: 10, alignSelf: 'flex-start' }]}>
              <Text style={{ fontSize: 12, fontWeight: '700', color: T.accent }}>{muscle}</Text>
            </View>
          ) : null}
          <Text style={{ fontSize: 22, fontWeight: '800', color: T.text, marginBottom: 4 }}>
            {name ?? t('client.exerciseDemo.defaultTitle')}
          </Text>
          <Text style={{ fontSize: 13, color: T.textMuted }}>
            {t('client.exerciseDemo.subtitle')}
          </Text>
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
  badge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
});
