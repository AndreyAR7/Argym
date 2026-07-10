import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  ScrollView, KeyboardAvoidingView, Platform,
  ActivityIndicator,
} from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { registerSchema, type RegisterFormValues } from '@/lib/validations';
import { useTheme } from '@/hooks/useTheme';

type Branch = { id: string; name: string; address: string | null; tenant_id: string };

export default function RegisterScreen() {
  const router = useRouter();
  const T = useTheme();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [branchResults, setBranchResults] = useState<Branch[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [branchError, setBranchError] = useState<string | null>(null);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { control, handleSubmit, formState: { errors } } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { full_name: '', email: '', password: '', confirmPassword: '' },
  });

  const loadBranches = async (query: string) => {
    setIsSearching(true);
    const req = supabase
      .from('branches')
      .select('id, name, address, tenant_id')
      .eq('is_active', true)
      .order('name');
    if (query.trim()) req.ilike('name', `%${query.trim()}%`);
    const { data } = await req.limit(20);
    setBranchResults(data ?? []);
    setShowDropdown(true);
    setIsSearching(false);
  };

  const onSearchFocus = () => {
    if (!selectedBranch) loadBranches(searchQuery);
  };

  useEffect(() => {
    if (selectedBranch) return;
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => loadBranches(searchQuery), 300);
    return () => { if (searchTimer.current) clearTimeout(searchTimer.current); };
  }, [searchQuery, selectedBranch]);

  const selectBranch = (branch: Branch) => {
    setSelectedBranch(branch);
    setSearchQuery(branch.name);
    setShowDropdown(false);
    setBranchError(null);
  };

  const clearBranch = () => {
    setSelectedBranch(null);
    setSearchQuery('');
    setBranchResults([]);
  };

  const onSubmit = async (values: RegisterFormValues) => {
    if (!selectedBranch) {
      setBranchError('Selecciona tu sucursal de la lista');
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const { error: signUpError } = await supabase.auth.signUp({
        email: values.email.trim().toLowerCase(),
        password: values.password,
        options: {
          data: {
            full_name: values.full_name.trim(),
            tenant_id: selectedBranch.tenant_id,
            branch_id: selectedBranch.id,
            requested_role: 'client',
          },
        },
      });

      if (signUpError) {
        if (signUpError.message.includes('already registered') || signUpError.message.includes('already exists')) {
          setError('Este correo ya tiene una cuenta. Intenta iniciar sesión.');
        } else if (signUpError.message.includes('password')) {
          setError('La contraseña no cumple los requisitos mínimos.');
        } else if (signUpError.message.includes('email')) {
          setError('El correo electrónico no es válido.');
        } else {
          setError('No se pudo completar el registro. Intenta de nuevo más tarde.');
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

  const inputStyle = (hasError: boolean) => ({
    borderWidth: 1,
    borderColor: hasError ? T.red : T.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: T.textPrimary,
    backgroundColor: T.card,
  });

  if (success) {
    return (
      <View style={{ flex: 1, backgroundColor: T.bg, justifyContent: 'center', alignItems: 'center', padding: 32 }}>
        <View style={{ backgroundColor: T.accent + '22', width: 80, height: 80, borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginBottom: 20 }}>
          <Text style={{ fontSize: 40 }}>✅</Text>
        </View>
        <Text style={{ fontSize: 22, fontWeight: '800', color: T.textPrimary, textAlign: 'center', marginBottom: 12 }}>
          ¡Registro exitoso!
        </Text>
        <Text style={{ fontSize: 15, color: T.textSecondary, textAlign: 'center', lineHeight: 22, marginBottom: 32 }}>
          Tu cuenta fue creada. Un administrador revisará tu solicitud y te asignará un rol para que puedas acceder al sistema.
        </Text>
        <TouchableOpacity
          onPress={() => router.replace('/(auth)/login')}
          style={{ backgroundColor: T.accent, borderRadius: 12, paddingVertical: 14, paddingHorizontal: 32 }}
        >
          <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15 }}>Ir al inicio de sesión</Text>
        </TouchableOpacity>
      </View>
    );
  }

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
        <View style={{ marginBottom: 32, alignItems: 'center' }}>
          <View style={{ width: 60, height: 60, borderRadius: 18, backgroundColor: T.accent + '22', justifyContent: 'center', alignItems: 'center', marginBottom: 16 }}>
            <Text style={{ fontSize: 26, fontWeight: '900', color: T.accent }}>S</Text>
          </View>
          <Text style={{ fontSize: 26, fontWeight: '800', color: T.textPrimary, marginBottom: 6 }}>
            Crear cuenta
          </Text>
          <Text style={{ fontSize: 14, color: T.textSecondary, textAlign: 'center' }}>
            Tu cuenta será revisada por un administrador
          </Text>
        </View>

        {error && (
          <View style={{ backgroundColor: T.red + '18', borderRadius: 10, borderWidth: 1, borderColor: T.red + '44', padding: 12, marginBottom: 16 }}>
            <Text style={{ color: T.red, fontSize: 13 }}>⚠ {error}</Text>
          </View>
        )}

        {/* Full name */}
        <View style={{ marginBottom: 14 }}>
          <Text style={{ fontSize: 13, fontWeight: '600', color: T.textSecondary, marginBottom: 6 }}>Nombre completo</Text>
          <Controller
            control={control} name="full_name"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                style={inputStyle(!!errors.full_name)}
                placeholder="Juan Pérez"
                placeholderTextColor={T.textMuted}
                autoCapitalize="words"
                onBlur={onBlur} onChangeText={onChange} value={value}
              />
            )}
          />
          {errors.full_name && <Text style={{ color: T.red, fontSize: 12, marginTop: 4 }}>{errors.full_name.message}</Text>}
        </View>

        {/* Email */}
        <View style={{ marginBottom: 14 }}>
          <Text style={{ fontSize: 13, fontWeight: '600', color: T.textSecondary, marginBottom: 6 }}>Correo electrónico</Text>
          <Controller
            control={control} name="email"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                style={inputStyle(!!errors.email)}
                placeholder="correo@ejemplo.com"
                placeholderTextColor={T.textMuted}
                keyboardType="email-address"
                autoCapitalize="none" autoCorrect={false}
                onBlur={onBlur} onChangeText={onChange} value={value}
              />
            )}
          />
          {errors.email && <Text style={{ color: T.red, fontSize: 12, marginTop: 4 }}>{errors.email.message}</Text>}
        </View>

        {/* Branch search */}
        <View style={{ marginBottom: 14 }}>
          <Text style={{ fontSize: 13, fontWeight: '600', color: T.textSecondary, marginBottom: 6 }}>Sucursal / Gimnasio</Text>
          <View style={{ position: 'relative' }}>
            <View style={{
              flexDirection: 'row', alignItems: 'center',
              borderWidth: 1,
              borderColor: branchError ? T.red : selectedBranch ? T.accent : T.border,
              borderRadius: 10,
              backgroundColor: T.card,
              paddingHorizontal: 14,
            }}>
              <TextInput
                style={{ flex: 1, paddingVertical: 12, fontSize: 16, color: T.textPrimary }}
                placeholder="Buscar gimnasio..."
                placeholderTextColor={T.textMuted}
                value={searchQuery}
                onFocus={onSearchFocus}
                onChangeText={(v) => {
                  setSearchQuery(v);
                  if (selectedBranch) setSelectedBranch(null);
                  setBranchError(null);
                }}
                autoCapitalize="none"
                autoCorrect={false}
                editable={!selectedBranch}
              />
              {isSearching && <ActivityIndicator size="small" color={T.accent} style={{ marginLeft: 8 }} />}
              {selectedBranch && (
                <TouchableOpacity onPress={clearBranch} style={{ padding: 4, marginLeft: 4 }}>
                  <Text style={{ color: T.textMuted, fontSize: 18, lineHeight: 20 }}>✕</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Dropdown results */}
            {showDropdown && branchResults.length > 0 && (
              <View style={{
                backgroundColor: T.card,
                borderWidth: 1,
                borderColor: T.border,
                borderRadius: 10,
                marginTop: 4,
                overflow: 'hidden',
              }}>
                {branchResults.map((branch, index) => (
                  <TouchableOpacity
                    key={branch.id}
                    onPress={() => selectBranch(branch)}
                    style={{
                      paddingHorizontal: 14,
                      paddingVertical: 12,
                      borderBottomWidth: index < branchResults.length - 1 ? 1 : 0,
                      borderBottomColor: T.border,
                      flexDirection: 'row',
                      alignItems: 'center',
                    }}
                  >
                    <Text style={{ fontSize: 16, marginRight: 10 }}>🏋️</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 14, fontWeight: '600', color: T.textPrimary }}>{branch.name}</Text>
                      {branch.address ? (
                        <Text style={{ fontSize: 11, color: T.textMuted, marginTop: 1 }}>{branch.address}</Text>
                      ) : null}
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {showDropdown && !isSearching && branchResults.length === 0 && searchQuery.trim().length > 0 && (
              <View style={{ backgroundColor: T.card, borderWidth: 1, borderColor: T.border, borderRadius: 10, marginTop: 4, padding: 14 }}>
                <Text style={{ color: T.textMuted, fontSize: 13, textAlign: 'center' }}>No se encontraron sucursales</Text>
              </View>
            )}
          </View>

          {selectedBranch && (
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6 }}>
              <Text style={{ fontSize: 12, color: T.accent }}>✓ {selectedBranch.name} seleccionado</Text>
            </View>
          )}
          {branchError && <Text style={{ color: T.red, fontSize: 12, marginTop: 4 }}>{branchError}</Text>}
        </View>

        {/* Password */}
        <View style={{ marginBottom: 14 }}>
          <Text style={{ fontSize: 13, fontWeight: '600', color: T.textSecondary, marginBottom: 6 }}>Contraseña</Text>
          <View style={{ position: 'relative' }}>
            <Controller
              control={control} name="password"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  style={{ ...inputStyle(!!errors.password), paddingRight: 52 }}
                  placeholder="Mínimo 6 caracteres"
                  placeholderTextColor={T.textMuted}
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
              <Text style={{ color: T.textMuted, fontSize: 12 }}>{showPassword ? 'Ocultar' : 'Ver'}</Text>
            </TouchableOpacity>
          </View>
          {errors.password && <Text style={{ color: T.red, fontSize: 12, marginTop: 4 }}>{errors.password.message}</Text>}
        </View>

        {/* Confirm password */}
        <View style={{ marginBottom: 24 }}>
          <Text style={{ fontSize: 13, fontWeight: '600', color: T.textSecondary, marginBottom: 6 }}>Confirmar contraseña</Text>
          <Controller
            control={control} name="confirmPassword"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                style={inputStyle(!!errors.confirmPassword)}
                placeholder="Repite tu contraseña"
                placeholderTextColor={T.textMuted}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                onBlur={onBlur} onChangeText={onChange} value={value}
              />
            )}
          />
          {errors.confirmPassword && <Text style={{ color: T.red, fontSize: 12, marginTop: 4 }}>{errors.confirmPassword.message}</Text>}
        </View>

        {/* Submit */}
        <TouchableOpacity
          onPress={handleSubmit(onSubmit)}
          disabled={isLoading}
          style={{ backgroundColor: isLoading ? T.textMuted : T.accent, borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginBottom: 20 }}
        >
          {isLoading
            ? <ActivityIndicator color="#fff" />
            : <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>Crear cuenta</Text>
          }
        </TouchableOpacity>

        {/* Login link */}
        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 4 }}>
          <Text style={{ color: T.textSecondary, fontSize: 14 }}>¿Ya tienes cuenta?</Text>
          <Link href="/(auth)/login" asChild>
            <TouchableOpacity>
              <Text style={{ color: T.accent, fontSize: 14, fontWeight: '700' }}>Iniciar sesión</Text>
            </TouchableOpacity>
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
