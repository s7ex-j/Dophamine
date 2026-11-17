import { Text, View } from "react-native";
import Body, { type ExtendedBodyPart, type Slug } from "react-native-body-highlighter";

import type { Muscle } from "@/src/features/exercises/catalog";
import { AppTheme } from "@/src/theme";

/**
 * Cuerpo de frente y de espalda con cada músculo pintado según cuántas series
 * tuvo en la semana (nivel 0 a 3). El dibujo viene de react-native-body-highlighter
 * (MIT, ver NOTICE.md); aquí solo se decide qué color lleva cada zona.
 */
type Level = 0 | 1 | 2 | 3;

// Cada músculo de la app en la zona del dibujo que le corresponde.
const SLUGS: Record<Muscle, Slug> = {
  chest: "chest",
  frontDelts: "deltoids",
  sideDelts: "deltoids",
  rearDelts: "deltoids",
  biceps: "biceps",
  triceps: "triceps",
  forearms: "forearm",
  abs: "abs",
  obliques: "obliques",
  upperBack: "trapezius",
  lats: "upper-back",
  lowerBack: "lower-back",
  glutes: "gluteal",
  quads: "quadriceps",
  hamstrings: "hamstring",
  adductors: "adductors",
  calves: "calves",
};

const LEVEL_COLORS = ["#2A3530", "#1F5A44", "#22936A", "#34D399"];
const LEVEL_LABELS = ["Sin series", "1–4", "5–9", "10 o más"];

/** Una zona del dibujo puede juntar varios músculos (los tres deltoides): manda el nivel más alto. */
export function bodyParts(loads: Array<{ muscle: Muscle; level: Level }>): ExtendedBodyPart[] {
  const levels = new Map<Slug, Level>();
  for (const { muscle, level } of loads) {
    const slug = SLUGS[muscle];
    if (slug && level > (levels.get(slug) ?? 0)) levels.set(slug, level);
  }
  // Cabeza y pelo en el mismo tono neutro que el resto: el dibujo los trae en otro color.
  const neutral: ExtendedBodyPart[] = (["head", "hair", "hands", "feet"] as Slug[]).map((slug) => ({
    slug,
    color: LEVEL_COLORS[0],
  }));
  return [...neutral, ...[...levels].map(([slug, level]) => ({ slug, color: LEVEL_COLORS[level] }))];
}

export function BodyMap({
  loads,
  gender = "male",
}: {
  loads: Array<{ muscle: Muscle; level: Level }>;
  gender?: "male" | "female";
}) {
  const data = bodyParts(loads);
  return (
    <View style={{ gap: 8 }}>
      <View style={{ flexDirection: "row", justifyContent: "center" }}>
        {(["front", "back"] as const).map((side) => (
          <View key={side} style={{ alignItems: "center" }}>
            <Body
              data={data}
              side={side}
              gender={gender}
              scale={0.78}
              border={AppTheme.colors.background}
              defaultFill={LEVEL_COLORS[0]}
            />
            <Text style={AppTheme.hint}>{side === "front" ? "Frente" : "Espalda"}</Text>
          </View>
        ))}
      </View>
      <View style={{ flexDirection: "row", justifyContent: "center", gap: 12, flexWrap: "wrap" }}>
        {LEVEL_LABELS.map((label, level) => (
          <View key={label} style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <View style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: LEVEL_COLORS[level] }} />
            <Text style={AppTheme.hint}>{label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}
