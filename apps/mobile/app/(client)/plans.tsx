import React, { useEffect, useState } from 'react';
import {
  View, Text, FlatList, StyleSheet,
  useColorScheme, ActivityIndicator, Alert, Modal, TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '@/constants/colors';
import { usePlansStore } from '@/store/plans.store';
import { useAuthStore } from '@/store/auth.store';
import { PlanCard } from '@/components/plans/PlanCard';
import { PromoBanner } from '@/components/plans/PromoBanner';
import type { Plan } from '@/store/plans.store';

export default function ClientPlansScreen() {
  const scheme = useColorScheme();
  const colors = scheme === 'dark' ? Colors.dark : Colors.light;
  const { user } = useAuthStore();
  const {
    plans, promotions, activePromotion, mySubscription,
    isLoadingPlans, fetchPlans, fetchPromotions, fetchMySubscription,
    subscribeToRealtime, dismissPromotion, mockSubscribe,
  } = usePlansStore();

  const [confirmPlan, setConfirmPlan] = useState<Plan | null>(null);
  const [subscribing, setSubscribing] = useState(false);

  useEffect(() => {
    if (!user?.tenant_id) return;
    fetchPlans(user.tenant_id);
    fetchPromotions(user.tenant_id);
    fetchMySubscription(user.id, user.tenant_id);
    const unsub = subscribeToRealtime(user.tenant_id);
    return unsub;
  }, [user?.tenant_id]);

  const handleSubscribe = async () => {
    if (!confirmPlan || !user) return;
    setSubscribing(true);
    try {
      const promo = promotions.find(
        (p) => p.type === 'discount' && (!p.applies_to_plan_id || p.applies_to_plan_id === confirmPlan.id)
      );
      await mockSubscribe(confirmPlan.id, user.id, user.tenant_id, promo?.id);
      setConfirmPlan(null);
      Alert.alert('¡Listo!', `Te suscribiste al plan ${confirmPlan.name}`);
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'No se pudo completar la suscripción');
    } finally {
      setSubscribing(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Text style={[styles.title, { color: colors.text }]}>Planes disponibles</Text>
      </View>

      {isLoadingPlans ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={colors.primary} />
      ) : (
        <FlatList
          data={plans.filter((p) => p.is_active)}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16 }}
          ListHeaderComponent={
            activePromotion ? (
              <PromoBanner
                promotion={activePromotion}
                onDismiss={dismissPromotion}
              />
            ) : null
          }
          ListEmptyComponent={
            <Text style={[styles.empty, { color: colors.textMuted }]}>
              No hay planes disponibles en este momento.
            </Text>
          }
          renderItem={({ item }) => (
            <PlanCard
              plan={item}
              activePromo={promotions.find(
                (p) => p.type === 'discount' && (!p.applies_to_plan_id || p.applies_to_plan_id === item.id)
              )}
              isSubscribed={mySubscription?.plan_id === item.id}
              onSubscribe={setConfirmPlan}
            />
          )}
        />
      )}

      {/* Confirm subscription modal */}
      <Modal visible={!!confirmPlan} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.surfaceElevated }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Confirmar suscripción</Text>
            <Text style={[styles.modalDesc, { color: colors.textSecondary }]}>
              ¿Deseas suscribirte al plan{' '}
              <Text style={{ fontWeight: '700', color: colors.text }}>{confirmPlan?.name}</Text>?
            </Text>
            <Text style={[styles.modalNote, { color: colors.textMuted }]}>
              (Pago simulado — integración con Stripe próximamente)
            </Text>
            <View style={styles.modalActions}>
              <TouchableOpacity
                onPress={() => setConfirmPlan(null)}
                style={[styles.modalBtn, { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 }]}
              >
                <Text style={{ color: colors.text, fontWeight: '600' }}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSubscribe}
                disabled={subscribing}
                style={[styles.modalBtn, { backgroundColor: colors.primary }]}
              >
                {subscribing
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Text style={{ color: '#fff', fontWeight: '700' }}>Confirmar</Text>
                }
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1 },
  title: { fontSize: 22, fontWeight: '700' },
  empty: { textAlign: 'center', marginTop: 40, fontSize: 15 },
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center', alignItems: 'center', padding: 24,
  },
  modalCard: {
    borderRadius: 16, padding: 24, width: '100%',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2, shadowRadius: 12, elevation: 8,
  },
  modalTitle: { fontSize: 18, fontWeight: '700', marginBottom: 8 },
  modalDesc: { fontSize: 15, lineHeight: 22, marginBottom: 6 },
  modalNote: { fontSize: 12, marginBottom: 20 },
  modalActions: { flexDirection: 'row', gap: 12 },
  modalBtn: { flex: 1, borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
});
