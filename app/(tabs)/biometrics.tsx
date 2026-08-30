import { useCallback, useState } from "react";
import { Alert, ScrollView, Text, TextInput, View } from "react-native";
import { useFocusEffect } from "expo-router";

import { Button, Card, Input, Screen } from "@/src/components/ui";
import { getLatestBiometrics, saveDailyBiometrics } from "@/src/features/biometrics/biometrics.repository";
import { AppTheme } from "@/src/theme";

export default function BiometricsScreen() {
  const [weight, setWeight] = useState("");
  const [calories, setCalories] = useState("");
  const [protein, setProtein] = useState("");
  const load = useCallback(() => { getLatestBiometrics().then((record) => { if (record) setWeight(String(record.weightKg)); }); }, []);
  useFocusEffect(load);

  const save = async () => {
    const weightKg = Number(weight);
    if (!Number.isFinite(weightKg) || weightKg <= 0) return Alert.alert("Peso requerido", "Introduce un peso válido en kilogramos.");
    await saveDailyBiometrics({ weightKg, caloriesIn: Number(calories) || 0, proteinG: Number(protein) || 0 });
    Alert.alert("Guardado", "Tu registro diario se guardó solo en este dispositivo.");
  };

  return <Screen><ScrollView contentContainerStyle={AppTheme.content}>
    <Text style={AppTheme.title}>Progreso</Text>
    <Card title="Registro de hoy">
      <Input label="Peso (kg)" value={weight} onChangeText={setWeight} keyboardType="decimal-pad" />
      <Input label="Calorías" value={calories} onChangeText={setCalories} keyboardType="number-pad" />
      <Input label="Proteína (g)" value={protein} onChangeText={setProtein} keyboardType="number-pad" />
      <Button title="Guardar registro" onPress={save} />
    </Card>
    <Text style={AppTheme.hint}>El cálculo de TDEE usará el peso y la ingesta acumulados cuando existan suficientes días.</Text>
  </ScrollView></Screen>;
}

