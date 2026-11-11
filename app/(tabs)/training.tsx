import { useCallback, useState } from "react";
import { Alert, ScrollView, Text, View } from "react-native";
import { useFocusEffect } from "expo-router";

import { Screen } from "@/src/components/ui";
import { buildSessionLogs, type LogDraft } from "@/src/features/training/session";
import { generateRoutine, type Routine, type TrainingVariant } from "@/src/features/training/training.plans";
import {
  completeRoutine,
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
import { AppTheme } from "@/src/theme";

// Pantalla "Entreno": guarda el estado (rutina, edición, registro de la sesión)
// y compone las secciones de TrainingSections.
export default function TrainingScreen() {
  const [routine, setRoutine] = useState<Routine | null>(null);
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [hints, setHints] = useState<ProgressionHint[]>([]);
  const [editing, setEditing] = useState(false);
  const [logging, setLogging] = useState(false);
  const [logs, setLogs] = useState<LogDraft>({});
  const load = useCallback(() => {
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
    await completeRoutine(routine, buildSessionLogs(routine, logs));
    setLogging(false);
    setLogs({});
    load();
    Alert.alert("Sesión registrada", `${routine.exercises.length} ejercicios quedaron en tu historial.`);
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
        />
        <ProgressionCard hints={hints} />
        <HistoryCard workouts={workouts} />
      </ScrollView>
    </Screen>
  );
}
