import { Children, useState, type PropsWithChildren, type ReactNode } from "react";
import { Ionicons } from "@expo/vector-icons";
import { Pressable as PlainPressable, View } from "react-native";
import Svg, { Circle } from "react-native-svg";

import { PressableScale } from "@/src/components/PressableScale";
import { ProgressArc } from "@/src/components/motion";
import { Text } from "@/src/components/Text";
import type { IconName } from "@/src/components/ui";
import type { TileText } from "@/src/features/more/more";
import { AppTheme, RADIUS } from "@/src/theme";
import { THEMES, themed, type ThemeId } from "@/src/theming/palettes";
import { FONTS } from "@/src/theming/fonts";

/** El plan arriba de todo: objetivo, de dónde a dónde y cuánto va. */
export function PlanCard({
  goal,
  detail,
  percent,
  onPress,
}: {
  goal: string;
  detail: string;
  percent: number | null;
  onPress: () => void;
}) {
  const { colors } = AppTheme;
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={`Tu plan: ${goal}. ${detail}`}
      onPress={onPress}
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 16,
        padding: 18,
        borderRadius: RADIUS.hero,
        backgroundColor: colors.accentSoft,
      }}
    >
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={[AppTheme.hint, { color: colors.accentText }]}>Tu plan</Text>
        <Text style={[AppTheme.title, { fontSize: 24, lineHeight: 28 }]}>{goal}</Text>
        <Text style={[AppTheme.hint, { color: colors.body }]}>{detail}</Text>
      </View>
      {percent === null ? (
        <Ionicons name="chevron-forward" size={20} color={colors.accentText} />
      ) : (
        <View style={{ width: 62, height: 62, alignItems: "center", justifyContent: "center" }}>
          <Svg width={62} height={62} style={{ position: "absolute", transform: [{ rotate: "-90deg" }] }}>
            <Circle cx={31} cy={31} r={27} stroke={colors.border} strokeWidth={6} fill="none" />
            <ProgressArc
              progress={percent / 100}
              radius={27}
              cx={31}
              cy={31}
              stroke={colors.accent}
              strokeWidth={6}
              strokeLinecap="round"
              fill="none"
            />
          </Svg>
          <Text style={{ color: colors.text, fontFamily: FONTS.display700, fontSize: 15 }}>{percent}%</Text>
        </View>
      )}
    </PressableScale>
  );
}

/** Un mosaico con su dato vivo: el ícono lleva el color de ese dato. */
export function MoreTile({
  icon,
  color,
  title,
  text,
  onPress,
}: {
  icon: IconName;
  color: string;
  title: string;
  text: TileText;
  onPress: () => void;
}) {
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={`${title}: ${text.value}. ${text.detail}`}
      onPress={onPress}
      style={[AppTheme.card, { flexBasis: "46%", flexGrow: 1, padding: 14, gap: 2 }]}
    >
      <Ionicons name={icon} size={24} color={color} style={{ marginBottom: 8 }} />
      <Text style={AppTheme.tileValue} numberOfLines={1} adjustsFontSizeToFit>
        {text.value}
      </Text>
      <Text style={AppTheme.tileTitle}>{title}</Text>
      <Text style={AppTheme.tileSubtitle} numberOfLines={2}>
        {text.detail}
      </Text>
    </PressableScale>
  );
}

/** Un grupo de filas con su nombre, separadas por una línea fina. */
export function MoreGroup({ title, children }: PropsWithChildren<{ title: string }>) {
  const rows = Children.toArray(children).filter(Boolean);
  return (
    <View style={{ gap: 8 }}>
      <Text
        accessibilityRole="header"
        style={[AppTheme.label, { color: AppTheme.colors.muted, paddingLeft: 4 }]}
      >
        {title}
      </Text>
      <View style={[AppTheme.card, { paddingVertical: 0, gap: 0 }]}>
        {rows.map((row, index) => (
          <View
            key={index}
            style={index > 0 && { borderTopWidth: 1, borderTopColor: AppTheme.colors.border }}
          >
            {row}
          </View>
        ))}
      </View>
    </View>
  );
}

const ROW = { flexDirection: "row", alignItems: "center", gap: 12, minHeight: 52 } as const;

/** Fila: ícono, nombre y, a la derecha, un valor corto con flecha. */
export function MoreRow({
  icon,
  title,
  value,
  danger,
  onPress,
}: {
  icon: IconName;
  title: string;
  value?: string;
  danger?: boolean;
  onPress: () => void;
}) {
  const { colors } = AppTheme;
  return (
    <PressableScale accessibilityRole="button" onPress={onPress} scaleTo={0.985} style={ROW}>
      <Ionicons name={icon} size={20} color={danger ? colors.coral : colors.body} />
      <Text style={[AppTheme.listTitle, { flex: 1 }, danger && { color: colors.coral }]}>{title}</Text>
      {value ? <Text style={AppTheme.hint}>{value}</Text> : null}
      <Ionicons name="chevron-forward" size={16} color={colors.muted} />
    </PressableScale>
  );
}

/** Fila con un control que se usa ahí mismo. */
export function MoreControl({
  icon,
  title,
  onPress,
  children,
}: PropsWithChildren<{ icon: IconName; title: string; onPress?: () => void }>) {
  const label = (
    <>
      <Ionicons name={icon} size={20} color={AppTheme.colors.body} />
      <Text style={[AppTheme.listTitle, { flex: 1 }]}>{title}</Text>
    </>
  );
  return (
    <View style={ROW}>
      {onPress ? (
        <PressableScale accessibilityRole="button" onPress={onPress} style={[ROW, { flex: 1 }]}>
          {label}
        </PressableScale>
      ) : (
        label
      )}
      {children}
    </View>
  );
}

/** Fila que se abre para leer más, sin salir de la pantalla. */
export function MoreDisclosure({
  icon,
  title,
  control,
  startOpen = false,
  children,
}: PropsWithChildren<{ icon: IconName; title: string; control?: ReactNode; startOpen?: boolean }>) {
  const [open, setOpen] = useState(startOpen);
  const { colors } = AppTheme;
  return (
    <View>
      <View style={ROW}>
        <PressableScale
          accessibilityRole="button"
          accessibilityState={{ expanded: open }}
          onPress={() => setOpen(!open)}
          scaleTo={0.985}
          style={[ROW, { flex: 1 }]}
        >
          <Ionicons name={icon} size={20} color={colors.body} />
          <Text style={[AppTheme.listTitle, { flex: 1 }]}>{title}</Text>
          <Ionicons name={open ? "chevron-up" : "chevron-down"} size={16} color={colors.muted} />
        </PressableScale>
        {control}
      </View>
      {open ? <View style={{ gap: 8, paddingBottom: 14 }}>{children}</View> : null}
    </View>
  );
}

/** Los temas como muestras de color: se toca una y cambia. */
export function ThemeDots({ value, onChange }: { value: ThemeId; onChange: (theme: ThemeId) => void }) {
  return (
    <View accessibilityRole="radiogroup" style={{ flexDirection: "row", marginRight: -8 }}>
      {THEMES.map((theme) => {
        const active = theme.value === value;
        return (
          <PlainPressable
            key={theme.value}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            accessibilityLabel={`Tema ${theme.label}`}
            onPress={() => onChange(theme.value)}
            style={{ width: 44, height: 44, alignItems: "center", justifyContent: "center" }}
          >
            <View
              style={{
                width: 32,
                height: 32,
                borderRadius: 16,
                borderWidth: 2,
                borderColor: active ? AppTheme.colors.accent : "transparent",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {/* El fondo del tema con su acento dentro: así se distinguen el claro y los oscuros. */}
              <View
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: AppTheme.colors.border,
                  backgroundColor: themed("#0E1311", theme.value),
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <View
                  style={{
                    width: 12,
                    height: 12,
                    borderRadius: 6,
                    backgroundColor: themed("#34D399", theme.value),
                  }}
                />
              </View>
            </View>
          </PlainPressable>
        );
      })}
    </View>
  );
}
