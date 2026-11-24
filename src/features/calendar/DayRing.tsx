import { View } from "react-native";
import Svg, { Circle } from "react-native-svg";

import { Text } from "@/src/components/Text";
import type { IconName } from "@/src/components/ui";
import { GOALS } from "@/src/features/calendar/calendar";
import { COMPLIANCE_ITEMS, type ComplianceKey } from "@/src/features/habits/compliance";
import { AppTheme, tint } from "@/src/theme";
import { FONTS } from "@/src/theming/fonts";

/** Un color y un ícono por objetivo, para verlos separados en el detalle de un día. */
export const goalColor = (key: ComplianceKey) =>
  ({
    calories: AppTheme.colors.kcal,
    water: tint("#22D3EE"),
    weight: AppTheme.colors.violet,
    training: AppTheme.colors.warning,
    sleep: tint("#F472B6"),
    wellbeing: AppTheme.colors.amber,
  })[key];
export const GOAL_ICONS: Record<ComplianceKey, IconName> = {
  calories: "flame-outline",
  water: "water-outline",
  weight: "scale-outline",
  training: "barbell-outline",
  sleep: "moon-outline",
  wellbeing: "happy-outline",
};

/** El día como un anillo de un color que se llena de 0 a 6; completo, se rellena por dentro. */
export function DayRing({
  score,
  label,
  size = 38,
  future,
}: {
  score: number;
  label: string;
  size?: number;
  future?: boolean;
}) {
  const { colors } = AppTheme;
  const stroke = 4;
  const radius = (size - stroke) / 2;
  const length = 2 * Math.PI * radius;
  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      {future ? null : (
        <Svg width={size} height={size} style={{ position: "absolute", transform: [{ rotate: "-90deg" }] }}>
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={colors.border}
            strokeWidth={stroke}
            fill={score === GOALS ? colors.accentSoft : "none"}
          />
          {score ? (
            <Circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke={colors.accent}
              strokeWidth={stroke}
              strokeLinecap={score === GOALS ? "butt" : "round"}
              strokeDasharray={`${(length * score) / GOALS} ${length}`}
              fill="none"
            />
          ) : null}
        </Svg>
      )}
      <Text
        style={{ fontSize: 14, fontWeight: "600", color: future ? colors.muted : colors.text }}
        maxFontSizeMultiplier={1.2}
      >
        {label}
      </Text>
    </View>
  );
}

/** Los seis objetivos, cada uno con su tramo y su color. */
export function GoalsRing({
  done,
  size = 84,
  showCount = true,
}: {
  done: Record<ComplianceKey, boolean>;
  size?: number;
  showCount?: boolean;
}) {
  const stroke = size > 70 ? 8 : 6;
  const radius = (size - stroke) / 2;
  const length = 2 * Math.PI * radius;
  const gap = stroke * 0.8;
  const slice = length / GOALS;
  const count = COMPLIANCE_ITEMS.filter(({ key }) => done[key]).length;
  return (
    <View
      accessible
      accessibilityLabel={`${count} de ${GOALS} objetivos`}
      style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}
    >
      <Svg width={size} height={size} style={{ position: "absolute" }}>
        {COMPLIANCE_ITEMS.map(({ key }, index) => (
          <Circle
            key={key}
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={done[key] ? goalColor(key) : AppTheme.colors.border}
            strokeWidth={stroke}
            fill="none"
            strokeDasharray={`${slice - gap} ${length}`}
            transform={`rotate(${-90 + index * (360 / GOALS) + (gap / length) * 180} ${size / 2} ${size / 2})`}
          />
        ))}
      </Svg>
      {showCount ? (
        <Text style={{ fontFamily: FONTS.display700, fontSize: 22, color: AppTheme.colors.text }}>
          {count}/{GOALS}
        </Text>
      ) : null}
    </View>
  );
}
