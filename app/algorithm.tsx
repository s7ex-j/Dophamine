import { useCallback, useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { Text } from "@/src/components/Text";
import { useFocusEffect } from "expo-router";
import Svg, { Circle, G, Path, Text as SvgText } from "react-native-svg";

import { Screen } from "@/src/components/ui";
import { getDashboardSnapshot } from "@/src/features/dashboard/dashboard.repository";
import { algorithmGraph, LAYER_LABELS, type AlgorithmGraph, type GraphNode } from "@/src/features/tdee/graph";
import { localDateKey } from "@/src/lib/dates";
import { AppTheme } from "@/src/theme";

// "Cómo se calcula": el motor como una red. Arriba lo que registras, abajo la
// decisión; cada línea es un dato que alimenta a otro. Al tocar un nodo se ve
// qué es, su valor con tus números y su fórmula.
const ROW_GAP = 118;
const TOP = 34;
const RADIUS = 17;

export default function AlgorithmScreen() {
  const [graph, setGraph] = useState<AlgorithmGraph | null>(null);
  const [selected, setSelected] = useState("expenditure");
  const [width, setWidth] = useState(358);
  useFocusEffect(
    useCallback(() => {
      getDashboardSnapshot().then((snapshot) => setGraph(algorithmGraph(snapshot, localDateKey())));
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
                fontFamily="sans-serif"
                key={label}
                x={10}
                y={TOP + layer * ROW_GAP - RADIUS - 10}
                fill={AppTheme.colors.muted}
                fontSize={10}
                fontWeight="700"
              >
                {label.toUpperCase()}
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
          <View style={{ backgroundColor: AppTheme.colors.surface2, borderRadius: 8, padding: 8 }}>
            <Text style={[AppTheme.hint, { fontFamily: "monospace" }]}>{current.formula}</Text>
          </View>
        </View>
        <Text style={AppTheme.hint}>
          Todo es una estimación, no un diagnóstico. El cálculo corre en tu teléfono; nada se envía.
        </Text>
      </ScrollView>
    </Screen>
  );
}

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
        fontFamily="sans-serif"
        x={at.x}
        y={at.y + 3.5}
        textAnchor="middle"
        fill={AppTheme.colors.text}
        fontSize={9}
        fontWeight="700"
      >
        {node.value.length > 6 ? node.value.slice(0, 6) : node.value}
      </SvgText>
      <SvgText
        fontFamily="sans-serif"
        x={at.x}
        y={at.y + RADIUS + 13}
        textAnchor="middle"
        fill={color}
        fontSize={10}
        fontWeight="600"
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
