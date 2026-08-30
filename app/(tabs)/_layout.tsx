import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";

import { AppTheme } from "@/src/theme";

const icons = {
  index: "grid-outline",
  biometrics: "pulse-outline",
  training: "barbell-outline",
  wellbeing: "heart-outline"
} as const;

export default function TabsLayout() {
  return (
    <Tabs screenOptions={({ route }) => ({
      headerStyle: { backgroundColor: AppTheme.colors.background },
      headerShadowVisible: false,
      headerTitleStyle: { color: AppTheme.colors.text, fontWeight: "700" },
      tabBarActiveTintColor: AppTheme.colors.accent,
      tabBarInactiveTintColor: AppTheme.colors.muted,
      tabBarStyle: { borderTopColor: AppTheme.colors.border, backgroundColor: AppTheme.colors.surface },
      tabBarIcon: ({ color, size }) => <Ionicons name={icons[route.name as keyof typeof icons]} size={size} color={color} />
    })}>
      <Tabs.Screen name="index" options={{ title: "Hoy" }} />
      <Tabs.Screen name="biometrics" options={{ title: "Progreso" }} />
      <Tabs.Screen name="training" options={{ title: "Entreno" }} />
      <Tabs.Screen name="wellbeing" options={{ title: "Bienestar" }} />
    </Tabs>
  );
}

