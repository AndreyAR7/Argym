import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import { supabase } from '@/lib/supabase';

interface PlanRow {
  id: string;
  name: string;
  price: number;
  currency: string;
  billing_cycle: string;
}

interface Props {
  tenantId: string;
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}

const CYCLE_LABEL: Record<string, string> = {
  monthly: '/mes',
  yearly: '/año',
  one_time: 'único',
};

export function PlanSelector({ tenantId, selectedIds, onChange }: Props) {
  const T = useTheme();
  const [plans, setPlans] = useState<PlanRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from('plans')
      .select('id, name, price, currency, billing_cycle')
      .eq('tenant_id', tenantId)
      .eq('is_active', true)
      .order('sort_order', { ascending: true })
      .then(({ data }) => setPlans((data ?? []) as PlanRow[]))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [tenantId]);

  const toggle = (id: string) => {
    onChange(selectedIds.includes(id) ? selectedIds.filter((x) => x !== id) : [...selectedIds, id]);
  };

  if (loading) return <ActivityIndicator color={T.accent} style={{ marginVertical: 8 }} />;

  if (plans.length === 0) {
    return (
      <Text style={{ color: T.textMuted, fontSize: 13, paddingVertical: 8 }}>
        No hay planes activos disponibles.
      </Text>
    );
  }

  return (
    <>
      {plans.map((plan) => {
        const selected = selectedIds.includes(plan.id);
        return (
          <TouchableOpacity
            key={plan.id}
            onPress={() => toggle(plan.id)}
            style={{
              flexDirection: 'row', alignItems: 'center', gap: 10,
              paddingVertical: 10, paddingHorizontal: 12,
              borderRadius: 8, marginBottom: 6,
              backgroundColor: selected ? T.accent + '18' : T.bgCard,
              borderWidth: 1,
              borderColor: selected ? T.accent + '66' : T.border,
            }}
          >
            <View style={{
              width: 20, height: 20, borderRadius: 5, borderWidth: 2,
              borderColor: selected ? T.accent : T.textMuted,
              backgroundColor: selected ? T.accent : 'transparent',
              alignItems: 'center', justifyContent: 'center',
            }}>
              {selected && <Text style={{ color: '#fff', fontSize: 11, fontWeight: '800' }}>✓</Text>}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: T.text, fontSize: 14, fontWeight: '600' }} numberOfLines={1}>
                {plan.name}
              </Text>
              <Text style={{ color: T.textMuted, fontSize: 11 }}>
                {plan.currency} {plan.price.toLocaleString('es-CR')}{CYCLE_LABEL[plan.billing_cycle] ?? ''}
              </Text>
            </View>
          </TouchableOpacity>
        );
      })}
    </>
  );
}
