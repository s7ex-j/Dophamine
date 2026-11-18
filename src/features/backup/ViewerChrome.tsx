import { Ionicons } from "@expo/vector-icons";
import { Image, StyleSheet, View } from "react-native";

import { PressableScale as Pressable } from "@/src/components/PressableScale";
import { Text } from "@/src/components/Text";
import { closeViewer } from "@/src/features/backup/viewerData";
import { saveViewerTheme, setViewerLayout, VIEWER_LAYOUT } from "@/src/lib/viewerLayout";
import { AppTheme, THEME } from "@/src/theme";
import { switchTheme } from "@/src/theming/live";
import { THEMES, themed, type ThemeId } from "@/src/theming/palettes";

// Piezas del visor web: la marca, el selector de tema, el cambio de vista y el menú lateral.

/** Ícono y nombre de la app. */
export function Brand({ size = 28 }: { size?: number }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
      <Image
        source={require("../../../assets/images/icon.png")}
        accessibilityIgnoresInvertColors
        style={{ width: size, height: size, borderRadius: size * 0.26 }}
      />
      <Text style={{ color: AppTheme.colors.text, fontSize: 18, fontFamily: "display", fontWeight: "700" }}>
        Dophamine
      </Text>
    </View>
  );
}

/** Los tres temas como muestras de color; el elegido lleva un aro. */
export function ThemeSwitch() {
  const choose = (theme: ThemeId) => {
    if (theme === THEME) return;
    saveViewerTheme(theme);
    switchTheme(theme);
  };
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel="Tema" style={styles.switchGroup}>
      {THEMES.map((theme) => {
        const active = theme.value === THEME;
        return (
          <Pressable
            key={theme.value}
            accessibilityRole="radio"
            accessibilityState={{ checked: active }}
            accessibilityLabel={`Tema ${theme.label}`}
            onPress={() => choose(theme.value)}
            hitSlop={6}
            style={[styles.swatchRing, { borderColor: active ? AppTheme.colors.accent : "transparent" }]}
          >
            <View
              style={[
                styles.swatch,
                {
                  backgroundColor: themed("#0E1311", theme.value),
                  borderColor: themed("#2C3631", theme.value),
                },
              ]}
            >
              <View style={[styles.swatchDot, { backgroundColor: themed("#34D399", theme.value) }]} />
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

/** Cambia el visor entre la vista ancha (de computadora) y la de celular. */
export function LayoutSwitch({ compact = false }: { compact?: boolean }) {
  const wide = VIEWER_LAYOUT === "wide";
  const label = wide ? "Vista de celular" : "Vista ancha";
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={wide ? "Cambiar a vista de celular" : "Cambiar a vista ancha"}
      onPress={() => setViewerLayout(wide ? "phone" : "wide")}
      style={styles.ghostButton}
    >
      <Ionicons
        name={wide ? "phone-portrait-outline" : "desktop-outline"}
        size={16}
        color={AppTheme.colors.body}
      />
      {compact ? null : <Text style={[styles.ghostText, { color: AppTheme.colors.body }]}>{label}</Text>}
    </Pressable>
  );
}

type SidebarProps = {
  state: { index: number; routes: Array<{ key: string; name: string }> };
  descriptors: Record<string, { options: { title?: string } }>;
  navigateToTab: (routeKey: string) => void;
};

const ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  index: "grid-outline",
  strategy: "compass-outline",
  more: "ellipsis-horizontal-circle-outline",
};

/** Menú lateral del visor en la vista ancha: marca, secciones y, al pie, tema, vista y salir. */
export function ViewerSidebar({ state, descriptors, navigateToTab }: SidebarProps) {
  const routes = state.routes.filter((route) => ICONS[route.name]);
  return (
    <View
      style={[
        styles.sidebar,
        { backgroundColor: AppTheme.colors.surface, borderRightColor: AppTheme.colors.border },
      ]}
    >
      <View style={{ paddingHorizontal: 8, paddingBottom: 20 }}>
        <Brand />
      </View>
      <View style={{ gap: 2 }}>
        {routes.map((route) => {
          const active = state.routes[state.index]?.key === route.key;
          const title = descriptors[route.key]?.options.title ?? route.name;
          return (
            <Pressable
              key={route.key}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              accessibilityLabel={title}
              onPress={() => navigateToTab(route.key)}
              scaleTo={0.98}
              style={[styles.navItem, active && { backgroundColor: AppTheme.colors.surface2 }]}
            >
              <Ionicons
                name={ICONS[route.name]}
                size={18}
                color={active ? AppTheme.colors.accent : AppTheme.colors.muted}
              />
              <Text style={[styles.navText, { color: active ? AppTheme.colors.text : AppTheme.colors.body }]}>
                {title}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <View style={{ marginTop: "auto", gap: 14 }}>
        <View style={[styles.readOnly, { borderColor: AppTheme.colors.border }]}>
          <Text style={[styles.navText, { color: AppTheme.colors.text, fontSize: 13 }]}>Solo lectura</Text>
          <Text style={[AppTheme.hint, { fontSize: 12, lineHeight: 17 }]}>
            Los registros se hacen en el teléfono. Para actualizar, vuelve a conectarlo.
          </Text>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <ThemeSwitch />
          <LayoutSwitch compact />
        </View>
        <Pressable accessibilityRole="button" onPress={closeViewer} style={styles.ghostButton}>
          <Ionicons name="log-out-outline" size={16} color={AppTheme.colors.body} />
          <Text style={[styles.ghostText, { color: AppTheme.colors.body }]}>Cerrar mis datos</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  sidebar: { width: 232, paddingHorizontal: 12, paddingTop: 22, paddingBottom: 18, borderRightWidth: 1 },
  navItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    height: 40,
    paddingHorizontal: 10,
    borderRadius: 10,
  },
  navText: { fontSize: 14, fontWeight: "600" },
  readOnly: { borderWidth: 1, borderRadius: 12, padding: 12, gap: 4 },
  switchGroup: { flexDirection: "row", alignItems: "center", gap: 4 },
  swatchRing: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  swatch: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  swatchDot: { width: 8, height: 8, borderRadius: 4 },
  ghostButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    minHeight: 34,
    paddingHorizontal: 10,
    borderRadius: 10,
  },
  ghostText: { fontSize: 13, fontWeight: "600" },
});
