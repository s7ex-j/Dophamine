import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import { Alert, Modal, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useRouter } from "expo-router";

import { Button, ChoiceControl, Input, LinkButton, OptionList, Screen } from "@/src/components/ui";
import { ViewerOnlyNotice } from "@/src/features/backup/ViewerSections";
import { findExercise, MUSCLE_GROUPS, type MuscleGroup } from "@/src/features/exercises/catalog";
import { CatalogBrowser } from "@/src/features/exercises/CatalogBrowser";
import { ExerciseImage } from "@/src/features/exercises/ExerciseImage";
import type { NutritionProfile } from "@/src/features/profile/profile";
import { getNutritionProfile } from "@/src/features/profile/profile.repository";
import {
  addExerciseToDay,
  copyWorkoutDay,
  generateRoutine,
  GOAL_OPTIONS,
  GYM_OPTIONS,
  moveExercise,
  setDayFocus,
  toggleRoutineDay,
  updateWorkoutDay,
  WEEK_DAYS,
  workoutFor,
  type ExercisePlan,
  type Routine,
} from "@/src/features/training/training.plans";
import { getRoutine, saveRoutine } from "@/src/features/training/training.repository";
import {
  EXPERIENCE_HINT,
  recommendTemplates,
  type TemplateId,
} from "@/src/features/training/training.templates";
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

// Editor de la semana de entreno, en tres pasos: qué días, desde una plantilla
// o armada por ti, y qué se hace cada día (enfoque y ejercicios).
function RoutineEditor() {
  const router = useRouter();
  const [routine, setRoutine] = useState<Routine | null>(null);
  const [profile, setProfile] = useState<NutritionProfile | null>(null);
  const [mode, setMode] = useState<"template" | "own">("own");
  const [day, setDay] = useState<string | null>(null);
  const [picking, setPicking] = useState(false);
  useEffect(() => {
    Promise.all([getRoutine(), getNutritionProfile()]).then(([saved, nextProfile]) => {
      setRoutine(saved);
      setProfile(nextProfile);
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
  const applyTemplate = (id: TemplateId) => {
    const next = generateRoutine({
      variant: id,
      gymProfile: routine.gymProfile,
      trainingGoal: routine.trainingGoal,
      sessionMinutes: routine.sessionMinutes,
    });
    change(next);
    setDay(next.days[0] ?? null);
    setMode("own");
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
  const templates = recommendTemplates(profile?.experience, profile?.trainingDays);

  return (
    <Screen>
      <ScrollView contentContainerStyle={AppTheme.content} keyboardShouldPersistTaps="handled">
        <Input
          label="Nombre de la rutina"
          value={routine.name}
          onChangeText={(name) => setRoutine({ ...routine, name })}
        />

        <Text style={AppTheme.sectionTitle}>1. ¿Qué días entrenas?</Text>
        <View style={{ flexDirection: "row", gap: 6 }}>
          {WEEK_DAYS.map((item) => {
            const active = routine.days.includes(item.id);
            return (
              <Pressable
                key={item.id}
                accessibilityRole="button"
                accessibilityLabel={`${active ? "Quitar" : "Agregar"} ${DAY_NAMES[item.id]}`}
                onPress={() => {
                  change(toggleRoutineDay(routine, item.id));
                  if (!active) setDay(item.id);
                }}
                style={{
                  flex: 1,
                  alignItems: "center",
                  paddingVertical: 10,
                  borderRadius: 12,
                  backgroundColor: active ? AppTheme.colors.accent : AppTheme.colors.surface2,
                }}
              >
                <Text
                  style={[
                    AppTheme.tileTitle,
                    { color: active ? AppTheme.colors.onAccent : AppTheme.colors.muted },
                  ]}
                >
                  {DAY_NAMES[item.id].slice(0, 2)}
                </Text>
              </Pressable>
            );
          })}
        </View>
        <Text style={AppTheme.hint}>
          {routine.days.length} {routine.days.length === 1 ? "día" : "días"} de entreno ·{" "}
          {7 - routine.days.length} de descanso
        </Text>

        <Text style={AppTheme.sectionTitle}>2. ¿Cómo la armas?</Text>
        <OptionList
          value={mode}
          onChange={setMode}
          options={[
            {
              value: "own",
              label: "Armarla yo",
              detail: "Eliges qué entrenas cada día y sus ejercicios.",
              icon: "construct-outline",
            },
            {
              value: "template",
              label: "Usar una plantilla",
              detail: "Un punto de partida según tu experiencia. Después la ajustas.",
              icon: "albums-outline",
            },
          ]}
        />
        {mode === "template" ? (
          <View style={{ gap: 10 }}>
            {profile?.experience ? (
              <Text style={AppTheme.hint}>{EXPERIENCE_HINT[profile.experience]}</Text>
            ) : null}
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
            {templates.map((template) => (
              <View key={template.id} style={[AppTheme.card, { gap: 6 }]}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <Text style={[AppTheme.tileTitle, { flex: 1 }]}>{template.label}</Text>
                  {template.recommended ? (
                    <View style={AppTheme.badge}>
                      <Text style={AppTheme.badgeText}>Recomendada</Text>
                    </View>
                  ) : null}
                </View>
                <Text style={AppTheme.body}>{template.detail}</Text>
                <Text style={AppTheme.hint}>
                  {template.days.map((id) => DAY_NAMES[id].slice(0, 3)).join(" · ")}
                </Text>
                <Button title="Usar esta" variant="secondary" onPress={() => applyTemplate(template.id)} />
              </View>
            ))}
            <Text style={AppTheme.hint}>Usar una plantilla reemplaza los días y ejercicios actuales.</Text>
          </View>
        ) : null}

        <Text style={AppTheme.sectionTitle}>3. Cada día</Text>
        {!routine.schedule.length ? (
          <Text style={AppTheme.body}>Marca arriba los días que entrenas.</Text>
        ) : null}
        {routine.schedule.map((item) => {
          const open = item.day === day;
          return (
            <View key={item.day} style={[AppTheme.card, { gap: 10 }]}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Día ${DAY_NAMES[item.day]}`}
                accessibilityState={{ expanded: open }}
                onPress={() => setDay(open ? null : item.day)}
                style={{ flexDirection: "row", alignItems: "center", gap: 10 }}
              >
                <View style={{ flex: 1 }}>
                  <Text style={AppTheme.eyebrow}>{DAY_NAMES[item.day].toUpperCase()}</Text>
                  <Text style={AppTheme.tileTitle}>{item.name}</Text>
                  <Text style={AppTheme.tileSubtitle}>
                    {item.exercises.length} {item.exercises.length === 1 ? "ejercicio" : "ejercicios"}
                  </Text>
                </View>
                <Ionicons
                  name={open ? "chevron-up" : "chevron-down"}
                  size={20}
                  color={AppTheme.colors.muted}
                />
              </Pressable>
              {open && workout ? (
                <DayEditor
                  routine={routine}
                  day={item.day}
                  change={change}
                  setPlan={setPlan}
                  onAdd={() => setPicking(true)}
                />
              ) : null}
            </View>
          );
        })}

        <Button title="Guardar rutina" onPress={save} />
      </ScrollView>

      <Modal visible={picking} animationType="slide" onRequestClose={() => setPicking(false)}>
        <Screen>
          <View style={[AppTheme.sectionHeader, { padding: 20, paddingTop: 48, paddingBottom: 0 }]}>
            <Text style={AppTheme.title}>Agregar</Text>
            <LinkButton title="Listo" onPress={() => setPicking(false)} />
          </View>
          <ScrollView contentContainerStyle={AppTheme.content} keyboardShouldPersistTaps="handled">
            <CatalogBrowser
              key={day ?? "none"}
              focus={workout?.focus}
              picked={workout?.exercises.map((exercise) => exercise.name) ?? []}
              onPick={(exercise) => day && change(addExerciseToDay(routine, day, exercise.name))}
            />
          </ScrollView>
        </Screen>
      </Modal>
    </Screen>
  );
}

/** Un día abierto: qué entrenas, nombre, sus ejercicios y copiar de otro día. */
function DayEditor({
  routine,
  day,
  change,
  setPlan,
  onAdd,
}: {
  routine: Routine;
  day: string;
  change: (next: Routine) => void;
  setPlan: (index: number, patch: Partial<ExercisePlan>) => void;
  onAdd: () => void;
}) {
  const workout = workoutFor(routine, day);
  if (!workout) return null;
  const focus = workout.focus ?? [];
  const toggleFocus = (id: MuscleGroup) =>
    change(
      setDayFocus(routine, day, focus.includes(id) ? focus.filter((item) => item !== id) : [...focus, id]),
    );
  return (
    <View style={{ gap: 10 }}>
      <Text style={AppTheme.label}>¿Qué entrenas este día?</Text>
      <View style={AppTheme.chipRow}>
        {MUSCLE_GROUPS.map((group) => {
          const active = focus.includes(group.id);
          return (
            <Pressable
              key={group.id}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              onPress={() => toggleFocus(group.id)}
              style={[AppTheme.chip, active && AppTheme.chipActive]}
            >
              <Text style={[AppTheme.chipText, active && AppTheme.chipTextActive]}>{group.label}</Text>
            </Pressable>
          );
        })}
      </View>
      <Input
        label="Nombre del entreno"
        value={workout.name}
        onChangeText={(name) => change(updateWorkoutDay(routine, day, (current) => ({ ...current, name })))}
        placeholder="Torso, Pierna, Empuje…"
      />
      {workout.exercises.map((exercise, index) => {
        const cardio = Boolean(findExercise(exercise.name)?.cardio);
        const fields = cardio
          ? ([["Minutos", "reps", exercise.reps, "number-pad"]] as const)
          : ([
              ["Series", "sets", String(exercise.sets), "number-pad"],
              ["Reps", "reps", exercise.reps, "default"],
              ["RIR", "rir", String(exercise.rir), "number-pad"],
            ] as const);
        return (
          <View key={`${exercise.name}-${index}`} style={{ gap: 8, paddingVertical: 6 }}>
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
              {fields.map(([label, field, value, keyboard]) => (
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
        );
      })}
      <Button title="Agregar ejercicio" onPress={onAdd} />
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
    </View>
  );
}
