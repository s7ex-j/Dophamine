import { useCallback, useState } from "react";
import { Alert, ScrollView, Text, View } from "react-native";
import { useFocusEffect } from "expo-router";

import { Screen } from "@/src/components/ui";
import { weightUnitOf } from "@/src/features/profile/profile";
import { getNutritionProfile } from "@/src/features/profile/profile.repository";
import { PlateCalculator } from "@/src/features/training/PlateCalculator";
import { buildSessionLogs, type LogDraft } from "@/src/features/training/session";
import { generateRoutine, type Routine, type TrainingVariant } from "@/src/features/training/training.plans";
import {
  completeRoutine,
  deleteWorkoutSession,
  getProgressionHints,
  getRecentWorkouts,
  getRoutine,
  saveRoutine,
  type ProgressionHint,
  type Workout,
} from "@/src/features/training/training.repository";
import {
  HistoryCard,
  ProgressionCard,
  RoutineEditor,
  RoutineSummary,
  SessionCard,
} from "@/src/features/training/TrainingSections";
import type { WeightUnit } from "@/src/lib/units";
import { ViewerOnlyNotice } from "@/src/features/backup/ViewerSections";
import { VIEWER } from "@/src/lib/mode";
import { AppTheme } from "@/src/theme";

// Pantalla "Entreno": guarda el estado (rutina, edición, registro de la sesión)
// y compone las secciones de TrainingSections.
// En la web (visor de solo lectura) esta pantalla no registra nada.
export default function TrainingScreen() {
  return VIEWER ? <ViewerOnlyNotice what="Entreno" /> : <TrainingScreenContent />;
}

function TrainingScreenContent() {
  const [routine, setRoutine] = useState<Routine | null>(null);
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [hints, setHints] = useState<ProgressionHint[]>([]);
  const [editing, setEditing] = useState(false);
  const [logging, setLogging] = useState(false);
  const [logs, setLogs] = useState<LogDraft>({});
  const [unit, setUnit] = useState<WeightUnit>("kg");
  const load = useCallback(() => {
    getNutritionProfile().then((profile) => setUnit(weightUnitOf(profile)));
    Promise.all([getRoutine(), getRecentWorkouts()]).then(async ([nextRoutine, nextWorkouts]) => {
      setRoutine(nextRoutine);
      setWorkouts(nextWorkouts);
      setHints(await getProgressionHints(nextRoutine));
    });
  }, []);
  useFocusEffect(load);

  const updateVariant = (variant: TrainingVariant) => {
    if (variant === "custom") return setRoutine((current) => (current ? { ...current, variant } : current));
    setRoutine(
      generateRoutine({
        variant,
        gymProfile: routine?.gymProfile ?? "full_gym",
        trainingGoal: routine?.trainingGoal ?? "hypertrophy",
        sessionMinutes: routine?.sessionMinutes ?? 50,
      }),
    );
  };
  const regenerate = () => {
    if (!routine) return;
    setRoutine(
      generateRoutine({
        variant: routine.variant,
        gymProfile: routine.gymProfile,
        trainingGoal: routine.trainingGoal,
        sessionMinutes: routine.sessionMinutes,
        name: routine.name,
        days: routine.days,
      }),
    );
  };
  const toggleDay = (day: string) =>
    setRoutine((current) =>
      !current
        ? current
        : {
            ...current,
            days: current.days.includes(day)
              ? current.days.filter((value) => value !== day)
              : [...current.days, day],
          },
    );
  const save = async () => {
    if (!routine || !routine.name.trim() || !routine.days.length || !routine.exercises.length)
      return Alert.alert("Completa tu plan", "Añade un nombre, al menos un día y un ejercicio.");
    await saveRoutine({
      ...routine,
      name: routine.name.trim(),
      exercises: routine.exercises.filter((exercise) => exercise.name),
    });
    setEditing(false);
    load();
    Alert.alert("Rutina guardada", "Tu plan se conserva solo en este dispositivo.");
  };
  const complete = async () => {
    if (!routine) return;
    await completeRoutine(routine, buildSessionLogs(routine, logs, unit));
    setLogging(false);
    setLogs({});
    load();
    Alert.alert("Sesión registrada", `${routine.exercises.length} ejercicios quedaron en tu historial.`);
  };

  const deleteWorkout = async (workoutId: string) => {
    await deleteWorkoutSession(workoutId);
    load();
  };

  if (!routine)
    return (
      <Screen>
        <View style={AppTheme.loading}>
          <Text style={AppTheme.body}>Preparando tu plan…</Text>
        </View>
      </Screen>
    );
  return (
    <Screen>
      <ScrollView contentContainerStyle={AppTheme.content}>
        <Text style={AppTheme.eyebrow}>PLAN FLEXIBLE</Text>
        <Text style={AppTheme.title}>Entrenamiento</Text>
        <RoutineSummary routine={routine} editing={editing} setEditing={setEditing} />
        {editing ? (
          <RoutineEditor
            routine={routine}
            setRoutine={setRoutine}
            updateVariant={updateVariant}
            regenerate={regenerate}
            toggleDay={toggleDay}
            save={save}
          />
        ) : null}
        <SessionCard
          routine={routine}
          logging={logging}
          setLogging={setLogging}
          logs={logs}
          setLogs={setLogs}
          complete={complete}
          unit={unit}
        />
        <ProgressionCard hints={hints} unit={unit} />
        <PlateCalculator unit={unit} />
        <HistoryCard workouts={workouts} deleteWorkout={deleteWorkout} />
      </ScrollView>
    </Screen>
  );
}
