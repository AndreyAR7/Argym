import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, StatusBar,
  Alert, ActivityIndicator, Modal, TextInput, KeyboardAvoidingView, Platform, Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/hooks/useTheme';
import { ClientTopBar } from '@/components/client/ClientTopBar';
import { useAuthStore } from '@/store/auth.store';
import { useProgressStore } from '@/store/progress.store';
import { computeBodyComposition, getCurrentWeekRange } from '@/services/progress.service';
import type { BodyMeasurement } from '@/types/progress';

const SCREEN_W = Dimensions.get('window').width;
const CHART_W = SCREEN_W - 64; // 16 scroll + 16 card * 2

// ─── Tab config ───────────────────────────────────────────────
const TABS = [
  { id: 'routines', label: '💪 Rutinas' },
  { id: 'measures', label: '📏 Medidas' },
  { id: 'streak',   label: '🔥 Racha'   },
] as const;
type TabId = typeof TABS[number]['id'];

const DAY_ABBR = ['D', 'L', 'M', 'X', 'J', 'V', 'S'];

// ─── Bar Chart ────────────────────────────────────────────────
function BarChart({ data, T }: {
  data: { label: string; pct: number }[];
  T: any;
}) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', height: 90, gap: 3 }}>
      {data.map((d, i) => {
        const h = Math.max(3, (d.pct / 100) * 64);
        const color = d.pct === 100 ? T.green : d.pct > 0 ? T.orange : T.border;
        return (
          <View key={i} style={{ flex: 1, alignItems: 'center' }}>
            {d.pct > 0 && (
              <Text style={{ fontSize: 8, color: T.textMuted, marginBottom: 2 }}>{d.pct}%</Text>
            )}
            <View style={{ flex: 1, justifyContent: 'flex-end', width: '80%' }}>
              <View style={{ height: h, backgroundColor: color, borderRadius: 3 }} />
            </View>
            <Text style={{ fontSize: 10, color: T.textMuted, marginTop: 3 }}>{d.label}</Text>
          </View>
        );
      })}
    </View>
  );
}

// ─── Line Sparkline (pure RN, no SVG) ────────────────────────
function Sparkline({ values, color }: { values: number[]; color: string }) {
  if (values.length < 2) return null;
  const w = CHART_W - 32;
  const h = 70;
  const pad = 8;
  const maxV = Math.max(...values);
  const minV = Math.min(...values);
  const range = maxV - minV || 1;

  const pts = values.map((v, i) => ({
    x: (i / (values.length - 1)) * w,
    y: pad + (h - pad * 2) - ((v - minV) / range) * (h - pad * 2),
  }));

  return (
    <View style={{ width: w, height: h, position: 'relative', alignSelf: 'center' }}>
      {pts.slice(1).map((p, i) => {
        const prev = pts[i];
        const dx = p.x - prev.x;
        const dy = p.y - prev.y;
        const len = Math.sqrt(dx * dx + dy * dy);
        const angle = Math.atan2(dy, dx) * (180 / Math.PI);
        return (
          <View
            key={`l${i}`}
            style={{
              position: 'absolute',
              left: (prev.x + p.x) / 2 - len / 2,
              top: (prev.y + p.y) / 2 - 1,
              width: len,
              height: 2,
              backgroundColor: color + 'AA',
              transform: [{ rotate: `${angle}deg` }],
            }}
          />
        );
      })}
      {pts.map((p, i) => (
        <View
          key={`d${i}`}
          style={{
            position: 'absolute',
            left: p.x - 5,
            top: p.y - 5,
            width: 10,
            height: 10,
            borderRadius: 5,
            backgroundColor: i === pts.length - 1 ? color : color + '66',
            borderWidth: i === pts.length - 1 ? 2 : 0,
            borderColor: '#fff',
          }}
        />
      ))}
    </View>
  );
}

// ─── Streak Calendar ──────────────────────────────────────────
function StreakCalendar({ activeDates, T }: { activeDates: string[]; T: any }) {
  const today = new Date();
  // Align to Monday of current week, go back 4 more weeks = 5 weeks total
  const dow = today.getDay(); // 0=Sun
  const daysFromMon = dow === 0 ? 6 : dow - 1;
  const startMon = new Date(today);
  startMon.setDate(today.getDate() - daysFromMon - 28);

  const activeSet = new Set(activeDates);
  const weeks: { date: string; dayNum: number; active: boolean; future: boolean }[][] = [];

  for (let w = 0; w < 5; w++) {
    const week = [];
    for (let d = 0; d < 7; d++) {
      const cell = new Date(startMon);
      cell.setDate(startMon.getDate() + w * 7 + d);
      const dateStr = cell.toISOString().split('T')[0];
      week.push({
        date: dateStr,
        dayNum: cell.getDate(),
        active: cell <= today && activeSet.has(dateStr),
        future: cell > today,
      });
    }
    weeks.push(week);
  }

  const dayLabels = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

  return (
    <View>
      <View style={{ flexDirection: 'row', marginBottom: 6 }}>
        {dayLabels.map((d) => (
          <View key={d} style={{ flex: 1, alignItems: 'center' }}>
            <Text style={{ fontSize: 10, color: T.textMuted, fontWeight: '600' }}>{d}</Text>
          </View>
        ))}
      </View>
      {weeks.map((week, wi) => (
        <View key={wi} style={{ flexDirection: 'row', marginBottom: 5 }}>
          {week.map((day) => (
            <View key={day.date} style={{ flex: 1, alignItems: 'center' }}>
              <View style={[
                styles.calCell,
                day.future
                  ? { backgroundColor: 'transparent', borderColor: 'transparent' }
                  : day.active
                  ? { backgroundColor: T.green + 'CC', borderColor: T.green + '55' }
                  : { backgroundColor: T.bgSurface, borderColor: T.border },
              ]}>
                {!day.future && (
                  <Text style={{ fontSize: 9, color: day.active ? '#fff' : T.textMuted, fontWeight: day.active ? '700' : '400' }}>
                    {day.dayNum}
                  </Text>
                )}
              </View>
            </View>
          ))}
        </View>
      ))}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 }}>
        <View style={{ width: 12, height: 12, borderRadius: 3, backgroundColor: T.green }} />
        <Text style={{ fontSize: 11, color: T.textMuted }}>Día activo</Text>
        <View style={{ width: 12, height: 12, borderRadius: 3, backgroundColor: T.bgSurface, borderWidth: 1, borderColor: T.border }} />
        <Text style={{ fontSize: 11, color: T.textMuted }}>Sin actividad</Text>
      </View>
    </View>
  );
}

// ─── Add / Edit Measurement Modal ────────────────────────────
function AddMeasurementModal({ visible, onClose, onSave, lastHeight, existing, T }: {
  visible: boolean;
  onClose: () => void;
  onSave: (m: Partial<BodyMeasurement>) => Promise<void>;
  lastHeight: string;
  existing: BodyMeasurement | null;
  T: any;
}) {
  const [weight, setWeight] = useState('');
  const [height, setHeight] = useState(lastHeight);
  const [bodyFat, setBodyFat] = useState('');
  const [waist, setWaist] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible) {
      setWeight(existing?.weight_kg?.toString() ?? '');
      setHeight(existing?.height_cm?.toString() ?? lastHeight);
      setBodyFat(existing?.body_fat_pct?.toString() ?? '');
      setWaist(existing?.waist_cm?.toString() ?? '');
      setNotes(existing?.notes ?? '');
    }
  }, [visible, existing, lastHeight]);

  const handleSave = async () => {
    if (!weight) { Alert.alert('Error', 'El peso es requerido'); return; }
    setSaving(true);
    try {
      await onSave({
        weight_kg: parseFloat(weight),
        height_cm: height ? parseFloat(height) : null,
        body_fat_pct: bodyFat ? parseFloat(bodyFat) : null,
        waist_cm: waist ? parseFloat(waist) : null,
        notes: notes || null,
      });
      setWeight(''); setBodyFat(''); setWaist(''); setNotes('');
      onClose();
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: '#00000088' }}>
          <View style={{ backgroundColor: T.bgCard, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, paddingBottom: 40 }}>
            <Text style={{ fontSize: 18, fontWeight: '800', color: T.text, marginBottom: 20 }}>
              {existing ? '✏️ Editar medición semanal' : '📏 Nueva medición'}
            </Text>

            <View style={{ flexDirection: 'row', gap: 12, marginBottom: 12 }}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.inputLabel, { color: T.textMuted }]}>Peso (kg) *</Text>
                <TextInput
                  value={weight} onChangeText={setWeight}
                  keyboardType="decimal-pad"
                  style={[styles.input, { backgroundColor: T.bg, borderColor: T.border, color: T.text }]}
                  placeholder="75.5" placeholderTextColor={T.textMuted}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.inputLabel, { color: T.textMuted }]}>Altura (cm)</Text>
                <TextInput
                  value={height} onChangeText={setHeight}
                  keyboardType="decimal-pad"
                  style={[styles.input, { backgroundColor: T.bg, borderColor: T.border, color: T.text }]}
                  placeholder="170" placeholderTextColor={T.textMuted}
                />
              </View>
            </View>

            <View style={{ flexDirection: 'row', gap: 12, marginBottom: 12 }}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.inputLabel, { color: T.textMuted }]}>% Grasa corporal</Text>
                <TextInput
                  value={bodyFat} onChangeText={setBodyFat}
                  keyboardType="decimal-pad"
                  style={[styles.input, { backgroundColor: T.bg, borderColor: T.border, color: T.text }]}
                  placeholder="18.0" placeholderTextColor={T.textMuted}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.inputLabel, { color: T.textMuted }]}>Cintura (cm)</Text>
                <TextInput
                  value={waist} onChangeText={setWaist}
                  keyboardType="decimal-pad"
                  style={[styles.input, { backgroundColor: T.bg, borderColor: T.border, color: T.text }]}
                  placeholder="80" placeholderTextColor={T.textMuted}
                />
              </View>
            </View>

            <View style={{ marginBottom: 20 }}>
              <Text style={[styles.inputLabel, { color: T.textMuted }]}>Notas</Text>
              <TextInput
                value={notes} onChangeText={setNotes}
                style={[styles.input, { backgroundColor: T.bg, borderColor: T.border, color: T.text }]}
                placeholder="Opcional..." placeholderTextColor={T.textMuted}
              />
            </View>

            <View style={{ flexDirection: 'row', gap: 12 }}>
              <TouchableOpacity
                onPress={onClose}
                style={{ flex: 1, padding: 14, borderRadius: 10, borderWidth: 1, borderColor: T.border, alignItems: 'center' }}
              >
                <Text style={{ color: T.textMuted, fontWeight: '600' }}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSave} disabled={saving}
                style={{ flex: 1, padding: 14, borderRadius: 10, backgroundColor: T.orange, alignItems: 'center' }}
              >
                {saving
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Text style={{ color: '#fff', fontWeight: '700' }}>Guardar</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Routines Tab ─────────────────────────────────────────────
function RoutinesTab({ T }: { T: any }) {
  const { dailyProgress, routineStreak } = useProgressStore();
  const last7 = dailyProgress.slice(-7);
  const barData = last7.map((d) => ({
    label: DAY_ABBR[new Date(d.date + 'T12:00:00').getDay()],
    pct: d.pct,
  }));

  const activeDays = dailyProgress.filter((d) => d.pct > 0).length;
  const activeDaysWithExercises = dailyProgress.filter((d) => d.pct > 0);
  const avgPct = activeDaysWithExercises.length > 0
    ? Math.round(activeDaysWithExercises.reduce((s, d) => s + d.pct, 0) / activeDaysWithExercises.length)
    : 0;

  return (
    <View style={{ gap: 12 }}>
      <View style={[styles.card, { backgroundColor: T.bgCard, borderColor: T.border }]}>
        <Text style={[styles.cardTitle, { color: T.text }]}>Actividad últimos 7 días</Text>
        <Text style={{ fontSize: 12, color: T.textMuted, marginBottom: 12 }}>
          {barData.filter((d) => d.pct > 0).length} de 7 días activos
        </Text>
        <BarChart data={barData} T={T} />
      </View>

      <View style={{ flexDirection: 'row', gap: 10 }}>
        <View style={[styles.statMini, { backgroundColor: T.bgCard, borderColor: T.border }]}>
          <Text style={{ fontSize: 28, fontWeight: '900', color: T.orange }}>{activeDays}</Text>
          <Text style={{ fontSize: 11, color: T.textMuted, marginTop: 2, textAlign: 'center' }}>Días activos</Text>
          <Text style={{ fontSize: 10, color: T.textMuted, textAlign: 'center' }}>últimas 2 sem.</Text>
        </View>
        <View style={[styles.statMini, { backgroundColor: T.bgCard, borderColor: T.border }]}>
          <Text style={{ fontSize: 28, fontWeight: '900', color: T.green }}>{avgPct}%</Text>
          <Text style={{ fontSize: 11, color: T.textMuted, marginTop: 2, textAlign: 'center' }}>Promedio</Text>
          <Text style={{ fontSize: 10, color: T.textMuted, textAlign: 'center' }}>completado</Text>
        </View>
        <View style={[styles.statMini, { backgroundColor: T.bgCard, borderColor: T.border }]}>
          <Text style={{ fontSize: 26, fontWeight: '900', color: T.orange }}>
            {routineStreak?.currentStreak ?? 0}🔥
          </Text>
          <Text style={{ fontSize: 11, color: T.textMuted, marginTop: 2, textAlign: 'center' }}>Racha actual</Text>
          <Text style={{ fontSize: 10, color: T.textMuted, textAlign: 'center' }}>días seguidos</Text>
        </View>
      </View>
    </View>
  );
}

// ─── Composition metric row ───────────────────────────────────
function CompRow({ label, value, unit, color, T }: {
  label: string; value: string | number | null; unit: string; color: string; T: any;
}) {
  if (value == null) return null;
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8,
      borderBottomWidth: 1, borderColor: T.border + '44' }}>
      <Text style={{ fontSize: 13, color: T.textSecondary }}>{label}</Text>
      <Text style={{ fontSize: 13, fontWeight: '700', color }}>
        {value} <Text style={{ fontWeight: '400', color: T.textMuted }}>{unit}</Text>
      </Text>
    </View>
  );
}

// ─── Medidas Tab ──────────────────────────────────────────────
function MedidasTab({ onAdd, T }: { onAdd: () => void; T: any }) {
  const { measurements, thisWeekMeasurement } = useProgressStore();
  const latest = measurements[0];
  const weekRange = getCurrentWeekRange();
  const hasThisWeek = !!thisWeekMeasurement;

  const comp = latest ? computeBodyComposition(latest) : null;

  const weightHistory = [...measurements]
    .filter((m) => m.weight_kg != null)
    .reverse()
    .slice(-10)
    .map((m) => m.weight_kg as number);

  const firstWeight = weightHistory[0];
  const lastWeight = weightHistory[weightHistory.length - 1];
  const weightChange = weightHistory.length >= 2 && firstWeight != null && lastWeight != null
    ? lastWeight - firstWeight : null;

  return (
    <View style={{ gap: 12 }}>
      {/* Weekly limit notice */}
      {hasThisWeek && (
        <View style={[styles.card, { backgroundColor: T.orange + '12', borderColor: T.orange + '44' }]}>
          <Text style={{ fontSize: 13, color: T.orange, fontWeight: '700', marginBottom: 2 }}>
            📅 Medición de esta semana registrada
          </Text>
          <Text style={{ fontSize: 12, color: T.textMuted }}>
            Semana {weekRange.start} — {weekRange.end}. Puedes editar los datos de esta semana.
          </Text>
        </View>
      )}

      {/* Latest measurement summary */}
      {latest && (
        <View style={[styles.card, { backgroundColor: T.bgCard, borderColor: T.border }]}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <Text style={[styles.cardTitle, { color: T.text }]}>Composición corporal</Text>
            <Text style={{ fontSize: 11, color: T.textMuted }}>
              {new Date(latest.measured_at + 'T12:00:00').toLocaleDateString('es-CR', { day: 'numeric', month: 'short', year: 'numeric' })}
            </Text>
          </View>

          {/* Primary metrics row */}
          <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
            {latest.weight_kg != null && (
              <View style={[styles.measureBadge, { borderColor: T.orange + '44', backgroundColor: T.orange + '18' }]}>
                <Text style={{ fontSize: 22, fontWeight: '900', color: T.orange }}>{latest.weight_kg}</Text>
                <Text style={{ fontSize: 10, color: T.textMuted }}>Peso (kg)</Text>
              </View>
            )}
            {latest.height_cm != null && (
              <View style={[styles.measureBadge, { borderColor: T.accent + '44', backgroundColor: T.accent + '18' }]}>
                <Text style={{ fontSize: 22, fontWeight: '900', color: T.accent }}>{latest.height_cm}</Text>
                <Text style={{ fontSize: 10, color: T.textMuted }}>Estatura (cm)</Text>
              </View>
            )}
            {comp?.bmi != null && comp.bmiCategory && (
              <View style={[styles.measureBadge, { borderColor: comp.bmiCategory.color + '44', backgroundColor: comp.bmiCategory.color + '18' }]}>
                <Text style={{ fontSize: 22, fontWeight: '900', color: comp.bmiCategory.color }}>{comp.bmi}</Text>
                <Text style={{ fontSize: 10, color: T.textMuted }}>IMC</Text>
                <Text style={{ fontSize: 9, color: comp.bmiCategory.color, fontWeight: '700' }}>{comp.bmiCategory.label}</Text>
              </View>
            )}
          </View>

          {/* Detailed composition */}
          {(comp?.fatMassKg != null || comp?.leanMassKg != null || latest.waist_cm != null) && (
            <View>
              <Text style={{ fontSize: 11, fontWeight: '700', color: T.textMuted, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 4 }}>
                Desglose
              </Text>
              <CompRow label="Masa grasa" value={comp?.fatMassKg ?? null} unit="kg" color={T.orange} T={T} />
              <CompRow label="% Grasa corporal" value={comp?.fatPct ?? null} unit="%" color={T.orange} T={T} />
              <CompRow label="Masa magra (músculos + huesos)" value={comp?.leanMassKg ?? null} unit="kg" color={T.green} T={T} />
              <CompRow label="% Masa magra" value={comp?.leanPct ?? null} unit="%" color={T.green} T={T} />
              <CompRow label="Circunferencia de cintura" value={latest.waist_cm} unit="cm" color={T.accent} T={T} />
              <CompRow label="Circunferencia de cadera" value={latest.hip_cm} unit="cm" color={T.accent} T={T} />
              <CompRow label="Circunferencia de brazo" value={latest.arm_cm} unit="cm" color={T.accent} T={T} />
            </View>
          )}
        </View>
      )}

      {/* Weight trend sparkline */}
      {weightHistory.length >= 2 && (
        <View style={[styles.card, { backgroundColor: T.bgCard, borderColor: T.border }]}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <Text style={[styles.cardTitle, { color: T.text }]}>Evolución de peso</Text>
            {weightChange != null && (
              <Text style={{ fontSize: 13, fontWeight: '700', color: weightChange < 0 ? T.green : weightChange > 0 ? T.orange : T.textMuted }}>
                {weightChange > 0 ? '+' : ''}{weightChange.toFixed(1)} kg
              </Text>
            )}
          </View>
          <Sparkline values={weightHistory} color={T.orange} />
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 }}>
            <Text style={{ fontSize: 11, color: T.textMuted }}>Mín: {Math.min(...weightHistory)} kg</Text>
            <Text style={{ fontSize: 11, color: T.textMuted }}>Máx: {Math.max(...weightHistory)} kg</Text>
          </View>
        </View>
      )}

      {/* Add / Edit button */}
      <TouchableOpacity
        onPress={onAdd}
        style={{ backgroundColor: T.orange, borderRadius: 12, padding: 14, alignItems: 'center' }}
      >
        <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15 }}>
          {hasThisWeek ? '✏️ Editar medición de esta semana' : '+ Registrar medición de hoy'}
        </Text>
      </TouchableOpacity>

      {!hasThisWeek && measurements.length > 0 && (
        <View style={{ paddingHorizontal: 4 }}>
          <Text style={{ fontSize: 11, color: T.textMuted, textAlign: 'center' }}>
            Solo se permite 1 medición por semana (lun–dom). Podés editar la de esta semana en cualquier momento.
          </Text>
        </View>
      )}

      {/* History list */}
      {measurements.length > 0 ? (
        <View style={[styles.card, { backgroundColor: T.bgCard, borderColor: T.border }]}>
          <Text style={[styles.cardTitle, { color: T.text, marginBottom: 12 }]}>Historial</Text>
          {measurements.slice(0, 12).map((m, idx) => {
            const c = computeBodyComposition(m);
            return (
              <View key={m.id} style={{
                flexDirection: 'row', paddingVertical: 10,
                borderBottomWidth: idx < Math.min(measurements.length, 12) - 1 ? 1 : 0,
                borderColor: T.border + '55',
              }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 13, fontWeight: '600', color: T.text }}>
                    {new Date(m.measured_at + 'T12:00:00').toLocaleDateString('es-CR', { weekday: 'short', day: 'numeric', month: 'short' })}
                  </Text>
                  {m.notes ? <Text style={{ fontSize: 11, color: T.textMuted, marginTop: 2 }}>{m.notes}</Text> : null}
                </View>
                <View style={{ alignItems: 'flex-end', gap: 2 }}>
                  {m.weight_kg != null && (
                    <Text style={{ fontSize: 14, fontWeight: '700', color: T.orange }}>{m.weight_kg} kg</Text>
                  )}
                  {c.bmi != null && c.bmiCategory && (
                    <Text style={{ fontSize: 11, color: c.bmiCategory.color, fontWeight: '600' }}>
                      IMC {c.bmi} · {c.bmiCategory.label}
                    </Text>
                  )}
                  {c.leanMassKg != null && (
                    <Text style={{ fontSize: 10, color: T.textMuted }}>Magra: {c.leanMassKg} kg</Text>
                  )}
                </View>
              </View>
            );
          })}
        </View>
      ) : (
        <View style={{ paddingVertical: 40, alignItems: 'center' }}>
          <Text style={{ fontSize: 40, marginBottom: 12 }}>📏</Text>
          <Text style={{ fontSize: 16, fontWeight: '700', color: T.text, marginBottom: 6 }}>Sin mediciones aún</Text>
          <Text style={{ fontSize: 13, color: T.textMuted, textAlign: 'center', paddingHorizontal: 20 }}>
            Registrá tu peso y medidas para hacer seguimiento de tu composición corporal.
          </Text>
        </View>
      )}
    </View>
  );
}

// ─── Racha Tab ────────────────────────────────────────────────
function RachaTab({ T }: { T: any }) {
  const { routineStreak, dailyProgress } = useProgressStore();
  const current = routineStreak?.currentStreak ?? 0;
  const longest = routineStreak?.longestStreak ?? 0;
  const totalActive = dailyProgress.filter((d) => d.pct > 0).length;

  const msg = current === 0 ? 'Empieza hoy tu racha'
    : current < 3   ? '¡Buen inicio, sigue así!'
    : current < 7   ? '¡Vas muy bien!'
    : current < 14  ? '¡Semanas seguidas!'
    : current < 30  ? '¡Increíble constancia!'
    : '¡Leyenda del gym!';

  return (
    <View style={{ gap: 12 }}>
      <View style={[styles.card, { backgroundColor: T.bgCard, borderColor: T.orange + '44', alignItems: 'center', paddingVertical: 28 }]}>
        <Text style={{ fontSize: 56 }}>🔥</Text>
        <Text style={{ fontSize: 72, fontWeight: '900', color: T.orange, lineHeight: 82 }}>{current}</Text>
        <Text style={{ fontSize: 16, fontWeight: '700', color: T.text }}>días de racha</Text>
        <Text style={{ fontSize: 13, color: T.textMuted, marginTop: 4 }}>{msg}</Text>
      </View>

      <View style={{ flexDirection: 'row', gap: 10 }}>
        <View style={[styles.card, { flex: 1, backgroundColor: T.bgCard, borderColor: T.border, alignItems: 'center' }]}>
          <Text style={{ fontSize: 30, fontWeight: '900', color: T.orange }}>{current}</Text>
          <Text style={{ fontSize: 11, color: T.textMuted, textAlign: 'center', marginTop: 2 }}>Racha actual</Text>
        </View>
        <View style={[styles.card, { flex: 1, backgroundColor: T.bgCard, borderColor: T.border, alignItems: 'center' }]}>
          <Text style={{ fontSize: 30, fontWeight: '900', color: T.green }}>{longest}</Text>
          <Text style={{ fontSize: 11, color: T.textMuted, textAlign: 'center', marginTop: 2 }}>Mejor racha</Text>
        </View>
        <View style={[styles.card, { flex: 1, backgroundColor: T.bgCard, borderColor: T.border, alignItems: 'center' }]}>
          <Text style={{ fontSize: 30, fontWeight: '900', color: T.accent }}>{totalActive}</Text>
          <Text style={{ fontSize: 11, color: T.textMuted, textAlign: 'center', marginTop: 2 }}>Días activos</Text>
          <Text style={{ fontSize: 10, color: T.textMuted, textAlign: 'center' }}>últimas 2 sem.</Text>
        </View>
      </View>

      <View style={[styles.card, { backgroundColor: T.bgCard, borderColor: T.border }]}>
        <Text style={[styles.cardTitle, { color: T.text, marginBottom: 14 }]}>Últimas 5 semanas</Text>
        <StreakCalendar activeDates={routineStreak?.activeDates ?? []} T={T} />
      </View>

      {current === 0 && (
        <View style={[styles.card, { backgroundColor: T.bgCard, borderColor: T.orange + '33' }]}>
          <Text style={{ fontSize: 14, fontWeight: '700', color: T.text, marginBottom: 4 }}>💡 ¿Cómo funciona la racha?</Text>
          <Text style={{ fontSize: 13, color: T.textMuted, lineHeight: 20 }}>
            Completa al menos un ejercicio de tu rutina cada día para mantener tu racha activa. Si un día no entrenas, la racha se reinicia.
          </Text>
        </View>
      )}
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────
export default function ProgressScreen() {
  const T = useTheme();
  const { user } = useAuthStore();
  const { isLoading, error, measurements, thisWeekMeasurement, loadAll, addMeasurement } = useProgressStore();
  const [activeTab, setActiveTab] = useState<TabId>('routines');
  const [showAddMeasure, setShowAddMeasure] = useState(false);

  useEffect(() => {
    if (user?.id && user?.tenant_id) loadAll(user.id, user.tenant_id);
  }, [user?.id, user?.tenant_id]);

  const lastHeight = measurements.find((m) => m.height_cm != null)?.height_cm?.toString() ?? '';

  const handleAddMeasurement = async (m: Partial<BodyMeasurement>) => {
    if (!user?.id || !user?.tenant_id) return;
    await addMeasurement({
      client_id: user.id,
      tenant_id: user.tenant_id,
      measured_at: new Date().toISOString().split('T')[0],
      weight_kg: m.weight_kg ?? null,
      height_cm: m.height_cm ?? null,
      body_fat_pct: m.body_fat_pct ?? null,
      muscle_mass_kg: null,
      waist_cm: m.waist_cm ?? null,
      chest_cm: null,
      hip_cm: null,
      arm_cm: null,
      notes: m.notes ?? null,
    });
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: T.bg }]} edges={['left', 'right']}>
      <StatusBar barStyle="light-content" backgroundColor={T.bg} />
      <ClientTopBar title="Mi Progreso" />

      {/* Tab pills */}
      <View style={[styles.tabRow, { borderBottomColor: T.border }]}>
        {TABS.map((tab) => (
          <TouchableOpacity
            key={tab.id}
            onPress={() => setActiveTab(tab.id)}
            style={[
              styles.tabPill,
              activeTab === tab.id
                ? { backgroundColor: T.orange, borderColor: T.orange }
                : { backgroundColor: T.bgCard, borderColor: T.border },
            ]}
          >
            <Text style={{ fontSize: 12, fontWeight: '700', color: activeTab === tab.id ? '#fff' : T.textMuted }}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {isLoading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator color={T.orange} size="large" />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {error ? (
            <View style={{ padding: 16, borderRadius: 10, backgroundColor: T.redSoft, marginBottom: 8 }}>
              <Text style={{ color: T.red, fontSize: 13 }}>Error al cargar datos: {error}</Text>
            </View>
          ) : null}

          {activeTab === 'routines' && <RoutinesTab T={T} />}
          {activeTab === 'measures' && <MedidasTab onAdd={() => setShowAddMeasure(true)} T={T} />}
          {activeTab === 'streak' && <RachaTab T={T} />}

          <View style={{ height: 32 }} />
        </ScrollView>
      )}

      <AddMeasurementModal
        visible={showAddMeasure}
        onClose={() => setShowAddMeasure(false)}
        onSave={handleAddMeasurement}
        lastHeight={lastHeight}
        existing={thisWeekMeasurement}
        T={T}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { padding: 16, gap: 12 },
  tabRow: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 10, gap: 8, borderBottomWidth: 1 },
  tabPill: { flex: 1, paddingVertical: 8, borderRadius: 10, borderWidth: 1, alignItems: 'center' },
  card: { borderWidth: 1, borderRadius: 14, padding: 16 },
  cardTitle: { fontSize: 15, fontWeight: '700' },
  statMini: { flex: 1, borderWidth: 1, borderRadius: 12, padding: 12, alignItems: 'center' },
  measureBadge: { borderWidth: 1, borderRadius: 10, padding: 10, alignItems: 'center', minWidth: 64 },
  calCell: { width: 28, height: 28, borderRadius: 6, borderWidth: 1, justifyContent: 'center', alignItems: 'center' },
  inputLabel: { fontSize: 12, marginBottom: 4 },
  input: { borderWidth: 1, borderRadius: 8, padding: 10 },
});
