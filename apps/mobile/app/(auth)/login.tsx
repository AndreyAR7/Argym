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
import { useColorScheme } from 'react-native';
import { signInSchema, type SignInFormValues } from '@/lib/validations';
import { useAuthStore } from '@/store/auth.store';
import { ErrorMessage } from '@/components/shared/ErrorMessage';
import { Colors } from '@/constants/colors';

export default function LoginScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const colors = isDark ? Colors.dark : Colors.light;

  const { signIn, isLoading, error, clearError } = useAuthStore();
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
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 24 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={{ marginBottom: 40, alignItems: 'center' }}>
          <View
            style={{
              width: 64,
              height: 64,
              borderRadius: 16,
              backgroundColor: colors.primary,
              justifyContent: 'center',
              alignItems: 'center',
              marginBottom: 16,
            }}
          >
            <Text style={{ color: '#ffffff', fontSize: 28, fontWeight: '700' }}>S</Text>
          </View>
          <Text style={{ fontSize: 28, fontWeight: '700', color: colors.text, marginBottom: 8 }}>
            {t('auth.login')}
          </Text>
          <Text style={{ fontSize: 15, color: colors.textSecondary, textAlign: 'center' }}>
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
          <Text style={{ fontSize: 14, fontWeight: '500', color: colors.text, marginBottom: 6 }}>
            {t('auth.email')}
          </Text>
          <Controller
            control={control}
            name="email"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                style={{
                  borderWidth: 1,
                  borderColor: errors.email ? colors.error : colors.border,
                  borderRadius: 10,
                  paddingHorizontal: 14,
                  paddingVertical: 12,
                  fontSize: 16,
                  color: colors.text,
                  backgroundColor: colors.surfaceElevated,
                }}
                placeholder={t('auth.emailPlaceholder')}
                placeholderTextColor={colors.textMuted}
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
            <Text style={{ color: colors.error, fontSize: 12, marginTop: 4 }}>
              {errors.email.message}
            </Text>
          )}
        </View>

        {/* Password field */}
        <View style={{ marginBottom: 8 }}>
          <Text style={{ fontSize: 14, fontWeight: '500', color: colors.text, marginBottom: 6 }}>
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
                    borderColor: errors.password ? colors.error : colors.border,
                    borderRadius: 10,
                    paddingHorizontal: 14,
                    paddingVertical: 12,
                    paddingRight: 48,
                    fontSize: 16,
                    color: colors.text,
                    backgroundColor: colors.surfaceElevated,
                  }}
                  placeholder={t('auth.passwordPlaceholder')}
                  placeholderTextColor={colors.textMuted}
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
              <Text style={{ color: colors.textSecondary, fontSize: 13 }}>
                {showPassword ? 'Ocultar' : 'Ver'}
              </Text>
            </TouchableOpacity>
          </View>
          {errors.password && (
            <Text style={{ color: colors.error, fontSize: 12, marginTop: 4 }}>
              {errors.password.message}
            </Text>
          )}
        </View>

        {/* Forgot password link */}
        <View style={{ alignItems: 'flex-end', marginBottom: 24 }}>
          <Link href="/(auth)/forgot-password" asChild>
            <TouchableOpacity>
              <Text style={{ color: colors.primary, fontSize: 14 }}>
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
            backgroundColor: isLoading ? colors.textMuted : colors.primary,
            borderRadius: 10,
            paddingVertical: 14,
            alignItems: 'center',
            marginBottom: 24,
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

        {/* Register link */}
        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 4 }}>
          <Text style={{ color: colors.textSecondary, fontSize: 14 }}>
            {t('auth.noAccount')}
          </Text>
          <Link href="/(auth)/register" asChild>
            <TouchableOpacity>
              <Text style={{ color: colors.primary, fontSize: 14, fontWeight: '600' }}>
                {t('auth.registerHere')}
              </Text>
            </TouchableOpacity>
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
