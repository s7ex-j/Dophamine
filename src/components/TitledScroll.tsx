import type { PropsWithChildren, ReactNode } from "react";
import { View, type ScrollViewProps } from "react-native";
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
} from "react-native-reanimated";

import { Text } from "@/src/components/Text";
import { AppTheme } from "@/src/theme";

// Cuánto hay que bajar para que el título grande se vaya y aparezca la barra compacta.
const SHRINK = 56;

/**
 * Pantalla con título grande que se encoge al bajar: el título se achica y se desvanece,
 * y arriba queda una barra fina con el mismo nombre. Todo corre en el hilo de la interfaz
 * (se calcula de la posición del scroll, así que nunca se queda a medias). Con reducir
 * movimiento, el título no se transforma; solo aparece la barra.
 */
export function TitledScroll({
  title,
  context,
  actions,
  children,
  ...scroll
}: PropsWithChildren<
  {
    title: string;
    /** Una línea callada sobre el título (fecha, día). */
    context?: string;
    /** Botones a la derecha del título. */
    actions?: ReactNode;
  } & Omit<ScrollViewProps, "onScroll" | "contentContainerStyle">
>) {
  const reduceMotion = useReducedMotion();
  const offset = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler((event) => {
    offset.value = event.contentOffset.y;
  });
  const large = useAnimatedStyle(() => {
    if (reduceMotion) return {};
    const progress = interpolate(offset.value, [0, SHRINK], [0, 1], Extrapolation.CLAMP);
    return {
      opacity: 1 - progress,
      transform: [{ translateY: progress * 8 }, { scale: 1 - progress * 0.1 }],
    };
  });
  const compact = useAnimatedStyle(() => {
    const progress = interpolate(offset.value, [SHRINK - 16, SHRINK + 8], [0, 1], Extrapolation.CLAMP);
    return { opacity: progress, transform: [{ translateY: (1 - progress) * -6 }] };
  });

  return (
    <View style={{ flex: 1 }}>
      <Animated.ScrollView
        {...scroll}
        onScroll={onScroll}
        scrollEventThrottle={16}
        contentContainerStyle={AppTheme.content}
      >
        <View style={AppTheme.sectionHeader}>
          <Animated.View style={[{ flex: 1, transformOrigin: "left bottom" }, large]}>
            {context ? <Text style={AppTheme.eyebrow}>{context}</Text> : null}
            <Text style={AppTheme.title} numberOfLines={2} accessibilityRole="header">
              {title}
            </Text>
          </Animated.View>
          {actions}
        </View>
        {children}
      </Animated.ScrollView>
      <Animated.View pointerEvents="none" aria-hidden style={[AppTheme.compactBar, compact]}>
        <Text style={AppTheme.compactBarTitle} numberOfLines={1}>
          {title}
        </Text>
      </Animated.View>
    </View>
  );
}
