import { Text, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";

import type { OnboardingStep } from "@/src/features/profile/onboarding";
import { Term, type TermExpression } from "@/src/features/streak/Term";
import { AppTheme } from "@/src/theme";

/** Lo que Term piensa en cada pregunta de la evaluación: el porqué, en una o dos frases. */
const TIPS: Record<OnboardingStep, { expression: TermExpression; text: string }> = {
  goal: {
    expression: "pensando",
    text: "Esto decide si comes por debajo, igual o por encima de lo que gastas.",
  },
  body: { expression: "concentrado", text: "Con edad, altura y peso estimo cuánto gastas en reposo." },
  style: { expression: "guino", text: "Toca un tema y lo ves en toda la app al instante." },
  composition: {
    expression: "pensando",
    text: "Si sabes tu % de grasa calculo mejor tu gasto. Si no, una referencia visual basta.",
  },
  activity: {
    expression: "concentrado",
    text: "Piensa en un día normal: caminar, trabajo, tareas. El entreno va aparte.",
  },
  training: { expression: "orgullo", text: "Con esto armo tu rutina inicial con los días que me digas." },
  intake: {
    expression: "pensando",
    text: "Lo que comes hoy y si tu peso sube o baja es el mejor punto de partida.",
  },
  target: { expression: "listo", text: "Un ritmo moderado suele ser el más fácil de sostener." },
  deadline: {
    expression: "sorpresa",
    text: "Con una fecha te digo cuántas probabilidades tienes de llegar.",
  },
  protein: {
    expression: "orgullo",
    text: "Más proteína ayuda a conservar músculo mientras cambias de peso.",
  },
  plan: {
    expression: "pensando",
    text: "Las calorías son las mismas; cambia cómo se reparten carbos y grasas.",
  },
  meals: { expression: "feliz", text: "Elige cómo comes de verdad: así registrar te toma segundos." },
  restrictions: {
    expression: "concentrado",
    text: "Lo que marques no te lo propongo y te aviso si aparece.",
  },
  files: { expression: "guino", text: "Si ya tienes tu dieta o tu rutina en un archivo, la cargo y listo." },
  tracking: {
    expression: "pensando",
    text: "En automático ajusto solo, pero siempre te aviso y puedes deshacerlo.",
  },
  summary: { expression: "muy-feliz", text: "Es un punto de partida: con tus registros lo voy afinando." },
};

/**
 * Term al pie de cada pregunta, con un globo de pensamiento que explica para
 * qué sirve. Ocupa el espacio libre bajo las opciones.
 */
export function TermTip({ step }: { step: OnboardingStep }) {
  const tip = TIPS[step];
  return (
    <Animated.View
      key={step}
      entering={FadeInDown.duration(300).delay(150)}
      style={{ marginTop: "auto", paddingTop: 16, flexDirection: "row", alignItems: "flex-end", gap: 4 }}
    >
      <Term expression={tip.expression} size={78} />
      <View style={{ flex: 1, marginBottom: 34 }}>
        <View
          style={{
            backgroundColor: AppTheme.colors.surface,
            borderColor: AppTheme.colors.border,
            borderWidth: 1,
            borderRadius: 18,
            paddingVertical: 10,
            paddingHorizontal: 14,
          }}
        >
          <Text style={[AppTheme.body, { fontSize: 14, lineHeight: 20 }]}>{tip.text}</Text>
        </View>
        {/* Las burbujas chicas que salen de la cabeza de Term. */}
        <Bubble size={10} style={{ left: -2, bottom: -14 }} />
        <Bubble size={6} style={{ left: -12, bottom: -24 }} />
      </View>
    </Animated.View>
  );
}

function Bubble({ size, style }: { size: number; style: { left: number; bottom: number } }) {
  return (
    <View
      style={[
        {
          position: "absolute",
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: AppTheme.colors.surface,
          borderColor: AppTheme.colors.border,
          borderWidth: 1,
        },
        style,
      ]}
    />
  );
}
