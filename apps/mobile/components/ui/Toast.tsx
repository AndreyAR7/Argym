import React, { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';

export type ToastType = 'success' | 'error' | 'info';

interface ToastState {
  message: string;
  type: ToastType;
  key: number;
}

type ToastListener = (state: ToastState) => void;
const _listeners: ToastListener[] = [];
let _key = 0;

export function showToast(message: string, type: ToastType = 'success') {
  _listeners.forEach((l) => l({ message, type, key: ++_key }));
}

export function ToastNotification() {
  const [state, setState] = useState<ToastState | null>(null);
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(-12)).current;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const listener: ToastListener = (s) => {
      if (timer.current) clearTimeout(timer.current);
      setState(s);
      opacity.setValue(0);
      translateY.setValue(-12);
      Animated.parallel([
        Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }),
        Animated.timing(translateY, { toValue: 0, duration: 180, useNativeDriver: true }),
      ]).start();
      timer.current = setTimeout(() => {
        Animated.parallel([
          Animated.timing(opacity, { toValue: 0, duration: 220, useNativeDriver: true }),
          Animated.timing(translateY, { toValue: -12, duration: 220, useNativeDriver: true }),
        ]).start(() => setState(null));
      }, 2800);
    };
    _listeners.push(listener);
    return () => {
      const i = _listeners.indexOf(listener);
      if (i > -1) _listeners.splice(i, 1);
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  if (!state) return null;

  const colors: Record<ToastType, { bg: string; border: string; icon: string }> = {
    success: { bg: '#0F2419', border: '#22C55E', icon: '✓' },
    error:   { bg: '#240F0F', border: '#EF4444', icon: '✕' },
    info:    { bg: '#0F1824', border: '#3B82F6', icon: 'i' },
  };
  const c = colors[state.type];

  return (
    <Animated.View
      style={[
        toastStyles.container,
        { opacity, transform: [{ translateY }], backgroundColor: c.bg, borderColor: c.border },
      ]}
    >
      <View style={[toastStyles.iconWrap, { borderColor: c.border + '60' }]}>
        <Text style={[toastStyles.icon, { color: c.border }]}>{c.icon}</Text>
      </View>
      <Text style={toastStyles.message} numberOfLines={2}>{state.message}</Text>
    </Animated.View>
  );
}

const toastStyles = StyleSheet.create({
  container: {
    position: 'absolute', top: 16, left: 16, right: 16,
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderWidth: 1, borderRadius: 14, padding: 14,
    zIndex: 9999,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 12,
  },
  iconWrap: {
    width: 26, height: 26, borderRadius: 13,
    borderWidth: 1.5,
    justifyContent: 'center', alignItems: 'center',
  },
  icon: { fontSize: 12, fontWeight: '800' },
  message: { flex: 1, color: '#E8E8F0', fontSize: 14, fontWeight: '500', lineHeight: 20 },
});
