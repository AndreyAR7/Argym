import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Dimensions,
  Animated,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useTheme } from '@/hooks/useTheme';
import { useAuthStore } from '@/store/auth.store';
import { useGamificationStore } from '@/store/gamification.store';
import { ClientTopBar } from '@/components/client/ClientTopBar';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const TODAY = new Date().toISOString().split('T')[0];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function darkenColor(hex: string, amount = 0.35): string {
  const c = hex.replace('#', '');
  const r = Math.max(0, parseInt(c.substring(0, 2), 16) - Math.round(255 * amount));
  const g = Math.max(0, parseInt(c.substring(2, 4), 16) - Math.round(255 * amount));
  const b = Math.max(0, parseInt(c.substring(4, 6), 16) - Math.round(255 * amount));
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function GamificationScreen() {
  const router = useRouter();
  const T = useTheme();
  const { user } = useAuthStore();
  const {
    stats,
    levelDefs,
    isLoadingStats,
    isCheckingIn,
    fetchStats,
    fetchLevelDefs,
    performCheckin,
  } = useGamificationStore();

  // XP bar animated width (0–1)
  const xpBarAnim = useRef(new Animated.Value(0)).current;

  // Check-in XP gain overlay animation
  const xpOverlayOpacity = useRef(new Animated.Value(0)).current;
  const xpOverlayTranslate = useRef(new Animated.Value(0)).current;
  const [xpGainText, setXpGainText] = useState('');
  const [badgeText, setBadgeText] = useState('');
  const [showOverlay, setShowOverlay] = useState(false);

  // ── Load data on mount ───────────────────────────────────────

  useEffect(() => {
    fetchLevelDefs();
  }, []);

  useEffect(() => {
    if (user?.id && user?.tenant_id) {
      fetchStats(user.id, user.tenant_id);
    }
  }, [user?.id, user?.tenant_id]);

  // ── Animate XP bar when stats arrive ────────────────────────

  useEffect(() => {
    if (!stats || levelDefs.length === 0) return;

    const currentLevelDef = levelDefs.find((l) => l.level === stats.level);
    const nextLevelDef = levelDefs.find((l) => l.level === stats.level + 1);

    let progress = 0;
    if (currentLevelDef && nextLevelDef) {
      const range = nextLevelDef.xp_required - currentLevelDef.xp_required;
      const earned = stats.xp_total - currentLevelDef.xp_required;
      progress = range > 0 ? Math.min(Math.max(earned / range, 0), 1) : 1;
    }

    Animated.timing(xpBarAnim, {
      toValue: progress,
      duration: 900,
      delay: 200,
      useNativeDriver: false,
    }).start();
  }, [stats, levelDefs]);

  // ── Derived level data ───────────────────────────────────────

  const currentLevelDef = stats ? levelDefs.find((l) => l.level === stats.level) : null;
  const nextLevelDef = stats ? levelDefs.find((l) => l.level === (stats.level ?? 0) + 1) : null;

  const levelColor = currentLevelDef?.color ?? '#6366f1';
  const levelName = currentLevelDef?.name ?? 'Novato';
  const nextLevelName = nextLevelDef?.name ?? null;

  const xpForCurrentLevel = currentLevelDef?.xp_required ?? 0;
  const xpForNextLevel = nextLevelDef?.xp_required ?? null;
  const xpNeededForNext = xpForNextLevel != null ? xpForNextLevel - (stats?.xp_total ?? 0) : null;

  const checkedInToday = stats?.last_checkin_date === TODAY;

  // ── XP Overlay animation ─────────────────────────────────────

  function playXpGainAnimation(xp: number, badges: string[]) {
    setXpGainText(`+${xp} XP`);
    setBadgeText(badges.length > 0 ? `🏅 ${badges.slice(0, 2).join(' · ')}` : '');
    setShowOverlay(true);
    xpOverlayOpacity.setValue(0);
    xpOverlayTranslate.setValue(0);

    Animated.sequence([
      Animated.parallel([
        Animated.timing(xpOverlayOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.timing(xpOverlayTranslate, { toValue: -12, duration: 300, useNativeDriver: true }),
      ]),
      Animated.delay(1200),
      Animated.parallel([
        Animated.timing(xpOverlayOpacity, { toValue: 0, duration: 500, useNativeDriver: true }),
        Animated.timing(xpOverlayTranslate, { toValue: -40, duration: 500, useNativeDriver: true }),
      ]),
    ]).start(() => setShowOverlay(false));
  }

  // ── Check-in handler ─────────────────────────────────────────

  async function handleCheckin() {
    if (!user?.id || !user?.tenant_id) return;
    if (checkedInToday) return;

    try {
      const result = await performCheckin(user.id, user.tenant_id, (user as any).branch_id);
      const badgeNames = result.new_badges.map((b) => b.name);
      playXpGainAnimation(result.xp_earned, badgeNames);
    } catch (err: any) {
      const msg: string = err?.message ?? '';
      if (msg.includes('already_checked_in') || msg.includes('already checked')) {
        Alert.alert('Check-in', 'Ya registraste tu asistencia hoy. ¡Vuelve mañana! 💪');
      } else {
        Alert.alert('Error', 'No se pudo registrar el check-in. Intenta de nuevo.');
      }
    }
  }

  // ── Render ───────────────────────────────────────────────────

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: T.bg }]} edges={['left', 'right']}>
      <StatusBar barStyle="light-content" backgroundColor={T.bg} />
      <ClientTopBar title="Gamificación" />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Loading state ───────────────────────────────────── */}
        {isLoadingStats && !stats ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={T.accent} />
            <Text style={[styles.loadingText, { color: T.textMuted }]}>Cargando stats...</Text>
          </View>
        ) : (
          <>
            {/* ─── 1. LEVEL CARD ──────────────────────────────── */}
            <LevelCard
              level={stats?.level ?? 1}
              levelName={levelName}
              levelColor={levelColor}
              xpTotal={stats?.xp_total ?? 0}
              xpForNextLevel={xpForNextLevel}
              xpNeededForNext={xpNeededForNext}
              nextLevel={(stats?.level ?? 1) + 1}
              nextLevelName={nextLevelName}
              xpBarAnim={xpBarAnim}
              T={T}
            />

            {/* ─── 2. DAILY CHECK-IN ──────────────────────────── */}
            <CheckinButton
              checkedInToday={checkedInToday}
              isCheckingIn={isCheckingIn}
              onPress={handleCheckin}
              T={T}
            />

            {/* ─── 3. STATS ROW ───────────────────────────────── */}
            <StatsRow stats={stats} T={T} />

            {/* ─── 4. NAVIGATION CARDS ────────────────────────── */}
            <NavCards router={router} T={T} />

            {/* ─── 5. STREAK INFO ─────────────────────────────── */}
            <StreakInfo
              currentStreak={stats?.current_streak ?? 0}
              longestStreak={stats?.longest_streak ?? 0}
              T={T}
            />
          </>
        )}

        <View style={{ height: 32 }} />
      </ScrollView>

      {/* ─── 6. XP GAIN OVERLAY ─────────────────────────────── */}
      {showOverlay && (
        <Animated.View
          style={[
            styles.xpOverlay,
            {
              opacity: xpOverlayOpacity,
              transform: [{ translateY: xpOverlayTranslate }],
            },
          ]}
          pointerEvents="none"
        >
          <LinearGradient
            colors={['#f59e0b', '#d97706']}
            style={styles.xpOverlayGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <Text style={styles.xpOverlayText}>{xpGainText}</Text>
            {badgeText ? <Text style={styles.xpOverlayBadge}>{badgeText}</Text> : null}
          </LinearGradient>
        </Animated.View>
      )}
    </SafeAreaView>
  );
}

// ─── Level Card ───────────────────────────────────────────────────────────────

function LevelCard({
  level, levelName, levelColor, xpTotal,
  xpForNextLevel, xpNeededForNext, nextLevel, nextLevelName,
  xpBarAnim, T,
}: {
  level: number;
  levelName: string;
  levelColor: string;
  xpTotal: number;
  xpForNextLevel: number | null;
  xpNeededForNext: number | null;
  nextLevel: number;
  nextLevelName: string | null;
  xpBarAnim: Animated.Value;
  T: any;
}) {
  const darkColor = darkenColor(levelColor, 0.45);

  const barWidth = xpBarAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <LinearGradient
      colors={[levelColor, darkColor]}
      style={styles.levelCard}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      {/* Decorative glow orb */}
      <View style={[styles.levelCardOrb, { backgroundColor: '#ffffff18' }]} />
      <View style={[styles.levelCardOrbSmall, { backgroundColor: '#ffffff12' }]} />

      <View style={styles.levelCardContent}>
        {/* Left: level info */}
        <View style={{ flex: 1 }}>
          <Text style={styles.levelLabel}>NIVEL</Text>
          <Text style={styles.levelNumber}>{level}</Text>
          <Text style={styles.levelName}>{levelName}</Text>
        </View>

        {/* Right: XP ring / badge */}
        <View style={styles.levelBadgeContainer}>
          <View style={[styles.levelBadge, { borderColor: '#ffffff44' }]}>
            <Text style={styles.levelBadgeIcon}>⚡</Text>
            <Text style={styles.levelBadgeXp}>{xpTotal >= 1000 ? `${(xpTotal / 1000).toFixed(1)}k` : xpTotal}</Text>
            <Text style={styles.levelBadgeXpLabel}>XP</Text>
          </View>
        </View>
      </View>

      {/* XP progress bar */}
      <View style={styles.xpBarOuter}>
        <Animated.View style={[styles.xpBarFill, { width: barWidth, backgroundColor: '#ffffff' }]} />
      </View>

      {/* XP labels */}
      <View style={styles.xpLabelRow}>
        <Text style={styles.xpLabelText}>{xpTotal} XP</Text>
        {xpForNextLevel != null && xpNeededForNext != null ? (
          <Text style={styles.xpLabelText}>
            {xpNeededForNext > 0 ? `${xpNeededForNext} XP para nivel ${nextLevel}` : `¡Nivel ${nextLevel} desbloqueado!`}
            {nextLevelName ? ` · ${nextLevelName}` : ''}
          </Text>
        ) : (
          <Text style={styles.xpLabelText}>Nivel máximo 🏆</Text>
        )}
      </View>
    </LinearGradient>
  );
}

// ─── Check-in Button ──────────────────────────────────────────────────────────

function CheckinButton({
  checkedInToday, isCheckingIn, onPress, T,
}: {
  checkedInToday: boolean;
  isCheckingIn: boolean;
  onPress: () => void;
  T: any;
}) {
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (checkedInToday || isCheckingIn) return;

    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.03, duration: 800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [checkedInToday, isCheckingIn]);

  if (checkedInToday) {
    return (
      <View style={[styles.checkinDone, { backgroundColor: T.bgCard, borderColor: T.green + '44' }]}>
        <Text style={styles.checkinDoneIcon}>✓</Text>
        <View>
          <Text style={[styles.checkinDoneTitle, { color: T.green }]}>Ya hiciste check-in hoy</Text>
          <Text style={[styles.checkinDoneSub, { color: T.textMuted }]}>Vuelve mañana para mantener tu racha 🔥</Text>
        </View>
      </View>
    );
  }

  return (
    <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
      <TouchableOpacity
        onPress={onPress}
        disabled={isCheckingIn}
        activeOpacity={0.88}
        style={styles.checkinOuter}
      >
        <LinearGradient
          colors={['#10b981', '#059669', '#047857']}
          style={styles.checkinGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        >
          {isCheckingIn ? (
            <ActivityIndicator color="#ffffff" size="small" />
          ) : (
            <>
              <View style={styles.checkinLeft}>
                <Text style={styles.checkinEmoji}>📍</Text>
                <View>
                  <Text style={styles.checkinTitle}>CHECK IN HOY</Text>
                  <Text style={styles.checkinSub}>Gana 50+ XP · Mantén tu racha 🔥</Text>
                </View>
              </View>
              <Text style={styles.checkinArrow}>→</Text>
            </>
          )}
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ─── Stats Row ────────────────────────────────────────────────────────────────

function StatsRow({ stats, T }: { stats: any; T: any }) {
  const items = [
    { icon: '🔥', value: stats?.current_streak ?? 0, label: 'Racha actual' },
    { icon: '🏆', value: stats?.total_checkins ?? 0, label: 'Total visitas' },
    { icon: '⚡', value: stats?.xp_this_week ?? 0, label: 'XP esta semana' },
    { icon: '🎯', value: stats?.total_challenges_won ?? 0, label: 'Retos ganados' },
  ];

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.statsScroll}
      contentContainerStyle={styles.statsScrollContent}
    >
      {items.map((item, i) => (
        <View
          key={i}
          style={[styles.statCard, { backgroundColor: T.bgCard, borderColor: T.border }]}
        >
          <Text style={styles.statIcon}>{item.icon}</Text>
          <Text style={[styles.statValue, { color: T.text }]}>{item.value}</Text>
          <Text style={[styles.statLabel, { color: T.textMuted }]}>{item.label}</Text>
        </View>
      ))}
    </ScrollView>
  );
}

// ─── Navigation Cards ─────────────────────────────────────────────────────────

function NavCards({ router, T }: { router: any; T: any }) {
  const cards = [
    {
      icon: '🏆',
      title: 'Rankings',
      subtitle: '¿Dónde estás en el ranking esta semana?',
      colors: ['#3b82f6', '#1d4ed8'] as [string, string],
      route: '/(client)/leaderboard',
    },
    {
      icon: '🏅',
      title: 'Logros',
      subtitle: 'Colecciona insignias y desbloquea recompensas',
      colors: ['#a855f7', '#7c3aed'] as [string, string],
      route: '/(client)/achievements',
    },
    {
      icon: '⚔️',
      title: 'Retos',
      subtitle: 'Reta a otros miembros y gana XP',
      colors: ['#f97316', '#b45309'] as [string, string],
      route: '/(client)/challenges',
    },
  ];

  return (
    <View style={styles.navCardsContainer}>
      <Text style={[styles.navCardsTitle, { color: T.textSecondary }]}>EXPLORAR</Text>
      {cards.map((card, i) => (
        <TouchableOpacity
          key={i}
          activeOpacity={0.88}
          onPress={() => router.push(card.route as any)}
          style={[styles.navCardOuter, {
            shadowColor: card.colors[0],
            shadowOffset: { width: 0, height: 6 },
            shadowOpacity: 0.25,
            shadowRadius: 12,
            elevation: 8,
          }]}
        >
          <LinearGradient
            colors={card.colors}
            style={styles.navCardGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <View style={styles.navCardIconWrap}>
              <Text style={styles.navCardIcon}>{card.icon}</Text>
            </View>
            <View style={styles.navCardText}>
              <Text style={styles.navCardTitle}>{card.title}</Text>
              <Text style={styles.navCardSubtitle}>{card.subtitle}</Text>
            </View>
            <Text style={styles.navCardArrow}>›</Text>
          </LinearGradient>
        </TouchableOpacity>
      ))}
    </View>
  );
}

// ─── Streak Info ──────────────────────────────────────────────────────────────

function StreakInfo({
  currentStreak, longestStreak, T,
}: {
  currentStreak: number;
  longestStreak: number;
  T: any;
}) {
  return (
    <View style={[styles.streakCard, { backgroundColor: T.bgCard, borderColor: T.border }]}>
      {currentStreak > 0 ? (
        <>
          <Text style={styles.streakEmoji}>🔥</Text>
          <View style={{ flex: 1 }}>
            <Text style={[styles.streakTitle, { color: T.text }]}>
              Llevas {currentStreak} {currentStreak === 1 ? 'día seguido' : 'días seguidos'}
            </Text>
            <Text style={[styles.streakSub, { color: T.textMuted }]}>
              Racha máxima: {longestStreak} días
            </Text>
          </View>
        </>
      ) : (
        <>
          <Text style={styles.streakEmoji}>💪</Text>
          <View style={{ flex: 1 }}>
            <Text style={[styles.streakTitle, { color: T.text }]}>Empieza tu racha hoy con el check-in</Text>
            <Text style={[styles.streakSub, { color: T.textMuted }]}>Racha máxima: {longestStreak} días</Text>
          </View>
        </>
      )}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },

  scroll: {
    padding: 16,
    paddingTop: 8,
    gap: 14,
  },

  // Loading
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
  },

  // Level Card
  levelCard: {
    borderRadius: 20,
    padding: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 14,
  },
  levelCardOrb: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    top: -60,
    right: -40,
  },
  levelCardOrbSmall: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    bottom: -20,
    left: -20,
  },
  levelCardContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  levelLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#ffffff99',
    letterSpacing: 2,
    marginBottom: 2,
  },
  levelNumber: {
    fontSize: 64,
    fontWeight: '900',
    color: '#ffffff',
    lineHeight: 68,
    letterSpacing: -2,
  },
  levelName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffffcc',
    letterSpacing: 0.3,
  },
  levelBadgeContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 4,
  },
  levelBadge: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    backgroundColor: '#ffffff18',
    alignItems: 'center',
    justifyContent: 'center',
  },
  levelBadgeIcon: {
    fontSize: 20,
    marginBottom: 0,
  },
  levelBadgeXp: {
    fontSize: 18,
    fontWeight: '900',
    color: '#ffffff',
    lineHeight: 20,
  },
  levelBadgeXpLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#ffffff99',
    letterSpacing: 1,
  },
  xpBarOuter: {
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ffffff33',
    overflow: 'hidden',
    marginBottom: 8,
  },
  xpBarFill: {
    height: 8,
    borderRadius: 4,
    opacity: 0.9,
  },
  xpLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  xpLabelText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#ffffffbb',
  },

  // Check-in button
  checkinOuter: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 16,
    elevation: 10,
  },
  checkinGradient: {
    height: 80,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  checkinLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  checkinEmoji: {
    fontSize: 28,
  },
  checkinTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#ffffff',
    letterSpacing: 1,
  },
  checkinSub: {
    fontSize: 12,
    color: '#ffffff99',
    fontWeight: '500',
    marginTop: 2,
  },
  checkinArrow: {
    fontSize: 24,
    color: '#ffffff',
    fontWeight: '700',
  },
  checkinDone: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 18,
    borderRadius: 16,
    borderWidth: 1.5,
  },
  checkinDoneIcon: {
    fontSize: 24,
    color: '#10b981',
    fontWeight: '800',
  },
  checkinDoneTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  checkinDoneSub: {
    fontSize: 12,
    marginTop: 2,
  },

  // Stats row
  statsScroll: {
    marginHorizontal: -16,
  },
  statsScrollContent: {
    paddingHorizontal: 16,
    gap: 10,
  },
  statCard: {
    width: 100,
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    gap: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  statIcon: {
    fontSize: 20,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '900',
    lineHeight: 28,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 13,
  },

  // Nav cards
  navCardsContainer: {
    gap: 10,
  },
  navCardsTitle: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.5,
    marginBottom: 2,
  },
  navCardOuter: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  navCardGradient: {
    height: 90,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    gap: 14,
  },
  navCardIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#ffffff22',
    alignItems: 'center',
    justifyContent: 'center',
  },
  navCardIcon: {
    fontSize: 24,
  },
  navCardText: {
    flex: 1,
  },
  navCardTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: 0.2,
  },
  navCardSubtitle: {
    fontSize: 12,
    color: '#ffffffbb',
    marginTop: 2,
    lineHeight: 16,
  },
  navCardArrow: {
    fontSize: 28,
    color: '#ffffffcc',
    fontWeight: '300',
  },

  // Streak info
  streakCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
  },
  streakEmoji: {
    fontSize: 24,
  },
  streakTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  streakSub: {
    fontSize: 12,
    marginTop: 2,
  },

  // XP Gain overlay
  xpOverlay: {
    position: 'absolute',
    top: 100,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 100,
  },
  xpOverlayGradient: {
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 40,
    alignItems: 'center',
    shadowColor: '#f59e0b',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 20,
  },
  xpOverlayText: {
    fontSize: 32,
    fontWeight: '900',
    color: '#ffffff',
    letterSpacing: -0.5,
  },
  xpOverlayBadge: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffffcc',
    marginTop: 2,
  },
});
