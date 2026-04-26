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

const TYPES = [
  { label: '🏷️ Descuento', value: 'discount' },
  { label: '📢 Anuncio', value: 'announcement' },
  { label: '📦 Bundle', value: 'bundle' },
] as const;

export default function CreatePromotionScreen() {
  const T = useTheme();
  const router = useRouter();
  const { user } = useAuthStore();
  const { createPromotion } = usePlansStore();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<'discount' | 'announcement' | 'bundle'>('announcement');
  const [discountPct, setDiscountPct] = useState('');
  const [discountAmt, setDiscountAmt] = useState('');
  const [endDate, setEndDate] = useState('');
  const [hasEndDate, setHasEndDate] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!title.trim()) { Alert.alert('Error', 'El título es requerido'); return; }
    if (!user?.tenant_id) return;
    setSaving(true);
    try {
      await createPromotion({
        tenant_id: user.tenant_id,
        title: title.trim(),
        description: description.trim() || null,
        type,
        discount_percentage: discountPct ? parseFloat(discountPct) : null,
        discount_amount: discountAmt ? parseFloat(discountAmt) : null,
        applies_to_plan_id: null,
        start_date: new Date().toISOString(),
        end_date: hasEndDate && endDate ? new Date(endDate).toISOString() : null,
        is_active: true,
        updated_at: new Date().toISOString(),
      } as any);
      router.back();
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'No se pudo crear la promoción');
    } finally {
      setSaving(false);
    }
  };

  const input = {
    borderWidth: 1,
    borderColor: T.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: T.text,
    backgroundColor: T.bgCardElevated,
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: T.bg }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: T.border }}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={{ color: T.accent, fontSize: 16 }}>← Volver</Text>
        </TouchableOpacity>
        <Text style={{ fontSize: 18, fontWeight: '700', color: T.text }}>Nueva promoción</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 16 }} keyboardShouldPersistTaps="handled">
        <Text style={{ fontSize: 13, fontWeight: '500', color: T.textSecondary, marginBottom: 6 }}>Título *</Text>
        <TextInput style={input} value={title} onChangeText={setTitle} placeholder="Ej: Oferta de verano" placeholderTextColor={T.textMuted} />

        <Text style={{ fontSize: 13, fontWeight: '500', color: T.textSecondary, marginTop: 12, marginBottom: 6 }}>Descripción</Text>
        <TextInput style={[input, { height: 80, textAlignVertical: 'top' }]} value={description} onChangeText={setDescription} multiline placeholder="Descripción visible para los clientes..." placeholderTextColor={T.textMuted} />

        <Text style={{ fontSize: 13, fontWeight: '500', color: T.textSecondary, marginTop: 12, marginBottom: 6 }}>Tipo</Text>
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
          {TYPES.map((t) => (
            <TouchableOpacity
              key={t.value}
              onPress={() => setType(t.value)}
              style={{
                flex: 1, borderWidth: 1, borderRadius: 8, paddingVertical: 8, alignItems: 'center',
                backgroundColor: type === t.value ? T.accent : T.bgCard,
                borderColor: type === t.value ? T.accent : T.border,
              }}
            >
              <Text style={{ color: type === t.value ? '#fff' : T.text, fontSize: 12, fontWeight: '600', textAlign: 'center' }}>{t.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {type === 'discount' && (
          <>
            <Text style={{ fontSize: 13, fontWeight: '500', color: T.textSecondary, marginBottom: 6 }}>Descuento (%)</Text>
            <TextInput style={input} value={discountPct} onChangeText={setDiscountPct} keyboardType="decimal-pad" placeholder="Ej: 20" placeholderTextColor={T.textMuted} />

            <Text style={{ fontSize: 13, fontWeight: '500', color: T.textSecondary, marginTop: 12, marginBottom: 6 }}>O descuento fijo (monto)</Text>
            <TextInput style={input} value={discountAmt} onChangeText={setDiscountAmt} keyboardType="decimal-pad" placeholder="Ej: 5000" placeholderTextColor={T.textMuted} />
          </>
        )}

        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 16, marginBottom: 8 }}>
          <Text style={{ fontSize: 13, fontWeight: '500', color: T.textSecondary }}>Tiene fecha de vencimiento</Text>
          <Switch value={hasEndDate} onValueChange={setHasEndDate} trackColor={{ true: T.accent, false: T.border }} />
        </View>
        {hasEndDate && (
          <DatePickerField
            label="Fecha de fin"
            value={endDate}
            onChange={setEndDate}
            placeholder="Seleccionar fecha de vencimiento"
            minDate={new Date()}
          />
        )}

        <TouchableOpacity
          onPress={handleSave}
          disabled={saving}
          style={{ backgroundColor: saving ? T.textMuted : T.accent, borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 24, marginBottom: 40 }}
        >
          {saving ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>Crear promoción</Text>}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}
