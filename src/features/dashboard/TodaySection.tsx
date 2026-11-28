import { Ionicons } from "@expo/vector-icons";
import { hasUsageAccess, phoneUsageAvailable, screenEvents } from "@/modules/phone-usage";
import { haptic } from "@/src/lib/haptics";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { Pressable, View } from "react-native";
import { Text } from "@/src/components/Text";
import { useFocusEffect, useRouter } from "expo-router";

import { BigInput, Button, Input, LinkButton, type IconName } from "@/src/components/ui";
import {
  AUTO_SLEEP_KEY,
  autoSleepSettingOf,
  nightWindow,
  shouldCheckSleep,
  sleepFromScreen,
} from "@/src/features/sleep/screenSleep";
import { SleepEditor } from "@/src/features/sleep/SleepEditor";
import {
  addWater,
  getBiometricsByDate,
  getRecentBiometrics,
  saveDayBody,
  type DailyBiometrics,
} from "@/src/features/biometrics/biometrics.repository";
import { buildBodyInput, emptyForm, formFromRecord, type BodyForm } from "@/src/features/biometrics/dailyLog";
import { leanMassKg } from "@/src/features/composition/composition";
import { dailyTip } from "@/src/features/dashboard/dashboard";
import { DayStrip } from "@/src/features/calendar/DayStrip";
import { DaySummary } from "@/src/features/nutrition/DaySummary";
import { totalsOf, type MealEntry } from "@/src/features/nutrition/meals";
import { getMealEntries } from "@/src/features/nutrition/nutrition.repository";
import { weightUnitOf, type NutritionProfile } from "@/src/features/profile/profile";
import { normalizeConfig, REMINDERS_KEY, weekdayOf } from "@/src/features/reminders/reminders";
import { remindersAvailable } from "@/src/features/reminders/scheduler";
import { getSetting, setSetting } from "@/src/features/settings/settings.repository";
import { targetsForWeekday } from "@/src/features/profile/targets";
import { sleepMinutes, type SleepEntry, type SleepInput } from "@/src/features/sleep/sleep";
import { getSleepSince, saveSleep } from "@/src/features/sleep/sleep.repository";
import type { Routine } from "@/src/features/training/training.plans";
import { getRoutine } from "@/src/features/training/training.repository";
import { formatWater, waterTargetMl } from "@/src/features/water/water";
import { localDateKey } from "@/src/lib/dates";
import { formatDuration } from "@/src/lib/time";
import { formatWeight, toKg } from "@/src/lib/units";
import { AppTheme } from "@/src/theme";

type Editor = "weight" | "sleep" | null;

/**
 * "Hoy" en el Panel: todo lo que se anota en un día, sin cambiar de pestaña.
 * Arriba se elige el día (para corregir días anteriores); debajo, la energía,
 * peso, agua y sueño en tarjetas que se abren al tocarlas, y un solo botón
 * para registrar comida (las comidas del día se abren en su propia pantalla).
 */
export function TodaySection({
  profile,
  date,
  onDate,
  refresh,
  onChanged,
  action,
}: {
  profile: NutritionProfile;
  onChanged: () => void;
  /** El día que se mira (lo eligen la tira de fechas y el calendario). */
  date: string;
  onDate: (date: string) => void;
  /** Cambia en cada lectura del Panel: la tira vuelve a leer sus anillos. */
  refresh: unknown;
  /** Con dieta cargada, registrar va por su tarjeta en lugar del botón. */
  action?: ReactNode;
}) {
  const router = useRouter();
  const [day, setDay] = useState<DailyBiometrics | null>(null);
  const [entries, setEntries] = useState<MealEntry[]>([]);
  const [lastWeight, setLastWeight] = useState<number | null>(null);
  const [sleep, setSleep] = useState<SleepEntry | null>(null);
  const [routine, setRoutine] = useState<Routine | null>(null);
  const [editor, setEditor] = useState<Editor>(null);
  const [form, setForm] = useState<BodyForm>(emptyForm);
  /** Con "Preguntarme": la noche que calculó el teléfono, a la espera de que la persona la acepte. */
  const [phoneNight, setPhoneNight] = useState<SleepInput | null>(null);
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null);
  const [weighTime, setWeighTime] = useState<string | null>(null);
  const unit = weightUnitOf(profile);
  const today = localDateKey();

  // Al abrir el Panel (hoy, sin noche anotada y con permiso), la noche sale del uso del teléfono.
  const checkPhoneNight = useCallback(async (current: string, hasNight: boolean) => {
    const setting = autoSleepSettingOf(await getSetting(AUTO_SLEEP_KEY));
    const today = localDateKey();
    if (!shouldCheckSleep({ setting, date: current, today, hasAccess: hasUsageAccess(), hasNight })) return;
    const window = nightWindow(current);
    const found = sleepFromScreen(await screenEvents(window.start, window.end), current);
    if (!found) return;
    await setSetting(AUTO_SLEEP_KEY, { ...setting, checked: today });
    if (setting.mode === "ask") return setPhoneNight(found);
    await saveSleep(found, current, "phone");
    const length = sleepMinutes(found.bedtime, found.wakeTime);
    setSleep({ id: "", date: current, ...found, source: "phone" });
    setMessage({
      text: `Noche calculada con el teléfono: ${found.bedtime} a ${found.wakeTime}${length ? ` (${formatDuration(length)})` : ""}. Toca Sueño para corregirla.`,
      error: false,
    });
    onChangedRef.current();
  }, []);
  const onChangedRef = useRef(onChanged);
  onChangedRef.current = onChanged;

  const load = useCallback(
    (current: string) => {
      Promise.all([
        getBiometricsByDate(current),
        getMealEntries(current),
        getRecentBiometrics(),
        getSleepSince(current),
        getRoutine(),
        getSetting(REMINDERS_KEY),
      ]).then(([record, meals, rows, nights, nextRoutine, reminders]) => {
        const { weighIn } = normalizeConfig(reminders, () => "");
        setWeighTime(remindersAvailable && weighIn?.enabled ? weighIn.time : null);
        const night = nights.find((entry) => entry.date === current) ?? null;
        setDay(record);
        setEntries(meals);
        setLastWeight(rows.find((row) => row.weightKg)?.weightKg ?? null);
        setSleep(night);
        setRoutine(nextRoutine);
        setForm(formFromRecord(record, unit));
        if (phoneUsageAvailable) checkPhoneNight(current, Boolean(night));
      });
    },
    [unit, checkPhoneNight],
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
    haptic.success();
    setEditor(null);
    changed("Peso guardado.");
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
  const weekday = weekdayOf(new Date(year, month - 1, dayOfMonth));
  const trainingDay = routine?.days.includes(weekday) ?? false;
  // Metas del día: el reparto semanal y el tipo de plan las cambian sin mover el promedio.
  const dayTargets = targetsForWeekday(profile, weekday, routine?.days ?? []);
  const waterTarget = waterTargetMl(
    day?.weightKg ?? lastWeight,
    trainingDay ? (routine?.sessionMinutes ?? 0) : 0,
  );
  const waterMl = day?.waterMl ?? 0;
  const nightMinutes = sleep ? sleepMinutes(sleep.bedtime, sleep.wakeTime) : null;
  const weightKg = toKg(Number(form.weight), unit);
  const bodyFat = Number(form.bodyFat);
  const toggle = (next: Editor) => {
    setMessage(null);
    setEditor(editor === next ? null : next);
  };

  return (
    <View style={{ gap: 12 }}>
      <DayStrip date={date} onChange={onDate} refresh={refresh} />

      {dayTargets.offset ? (
        <Text style={[AppTheme.hint, { paddingHorizontal: 4 }]}>
          {trainingDay ? "Día de entreno" : "Día de descanso"}: {dayTargets.offset > 0 ? "+" : "−"}
          {Math.abs(dayTargets.offset)} kcal frente a tu promedio de {profile.calorieTarget}.
        </Text>
      ) : null}
      <DaySummary totals={totals} targets={dayTargets} />
      {date === today && totals.kcal > 0 && dailyTip(totals, dayTargets, new Date().getHours()) ? (
        <View style={[AppTheme.banner, { paddingVertical: 10 }]}>
          <Text style={AppTheme.bannerText}>{dailyTip(totals, dayTargets, new Date().getHours())}</Text>
        </View>
      ) : null}

      {action ?? (
        <View style={{ gap: 6 }}>
          <Button
            title="Registrar comida"
            onPress={() => router.push({ pathname: "/meals", params: { date } })}
          />
          {entries.length || day?.fasting || day?.partial ? (
            <Text style={[AppTheme.hint, { textAlign: "center" }]}>
              {entries.length
                ? `${entries.length} ${entries.length === 1 ? "alimento registrado" : "alimentos registrados"} · ${totals.kcal} kcal`
                : day?.fasting
                  ? "Día de ayuno"
                  : "Día"}
              {day?.partial ? (entries.length || day.fasting ? " · incompleto" : " incompleto") : ""}
            </Text>
          ) : null}
        </View>
      )}

      <View style={AppTheme.quickRow}>
        <QuickTile
          icon="scale-outline"
          color={AppTheme.colors.violet}
          label="Peso"
          value={day?.weightKg ? formatWeight(day.weightKg, unit) : "Anotar"}
          active={editor === "weight"}
          done={Boolean(day?.weightKg)}
          onPress={() => toggle("weight")}
        />
        <QuickTile
          icon="moon-outline"
          color={AppTheme.colors.blue}
          label="Sueño"
          value={nightMinutes ? formatDuration(nightMinutes).replace(/(h \d+) min$/, "$1") : "Anotar"}
          active={editor === "sleep"}
          done={Boolean(nightMinutes)}
          hint={sleep?.source === "phone" ? "Del teléfono" : undefined}
          onPress={() => toggle("sleep")}
        />
        <View style={[AppTheme.quickTile, waterMl >= waterTarget && AppTheme.quickTileDone]}>
          <View style={AppTheme.legendRow}>
            <Ionicons name="water-outline" size={16} color={AppTheme.colors.blue} />
            <Text style={AppTheme.quickLabel}>Agua</Text>
          </View>
          <View>
            <Text style={AppTheme.quickValue} numberOfLines={1}>
              {formatWater(waterMl)}
            </Text>
            <Text style={AppTheme.quickHint}>de {formatWater(waterTarget)}</Text>
          </View>
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
              hitSlop={11}
            >
              <Ionicons name="remove-circle-outline" size={22} color={AppTheme.colors.muted} />
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Agregar un vaso de agua"
              onPress={() => water(250)}
              hitSlop={11}
            >
              <Ionicons name="add-circle" size={22} color={AppTheme.colors.blue} />
            </Pressable>
          </View>
        </View>
      </View>
      {day?.steps ? (
        <View style={[AppTheme.legendRow, { paddingHorizontal: 4 }]}>
          <Ionicons name="footsteps-outline" size={15} color={AppTheme.colors.accent} />
          <Text style={AppTheme.hint}>{day.steps.toLocaleString("es-PE")} pasos · de Health Connect</Text>
        </View>
      ) : null}

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
              : "La composición es opcional: llena solo lo que mida tu balanza."}
          </Text>
          <View style={[AppTheme.legendRow, { alignItems: "flex-start" }]}>
            <Ionicons name="time-outline" size={16} color={AppTheme.colors.muted} style={{ marginTop: 1 }} />
            <Text style={[AppTheme.hint, { flex: 1 }]}>
              Mejor a la misma hora todos los días: al despertar, después del baño y antes de comer. Así hay
              menos agua de por medio y el cálculo es más preciso.
              {weighTime ? ` Te aviso a las ${weighTime}.` : ""}
            </Text>
          </View>
          {remindersAvailable ? (
            <LinkButton
              title={weighTime ? "Cambiar la hora del aviso" : "Avisarme cada día"}
              onPress={() => router.push("/reminders")}
            />
          ) : null}
          <Button title={day?.weightKg ? "Guardar cambios de peso" : "Guardar peso"} onPress={saveBody} />
        </View>
      ) : null}

      {phoneNight ? (
        <View style={AppTheme.card}>
          <View style={AppTheme.legendRow}>
            <Ionicons name="phone-portrait-outline" size={16} color={AppTheme.colors.blue} />
            <Text style={[AppTheme.legendLabel, { flex: 1 }]}>Tu noche, según el teléfono</Text>
          </View>
          <Text style={AppTheme.body}>
            {phoneNight.bedtime} a {phoneNight.wakeTime}
            {sleepMinutes(phoneNight.bedtime, phoneNight.wakeTime)
              ? ` · ${formatDuration(sleepMinutes(phoneNight.bedtime, phoneNight.wakeTime) ?? 0)}`
              : ""}
          </Text>
          <Button
            title="Guardar esta noche"
            onPress={async () => {
              await saveSleep(phoneNight, date, "phone");
              setPhoneNight(null);
              changed("Sueño guardado.");
            }}
          />
          <LinkButton title="No es correcta" onPress={() => setPhoneNight(null)} />
        </View>
      ) : null}

      {editor === "sleep" ? (
        <SleepEditor
          key={`${date}-${sleep?.bedtime ?? ""}-${sleep?.wakeTime ?? ""}`}
          date={date}
          sleep={sleep}
          onMessage={setMessage}
          onDone={(text) => {
            setEditor(null);
            setPhoneNight(null);
            changed(text);
          }}
        />
      ) : null}

      {message ? (
        <Text style={message.error ? AppTheme.errorText : AppTheme.body}>{message.text}</Text>
      ) : null}
    </View>
  );
}

function QuickTile({
  icon,
  color,
  label,
  value,
  active,
  done,
  hint,
  onPress,
}: {
  icon: IconName;
  color: string;
  label: string;
  value: string;
  active: boolean;
  done: boolean;
  /** Reemplaza "Editar" cuando el dato tiene algo que contar (de dónde salió). */
  hint?: string;
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
        <Ionicons name={icon} size={16} color={color} />
        <Text style={AppTheme.quickLabel}>{label}</Text>
      </View>
      <Text style={AppTheme.quickValue} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
      <Text style={AppTheme.quickHint}>{active ? "Cerrar" : done ? (hint ?? "Editar") : "Sin dato"}</Text>
    </Pressable>
  );
}
