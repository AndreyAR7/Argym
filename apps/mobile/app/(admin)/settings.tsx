import React, { useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, StatusBar, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/hooks/useTheme';
import { AdminTopBar } from '@/components/admin/AdminTopBar';
import { AvatarUploader } from '@/components/shared/AvatarUploader';
import { ThemeSelector } from '@/components/shared/ThemeSelector';
import { useAuthStore } from '@/store/auth.store';
import { useTenantStore } from '@/store/tenant.store';
import { useProfileStore } from '@/store/profile.store';

function SettingRow({ icon, label, value, onPress, danger }: {
  icon: string; label: string; value?: string; onPress?: () => void; danger?: boolean;
}) {
  const T = useTheme();
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7} style={styles.row}>
      <View style={[styles.rowIcon, { backgroundColor: danger ? T.redSoft : T.accentGlow }]}>
        <Text style={{ fontSize: 16 }}>{icon}</Text>
      </View>
      <Text style={[styles.rowLabel, { color: danger ? T.red : T.text }]}>{label}</Text>
      <View style={{ flex: 1 }} />
      {value && <Text style={[styles.rowValue, { color: T.textMuted }]}>{value}</Text>}
      {!danger && <Text style={[styles.rowArrow, { color: T.textMuted }]}>›</Text>}
    </TouchableOpacity>
  );
}

export default function AdminSettingsScreen() {
  const T = useTheme();
  const { user, signOut } = useAuthStore();
  const { tenant } = useTenantStore();
  const { loadProfile } = useProfileStore();
  const name = user?.full_name ?? 'Administrador';

  useEffect(() => { loadProfile(); }, []);

  const handleSignOut = () => {
    Alert.alert('Cerrar sesión', '¿Estás seguro?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Salir', style: 'destructive', onPress: signOut },
    ]);
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: T.bg }]} edges={['left', 'right']}>
      <StatusBar barStyle="light-content" backgroundColor={T.bg} />
      <AdminTopBar title="Configuración" />
      <ScrollView contentContainerStyle={{ padding: 16 }} showsVerticalScrollIndicator={false}>
        <View style={styles.avatarSection}>
          <AvatarUploader name={name} size={88} accentColor={T.accent} bgColor={T.bg} textColor={T.text} cardBg={T.bgCard} borderColor={T.border} textSecondary={T.textSecondary} textMuted={T.textMuted} errorColor={T.red} />
          <Text style={[styles.adminName, { color: T.text }]}>{name}</Text>
          <View style={[styles.roleBadge, { backgroundColor: T.accentGlow }]}>
            <Text style={[styles.roleText, { color: T.accent }]}>ADMINISTRADOR</Text>
          </View>
        </View>

        <View style={[styles.tenantCard, { backgroundColor: T.bgCard, borderColor: T.border, borderRadius: T.radiusMd }]}>
          <Text style={[styles.tenantLabel, { color: T.textMuted }]}>Negocio</Text>
          <Text style={[styles.tenantName, { color: T.text }]}>{tenant?.name ?? 'Centro Demo'}</Text>
          <Text style={[styles.tenantMeta, { color: T.textSecondary }]}>{tenant?.locale ?? 'es-CR'} · {tenant?.currency ?? 'CRC'}</Text>
        </View>

        <View style={[styles.themeCard, { backgroundColor: T.bgCard, borderColor: T.border, borderRadius: T.radiusMd }]}>
          <ThemeSelector accentColor={T.accent} textColor={T.text} textSecondary={T.textSecondary} textMuted={T.textMuted} cardBg={T.bgCard} borderColor={T.border} />
        </View>

        <Text style={[styles.sectionTitle, { color: T.textMuted }]}>Cuenta</Text>
        <View style={[styles.section, { backgroundColor: T.bgCard, borderColor: T.border, borderRadius: T.radiusMd }]}>
          <SettingRow icon="👤" label="Perfil de administrador" onPress={() => {}} />
          <View style={[styles.divider, { backgroundColor: T.border }]} />
          <SettingRow icon="🔒" label="Cambiar contraseña" onPress={() => {}} />
          <View style={[styles.divider, { backgroundColor: T.border }]} />
          <SettingRow icon="🔔" label="Notificaciones" onPress={() => {}} />
        </View>

        <Text style={[styles.sectionTitle, { color: T.textMuted }]}>Negocio</Text>
        <View style={[styles.section, { backgroundColor: T.bgCard, borderColor: T.border, borderRadius: T.radiusMd }]}>
          <SettingRow icon="🏢" label="Configuración del negocio" onPress={() => {}} />
          <View style={[styles.divider, { backgroundColor: T.border }]} />
          <SettingRow icon="👥" label="Gestión de usuarios" onPress={() => {}} />
          <View style={[styles.divider, { backgroundColor: T.border }]} />
          <SettingRow icon="🔑" label="Roles y permisos" onPress={() => {}} />
          <View style={[styles.divider, { backgroundColor: T.border }]} />
          <SettingRow icon="🧩" label="Módulos activos" onPress={() => {}} />
        </View>

        <Text style={[styles.sectionTitle, { color: T.textMuted }]}>Sistema</Text>
        <View style={[styles.section, { backgroundColor: T.bgCard, borderColor: T.border, borderRadius: T.radiusMd }]}>
          <SettingRow icon="🌐" label="Idioma" value="Español" onPress={() => {}} />
          <View style={[styles.divider, { backgroundColor: T.border }]} />
          <SettingRow icon="💱" label="Moneda" value={tenant?.currency ?? 'CRC'} onPress={() => {}} />
          <View style={[styles.divider, { backgroundColor: T.border }]} />
          <SettingRow icon="❓" label="Soporte" onPress={() => {}} />
        </View>

        <View style={[styles.section, { backgroundColor: T.bgCard, borderColor: T.border, borderRadius: T.radiusMd }]}>
          <SettingRow icon="🚪" label="Cerrar sesión" onPress={handleSignOut} danger />
        </View>

        <Text style={[styles.version, { color: T.textMuted }]}>v1.0.0 · SaaS Client Management Platform</Text>
        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  avatarSection: { alignItems: 'center', paddingVertical: 20, marginBottom: 16, gap: 8 },
  adminName: { fontSize: 20, fontWeight: '800' },
  roleBadge: { borderRadius: 6, paddingHorizontal: 10, paddingVertical: 3 },
  roleText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.8 },
  tenantCard: { borderWidth: 1, padding: 14, marginBottom: 16 },
  tenantLabel: { fontSize: 10, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  tenantName: { fontSize: 18, fontWeight: '700' },
  tenantMeta: { fontSize: 12, marginTop: 2 },
  themeCard: { borderWidth: 1, padding: 16, marginBottom: 20 },
  sectionTitle: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8, marginLeft: 2 },
  section: { borderWidth: 1, overflow: 'hidden', marginBottom: 16 },
  row: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },
  rowIcon: { width: 34, height: 34, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  rowLabel: { fontSize: 15, fontWeight: '500' },
  rowValue: { fontSize: 13, marginRight: 6 },
  rowArrow: { fontSize: 20 },
  divider: { height: 1, marginLeft: 60 },
  version: { textAlign: 'center', fontSize: 12, marginTop: 8 },
});
