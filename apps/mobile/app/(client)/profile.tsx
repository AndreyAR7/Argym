import React, { useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, StatusBar, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTheme } from '@/hooks/useTheme';
import { useAuthStore } from '@/store/auth.store';
import { useProfileStore } from '@/store/profile.store';
import { ClientTopBar } from '@/components/client/ClientTopBar';
import { AvatarUploader } from '@/components/shared/AvatarUploader';
import { ThemeSelector } from '@/components/shared/ThemeSelector';
import { MOCK_SUBSCRIPTION, MOCK_USER } from '@/data/clientMock';

function SettingRow({ icon, label, value, onPress, danger }: {
  icon: string; label: string; value?: string; onPress?: () => void; danger?: boolean;
}) {
  const T = useTheme();
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7} style={styles.settingRow}>
      <View style={[styles.settingIcon, { backgroundColor: danger ? T.redSoft : T.accentGlow }]}>
        <Text style={{ fontSize: 16 }}>{icon}</Text>
      </View>
      <Text style={[styles.settingLabel, { color: danger ? T.red : T.text }]}>{label}</Text>
      <View style={{ flex: 1 }} />
      {value && <Text style={[styles.settingValue, { color: T.textMuted }]}>{value}</Text>}
      {!danger && <Text style={[styles.settingArrow, { color: T.textMuted }]}>›</Text>}
    </TouchableOpacity>
  );
}

export default function ProfileScreen() {
  const T = useTheme();
  const router = useRouter();
  const { user, signOut } = useAuthStore();
  const { loadProfile } = useProfileStore();
  const name = user?.full_name ?? MOCK_USER.full_name;

  useEffect(() => { loadProfile(); }, []);

  const handleSignOut = () => {
    Alert.alert('Cerrar sesión', '¿Estás seguro de que deseas salir?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Salir', style: 'destructive', onPress: signOut },
    ]);
  };

  const nextBilling = new Date(MOCK_SUBSCRIPTION.next_billing).toLocaleDateString('es-CR', { day: 'numeric', month: 'long' });

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: T.bg }]} edges={['left', 'right']}>
      <StatusBar barStyle="light-content" backgroundColor={T.bg} />
      <ClientTopBar title="Mi Perfil" />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={[styles.markerBanner, { backgroundColor: T.accent + '20', borderColor: T.accent + '44' }]}>
          <Text style={[styles.markerText, { color: T.accent }]}>✅ PROFILE PERSONALIZATION WORKING</Text>
        </View>

        <View style={styles.avatarSection}>
          <AvatarUploader name={name} size={96} accentColor={T.accent} bgColor={T.bg} textColor={T.text} cardBg={T.bgCard} borderColor={T.border} textSecondary={T.textSecondary} textMuted={T.textMuted} errorColor={T.red} />
          <Text style={[styles.userName, { color: T.text }]}>{name}</Text>
          <Text style={[styles.userSub, { color: T.textMuted }]}>{user?.id ? 'Usuario activo' : 'Demo'}</Text>
          <View style={[styles.streakBadge, { backgroundColor: T.orangeSoft }]}>
            <Text style={[styles.streakText, { color: T.orange }]}>🔥 {MOCK_USER.streak} días de racha</Text>
          </View>
        </View>

        <View style={[styles.subCard, { backgroundColor: T.bgCard, borderColor: T.accent + '33', borderRadius: T.radiusLg, ...T.shadowCard }]}>
          <View style={styles.subTop}>
            <View>
              <Text style={[styles.subLabel, { color: T.textMuted }]}>Plan actual</Text>
              <Text style={[styles.subName, { color: T.text }]}>{MOCK_SUBSCRIPTION.plan_name}</Text>
            </View>
            <View style={[styles.subBadge, { backgroundColor: T.greenSoft }]}>
              <Text style={[styles.subBadgeText, { color: T.green }]}>● Activo</Text>
            </View>
          </View>
          <View style={styles.subDetails}>
            <View style={styles.subDetailItem}>
              <Text style={[styles.subDetailLabel, { color: T.textMuted }]}>Precio</Text>
              <Text style={[styles.subDetailValue, { color: T.text }]}>
                {MOCK_SUBSCRIPTION.currency} {MOCK_SUBSCRIPTION.price.toLocaleString()}
                <Text style={[styles.subDetailSub, { color: T.textMuted }]}>/{MOCK_SUBSCRIPTION.billing_cycle === 'monthly' ? 'mes' : 'año'}</Text>
              </Text>
            </View>
            <View style={styles.subDetailItem}>
              <Text style={[styles.subDetailLabel, { color: T.textMuted }]}>Próximo cobro</Text>
              <Text style={[styles.subDetailValue, { color: T.text }]}>{nextBilling}</Text>
            </View>
          </View>
          <TouchableOpacity onPress={() => router.push('/(client)/plans')} style={[styles.subBtn, { backgroundColor: T.accentGlow, borderRadius: T.radiusMd }]}>
            <Text style={[styles.subBtnText, { color: T.accent }]}>Ver planes disponibles →</Text>
          </TouchableOpacity>
        </View>

        <View style={[styles.section, { backgroundColor: T.bgCard, borderColor: T.border, borderRadius: T.radiusMd }]}>
          <ThemeSelector accentColor={T.accent} textColor={T.text} textSecondary={T.textSecondary} textMuted={T.textMuted} cardBg={T.bgCard} borderColor={T.border} />
        </View>

        <View style={styles.settingsSection}>
          <Text style={[styles.sectionTitle, { color: T.textMuted }]}>Mi cuenta</Text>
          <View style={[styles.settingsCard, { backgroundColor: T.bgCard, borderColor: T.border, borderRadius: T.radiusMd }]}>
            <SettingRow icon="👤" label="Información personal" onPress={() => {}} />
            <View style={[styles.divider, { backgroundColor: T.border }]} />
            <SettingRow icon="🔒" label="Cambiar contraseña" onPress={() => {}} />
            <View style={[styles.divider, { backgroundColor: T.border }]} />
            <SettingRow icon="🔔" label="Notificaciones" onPress={() => {}} />
          </View>
        </View>

        <View style={styles.settingsSection}>
          <Text style={[styles.sectionTitle, { color: T.textMuted }]}>Soporte</Text>
          <View style={[styles.settingsCard, { backgroundColor: T.bgCard, borderColor: T.border, borderRadius: T.radiusMd }]}>
            <SettingRow icon="❓" label="Ayuda y soporte" onPress={() => {}} />
            <View style={[styles.divider, { backgroundColor: T.border }]} />
            <SettingRow icon="📋" label="Términos y privacidad" onPress={() => {}} />
          </View>
        </View>

        <View style={styles.settingsSection}>
          <View style={[styles.settingsCard, { backgroundColor: T.bgCard, borderColor: T.border, borderRadius: T.radiusMd }]}>
            <SettingRow icon="🚪" label="Cerrar sesión" onPress={handleSignOut} danger />
          </View>
        </View>

        <Text style={[styles.version, { color: T.textMuted }]}>v1.0.0 · SaaS Client Management</Text>
        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { padding: 16 },
  markerBanner: { borderRadius: 10, borderWidth: 1, paddingVertical: 8, alignItems: 'center', marginBottom: 20 },
  markerText: { fontWeight: '800', fontSize: 12, letterSpacing: 0.5 },
  avatarSection: { alignItems: 'center', paddingVertical: 20, marginBottom: 20, gap: 8 },
  userName: { fontSize: 22, fontWeight: '800' },
  userSub: { fontSize: 13 },
  streakBadge: { borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6 },
  streakText: { fontSize: 13, fontWeight: '700' },
  subCard: { borderWidth: 1, padding: 16, marginBottom: 20 },
  subTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 },
  subLabel: { fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 },
  subName: { fontSize: 20, fontWeight: '800' },
  subBadge: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  subBadgeText: { fontSize: 12, fontWeight: '700' },
  subDetails: { flexDirection: 'row', gap: 16, marginBottom: 14 },
  subDetailItem: { flex: 1 },
  subDetailLabel: { fontSize: 11, marginBottom: 2 },
  subDetailValue: { fontSize: 15, fontWeight: '700' },
  subDetailSub: { fontSize: 12, fontWeight: '400' },
  subBtn: { paddingVertical: 10, alignItems: 'center' },
  subBtnText: { fontWeight: '700', fontSize: 14 },
  section: { borderWidth: 1, padding: 16, marginBottom: 20 },
  settingsSection: { marginBottom: 14 },
  sectionTitle: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8, marginLeft: 2 },
  settingsCard: { borderWidth: 1, overflow: 'hidden' },
  settingRow: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },
  settingIcon: { width: 34, height: 34, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  settingLabel: { fontSize: 15, fontWeight: '500' },
  settingValue: { fontSize: 13, marginRight: 6 },
  settingArrow: { fontSize: 20 },
  divider: { height: 1, marginLeft: 60 },
  version: { textAlign: 'center', fontSize: 12, marginTop: 8 },
});
