import { useState } from "react";
import { Pressable, Text, View, type LayoutChangeEvent } from "react-native";
import Svg, { Circle, Line, Path, Rect, Text as SvgText } from "react-native-svg";

import { chartScale } from "@/src/components/chartGeometry";
import type { Insight, SeriesColor } from "@/src/features/dashboard/insights";

/** Lo que necesita el gráfico: sirve para el Panel y para el historial de un ejercicio. */
export type ChartData = Pick<Insight, "title" | "unit" | "dates" | "series" | "reference">;
import { AppTheme } from "@/src/theme";

const HEIGHT = 220;
const BOTTOM = 22;

export const seriesColor = (color: SeriesColor) =>
  ({
    kcal: AppTheme.colors.kcal,
    protein: AppTheme.colors.protein,
    carbs: AppTheme.colors.carbs,
    fats: AppTheme.colors.fats,
    violet: AppTheme.colors.violet,
    warning: AppTheme.colors.warning,
    accent: AppTheme.colors.accent,
    blue: AppTheme.colors.blue,
    muted: AppTheme.colors.muted,
  })[color];

const shortDate = (date: string) => {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(year, month - 1, day)
    .toLocaleDateString("es-PE", { day: "numeric", month: "short" })
    .replace(".", "");
};
const formatTick = (value: number) =>
  Math.abs(value) >= 1000 ? `${Math.round(value / 100) / 10}k` : String(value);

/**
 * Gráfico de una pantalla de detalle: eje vertical con marcas, fechas abajo,
 * línea de referencia (meta) y, al tocar, el valor del día elegido.
 */
export function DetailChart({ insight }: { insight: ChartData }) {
  const [width, setWidth] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const count = insight.dates.length;
  const scale = width
    ? chartScale(insight.series, width, HEIGHT, { bottom: BOTTOM, reference: insight.reference?.value })
    : null;
  const pick = (x: number) => {
    if (!scale || !width) return;
    const slot = (width - 36 - 8) / count;
    setSelected(Math.max(0, Math.min(count - 1, Math.floor((x - 36) / slot))));
  };
  const active = selected ?? count - 1;
  const stacks = insight.series.filter((item) => item.kind === "stack");

  return (
    <View style={{ gap: 10 }}>
      <View style={AppTheme.chipRow}>
        <Text style={AppTheme.legendValue}>{shortDate(insight.dates[active])}</Text>
        {insight.series.map((item) => (
          <View key={item.label} style={AppTheme.legendRow}>
            <View style={[AppTheme.legendDot, { backgroundColor: seriesColor(item.color) }]} />
            <Text style={AppTheme.hint}>
              {item.label}: {item.values[active] ?? "—"}
              {item.values[active] !== null && insight.unit ? ` ${insight.unit}` : ""}
            </Text>
          </View>
        ))}
      </View>
      <Pressable
        accessibilityLabel={`Gráfico de ${insight.title}`}
        onLayout={(event: LayoutChangeEvent) => setWidth(event.nativeEvent.layout.width)}
        onPress={(event) => pick(event.nativeEvent.locationX)}
        style={{ height: HEIGHT }}
      >
        {scale ? (
          <Svg width={width} height={HEIGHT}>
            {scale.ticks.map((tick) => (
              <SvgText
                key={`t${tick}`}
                x={30}
                y={scale.y(tick) + 4}
                fontSize={10}
                fill={AppTheme.colors.muted}
                textAnchor="end"
              >
                {formatTick(tick)}
              </SvgText>
            ))}
            {scale.ticks.map((tick) => (
              <Line
                key={`g${tick}`}
                x1={36}
                x2={width - 8}
                y1={scale.y(tick)}
                y2={scale.y(tick)}
                stroke={AppTheme.colors.border}
                strokeWidth={1}
              />
            ))}
            {[0, Math.floor((count - 1) / 2), count - 1].map((index) => (
              <SvgText
                key={`d${index}`}
                x={scale.x(index)}
                y={HEIGHT - 6}
                fontSize={10}
                fill={AppTheme.colors.muted}
                textAnchor="middle"
              >
                {shortDate(insight.dates[index])}
              </SvgText>
            ))}
            {/* Barras apiladas: cada serie "stack" se dibuja encima de la anterior. */}
            {insight.dates.map((_, index) => {
              let base = 0;
              return stacks.map((item) => {
                const value = item.values[index];
                if (!value) return null;
                const top = scale.y(base + value);
                const bottom = scale.y(base);
                base += value;
                return (
                  <Rect
                    key={`${item.label}${index}`}
                    x={scale.x(index) - scale.barWidth / 2}
                    y={top}
                    width={scale.barWidth}
                    height={Math.max(1, bottom - top)}
                    fill={seriesColor(item.color)}
                    opacity={selected === null || selected === index ? 1 : 0.45}
                  />
                );
              });
            })}
            {insight.series
              .filter((item) => item.kind === "bars")
              .map((item) =>
                item.values.map((value, index) => {
                  if (value === null) return null;
                  const zero = scale.y(0);
                  const y = scale.y(value);
                  const negative = value < 0;
                  return (
                    <Rect
                      key={`${item.label}${index}`}
                      x={scale.x(index) - scale.barWidth / 2}
                      y={Math.min(y, zero)}
                      width={scale.barWidth}
                      height={Math.max(1, Math.abs(zero - y))}
                      rx={2}
                      fill={negative ? AppTheme.colors.accent : seriesColor(item.color)}
                      opacity={selected === null || selected === index ? 1 : 0.45}
                    />
                  );
                }),
              )}
            {insight.reference ? (
              <>
                <Line
                  x1={36}
                  x2={width - 8}
                  y1={scale.y(insight.reference.value)}
                  y2={scale.y(insight.reference.value)}
                  stroke={AppTheme.colors.text}
                  strokeWidth={1}
                  strokeDasharray="5 4"
                  opacity={0.6}
                />
                <SvgText
                  x={width - 10}
                  y={
                    scale.y(insight.reference.value) < 20
                      ? scale.y(insight.reference.value) + 12
                      : scale.y(insight.reference.value) - 4
                  }
                  fontSize={10}
                  fill={AppTheme.colors.body}
                  textAnchor="end"
                >
                  {insight.reference.label}
                </SvgText>
              </>
            ) : null}
            {insight.series
              .filter((item) => item.kind === "dots")
              .map((item) =>
                item.values.map((value, index) =>
                  value === null ? null : (
                    <Circle
                      key={`${item.label}${index}`}
                      cx={scale.x(index)}
                      cy={scale.y(value)}
                      r={count > 120 ? 1.5 : 2.5}
                      fill={seriesColor(item.color)}
                    />
                  ),
                ),
              )}
            {insight.series
              .filter((item) => item.kind === "line")
              .map((item) => {
                const points = item.values.flatMap((value, index) =>
                  value === null ? [] : [`${scale.x(index)} ${scale.y(value)}`],
                );
                if (points.length < 2) return null;
                return (
                  <Path
                    key={item.label}
                    d={`M ${points.join(" L ")}`}
                    stroke={seriesColor(item.color)}
                    strokeWidth={2.5}
                    fill="none"
                    strokeLinejoin="round"
                  />
                );
              })}
            {selected !== null ? (
              <Line
                x1={scale.x(selected)}
                x2={scale.x(selected)}
                y1={8}
                y2={HEIGHT - BOTTOM}
                stroke={AppTheme.colors.muted}
                strokeWidth={1}
              />
            ) : null}
          </Svg>
        ) : null}
      </Pressable>
    </View>
  );
}

/** Calendario de constancia: un cuadro por día, más intenso cuanto más se registró. */
export function ConsistencyGrid({ levels, dates }: { levels: Array<number | null>; dates: string[] }) {
  const shades = [AppTheme.colors.surface2, "#1C3A2D", "#22704F", AppTheme.colors.accent];
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 4 }}>
      {dates.map((date, index) => (
        <View
          key={date}
          accessibilityLabel={`${date}: nivel ${levels[index] ?? 0}`}
          style={{ width: 16, height: 16, borderRadius: 4, backgroundColor: shades[levels[index] ?? 0] }}
        />
      ))}
    </View>
  );
}
