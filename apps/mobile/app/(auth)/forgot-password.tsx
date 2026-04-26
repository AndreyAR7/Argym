import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { forgotPasswordSchema, type ForgotPasswordFormValues } from '@/lib/validations';
import { sendPasswordResetEmail } from '@/lib/auth.service';
import { ErrorMessage } from '@/components/shared/ErrorMessage';
import { useTheme } from '@/hooks/useTheme';

export default function ForgotPasswordScreen() {
  const { t } = useTranslation();
  const T = useTheme();

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
  });

  const onSubmit = async (values: ForgotPasswordFormValues) => {
    setIsLoading(true);
    setError(null);
    try {
      await sendPasswordResetEmail(values.email);
      setSuccess(true);
    } catch {
      setError(t('auth.errors.generic'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: T.bg }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 24 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Back button */}
        <Link href="/(auth)/login" asChild>
          <TouchableOpacity style={{ marginBottom: 32 }}>
            <Text style={{ color: T.accent, fontSize: 16 }}>← {t('common.back')}</Text>
          </TouchableOpacity>
        </Link>

        <View style={{ marginBottom: 32 }}>
          <Text style={{ fontSize: 28, fontWeight: '700', color: T.text, marginBottom: 8 }}>
            {t('auth.forgotPasswordTitle')}
          </Text>
          <Text style={{ fontSize: 15, color: T.textSecondary }}>
            {t('auth.forgotPasswordDescription')}
          </Text>
        </View>

        {success ? (
          <View
            style={{
              backgroundColor: T.greenSoft,
              borderRadius: 10,
              padding: 16,
              borderWidth: 1,
              borderColor: T.green + '66',
            }}
          >
            <Text style={{ color: T.green, fontSize: 15, fontWeight: '500' }}>
              {t('auth.resetLinkSent')}
            </Text>
          </View>
        ) : (
          <>
            {error && (
              <View style={{ marginBottom: 16 }}>
                <ErrorMessage message={error} />
              </View>
            )}

            <View style={{ marginBottom: 24 }}>
              <Text style={{ fontSize: 14, fontWeight: '500', color: T.text, marginBottom: 6 }}>
                {t('auth.email')}
              </Text>
              <Controller
                control={control}
                name="email"
                render={({ field: { onChange, onBlur, value } }) => (
                  <TextInput
                    style={{
                      borderWidth: 1,
                      borderColor: errors.email ? T.red : T.border,
                      borderRadius: 10,
                      paddingHorizontal: 14,
                      paddingVertical: 12,
                      fontSize: 16,
                      color: T.text,
                      backgroundColor: T.bgCardElevated,
                    }}
                    placeholder={t('auth.emailPlaceholder')}
                    placeholderTextColor={T.textMuted}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    onBlur={onBlur}
                    onChangeText={onChange}
                    value={value}
                  />
                )}
              />
              {errors.email && (
                <Text style={{ color: T.red, fontSize: 12, marginTop: 4 }}>
                  {errors.email.message}
                </Text>
              )}
            </View>

            <TouchableOpacity
              onPress={handleSubmit(onSubmit)}
              disabled={isLoading}
              style={{
                backgroundColor: isLoading ? T.textMuted : T.accent,
                borderRadius: 10,
                paddingVertical: 14,
                alignItems: 'center',
              }}
            >
              {isLoading ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={{ color: '#ffffff', fontSize: 16, fontWeight: '600' }}>
                  {t('auth.sendResetLink')}
                </Text>
              )}
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
