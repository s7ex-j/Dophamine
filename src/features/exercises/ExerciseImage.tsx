import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import { Image, View } from "react-native";

import { EXERCISE_IMAGES } from "@/src/features/exercises/images";
import { AppTheme } from "@/src/theme";

/**
 * Ilustración de un ejercicio (RepDB). Con `animate`, alterna la posición
 * inicial y la final para mostrar el movimiento. Sin imagen, un icono.
 */
export function ExerciseImage({
  media,
  size = 56,
  animate = false,
}: {
  media?: string | null;
  size?: number;
  animate?: boolean;
}) {
  const frames = media ? EXERCISE_IMAGES[media] : undefined;
  const [frame, setFrame] = useState(0);
  useEffect(() => {
    if (!animate || !frames || frames.length < 2) return;
    const timer = setInterval(() => setFrame((current) => (current + 1) % frames.length), 900);
    return () => clearInterval(timer);
  }, [animate, frames]);
  const box = {
    width: size,
    height: size,
    borderRadius: Math.min(14, size / 5),
    overflow: "hidden" as const,
    backgroundColor: AppTheme.colors.surface2,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  };
  if (!frames?.length)
    return (
      <View style={box}>
        <Ionicons name="barbell-outline" size={size * 0.45} color={AppTheme.colors.muted} />
      </View>
    );
  return (
    <View style={box}>
      <Image
        source={frames[frame % frames.length]}
        style={{ width: size, height: size }}
        resizeMode="cover"
        accessibilityIgnoresInvertColors
      />
    </View>
  );
}
