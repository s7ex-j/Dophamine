import { useState } from "react";
import { Alert, ScrollView, Text } from "react-native";

import { Button, Card, ChoiceControl, Input, Screen } from "@/src/components/ui";
import { saveDailyBiometrics } from "@/src/features/biometrics/biometrics.repository";
import { isValidPlanInput } from "@/src/features/profile/planInput";
import {
  activityLabels,
  buildNutritionProfile,
  goalLabels,
  weightUnitOf,
  type ActivityLevel,
  type Goal,
  type NutritionProfile,
  type Sex,
} from "@/src/features/profile/profile";
import { saveNutritionProfile } from "@/src/features/profile/profile.repository";
import { toKg, WEIGHT_UNIT_OPTIONS, weightValue, type WeightUnit } from "@/src/lib/units";
import { AppTheme } from "@/src/theme";

/**
 * Formulario del plan: sirve para la configuración inicial (sin perfil) y para
 * editar un plan existente. Guarda el perfil y, si aún no hay ningún pesaje,
 * registra el peso indicado como primer dato.
 */
export function PlanForm({
  profile,
  weightKg,
  onSaved,
}: {
  profile: NutritionProfile | null;
  weightKg: number | null;
  onSaved: () => void;
}) {
  const [age, setAge] = useState(profile ? String(profile.age) : "");
  const [height, setHeight] = useState(profile ? String(profile.heightCm) : "");
  const [unit, setUnit] = useState<WeightUnit>(weightUnitOf(profile));
  const [weight, setWeight] = useState(profile && weightKg ? weightValue(weightKg, unit) : "");
  const [sex, setSex] = useState<Sex>(profile?.sex ?? "male");
  const [activity, setActivity] = useState<ActivityLevel>(profile?.activity ?? "moderate");
  const [goal, setGoal] = useState<Goal>(profile?.goal ?? "gain");

  // Al cambiar de unidad se convierte lo ya escrito, para no guardar 170 lb como 170 kg.
  const changeUnit = (next: WeightUnit) => {
    if (Number(weight) > 0) setWeight(weightValue(toKg(Number(weight), unit), next));
    setUnit(next);
  };

  const savePlan = async () => {
    const values = { age: Number(age), heightCm: Number(height), weightKg: toKg(Number(weight), unit) };
    if (!isValidPlanInput(values))
      return Alert.alert("Revisa tus datos", "Introduce edad, altura y peso dentro de rangos razonables.");
    await saveNutritionProfile(buildNutritionProfile({ ...values, sex, activity, goal, weightUnit: unit }));
    if (weightKg === null)
      await saveDailyBiometrics({
        weightKg: values.weightKg,
        caloriesIn: 0,
        proteinG: 0,
        carbsG: 0,
        fatsG: 0,
      });
    onSaved();
  };

  return (
    <Screen>
      <ScrollView contentContainerStyle={AppTheme.content}>
        <Text style={AppTheme.eyebrow}>CONFIGURACIÓN INICIAL</Text>
        <Text style={AppTheme.title}>Construyamos tu plan.</Text>
        <Card title="Datos de referencia">
          <Input label="Edad" value={age} onChangeText={setAge} keyboardType="number-pad" />
          <Input label="Altura (cm)" value={height} onChangeText={setHeight} keyboardType="number-pad" />
          <Text style={AppTheme.label}>Unidad de peso</Text>
          <ChoiceControl value={unit} onChange={changeUnit} options={WEIGHT_UNIT_OPTIONS} />
          <Input
            label={`Peso actual (${unit})`}
            value={weight}
            onChangeText={setWeight}
            keyboardType="decimal-pad"
          />
          <Text style={AppTheme.label}>Sexo biológico</Text>
          <ChoiceControl
            value={sex}
            onChange={setSex}
            options={[
              { value: "male", label: "Hombre" },
              { value: "female", label: "Mujer" },
            ]}
          />
        </Card>
        <Card title="Tu contexto">
          <Text style={AppTheme.label}>Actividad habitual</Text>
          <ChoiceControl
            value={activity}
            onChange={setActivity}
            options={(Object.keys(activityLabels) as ActivityLevel[]).map((value) => ({
              value,
              label: activityLabels[value],
            }))}
          />
          <Text style={AppTheme.label}>Objetivo</Text>
          <ChoiceControl
            value={goal}
            onChange={setGoal}
            options={(Object.keys(goalLabels) as Goal[]).map((value) => ({
              value,
              label: goalLabels[value],
            }))}
          />
          <Button title="Crear mi plan" onPress={savePlan} />
        </Card>
      </ScrollView>
    </Screen>
  );
}
