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
import { Link, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { signInSchema, type SignInFormValues } from '@/lib/validations';
import { useAuthStore } from '@/store/auth.store';
import { ErrorMessage } from '@/components/shared/ErrorMessage';
import { AppLogo } from '@/components/shared/AppLogo';
import { useTheme } from '@/hooks/useTheme';

export default function LoginScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const T = useTheme();

  const { signIn, signInWithGoogle, isLoading, error, clearError } = useAuthStore();
  const [showPassword, setShowPassword] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<SignInFormValues>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = async (values: SignInFormValues) => {
    clearError();
    try {
      await signIn(values.email, values.password);
      // Navigation handled by _layout.tsx auth guard
    } catch {
      // Error is set in the store
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
        {/* Header */}
        <View style={{ marginBottom: 40, alignItems: 'center' }}>
          <AppLogo size={140} style={{ marginBottom: 8 }} />
          <Text style={{ fontSize: 15, color: T.textSecondary, textAlign: 'center' }}>
            Ingrese sus credenciales para continuar
          </Text>
        </View>

        {/* Error message */}
        {error && (
          <View style={{ marginBottom: 16 }}>
            <ErrorMessage translationKey={error} />
          </View>
        )}

        {/* Email field */}
        <View style={{ marginBottom: 16 }}>
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

        {/* Password field */}
        <View style={{ marginBottom: 8 }}>
          <Text style={{ fontSize: 14, fontWeight: '500', color: T.text, marginBottom: 6 }}>
            {t('auth.password')}
          </Text>
          <View style={{ position: 'relative' }}>
            <Controller
              control={control}
              name="password"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  style={{
                    borderWidth: 1,
                    borderColor: errors.password ? T.red : T.border,
                    borderRadius: 10,
                    paddingHorizontal: 14,
                    paddingVertical: 12,
                    paddingRight: 48,
                    fontSize: 16,
                    color: T.text,
                    backgroundColor: T.bgCardElevated,
                  }}
                  placeholder={t('auth.passwordPlaceholder')}
                  placeholderTextColor={T.textMuted}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  onBlur={onBlur}
                  onChangeText={onChange}
                  value={value}
                />
              )}
            />
            <TouchableOpacity
              onPress={() => setShowPassword(!showPassword)}
              style={{
                position: 'absolute',
                right: 14,
                top: 0,
                bottom: 0,
                justifyContent: 'center',
              }}
            >
              <Text style={{ color: T.textSecondary, fontSize: 13 }}>
                {showPassword ? 'Ocultar' : 'Ver'}
              </Text>
            </TouchableOpacity>
          </View>
          {errors.password && (
            <Text style={{ color: T.red, fontSize: 12, marginTop: 4 }}>
              {errors.password.message}
            </Text>
          )}
        </View>

        {/* Forgot password link */}
        <View style={{ alignItems: 'flex-end', marginBottom: 24 }}>
          <Link href="/(auth)/forgot-password" asChild>
            <TouchableOpacity>
              <Text style={{ color: T.accent, fontSize: 14 }}>
                {t('auth.forgotPassword')}
              </Text>
            </TouchableOpacity>
          </Link>
        </View>

        {/* Submit button */}
        <TouchableOpacity
          onPress={handleSubmit(onSubmit)}
          disabled={isLoading}
          style={{
            backgroundColor: isLoading ? T.textMuted : T.accent,
            borderRadius: 10,
            paddingVertical: 14,
            alignItems: 'center',
            marginBottom: 20,
          }}
        >
          {isLoading ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text style={{ color: '#ffffff', fontSize: 16, fontWeight: '600' }}>
              {t('auth.login')}
            </Text>
          )}
        </TouchableOpacity>

        {/* Divider */}
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
          <View style={{ flex: 1, height: 1, backgroundColor: T.border }} />
          <Text style={{ marginHorizontal: 12, color: T.textMuted, fontSize: 12 }}>
            o continúa con
          </Text>
          <View style={{ flex: 1, height: 1, backgroundColor: T.border }} />
        </View>

        {/* Google button */}
        <TouchableOpacity
          onPress={() => { clearError(); signInWithGoogle(); }}
          disabled={isLoading}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
            borderWidth: 1,
            borderColor: T.border,
            borderRadius: 10,
            paddingVertical: 13,
            backgroundColor: T.bgCardElevated,
            marginBottom: 24,
            opacity: isLoading ? 0.5 : 1,
          }}
        >
          {/* Google "G" logo rendered as styled text */}
          <View style={{
            width: 22, height: 22, borderRadius: 11,
            backgroundColor: '#ffffff',
            alignItems: 'center', justifyContent: 'center',
            borderWidth: 1, borderColor: '#e0e0e0',
          }}>
            <Text style={{ fontSize: 13, fontWeight: '700', color: '#4285F4', lineHeight: 16 }}>G</Text>
          </View>
          <Text style={{ color: T.text, fontSize: 15, fontWeight: '600' }}>
            Continuar con Google
          </Text>
        </TouchableOpacity>

        {/* Register link */}
        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 4 }}>
          <Text style={{ color: T.textSecondary, fontSize: 14 }}>
            {t('auth.noAccount')}
          </Text>
          <Link href="/(auth)/register" asChild>
            <TouchableOpacity>
              <Text style={{ color: T.accent, fontSize: 14, fontWeight: '600' }}>
                {t('auth.registerHere')}
              </Text>
            </TouchableOpacity>
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
