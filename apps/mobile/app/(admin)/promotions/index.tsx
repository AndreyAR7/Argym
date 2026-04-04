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

const TYPE_LABELS: Record<string, string> = {
  discount: '🏷️ Descuento',
  announcement: '📢 Anuncio',
  bundle: '📦 Bundle',
};

export default function AdminPromotionsScreen() {
  const scheme = useColorScheme();
  const colors = scheme === 'dark' ? Colors.dark : Colors.light;
  const router = useRouter();
  const { user } = useAuthStore();
  const { promotions, isLoadingPromos, fetchPromotions, togglePromotion } = usePlansStore();

  useEffect(() => {
    if (user?.tenant_id) fetchPromotions(user.tenant_id);
  }, [user?.tenant_id]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Text style={[styles.title, { color: colors.text }]}>Promociones</Text>
        <TouchableOpacity
          onPress={() => router.push('/(admin)/promotions/create')}
          style={[styles.addBtn, { backgroundColor: '#7c3aed' }]}
        >
          <Text style={styles.addBtnText}>+ Crear promoción</Text>
        </TouchableOpacity>
      </View>

      {isLoadingPromos ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={colors.primary} />
      ) : (
        <FlatList
          data={promotions}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16 }}
          ListEmptyComponent={
            <Text style={[styles.empty, { color: colors.textMuted }]}>
              No hay promociones creadas aún.
            </Text>
          }
          renderItem={({ item }) => {
            const isActive = item.is_active;
            const now = new Date();
            const expired = item.end_date && new Date(item.end_date) < now;

            return (
              <View style={[styles.card, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
                <View style={styles.cardTop}>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <Text style={[styles.promoTitle, { color: colors.text }]}>{item.title}</Text>
                      {expired && (
                        <View style={[styles.badge, { backgroundColor: '#fee2e2' }]}>
                          <Text style={{ color: '#dc2626', fontSize: 10, fontWeight: '700' }}>EXPIRADA</Text>
                        </View>
                      )}
                      {isActive && !expired && (
                        <View style={[styles.badge, { backgroundColor: '#dcfce7' }]}>
                          <Text style={{ color: '#16a34a', fontSize: 10, fontWeight: '700' }}>ACTIVA</Text>
                        </View>
                      )}
                    </View>
                    <Text style={[styles.typeLabel, { color: colors.textSecondary }]}>
                      {TYPE_LABELS[item.type] ?? item.type}
                    </Text>
                    {item.discount_percentage && (
                      <Text style={{ color: '#7c3aed', fontWeight: '700', fontSize: 14 }}>
                        {item.discount_percentage}% de descuento
                      </Text>
                    )}
                    {item.discount_amount && (
                      <Text style={{ color: '#7c3aed', fontWeight: '700', fontSize: 14 }}>
                        -{item.discount_amount} de descuento
                      </Text>
                    )}
                    {item.end_date && (
                      <Text style={[styles.dateText, { color: colors.textMuted }]}>
                        Hasta: {new Date(item.end_date).toLocaleDateString('es-CR')}
                      </Text>
                    )}
                  </View>
                  <Switch
                    value={isActive}
                    onValueChange={(v) => togglePromotion(item.id, v)}
                    trackColor={{ true: '#7c3aed', false: colors.border }}
                  />
                </View>
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
  cardTop: { flexDirection: 'row', alignItems: 'flex-start' },
  promoTitle: { fontSize: 15, fontWeight: '700' },
  typeLabel: { fontSize: 12, marginBottom: 4 },
  dateText: { fontSize: 12, marginTop: 4 },
  badge: { borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
});
