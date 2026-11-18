import { useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Text } from "@/src/components/Text";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  FadeOut,
  runOnJS,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";

import { Button, Screen } from "@/src/components/ui";
import { Term, type TermExpression } from "@/src/features/streak/Term";
import { haptic } from "@/src/lib/haptics";
import { playTermSound } from "@/src/lib/sound";
import { AppTheme } from "@/src/theme";

/** Se guarda en ajustes cuando la persona termina o salta la bienvenida. */
export const WELCOME_KEY = "welcome_seen";

type Page = { expression: TermExpression; title: string; lines: string[] };

const PAGES: Page[] = [
  {
    expression: "feliz",
    title: "Soy Term. Vamos a llevar tu progreso.",
    lines: [
      "Peso, comida, entreno, sueño y cómo te sientes, en un solo lugar.",
      "Yo celebro tus rachas y te aviso cuando algo se puede mejorar.",
    ],
  },
  {
    expression: "pensando",
    title: "Tu gasto real sale de tus datos, no de una fórmula.",
    lines: [
      "Registras el peso de la mañana y lo que comes.",
      "Cada 3 o 7 días reviso cómo vas y te propongo ajustar. Tú decides.",
      "Con 15 días seguidos aprendo cómo te cambian el agua, la comida y el entreno.",
    ],
  },
  {
    expression: "guino",
    title: "Todo se queda en tu teléfono.",
    lines: [
      "Sin cuentas, sin servidor, sin publicidad.",
      "Exportas un respaldo cuando quieras y lo ves en la web, que solo lee.",
    ],
  },
  {
    expression: "orgullo",
    title: "Hecho por Jharol, con el código abierto.",
    lines: [
      "React Native y Expo, bajo licencia GPL-3.0.",
      "Los cálculos son estimaciones para orientarte, no consejo médico.",
      "Ahora unas preguntas para armar tu plan: un par de minutos.",
    ],
  },
];

/** Lo que hace y dice Term cuando lo tocas, una tras otra. */
const REACTIONS: Array<{ expression: TermExpression; line: string }> = [
  { expression: "muy-feliz", line: "¡Hola! Qué bueno verte." },
  { expression: "sorpresa", line: "¡Uy, cosquillas!" },
  { expression: "orgullo", line: "Cada registro cuenta." },
  { expression: "guino", line: "Tus datos no salen de aquí." },
  { expression: "amor", line: "Vamos paso a paso, juntos." },
  { expression: "listo", line: "¿Empezamos?" },
];
// Lo bastante para leer la frase con calma.
const REACTION_MS = 2400;
const SWIPE = 60;

/** Pantallas de bienvenida antes de la evaluación inicial (solo la primera vez). */
export function Welcome({ onDone }: { onDone: () => void }) {
  const [index, setIndex] = useState(0);
  const page = PAGES[index];
  const last = index === PAGES.length - 1;
  const go = (next: number) => {
    if (next < 0 || next >= PAGES.length) return;
    haptic.tap();
    setIndex(next);
  };
  // Deslizar a los lados cambia de página.
  const swipe = Gesture.Pan()
    .activeOffsetX([-20, 20])
    .failOffsetY([-15, 15])
    .onEnd((event) => {
      if (event.translationX < -SWIPE) runOnJS(go)(index + 1);
      else if (event.translationX > SWIPE) runOnJS(go)(index - 1);
    });

  return (
    <Screen>
      <GestureDetector gesture={swipe}>
        <View style={[AppTheme.content, { flex: 1, justifyContent: "space-between", paddingTop: 18 }]}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <Text style={AppTheme.hint}>
              {index + 1} de {PAGES.length}
            </Text>
            {last ? null : (
              <Pressable accessibilityRole="button" onPress={onDone} hitSlop={12}>
                <Text style={[AppTheme.hint, { fontWeight: "600" }]}>Saltar</Text>
              </Pressable>
            )}
          </View>

          <TouchableTerm base={page.expression} />

          {/* El texto de cada página entra por partes: título y líneas. */}
          <View key={index} style={{ gap: 16, minHeight: 230 }}>
            <Animated.View entering={FadeInDown.duration(300)}>
              <Text style={[AppTheme.title, { fontSize: 28, lineHeight: 33 }]}>{page.title}</Text>
            </Animated.View>
            <View style={{ gap: 10 }}>
              {page.lines.map((line, position) => (
                <Animated.View
                  key={line}
                  entering={FadeInDown.duration(300).delay(120 + position * 90)}
                  style={{ flexDirection: "row", gap: 12, alignItems: "flex-start" }}
                >
                  <View style={[styles.bullet, { backgroundColor: AppTheme.colors.accent }]} />
                  <Text style={[AppTheme.body, { flex: 1 }]}>{line}</Text>
                </Animated.View>
              ))}
            </View>
          </View>

          <View style={{ gap: 16 }}>
            <View style={{ flexDirection: "row", gap: 6 }}>
              {PAGES.map((_, position) => (
                <Segment key={position} active={position <= index} />
              ))}
            </View>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 16 }}>
              {index > 0 ? (
                <Pressable accessibilityRole="button" onPress={() => go(index - 1)} hitSlop={12}>
                  <Text style={[AppTheme.hint, { fontWeight: "600" }]}>Atrás</Text>
                </Pressable>
              ) : null}
              <View style={{ flex: 1 }}>
                <Button
                  title={last ? "Empezar mi evaluación" : "Siguiente"}
                  onPress={() => (last ? onDone() : go(index + 1))}
                />
              </View>
            </View>
          </View>
        </View>
      </GestureDetector>
    </Screen>
  );
}

/** Raya de avance que se llena al llegar a su página. */
function Segment({ active }: { active: boolean }) {
  const fill = useSharedValue(active ? 1 : 0);
  useEffect(() => {
    fill.value = withTiming(active ? 1 : 0, { duration: 300, easing: Easing.out(Easing.cubic) });
  }, [active, fill]);
  const style = useAnimatedStyle(() => ({ width: `${fill.value * 100}%` }));
  return (
    <View
      style={{
        flex: 1,
        height: 3,
        borderRadius: 2,
        backgroundColor: AppTheme.colors.border,
        overflow: "hidden",
      }}
    >
      <Animated.View style={[{ height: "100%", backgroundColor: AppTheme.colors.accent }, style]} />
    </View>
  );
}

/**
 * Term grande que responde al toque: suena, vibra, se aplasta y vuelve, y cambia
 * de cara un momento. Mientras tanto flota suave.
 */
function TouchableTerm({ base }: { base: TermExpression }) {
  const reduceMotion = useReducedMotion();
  const [reaction, setReaction] = useState<(typeof REACTIONS)[number] | null>(null);
  const [touched, setTouched] = useState(false);
  const count = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const float = useSharedValue(0);
  const squash = useSharedValue(1);
  useEffect(() => {
    if (reduceMotion) return;
    float.value = withRepeat(
      withSequence(
        withTiming(-6, { duration: 1500, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: 1500, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
    );
  }, [reduceMotion, float]);
  useEffect(() => () => (timer.current ? clearTimeout(timer.current) : undefined), []);
  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: float.value }, { scaleX: 2 - squash.value }, { scaleY: squash.value }],
  }));
  const poke = () => {
    playTermSound();
    haptic.light();
    setTouched(true);
    setReaction(REACTIONS[count.current++ % REACTIONS.length]);
    if (!reduceMotion)
      squash.value = withSequence(
        withTiming(0.9, { duration: 90, easing: Easing.out(Easing.quad) }),
        withTiming(1, { duration: 220, easing: Easing.out(Easing.cubic) }),
      );
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setReaction(null), REACTION_MS);
  };
  return (
    <View style={{ alignItems: "center", gap: 6 }}>
      <View>
        <Pressable accessibilityRole="button" accessibilityLabel="Tocar a Term" onPress={poke}>
          <Animated.View style={style}>
            <Term expression={reaction?.expression ?? base} size={190} />
          </Animated.View>
        </Pressable>
        {/* Lo que dice Term, en un globo junto a su cabeza: no tapa el texto de la página. */}
        {reaction ? (
          <Animated.View
            key={count.current}
            entering={FadeInDown.duration(220)}
            exiting={FadeOut.duration(160)}
            pointerEvents="none"
            accessibilityLiveRegion="polite"
            style={[
              styles.bubble,
              { backgroundColor: AppTheme.colors.surface2, borderColor: AppTheme.colors.border },
            ]}
          >
            <Text style={[AppTheme.body, { fontSize: 14, lineHeight: 19 }]}>{reaction.line}</Text>
          </Animated.View>
        ) : null}
      </View>
      {touched ? null : (
        <Animated.View entering={FadeIn.delay(900)} exiting={FadeOut}>
          <Text style={AppTheme.hint}>Toca a Term</Text>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  bullet: { width: 6, height: 6, borderRadius: 3, marginTop: 8 },
  bubble: {
    position: "absolute",
    top: 4,
    left: "60%",
    width: 150,
    borderWidth: 1,
    borderRadius: 16,
    borderBottomLeftRadius: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
});
