import { useEffect, useRef, useState } from "react";
import { Pressable, View } from "react-native";
import { Text } from "@/src/components/Text";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  runOnJS,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSequence,
  withTiming,
} from "react-native-reanimated";

import { SpeechBubble } from "@/src/components/SpeechBubble";
import { Button, Screen } from "@/src/components/ui";
import { Term, type TermExpression } from "@/src/features/streak/Term";
import { WelcomePreview } from "@/src/features/welcome/WelcomePreviews";
import { haptic } from "@/src/lib/haptics";
import { playTermSound } from "@/src/lib/sound";
import { AppTheme } from "@/src/theme";

/** Se guarda en ajustes cuando la persona termina o salta la bienvenida. */
export const WELCOME_KEY = "welcome_seen";

type Page = { expression: TermExpression; title: string; lines: string[]; says: string };

const PAGES: Page[] = [
  {
    expression: "feliz",
    title: "Soy Term. Vamos a llevar tu progreso.",
    lines: ["Peso, comida, entreno, sueño y cómo te sientes, en un solo lugar."],
    says: "Cada día empieza aquí: lo que te queda y lo que falta anotar.",
  },
  {
    expression: "pensando",
    title: "Tu gasto real sale de tus datos, no de una fórmula.",
    lines: [
      "Registras el peso de la mañana y lo que comes.",
      "Cada 3 o 7 días reviso cómo vas y te propongo ajustar. Tú decides.",
    ],
    says: "Con 15 días seguidos aprendo cómo te cambian el agua y la comida.",
  },
  {
    expression: "guino",
    title: "Todo se queda en tu teléfono.",
    lines: ["Sin cuentas, sin servidor, sin publicidad. Exportas un respaldo cuando quieras."],
    says: "Tus datos no salen de aquí.",
  },
  {
    expression: "orgullo",
    title: "Hecho por Jharol, con el código abierto.",
    lines: [
      "Bajo licencia GPL-3.0. Los cálculos son estimaciones para orientarte, no consejo médico.",
      "Ahora unas preguntas para armar tu plan: un par de minutos.",
    ],
    says: "¿Empezamos? Son unas pocas preguntas.",
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

          {/* Lo que la app hace en esta página, como se verá: una vista previa con números de ejemplo. */}
          <Animated.View
            key={`preview-${index}`}
            entering={FadeInDown.duration(320)}
            style={{ paddingTop: 8 }}
          >
            <WelcomePreview page={index} />
          </Animated.View>

          <TalkingTerm key={`term-${index}`} base={page.expression} says={page.says} />

          {/* El texto de cada página entra por partes: título y líneas. */}
          <View key={index} style={{ gap: 12 }}>
            <Animated.View entering={FadeInDown.duration(300)}>
              <Text style={[AppTheme.title, { fontSize: 26, lineHeight: 31 }]}>{page.title}</Text>
            </Animated.View>
            {page.lines.map((line, position) => (
              <Animated.View key={line} entering={FadeInDown.duration(300).delay(100 + position * 80)}>
                <Text style={[AppTheme.body, { color: AppTheme.colors.muted }]}>{line}</Text>
              </Animated.View>
            ))}
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
 * Term a la izquierda, diciendo algo de la página en un globo a su lado. Al tocarlo suena,
 * vibra, se aplasta y vuelve, cambia de cara y dice otra frase un momento.
 */
function TalkingTerm({ base, says }: { base: TermExpression; says: string }) {
  const reduceMotion = useReducedMotion();
  const [reaction, setReaction] = useState<(typeof REACTIONS)[number] | null>(null);
  const count = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const squash = useSharedValue(1);
  useEffect(() => () => (timer.current ? clearTimeout(timer.current) : undefined), []);
  const style = useAnimatedStyle(() => ({
    transform: [{ scaleX: 2 - squash.value }, { scaleY: squash.value }],
  }));
  const poke = () => {
    playTermSound();
    haptic.light();
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
    <View style={{ flexDirection: "row", alignItems: "center", gap: 16 }}>
      <Pressable accessibilityRole="button" accessibilityLabel="Tocar a Term" onPress={poke} hitSlop={8}>
        <Animated.View style={style}>
          <Term expression={reaction?.expression ?? base} size={76} />
        </Animated.View>
      </Pressable>
      <Animated.View
        key={reaction ? count.current : "page"}
        entering={FadeIn.duration(200)}
        style={{ flex: 1 }}
        accessibilityLiveRegion="polite"
      >
        <SpeechBubble tail="left" tailOffset={14}>
          <Text style={[AppTheme.body, { fontSize: 14, lineHeight: 20 }]}>{reaction?.line ?? says}</Text>
        </SpeechBubble>
      </Animated.View>
    </View>
  );
}
