import { useState } from "react";
import { View } from "react-native";
import Svg, { Circle, Defs, Line, LinearGradient, Path, Stop, Text as SvgText } from "react-native-svg";

import { GrowBar, RevealX } from "@/src/components/motion";
import { Text } from "@/src/components/Text";
import type { GoalEta, GoalProgress } from "@/src/features/profile/profile";
import { energyOf, signed, trajectoryX, type Trajectory } from "@/src/features/strategy/strategy";
import { longDate } from "@/src/lib/dates";
import { convertWeight, formatWeight, weightValue, type WeightUnit } from "@/src/lib/units";
import { AppTheme, RADIUS } from "@/src/theme";
import { FONTS } from "@/src/theming/fonts";

const CHART = { height: 172, top: 26, bottom: 26, side: 8 };

/** A dónde vas: lo recorrido, hoy y la línea hasta la meta al ritmo real. */
export function TrajectoryCard({
  progress,
  eta,
  trajectory,
  unit,
  children,
}: {
  progress: GoalProgress;
  eta: GoalEta | null;
  trajectory: Trajectory | null;
  unit: WeightUnit;
  children?: React.ReactNode;
}) {
  const { colors } = AppTheme;
  const [width, setWidth] = useState(0);
  const toward = eta?.direction === "toward" && Boolean(eta.actualDate);
  const left = formatWeight(progress.remainingKg, unit, 1);
  const [label, headline, detail] = progress.reached
    ? ["Tu meta", "Llegaste", `${formatWeight(progress.goalKg, unit, 1)} alcanzados`]
    : toward
      ? [
          "A tu ritmo llegas hacia el",
          longDate(eta?.actualDate ?? ""),
          `Faltan ${left}, unas ${eta?.actualWeeks} semanas`,
        ]
      : [
          "Te faltan",
          left,
          eta?.direction === "away"
            ? "Tu ritmo real te está alejando de la meta"
            : eta?.direction === "flat"
              ? "Tu peso está estable por ahora"
              : progress.weeksLeft
                ? `Unas ${progress.weeksLeft} semanas al ritmo del plan`
                : "La fecha aparece con más pesajes",
        ];
  return (
    <View style={[AppTheme.card, { borderRadius: RADIUS.hero, gap: 10 }]}>
      <View style={[AppTheme.sectionHeader, { alignItems: "center", gap: 12 }]}>
        <View style={{ flex: 1 }}>
          <Text style={AppTheme.hint}>{label}</Text>
          <Text style={AppTheme.title}>{headline}</Text>
        </View>
        <View
          accessible
          accessibilityLabel={`${progress.percent} por ciento del camino`}
          style={{
            paddingHorizontal: 12,
            paddingVertical: 6,
            borderRadius: RADIUS.control,
            backgroundColor: colors.accentSoft,
          }}
        >
          <Text style={{ fontFamily: FONTS.display700, fontSize: 18, color: colors.accentText }}>
            {progress.percent} %
          </Text>
        </View>
      </View>
      {trajectory ? (
        <View
          accessible
          accessibilityLabel={`Trayectoria: de ${formatWeight(progress.startKg, unit, 1)} a ${formatWeight(progress.currentKg, unit, 1)} hoy; meta ${formatWeight(progress.goalKg, unit, 1)}`}
          style={{ height: CHART.height }}
          onLayout={(event) => setWidth(Math.round(event.nativeEvent.layout.width))}
        >
          {width ? <TrajectoryChart trajectory={trajectory} width={width} unit={unit} /> : null}
        </View>
      ) : (
        <View style={AppTheme.goalTrack}>
          <View style={[AppTheme.goalFill, { width: `${progress.percent}%` }]} />
        </View>
      )}
      <Text style={[AppTheme.hint, { color: eta?.direction === "away" ? colors.warning : colors.body }]}>
        {detail}
      </Text>
      {children}
    </View>
  );
}

function TrajectoryChart({
  trajectory,
  width,
  unit,
}: {
  trajectory: Trajectory;
  width: number;
  unit: WeightUnit;
}) {
  const { colors } = AppTheme;
  const { height, top, bottom, side } = CHART;
  const span = trajectory.max - trajectory.min || 1;
  const x = (day: number) => side + trajectoryX(trajectory, day) * (width - side * 2);
  const y = (kg: number) => top + ((trajectory.max - kg) / span) * (height - top - bottom);
  const now = { x: x(trajectory.today), y: y(trajectory.currentKg) };
  const goal = { x: x(trajectory.end), y: y(trajectory.goalKg) };
  const line = [...trajectory.points.map((point) => [x(point.day), y(point.trendKg)]), [now.x, now.y]]
    .map(([px, py], index) => `${index ? "L" : "M"}${px} ${py}`)
    .join(" ");
  const floor = height - bottom;
  const first = trajectory.points[0];
  const label = { fontSize: 13, fill: colors.text, fontFamily: FONTS.text600 };
  const quiet = { fontSize: 12, fill: colors.muted, fontFamily: FONTS.text400 };
  // El texto de hoy va del lado con sitio: a la derecha del punto, lejos de la línea.
  const losing = trajectory.goalKg < trajectory.currentKg;
  return (
    <>
      <Svg width={width} height={height} style={{ position: "absolute" }}>
        <Line
          x1={side}
          x2={width - side}
          y1={goal.y}
          y2={goal.y}
          stroke={colors.accent}
          strokeOpacity={0.6}
          strokeDasharray="3 5"
        />
        {trajectory.points.map((point, index) => (
          <Circle key={index} cx={x(point.day)} cy={y(point.kg)} r={2} fill={colors.muted} opacity={0.55} />
        ))}
        {trajectory.arrives ? (
          <Line
            x1={now.x}
            y1={now.y}
            x2={goal.x}
            y2={goal.y}
            stroke={colors.violet}
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeDasharray="2 7"
          />
        ) : null}
        <Circle cx={goal.x} cy={goal.y} r={6} fill={trajectory.arrives ? colors.accent : colors.muted} />
        <SvgText {...label} x={now.x + 12} y={now.y + (losing ? -8 : 20)}>
          {`Hoy ${weightValue(trajectory.currentKg, unit, 1)}`}
        </SvgText>
        <SvgText {...quiet} x={side} y={height - 6}>
          {`Empezó en ${weightValue(first.trendKg, unit, 1)}`}
        </SvgText>
        <SvgText {...quiet} x={width - side} y={height - 6} textAnchor="end">
          {`Meta ${formatWeight(trajectory.goalKg, unit, 1)}`}
        </SvgText>
      </Svg>
      <RevealX width={width} style={{ height }}>
        <Svg width={width} height={height}>
          <Defs>
            <LinearGradient id="strategyFill" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={colors.violet} stopOpacity={0.26} />
              <Stop offset="1" stopColor={colors.violet} stopOpacity={0} />
            </LinearGradient>
          </Defs>
          <Path d={`${line} L${now.x} ${floor} L${x(first.day)} ${floor} Z`} fill="url(#strategyFill)" />
          <Path d={line} stroke={colors.violet} strokeWidth={3} fill="none" strokeLinejoin="round" />
          <Circle cx={now.x} cy={now.y} r={10} fill={colors.violet} opacity={0.22} />
          <Circle cx={now.x} cy={now.y} r={5} fill={colors.violet} />
        </Svg>
      </RevealX>
    </>
  );
}

/** Lo que gastas contra lo que comes, y en qué se traduce. */
export function EnergyCard({
  target,
  tdee,
  margin,
  weeklyRateKg,
  unit,
}: {
  target: number;
  tdee: number | null;
  margin: number | null;
  weeklyRateKg: number | null;
  unit: WeightUnit;
}) {
  const { colors } = AppTheme;
  const energy = energyOf(target, tdee);
  const rows = [
    {
      label: "Gastas",
      value: tdee,
      extra: margin ? `±${margin}` : "kcal",
      share: energy.burnShare,
      color: colors.warning,
    },
    { label: "Comes", value: target, extra: "kcal", share: energy.eatShare, color: colors.kcal },
  ];
  return (
    <View style={AppTheme.card}>
      <Text style={AppTheme.cardTitle} accessibilityRole="header">
        Tu energía al día
      </Text>
      {rows.map((row) => (
        <View key={row.label} style={{ gap: 6 }}>
          <View style={[AppTheme.sectionHeader, { alignItems: "baseline" }]}>
            <Text style={AppTheme.body}>{row.label}</Text>
            <Text style={AppTheme.tileValue}>
              {row.value ?? "—"}
              <Text style={AppTheme.tileUnit}> {row.value === null ? "reuniendo datos" : row.extra}</Text>
            </Text>
          </View>
          <View style={[AppTheme.progressTrack, { height: 10 }]}>
            <GrowBar
              fraction={row.share}
              style={{ height: "100%", borderRadius: 5, backgroundColor: row.color }}
            />
          </View>
        </View>
      ))}
      <View
        style={{
          flexDirection: "row",
          borderTopWidth: 1,
          borderTopColor: colors.border,
          paddingTop: 12,
          gap: 12,
        }}
      >
        <Figure
          value={energy.balance === null ? "—" : signed(energy.balance)}
          label={
            energy.balance !== null && energy.balance > 0
              ? "kcal de superávit al día"
              : "kcal de déficit al día"
          }
        />
        <Figure
          value={weeklyRateKg === null ? "—" : signed(convertWeight(weeklyRateKg, "kg", unit), 2)}
          label={`${unit} por semana, tu ritmo real`}
        />
      </View>
    </View>
  );
}

function Figure({ value, label }: { value: string; label: string }) {
  return (
    <View style={{ flex: 1, gap: 2 }}>
      <Text style={AppTheme.tileValue}>{value}</Text>
      <Text style={AppTheme.tileSubtitle}>{label}</Text>
    </View>
  );
}
