import { Tabs, Redirect } from "expo-router";
import { useAuth } from "../../lib/auth-context";
import { colors } from "../../lib/theme";

export default function TabsLayout() {
  const { user, loading } = useAuth();
  if (!loading && !user) return <Redirect href="/" />;

  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: colors.navy },
        headerTintColor: colors.gold,
        tabBarStyle: { backgroundColor: colors.navy, borderTopColor: colors.navyLight },
        tabBarActiveTintColor: colors.gold,
        tabBarInactiveTintColor: colors.muted,
      }}
    >
      <Tabs.Screen name="index" options={{ title: "Home", tabBarLabel: "Home" }} />
      <Tabs.Screen name="vows" options={{ title: "Vows" }} />
      <Tabs.Screen name="matches" options={{ title: "Partners" }} />
      <Tabs.Screen name="letters" options={{ title: "Letters" }} />
      <Tabs.Screen name="pacts" options={{ title: "Pacts" }} />
      <Tabs.Screen name="profile" options={{ title: "Profile" }} />
    </Tabs>
  );
}
