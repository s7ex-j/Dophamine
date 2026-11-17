import { useEffect, useRef, useState } from "react";
import { AccessibilityInfo, Animated, Easing, ScrollView, Text, View } from "react-native";

import { Button, Screen, StepDots } from "@/src/components/ui";
import { Term, type TermExpression } from "@/src/features/streak/Term";
import { AppTheme } from "@/src/theme";

/** Se guarda en ajustes cuando la persona termina o salta la bienvenida. */
export const WELCOME_KEY = "welcome_seen";

type Page = { expression: TermExpression; eyebrow: string; title: string; lines: string[] };

const PAGES: Page[] = [
  {
    expression: "feliz",
    eyebrow: "BIENVENIDA",
    title: "Hola, soy Term",
    lines: [
      "Dophamine junta en un solo lugar tu peso, lo que comes, tu entreno, tu sueño y cómo te sientes.",
      "Te acompaño en el camino: celebro tus rachas y te aviso cuando algo se puede mejorar.",
    ],
  },
  {
    expression: "pensando",
    eyebrow: "CÓMO FUNCIONA",
    title: "Aprende de tus datos",
    lines: [
      "Registras en el Panel: el peso de la mañana y lo que comes. Con eso la app calcula tu gasto real, no el de una fórmula.",
      "Cada 3 o 7 días revisa cómo vas y propone ajustar tus calorías. Tú decides si lo aplicas.",
      "Con 15 días seguidos de datos se activa un motor que aprende cómo cambia tu peso por el agua, la comida y el entreno.",
    ],
  },
  {
    expression: "guino",
    eyebrow: "TUS DATOS",
    title: "Todo se queda en tu teléfono",
    lines: [
      "Sin cuentas, sin servidor y sin publicidad. Nada sale del teléfono salvo lo que tú decides enviar.",
      "Puedes exportar un respaldo cuando quieras y verlo en la web, que solo lee.",
    ],
  },
  {
    expression: "orgullo",
    eyebrow: "CÓMO SE HIZO",
    title: "Un proyecto abierto",
    lines: [
      "Dophamine es un proyecto personal de Jharol Vilca Ramos, hecho con React Native y Expo, con el código abierto bajo GPL-3.0.",
      "Los cálculos son estimaciones para orientarte, no un consejo médico.",
      "Ahora unas preguntas para armar tu plan. Toma un par de minutos.",
    ],
  },
];

/** Pantallas de bienvenida antes de la evaluación inicial (solo la primera vez). */
export function Welcome({ onDone }: { onDone: () => void }) {
  const [index, setIndex] = useState(0);
  const [reduceMotion, setReduceMotion] = useState(false);
  const enter = useRef(new Animated.Value(0)).current;
  const float = useRef(new Animated.Value(0)).current;
  const page = PAGES[index];
  const last = index === PAGES.length - 1;

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
  }, []);

  // Cada página entra con Term primero y el texto detrás, escalonado.
  useEffect(() => {
    if (reduceMotion) return enter.setValue(1);
    enter.setValue(0);
    Animated.timing(enter, {
      toValue: 1,
      duration: 520,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [index, reduceMotion, enter]);

  // Term flota suave mientras la página está quieta.
  useEffect(() => {
    if (reduceMotion) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(float, {
          toValue: 1,
          duration: 1600,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(float, {
          toValue: 0,
          duration: 1600,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [reduceMotion, float]);

  const appear = (from: number, to: number) => ({
    opacity: enter.interpolate({ inputRange: [0, from, to, 1], outputRange: [0, 0, 1, 1] }),
    transform: [
      { translateY: enter.interpolate({ inputRange: [0, from, to, 1], outputRange: [14, 14, 0, 0] }) },
    ],
  });

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={[AppTheme.content, { flexGrow: 1, justifyContent: "space-between", gap: 24 }]}
      >
        <View style={{ alignItems: "flex-end", minHeight: 40 }}>
          {last ? null : <Button title="Saltar" variant="secondary" onPress={onDone} />}
        </View>
        <View style={{ alignItems: "center", gap: 18 }}>
          <Animated.View
            style={[
              appear(0, 0.55),
              {
                transform: [
                  { translateY: float.interpolate({ inputRange: [0, 1], outputRange: [0, -8] }) },
                  { scale: enter.interpolate({ inputRange: [0, 0.55, 1], outputRange: [0.86, 1, 1] }) },
                ],
              },
            ]}
          >
            <Term expression={page.expression} size={190} />
          </Animated.View>
          <Animated.View style={[appear(0.2, 0.75), { gap: 6, alignSelf: "stretch" }]}>
            <Text style={[AppTheme.eyebrow, { textAlign: "center" }]}>{page.eyebrow}</Text>
            <Text style={[AppTheme.title, { textAlign: "center", fontSize: 28 }]}>{page.title}</Text>
          </Animated.View>
          <Animated.View style={[appear(0.35, 1), { gap: 10, alignSelf: "stretch" }]}>
            {page.lines.map((line) => (
              <Text key={line} style={[AppTheme.body, { textAlign: "center" }]}>
                {line}
              </Text>
            ))}
          </Animated.View>
        </View>
        <View style={{ gap: 14 }}>
          <StepDots total={PAGES.length} current={index} />
          <Button
            title={last ? "Empezar mi evaluación" : "Siguiente"}
            onPress={() => (last ? onDone() : setIndex(index + 1))}
          />
          {index > 0 ? (
            <Button title="Atrás" variant="secondary" onPress={() => setIndex(index - 1)} />
          ) : null}
        </View>
      </ScrollView>
    </Screen>
  );
}
