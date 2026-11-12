import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";

import { VIEWER } from "@/src/lib/mode";
import { AppTheme } from "@/src/theme";

// Los colores de la barra vienen del tema y son textos ("#167B5B").
const tabIcon =
  (name: keyof typeof Ionicons.glyphMap) =>
  ({ color, size }: { color?: unknown; size: number }) => (
    <Ionicons name={name} size={size} color={typeof color === "string" ? color : undefined} />
  );

// Cinco pestañas en el teléfono. En la web (visor de solo lectura) se quitan las
// dos de registro, Diario y Entreno. Análisis, Hábitos y Bienestar no son pestañas:
// son pantallas que se abren encima desde "Más" y "Estrategia" (ver app/_layout.tsx).
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
          tabBarIcon: tabIcon("grid-outline"),
        }}
      />
      <Tabs.Screen
        name="biometrics"
        options={{
          href: VIEWER ? null : undefined,
          title: "Diario",
          tabBarIcon: tabIcon("create-outline"),
        }}
      />
      <Tabs.Screen
        name="strategy"
        options={{
          title: "Estrategia",
          tabBarIcon: tabIcon("compass-outline"),
        }}
      />
      <Tabs.Screen
        name="training"
        options={{
          href: VIEWER ? null : undefined,
          title: "Entreno",
          tabBarIcon: tabIcon("barbell-outline"),
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: "Más",
          tabBarIcon: tabIcon("ellipsis-horizontal-circle-outline"),
        }}
      />
    </Tabs>
  );
}
