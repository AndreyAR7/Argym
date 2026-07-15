import React, { useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/store/auth.store';
import { useGamificationStore } from '@/store/gamification.store';
import type { LeaderboardEntry } from '@/store/gamification.store';
import { useTheme } from '@/hooks/useTheme';
import { ClientTopBar } from '@/components/client/ClientTopBar';

const RANK_MEDALS: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' };

function getXpForPeriod(entry: LeaderboardEntry, period: 'week' | 'month' | 'all'): number {
  if (period === 'week') return entry.xp_this_week;
  if (period === 'month') return entry.xp_this_month;
  return entry.xp_total;
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export default function LeaderboardScreen() {
  const { t } = useTranslation();
  const T = useTheme();
  const { user } = useAuthStore();

  const PERIODS = [
    { key: 'week' as const, label: t('client.leaderboard.periods.week') },
    { key: 'month' as const, label: t('client.leaderboard.periods.month') },
    { key: 'all' as const, label: t('client.leaderboard.periods.all') },
  ];

  const {
    leaderboard,
    leaderboardPeriod,
    isLoadingLeaderboard,
    fetchLeaderboard,
    setLeaderboardPeriod,
  } = useGamificationStore();

  const load = useCallback(
    (period: 'week' | 'month' | 'all') => {
      if (user?.tenant_id) {
        fetchLeaderboard(user.tenant_id, period);
      }
    },
    [user?.tenant_id, fetchLeaderboard],
  );

  useEffect(() => {
    load(leaderboardPeriod);
  }, []);

  function handlePeriodChange(period: 'week' | 'month' | 'all') {
    setLeaderboardPeriod(period);
    load(period);
  }

  function renderItem({ item }: { item: LeaderboardEntry }) {
    const isTop3 = item.rank <= 3;
    const medal = RANK_MEDALS[item.rank];
    const xp = getXpForPeriod(item, leaderboardPeriod);
    const initials = getInitials(item.full_name);

    const rowBg = item.is_me
      ? T.gold + '18'
      : isTop3
        ? T.accent + '0D'
        : T.bgCard;

    const rowBorder = item.is_me
      ? T.gold
      : isTop3
        ? T.accent + '44'
        : T.border;

    return (
      <View
        style={[
          styles.row,
          {
            backgroundColor: rowBg,
            borderColor: rowBorder,
            borderWidth: item.is_me ? 1.5 : 1,
          },
        ]}
      >
        {/* Rank */}
        <View style={styles.rankCol}>
          {medal ? (
            <Text style={styles.medal}>{medal}</Text>
          ) : (
            <Text style={[styles.rankNum, { color: T.textMuted }]}>
              {item.rank}
            </Text>
          )}
        </View>

        {/* Avatar */}
        <LinearGradient
          colors={
            item.is_me
              ? [T.gold + 'CC', T.gold + '66']
              : isTop3
                ? [T.accent + 'CC', T.accent + '55']
                : [T.bgCardElevated, T.bgSurface]
          }
          style={styles.avatar}
        >
          <Text style={[styles.avatarText, { color: item.is_me || isTop3 ? '#fff' : T.textSecondary }]}>
            {initials}
          </Text>
        </LinearGradient>

        {/* Info */}
        <View style={styles.infoCol}>
          <View style={styles.nameRow}>
            <Text
              style={[
                styles.name,
                { color: item.is_me ? T.gold : T.text },
              ]}
              numberOfLines={1}
            >
              {item.full_name}
              {item.is_me ? t('client.leaderboard.youSuffix') : ''}
            </Text>
          </View>
          <View style={styles.metaRow}>
            {item.current_streak > 0 && (
              <Text style={[styles.meta, { color: T.orange }]}>
                🔥 {item.current_streak}
              </Text>
            )}
            <Text style={[styles.meta, { color: T.textMuted }]}>
              📍 {item.total_checkins}
            </Text>
          </View>
        </View>

        {/* Level + XP */}
        <View style={styles.rightCol}>
          <View
            style={[
              styles.levelBadge,
              { backgroundColor: T.accent + '22', borderColor: T.accent + '55' },
            ]}
          >
            <Text style={[styles.levelText, { color: T.accent }]}>
              {t('client.leaderboard.levelAbbrev', { level: item.level })}
            </Text>
          </View>
          <Text style={[styles.xp, { color: T.gold }]}>
            ⚡ {xp.toLocaleString()}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: T.bg }]} edges={['left', 'right']}>
      <StatusBar barStyle="light-content" backgroundColor={T.bg} />
      <ClientTopBar title={t('client.leaderboard.title')} />

      {/* Period tabs */}
      <View style={[styles.tabsRow, { borderBottomColor: T.border }]}>
        {PERIODS.map((p) => {
          const active = leaderboardPeriod === p.key;
          return (
            <TouchableOpacity
              key={p.key}
              onPress={() => handlePeriodChange(p.key)}
              activeOpacity={0.75}
              style={[
                styles.tab,
                {
                  backgroundColor: active ? T.gold : T.bgCard,
                  borderColor: active ? T.gold : T.border,
                },
              ]}
            >
              <Text
                style={[
                  styles.tabText,
                  { color: active ? '#000' : T.textSecondary },
                ]}
              >
                {p.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {isLoadingLeaderboard ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={T.gold} />
        </View>
      ) : leaderboard.length === 0 ? (
        <View style={styles.centered}>
          <Text style={styles.emptyIcon}>🏆</Text>
          <Text style={[styles.emptyText, { color: T.textMuted }]}>
            {t('client.leaderboard.emptyText')}
          </Text>
        </View>
      ) : (
        <FlatList
          data={leaderboard}
          keyExtractor={(item) => item.user_id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <Text style={[styles.listHeader, { color: T.textMuted }]}>
              {t('client.leaderboard.participantsCount', { count: leaderboard.length })}
            </Text>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  emptyIcon: { fontSize: 48 },
  emptyText: { fontSize: 15 },

  tabsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
    borderBottomWidth: 1,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
  },
  tabText: { fontSize: 13, fontWeight: '700' },

  list: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 32 },
  listHeader: { fontSize: 12, fontWeight: '600', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 8,
    gap: 10,
  },

  rankCol: { width: 32, alignItems: 'center' },
  medal: { fontSize: 22 },
  rankNum: { fontSize: 15, fontWeight: '700' },

  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: { fontSize: 14, fontWeight: '800' },

  infoCol: { flex: 1, gap: 3 },
  nameRow: { flexDirection: 'row', alignItems: 'center' },
  name: { fontSize: 14, fontWeight: '700' },
  metaRow: { flexDirection: 'row', gap: 8 },
  meta: { fontSize: 12 },

  rightCol: { alignItems: 'flex-end', gap: 4 },
  levelBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
  },
  levelText: { fontSize: 11, fontWeight: '700' },
  xp: { fontSize: 13, fontWeight: '800' },
});
