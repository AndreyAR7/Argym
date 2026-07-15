import React, { useEffect, useMemo, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, StatusBar,
  Alert, Modal, TextInput, KeyboardAvoidingView, Platform, Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/hooks/useTheme';
import { useAuthStore } from '@/store/auth.store';
import { useProfileStore } from '@/store/profile.store';
import { usePlansStore } from '@/store/plans.store';
import { ClientTopBar } from '@/components/client/ClientTopBar';
import { AvatarUploader } from '@/components/shared/AvatarUploader';
import { ThemeSelector } from '@/components/shared/ThemeSelector';
import { ToastManager } from '@/components/shared/Toast';
import { DatePickerField } from '@/components/shared/DatePickerField';
import { supabase } from '@/lib/supabase';
import type { Gender } from '@/lib/types';

// ─── Shared SettingRow ────────────────────────────────────────
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

type GenderOption = { value: 'male' | 'female' | 'other'; label: string; icon: string };
function getGenderOptions(t: (key: string) => string): GenderOption[] {
  return [
    { value: 'male',   label: t('client.profile.genderMale'), icon: '♂' },
    { value: 'female', label: t('client.profile.genderFemale'),  icon: '♀' },
    { value: 'other',  label: t('client.profile.genderOther'), icon: '○' },
  ];
}

// ─── Personal Info Modal ──────────────────────────────────────
function PersonalInfoModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const T = useTheme();
  const { t } = useTranslation();
  const GENDER_OPTIONS = useMemo(() => getGenderOptions(t), [t]);
  const { user } = useAuthStore();
  const [fullName, setFullName] = useState(user?.full_name ?? '');
  const [phone, setPhone] = useState((user as any)?.phone ?? '');
  const [dob, setDob] = useState((user as any)?.date_of_birth ?? '');
  const [gender, setGender] = useState<Gender | null>((user as any)?.gender ?? null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible) {
      setFullName(user?.full_name ?? '');
      setPhone((user as any)?.phone ?? '');
      setDob((user as any)?.date_of_birth ?? '');
      setGender((user as any)?.gender ?? null);
    }
  }, [visible]);

  const handleSave = async () => {
    if (!fullName.trim()) { Alert.alert(t('common.error'), t('client.profile.nameRequired')); return; }
    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: fullName.trim(),
          phone: phone.trim() || null,
          date_of_birth: dob.trim() || null,
          gender: gender || null,
        })
        .eq('id', user!.id);
      if (error) throw error;
      useAuthStore.setState((s) => ({
        user: s.user ? {
          ...s.user,
          full_name: fullName.trim(),
          phone: phone.trim() || null,
          date_of_birth: dob.trim() || null,
          gender: gender || null,
        } : s.user,
      }));
      ToastManager.show({ message: t('client.profile.profileUpdated'), type: 'success' });
      onClose();
    } catch (e: any) {
      Alert.alert(t('common.error'), e.message ?? t('client.profile.updateFailed'));
    } finally { setSaving(false); }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <View style={styles.modalOverlay}>
          <View style={[styles.sheet, { backgroundColor: T.bgCard }]}>
            <View style={styles.handle} />
            <ScrollView keyboardShouldPersistTaps="handled">
              <Text style={[styles.sheetTitle, { color: T.text }]}>{t('client.profile.personalInfoTitle')}</Text>
              <Text style={[styles.label, { color: T.textSecondary }]}>{t('auth.fullName')}</Text>
              <TextInput style={[styles.input, { backgroundColor: T.bg, borderColor: T.border, color: T.text }]}
                value={fullName} onChangeText={setFullName} placeholder={t('client.profile.namePlaceholder')} placeholderTextColor={T.textMuted} />
              <Text style={[styles.label, { color: T.textSecondary }]}>{t('client.profile.phone')}</Text>
              <TextInput style={[styles.input, { backgroundColor: T.bg, borderColor: T.border, color: T.text }]}
                value={phone} onChangeText={setPhone} placeholder={t('client.profile.phonePlaceholder')} placeholderTextColor={T.textMuted} keyboardType="phone-pad" />
              <DatePickerField
                label={t('client.profile.dateOfBirth')}
                value={dob}
                onChange={setDob}
                placeholder={t('client.profile.selectDate')}
                maxDate={new Date()}
              />
              {/* Gender selector */}
              <Text style={[styles.label, { color: T.textSecondary, marginTop: 4 }]}>{t('client.profile.gender')}</Text>
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 20 }}>
                {GENDER_OPTIONS.map((opt) => {
                  const active = gender === opt.value;
                  return (
                    <TouchableOpacity
                      key={opt.value}
                      onPress={() => setGender(active ? null : opt.value as Gender)}
                      style={[
                        styles.genderPill,
                        {
                          borderColor: active ? T.accent : T.border,
                          backgroundColor: active ? T.accentGlow : T.bg,
                          flex: opt.value === 'other' ? 2 : 1,
                        },
                      ]}
                    >
                      <Text style={{ fontSize: 16, color: active ? T.accent : T.textMuted }}>{opt.icon}</Text>
                      <Text style={{ fontSize: 12, fontWeight: '600', color: active ? T.accent : T.textMuted, marginTop: 2 }}>
                        {opt.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              <View style={styles.modalActions}>
                <TouchableOpacity onPress={onClose} style={[styles.modalBtn, { borderColor: T.border, borderWidth: 1 }]}>
                  <Text style={{ color: T.text, fontWeight: '600' }}>{t('common.cancel')}</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleSave} disabled={saving} style={[styles.modalBtn, { backgroundColor: T.accent }]}>
                  <Text style={{ color: '#fff', fontWeight: '700' }}>{saving ? t('client.profile.saving') : t('common.save')}</Text>
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
  const { t } = useTranslation();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [saving, setSaving] = useState(false);

  const reset = () => { setCurrent(''); setNext(''); setConfirm(''); };

  const handleSave = async () => {
    if (!next.trim() || next.length < 6) { Alert.alert(t('common.error'), t('client.profile.newPasswordTooShort')); return; }
    if (next !== confirm) { Alert.alert(t('common.error'), t('client.profile.passwordsDoNotMatch')); return; }
    setSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: next });
      if (error) throw error;
      ToastManager.show({ message: t('client.profile.passwordUpdated'), type: 'success' });
      reset(); onClose();
    } catch (e: any) {
      Alert.alert(t('common.error'), e.message ?? t('client.profile.passwordChangeFailed'));
    } finally { setSaving(false); }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={() => { reset(); onClose(); }}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <View style={styles.modalOverlay}>
          <View style={[styles.sheet, { backgroundColor: T.bgCard }]}>
            <View style={styles.handle} />
            <ScrollView keyboardShouldPersistTaps="handled">
              <Text style={[styles.sheetTitle, { color: T.text }]}>{t('client.profile.changePasswordTitle')}</Text>
              <Text style={[styles.label, { color: T.textSecondary }]}>{t('client.profile.newPassword')}</Text>
              <TextInput style={[styles.input, { backgroundColor: T.bg, borderColor: T.border, color: T.text }]}
                value={next} onChangeText={setNext} placeholder={t('client.profile.minCharsPlaceholder')} placeholderTextColor={T.textMuted} secureTextEntry />
              <Text style={[styles.label, { color: T.textSecondary }]}>{t('client.profile.confirmNewPassword')}</Text>
              <TextInput style={[styles.input, { backgroundColor: T.bg, borderColor: T.border, color: T.text }]}
                value={confirm} onChangeText={setConfirm} placeholder={t('client.profile.repeatPasswordPlaceholder')} placeholderTextColor={T.textMuted} secureTextEntry />
              <View style={styles.modalActions}>
                <TouchableOpacity onPress={() => { reset(); onClose(); }} style={[styles.modalBtn, { borderColor: T.border, borderWidth: 1 }]}>
                  <Text style={{ color: T.text, fontWeight: '600' }}>{t('common.cancel')}</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleSave} disabled={saving} style={[styles.modalBtn, { backgroundColor: T.accent }]}>
                  <Text style={{ color: '#fff', fontWeight: '700' }}>{saving ? t('client.profile.saving') : t('client.profile.update')}</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Notifications Prefs Modal ────────────────────────────────
function NotificationsModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const T = useTheme();
  const { t } = useTranslation();
  const [appts, setAppts] = useState(true);
  const [promos, setPromos] = useState(true);
  const [reminders, setReminders] = useState(true);

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
          <Text style={[styles.sheetTitle, { color: T.text }]}>{t('client.profile.notificationsTitle')}</Text>
          <Toggle value={appts} onChange={setAppts} label={t('client.profile.notifAppointments')} />
          <Toggle value={promos} onChange={setPromos} label={t('client.profile.notifPromos')} />
          <Toggle value={reminders} onChange={setReminders} label={t('client.profile.notifRoutine')} />
          <TouchableOpacity onPress={() => { ToastManager.show({ message: t('client.profile.preferencesSaved'), type: 'success' }); onClose(); }}
            style={[styles.modalBtn, { backgroundColor: T.accent, marginTop: 20, alignSelf: 'stretch' }]}>
            <Text style={{ color: '#fff', fontWeight: '700' }}>{t('common.save')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// ─── Help Modal ───────────────────────────────────────────────
function HelpModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const T = useTheme();
  const { t } = useTranslation();
  const items = [
    { icon: '📧', label: t('client.profile.helpEmail'), action: () => Linking.openURL('mailto:soporte@caro.gym') },
    { icon: '💬', label: t('client.profile.helpChat'), action: () => Linking.openURL('https://wa.me/50688888888') },
    { icon: '📖', label: t('client.profile.helpCenter'), action: () => Linking.openURL('https://help.caro.gym') },
  ];
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={[styles.sheet, { backgroundColor: T.bgCard }]}>
          <View style={styles.handle} />
          <Text style={[styles.sheetTitle, { color: T.text }]}>{t('client.profile.helpTitle')}</Text>
          {items.map((item, i) => (
            <TouchableOpacity key={i} onPress={item.action}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: T.border }}>
              <View style={[styles.settingIcon, { backgroundColor: T.accentGlow }]}>
                <Text style={{ fontSize: 16 }}>{item.icon}</Text>
              </View>
              <Text style={{ color: T.text, fontSize: 15, flex: 1 }}>{item.label}</Text>
              <Text style={{ color: T.textMuted, fontSize: 18 }}>›</Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity onPress={onClose} style={[styles.modalBtn, { borderColor: T.border, borderWidth: 1, marginTop: 16, alignSelf: 'stretch' }]}>
            <Text style={{ color: T.text, fontWeight: '600' }}>{t('client.profile.close')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// ─── Terms Modal ──────────────────────────────────────────────
function TermsModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const T = useTheme();
  const { t } = useTranslation();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={[styles.sheet, { backgroundColor: T.bgCard, maxHeight: '85%' }]}>
          <View style={styles.handle} />
          <Text style={[styles.sheetTitle, { color: T.text }]}>{t('client.profile.termsTitle')}</Text>
          <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
            <Text style={[styles.termsSection, { color: T.accent }]}>{t('client.profile.termsUseSection')}</Text>
            <Text style={[styles.termsText, { color: T.textSecondary }]}>
              {t('client.profile.termsUseBody')}
            </Text>
            <Text style={[styles.termsSection, { color: T.accent }]}>{t('client.profile.privacyPolicySection')}</Text>
            <Text style={[styles.termsText, { color: T.textSecondary }]}>
              {t('client.profile.privacyPolicyBody')}
            </Text>
            <Text style={[styles.termsSection, { color: T.accent }]}>{t('client.profile.dataCollectedSection')}</Text>
            <Text style={[styles.termsText, { color: T.textSecondary }]}>
              {t('client.profile.dataCollectedBody')}
            </Text>
            <Text style={[styles.termsSection, { color: T.accent }]}>{t('client.profile.contactSection')}</Text>
            <Text style={[styles.termsText, { color: T.textSecondary }]}>
              {t('client.profile.contactBody')}
            </Text>
            <View style={{ height: 16 }} />
          </ScrollView>
          <TouchableOpacity onPress={onClose} style={[styles.modalBtn, { backgroundColor: T.accent, marginTop: 12, alignSelf: 'stretch' }]}>
            <Text style={{ color: '#fff', fontWeight: '700' }}>{t('client.profile.understood')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// ─── Main Screen ──────────────────────────────────────────────
export default function ProfileScreen() {
  const T = useTheme();
  const { t } = useTranslation();
  const router = useRouter();
  const { user, signOut } = useAuthStore();
  const { loadProfile } = useProfileStore();
  const { mySubscription, fetchMySubscription } = usePlansStore();

  const [showPersonal, setShowPersonal] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showNotifs, setShowNotifs] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [showTerms, setShowTerms] = useState(false);

  const name = user?.full_name ?? t('client.profile.defaultName');

  useEffect(() => {
    loadProfile();
    if (user?.id && user?.tenant_id) fetchMySubscription(user.id, user.tenant_id);
  }, []);

  const handleSignOut = () => {
    Alert.alert(t('client.profile.signOutTitle'), t('client.profile.signOutConfirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('client.profile.signOutAction'), style: 'destructive', onPress: signOut },
    ]);
  };

  const planName = mySubscription?.plan?.name ?? null;
  const planStatus = mySubscription?.status ?? null;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: T.bg }]} edges={['left', 'right']}>
      <StatusBar barStyle="light-content" backgroundColor={T.bg} />
      <ClientTopBar title={t('client.profile.screenTitle')} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* Avatar + name */}
        <View style={styles.avatarSection}>
          <AvatarUploader name={name} size={96} accentColor={T.accent} bgColor={T.bg} textColor={T.text}
            cardBg={T.bgCard} borderColor={T.border} textSecondary={T.textSecondary} textMuted={T.textMuted} errorColor={T.red} />
          <Text style={[styles.userName, { color: T.text }]}>{name}</Text>
          <Text style={[styles.userEmail, { color: T.textMuted }]}>{(user as any)?.email ?? ''}</Text>
        </View>

        {/* Subscription card */}
        {planName && (
          <View style={[styles.subCard, { backgroundColor: T.bgCard, borderColor: T.accent + '33', borderRadius: T.radiusLg }]}>
            <View style={styles.subTop}>
              <View>
                <Text style={[styles.subLabel, { color: T.textMuted }]}>{t('client.profile.currentPlan')}</Text>
                <Text style={[styles.subName, { color: T.text }]}>{planName}</Text>
              </View>
              <View style={[styles.subBadge, { backgroundColor: planStatus === 'active' ? T.greenSoft : T.orangeSoft }]}>
                <Text style={[styles.subBadgeText, { color: planStatus === 'active' ? T.green : T.orange }]}>
                  {planStatus === 'active' ? `● ${t('common.active')}` : `● ${t('common.inactive')}`}
                </Text>
              </View>
            </View>
            <TouchableOpacity onPress={() => router.push('/(client)/plans')}
              style={[styles.subBtn, { backgroundColor: T.accentGlow, borderRadius: T.radiusMd }]}>
              <Text style={[styles.subBtnText, { color: T.accent }]}>{t('client.profile.viewPlans')}</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Theme */}
        <View style={[styles.section, { backgroundColor: T.bgCard, borderColor: T.border, borderRadius: T.radiusMd }]}>
          <ThemeSelector accentColor={T.accent} textColor={T.text} textSecondary={T.textSecondary}
            textMuted={T.textMuted} cardBg={T.bgCard} borderColor={T.border} />
        </View>

        {/* Account */}
        <Text style={[styles.sectionTitle, { color: T.textMuted }]}>{t('client.profile.myAccount')}</Text>
        <View style={[styles.settingsCard, { backgroundColor: T.bgCard, borderColor: T.border, borderRadius: T.radiusMd }]}>
          <SettingRow icon="👤" label={t('client.profile.personalInfo')} onPress={() => setShowPersonal(true)} />
          <View style={[styles.divider, { backgroundColor: T.border }]} />
          <SettingRow icon="🔒" label={t('client.profile.changePassword')} onPress={() => setShowPassword(true)} />
          <View style={[styles.divider, { backgroundColor: T.border }]} />
          <SettingRow icon="🔔" label={t('client.profile.notifications')} onPress={() => setShowNotifs(true)} />
        </View>

        {/* Support */}
        <Text style={[styles.sectionTitle, { color: T.textMuted }]}>{t('client.profile.support')}</Text>
        <View style={[styles.settingsCard, { backgroundColor: T.bgCard, borderColor: T.border, borderRadius: T.radiusMd }]}>
          <SettingRow icon="❓" label={t('client.profile.helpAndSupport')} onPress={() => setShowHelp(true)} />
          <View style={[styles.divider, { backgroundColor: T.border }]} />
          <SettingRow icon="📋" label={t('client.profile.termsAndPrivacy')} onPress={() => setShowTerms(true)} />
        </View>

        {/* Sign out */}
        <View style={[styles.settingsCard, { backgroundColor: T.bgCard, borderColor: T.border, borderRadius: T.radiusMd, marginBottom: 16 }]}>
          <SettingRow icon="🚪" label={t('client.profile.signOut')} onPress={handleSignOut} danger />
        </View>

        <Text style={[styles.version, { color: T.textMuted }]}>{t('client.profile.versionLabel')}</Text>
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
  content: { padding: 16 },
  avatarSection: { alignItems: 'center', paddingVertical: 20, marginBottom: 16, gap: 6 },
  userName: { fontSize: 22, fontWeight: '800' },
  userEmail: { fontSize: 13 },
  subCard: { borderWidth: 1, padding: 16, marginBottom: 20 },
  subTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 },
  subLabel: { fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 },
  subName: { fontSize: 18, fontWeight: '800' },
  subBadge: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  subBadgeText: { fontSize: 12, fontWeight: '700' },
  subBtn: { paddingVertical: 10, alignItems: 'center' },
  subBtnText: { fontWeight: '700', fontSize: 14 },
  section: { borderWidth: 1, padding: 16, marginBottom: 20 },
  sectionTitle: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8, marginLeft: 2 },
  settingsCard: { borderWidth: 1, overflow: 'hidden', marginBottom: 16 },
  settingRow: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },
  settingIcon: { width: 34, height: 34, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  settingLabel: { fontSize: 15, fontWeight: '500' },
  settingValue: { fontSize: 13, marginRight: 6 },
  settingArrow: { fontSize: 20 },
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
  genderPill: {
    borderWidth: 1.5, borderRadius: 12,
    paddingVertical: 10, paddingHorizontal: 8,
    alignItems: 'center', justifyContent: 'center',
  },
});
