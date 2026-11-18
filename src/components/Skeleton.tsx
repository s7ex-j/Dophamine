import { useEffect } from "react";
import { View, type DimensionValue } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";

import { Screen } from "@/src/components/ui";
import { AppTheme } from "@/src/theme";

/**
 * Esqueleto de carga: bloques con la forma de lo que viene, que laten suave
 * mientras se leen los datos. Así la pantalla no aparece vacía y no salta al cargar.
 */
export function ScreenSkeleton({ blocks = [56, 180, 120, 120] }: { blocks?: number[] }) {
  const reduceMotion = useReducedMotion();
  const pulse = useSharedValue(0.55);
  useEffect(() => {
    if (!reduceMotion)
      pulse.value = withRepeat(withTiming(1, { duration: 800, easing: Easing.inOut(Easing.sin) }), -1, true);
  }, [reduceMotion, pulse]);
  const style = useAnimatedStyle(() => ({ opacity: pulse.value }));
  return (
    <Screen>
      <Animated.View accessibilityLabel="Cargando" style={[AppTheme.content, { gap: 14 }, style]}>
        <Bar width="40%" height={14} />
        {blocks.map((height, index) => (
          <Bar key={index} width="100%" height={height} radius={16} />
        ))}
      </Animated.View>
    </Screen>
  );
}

function Bar({ width, height, radius = 7 }: { width: DimensionValue; height: number; radius?: number }) {
  return <View style={{ width, height, borderRadius: radius, backgroundColor: AppTheme.colors.surface }} />;
}
