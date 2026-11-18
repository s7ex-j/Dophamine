import { useEffect } from "react";
import { Image, StyleSheet, View } from "react-native";
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import { Text } from "@/src/components/Text";
import { AppTheme } from "@/src/theme";

/** Lo mínimo que se muestra, para que una carga rápida no parpadee. */
export const LAUNCH_MIN_MS = 650;
const OUT = Easing.out(Easing.cubic);

/**
 * Pantalla de carga al abrir la app: el ícono, el nombre y una línea fina que avanza con la
 * carga real (fuentes y base de datos). Va encima de la app; cuando todo está listo se
 * desvanece y el ícono se aleja un poco, y entonces se quita. Con reducir movimiento solo
 * hay un fundido corto.
 */
export function LaunchScreen({
  progress,
  done,
  fontsReady,
  onHidden,
}: {
  /** De 0 a 1: cuánto de la carga ya terminó. */
  progress: number;
  /** Todo listo y pasó el mínimo: empieza la salida. */
  done: boolean;
  /** Con las fuentes cargadas, el nombre aparece en su letra (antes no, para que no salte). */
  fontsReady: boolean;
  onHidden: () => void;
}) {
  const reduceMotion = useReducedMotion();
  const enter = useSharedValue(reduceMotion ? 1 : 0);
  const fill = useSharedValue(0);
  const leave = useSharedValue(0);
  const name = useSharedValue(0);

  useEffect(() => {
    if (!reduceMotion) enter.value = withTiming(1, { duration: 420, easing: OUT });
  }, [reduceMotion, enter]);
  useEffect(() => {
    fill.value = withTiming(Math.max(0.12, progress), { duration: 360, easing: OUT });
  }, [progress, fill]);
  useEffect(() => {
    if (fontsReady) name.value = withTiming(1, { duration: reduceMotion ? 0 : 260, easing: OUT });
  }, [fontsReady, reduceMotion, name]);
  useEffect(() => {
    if (!done) return;
    leave.value = withTiming(1, { duration: reduceMotion ? 160 : 380, easing: OUT }, (finished) => {
      if (finished) runOnJS(onHidden)();
    });
  }, [done, reduceMotion, leave, onHidden]);

  const layer = useAnimatedStyle(() => ({ opacity: 1 - leave.value }));
  const mark = useAnimatedStyle(() => ({
    opacity: enter.value,
    transform: [{ scale: reduceMotion ? 1 : (0.94 + 0.06 * enter.value) * (1 + 0.08 * leave.value) }],
  }));
  const word = useAnimatedStyle(() => ({
    opacity: name.value,
    transform: [{ translateY: (1 - name.value) * 6 }],
  }));
  const bar = useAnimatedStyle(() => ({ width: `${fill.value * 100}%`, opacity: 1 - leave.value }));

  return (
    <Animated.View
      pointerEvents={done ? "none" : "auto"}
      style={[StyleSheet.absoluteFill, AppTheme.loading, { gap: 18 }, layer]}
      accessibilityLabel="Cargando Dophamine"
    >
      <Animated.View style={mark}>
        <Image
          source={require("../../assets/images/icon.png")}
          accessibilityIgnoresInvertColors
          style={{ width: 88, height: 88, borderRadius: 22 }}
        />
      </Animated.View>
      <Animated.View style={word}>
        <Text style={[AppTheme.title, { fontSize: 26, lineHeight: 30 }]}>Dophamine</Text>
      </Animated.View>
      <View style={[styles.track, { backgroundColor: AppTheme.colors.surface2 }]}>
        <Animated.View style={[styles.fill, { backgroundColor: AppTheme.colors.accent }, bar]} />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  track: { position: "absolute", bottom: "18%", width: 120, height: 3, borderRadius: 2, overflow: "hidden" },
  fill: { height: "100%", borderRadius: 2 },
});
