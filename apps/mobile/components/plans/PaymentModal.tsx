import React, { useState, useEffect, useRef } from 'react';
import {
  Modal, View, Text, TouchableOpacity,
  StyleSheet, Animated, ScrollView, ActivityIndicator,
} from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import type { Plan, Promotion } from '@/store/plans.store';

interface Props {
  plan: Plan | null;
  promotion?: Promotion | null;
  visible: boolean;
  onClose: () => void;
  onConfirm: (plan: Plan, promoId?: string) => Promise<void>;
}

type Step = 'summary' | 'processing';

function discountedPrice(plan: Plan, promo?: Promotion | null): number | null {
  if (!promo || promo.type !== 'discount') return null;
  if (promo.applies_to_plan_id && promo.applies_to_plan_id !== plan.id) return null;
  if (promo.discount_percentage) return plan.price * (1 - promo.discount_percentage / 100);
  if (promo.discount_amount) return Math.max(0, plan.price - promo.discount_amount);
  return null;
}

export function PaymentModal({ plan, promotion, visible, onClose, onConfirm }: Props) {
  const T = useTheme();
  const [step, setStep] = useState<Step>('summary');
  const [error, setError] = useState('');

  const scaleAnim = useRef(new Animated.Value(0.85)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      setStep('summary');
      setError('');
      Animated.parallel([
        Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true }),
        Animated.timing(opacityAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start();
    } else {
      scaleAnim.setValue(0.85);
      opacityAnim.setValue(0);
    }
  }, [visible]);

  if (!plan) return null;

  const finalPrice = discountedPrice(plan, promotion) ?? plan.price;
  const hasDiscount = finalPrice < plan.price;

  const handleConfirmPress = async () => {
    setError('');
    setStep('processing');
    try {
      // Opens the real Stripe Checkout in an external browser and awaits its
      // close — the subscription itself is created by the Stripe webhook,
      // not by this modal, so there's nothing genuine to confirm here once
      // the browser closes. Just dismiss and let the plans screen's
      // subscription refetch (already triggered inside onConfirm) reflect
      // whatever state Stripe/the webhook actually reached.
      await onConfirm(plan, promotion?.id);
      onClose();
    } catch (e: any) {
      setError(e.message ?? 'Error al procesar el pago.');
      setStep('summary');
    }
  };

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Animated.View style={[styles.card, { backgroundColor: T.bgCard, transform: [{ scale: scaleAnim }], opacity: opacityAnim }]}>
          {/* ── STEP: summary ── */}
          {step === 'summary' && (
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={[styles.stepLabel, { color: T.textMuted }]}>RESUMEN DE COMPRA</Text>
              <Text style={[styles.planName, { color: T.text }]}>{plan.name}</Text>
              {plan.description ? (
                <Text style={[styles.planDesc, { color: T.textSecondary }]}>{plan.description}</Text>
              ) : null}

              <View style={[styles.priceBox, { backgroundColor: T.bg, borderColor: T.border }]}>
                {hasDiscount && (
                  <View style={styles.priceRow}>
                    <Text style={[styles.priceLabel, { color: T.textMuted }]}>Precio original</Text>
                    <Text style={[styles.originalPrice, { color: T.textMuted }]}>
                      {plan.currency} {plan.price.toLocaleString('es-CR')}
                    </Text>
                  </View>
                )}
                {promotion && hasDiscount && (
                  <View style={styles.priceRow}>
                    <Text style={[styles.priceLabel, { color: T.green }]}>Descuento ({promotion.title})</Text>
                    <Text style={{ fontSize: 14, fontWeight: '700', color: T.green }}>
                      -{promotion.discount_percentage
                        ? `${promotion.discount_percentage}%`
                        : `${plan.currency} ${(plan.price - finalPrice).toLocaleString('es-CR')}`}
                    </Text>
                  </View>
                )}
                <View style={[styles.priceRow, { marginTop: 6 }]}>
                  <Text style={[styles.priceLabel, { color: T.text, fontWeight: '700', fontSize: 15 }]}>Total a pagar</Text>
                  <Text style={{ fontSize: 22, fontWeight: '900', color: T.accent }}>
                    {plan.currency} {finalPrice.toLocaleString('es-CR', { minimumFractionDigits: 0 })}
                  </Text>
                </View>
              </View>

              <View style={[styles.simNote, { backgroundColor: T.accent + '18', borderColor: T.accent + '44' }]}>
                <Text style={{ fontSize: 12, color: T.accent, textAlign: 'center' }}>
                  Serás redirigido a Stripe para completar el pago de forma segura.
                </Text>
              </View>

              {error ? (
                <Text style={{ color: T.red, fontSize: 13, marginBottom: 12, textAlign: 'center' }}>{error}</Text>
              ) : null}

              <View style={styles.actions}>
                <TouchableOpacity onPress={onClose} style={[styles.btn, { borderColor: T.border, borderWidth: 1 }]}>
                  <Text style={{ color: T.text, fontWeight: '600' }}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleConfirmPress} style={[styles.btn, { backgroundColor: T.accent }]}>
                  <Text style={{ color: '#fff', fontWeight: '700' }}>Continuar a pago</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          )}

          {/* ── STEP: processing ── */}
          {step === 'processing' && (
            <View style={styles.centeredStep}>
              <ActivityIndicator size="large" color={T.accent} style={{ marginBottom: 20 }} />
              <Text style={[styles.processingText, { color: T.text }]}>Abriendo pago seguro...</Text>
              <Text style={[styles.processingSubtext, { color: T.textMuted }]}>Por favor espera</Text>
            </View>
          )}
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    borderRadius: 20,
    padding: 24,
    maxHeight: '88%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 12,
  },
  stepLabel: { fontSize: 10, fontWeight: '800', letterSpacing: 1.5, marginBottom: 6 },
  planName: { fontSize: 22, fontWeight: '900', marginBottom: 6 },
  planDesc: { fontSize: 13, lineHeight: 18, marginBottom: 14 },
  priceBox: {
    borderRadius: 14, borderWidth: 1, padding: 16, marginBottom: 14,
  },
  priceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  priceLabel: { fontSize: 13 },
  originalPrice: { fontSize: 13, textDecorationLine: 'line-through' },
  simNote: { borderRadius: 10, borderWidth: 1, padding: 10, marginBottom: 20 },
  actions: { flexDirection: 'row', gap: 12 },
  btn: { flex: 1, borderRadius: 13, paddingVertical: 14, alignItems: 'center' },
  centeredStep: { alignItems: 'center', paddingVertical: 32 },
  processingText: { fontSize: 18, fontWeight: '700', marginBottom: 6 },
  processingSubtext: { fontSize: 14 },
});
