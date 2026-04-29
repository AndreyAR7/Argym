import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  ActivityIndicator, Alert, Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTheme } from '@/hooks/useTheme';
import { usePlansStore } from '@/store/plans.store';
import { useAuthStore } from '@/store/auth.store';
import { DatePickerField } from '@/components/shared/DatePickerField';
import { setPromotionVideos } from '@/services/videos.service';
import { setOfferPlans } from '@/services/offers.service';
import { VideoSelector } from '@/components/admin/VideoSelector';
import { PlanSelector } from '@/components/admin/PlanSelector';

const TYPES = [
  { label: '🏷️ Descuento', value: 'discount' },
  { label: '📢 Anuncio', value: 'announcement' },
  { label: '📦 Bundle', value: 'bundle' },
] as const;

const LEVELS = [
  { label: 'Todos', value: 'all' },
  { label: 'Principiante', value: 'beginner' },
  { label: 'Intermedio', value: 'intermediate' },
  { label: 'Avanzado', value: 'advanced' },
] as const;

export default function CreatePromotionScreen() {
  const T = useTheme();
  const router = useRouter();
  const { user } = useAuthStore();
  const { createPromotion } = usePlansStore();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<'discount' | 'announcement' | 'bundle'>('announcement');
  const [targetLevel, setTargetLevel] = useState<'all' | 'beginner' | 'intermediate' | 'advanced'>('all');
  const [discountPct, setDiscountPct] = useState('');
  const [discountAmt, setDiscountAmt] = useState('');
  const [endDate, setEndDate] = useState('');
  const [hasEndDate, setHasEndDate] = useState(false);
  const [planIds, setPlanIds] = useState<string[]>([]);
  const [videoIds, setVideoIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const handleEndDateToggle = (value: boolean) => {
    setHasEndDate(value);
    if (value && !endDate) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      setEndDate(tomorrow.toISOString().split('T')[0]);
    }
  };

  const handleSave = async () => {
    if (!title.trim()) { Alert.alert('Error', 'El título es requerido'); return; }
    if (planIds.length === 0) { Alert.alert('Error', 'Agrega al menos un plan a esta oferta'); return; }
    if (!user?.tenant_id) return;
    setSaving(true);
    try {
      const newPromo = await createPromotion({
        tenant_id: user.tenant_id,
        title: title.trim(),
        description: description.trim() || null,
        type,
        target_level: targetLevel,
        discount_percentage: discountPct ? parseFloat(discountPct) : null,
        discount_amount: discountAmt ? parseFloat(discountAmt) : null,
        applies_to_plan_id: null,
        start_date: new Date().toISOString(),
        end_date: hasEndDate && endDate ? new Date(endDate).toISOString() : null,
        is_active: true,
      } as any);
      await Promise.all([
        setOfferPlans(newPromo.id, planIds),
        videoIds.length > 0 ? setPromotionVideos(newPromo.id, videoIds) : Promise.resolve(),
      ]);
      router.back();
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'No se pudo crear la oferta');
    } finally {
      setSaving(false);
    }
  };

  const input = {
    borderWidth: 1, borderColor: T.border, borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 10, fontSize: 15,
    color: T.text, backgroundColor: T.bgCardElevated,
  };

  const sectionLabel = { fontSize: 11, fontWeight: '700' as const, textTransform: 'uppercase' as const, letterSpacing: 0.6, color: T.textSecondary, marginBottom: 8, marginTop: 20 };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: T.bg }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: T.border }}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={{ color: T.accent, fontSize: 16 }}>← Volver</Text>
        </TouchableOpacity>
        <Text style={{ fontSize: 18, fontWeight: '700', color: T.text }}>Nueva oferta</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 16 }} keyboardShouldPersistTaps="handled">
        {/* Título */}
        <Text style={sectionLabel}>Título *</Text>
        <TextInput style={input} value={title} onChangeText={setTitle} placeholder="Ej: Oferta de verano" placeholderTextColor={T.textMuted} />

        {/* Descripción */}
        <Text style={sectionLabel}>Descripción</Text>
        <TextInput style={[input, { height: 80, textAlignVertical: 'top' }]} value={description} onChangeText={setDescription} multiline placeholder="Descripción visible para los clientes..." placeholderTextColor={T.textMuted} />

        {/* Tipo */}
        <Text style={sectionLabel}>Tipo de oferta</Text>
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 4 }}>
          {TYPES.map((t) => (
            <TouchableOpacity key={t.value} onPress={() => setType(t.value)}
              style={{ flex: 1, borderWidth: 1, borderRadius: 8, paddingVertical: 8, alignItems: 'center', backgroundColor: type === t.value ? T.accent : T.bgCard, borderColor: type === t.value ? T.accent : T.border }}>
              <Text style={{ color: type === t.value ? '#fff' : T.text, fontSize: 11, fontWeight: '600', textAlign: 'center' }}>{t.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Nivel objetivo */}
        <Text style={sectionLabel}>Dirigida a</Text>
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 4 }}>
          {LEVELS.map((l) => (
            <TouchableOpacity key={l.value} onPress={() => setTargetLevel(l.value)}
              style={{ flex: 1, borderWidth: 1, borderRadius: 8, paddingVertical: 8, alignItems: 'center', backgroundColor: targetLevel === l.value ? T.purple : T.bgCard, borderColor: targetLevel === l.value ? T.purple : T.border }}>
              <Text style={{ color: targetLevel === l.value ? '#fff' : T.text, fontSize: 10, fontWeight: '700', textAlign: 'center' }}>{l.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Descuento */}
        {type === 'discount' && (
          <>
            <Text style={sectionLabel}>Descuento (%)</Text>
            <TextInput style={input} value={discountPct} onChangeText={setDiscountPct} keyboardType="decimal-pad" placeholder="Ej: 20" placeholderTextColor={T.textMuted} />
            <Text style={sectionLabel}>O descuento fijo (monto)</Text>
            <TextInput style={input} value={discountAmt} onChangeText={setDiscountAmt} keyboardType="decimal-pad" placeholder="Ej: 5000" placeholderTextColor={T.textMuted} />
          </>
        )}

        {/* Fecha de vencimiento */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 20, marginBottom: 8 }}>
          <Text style={{ fontSize: 13, fontWeight: '600', color: T.textSecondary }}>Fecha de vencimiento</Text>
          <Switch value={hasEndDate} onValueChange={handleEndDateToggle} trackColor={{ true: T.accent, false: T.border }} />
        </View>
        {hasEndDate && (
          <DatePickerField label="Fecha de fin" value={endDate} onChange={setEndDate} placeholder="Seleccionar fecha" minDate={new Date()} />
        )}

        {/* Planes incluidos */}
        <Text style={sectionLabel}>Planes de esta oferta *</Text>
        <Text style={{ fontSize: 12, color: T.textMuted, marginBottom: 10 }}>
          Los clientes verán y podrán suscribirse solo a los planes que selecciones aquí.
        </Text>
        {user?.tenant_id ? (
          <PlanSelector tenantId={user.tenant_id} selectedIds={planIds} onChange={setPlanIds} />
        ) : null}

        {/* Videos incluidos */}
        <Text style={sectionLabel}>Videos incluidos</Text>
        <Text style={{ fontSize: 11, color: T.textMuted, marginBottom: 8 }}>{videoIds.length} seleccionados</Text>
        {user?.tenant_id ? (
          <VideoSelector tenantId={user.tenant_id} selectedIds={videoIds} onChange={setVideoIds} />
        ) : null}

        <TouchableOpacity onPress={handleSave} disabled={saving}
          style={{ backgroundColor: saving ? T.textMuted : T.accent, borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 28, marginBottom: 40 }}>
          {saving ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>Crear oferta</Text>}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}
