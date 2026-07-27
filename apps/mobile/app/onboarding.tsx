import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, Animated, TouchableOpacity, useWindowDimensions,
  NativeSyntheticEvent, NativeScrollEvent,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/hooks/useTheme';
import { useAuthStore } from '@/store/auth.store';
import { useOnboardingStore } from '@/store/onboarding.store';
import { AppLogo } from '@/components/shared/AppLogo';
import { getOnboardingSlides, roleHomeRoute, resolveAccent } from '@/components/onboarding/onboardingContent';

// First-run feature tour — one slide per real, navigable section of the
// app for the signed-in user's role (mirrors ClientSidebar/AdminSidebar's
// nav items, same icons). Shown once per user per device (see
// store/onboarding.store.ts), hooked in from app/_layout.tsx's AuthGuard
// right after login, before landing on the role's home screen.
export default function OnboardingScreen() {
  const T = useTheme();
  const { t } = useTranslation();
  const router = useRouter();
  const { width: SCREEN_WIDTH } = useWindowDimensions();
  const { user } = useAuthStore();
  const { markSeen } = useOnboardingStore();

  const slides = getOnboardingSlides(user?.primaryRole);
  const [index, setIndex] = useState(0);

  const scrollRef = useRef<any>(null);
  const scrollX = useRef(new Animated.Value(0)).current;
  const iconScale = useRef(new Animated.Value(0.4)).current;
  const entrance = useRef(new Animated.Value(0)).current;
  const ctaScale = useRef(new Animated.Value(1)).current;

  const isLast = index === slides.length - 1;
  const current = slides[index];

  // Bounce the active slide's icon + fade/slide its text in whenever the
  // active index changes (including on mount, for slide 0).
  useEffect(() => {
    iconScale.setValue(0.4);
    entrance.setValue(0);
    Animated.parallel([
      Animated.spring(iconScale, { toValue: 1, useNativeDriver: true, tension: 80, friction: 7 }),
      Animated.timing(entrance, { toValue: 1, duration: 380, useNativeDriver: true }),
    ]).start();
  }, [index]);

  const handleScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { x: scrollX } } }],
    { useNativeDriver: false },
  );

  const handleMomentumEnd = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const raw = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
    setIndex(Math.min(slides.length - 1, Math.max(0, raw)));
  }, [SCREEN_WIDTH, slides.length]);

  const goTo = (i: number) => {
    scrollRef.current?.scrollTo({ x: i * SCREEN_WIDTH, animated: true });
  };

  const finish = useCallback(() => {
    Animated.sequence([
      Animated.timing(ctaScale, { toValue: 0.92, duration: 90, useNativeDriver: true }),
      Animated.spring(ctaScale, { toValue: 1, useNativeDriver: true, tension: 200, friction: 6 }),
    ]).start(async () => {
      if (user?.id) await markSeen(user.id);
      router.replace(roleHomeRoute(user?.primaryRole) as any);
    });
  }, [user?.id, user?.primaryRole]);

  const handleNext = () => {
    if (isLast) { finish(); return; }
    goTo(index + 1);
  };

  const firstName = user?.full_name?.trim().split(/\s+/)[0];
  const nameSuffix = firstName ? `, ${firstName}` : '';

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: T.bg }} edges={['top', 'bottom']}>
      {!isLast && (
        <TouchableOpacity
          onPress={finish}
          style={styles.skipBtn}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={{ color: T.textSecondary, fontWeight: '600', fontSize: 14 }}>
            {t('onboarding.skip')}
          </Text>
        </TouchableOpacity>
      )}

      <Animated.ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        onMomentumScrollEnd={handleMomentumEnd}
        style={{ flex: 1 }}
      >
        {slides.map((slide, i) => {
          const accent = resolveAccent(T, slide.accentKey);
          const isActive = i === index;
          return (
            <View key={slide.id} style={[styles.slide, { width: SCREEN_WIDTH }]}>
              <Animated.View
                style={[
                  styles.iconCircle,
                  {
                    backgroundColor: accent + '22',
                    borderColor: accent + '55',
                    transform: isActive
                      ? [
                          { scale: iconScale },
                          { rotate: entrance.interpolate({ inputRange: [0, 1], outputRange: ['-6deg', '0deg'] }) },
                        ]
                      : [{ scale: 1 }],
                  },
                ]}
              >
                {slide.isLogo ? <AppLogo size={72} /> : <Text style={{ fontSize: 52 }}>{slide.icon}</Text>}
              </Animated.View>

              <Animated.View
                style={{
                  opacity: isActive ? entrance : 1,
                  transform: [{ translateY: isActive ? entrance.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) : 0 }],
                }}
              >
                <Text style={[styles.title, { color: T.text }]}>
                  {t(slide.titleKey, { name: nameSuffix })}
                </Text>
                <Text style={[styles.desc, { color: T.textSecondary }]}>
                  {t(slide.descKey)}
                </Text>
              </Animated.View>
            </View>
          );
        })}
      </Animated.ScrollView>

      <View style={styles.dotsRow}>
        {slides.map((_, i) => {
          const inputRange = [(i - 1) * SCREEN_WIDTH, i * SCREEN_WIDTH, (i + 1) * SCREEN_WIDTH];
          const dotWidth = scrollX.interpolate({ inputRange, outputRange: [8, 22, 8], extrapolate: 'clamp' });
          const dotOpacity = scrollX.interpolate({ inputRange, outputRange: [0.3, 1, 0.3], extrapolate: 'clamp' });
          return (
            <Animated.View
              key={i}
              style={[styles.dot, { width: dotWidth, opacity: dotOpacity, backgroundColor: resolveAccent(T, current.accentKey) }]}
            />
          );
        })}
      </View>

      <View style={styles.ctaRow}>
        <Animated.View style={{ transform: [{ scale: ctaScale }] }}>
          <TouchableOpacity
            onPress={handleNext}
            activeOpacity={0.85}
            style={[styles.ctaBtn, { backgroundColor: resolveAccent(T, current.accentKey) }]}
          >
            <Text style={styles.ctaText}>{isLast ? t('onboarding.start') : t('onboarding.next')}</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  skipBtn: { position: 'absolute', top: 12, right: 20, zIndex: 10, paddingVertical: 8, paddingHorizontal: 4 },
  slide: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  iconCircle: {
    width: 140, height: 140, borderRadius: 70, borderWidth: 2,
    justifyContent: 'center', alignItems: 'center', marginBottom: 32,
  },
  title: { fontSize: 24, fontWeight: '900', textAlign: 'center', marginBottom: 12, letterSpacing: -0.3 },
  desc: { fontSize: 15, textAlign: 'center', lineHeight: 22, paddingHorizontal: 8 },
  dotsRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, marginBottom: 20 },
  dot: { height: 8, borderRadius: 4 },
  ctaRow: { paddingHorizontal: 24, paddingBottom: 12 },
  ctaBtn: { borderRadius: 16, paddingVertical: 16, alignItems: 'center', justifyContent: 'center' },
  ctaText: { color: '#fff', fontWeight: '800', fontSize: 16 },
});
