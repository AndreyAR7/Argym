import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useColorScheme } from 'react-native';
import { Colors } from '@/constants/colors';

interface ErrorMessageProps {
  message?: string;
  translationKey?: string;
  onRetry?: () => void;
}

export function ErrorMessage({ message, translationKey, onRetry }: ErrorMessageProps) {
  const { t } = useTranslation();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const colors = isDark ? Colors.dark : Colors.light;

  const displayMessage = translationKey ? t(translationKey) : (message ?? t('errors.generic'));

  return (
    <View
      style={{
        backgroundColor: isDark ? '#450a0a' : '#fef2f2',
        borderRadius: 8,
        padding: 12,
        borderWidth: 1,
        borderColor: isDark ? '#7f1d1d' : '#fecaca',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}
    >
      <Text
        style={{
          color: colors.error,
          fontSize: 14,
          flex: 1,
        }}
      >
        {displayMessage}
      </Text>
      {onRetry && (
        <TouchableOpacity onPress={onRetry} style={{ marginLeft: 8 }}>
          <Text style={{ color: colors.primary, fontSize: 14, fontWeight: '600' }}>
            {t('common.retry')}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}
