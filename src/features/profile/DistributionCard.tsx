import { useEffect, useState } from "react";
import { Text, TextInput, View } from "react-native";

import { Card, Chips } from "@/src/components/ui";
import type { NutritionProfile } from "@/src/features/profile/profile";
import { saveNutritionProfile } from "@/src/features/profile/profile.repository";
import { SCHEDULES, targetsForWeekday, type CalorieSchedule } from "@/src/features/profile/targets";
import { WEEK_DAYS } from "@/src/features/training/training.plans";
import { getRoutine } from "@/src/features/training/training.repository";
import { AppTheme } from "@/src/theme";

const BAR_HEIGHT = 150;
const BAR_WIDTH = 14;

/**
 * Tu semana: cómo se reparten las calorías día a día, con una barra por día
 * partida en proteína, carbohidratos y grasas. Cambiar el reparto no mueve el
 * promedio: la revisión sigue ajustando el objetivo de siempre.
 */
export function DistributionCard({
  profile,
  onChanged,
  readOnly,
}: {
  profile: NutritionProfile;
  onChanged: () => void;
  readOnly?: boolean;
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
  const days = WEEK_DAYS.map((day) => ({
    ...day,
    targets: targetsForWeekday(profile, day.id, trainingDays),
  }));
  const top = Math.max(...days.map((day) => day.targets.calories), profile.calorieTarget, 1);

  return (
    <Card title="Tu semana">
      <View>
        <View style={{ flexDirection: "row", alignItems: "flex-end", height: BAR_HEIGHT + 18 }}>
          {days.map((day) => {
            const { protein, carbs, fats, calories } = day.targets;
            const parts = [
              { kcal: fats * 9, color: AppTheme.colors.fats },
              { kcal: carbs * 4, color: AppTheme.colors.carbs },
              { kcal: protein * 4, color: AppTheme.colors.protein },
            ];
            const sum = parts.reduce((total, part) => total + part.kcal, 0) || 1;
            return (
              <View key={day.id} style={{ flex: 1, alignItems: "center", gap: 4 }}>
                <Text style={[AppTheme.hint, { fontSize: 10, lineHeight: 12 }]}>{calories}</Text>
                <View
                  accessibilityLabel={`${day.label}: ${calories} kcal, ${protein} g de proteína, ${carbs} g de carbohidratos, ${fats} g de grasas`}
                  style={{
                    width: BAR_WIDTH,
                    height: (calories / top) * BAR_HEIGHT,
                    borderRadius: BAR_WIDTH / 2,
                    overflow: "hidden",
                  }}
                >
                  {parts.map((part, index) => (
                    <View key={index} style={{ flex: part.kcal / sum, backgroundColor: part.color }} />
                  ))}
                </View>
              </View>
            );
          })}
        </View>
        {/* Línea del promedio de la semana (tu objetivo). */}
        <View
          pointerEvents="none"
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: (profile.calorieTarget / top) * BAR_HEIGHT,
            borderTopWidth: 1,
            borderStyle: "dashed",
            borderTopColor: AppTheme.colors.muted,
          }}
        />
      </View>
      <View style={{ gap: 3 }}>
        <View style={{ flexDirection: "row" }}>
          {days.map((day) => (
            <Text
              key={day.id}
              style={[
                AppTheme.label,
                { flex: 1, textAlign: "center" },
                trainingDays.includes(day.id) && schedule === "training" && { color: AppTheme.colors.accent },
              ]}
            >
              {day.label}
            </Text>
          ))}
        </View>
        {(
          [
            ["protein", AppTheme.colors.protein],
            ["carbs", AppTheme.colors.carbs],
            ["fats", AppTheme.colors.fats],
          ] as const
        ).map(([key, color]) => (
          <View key={key} style={{ flexDirection: "row" }}>
            {days.map((day) => (
              <Text
                key={day.id}
                style={{ flex: 1, textAlign: "center", fontSize: 11, color, fontWeight: "600" }}
              >
                {day.targets[key]}
              </Text>
            ))}
          </View>
        ))}
      </View>
      <View style={{ flexDirection: "row", justifyContent: "center", gap: 14 }}>
        {(
          [
            ["Proteína (g)", AppTheme.colors.protein],
            ["Carbohidratos (g)", AppTheme.colors.carbs],
            ["Grasas (g)", AppTheme.colors.fats],
          ] as const
        ).map(([label, color]) => (
          <View key={label} style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <View style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: color }} />
            <Text style={AppTheme.hint}>{label}</Text>
          </View>
        ))}
      </View>
      {readOnly ? null : (
        <>
          <Text style={AppTheme.label}>Reparto</Text>
          <Chips
            value={schedule}
            onChange={(calorieSchedule: CalorieSchedule) => save({ calorieSchedule })}
            options={SCHEDULES}
          />
          {schedule === "training" ? (
            <Chips
              value={profile.trainingDayExtra ?? 200}
              onChange={(trainingDayExtra) => save({ trainingDayExtra })}
              options={[100, 200, 300, 400].map((value) => ({ value, label: `+${value}` }))}
            />
          ) : null}
          {schedule === "custom" ? (
            <View style={{ flexDirection: "row", gap: 4 }}>
              {WEEK_DAYS.map((day) => (
                <TextInput
                  key={day.id}
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
                    { flex: 1, paddingHorizontal: 2, textAlign: "center", fontSize: 12 },
                  ]}
                />
              ))}
            </View>
          ) : null}
        </>
      )}
      <Text style={AppTheme.hint}>
        {schedule === "training"
          ? "Los días de entreno (en verde) suben; los de descanso bajan lo justo para que la semana sume lo mismo."
          : schedule === "custom"
            ? "Escribe cuánto subir o bajar cada día; se centra para que el promedio sea tu objetivo."
            : "Mismo objetivo todos los días. El promedio de la semana es lo que ajusta la revisión."}
      </Text>
    </Card>
  );
}
