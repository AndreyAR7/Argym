import React, { useState, useRef, useCallback } from 'react';
import {
  Modal, View, Text, TouchableOpacity, TextInput,
  StyleSheet, ScrollView, KeyboardAvoidingView, Platform,
  Alert, ActivityIndicator, Dimensions,
} from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import { BodySilhouette, MeasureZone } from './BodySilhouette';
import type { BodyMeasurement } from '@/types/progress';
import type { Gender } from '@/lib/types';

const { height: SCREEN_H, width: SCREEN_W } = Dimensions.get('window');

// ── Step definitions ───────────────────────────────────────────
interface Step {
  key: keyof Omit<BodyMeasurement, 'id' | 'client_id' | 'tenant_id' | 'measured_at' | 'created_at' | 'notes'>;
  label: string;
  unit: string;
  zone: MeasureZone;
  tip: string;
  required?: boolean;
}

const STEPS: Step[] = [
  { key: 'weight_kg',    label: 'Peso',          unit: 'kg', zone: 'weight',   tip: 'Párate en la báscula sin zapatos, en ayunas si es posible', required: true },
  { key: 'height_cm',   label: 'Estatura',       unit: 'cm', zone: 'height',   tip: 'Párate erguido contra la pared, sin zapatos' },
  { key: 'neck_cm',     label: 'Cuello',         unit: 'cm', zone: 'neck',     tip: 'Mide justo debajo de la laringe (nuez de Adán), cinta horizontal' },
  { key: 'shoulder_cm', label: 'Hombros',        unit: 'cm', zone: 'shoulder', tip: 'Mide el punto más ancho de hombro a hombro, brazos relajados' },
  { key: 'chest_cm',    label: 'Pecho',          unit: 'cm', zone: 'chest',    tip: 'Mide a la altura de las axilas, exhalando suavemente' },
  { key: 'waist_cm',    label: 'Cintura',        unit: 'cm', zone: 'waist',    tip: 'Mide la parte más estrecha del torso, entre costillas y cadera' },
  { key: 'abdomen_cm',  label: 'Abdomen',        unit: 'cm', zone: 'abdomen',  tip: 'Mide a nivel del ombligo, sin meter la barriga' },
  { key: 'hip_cm',      label: 'Cadera',         unit: 'cm', zone: 'hip',      tip: 'Mide el punto más ancho de la cadera y glúteos' },
  { key: 'arm_cm',      label: 'Brazo (bíceps)', unit: 'cm', zone: 'arm',      tip: 'Bíceps contraído, a la mitad entre hombro y codo' },
  { key: 'thigh_cm',    label: 'Muslo',          unit: 'cm', zone: 'thigh',    tip: 'A la mitad del muslo, de pie, peso distribuido en ambas piernas' },
  { key: 'calf_cm',     label: 'Pantorrilla',    unit: 'cm', zone: 'calf',     tip: 'En el punto más ancho de la pantorrilla, de pie' },
];

type Values = Record<string, string>;

// ── Progress dots ──────────────────────────────────────────────
function ProgressDots({ current, total, T }: { current: number; total: number; T: any }) {
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

// ── Summary card ───────────────────────────────────────────────
function SummaryCard({ values, T }: { values: Values; T: any }) {
  const filled = STEPS.filter((s) => values[s.key]);
  if (!filled.length) return null;
  return (
    <View style={[styles.summaryCard, { backgroundColor: T.bgSurface ?? T.bg, borderColor: T.border }]}>
      <Text style={{ fontSize: 13, fontWeight: '700', color: T.textMuted, marginBottom: 10, letterSpacing: 0.5 }}>
        RESUMEN
      </Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {filled.map((s) => (
          <View key={s.key} style={[styles.summaryBadge, { backgroundColor: '#FF6B2B22', borderColor: '#FF6B2B55' }]}>
            <Text style={{ fontSize: 16, fontWeight: '900', color: '#FF6B2B' }}>{values[s.key]}</Text>
            <Text style={{ fontSize: 9, color: T.textMuted, marginTop: 1 }}>{s.label} ({s.unit})</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

// ── Main wizard ────────────────────────────────────────────────
interface Props {
  visible: boolean;
  onClose: () => void;
  onSave: (m: Partial<BodyMeasurement> & { notes?: string | null }) => Promise<void>;
  gender: Gender | null;
  existing: BodyMeasurement | null;
}

export function MeasurementWizard({ visible, onClose, onSave, gender, existing }: Props) {
  const T = useTheme();
  const [step, setStep] = useState(0);
  const [values, setValues] = useState<Values>({});
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const inputRef = useRef<TextInput>(null);

  const current = STEPS[step];
  const completedZones = STEPS.slice(0, step)
    .filter((s) => values[s.key])
    .map((s) => s.zone) as MeasureZone[];

  const reset = useCallback(() => {
    setStep(0);
    setValues({});
    setNotes('');
    setSaving(false);
    setShowSummary(false);
  }, []);

  const handleOpen = useCallback(() => {
    // Pre-fill from existing measurement
    if (existing) {
      const preValues: Values = {};
      for (const s of STEPS) {
        const v = (existing as any)[s.key];
        if (v != null) preValues[s.key] = String(v);
      }
      setValues(preValues);
      setNotes(existing.notes ?? '');
    }
    setTimeout(() => inputRef.current?.focus(), 400);
  }, [existing]);

  const handleNext = () => {
    if (step < STEPS.length - 1) {
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
    const next: Values = { ...values };
    delete next[current.key as string];
    setValues(next);
    handleNext();
  };

  const handleSave = async () => {
    const hasAny = STEPS.some((s) => values[s.key]);
    if (!hasAny) { Alert.alert('Sin datos', 'Ingresa al menos una medida para guardar.'); return; }
    setSaving(true);
    try {
      const payload: Partial<BodyMeasurement> & { notes?: string | null } = { notes: notes || null };
      for (const s of STEPS) {
        const raw = values[s.key];
        (payload as any)[s.key] = raw ? parseFloat(raw) : null;
      }
      await onSave(payload);
      reset();
      onClose();
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'No se pudo guardar.');
    } finally {
      setSaving(false);
    }
  };

  // Body section height (40% of screen)
  const bodyH = Math.round(SCREEN_H * 0.42);
  const bodyW = Math.round(bodyH * (160 / 430));

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={() => { reset(); onClose(); }}
      onShow={handleOpen}
    >
      <View style={[styles.root, { backgroundColor: '#0D0D1A' }]}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          {/* ── Header ── */}
          <View style={styles.header}>
            <TouchableOpacity onPress={handleBack} style={styles.headerBtn}>
              <Text style={{ fontSize: 22, color: '#aaa' }}>‹</Text>
            </TouchableOpacity>
            <View style={{ flex: 1, alignItems: 'center' }}>
              <Text style={{ fontSize: 11, fontWeight: '700', color: '#555', letterSpacing: 1.2 }}>
                MEDICIÓN CORPORAL
              </Text>
              {!showSummary && (
                <Text style={{ fontSize: 13, fontWeight: '600', color: '#888', marginTop: 2 }}>
                  Paso {step + 1} de {STEPS.length}
                </Text>
              )}
            </View>
            <TouchableOpacity onPress={() => { reset(); onClose(); }} style={styles.headerBtn}>
              <Text style={{ fontSize: 22, color: '#aaa' }}>✕</Text>
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

              {/* Gradient overlay hint at bottom */}
              {!showSummary && (
                <View style={[styles.zoneLabel, { backgroundColor: current.zone === 'weight' || current.zone === 'height' ? '#00C8FF22' : '#00C8FF22' }]}>
                  <Text style={{ fontSize: 11, color: '#00C8FF', fontWeight: '700', letterSpacing: 0.8 }}>
                    ● {STEPS[step].label.toUpperCase()}
                  </Text>
                </View>
              )}
            </View>

            {/* ── Progress dots ── */}
            {!showSummary && (
              <ProgressDots current={step} total={STEPS.length} T={T} />
            )}

            {/* ── Summary view ── */}
            {showSummary ? (
              <View style={styles.inputCard}>
                <Text style={{ fontSize: 22, fontWeight: '900', color: '#fff', marginBottom: 6 }}>
                  ¡Listo! Revisa tus medidas
                </Text>
                <Text style={{ fontSize: 13, color: '#888', marginBottom: 16 }}>
                  Confirma los datos antes de guardar
                </Text>
                <SummaryCard values={values} T={T} />
                <Text style={{ fontSize: 12, color: '#666', marginTop: 16, marginBottom: 6 }}>Notas (opcional)</Text>
                <TextInput
                  value={notes}
                  onChangeText={setNotes}
                  placeholder="Ej: tomé las medidas en ayunas..."
                  placeholderTextColor="#555"
                  style={[styles.notesInput, { color: '#ddd', borderColor: '#333355', backgroundColor: '#12122A' }]}
                  multiline
                  numberOfLines={2}
                />
                <View style={{ flexDirection: 'row', gap: 12, marginTop: 20 }}>
                  <TouchableOpacity
                    onPress={() => { setShowSummary(false); setStep(STEPS.length - 1); }}
                    style={[styles.btnSecondary, { borderColor: '#333355' }]}
                  >
                    <Text style={{ color: '#aaa', fontWeight: '600' }}>← Editar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={handleSave}
                    disabled={saving}
                    style={[styles.btnPrimary, { backgroundColor: '#FF6B2B' }]}
                  >
                    {saving
                      ? <ActivityIndicator color="#fff" size="small" />
                      : <Text style={{ color: '#fff', fontWeight: '800', fontSize: 15 }}>Guardar medición</Text>
                    }
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              // ── Step input ──
              <View style={styles.inputCard}>
                <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6, marginBottom: 4 }}>
                  <Text style={{ fontSize: 26, fontWeight: '900', color: '#fff' }}>
                    {current.label}
                  </Text>
                  <Text style={{ fontSize: 15, color: '#666', fontWeight: '500' }}>({current.unit})</Text>
                  {current.required && (
                    <View style={styles.requiredBadge}>
                      <Text style={{ fontSize: 10, color: '#FF6B2B', fontWeight: '700' }}>requerido</Text>
                    </View>
                  )}
                </View>

                <Text style={{ fontSize: 13, color: '#888', marginBottom: 18, lineHeight: 18 }}>
                  {current.tip}
                </Text>

                {/* Numeric input */}
                <View style={[styles.inputWrapper, { borderColor: '#00C8FF55', backgroundColor: '#12122A' }]}>
                  <TextInput
                    ref={inputRef}
                    value={values[current.key] ?? ''}
                    onChangeText={(v) => setValues({ ...values, [current.key]: v })}
                    keyboardType="decimal-pad"
                    placeholder="0.0"
                    placeholderTextColor="#444"
                    style={[styles.numberInput, { color: '#00C8FF' }]}
                    returnKeyType="next"
                    onSubmitEditing={handleNext}
                  />
                  <Text style={{ fontSize: 18, color: '#555', marginRight: 16, fontWeight: '600' }}>
                    {current.unit}
                  </Text>
                </View>

                {/* Navigation buttons */}
                <View style={{ flexDirection: 'row', gap: 10, marginTop: 20 }}>
                  {!current.required && (
                    <TouchableOpacity onPress={handleSkip} style={[styles.btnSecondary, { borderColor: '#222244' }]}>
                      <Text style={{ color: '#666', fontWeight: '600' }}>Omitir</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    onPress={handleNext}
                    style={[
                      styles.btnPrimary,
                      { backgroundColor: values[current.key] ? '#00C8FF' : '#00C8FF66' },
                      current.required ? { flex: 1 } : {},
                    ]}
                  >
                    <Text style={{ color: '#0D0D1A', fontWeight: '800', fontSize: 15 }}>
                      {step < STEPS.length - 1 ? 'Siguiente →' : 'Ver resumen →'}
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
  root: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 8, paddingTop: 16, paddingBottom: 8,
  },
  headerBtn: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  scroll: { flexGrow: 1, paddingBottom: 40 },
  bodyArea: {
    alignItems: 'center', justifyContent: 'center',
    position: 'relative',
  },
  zoneLabel: {
    position: 'absolute', bottom: 8,
    paddingHorizontal: 14, paddingVertical: 5,
    borderRadius: 20, borderWidth: 1, borderColor: '#00C8FF33',
  },
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
  requiredBadge: {
    backgroundColor: '#FF6B2B22', borderRadius: 8,
    paddingHorizontal: 8, paddingVertical: 2,
    borderWidth: 1, borderColor: '#FF6B2B44',
  },
  inputWrapper: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1.5, borderRadius: 14,
    overflow: 'hidden',
  },
  numberInput: {
    flex: 1, fontSize: 36, fontWeight: '900',
    paddingHorizontal: 20, paddingVertical: 14,
    letterSpacing: 1,
  },
  btnPrimary: {
    flex: 2, borderRadius: 14, paddingVertical: 15,
    alignItems: 'center', justifyContent: 'center',
  },
  btnSecondary: {
    flex: 1, borderRadius: 14, paddingVertical: 15,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1,
  },
  summaryCard: {
    borderRadius: 14, borderWidth: 1, padding: 14,
  },
  summaryBadge: {
    borderRadius: 10, borderWidth: 1,
    paddingHorizontal: 12, paddingVertical: 8,
    alignItems: 'center', minWidth: 72,
  },
  notesInput: {
    borderWidth: 1, borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 10,
    fontSize: 14, minHeight: 56,
  },
});
