import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  TextInput, KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/hooks/useTheme';
import { ToastManager } from '@/components/shared/Toast';
import { supabase } from '@/lib/supabase';

const BLOOD_TYPES = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

interface MedicalRecord {
  blood_type: string | null;
  conditions: string | null;
  injuries: string | null;
  allergies: string | null;
  medications: string | null;
  physical_limitations: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  emergency_contact_relationship: string | null;
  has_medical_clearance: boolean;
  liability_acknowledged: boolean;
  status: 'pending' | 'completed';
  filled_by_role: 'client' | 'staff' | null;
  updated_at: string | null;
}

interface Props {
  clientId: string;
  tenantId: string;
  viewerId: string;
  filledByRole: 'client' | 'staff';
  onSaved?: () => void;
}

export function MedicalRecordForm({ clientId, tenantId, viewerId, filledByRole, onSaved }: Props) {
  const T = useTheme();
  const { t } = useTranslation();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [record, setRecord] = useState<MedicalRecord | null>(null);

  const [bloodType, setBloodType] = useState('');
  const [clearance, setClearance] = useState(false);
  const [conditions, setConditions] = useState('');
  const [injuries, setInjuries] = useState('');
  const [allergies, setAllergies] = useState('');
  const [medications, setMedications] = useState('');
  const [limitations, setLimitations] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactRel, setContactRel] = useState('');
  const [acknowledged, setAcknowledged] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('client_medical_records')
        .select('*')
        .eq('client_id', clientId)
        .maybeSingle();
      if (data) {
        const r = data as MedicalRecord;
        setRecord(r);
        setBloodType(r.blood_type ?? '');
        setClearance(r.has_medical_clearance);
        setConditions(r.conditions ?? '');
        setInjuries(r.injuries ?? '');
        setAllergies(r.allergies ?? '');
        setMedications(r.medications ?? '');
        setLimitations(r.physical_limitations ?? '');
        setContactName(r.emergency_contact_name ?? '');
        setContactPhone(r.emergency_contact_phone ?? '');
        setContactRel(r.emergency_contact_relationship ?? '');
        setAcknowledged(r.liability_acknowledged);
      }
      setLoading(false);
    })();
  }, [clientId]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('client_medical_records')
        .upsert(
          {
            client_id: clientId,
            tenant_id: tenantId,
            blood_type: bloodType || null,
            conditions: conditions.trim() || null,
            injuries: injuries.trim() || null,
            allergies: allergies.trim() || null,
            medications: medications.trim() || null,
            physical_limitations: limitations.trim() || null,
            emergency_contact_name: contactName.trim() || null,
            emergency_contact_phone: contactPhone.trim() || null,
            emergency_contact_relationship: contactRel.trim() || null,
            has_medical_clearance: clearance,
            liability_acknowledged: acknowledged,
            status: acknowledged ? 'completed' : 'pending',
            filled_by: viewerId,
            filled_by_role: filledByRole,
            completed_at: acknowledged ? new Date().toISOString() : null,
          },
          { onConflict: 'client_id' },
        );
      if (error) throw error;
      ToastManager.show({ message: t('client.medicalData.saved'), type: 'success' });
      onSaved?.();
    } catch (e: any) {
      Alert.alert(t('common.error'), e.message ?? t('client.medicalData.saveError'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) return null;

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
        <View style={[styles.introBox, { backgroundColor: T.accentGlow, borderColor: T.accent + '33' }]}>
          <Text style={{ fontSize: 13, color: T.text, lineHeight: 19 }}>{t('client.medicalData.intro')}</Text>
        </View>

        {record?.status === 'completed' && record.updated_at && (
          <Text style={{ fontSize: 12, color: T.textMuted, marginBottom: 12 }}>
            {t('client.medicalData.lastUpdated', { date: new Date(record.updated_at).toLocaleDateString() })}
            {record.filled_by_role === 'staff' ? t('client.medicalData.updatedByStaff') : ''}
          </Text>
        )}

        <Text style={[styles.label, { color: T.textSecondary }]}>{t('client.medicalData.bloodType')}</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
          {[{ value: '', label: t('client.medicalData.bloodTypeNone') }, ...BLOOD_TYPES.map(bt => ({ value: bt, label: bt }))].map(opt => {
            const active = bloodType === opt.value;
            return (
              <TouchableOpacity key={opt.value || 'none'} onPress={() => setBloodType(opt.value)}
                style={[styles.pill, { borderColor: active ? T.accent : T.border, backgroundColor: active ? T.accentGlow : T.bgCard }]}>
                <Text style={{ fontSize: 12, fontWeight: '600', color: active ? T.accent : T.textMuted }}>{opt.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <TouchableOpacity onPress={() => setClearance(!clearance)} style={[styles.checkboxRow, { borderColor: T.border, backgroundColor: T.bgCard }]}>
          <View style={[styles.checkbox, { borderColor: T.accent, backgroundColor: clearance ? T.accent : 'transparent' }]}>
            {clearance && <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>✓</Text>}
          </View>
          <Text style={{ flex: 1, fontSize: 13, color: T.text }}>{t('client.medicalData.medicalClearance')}</Text>
        </TouchableOpacity>

        <Text style={[styles.label, { color: T.textSecondary, marginTop: 16 }]}>{t('client.medicalData.conditions')}</Text>
        <TextInput
          style={[styles.textarea, { backgroundColor: T.bgCard, borderColor: T.border, color: T.text }]}
          value={conditions} onChangeText={setConditions} multiline numberOfLines={3}
          placeholder={t('client.medicalData.conditionsPlaceholder')} placeholderTextColor={T.textMuted}
        />

        <Text style={[styles.label, { color: T.textSecondary }]}>{t('client.medicalData.injuries')}</Text>
        <TextInput
          style={[styles.textarea, { backgroundColor: T.bgCard, borderColor: T.border, color: T.text }]}
          value={injuries} onChangeText={setInjuries} multiline numberOfLines={3}
          placeholder={t('client.medicalData.injuriesPlaceholder')} placeholderTextColor={T.textMuted}
        />

        <Text style={[styles.label, { color: T.textSecondary }]}>{t('client.medicalData.allergies')}</Text>
        <TextInput
          style={[styles.textarea, { backgroundColor: T.bgCard, borderColor: T.border, color: T.text }]}
          value={allergies} onChangeText={setAllergies} multiline numberOfLines={2} placeholderTextColor={T.textMuted}
        />

        <Text style={[styles.label, { color: T.textSecondary }]}>{t('client.medicalData.medications')}</Text>
        <TextInput
          style={[styles.textarea, { backgroundColor: T.bgCard, borderColor: T.border, color: T.text }]}
          value={medications} onChangeText={setMedications} multiline numberOfLines={2} placeholderTextColor={T.textMuted}
        />

        <Text style={[styles.label, { color: T.textSecondary }]}>{t('client.medicalData.limitations')}</Text>
        <TextInput
          style={[styles.textarea, { backgroundColor: T.bgCard, borderColor: T.border, color: T.text }]}
          value={limitations} onChangeText={setLimitations} multiline numberOfLines={2} placeholderTextColor={T.textMuted}
        />

        <Text style={[styles.sectionTitle, { color: T.textMuted }]}>{t('client.medicalData.emergencyContact')}</Text>
        <TextInput
          style={[styles.input, { backgroundColor: T.bgCard, borderColor: T.border, color: T.text }]}
          value={contactName} onChangeText={setContactName}
          placeholder={t('client.medicalData.emergencyName')} placeholderTextColor={T.textMuted}
        />
        <TextInput
          style={[styles.input, { backgroundColor: T.bgCard, borderColor: T.border, color: T.text }]}
          value={contactPhone} onChangeText={setContactPhone} keyboardType="phone-pad"
          placeholder={t('client.medicalData.emergencyPhone')} placeholderTextColor={T.textMuted}
        />
        <TextInput
          style={[styles.input, { backgroundColor: T.bgCard, borderColor: T.border, color: T.text }]}
          value={contactRel} onChangeText={setContactRel}
          placeholder={t('client.medicalData.emergencyRelationship')} placeholderTextColor={T.textMuted}
        />

        <TouchableOpacity onPress={() => setAcknowledged(!acknowledged)} style={[styles.checkboxRow, { borderColor: T.accent + '55', backgroundColor: T.accentGlow, marginTop: 8 }]}>
          <View style={[styles.checkbox, { borderColor: T.accent, backgroundColor: acknowledged ? T.accent : 'transparent' }]}>
            {acknowledged && <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>✓</Text>}
          </View>
          <Text style={{ flex: 1, fontSize: 13, color: T.text }}>{t('client.medicalData.acknowledgement')}</Text>
        </TouchableOpacity>
        {!acknowledged && (
          <Text style={{ fontSize: 12, color: T.textMuted, marginTop: 6 }}>{t('client.medicalData.acknowledgementHint')}</Text>
        )}

        <TouchableOpacity onPress={handleSave} disabled={saving}
          style={[styles.saveBtn, { backgroundColor: T.accent, opacity: saving ? 0.6 : 1 }]}>
          <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15 }}>
            {saving ? t('client.medicalData.saving') : t('client.medicalData.save')}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  introBox: { borderWidth: 1, borderRadius: 14, padding: 14, marginBottom: 16 },
  label: { fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  sectionTitle: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8, marginTop: 8, marginBottom: 8 },
  pill: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8 },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, marginBottom: 10 },
  textarea: {
    borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14,
    marginBottom: 16, minHeight: 70, textAlignVertical: 'top',
  },
  checkboxRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12,
  },
  checkbox: {
    width: 20, height: 20, borderRadius: 5, borderWidth: 2, alignItems: 'center', justifyContent: 'center',
  },
  saveBtn: { borderRadius: 14, paddingVertical: 15, alignItems: 'center', marginTop: 24 },
});
