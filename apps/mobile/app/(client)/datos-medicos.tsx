import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/hooks/useTheme';
import { useAuthStore } from '@/store/auth.store';
import { MedicalRecordForm } from '@/components/shared/MedicalRecordForm';

export default function DatosMedicosScreen() {
  const T = useTheme();
  const { t } = useTranslation();
  const router = useRouter();
  const { user } = useAuthStore();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: T.bg }}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Text style={{ color: T.text, fontSize: 22, fontWeight: '600' }}>←</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: T.text }]}>{t('client.medicalData.title')}</Text>
        <View style={{ width: 44 }} />
      </View>

      {user?.id && user?.tenant_id && (
        <MedicalRecordForm
          clientId={user.id}
          tenantId={user.tenant_id}
          viewerId={user.id}
          filledByRole="client"
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
  headerTitle: { fontSize: 16, fontWeight: '700' },
});
