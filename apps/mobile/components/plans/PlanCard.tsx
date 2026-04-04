import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, useColorScheme } from 'react-native';
import { Colors } from '@/constants/colors';
import type { Plan, Promotion } from '@/store/plans.store';

interface Props {
  plan: Plan;
  activePromo?: Promotion | null;
  isSubscribed?: boolean;
  onSubscribe?: (plan: Plan) => void;
  onEdit?: (plan: Plan) => void;
  isAdmin?: boolean;
}

function discountedPrice(plan: Plan, promo?: Promotion | null): number | null {
  if (!promo || promo.type !== 'discount') return null;
  if (promo.applies_to_plan_id && promo.applies_to_plan_id !== plan.id) return null;
  if (promo.discount_percentage) return plan.price * (1 - promo.discount_percentage / 100);
  if (promo.discount_amount) return Math.max(0, plan.price - promo.discount_amount);
  return null;
}

function cycleLabel(cycle: Plan['billing_cycle']): string {
  if (cycle === 'monthly') return '/mes';
  if (cycle === 'yearly') return '/año';
  return '';
}

export function PlanCard({ plan, activePromo, isSubscribed, onSubscribe, onEdit, isAdmin }: Props) {
  const scheme = useColorScheme();
  const colors = scheme === 'dark' ? Colors.dark : Colors.light;
  const discounted = discountedPrice(plan, activePromo);

  return (
    <View style={[styles.card, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.name, { color: colors.text }]}>{plan.name}</Text>
        {!plan.is_active && (
          <View style={[styles.inactiveBadge, { backgroundColor: colors.surface }]}>
            <Text style={[styles.inactiveBadgeText, { color: colors.textMuted }]}>Inactivo</Text>
          </View>
        )}
        {isSubscribed && (
          <View style={[styles.activeBadge, { backgroundColor: '#dcfce7' }]}>
            <Text style={[styles.activeBadgeText, { color: '#16a34a' }]}>✓ Activo</Text>
          </View>
        )}
      </View>

      {plan.description ? (
        <Text style={[styles.desc, { color: colors.textSecondary }]}>{plan.description}</Text>
      ) : null}

      {/* Price */}
      <View style={styles.priceRow}>
        {discounted !== null ? (
          <>
            <Text style={[styles.originalPrice, { color: colors.textMuted }]}>
              {plan.currency} {plan.price.toLocaleString()}
            </Text>
            <Text style={[styles.price, { color: '#7c3aed' }]}>
              {plan.currency} {discounted.toLocaleString('es-CR', { minimumFractionDigits: 0 })}
            </Text>
            <View style={styles.discountBadge}>
              <Text style={styles.discountBadgeText}>
                {activePromo?.discount_percentage
                  ? `${activePromo.discount_percentage}% OFF`
                  : 'PROMO'}
              </Text>
            </View>
          </>
        ) : (
          <Text style={[styles.price, { color: colors.primary }]}>
            {plan.currency} {plan.price.toLocaleString()}
          </Text>
        )}
        <Text style={[styles.cycle, { color: colors.textMuted }]}>{cycleLabel(plan.billing_cycle)}</Text>
      </View>

      {/* Features */}
      {plan.features.length > 0 && (
        <View style={styles.features}>
          {plan.features.map((f, i) => (
            <View key={i} style={styles.featureRow}>
              <Text style={{ color: colors.success, fontSize: 13 }}>✓ </Text>
              <Text style={[styles.featureText, { color: colors.textSecondary }]}>
                {f.name}{f.value && f.value !== 'true' ? `: ${f.value}` : ''}
              </Text>
            </View>
          ))}
        </View>
      )}

      {/* Actions */}
      {isAdmin ? (
        <TouchableOpacity
          onPress={() => onEdit?.(plan)}
          style={[styles.btn, { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 }]}
        >
          <Text style={[styles.btnText, { color: colors.text }]}>Editar plan</Text>
        </TouchableOpacity>
      ) : (
        !isSubscribed && (
          <TouchableOpacity
            onPress={() => onSubscribe?.(plan)}
            style={[styles.btn, { backgroundColor: discounted !== null ? '#7c3aed' : colors.primary }]}
          >
            <Text style={[styles.btnText, { color: '#fff' }]}>
              {discounted !== null ? '🎉 Suscribirse con descuento' : 'Suscribirse'}
            </Text>
          </TouchableOpacity>
        )
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 6, gap: 8 },
  name: { fontSize: 17, fontWeight: '700', flex: 1 },
  inactiveBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 },
  inactiveBadgeText: { fontSize: 11, fontWeight: '600' },
  activeBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 },
  activeBadgeText: { fontSize: 11, fontWeight: '700' },
  desc: { fontSize: 13, marginBottom: 10, lineHeight: 18 },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6, marginBottom: 12 },
  originalPrice: { fontSize: 13, textDecorationLine: 'line-through' },
  price: { fontSize: 24, fontWeight: '800' },
  cycle: { fontSize: 13 },
  discountBadge: {
    backgroundColor: '#7c3aed',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: 4,
  },
  discountBadgeText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  features: { marginBottom: 14, gap: 4 },
  featureRow: { flexDirection: 'row', alignItems: 'flex-start' },
  featureText: { fontSize: 13, flex: 1 },
  btn: {
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  btnText: { fontSize: 15, fontWeight: '600' },
});
