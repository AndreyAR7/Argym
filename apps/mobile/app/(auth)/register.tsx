import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { registerSchema, type RegisterFormValues } from '@/lib/validations';

// Demo tenant ID — in production this would come from a tenant slug/invite link
const DEMO_TENANT_ID = 'a1b2c3d4-0000-0000-0000-000000000002';

export default function RegisterScreen() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const { control, handleSubmit, formState: { errors } } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { full_name: '', email: '', password: '', confirmPassword: '' },
  });

  const onSubmit = async (values: RegisterFormValues) => {
    setIsLoading(true);
    setError(null);
    try {
      const { error: signUpError } = await supabase.auth.signUp({
        email: values.email.trim().toLowerCase(),
        password: values.password,
        options: {
          data: {
            full_name: values.full_name.trim(),
            tenant_id: DEMO_TENANT_ID,
            requested_role: 'client', // default requested role
          },
        },
      });

      if (signUpError) {
        if (signUpError.message.includes('already registered')) {
          setError('Este correo ya está registrado. Intenta iniciar sesión.');
        } else {
          setError(`Error al registrarse: ${signUpError.message}`);
        }
        return;
      }

      setSuccess(true);
    } catch {
      setError('Ocurrió un error inesperado. Intenta de nuevo.');
    } finally {
      setIsLoading(false);
    }
  };

  // Colors (static — register screen doesn't need theme since user isn't logged in)
  const bg = '#0A0A0F';
  const card = '#13131A';
  const accent = '#6C63FF';
  const textPrimary = '#F0F0FF';
  const textSecondary = '#9090B0';
  const textMuted = '#5A5A7A';
  const border = 'rgba(255,255,255,0.08)';
  const errorColor = '#FF4D6D';

  const inputStyle = (hasError: boolean) => ({
    borderWidth: 1,
    borderColor: hasError ? errorColor : border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: textPrimary,
    backgroundColor: card,
  });

  if (success) {
    return (
      <View style={{ flex: 1, backgroundColor: bg, justifyContent: 'center', alignItems: 'center', padding: 32 }}>
        <View style={{ backgroundColor: accent + '22', width: 80, height: 80, borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginBottom: 20 }}>
          <Text style={{ fontSize: 40 }}>✅</Text>
        </View>
        <Text style={{ fontSize: 22, fontWeight: '800', color: textPrimary, textAlign: 'center', marginBottom: 12 }}>
          ¡Registro exitoso!
        </Text>
        <Text style={{ fontSize: 15, color: textSecondary, textAlign: 'center', lineHeight: 22, marginBottom: 32 }}>
          Tu cuenta fue creada. Un administrador revisará tu solicitud y te asignará un rol para que puedas acceder al sistema.
        </Text>
        <TouchableOpacity
          onPress={() => router.replace('/(auth)/login')}
          style={{ backgroundColor: accent, borderRadius: 12, paddingVertical: 14, paddingHorizontal: 32 }}
        >
          <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15 }}>Ir al inicio de sesión</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: bg }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 24 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={{ marginBottom: 32, alignItems: 'center' }}>
          <View style={{ width: 60, height: 60, borderRadius: 18, backgroundColor: accent + '22', justifyContent: 'center', alignItems: 'center', marginBottom: 16 }}>
            <Text style={{ fontSize: 26, fontWeight: '900', color: accent }}>S</Text>
          </View>
          <Text style={{ fontSize: 26, fontWeight: '800', color: textPrimary, marginBottom: 6 }}>
            Crear cuenta
          </Text>
          <Text style={{ fontSize: 14, color: textSecondary, textAlign: 'center' }}>
            Tu cuenta será revisada por un administrador
          </Text>
        </View>

        {/* Error */}
        {error && (
          <View style={{ backgroundColor: errorColor + '18', borderRadius: 10, borderWidth: 1, borderColor: errorColor + '44', padding: 12, marginBottom: 16 }}>
            <Text style={{ color: errorColor, fontSize: 13 }}>⚠ {error}</Text>
          </View>
        )}

        {/* Full name */}
        <View style={{ marginBottom: 14 }}>
          <Text style={{ fontSize: 13, fontWeight: '600', color: textSecondary, marginBottom: 6 }}>Nombre completo</Text>
          <Controller
            control={control} name="full_name"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                style={inputStyle(!!errors.full_name)}
                placeholder="Juan Pérez"
                placeholderTextColor={textMuted}
                autoCapitalize="words"
                onBlur={onBlur} onChangeText={onChange} value={value}
              />
            )}
          />
          {errors.full_name && <Text style={{ color: errorColor, fontSize: 12, marginTop: 4 }}>{errors.full_name.message}</Text>}
        </View>

        {/* Email */}
        <View style={{ marginBottom: 14 }}>
          <Text style={{ fontSize: 13, fontWeight: '600', color: textSecondary, marginBottom: 6 }}>Correo electrónico</Text>
          <Controller
            control={control} name="email"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                style={inputStyle(!!errors.email)}
                placeholder="correo@ejemplo.com"
                placeholderTextColor={textMuted}
                keyboardType="email-address"
                autoCapitalize="none" autoCorrect={false}
                onBlur={onBlur} onChangeText={onChange} value={value}
              />
            )}
          />
          {errors.email && <Text style={{ color: errorColor, fontSize: 12, marginTop: 4 }}>{errors.email.message}</Text>}
        </View>

        {/* Password */}
        <View style={{ marginBottom: 14 }}>
          <Text style={{ fontSize: 13, fontWeight: '600', color: textSecondary, marginBottom: 6 }}>Contraseña</Text>
          <View style={{ position: 'relative' }}>
            <Controller
              control={control} name="password"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  style={{ ...inputStyle(!!errors.password), paddingRight: 52 }}
                  placeholder="Mínimo 6 caracteres"
                  placeholderTextColor={textMuted}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  onBlur={onBlur} onChangeText={onChange} value={value}
                />
              )}
            />
            <TouchableOpacity
              onPress={() => setShowPassword(!showPassword)}
              style={{ position: 'absolute', right: 14, top: 0, bottom: 0, justifyContent: 'center' }}
            >
              <Text style={{ color: textMuted, fontSize: 12 }}>{showPassword ? 'Ocultar' : 'Ver'}</Text>
            </TouchableOpacity>
          </View>
          {errors.password && <Text style={{ color: errorColor, fontSize: 12, marginTop: 4 }}>{errors.password.message}</Text>}
        </View>

        {/* Confirm password */}
        <View style={{ marginBottom: 24 }}>
          <Text style={{ fontSize: 13, fontWeight: '600', color: textSecondary, marginBottom: 6 }}>Confirmar contraseña</Text>
          <Controller
            control={control} name="confirmPassword"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                style={inputStyle(!!errors.confirmPassword)}
                placeholder="Repite tu contraseña"
                placeholderTextColor={textMuted}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                onBlur={onBlur} onChangeText={onChange} value={value}
              />
            )}
          />
          {errors.confirmPassword && <Text style={{ color: errorColor, fontSize: 12, marginTop: 4 }}>{errors.confirmPassword.message}</Text>}
        </View>

        {/* Submit */}
        <TouchableOpacity
          onPress={handleSubmit(onSubmit)}
          disabled={isLoading}
          style={{ backgroundColor: isLoading ? textMuted : accent, borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginBottom: 20 }}
        >
          {isLoading
            ? <ActivityIndicator color="#fff" />
            : <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>Crear cuenta</Text>
          }
        </TouchableOpacity>

        {/* Login link */}
        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 4 }}>
          <Text style={{ color: textSecondary, fontSize: 14 }}>¿Ya tienes cuenta?</Text>
          <Link href="/(auth)/login" asChild>
            <TouchableOpacity>
              <Text style={{ color: accent, fontSize: 14, fontWeight: '700' }}>Iniciar sesión</Text>
            </TouchableOpacity>
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
