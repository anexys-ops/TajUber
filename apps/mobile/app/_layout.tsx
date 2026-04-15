import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";

export default function RootLayout() {
  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: "#0f1419" },
          headerTintColor: "#f59e0b",
          contentStyle: { backgroundColor: "#0f1419" },
        }}
      />
    </>
  );
}
