import type { PropsWithChildren } from "react";
import { View } from "react-native";
import Svg, { Circle, Line, Path } from "react-native-svg";

import { AppTheme } from "@/src/theme";

// Gráficos pequeños dibujados con SVG. Reciben números ya calculados: la
// geometría (escalas, trazos) está en `chartGeometry.ts`, con pruebas.
import { linePath, type ChartPoint } from "@/src/components/chartGeometry";

/** Línea con puntos, para tendencias cortas. Con `area` rellena debajo de la línea. */
export function LineChart({
  values,
  color = AppTheme.colors.accent,
  width = 150,
  height = 56,
  area = false,
  reference,
}: {
  values: number[];
  color?: string;
  width?: number;
  height?: number;
  area?: boolean;
  /** Valor de referencia (una meta) dibujado como línea punteada. */
  reference?: number;
}) {
  const geometry = linePath(values, width, height, reference);
  if (!geometry) return <View style={{ width, height }} />;
  return (
    <Svg width={width} height={height}>
      {area ? <Path d={geometry.area} fill={color} opacity={0.18} /> : null}
      {geometry.referenceY !== null ? (
        <Line
          x1={0}
          x2={width}
          y1={geometry.referenceY}
          y2={geometry.referenceY}
          stroke={AppTheme.colors.muted}
          strokeWidth={1}
          strokeDasharray="4 4"
        />
      ) : null}
      <Path d={geometry.line} stroke={color} strokeWidth={2} fill="none" strokeLinejoin="round" />
      {geometry.points.map((point: ChartPoint, index: number) => (
        <Circle
          key={index}
          cx={point.x}
          cy={point.y}
          r={geometry.points.length > 10 ? 2 : 3}
          fill={AppTheme.colors.surface}
          stroke={color}
          strokeWidth={2}
        />
      ))}
    </Svg>
  );
}

/** Anillo de progreso. Lo que vaya dentro (un número) se centra encima. */
export function Ring({
  value,
  size = 132,
  stroke = 12,
  color = AppTheme.colors.accent,
  children,
}: PropsWithChildren<{ value: number; size?: number; stroke?: number; color?: string }>) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.max(0, Math.min(1, value));
  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={AppTheme.colors.surface2}
          strokeWidth={stroke}
          fill="none"
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${circumference * progress} ${circumference}`}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <View style={AppTheme.ringCenter}>{children}</View>
    </View>
  );
}

/** Barra vertical pequeña con marca de meta. `value` y `target` en la misma unidad. */
export function MiniBar({ value, target, color }: { value: number; target: number; color: string }) {
  // La escala deja la meta al 80 % de la altura, para que pasarse se vea.
  const scale = target > 0 ? target / 0.8 : 1;
  const fill = Math.max(0, Math.min(1, value / scale));
  return (
    <View style={AppTheme.weekGridTrack}>
      <View
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: "80%",
          height: 2,
          backgroundColor: AppTheme.colors.muted,
        }}
      />
      <View style={{ width: "100%", height: `${fill * 100}%`, backgroundColor: color, borderRadius: 4 }} />
    </View>
  );
}

/** Barra horizontal partida en segmentos proporcionales (desglose de un total). */
export function StackBar({ segments }: { segments: Array<{ value: number; color: string }> }) {
  const total = segments.reduce((sum, segment) => sum + Math.max(0, segment.value), 0);
  return (
    <View style={AppTheme.stackBar}>
      {segments.map((segment, index) => (
        <View
          key={index}
          style={{ flex: total > 0 ? Math.max(0, segment.value) / total : 0, backgroundColor: segment.color }}
        />
      ))}
    </View>
  );
}
