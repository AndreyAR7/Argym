import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  StatusBar,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuthStore } from '@/store/auth.store';
import { useGamificationStore } from '@/store/gamification.store';
import type { BadgeDefinition, UserBadge } from '@/store/gamification.store';
import { useTheme } from '@/hooks/useTheme';
import { ClientTopBar } from '@/components/client/ClientTopBar';

type FilterKey = 'all' | 'earned' | 'locked';

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'all', label: 'Todos' },
  { key: 'earned', label: 'Ganados' },
  { key: 'locked', label: 'Por ganar' },
];

const RARITY_COLORS: Record<BadgeDefinition['rarity'], string> = {
  common: '#6b7280',
  rare: '#3b82f6',
  epic: '#8b5cf6',
  legendary: '#f59e0b',
};

const RARITY_LABELS: Record<BadgeDefinition['rarity'], string> = {
  common: 'Común',
  rare: 'Raro',
  epic: 'Épico',
  legendary: 'Legendario',
};

const SCREEN_WIDTH = Dimensions.get('window').width;
const CARD_GAP = 10;
const CARD_H_PAD = 16;
const CARD_WIDTH = (SCREEN_WIDTH - CARD_H_PAD * 2 - CARD_GAP) / 2;

interface BadgeItem {
  def: BadgeDefinition;
  userBadge: UserBadge | null;
}

function buildBadgeList(
  allBadges: BadgeDefinition[],
  myBadges: UserBadge[],
  filter: FilterKey,
): BadgeItem[] {
  const earnedById = new Map<string, UserBadge>(myBadges.map((ub) => [ub.badge_id, ub]));

  const items: BadgeItem[] = allBadges.map((def) => ({
    def,
    userBadge: earnedById.get(def.id) ?? null,
  }));

  const filtered = items.filter((item) => {
    if (filter === 'earned') return item.userBadge !== null;
    if (filter === 'locked') return item.userBadge === null;
    return true;
  });

  // Earned first, then locked; within each group keep original sort_order
  return filtered.sort((a, b) => {
    const aEarned = a.userBadge !== null ? 0 : 1;
    const bEarned = b.userBadge !== null ? 0 : 1;
    return aEarned - bEarned;
  });
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('es-CR', { day: '2-digit', month: 'short', year: 'numeric' });
}

function BadgeCard({ item, T }: { item: BadgeItem; T: ReturnType<typeof import('@/hooks/useTheme').useTheme> }) {
  const { def, userBadge } = item;
  const earned = userBadge !== null;
  const rarityColor = RARITY_COLORS[def.rarity];
  const isLegendary = def.rarity === 'legendary';

  const borderColor = earned
    ? isLegendary
      ? rarityColor
      : rarityColor + 'BB'
    : T.border;

  const glowStyle = earned && isLegendary
    ? {
        shadowColor: rarityColor,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.6,
        shadowRadius: 10,
        elevation: 8,
      }
    : {};

  return (
    <View
      style={[
        styles.card,
        {
          width: CARD_WIDTH,
          backgroundColor: T.bgCard,
          borderColor,
          opacity: earned ? 1 : 0.4,
        },
        glowStyle,
      ]}
    >
      {/* Rarity chip */}
      <View style={[styles.rarityChip, { backgroundColor: rarityColor + '22', borderColor: rarityColor + '55' }]}>
        <Text style={[styles.rarityText, { color: rarityColor }]}>
          {RARITY_LABELS[def.rarity]}
        </Text>
      </View>

      {/* Icon */}
      <Text style={styles.badgeIcon}>{def.icon}</Text>

      {/* Name */}
      <Text style={[styles.badgeName, { color: T.text }]} numberOfLines={2}>
        {def.name}
      </Text>

      {/* Description */}
      <Text style={[styles.badgeDesc, { color: T.textMuted }]} numberOfLines={3}>
        {def.description}
      </Text>

      {/* XP reward */}
      <Text style={[styles.xpReward, { color: T.gold }]}>
        ⚡ {def.xp_reward} XP
      </Text>

      {/* Earned date or progress */}
      {earned && userBadge ? (
        <Text style={[styles.earnedDate, { color: T.green }]}>
          ✓ {formatDate(userBadge.earned_at)}
        </Text>
      ) : def.condition_value !== null ? (
        <Text style={[styles.earnedDate, { color: T.textMuted }]}>
          Meta: {def.condition_value}
        </Text>
      ) : null}
    </View>
  );
}

export default function AchievementsScreen() {
  const T = useTheme();
  const { user } = useAuthStore();
  const {
    myBadges,
    allBadges,
    stats,
    isLoadingBadges,
    fetchBadges,
    fetchStats,
  } = useGamificationStore();

  const [filter, setFilter] = useState<FilterKey>('all');

  const load = useCallback(() => {
    if (user?.id && user?.tenant_id) {
      fetchBadges(user.id, user.tenant_id);
      if (!stats) fetchStats(user.id, user.tenant_id);
    }
  }, [user?.id, user?.tenant_id]);

  useEffect(() => {
    load();
  }, []);

  const badgeItems = buildBadgeList(allBadges, myBadges, filter);

  const totalXpFromBadges = myBadges.reduce((sum, ub) => sum + (ub.badge?.xp_reward ?? 0), 0);

  function renderItem({ item, index }: { item: BadgeItem; index: number }) {
    const isLeft = index % 2 === 0;
    return (
      <View style={isLeft ? styles.leftCell : styles.rightCell}>
        <BadgeCard item={item} T={T} />
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: T.bg }]} edges={['left', 'right']}>
      <StatusBar barStyle="light-content" backgroundColor={T.bg} />
      <ClientTopBar title="Logros" />

      <FlatList
        data={badgeItems}
        keyExtractor={(item) => item.def.id}
        numColumns={2}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <>
            {/* Summary card */}
            <LinearGradient
              colors={[T.gold + '33', T.gold + '0A']}
              style={[styles.summaryCard, { borderColor: T.gold + '44' }]}
            >
              <View style={styles.summaryRow}>
                <View style={styles.summaryItem}>
                  <Text style={[styles.summaryNum, { color: T.gold }]}>
                    {myBadges.length}
                  </Text>
                  <Text style={[styles.summaryLabel, { color: T.textSecondary }]}>
                    / {allBadges.length} logros
                  </Text>
                </View>
                <View style={[styles.summaryDivider, { backgroundColor: T.border }]} />
                <View style={styles.summaryItem}>
                  <Text style={[styles.summaryNum, { color: T.gold }]}>
                    ⚡ {totalXpFromBadges.toLocaleString()}
                  </Text>
                  <Text style={[styles.summaryLabel, { color: T.textSecondary }]}>
                    XP de logros
                  </Text>
                </View>
              </View>
              {allBadges.length > 0 && (
                <View style={[styles.progressTrack, { backgroundColor: T.border }]}>
                  <View
                    style={[
                      styles.progressFill,
                      {
                        width: `${Math.round((myBadges.length / allBadges.length) * 100)}%` as any,
                        backgroundColor: T.gold,
                      },
                    ]}
                  />
                </View>
              )}
            </LinearGradient>

            {/* Filter tabs */}
            <View style={styles.tabsRow}>
              {FILTERS.map((f) => {
                const active = filter === f.key;
                return (
                  <TouchableOpacity
                    key={f.key}
                    onPress={() => setFilter(f.key)}
                    activeOpacity={0.75}
                    style={[
                      styles.tab,
                      {
                        backgroundColor: active ? T.accent : T.bgCard,
                        borderColor: active ? T.accent : T.border,
                      },
                    ]}
                  >
                    <Text style={[styles.tabText, { color: active ? '#fff' : T.textSecondary }]}>
                      {f.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {isLoadingBadges ? (
              <View style={styles.loadingRow}>
                <ActivityIndicator color={T.gold} size="large" />
              </View>
            ) : badgeItems.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyIcon}>🏅</Text>
                <Text style={[styles.emptyText, { color: T.textMuted }]}>
                  {filter === 'earned'
                    ? 'Aún no has ganado ningún logro'
                    : 'No hay logros disponibles'}
                </Text>
              </View>
            ) : null}
          </>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },

  list: { paddingHorizontal: CARD_H_PAD, paddingBottom: 40 },

  summaryCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
    marginTop: 8,
  },
  summaryRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  summaryItem: { flex: 1, alignItems: 'center' },
  summaryNum: { fontSize: 24, fontWeight: '800' },
  summaryLabel: { fontSize: 12, fontWeight: '500', marginTop: 2 },
  summaryDivider: { width: 1, height: 36, marginHorizontal: 8 },
  progressTrack: { height: 6, borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: 6, borderRadius: 3 },

  tabsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
  },
  tabText: { fontSize: 13, fontWeight: '700' },

  loadingRow: { paddingVertical: 40, alignItems: 'center' },

  emptyContainer: { paddingVertical: 48, alignItems: 'center', gap: 12 },
  emptyIcon: { fontSize: 48 },
  emptyText: { fontSize: 15 },

  leftCell: { marginRight: CARD_GAP / 2, marginBottom: CARD_GAP },
  rightCell: { marginLeft: CARD_GAP / 2, marginBottom: CARD_GAP },

  card: {
    borderRadius: 14,
    borderWidth: 1.5,
    padding: 12,
    gap: 6,
  },

  rarityChip: {
    alignSelf: 'flex-start',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    marginBottom: 4,
  },
  rarityText: { fontSize: 9, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 },

  badgeIcon: { fontSize: 32, textAlign: 'center', marginVertical: 4 },
  badgeName: { fontSize: 13, fontWeight: '800', textAlign: 'center' },
  badgeDesc: { fontSize: 11, textAlign: 'center', lineHeight: 15 },
  xpReward: { fontSize: 12, fontWeight: '700', textAlign: 'center', marginTop: 4 },
  earnedDate: { fontSize: 10, fontWeight: '600', textAlign: 'center' },
});
