import React, { useState, useEffect, useRef } from 'react';
import {
  Modal, View, Text, TouchableOpacity, TextInput,
  StyleSheet, Animated, KeyboardAvoidingView, Platform,
  ScrollView, ActivityIndicator,
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

type Step = 'summary' | 'card' | 'processing' | 'success';

function discountedPrice(plan: Plan, promo?: Promotion | null): number | null {
  if (!promo || promo.type !== 'discount') return null;
  if (promo.applies_to_plan_id && promo.applies_to_plan_id !== plan.id) return null;
  if (promo.discount_percentage) return plan.price * (1 - promo.discount_percentage / 100);
  if (promo.discount_amount) return Math.max(0, plan.price - promo.discount_amount);
  return null;
}

function formatCardNumber(raw: string): string {
  return raw.replace(/\D/g, '').slice(0, 16).replace(/(.{4})/g, '$1 ').trim();
}

function formatExpiry(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 4);
  if (digits.length > 2) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return digits;
}

export function PaymentModal({ plan, promotion, visible, onClose, onConfirm }: Props) {
  const T = useTheme();
  const [step, setStep] = useState<Step>('summary');
  const [cardNumber, setCardNumber] = useState('');
  const [cardName, setCardName] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');
  const [error, setError] = useState('');

  const scaleAnim = useRef(new Animated.Value(0.85)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const checkAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      setStep('summary');
      setCardNumber(''); setCardName(''); setExpiry(''); setCvv(''); setError('');
      Animated.parallel([
        Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true }),
        Animated.timing(opacityAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start();
    } else {
      scaleAnim.setValue(0.85);
      opacityAnim.setValue(0);
      checkAnim.setValue(0);
    }
  }, [visible]);

  if (!plan) return null;

  const finalPrice = discountedPrice(plan, promotion) ?? plan.price;
  const hasDiscount = finalPrice < plan.price;

  const handlePayPress = () => {
    setError('');
    const digits = cardNumber.replace(/\s/g, '');
    if (digits.length < 16) { setError('Número de tarjeta inválido.'); return; }
    if (!cardName.trim()) { setError('Ingresa el nombre del titular.'); return; }
    const expiryParts = expiry.split('/');
    if (expiryParts.length !== 2 || expiryParts[0].length !== 2 || expiryParts[1].length !== 2) {
      setError('Fecha de vencimiento inválida (MM/AA).'); return;
    }
    if (cvv.length < 3) { setError('CVV inválido.'); return; }

    setStep('processing');
    setTimeout(async () => {
      try {
        await onConfirm(plan, promotion?.id);
        setStep('success');
        Animated.spring(checkAnim, { toValue: 1, useNativeDriver: true, bounciness: 14 }).start();
      } catch (e: any) {
        setError(e.message ?? 'Error al procesar el pago.');
        setStep('card');
      }
    }, 2000);
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

              <View style={[styles.simNote, { backgroundColor: T.orange + '18', borderColor: T.orange + '44' }]}>
                <Text style={{ fontSize: 12, color: T.orange, textAlign: 'center' }}>
                  Pago simulado — no se realizará ningún cargo real.
                </Text>
              </View>

              <View style={styles.actions}>
                <TouchableOpacity onPress={onClose} style={[styles.btn, { borderColor: T.border, borderWidth: 1 }]}>
                  <Text style={{ color: T.text, fontWeight: '600' }}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setStep('card')} style={[styles.btn, { backgroundColor: T.accent }]}>
                  <Text style={{ color: '#fff', fontWeight: '700' }}>Continuar</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          )}

          {/* ── STEP: card ── */}
          {step === 'card' && (
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
              <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                <Text style={[styles.stepLabel, { color: T.textMuted }]}>DATOS DE PAGO</Text>
                <Text style={[styles.planName, { color: T.text }]}>
                  {plan.currency} {finalPrice.toLocaleString('es-CR', { minimumFractionDigits: 0 })}
                </Text>

                <View style={[styles.cardVisual, { backgroundColor: T.accent }]}>
                  <Text style={styles.cardChip}>▪▪ ▪▪</Text>
                  <Text style={styles.cardNumberDisplay}>
                    {cardNumber || '•••• •••• •••• ••••'}
                  </Text>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={styles.cardLabel}>{cardName || 'TITULAR'}</Text>
                    <Text style={styles.cardLabel}>{expiry || 'MM/AA'}</Text>
                  </View>
                </View>

                <Text style={[styles.fieldLabel, { color: T.textSecondary }]}>Número de tarjeta</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: T.bg, borderColor: T.border, color: T.text }]}
                  value={cardNumber}
                  onChangeText={(t) => setCardNumber(formatCardNumber(t))}
                  placeholder="1234 5678 9012 3456"
                  placeholderTextColor={T.textMuted}
                  keyboardType="numeric"
                  maxLength={19}
                />
                <Text style={[styles.fieldLabel, { color: T.textSecondary }]}>Nombre en la tarjeta</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: T.bg, borderColor: T.border, color: T.text }]}
                  value={cardName}
                  onChangeText={(t) => setCardName(t.toUpperCase())}
                  placeholder="NOMBRE APELLIDO"
                  placeholderTextColor={T.textMuted}
                  autoCapitalize="characters"
                />
                <View style={{ flexDirection: 'row', gap: 12 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.fieldLabel, { color: T.textSecondary }]}>Vencimiento</Text>
                    <TextInput
                      style={[styles.input, { backgroundColor: T.bg, borderColor: T.border, color: T.text }]}
                      value={expiry}
                      onChangeText={(t) => setExpiry(formatExpiry(t))}
                      placeholder="MM/AA"
                      placeholderTextColor={T.textMuted}
                      keyboardType="numeric"
                      maxLength={5}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.fieldLabel, { color: T.textSecondary }]}>CVV</Text>
                    <TextInput
                      style={[styles.input, { backgroundColor: T.bg, borderColor: T.border, color: T.text }]}
                      value={cvv}
                      onChangeText={(t) => setCvv(t.replace(/\D/g, '').slice(0, 4))}
                      placeholder="•••"
                      placeholderTextColor={T.textMuted}
                      keyboardType="numeric"
                      secureTextEntry
                      maxLength={4}
                    />
                  </View>
                </View>

                {error ? (
                  <Text style={{ color: T.red, fontSize: 13, marginBottom: 12, textAlign: 'center' }}>{error}</Text>
                ) : null}

                <View style={styles.actions}>
                  <TouchableOpacity onPress={() => { setStep('summary'); setError(''); }}
                    style={[styles.btn, { borderColor: T.border, borderWidth: 1 }]}>
                    <Text style={{ color: T.text, fontWeight: '600' }}>Atrás</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={handlePayPress} style={[styles.btn, { backgroundColor: T.accent }]}>
                    <Text style={{ color: '#fff', fontWeight: '700' }}>Pagar ahora</Text>
                  </TouchableOpacity>
                </View>
                <View style={{ height: 16 }} />
              </ScrollView>
            </KeyboardAvoidingView>
          )}

          {/* ── STEP: processing ── */}
          {step === 'processing' && (
            <View style={styles.centeredStep}>
              <ActivityIndicator size="large" color={T.accent} style={{ marginBottom: 20 }} />
              <Text style={[styles.processingText, { color: T.text }]}>Procesando pago...</Text>
              <Text style={[styles.processingSubtext, { color: T.textMuted }]}>Por favor espera</Text>
            </View>
          )}

          {/* ── STEP: success ── */}
          {step === 'success' && (
            <View style={styles.centeredStep}>
              <Animated.View style={[styles.successCircle, {
                backgroundColor: T.green + '22',
                transform: [{ scale: checkAnim }],
              }]}>
                <Text style={{ fontSize: 48 }}>✓</Text>
              </Animated.View>
              <Text style={[styles.successTitle, { color: T.text }]}>¡Pago exitoso!</Text>
              <Text style={[styles.successSub, { color: T.textSecondary }]}>
                Te suscribiste al plan{'\n'}
                <Text style={{ fontWeight: '800', color: T.accent }}>{plan.name}</Text>
              </Text>
              <TouchableOpacity onPress={onClose} style={[styles.btn, { backgroundColor: T.accent, marginTop: 28, alignSelf: 'stretch' }]}>
                <Text style={{ color: '#fff', fontWeight: '700', textAlign: 'center' }}>Listo</Text>
              </TouchableOpacity>
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
  cardVisual: {
    borderRadius: 16, padding: 20, marginBottom: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2, shadowRadius: 8, elevation: 6,
  },
  cardChip: { color: 'rgba(255,255,255,0.7)', fontSize: 18, marginBottom: 16 },
  cardNumberDisplay: { color: '#fff', fontSize: 18, fontWeight: '700', letterSpacing: 2, marginBottom: 16 },
  cardLabel: { color: 'rgba(255,255,255,0.85)', fontSize: 12, fontWeight: '600', letterSpacing: 1 },
  fieldLabel: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 8 },
  input: {
    borderWidth: 1, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 13,
    fontSize: 15, marginBottom: 16,
  },
  centeredStep: { alignItems: 'center', paddingVertical: 32 },
  processingText: { fontSize: 18, fontWeight: '700', marginBottom: 6 },
  processingSubtext: { fontSize: 14 },
  successCircle: {
    width: 100, height: 100, borderRadius: 50,
    justifyContent: 'center', alignItems: 'center', marginBottom: 20,
  },
  successTitle: { fontSize: 24, fontWeight: '900', marginBottom: 10 },
  successSub: { fontSize: 15, textAlign: 'center', lineHeight: 22 },
});
