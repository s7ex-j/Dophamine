import { useCallback, useEffect, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useFocusEffect } from "expo-router";

import {
  Button,
  Card,
  Input,
  LinkButton,
  ListRow,
  ProgressBar,
  RowActions,
  Screen,
} from "@/src/components/ui";
import {
  deleteDailyBiometrics,
  getBiometricsByDate,
  getRecentBiometrics,
  saveDailyBiometrics,
  type DailyBiometrics,
} from "@/src/features/biometrics/biometrics.repository";
import {
  buildDailyInput,
  emptyForm,
  formCalories,
  formFromRecord,
  type DailyForm,
} from "@/src/features/biometrics/dailyLog";
import { leanMassKg } from "@/src/features/composition/composition";
import { weightUnitOf, type NutritionProfile } from "@/src/features/profile/profile";
import { getNutritionProfile } from "@/src/features/profile/profile.repository";
import { addDays, dayLabel, localDateKey } from "@/src/lib/dates";
import { formatWeight, toKg } from "@/src/lib/units";
import { ViewerOnlyNotice } from "@/src/features/backup/ViewerSections";
import { VIEWER } from "@/src/lib/mode";
import { AppTheme } from "@/src/theme";

// Pestaña "Diario": un día a la vez. Arriba se elige el día; debajo, el resumen
// de energía y las tres partes del registro (peso, nutrición y composición).
// En la web (visor de solo lectura) esta pantalla no registra nada.
export default function DailyLogScreen() {
  return VIEWER ? <ViewerOnlyNotice what="El Diario" /> : <DailyLogScreenContent />;
}

function DailyLogScreenContent() {
  const [date, setDate] = useState(localDateKey());
  const [form, setForm] = useState<DailyForm>(emptyForm);
  const [saved, setSaved] = useState<DailyBiometrics | null>(null);
  const [history, setHistory] = useState<DailyBiometrics[]>([]);
  const [profile, setProfile] = useState<NutritionProfile | null>(null);
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null);
  const unit = weightUnitOf(profile);
  const today = localDateKey();

  const load = useCallback((day: string) => {
    Promise.all([getBiometricsByDate(day), getRecentBiometrics(), getNutritionProfile()]).then(
      ([record, rows, nextProfile]) => {
        setProfile(nextProfile);
        setSaved(record);
        setForm(formFromRecord(record, weightUnitOf(nextProfile)));
        setHistory(rows);
      },
    );
  }, []);
  useFocusEffect(useCallback(() => load(date), [load, date]));
  useEffect(() => setMessage(null), [date]);

  const set = (key: keyof DailyForm) => (value: string) => {
    setMessage(null);
    setForm((current) => ({ ...current, [key]: value }));
  };
  const save = async () => {
    const result = buildDailyInput(form, unit);
    if (result.error !== null) return setMessage({ text: result.error, error: true });
    await saveDailyBiometrics(result.input, date);
    load(date);
    setMessage({ text: "Guardado. Tus datos quedan solo en este dispositivo.", error: false });
  };
  const remove = async () => {
    await deleteDailyBiometrics(date);
    load(date);
    setMessage({ text: "Registro borrado.", error: false });
  };

  const calories = formCalories(form);
  const target = profile?.calorieTarget ?? 0;
  const macros = [
    {
      label: "Proteína",
      value: Number(form.protein) || 0,
      target: profile?.proteinTarget,
      color: AppTheme.colors.coral,
    },
    {
      label: "Carbos",
      value: Number(form.carbs) || 0,
      target: profile?.carbsTarget,
      color: AppTheme.colors.amber,
    },
    {
      label: "Grasas",
      value: Number(form.fats) || 0,
      target: profile?.fatsTarget,
      color: AppTheme.colors.accent,
    },
  ];
  const weightKg = toKg(Number(form.weight), unit);
  const bodyFat = Number(form.bodyFat);

  return (
    <Screen>
      <ScrollView contentContainerStyle={AppTheme.content} keyboardShouldPersistTaps="handled">
        <Text style={AppTheme.eyebrow}>DIARIO</Text>
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

        <Card title="Energía del día">
          <View style={AppTheme.energyTop}>
            <View>
              <Text style={AppTheme.energyNumber}>{calories}</Text>
              <Text style={AppTheme.hint}>
                {target
                  ? calories <= target
                    ? `de ${target} kcal · quedan ${target - calories}`
                    : `de ${target} kcal · ${calories - target} por encima`
                  : "kcal"}
              </Text>
            </View>
          </View>
          <ProgressBar
            value={target ? (calories / target) * 100 : 0}
            color={target && calories > target * 1.1 ? AppTheme.colors.coral : AppTheme.colors.blue}
          />
          <View style={AppTheme.macroRow}>
            {macros.map((macro) => (
              <View key={macro.label} style={AppTheme.macroColumn}>
                <Text style={AppTheme.macroLabel}>{macro.label}</Text>
                <Text style={AppTheme.macroValue}>
                  {macro.value} g
                  {macro.target ? <Text style={AppTheme.macroTarget}> / {macro.target}</Text> : null}
                </Text>
                <ProgressBar
                  value={macro.target ? (macro.value / macro.target) * 100 : 0}
                  color={macro.color}
                />
              </View>
            ))}
          </View>
        </Card>

        <Card title="Peso">
          <Input
            label={`Peso del día (${unit})`}
            value={form.weight}
            onChangeText={set("weight")}
            keyboardType="decimal-pad"
            placeholder={history[0] ? `Último: ${formatWeight(history[0].weightKg, unit)}` : ""}
          />
          <Text style={AppTheme.hint}>Pésate al despertar, en las mismas condiciones cada vez.</Text>
        </Card>

        <Card title="Nutrición">
          <Input
            label="Calorías"
            value={form.calories}
            onChangeText={set("calories")}
            keyboardType="number-pad"
            placeholder="Vacío: se calculan con los macros"
          />
          <View style={AppTheme.fieldRow}>
            <View style={AppTheme.fieldRowItem}>
              <Input
                label="Proteína (g)"
                value={form.protein}
                onChangeText={set("protein")}
                keyboardType="number-pad"
              />
            </View>
            <View style={AppTheme.fieldRowItem}>
              <Input
                label="Carbos (g)"
                value={form.carbs}
                onChangeText={set("carbs")}
                keyboardType="number-pad"
              />
            </View>
            <View style={AppTheme.fieldRowItem}>
              <Input
                label="Grasas (g)"
                value={form.fats}
                onChangeText={set("fats")}
                keyboardType="number-pad"
              />
            </View>
          </View>
        </Card>

        <Card title="Composición corporal · opcional">
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
          <Text style={AppTheme.hint}>
            {weightKg > 0 && bodyFat > 0 && bodyFat < 100
              ? `Masa magra: ${formatWeight(leanMassKg(weightKg, bodyFat), unit, 1)} · Grasa: ${formatWeight(weightKg - leanMassKg(weightKg, bodyFat), unit, 1)}`
              : "Llena solo lo que mida tu balanza. Con el % de grasa se separa grasa de masa magra."}
          </Text>
        </Card>

        {message ? (
          <Text style={message.error ? AppTheme.errorText : AppTheme.body}>{message.text}</Text>
        ) : null}
        <Button title={saved ? "Guardar cambios" : "Guardar el día"} onPress={save} />
        {saved ? <RowActions question={`¿Borrar el registro del ${date}?`} onDelete={remove} /> : null}

        <Card title="Últimos días">
          {history.length ? (
            history.map((record) => (
              <View key={record.id}>
                <ListRow
                  title={`${dayLabel(record.date)} · ${record.date}`}
                  detail={`${record.caloriesIn} kcal · P ${record.proteinG} · C ${record.carbsG} · G ${record.fatsG}${
                    record.bodyFatPct ? ` · ${record.bodyFatPct} % grasa` : ""
                  }`}
                  value={formatWeight(record.weightKg, unit)}
                />
                <View style={AppTheme.rowActions}>
                  <LinkButton title="Abrir" onPress={() => setDate(record.date)} />
                </View>
              </View>
            ))
          ) : (
            <Text style={AppTheme.body}>Aún no hay registros guardados.</Text>
          )}
        </Card>
      </ScrollView>
    </Screen>
  );
}
