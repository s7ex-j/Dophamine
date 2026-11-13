import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";

import { BodyMap } from "@/src/components/BodyMap";
import { DetailChart } from "@/src/components/DetailChart";
import { Button, Card, Chips, RowActions } from "@/src/components/ui";
import { findExercise } from "@/src/features/exercises/catalog";
import { ExerciseImage } from "@/src/features/exercises/ExerciseImage";
import { workoutFor, type Routine } from "@/src/features/training/training.plans";
import {
  SETS_TARGET,
  type ExerciseBest,
  type MuscleLoad,
  type WeekDayStatus,
  type WeekVolume,
} from "@/src/features/training/week";
import { sessionStats, type CompletedSession } from "@/src/features/training/workout";
import { localDateKey } from "@/src/lib/dates";
import { convertWeight, formatWeight, type WeightUnit } from "@/src/lib/units";
import { AppTheme } from "@/src/theme";

// Las secciones de la pantalla "Entreno". La pantalla carga los datos y aquí solo se dibuja.

export const DAY_NAMES: Record<string, string> = {
  mon: "Lunes",
  tue: "Martes",
  wed: "Miércoles",
  thu: "Jueves",
  fri: "Viernes",
  sat: "Sábado",
  sun: "Domingo",
};

/** La semana en una fila: qué toca cada día y qué ya se hizo. Tocar un día lo muestra abajo. */
export function WeekStrip({
  week,
  selected,
  onSelect,
}: {
  week: WeekDayStatus[];
  selected: string;
  onSelect: (day: string) => void;
}) {
  return (
    <View style={{ flexDirection: "row", gap: 6 }}>
      {week.map((day) => {
        const active = day.day === selected;
        const done = day.done > 0;
        const missed = day.isPast && day.workout && !done;
        return (
          <Pressable
            key={day.day}
            accessibilityRole="button"
            accessibilityLabel={`${DAY_NAMES[day.day]}: ${
              done ? "entrenado" : day.workout ? day.workout : "descanso"
            }`}
            accessibilityState={{ selected: active }}
            onPress={() => onSelect(day.day)}
            style={{
              flex: 1,
              alignItems: "center",
              gap: 6,
              paddingVertical: 10,
              borderRadius: 14,
              backgroundColor: active ? AppTheme.colors.surface2 : "transparent",
              borderWidth: 1,
              borderColor: day.isToday ? AppTheme.colors.accent : "transparent",
            }}
          >
            <Text
              style={[AppTheme.hint, day.isToday && { color: AppTheme.colors.accent, fontWeight: "700" }]}
            >
              {day.label}
            </Text>
            <View
              style={{
                width: 30,
                height: 30,
                borderRadius: 15,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: done ? AppTheme.colors.accent : "transparent",
                borderWidth: day.workout && !done ? 2 : 0,
                borderColor: missed ? AppTheme.colors.border : AppTheme.colors.accent,
              }}
            >
              {done ? (
                <Ionicons name="checkmark" size={18} color={AppTheme.colors.onAccent} />
              ) : day.workout ? (
                <Ionicons
                  name="barbell"
                  size={14}
                  color={missed ? AppTheme.colors.muted : AppTheme.colors.accent}
                />
              ) : (
                <Text style={AppTheme.hint}>·</Text>
              )}
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

/** El entreno del día elegido: sus ejercicios con imagen y el botón para empezarlo. */
export function DayWorkoutCard({
  routine,
  day,
  isToday,
  resumable,
  onStart,
  onResume,
  openExercise,
}: {
  routine: Routine;
  day: string;
  isToday: boolean;
  resumable: boolean;
  onStart: (day: string) => void;
  onResume: () => void;
  openExercise: (name: string) => void;
}) {
  const workout = workoutFor(routine, day);
  if (resumable)
    return (
      <View style={[AppTheme.card, { gap: 12 }]}>
        <Text style={AppTheme.tileTitle}>Tienes un entreno abierto</Text>
        <Button title="Continuar entreno" onPress={onResume} />
      </View>
    );
  if (!workout)
    return (
      <View style={[AppTheme.card, { gap: 12 }]}>
        <View style={AppTheme.iconRow}>
          <View style={[AppTheme.iconChip, { backgroundColor: AppTheme.colors.blueSoft }]}>
            <Ionicons name="bed-outline" size={22} color={AppTheme.colors.blue} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={AppTheme.tileTitle}>
              {isToday ? "Hoy descansas" : `${DAY_NAMES[day]}: descanso`}
            </Text>
            <Text style={AppTheme.tileSubtitle}>Si igual quieres entrenar, elige uno:</Text>
          </View>
        </View>
        <View style={AppTheme.chipRow}>
          {routine.schedule.map((item) => (
            <Pressable
              key={item.day}
              accessibilityRole="button"
              onPress={() => onStart(item.day)}
              style={AppTheme.chip}
            >
              <Text style={AppTheme.chipText}>{item.name}</Text>
            </Pressable>
          ))}
        </View>
      </View>
    );
  const sets = workout.exercises.reduce((sum, item) => sum + item.sets, 0);
  return (
    <View style={[AppTheme.card, { gap: 12 }]}>
      <View>
        <Text style={AppTheme.eyebrow}>{(isToday ? "HOY · " : "") + DAY_NAMES[day].toUpperCase()}</Text>
        <Text style={AppTheme.title}>{workout.name}</Text>
        <Text style={AppTheme.tileSubtitle}>
          {workout.exercises.length} ejercicios · {sets} series
        </Text>
      </View>
      {workout.exercises.map((exercise) => (
        <Pressable
          key={exercise.name}
          accessibilityRole="button"
          onPress={() => openExercise(exercise.name)}
          style={{ flexDirection: "row", alignItems: "center", gap: 12 }}
        >
          <ExerciseImage media={findExercise(exercise.name)?.media} size={46} />
          <View style={{ flex: 1 }}>
            <Text style={AppTheme.entryName}>{exercise.name}</Text>
            <Text style={AppTheme.entryDetail}>
              {exercise.sets} × {exercise.reps} · RIR {exercise.rir}
            </Text>
          </View>
        </Pressable>
      ))}
      <Button title={`Empezar ${workout.name}`} onPress={() => onStart(day)} />
    </View>
  );
}

/** Lo hecho esta semana frente a lo planeado. */
export function WeekTotals({
  week,
  current,
  unit,
}: {
  week: WeekDayStatus[];
  current: WeekVolume;
  unit: WeightUnit;
}) {
  const planned = week.filter((day) => day.workout).length;
  const tiles: Array<[string, string]> = [
    ["Sesiones", `${current.sessions}/${planned}`],
    ["Series", String(current.sets)],
    ["Volumen", formatWeight(current.volumeKg, unit, 0)],
  ];
  return (
    <View style={{ flexDirection: "row", gap: 10 }}>
      {tiles.map(([label, value]) => (
        <View key={label} style={[AppTheme.tile, { flex: 1, minWidth: 0, flexBasis: 0 }]}>
          <Text style={AppTheme.tileSubtitle}>{label}</Text>
          <Text style={AppTheme.tileValue}>{value}</Text>
        </View>
      ))}
    </View>
  );
}

/** Series o volumen de las últimas 8 semanas. */
export function VolumeCard({ weeks, unit }: { weeks: WeekVolume[]; unit: WeightUnit }) {
  const [metric, setMetric] = useState<"sets" | "volume" | "sessions">("sets");
  const any = weeks.some((week) => week.sets > 0);
  const labels = { sets: "Series", volume: "Volumen", sessions: "Sesiones" };
  return (
    <Card title="Semana a semana">
      <Chips
        value={metric}
        onChange={setMetric}
        options={(Object.keys(labels) as Array<keyof typeof labels>).map((value) => ({
          value,
          label: labels[value],
        }))}
      />
      {any ? (
        <DetailChart
          key={metric}
          insight={{
            title: labels[metric],
            unit: metric === "volume" ? unit : metric === "sets" ? "series" : "sesiones",
            dates: weeks.map((week) => week.weekStart),
            series: [
              {
                label: labels[metric],
                color: metric === "volume" ? "blue" : "accent",
                kind: "bars",
                values: weeks.map((week) =>
                  metric === "volume"
                    ? Math.round(convertWeight(week.volumeKg, "kg", unit))
                    : metric === "sets"
                      ? week.sets
                      : week.sessions,
                ),
              },
            ],
          }}
        />
      ) : (
        <Text style={AppTheme.body}>
          Con tus primeras sesiones verás aquí cómo crece tu trabajo semana a semana.
        </Text>
      )}
    </Card>
  );
}

/** El mapa muscular de la semana y los músculos que más trabajaron. */
export function MuscleMapCard({ loads }: { loads: MuscleLoad[] }) {
  const worked = loads.filter((item) => item.sets > 0).sort((a, b) => b.sets - a.sets);
  return (
    <Card title="Músculos esta semana">
      <BodyMap loads={loads} />
      {worked.length ? (
        <View style={AppTheme.chipRow}>
          {worked.map((item) => (
            <View key={item.muscle} style={AppTheme.badge}>
              <Text style={AppTheme.badgeText}>
                {item.label} · {item.sets}
              </Text>
            </View>
          ))}
        </View>
      ) : null}
      <Text style={AppTheme.hint}>
        Series efectivas: 1 si el músculo es principal y ½ si es secundario. Para ganar músculo se suele
        apuntar a {SETS_TARGET.min}–{SETS_TARGET.max} por semana.
      </Text>
    </Card>
  );
}

/** Cada ejercicio hecho con su mejor serie de la última vez. */
export function BestsCard({
  bests,
  unit,
  openExercise,
}: {
  bests: ExerciseBest[];
  unit: WeightUnit;
  openExercise: (name: string) => void;
}) {
  if (!bests.length) return null;
  return (
    <Card title="Tus ejercicios">
      {bests.slice(0, 12).map((item) => (
        <Pressable
          key={item.name}
          accessibilityRole="button"
          onPress={() => openExercise(item.name)}
          style={[AppTheme.entryRow, { gap: 12 }]}
        >
          <ExerciseImage media={findExercise(item.name)?.media} size={42} />
          <View style={{ flex: 1 }}>
            <Text style={AppTheme.entryName}>{item.name}</Text>
            <Text style={AppTheme.entryDetail}>
              {item.lastBest
                ? `${formatWeight(item.lastBest.loadKg, unit, 1)} × ${item.lastBest.reps}`
                : "Sin carga"}{" "}
              · {item.sessions} {item.sessions === 1 ? "vez" : "veces"}
            </Text>
          </View>
          {item.changeKg !== null && item.changeKg !== 0 ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 2 }}>
              <Ionicons
                name={item.changeKg > 0 ? "trending-up" : "trending-down"}
                size={16}
                color={item.changeKg > 0 ? AppTheme.colors.accent : AppTheme.colors.coral}
              />
              <Text
                style={[
                  AppTheme.hint,
                  { color: item.changeKg > 0 ? AppTheme.colors.accent : AppTheme.colors.coral },
                ]}
              >
                {formatWeight(Math.abs(item.changeKg), unit, 1)}
              </Text>
            </View>
          ) : null}
        </Pressable>
      ))}
      <Text style={AppTheme.hint}>La flecha compara tu 1RM estimado con la vez anterior.</Text>
    </Card>
  );
}

export function HistoryCard({
  sessions,
  unit,
  deleteWorkout,
  openExercise,
}: {
  sessions: CompletedSession[];
  unit: WeightUnit;
  deleteWorkout: (workoutId: string) => void;
  openExercise: (name: string) => void;
}) {
  return (
    <Card title="Historial de sesiones">
      {sessions.length ? (
        sessions.map((session) => {
          const stats = sessionStats(session);
          const names = [...new Set(session.sets.map((set) => set.exerciseName))];
          return (
            <View key={session.id} style={{ gap: 6, paddingTop: 8 }}>
              <View style={AppTheme.sectionHeader}>
                <Text style={AppTheme.entryName}>{session.name}</Text>
                <Text style={AppTheme.entryDetail}>{localDateKey(new Date(session.completedAt))}</Text>
              </View>
              <Text style={AppTheme.entryDetail}>
                {stats.durationMinutes ? `${stats.durationMinutes} min · ` : ""}
                {stats.workingSets} series · {formatWeight(stats.volumeKg, unit, 0)}
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 6 }}
              >
                {names.map((name) => (
                  <Pressable
                    key={name}
                    accessibilityRole="button"
                    onPress={() => openExercise(name)}
                    style={AppTheme.badge}
                  >
                    <Text style={AppTheme.badgeText}>{name}</Text>
                  </Pressable>
                ))}
              </ScrollView>
              <RowActions
                question={`¿Borrar la sesión del ${localDateKey(new Date(session.completedAt))}?`}
                onDelete={() => deleteWorkout(session.id)}
              />
            </View>
          );
        })
      ) : (
        <Text style={AppTheme.body}>Tu primera sesión aparecerá aquí.</Text>
      )}
    </Card>
  );
}
