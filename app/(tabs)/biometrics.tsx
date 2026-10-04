import { useCallback, useState } from "react";
import { Alert, ScrollView, Text, View } from "react-native";
import { useFocusEffect } from "expo-router";

import { Button, Card, Input, ListRow, Metric, Screen } from "@/src/components/ui";
import { getLatestBiometrics, getRecentBiometrics, saveDailyBiometrics, type DailyBiometrics } from "@/src/features/biometrics/biometrics.repository";
import { AppTheme } from "@/src/theme";

export default function BiometricsScreen() {
  const [weight, setWeight] = useState("");
  const [entryDate, setEntryDate] = useState(new Date().toISOString().slice(0, 10));
  const [calories, setCalories] = useState("");
  const [protein, setProtein] = useState("");
  const [carbs, setCarbs] = useState("");
  const [fats, setFats] = useState("");
  const [history, setHistory] = useState<DailyBiometrics[]>([]);
  const load = useCallback(() => { Promise.all([getLatestBiometrics(), getRecentBiometrics()]).then(([record, rows]) => { if (record) { setWeight(String(record.weightKg)); setCalories(record.caloriesIn ? String(record.caloriesIn) : ""); setProtein(record.proteinG ? String(record.proteinG) : ""); setCarbs(record.carbsG ? String(record.carbsG) : ""); setFats(record.fatsG ? String(record.fatsG) : ""); } setHistory(rows); }); }, []);
  useFocusEffect(load);

  const save = async () => {
    const weightKg = Number(weight);
    if (!Number.isFinite(weightKg) || weightKg <= 0) return Alert.alert("Peso requerido", "Introduce un peso válido en kilogramos.");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(entryDate) || entryDate > new Date().toISOString().slice(0, 10)) return Alert.alert("Fecha inválida", "Usa una fecha pasada o de hoy con el formato AAAA-MM-DD.");
    await saveDailyBiometrics({ weightKg, caloriesIn: Number(calories) || 0, proteinG: Number(protein) || 0, carbsG: Number(carbs) || 0, fatsG: Number(fats) || 0 }, entryDate);
    load();
    Alert.alert("Guardado", "Tu registro diario se guardó solo en este dispositivo.");
  };

  return <Screen><ScrollView contentContainerStyle={AppTheme.content}>
    <Text style={AppTheme.eyebrow}>REGISTRO DIARIO</Text><Text style={AppTheme.title}>Progreso</Text>
    <View style={AppTheme.metricGrid}><Metric label="Registros" value={String(history.length)} /><Metric label="Peso reciente" value={history[0] ? `${history[0].weightKg} kg` : "—"} /><Metric label="Ingesta reciente" value={history[0]?.caloriesIn ? `${history[0].caloriesIn}` : "—"} /><Metric label="Días visibles" value="7" /></View>
    <Card title="Registro de hoy">
      <Input label="Fecha" value={entryDate} onChangeText={setEntryDate} placeholder="AAAA-MM-DD" />
      <Input label="Peso (kg)" value={weight} onChangeText={setWeight} keyboardType="decimal-pad" />
      <Input label="Calorías" value={calories} onChangeText={setCalories} keyboardType="number-pad" placeholder="Opcional" />
      <Input label="Proteína (g)" value={protein} onChangeText={setProtein} keyboardType="number-pad" />
      <Input label="Carbohidratos (g)" value={carbs} onChangeText={setCarbs} keyboardType="number-pad" />
      <Input label="Grasas (g)" value={fats} onChangeText={setFats} keyboardType="number-pad" />
      <Button title="Guardar registro" onPress={save} />
    </Card>
    <Card title="Últimos registros">
      {history.length ? history.map((record) => <ListRow key={record.id} title={record.date} detail={`${record.caloriesIn} kcal · P ${record.proteinG} · C ${record.carbsG} · G ${record.fatsG}`} value={`${record.weightKg} kg`} />) : <Text style={AppTheme.body}>Aún no hay registros guardados.</Text>}
    </Card>
    <Text style={AppTheme.hint}>Puedes corregir un día pasado: un registro reemplaza el de la misma fecha y actualiza los cálculos. El TDEE usa peso e ingesta acumulados cuando ya hay suficiente señal.</Text>
  </ScrollView></Screen>;
}
