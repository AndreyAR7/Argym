import React from 'react';
import { View } from 'react-native';
import { Stack } from 'expo-router';
import { useTheme } from '@/hooks/useTheme';
import { ClientSidebar } from '@/components/client/ClientSidebar';

export default function ClientLayout() {
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
        <Stack.Screen name="inicio" />
        <Stack.Screen name="progress" />
        <Stack.Screen name="routine" />
        <Stack.Screen name="nutrition" />
        <Stack.Screen name="videos" />
        <Stack.Screen name="plans" />
        <Stack.Screen name="promotions" />
        <Stack.Screen name="profile" />
        <Stack.Screen name="client-appointments" />
        <Stack.Screen name="appointment/[id]" />
        <Stack.Screen name="video-player" />
        <Stack.Screen name="gamification" />
        <Stack.Screen name="leaderboard" />
        <Stack.Screen name="achievements" />
        <Stack.Screen name="challenges" />
      </Stack>
      <ClientSidebar />
    </View>
  );
}
