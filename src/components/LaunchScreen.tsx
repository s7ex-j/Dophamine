import { useEffect } from "react";
import { Image, Text, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";

import { AppTheme } from "@/src/theme";

/**
 * Lo que se ve mientras abre la base de datos: el ícono entra con una escala
 * suave y luego "respira" hasta que la app está lista. Suele durar menos de un
 * segundo.
 */
export function LaunchScreen() {
  const reduceMotion = useReducedMotion();
  const enter = useSharedValue(reduceMotion ? 1 : 0);
  const breathe = useSharedValue(1);
  useEffect(() => {
    if (reduceMotion) return;
    enter.value = withTiming(1, { duration: 420, easing: Easing.out(Easing.back(1.4)) });
    breathe.value = withRepeat(
      withSequence(
        withTiming(1.04, { duration: 700, easing: Easing.inOut(Easing.sin) }),
        withTiming(1, { duration: 700, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
    );
  }, [reduceMotion, enter, breathe]);
  const icon = useAnimatedStyle(() => ({
    opacity: enter.value,
    transform: [{ scale: (0.8 + 0.2 * enter.value) * breathe.value }],
  }));
  const name = useAnimatedStyle(() => ({ opacity: enter.value }));
  return (
    <View style={[AppTheme.loading, { gap: 16 }]}>
      <Animated.View style={icon}>
        <Image
          source={require("../../assets/images/icon.png")}
          accessibilityLabel="Dophamine"
          style={{ width: 96, height: 96, borderRadius: 24 }}
        />
      </Animated.View>
      <Animated.View style={name}>
        <Text style={[AppTheme.title, { fontSize: 22 }]}>Dophamine</Text>
      </Animated.View>
    </View>
  );
}
