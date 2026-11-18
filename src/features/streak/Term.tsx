import { Image, View } from "react-native";
import { Text } from "@/src/components/Text";
import Animated, { ZoomIn } from "react-native-reanimated";

import type { PetMood } from "@/src/features/streak/streak";
import { TERM_IMAGES } from "@/src/features/streak/term.images";
import { AppTheme } from "@/src/theme";

/**
 * Term, la mascota de Dophamine: un fantasma de terminal en voxels con
 * lentes de botella, la boca `>_` y su banda de entrenar. Se muestra con sus
 * renders de fondo transparente (16 expresiones). El arte es privado: en un clon del repositorio sin las
 * imágenes se dibuja su firma `>_` en una pantalla.
 */
export type TermExpression =
  | "neutral"
  | "feliz"
  | "muy-feliz"
  | "sorpresa"
  | "concentrado"
  | "susto"
  | "sospecha"
  | "guino"
  | "orgullo"
  | "pensando"
  | "error"
  | "dormido"
  | "amor"
  | "enojado"
  | "triste"
  | "listo";

const BY_MOOD: Record<PetMood, TermExpression> = { happy: "feliz", waiting: "neutral", sad: "triste" };

export function Term({
  mood = "waiting",
  expression,
  size = 120,
}: {
  mood?: PetMood;
  /** Una expresión concreta; si no, la del ánimo. */
  expression?: TermExpression;
  size?: number;
}) {
  const name = expression ?? BY_MOOD[mood];
  const source = TERM_IMAGES[name];
  const radius = Math.round(size * 0.22);
  if (source)
    return (
      <Animated.View key={name} entering={ZoomIn.duration(220)}>
        <Image
          source={source}
          accessibilityLabel={`Term, ${name.replace("-", " ")}`}
          style={{ width: size, height: size }}
        />
      </Animated.View>
    );
  return (
    <View
      accessibilityLabel={`Term, ${name.replace("-", " ")}`}
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        backgroundColor: "#062A22",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Text style={{ color: "#33D777", fontSize: size * 0.32, fontWeight: "800", fontFamily: "monospace" }}>
        {">_"}
      </Text>
    </View>
  );
}

/** La expresión de Term para cada nivel alcanzado: más orgulloso cuanto más larga la racha. */
export const expressionForLevel = (level: number): TermExpression =>
  level >= 5 ? "orgullo" : level >= 3 ? "muy-feliz" : level >= 1 ? "feliz" : "dormido";
