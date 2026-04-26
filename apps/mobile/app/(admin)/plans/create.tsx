import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTheme } from '@/hooks/useTheme';
import { usePlansStore, type PlanFeature } from '@/store/plans.store';
import { useAuthStore } from '@/store/auth.store';

const CYCLES = [
  { label: 'Mensual', value: 'monthly' },
  { label: 'Anual', value: 'yearly' },
  { label: 'Único', value: 'one_time' },
] as const;

const CYCLE_DURATION: Record<string, string> = {
  monthly: '1 mes por ciclo',
  yearly: '1 año por ciclo',
  one_time: 'Sin vencimiento',
};

export default function CreatePlanScreen() {
  const T = useTheme();
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
  const updateFeature = (i: number, field: 'name' | 'value', val: string) =>
    setFeatures((f) => f.map((feat, idx) => idx === i ? { ...feat, [field]: val } : feat));

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
        <Text style={{ fontSize: 18, fontWeight: '700', color: T.text }}>Nuevo plan</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 16 }} keyboardShouldPersistTaps="handled">
        <Text style={{ fontSize: 13, fontWeight: '500', color: T.textSecondary, marginBottom: 6 }}>Nombre *</Text>
        <TextInput style={input} value={name} onChangeText={setName} placeholder="Ej: Plan Pro" placeholderTextColor={T.textMuted} />

        <Text style={{ fontSize: 13, fontWeight: '500', color: T.textSecondary, marginTop: 12, marginBottom: 6 }}>Descripción</Text>
        <TextInput style={[input, { height: 80, textAlignVertical: 'top' }]} value={description} onChangeText={setDescription} multiline placeholder="Descripción del plan..." placeholderTextColor={T.textMuted} />

        <View style={{ flexDirection: 'row', gap: 12, marginTop: 12 }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 13, fontWeight: '500', color: T.textSecondary, marginBottom: 6 }}>Precio *</Text>
            <TextInput style={input} value={price} onChangeText={setPrice} keyboardType="decimal-pad" placeholder="0.00" placeholderTextColor={T.textMuted} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 13, fontWeight: '500', color: T.textSecondary, marginBottom: 6 }}>Moneda</Text>
            <TextInput style={input} value={currency} onChangeText={setCurrency} placeholder="CRC" placeholderTextColor={T.textMuted} autoCapitalize="characters" />
          </View>
        </View>

        <Text style={{ fontSize: 13, fontWeight: '500', color: T.textSecondary, marginTop: 12, marginBottom: 6 }}>Ciclo de facturación</Text>
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 4 }}>
          {CYCLES.map((c) => (
            <TouchableOpacity
              key={c.value}
              onPress={() => setCycle(c.value)}
              style={{
                flex: 1, borderWidth: 1, borderRadius: 8, paddingVertical: 8, alignItems: 'center',
                backgroundColor: cycle === c.value ? T.accent : T.bgCard,
                borderColor: cycle === c.value ? T.accent : T.border,
              }}
            >
              <Text style={{ color: cycle === c.value ? '#fff' : T.text, fontSize: 13, fontWeight: '600' }}>{c.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <Text style={{ fontSize: 11, color: T.textMuted, marginBottom: 16 }}>{CYCLE_DURATION[cycle]}</Text>

        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <Text style={{ fontSize: 13, fontWeight: '500', color: T.textSecondary }}>Características</Text>
          <TouchableOpacity onPress={addFeature}>
            <Text style={{ color: T.accent, fontWeight: '600' }}>+ Agregar</Text>
          </TouchableOpacity>
        </View>
        {features.map((feat, i) => (
          <View key={i} style={{ flexDirection: 'row', gap: 8, marginBottom: 8, alignItems: 'center' }}>
            <TextInput style={[input, { flex: 2 }]} value={feat.name} onChangeText={(v) => updateFeature(i, 'name', v)} placeholder="Ej: Acceso ilimitado" placeholderTextColor={T.textMuted} />
            <TextInput style={[input, { flex: 1 }]} value={feat.value} onChangeText={(v) => updateFeature(i, 'value', v)} placeholder="Valor" placeholderTextColor={T.textMuted} />
            <TouchableOpacity onPress={() => removeFeature(i)}>
              <Text style={{ color: T.red, fontSize: 18 }}>✕</Text>
            </TouchableOpacity>
          </View>
        ))}

        <TouchableOpacity
          onPress={handleSave}
          disabled={saving}
          style={{ backgroundColor: saving ? T.textMuted : T.accent, borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 24, marginBottom: 40 }}
        >
          {saving ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>Guardar plan</Text>}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}
