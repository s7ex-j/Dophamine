import { localDateKey } from "@/src/lib/dates";
import { useCallback, useState } from "react";
import { Alert, ScrollView, Text, View } from "react-native";
import { useFocusEffect } from "expo-router";

import { Button, Card, Input, LinkButton, ListRow, Metric, RowActions, Screen } from "@/src/components/ui";
import {
  deleteDailyBiometrics,
  getLatestBiometrics,
  getRecentBiometrics,
  saveDailyBiometrics,
  type DailyBiometrics,
} from "@/src/features/biometrics/biometrics.repository";
import { weightUnitOf } from "@/src/features/profile/profile";
import { getNutritionProfile } from "@/src/features/profile/profile.repository";
import { formatWeight, toKg, weightValue, type WeightUnit } from "@/src/lib/units";
import { AppTheme } from "@/src/theme";

export default function BiometricsScreen() {
  const [weight, setWeight] = useState("");
  const [entryDate, setEntryDate] = useState(localDateKey());
  const [calories, setCalories] = useState("");
  const [protein, setProtein] = useState("");
  const [carbs, setCarbs] = useState("");
  const [fats, setFats] = useState("");
  const [history, setHistory] = useState<DailyBiometrics[]>([]);
  const [unit, setUnit] = useState<WeightUnit>("kg");

  // Pone un registro en el formulario: el más reciente al abrir, o el día que se elige editar.
  const fillForm = (record: DailyBiometrics, nextUnit: WeightUnit) => {
    setWeight(weightValue(record.weightKg, nextUnit));
    setCalories(record.caloriesIn ? String(record.caloriesIn) : "");
    setProtein(record.proteinG ? String(record.proteinG) : "");
    setCarbs(record.carbsG ? String(record.carbsG) : "");
    setFats(record.fatsG ? String(record.fatsG) : "");
  };
  const load = useCallback(() => {
    Promise.all([getLatestBiometrics(), getRecentBiometrics(), getNutritionProfile()]).then(
      ([record, rows, profile]) => {
        const nextUnit = weightUnitOf(profile);
        setUnit(nextUnit);
        if (record) fillForm(record, nextUnit);
        setHistory(rows);
      },
    );
  }, []);
  useFocusEffect(load);

  const save = async () => {
    const weightKg = toKg(Number(weight), unit);
    if (!Number.isFinite(weightKg) || weightKg <= 0)
      return Alert.alert("Peso requerido", `Introduce un peso válido en ${unit}.`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(entryDate) || entryDate > localDateKey())
      return Alert.alert("Fecha inválida", "Usa una fecha pasada o de hoy con el formato AAAA-MM-DD.");
    await saveDailyBiometrics(
      {
        weightKg,
        caloriesIn: Number(calories) || 0,
        proteinG: Number(protein) || 0,
        carbsG: Number(carbs) || 0,
        fatsG: Number(fats) || 0,
      },
      entryDate,
    );
    load();
    Alert.alert("Guardado", "Tu registro diario se guardó solo en este dispositivo.");
  };
  const edit = (record: DailyBiometrics) => {
    setEntryDate(record.date);
    fillForm(record, unit);
  };
  const remove = async (record: DailyBiometrics) => {
    await deleteDailyBiometrics(record.date);
    if (record.date === entryDate) setEntryDate(localDateKey());
    load();
  };
  const today = entryDate === localDateKey();

  return (
    <Screen>
      <ScrollView contentContainerStyle={AppTheme.content}>
        <Text style={AppTheme.eyebrow}>REGISTRO DIARIO</Text>
        <Text style={AppTheme.title}>Progreso</Text>
        <View style={AppTheme.metricGrid}>
          <Metric label="Registros" value={String(history.length)} />
          <Metric label="Peso reciente" value={history[0] ? formatWeight(history[0].weightKg, unit) : "—"} />
          <Metric
            label="Ingesta reciente"
            value={history[0]?.caloriesIn ? `${history[0].caloriesIn}` : "—"}
          />
          <Metric label="Días visibles" value="7" />
        </View>
        <Card title={today ? "Registro de hoy" : `Editando el ${entryDate}`}>
          <Input label="Fecha" value={entryDate} onChangeText={setEntryDate} placeholder="AAAA-MM-DD" />
          <Input
            label={`Peso (${unit})`}
            value={weight}
            onChangeText={setWeight}
            keyboardType="decimal-pad"
          />
          <Input
            label="Calorías"
            value={calories}
            onChangeText={setCalories}
            keyboardType="number-pad"
            placeholder="Opcional"
          />
          <Input label="Proteína (g)" value={protein} onChangeText={setProtein} keyboardType="number-pad" />
          <Input label="Carbohidratos (g)" value={carbs} onChangeText={setCarbs} keyboardType="number-pad" />
          <Input label="Grasas (g)" value={fats} onChangeText={setFats} keyboardType="number-pad" />
          <Button title={today ? "Guardar registro" : "Guardar cambios"} onPress={save} />
          {today ? null : (
            <Button title="Volver a hoy" variant="secondary" onPress={() => setEntryDate(localDateKey())} />
          )}
        </Card>
        <Card title="Últimos registros">
          {history.length ? (
            history.map((record) => (
              <View key={record.id}>
                <ListRow
                  title={record.date}
                  detail={`${record.caloriesIn} kcal · P ${record.proteinG} · C ${record.carbsG} · G ${record.fatsG}`}
                  value={formatWeight(record.weightKg, unit)}
                />
                <RowActions
                  question={`¿Borrar el registro del ${record.date}?`}
                  onDelete={() => remove(record)}
                >
                  <LinkButton title="Editar" onPress={() => edit(record)} />
                </RowActions>
              </View>
            ))
          ) : (
            <Text style={AppTheme.body}>Aún no hay registros guardados.</Text>
          )}
        </Card>
        <Text style={AppTheme.hint}>
          Puedes corregir o borrar un día pasado: la tendencia y el TDEE se recalculan con lo que queda. El
          TDEE usa peso e ingesta acumulados cuando ya hay suficiente señal.
        </Text>
      </ScrollView>
    </Screen>
  );
}
