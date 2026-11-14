import { useCallback, useState } from "react";
import { ScrollView, Switch, Text, TextInput, View } from "react-native";
import { useFocusEffect } from "expo-router";

import { Button, Card, Chips, IconButton, LinkButton, Screen } from "@/src/components/ui";
import { ViewerOnlyNotice } from "@/src/features/backup/ViewerSections";
import {
  copyToAllDays,
  dayError,
  defaultConfig,
  normalizeConfig,
  normalizeTime,
  sortMeals,
  templateMeals,
  TEMPLATE_SIZES,
  weekdayOf,
  WEEKDAYS,
  type ReminderConfig,
  type Weekday,
} from "@/src/features/reminders/reminders";
import { remindersAvailable, requestPermission, scheduleReminders } from "@/src/features/reminders/scheduler";
import { getSetting, setSetting } from "@/src/features/settings/settings.repository";
import { VIEWER } from "@/src/lib/mode";
import { AppTheme } from "@/src/theme";

const KEY = "meal_reminders";
const newId = () => `${Date.now()}-${Math.random().toString(36).slice(2)}`;

export default function RemindersScreen() {
  return VIEWER ? <ViewerOnlyNotice what="Los recordatorios" /> : <RemindersContent />;
}

// Recordatorios de comidas: cuántas comidas y a qué hora, distinto para cada día.
// La app avisa unos minutos antes con una frase corta.
function RemindersContent() {
  const [config, setConfig] = useState<ReminderConfig>(() => defaultConfig(newId));
  const [day, setDay] = useState<Weekday>(weekdayOf(new Date()));
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null);

  useFocusEffect(
    useCallback(() => {
      getSetting(KEY).then((saved) => setConfig(normalizeConfig(saved, newId)));
    }, []),
  );

  const meals = config.days[day];
  const update = (next: ReminderConfig) => {
    setMessage(null);
    setConfig(next);
  };
  const setMeals = (next: ReminderConfig["days"][Weekday]) =>
    update({ ...config, days: { ...config.days, [day]: next } });
  const setMeal = (id: string, field: "label" | "time", value: string) =>
    setMeals(meals.map((meal) => (meal.id === id ? { ...meal, [field]: value } : meal)));

  const save = async () => {
    for (const weekday of WEEKDAYS) {
      const problem = dayError(config.days[weekday.id]);
      if (problem) {
        setDay(weekday.id);
        return setMessage({ text: `${weekday.label}: ${problem}`, error: true });
      }
    }
    const clean: ReminderConfig = {
      ...config,
      days: Object.fromEntries(
        WEEKDAYS.map((weekday) => [
          weekday.id,
          sortMeals(
            config.days[weekday.id].map((meal) => ({
              ...meal,
              label: meal.label.trim(),
              time: normalizeTime(meal.time) as string,
            })),
          ),
        ]),
      ) as ReminderConfig["days"],
      ...(config.weighIn
        ? { weighIn: { ...config.weighIn, time: normalizeTime(config.weighIn.time) ?? "07:00" } }
        : {}),
    };
    if ((clean.enabled || clean.weighIn?.enabled) && remindersAvailable && !(await requestPermission()))
      return setMessage({
        text: "Sin permiso para notificaciones. Actívalo en los ajustes del teléfono.",
        error: true,
      });
    await setSetting(KEY, clean);
    setConfig(clean);
    const count = await scheduleReminders(clean);
    setMessage({
      text:
        !count && !clean.enabled && !clean.weighIn?.enabled
          ? "Guardado. Los recordatorios están apagados."
          : remindersAvailable
            ? `Listo: ${count} avisos programados en la semana.`
            : "Guardado. Los avisos solo suenan en la app del teléfono.",
      error: false,
    });
  };

  return (
    <Screen>
      <ScrollView contentContainerStyle={AppTheme.content} keyboardShouldPersistTaps="handled">
        <Card title="Recordatorios">
          <View style={AppTheme.sectionHeader}>
            <Text style={AppTheme.body}>Avisar {config.leadMinutes} min antes de cada comida</Text>
            <Switch
              accessibilityLabel="Recordatorios encendidos"
              value={config.enabled}
              onValueChange={(enabled) => update({ ...config, enabled })}
              trackColor={{ true: AppTheme.colors.accent, false: AppTheme.colors.border }}
              thumbColor={AppTheme.colors.text}
            />
          </View>
          <Chips
            value={config.leadMinutes}
            onChange={(leadMinutes) => update({ ...config, leadMinutes })}
            options={[5, 10, 15, 30].map((minutes) => ({ value: minutes, label: `${minutes} min` }))}
          />
        </Card>

        <Card title="Pesaje diario">
          <View style={AppTheme.sectionHeader}>
            <Text style={[AppTheme.body, { flex: 1 }]}>Recordarme pesarme cada mañana</Text>
            <Switch
              accessibilityLabel="Recordatorio de pesaje"
              value={Boolean(config.weighIn?.enabled)}
              onValueChange={(enabled) =>
                update({ ...config, weighIn: { time: config.weighIn?.time ?? "07:00", enabled } })
              }
              trackColor={{ true: AppTheme.colors.accent, false: AppTheme.colors.border }}
              thumbColor={AppTheme.colors.text}
            />
          </View>
          {config.weighIn?.enabled ? (
            <TextInput
              accessibilityLabel="Hora del pesaje"
              value={config.weighIn.time}
              onChangeText={(time) => update({ ...config, weighIn: { enabled: true, time } })}
              placeholder="07:00"
              placeholderTextColor={AppTheme.colors.muted}
              style={[AppTheme.input, { width: 100 }]}
            />
          ) : null}
          <Text style={AppTheme.hint}>
            Pesarte a diario a la misma hora hace la tendencia más fiable; no importa el número de un día.
          </Text>
        </Card>

        <Chips
          value={day}
          onChange={setDay}
          options={WEEKDAYS.map((weekday) => ({ value: weekday.id, label: weekday.short }))}
        />

        <Card title={`${WEEKDAYS.find((weekday) => weekday.id === day)?.label} · ${meals.length} comidas`}>
          <Chips
            value={meals.length}
            onChange={(count) => setMeals(templateMeals(count, newId))}
            options={TEMPLATE_SIZES.map((size) => ({ value: size, label: String(size) }))}
          />
          {meals.map((meal) => (
            <View key={meal.id} style={AppTheme.entryRow}>
              <TextInput
                accessibilityLabel="Hora"
                value={meal.time}
                onChangeText={(time) => setMeal(meal.id, "time", time)}
                onBlur={() => setMeal(meal.id, "time", normalizeTime(meal.time) ?? meal.time)}
                keyboardType="numbers-and-punctuation"
                style={[AppTheme.input, { width: 78, textAlign: "center" }]}
                placeholder="07:30"
                placeholderTextColor={AppTheme.colors.muted}
              />
              <TextInput
                accessibilityLabel="Nombre de la comida"
                value={meal.label}
                onChangeText={(label) => setMeal(meal.id, "label", label)}
                style={[AppTheme.input, { flex: 1, minWidth: 0 }]}
                placeholderTextColor={AppTheme.colors.muted}
              />
              <IconButton
                icon="trash-outline"
                label={`Quitar ${meal.label}`}
                danger
                onPress={() => setMeals(meals.filter((item) => item.id !== meal.id))}
              />
            </View>
          ))}
          <View style={AppTheme.rowActions}>
            <LinkButton
              title="Agregar comida"
              onPress={() => setMeals([...meals, { id: newId(), label: "Comida", time: "" }])}
            />
            <LinkButton
              title="Usar en toda la semana"
              onPress={() => update(copyToAllDays(config, day, newId))}
            />
          </View>
        </Card>

        {message ? (
          <Text style={message.error ? AppTheme.errorText : AppTheme.body}>{message.text}</Text>
        ) : null}
        <Button title="Guardar recordatorios" onPress={save} />
        {!remindersAvailable ? (
          <Text style={AppTheme.hint}>
            En el navegador no hay avisos: se programan en la app del teléfono.
          </Text>
        ) : null}
      </ScrollView>
    </Screen>
  );
}
