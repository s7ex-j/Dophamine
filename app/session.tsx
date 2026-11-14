import { Ionicons } from "@expo/vector-icons";
import { useCallback, useRef, useState } from "react";
import { Modal, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";

import { Button, Card, LinkButton, RowActions, Screen } from "@/src/components/ui";
import { ViewerOnlyNotice } from "@/src/features/backup/ViewerSections";
import { alternatives, findExercise, MUSCLE_LABELS } from "@/src/features/exercises/catalog";
import { CatalogBrowser } from "@/src/features/exercises/CatalogBrowser";
import { ExerciseImage } from "@/src/features/exercises/ExerciseImage";
import { weightUnitOf } from "@/src/features/profile/profile";
import { getNutritionProfile } from "@/src/features/profile/profile.repository";
import { getSetting, setSetting } from "@/src/features/settings/settings.repository";
import { workoutFor } from "@/src/features/training/training.plans";
import { cycleWeek } from "@/src/features/training/cycle";
import { DEFAULT_GYMS, type GymSetup } from "@/src/features/training/gyms";
import { getGyms } from "@/src/features/training/gyms.repository";
import {
  describeSets,
  previousTimes,
  nextInSuperset,
  nextSetType,
  SET_TYPE_LABELS,
  setMark,
  sideBalance,
  supersetLabels,
  toggleSides,
  toggleSuperset,
  withWarmup,
} from "@/src/features/training/sets";
import { localDateKey } from "@/src/lib/dates";
import { completeSession, getRoutine, getSessionHistory } from "@/src/features/training/training.repository";
import {
  addExerciseToSession,
  addSet,
  finishSession,
  personalRecords,
  readActiveSession,
  RECORD_LABELS,
  sessionStats,
  sessionClock,
  setsPerMuscle,
  startSession,
  swapExercise,
  type ActiveSession,
  type CompletedSession,
  type DraftSet,
  type PersonalRecord,
  type SessionStats,
  withStartTime,
} from "@/src/features/training/workout";
import { VIEWER } from "@/src/lib/mode";
import { formatWeight, weightValue, type WeightUnit } from "@/src/lib/units";
import { AppTheme } from "@/src/theme";

const KEY = "active_session";
const newId = () => `${Date.now()}-${Math.random().toString(36).slice(2)}`;

export default function SessionScreen() {
  return VIEWER ? <ViewerOnlyNotice what="El entreno en vivo" /> : <SessionContent />;
}

type Summary = { session: CompletedSession; stats: SessionStats; records: PersonalRecord[] };

// Entreno en vivo: un ejercicio a la vez, serie por serie, con la carga sugerida
// y resumen con récords al terminar. Sin temporizador de descanso: la idea es
// anotar lo hecho, no mirar la pantalla entre series.
// La sesión se guarda mientras se entrena: cerrar la app no la pierde.
function SessionContent() {
  const router = useRouter();
  const params = useLocalSearchParams<{ day?: string }>();
  const [active, setActive] = useState<ActiveSession | null>(null);
  const [history, setHistory] = useState<CompletedSession[]>([]);
  const [unit, setUnit] = useState<WeightUnit>("kg");
  const [index, setIndex] = useState(0);
  const [swapping, setSwapping] = useState(false);
  const [adding, setAdding] = useState(false);
  const [showSteps, setShowSteps] = useState(false);
  const [editingStart, setEditingStart] = useState(false);
  const [startText, setStartText] = useState("");
  const [summary, setSummary] = useState<Summary | null>(null);
  const [gym, setGym] = useState<GymSetup>(DEFAULT_GYMS[0]);
  const [error, setError] = useState("");
  const loaded = useRef(false);

  useFocusEffect(
    useCallback(() => {
      if (loaded.current) return;
      loaded.current = true;
      Promise.all([
        getSetting(KEY),
        getRoutine(),
        getSessionHistory(),
        getNutritionProfile(),
        getGyms(),
      ]).then(([saved, routine, sessions, profile, gyms]) => {
        const nextUnit = weightUnitOf(profile);
        setUnit(nextUnit);
        setHistory(sessions);
        setGym(gyms.active);
        // Semana de descarga del mesociclo y salto de carga del gimnasio activo.
        const deload = routine.cycle ? cycleWeek(routine.cycle, localDateKey()).isDeload : false;
        const resumed = readActiveSession(saved);
        const workout = params.day ? workoutFor(routine, params.day) : null;
        const session =
          resumed ??
          startSession(
            routine,
            sessions,
            nextUnit,
            new Date(),
            newId(),
            workout ?? routine.schedule[0] ?? null,
            { deload, incrementKg: gyms.active.incrementKg },
          );
        setActive(session);
        if (!resumed) void setSetting(KEY, session);
      });
    }, [params.day]),
  );
  const update = (next: ActiveSession) => {
    setError("");
    setActive(next);
    void setSetting(KEY, next);
  };

  if (summary) return <SummaryView summary={summary} unit={unit} onDone={() => router.back()} />;
  if (!active) return <Screen />;

  const exercise = active.exercises[Math.min(index, active.exercises.length - 1)];
  const catalog = findExercise(exercise.name);
  const setExercise = (next: typeof exercise) =>
    update({
      ...active,
      exercises: active.exercises.map((item, position) => (position === index ? next : item)),
    });
  const setSet = (position: number, patch: Partial<DraftSet>) =>
    setExercise({
      ...exercise,
      sets: exercise.sets.map((set, place) => (place === position ? { ...set, ...patch } : set)),
    });
  const toggleDone = (position: number) => {
    const set = exercise.sets[position];
    // Al marcar una serie sin repeticiones escritas se toma la sugerida.
    const reps = set.reps || (set.suggestion ? String(set.suggestion.reps) : "");
    setSet(position, { done: !set.done, reps });
  };
  const finish = async () => {
    const result = finishSession(active, unit, new Date());
    if (result.error !== null) return setError(result.error);
    await completeSession(result.session);
    await setSetting(KEY, null);
    setSummary({
      session: result.session,
      stats: sessionStats(result.session),
      records: personalRecords(result.session, history),
    });
  };
  const discard = async () => {
    await setSetting(KEY, null);
    router.back();
  };
  const startedAt = sessionClock({ startedAt: active.startedAt, completedAt: active.startedAt }).start;
  const cardio = Boolean(catalog?.cardio);
  const doneCount = (position: number) => active.exercises[position].sets.filter((set) => set.done).length;
  const labels = supersetLabels(active);
  const lastTime = previousTimes(exercise.name, history, 1)[0] ?? null;
  const partner = nextInSuperset(active, index);

  return (
    <Screen>
      <ScrollView contentContainerStyle={AppTheme.content} keyboardShouldPersistTaps="handled">
        <View style={AppTheme.sectionHeader}>
          <View>
            <Text style={AppTheme.eyebrow}>{active.routineName.toUpperCase()}</Text>
            {editingStart ? (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <TextInput
                  accessibilityLabel="Hora de inicio"
                  value={startText}
                  onChangeText={setStartText}
                  placeholder="18:05"
                  placeholderTextColor={AppTheme.colors.muted}
                  style={[AppTheme.input, { width: 90 }]}
                />
                <LinkButton
                  title="Guardar"
                  onPress={() => {
                    update(withStartTime(active, startText, new Date()));
                    setEditingStart(false);
                  }}
                />
              </View>
            ) : (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Text style={AppTheme.tileTitle}>Empezaste a las {startedAt}</Text>
                <LinkButton
                  title="Cambiar"
                  onPress={() => {
                    setStartText(startedAt);
                    setEditingStart(true);
                  }}
                />
              </View>
            )}
          </View>
          <Button title="Terminar" onPress={finish} />
        </View>

        {active.deload ? (
          <View style={AppTheme.banner}>
            <Text style={AppTheme.bannerTitle}>Semana de descarga</Text>
            <Text style={AppTheme.body}>
              La mitad de las series, 10 % menos de carga y 2 repeticiones más en reserva. Es para
              recuperarte.
            </Text>
          </View>
        ) : null}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {active.exercises.map((item, position) => (
            <Pressable
              key={`${item.name}-${position}`}
              accessibilityRole="button"
              onPress={() => {
                setIndex(position);
                setSwapping(false);
                setShowSteps(false);
              }}
              style={[AppTheme.chip, position === index && AppTheme.chipActive, { paddingHorizontal: 12 }]}
            >
              <Text
                style={[AppTheme.chipText, position === index && AppTheme.chipTextActive]}
                numberOfLines={1}
              >
                {labels[position] || position + 1}. {item.name} · {doneCount(position)}/{item.sets.length}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        <Card title={exercise.name}>
          <View style={{ flexDirection: "row", gap: 12, alignItems: "center" }}>
            <ExerciseImage media={catalog?.media} size={96} animate />
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={AppTheme.hint}>
                {exercise.target.sets} × {exercise.target.repsMin}
                {exercise.target.repsMax !== exercise.target.repsMin
                  ? `–${exercise.target.repsMax}`
                  : ""}{" "}
                reps · RIR {exercise.target.rir}
                {catalog ? ` · ${catalog.primary.map((muscle) => MUSCLE_LABELS[muscle]).join(", ")}` : ""}
              </Text>
              {lastTime ? (
                <Text style={AppTheme.hint}>
                  Última vez ({localDateKey(new Date(lastTime.date)).slice(5)}):{" "}
                  {describeSets(lastTime.sets, unit)}
                </Text>
              ) : null}
              {catalog?.steps?.length ? (
                <LinkButton
                  title={showSteps ? "Ocultar pasos" : "Cómo se hace"}
                  onPress={() => setShowSteps(!showSteps)}
                />
              ) : null}
            </View>
          </View>
          {showSteps && catalog?.steps ? (
            <View style={{ gap: 4 }}>
              {catalog.steps.map((step, number) => (
                <Text key={step} style={AppTheme.body}>
                  {number + 1}. {step}
                </Text>
              ))}
            </View>
          ) : null}
          <View style={[AppTheme.rowActions, { flexWrap: "wrap" }]}>
            {cardio ? null : (
              <LinkButton
                title="Calentamiento"
                onPress={() =>
                  setExercise(
                    exercise.sets.some((set) => set.type === "warmup")
                      ? addSet(exercise, "warmup")
                      : withWarmup(exercise, catalog?.equipment ?? "barbell", gym, unit),
                  )
                }
              />
            )}
            <LinkButton
              title={swapping ? "Cerrar cambio" : "Cambiar"}
              onPress={() => setSwapping(!swapping)}
            />
            <LinkButton title="+ Serie" onPress={() => setExercise(addSet(exercise))} />
            {cardio ? null : (
              <LinkButton
                title={exercise.bySide ? "Sin lados" : "Por lado"}
                onPress={() => setExercise(toggleSides(exercise))}
              />
            )}
            {index < active.exercises.length - 1 ? (
              <LinkButton
                title={
                  exercise.group && exercise.group === active.exercises[index + 1].group
                    ? "Separar del siguiente"
                    : "Superserie con el siguiente"
                }
                onPress={() => update(toggleSuperset(active, index))}
              />
            ) : null}
          </View>
          <Text style={AppTheme.hint}>
            Toca el número de una serie para cambiar su tipo: efectiva, calentamiento (C), drop set (D),
            myo-reps (M) o parciales (P).
          </Text>
          {swapping ? (
            <View style={{ gap: 4 }}>
              {(catalog ? alternatives(catalog, gym.equipment) : []).slice(0, 8).map((option) => (
                <Pressable
                  key={option.id}
                  accessibilityRole="button"
                  onPress={() => {
                    setExercise(swapExercise(exercise, option.name, option.id));
                    setSwapping(false);
                  }}
                  style={AppTheme.entryRow}
                >
                  <Text style={[AppTheme.entryName, { flex: 1 }]}>{option.name}</Text>
                  <Ionicons name="swap-horizontal" size={18} color={AppTheme.colors.muted} />
                </Pressable>
              ))}
              {!catalog ? (
                <Text style={AppTheme.hint}>
                  Este ejercicio no está en el catálogo: no hay reemplazos sugeridos.
                </Text>
              ) : null}
            </View>
          ) : null}

          <View style={[AppTheme.setRow, { borderTopWidth: 0 }]}>
            <Text style={[AppTheme.setHead, { width: 28 }]}>Serie</Text>
            <Text style={[AppTheme.setHead, { flex: 1 }]}>Sugerido</Text>
            {cardio ? null : <Text style={[AppTheme.setHead, AppTheme.setInputBox]}>{unit}</Text>}
            <Text style={[AppTheme.setHead, AppTheme.setInputBox]}>{cardio ? "Min" : "Reps"}</Text>
            {cardio ? null : <Text style={[AppTheme.setHead, { width: 40, textAlign: "center" }]}>RIR</Text>}
            <View style={{ width: 36 }} />
          </View>
          {exercise.sets.map((set, position) => {
            const number = exercise.sets
              .slice(0, position + 1)
              .filter((item) => item.type !== "warmup" && item.side !== "right").length;
            return (
              <View key={position} style={[AppTheme.setRow, set.done && AppTheme.setRowDone]}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Tipo de la serie ${position + 1}: ${SET_TYPE_LABELS[set.type]}`}
                  onPress={() => setSet(position, { type: nextSetType(set.type) })}
                  style={{ width: 28 }}
                >
                  <Text
                    style={[AppTheme.setNumber, set.type !== "working" && { color: AppTheme.colors.amber }]}
                  >
                    {setMark(set.type, number)}
                    {set.side ? (set.side === "left" ? "I" : "D") : ""}
                  </Text>
                </Pressable>
                <Text style={[AppTheme.hint, { flex: 1 }]} numberOfLines={1}>
                  {set.suggestion?.loadKg
                    ? `${weightValue(set.suggestion.loadKg, unit)} × ${set.suggestion.reps}`
                    : set.suggestion
                      ? `× ${set.suggestion.reps}`
                      : "—"}
                </Text>
                {cardio ? null : (
                  <TextInput
                    accessibilityLabel={`Carga serie ${position + 1}`}
                    value={set.load}
                    onChangeText={(load) => setSet(position, { load })}
                    keyboardType="decimal-pad"
                    style={[AppTheme.input, AppTheme.setInputBox, AppTheme.setInput]}
                    placeholderTextColor={AppTheme.colors.muted}
                  />
                )}
                <TextInput
                  accessibilityLabel={`${cardio ? "Minutos" : "Repeticiones"} serie ${position + 1}`}
                  value={set.reps}
                  onChangeText={(reps) => setSet(position, { reps })}
                  keyboardType="number-pad"
                  placeholder={set.suggestion ? String(set.suggestion.reps) : ""}
                  style={[AppTheme.input, AppTheme.setInputBox, AppTheme.setInput]}
                  placeholderTextColor={AppTheme.colors.muted}
                />
                {cardio ? null : (
                  <TextInput
                    accessibilityLabel={`RIR serie ${position + 1}`}
                    value={set.rir}
                    onChangeText={(rir) => setSet(position, { rir })}
                    keyboardType="number-pad"
                    style={[AppTheme.input, AppTheme.setInput, { width: 40 }]}
                    placeholderTextColor={AppTheme.colors.muted}
                  />
                )}
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Completar serie ${position + 1}`}
                  onPress={() => toggleDone(position)}
                  style={[AppTheme.setCheck, set.done && AppTheme.setCheckDone]}
                >
                  <Ionicons
                    name="checkmark"
                    size={18}
                    color={set.done ? AppTheme.colors.onAccent : AppTheme.colors.muted}
                  />
                </Pressable>
              </View>
            );
          })}
          <View style={AppTheme.wizardFooter}>
            {index > 0 ? (
              <View style={AppTheme.wizardFooterButton}>
                <Button title="Anterior" variant="secondary" onPress={() => setIndex(index - 1)} />
              </View>
            ) : null}
            {partner !== null ? (
              <View style={AppTheme.wizardFooterButton}>
                <Button
                  title={`Ir a ${labels[partner]}`}
                  variant="secondary"
                  onPress={() => setIndex(partner)}
                />
              </View>
            ) : index < active.exercises.length - 1 ? (
              <View style={AppTheme.wizardFooterButton}>
                <Button title="Siguiente" variant="secondary" onPress={() => setIndex(index + 1)} />
              </View>
            ) : null}
          </View>
        </Card>

        <Button title="Agregar otro ejercicio" variant="secondary" onPress={() => setAdding(true)} />
        {error ? <Text style={AppTheme.errorText}>{error}</Text> : null}
        <Text style={AppTheme.hint}>
          La carga sugerida sale de tu última sesión: si llegaste al tope de repeticiones con el RIR pedido,
          sube un paso.
        </Text>
        <RowActions question="¿Descartar esta sesión sin guardarla?" onDelete={discard} />
      </ScrollView>
      <Modal visible={adding} animationType="slide" onRequestClose={() => setAdding(false)}>
        <Screen>
          <View style={[AppTheme.sectionHeader, { padding: 20, paddingTop: 48, paddingBottom: 0 }]}>
            <Text style={AppTheme.title}>Agregar</Text>
            <LinkButton title="Cerrar" onPress={() => setAdding(false)} />
          </View>
          <ScrollView contentContainerStyle={AppTheme.content} keyboardShouldPersistTaps="handled">
            <CatalogBrowser
              equipment={gym.equipment}
              picked={active.exercises.map((item) => item.name)}
              onPick={(option) => {
                if (active.exercises.some((item) => item.name === option.name)) return;
                update(addExerciseToSession(active, option.name, history, unit));
                setIndex(active.exercises.length);
                setAdding(false);
              }}
            />
          </ScrollView>
        </Screen>
      </Modal>
    </Screen>
  );
}

function SummaryView({ summary, unit, onDone }: { summary: Summary; unit: WeightUnit; onDone: () => void }) {
  const muscles = setsPerMuscle([summary.session]);
  const balances = [...new Set(summary.session.sets.map((set) => set.exerciseName))].flatMap((name) => {
    const balance = sideBalance(summary.session.sets.filter((set) => set.exerciseName === name));
    return balance ? [{ name, balance }] : [];
  });
  const top = Math.max(1, ...muscles.map((item) => item.sets));
  return (
    <Screen>
      <ScrollView contentContainerStyle={AppTheme.content}>
        <Text style={AppTheme.eyebrow}>ENTRENO COMPLETO</Text>
        <Text style={AppTheme.title}>{summary.session.name}</Text>
        <View style={AppTheme.tileGrid}>
          {[
            [
              "Horario",
              `${sessionClock(summary.session).start}–${sessionClock(summary.session).end} · ${summary.stats.durationMinutes} min`,
            ],
            ["Volumen", formatWeight(summary.stats.volumeKg, unit, 0)],
            ["Series efectivas", String(summary.stats.workingSets)],
            ["Ejercicios", String(summary.stats.exercises)],
          ].map(([label, value]) => (
            <View key={label} style={AppTheme.tile}>
              <Text style={AppTheme.tileSubtitle}>{label}</Text>
              <Text style={AppTheme.tileValue}>{value}</Text>
            </View>
          ))}
        </View>
        {summary.records.length ? (
          <Card title={`Récords · ${summary.records.length}`}>
            {summary.records.map((record) => (
              <View key={`${record.exerciseName}-${record.kind}`} style={AppTheme.entryRow}>
                <Ionicons name="trophy-outline" size={20} color={AppTheme.colors.amber} />
                <View style={{ flex: 1 }}>
                  <Text style={AppTheme.entryName}>{record.exerciseName}</Text>
                  <Text style={AppTheme.entryDetail}>{RECORD_LABELS[record.kind]}</Text>
                </View>
                <Text style={AppTheme.entryKcal}>
                  {record.kind === "volume"
                    ? formatWeight(record.value, unit, 0)
                    : formatWeight(record.value, unit, 1)}
                </Text>
              </View>
            ))}
          </Card>
        ) : null}
        {balances.length ? (
          <Card title="Izquierda y derecha">
            {balances.map(({ name, balance }) => (
              <View key={name} style={AppTheme.legendRow}>
                <Text style={[AppTheme.legendLabel, { flex: 1 }]}>{name}</Text>
                <Text style={AppTheme.legendValue}>
                  I {formatWeight(balance.left, unit, 0)} · D {formatWeight(balance.right, unit, 0)}
                  {balance.differencePct >= 10 ? ` · ${balance.differencePct} % de diferencia` : ""}
                </Text>
              </View>
            ))}
          </Card>
        ) : null}
        {muscles.length ? (
          <Card title="Músculos trabajados">
            {muscles.map((item) => (
              <View key={item.muscle} style={{ gap: 4 }}>
                <View style={AppTheme.legendRow}>
                  <Text style={AppTheme.legendLabel}>{item.label}</Text>
                  <Text style={AppTheme.legendValue}>{item.sets} series</Text>
                </View>
                <View style={AppTheme.progressTrack}>
                  <View style={[AppTheme.goalFill, { width: `${(item.sets / top) * 100}%` }]} />
                </View>
              </View>
            ))}
          </Card>
        ) : null}
        <Button title="Listo" onPress={onDone} />
      </ScrollView>
    </Screen>
  );
}
