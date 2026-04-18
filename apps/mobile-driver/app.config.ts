import type { ExpoConfig } from "expo/config";

/**
 * White-label / environnements : voir `docs/MOBILE-APPS.fr.md` §2 et §6.
 * Build / EAS : `EXPO_PUBLIC_API_URL`, `TENANT_SLUG`, identifiants store, etc.
 */
export default (): ExpoConfig => {
  const tenantSlug = process.env.TENANT_SLUG ?? "taj-poulet-demo";
  const brandName = process.env.BRAND_NAME ?? "TAJ Livreur";

  return {
    name: brandName,
    slug: process.env.EXPO_SLUG ?? "taj-driver",
    version: "0.0.1",
    orientation: "portrait",
    scheme: process.env.APP_SCHEME ?? "tajdriver",
    userInterfaceStyle: "automatic",
    newArchEnabled: true,
    ios: {
      supportsTablet: false,
      bundleIdentifier:
        process.env.IOS_BUNDLE_ID ?? "com.tajplatform.driver",
    },
    android: {
      package: process.env.ANDROID_PACKAGE ?? "com.tajplatform.driver",
      adaptiveIcon: { backgroundColor: "#1e3a8a" },
    },
    plugins: ["expo-router"],
    experiments: { typedRoutes: true },
    extra: {
      tenantSlug,
      apiUrl: process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3001",
      appRole: "driver",
    },
  };
};
