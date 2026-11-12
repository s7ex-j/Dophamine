import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";

import { AppTheme } from "@/src/theme";

// Cinco pestañas visibles. Análisis, Hábitos y Bienestar siguen existiendo como
// pantallas, pero se abren desde "Más" y "Estrategia" (href: null las saca de la barra).
export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: AppTheme.colors.background },
        headerShadowVisible: false,
        headerTitleStyle: { color: AppTheme.colors.text, fontWeight: "700" },
        tabBarActiveTintColor: AppTheme.colors.accent,
        tabBarInactiveTintColor: AppTheme.colors.muted,
        tabBarStyle: { borderTopColor: AppTheme.colors.border, backgroundColor: AppTheme.colors.surface },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Panel",
          tabBarIcon: ({ color, size }) => <Ionicons name="grid-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="biometrics"
        options={{
          title: "Diario",
          tabBarIcon: ({ color, size }) => <Ionicons name="create-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="strategy"
        options={{
          title: "Estrategia",
          tabBarIcon: ({ color, size }) => <Ionicons name="compass-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="training"
        options={{
          title: "Entreno",
          tabBarIcon: ({ color, size }) => <Ionicons name="barbell-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: "Más",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="ellipsis-horizontal-circle-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen name="analysis" options={{ title: "Análisis", href: null }} />
      <Tabs.Screen name="habits" options={{ title: "Hábitos", href: null }} />
      <Tabs.Screen name="wellbeing" options={{ title: "Bienestar", href: null }} />
    </Tabs>
  );
}
