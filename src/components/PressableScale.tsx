import { Pressable, type PressableProps, type StyleProp, type ViewStyle } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/** Al presionar baja rápido; al soltar vuelve frenando, sin rebote (se puede interrumpir). */
const PRESS_IN = { duration: 90, easing: Easing.out(Easing.quad) };
const RELEASE = { duration: 180, easing: Easing.out(Easing.cubic) };

/**
 * Lo que se toca se encoge un poco mientras el dedo está encima, como un botón
 * físico. Corre en el hilo de la interfaz (Reanimated). Sin animación si el
 * teléfono pide reducir el movimiento.
 */
export function PressableScale({
  style,
  scaleTo = 0.97,
  onPressIn,
  onPressOut,
  ...props
}: Omit<PressableProps, "style"> & { style?: StyleProp<ViewStyle>; scaleTo?: number }) {
  const reduceMotion = useReducedMotion();
  const scale = useSharedValue(1);
  const animated = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <AnimatedPressable
      {...props}
      onPressIn={(event) => {
        if (!reduceMotion) scale.value = withTiming(scaleTo, PRESS_IN);
        onPressIn?.(event);
      }}
      onPressOut={(event) => {
        scale.value = withTiming(1, RELEASE);
        onPressOut?.(event);
      }}
      style={[style, animated]}
    />
  );
}
