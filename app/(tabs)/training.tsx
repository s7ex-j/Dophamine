import { useCallback, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";

import { IconButton, Screen } from "@/src/components/ui";
import { ViewerOnlyNotice } from "@/src/features/backup/ViewerSections";
import { weightUnitOf } from "@/src/features/profile/profile";
import { getNutritionProfile } from "@/src/features/profile/profile.repository";
import { getSetting } from "@/src/features/settings/settings.repository";
import { PlateCalculator } from "@/src/features/training/PlateCalculator";
import type { Routine } from "@/src/features/training/training.plans";
import {
  deleteWorkoutSession,
  getRoutine,
  getSessionHistory,
} from "@/src/features/training/training.repository";
import {
  BestsCard,
  DayWorkoutCard,
  HistoryCard,
  MuscleMapCard,
  VolumeCard,
  WeekStrip,
  WeekTotals,
} from "@/src/features/training/TrainingSections";
import {
  exerciseBests,
  muscleLoads,
  weekdayId,
  weeklyVolume,
  weekProgress,
  weekStart,
} from "@/src/features/training/week";
import { readActiveSession, type CompletedSession } from "@/src/features/training/workout";
import { cycleWeek } from "@/src/features/training/cycle";
import { getGyms } from "@/src/features/training/gyms.repository";
import { localDateKey } from "@/src/lib/dates";
import { VIEWER } from "@/src/lib/mode";
import type { WeightUnit } from "@/src/lib/units";
import { AppTheme } from "@/src/theme";

// Pantalla "Entreno": la semana (qué toca y qué se hizo), el entreno del día,
// el mapa muscular, el volumen semana a semana y tus ejercicios.
// En la web (visor de solo lectura) esta pantalla no registra nada.
export default function TrainingScreen() {
  return VIEWER ? <ViewerOnlyNotice what="Entreno" /> : <TrainingScreenContent />;
}

function TrainingScreenContent() {
  const router = useRouter();
  const [routine, setRoutine] = useState<Routine | null>(null);
  const [sessions, setSessions] = useState<CompletedSession[]>([]);
  const [resumable, setResumable] = useState(false);
  const [unit, setUnit] = useState<WeightUnit>("kg");
  const [selected, setSelected] = useState(() => weekdayId(new Date()));
  const [gymName, setGymName] = useState("");
  const load = useCallback(() => {
    getNutritionProfile().then((profile) => setUnit(weightUnitOf(profile)));
    getSetting("active_session").then((saved) => setResumable(readActiveSession(saved) !== null));
    getGyms().then(({ active }) => setGymName(active.name));
    Promise.all([getRoutine(), getSessionHistory(200)]).then(([nextRoutine, nextSessions]) => {
      setRoutine(nextRoutine);
      setSessions(nextSessions);
    });
  }, []);
  useFocusEffect(load);

  if (!routine)
    return (
      <Screen>
        <View style={AppTheme.loading}>
          <Text style={AppTheme.body}>Preparando tu plan…</Text>
        </View>
      </Screen>
    );

  const today = new Date();
  const week = weekProgress(routine, sessions, today);
  const weeks = weeklyVolume(sessions, today, 8);
  const monday = weekStart(today);
  const thisWeek = sessions.filter((session) => localDateKey(new Date(session.completedAt)) >= monday);
  const cycle = routine.cycle ? cycleWeek(routine.cycle, localDateKey(today)) : null;
  const openExercise = (name: string) => router.push({ pathname: "/exercise", params: { name } });

  return (
    <Screen>
      <ScrollView contentContainerStyle={AppTheme.content}>
        <View style={AppTheme.dashboardHeader}>
          <View>
            <Text style={AppTheme.eyebrow}>ENTRENO</Text>
            <Text style={AppTheme.title}>{routine.name}</Text>
          </View>
          <View style={{ flexDirection: "row", gap: 8 }}>
            <IconButton
              icon="library-outline"
              label="Explorar ejercicios"
              onPress={() => router.push("/catalog")}
            />
            <IconButton icon="create-outline" label="Editar rutina" onPress={() => router.push("/routine")} />
          </View>
        </View>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Dónde entrenas"
            onPress={() => router.push("/gyms")}
            style={[AppTheme.chip, { flexDirection: "row", gap: 6, alignItems: "center" }]}
          >
            <Ionicons name="location-outline" size={14} color={AppTheme.colors.accent} />
            <Text style={AppTheme.chipText}>{gymName || "Gimnasio"}</Text>
          </Pressable>
          {cycle ? (
            <View style={[AppTheme.chip, cycle.isDeload && { borderColor: AppTheme.colors.amber }]}>
              <Text style={AppTheme.chipText}>
                Semana {cycle.week} de {cycle.total}
                {cycle.isDeload ? " · descarga" : cycle.deloadNext ? " · descarga la próxima" : ""}
              </Text>
            </View>
          ) : null}
        </View>
        <WeekStrip week={week} selected={selected} onSelect={setSelected} />
        <DayWorkoutCard
          routine={routine}
          day={selected}
          isToday={selected === weekdayId(today)}
          resumable={resumable}
          onStart={(day) => router.push({ pathname: "/session", params: { day } })}
          onResume={() => router.push("/session")}
          openExercise={openExercise}
        />
        <WeekTotals week={week} current={weeks[weeks.length - 1]} unit={unit} />
        <MuscleMapCard loads={muscleLoads(thisWeek)} />
        <VolumeCard weeks={weeks} unit={unit} />
        <BestsCard bests={exerciseBests(sessions)} unit={unit} openExercise={openExercise} />
        <HistoryCard
          sessions={sessions.slice(0, 10)}
          unit={unit}
          deleteWorkout={async (workoutId) => {
            await deleteWorkoutSession(workoutId);
            load();
          }}
          openExercise={openExercise}
        />
        <PlateCalculator unit={unit} />
      </ScrollView>
    </Screen>
  );
}
