import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";

import { AppTheme } from "@/src/theme";

export default function TabsLayout() {
  return (
    <Tabs screenOptions={{
      headerStyle: { backgroundColor: AppTheme.colors.background },
      headerShadowVisible: false,
      headerTitleStyle: { color: AppTheme.colors.text, fontWeight: "700" },
      tabBarActiveTintColor: AppTheme.colors.accent,
      tabBarInactiveTintColor: AppTheme.colors.muted,
      tabBarStyle: { borderTopColor: AppTheme.colors.border, backgroundColor: AppTheme.colors.surface }
    }}>
      <Tabs.Screen name="index" options={{ title: "Hoy", tabBarIcon: ({ color, size }) => <Ionicons name="grid-outline" size={size} color={color} /> }} />
      <Tabs.Screen name="biometrics" options={{ title: "Progreso", tabBarIcon: ({ color, size }) => <Ionicons name="pulse-outline" size={size} color={color} /> }} />
      <Tabs.Screen name="training" options={{ title: "Entreno", tabBarIcon: ({ color, size }) => <Ionicons name="barbell-outline" size={size} color={color} /> }} />
      <Tabs.Screen name="analysis" options={{ title: "Análisis", tabBarIcon: ({ color, size }) => <Ionicons name="analytics-outline" size={size} color={color} /> }} />
      <Tabs.Screen name="wellbeing" options={{ title: "Bienestar", tabBarIcon: ({ color, size }) => <Ionicons name="heart-outline" size={size} color={color} /> }} />
    </Tabs>
  );
}

