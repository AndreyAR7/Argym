import React, { useState, useRef, useCallback } from 'react';
import {
  Modal, View, Text, TouchableOpacity, TextInput,
  StyleSheet, ScrollView, KeyboardAvoidingView, Platform,
  Alert, ActivityIndicator, Dimensions,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/hooks/useTheme';
import { BodySilhouette, MeasureZone } from './BodySilhouette';
import type { BodyMeasurement } from '@/types/progress';
import type { Gender } from '@/lib/types';

const { height: SCREEN_H } = Dimensions.get('window');

// ── Step definitions (static — labels resolved via t() in component) ───────
interface StepDef {
  key: keyof Omit<BodyMeasurement, 'id' | 'client_id' | 'tenant_id' | 'measured_at' | 'created_at' | 'notes'>;
  unit: string;
  zone: MeasureZone;
  required?: boolean;
}

const STEP_DEFS: StepDef[] = [
  { key: 'weight_kg',    unit: 'kg', zone: 'weight',   required: true },
  { key: 'height_cm',   unit: 'cm', zone: 'height'   },
  { key: 'body_fat_pct', unit: '%', zone: 'weight'   },
  { key: 'neck_cm',     unit: 'cm', zone: 'neck'     },
  { key: 'shoulder_cm', unit: 'cm', zone: 'shoulder' },
  { key: 'chest_cm',    unit: 'cm', zone: 'chest'    },
  { key: 'waist_cm',    unit: 'cm', zone: 'waist'    },
  { key: 'abdomen_cm',  unit: 'cm', zone: 'abdomen'  },
  { key: 'hip_cm',      unit: 'cm', zone: 'hip'      },
  { key: 'arm_cm',      unit: 'cm', zone: 'arm'      },
  { key: 'thigh_cm',    unit: 'cm', zone: 'thigh'    },
  { key: 'calf_cm',     unit: 'cm', zone: 'calf'     },
];

type Values = Partial<Record<string, string>>;

// ── Progress dots ──────────────────────────────────────────────────────────
function ProgressDots({ current, total }: { current: number; total: number }) {
  return (
    <View style={styles.dotsRow}>
      {Array.from({ length: total }, (_, i) => (
        <View
          key={i}
          style={[
            styles.dot,
            i < current
              ? { backgroundColor: '#FF6B2B', width: 8 }
              : i === current
              ? { backgroundColor: '#00C8FF', width: 14, borderRadius: 4 }
              : { backgroundColor: '#333355', width: 6 },
          ]}
        />
      ))}
    </View>
  );
}

// ── Summary card ───────────────────────────────────────────────────────────
function SummaryCard({ values, steps }: { values: Values; steps: Array<StepDef & { label: string; unit: string }> }) {
  const filled = steps.filter((s) => values[s.key as string]);
  if (!filled.length) return null;
  return (
    <View style={styles.summaryCard}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {filled.map((s) => (
          <View key={s.key} style={styles.summaryBadge}>
            <Text style={{ fontSize: 16, fontWeight: '900', color: '#FF6B2B' }}>{values[s.key as string]}</Text>
            <Text style={{ fontSize: 9, color: '#888', marginTop: 1 }}>{s.label} ({s.unit})</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

// ── Main wizard ────────────────────────────────────────────────────────────
interface Props {
  visible: boolean;
  onClose: () => void;
  onSave: (m: Partial<BodyMeasurement> & { notes?: string | null }) => Promise<void>;
  gender: Gender | null;
  existing: BodyMeasurement | null;
}

export function MeasurementWizard({ visible, onClose, onSave, gender, existing }: Props) {
  const { t } = useTranslation();
  const T = useTheme();
  const [step, setStep] = useState(0);
  const [values, setValues] = useState<Values>({});
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const inputRef = useRef<TextInput>(null);

  // Resolve labels at render time so t() is called inside component
  const steps = STEP_DEFS.map((s) => ({
    ...s,
    label: t(`measurements.steps.${s.key}.label`),
    tip:   t(`measurements.steps.${s.key}.tip`),
  }));

  const current = steps[step];
  const completedZones = steps.slice(0, step)
    .filter((s) => values[s.key as string])
    .map((s) => s.zone) as MeasureZone[];

  const reset = useCallback(() => {
    setStep(0);
    setValues({});
    setNotes('');
    setSaving(false);
    setShowSummary(false);
  }, []);

  const handleOpen = useCallback(() => {
    if (existing) {
      const pre: Values = {};
      for (const s of STEP_DEFS) {
        const v = (existing as any)[s.key];
        if (v != null) pre[s.key as string] = String(v);
      }
      setValues(pre);
      setNotes(existing.notes ?? '');
    }
    setTimeout(() => inputRef.current?.focus(), 400);
  }, [existing]);

  const handleNext = () => {
    if (step < steps.length - 1) {
      setStep((s) => s + 1);
      setTimeout(() => inputRef.current?.focus(), 200);
    } else {
      setShowSummary(true);
    }
  };

  const handleBack = () => {
    if (step > 0) setStep((s) => s - 1);
    else { reset(); onClose(); }
  };

  const handleSkip = () => {
    const next = { ...values };
    delete next[current.key as string];
    setValues(next);
    handleNext();
  };

  const handleSave = async () => {
    const hasAny = STEP_DEFS.some((s) => values[s.key as string]);
    if (!hasAny) {
      Alert.alert(t('measurements.wizard.noDataAlert'), t('measurements.wizard.noDataMessage'));
      return;
    }
    setSaving(true);
    try {
      const payload: Partial<BodyMeasurement> & { notes?: string | null } = { notes: notes || null };
      for (const s of STEP_DEFS) {
        const raw = values[s.key as string];
        (payload as any)[s.key] = raw ? parseFloat(raw) : null;
      }
      await onSave(payload);
      reset();
      onClose();
    } catch (e: any) {
      Alert.alert(t('common.error'), e.message ?? t('errors.generic'));
    } finally {
      setSaving(false);
    }
  };

  const bodyH = Math.round(SCREEN_H * 0.40);
  const bodyW = Math.round(bodyH * (160 / 430));

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={() => { reset(); onClose(); }}
      onShow={handleOpen}
    >
      <View style={styles.root}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          {/* ── Header ── */}
          <View style={styles.header}>
            <TouchableOpacity onPress={handleBack} style={styles.headerBtn}>
              <Text style={styles.headerChevron}>‹</Text>
            </TouchableOpacity>
            <View style={{ flex: 1, alignItems: 'center' }}>
              <Text style={styles.headerTitle}>{t('measurements.wizard.screenTitle')}</Text>
              {!showSummary && (
                <Text style={styles.headerStep}>
                  {t('measurements.wizard.stepOf', { current: step + 1, total: steps.length })}
                </Text>
              )}
            </View>
            <TouchableOpacity onPress={() => { reset(); onClose(); }} style={styles.headerBtn}>
              <Text style={styles.headerChevron}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            contentContainerStyle={styles.scroll}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* ── Body silhouette ── */}
            <View style={[styles.bodyArea, { height: bodyH }]}>
              <BodySilhouette
                gender={gender}
                activeZone={showSummary ? null : current.zone}
                completedZones={completedZones}
                width={bodyW}
                height={bodyH}
              />
              {!showSummary && (
                <View style={styles.zoneLabel}>
                  <Text style={styles.zoneLabelText}>● {current.label.toUpperCase()}</Text>
                </View>
              )}
            </View>

            {/* ── Progress dots ── */}
            {!showSummary && <ProgressDots current={step} total={steps.length} />}

            {/* ── Summary ── */}
            {showSummary ? (
              <View style={styles.inputCard}>
                <Text style={styles.reviewTitle}>{t('measurements.wizard.reviewTitle')}</Text>
                <Text style={styles.reviewSubtitle}>{t('measurements.wizard.reviewSubtitle')}</Text>

                <Text style={[styles.summaryLabel, { marginBottom: 10 }]}>
                  {t('measurements.wizard.summaryLabel')}
                </Text>
                <SummaryCard values={values} steps={steps} />

                <Text style={styles.notesLabel}>{t('measurements.wizard.notes')}</Text>
                <TextInput
                  value={notes}
                  onChangeText={setNotes}
                  placeholder={t('measurements.wizard.notesPlaceholder')}
                  placeholderTextColor="#555"
                  style={styles.notesInput}
                  multiline
                  numberOfLines={2}
                />

                <View style={styles.rowBtns}>
                  <TouchableOpacity
                    onPress={() => { setShowSummary(false); setStep(steps.length - 1); }}
                    style={styles.btnSecondary}
                  >
                    <Text style={styles.btnSecondaryText}>{t('measurements.wizard.editBack')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={handleSave}
                    disabled={saving}
                    style={[styles.btnPrimary, { backgroundColor: '#FF6B2B' }]}
                  >
                    {saving
                      ? <ActivityIndicator color="#fff" size="small" />
                      : <Text style={styles.btnPrimaryText}>{t('measurements.wizard.save')}</Text>
                    }
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              /* ── Step input ── */
              <View style={styles.inputCard}>
                <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6, marginBottom: 4 }}>
                  <Text style={styles.stepLabel}>{current.label}</Text>
                  <Text style={styles.stepUnit}>({current.unit})</Text>
                  {current.required && (
                    <View style={styles.requiredBadge}>
                      <Text style={styles.requiredText}>{t('measurements.wizard.required')}</Text>
                    </View>
                  )}
                </View>

                <Text style={styles.stepTip}>{current.tip}</Text>

                <View style={styles.inputWrapper}>
                  <TextInput
                    ref={inputRef}
                    value={values[current.key as string] ?? ''}
                    onChangeText={(v) => setValues({ ...values, [current.key as string]: v })}
                    keyboardType="decimal-pad"
                    placeholder="0.0"
                    placeholderTextColor="#444"
                    style={styles.numberInput}
                    returnKeyType="next"
                    onSubmitEditing={handleNext}
                  />
                  <Text style={styles.unitSuffix}>{current.unit}</Text>
                </View>

                <View style={styles.rowBtns}>
                  {!current.required && (
                    <TouchableOpacity onPress={handleSkip} style={styles.btnSecondary}>
                      <Text style={styles.btnSecondaryText}>{t('measurements.wizard.skip')}</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    onPress={handleNext}
                    style={[
                      styles.btnPrimary,
                      { backgroundColor: values[current.key as string] ? '#00C8FF' : '#00C8FF66' },
                      current.required ? { flex: 1 } : {},
                    ]}
                  >
                    <Text style={[styles.btnPrimaryText, { color: '#0D0D1A' }]}>
                      {step < steps.length - 1 ? t('measurements.wizard.next') : t('measurements.wizard.toSummary')}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0D0D1A' },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 8, paddingTop: 16, paddingBottom: 8,
  },
  headerBtn: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  headerChevron: { fontSize: 22, color: '#aaa' },
  headerTitle: { fontSize: 11, fontWeight: '700', color: '#555', letterSpacing: 1.2 },
  headerStep: { fontSize: 13, fontWeight: '600', color: '#888', marginTop: 2 },
  scroll: { flexGrow: 1, paddingBottom: 40 },
  bodyArea: { alignItems: 'center', justifyContent: 'center', position: 'relative' },
  zoneLabel: {
    position: 'absolute', bottom: 8,
    paddingHorizontal: 14, paddingVertical: 5,
    borderRadius: 20, borderWidth: 1,
    borderColor: '#00C8FF33', backgroundColor: '#00C8FF12',
  },
  zoneLabelText: { fontSize: 11, color: '#00C8FF', fontWeight: '700', letterSpacing: 0.8 },
  dotsRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 5, paddingVertical: 12,
  },
  dot: { height: 6, borderRadius: 3 },
  inputCard: {
    marginHorizontal: 16, marginTop: 8,
    backgroundColor: '#12122A', borderRadius: 20,
    padding: 20, borderWidth: 1, borderColor: '#1E1E3A',
  },
  stepLabel: { fontSize: 26, fontWeight: '900', color: '#fff' },
  stepUnit:  { fontSize: 15, color: '#666', fontWeight: '500' },
  stepTip:   { fontSize: 13, color: '#888', marginBottom: 18, lineHeight: 18 },
  requiredBadge: {
    backgroundColor: '#FF6B2B22', borderRadius: 8,
    paddingHorizontal: 8, paddingVertical: 2,
    borderWidth: 1, borderColor: '#FF6B2B44',
  },
  requiredText: { fontSize: 10, color: '#FF6B2B', fontWeight: '700' },
  inputWrapper: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1.5, borderRadius: 14, borderColor: '#00C8FF55',
    backgroundColor: '#12122A', overflow: 'hidden',
  },
  numberInput: {
    flex: 1, fontSize: 36, fontWeight: '900', color: '#00C8FF',
    paddingHorizontal: 20, paddingVertical: 14, letterSpacing: 1,
  },
  unitSuffix: { fontSize: 18, color: '#555', marginRight: 16, fontWeight: '600' },
  rowBtns: { flexDirection: 'row', gap: 10, marginTop: 20 },
  btnPrimary: {
    flex: 2, borderRadius: 14, paddingVertical: 15,
    alignItems: 'center', justifyContent: 'center',
  },
  btnPrimaryText: { fontWeight: '800', fontSize: 15, color: '#fff' },
  btnSecondary: {
    flex: 1, borderRadius: 14, paddingVertical: 15,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: '#222244',
  },
  btnSecondaryText: { color: '#666', fontWeight: '600' },
  reviewTitle:    { fontSize: 22, fontWeight: '900', color: '#fff', marginBottom: 6 },
  reviewSubtitle: { fontSize: 13, color: '#888', marginBottom: 16 },
  summaryLabel:   { fontSize: 13, fontWeight: '700', color: '#555', letterSpacing: 0.5 },
  summaryCard:    { borderRadius: 14, borderWidth: 1, borderColor: '#1E1E3A', padding: 14, backgroundColor: '#0D0D22' },
  summaryBadge: {
    borderRadius: 10, borderWidth: 1,
    borderColor: '#FF6B2B55', backgroundColor: '#FF6B2B22',
    paddingHorizontal: 12, paddingVertical: 8,
    alignItems: 'center', minWidth: 72,
  },
  notesLabel: { fontSize: 12, color: '#666', marginTop: 16, marginBottom: 6 },
  notesInput: {
    borderWidth: 1, borderRadius: 10, borderColor: '#333355',
    backgroundColor: '#12122A', color: '#ddd',
    paddingHorizontal: 12, paddingVertical: 10,
    fontSize: 14, minHeight: 56,
  },
});
