import { Text, View } from "react-native";
import Svg, { Ellipse, G, Path } from "react-native-svg";

import type { Muscle } from "@/src/features/exercises/catalog";
import { AppTheme } from "@/src/theme";

/**
 * Silueta de frente y de espalda, dibujada para Dophamine, con cada músculo
 * pintado según cuánto se entrenó (nivel 0 a 3).
 */
type Level = 0 | 1 | 2 | 3;
type Shape =
  | { kind: "ellipse"; cx: number; cy: number; rx: number; ry: number; rotate?: number }
  | { kind: "path"; d: string };

// Cada figura mide 100 × 210. Las formas van en pares (izquierda y derecha) cuando corresponde.
const pair = (cx: number, cy: number, rx: number, ry: number, rotate = 0): Shape[] => [
  { kind: "ellipse", cx, cy, rx, ry, rotate },
  { kind: "ellipse", cx: 100 - cx, cy, rx, ry, rotate: -rotate },
];

const FRONT: Partial<Record<Muscle, Shape[]>> = {
  sideDelts: pair(26, 47, 4.5, 7, 12),
  frontDelts: pair(32, 46, 6, 6.5),
  chest: [
    { kind: "path", d: "M 49 50 L 49 66 Q 42 69 35 64 Q 32 57 36 51 Q 42 48 49 50 Z" },
    { kind: "path", d: "M 51 50 L 51 66 Q 58 69 65 64 Q 68 57 64 51 Q 58 48 51 50 Z" },
  ],
  biceps: pair(25.5, 66, 4.6, 10, 8),
  forearms: pair(21.5, 90, 4.2, 12, 10),
  abs: [{ kind: "path", d: "M 43.5 69 Q 50 67 56.5 69 L 56 99 Q 50 103 44 99 Z" }],
  obliques: pair(38.5, 82, 4.5, 12),
  quads: pair(41, 128, 7.5, 21, -4),
  adductors: pair(47.2, 120, 2.6, 11, -6),
  calves: pair(40.5, 170, 4.5, 13),
};

const BACK: Partial<Record<Muscle, Shape[]>> = {
  upperBack: [{ kind: "path", d: "M 50 38 L 62 46 L 57 62 L 50 70 L 43 62 L 38 46 Z" }],
  rearDelts: pair(29, 47, 6, 6.5),
  lats: [
    { kind: "path", d: "M 42 56 L 36 52 Q 33 64 37 78 L 46 86 L 46 70 Z" },
    { kind: "path", d: "M 58 56 L 64 52 Q 67 64 63 78 L 54 86 L 54 70 Z" },
  ],
  lowerBack: [{ kind: "path", d: "M 45 80 L 55 80 L 56 98 L 44 98 Z" }],
  triceps: pair(25.5, 66, 4.6, 10, 8),
  forearms: pair(21.5, 90, 4.2, 12, 10),
  glutes: pair(43, 108, 8, 8.5),
  hamstrings: pair(41.5, 135, 6.8, 17, -3),
  calves: pair(40.5, 168, 5.6, 13),
};

// Contorno del cuerpo: cabeza, torso, brazos y piernas.
const OUTLINE = [
  "M 50 6 a 10 11 0 1 0 0.01 0 Z",
  "M 45 26 L 55 26 L 56 34 L 44 34 Z",
  "M 30 38 Q 50 32 70 38 Q 76 42 75 52 L 68 70 L 66 100 Q 50 108 34 100 L 32 70 L 25 52 Q 24 42 30 38 Z",
  "M 25 52 Q 18 70 19 84 L 17 104 Q 20 108 24 104 L 28 86 Q 32 70 31 58 Z",
  "M 75 52 Q 82 70 81 84 L 83 104 Q 80 108 76 104 L 72 86 Q 68 70 69 58 Z",
  "M 34 100 Q 31 130 35 150 L 34 186 Q 39 192 45 186 L 47 150 Q 50 128 50 106 Z",
  "M 66 100 Q 69 130 65 150 L 66 186 Q 61 192 55 186 L 53 150 Q 50 128 50 106 Z",
];

function color(level: Level) {
  return [AppTheme.colors.surface2, "#1F5A44", "#22936A", AppTheme.colors.accent][level];
}

function Figure({
  shapes,
  levels,
}: {
  shapes: Partial<Record<Muscle, Shape[]>>;
  levels: Map<Muscle, Level>;
}) {
  return (
    <Svg viewBox="0 0 100 200" width="100%" height="100%">
      <G>
        {OUTLINE.map((d) => (
          <Path
            key={d}
            d={d}
            fill={AppTheme.colors.surface}
            stroke={AppTheme.colors.border}
            strokeWidth={1}
          />
        ))}
      </G>
      {(Object.entries(shapes) as Array<[Muscle, Shape[]]>).flatMap(([muscle, list]) =>
        list.map((shape, index) =>
          shape.kind === "ellipse" ? (
            <Ellipse
              key={`${muscle}-${index}`}
              cx={shape.cx}
              cy={shape.cy}
              rx={shape.rx}
              ry={shape.ry}
              transform={shape.rotate ? `rotate(${shape.rotate} ${shape.cx} ${shape.cy})` : undefined}
              fill={color(levels.get(muscle) ?? 0)}
            />
          ) : (
            <Path key={`${muscle}-${index}`} d={shape.d} fill={color(levels.get(muscle) ?? 0)} />
          ),
        ),
      )}
    </Svg>
  );
}

export function BodyMap({ loads }: { loads: Array<{ muscle: Muscle; level: Level }> }) {
  const levels = new Map(loads.map((item) => [item.muscle, item.level]));
  return (
    <View style={{ gap: 10 }}>
      <View style={{ flexDirection: "row", justifyContent: "center", gap: 18 }}>
        {[
          ["Frente", FRONT],
          ["Espalda", BACK],
        ].map(([label, shapes]) => (
          <View key={label as string} style={{ alignItems: "center", gap: 4 }}>
            <View style={{ width: 120, height: 240 }}>
              <Figure shapes={shapes as Partial<Record<Muscle, Shape[]>>} levels={levels} />
            </View>
            <Text style={AppTheme.hint}>{label as string}</Text>
          </View>
        ))}
      </View>
      <View style={{ flexDirection: "row", justifyContent: "center", gap: 12, flexWrap: "wrap" }}>
        {(["Sin series", "1–4", "5–9", "10 o más"] as const).map((label, level) => (
          <View key={label} style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <View
              style={{ width: 12, height: 12, borderRadius: 3, backgroundColor: color(level as Level) }}
            />
            <Text style={AppTheme.hint}>{label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}
