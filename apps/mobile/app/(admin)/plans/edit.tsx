import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  ActivityIndicator, Alert, Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTheme } from '@/hooks/useTheme';
import { usePlansStore, type Plan, type PlanFeature } from '@/store/plans.store';
import { supabase } from '@/lib/supabase';

const CYCLES = [
  { label: 'Mensual', value: 'monthly' },
  { label: 'Anual', value: 'yearly' },
  { label: 'Único', value: 'one_time' },
] as const;

const CYCLE_DURATION: Record<string, string> = {
  monthly: '1 mes',
  yearly: '1 año',
  one_time: 'Sin vencimiento',
};

export default function EditPlanScreen() {
  const T = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { plans, updatePlan } = usePlansStore();

  const [plan, setPlan] = useState<Plan | null>(plans.find((p) => p.id === id) ?? null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [currency, setCurrency] = useState('CRC');
  const [cycle, setCycle] = useState<'monthly' | 'yearly' | 'one_time'>('monthly');
  const [features, setFeatures] = useState<PlanFeature[]>([]);
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(!plan);

  // Fetch from DB if not in store
  useEffect(() => {
    if (plan) {
      populate(plan);
      return;
    }
    if (!id) return;
    supabase.from('plans').select('*').eq('id', id).single().then(({ data }) => {
      if (data) { setPlan(data as Plan); populate(data as Plan); }
      setLoading(false);
    });
  }, [id]);

  function populate(p: Plan) {
    setName(p.name);
    setDescription(p.description ?? '');
    setPrice(String(p.price));
    setCurrency(p.currency);
    setCycle(p.billing_cycle);
    setFeatures(p.features?.length ? p.features : [{ name: '', value: 'true' }]);
    setIsActive(p.is_active);
    setLoading(false);
  }

  const addFeature = () => setFeatures((f) => [...f, { name: '', value: 'true' }]);
  const removeFeature = (i: number) => setFeatures((f) => f.filter((_, idx) => idx !== i));
  const updateFeature = (i: number, field: 'name' | 'value', val: string) =>
    setFeatures((f) => f.map((feat, idx) => idx === i ? { ...feat, [field]: val } : feat));

  const handleSave = async () => {
    if (!name.trim() || !price.trim()) {
      Alert.alert('Error', 'Nombre y precio son requeridos');
      return;
    }
    if (!id) return;
    setSaving(true);
    try {
      await updatePlan(id, {
        name: name.trim(),
        description: description.trim() || null,
        price: parseFloat(price),
        currency,
        billing_cycle: cycle,
        features: features.filter((f) => f.name.trim()),
        is_active: isActive,
      });
      Alert.alert('✅ Guardado', 'El plan fue actualizado.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'No se pudo actualizar el plan');
    } finally {
      setSaving(false);
    }
  };

  const handleArchive = () => {
    Alert.alert(
      'Archivar plan',
      'El plan quedará desactivado y no estará disponible para nuevas suscripciones. Las suscripciones existentes no se ven afectadas.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Archivar',
          style: 'destructive',
          onPress: async () => {
            try {
              await updatePlan(id!, { is_active: false });
              router.back();
            } catch (e: any) {
              Alert.alert('Error', e.message);
            }
          },
        },
      ]
    );
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

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: T.bg, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator color={T.accent} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: T.bg }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: T.border }}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={{ color: T.accent, fontSize: 16 }}>← Volver</Text>
        </TouchableOpacity>
        <Text style={{ fontSize: 18, fontWeight: '700', color: T.text }}>Editar plan</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 16 }} keyboardShouldPersistTaps="handled">
        {/* Active toggle */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: T.bgCard, borderRadius: 10, padding: 14, marginBottom: 20, borderWidth: 1, borderColor: T.border }}>
          <View>
            <Text style={{ fontSize: 14, fontWeight: '600', color: T.text }}>Plan activo</Text>
            <Text style={{ fontSize: 12, color: T.textMuted, marginTop: 2 }}>
              {isActive ? 'Visible para nuevas suscripciones' : 'No disponible para nuevas suscripciones'}
            </Text>
          </View>
          <Switch value={isActive} onValueChange={setIsActive} trackColor={{ true: T.green, false: T.border }} />
        </View>

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
        <Text style={{ fontSize: 11, color: T.textMuted, marginBottom: 16 }}>
          Vencimiento por ciclo: {CYCLE_DURATION[cycle]} · Cambiar el ciclo solo afecta nuevas suscripciones
        </Text>

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
          style={{ backgroundColor: saving ? T.textMuted : T.accent, borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 24 }}
        >
          {saving ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>Guardar cambios</Text>}
        </TouchableOpacity>

        {/* Danger zone */}
        <View style={{ marginTop: 32, borderWidth: 1, borderColor: T.red + '44', borderRadius: 12, padding: 16 }}>
          <Text style={{ fontSize: 13, fontWeight: '700', color: T.red, marginBottom: 8 }}>Zona de peligro</Text>
          <Text style={{ fontSize: 12, color: T.textMuted, marginBottom: 12 }}>
            Archivar desactiva el plan sin eliminarlo. Las suscripciones existentes continúan activas.
          </Text>
          <TouchableOpacity onPress={handleArchive} style={{ borderWidth: 1, borderColor: T.red + '66', borderRadius: 10, paddingVertical: 10, alignItems: 'center' }}>
            <Text style={{ color: T.red, fontWeight: '600', fontSize: 14 }}>Archivar plan</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}
