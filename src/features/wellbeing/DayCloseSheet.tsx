import { useState } from "react";
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, View } from "react-native";
import { Gesture, GestureDetector, GestureHandlerRootView } from "react-native-gesture-handler";
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Text } from "@/src/components/Text";
import { LinkButton } from "@/src/components/ui";
import { GoalsRing } from "@/src/features/calendar/DayRing";
import { complianceScore, COMPLIANCE_ITEMS, type DayCompliance } from "@/src/features/habits/compliance";
import { setSetting } from "@/src/features/settings/settings.repository";
import { Term } from "@/src/features/streak/Term";
import { QuickCheckIn } from "@/src/features/wellbeing/QuickCheckIn";
import { DISMISS_KEY } from "@/src/features/wellbeing/wellbeing";
import { localDateKey } from "@/src/lib/dates";
import { AppTheme } from "@/src/theme";

// Cuánto hay que bajarla para que se cierre al soltar.
const CLOSE = 90;

/**
 * Cierre del día: de noche, una vez, sube una hoja con los objetivos cumplidos y
 * las tres preguntas. Se quita deslizando, tocando fuera o con "Ahora no", y no
 * vuelve hasta mañana.
 */
export function DayCloseSheet({ compliance, onDone }: { compliance: DayCompliance; onDone: () => void }) {
  const [visible, setVisible] = useState(true);
  const drag = useSharedValue(0);
  const reduceMotion = useReducedMotion();
  const insets = useSafeAreaInsets();
  const score = complianceScore(compliance);
  const weekday = new Date().toLocaleDateString("es-PE", { weekday: "long" });

  const dismiss = async () => {
    setVisible(false);
    await setSetting(DISMISS_KEY, localDateKey());
    onDone();
  };
  const finish = () => {
    setVisible(false);
    onDone();
  };
  const pan = Gesture.Pan()
    .activeOffsetY(12)
    .onUpdate((event) => {
      drag.value = Math.max(0, event.translationY);
    })
    .onEnd((event) => {
      if (event.translationY > CLOSE || event.velocityY > 900) runOnJS(dismiss)();
      else drag.value = withTiming(0, { duration: 180 });
    });
  const moved = useAnimatedStyle(() => ({ transform: [{ translateY: drag.value }] }));

  return (
    <Modal
      visible={visible}
      transparent
      animationType={reduceMotion ? "fade" : "slide"}
      onRequestClose={dismiss}
      statusBarTranslucent
    >
      <GestureHandlerRootView style={{ flex: 1 }}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "web" ? undefined : "padding"}
          style={{ flex: 1, justifyContent: "flex-end" }}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Cerrar sin responder"
            onPress={dismiss}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: "rgba(0,0,0,0.55)",
            }}
          />
          <GestureDetector gesture={pan}>
            <Animated.View
              accessibilityViewIsModal
              style={[
                {
                  backgroundColor: AppTheme.colors.surface,
                  borderTopLeftRadius: 26,
                  borderTopRightRadius: 26,
                  paddingHorizontal: 20,
                  paddingTop: 10,
                  paddingBottom: 20 + insets.bottom,
                  maxHeight: "90%",
                  gap: 18,
                  width: "100%",
                  maxWidth: 720,
                  alignSelf: "center",
                },
                moved,
              ]}
            >
              <View
                style={{
                  width: 40,
                  height: 4,
                  borderRadius: 2,
                  backgroundColor: AppTheme.colors.border,
                  alignSelf: "center",
                }}
              />
              <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
                <Term expression={score === COMPLIANCE_ITEMS.length ? "muy-feliz" : "feliz"} size={48} />
                <View style={{ flex: 1 }}>
                  <Text style={[AppTheme.title, { fontSize: 21, lineHeight: 25 }]}>Así va tu {weekday}</Text>
                  <Text style={AppTheme.hint}>
                    {score} de {COMPLIANCE_ITEMS.length} objetivos
                  </Text>
                </View>
                <GoalsRing done={compliance} size={58} showCount={false} />
              </View>
              {/* Con letra grande las preguntas no caben: se desplazan. */}
              <ScrollView style={{ flexGrow: 0 }} keyboardShouldPersistTaps="handled">
                <QuickCheckIn onDone={finish} />
              </ScrollView>
              <View style={{ alignItems: "center" }}>
                <LinkButton title="Ahora no" onPress={dismiss} />
              </View>
            </Animated.View>
          </GestureDetector>
        </KeyboardAvoidingView>
      </GestureHandlerRootView>
    </Modal>
  );
}
