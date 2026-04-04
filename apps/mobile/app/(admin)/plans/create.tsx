import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, useColorScheme, ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Colors } from '@/constants/colors';
import { usePlansStore, type PlanFeature } from '@/store/plans.store';
import { useAuthStore } from '@/store/auth.store';

const CYCLES = [
  { label: 'Mensual', value: 'monthly' },
  { label: 'Anual', value: 'yearly' },
  { label: 'Único', value: 'one_time' },
] as const;

export default function CreatePlanScreen() {
  const scheme = useColorScheme();
  const colors = scheme === 'dark' ? Colors.dark : Colors.light;
  const router = useRouter();
  const { user } = useAuthStore();
  const { createPlan } = usePlansStore();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [currency, setCurrency] = useState('CRC');
  const [cycle, setCycle] = useState<'monthly' | 'yearly' | 'one_time'>('monthly');
  const [features, setFeatures] = useState<PlanFeature[]>([{ name: '', value: 'true' }]);
  const [saving, setSaving] = useState(false);

  const addFeature = () => setFeatures((f) => [...f, { name: '', value: 'true' }]);
  const removeFeature = (i: number) => setFeatures((f) => f.filter((_, idx) => idx !== i));
  const updateFeature = (i: number, field: 'name' | 'value', val: string) => {
    setFeatures((f) => f.map((feat, idx) => idx === i ? { ...feat, [field]: val } : feat));
  };

  const handleSave = async () => {
    if (!name.trim() || !price.trim()) {
      Alert.alert('Error', 'Nombre y precio son requeridos');
      return;
    }
    if (!user?.tenant_id) return;
    setSaving(true);
    try {
      await createPlan({
        tenant_id: user.tenant_id,
        name: name.trim(),
        description: description.trim() || null,
        price: parseFloat(price),
        currency,
        billing_cycle: cycle,
        features: features.filter((f) => f.name.trim()),
        is_active: true,
        sort_order: 0,
        updated_at: new Date().toISOString(),
      } as any);
      router.back();
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'No se pudo crear el plan');
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
        <Text style={[styles.title, { color: colors.text }]}>Nuevo plan</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 16 }} keyboardShouldPersistTaps="handled">
        <Text style={[styles.label, { color: colors.textSecondary }]}>Nombre *</Text>
        <TextInput style={input} value={name} onChangeText={setName} placeholder="Ej: Plan Pro" placeholderTextColor={colors.textMuted} />

        <Text style={[styles.label, { color: colors.textSecondary }]}>Descripción</Text>
        <TextInput style={[...input, { height: 80, textAlignVertical: 'top' }]} value={description} onChangeText={setDescription} multiline placeholder="Descripción del plan..." placeholderTextColor={colors.textMuted} />

        <View style={{ flexDirection: 'row', gap: 12 }}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Precio *</Text>
            <TextInput style={input} value={price} onChangeText={setPrice} keyboardType="decimal-pad" placeholder="0.00" placeholderTextColor={colors.textMuted} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Moneda</Text>
            <TextInput style={input} value={currency} onChangeText={setCurrency} placeholder="CRC" placeholderTextColor={colors.textMuted} autoCapitalize="characters" />
          </View>
        </View>

        <Text style={[styles.label, { color: colors.textSecondary }]}>Ciclo de facturación</Text>
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
          {CYCLES.map((c) => (
            <TouchableOpacity
              key={c.value}
              onPress={() => setCycle(c.value)}
              style={[styles.cycleBtn, {
                backgroundColor: cycle === c.value ? colors.primary : colors.surface,
                borderColor: cycle === c.value ? colors.primary : colors.border,
              }]}
            >
              <Text style={{ color: cycle === c.value ? '#fff' : colors.text, fontSize: 13, fontWeight: '600' }}>
                {c.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <Text style={[styles.label, { color: colors.textSecondary, marginBottom: 0 }]}>Características</Text>
          <TouchableOpacity onPress={addFeature}>
            <Text style={{ color: colors.primary, fontWeight: '600' }}>+ Agregar</Text>
          </TouchableOpacity>
        </View>

        {features.map((feat, i) => (
          <View key={i} style={{ flexDirection: 'row', gap: 8, marginBottom: 8, alignItems: 'center' }}>
            <TextInput
              style={[input, { flex: 2 }]}
              value={feat.name}
              onChangeText={(v) => updateFeature(i, 'name', v)}
              placeholder="Nombre"
              placeholderTextColor={colors.textMuted}
            />
            <TextInput
              style={[input, { flex: 1 }]}
              value={feat.value}
              onChangeText={(v) => updateFeature(i, 'value', v)}
              placeholder="Valor"
              placeholderTextColor={colors.textMuted}
            />
            <TouchableOpacity onPress={() => removeFeature(i)}>
              <Text style={{ color: colors.error, fontSize: 18 }}>✕</Text>
            </TouchableOpacity>
          </View>
        ))}

        <TouchableOpacity
          onPress={handleSave}
          disabled={saving}
          style={[styles.saveBtn, { backgroundColor: saving ? colors.textMuted : colors.primary }]}
        >
          {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Guardar plan</Text>}
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
  cycleBtn: { flex: 1, borderWidth: 1, borderRadius: 8, paddingVertical: 8, alignItems: 'center' },
  saveBtn: { borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 24, marginBottom: 40 },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
