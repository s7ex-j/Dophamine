import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useState } from "react";
import { Pressable, Switch, Text, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";

import { BigInput, Button, Chips, Input, LinkButton, RowActions, type IconName } from "@/src/components/ui";
import {
  addWater,
  deleteDailyBiometrics,
  getBiometricsByDate,
  getRecentBiometrics,
  saveDayBody,
  setDayPartial,
  type DailyBiometrics,
} from "@/src/features/biometrics/biometrics.repository";
import {
  buildBodyInput,
  emptyForm,
  formFromRecord,
  hasData,
  type BodyForm,
} from "@/src/features/biometrics/dailyLog";
import { leanMassKg } from "@/src/features/composition/composition";
import { DaySummary, MealCard } from "@/src/features/nutrition/MealSections";
import { groupBySlot, totalsOf, type MealEntry, type MealSlot } from "@/src/features/nutrition/meals";
import {
  copyDay,
  deleteDayMeals,
  deleteMealEntry,
  getMealEntries,
} from "@/src/features/nutrition/nutrition.repository";
import { mealSetupOf, weightUnitOf, type NutritionProfile } from "@/src/features/profile/profile";
import { weekdayOf } from "@/src/features/reminders/reminders";
import { sleepError, sleepMinutes, type SleepEntry } from "@/src/features/sleep/sleep";
import { deleteSleep, getSleepSince, saveSleep } from "@/src/features/sleep/sleep.repository";
import type { Routine } from "@/src/features/training/training.plans";
import { getRoutine } from "@/src/features/training/training.repository";
import { formatWater, waterTargetMl } from "@/src/features/water/water";
import { addDays, dayLabel, localDateKey } from "@/src/lib/dates";
import { formatDuration, normalizeTime } from "@/src/lib/time";
import { formatWeight, toKg } from "@/src/lib/units";
import { AppTheme } from "@/src/theme";

type Editor = "weight" | "sleep" | null;

/**
 * "Hoy" en el Panel: todo lo que se anota en un día, sin cambiar de pestaña.
 * Arriba se elige el día (para corregir días anteriores); debajo, la energía,
 * peso, agua y sueño en tarjetas que se abren al tocarlas, y las comidas.
 */
export function TodaySection({ profile, onChanged }: { profile: NutritionProfile; onChanged: () => void }) {
  const router = useRouter();
  const [date, setDate] = useState(localDateKey());
  const [day, setDay] = useState<DailyBiometrics | null>(null);
  const [entries, setEntries] = useState<MealEntry[]>([]);
  const [previous, setPrevious] = useState(0);
  const [lastWeight, setLastWeight] = useState<number | null>(null);
  const [sleep, setSleep] = useState<SleepEntry | null>(null);
  const [routine, setRoutine] = useState<Routine | null>(null);
  const [editor, setEditor] = useState<Editor>(null);
  const [form, setForm] = useState<BodyForm>(emptyForm);
  const [sleepForm, setSleepForm] = useState({ bedtime: "", wakeTime: "", quality: 0 });
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null);
  const unit = weightUnitOf(profile);
  const today = localDateKey();

  const load = useCallback(
    (current: string) => {
      Promise.all([
        getBiometricsByDate(current),
        getMealEntries(current),
        getMealEntries(addDays(current, -1)),
        getRecentBiometrics(),
        getSleepSince(current),
        getRoutine(),
      ]).then(([record, meals, before, rows, nights, nextRoutine]) => {
        const night = nights.find((entry) => entry.date === current) ?? null;
        setDay(record);
        setEntries(meals);
        setPrevious(before.length);
        setLastWeight(rows.find((row) => row.weightKg)?.weightKg ?? null);
        setSleep(night);
        setRoutine(nextRoutine);
        setForm(formFromRecord(record, unit));
        setSleepForm({
          bedtime: night?.bedtime ?? "",
          wakeTime: night?.wakeTime ?? "",
          quality: night?.quality ?? 0,
        });
      });
    },
    [unit],
  );
  useFocusEffect(useCallback(() => load(date), [load, date]));
  useEffect(() => {
    setMessage(null);
    setEditor(null);
  }, [date]);

  const changed = (text?: string) => {
    load(date);
    onChanged();
    if (text) setMessage({ text, error: false });
  };
  const saveBody = async () => {
    const result = buildBodyInput(form, unit);
    if (result.error !== null) return setMessage({ text: result.error, error: true });
    await saveDayBody(result.input, date);
    setEditor(null);
    changed("Peso guardado.");
  };
  const saveNight = async () => {
    const input = {
      bedtime: normalizeTime(sleepForm.bedtime) ?? sleepForm.bedtime,
      wakeTime: normalizeTime(sleepForm.wakeTime) ?? sleepForm.wakeTime,
      quality: sleepForm.quality || null,
    };
    const problem = sleepError(input);
    if (problem) return setMessage({ text: problem, error: true });
    await saveSleep(input, date);
    setEditor(null);
    changed("Sueño guardado.");
  };
  const water = async (delta: number) => {
    await addWater(date, delta);
    changed();
  };

  const totals = entries.length
    ? totalsOf(entries)
    : {
        kcal: day?.caloriesIn ?? 0,
        proteinG: day?.proteinG ?? 0,
        carbsG: day?.carbsG ?? 0,
        fatsG: day?.fatsG ?? 0,
      };
  const [year, month, dayOfMonth] = date.split("-").map(Number);
  const trainingDay = routine?.days.includes(weekdayOf(new Date(year, month - 1, dayOfMonth))) ?? false;
  const waterTarget = waterTargetMl(
    day?.weightKg ?? lastWeight,
    trainingDay ? (routine?.sessionMinutes ?? 0) : 0,
  );
  const waterMl = day?.waterMl ?? 0;
  const nightMinutes = sleep ? sleepMinutes(sleep.bedtime, sleep.wakeTime) : null;
  const draftMinutes = sleepMinutes(
    normalizeTime(sleepForm.bedtime) ?? "",
    normalizeTime(sleepForm.wakeTime) ?? "",
  );
  const weightKg = toKg(Number(form.weight), unit);
  const bodyFat = Number(form.bodyFat);
  const add = (slot: MealSlot) => router.push({ pathname: "/add-food", params: { date, slot } });
  const edit = (entry: MealEntry) => router.push({ pathname: "/edit-entry", params: { id: entry.id, date } });
  const toggle = (next: Editor) => {
    setMessage(null);
    setEditor(editor === next ? null : next);
  };

  return (
    <View style={{ gap: 12 }}>
      <View style={AppTheme.dateNav}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Día anterior"
          onPress={() => setDate(addDays(date, -1))}
          style={AppTheme.dateNavButton}
        >
          <Text style={AppTheme.dateNavArrow}>‹</Text>
        </Pressable>
        <View style={AppTheme.dateNavCenter}>
          <Text style={AppTheme.dateNavTitle}>{dayLabel(date)}</Text>
          <Text style={AppTheme.hint}>{date}</Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Día siguiente"
          disabled={date >= today}
          onPress={() => setDate(addDays(date, 1))}
          style={[AppTheme.dateNavButton, date >= today && AppTheme.dateNavButtonDisabled]}
        >
          <Text style={AppTheme.dateNavArrow}>›</Text>
        </Pressable>
      </View>

      <DaySummary
        totals={totals}
        targets={{
          calories: profile.calorieTarget,
          protein: profile.proteinTarget,
          carbs: profile.carbsTarget,
          fats: profile.fatsTarget,
        }}
      />

      <View style={AppTheme.quickRow}>
        <QuickTile
          icon="scale-outline"
          label="Peso"
          value={day?.weightKg ? formatWeight(day.weightKg, unit) : "Anotar"}
          active={editor === "weight"}
          done={Boolean(day?.weightKg)}
          onPress={() => toggle("weight")}
        />
        <QuickTile
          icon="moon-outline"
          label="Sueño"
          value={nightMinutes ? formatDuration(nightMinutes) : "Anotar"}
          active={editor === "sleep"}
          done={Boolean(nightMinutes)}
          onPress={() => toggle("sleep")}
        />
        <View style={[AppTheme.quickTile, waterMl >= waterTarget && AppTheme.quickTileDone]}>
          <View style={AppTheme.legendRow}>
            <Ionicons name="water-outline" size={16} color={AppTheme.colors.blue} />
            <Text style={AppTheme.quickLabel}>Agua</Text>
          </View>
          <Text style={AppTheme.quickValue}>{formatWater(waterMl)}</Text>
          <View style={[AppTheme.progressTrack, { height: 6 }]}>
            <View
              style={{
                height: "100%",
                borderRadius: 3,
                backgroundColor: AppTheme.colors.blue,
                width: `${Math.min(100, (waterMl / waterTarget) * 100)}%`,
              }}
            />
          </View>
          <View style={[AppTheme.sectionHeader, { gap: 4 }]}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Quitar un vaso de agua"
              onPress={() => water(-250)}
              hitSlop={6}
            >
              <Ionicons name="remove-circle-outline" size={22} color={AppTheme.colors.muted} />
            </Pressable>
            <Text style={AppTheme.quickHint}>de {formatWater(waterTarget)}</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Agregar un vaso de agua"
              onPress={() => water(250)}
              hitSlop={6}
            >
              <Ionicons name="add-circle" size={22} color={AppTheme.colors.blue} />
            </Pressable>
          </View>
        </View>
      </View>

      {editor === "weight" ? (
        <View style={AppTheme.card}>
          <View style={AppTheme.fieldRow}>
            <BigInput
              label={lastWeight ? `Último: ${formatWeight(lastWeight, unit)}` : "Peso del día"}
              unit={unit}
              value={form.weight}
              onChangeText={(weight) => setForm({ ...form, weight })}
              autoFocus
            />
          </View>
          <View style={AppTheme.fieldRow}>
            {(
              [
                ["bodyFat", "Grasa (%)"],
                ["muscle", `Músculo (${unit})`],
              ] as const
            ).map(([key, label]) => (
              <View key={key} style={AppTheme.fieldRowItem}>
                <Input
                  label={label}
                  value={form[key]}
                  onChangeText={(value) => setForm({ ...form, [key]: value })}
                  keyboardType="decimal-pad"
                />
              </View>
            ))}
          </View>
          <View style={AppTheme.fieldRow}>
            {(
              [
                ["water", "Agua corporal (%)"],
                ["bone", `Hueso (${unit})`],
              ] as const
            ).map(([key, label]) => (
              <View key={key} style={AppTheme.fieldRowItem}>
                <Input
                  label={label}
                  value={form[key]}
                  onChangeText={(value) => setForm({ ...form, [key]: value })}
                  keyboardType="decimal-pad"
                />
              </View>
            ))}
          </View>
          <Text style={AppTheme.hint}>
            {weightKg > 0 && bodyFat > 0 && bodyFat < 100
              ? `Magra ${formatWeight(leanMassKg(weightKg, bodyFat), unit, 1)} · Grasa ${formatWeight(weightKg - leanMassKg(weightKg, bodyFat), unit, 1)}`
              : "Pésate al despertar. La composición es opcional: llena solo lo que mida tu balanza."}
          </Text>
          <Button title={day?.weightKg ? "Guardar cambios de peso" : "Guardar peso"} onPress={saveBody} />
        </View>
      ) : null}

      {editor === "sleep" ? (
        <View style={AppTheme.card}>
          <View style={AppTheme.fieldRow}>
            <View style={AppTheme.fieldRowItem}>
              <Input
                label="Me acosté"
                value={sleepForm.bedtime}
                onChangeText={(bedtime) => setSleepForm({ ...sleepForm, bedtime })}
                keyboardType="numbers-and-punctuation"
                placeholder="23:30"
              />
            </View>
            <View style={AppTheme.fieldRowItem}>
              <Input
                label="Desperté"
                value={sleepForm.wakeTime}
                onChangeText={(wakeTime) => setSleepForm({ ...sleepForm, wakeTime })}
                keyboardType="numbers-and-punctuation"
                placeholder="07:00"
              />
            </View>
          </View>
          <Text style={AppTheme.label}>¿Cómo dormiste?</Text>
          <Chips
            value={sleepForm.quality}
            onChange={(quality) => setSleepForm({ ...sleepForm, quality })}
            options={[1, 2, 3, 4, 5].map((value) => ({ value, label: String(value) }))}
          />
          {draftMinutes ? <Text style={AppTheme.hint}>{formatDuration(draftMinutes)} de sueño</Text> : null}
          <Button title={sleep ? "Guardar cambios de sueño" : "Guardar sueño"} onPress={saveNight} />
          {sleep ? (
            <View style={AppTheme.rowActions}>
              <LinkButton
                title="Quitar esta noche"
                danger
                onPress={async () => {
                  await deleteSleep(date);
                  setEditor(null);
                  changed();
                }}
              />
            </View>
          ) : null}
        </View>
      ) : null}

      {message ? (
        <Text style={message.error ? AppTheme.errorText : AppTheme.body}>{message.text}</Text>
      ) : null}

      {!entries.length && previous > 0 ? (
        <View style={AppTheme.rowActions}>
          <LinkButton
            title={`Copiar los ${previous} alimentos del día anterior`}
            onPress={async () => {
              const copied = await copyDay(addDays(date, -1), date);
              changed(`Se copiaron ${copied} alimentos del día anterior.`);
            }}
          />
        </View>
      ) : null}
      {groupBySlot(entries, mealSetupOf(profile)).map((slot) => (
        <MealCard
          key={slot.id}
          slot={slot.id}
          label={slot.label}
          entries={slot.entries}
          kcal={slot.totals.kcal}
          onAdd={() => add(slot.id)}
          onRemove={async (entry) => {
            await deleteMealEntry(entry);
            changed();
          }}
          onEdit={edit}
        />
      ))}
      {entries.length || totals.kcal ? (
        <View style={[AppTheme.sectionHeader, { paddingHorizontal: 4 }]}>
          <Text style={AppTheme.hint}>No registré todo lo que comí este día</Text>
          <Switch
            accessibilityLabel="Día incompleto"
            value={Boolean(day?.partial)}
            onValueChange={async (partial) => {
              await setDayPartial(date, partial);
              changed();
            }}
            trackColor={{ true: AppTheme.colors.amber, false: AppTheme.colors.border }}
            thumbColor={AppTheme.colors.text}
          />
        </View>
      ) : null}
      {hasData(day) || entries.length ? (
        <RowActions
          question={`¿Borrar todo lo registrado el ${date}?`}
          onDelete={async () => {
            await deleteDayMeals(date);
            await deleteDailyBiometrics(date);
            await deleteSleep(date);
            changed("Día borrado.");
          }}
        />
      ) : null}
    </View>
  );
}

function QuickTile({
  icon,
  label,
  value,
  active,
  done,
  onPress,
}: {
  icon: IconName;
  label: string;
  value: string;
  active: boolean;
  done: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Anotar ${label.toLowerCase()}`}
      onPress={onPress}
      style={[AppTheme.quickTile, done && AppTheme.quickTileDone, active && AppTheme.quickTileActive]}
    >
      <View style={AppTheme.legendRow}>
        <Ionicons name={icon} size={16} color={AppTheme.colors.accent} />
        <Text style={AppTheme.quickLabel}>{label}</Text>
      </View>
      <Text style={AppTheme.quickValue}>{value}</Text>
      <Text style={AppTheme.quickHint}>
        {active ? "Cerrar" : done ? "Tocar para editar" : "Tocar para anotar"}
      </Text>
    </Pressable>
  );
}
