import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, StatusBar,
  Alert, Modal, TextInput, KeyboardAvoidingView, Platform, Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/hooks/useTheme';
import { AdminTopBar } from '@/components/admin/AdminTopBar';
import { AvatarUploader } from '@/components/shared/AvatarUploader';
import { ThemeSelector } from '@/components/shared/ThemeSelector';
import { useAuthStore } from '@/store/auth.store';
import { useTenantStore } from '@/store/tenant.store';
import { useProfileStore } from '@/store/profile.store';
import { ToastManager } from '@/components/shared/Toast';
import { supabase } from '@/lib/supabase';

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

// ─── Personal Info Modal ──────────────────────────────────────
function PersonalInfoModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const T = useTheme();
  const { user } = useAuthStore();
  const [fullName, setFullName] = useState(user?.full_name ?? '');
  const [phone, setPhone] = useState((user as any)?.phone ?? '');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible) { setFullName(user?.full_name ?? ''); setPhone((user as any)?.phone ?? ''); }
  }, [visible]);

  const handleSave = async () => {
    if (!fullName.trim()) { Alert.alert('Error', 'El nombre es requerido.'); return; }
    setSaving(true);
    try {
      const { error } = await supabase.from('profiles')
        .update({ full_name: fullName.trim(), phone: phone.trim() || null })
        .eq('id', user!.id);
      if (error) throw error;
      useAuthStore.setState((s) => ({
        user: s.user ? { ...s.user, full_name: fullName.trim() } : s.user,
      }));
      ToastManager.show({ message: 'Perfil actualizado', type: 'success' });
      onClose();
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'No se pudo actualizar.');
    } finally { setSaving(false); }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <View style={styles.modalOverlay}>
          <View style={[styles.sheet, { backgroundColor: T.bgCard }]}>
            <View style={styles.handle} />
            <ScrollView keyboardShouldPersistTaps="handled">
              <Text style={[styles.sheetTitle, { color: T.text }]}>Información personal</Text>
              <Text style={[styles.label, { color: T.textSecondary }]}>Nombre completo</Text>
              <TextInput style={[styles.input, { backgroundColor: T.bg, borderColor: T.border, color: T.text }]}
                value={fullName} onChangeText={setFullName} placeholder="Tu nombre" placeholderTextColor={T.textMuted} />
              <Text style={[styles.label, { color: T.textSecondary }]}>Teléfono</Text>
              <TextInput style={[styles.input, { backgroundColor: T.bg, borderColor: T.border, color: T.text }]}
                value={phone} onChangeText={setPhone} placeholder="+506 8888-8888" placeholderTextColor={T.textMuted} keyboardType="phone-pad" />
              <View style={styles.modalActions}>
                <TouchableOpacity onPress={onClose} style={[styles.modalBtn, { borderColor: T.border, borderWidth: 1 }]}>
                  <Text style={{ color: T.text, fontWeight: '600' }}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleSave} disabled={saving} style={[styles.modalBtn, { backgroundColor: T.accent }]}>
                  <Text style={{ color: '#fff', fontWeight: '700' }}>{saving ? 'Guardando...' : 'Guardar'}</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Change Password Modal ────────────────────────────────────
function ChangePasswordModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const T = useTheme();
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [saving, setSaving] = useState(false);
  const reset = () => { setNext(''); setConfirm(''); };

  const handleSave = async () => {
    if (next.length < 6) { Alert.alert('Error', 'Mínimo 6 caracteres.'); return; }
    if (next !== confirm) { Alert.alert('Error', 'Las contraseñas no coinciden.'); return; }
    setSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: next });
      if (error) throw error;
      ToastManager.show({ message: 'Contraseña actualizada', type: 'success' });
      reset(); onClose();
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'No se pudo cambiar la contraseña.');
    } finally { setSaving(false); }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={() => { reset(); onClose(); }}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <View style={styles.modalOverlay}>
          <View style={[styles.sheet, { backgroundColor: T.bgCard }]}>
            <View style={styles.handle} />
            <ScrollView keyboardShouldPersistTaps="handled">
              <Text style={[styles.sheetTitle, { color: T.text }]}>Cambiar contraseña</Text>
              <Text style={[styles.label, { color: T.textSecondary }]}>Nueva contraseña</Text>
              <TextInput style={[styles.input, { backgroundColor: T.bg, borderColor: T.border, color: T.text }]}
                value={next} onChangeText={setNext} placeholder="Mínimo 6 caracteres" placeholderTextColor={T.textMuted} secureTextEntry />
              <Text style={[styles.label, { color: T.textSecondary }]}>Confirmar contraseña</Text>
              <TextInput style={[styles.input, { backgroundColor: T.bg, borderColor: T.border, color: T.text }]}
                value={confirm} onChangeText={setConfirm} placeholder="Repite la contraseña" placeholderTextColor={T.textMuted} secureTextEntry />
              <View style={styles.modalActions}>
                <TouchableOpacity onPress={() => { reset(); onClose(); }} style={[styles.modalBtn, { borderColor: T.border, borderWidth: 1 }]}>
                  <Text style={{ color: T.text, fontWeight: '600' }}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleSave} disabled={saving} style={[styles.modalBtn, { backgroundColor: T.accent }]}>
                  <Text style={{ color: '#fff', fontWeight: '700' }}>{saving ? 'Guardando...' : 'Actualizar'}</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Notifications Modal ──────────────────────────────────────
function NotificationsModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const T = useTheme();
  const [appts, setAppts] = useState(true);
  const [newClients, setNewClients] = useState(true);
  const [payments, setPayments] = useState(true);

  const Toggle = ({ value, onChange, label }: { value: boolean; onChange: (v: boolean) => void; label: string }) => (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: T.border }}>
      <Text style={{ color: T.text, fontSize: 15 }}>{label}</Text>
      <TouchableOpacity onPress={() => onChange(!value)}
        style={{ width: 44, height: 26, borderRadius: 13, backgroundColor: value ? T.accent : T.border, justifyContent: 'center', paddingHorizontal: 2 }}>
        <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: '#fff', alignSelf: value ? 'flex-end' : 'flex-start' }} />
      </TouchableOpacity>
    </View>
  );

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={[styles.sheet, { backgroundColor: T.bgCard }]}>
          <View style={styles.handle} />
          <Text style={[styles.sheetTitle, { color: T.text }]}>Notificaciones</Text>
          <Toggle value={appts} onChange={setAppts} label="Alertas de citas" />
          <Toggle value={newClients} onChange={setNewClients} label="Nuevos clientes" />
          <Toggle value={payments} onChange={setPayments} label="Pagos y suscripciones" />
          <TouchableOpacity onPress={() => { ToastManager.show({ message: 'Preferencias guardadas', type: 'success' }); onClose(); }}
            style={[styles.modalBtn, { backgroundColor: T.accent, marginTop: 20, alignSelf: 'stretch' }]}>
            <Text style={{ color: '#fff', fontWeight: '700' }}>Guardar</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// ─── Help Modal ───────────────────────────────────────────────
function HelpModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const T = useTheme();
  const items = [
    { icon: '📧', label: 'Enviar email de soporte', action: () => Linking.openURL('mailto:soporte@caro.gym') },
    { icon: '💬', label: 'Chat en vivo', action: () => Linking.openURL('https://wa.me/50688888888') },
    { icon: '📖', label: 'Documentación', action: () => Linking.openURL('https://docs.caro.gym') },
  ];
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={[styles.sheet, { backgroundColor: T.bgCard }]}>
          <View style={styles.handle} />
          <Text style={[styles.sheetTitle, { color: T.text }]}>Ayuda y soporte</Text>
          {items.map((item, i) => (
            <TouchableOpacity key={i} onPress={item.action}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: T.border }}>
              <View style={[styles.rowIcon, { backgroundColor: T.accentGlow }]}>
                <Text style={{ fontSize: 16 }}>{item.icon}</Text>
              </View>
              <Text style={{ color: T.text, fontSize: 15, flex: 1 }}>{item.label}</Text>
              <Text style={{ color: T.textMuted, fontSize: 18 }}>›</Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity onPress={onClose} style={[styles.modalBtn, { borderColor: T.border, borderWidth: 1, marginTop: 16, alignSelf: 'stretch' }]}>
            <Text style={{ color: T.text, fontWeight: '600' }}>Cerrar</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// ─── Terms Modal ──────────────────────────────────────────────
function TermsModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const T = useTheme();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={[styles.sheet, { backgroundColor: T.bgCard, maxHeight: '85%' }]}>
          <View style={styles.handle} />
          <Text style={[styles.sheetTitle, { color: T.text }]}>Términos y privacidad</Text>
          <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
            <Text style={[styles.termsSection, { color: T.accent }]}>Términos de uso</Text>
            <Text style={[styles.termsText, { color: T.textSecondary }]}>
              Al usar esta plataforma como administrador aceptas los términos de servicio y las responsabilidades asociadas a la gestión de datos de clientes.
            </Text>
            <Text style={[styles.termsSection, { color: T.accent }]}>Política de privacidad</Text>
            <Text style={[styles.termsText, { color: T.textSecondary }]}>
              Como administrador eres responsable del tratamiento de datos de tus clientes conforme a la legislación vigente. La plataforma provee las herramientas técnicas necesarias.
            </Text>
            <Text style={[styles.termsSection, { color: T.accent }]}>Datos que gestionas</Text>
            <Text style={[styles.termsText, { color: T.textSecondary }]}>
              • Perfiles de clientes y coaches{'\n'}
              • Historial de citas y pagos{'\n'}
              • Contenido multimedia subido{'\n'}
              • Configuración del negocio
            </Text>
            <View style={{ height: 16 }} />
          </ScrollView>
          <TouchableOpacity onPress={onClose} style={[styles.modalBtn, { backgroundColor: T.accent, marginTop: 12, alignSelf: 'stretch' }]}>
            <Text style={{ color: '#fff', fontWeight: '700' }}>Entendido</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// ─── Main Screen ──────────────────────────────────────────────
export default function AdminSettingsScreen() {
  const T = useTheme();
  const { user, signOut } = useAuthStore();
  const { tenant } = useTenantStore();
  const { loadProfile } = useProfileStore();
  const name = user?.full_name ?? 'Administrador';

  const [showPersonal, setShowPersonal] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showNotifs, setShowNotifs] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [showTerms, setShowTerms] = useState(false);

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

        {/* Avatar */}
        <View style={styles.avatarSection}>
          <AvatarUploader name={name} size={88} accentColor={T.accent} bgColor={T.bg} textColor={T.text}
            cardBg={T.bgCard} borderColor={T.border} textSecondary={T.textSecondary} textMuted={T.textMuted} errorColor={T.red} />
          <Text style={[styles.adminName, { color: T.text }]}>{name}</Text>
          <View style={[styles.roleBadge, { backgroundColor: T.accentGlow }]}>
            <Text style={[styles.roleText, { color: T.accent }]}>ADMINISTRADOR</Text>
          </View>
        </View>

        {/* Tenant card */}
        <View style={[styles.tenantCard, { backgroundColor: T.bgCard, borderColor: T.border, borderRadius: T.radiusMd }]}>
          <Text style={[styles.tenantLabel, { color: T.textMuted }]}>Negocio</Text>
          <Text style={[styles.tenantName, { color: T.text }]}>{tenant?.name ?? 'Mi Centro'}</Text>
          <Text style={[styles.tenantMeta, { color: T.textSecondary }]}>{tenant?.locale ?? 'es-CR'} · {tenant?.currency ?? 'CRC'}</Text>
        </View>

        {/* Theme */}
        <View style={[styles.themeCard, { backgroundColor: T.bgCard, borderColor: T.border, borderRadius: T.radiusMd }]}>
          <ThemeSelector accentColor={T.accent} textColor={T.text} textSecondary={T.textSecondary}
            textMuted={T.textMuted} cardBg={T.bgCard} borderColor={T.border} />
        </View>

        {/* Account */}
        <Text style={[styles.sectionTitle, { color: T.textMuted }]}>Cuenta</Text>
        <View style={[styles.section, { backgroundColor: T.bgCard, borderColor: T.border, borderRadius: T.radiusMd }]}>
          <SettingRow icon="👤" label="Información personal" onPress={() => setShowPersonal(true)} />
          <View style={[styles.divider, { backgroundColor: T.border }]} />
          <SettingRow icon="🔒" label="Cambiar contraseña" onPress={() => setShowPassword(true)} />
          <View style={[styles.divider, { backgroundColor: T.border }]} />
          <SettingRow icon="🔔" label="Notificaciones" onPress={() => setShowNotifs(true)} />
        </View>

        {/* Support */}
        <Text style={[styles.sectionTitle, { color: T.textMuted }]}>Soporte</Text>
        <View style={[styles.section, { backgroundColor: T.bgCard, borderColor: T.border, borderRadius: T.radiusMd }]}>
          <SettingRow icon="❓" label="Ayuda y soporte" onPress={() => setShowHelp(true)} />
          <View style={[styles.divider, { backgroundColor: T.border }]} />
          <SettingRow icon="📋" label="Términos y privacidad" onPress={() => setShowTerms(true)} />
        </View>

        {/* Sign out */}
        <View style={[styles.section, { backgroundColor: T.bgCard, borderColor: T.border, borderRadius: T.radiusMd }]}>
          <SettingRow icon="🚪" label="Cerrar sesión" onPress={handleSignOut} danger />
        </View>

        <Text style={[styles.version, { color: T.textMuted }]}>v1.0.0 · SaaS Client Management Platform</Text>
        <View style={{ height: 32 }} />
      </ScrollView>

      <PersonalInfoModal visible={showPersonal} onClose={() => setShowPersonal(false)} />
      <ChangePasswordModal visible={showPassword} onClose={() => setShowPassword(false)} />
      <NotificationsModal visible={showNotifs} onClose={() => setShowNotifs(false)} />
      <HelpModal visible={showHelp} onClose={() => setShowHelp(false)} />
      <TermsModal visible={showTerms} onClose={() => setShowTerms(false)} />
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
  // Modal shared
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.65)' },
  sheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20 },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#444', alignSelf: 'center', marginBottom: 16 },
  sheetTitle: { fontSize: 20, fontWeight: '800', marginBottom: 20 },
  label: { fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, marginBottom: 16 },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 4 },
  modalBtn: { flex: 1, borderRadius: 12, paddingVertical: 13, alignItems: 'center' },
  termsSection: { fontSize: 14, fontWeight: '700', marginTop: 16, marginBottom: 6 },
  termsText: { fontSize: 13, lineHeight: 20 },
});
