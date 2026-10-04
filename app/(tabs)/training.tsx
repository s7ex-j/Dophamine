import { useCallback, useState } from "react";
import { Alert, Pressable, ScrollView, Text, View } from "react-native";
import { useFocusEffect } from "expo-router";
import { Button, Card, ChoiceControl, Input, ListRow, Screen } from "@/src/components/ui";
import { completeRoutine, getProgressionHints, getRecentWorkouts, getRoutine, saveRoutine, type ProgressionHint, type Workout } from "@/src/features/training/training.repository";
import { generateRoutine, GYM_OPTIONS, GOAL_OPTIONS, VARIANT_OPTIONS, WEEK_DAYS, type ExercisePlan, type Routine, type TrainingVariant } from "@/src/features/training/training.plans";
import { AppTheme } from "@/src/theme";

export default function TrainingScreen() {
  const [routine, setRoutine] = useState<Routine | null>(null);
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [hints, setHints] = useState<ProgressionHint[]>([]);
  const [editing, setEditing] = useState(false);
  const [logging, setLogging] = useState(false);
  const [logs, setLogs] = useState<Record<string, { load: string; reps: string; rir: string }>>({});
  const load = useCallback(() => { Promise.all([getRoutine(), getRecentWorkouts()]).then(async ([nextRoutine, nextWorkouts]) => { setRoutine(nextRoutine); setWorkouts(nextWorkouts); setHints(await getProgressionHints(nextRoutine)); }); }, []);
  useFocusEffect(load);

  const updateVariant = (variant: TrainingVariant) => {
    if (variant === "custom") return setRoutine((current) => current ? { ...current, variant } : current);
    setRoutine(generateRoutine({ variant, gymProfile: routine?.gymProfile ?? "full_gym", trainingGoal: routine?.trainingGoal ?? "hypertrophy", sessionMinutes: routine?.sessionMinutes ?? 50 }));
  };
  const regenerate = () => { if (!routine) return; setRoutine(generateRoutine({ variant: routine.variant, gymProfile: routine.gymProfile, trainingGoal: routine.trainingGoal, sessionMinutes: routine.sessionMinutes, name: routine.name, days: routine.days })); };
  const toggleDay = (day: string) => setRoutine((current) => !current ? current : { ...current, days: current.days.includes(day) ? current.days.filter((value) => value !== day) : [...current.days, day] });
  const save = async () => {
    if (!routine || !routine.name.trim() || !routine.days.length || !routine.exercises.length) return Alert.alert("Completa tu plan", "Añade un nombre, al menos un día y un ejercicio.");
    await saveRoutine({ ...routine, name: routine.name.trim(), exercises: routine.exercises.filter((exercise) => exercise.name) });
    setEditing(false); load(); Alert.alert("Rutina guardada", "Tu plan se conserva solo en este dispositivo.");
  };
  const complete = async () => {
    if (!routine) return;
    await completeRoutine(routine, routine.exercises.map((exercise) => ({ exerciseName: exercise.name, loadKg: Number(logs[exercise.name]?.load) || null, reps: Number(logs[exercise.name]?.reps) || null, rir: Number(logs[exercise.name]?.rir) || null })));
    setLogging(false); setLogs({}); load(); Alert.alert("Sesión registrada", `${routine.exercises.length} ejercicios quedaron en tu historial.`);
  };

  if (!routine) return <Screen><View style={AppTheme.loading}><Text style={AppTheme.body}>Preparando tu plan…</Text></View></Screen>;
  return <Screen><ScrollView contentContainerStyle={AppTheme.content}>
    <Text style={AppTheme.eyebrow}>PLAN FLEXIBLE</Text><Text style={AppTheme.title}>Entrenamiento</Text>
    <Card title={routine.name}>
      <View style={AppTheme.routineTop}><View style={[AppTheme.routineMark, { backgroundColor: routine.accent }]} /><View style={AppTheme.listText}><Text style={AppTheme.body}>{routine.exercises.length} ejercicios · {routine.days.length} días por semana</Text><Text style={AppTheme.hint}>{routine.trainingGoal === "strength" ? "Fuerza" : routine.trainingGoal === "hypertrophy" ? "Hipertrofia" : "Acondicionamiento"} · {routine.sessionMinutes} min · {GYM_OPTIONS.find((item) => item.value === routine.gymProfile)?.label}</Text></View></View>
      <View style={AppTheme.weekRow}>{WEEK_DAYS.map((day) => <View key={day.id} style={[AppTheme.weekDot, routine.days.includes(day.id) && { backgroundColor: routine.accent, borderColor: routine.accent }]}><Text style={[AppTheme.weekDotText, routine.days.includes(day.id) && { color: "#FFFFFF" }]}>{day.label}</Text></View>)}</View>
      <Button title={editing ? "Cancelar edición" : "Editar mi rutina"} variant="secondary" onPress={() => setEditing(!editing)} />
    </Card>
    {editing ? <Card title="Diseña tu rutina">
      <Input label="Nombre de la rutina" value={routine.name} onChangeText={(name) => setRoutine({ ...routine, name })} />
      <Text style={AppTheme.label}>Estructura sugerida</Text><ChoiceControl value={routine.variant} onChange={updateVariant} options={VARIANT_OPTIONS} />
      <Text style={AppTheme.label}>Dónde entrenas</Text><ChoiceControl value={routine.gymProfile} onChange={(gymProfile) => setRoutine({ ...routine, gymProfile })} options={GYM_OPTIONS} />
      <Text style={AppTheme.label}>Objetivo del bloque</Text><ChoiceControl value={routine.trainingGoal} onChange={(trainingGoal) => setRoutine({ ...routine, trainingGoal })} options={GOAL_OPTIONS} />
      <Text style={AppTheme.label}>Duración por sesión</Text><ChoiceControl value={String(routine.sessionMinutes) as "35" | "50" | "70"} onChange={(value) => setRoutine({ ...routine, sessionMinutes: Number(value) })} options={[{ value: "35", label: "35 min" }, { value: "50", label: "50 min" }, { value: "70", label: "70 min" }]} />
      <Text style={AppTheme.label}>Días de entrenamiento</Text><View style={AppTheme.weekRow}>{WEEK_DAYS.map((day) => <Pressable key={day.id} onPress={() => toggleDay(day.id)} style={[AppTheme.weekDot, routine.days.includes(day.id) && AppTheme.weekDotActive]}><Text style={[AppTheme.weekDotText, routine.days.includes(day.id) && AppTheme.weekDotTextActive]}>{day.label}</Text></Pressable>)}</View>
      <Button title="Generar propuesta" variant="secondary" onPress={regenerate} />
      <Input label="Ejercicios (nombre | series | repeticiones | RIR)" value={routine.exercises.map((exercise) => `${exercise.name} | ${exercise.sets} | ${exercise.reps} | ${exercise.rir}`).join("\n")} multiline onChangeText={(value) => setRoutine({ ...routine, variant: "custom", exercises: value.split("\n").map((line): ExercisePlan | null => { const [name, sets, reps, rir] = line.split("|").map((part) => part.trim()); return name ? { name, sets: Number(sets) || 3, reps: reps || "8–12", rir: Number(rir) || 2 } : null; }).filter((exercise): exercise is ExercisePlan => Boolean(exercise)) })} placeholder="Sentadilla | 3 | 8–12 | 2" />
      <Button title="Guardar rutina" onPress={save} />
    </Card> : null}
    <Card title="Sesión de hoy">{routine.exercises.map((exercise, index) => <View key={`${exercise.name}-${index}`} style={AppTheme.sessionExercise}><ListRow title={exercise.name} detail={`${exercise.sets} series · ${exercise.reps} reps · RIR ${exercise.rir}`} />{logging ? <View style={AppTheme.sessionLogRow}><View style={AppTheme.sessionLogRowInput}><Input label="Kg" value={logs[exercise.name]?.load ?? ""} onChangeText={(load) => setLogs((current) => ({ ...current, [exercise.name]: { load, reps: current[exercise.name]?.reps ?? "", rir: current[exercise.name]?.rir ?? String(exercise.rir) } }))} keyboardType="decimal-pad" /></View><View style={AppTheme.sessionLogRowInput}><Input label="Reps" value={logs[exercise.name]?.reps ?? ""} onChangeText={(reps) => setLogs((current) => ({ ...current, [exercise.name]: { load: current[exercise.name]?.load ?? "", reps, rir: current[exercise.name]?.rir ?? String(exercise.rir) } }))} keyboardType="number-pad" /></View><View style={AppTheme.sessionLogRowInput}><Input label="RIR" value={logs[exercise.name]?.rir ?? String(exercise.rir)} onChangeText={(rir) => setLogs((current) => ({ ...current, [exercise.name]: { load: current[exercise.name]?.load ?? "", reps: current[exercise.name]?.reps ?? "", rir } }))} keyboardType="number-pad" /></View></View> : null}</View>)}<Button title={logging ? "Guardar sesión y series" : "Registrar cargas y reps"} onPress={logging ? complete : () => setLogging(true)} />{logging ? <Button title="Guardar solo como completada" variant="secondary" onPress={complete} /> : null}</Card>
    {hints.length ? <Card title="Progresión sugerida">{hints.map((hint) => <ListRow key={hint.exerciseName} title={hint.exerciseName} detail={`${hint.detail} · ${hint.action}`} />)}</Card> : <Card title="Progresión sugerida"><Text style={AppTheme.body}>Registra carga, repeticiones y RIR en una sesión para recibir una sugerencia simple en tu próximo entrenamiento.</Text></Card>}
    <Card title="Historial de sesiones">{workouts.length ? workouts.map((workout) => <ListRow key={workout.id} title={workout.name} detail={`${workout.exerciseCount} ejercicios registrados`} value={workout.completedAt.slice(0, 10)} />) : <Text style={AppTheme.body}>Tu primera sesión aparecerá aquí.</Text>}</Card>
  </ScrollView></Screen>;
}
