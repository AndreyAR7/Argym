import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  StatusBar,
  Modal,
  TextInput,
  Animated,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { useAuthStore } from '@/store/auth.store';
import { useGamificationStore } from '@/store/gamification.store';
import type { Challenge } from '@/store/gamification.store';
import { useTheme } from '@/hooks/useTheme';
import { ClientTopBar } from '@/components/client/ClientTopBar';

// ─── Constants ────────────────────────────────────────────────

type FilterKey = 'active' | 'mine' | 'completed';

const FILTERS: { key: FilterKey; i18nKey: string }[] = [
  { key: 'active', i18nKey: 'client.challenges.filters.active' },
  { key: 'mine', i18nKey: 'client.challenges.filters.mine' },
  { key: 'completed', i18nKey: 'client.challenges.filters.completed' },
];

const XP_PRESETS = [50, 100, 150, 200] as const;

const TYPE_GRADIENTS: Record<Challenge['challenge_type'], [string, string]> = {
  global: ['#1e40af', '#3b82f6'],
  '1v1': ['#5b21b6', '#8b5cf6'],
  group: ['#c2410c', '#f97316'],
};

const TYPE_LABEL_KEYS: Record<Challenge['challenge_type'], string> = {
  global: 'client.challenges.types.global',
  '1v1': 'client.challenges.types.oneVOne',
  group: 'client.challenges.types.group',
};

const STATUS_CONFIG: Record<
  NonNullable<Challenge['my_status']>,
  { i18nKey: string; color: string }
> = {
  pending: { i18nKey: 'client.challenges.status.pending', color: '#f59e0b' },
  accepted: { i18nKey: 'client.challenges.status.accepted', color: '#3b82f6' },
  completed: { i18nKey: 'client.challenges.status.completed', color: '#22c55e' },
  declined: { i18nKey: 'client.challenges.status.declined', color: '#6b7280' },
  failed: { i18nKey: 'client.challenges.status.failed', color: '#ef4444' },
};

// ─── Helpers ──────────────────────────────────────────────────

function filterChallenges(
  challenges: Challenge[],
  userId: string,
  filterKey: FilterKey,
): Challenge[] {
  switch (filterKey) {
    case 'active':
      return challenges.filter(
        (c) =>
          c.status === 'active' &&
          c.my_status !== 'completed' &&
          c.my_status !== 'declined',
      );
    case 'mine':
      return challenges.filter((c) => c.creator_id === userId);
    case 'completed':
      return challenges.filter(
        (c) => c.my_status === 'completed' || c.status === 'completed',
      );
    default:
      return challenges;
  }
}

function formatCountdown(expiresAt: string, t: TFunction): string {
  const diff = new Date(expiresAt).getTime() - Date.now();
  if (diff <= 0) return t('client.challenges.countdown.expired');
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  if (days > 0) return `${days}d ${hours}h`;
  const mins = Math.floor((diff % 3600000) / 60000);
  return `${hours}h ${mins}m`;
}

// ─── XP Toast ─────────────────────────────────────────────────

function XpToast({ xp, visible }: { xp: number; visible: boolean }) {
  const { t } = useTranslation();
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.sequence([
        Animated.spring(anim, { toValue: 1, useNativeDriver: true, speed: 20 }),
        Animated.delay(1800),
        Animated.timing(anim, { toValue: 0, duration: 300, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  const translateY = anim.interpolate({ inputRange: [0, 1], outputRange: [-60, 0] });
  const opacity = anim;

  if (!visible && !anim) return null;

  return (
    <Animated.View
      style={[
        styles.toast,
        { transform: [{ translateY }], opacity },
      ]}
      pointerEvents="none"
    >
      <Text style={styles.toastText}>{t('client.challenges.toast.xpEarned', { xp })}</Text>
    </Animated.View>
  );
}

// ─── Challenge Card ───────────────────────────────────────────

function ChallengeCard({
  item,
  userId,
  T,
  onRespond,
  onComplete,
}: {
  item: Challenge;
  userId: string;
  T: ReturnType<typeof import('@/hooks/useTheme').useTheme>;
  onRespond: (id: string, response: 'accepted' | 'declined') => void;
  onComplete: (id: string) => void;
}) {
  const { t } = useTranslation();
  const gradientColors = TYPE_GRADIENTS[item.challenge_type];
  const statusCfg = item.my_status
    ? { label: t(STATUS_CONFIG[item.my_status].i18nKey), color: STATUS_CONFIG[item.my_status].color }
    : null;

  return (
    <View style={[styles.challengeCard, { borderColor: T.border }]}>
      <LinearGradient
        colors={[gradientColors[0] + 'CC', gradientColors[1] + '44']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.cardGradient}
      >
        {/* Header row */}
        <View style={styles.cardHeader}>
          <View
            style={[
              styles.typeChip,
              { backgroundColor: gradientColors[1] + '33', borderColor: gradientColors[1] + '66' },
            ]}
          >
            <Text style={[styles.typeChipText, { color: gradientColors[1] }]}>
              {t(TYPE_LABEL_KEYS[item.challenge_type])}
            </Text>
          </View>
          {statusCfg && (
            <View style={[styles.statusPill, { backgroundColor: statusCfg.color + '22', borderColor: statusCfg.color + '55' }]}>
              <Text style={[styles.statusPillText, { color: statusCfg.color }]}>
                {statusCfg.label}
              </Text>
            </View>
          )}
        </View>

        {/* Title + description */}
        <Text style={[styles.cardTitle, { color: '#fff' }]} numberOfLines={2}>
          {item.title}
        </Text>
        {item.description ? (
          <Text style={[styles.cardDesc, { color: '#ffffffBB' }]} numberOfLines={2}>
            {item.description}
          </Text>
        ) : null}

        {/* Meta row */}
        <View style={styles.cardMeta}>
          <Text style={[styles.metaItem, { color: '#FFD700' }]}>
            ⚡ {item.xp_reward} XP
          </Text>
          {item.participant_count !== undefined && (
            <Text style={[styles.metaItem, { color: '#ffffffBB' }]}>
              👥 {item.participant_count}
            </Text>
          )}
          {item.expires_at && (
            <Text style={[styles.metaItem, { color: '#ffffffBB' }]}>
              ⏱ {formatCountdown(item.expires_at, t)}
            </Text>
          )}
        </View>

        {/* Action buttons */}
        {item.my_status === 'pending' && (
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={[styles.actionBtn, styles.acceptBtn]}
              onPress={() => onRespond(item.id, 'accepted')}
              activeOpacity={0.8}
            >
              <Text style={styles.acceptBtnText}>{t('client.challenges.actions.accept')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionBtn, styles.rejectBtn]}
              onPress={() => onRespond(item.id, 'declined')}
              activeOpacity={0.8}
            >
              <Text style={styles.rejectBtnText}>{t('client.challenges.actions.reject')}</Text>
            </TouchableOpacity>
          </View>
        )}

        {item.my_status === 'accepted' && (
          <TouchableOpacity
            style={styles.completeBtn}
            onPress={() => onComplete(item.id)}
            activeOpacity={0.8}
          >
            <Text style={styles.completeBtnText}>{t('client.challenges.actions.complete')}</Text>
          </TouchableOpacity>
        )}
      </LinearGradient>
    </View>
  );
}

// ─── Create Challenge Modal ───────────────────────────────────

function CreateChallengeModal({
  visible,
  tenantId,
  onClose,
  T,
  onCreate,
}: {
  visible: boolean;
  tenantId: string;
  onClose: () => void;
  T: ReturnType<typeof import('@/hooks/useTheme').useTheme>;
  onCreate: (params: {
    title: string;
    description: string;
    challengeType: 'global' | '1v1';
    xpReward: number;
    inviteNote: string;
  }) => void;
}) {
  const { t } = useTranslation();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [challengeType, setChallengeType] = useState<'global' | '1v1'>('global');
  const [xpReward, setXpReward] = useState<number>(100);
  const [inviteNote, setInviteNote] = useState('');

  function reset() {
    setTitle('');
    setDescription('');
    setChallengeType('global');
    setXpReward(100);
    setInviteNote('');
  }

  function handleSubmit() {
    if (!title.trim()) return;
    onCreate({ title: title.trim(), description: description.trim(), challengeType, xpReward, inviteNote: inviteNote.trim() });
    reset();
    onClose();
  }

  function handleClose() {
    reset();
    onClose();
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={handleClose}>
      <KeyboardAvoidingView
        style={[styles.modalWrapper, { backgroundColor: T.bg }]}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={[styles.modalHandle, { backgroundColor: T.border }]} />
        <View style={[styles.modalHeader, { borderBottomColor: T.border }]}>
          <Text style={[styles.modalTitle, { color: T.text }]}>{t('client.challenges.modal.title')}</Text>
          <TouchableOpacity onPress={handleClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={[styles.modalClose, { color: T.textMuted }]}>✕</Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.modalBody} keyboardShouldPersistTaps="handled">
          {/* Title */}
          <Text style={[styles.fieldLabel, { color: T.textSecondary }]}>{t('client.challenges.modal.fields.title')}</Text>
          <TextInput
            style={[styles.input, { backgroundColor: T.bgCard, borderColor: T.border, color: T.text }]}
            placeholder={t('client.challenges.modal.placeholders.title')}
            placeholderTextColor={T.textMuted}
            value={title}
            onChangeText={setTitle}
            maxLength={80}
          />

          {/* Description */}
          <Text style={[styles.fieldLabel, { color: T.textSecondary }]}>{t('client.challenges.modal.fields.description')}</Text>
          <TextInput
            style={[styles.input, styles.inputMultiline, { backgroundColor: T.bgCard, borderColor: T.border, color: T.text }]}
            placeholder={t('client.challenges.modal.placeholders.description')}
            placeholderTextColor={T.textMuted}
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={3}
            maxLength={240}
            textAlignVertical="top"
          />

          {/* Type selector */}
          <Text style={[styles.fieldLabel, { color: T.textSecondary }]}>{t('client.challenges.modal.fields.type')}</Text>
          <View style={styles.typeRow}>
            {(['global', '1v1'] as const).map((typeOption) => {
              const active = challengeType === typeOption;
              return (
                <TouchableOpacity
                  key={typeOption}
                  onPress={() => setChallengeType(typeOption)}
                  activeOpacity={0.8}
                  style={[
                    styles.typeBtn,
                    {
                      backgroundColor: active ? T.accent : T.bgCard,
                      borderColor: active ? T.accent : T.border,
                    },
                  ]}
                >
                  <Text style={[styles.typeBtnText, { color: active ? '#fff' : T.textSecondary }]}>
                    {typeOption === 'global' ? t('client.challenges.modal.types.global') : t('client.challenges.modal.types.oneVOne')}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* 1v1 invite */}
          {challengeType === '1v1' && (
            <>
              <Text style={[styles.fieldLabel, { color: T.textSecondary }]}>{t('client.challenges.modal.fields.opponent')}</Text>
              <TextInput
                style={[styles.input, { backgroundColor: T.bgCard, borderColor: T.border, color: T.text }]}
                placeholder={t('client.challenges.modal.placeholders.opponent')}
                placeholderTextColor={T.textMuted}
                value={inviteNote}
                onChangeText={setInviteNote}
              />
            </>
          )}

          {/* XP reward */}
          <Text style={[styles.fieldLabel, { color: T.textSecondary }]}>{t('client.challenges.modal.fields.xpReward')}</Text>
          <View style={styles.xpRow}>
            {XP_PRESETS.map((preset) => {
              const active = xpReward === preset;
              return (
                <TouchableOpacity
                  key={preset}
                  onPress={() => setXpReward(preset)}
                  activeOpacity={0.8}
                  style={[
                    styles.xpBtn,
                    {
                      backgroundColor: active ? T.gold + '33' : T.bgCard,
                      borderColor: active ? T.gold : T.border,
                    },
                  ]}
                >
                  <Text style={[styles.xpBtnText, { color: active ? T.gold : T.textSecondary }]}>
                    ⚡ {preset}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Submit */}
          <TouchableOpacity
            onPress={handleSubmit}
            activeOpacity={0.85}
            style={[
              styles.submitBtn,
              { backgroundColor: title.trim() ? T.accent : T.bgCard, borderColor: T.accent },
            ]}
          >
            <Text style={[styles.submitBtnText, { color: title.trim() ? '#fff' : T.textMuted }]}>
              {t('client.challenges.modal.createButton')}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Screen ───────────────────────────────────────────────────

export default function ChallengesScreen() {
  const { t } = useTranslation();
  const T = useTheme();
  const { user } = useAuthStore();
  const {
    challenges,
    isLoadingChallenges,
    fetchChallenges,
    respondToChallenge,
    completeChallenge,
    createChallenge,
  } = useGamificationStore();

  const [filter, setFilter] = useState<FilterKey>('active');
  const [modalVisible, setModalVisible] = useState(false);
  const [toastXp, setToastXp] = useState(0);
  const [toastVisible, setToastVisible] = useState(false);

  const load = useCallback(() => {
    if (user?.id && user?.tenant_id) {
      fetchChallenges(user.id, user.tenant_id);
    }
  }, [user?.id, user?.tenant_id]);

  useEffect(() => {
    load();
  }, []);

  function showToast(xp: number) {
    setToastXp(xp);
    setToastVisible(true);
    setTimeout(() => setToastVisible(false), 2500);
  }

  async function handleRespond(challengeId: string, response: 'accepted' | 'declined') {
    if (!user?.id) return;
    try {
      await respondToChallenge(challengeId, user.id, response);
    } catch {
      // error surfaced by store
    }
  }

  async function handleComplete(challengeId: string) {
    if (!user?.id) return;
    try {
      const result = await completeChallenge(challengeId, user.id);
      showToast(result.xp_earned);
    } catch {
      // error surfaced by store
    }
  }

  async function handleCreate(params: {
    title: string;
    description: string;
    challengeType: 'global' | '1v1';
    xpReward: number;
    inviteNote: string;
  }) {
    if (!user?.tenant_id) return;
    try {
      await createChallenge({
        tenantId: user.tenant_id,
        title: params.title,
        description: params.description || undefined,
        challengeType: params.challengeType,
        targetMetric: 'checkins',
        targetValue: 1,
        xpReward: params.xpReward,
      });
      load();
    } catch {
      // error surfaced by store
    }
  }

  const filteredChallenges = filterChallenges(challenges, user?.id ?? '', filter);

  function renderItem({ item }: { item: Challenge }) {
    return (
      <ChallengeCard
        item={item}
        userId={user?.id ?? ''}
        T={T}
        onRespond={handleRespond}
        onComplete={handleComplete}
      />
    );
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: T.bg }]} edges={['left', 'right']}>
      <StatusBar barStyle="light-content" backgroundColor={T.bg} />
      <ClientTopBar title={t('client.challenges.title')} />

      {/* XP toast */}
      <XpToast xp={toastXp} visible={toastVisible} />

      {/* Filter tabs */}
      <View style={[styles.tabsRow, { borderBottomColor: T.border }]}>
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
                {t(f.i18nKey)}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {isLoadingChallenges ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={T.accent} />
        </View>
      ) : (
        <FlatList
          data={filteredChallenges}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>⚔️</Text>
              <Text style={[styles.emptyText, { color: T.textMuted }]}>
                {t('client.challenges.empty.message')}
              </Text>
              <TouchableOpacity
                onPress={() => setModalVisible(true)}
                style={[styles.emptyAction, { backgroundColor: T.accent + '22', borderColor: T.accent + '55' }]}
              >
                <Text style={[styles.emptyActionText, { color: T.accent }]}>{t('client.challenges.empty.action')}</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}

      {/* Floating action button */}
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: T.accent }]}
        onPress={() => setModalVisible(true)}
        activeOpacity={0.85}
      >
        <Text style={styles.fabIcon}>+</Text>
      </TouchableOpacity>

      {/* Create challenge modal */}
      {user?.tenant_id ? (
        <CreateChallengeModal
          visible={modalVisible}
          tenantId={user.tenant_id}
          onClose={() => setModalVisible(false)}
          T={T}
          onCreate={handleCreate}
        />
      ) : null}
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },

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

  list: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 100 },

  emptyContainer: { paddingTop: 60, alignItems: 'center', gap: 12 },
  emptyIcon: { fontSize: 48 },
  emptyText: { fontSize: 15, textAlign: 'center' },
  emptyAction: {
    marginTop: 8,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
  },
  emptyActionText: { fontSize: 14, fontWeight: '700' },

  // Challenge card
  challengeCard: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: 12,
  },
  cardGradient: { padding: 14, gap: 8 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },

  typeChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
  },
  typeChipText: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 },

  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
  },
  statusPillText: { fontSize: 10, fontWeight: '800' },

  cardTitle: { fontSize: 16, fontWeight: '800', lineHeight: 22 },
  cardDesc: { fontSize: 13, lineHeight: 18 },

  cardMeta: { flexDirection: 'row', gap: 12, marginTop: 4 },
  metaItem: { fontSize: 13, fontWeight: '600' },

  actionRow: { flexDirection: 'row', gap: 8, marginTop: 4 },
  actionBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1.5,
  },
  acceptBtn: { backgroundColor: '#22c55e33', borderColor: '#22c55e' },
  acceptBtnText: { color: '#22c55e', fontWeight: '800', fontSize: 14 },
  rejectBtn: { backgroundColor: '#ef444433', borderColor: '#ef4444' },
  rejectBtnText: { color: '#ef4444', fontWeight: '800', fontSize: 14 },

  completeBtn: {
    marginTop: 4,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    backgroundColor: '#3b82f633',
    borderWidth: 1.5,
    borderColor: '#3b82f6',
  },
  completeBtnText: { color: '#3b82f6', fontWeight: '800', fontSize: 14 },

  // FAB
  fab: {
    position: 'absolute',
    bottom: 28,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  fabIcon: { fontSize: 28, color: '#fff', fontWeight: '300', lineHeight: 32 },

  // Toast
  toast: {
    position: 'absolute',
    top: 0,
    alignSelf: 'center',
    zIndex: 999,
    backgroundColor: '#FFD700',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 24,
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 10,
  },
  toastText: { color: '#000', fontWeight: '800', fontSize: 15 },

  // Modal
  modalWrapper: { flex: 1 },
  modalHandle: { width: 36, height: 4, borderRadius: 2, alignSelf: 'center', marginTop: 12 },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  modalTitle: { fontSize: 18, fontWeight: '800' },
  modalClose: { fontSize: 18 },
  modalBody: { padding: 20, gap: 6, paddingBottom: 40 },

  fieldLabel: { fontSize: 13, fontWeight: '600', marginTop: 12, marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
  },
  inputMultiline: { height: 90, paddingTop: 12 },

  typeRow: { flexDirection: 'row', gap: 10 },
  typeBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
  },
  typeBtnText: { fontSize: 14, fontWeight: '700' },

  xpRow: { flexDirection: 'row', gap: 8 },
  xpBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
  },
  xpBtnText: { fontSize: 13, fontWeight: '700' },

  submitBtn: {
    marginTop: 20,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: 'center',
  },
  submitBtnText: { fontSize: 16, fontWeight: '800' },
});
