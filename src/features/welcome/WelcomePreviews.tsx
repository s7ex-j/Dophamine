import { Ionicons } from "@expo/vector-icons";
import { View } from "react-native";
import Svg, { Circle, Path } from "react-native-svg";

import { Text } from "@/src/components/Text";
import { GrowBar } from "@/src/components/motion";
import { AppTheme } from "@/src/theme";

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

// Pesajes de ejemplo: suben y bajan día a día; la tendencia baja tranquila.
const WEIGHTS = [79.4, 79.9, 79.1, 79.6, 78.9, 79.3, 78.6, 79.0, 78.4, 78.8, 78.2, 78.5];

/** La tendencia: los pesajes con su ruido y la línea suavizada que usa el cálculo. */
function TrendPreview() {
  const { colors } = AppTheme;
  const width = 300;
  const height = 120;
  const min = 77.8;
  const max = 80.2;
  const x = (index: number) => 10 + (index * (width - 20)) / (WEIGHTS.length - 1);
  const y = (value: number) => 8 + ((max - value) / (max - min)) * (height - 16);
  const trend = WEIGHTS.map((_, index) => 79.5 - index * 0.11);
  const line = trend.map((value, index) => `${index ? "L" : "M"}${x(index)} ${y(value)}`).join(" ");
  return (
    <View style={{ gap: 10 }}>
      <View style={[AppTheme.card, { gap: 10 }]}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end" }}>
          <View>
            <Text style={AppTheme.tileTitle}>Tendencia</Text>
            <Text style={AppTheme.tileSubtitle}>Peso suavizado · 12 días</Text>
          </View>
          <Text style={[AppTheme.tileValue, { fontSize: 22 }]}>
            78.4 <Text style={AppTheme.tileUnit}>kg</Text>
          </Text>
        </View>
        <Svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
          {WEIGHTS.map((value, index) => (
            <Circle key={index} cx={x(index)} cy={y(value)} r={3.5} fill={colors.muted} opacity={0.6} />
          ))}
          <Path d={line} stroke={colors.violet} strokeWidth={3} fill="none" strokeLinecap="round" />
        </Svg>
        <Text style={AppTheme.hint}>
          Los puntos son tus pesajes; la línea, tu peso real: −0.4 kg por semana.
        </Text>
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
