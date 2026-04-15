import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { apiUrl, tenantSlug } from "../lib/config";

/**
 * KDS minimal : liste des commandes (JWT personnel requis — à brancher via SecureStore).
 */
export default function KitchenScreen() {
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
              ? "401 — connectez un utilisateur KITCHEN (Bearer JWT) pour voir les commandes."
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
      <Text style={styles.title}>Cuisine (KDS)</Text>
      <Text style={styles.meta}>
        {tenantSlug} · WebSocket temps réel : namespace /realtime (token JWT)
      </Text>
      <Text style={styles.hint}>
        Notifications push : ajouter expo-notifications + projet Firebase / APNs.
      </Text>
      {loading ? (
        <ActivityIndicator color="#bbf7d0" />
      ) : (
        <Text style={styles.body}>{data}</Text>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, paddingTop: 56 },
  title: { fontSize: 22, fontWeight: "700", color: "#ecfdf5" },
  meta: { marginTop: 8, color: "#86efac" },
  hint: { marginTop: 12, color: "#4ade80", fontSize: 13 },
  body: { marginTop: 16, color: "#dcfce7", fontFamily: "Menlo", fontSize: 12 },
});
