module.exports = {
  expo: {
    name: "ARGYM",
    slug: "ARGYM",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/images/icon.png",
    userInterfaceStyle: "automatic",
    scheme: "saas-client-management",
    assetBundlePatterns: ["**/*"],
    plugins: [
      "expo-router",
      "expo-secure-store",
      "expo-video",
      "@react-native-community/datetimepicker",
      [
        "expo-image-picker",
        {
          photosPermission: "La app necesita acceso a tus fotos para actualizar tu avatar."
        }
      ],
      "expo-system-ui",
      [
        "expo-notifications",
        {
          icon: "./assets/notification-icon.png",
          color: "#6C63FF",
          sounds: [],
          androidMode: "default",
          androidCollapsedTitle: "#{unread_notifications} nuevas notificaciones"
        }
      ]
    ],
    experiments: {
      typedRoutes: true
    },
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.saas.clientmanagement"
    },
    android: {
      package: "com.saas.clientmanagement",
      permissions: ["android.permission.RECORD_AUDIO"],
      adaptiveIcon: {
        foregroundImage: "./assets/images/icon.png",
        backgroundColor: "#0D1B2A"
      }
    },
    extra: {
      supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL || "fallback",
      supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || "fallback",
      eas: {
        projectId: "06135515-c0cb-4ce2-8706-cf60e5648234"
      }
    }
  }
};

