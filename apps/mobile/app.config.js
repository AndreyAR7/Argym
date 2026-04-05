module.exports = {
  expo: {
    name: "saas-client-management-mobile",
    slug: "saas-client-management-mobile",
    version: "1.0.0",
    orientation: "portrait",
    userInterfaceStyle: "automatic",
    scheme: "saas-client-management",
    assetBundlePatterns: ["**/*"],
    plugins: [
      "expo-router",
      "expo-secure-store",
      [
        "expo-image-picker",
        {
          photosPermission: "La app necesita acceso a tus fotos para actualizar tu avatar."
        }
      ],
      "expo-system-ui"
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
      permissions: ["android.permission.RECORD_AUDIO"]
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

