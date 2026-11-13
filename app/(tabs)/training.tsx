import { useCallback, useState } from "react";
import { Alert, ScrollView, Text, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";

import { Screen } from "@/src/components/ui";
import { weightUnitOf } from "@/src/features/profile/profile";
import { getNutritionProfile } from "@/src/features/profile/profile.repository";
import { PlateCalculator } from "@/src/features/training/PlateCalculator";
import { generateRoutine, type Routine, type TrainingVariant } from "@/src/features/training/training.plans";
import { getSetting } from "@/src/features/settings/settings.repository";
import {
  deleteWorkoutSession,
  getProgressionHints,
  getRoutine,
  getSessionHistory,
  saveRoutine,
  type ProgressionHint,
} from "@/src/features/training/training.repository";
import { readActiveSession, type CompletedSession } from "@/src/features/training/workout";
import {
  HistoryCard,
  MusclesWeekCard,
  ProgressionCard,
  RoutineEditor,
  RoutineSummary,
  StartCard,
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
  const router = useRouter();
  const [sessions, setSessions] = useState<CompletedSession[]>([]);
  const [hints, setHints] = useState<ProgressionHint[]>([]);
  const [editing, setEditing] = useState(false);
  const [resumable, setResumable] = useState(false);
  const [unit, setUnit] = useState<WeightUnit>("kg");
  const load = useCallback(() => {
    getNutritionProfile().then((profile) => setUnit(weightUnitOf(profile)));
    getSetting("active_session").then((saved) => setResumable(readActiveSession(saved) !== null));
    Promise.all([getRoutine(), getSessionHistory(30)]).then(async ([nextRoutine, nextSessions]) => {
      setRoutine(nextRoutine);
      setSessions(nextSessions);
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
        <Text style={AppTheme.eyebrow}>ENTRENO</Text>
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
        <StartCard routine={routine} resumable={resumable} onStart={() => router.push("/session")} />
        <MusclesWeekCard
          sessions={sessions.filter(
            (session) => Date.now() - Date.parse(session.completedAt) < 7 * 86_400_000,
          )}
        />
        <ProgressionCard hints={hints} unit={unit} />
        <HistoryCard
          sessions={sessions.slice(0, 10)}
          unit={unit}
          deleteWorkout={deleteWorkout}
          openExercise={(name) => router.push({ pathname: "/exercise", params: { name } })}
        />
        <PlateCalculator unit={unit} />
      </ScrollView>
    </Screen>
  );
}
