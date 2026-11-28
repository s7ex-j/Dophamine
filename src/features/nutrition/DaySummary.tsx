import { useEffect, useRef, useState } from "react";
import { Pressable, ScrollView, View, type ScrollViewInstance } from "react-native";
import Svg, { Circle, G } from "react-native-svg";

import { CountUp, GrowBar, ProgressArc } from "@/src/components/motion";
import { Text } from "@/src/components/Text";
import type { Nutrients } from "@/src/features/nutrition/foods";
import { getSetting, setSetting } from "@/src/features/settings/settings.repository";
import { AppTheme } from "@/src/theme";

type Targets = { calories: number; protein: number; carbs: number; fats: number } | null;
export type Ring = { label: string; value: number; target?: number; color: string };

const VIEW_KEY = "day_view";
const VIEWS = ["Vista de anillos", "Vista de arco"];
// La tarjeta tiene 16 de margen a cada lado: cada página ocupa todo el ancho de la tarjeta.
const GAP = 32;

/** Lo que queda del día, en dos vistas que se deslizan: anillos o arco. Recuerda la última. */
export function DaySummary({ totals, targets }: { totals: Nutrients; targets: Targets }) {
  const { colors } = AppTheme;
  const [view, setView] = useState(0);
  const [width, setWidth] = useState(0);
  const scroller = useRef<ScrollViewInstance>(null);
  const saved = useRef(0);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    getSetting(VIEW_KEY).then((value) => {
      if (value === 1) {
        saved.current = 1;
        setView(1);
      }
      setReady(true);
    });
  }, []);
  // Al medir (o girar el teléfono) la vista elegida se coloca sin animación.
  useEffect(() => {
    if (width && ready) scroller.current?.scrollTo({ x: saved.current * (width + GAP), animated: false });
  }, [width, ready]);

  const choose = (next: number) => {
    if (next === saved.current) return;
    saved.current = next;
    setView(next);
    void setSetting(VIEW_KEY, next);
  };

  // La cifra del día: lo que queda (o lo que sobra) frente a la meta; sin meta, lo comido.
  const remaining = targets ? targets.calories - totals.kcal : 0;
  const over = remaining < 0;
  const figure = targets ? Math.abs(remaining) : totals.kcal;
  const figureLabel = !targets ? "Comiste" : over ? "Te pasaste por" : "Te quedan";
  const eaten = targets ? `${Math.round(totals.kcal)} de ${targets.calories} kcal` : null;
  const calories: Ring = {
    label: "Calorías",
    value: totals.kcal,
    target: targets?.calories,
    color: over ? colors.coral : colors.kcal,
  };
  const macros: Ring[] = [
    { label: "Proteína", value: totals.proteinG, target: targets?.protein, color: colors.protein },
    { label: "Carbos", value: totals.carbsG, target: targets?.carbs, color: colors.carbs },
    { label: "Grasas", value: totals.fatsG, target: targets?.fats, color: colors.fats },
  ];
  const figureStyle = [AppTheme.dayFigure, over && { color: colors.coral }];

  const rings = (
    <View style={{ gap: 16 }}>
      <View style={[AppTheme.iconRow, { gap: 16 }]}>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={AppTheme.hint}>{figureLabel}</Text>
          <View style={{ flexDirection: "row", alignItems: "baseline", gap: 6 }}>
            <CountUp value={figure} style={figureStyle} />
            <Text style={AppTheme.dayFigureUnit}>kcal</Text>
          </View>
          {eaten ? <Text style={AppTheme.hint}>{eaten}</Text> : null}
        </View>
        <Rings rings={[calories, ...macros]} />
      </View>
      <View style={{ gap: 8 }}>
        {macros.map((ring) => (
          <View key={ring.label} style={AppTheme.legendRow}>
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: ring.color }} />
            <Text style={[AppTheme.legendLabel, { flex: 1 }]}>{ring.label}</Text>
            <Grams ring={ring} />
          </View>
        ))}
      </View>
    </View>
  );
  const arc = (
    <View style={{ gap: 14 }}>
      <View style={{ alignItems: "center" }}>
        <Arc ring={calories} />
        <View style={{ position: "absolute", top: 46, left: 0, right: 0, alignItems: "center" }}>
          <Text style={AppTheme.hint}>{figureLabel}</Text>
          <CountUp value={figure} style={figureStyle} />
          {eaten ? <Text style={AppTheme.hint}>{eaten}</Text> : null}
        </View>
      </View>
      <View style={{ flexDirection: "row", gap: 14 }}>
        {macros.map((ring) => (
          <View key={ring.label} style={{ flex: 1, gap: 6 }}>
            <Grams ring={ring} />
            <View style={[AppTheme.progressTrack, { height: 6 }]}>
              <GrowBar
                fraction={ring.target ? Math.min(1, ring.value / ring.target) : 0}
                style={{ height: "100%", borderRadius: 3, backgroundColor: ring.color }}
              />
            </View>
            <Text style={AppTheme.tileSubtitle}>{ring.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );

  return (
    <View style={[AppTheme.card, { gap: 14, borderRadius: 22 }]}>
      <View onLayout={(event) => setWidth(Math.round(event.nativeEvent.layout.width))}>
        {width ? (
          <ScrollView
            ref={scroller}
            horizontal
            showsHorizontalScrollIndicator={false}
            pagingEnabled
            scrollEventThrottle={32}
            nestedScrollEnabled
            style={{ marginHorizontal: -16 }}
            onScroll={(event) => {
              const x = event.nativeEvent.contentOffset.x;
              const next = Math.round(x / (width + GAP));
              // Solo cuando ya está (casi) colocada, para no guardar a mitad del gesto.
              if (Math.abs(x - next * (width + GAP)) < 6) choose(Math.max(0, Math.min(1, next)));
            }}
          >
            {[rings, arc].map((page, index) => (
              <View
                key={VIEWS[index]}
                aria-hidden={index !== view}
                importantForAccessibility={index === view ? "auto" : "no-hide-descendants"}
                style={{ width: width + GAP, paddingHorizontal: GAP / 2, justifyContent: "center" }}
              >
                {page}
              </View>
            ))}
          </ScrollView>
        ) : (
          rings
        )}
      </View>
      {totals.alcoholG ? (
        <Text style={AppTheme.hint}>
          Alcohol: {totals.alcoholG} g ({Math.round(totals.alcoholG * 7)} kcal, fuera de los macros)
        </Text>
      ) : null}
      <View style={{ flexDirection: "row", justifyContent: "center" }}>
        {VIEWS.map((label, index) => (
          <Pressable
            key={label}
            accessibilityRole="button"
            accessibilityState={{ selected: index === view }}
            accessibilityLabel={label}
            hitSlop={{ top: 12, bottom: 12 }}
            onPress={() => {
              choose(index);
              scroller.current?.scrollTo({ x: index * (width + GAP), animated: true });
            }}
            style={{ paddingHorizontal: 12, paddingVertical: 8 }}
          >
            <View
              style={{
                width: index === view ? 18 : 7,
                height: 7,
                borderRadius: 4,
                backgroundColor: index === view ? colors.accent : colors.border,
              }}
            />
          </Pressable>
        ))}
      </View>
    </View>
  );
}

function Grams({ ring }: { ring: Ring }) {
  return (
    <Text style={AppTheme.legendValue} numberOfLines={1} adjustsFontSizeToFit>
      {Math.round(ring.value)}
      <Text style={AppTheme.macroTarget}>{ring.target ? ` / ${ring.target} g` : " g"}</Text>
    </Text>
  );
}

/** Un anillo dentro de otro: calorías afuera y los macros adentro. */
export function Rings({ rings }: { rings: Ring[] }) {
  const size = 112;
  return (
    <Svg
      width={size}
      height={size}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {rings.map((ring, index) => {
        const stroke = index === 0 ? 9 : 7;
        const radius = size / 2 - 5 - (index === 0 ? 0 : 11 + (index - 1) * 10);
        return (
          <G key={ring.label}>
            <Circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke={ring.color}
              strokeOpacity={0.18}
              strokeWidth={stroke}
              fill="none"
            />
            <ProgressArc
              cx={size / 2}
              cy={size / 2}
              radius={radius}
              progress={ring.target ? Math.min(1, ring.value / ring.target) : 0}
              delay={index * 90}
              stroke={ring.color}
              strokeWidth={stroke}
              fill="none"
              strokeLinecap="round"
              transform={`rotate(-90 ${size / 2} ${size / 2})`}
            />
          </G>
        );
      })}
    </Svg>
  );
}

/** Media vuelta que se llena de izquierda a derecha. */
function Arc({ ring }: { ring: Ring }) {
  const [width, radius, stroke] = [262, 118, 15];
  const center = width / 2;
  const turn = 2 * Math.PI * radius;
  const shared = {
    cx: center,
    cy: center,
    strokeWidth: stroke,
    fill: "none",
    strokeLinecap: "round",
  } as const;
  const rotate = `rotate(180 ${center} ${center})`;
  return (
    <Svg
      width={width}
      height={center + stroke / 2 + 2}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Circle
        {...shared}
        r={radius}
        stroke={ring.color}
        strokeOpacity={0.18}
        strokeDasharray={`${turn / 2} ${turn}`}
        transform={rotate}
      />
      <ProgressArc
        {...shared}
        radius={radius}
        stroke={ring.color}
        progress={(ring.target ? Math.min(1, ring.value / ring.target) : 0) / 2}
        transform={rotate}
      />
    </Svg>
  );
}
