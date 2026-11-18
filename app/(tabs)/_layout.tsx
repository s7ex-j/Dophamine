import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ViewerSidebar } from "@/src/features/backup/ViewerChrome";
import { useViewerHasData } from "@/src/features/backup/viewerData";
import { VIEWER } from "@/src/lib/mode";
import { VIEWER_WIDE } from "@/src/lib/viewerLayout";
import { AppTheme } from "@/src/theme";
import { FONTS } from "@/src/theming/fonts";

// Los colores de la barra vienen del tema y son textos ("#167B5B").
const tabIcon =
  (name: keyof typeof Ionicons.glyphMap) =>
  ({ color, size }: { color?: unknown; size: number }) => (
    <Ionicons name={name} size={size} color={typeof color === "string" ? color : undefined} />
  );

// Cinco pestañas en el teléfono. En la web (visor de solo lectura) se quitan las
// pestaña de registro, Entreno. Todo lo del día se anota en el Panel. Análisis, Hábitos y Bienestar no son pestañas:
// son pantallas que se abren encima desde "Más" y "Estrategia" (ver app/_layout.tsx).
export default function TabsLayout() {
  // Sin barra de título: cada pantalla trae el suyo. El margen superior evita la barra de estado.
  const insets = useSafeAreaInsets();
  // En el visor sin datos no hay pestañas: solo los pasos para conectar el teléfono.
  const hasData = useViewerHasData(VIEWER);
  const hideBar = VIEWER && !hasData;
  return (
    <Tabs
      tabBar={hideBar ? () => null : VIEWER_WIDE ? (props) => <ViewerSidebar {...props} /> : undefined}
      screenOptions={{
        headerShown: false,
        animation: "fade",
        sceneStyle: { backgroundColor: AppTheme.colors.background, paddingTop: insets.top },
        headerStyle: { backgroundColor: AppTheme.colors.background },
        headerShadowVisible: false,
        headerTitleStyle: { color: AppTheme.colors.text, fontWeight: "700" },
        tabBarActiveTintColor: AppTheme.colors.accent,
        tabBarInactiveTintColor: AppTheme.colors.muted,
        // En la vista ancha del visor el menú va a la izquierda, como en una app de computadora.
        tabBarPosition: VIEWER_WIDE ? "left" : "bottom",
        tabBarVariant: VIEWER_WIDE ? "material" : "uikit",
        tabBarStyle: hideBar
          ? { display: "none" }
          : VIEWER_WIDE
            ? {
                borderRightColor: AppTheme.colors.border,
                backgroundColor: AppTheme.colors.surface,
                minWidth: 200,
              }
            : { borderTopColor: AppTheme.colors.border, backgroundColor: AppTheme.colors.surface },
        tabBarLabelStyle: { fontFamily: FONTS.text600, fontSize: 11 },
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
