import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import type { Promotion } from '@/store/plans.store';

interface Props {
  offer: Promotion;
  onPress: (offer: Promotion) => void;
}

const TYPE_META: Record<string, { icon: string; label: string }> = {
  discount:     { icon: '🏷️', label: 'Descuento' },
  announcement: { icon: '📢', label: 'Anuncio' },
  bundle:       { icon: '📦', label: 'Bundle' },
};

const LEVEL_META: Record<string, { label: string; color: string }> = {
  all:          { label: 'Para todos',      color: '#6C63FF' },
  beginner:     { label: 'Principiante',    color: '#10B981' },
  intermediate: { label: 'Intermedio',      color: '#F59E0B' },
  advanced:     { label: 'Avanzado',        color: '#EF4444' },
};

export function OfferCard({ offer, onPress }: Props) {
  const T = useTheme();
  const typeMeta  = TYPE_META[offer.type]  ?? { icon: '📢', label: offer.type };
  const levelMeta = LEVEL_META[offer.target_level ?? 'all'] ?? LEVEL_META.all;

  const daysLeft = offer.end_date
    ? Math.ceil((new Date(offer.end_date).getTime() - Date.now()) / 86_400_000)
    : null;

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={() => onPress(offer)}
      style={[styles.card, { backgroundColor: T.bgCardElevated, borderColor: T.border }]}
    >
      {/* Type + level badges */}
      <View style={styles.badges}>
        <View style={[styles.badge, { backgroundColor: T.accent + '22' }]}>
          <Text style={{ fontSize: 11, fontWeight: '700', color: T.accent }}>
            {typeMeta.icon} {typeMeta.label}
          </Text>
        </View>
        <View style={[styles.badge, { backgroundColor: levelMeta.color + '22' }]}>
          <Text style={{ fontSize: 11, fontWeight: '700', color: levelMeta.color }}>
            {levelMeta.label}
          </Text>
        </View>
      </View>

      {/* Title */}
      <Text style={[styles.title, { color: T.text }]}>{offer.title}</Text>

      {/* Description */}
      {offer.description ? (
        <Text style={[styles.desc, { color: T.textSecondary }]} numberOfLines={2}>
          {offer.description}
        </Text>
      ) : null}

      {/* Discount info */}
      {offer.type === 'discount' && (offer.discount_percentage || offer.discount_amount) ? (
        <View style={[styles.discountRow, { backgroundColor: T.purple + '18' }]}>
          <Text style={{ fontSize: 15, fontWeight: '900', color: T.purple }}>
            {offer.discount_percentage
              ? `${offer.discount_percentage}% OFF`
              : `−${offer.discount_amount?.toLocaleString('es-CR')}`}
          </Text>
        </View>
      ) : null}

      {/* Footer */}
      <View style={styles.footer}>
        {daysLeft !== null ? (
          <Text style={{ fontSize: 11, color: daysLeft <= 3 ? T.red : T.textMuted }}>
            {daysLeft <= 0 ? 'Vence hoy' : `Vence en ${daysLeft} día${daysLeft === 1 ? '' : 's'}`}
          </Text>
        ) : (
          <Text style={{ fontSize: 11, color: T.textMuted }}>Sin fecha de vencimiento</Text>
        )}
        <View style={[styles.ctaBtn, { backgroundColor: T.accent }]}>
          <Text style={{ fontSize: 12, fontWeight: '700', color: '#fff' }}>Ver planes →</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16, borderWidth: 1, padding: 16, marginBottom: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08, shadowRadius: 6, elevation: 3,
  },
  badges: { flexDirection: 'row', gap: 6, marginBottom: 10 },
  badge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  title: { fontSize: 19, fontWeight: '800', marginBottom: 6 },
  desc: { fontSize: 13, lineHeight: 18, marginBottom: 10 },
  discountRow: {
    alignSelf: 'flex-start', borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 6, marginBottom: 12,
  },
  footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
  ctaBtn: { borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
});
