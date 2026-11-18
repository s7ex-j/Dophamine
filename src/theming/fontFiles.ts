import { BricolageGrotesque_600SemiBold } from "@expo-google-fonts/bricolage-grotesque/600SemiBold";
import { BricolageGrotesque_700Bold } from "@expo-google-fonts/bricolage-grotesque/700Bold";
import { InstrumentSans_400Regular } from "@expo-google-fonts/instrument-sans/400Regular";
import { InstrumentSans_500Medium } from "@expo-google-fonts/instrument-sans/500Medium";
import { InstrumentSans_600SemiBold } from "@expo-google-fonts/instrument-sans/600SemiBold";
import { InstrumentSans_700Bold } from "@expo-google-fonts/instrument-sans/700Bold";
import { JetBrainsMono_400Regular } from "@expo-google-fonts/jetbrains-mono/400Regular";
import { JetBrainsMono_700Bold } from "@expo-google-fonts/jetbrains-mono/700Bold";

import { FONTS } from "@/src/theming/fonts";

/** Los archivos de cada familia de `FONTS`, empaquetados con la app (solo los pesos que se usan). */
export const FONT_FILES = {
  [FONTS.text400]: InstrumentSans_400Regular,
  [FONTS.text500]: InstrumentSans_500Medium,
  [FONTS.text600]: InstrumentSans_600SemiBold,
  [FONTS.text700]: InstrumentSans_700Bold,
  [FONTS.display600]: BricolageGrotesque_600SemiBold,
  [FONTS.display700]: BricolageGrotesque_700Bold,
  [FONTS.mono400]: JetBrainsMono_400Regular,
  [FONTS.mono700]: JetBrainsMono_700Bold,
};
