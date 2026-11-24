import { useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { View } from "react-native";
import Svg, { Circle, Defs, G, Line, LinearGradient, Path, Stop, Text as SvgText } from "react-native-svg";

import { Text } from "@/src/components/Text";
import { GrowBar, RevealX } from "@/src/components/motion";
import { AppTheme } from "@/src/theme";
import { FONTS } from "@/src/theming/fonts";

/**
 * Lo que muestra cada página de la bienvenida: una vista previa de la app con números de ejemplo,
 * dibujada con las mismas piezas que las pantallas de verdad. Solo ilustra; no lee datos.
 */
export function WelcomePreview({ page }: { page: number }) {
  if (page === 0) return <DayPreview />;
  if (page === 1) return <TrendPreview />;
  if (page === 2) return <PrivacyPreview />;
  return <PlanPreview />;
}

const MACROS = [
  { label: "Proteína", value: 96, target: 150, color: "protein" },
  { label: "Carbos", value: 180, target: 250, color: "carbs" },
  { label: "Grasas", value: 42, target: 70, color: "fats" },
] as const;

/** El Panel: lo que queda del día y lo que ya se anotó. */
function DayPreview() {
  const { colors } = AppTheme;
  return (
    <View style={{ gap: 10 }}>
      <View style={[AppTheme.card, { gap: 14 }]}>
        <View>
          <Text style={AppTheme.hint}>Te quedan</Text>
          <View style={{ flexDirection: "row", alignItems: "baseline", gap: 6 }}>
            <Text style={[AppTheme.dayFigure, { fontSize: 44, lineHeight: 48 }]}>1240</Text>
            <Text style={AppTheme.dayFigureUnit}>kcal</Text>
          </View>
        </View>
        <View style={{ gap: 9 }}>
          {MACROS.map((macro, index) => (
            <View key={macro.label} style={{ gap: 5 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                <Text style={[AppTheme.legendLabel, { flex: 0 }]}>{macro.label}</Text>
                <Text style={AppTheme.legendValue}>
                  {macro.value}
                  <Text style={AppTheme.macroTarget}> / {macro.target} g</Text>
                </Text>
              </View>
              <View style={[AppTheme.progressTrack, { height: 6 }]}>
                <GrowBar
                  fraction={macro.value / macro.target}
                  delay={120 + index * 90}
                  style={{ height: "100%", borderRadius: 3, backgroundColor: colors[macro.color] }}
                />
              </View>
            </View>
          ))}
        </View>
      </View>
      <View style={{ flexDirection: "row", gap: 8 }}>
        <MiniTile icon="scale-outline" label="Peso" value="78.4 kg" />
        <MiniTile icon="moon-outline" label="Sueño" value="7 h 30" />
        <MiniTile icon="water-outline" label="Agua" value="1.5 L" />
      </View>
    </View>
  );
}

function MiniTile({
  icon,
  label,
  value,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
}) {
  return (
    <View style={[AppTheme.card, { flex: 1, padding: 12, gap: 6 }]}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
        <Ionicons name={icon} size={14} color={AppTheme.colors.accent} />
        <Text style={AppTheme.quickLabel}>{label}</Text>
      </View>
      <Text style={[AppTheme.quickValue, { fontSize: 16 }]}>{value}</Text>
    </View>
  );
}

// Pesajes de ejemplo de cuatro semanas: el agua los mueve día a día; debajo, el peso baja tranquilo.
const NOISE = [
  0.3, -0.4, 0.6, 0.1, -0.5, 0.7, -0.2, 0.4, -0.6, 0.2, 0.8, -0.3, -0.7, 0.5, 0.1, -0.4, 0.6, -0.1, -0.6, 0.4,
  0.7, -0.5, 0.2, -0.3, 0.5, -0.6, 0.3, -0.2,
];
const WEIGHTS = NOISE.map((noise, index) => 80 - index * 0.057 + noise);
const REACH = 5;
const TREND = WEIGHTS.map((_, index) => {
  // Cerca de los bordes se promedia lo que hay, siempre parejo a los dos lados.
  const reach = Math.max(2, Math.min(REACH, index, WEIGHTS.length - 1 - index));
  const near = WEIGHTS.slice(Math.max(0, index - reach), index + reach + 1);
  return near.reduce((sum, value) => sum + value, 0) / near.length;
});
const WEEKLY = ((TREND[TREND.length - 1] - TREND[0]) / (TREND.length - 1)) * 7;
const TICKS = [81, 80, 79, 78];
const CHART = { height: 168, left: 30, right: 14, top: 10, bottom: 24 };

type Point = { x: number; y: number };
const straight = (points: Point[]) => points.map(({ x, y }, i) => `${i ? "L" : "M"}${x} ${y}`).join(" ");
/** Curva que pasa por todos los puntos, sin picos. */
const curve = (points: Point[]) =>
  points.reduce((path, point, i) => {
    if (!i) return `M${point.x} ${point.y}`;
    const before = points[i - 2] ?? points[i - 1];
    const from = points[i - 1];
    const after = points[i + 1] ?? point;
    const c1 = { x: from.x + (point.x - before.x) / 6, y: from.y + (point.y - before.y) / 6 };
    const c2 = { x: point.x - (after.x - from.x) / 6, y: point.y - (after.y - from.y) / 6 };
    return `${path} C${c1.x} ${c1.y} ${c2.x} ${c2.y} ${point.x} ${point.y}`;
  }, "");

function TrendChart({ width }: { width: number }) {
  const { colors } = AppTheme;
  const { height, left, right, top, bottom } = CHART;
  const x = (index: number) => left + (index * (width - left - right)) / (WEIGHTS.length - 1);
  const y = (value: number) => top + ((81 - value) / 3) * (height - top - bottom);
  const weights = WEIGHTS.map((value, index) => ({ x: x(index), y: y(value) }));
  const trend = TREND.map((value, index) => ({ x: x(index), y: y(value) }));
  const last = trend[trend.length - 1];
  const floor = height - bottom;
  const line = curve(trend);
  const label = { fontSize: 11, fill: colors.muted, fontFamily: FONTS.text400 };
  return (
    <View style={{ height }}>
      <Svg width={width} height={height} style={{ position: "absolute" }}>
        {TICKS.map((tick) => (
          <G key={tick}>
            <Line
              x1={left}
              x2={width - right}
              y1={y(tick)}
              y2={y(tick)}
              stroke={colors.border}
              strokeWidth={1}
            />
            <SvgText {...label} x={left - 8} y={y(tick) + 4} textAnchor="end">
              {String(tick)}
            </SvgText>
          </G>
        ))}
        <SvgText {...label} x={left} y={height - 6}>
          Hace 4 semanas
        </SvgText>
        <SvgText {...label} x={width - right} y={height - 6} textAnchor="end">
          Hoy
        </SvgText>
        <Path d={straight(weights)} stroke={colors.muted} strokeOpacity={0.3} strokeWidth={1} fill="none" />
        {weights.map((point, index) => (
          <Circle key={index} cx={point.x} cy={point.y} r={2.5} fill={colors.muted} opacity={0.65} />
        ))}
      </Svg>
      {/* La tendencia se dibuja al llegar, encima del ruido. */}
      <RevealX width={width} style={{ height }}>
        <Svg width={width} height={height}>
          <Defs>
            <LinearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={colors.violet} stopOpacity={0.28} />
              <Stop offset="1" stopColor={colors.violet} stopOpacity={0} />
            </LinearGradient>
          </Defs>
          <Path d={`${line} L${last.x} ${floor} L${trend[0].x} ${floor} Z`} fill="url(#trendFill)" />
          <Path d={line} stroke={colors.violet} strokeWidth={3} fill="none" strokeLinecap="round" />
          <Circle cx={last.x} cy={last.y} r={10} fill={colors.violet} opacity={0.22} />
          <Circle
            cx={last.x}
            cy={last.y}
            r={5}
            fill={colors.violet}
            stroke={colors.surface}
            strokeWidth={2}
          />
        </Svg>
      </RevealX>
    </View>
  );
}

/** La tendencia: los pesajes con su ruido y la línea suavizada, lo que de verdad cambia. */
function TrendPreview() {
  const { colors } = AppTheme;
  const [width, setWidth] = useState(0);
  return (
    <View style={{ gap: 10 }}>
      <View style={[AppTheme.card, { gap: 12 }]}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
          <View>
            <Text style={AppTheme.tileTitle}>Tendencia</Text>
            <Text style={AppTheme.tileSubtitle}>Peso suavizado · 4 semanas</Text>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={[AppTheme.tileValue, { fontSize: 26, lineHeight: 30 }]}>
              {TREND[TREND.length - 1].toFixed(1)} <Text style={AppTheme.tileUnit}>kg</Text>
            </Text>
            <Text style={[AppTheme.tileSubtitle, { color: colors.accentText }]}>
              −{Math.abs(WEEKLY).toFixed(1)} kg por semana
            </Text>
          </View>
        </View>
        <View
          accessible
          accessibilityLabel="Gráfico de ejemplo: los pesajes suben y bajan, la tendencia baja pareja"
          onLayout={(event) => setWidth(Math.round(event.nativeEvent.layout.width))}
          style={{ height: CHART.height }}
        >
          {width ? <TrendChart width={width} /> : null}
        </View>
        <View style={{ flexDirection: "row", gap: 16 }}>
          <View style={[AppTheme.legendRow, { gap: 6 }]}>
            <View style={[AppTheme.legendDot, { width: 7, height: 7, backgroundColor: colors.muted }]} />
            <Text style={AppTheme.hint}>Cada pesaje</Text>
          </View>
          <View style={[AppTheme.legendRow, { gap: 6 }]}>
            <View style={{ width: 16, height: 3, borderRadius: 2, backgroundColor: colors.violet }} />
            <Text style={AppTheme.hint}>Lo que de verdad cambia</Text>
          </View>
        </View>
      </View>
      <View style={[AppTheme.card, AppTheme.iconRow]}>
        <View style={[AppTheme.iconChip, { backgroundColor: colors.accentSoft }]}>
          <Ionicons name="sync-outline" size={18} color={colors.accentText} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={AppTheme.tileTitle}>Revisión cada 3 días</Text>
          <Text style={AppTheme.tileSubtitle}>Propone bajar 50 kcal. Tú decides.</Text>
        </View>
      </View>
    </View>
  );
}

const PRIVACY: Array<{ icon: keyof typeof Ionicons.glyphMap; title: string; detail: string }> = [
  { icon: "phone-portrait-outline", title: "Guardado en tu teléfono", detail: "Sin cuentas ni servidor" },
  { icon: "cloud-offline-outline", title: "Funciona sin conexión", detail: "Sin publicidad ni analítica" },
  { icon: "qr-code-outline", title: "Lo ves en la computadora", detail: "Con un código QR, solo lectura" },
];

/** Privacidad: dónde viven los datos. */
function PrivacyPreview() {
  const { colors } = AppTheme;
  return (
    <View style={[AppTheme.card, { gap: 0, paddingVertical: 6 }]}>
      {PRIVACY.map((item, index) => (
        <View
          key={item.title}
          style={[
            AppTheme.iconRow,
            { paddingVertical: 14 },
            index > 0 && { borderTopWidth: 1, borderTopColor: colors.border },
          ]}
        >
          <View style={[AppTheme.iconChip, { backgroundColor: colors.accentSoft }]}>
            <Ionicons name={item.icon} size={18} color={colors.accentText} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={AppTheme.tileTitle}>{item.title}</Text>
            <Text style={AppTheme.tileSubtitle}>{item.detail}</Text>
          </View>
          <Ionicons name="checkmark" size={18} color={colors.accent} />
        </View>
      ))}
    </View>
  );
}

/** El plan que sale de la evaluación. */
function PlanPreview() {
  const { colors } = AppTheme;
  return (
    <View style={[AppTheme.card, { gap: 14 }]}>
      <View>
        <Text style={AppTheme.hint}>Tu plan</Text>
        <Text style={[AppTheme.title, { fontSize: 26, lineHeight: 30 }]}>Definición</Text>
      </View>
      <View style={{ flexDirection: "row" }}>
        {[
          ["2300", "kcal"],
          ["150 g", "proteína"],
          ["−0.4", "kg/sem"],
        ].map(([value, label], index) => (
          <View
            key={label}
            style={[
              { flex: 1, gap: 2 },
              index > 0 && { borderLeftWidth: 1, borderLeftColor: colors.border, paddingLeft: 12 },
            ]}
          >
            <Text style={[AppTheme.metricValue, { fontSize: 18 }]}>{value}</Text>
            <Text style={AppTheme.tileSubtitle}>{label}</Text>
          </View>
        ))}
      </View>
      <View style={[AppTheme.progressTrack, { height: 8 }]}>
        <GrowBar
          fraction={0.27}
          style={{ height: "100%", borderRadius: 4, backgroundColor: colors.accent }}
        />
      </View>
      <Text style={AppTheme.hint}>80.0 → 74.0 kg · unas 15 semanas al ritmo del plan</Text>
    </View>
  );
}
