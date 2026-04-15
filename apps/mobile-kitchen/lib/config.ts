import Constants from "expo-constants";

type Extra = {
  tenantSlug?: string;
  apiUrl?: string;
  appRole?: string;
};

const extra = (Constants.expoConfig?.extra ?? {}) as Extra;

export const tenantSlug = extra.tenantSlug ?? "taj-poulet-demo";
export const apiUrl = extra.apiUrl ?? "http://localhost:3001";
export const appRole = extra.appRole ?? "kitchen";
