import { useCallback, useState } from "react";
import { Alert, ScrollView, Text } from "react-native";
import { useFocusEffect } from "expo-router";

import { Button, Card, Input, ListRow, Screen } from "@/src/components/ui";
import { getLatestBiometrics, getRecentBiometrics, saveDailyBiometrics, type DailyBiometrics } from "@/src/features/biometrics/biometrics.repository";
import { AppTheme } from "@/src/theme";

export default function BiometricsScreen() {
  const [weight, setWeight] = useState("");
  const [calories, setCalories] = useState("");
  const [protein, setProtein] = useState("");
  const [carbs, setCarbs] = useState("");
  const [fats, setFats] = useState("");
  const [history, setHistory] = useState<DailyBiometrics[]>([]);
  const load = useCallback(() => { Promise.all([getLatestBiometrics(), getRecentBiometrics()]).then(([record, rows]) => { if (record) setWeight(String(record.weightKg)); setHistory(rows); }); }, []);
  useFocusEffect(load);

  const save = async () => {
    const weightKg = Number(weight);
    if (!Number.isFinite(weightKg) || weightKg <= 0) return Alert.alert("Peso requerido", "Introduce un peso válido en kilogramos.");
    await saveDailyBiometrics({ weightKg, caloriesIn: Number(calories) || 0, proteinG: Number(protein) || 0, carbsG: Number(carbs) || 0, fatsG: Number(fats) || 0 });
    load();
    Alert.alert("Guardado", "Tu registro diario se guardó solo en este dispositivo.");
  };

  return <Screen><ScrollView contentContainerStyle={AppTheme.content}>
    <Text style={AppTheme.title}>Progreso</Text>
    <Card title="Registro de hoy">
      <Input label="Peso (kg)" value={weight} onChangeText={setWeight} keyboardType="decimal-pad" />
      <Input label="Calorías" value={calories} onChangeText={setCalories} keyboardType="number-pad" />
      <Input label="Proteína (g)" value={protein} onChangeText={setProtein} keyboardType="number-pad" />
      <Input label="Carbohidratos (g)" value={carbs} onChangeText={setCarbs} keyboardType="number-pad" />
      <Input label="Grasas (g)" value={fats} onChangeText={setFats} keyboardType="number-pad" />
      <Button title="Guardar registro" onPress={save} />
    </Card>
    <Card title="Últimos registros">
      {history.length ? history.map((record) => <ListRow key={record.id} title={record.date} detail={`${record.caloriesIn} kcal · P ${record.proteinG} · C ${record.carbsG} · G ${record.fatsG}`} value={`${record.weightKg} kg`} />) : <Text style={AppTheme.body}>Aún no hay registros guardados.</Text>}
    </Card>
    <Text style={AppTheme.hint}>El cálculo de TDEE usará el peso y la ingesta acumulados cuando existan suficientes días.</Text>
  </ScrollView></Screen>;
}

