import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, StatusBar, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { AdminTopBar } from '@/components/admin/AdminTopBar';
import { useTheme } from '@/hooks/useTheme';
import { useAuthStore } from '@/store/auth.store';
import { useTenantStore } from '@/store/tenant.store';

// ─── Info row ─────────────────────────────────────────────────
function InfoRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  const T = useTheme();
  return (
    <View style={[styles.infoRow, { borderBottomColor: T.border }]}>
      <View style={[styles.infoIcon, { backgroundColor: T.accentGlow }]}>
        <Text style={{ fontSize: 15 }}>{icon}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.infoLabel, { color: T.textMuted }]}>{label}</Text>
        <Text style={[styles.infoValue, { color: T.text }]}>{value}</Text>
      </View>
    </View>
  );
}

// ─── Nav row ──────────────────────────────────────────────────
function NavRow({ icon, label, onPress }: { icon: string; label: string; onPress: () => void }) {
  const T = useTheme();
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7} style={[styles.navRow, { borderBottomColor: T.border }]}>
      <View style={[styles.infoIcon, { backgroundColor: T.accentGlow }]}>
        <Text style={{ fontSize: 15 }}>{icon}</Text>
      </View>
      <Text style={[styles.navLabel, { color: T.text }]}>{label}</Text>
      <View style={{ flex: 1 }} />
      <Text style={[styles.navArrow, { color: T.textMuted }]}>›</Text>
    </TouchableOpacity>
  );
}

// ─── Main screen ──────────────────────────────────────────────
export default function AdminProfileScreen() {
  const T = useTheme();
  const router = useRouter();
  const { t } = useTranslation();
  const { user, signOut } = useAuthStore();
  const { tenant } = useTenantStore();

  const fullName = user?.full_name ?? t('admin.settings.adminFallbackName');
  const email    = (user as any)?.email ?? '';
  const initials = fullName.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase();

  const handleSignOut = () => {
    Alert.alert(t('client.profile.signOutTitle'), t('client.profile.signOutConfirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('client.profile.signOutAction'), style: 'destructive', onPress: signOut },
    ]);
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: T.bg }]} edges={['left', 'right']}>
      <StatusBar barStyle="light-content" backgroundColor={T.bg} />
      <AdminTopBar title={t('admin.profile.title')} />

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>

        {/* Avatar + name */}
        <View style={styles.avatarSection}>
          <View style={[styles.avatar, { backgroundColor: T.accentGlow }]}>
            <Text style={[styles.avatarText, { color: T.accent }]}>{initials}</Text>
          </View>
          <Text style={[styles.userName, { color: T.text }]}>{fullName}</Text>
          {email.length > 0 && (
            <Text style={[styles.userEmail, { color: T.textSecondary }]}>{email}</Text>
          )}
          <View style={[styles.roleBadge, { backgroundColor: T.accentGlow }]}>
            <Text style={[styles.roleText, { color: T.accent }]}>{t('admin.profile.adminBadge')}</Text>
          </View>
        </View>

        {/* Info section */}
        <Text style={[styles.sectionTitle, { color: T.textMuted }]}>{t('admin.profile.infoSection')}</Text>
        <View style={[styles.section, { backgroundColor: T.bgCard, borderColor: T.border }]}>
          <InfoRow icon="👤" label={t('admin.profile.nameLabel')} value={fullName} />
          <InfoRow icon="✉️" label={t('admin.profile.emailLabel')} value={email || '—'} />
          <InfoRow icon="🏢" label={t('admin.profile.tenantLabel')} value={tenant?.name ?? '—'} />
        </View>

        {/* Navigation section */}
        <Text style={[styles.sectionTitle, { color: T.textMuted }]}>{t('admin.profile.optionsSection')}</Text>
        <View style={[styles.section, { backgroundColor: T.bgCard, borderColor: T.border }]}>
          <NavRow icon="⚙️" label={t('navigation.settings')} onPress={() => router.push('/(admin)/settings')} />
        </View>

        {/* Sign out */}
        <TouchableOpacity onPress={handleSignOut} style={[styles.signOutBtn, { borderColor: T.red + '55', backgroundColor: T.red + '11' }]}>
          <Text style={[styles.signOutText, { color: T.red }]}>{t('client.profile.signOut')}</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  avatarSection: { alignItems: 'center', paddingVertical: 24, gap: 6, marginBottom: 8 },
  avatar: { width: 84, height: 84, borderRadius: 26, justifyContent: 'center', alignItems: 'center', marginBottom: 4 },
  avatarText: { fontSize: 30, fontWeight: '800' },
  userName: { fontSize: 20, fontWeight: '800' },
  userEmail: { fontSize: 13 },
  roleBadge: { borderRadius: 6, paddingHorizontal: 10, paddingVertical: 3, marginTop: 2 },
  roleText: { fontSize: 11, fontWeight: '800', letterSpacing: 0.8 },
  sectionTitle: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8, marginLeft: 2 },
  section: { borderRadius: 16, borderWidth: 1, overflow: 'hidden', marginBottom: 20 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 13, paddingHorizontal: 14, borderBottomWidth: StyleSheet.hairlineWidth },
  infoIcon: { width: 34, height: 34, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  infoLabel: { fontSize: 10, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 },
  infoValue: { fontSize: 14, fontWeight: '500' },
  navRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 13, paddingHorizontal: 14, borderBottomWidth: StyleSheet.hairlineWidth },
  navLabel: { fontSize: 15, fontWeight: '500' },
  navArrow: { fontSize: 20 },
  signOutBtn: { borderRadius: 14, borderWidth: 1, paddingVertical: 15, alignItems: 'center' },
  signOutText: { fontSize: 15, fontWeight: '700' },
});
