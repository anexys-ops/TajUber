import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
} from "react-native";
import { apiUrl, tenantSlug } from "../lib/config";

export default function DriverScreen() {
  const [data, setData] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${apiUrl}/orders`, {
          headers: { "x-tenant-slug": tenantSlug },
        });
        const text = await res.text();
        if (!cancelled) {
          setData(
            res.status === 401
              ? "401 — connectez un compte DRIVER ou ADMIN avec Bearer JWT."
              : text,
          );
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
      <Text style={styles.title}>Livreur</Text>
      <Text style={styles.meta}>
        {tenantSlug} · Suivi des courses (statuts READY → OUT_FOR_DELIVERY →
        DELIVERED)
      </Text>
      {loading ? (
        <ActivityIndicator color="#93c5fd" />
      ) : (
        <Text style={styles.body}>{data}</Text>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, paddingTop: 56 },
  title: { fontSize: 22, fontWeight: "700", color: "#eff6ff" },
  meta: { marginTop: 8, color: "#93c5fd" },
  body: { marginTop: 16, color: "#dbeafe", fontFamily: "Menlo", fontSize: 12 },
});
