import { Stack } from "expo-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StatusBar } from "expo-status-bar";
import { useState } from "react";
import { AuthProvider } from "../lib/auth-context";

export default function RootLayout() {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <StatusBar style="light" />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="vows/new" options={{ headerShown: true, title: "New Vow" }} />
          <Stack.Screen name="vows/[id]" options={{ headerShown: true, title: "Vow" }} />
          <Stack.Screen name="vows/checkin" options={{ headerShown: true, title: "Check In" }} />
          <Stack.Screen name="matches/[id]" options={{ headerShown: true, title: "Partner" }} />
          <Stack.Screen name="letters/new" options={{ headerShown: true, title: "Write Letter" }} />
          <Stack.Screen name="letters/[id]" options={{ headerShown: true, title: "Letter" }} />
          <Stack.Screen name="pacts/[id]" options={{ headerShown: true, title: "Pact" }} />
          <Stack.Screen name="pacts/discover" options={{ headerShown: true, title: "Discover" }} />
          <Stack.Screen name="pacts/feed" options={{ headerShown: true, title: "Room Feed" }} />
          <Stack.Screen name="report" options={{ headerShown: true, title: "Report & Block" }} />
        </Stack>
      </AuthProvider>
    </QueryClientProvider>
  );
}
