import React, { useEffect, useMemo, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  ScrollView, ActivityIndicator, Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/hooks/useTheme';

type Gym = {
  id: string; name: string; logo_url: string | null; primary_color: string | null;
};

export default function RegisterGymScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const T = useTheme();

  const [gyms, setGyms] = useState<Gym[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('tenants')
        .select('id, name, logo_url, primary_color')
        .eq('is_active', true)
        .order('name');
      setGyms(data ?? []);
      setIsLoading(false);
    })();
  }, []);

  const filteredGyms = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return gyms;
    return gyms.filter((g) => g.name.toLowerCase().includes(q));
  }, [gyms, searchQuery]);

  const selectGym = (gym: Gym) => {
    router.push({ pathname: '/(auth)/register', params: { tenantId: gym.id } });
  };

  return (
    <View style={{ flex: 1, backgroundColor: T.bg }}>
      <ScrollView contentContainerStyle={{ flexGrow: 1, padding: 24, paddingTop: 64 }}>
        <View style={{ marginBottom: 24 }}>
          <Text style={{ fontSize: 24, fontWeight: '800', color: T.textPrimary, marginBottom: 8 }}>
            {t('auth.register.chooseGymTitle')}
          </Text>
          <Text style={{ fontSize: 14, color: T.textSecondary }}>
            {t('auth.register.chooseGymSubtitle')}
          </Text>
        </View>

        <TextInput
          style={{
            borderWidth: 1,
            borderColor: T.border,
            borderRadius: 10,
            paddingHorizontal: 14,
            paddingVertical: 12,
            fontSize: 16,
            color: T.textPrimary,
            backgroundColor: T.card,
            marginBottom: 16,
          }}
          placeholder={t('auth.register.gymSearchPlaceholder')}
          placeholderTextColor={T.textMuted}
          autoCapitalize="none"
          autoCorrect={false}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />

        {isLoading ? (
          <ActivityIndicator size="small" color={T.accent} style={{ marginTop: 20 }} />
        ) : filteredGyms.length === 0 ? (
          <View style={{ padding: 20, alignItems: 'center' }}>
            <Text style={{ color: T.textMuted, fontSize: 14 }}>{t('auth.register.noGymsFound')}</Text>
          </View>
        ) : (
          <View style={{ gap: 10 }}>
            {filteredGyms.map((gym) => (
              <TouchableOpacity
                key={gym.id}
                onPress={() => selectGym(gym)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  borderWidth: 1,
                  borderColor: T.border,
                  borderRadius: 12,
                  padding: 14,
                  backgroundColor: T.card,
                  gap: 12,
                }}
              >
                <View style={{
                  width: 40, height: 40, borderRadius: 10,
                  backgroundColor: T.bg,
                  alignItems: 'center', justifyContent: 'center',
                  overflow: 'hidden',
                }}>
                  {gym.logo_url ? (
                    <Image source={{ uri: gym.logo_url }} style={{ width: 40, height: 40 }} resizeMode="cover" />
                  ) : (
                    <Text style={{ fontSize: 18 }}>🏋️</Text>
                  )}
                </View>
                <Text style={{ flex: 1, fontSize: 16, fontWeight: '600', color: T.textPrimary }}>
                  {gym.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}
