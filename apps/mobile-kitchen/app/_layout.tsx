import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";

export default function RootLayout() {
  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: "#14532d" },
          headerTintColor: "#bbf7d0",
          contentStyle: { backgroundColor: "#052e16" },
        }}
      />
    </>
  );
}
