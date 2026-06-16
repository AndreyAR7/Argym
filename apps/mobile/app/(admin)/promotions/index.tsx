import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, ActivityIndicator, Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { useTheme } from '@/hooks/useTheme';
import { supabase } from '@/lib/supabase';
import { usePlansStore } from '@/store/plans.store';
import { useAuthStore } from '@/store/auth.store';
import type { Promotion } from '@/store/plans.store';
import type { ThemeConfig } from '@/store/profile.store';

const TYPE_LABELS: Record<string, string> = {
  discount: '🏷️ Descuento',
  announcement: '📢 Anuncio',
  bundle: '📦 Bundle',
};

const LEVEL_LABELS: Record<string, string> = {
  all:          'Todos',
  beginner:     'Principiante',
  intermediate: 'Intermedio',
  advanced:     'Avanzado',
};

function getLevelColor(level: string, T: ThemeConfig): string {
  switch (level) {
    case 'beginner':     return T.green;
    case 'intermediate': return T.orange;
    case 'advanced':     return T.red;
    default:             return T.accent; // 'all' and unknown
  }
}

export default function AdminPromotionsScreen() {
  const T = useTheme();
  const router = useRouter();
  const { user } = useAuthStore();
  const { togglePromotion } = usePlansStore();
  const [promos, setPromos] = useState<Promotion[]>([]);
  const [loading, setLoading] = useState(false);

  const loadPromos = useCallback(async () => {
    if (!user?.tenant_id) return;
    setLoading(true);
    const { data } = await supabase
      .from('promotions')
      .select('*')
      .eq('tenant_id', user.tenant_id)
      .order('created_at', { ascending: false });
    setPromos((data ?? []) as Promotion[]);
    setLoading(false);
  }, [user?.tenant_id]);

  // Refresh every time the screen comes into focus (handles post-create nav back)
  useFocusEffect(useCallback(() => { loadPromos(); }, [loadPromos]));

  const handleToggle = async (id: string, value: boolean) => {
    await togglePromotion(id, value);
    setPromos((prev) => prev.map((p) => (p.id === id ? { ...p, is_active: value } : p)));
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: T.bg }}>
      <View style={[styles.header, { borderBottomColor: T.border }]}>
        <Text style={[styles.title, { color: T.text }]}>Promociones</Text>
        <TouchableOpacity
          onPress={() => router.push('/(admin)/promotions/create')}
          style={[styles.addBtn, { backgroundColor: T.accent }]}
        >
          <Text style={styles.addBtnText}>+ Crear</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={T.accent} />
      ) : (
        <FlatList
          data={promos}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16 }}
          ListEmptyComponent={
            <Text style={[styles.empty, { color: T.textMuted }]}>
              No hay promociones creadas aún.
            </Text>
          }
          renderItem={({ item }) => {
            const now = new Date();
            const expired = item.end_date ? new Date(item.end_date) < now : false;
            const notStarted = new Date(item.start_date) > now;

            return (
              <View style={[styles.card, { backgroundColor: T.bgCardElevated, borderColor: T.border }]}>
                <View style={styles.cardTop}>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
                      <Text style={[styles.promoTitle, { color: T.text }]}>{item.title}</Text>
                      {expired && (
                        <View style={[styles.badge, { backgroundColor: T.red + '22' }]}>
                          <Text style={{ color: T.red, fontSize: 10, fontWeight: '700' }}>EXPIRADA</Text>
                        </View>
                      )}
                      {!expired && notStarted && (
                        <View style={[styles.badge, { backgroundColor: T.orange + '22' }]}>
                          <Text style={{ color: T.orange, fontSize: 10, fontWeight: '700' }}>PENDIENTE</Text>
                        </View>
                      )}
                      {item.is_active && !expired && !notStarted && (
                        <View style={[styles.badge, { backgroundColor: T.green + '22' }]}>
                          <Text style={{ color: T.green, fontSize: 10, fontWeight: '700' }}>ACTIVA</Text>
                        </View>
                      )}
                      {!item.is_active && !expired && (
                        <View style={[styles.badge, { backgroundColor: T.bgCard }]}>
                          <Text style={{ color: T.textMuted, fontSize: 10, fontWeight: '700' }}>INACTIVA</Text>
                        </View>
                      )}
                    </View>

                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <Text style={[styles.typeLabel, { color: T.textSecondary }]}>
                        {TYPE_LABELS[item.type] ?? item.type}
                      </Text>
                      <View style={[styles.badge, { backgroundColor: getLevelColor(item.target_level ?? 'all', T) + '22' }]}>
                        <Text style={{ fontSize: 10, fontWeight: '700', color: getLevelColor(item.target_level ?? 'all', T) }}>
                          {LEVEL_LABELS[item.target_level ?? 'all'] ?? 'Todos'}
                        </Text>
                      </View>
                    </View>
                    {item.discount_percentage ? (
                      <Text style={{ color: T.purple, fontWeight: '700', fontSize: 14 }}>
                        {item.discount_percentage}% de descuento
                      </Text>
                    ) : null}
                    {item.discount_amount ? (
                      <Text style={{ color: T.purple, fontWeight: '700', fontSize: 14 }}>
                        -{item.discount_amount} de descuento
                      </Text>
                    ) : null}

                    <View style={{ flexDirection: 'row', gap: 16, marginTop: 4 }}>
                      <Text style={[styles.dateText, { color: T.textMuted }]}>
                        Desde: {new Date(item.start_date).toLocaleDateString('es-CR')}
                      </Text>
                      {item.end_date ? (
                        <Text style={[styles.dateText, { color: expired ? T.red : T.textMuted }]}>
                          Hasta: {new Date(item.end_date).toLocaleDateString('es-CR')}
                        </Text>
                      ) : (
                        <Text style={[styles.dateText, { color: T.textMuted }]}>Sin vencimiento</Text>
                      )}
                    </View>
                  </View>

                  <Switch
                    value={item.is_active}
                    onValueChange={(v) => handleToggle(item.id, v)}
                    trackColor={{ true: T.accent, false: T.border }}
                    thumbColor={item.is_active ? T.accent : T.textMuted}
                  />
                </View>

                <TouchableOpacity
                  onPress={() => router.push({ pathname: '/(admin)/promotions/edit', params: { id: item.id } })}
                  style={[styles.editBtn, { borderColor: T.border }]}
                >
                  <Text style={{ fontSize: 12, color: T.textSecondary, fontWeight: '600' }}>✏️ Editar</Text>
                </TouchableOpacity>
              </View>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1,
  },
  title: { fontSize: 22, fontWeight: '700' },
  addBtn: { borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8 },
  addBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  empty: { textAlign: 'center', marginTop: 40, fontSize: 15 },
  card: {
    borderRadius: 12, borderWidth: 1, padding: 14, marginBottom: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 3, elevation: 2,
  },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  promoTitle: { fontSize: 15, fontWeight: '700' },
  typeLabel: { fontSize: 12, marginBottom: 4 },
  dateText: { fontSize: 12 },
  badge: { borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  editBtn: {
    borderRadius: 8, borderWidth: 1, paddingVertical: 8,
    alignItems: 'center', marginTop: 10,
  },
});
