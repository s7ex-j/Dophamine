import { useEffect, useMemo } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
} from "react-native-reanimated";

import { AppTheme } from "@/src/theme";

const PIECES = 18;
const DURATION = 1300;

/**
 * Celebración corta para logros de verdad (un récord, un reto completo): unos
 * papelitos que saltan desde el centro y caen, una sola vez. No tapa ni bloquea
 * nada y no aparece si el teléfono pide reducir el movimiento.
 */
export function Celebrate() {
  const reduceMotion = useReducedMotion();
  const pieces = useMemo(() => {
    const { colors } = AppTheme;
    const palette = [colors.accent, colors.kcal, colors.protein, colors.carbs, colors.fats, colors.amber];
    return Array.from({ length: PIECES }, (_, index) => {
      const angle = (index / PIECES) * Math.PI * 2 + (index % 3) * 0.2;
      const reach = 70 + ((index * 37) % 60);
      return {
        dx: Math.cos(angle) * reach,
        dy: Math.sin(angle) * reach * 0.7 - 40,
        spin: ((index * 53) % 360) - 180,
        color: palette[index % palette.length],
        delay: (index % 4) * 40,
        size: 6 + (index % 3) * 2,
      };
    });
  }, []);
  if (reduceMotion) return null;
  return (
    <View
      pointerEvents="none"
      style={[StyleSheet.absoluteFill, { alignItems: "center", justifyContent: "center" }]}
    >
      {pieces.map((piece, index) => (
        <Piece key={index} {...piece} />
      ))}
    </View>
  );
}

function Piece({
  dx,
  dy,
  spin,
  color,
  delay,
  size,
}: {
  dx: number;
  dy: number;
  spin: number;
  color: string;
  delay: number;
  size: number;
}) {
  const t = useSharedValue(0);
  useEffect(() => {
    t.value = withDelay(delay, withTiming(1, { duration: DURATION, easing: Easing.out(Easing.quad) }));
  }, [delay, t]);
  const style = useAnimatedStyle(() => {
    // Sale hacia afuera y la gravedad la baja en la segunda mitad.
    const fall = t.value * t.value * 120;
    return {
      opacity: t.value < 0.75 ? 1 : 1 - (t.value - 0.75) / 0.25,
      transform: [
        { translateX: dx * t.value },
        { translateY: dy * t.value + fall },
        { rotate: `${spin * t.value}deg` },
      ],
    };
  });
  return (
    <Animated.View
      style={[
        { position: "absolute", width: size, height: size * 1.6, borderRadius: 2, backgroundColor: color },
        style,
      ]}
    />
  );
}
