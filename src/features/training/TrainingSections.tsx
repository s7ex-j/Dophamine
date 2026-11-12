import { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";

import { Button, Card, ChoiceControl, Input, ListRow, RowActions } from "@/src/components/ui";
import { hintDetail } from "@/src/features/training/progression";
import { RestTimer } from "@/src/features/training/RestTimer";
import { withLogField, type LogDraft } from "@/src/features/training/session";
import {
  formatExerciseLines,
  GOAL_OPTIONS,
  GYM_OPTIONS,
  parseExerciseLines,
  restSeconds,
  trainingGoalLabel,
  VARIANT_OPTIONS,
  WEEK_DAYS,
  type Routine,
  type TrainingVariant,
} from "@/src/features/training/training.plans";
import type { ProgressionHint, Workout } from "@/src/features/training/training.repository";
import { localDateKey } from "@/src/lib/dates";
import type { WeightUnit } from "@/src/lib/units";
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

export function SessionCard({
  routine,
  logging,
  setLogging,
  logs,
  setLogs,
  complete,
  unit,
}: {
  routine: Routine;
  logging: boolean;
  setLogging: (logging: boolean) => void;
  logs: LogDraft;
  setLogs: (update: (current: LogDraft) => LogDraft) => void;
  complete: () => void;
  unit: WeightUnit;
}) {
  return (
    <Card title="Sesión de hoy">
      {routine.exercises.map((exercise, index) => (
        <View key={`${exercise.name}-${index}`} style={AppTheme.sessionExercise}>
          <ListRow
            title={exercise.name}
            detail={`${exercise.sets} series · ${exercise.reps} reps · RIR ${exercise.rir}`}
          />
          {logging ? (
            <View style={AppTheme.sessionLogRow}>
              <View style={AppTheme.sessionLogRowInput}>
                <Input
                  label={unit === "kg" ? "Kg" : "Lb"}
                  value={logs[exercise.name]?.load ?? ""}
                  onChangeText={(load) => setLogs((current) => withLogField(current, exercise, "load", load))}
                  keyboardType="decimal-pad"
                />
              </View>
              <View style={AppTheme.sessionLogRowInput}>
                <Input
                  label="Reps"
                  value={logs[exercise.name]?.reps ?? ""}
                  onChangeText={(reps) => setLogs((current) => withLogField(current, exercise, "reps", reps))}
                  keyboardType="number-pad"
                />
              </View>
              <View style={AppTheme.sessionLogRowInput}>
                <Input
                  label="RIR"
                  value={logs[exercise.name]?.rir ?? String(exercise.rir)}
                  onChangeText={(rir) => setLogs((current) => withLogField(current, exercise, "rir", rir))}
                  keyboardType="number-pad"
                />
              </View>
            </View>
          ) : null}
          {logging ? <RestTimer seconds={restSeconds(routine.trainingGoal, exercise.rir)} /> : null}
        </View>
      ))}
      <Button
        title={logging ? "Guardar sesión y series" : "Registrar cargas y reps"}
        onPress={logging ? complete : () => setLogging(true)}
      />
      {logging ? (
        <Button title="Guardar solo como completada" variant="secondary" onPress={complete} />
      ) : null}
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

export function HistoryCard({
  workouts,
  deleteWorkout,
}: {
  workouts: Workout[];
  deleteWorkout: (workoutId: string) => void;
}) {
  return (
    <Card title="Historial de sesiones">
      {workouts.length ? (
        workouts.map((workout) => (
          <View key={workout.id}>
            <ListRow
              title={workout.name}
              detail={`${workout.exerciseCount} ejercicios registrados`}
              value={localDateKey(new Date(workout.completedAt))}
            />
            <RowActions
              question={`¿Borrar la sesión del ${localDateKey(new Date(workout.completedAt))}?`}
              onDelete={() => deleteWorkout(workout.id)}
            />
          </View>
        ))
      ) : (
        <Text style={AppTheme.body}>Tu primera sesión aparecerá aquí.</Text>
      )}
    </Card>
  );
}
