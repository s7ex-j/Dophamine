import { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";

import { Button, Card, ChoiceControl, Input, ListRow, RowActions } from "@/src/components/ui";
import { Ionicons } from "@expo/vector-icons";
import { EQUIPMENT_LABELS, MUSCLE_LABELS, searchExercises } from "@/src/features/exercises/catalog";
import { hintDetail } from "@/src/features/training/progression";
import { sessionStats, setsPerMuscle, type CompletedSession } from "@/src/features/training/workout";
import {
  formatExerciseLines,
  GOAL_OPTIONS,
  GYM_OPTIONS,
  parseExerciseLines,
  trainingGoalLabel,
  VARIANT_OPTIONS,
  WEEK_DAYS,
  type Routine,
  type TrainingVariant,
} from "@/src/features/training/training.plans";
import type { ProgressionHint } from "@/src/features/training/training.repository";
import { localDateKey } from "@/src/lib/dates";
import { formatWeight, type WeightUnit } from "@/src/lib/units";
import { AppTheme } from "@/src/theme";

// Las secciones de la pantalla "Entreno". La pantalla guarda el estado y aquí solo se dibuja.

export function RoutineSummary({
  routine,
  editing,
  setEditing,
}: {
  routine: Routine;
  editing: boolean;
  setEditing: (editing: boolean) => void;
}) {
  return (
    <Card title={routine.name}>
      <View style={AppTheme.routineTop}>
        <View style={[AppTheme.routineMark, { backgroundColor: routine.accent }]} />
        <View style={AppTheme.listText}>
          <Text style={AppTheme.body}>
            {routine.exercises.length} ejercicios · {routine.days.length} días por semana
          </Text>
          <Text style={AppTheme.hint}>
            {trainingGoalLabel(routine.trainingGoal)} · {routine.sessionMinutes} min ·{" "}
            {GYM_OPTIONS.find((item) => item.value === routine.gymProfile)?.label}
          </Text>
        </View>
      </View>
      <View style={AppTheme.weekRow}>
        {WEEK_DAYS.map((day) => (
          <View
            key={day.id}
            style={[
              AppTheme.weekDot,
              routine.days.includes(day.id) && {
                backgroundColor: routine.accent,
                borderColor: routine.accent,
              },
            ]}
          >
            <Text style={[AppTheme.weekDotText, routine.days.includes(day.id) && { color: "#FFFFFF" }]}>
              {day.label}
            </Text>
          </View>
        ))}
      </View>
      <Button
        title={editing ? "Cancelar edición" : "Editar mi rutina"}
        variant="secondary"
        onPress={() => setEditing(!editing)}
      />
    </Card>
  );
}

export function RoutineEditor({
  routine,
  setRoutine,
  updateVariant,
  regenerate,
  toggleDay,
  save,
}: {
  routine: Routine;
  setRoutine: (routine: Routine) => void;
  updateVariant: (variant: TrainingVariant) => void;
  regenerate: () => void;
  toggleDay: (day: string) => void;
  save: () => void;
}) {
  // El texto de ejercicios se guarda tal como se escribe. Antes se regeneraba
  // desde la rutina en cada tecla y completaba la línea mientras escribías
  // ("D" pasaba a "D | 3 | 8–12 | 2"), lo que impedía teclear un nombre.
  const [exerciseText, setExerciseText] = useState(() => formatExerciseLines(routine.exercises));
  const exercisesKey = JSON.stringify(routine.exercises);
  useEffect(() => {
    // Si la rutina cambia por otra vía (generar propuesta, elegir estructura), se refresca el texto.
    setExerciseText((current) =>
      JSON.stringify(parseExerciseLines(current)) === exercisesKey
        ? current
        : formatExerciseLines(routine.exercises),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exercisesKey]);

  return (
    <Card title="Diseña tu rutina">
      <Input
        label="Nombre de la rutina"
        value={routine.name}
        onChangeText={(name) => setRoutine({ ...routine, name })}
      />
      <Text style={AppTheme.label}>Estructura sugerida</Text>
      <ChoiceControl value={routine.variant} onChange={updateVariant} options={VARIANT_OPTIONS} />
      <Text style={AppTheme.label}>Dónde entrenas</Text>
      <ChoiceControl
        value={routine.gymProfile}
        onChange={(gymProfile) => setRoutine({ ...routine, gymProfile })}
        options={GYM_OPTIONS}
      />
      <Text style={AppTheme.label}>Objetivo del bloque</Text>
      <ChoiceControl
        value={routine.trainingGoal}
        onChange={(trainingGoal) => setRoutine({ ...routine, trainingGoal })}
        options={GOAL_OPTIONS}
      />
      <Text style={AppTheme.label}>Duración por sesión</Text>
      <ChoiceControl
        value={String(routine.sessionMinutes) as "35" | "50" | "70"}
        onChange={(value) => setRoutine({ ...routine, sessionMinutes: Number(value) })}
        options={[
          { value: "35", label: "35 min" },
          { value: "50", label: "50 min" },
          { value: "70", label: "70 min" },
        ]}
      />
      <Text style={AppTheme.label}>Días de entrenamiento</Text>
      <View style={AppTheme.weekRow}>
        {WEEK_DAYS.map((day) => (
          <Pressable
            key={day.id}
            onPress={() => toggleDay(day.id)}
            style={[AppTheme.weekDot, routine.days.includes(day.id) && AppTheme.weekDotActive]}
          >
            <Text style={[AppTheme.weekDotText, routine.days.includes(day.id) && AppTheme.weekDotTextActive]}>
              {day.label}
            </Text>
          </Pressable>
        ))}
      </View>
      <Button title="Generar propuesta" variant="secondary" onPress={regenerate} />
      <CatalogPicker
        onPick={(name) => {
          const value = `${exerciseText.trim() ? `${exerciseText.trimEnd()}\n` : ""}${name} | 3 | 8–12 | 2`;
          setExerciseText(value);
          setRoutine({ ...routine, variant: "custom", exercises: parseExerciseLines(value) });
        }}
      />
      <Input
        label="Ejercicios (nombre | series | repeticiones | RIR)"
        value={exerciseText}
        multiline
        onChangeText={(value) => {
          setExerciseText(value);
          setRoutine({ ...routine, variant: "custom", exercises: parseExerciseLines(value) });
        }}
        placeholder="Sentadilla | 3 | 8–12 | 2"
      />
      <Button title="Guardar rutina" onPress={save} />
    </Card>
  );
}

export function ProgressionCard({ hints, unit }: { hints: ProgressionHint[]; unit: WeightUnit }) {
  return hints.length ? (
    <Card title="Progresión sugerida">
      {hints.map((hint) => (
        <ListRow
          key={hint.exerciseName}
          title={hint.exerciseName}
          detail={`${hintDetail(hint, unit)} · ${hint.action}`}
        />
      ))}
    </Card>
  ) : (
    <Card title="Progresión sugerida">
      <Text style={AppTheme.body}>
        Registra carga, repeticiones y RIR en una sesión para recibir una sugerencia simple en tu próximo
        entrenamiento.
      </Text>
    </Card>
  );
}

/** Botón principal: empezar la sesión de hoy o continuar la que quedó abierta. */
export function StartCard({
  routine,
  resumable,
  onStart,
}: {
  routine: Routine;
  resumable: boolean;
  onStart: () => void;
}) {
  return (
    <View style={[AppTheme.card, { gap: 14 }]}>
      <View style={AppTheme.iconRow}>
        <View style={[AppTheme.iconChip, { backgroundColor: AppTheme.colors.accentSoft }]}>
          <Ionicons name="barbell" size={22} color={AppTheme.colors.accent} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={AppTheme.tileTitle}>{routine.name}</Text>
          <Text style={AppTheme.tileSubtitle}>
            {routine.exercises.length} ejercicios ·{" "}
            {routine.exercises.reduce((sum, item) => sum + item.sets, 0)} series
          </Text>
        </View>
      </View>
      <Button title={resumable ? "Continuar entreno" : "Empezar entreno"} onPress={onStart} />
    </View>
  );
}

/** Series efectivas por músculo en los últimos 7 días. */
export function MusclesWeekCard({ sessions }: { sessions: CompletedSession[] }) {
  const muscles = setsPerMuscle(sessions);
  const top = Math.max(10, ...muscles.map((item) => item.sets));
  return (
    <Card title="Series por músculo · 7 días">
      {muscles.length ? (
        muscles.map((item) => (
          <View key={item.muscle} style={{ gap: 4 }}>
            <View style={AppTheme.legendRow}>
              <Text style={AppTheme.legendLabel}>{item.label}</Text>
              <Text style={AppTheme.legendValue}>{item.sets}</Text>
            </View>
            <View style={AppTheme.progressTrack}>
              <View
                style={[
                  AppTheme.goalFill,
                  {
                    width: `${(item.sets / top) * 100}%`,
                    backgroundColor: item.sets >= 10 ? AppTheme.colors.accent : AppTheme.colors.blue,
                  },
                ]}
              />
            </View>
          </View>
        ))
      ) : (
        <Text style={AppTheme.body}>Cuando registres sesiones verás cuántas series hace cada músculo.</Text>
      )}
      <Text style={AppTheme.hint}>
        Una serie cuenta entera para el músculo principal y media para el secundario.
      </Text>
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
              <View style={AppTheme.chipRow}>
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
              </View>
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

/** Buscar en el catálogo y agregar un ejercicio a la rutina. */
function CatalogPicker({ onPick }: { onPick: (name: string) => void }) {
  const [query, setQuery] = useState("");
  const results = query.trim() ? searchExercises(query).slice(0, 8) : [];
  return (
    <View style={{ gap: 6 }}>
      <Input
        label="Agregar del catálogo"
        value={query}
        onChangeText={setQuery}
        placeholder="sentadilla, remo, bíceps…"
      />
      {results.map((exercise) => (
        <Pressable
          key={exercise.id}
          accessibilityRole="button"
          onPress={() => {
            onPick(exercise.name);
            setQuery("");
          }}
          style={AppTheme.entryRow}
        >
          <View style={{ flex: 1 }}>
            <Text style={AppTheme.entryName}>{exercise.name}</Text>
            <Text style={AppTheme.entryDetail}>
              {exercise.primary.map((muscle) => MUSCLE_LABELS[muscle]).join(", ")} ·{" "}
              {EQUIPMENT_LABELS[exercise.equipment]}
            </Text>
          </View>
          <Ionicons name="add" size={20} color={AppTheme.colors.accent} />
        </Pressable>
      ))}
    </View>
  );
}
