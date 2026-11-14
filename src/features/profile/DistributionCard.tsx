import { useEffect, useState } from "react";
import { Text, TextInput, View } from "react-native";

import { Card, Chips, OptionList } from "@/src/components/ui";
import type { NutritionProfile } from "@/src/features/profile/profile";
import { saveNutritionProfile } from "@/src/features/profile/profile.repository";
import {
  DIET_TYPES,
  SCHEDULES,
  targetsForWeekday,
  type CalorieSchedule,
  type DietType,
} from "@/src/features/profile/targets";
import { WEEK_DAYS } from "@/src/features/training/training.plans";
import { getRoutine } from "@/src/features/training/training.repository";
import { AppTheme } from "@/src/theme";

/**
 * Tipo de plan y reparto semanal. Cambiarlo no mueve el promedio: la revisión
 * sigue ajustando el objetivo de siempre.
 */
export function DistributionCard({
  profile,
  onChanged,
}: {
  profile: NutritionProfile;
  onChanged: () => void;
}) {
  const [trainingDays, setTrainingDays] = useState<string[]>([]);
  useEffect(() => {
    getRoutine().then((routine) => setTrainingDays(routine.days));
  }, []);
  const save = async (patch: Partial<NutritionProfile>) => {
    await saveNutritionProfile({ ...profile, ...patch });
    onChanged();
  };
  const schedule = profile.calorieSchedule ?? "even";
  return (
    <Card title="Reparto de tus calorías">
      <Text style={AppTheme.label}>Tipo de plan</Text>
      <OptionList
        value={profile.dietType ?? ("" as DietType)}
        onChange={(dietType) => save({ dietType })}
        options={DIET_TYPES.map((item) => ({ value: item.value, label: item.label, detail: item.detail }))}
      />
      <Text style={AppTheme.label}>Durante la semana</Text>
      <Chips
        value={schedule}
        onChange={(calorieSchedule: CalorieSchedule) => save({ calorieSchedule })}
        options={SCHEDULES}
      />
      {schedule === "training" ? (
        <Chips
          value={profile.trainingDayExtra ?? 200}
          onChange={(trainingDayExtra) => save({ trainingDayExtra })}
          options={[100, 200, 300, 400].map((value) => ({ value, label: `+${value} kcal` }))}
        />
      ) : null}
      <View style={{ flexDirection: "row", gap: 4 }}>
        {WEEK_DAYS.map((day) => {
          const targets = targetsForWeekday(profile, day.id, trainingDays);
          return (
            <View key={day.id} style={{ flex: 1, alignItems: "center", gap: 4 }}>
              <Text style={AppTheme.hint}>{day.label}</Text>
              {schedule === "custom" ? (
                <TextInput
                  accessibilityLabel={`Ajuste del ${day.label}`}
                  defaultValue={String(profile.customDayOffsets?.[day.id] ?? 0)}
                  keyboardType="numbers-and-punctuation"
                  onEndEditing={(event) =>
                    save({
                      customDayOffsets: {
                        ...(profile.customDayOffsets ?? {}),
                        [day.id]: Number(event.nativeEvent.text) || 0,
                      },
                    })
                  }
                  style={[
                    AppTheme.input,
                    { width: "100%", paddingHorizontal: 2, textAlign: "center", fontSize: 12 },
                  ]}
                />
              ) : null}
              <Text style={[AppTheme.tileTitle, { fontSize: 12 }]}>{targets.calories}</Text>
              <Text style={[AppTheme.hint, { fontSize: 10 }]}>
                {targets.protein}P {targets.carbs}C {targets.fats}G
              </Text>
            </View>
          );
        })}
      </View>
      <Text style={AppTheme.hint}>
        {schedule === "training"
          ? "Los días de entreno de tu rutina suben; los de descanso bajan lo justo para que la semana sume lo mismo."
          : schedule === "custom"
            ? "Escribe cuánto subir o bajar cada día; se centra para que el promedio sea tu objetivo."
            : "El promedio de la semana es tu objetivo; la revisión lo ajusta."}
      </Text>
    </Card>
  );
}
