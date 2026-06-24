import React, { useEffect } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, useColorScheme, ActivityIndicator, Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Colors } from '@/constants/colors';
import { usePlansStore } from '@/store/plans.store';
import { useAuthStore } from '@/store/auth.store';

export default function AdminPlansScreen() {
  const scheme = useColorScheme();
  const colors = scheme === 'dark' ? Colors.dark : Colors.light;
  const router = useRouter();
  const { user } = useAuthStore();
  const { plans, isLoadingPlans, fetchPlans, togglePlan } = usePlansStore();

  useEffect(() => {
    if (user?.tenant_id) fetchPlans(user.tenant_id);
  }, [user?.tenant_id]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Text style={[styles.title, { color: colors.text }]}>Planes</Text>
        <TouchableOpacity
          onPress={() => router.push('/(admin)/plans/create')}
          style={[styles.addBtn, { backgroundColor: colors.primary }]}
        >
          <Text style={styles.addBtnText}>+ Nuevo plan</Text>
        </TouchableOpacity>
      </View>

      {isLoadingPlans ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={colors.primary} />
      ) : (
        <FlatList
          data={plans}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16 }}
          ListEmptyComponent={
            <Text style={[styles.empty, { color: colors.textMuted }]}>
              No hay planes creados aún.
            </Text>
          }
          renderItem={({ item }) => (
            <View style={[styles.card, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
              <View style={styles.cardRow}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.planName, { color: colors.text }]}>{item.name}</Text>
                  <Text style={[styles.planPrice, { color: colors.primary }]}>
                    {item.currency} {item.price.toLocaleString()}
                    <Text style={[styles.cycle, { color: colors.textMuted }]}>
                      {item.billing_cycle === 'monthly' ? ' /mes' : item.billing_cycle === 'yearly' ? ' /año' : ''}
                    </Text>
                  </Text>
                  <Text style={[styles.featureCount, { color: colors.textSecondary }]}>
                    {item.features.length} características
                  </Text>
                  {item.expiry_date ? (() => {
                    const exp = new Date(item.expiry_date);
                    const expired = exp < new Date();
                    return (
                      <Text style={{ fontSize: 11, marginTop: 4, color: expired ? colors.red ?? '#dc2626' : colors.textMuted }}>
                        {expired ? '⚠ Expiró ' : '⏳ Expira '}
                        {exp.toLocaleDateString('es-CR', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </Text>
                    );
                  })() : null}
                </View>
                <View style={styles.cardActions}>
                  <Switch
                    value={item.is_active}
                    onValueChange={(v) => togglePlan(item.id, v)}
                    trackColor={{ true: colors.primary, false: colors.border }}
                  />
                  <TouchableOpacity
                    onPress={() => router.push({ pathname: '/(admin)/plans/edit', params: { id: item.id } })}
                    style={[styles.editBtn, { borderColor: colors.border }]}
                  >
                    <Text style={[styles.editBtnText, { color: colors.text }]}>Editar</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}
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
  cardRow: { flexDirection: 'row', alignItems: 'center' },
  planName: { fontSize: 16, fontWeight: '700', marginBottom: 2 },
  planPrice: { fontSize: 18, fontWeight: '700' },
  cycle: { fontSize: 13, fontWeight: '400' },
  featureCount: { fontSize: 12, marginTop: 2 },
  cardActions: { alignItems: 'flex-end', gap: 8 },
  editBtn: { borderWidth: 1, borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4 },
  editBtnText: { fontSize: 13, fontWeight: '500' },
});
