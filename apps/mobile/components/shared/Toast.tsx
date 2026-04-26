/**
 * Simple in-app toast notification.
 * Usage: ToastManager.show({ message: 'Cita creada', type: 'success' })
 */
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export type ToastType = 'success' | 'error' | 'info';

interface ToastMessage {
  id: number;
  message: string;
  type: ToastType;
}

// Global event emitter (simple pub/sub, no external deps)
type Listener = (msg: ToastMessage) => void;
const listeners: Listener[] = [];
let nextId = 0;

export const ToastManager = {
  show(opts: { message: string; type?: ToastType }) {
    const msg: ToastMessage = { id: nextId++, message: opts.message, type: opts.type ?? 'success' };
    listeners.forEach((l) => l(msg));
  },
};

function subscribe(l: Listener) {
  listeners.push(l);
  return () => { const i = listeners.indexOf(l); if (i >= 0) listeners.splice(i, 1); };
}

const COLORS: Record<ToastType, { bg: string; text: string; icon: string }> = {
  success: { bg: '#10B981', text: '#fff', icon: '✓' },
  error:   { bg: '#EF4444', text: '#fff', icon: '✕' },
  info:    { bg: '#3B82F6', text: '#fff', icon: 'ℹ' },
};

function ToastItem({ msg, onDone }: { msg: ToastMessage; onDone: () => void }) {
  const anim = useRef(new Animated.Value(0)).current;
  const c = COLORS[msg.type];

  useEffect(() => {
    Animated.sequence([
      Animated.timing(anim, { toValue: 1, duration: 250, useNativeDriver: true }),
      Animated.delay(2800),
      Animated.timing(anim, { toValue: 0, duration: 250, useNativeDriver: true }),
    ]).start(onDone);
  }, []);

  return (
    <Animated.View style={[s.toast, { backgroundColor: c.bg, opacity: anim, transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [-20, 0] }) }] }]}>
      <Text style={[s.icon, { color: c.text }]}>{c.icon}</Text>
      <Text style={[s.msg, { color: c.text }]} numberOfLines={2}>{msg.message}</Text>
      <TouchableOpacity onPress={onDone} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
        <Text style={{ color: c.text, fontSize: 14, opacity: 0.7 }}>✕</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

export function ToastContainer() {
  const insets = useSafeAreaInsets();
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  useEffect(() => {
    return subscribe((msg) => setToasts((prev) => [...prev, msg]));
  }, []);

  const remove = (id: number) => setToasts((prev) => prev.filter((t) => t.id !== id));

  if (toasts.length === 0) return null;

  return (
    <Animated.View style={[s.container, { top: insets.top + 8 }]} pointerEvents="box-none">
      {toasts.map((t) => (
        <ToastItem key={t.id} msg={t} onDone={() => remove(t.id)} />
      ))}
    </Animated.View>
  );
}

const s = StyleSheet.create({
  container: { position: 'absolute', left: 16, right: 16, zIndex: 9999 },
  toast: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12,
    marginBottom: 8,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2, shadowRadius: 8, elevation: 8,
  },
  icon: { fontSize: 16, fontWeight: '800', minWidth: 18, textAlign: 'center' },
  msg: { flex: 1, fontSize: 14, fontWeight: '600' },
});
