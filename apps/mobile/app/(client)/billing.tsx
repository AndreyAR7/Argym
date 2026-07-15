import React from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  StatusBar, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ClientTopBar } from '@/components/client/ClientTopBar';
import { useTheme } from '@/hooks/useTheme';
import { useAuthStore } from '@/store/auth.store';
import { useProfileStore } from '@/store/profile.store';

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '--';
  return new Date(iso).toLocaleDateString('es-CR', {
    day: '2-digit', month: 'long', year: 'numeric',
  });
}

const PLACEHOLDER_HISTORY = [
  { date: '--', amount: '--' },
  { date: '--', amount: '--' },
  { date: '--', amount: '--' },
];

export default function BillingScreen() {
  const T = useTheme();
  const router = useRouter();
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const { } = useProfileStore(); // keep import active

  // Plan fields may be extended on the profile by the backend
  const planName: string | null = (user as any)?.plan_name ?? null;
  const planExpiresAt: string | null = (user as any)?.plan_expires_at ?? null;
  const planStatus: string = (user as any)?.plan_status ?? (planName ? 'active' : 'inactive');

  const isActive = planStatus === 'active';

  const handleManage = () => {
    Alert.alert(
      t('client.billing.manageSubscription'),
      t('client.billing.manageAlertMessage'),
      [{ text: t('client.billing.manageAlertConfirm'), style: 'default' }],
    );
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: T.bg }]} edges={['left', 'right']}>
      <StatusBar barStyle="light-content" backgroundColor={T.bg} />
      <ClientTopBar title={t('client.billing.title')} />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* Current plan */}
        {planName ? (
          <View style={[styles.planCard, { backgroundColor: T.bgCard, borderColor: T.accent + '44' }]}>
            <View style={styles.planTop}>
              <View>
                <Text style={[styles.planLabel, { color: T.textMuted }]}>{t('client.billing.currentPlan')}</Text>
                <Text style={[styles.planName, { color: T.text }]}>{planName}</Text>
              </View>
              <View style={[styles.statusBadge, { backgroundColor: isActive ? T.greenSoft : T.redSoft }]}>
                <Text style={[styles.statusText, { color: isActive ? T.green : T.red }]}>
                  {isActive ? `● ${t('common.active')}` : `● ${t('common.inactive')}`}
                </Text>
              </View>
            </View>

            {planExpiresAt && (
              <View style={[styles.expiryRow, { borderTopColor: T.border }]}>
                <Text style={[styles.expiryLabel, { color: T.textMuted }]}>{t('client.billing.nextPayment')}</Text>
                <Text style={[styles.expiryDate, { color: T.text }]}>{formatDate(planExpiresAt)}</Text>
              </View>
            )}

            <TouchableOpacity
              onPress={handleManage}
              style={[styles.manageBtn, { backgroundColor: T.accentGlow }]}
            >
              <Text style={[styles.manageBtnText, { color: T.accent }]}>{t('client.billing.manageSubscription')}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={[styles.noPlanCard, { backgroundColor: T.bgCard, borderColor: T.border }]}>
            <Text style={styles.noPlanEmoji}>📋</Text>
            <Text style={[styles.noPlanTitle, { color: T.text }]}>{t('client.billing.noPlanTitle')}</Text>
            <Text style={[styles.noPlanDesc, { color: T.textMuted }]}>
              {t('client.billing.noPlanDesc')}
            </Text>
            <TouchableOpacity
              onPress={() => router.push('/(client)/plans' as any)}
              style={[styles.plansBtn, { backgroundColor: T.accent }]}
            >
              <Text style={styles.plansBtnText}>{t('client.billing.viewPlans')}</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Payment history */}
        <Text style={[styles.sectionLabel, { color: T.textMuted }]}>{t('client.billing.paymentHistory')}</Text>

        <View style={[styles.historyCard, { backgroundColor: T.bgCard, borderColor: T.border }]}>
          {PLACEHOLDER_HISTORY.map((row, i) => (
            <View
              key={i}
              style={[
                styles.historyRow,
                i < PLACEHOLDER_HISTORY.length - 1 && {
                  borderBottomWidth: StyleSheet.hairlineWidth,
                  borderBottomColor: T.border,
                },
              ]}
            >
              <View>
                <Text style={[styles.historyRowLabel, { color: T.textMuted }]}>{t('client.billing.previousPayment')}</Text>
                <Text style={[styles.historyRowDate, { color: T.textMuted }]}>{row.date}</Text>
              </View>
              <Text style={[styles.historyRowAmount, { color: T.textMuted }]}>{row.amount}</Text>
            </View>
          ))}

          <View style={[styles.historyFooter, { borderTopColor: T.border }]}>
            <Text style={[styles.historyFooterText, { color: T.textMuted }]}>
              {t('client.billing.historyFooter')}
            </Text>
          </View>
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { padding: 16 },

  // Plan card
  planCard: { borderRadius: 16, borderWidth: 1, padding: 16, marginBottom: 24 },
  planTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 },
  planLabel: { fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 },
  planName: { fontSize: 22, fontWeight: '800' },
  statusBadge: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  statusText: { fontSize: 12, fontWeight: '700' },
  expiryRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 12, marginBottom: 14,
  },
  expiryLabel: { fontSize: 13 },
  expiryDate: { fontSize: 13, fontWeight: '600' },
  manageBtn: { borderRadius: 12, paddingVertical: 11, alignItems: 'center' },
  manageBtnText: { fontSize: 14, fontWeight: '700' },

  // No-plan card
  noPlanCard: {
    borderRadius: 16, borderWidth: 1, padding: 24,
    alignItems: 'center', gap: 8, marginBottom: 24,
  },
  noPlanEmoji: { fontSize: 40, marginBottom: 4 },
  noPlanTitle: { fontSize: 18, fontWeight: '800' },
  noPlanDesc: { fontSize: 13, textAlign: 'center', lineHeight: 19 },
  plansBtn: { marginTop: 8, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 28 },
  plansBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },

  // Section label
  sectionLabel: {
    fontSize: 11, fontWeight: '700', textTransform: 'uppercase',
    letterSpacing: 0.8, marginBottom: 10, marginLeft: 2,
  },

  // History
  historyCard: { borderRadius: 14, borderWidth: 1, overflow: 'hidden', marginBottom: 16 },
  historyRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14,
  },
  historyRowLabel: { fontSize: 13, fontWeight: '500', marginBottom: 2 },
  historyRowDate: { fontSize: 11 },
  historyRowAmount: { fontSize: 14, fontWeight: '600' },
  historyFooter: {
    borderTopWidth: StyleSheet.hairlineWidth, paddingHorizontal: 16,
    paddingVertical: 12,
  },
  historyFooterText: { fontSize: 12, textAlign: 'center' },
});
