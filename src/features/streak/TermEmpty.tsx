import { View } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";

import { Text } from "@/src/components/Text";
import { Term, type TermExpression } from "@/src/features/streak/Term";
import { AppTheme } from "@/src/theme";

/** Un estado vacío: Term dice qué falta y qué va a aparecer, en su voz. */
export function TermEmpty({ text, expression = "pensando" }: { text: string; expression?: TermExpression }) {
  return (
    <Animated.View entering={FadeIn.duration(240)} style={[AppTheme.iconRow, { paddingVertical: 4 }]}>
      <Term expression={expression} size={56} />
      <View style={{ flex: 1 }}>
        <Text style={AppTheme.termVoice}>{text}</Text>
      </View>
    </Animated.View>
  );
}
