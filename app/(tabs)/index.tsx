import { useCallback, useEffect, useState } from "react";
import { Alert, ScrollView, Text, View } from "react-native";
import { useFocusEffect } from "expo-router";

import { getDashboardSnapshot, type DashboardSnapshot } from "@/src/features/dashboard/dashboard.repository";
import { Button, Card, ChoiceControl, Input, ListRow, Metric, Screen } from "@/src/components/ui";
import { AppTheme } from "@/src/theme";
import { buildNutritionProfile, activityLabels, goalLabels, type ActivityLevel, type Goal, type Sex } from "@/src/features/profile/profile";
import { saveNutritionProfile } from "@/src/features/profile/profile.repository";
import { saveDailyBiometrics } from "@/src/features/biometrics/biometrics.repository";

export default function DashboardScreen() {
  const [snapshot, setSnapshot] = useState<DashboardSnapshot | null>(null);
  const [editingPlan, setEditingPlan] = useState(false);
  const [age, setAge] = useState("");
  const [height, setHeight] = useState("");
  const [weight, setWeight] = useState("");
  const [sex, setSex] = useState<Sex>("male");
  const [activity, setActivity] = useState<ActivityLevel>("moderate");
  const [goal, setGoal] = useState<Goal>("gain");
  const load = useCallback(() => { getDashboardSnapshot().then(setSnapshot); }, []);
  useEffect(load, [load]);
  useFocusEffect(load);

  const openPlan = () => {
    const profile = snapshot?.profile;
    setAge(profile ? String(profile.age) : "");
    setHeight(profile ? String(profile.heightCm) : "");
    setWeight(snapshot?.weightKg ? String(snapshot.weightKg) : "");
    setSex(profile?.sex ?? "male"); setActivity(profile?.activity ?? "moderate"); setGoal(profile?.goal ?? "gain");
    setEditingPlan(true);
  };
  const savePlan = async () => {
    const values = { age: Number(age), heightCm: Number(height), weightKg: Number(weight) };
    if (!Number.isInteger(values.age) || values.age < 13 || values.age > 100 || values.heightCm < 120 || values.heightCm > 230 || values.weightKg <= 30 || values.weightKg > 300) {
      return Alert.alert("Revisa tus datos", "Introduce edad, altura y peso dentro de rangos razonables.");
    }
    await saveNutritionProfile(buildNutritionProfile({ ...values, sex, activity, goal }));
    if (snapshot?.weightKg === null) await saveDailyBiometrics({ weightKg: values.weightKg, caloriesIn: 0, proteinG: 0, carbsG: 0, fatsG: 0 });
    setEditingPlan(false); load();
  };

  if (!snapshot) return <Screen />;
  if (!snapshot.profile || editingPlan) return <Screen><ScrollView contentContainerStyle={AppTheme.content}>
    <Text style={AppTheme.eyebrow}>CONFIGURACIÓN INICIAL</Text><Text style={AppTheme.title}>Construyamos tu plan.</Text>
    <Card title="Datos de referencia">
      <Input label="Edad" value={age} onChangeText={setAge} keyboardType="number-pad" />
      <Input label="Altura (cm)" value={height} onChangeText={setHeight} keyboardType="number-pad" />
      <Input label="Peso actual (kg)" value={weight} onChangeText={setWeight} keyboardType="decimal-pad" />
      <Text style={AppTheme.label}>Sexo biológico</Text><ChoiceControl value={sex} onChange={setSex} options={[{ value: "male", label: "Hombre" }, { value: "female", label: "Mujer" }]} />
    </Card>
    <Card title="Tu contexto"><Text style={AppTheme.label}>Actividad habitual</Text><ChoiceControl value={activity} onChange={setActivity} options={(Object.keys(activityLabels) as ActivityLevel[]).map((value) => ({ value, label: activityLabels[value] }))} /><Text style={AppTheme.label}>Objetivo</Text><ChoiceControl value={goal} onChange={setGoal} options={(Object.keys(goalLabels) as Goal[]).map((value) => ({ value, label: goalLabels[value] }))} /><Button title="Crear mi plan" onPress={savePlan} /></Card>
    <Text style={AppTheme.hint}>El plan inicial es una estimación. Dophamine lo contrastará con tu peso e ingesta registrados para afinarlo.</Text>
  </ScrollView></Screen>;

  const { profile } = snapshot;
  const calorieRemaining = profile.calorieTarget - (snapshot.caloriesIn ?? 0);
  const proteinRemaining = profile.proteinTarget - (snapshot.proteinG ?? 0);

  return (
    <Screen>
      <ScrollView contentContainerStyle={AppTheme.content}>
        <Text style={AppTheme.eyebrow}>{goalLabels[profile.goal].toUpperCase()}</Text>
        <Text style={AppTheme.title}>Tu día, en orden.</Text>
        <View style={AppTheme.metricGrid}>
          <Metric label="Peso" value={snapshot?.weightKg ? `${snapshot.weightKg} kg` : "--"} />
          <Metric label="Calorías" value={`${snapshot.caloriesIn ?? 0} / ${profile.calorieTarget}`} />
          <Metric label="Proteína" value={`${snapshot.proteinG ?? 0} / ${profile.proteinTarget} g`} />
          <Metric label="Estado" value={snapshot?.mood ? `${snapshot.mood}/5` : "--"} />
        </View>
        <Card title="Checklist de hoy">
          <ListRow title="Calorías" detail={calorieRemaining >= 0 ? `Te faltan ${calorieRemaining} kcal para tu objetivo` : `Vas ${Math.abs(calorieRemaining)} kcal por encima`} value={snapshot.caloriesIn === null ? "Pendiente" : "Registrado"} />
          <ListRow title="Proteína" detail={proteinRemaining > 0 ? `Te faltan ${proteinRemaining} g` : "Mínimo alcanzado"} value={snapshot.proteinG === null ? "Pendiente" : "Registrado"} />
          <ListRow title="Entrenamiento" detail="Registra la rutina cuando la completes" value="Opcional" />
          <ListRow title="Bienestar" detail="Un chequeo breve también cuenta" value={snapshot.mood ? "Hecho" : "Pendiente"} />
        </Card>
        <Card title="Tu plan"><ListRow title="Objetivo diario" detail={`${profile.proteinTarget} g proteína · ${profile.carbsTarget} g carbohidratos · ${profile.fatsTarget} g grasas`} value={`${profile.calorieTarget} kcal`} /><ListRow title="TDEE observado" detail={snapshot.tdee ? "Basado en tendencia de peso e ingesta" : "Disponible tras 14 registros"} value={snapshot.tdee ? `${snapshot.tdee} kcal` : "--"} /><Button title="Editar plan" onPress={openPlan} variant="secondary" /></Card>
        <Card title="Privacidad">
          <Text style={AppTheme.body}>Esta primera versión funciona sin cuenta y conserva los datos en este dispositivo.</Text>
        </Card>
      </ScrollView>
    </Screen>
  );
}

