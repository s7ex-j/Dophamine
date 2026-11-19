import { useState } from "react";
import { View } from "react-native";
import { Text } from "@/src/components/Text";
import Animated, { FadeInDown } from "react-native-reanimated";

import type { OnboardingStep } from "@/src/features/profile/onboarding";
import { Term, type TermExpression } from "@/src/features/streak/Term";
import { SpeechBubble } from "@/src/components/SpeechBubble";
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
  summary: {
    expression: "muy-feliz",
    text: "Es un punto de partida: lo voy afinando. Luego te pediré permiso para recordarte comidas y pesaje.",
  },
};

// Lo que ocupan Term y su globo: si la pregunta no deja ese espacio libre, Term no aparece.
const TIP_HEIGHT = 176;

/**
 * Term al pie de cada pregunta, diciendo para qué sirve. Ocupa el espacio que dejan libre las
 * opciones; en las preguntas que llenan la pantalla no aparece, para no empujar los botones.
 */
export function TermTip({ step }: { step: OnboardingStep }) {
  const tip = TIPS[step];
  const [space, setSpace] = useState(0);
  return (
    <View style={{ flex: 1, minHeight: 0 }} onLayout={(event) => setSpace(event.nativeEvent.layout.height)}>
      {space >= TIP_HEIGHT ? (
        <Animated.View
          key={step}
          entering={FadeInDown.duration(300).delay(150)}
          // Centrado en el espacio libre: ocupa el hueco que dejan las opciones, no se pega al pie.
          style={{ position: "absolute", left: 0, right: 0, bottom: Math.max(8, (space - TIP_HEIGHT) / 2) }}
        >
          <SpeechBubble style={{ marginLeft: 58, marginBottom: 16 }} tailOffset={10}>
            <Text style={[AppTheme.termVoice, { fontSize: 14, lineHeight: 21 }]}>{tip.text}</Text>
          </SpeechBubble>
          <Term expression={tip.expression} size={84} />
        </Animated.View>
      ) : null}
    </View>
  );
}
