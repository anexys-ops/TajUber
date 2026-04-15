import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { apiUrl, tenantSlug } from "../lib/config";

export default function HomeScreen() {
  const [data, setData] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${apiUrl}/catalog/menu-items`, {
          headers: { "x-tenant-slug": tenantSlug },
        });
        const json = await res.json();
        if (!cancelled) {
          setData(JSON.stringify(json, null, 2));
        }
      } catch (e) {
        if (!cancelled) {
          setData(String(e));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>TAJ Poulet (white-label)</Text>
      <Text style={styles.meta}>
        tenant: {tenantSlug} · API: {apiUrl}
      </Text>
      <Text style={styles.hint}>
        Pour un autre restaurant : dupliquez le dossier app.json / extra ou
        utilisez des fichiers app.config.ts par flavor.
      </Text>
      {loading ? (
        <ActivityIndicator color="#f59e0b" />
      ) : (
        <Text style={styles.json}>{data}</Text>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, paddingTop: 56 },
  title: { fontSize: 22, fontWeight: "700", color: "#fff" },
  meta: { marginTop: 8, color: "#94a3b8" },
  hint: { marginTop: 12, color: "#64748b", fontSize: 13 },
  json: {
    marginTop: 20,
    fontFamily: "Menlo",
    fontSize: 12,
    color: "#e2e8f0",
  },
});
