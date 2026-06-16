import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { supabase } from '@/lib/supabase';

// expo-notifications push features were removed from Expo Go in SDK 53.
// Guard all registration logic so the app works in both Expo Go and dev builds.
const isExpoGo =
  (Constants as any).executionEnvironment === 'storeClient' ||
  (Constants as any).appOwnership === 'expo';

// Only set the handler in real builds — crashes Expo Go at SDK 53+
if (!isExpoGo) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });
}

export async function registerPushToken(userId: string): Promise<void> {
  if (!Constants.isDevice || isExpoGo) return;

  try {
    const { status: existing } = await Notifications.getPermissionsAsync();
    let finalStatus = existing;
    if (existing !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') return;

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Notificaciones',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#6C63FF',
      });
    }

    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ??
      (Constants as any).manifest2?.extra?.expoClient?.extra?.eas?.projectId;
    const { data: token } = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined,
    );

    await supabase
      .from('device_tokens')
      .upsert(
        {
          user_id: userId,
          token,
          platform: Platform.OS as 'ios' | 'android',
          is_active: true,
        },
        { onConflict: 'user_id,token' }
      );
  } catch {
    // Push not available in Expo Go (SDK 53+) — requires development build
  }
}

export async function unregisterPushToken(userId: string): Promise<void> {
  try {
    const result = await Notifications.getExpoPushTokenAsync().catch(() => null);
    if (!result?.data) return;

    await supabase
      .from('device_tokens')
      .update({ is_active: false })
      .eq('user_id', userId)
      .eq('token', result.data);
  } catch {
    // Silently ignore — Expo Go or token already inactive
  }
}

export type NotificationListener = ReturnType<typeof Notifications.addNotificationReceivedListener>;
export type ResponseListener = ReturnType<typeof Notifications.addNotificationResponseReceivedListener>;

export function addNotificationListeners(
  onReceive: (notification: Notifications.Notification) => void,
  onResponse: (response: Notifications.NotificationResponse) => void
): { notifListener: NotificationListener; responseListener: ResponseListener } {
  const notifListener = Notifications.addNotificationReceivedListener(onReceive);
  const responseListener = Notifications.addNotificationResponseReceivedListener(onResponse);
  return { notifListener, responseListener };
}

export function removeNotificationListeners(
  notifListener: NotificationListener,
  responseListener: ResponseListener
): void {
  notifListener.remove();
  responseListener.remove();
}
