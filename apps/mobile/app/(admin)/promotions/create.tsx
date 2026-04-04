import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, useColorScheme, ActivityIndicator, Alert, Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Colors } from '@/constants/colors';
import { usePlansStore } from '@/store/plans.store';
import { useAuthStore } from '@/store/auth.store';

const TYPES = [
  { label: '🏷️ Descuento', value: 'discount' },
  { label: '📢 Anuncio', value: 'announcement' },
  { label: '📦 Bundle', value: 'bundle' },
] as const;

export default function CreatePromotionScreen() {
  const scheme = useColorScheme();
  const colors = scheme === 'dark' ? Colors.dark : Colors.light;
  const router = useRouter();
  const { user } = useAuthStore();
  const { createPromotion, plans } = usePlansStore();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<'discount' | 'announcement' | 'bundle'>('announcement');
  const [discountPct, setDiscountPct] = useState('');
  const [discountAmt, setDiscountAmt] = useState('');
  const [endDate, setEndDate] = useState('');
  const [hasEndDate, setHasEndDate] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert('Error', 'El título es requerido');
      return;
    }
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

  const input = [styles.input, { backgroundColor: colors.surfaceElevated, borderColor: colors.border, color: colors.text }];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={{ color: colors.primary, fontSize: 16 }}>← Volver</Text>
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>Nueva promoción</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 16 }} keyboardShouldPersistTaps="handled">
        <Text style={[styles.label, { color: colors.textSecondary }]}>Título *</Text>
        <TextInput style={input} value={title} onChangeText={setTitle} placeholder="Ej: Oferta de verano" placeholderTextColor={colors.textMuted} />

        <Text style={[styles.label, { color: colors.textSecondary }]}>Descripción</Text>
        <TextInput
          style={[...input, { height: 80, textAlignVertical: 'top' }]}
          value={description} onChangeText={setDescription} multiline
          placeholder="Descripción visible para los clientes..." placeholderTextColor={colors.textMuted}
        />

        <Text style={[styles.label, { color: colors.textSecondary }]}>Tipo</Text>
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
          {TYPES.map((t) => (
            <TouchableOpacity
              key={t.value}
              onPress={() => setType(t.value)}
              style={[styles.typeBtn, {
                backgroundColor: type === t.value ? '#7c3aed' : colors.surface,
                borderColor: type === t.value ? '#7c3aed' : colors.border,
                flex: 1,
              }]}
            >
              <Text style={{ color: type === t.value ? '#fff' : colors.text, fontSize: 12, fontWeight: '600', textAlign: 'center' }}>
                {t.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {type === 'discount' && (
          <>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Descuento (%)</Text>
            <TextInput style={input} value={discountPct} onChangeText={setDiscountPct} keyboardType="decimal-pad" placeholder="Ej: 20" placeholderTextColor={colors.textMuted} />

            <Text style={[styles.label, { color: colors.textSecondary }]}>O descuento fijo (monto)</Text>
            <TextInput style={input} value={discountAmt} onChangeText={setDiscountAmt} keyboardType="decimal-pad" placeholder="Ej: 5000" placeholderTextColor={colors.textMuted} />
          </>
        )}

        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 16, marginBottom: 8 }}>
          <Text style={[styles.label, { color: colors.textSecondary, marginBottom: 0, marginTop: 0 }]}>Tiene fecha de vencimiento</Text>
          <Switch value={hasEndDate} onValueChange={setHasEndDate} trackColor={{ true: '#7c3aed', false: colors.border }} />
        </View>

        {hasEndDate && (
          <>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Fecha de fin (YYYY-MM-DD)</Text>
            <TextInput style={input} value={endDate} onChangeText={setEndDate} placeholder="2025-12-31" placeholderTextColor={colors.textMuted} />
          </>
        )}

        <TouchableOpacity
          onPress={handleSave}
          disabled={saving}
          style={[styles.saveBtn, { backgroundColor: saving ? colors.textMuted : '#7c3aed' }]}
        >
          {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Crear promoción</Text>}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1,
  },
  title: { fontSize: 18, fontWeight: '700' },
  label: { fontSize: 13, fontWeight: '500', marginBottom: 6, marginTop: 12 },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15 },
  typeBtn: { borderWidth: 1, borderRadius: 8, paddingVertical: 8, alignItems: 'center' },
  saveBtn: { borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 24, marginBottom: 40 },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
