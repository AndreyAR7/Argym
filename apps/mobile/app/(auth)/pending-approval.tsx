import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '@/store/auth.store';

export default function PendingApprovalScreen() {
  const { approvalStatus, rejectionReason, signOut } = useAuthStore();

  const isRejected = approvalStatus === 'rejected';

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor="#0A0A0F" />

      {/* DEV marker */}
      <View style={styles.marker}>
        <Text style={styles.markerText}>✅ PENDING ROUTE WORKING</Text>
      </View>

      <View style={styles.content}>
        {/* Icon */}
        <View style={[styles.iconBg, { backgroundColor: isRejected ? '#FF4D6D22' : '#6C63FF22' }]}>
          <Text style={{ fontSize: 48 }}>{isRejected ? '❌' : '⏳'}</Text>
        </View>

        {/* Title */}
        <Text style={styles.title}>
          {isRejected ? 'Acceso denegado' : 'Cuenta pendiente de aprobación'}
        </Text>

        {/* Description */}
        <Text style={styles.description}>
          {isRejected
            ? 'Tu solicitud de acceso fue rechazada por el administrador.'
            : 'Tu cuenta fue creada exitosamente. Un administrador debe asignarte un rol antes de que puedas acceder al sistema.'}
        </Text>

        {/* Rejection reason */}
        {isRejected && rejectionReason && (
          <View style={styles.reasonCard}>
            <Text style={styles.reasonLabel}>Motivo:</Text>
            <Text style={styles.reasonText}>{rejectionReason}</Text>
          </View>
        )}

        {/* Info card for pending */}
        {!isRejected && (
          <View style={styles.infoCard}>
            <Text style={styles.infoIcon}>ℹ️</Text>
            <Text style={styles.infoText}>
              Recibirás acceso una vez que el administrador apruebe tu cuenta y te asigne un rol.
            </Text>
          </View>
        )}

        {/* Sign out */}
        <TouchableOpacity onPress={signOut} style={styles.signOutBtn}>
          <Text style={styles.signOutText}>Cerrar sesión</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0A0A0F' },
  marker: {
    backgroundColor: '#6C63FF', paddingVertical: 8, alignItems: 'center',
  },
  markerText: { color: '#fff', fontWeight: '900', fontSize: 12, letterSpacing: 0.5 },
  content: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
    padding: 32, gap: 20,
  },
  iconBg: {
    width: 100, height: 100, borderRadius: 28,
    justifyContent: 'center', alignItems: 'center',
  },
  title: {
    fontSize: 22, fontWeight: '800', color: '#F0F0FF',
    textAlign: 'center',
  },
  description: {
    fontSize: 15, color: '#9090B0', textAlign: 'center', lineHeight: 22,
  },
  reasonCard: {
    backgroundColor: '#FF4D6D18', borderRadius: 12,
    borderWidth: 1, borderColor: '#FF4D6D44',
    padding: 16, width: '100%',
  },
  reasonLabel: { fontSize: 12, color: '#FF4D6D', fontWeight: '700', marginBottom: 4 },
  reasonText: { fontSize: 14, color: '#F0F0FF' },
  infoCard: {
    backgroundColor: '#6C63FF18', borderRadius: 12,
    borderWidth: 1, borderColor: '#6C63FF44',
    padding: 16, flexDirection: 'row', gap: 10, width: '100%',
  },
  infoIcon: { fontSize: 18 },
  infoText: { flex: 1, fontSize: 13, color: '#9090B0', lineHeight: 19 },
  signOutBtn: {
    marginTop: 8, paddingVertical: 12, paddingHorizontal: 32,
    borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
  },
  signOutText: { color: '#9090B0', fontSize: 14, fontWeight: '600' },
});
