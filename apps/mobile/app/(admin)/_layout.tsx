import React from 'react';
import { View } from 'react-native';
import { Stack } from 'expo-router';
import { useTheme } from '@/hooks/useTheme';
import { AdminSidebar } from '@/components/admin/AdminSidebar';

export default function AdminLayout() {
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
        <Stack.Screen name="dashboard" />
        <Stack.Screen name="clients" />
        <Stack.Screen name="coaches" />
        <Stack.Screen name="admin-appointments" />
        <Stack.Screen name="appointment/[id]" />
        <Stack.Screen name="content" />
        <Stack.Screen name="monetization" />
        <Stack.Screen name="settings" />
        <Stack.Screen name="user-approval" />
        <Stack.Screen name="select-clients" />
        <Stack.Screen name="notifications" />
        <Stack.Screen name="plans/index" />
        <Stack.Screen name="plans/create" />
        <Stack.Screen name="promotions/index" />
        <Stack.Screen name="promotions/create" />
        <Stack.Screen name="video-player" />
      </Stack>
      <AdminSidebar />
    </View>
  );
}
