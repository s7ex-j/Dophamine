import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import { Alert, Modal, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useRouter } from "expo-router";

import { Button, Card, Chips, ChoiceControl, Input, LinkButton, Screen } from "@/src/components/ui";
import { ViewerOnlyNotice } from "@/src/features/backup/ViewerSections";
import { findExercise } from "@/src/features/exercises/catalog";
import { CatalogBrowser } from "@/src/features/exercises/CatalogBrowser";
import { ExerciseImage } from "@/src/features/exercises/ExerciseImage";
import {
  addExerciseToDay,
  copyWorkoutDay,
  generateRoutine,
  GOAL_OPTIONS,
  GYM_OPTIONS,
  moveExercise,
  toggleRoutineDay,
  updateWorkoutDay,
  VARIANT_OPTIONS,
  WEEK_DAYS,
  workoutFor,
  type ExercisePlan,
  type Routine,
  type TrainingVariant,
} from "@/src/features/training/training.plans";
import { getRoutine, saveRoutine } from "@/src/features/training/training.repository";
import { VIEWER } from "@/src/lib/mode";
import { AppTheme } from "@/src/theme";

const DAY_NAMES: Record<string, string> = {
  mon: "Lunes",
  tue: "Martes",
  wed: "Miércoles",
  thu: "Jueves",
  fri: "Viernes",
  sat: "Sábado",
  sun: "Domingo",
};

export default function RoutineScreen() {
  return VIEWER ? <ViewerOnlyNotice what="Editar la rutina" /> : <RoutineEditor />;
}

// Editor de la rutina semanal: qué días se entrena y qué ejercicios tiene cada día.
function RoutineEditor() {
  const router = useRouter();
  const [routine, setRoutine] = useState<Routine | null>(null);
  const [day, setDay] = useState<string | null>(null);
  const [picking, setPicking] = useState(false);
  const [template, setTemplate] = useState(false);
  useEffect(() => {
    getRoutine().then((saved) => {
      setRoutine(saved);
      setDay(saved.days[0] ?? null);
    });
  }, []);
  if (!routine) return <Screen />;

  const workout = day ? workoutFor(routine, day) : null;
  const change = (next: Routine) => {
    setRoutine(next);
    if (day && !next.days.includes(day)) setDay(next.days[0] ?? null);
  };
  const setPlan = (index: number, patch: Partial<ExercisePlan>) =>
    day &&
    change(
      updateWorkoutDay(routine, day, (current) => ({
        ...current,
        exercises: current.exercises.map((item, place) => (place === index ? { ...item, ...patch } : item)),
      })),
    );
  const applyTemplate = (variant: TrainingVariant) => {
    if (variant === "custom") return;
    const next = generateRoutine({
      variant,
      gymProfile: routine.gymProfile,
      trainingGoal: routine.trainingGoal,
      sessionMinutes: routine.sessionMinutes,
    });
    change(next);
    setDay(next.days[0] ?? null);
    setTemplate(false);
  };
  const save = async () => {
    const empty = routine.schedule.find((item) => !item.exercises.length);
    if (!routine.name.trim() || !routine.schedule.length)
      return Alert.alert("Completa tu rutina", "Ponle un nombre y elige al menos un día.");
    if (empty)
      return Alert.alert(
        "Falta un día",
        `${DAY_NAMES[empty.day]} no tiene ejercicios: agrégale o quita el día.`,
      );
    await saveRoutine({ ...routine, name: routine.name.trim() });
    router.back();
  };

  return (
    <Screen>
      <ScrollView contentContainerStyle={AppTheme.content} keyboardShouldPersistTaps="handled">
        <Input
          label="Nombre de la rutina"
          value={routine.name}
          onChangeText={(name) => setRoutine({ ...routine, name })}
        />

        <View style={{ gap: 8 }}>
          <Text style={AppTheme.label}>Días de entreno</Text>
          <View style={AppTheme.weekRow}>
            {WEEK_DAYS.map((item) => {
              const active = routine.days.includes(item.id);
              return (
                <Pressable
                  key={item.id}
                  accessibilityRole="button"
                  accessibilityLabel={`${active ? "Quitar" : "Agregar"} ${DAY_NAMES[item.id]}`}
                  onPress={() => {
                    const next = toggleRoutineDay(routine, item.id);
                    change(next);
                    if (!active) setDay(item.id);
                  }}
                  style={[AppTheme.weekDot, active && AppTheme.weekDotActive]}
                >
                  <Text style={[AppTheme.weekDotText, active && AppTheme.weekDotTextActive]}>
                    {item.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {routine.schedule.length ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            {routine.schedule.map((item) => (
              <Pressable
                key={item.day}
                accessibilityRole="button"
                accessibilityState={{ selected: item.day === day }}
                onPress={() => setDay(item.day)}
                style={[AppTheme.chip, item.day === day && AppTheme.chipActive, { paddingHorizontal: 14 }]}
              >
                <Text style={[AppTheme.chipText, item.day === day && AppTheme.chipTextActive]}>
                  {DAY_NAMES[item.day].slice(0, 3)} · {item.name}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        ) : (
          <Text style={AppTheme.body}>Toca un día para empezar a armar tu semana.</Text>
        )}

        {workout && day ? (
          <Card title={DAY_NAMES[day]}>
            <Input
              label="Nombre del entreno"
              value={workout.name}
              onChangeText={(name) =>
                change(updateWorkoutDay(routine, day, (current) => ({ ...current, name })))
              }
              placeholder="Torso, Pierna, Empuje…"
            />
            {workout.exercises.map((exercise, index) => (
              <View key={`${exercise.name}-${index}`} style={{ gap: 8, paddingVertical: 8 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                  <ExerciseImage media={findExercise(exercise.name)?.media} size={44} />
                  <Text style={[AppTheme.entryName, { flex: 1 }]} numberOfLines={2}>
                    {exercise.name}
                  </Text>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Subir ${exercise.name}`}
                    onPress={() => change(moveExercise(routine, day, index, -1))}
                    hitSlop={6}
                  >
                    <Ionicons name="chevron-up" size={20} color={AppTheme.colors.muted} />
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Bajar ${exercise.name}`}
                    onPress={() => change(moveExercise(routine, day, index, 1))}
                    hitSlop={6}
                  >
                    <Ionicons name="chevron-down" size={20} color={AppTheme.colors.muted} />
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Quitar ${exercise.name}`}
                    onPress={() =>
                      change(
                        updateWorkoutDay(routine, day, (current) => ({
                          ...current,
                          exercises: current.exercises.filter((_, place) => place !== index),
                        })),
                      )
                    }
                    hitSlop={6}
                  >
                    <Ionicons name="close" size={20} color={AppTheme.colors.coral} />
                  </Pressable>
                </View>
                <View style={{ flexDirection: "row", gap: 8, paddingLeft: 54 }}>
                  {(
                    [
                      ["Series", "sets", String(exercise.sets), "number-pad"],
                      ["Reps", "reps", exercise.reps, "default"],
                      ["RIR", "rir", String(exercise.rir), "number-pad"],
                    ] as const
                  ).map(([label, field, value, keyboard]) => (
                    <View key={field} style={{ flex: 1, gap: 2 }}>
                      <Text style={AppTheme.hint}>{label}</Text>
                      <TextInput
                        accessibilityLabel={`${label} de ${exercise.name}`}
                        value={value}
                        keyboardType={keyboard}
                        onChangeText={(text) =>
                          setPlan(index, field === "reps" ? { reps: text } : { [field]: Number(text) || 0 })
                        }
                        style={[AppTheme.input, AppTheme.setInput]}
                      />
                    </View>
                  ))}
                </View>
              </View>
            ))}
            <Button title="Agregar ejercicio" onPress={() => setPicking(true)} />
            {routine.schedule.length > 1 ? (
              <View style={{ gap: 6 }}>
                <Text style={AppTheme.hint}>Copiar los ejercicios de otro día</Text>
                <View style={AppTheme.chipRow}>
                  {routine.schedule
                    .filter((item) => item.day !== day)
                    .map((item) => (
                      <Pressable
                        key={item.day}
                        accessibilityRole="button"
                        onPress={() => change(copyWorkoutDay(routine, item.day, day))}
                        style={AppTheme.chip}
                      >
                        <Text style={AppTheme.chipText}>
                          {DAY_NAMES[item.day].slice(0, 3)} · {item.name}
                        </Text>
                      </Pressable>
                    ))}
                </View>
              </View>
            ) : null}
          </Card>
        ) : null}

        <Button title="Guardar rutina" onPress={save} />

        <LinkButton
          title={template ? "Cerrar plantillas" : "Empezar desde una plantilla"}
          onPress={() => setTemplate(!template)}
        />
        {template ? (
          <Card title="Plantillas">
            <Text style={AppTheme.label}>Dónde entrenas</Text>
            <ChoiceControl
              value={routine.gymProfile}
              onChange={(gymProfile) => setRoutine({ ...routine, gymProfile })}
              options={GYM_OPTIONS}
            />
            <Text style={AppTheme.label}>Objetivo</Text>
            <ChoiceControl
              value={routine.trainingGoal}
              onChange={(trainingGoal) => setRoutine({ ...routine, trainingGoal })}
              options={GOAL_OPTIONS}
            />
            <Text style={AppTheme.label}>Duración por sesión</Text>
            <Chips
              value={routine.sessionMinutes}
              onChange={(sessionMinutes) => setRoutine({ ...routine, sessionMinutes })}
              options={[35, 50, 70].map((value) => ({ value, label: `${value} min` }))}
            />
            <Text style={AppTheme.hint}>Elegir una plantilla reemplaza los días y ejercicios de arriba.</Text>
            {VARIANT_OPTIONS.filter((option) => option.value !== "custom").map((option) => (
              <Button
                key={option.value}
                title={option.label}
                variant="secondary"
                onPress={() => applyTemplate(option.value)}
              />
            ))}
          </Card>
        ) : null}
      </ScrollView>

      <Modal visible={picking} animationType="slide" onRequestClose={() => setPicking(false)}>
        <Screen>
          <View style={[AppTheme.sectionHeader, { padding: 20, paddingTop: 48, paddingBottom: 0 }]}>
            <Text style={AppTheme.title}>Agregar</Text>
            <LinkButton title="Listo" onPress={() => setPicking(false)} />
          </View>
          <ScrollView contentContainerStyle={AppTheme.content} keyboardShouldPersistTaps="handled">
            <CatalogBrowser
              picked={workout?.exercises.map((item) => item.name) ?? []}
              onPick={(exercise) => day && change(addExerciseToDay(routine, day, exercise.name))}
            />
          </ScrollView>
        </Screen>
      </Modal>
    </Screen>
  );
}
