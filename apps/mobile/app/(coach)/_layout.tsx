import React from 'react';
import { View } from 'react-native';
import { Stack } from 'expo-router';
import { useTheme } from '@/hooks/useTheme';

export default function CoachLayout() {
  const T = useTheme();
  return (
    <View style={{ flex: 1, backgroundColor: T.bg }}>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: T.bg },
          animation: 'fade',
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="clients" />
        <Stack.Screen name="coach-appointments" />
        <Stack.Screen name="routines" />
      </Stack>
    </View>
  );
}
