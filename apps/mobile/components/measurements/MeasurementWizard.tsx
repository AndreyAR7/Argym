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

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

// ── Step definitions ───────────────────────────────────────────────────────
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

// ── Zone quick-selector items ──────────────────────────────────────────────
const QUICK_ZONES: { label: string; zone: MeasureZone; stepIdx: number }[] = [
  { label: 'Peso',      zone: 'weight',  stepIdx: 0  },
  { label: 'Talla',     zone: 'height',  stepIdx: 1  },
  { label: 'Cuello',    zone: 'neck',    stepIdx: 3  },
  { label: 'Hombros',   zone: 'shoulder',stepIdx: 4  },
  { label: 'Pecho',     zone: 'chest',   stepIdx: 5  },
  { label: 'Cintura',   zone: 'waist',   stepIdx: 6  },
  { label: 'Abdomen',   zone: 'abdomen', stepIdx: 7  },
  { label: 'Cadera',    zone: 'hip',     stepIdx: 8  },
  { label: 'Brazos',    zone: 'arm',     stepIdx: 9  },
  { label: 'Muslos',    zone: 'thigh',   stepIdx: 10 },
  { label: 'Pantorrillas', zone: 'calf', stepIdx: 11 },
];

// ── Summary card ───────────────────────────────────────────────────────────
function SummaryCard({ values, steps }: {
  values: Values;
  steps: Array<StepDef & { label: string }>;
}) {
  const filled = steps.filter(s => values[s.key as string]);
  if (!filled.length) return null;
  return (
    <View style={styles.summaryGrid}>
      {filled.map(s => (
        <View key={s.key} style={styles.summaryBadge}>
          <Text style={styles.summaryVal}>{values[s.key as string]}</Text>
          <Text style={styles.summaryUnit}>{s.label} ({s.unit})</Text>
        </View>
      ))}
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

export function MeasurementWizard({ visible, onClose, onSave, gender: genderProp, existing }: Props) {
  const { t } = useTranslation();
  const T = useTheme();

  const [step, setStep]           = useState(0);
  const [values, setValues]       = useState<Values>({});
  const [notes, setNotes]         = useState('');
  const [saving, setSaving]       = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [gender, setGender]       = useState<Gender | null>(genderProp);
  const inputRef = useRef<TextInput>(null);

  const steps = STEP_DEFS.map(s => ({
    ...s,
    label: t(`measurements.steps.${s.key}.label`),
    tip:   t(`measurements.steps.${s.key}.tip`),
  }));

  const current = steps[step];
  const completedZones = steps
    .slice(0, step)
    .filter(s => values[s.key as string])
    .map(s => s.zone) as MeasureZone[];

  const progress = (step + 1) / steps.length;

  const reset = useCallback(() => {
    setStep(0); setValues({}); setNotes('');
    setSaving(false); setShowSummary(false);
  }, []);

  const handleOpen = useCallback(() => {
    if (!gender && genderProp) setGender(genderProp);
    if (existing) {
      const pre: Values = {};
      for (const s of STEP_DEFS) {
        const v = (existing as any)[s.key];
        if (v != null) pre[s.key as string] = String(v);
      }
      setValues(pre);
      setNotes(existing.notes ?? '');
    }
    setTimeout(() => inputRef.current?.focus(), 450);
  }, [existing, gender, genderProp]);

  const handleNext = () => {
    if (step < steps.length - 1) {
      setStep(s => s + 1);
      setTimeout(() => inputRef.current?.focus(), 200);
    } else {
      setShowSummary(true);
    }
  };

  const handleBack = () => {
    if (showSummary) { setShowSummary(false); return; }
    if (step > 0) { setStep(s => s - 1); return; }
    reset(); onClose();
  };

  const handleSkip = () => {
    const next = { ...values };
    delete next[current.key as string];
    setValues(next);
    handleNext();
  };

  const handleSave = async () => {
    const hasAny = STEP_DEFS.some(s => values[s.key as string]);
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
      reset(); onClose();
    } catch (e: any) {
      Alert.alert(t('common.error'), e.message ?? t('errors.generic'));
    } finally {
      setSaving(false);
    }
  };

  // Silhouette dimensions — ~35% of available width
  const silW = Math.round((SCREEN_W - 44) * 0.35);
  const silH = Math.round(silW * (430 / 160));

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={() => { reset(); onClose(); }}
      onShow={handleOpen}
    >
      <KeyboardAvoidingView
        style={styles.root}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* ── Header ── */}
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>MEDICIÓN CORPORAL</Text>
            <Text style={styles.headerSub}>
              {showSummary ? 'Revisión final' : `Paso ${step + 1} de ${steps.length}`}
            </Text>
          </View>
          <TouchableOpacity onPress={() => { reset(); onClose(); }} style={styles.closeBtn}>
            <Text style={styles.closeTxt}>✕</Text>
          </TouchableOpacity>
        </View>

        {/* ── Progress bar ── */}
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
        </View>

        {/* ── Gender tabs ── */}
        <View style={styles.genderRow}>
          <TouchableOpacity
            style={[styles.genderTab, gender !== 'female' && styles.genderTabActive]}
            onPress={() => setGender('male')}
          >
            <Text style={[styles.genderIcon, gender !== 'female' && styles.genderIconActive]}>♂</Text>
            <Text style={[styles.genderLabel, gender !== 'female' && styles.genderLabelActive]}>Masculino</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.genderTab, gender === 'female' && styles.genderTabActive]}
            onPress={() => setGender('female')}
          >
            <Text style={[styles.genderIcon, gender === 'female' && styles.genderIconActive]}>♀</Text>
            <Text style={[styles.genderLabel, gender === 'female' && styles.genderLabelActive]}>Femenino</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {showSummary ? (
            /* ── Summary view ── */
            <View style={styles.summaryContainer}>
              <Text style={styles.reviewTitle}>{t('measurements.wizard.reviewTitle')}</Text>
              <Text style={styles.reviewSub}>{t('measurements.wizard.reviewSubtitle')}</Text>
              <SummaryCard values={values} steps={steps} />
              <Text style={styles.notesLabel}>{t('measurements.wizard.notes')}</Text>
              <TextInput
                value={notes}
                onChangeText={setNotes}
                placeholder={t('measurements.wizard.notesPlaceholder')}
                placeholderTextColor="#444"
                style={styles.notesInput}
                multiline
                numberOfLines={3}
              />
            </View>
          ) : (
            /* ── Step view (side-by-side) ── */
            <View style={styles.stepRow}>
              {/* Left: silhouette */}
              <View style={styles.silhouetteCol}>
                <BodySilhouette
                  gender={gender}
                  activeZone={current.zone}
                  completedZones={completedZones}
                  width={silW}
                  height={silH}
                />
              </View>

              {/* Right: measurement info */}
              <View style={styles.infoCol}>
                <View style={styles.zonePill}>
                  <Text style={styles.zonePillTxt}>{current.zone.toUpperCase()}</Text>
                </View>

                <Text style={styles.measureName}>{current.label}</Text>
                {current.required && (
                  <View style={styles.reqBadge}>
                    <Text style={styles.reqTxt}>REQUERIDO</Text>
                  </View>
                )}
                <Text style={styles.measureTip}>{current.tip}</Text>

                {/* Input */}
                <View style={styles.inputRow}>
                  <TextInput
                    ref={inputRef}
                    value={values[current.key as string] ?? ''}
                    onChangeText={v => setValues({ ...values, [current.key as string]: v })}
                    keyboardType="decimal-pad"
                    placeholder="0.0"
                    placeholderTextColor="#334"
                    style={styles.numInput}
                    returnKeyType="next"
                    onSubmitEditing={handleNext}
                  />
                  <Text style={styles.unitTxt}>{current.unit}</Text>
                </View>
              </View>
            </View>
          )}

          {/* ── Quick zone selector ── */}
          {!showSummary && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.quickRow}
              contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}
            >
              {QUICK_ZONES.map(qz => {
                const isActive = current.zone === qz.zone;
                const isDone   = completedZones.includes(qz.zone);
                return (
                  <TouchableOpacity
                    key={qz.zone}
                    style={[
                      styles.quickChip,
                      isActive && styles.quickChipActive,
                      isDone   && !isActive && styles.quickChipDone,
                    ]}
                    onPress={() => setStep(qz.stepIdx)}
                  >
                    <Text style={[
                      styles.quickChipTxt,
                      isActive && styles.quickChipTxtActive,
                    ]}>{qz.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}
        </ScrollView>

        {/* ── Bottom navigation ── */}
        <View style={styles.navRow}>
          <TouchableOpacity onPress={handleBack} style={styles.navBtnGhost}>
            <Text style={styles.navGhostTxt}>← Atrás</Text>
          </TouchableOpacity>

          {!showSummary && !current.required && (
            <TouchableOpacity onPress={handleSkip} style={styles.navBtnGhost}>
              <Text style={styles.navGhostTxt}>Omitir</Text>
            </TouchableOpacity>
          )}

          {showSummary ? (
            <TouchableOpacity
              onPress={handleSave}
              disabled={saving}
              style={[styles.navBtnPrimary, { backgroundColor: '#E8705A' }]}
            >
              {saving
                ? <ActivityIndicator color="#fff" size="small" />
                : <Text style={styles.navPrimaryTxt}>Guardar</Text>}
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              onPress={handleNext}
              style={[
                styles.navBtnPrimary,
                { opacity: values[current.key as string] ? 1 : 0.65 },
              ]}
            >
              <Text style={styles.navPrimaryTxt}>
                {step < steps.length - 1 ? 'Siguiente →' : 'Revisar →'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0B0F14' },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 20, paddingBottom: 10,
  },
  headerTitle: { fontSize: 12, fontWeight: '800', color: '#00D4FF', letterSpacing: 1.6 },
  headerSub:   { fontSize: 13, fontWeight: '500', color: '#556070', marginTop: 2 },
  closeBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  closeTxt: { fontSize: 18, color: '#556070' },

  // Progress bar
  progressTrack: { height: 3, backgroundColor: '#121821', marginHorizontal: 20 },
  progressFill:  { height: 3, backgroundColor: '#00D4FF', borderRadius: 2 },

  // Gender tabs
  genderRow: {
    flexDirection: 'row', marginHorizontal: 20, marginTop: 14,
    backgroundColor: '#121821', borderRadius: 12, padding: 4,
  },
  genderTab: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 8, borderRadius: 9, gap: 6,
  },
  genderTabActive: { backgroundColor: '#1C2D3F' },
  genderIcon: { fontSize: 16, color: '#445566' },
  genderIconActive: { color: '#00D4FF' },
  genderLabel: { fontSize: 13, fontWeight: '600', color: '#445566' },
  genderLabelActive: { color: '#00D4FF' },

  // Scroll
  scroll: { flexGrow: 1, paddingBottom: 24 },

  // Step row (side by side)
  stepRow: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 16,
    gap: 12,
    minHeight: 280,
  },
  silhouetteCol: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0D1520',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 8,
    flex: 0,
  },
  infoCol: {
    flex: 1,
    justifyContent: 'center',
    paddingVertical: 8,
  },

  // Zone pill
  zonePill: {
    alignSelf: 'flex-start',
    backgroundColor: '#00D4FF18',
    borderWidth: 1, borderColor: '#00D4FF33',
    borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4,
    marginBottom: 10,
  },
  zonePillTxt: { fontSize: 10, color: '#00D4FF', fontWeight: '700', letterSpacing: 1 },

  // Measurement name
  measureName: { fontSize: 24, fontWeight: '900', color: '#FFFFFF', marginBottom: 4 },
  reqBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#E8705A22', borderRadius: 8,
    borderWidth: 1, borderColor: '#E8705A44',
    paddingHorizontal: 8, paddingVertical: 2, marginBottom: 6,
  },
  reqTxt: { fontSize: 9, color: '#E8705A', fontWeight: '700', letterSpacing: 0.8 },
  measureTip: { fontSize: 12, color: '#7A8A9A', lineHeight: 17, marginBottom: 16 },

  // Number input
  inputRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#121821',
    borderWidth: 1.5, borderColor: '#00D4FF44', borderRadius: 12,
    overflow: 'hidden',
  },
  numInput: {
    flex: 1, fontSize: 30, fontWeight: '800', color: '#00D4FF',
    paddingHorizontal: 14, paddingVertical: 12, letterSpacing: 0.5,
  },
  unitTxt: { fontSize: 14, color: '#445566', marginRight: 14, fontWeight: '600' },

  // Quick zone row
  quickRow: { marginTop: 16 },
  quickChip: {
    paddingHorizontal: 12, paddingVertical: 7,
    borderRadius: 20, borderWidth: 1,
    borderColor: '#1E2D3F', backgroundColor: '#0D1520',
  },
  quickChipActive: { borderColor: '#00D4FF', backgroundColor: '#00D4FF18' },
  quickChipDone:   { borderColor: '#1E4A72', backgroundColor: '#1E4A7222' },
  quickChipTxt: { fontSize: 12, color: '#445566', fontWeight: '600' },
  quickChipTxtActive: { color: '#00D4FF' },

  // Summary
  summaryContainer: { margin: 16 },
  reviewTitle:  { fontSize: 22, fontWeight: '900', color: '#fff', marginBottom: 6 },
  reviewSub:    { fontSize: 13, color: '#556070', marginBottom: 20 },
  summaryGrid:  { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  summaryBadge: {
    borderRadius: 10, borderWidth: 1,
    borderColor: '#E8705A44', backgroundColor: '#E8705A18',
    paddingHorizontal: 12, paddingVertical: 8,
    alignItems: 'center', minWidth: 76,
  },
  summaryVal:  { fontSize: 18, fontWeight: '900', color: '#E8705A' },
  summaryUnit: { fontSize: 9, color: '#667788', marginTop: 2 },
  notesLabel:  { fontSize: 12, color: '#556070', marginBottom: 6 },
  notesInput: {
    borderWidth: 1, borderRadius: 10, borderColor: '#1E2D3F',
    backgroundColor: '#121821', color: '#cdd',
    paddingHorizontal: 12, paddingVertical: 10,
    fontSize: 14, minHeight: 70,
  },

  // Nav row
  navRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14,
    borderTopWidth: 1, borderTopColor: '#121821',
    gap: 8,
  },
  navBtnGhost: {
    flex: 1, paddingVertical: 14, alignItems: 'center', justifyContent: 'center',
    borderRadius: 14, borderWidth: 1, borderColor: '#1E2D3F',
  },
  navGhostTxt:   { color: '#556070', fontWeight: '600', fontSize: 14 },
  navBtnPrimary: {
    flex: 2, paddingVertical: 14, alignItems: 'center', justifyContent: 'center',
    borderRadius: 14, backgroundColor: '#00D4FF',
  },
  navPrimaryTxt: { color: '#0B0F14', fontWeight: '800', fontSize: 15 },
});
