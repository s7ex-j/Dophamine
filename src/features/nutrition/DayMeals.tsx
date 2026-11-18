import { useCallback, useState } from "react";
import { Switch, View } from "react-native";
import { Text } from "@/src/components/Text";
import { useFocusEffect, useRouter } from "expo-router";

import { LinkButton, RowActions } from "@/src/components/ui";
import {
  deleteDailyBiometrics,
  getBiometricsByDate,
  setDayFasting,
  setDayPartial,
  type DailyBiometrics,
} from "@/src/features/biometrics/biometrics.repository";
import {
  CLIPBOARD_KEY,
  clipboardKcal,
  copyMeal,
  copyWholeDay,
  pastePlan,
  readClipboard,
  type Clipboard,
} from "@/src/features/nutrition/clipboard";
import { MealCard } from "@/src/features/nutrition/MealSections";
import { groupBySlot, suggestPartial, totalsOf, type MealEntry } from "@/src/features/nutrition/meals";
import {
  addMealEntries,
  copyDay,
  deleteDayMeals,
  deleteMealEntry,
  getMealEntries,
} from "@/src/features/nutrition/nutrition.repository";
import { saveMealFromEntries } from "@/src/features/nutrition/savedMeals.repository";
import { mealSetupOf, type NutritionProfile } from "@/src/features/profile/profile";
import { getSetting, setSetting } from "@/src/features/settings/settings.repository";
import { deleteSleep } from "@/src/features/sleep/sleep.repository";
import { addDays } from "@/src/lib/dates";
import { AppTheme } from "@/src/theme";

/**
 * Las comidas de un día, tal como se definieron en el plan (por nombre o por
 * número). Se abre desde "Registrar comida" en el Panel: ahí se agrega, edita,
 * copia y pega, y se marca el día como incompleto o de ayuno.
 */
export function DayMeals({ date, profile }: { date: string; profile: NutritionProfile }) {
  const router = useRouter();
  const [day, setDay] = useState<DailyBiometrics | null>(null);
  const [entries, setEntries] = useState<MealEntry[]>([]);
  const [previous, setPrevious] = useState(0);
  const [clipboard, setClipboard] = useState<Clipboard | null>(null);
  const [message, setMessage] = useState("");

  const load = useCallback(() => {
    Promise.all([
      getBiometricsByDate(date),
      getMealEntries(date),
      getMealEntries(addDays(date, -1)),
      getSetting(CLIPBOARD_KEY),
    ]).then(([record, meals, before, copied]) => {
      setDay(record);
      setEntries(meals);
      setPrevious(before.length);
      setClipboard(readClipboard(copied));
    });
  }, [date]);
  useFocusEffect(load);

  const changed = (text = "") => {
    load();
    setMessage(text);
  };
  const copy = async (next: Clipboard | null, text: string) => {
    if (!next) return;
    await setSetting(CLIPBOARD_KEY, next);
    setClipboard(next);
    setMessage(text);
  };
  const paste = async (slot?: string) => {
    if (!clipboard) return;
    for (const item of pastePlan(clipboard, slot)) await addMealEntries(date, item.slot, item.drafts);
    changed(`Pegado: ${clipboard.label} (${clipboardKcal(clipboard)} kcal).`);
  };
  const mealPaste =
    clipboard?.kind === "meal" ? `${clipboard.label} · ${clipboardKcal(clipboard)} kcal` : null;
  const totals = totalsOf(entries);

  return (
    <View style={{ gap: 12 }}>
      <Text style={AppTheme.hint}>
        {entries.length
          ? `${entries.length} ${entries.length === 1 ? "alimento" : "alimentos"} · ${totals.kcal} kcal`
          : "Nada registrado todavía."}
      </Text>
      {message ? <Text style={AppTheme.body}>{message}</Text> : null}
      <View style={[AppTheme.rowActions, { flexWrap: "wrap" }]}>
        {entries.length ? (
          <LinkButton
            title="Copiar el día"
            onPress={() =>
              copy(copyWholeDay(entries, date), 'Día copiado: ve a otro día y toca "Pegar el día".')
            }
          />
        ) : null}
        {clipboard?.kind === "day" && clipboard.from !== date ? (
          <LinkButton title={`Pegar el día ${clipboard.label.slice(5)}`} onPress={() => paste()} />
        ) : null}
        {!entries.length && previous > 0 ? (
          <LinkButton
            title={`Copiar los ${previous} alimentos del día anterior`}
            onPress={async () => {
              const copied = await copyDay(addDays(date, -1), date);
              changed(`Se copiaron ${copied} alimentos del día anterior.`);
            }}
          />
        ) : null}
      </View>
      {groupBySlot(entries, mealSetupOf(profile)).map((slot) => (
        <MealCard
          key={slot.id}
          slot={slot.id}
          label={slot.label}
          entries={slot.entries}
          kcal={slot.totals.kcal}
          onAdd={() => router.push({ pathname: "/add-food", params: { date, slot: slot.id } })}
          onRemove={async (entry) => {
            await deleteMealEntry(entry);
            changed();
          }}
          onEdit={(entry) => router.push({ pathname: "/edit-entry", params: { id: entry.id, date } })}
          onSave={(name) => saveMealFromEntries(name, slot.entries)}
          onCopy={() =>
            copy(
              copyMeal(slot.entries, `${slot.label} del ${date.slice(5)}`),
              `${slot.label} copiado: toca "Pegar aquí" en otra comida o en otro día.`,
            )
          }
          pasteLabel={mealPaste}
          onPaste={() => paste(slot.id)}
        />
      ))}
      {suggestPartial(entries, day?.partial) ? (
        <View style={[AppTheme.banner, { gap: 6 }]}>
          <Text style={AppTheme.body}>
            Más de la mitad de las calorías de este día son estimadas. Si no estás seguro de los números,
            márcalo como incompleto: así no altera el cálculo de tu gasto.
          </Text>
          <LinkButton
            title="Marcar como incompleto"
            onPress={async () => {
              await setDayPartial(date, true);
              changed("Día marcado como incompleto.");
            }}
          />
        </View>
      ) : null}
      {entries.length || day?.caloriesIn ? (
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
      <View style={[AppTheme.sectionHeader, { paddingHorizontal: 4 }]}>
        <Text style={AppTheme.hint}>Día de ayuno (lo comido, aunque sea nada, cuenta)</Text>
        <Switch
          accessibilityLabel="Día de ayuno"
          value={Boolean(day?.fasting)}
          onValueChange={async (fasting) => {
            await setDayFasting(date, fasting);
            changed();
          }}
          trackColor={{ true: AppTheme.colors.violet, false: AppTheme.colors.border }}
          thumbColor={AppTheme.colors.text}
        />
      </View>
      {entries.length || day ? (
        <RowActions
          question={`¿Borrar todo lo registrado el ${date}? Comidas, peso y sueño.`}
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
