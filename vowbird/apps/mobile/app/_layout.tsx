import { Stack } from "expo-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StatusBar } from "expo-status-bar";
import { useState } from "react";
import { E2eKeyBootstrap } from "../components/E2eKeyBootstrap";
import { AuthProvider } from "../lib/auth-context";

export default function RootLayout() {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <E2eKeyBootstrap />
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
          <Stack.Screen name="pacts/new" options={{ headerShown: true, title: "Create Pact" }} />
          <Stack.Screen name="pacts/[id]" options={{ headerShown: true, title: "Pact" }} />
          <Stack.Screen name="pacts/discover" options={{ headerShown: true, title: "Explore" }} />
          <Stack.Screen name="pacts/feed" options={{ headerShown: true, title: "Room Feed" }} />
          <Stack.Screen name="p/[slug]" options={{ headerShown: true, title: "Public Pact" }} />
          <Stack.Screen name="vibe/[id]" options={{ headerShown: true, title: "Public Vibes" }} />
          <Stack.Screen name="messages/index" options={{ headerShown: true, title: "Messages" }} />
          <Stack.Screen name="messages/[userId]" options={{ headerShown: true, title: "Chat" }} />
          <Stack.Screen name="u/[username]" options={{ headerShown: true, title: "Profile" }} />
          <Stack.Screen name="pacters" options={{ headerShown: true, title: "Pactered" }} />
          <Stack.Screen name="settings" options={{ headerShown: true, title: "Settings" }} />
          <Stack.Screen name="report" options={{ headerShown: true, title: "Safety" }} />
        </Stack>
      </AuthProvider>
    </QueryClientProvider>
  );
}
