import type { ExpoConfig } from "expo/config";

/**
 * White-label : surcharger `name`, `slug`, bundle IDs et `extra.tenantSlug`
 * via variables d’environnement au moment du build (CI / EAS).
 */
export default (): ExpoConfig => {
  const tenantSlug = process.env.TENANT_SLUG ?? "taj-poulet-demo";
  const brandName = process.env.BRAND_NAME ?? "TAJ Poulet";

  return {
    name: brandName,
    slug: process.env.EXPO_SLUG ?? "taj-poulet",
    version: "0.0.1",
    orientation: "portrait",
    scheme: process.env.APP_SCHEME ?? "tajpoulet",
    userInterfaceStyle: "automatic",
    newArchEnabled: true,
    ios: {
      supportsTablet: true,
      bundleIdentifier:
        process.env.IOS_BUNDLE_ID ?? "com.tajplatform.tajpoulet",
    },
    android: {
      package: process.env.ANDROID_PACKAGE ?? "com.tajplatform.tajpoulet",
      adaptiveIcon: { backgroundColor: "#0f1419" },
    },
    plugins: ["expo-router"],
    experiments: { typedRoutes: true },
    extra: {
      tenantSlug,
      apiUrl: process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3001",
    },
  };
};
