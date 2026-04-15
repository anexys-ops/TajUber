import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";

export default function RootLayout() {
  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: "#1e3a8a" },
          headerTintColor: "#bfdbfe",
          contentStyle: { backgroundColor: "#172554" },
        }}
      />
    </>
  );
}
