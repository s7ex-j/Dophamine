import { useEffect, useRef, useState } from "react";
import { Pressable, Text, View } from "react-native";
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
  withSpring,
  withTiming,
} from "react-native-reanimated";

import { Button, Screen } from "@/src/components/ui";
import { Term, type TermExpression } from "@/src/features/streak/Term";
import { haptic } from "@/src/lib/haptics";
import { playTermSound } from "@/src/lib/sound";
import { AppTheme } from "@/src/theme";

/** Se guarda en ajustes cuando la persona termina o salta la bienvenida. */
export const WELCOME_KEY = "welcome_seen";

type Page = { expression: TermExpression; command: string; title: string; lines: string[] };

const PAGES: Page[] = [
  {
    expression: "feliz",
    command: "hola",
    title: "Soy Term. Vamos a llevar tu progreso.",
    lines: [
      "Peso, comida, entreno, sueño y cómo te sientes, en un solo lugar.",
      "Yo celebro tus rachas y te aviso cuando algo se puede mejorar.",
    ],
  },
  {
    expression: "pensando",
    command: "como-funciona",
    title: "Tu gasto real sale de tus datos, no de una fórmula.",
    lines: [
      "Registras el peso de la mañana y lo que comes.",
      "Cada 3 o 7 días reviso cómo vas y te propongo ajustar. Tú decides.",
      "Con 15 días seguidos aprendo cómo te cambian el agua, la comida y el entreno.",
    ],
  },
  {
    expression: "guino",
    command: "privacidad",
    title: "Todo se queda en tu teléfono.",
    lines: [
      "Sin cuentas, sin servidor, sin publicidad.",
      "Exportas un respaldo cuando quieras y lo ves en la web, que solo lee.",
    ],
  },
  {
    expression: "orgullo",
    command: "creditos",
    title: "Hecho por Jharol, con el código abierto.",
    lines: [
      "React Native y Expo, bajo licencia GPL-3.0.",
      "Los cálculos son estimaciones para orientarte, no consejo médico.",
      "Ahora unas preguntas para armar tu plan: un par de minutos.",
    ],
  },
];

/** Lo que hace Term cuando lo tocas, una tras otra. */
const REACTIONS: TermExpression[] = ["muy-feliz", "sorpresa", "amor", "guino", "orgullo", "listo"];
const REACTION_MS = 1600;
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
            <Text style={mono(12, AppTheme.colors.muted)}>
              dophamine <Text style={{ color: AppTheme.colors.accent }}>~</Text>{" "}
              {String(index + 1).padStart(2, "0")}/{String(PAGES.length).padStart(2, "0")}
            </Text>
            {last ? null : (
              <Pressable accessibilityRole="button" onPress={onDone} hitSlop={12}>
                <Text style={[AppTheme.hint, { fontWeight: "600" }]}>Saltar</Text>
              </Pressable>
            )}
          </View>

          <TouchableTerm base={page.expression} />

          {/* El texto de cada página entra por partes: comando, título y líneas. */}
          <View key={index} style={{ gap: 14, minHeight: 250 }}>
            <Animated.View entering={FadeInDown.duration(300)}>
              <Prompt command={page.command} />
            </Animated.View>
            <Animated.Text
              entering={FadeInDown.duration(300).delay(100)}
              style={[AppTheme.title, { fontSize: 26, lineHeight: 32 }]}
            >
              {page.title}
            </Animated.Text>
            <View style={{ gap: 10 }}>
              {page.lines.map((line, position) => (
                <Animated.View
                  key={line}
                  entering={FadeInDown.duration(300).delay(200 + position * 100)}
                  style={{ flexDirection: "row", gap: 10 }}
                >
                  <Text style={mono(14, AppTheme.colors.accent)}>›</Text>
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

const mono = (size: number, color: string) => ({
  fontFamily: "monospace",
  fontSize: size,
  color,
  letterSpacing: 0.3,
});

/** `> comando_` con el cursor parpadeando, como en la pantalla de Term. */
function Prompt({ command }: { command: string }) {
  const reduceMotion = useReducedMotion();
  const blink = useSharedValue(1);
  useEffect(() => {
    if (reduceMotion) return;
    blink.value = withRepeat(
      withSequence(withTiming(0, { duration: 450 }), withTiming(1, { duration: 450 })),
      -1,
    );
  }, [reduceMotion, blink]);
  const cursor = useAnimatedStyle(() => ({ opacity: blink.value }));
  return (
    <View style={{ flexDirection: "row", alignItems: "center" }}>
      <Text style={mono(14, AppTheme.colors.accent)}>{"> "}</Text>
      <Text style={mono(14, AppTheme.colors.body)}>{command}</Text>
      <Animated.Text style={[mono(14, AppTheme.colors.accent), cursor]}>_</Animated.Text>
    </View>
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
  const [reaction, setReaction] = useState<TermExpression | null>(null);
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
        withTiming(0.9, { duration: 90 }),
        withSpring(1, { damping: 20, stiffness: 260, overshootClamping: true }),
      );
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setReaction(null), REACTION_MS);
  };
  return (
    <View style={{ alignItems: "center", gap: 6 }}>
      <Pressable accessibilityRole="button" accessibilityLabel="Tocar a Term" onPress={poke}>
        <Animated.View style={style}>
          <Term expression={reaction ?? base} size={200} />
        </Animated.View>
      </Pressable>
      {touched ? null : (
        <Animated.Text entering={FadeIn.delay(900)} exiting={FadeOut} style={mono(11, AppTheme.colors.muted)}>
          toca a Term
        </Animated.Text>
      )}
    </View>
  );
}
