module.exports = {
  expo: {
    name: "ARGYM",
    slug: "saas-client-management-mobile",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/images/icon.png",
    userInterfaceStyle: "automatic",
    scheme: "argym",
    splash: {
      image: "./assets/images/icon.png",
      resizeMode: "contain",
      backgroundColor: "#0D1B2A"
    },
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
      [
        "expo-camera",
        {
          cameraPermission: "La app necesita acceso a la cámara para escanear códigos QR de check-in."
        }
      ],
      "expo-system-ui",
      "expo-web-browser",
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
    updates: {
      enabled: false,
    },
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.argym.app"
    },
    android: {
      package: "com.argym.app",
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

