import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, useColorScheme } from 'react-native';
import { Colors } from '@/constants/colors';
import type { Promotion } from '@/store/plans.store';

interface Props {
  promotion: Promotion;
  onDismiss: () => void;
  onPress?: () => void;
}

export function PromoBanner({ promotion, onDismiss, onPress }: Props) {
  const scheme = useColorScheme();
  const colors = scheme === 'dark' ? Colors.dark : Colors.light;

  const isDiscount = promotion.type === 'discount';
  const accentBg = isDiscount ? '#7c3aed' : colors.primary;

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.9}
      style={[styles.banner, { backgroundColor: accentBg }]}
    >
      <View style={styles.content}>
        {isDiscount && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>
              {promotion.discount_percentage
                ? `${promotion.discount_percentage}% OFF`
                : promotion.discount_amount
                ? `-₡${promotion.discount_amount}`
                : 'DESCUENTO'}
            </Text>
          </View>
        )}
        <Text style={styles.title} numberOfLines={1}>{promotion.title}</Text>
        {promotion.description ? (
          <Text style={styles.desc} numberOfLines={2}>{promotion.description}</Text>
        ) : null}
      </View>
      <TouchableOpacity onPress={onDismiss} style={styles.close} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
        <Text style={styles.closeText}>✕</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 12,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  content: { flex: 1 },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginBottom: 4,
  },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },
  title: { color: '#fff', fontSize: 15, fontWeight: '700' },
  desc: { color: 'rgba(255,255,255,0.85)', fontSize: 12, marginTop: 2 },
  close: { paddingLeft: 12 },
  closeText: { color: 'rgba(255,255,255,0.8)', fontSize: 18, fontWeight: '300' },
});
