import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  ActivityIndicator, Alert, Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTheme } from '@/hooks/useTheme';
import { usePlansStore, type Promotion } from '@/store/plans.store';
import { DatePickerField } from '@/components/shared/DatePickerField';
import { supabase } from '@/lib/supabase';
import { getPromotionVideoIds, setPromotionVideos } from '@/services/videos.service';
import { getOfferPlanIds, setOfferPlans } from '@/services/offers.service';
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

export default function EditPromotionScreen() {
  const T = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { promotions, updatePromotion } = usePlansStore();

  const [promo, setPromo] = useState<Promotion | null>(promotions.find((p) => p.id === id) ?? null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<'discount' | 'announcement' | 'bundle'>('announcement');
  const [targetLevel, setTargetLevel] = useState<'all' | 'beginner' | 'intermediate' | 'advanced'>('all');
  const [discountPct, setDiscountPct] = useState('');
  const [discountAmt, setDiscountAmt] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [hasEndDate, setHasEndDate] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const [planIds, setPlanIds] = useState<string[]>([]);
  const [videoIds, setVideoIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(!promo);

  const handleEndDateToggle = (value: boolean) => {
    setHasEndDate(value);
    if (value && !endDate) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      setEndDate(tomorrow.toISOString().split('T')[0]);
    }
  };

  useEffect(() => {
    if (!id) return;
    const loadPromo = async (p: Promotion) => {
      populate(p);
      const [vids, plans] = await Promise.all([
        getPromotionVideoIds(p.id),
        getOfferPlanIds(p.id),
      ]);
      setVideoIds(vids);
      setPlanIds(plans);
    };
    if (promo) { loadPromo(promo); return; }
    supabase.from('promotions').select('*').eq('id', id).single().then(({ data }) => {
      if (data) { setPromo(data as Promotion); loadPromo(data as Promotion); }
      else setLoading(false);
    });
  }, [id]);

  function populate(p: Promotion) {
    setTitle(p.title);
    setDescription(p.description ?? '');
    setType(p.type);
    setTargetLevel(p.target_level ?? 'all');
    setDiscountPct(p.discount_percentage != null ? String(p.discount_percentage) : '');
    setDiscountAmt(p.discount_amount != null ? String(p.discount_amount) : '');
    setStartDate(p.start_date ? p.start_date.slice(0, 10) : '');
    setEndDate(p.end_date ? p.end_date.slice(0, 10) : '');
    setHasEndDate(!!p.end_date);
    setIsActive(p.is_active);
    setLoading(false);
  }

  const isExpired = promo?.end_date ? new Date(promo.end_date) < new Date() : false;

  const handleSave = async () => {
    if (!title.trim()) { Alert.alert('Error', 'El título es requerido'); return; }
    if (planIds.length === 0) { Alert.alert('Error', 'La oferta debe tener al menos un plan'); return; }
    if (!id) return;
    setSaving(true);
    try {
      await Promise.all([
        updatePromotion(id, {
          title: title.trim(),
          description: description.trim() || null,
          type,
          target_level: targetLevel,
          discount_percentage: discountPct ? parseFloat(discountPct) : null,
          discount_amount: discountAmt ? parseFloat(discountAmt) : null,
          start_date: startDate ? new Date(startDate).toISOString() : new Date().toISOString(),
          end_date: hasEndDate && endDate ? new Date(endDate).toISOString() : null,
          is_active: isActive,
        } as any),
        setOfferPlans(id, planIds),
        setPromotionVideos(id, videoIds),
      ]);
      Alert.alert('✅ Guardado', 'La oferta fue actualizada.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'No se pudo actualizar');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    Alert.alert('Desactivar oferta', '¿Estás seguro?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Desactivar', style: 'destructive',
        onPress: async () => {
          try {
            await updatePromotion(id!, { is_active: false });
            router.back();
          } catch (e: any) { Alert.alert('Error', e.message); }
        },
      },
    ]);
  };

  const input = {
    borderWidth: 1, borderColor: T.border, borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 10, fontSize: 15,
    color: T.text, backgroundColor: T.bgCardElevated,
  };

  const sectionLabel = { fontSize: 11, fontWeight: '700' as const, textTransform: 'uppercase' as const, letterSpacing: 0.6, color: T.textSecondary, marginBottom: 8, marginTop: 20 };

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
        <Text style={{ fontSize: 18, fontWeight: '700', color: T.text }}>Editar oferta</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 16 }} keyboardShouldPersistTaps="handled">
        {/* Status row */}
        <View style={{ flexDirection: 'row', gap: 10, marginBottom: 8 }}>
          <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: T.bgCard, borderRadius: 10, padding: 14, borderWidth: 1, borderColor: T.border }}>
            <Text style={{ fontSize: 14, fontWeight: '600', color: T.text }}>Activa</Text>
            <Switch value={isActive} onValueChange={setIsActive} trackColor={{ true: T.accent, false: T.border }} />
          </View>
          {isExpired && (
            <View style={{ backgroundColor: T.red + '18', borderRadius: 10, padding: 14, justifyContent: 'center', borderWidth: 1, borderColor: T.red + '44' }}>
              <Text style={{ color: T.red, fontSize: 12, fontWeight: '700' }}>VENCIDA</Text>
            </View>
          )}
        </View>

        {/* Título */}
        <Text style={sectionLabel}>Título *</Text>
        <TextInput style={input} value={title} onChangeText={setTitle} placeholder="Ej: Oferta de verano" placeholderTextColor={T.textMuted} />

        {/* Descripción */}
        <Text style={sectionLabel}>Descripción</Text>
        <TextInput style={[input, { height: 80, textAlignVertical: 'top' }]} value={description} onChangeText={setDescription} multiline placeholder="Descripción visible para los clientes..." placeholderTextColor={T.textMuted} />

        {/* Tipo */}
        <Text style={sectionLabel}>Tipo de oferta</Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {TYPES.map((t) => (
            <TouchableOpacity key={t.value} onPress={() => setType(t.value)}
              style={{ flex: 1, borderWidth: 1, borderRadius: 8, paddingVertical: 8, alignItems: 'center', backgroundColor: type === t.value ? T.accent : T.bgCard, borderColor: type === t.value ? T.accent : T.border }}>
              <Text style={{ color: type === t.value ? '#fff' : T.text, fontSize: 11, fontWeight: '600', textAlign: 'center' }}>{t.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Nivel objetivo */}
        <Text style={sectionLabel}>Dirigida a</Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>
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

        {/* Fechas */}
        <DatePickerField label="Fecha de inicio" value={startDate} onChange={setStartDate} placeholder="Fecha de inicio" />
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12, marginBottom: 8 }}>
          <Text style={{ fontSize: 13, fontWeight: '600', color: T.textSecondary }}>Fecha de vencimiento</Text>
          <Switch value={hasEndDate} onValueChange={handleEndDateToggle} trackColor={{ true: T.accent, false: T.border }} />
        </View>
        {hasEndDate && (
          <DatePickerField label="Fecha de fin" value={endDate} onChange={setEndDate} placeholder="Seleccionar fecha" minDate={new Date()} />
        )}

        {/* Planes */}
        <Text style={sectionLabel}>Planes de esta oferta *</Text>
        <Text style={{ fontSize: 12, color: T.textMuted, marginBottom: 10 }}>
          Los clientes solo verán y podrán suscribirse a estos planes.
        </Text>
        {promo?.tenant_id ? (
          <PlanSelector tenantId={promo.tenant_id} selectedIds={planIds} onChange={setPlanIds} />
        ) : null}

        {/* Videos */}
        <Text style={sectionLabel}>Videos incluidos</Text>
        <Text style={{ fontSize: 11, color: T.textMuted, marginBottom: 8 }}>{videoIds.length} seleccionados</Text>
        {promo?.tenant_id ? (
          <VideoSelector tenantId={promo.tenant_id} selectedIds={videoIds} onChange={setVideoIds} />
        ) : null}

        <TouchableOpacity onPress={handleSave} disabled={saving}
          style={{ backgroundColor: saving ? T.textMuted : T.accent, borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 24 }}>
          {saving ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>Guardar cambios</Text>}
        </TouchableOpacity>

        <View style={{ marginTop: 32, borderWidth: 1, borderColor: T.red + '44', borderRadius: 12, padding: 16, marginBottom: 40 }}>
          <Text style={{ fontSize: 13, fontWeight: '700', color: T.red, marginBottom: 8 }}>Zona de peligro</Text>
          <Text style={{ fontSize: 12, color: T.textMuted, marginBottom: 12 }}>
            Desactiva la oferta. Las suscripciones activas no se cancelan.
          </Text>
          <TouchableOpacity onPress={handleDelete}
            style={{ borderWidth: 1, borderColor: T.red + '66', borderRadius: 10, paddingVertical: 10, alignItems: 'center' }}>
            <Text style={{ color: T.red, fontWeight: '600', fontSize: 14 }}>Desactivar oferta</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
