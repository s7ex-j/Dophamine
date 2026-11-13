import { useCallback, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { useFocusEffect } from "expo-router";

import { Screen } from "@/src/components/ui";
import { getDashboardSnapshot } from "@/src/features/dashboard/dashboard.repository";
import { explainAlgorithm, type AlgorithmStep } from "@/src/features/tdee/explain";
import { localDateKey } from "@/src/lib/dates";
import { AppTheme } from "@/src/theme";

// "Cómo se calcula": el algoritmo como una cadena de pasos, cada uno con su
// fórmula y lo que dio con tus datos. Se lee de arriba abajo.
export default function AlgorithmScreen() {
  const [steps, setSteps] = useState<AlgorithmStep[] | null>(null);
  useFocusEffect(
    useCallback(() => {
      getDashboardSnapshot().then((snapshot) => setSteps(explainAlgorithm(snapshot, localDateKey())));
    }, []),
  );
  if (!steps) return <Screen />;
  return (
    <Screen>
      <ScrollView contentContainerStyle={AppTheme.content}>
        <Text style={AppTheme.body}>
          Así llega Dophamine a tu objetivo de calorías. Al principio usa fórmulas; con dos semanas de datos,
          tu propio cuerpo manda: lo que comes y cómo cambia tu peso.
        </Text>
        {!steps.length ? (
          <Text style={AppTheme.body}>Completa tu plan inicial para ver el cálculo.</Text>
        ) : null}
        <View>
          {steps.map((step, index) => (
            <View key={step.id} style={{ flexDirection: "row", gap: 12 }}>
              <View style={{ alignItems: "center", width: 28 }}>
                <View
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 14,
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: step.pending ? AppTheme.colors.surface2 : AppTheme.colors.accent,
                  }}
                >
                  <Text
                    style={{
                      fontWeight: "700",
                      color: step.pending ? AppTheme.colors.muted : AppTheme.colors.onAccent,
                    }}
                  >
                    {index + 1}
                  </Text>
                </View>
                {index < steps.length - 1 ? (
                  <View
                    style={{ flex: 1, width: 2, backgroundColor: AppTheme.colors.border, marginVertical: 4 }}
                  />
                ) : null}
              </View>
              <View style={[AppTheme.card, { flex: 1, gap: 6, marginBottom: 12 }]}>
                <Text style={AppTheme.tileSubtitle}>{step.title}</Text>
                <Text style={[AppTheme.tileValue, step.pending && { color: AppTheme.colors.muted }]}>
                  {step.value}
                </Text>
                <Text style={AppTheme.body}>{step.detail}</Text>
                <View style={{ backgroundColor: AppTheme.colors.surface2, borderRadius: 8, padding: 8 }}>
                  <Text style={[AppTheme.hint, { fontFamily: "monospace" }]}>{step.formula}</Text>
                </View>
              </View>
            </View>
          ))}
        </View>
        <Text style={AppTheme.hint}>
          Todo es una estimación, no un diagnóstico. El cálculo corre en tu teléfono; nada se envía.
        </Text>
      </ScrollView>
    </Screen>
  );
}
