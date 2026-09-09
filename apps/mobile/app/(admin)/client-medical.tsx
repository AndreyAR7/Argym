import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/hooks/useTheme';
import { useAuthStore } from '@/store/auth.store';
import { MedicalRecordForm } from '@/components/shared/MedicalRecordForm';

export default function ClientMedicalScreen() {
  const T = useTheme();
  const { t } = useTranslation();
  const router = useRouter();
  const { user } = useAuthStore();
  const { clientId, clientName } = useLocalSearchParams<{ clientId: string; clientName?: string }>();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: T.bg }}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Text style={{ color: T.text, fontSize: 22, fontWeight: '600' }}>←</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: T.text }]} numberOfLines={1}>
          {clientName ? `${t('client.medicalData.title')} · ${clientName}` : t('client.medicalData.title')}
        </Text>
        <View style={{ width: 44 }} />
      </View>

      {!!clientId && !!user?.id && !!user?.tenant_id && (
        <MedicalRecordForm
          clientId={clientId}
          tenantId={user.tenant_id}
          viewerId={user.id}
          filledByRole="staff"
          onSaved={() => router.back()}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingBottom: 12,
  },
  backBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 16, fontWeight: '700', flex: 1, textAlign: 'center' },
});
