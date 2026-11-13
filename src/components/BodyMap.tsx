import { Text, View } from "react-native";
import Svg, { Ellipse, G, Path } from "react-native-svg";

import type { Muscle } from "@/src/features/exercises/catalog";
import { AppTheme } from "@/src/theme";

/**
 * Silueta de frente y de espalda (dibujo propio) con cada músculo pintado
 * según cuánto se entrenó: nivel 0 a 3. Se dibuja la mitad izquierda y se
 * refleja, así los dos lados quedan iguales.
 */
type Level = 0 | 1 | 2 | 3;

// Mitad izquierda de cada figura (ancho 120, el centro en x = 60).
const OUTLINE =
  "M60 33 L53 33 Q52 40 45 42 Q31 44 28 56 Q25 70 27 86 Q23 104 22 122 Q24 129 29 125 Q34 108 36 96 " +
  "L38 92 Q39 104 41 112 Q38 126 38 142 Q36 160 38 178 Q35 196 39 216 Q41 227 49 226 Q51 214 50 200 " +
  "Q53 180 53 166 Q56 148 58 132 L60 130 Z";

const FRONT: Partial<Record<Muscle, string[]>> = {
  upperBack: ["M53 36 Q50 42 45 44 L55 43 Q57 40 57 36 Z"],
  frontDelts: ["M45 46 Q35 45 32 54 Q32 61 35 64 Q40 57 46 54 Q48 50 45 46 Z"],
  sideDelts: ["M31 55 Q27 61 29 69 L34 66 Q31 61 31 55 Z"],
  chest: ["M59 49 L59 70 Q51 74 43 70 Q39 63 42 55 Q48 49 59 49 Z"],
  biceps: ["M34 69 Q29 78 30 89 Q33 93 36 90 Q40 80 39 71 Z"],
  forearms: ["M30 95 Q25 106 24 119 Q27 123 30 119 Q35 108 36 97 Z"],
  abs: [
    "M52 75 L59 75 L59 83 L52 83 Q51 79 52 75 Z",
    "M52 85 L59 85 L59 93 L52 93 Z",
    "M52 95 L59 95 L59 104 L52 104 Z",
    "M52 106 L59 106 L59 122 Q55 118 52 106 Z",
  ],
  obliques: ["M43 74 Q41 90 46 108 L50 104 L50 77 Q47 74 43 74 Z"],
  quads: ["M44 126 Q39 142 41 162 Q45 172 50 169 Q55 151 55 130 Q50 124 44 126 Z"],
  adductors: ["M57 128 Q57 143 53 156 Q58 150 59 132 Z"],
  calves: ["M42 182 Q38 196 42 214 Q46 217 48 213 Q50 196 48 182 Z"],
};

const BACK: Partial<Record<Muscle, string[]>> = {
  upperBack: ["M60 35 L52 37 Q48 41 45 45 Q47 53 53 60 L60 67 Z"],
  rearDelts: ["M44 46 Q35 46 31 56 Q34 62 40 60 Q44 55 46 50 Z"],
  triceps: ["M34 64 Q29 76 30 89 Q33 93 36 90 Q40 78 39 66 Z"],
  forearms: ["M30 95 Q25 106 24 119 Q27 123 30 119 Q35 108 36 97 Z"],
  lats: ["M46 61 Q41 71 42 88 Q48 96 55 98 L56 73 Q52 65 46 61 Z"],
  lowerBack: ["M54 93 Q56 104 60 108 L60 89 Q57 92 54 93 Z"],
  glutes: ["M60 111 Q48 108 44 118 Q42 132 52 136 Q58 134 60 128 Z"],
  hamstrings: ["M44 139 Q40 153 42 168 Q47 172 52 168 Q56 153 56 141 Q50 137 44 139 Z"],
  calves: ["M42 178 Q36 192 40 206 Q46 212 50 204 Q52 190 49 178 Z"],
};

const LEVEL_COLORS = ["#2A3530", "#1F5A44", "#22936A", "#34D399"];
const LEVEL_LABELS = ["Sin series", "1–4", "5–9", "10 o más"];

function Half({ shapes, levels }: { shapes: Partial<Record<Muscle, string[]>>; levels: Map<Muscle, Level> }) {
  return (
    <G>
      <Path d={OUTLINE} fill={AppTheme.colors.surface2} />
      {(Object.entries(shapes) as Array<[Muscle, string[]]>).flatMap(([muscle, paths]) =>
        paths.map((d, index) => (
          <Path
            key={`${muscle}-${index}`}
            d={d}
            fill={LEVEL_COLORS[levels.get(muscle) ?? 0]}
            stroke={AppTheme.colors.background}
            strokeWidth={0.8}
            strokeLinejoin="round"
          />
        )),
      )}
    </G>
  );
}

function Figure({
  shapes,
  levels,
}: {
  shapes: Partial<Record<Muscle, string[]>>;
  levels: Map<Muscle, Level>;
}) {
  return (
    <Svg viewBox="0 0 120 232" width="100%" height="100%">
      <Ellipse cx={60} cy={19} rx={12} ry={14} fill={AppTheme.colors.surface2} />
      <Half shapes={shapes} levels={levels} />
      <G transform="translate(120 0) scale(-1 1)">
        <Half shapes={shapes} levels={levels} />
      </G>
    </Svg>
  );
}

export function BodyMap({ loads }: { loads: Array<{ muscle: Muscle; level: Level }> }) {
  const levels = new Map(loads.map((item) => [item.muscle, item.level]));
  return (
    <View style={{ gap: 10 }}>
      <View style={{ flexDirection: "row", justifyContent: "center", gap: 12 }}>
        {(
          [
            ["Frente", FRONT],
            ["Espalda", BACK],
          ] as const
        ).map(([label, shapes]) => (
          <View key={label} style={{ alignItems: "center", gap: 4 }}>
            <View style={{ width: 132, height: 255 }}>
              <Figure shapes={shapes} levels={levels} />
            </View>
            <Text style={AppTheme.hint}>{label}</Text>
          </View>
        ))}
      </View>
      <View style={{ flexDirection: "row", justifyContent: "center", gap: 12, flexWrap: "wrap" }}>
        {LEVEL_LABELS.map((label, level) => (
          <View key={label} style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <View style={{ width: 12, height: 12, borderRadius: 3, backgroundColor: LEVEL_COLORS[level] }} />
            <Text style={AppTheme.hint}>{label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}
