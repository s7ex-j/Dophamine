import { Pressable, View } from "react-native";
import { Text } from "@/src/components/Text";

import { THEMES, themed, type ThemeId } from "@/src/theming/palettes";
import { AppTheme } from "@/src/theme";

/**
 * Elegir el tema: tres miniaturas con los colores de cada uno (fondo, anillo
 * de calorías, barras de macros y botón), una al lado de otra.
 */
export function ThemePicker({ value, onChange }: { value: ThemeId; onChange: (theme: ThemeId) => void }) {
  return (
    <View accessibilityRole="radiogroup" style={{ flexDirection: "row", gap: 10 }}>
      {THEMES.map((theme) => {
        const active = theme.value === value;
        const c = (hex: string) => themed(hex, theme.value);
        return (
          <Pressable
            key={theme.value}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            accessibilityLabel={`Tema ${theme.label}`}
            onPress={() => onChange(theme.value)}
            style={{ flex: 1, alignItems: "center", gap: 6 }}
          >
            <View
              style={{
                width: "100%",
                height: 150,
                borderRadius: 14,
                borderWidth: 2,
                borderColor: active ? AppTheme.colors.accent : c("#27302B"),
                backgroundColor: c("#0E1311"),
                padding: 10,
                gap: 7,
              }}
            >
              <View
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 22,
                  borderWidth: 5,
                  borderColor: c("#60A5FA"),
                  alignSelf: "center",
                }}
              />
              <View style={{ height: 5, borderRadius: 3, backgroundColor: c("#F87171") }} />
              <View style={{ height: 5, borderRadius: 3, width: "80%", backgroundColor: c("#34D39A") }} />
              <View style={{ height: 5, borderRadius: 3, width: "60%", backgroundColor: c("#FBBF24") }} />
              <View
                style={{ marginTop: "auto", height: 18, borderRadius: 6, backgroundColor: c("#34D399") }}
              />
            </View>
            <Text style={[AppTheme.optionTitle, active && { color: AppTheme.colors.accent }]}>
              {theme.label}
            </Text>
            <Text style={[AppTheme.hint, { fontSize: 11, textAlign: "center", lineHeight: 14 }]}>
              {theme.detail}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
