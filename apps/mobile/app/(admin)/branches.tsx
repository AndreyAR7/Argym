import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, StatusBar, Alert, RefreshControl, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { AdminTopBar } from '@/components/admin/AdminTopBar';
import { useTheme } from '@/hooks/useTheme';
import { useAuthStore } from '@/store/auth.store';
import { useTenantStore } from '@/store/tenant.store';
import { useBranches, type BranchWithStats } from '@/hooks/useBranches';

// ─── Branch card ──────────────────────────────────────────────
function BranchCard({ branch }: { branch: BranchWithStats }) {
  const T = useTheme();
  const { t } = useTranslation();
  return (
    <View style={[styles.card, { backgroundColor: T.bgCard, borderColor: T.border }]}>
      <View style={styles.cardHeader}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.cardName, { color: T.text }]}>{branch.name}</Text>
          {branch.address && (
            <Text style={[styles.cardAddress, { color: T.textSecondary }]}>{branch.address}</Text>
          )}
          {branch.phone && (
            <Text style={[styles.cardPhone, { color: T.textMuted }]}>{branch.phone}</Text>
          )}
          <Text style={[styles.cardPhone, { color: T.textMuted }]}>
            {branch.client_count === 1
              ? t('admin.branches.clientCountOne', { count: branch.client_count })
              : t('admin.branches.clientCountOther', { count: branch.client_count })}
            {' · '}
            {branch.coach_count === 1
              ? t('admin.branches.coachCountOne', { count: branch.coach_count })
              : t('admin.branches.coachCountOther', { count: branch.coach_count })}
          </Text>
        </View>
        <View style={[styles.badge, { backgroundColor: branch.is_active ? T.green + '22' : T.red + '22' }]}>
          <Text style={[styles.badgeText, { color: branch.is_active ? T.green : T.red }]}>
            {branch.is_active ? t('admin.branches.statusActive') : t('admin.branches.statusInactive')}
          </Text>
        </View>
      </View>
      <View style={[styles.divider, { backgroundColor: T.border }]} />
      <TouchableOpacity
        onPress={() => Alert.alert(t('admin.branches.viewQr'), t('admin.branches.viewQrMessage'))}
        style={[styles.qrBtn, { borderColor: T.accent + '55' }]}
      >
        <Text style={{ fontSize: 13, color: T.accent, fontWeight: '700' }}>{t('admin.branches.viewQr')}</Text>
      </TouchableOpacity>
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────
export default function AdminBranchesScreen() {
  const T = useTheme();
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const { tenant } = useTenantStore();
  const { data: branches = [], isLoading, isRefetching, refetch } = useBranches(user?.tenant_id);

  const handleRefresh = async () => {
    await refetch();
  };

  const handleAdd = () => {
    Alert.alert(t('admin.branches.addBranchTitle'), t('admin.branches.addBranchMessage'), [{ text: t('admin.branches.understood') }]);
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: T.bg }]} edges={['left', 'right']}>
      <StatusBar barStyle="light-content" backgroundColor={T.bg} />
      <AdminTopBar title={t('admin.branches.title')} subtitle={tenant?.name ?? undefined} />

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={handleRefresh} tintColor={T.accent} />}
      >
        {/* Section header */}
        <View style={styles.sectionRow}>
          <Text style={[styles.sectionTitle, { color: T.textMuted }]}>{t('admin.branches.myBranches')}</Text>
          <View style={[styles.sectionLine, { backgroundColor: T.border }]} />
          <Text style={[styles.sectionCount, { color: T.textMuted }]}>
            {branches.length === 1
              ? t('admin.branches.branchCountOne', { count: branches.length })
              : t('admin.branches.branchCountOther', { count: branches.length })}
          </Text>
        </View>

        {isLoading ? (
          <View style={styles.empty}>
            <ActivityIndicator color={T.accent} />
          </View>
        ) : branches.length === 0 ? (
          <View style={styles.empty}>
            <Text style={{ fontSize: 36, marginBottom: 8 }}>🏢</Text>
            <Text style={[styles.emptyText, { color: T.textMuted }]}>{t('admin.branches.noBranches')}</Text>
            <Text style={[styles.emptySubText, { color: T.textMuted }]}>{t('admin.branches.noBranchesHint')}</Text>
          </View>
        ) : (
          branches.map((branch) => <BranchCard key={branch.id} branch={branch} />)
        )}
      </ScrollView>

      {/* Floating add button */}
      <TouchableOpacity onPress={handleAdd} style={[styles.fab, { backgroundColor: T.accent }]}>
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  sectionRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  sectionTitle: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8 },
  sectionLine: { flex: 1, height: 1 },
  sectionCount: { fontSize: 11 },
  card: { borderRadius: 16, borderWidth: 1, padding: 16, marginBottom: 12 },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  cardName: { fontSize: 16, fontWeight: '700', marginBottom: 3 },
  cardAddress: { fontSize: 13, marginBottom: 2 },
  cardPhone: { fontSize: 12 },
  badge: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, alignSelf: 'flex-start' },
  badgeText: { fontSize: 11, fontWeight: '700' },
  divider: { height: 1, marginVertical: 12 },
  qrBtn: { borderRadius: 10, borderWidth: 1, paddingVertical: 8, alignItems: 'center' },
  empty: { alignItems: 'center', paddingVertical: 48 },
  emptyText: { fontSize: 15, fontWeight: '600', marginBottom: 6 },
  emptySubText: { fontSize: 13, textAlign: 'center' },
  fab: {
    position: 'absolute', bottom: 28, right: 20,
    width: 56, height: 56, borderRadius: 18,
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 8,
  },
  fabText: { color: '#fff', fontSize: 28, fontWeight: '300', lineHeight: 32 },
});
