import Svg, { Circle, Ellipse, G, Path } from "react-native-svg";

import type { PetMood } from "@/src/features/streak/streak";
import { AppTheme } from "@/src/theme";

/**
 * Dopi, la mascota de Dophamine (dibujo propio). Nivel 0 es un huevo; desde el
 * 1 es una gotita que crece y gana detalles: brote, bracitos, banda, capa y corona.
 */
export function Dopi({ level, mood, size = 120 }: { level: number; mood: PetMood; size?: number }) {
  const green = AppTheme.colors.accent;
  const dark = AppTheme.colors.onAccent;
  if (level === 0)
    return (
      <Svg width={size} height={size} viewBox="0 0 100 100">
        <Ellipse cx={50} cy={92} rx={22} ry={4} fill={AppTheme.colors.surface2} />
        <Path
          d="M 50 14 C 70 14 78 48 76 64 C 74 82 62 90 50 90 C 38 90 26 82 24 64 C 22 48 30 14 50 14 Z"
          fill="#E8F5EE"
        />
        <Circle cx={40} cy={44} r={4} fill={green} opacity={0.7} />
        <Circle cx={60} cy={60} r={5} fill={green} opacity={0.7} />
        <Circle cx={46} cy={72} r={3} fill={green} opacity={0.7} />
        <Path
          d="M 34 52 L 40 48 L 46 54 L 52 48 L 58 53 L 64 49"
          stroke="#9BB5A6"
          strokeWidth={2}
          fill="none"
        />
      </Svg>
    );
  // Crece con el nivel: 0.62 en el 1, 1 en el 6.
  const scale = 0.62 + (Math.min(level, 6) - 1) * 0.076;
  const eyesY = 52;
  const eye =
    mood === "sad" ? (
      <G>
        <Path d={`M 38 ${eyesY} Q 42 ${eyesY - 3} 46 ${eyesY}`} stroke={dark} strokeWidth={2.5} fill="none" />
        <Path d={`M 54 ${eyesY} Q 58 ${eyesY - 3} 62 ${eyesY}`} stroke={dark} strokeWidth={2.5} fill="none" />
      </G>
    ) : (
      <G>
        <Ellipse cx={42} cy={eyesY} rx={3.6} ry={mood === "happy" ? 4.4 : 3.6} fill={dark} />
        <Ellipse cx={58} cy={eyesY} rx={3.6} ry={mood === "happy" ? 4.4 : 3.6} fill={dark} />
        <Circle cx={43.2} cy={eyesY - 1.6} r={1.2} fill="#FFFFFF" />
        <Circle cx={59.2} cy={eyesY - 1.6} r={1.2} fill="#FFFFFF" />
      </G>
    );
  const mouth =
    mood === "happy" ? "M 43 61 Q 50 68 57 61" : mood === "sad" ? "M 44 65 Q 50 60 56 65" : "M 45 63 L 55 63";
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Ellipse cx={50} cy={93} rx={26 * scale} ry={4} fill={AppTheme.colors.surface2} />
      <G transform={`translate(${50 - 50 * scale} ${96 - 96 * scale}) scale(${scale})`}>
        {level >= 5 ? (
          <Path
            d="M 22 50 Q 12 80 20 92 L 80 92 Q 88 80 78 50 Z"
            fill={AppTheme.colors.violet}
            opacity={0.85}
          />
        ) : null}
        {level >= 3 ? (
          <G>
            <Path
              d="M 22 62 Q 12 58 10 48"
              stroke={green}
              strokeWidth={6}
              strokeLinecap="round"
              fill="none"
            />
            <Path
              d="M 78 62 Q 88 58 90 48"
              stroke={green}
              strokeWidth={6}
              strokeLinecap="round"
              fill="none"
            />
          </G>
        ) : null}
        <Path
          d="M 50 18 C 74 18 84 46 84 64 C 84 82 70 94 50 94 C 30 94 16 82 16 64 C 16 46 26 18 50 18 Z"
          fill={green}
        />
        <Ellipse cx={38} cy={40} rx={8} ry={5} fill="#FFFFFF" opacity={0.25} />
        {level >= 2 && level < 6 ? (
          <G>
            <Path d="M 50 18 Q 50 8 50 6" stroke="#22936A" strokeWidth={3} fill="none" />
            <Path d="M 50 8 Q 60 2 64 8 Q 58 14 50 10 Z" fill="#6EE7B7" />
          </G>
        ) : null}
        {level >= 4 && level < 6 ? (
          <Path d="M 22 38 Q 50 30 78 38 L 77 44 Q 50 36 23 44 Z" fill={AppTheme.colors.coral} />
        ) : null}
        {level >= 6 ? (
          <Path d="M 34 20 L 38 6 L 44 16 L 50 2 L 56 16 L 62 6 L 66 20 Z" fill={AppTheme.colors.amber} />
        ) : null}
        {eye}
        <Path d={mouth} stroke={dark} strokeWidth={2.5} strokeLinecap="round" fill="none" />
        {mood === "happy" ? (
          <G>
            <Circle cx={34} cy={60} r={4} fill="#F87171" opacity={0.35} />
            <Circle cx={66} cy={60} r={4} fill="#F87171" opacity={0.35} />
          </G>
        ) : null}
        {mood === "sad" ? (
          <Path d="M 63 56 Q 65 61 63 63 Q 61 61 63 56 Z" fill={AppTheme.colors.blue} />
        ) : null}
      </G>
    </Svg>
  );
}
