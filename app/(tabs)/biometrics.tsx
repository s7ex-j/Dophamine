import { useCallback, useEffect, useState } from "react";
import { Pressable, ScrollView, Switch, Text, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";

import { BigInput, Button, Card, Chips, Input, LinkButton, RowActions, Screen } from "@/src/components/ui";
import { ViewerOnlyNotice } from "@/src/features/backup/ViewerSections";
import {
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
import { weightUnitOf, type NutritionProfile } from "@/src/features/profile/profile";
import { getNutritionProfile } from "@/src/features/profile/profile.repository";
import { addDays, dayLabel, localDateKey } from "@/src/lib/dates";
import { sleepError, sleepMinutes, type SleepEntry } from "@/src/features/sleep/sleep";
import { deleteSleep, getSleepSince, saveSleep } from "@/src/features/sleep/sleep.repository";
import { VIEWER } from "@/src/lib/mode";
import { formatDuration, normalizeTime } from "@/src/lib/time";
import { formatWeight, toKg } from "@/src/lib/units";
import { AppTheme } from "@/src/theme";

// En la web (visor de solo lectura) esta pantalla no registra nada.
export default function DailyLogScreen() {
  return VIEWER ? <ViewerOnlyNotice what="El Diario" /> : <DailyLogScreenContent />;
}

// Pestaña "Diario": un día a la vez. Resumen del día, cada comida con sus
// alimentos por separado, y el peso con la composición corporal.
function DailyLogScreenContent() {
  const router = useRouter();
  const [date, setDate] = useState(localDateKey());
  const [form, setForm] = useState<BodyForm>(emptyForm);
  const [day, setDay] = useState<DailyBiometrics | null>(null);
  const [entries, setEntries] = useState<MealEntry[]>([]);
  const [previous, setPrevious] = useState(0);
  const [history, setHistory] = useState<DailyBiometrics[]>([]);
  const [profile, setProfile] = useState<NutritionProfile | null>(null);
  const [showComposition, setShowComposition] = useState(false);
  const [sleep, setSleep] = useState<SleepEntry | null>(null);
  const [sleepForm, setSleepForm] = useState({ bedtime: "", wakeTime: "", quality: 0 });
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null);
  const unit = weightUnitOf(profile);
  const today = localDateKey();

  const load = useCallback((current: string) => {
    Promise.all([
      getBiometricsByDate(current),
      getMealEntries(current),
      getMealEntries(addDays(current, -1)),
      getRecentBiometrics(),
      getNutritionProfile(),
      getSleepSince(current),
    ]).then(([record, meals, before, rows, nextProfile, nights]) => {
      const night = nights.find((entry) => entry.date === current) ?? null;
      setSleep(night);
      setSleepForm({
        bedtime: night?.bedtime ?? "",
        wakeTime: night?.wakeTime ?? "",
        quality: night?.quality ?? 0,
      });
      setProfile(nextProfile);
      setDay(record);
      setEntries(meals);
      setPrevious(before.length);
      setForm(formFromRecord(record, weightUnitOf(nextProfile)));
      setShowComposition(Boolean(record?.bodyFatPct || record?.muscleMassKg));
      setHistory(rows.filter(hasData));
    });
  }, []);
  useFocusEffect(useCallback(() => load(date), [load, date]));
  useEffect(() => setMessage(null), [date]);

  const set = (key: keyof BodyForm) => (value: string) => {
    setMessage(null);
    setForm((current) => ({ ...current, [key]: value }));
  };
  const saveBody = async () => {
    const result = buildBodyInput(form, unit);
    if (result.error !== null) return setMessage({ text: result.error, error: true });
    await saveDayBody(result.input, date);
    load(date);
    setMessage({ text: "Peso guardado.", error: false });
  };
  const removeDay = async () => {
    await deleteDayMeals(date);
    await deleteDailyBiometrics(date);
    load(date);
    setMessage({ text: "Día borrado.", error: false });
  };
  const removeEntry = async (entry: MealEntry) => {
    await deleteMealEntry(entry);
    load(date);
  };
  const copyPrevious = async () => {
    const copied = await copyDay(addDays(date, -1), date);
    load(date);
    setMessage({ text: `Se copiaron ${copied} alimentos del día anterior.`, error: false });
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
    load(date);
    setMessage({ text: "Sueño guardado.", error: false });
  };
  const removeNight = async () => {
    await deleteSleep(date);
    load(date);
  };
  const togglePartial = async (partial: boolean) => {
    await setDayPartial(date, partial);
    load(date);
  };
  const edit = (entry: MealEntry) => router.push({ pathname: "/edit-entry", params: { id: entry.id, date } });
  const add = (slot: MealSlot) => router.push({ pathname: "/add-food", params: { date, slot } });

  // Un día anterior a las comidas por entrada solo tiene el total guardado.
  const totals = entries.length
    ? totalsOf(entries)
    : {
        kcal: day?.caloriesIn ?? 0,
        proteinG: day?.proteinG ?? 0,
        carbsG: day?.carbsG ?? 0,
        fatsG: day?.fatsG ?? 0,
      };
  const targets = profile
    ? {
        calories: profile.calorieTarget,
        protein: profile.proteinTarget,
        carbs: profile.carbsTarget,
        fats: profile.fatsTarget,
      }
    : null;
  const weightKg = toKg(Number(form.weight), unit);
  const bodyFat = Number(form.bodyFat);
  const lastWeight = history.find((record) => record.weightKg)?.weightKg;

  return (
    <Screen>
      <ScrollView contentContainerStyle={AppTheme.content} keyboardShouldPersistTaps="handled">
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

        <DaySummary totals={totals} targets={targets} />
        {entries.length || totals.kcal ? (
          <View style={[AppTheme.sectionHeader, { paddingHorizontal: 4 }]}>
            <Text style={AppTheme.hint}>No registré todo lo que comí este día</Text>
            <Switch
              accessibilityLabel="Día incompleto"
              value={Boolean(day?.partial)}
              onValueChange={togglePartial}
              trackColor={{ true: AppTheme.colors.amber, false: AppTheme.colors.border }}
              thumbColor={AppTheme.colors.text}
            />
          </View>
        ) : null}
        {!entries.length && previous > 0 ? (
          <View style={AppTheme.rowActions}>
            <LinkButton title={`Copiar los ${previous} alimentos de ayer`} onPress={copyPrevious} />
          </View>
        ) : null}

        {groupBySlot(entries).map((slot) => (
          <MealCard
            key={slot.id}
            slot={slot.id}
            label={slot.label}
            entries={slot.entries}
            kcal={slot.totals.kcal}
            onAdd={() => add(slot.id)}
            onRemove={removeEntry}
            onEdit={edit}
          />
        ))}

        <Card
          title={
            sleep ? `Sueño · ${formatDuration(sleepMinutes(sleep.bedtime, sleep.wakeTime) ?? 0)}` : "Sueño"
          }
        >
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
          {(() => {
            const minutes = sleepMinutes(
              normalizeTime(sleepForm.bedtime) ?? "",
              normalizeTime(sleepForm.wakeTime) ?? "",
            );
            return minutes ? <Text style={AppTheme.hint}>{formatDuration(minutes)} de sueño</Text> : null;
          })()}
          <Button
            title={sleep ? "Guardar cambios de sueño" : "Guardar sueño"}
            variant="secondary"
            onPress={saveNight}
          />
          {sleep ? (
            <View style={AppTheme.rowActions}>
              <LinkButton title="Quitar esta noche" danger onPress={removeNight} />
            </View>
          ) : null}
        </Card>

        <Card title="Peso">
          <View style={AppTheme.fieldRow}>
            <BigInput
              label={lastWeight ? `Último: ${formatWeight(lastWeight, unit)}` : "Peso del día"}
              unit={unit}
              value={form.weight}
              onChangeText={set("weight")}
            />
          </View>
          {showComposition ? (
            <>
              <View style={AppTheme.fieldRow}>
                <View style={AppTheme.fieldRowItem}>
                  <Input
                    label="Grasa (%)"
                    value={form.bodyFat}
                    onChangeText={set("bodyFat")}
                    keyboardType="decimal-pad"
                  />
                </View>
                <View style={AppTheme.fieldRowItem}>
                  <Input
                    label={`Músculo (${unit})`}
                    value={form.muscle}
                    onChangeText={set("muscle")}
                    keyboardType="decimal-pad"
                  />
                </View>
              </View>
              <View style={AppTheme.fieldRow}>
                <View style={AppTheme.fieldRowItem}>
                  <Input
                    label="Agua (%)"
                    value={form.water}
                    onChangeText={set("water")}
                    keyboardType="decimal-pad"
                  />
                </View>
                <View style={AppTheme.fieldRowItem}>
                  <Input
                    label={`Hueso (${unit})`}
                    value={form.bone}
                    onChangeText={set("bone")}
                    keyboardType="decimal-pad"
                  />
                </View>
              </View>
              {weightKg > 0 && bodyFat > 0 && bodyFat < 100 ? (
                <Text style={AppTheme.hint}>
                  Magra {formatWeight(leanMassKg(weightKg, bodyFat), unit, 1)} · Grasa{" "}
                  {formatWeight(weightKg - leanMassKg(weightKg, bodyFat), unit, 1)}
                </Text>
              ) : null}
            </>
          ) : (
            <View style={AppTheme.rowActions}>
              <LinkButton title="Agregar composición corporal" onPress={() => setShowComposition(true)} />
            </View>
          )}
          <Button title={day?.weightKg ? "Guardar cambios de peso" : "Guardar peso"} onPress={saveBody} />
        </Card>

        {message ? (
          <Text style={message.error ? AppTheme.errorText : AppTheme.body}>{message.text}</Text>
        ) : null}

        {history.length ? (
          <Card title="Últimos días">
            {history.map((record) => (
              <Pressable
                key={record.id}
                accessibilityRole="button"
                onPress={() => setDate(record.date)}
                style={AppTheme.entryRow}
              >
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={AppTheme.entryName}>{dayLabel(record.date)}</Text>
                  <Text style={AppTheme.entryDetail}>
                    {record.caloriesIn} kcal · P {Math.round(record.proteinG)}
                    {record.bodyFatPct ? ` · ${record.bodyFatPct} % grasa` : ""}
                  </Text>
                </View>
                <Text style={AppTheme.entryKcal}>
                  {record.weightKg ? formatWeight(record.weightKg, unit) : "—"}
                </Text>
              </Pressable>
            ))}
          </Card>
        ) : null}

        {hasData(day) || entries.length ? (
          <RowActions question={`¿Borrar todo lo registrado el ${date}?`} onDelete={removeDay} />
        ) : null}
      </ScrollView>
    </Screen>
  );
}
