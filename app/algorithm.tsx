import { useCallback, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { Pressable, ScrollView, View } from "react-native";
import { Text } from "@/src/components/Text";
import { useFocusEffect } from "expo-router";
import Svg, { Circle, G, Path, Text as SvgText } from "react-native-svg";

import { Card, Screen } from "@/src/components/ui";
import { getDashboardSnapshot, getForecastAccuracy } from "@/src/features/dashboard/dashboard.repository";
import {
  energyBalance,
  explainAlgorithm,
  LIMITS,
  type AlgorithmStep,
  type EnergyBalance,
} from "@/src/features/tdee/explain";
import { accuracyText, HORIZON_DAYS, type ForecastAccuracy } from "@/src/features/tdee/accuracy";
import { algorithmGraph, LAYER_LABELS, type AlgorithmGraph, type GraphNode } from "@/src/features/tdee/graph";
import { weightUnitOf } from "@/src/features/profile/profile";
import { formatWeight, type WeightUnit } from "@/src/lib/units";
import { localDateKey, longDate } from "@/src/lib/dates";
import { AppTheme } from "@/src/theme";
import { FONTS } from "@/src/theming/fonts";

// "Cómo se calcula": primero la cuenta central con tus números, luego cada paso, después el motor como
// una red (al tocar un nodo se ve qué es y su fórmula) y al final lo que el cálculo no puede saber.
const ROW_GAP = 118;
const TOP = 34;
const RADIUS = 17;

export default function AlgorithmScreen() {
  const [graph, setGraph] = useState<AlgorithmGraph | null>(null);
  const [steps, setSteps] = useState<AlgorithmStep[]>([]);
  const [accuracy, setAccuracy] = useState<ForecastAccuracy | null>(null);
  const [unit, setUnit] = useState<WeightUnit>("kg");
  const [balance, setBalance] = useState<EnergyBalance | null>(null);
  const [selected, setSelected] = useState("expenditure");
  const [width, setWidth] = useState(358);
  useFocusEffect(
    useCallback(() => {
      let active = true;
      getDashboardSnapshot().then((snapshot) => {
        if (!active) return;
        const today = localDateKey();
        setGraph(algorithmGraph(snapshot, today));
        setSteps(explainAlgorithm(snapshot, today));
        setBalance(energyBalance(snapshot));
        setUnit(weightUnitOf(snapshot.profile));
        // Después de dibujar lo demás: corre el motor varias veces.
        setTimeout(
          () =>
            getForecastAccuracy(() => active)
              .then((value) => active && setAccuracy(value))
              .catch(() => undefined),
          50,
        );
      });
      return () => {
        active = false;
      };
    }, []),
  );
  if (!graph) return <Screen />;

  const position = new Map<string, { x: number; y: number }>();
  for (const layer of [0, 1, 2, 3]) {
    const row = graph.nodes.filter((node) => node.layer === layer);
    row.forEach((node, index) =>
      position.set(node.id, { x: ((index + 0.5) * width) / row.length, y: TOP + layer * ROW_GAP }),
    );
  }
  const height = TOP + 3 * ROW_GAP + 46;
  const current = graph.nodes.find((node) => node.id === selected) ?? graph.nodes[0];
  const linked = new Set(
    graph.edges
      .filter((edge) => edge.from === selected || edge.to === selected)
      .flatMap((edge) => [edge.from, edge.to]),
  );

  return (
    <Screen>
      <ScrollView contentContainerStyle={AppTheme.content}>
        <BalanceCard balance={balance} />

        <Text style={AppTheme.sectionTitle}>Paso a paso</Text>
        <View style={[AppTheme.card, { gap: 0 }]}>
          {steps.map((step, index) => (
            <StepRow key={step.id} step={step} number={index + 1} last={index === steps.length - 1} />
          ))}
        </View>

        <AccuracyCard accuracy={accuracy} unit={unit} />

        <Text style={AppTheme.sectionTitle}>El mapa completo</Text>
        <Text style={AppTheme.body}>
          Cada círculo es un dato o una estimación; cada línea, de dónde sale. Toca uno para ver su valor y su
          fórmula. Los apagados aún no tienen datos suficientes.
        </Text>
        <View
          onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
          style={[AppTheme.card, { padding: 0, paddingVertical: 8 }]}
        >
          <Svg width={width} height={height}>
            {LAYER_LABELS.map((label, layer) => (
              <SvgText
                fontFamily={FONTS.text600}
                key={label}
                x={10}
                y={TOP + layer * ROW_GAP - RADIUS - 10}
                fill={AppTheme.colors.muted}
                fontSize={11}
              >
                {label}
              </SvgText>
            ))}
            {graph.edges.map((edge) => {
              const from = position.get(edge.from);
              const to = position.get(edge.to);
              if (!from || !to) return null;
              const focus = edge.from === selected || edge.to === selected;
              const middle = (from.y + to.y) / 2;
              return (
                <Path
                  key={`${edge.from}-${edge.to}`}
                  d={`M${from.x} ${from.y + RADIUS} C${from.x} ${middle} ${to.x} ${middle} ${to.x} ${to.y - RADIUS}`}
                  stroke={focus ? AppTheme.colors.accent : AppTheme.colors.text}
                  strokeOpacity={focus ? 0.9 : 0.08 + 0.22 * edge.strength}
                  strokeWidth={focus ? 2 : 0.6 + 1.6 * edge.strength}
                  fill="none"
                />
              );
            })}
            {graph.nodes.map((node) => (
              <GraphDot
                key={node.id}
                node={node}
                at={position.get(node.id) as { x: number; y: number }}
                selected={node.id === selected}
                dimmed={!linked.has(node.id) && node.id !== selected}
                onPress={() => setSelected(node.id)}
              />
            ))}
          </Svg>
        </View>

        <View style={[AppTheme.card, { gap: 6 }]}>
          <Text style={AppTheme.eyebrow}>{LAYER_LABELS[current.layer]}</Text>
          <View style={AppTheme.sectionHeader}>
            <Text style={AppTheme.cardTitle}>{current.label}</Text>
            <Text style={[AppTheme.tileValue, !current.active && { color: AppTheme.colors.muted }]}>
              {current.value}
            </Text>
          </View>
          <Text style={AppTheme.body}>{current.detail}</Text>
          <Formula text={current.formula} />
        </View>
        <Text style={AppTheme.sectionTitle}>Lo que no puede saber</Text>
        <View style={[AppTheme.card, { gap: 10 }]}>
          {LIMITS.map((limit) => (
            <Text key={limit} style={AppTheme.body}>
              {limit}
            </Text>
          ))}
        </View>
        <Text style={AppTheme.hint}>
          Todo es una estimación, no un diagnóstico. El cálculo corre en tu teléfono; nada se envía.
        </Text>
      </ScrollView>
    </Screen>
  );
}

/** La cuenta de la que sale todo: comida, cambio de peso y gasto. */
function BalanceCard({ balance }: { balance: EnergyBalance | null }) {
  if (!balance)
    return (
      <Card title="La cuenta">
        <Text style={AppTheme.body}>
          Tu gasto sale de comparar lo que comes con lo que cambia tu peso. Aparece con 14 pesajes en dos
          semanas y 10 días de comida completos; hasta entonces uso el gasto inicial de tu evaluación.
        </Text>
      </Card>
    );
  const rate = Math.abs(balance.weeklyRateKg).toFixed(2);
  const { fromWeight } = balance;
  return (
    <Card title="La cuenta">
      <BalanceLine label={`Comes${balance.engine ? ", en 14 días" : ""}`} value={`${balance.intake}`} />
      <BalanceLine
        label={`Tu peso ${balance.weeklyRateKg < 0 ? "baja" : "sube"} ${rate} kg por semana, a ${balance.energyPerKg} kcal/kg`}
        value={`${fromWeight > 0 ? "−" : "+"} ${Math.abs(fromWeight)}`}
      />
      <View style={{ borderTopWidth: 1, borderTopColor: AppTheme.colors.border, paddingTop: 8 }}>
        <BalanceLine label="Gastas, al día" value={`${balance.tdee} ± ${balance.margin}`} strong />
      </View>
      <Text style={AppTheme.hint}>
        {fromWeight < -20
          ? "Como bajas de peso, tu cuerpo puso la diferencia: gastas más de lo que comes."
          : fromWeight > 20
            ? "Como subes de peso, guardaste la diferencia: gastas menos de lo que comes."
            : "Tu peso casi no cambia: gastas más o menos lo que comes."}
        {balance.engine
          ? " El motor no hace solo esta resta: usa todos tus días y separa el agua, así que su gasto puede no cuadrar exacto."
          : ""}
      </Text>
    </Card>
  );
}

/** Lo que el motor esperaba hace dos semanas frente a lo que pasó. */
function AccuracyCard({ accuracy, unit }: { accuracy: ForecastAccuracy | null; unit: WeightUnit }) {
  if (!accuracy)
    return (
      <Card title="Cuánto acierta">
        <Text style={AppTheme.body}>
          Cuando el motor lleve {HORIZON_DAYS} días activo, aquí verás el peso que esperaba frente al que
          marcó tu báscula.
        </Text>
      </Card>
    );
  const kg = (value: number, decimals = 1) => formatWeight(value, unit, decimals);
  return (
    <Card title="Cuánto acierta">
      <View style={[AppTheme.sectionHeader, { gap: 12 }]}>
        <Text style={[AppTheme.body, { flex: 1 }]}>Error medio a {HORIZON_DAYS} días</Text>
        <Text style={AppTheme.tileValue}>{kg(accuracy.meanErrorKg, 2)}</Text>
      </View>
      <View style={[AppTheme.sectionHeader, { gap: 12 }]}>
        <Text style={[AppTheme.body, { flex: 1 }]}>Si supusiera que tu peso no cambia</Text>
        <Text style={AppTheme.cardTitle}>{kg(accuracy.stillMeanErrorKg, 2)}</Text>
      </View>
      <Text style={AppTheme.body}>{accuracyText(accuracy)}</Text>
      <View style={{ borderTopWidth: 1, borderTopColor: AppTheme.colors.border, paddingTop: 8, gap: 8 }}>
        {accuracy.checks.map((check) => (
          <View key={check.from} style={[AppTheme.sectionHeader, { gap: 12 }]}>
            <View style={{ flex: 1 }}>
              <Text style={AppTheme.listTitle}>{longDate(check.to)}</Text>
              <Text style={AppTheme.hint}>
                Esperaba {kg(check.predictedKg)} ± {kg(check.marginKg)}
              </Text>
            </View>
            <Text style={[AppTheme.cardTitle, !check.inside && { color: AppTheme.colors.warning }]}>
              {kg(check.actualKg)}
            </Text>
          </View>
        ))}
      </View>
      <Text style={AppTheme.hint}>
        Cada fila usa solo lo que se sabía {HORIZON_DAYS} días antes, y lo que comiste después: mide al
        cálculo, no a ti. Compara con el promedio de tus últimos pesajes, que también llevan agua.
      </Text>
    </Card>
  );
}

function BalanceLine({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <View style={[AppTheme.sectionHeader, { gap: 12 }]}>
      <Text style={[strong ? AppTheme.cardTitle : AppTheme.body, { flex: 1 }]}>{label}</Text>
      <Text style={strong ? AppTheme.tileValue : AppTheme.cardTitle}>{value}</Text>
    </View>
  );
}

/** Un paso: título y resultado; al tocarlo, qué significa y su fórmula. */
function StepRow({ step, number, last }: { step: AlgorithmStep; number: number; last: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <View style={last ? null : { borderBottomWidth: 1, borderBottomColor: AppTheme.colors.border }}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        onPress={() => setOpen(!open)}
        style={[AppTheme.sectionHeader, { minHeight: 56, gap: 10 }]}
      >
        <Text style={[AppTheme.hint, { width: 14 }]}>{number}</Text>
        <View style={{ flex: 1 }}>
          <Text style={AppTheme.listTitle}>{step.title}</Text>
          <Text style={[AppTheme.hint, !step.pending && { color: AppTheme.colors.accent }]}>
            {step.value}
          </Text>
        </View>
        <Ionicons name={open ? "chevron-up" : "chevron-down"} size={16} color={AppTheme.colors.muted} />
      </Pressable>
      {open ? (
        <View style={{ gap: 8, paddingBottom: 14, paddingLeft: 24 }}>
          <Text style={AppTheme.body}>{step.detail}</Text>
          <Formula text={step.formula} />
        </View>
      ) : null}
    </View>
  );
}

const Formula = ({ text }: { text: string }) => (
  <View style={{ backgroundColor: AppTheme.colors.surface2, borderRadius: 8, padding: 8 }}>
    <Text style={[AppTheme.hint, { fontFamily: "monospace" }]}>{text}</Text>
  </View>
);

function GraphDot({
  node,
  at,
  selected,
  dimmed,
  onPress,
}: {
  node: GraphNode;
  at: { x: number; y: number };
  selected: boolean;
  dimmed: boolean;
  onPress: () => void;
}) {
  const color = node.active ? AppTheme.colors.accent : AppTheme.colors.muted;
  return (
    <G onPress={onPress} opacity={dimmed ? 0.55 : 1}>
      {selected ? (
        <Circle cx={at.x} cy={at.y} r={RADIUS + 5} fill={AppTheme.colors.accent} fillOpacity={0.15} />
      ) : null}
      <Circle
        cx={at.x}
        cy={at.y}
        r={RADIUS}
        fill={AppTheme.colors.background}
        stroke={color}
        strokeWidth={selected ? 2.5 : 1.5}
      />
      <SvgText
        fontFamily={FONTS.text700}
        x={at.x}
        y={at.y + 3.5}
        textAnchor="middle"
        fill={AppTheme.colors.text}
        fontSize={9}
      >
        {node.value.length > 6 ? node.value.slice(0, 6) : node.value}
      </SvgText>
      <SvgText
        fontFamily={FONTS.text600}
        x={at.x}
        y={at.y + RADIUS + 13}
        textAnchor="middle"
        fill={color}
        fontSize={10}
      >
        {node.label}
      </SvgText>
      {/* Zona de toque más grande que el círculo. */}
      <Circle
        cx={at.x}
        cy={at.y + 6}
        r={RADIUS + 12}
        fill="transparent"
        accessibilityLabel={`${node.label}: ${node.value}`}
        onPress={onPress}
      />
    </G>
  );
}
