import { useEffect, useRef, useState, type PropsWithChildren } from "react";
import { Text, type StyleProp, type TextStyle, type ViewStyle } from "react-native";
import Animated, {
  Easing,
  FadeInDown,
  FadeOut,
  LinearTransition,
  useAnimatedProps,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
} from "react-native-reanimated";
import { Circle, type CircleProps } from "react-native-svg";

/**
 * Piezas de movimiento compartidas. Todas animan solo transform, opacidad o un
 * trazo (en el hilo de la interfaz), se pueden interrumpir con un valor nuevo
 * y se saltan la animación si el teléfono pide reducir el movimiento.
 */
export const FILL = { duration: 750, easing: Easing.out(Easing.cubic) };

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

/** Arco de anillo que se llena hasta `progress` (0 a 1) al aparecer y cuando cambia. */
export function ProgressArc({
  progress,
  radius,
  delay = 0,
  ...circle
}: Omit<CircleProps, "r" | "strokeDasharray" | "strokeDashoffset"> & {
  progress: number;
  radius: number;
  delay?: number;
}) {
  const reduceMotion = useReducedMotion();
  const circumference = 2 * Math.PI * radius;
  const target = Math.max(0, Math.min(1, progress));
  const value = useSharedValue(reduceMotion ? target : 0);
  useEffect(() => {
    value.value = reduceMotion ? target : withDelay(delay, withTiming(target, FILL));
  }, [target, delay, reduceMotion, value]);
  const animatedProps = useAnimatedProps(() => ({
    // Sin avance no se dibuja nada (un trazo redondeado de largo cero se vería como un punto).
    strokeDashoffset: circumference * (1 - value.value),
    strokeOpacity: value.value > 0.001 ? 1 : 0,
  }));
  return (
    <AnimatedCircle
      {...circle}
      r={radius}
      strokeDasharray={`${circumference} ${circumference}`}
      animatedProps={animatedProps}
    />
  );
}

/** Un número que sube (o baja) contando hasta su valor nuevo. */
export function CountUp({
  value,
  style,
  format = (shown) => String(Math.round(shown)),
}: {
  value: number;
  style?: StyleProp<TextStyle>;
  format?: (shown: number) => string;
}) {
  const reduceMotion = useReducedMotion();
  const [shown, setShown] = useState(reduceMotion ? value : 0);
  const from = useRef(shown);
  useEffect(() => {
    if (reduceMotion) return setShown(value);
    const start = from.current;
    const began = Date.now();
    let frame = 0;
    const step = () => {
      const t = Math.min(1, (Date.now() - began) / FILL.duration);
      const eased = 1 - Math.pow(1 - t, 3);
      const next = start + (value - start) * eased;
      from.current = next;
      setShown(next);
      if (t < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [value, reduceMotion]);
  return <Text style={style}>{format(shown)}</Text>;
}

/** Contenido que se descubre de izquierda a derecha (una línea que se dibuja). */
export function RevealX({
  width,
  children,
  style,
}: PropsWithChildren<{ width: number; style?: StyleProp<ViewStyle> }>) {
  const reduceMotion = useReducedMotion();
  const shown = useSharedValue(reduceMotion ? 1 : 0);
  useEffect(() => {
    if (!reduceMotion) shown.value = withTiming(1, { duration: 900, easing: Easing.out(Easing.quad) });
  }, [reduceMotion, shown]);
  const animated = useAnimatedStyle(() => ({ width: width * shown.value }));
  return <Animated.View style={[{ overflow: "hidden" }, style, animated]}>{children}</Animated.View>;
}

/** Barra que crece hasta `fraction` (0 a 1) de su contenedor, en alto o en ancho. */
export function GrowBar({
  fraction,
  axis = "width",
  style,
  delay = 0,
}: {
  fraction: number;
  axis?: "width" | "height";
  style?: StyleProp<ViewStyle>;
  delay?: number;
}) {
  const reduceMotion = useReducedMotion();
  const target = Math.max(0, Math.min(1, fraction));
  const value = useSharedValue(reduceMotion ? target : 0);
  useEffect(() => {
    value.value = reduceMotion ? target : withDelay(delay, withTiming(target, FILL));
  }, [target, delay, reduceMotion, value]);
  const animated = useAnimatedStyle(() =>
    axis === "width" ? { width: `${value.value * 100}%` } : { height: `${value.value * 100}%` },
  );
  return <Animated.View style={[style, animated]} />;
}

/** Filas de listas: entran bajando un poco, salen con un fundido corto y el resto se reacomoda. */
export const ENTER = FadeInDown.duration(220);
export const EXIT = FadeOut.duration(140);
export const SETTLE = LinearTransition.duration(220);
