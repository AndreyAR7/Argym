import React from 'react';
import { View, Text, TouchableOpacity, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '@/store/auth.store';
import { useTheme } from '@/hooks/useTheme';

export default function PendingApprovalScreen() {
  const { approvalStatus, rejectionReason, signOut } = useAuthStore();
  const T = useTheme();

  const isRejected = approvalStatus === 'rejected';

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: T.bg }}>
      <StatusBar barStyle="light-content" backgroundColor={T.bg} />

      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32, gap: 20 }}>
        {/* Icon */}
        <View style={{
          width: 100, height: 100, borderRadius: 28,
          backgroundColor: isRejected ? T.red + '22' : T.accent + '22',
          justifyContent: 'center', alignItems: 'center',
        }}>
          <Text style={{ fontSize: 48 }}>{isRejected ? '❌' : '⏳'}</Text>
        </View>

        {/* Title */}
        <Text style={{ fontSize: 22, fontWeight: '800', color: T.textPrimary, textAlign: 'center' }}>
          {isRejected ? 'Acceso denegado' : 'Cuenta pendiente de aprobación'}
        </Text>

        {/* Description */}
        <Text style={{ fontSize: 15, color: T.textSecondary, textAlign: 'center', lineHeight: 22 }}>
          {isRejected
            ? 'Tu solicitud de acceso fue rechazada por el administrador.'
            : 'Tu cuenta fue creada exitosamente. Un administrador debe asignarte un rol antes de que puedas acceder al sistema.'}
        </Text>

        {/* Rejection reason */}
        {isRejected && rejectionReason && (
          <View style={{
            backgroundColor: T.red + '18', borderRadius: 12,
            borderWidth: 1, borderColor: T.red + '44',
            padding: 16, width: '100%',
          }}>
            <Text style={{ fontSize: 12, color: T.red, fontWeight: '700', marginBottom: 4 }}>Motivo:</Text>
            <Text style={{ fontSize: 14, color: T.textPrimary }}>{rejectionReason}</Text>
          </View>
        )}

        {/* Info card for pending */}
        {!isRejected && (
          <View style={{
            backgroundColor: T.accent + '18', borderRadius: 12,
            borderWidth: 1, borderColor: T.accent + '44',
            padding: 16, flexDirection: 'row', gap: 10, width: '100%',
          }}>
            <Text style={{ fontSize: 18 }}>ℹ️</Text>
            <Text style={{ flex: 1, fontSize: 13, color: T.textSecondary, lineHeight: 19 }}>
              Recibirás acceso una vez que el administrador apruebe tu cuenta y te asigne un rol.
            </Text>
          </View>
        )}

        {/* Sign out */}
        <TouchableOpacity
          onPress={signOut}
          style={{
            marginTop: 8, paddingVertical: 12, paddingHorizontal: 32,
            borderRadius: 12, borderWidth: 1, borderColor: T.border,
          }}
        >
          <Text style={{ color: T.textSecondary, fontSize: 14, fontWeight: '600' }}>Cerrar sesión</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
