import React, { useEffect, useState } from 'react';
import {
  View, Text, FlatList, StyleSheet,
  ActivityIndicator, Alert, Modal, TouchableOpacity, StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/hooks/useTheme';
import { usePlansStore } from '@/store/plans.store';
import { useAuthStore } from '@/store/auth.store';
import { PlanCard } from '@/components/plans/PlanCard';
import { ClientTopBar } from '@/components/client/ClientTopBar';
import type { Plan } from '@/store/plans.store';

export default function ClientPlansScreen() {
  const T = useTheme();
  const { user } = useAuthStore();
  const {
    plans, promotions, mySubscription,
    isLoadingPlans, fetchPlans, fetchPromotions, fetchMySubscription,
    subscribeToRealtime, mockSubscribe,
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

  const activePlans = plans.filter((p) => p.is_active);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: T.bg }} edges={['left', 'right']}>
      <StatusBar barStyle="light-content" backgroundColor={T.bg} />
      <ClientTopBar title="Planes" />

      {isLoadingPlans ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator color={T.accent} size="large" />
        </View>
      ) : (
        <FlatList
          data={activePlans}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
          ListHeaderComponent={
            <View style={{ marginBottom: 8 }}>
              <Text style={[styles.pageTitle, { color: T.text }]}>Planes disponibles</Text>
              <Text style={[styles.pageSubtitle, { color: T.textSecondary }]}>
                {activePlans.length} {activePlans.length === 1 ? 'plan activo' : 'planes activos'}
              </Text>
            </View>
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={{ fontSize: 36, marginBottom: 12 }}>📋</Text>
              <Text style={[styles.emptyText, { color: T.textMuted }]}>
                No hay planes disponibles en este momento.
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <PlanCard
              plan={item}
              activePromo={promotions.find(
                (p) => p.type === 'discount' && p.is_active &&
                  (!p.applies_to_plan_id || p.applies_to_plan_id === item.id)
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
          <View style={[styles.modalCard, { backgroundColor: T.bgCard }]}>
            <Text style={[styles.modalTitle, { color: T.text }]}>Confirmar suscripción</Text>
            <Text style={[styles.modalDesc, { color: T.textSecondary }]}>
              ¿Deseas suscribirte al plan{' '}
              <Text style={{ fontWeight: '700', color: T.text }}>{confirmPlan?.name}</Text>?
            </Text>
            <Text style={[styles.modalNote, { color: T.textMuted }]}>
              (Pago simulado — integración con Stripe próximamente)
            </Text>
            <View style={styles.modalActions}>
              <TouchableOpacity
                onPress={() => setConfirmPlan(null)}
                style={[styles.modalBtn, { backgroundColor: T.bg, borderColor: T.border, borderWidth: 1 }]}
              >
                <Text style={{ color: T.text, fontWeight: '600' }}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSubscribe}
                disabled={subscribing}
                style={[styles.modalBtn, { backgroundColor: T.accent }]}
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
  pageTitle: { fontSize: 24, fontWeight: '800', marginBottom: 2 },
  pageSubtitle: { fontSize: 13, marginBottom: 16 },
  empty: { alignItems: 'center', paddingVertical: 60 },
  emptyText: { fontSize: 15, textAlign: 'center' },
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center', alignItems: 'center', padding: 24,
  },
  modalCard: {
    borderRadius: 18, padding: 24, width: '100%',
    shadowColor: '#000', shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25, shadowRadius: 16, elevation: 10,
  },
  modalTitle: { fontSize: 18, fontWeight: '800', marginBottom: 8 },
  modalDesc: { fontSize: 15, lineHeight: 22, marginBottom: 6 },
  modalNote: { fontSize: 12, marginBottom: 20 },
  modalActions: { flexDirection: 'row', gap: 12 },
  modalBtn: { flex: 1, borderRadius: 12, paddingVertical: 13, alignItems: 'center' },
});
