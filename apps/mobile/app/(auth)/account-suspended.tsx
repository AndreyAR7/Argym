import React from 'react';
import { View, Text, TouchableOpacity, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/store/auth.store';
import { useTheme } from '@/hooks/useTheme';

export default function AccountSuspendedScreen() {
  const { signOut } = useAuthStore();
  const T = useTheme();
  const { t } = useTranslation();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: T.bg }}>
      <StatusBar barStyle="light-content" backgroundColor={T.bg} />

      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32, gap: 20 }}>
        <View style={{
          width: 100, height: 100, borderRadius: 28,
          backgroundColor: T.red + '22',
          justifyContent: 'center', alignItems: 'center',
        }}>
          <Text style={{ fontSize: 48 }}>🔒</Text>
        </View>

        <Text style={{ fontSize: 22, fontWeight: '800', color: T.textPrimary, textAlign: 'center' }}>
          {t('auth.accountSuspended.title')}
        </Text>

        <Text style={{ fontSize: 15, color: T.textSecondary, textAlign: 'center', lineHeight: 22 }}>
          {t('auth.accountSuspended.description')}
        </Text>

        <View style={{
          backgroundColor: T.accent + '18', borderRadius: 12,
          borderWidth: 1, borderColor: T.accent + '44',
          padding: 16, flexDirection: 'row', gap: 10, width: '100%',
        }}>
          <Text style={{ fontSize: 18 }}>ℹ️</Text>
          <Text style={{ flex: 1, fontSize: 13, color: T.textSecondary, lineHeight: 19 }}>
            {t('auth.accountSuspended.info')}
          </Text>
        </View>

        <TouchableOpacity
          onPress={signOut}
          style={{
            marginTop: 8, paddingVertical: 12, paddingHorizontal: 32,
            borderRadius: 12, borderWidth: 1, borderColor: T.border,
          }}
        >
          <Text style={{ color: T.textSecondary, fontSize: 14, fontWeight: '600' }}>{t('auth.logout')}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
