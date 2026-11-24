import { useCallback, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { ScrollView, View } from "react-native";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";

import { PressableScale } from "@/src/components/PressableScale";
import { Text } from "@/src/components/Text";
import { Button, IconButton, Screen } from "@/src/components/ui";
import { ViewerOnlyNotice } from "@/src/features/backup/ViewerSections";
import {
  daysBetween,
  dayScore,
  firstDay,
  GOALS,
  goalRows,
  monthOf,
  monthWeeks,
  shiftMonth,
} from "@/src/features/calendar/calendar";
import { DayRing, GOAL_ICONS, goalColor, GoalsRing } from "@/src/features/calendar/DayRing";
import { pickDay } from "@/src/features/calendar/pickedDay";
import type { DayCompliance } from "@/src/features/habits/compliance";
import { getComplianceDays, type ComplianceDay } from "@/src/features/habits/compliance.data";
import { weightUnitOf } from "@/src/features/profile/profile";
import { getNutritionProfile } from "@/src/features/profile/profile.repository";
import { WEEKDAYS } from "@/src/features/reminders/reminders";
import { dayLabel, localDateKey } from "@/src/lib/dates";
import { VIEWER } from "@/src/lib/mode";
import type { WeightUnit } from "@/src/lib/units";
import { AppTheme, RADIUS } from "@/src/theme";

export default function CalendarScreen() {
  return VIEWER ? <ViewerOnlyNotice what="El calendario" /> : <CalendarContent />;
}

// Calendario: cada día es un anillo que se llena con los objetivos cumplidos. Al tocar un día,
// abajo se ven los seis por separado y se puede ir a ese día en el Panel.
function CalendarContent() {
  const router = useRouter();
  const params = useLocalSearchParams<{ date?: string }>();
  const today = localDateKey();
  const start = params.date && params.date <= today ? params.date : today;
  const [selected, setSelected] = useState(start);
  const [month, setMonth] = useState(monthOf(start));
  const [days, setDays] = useState<Map<string, ComplianceDay>>(new Map());
  const [unit, setUnit] = useState<WeightUnit>("kg");
  const monthStart = firstDay(month);

  useFocusEffect(
    useCallback(() => {
      let current = true;
      getNutritionProfile().then((profile) => profile && setUnit(weightUnitOf(profile)));
      getComplianceDays(daysBetween(monthStart, today) + 1).then((list) => {
        if (current) setDays(new Map(list.map((day) => [day.date, day])));
      });
      return () => {
        current = false;
      };
    }, [monthStart, today]),
  );

  const latest = firstDay(shiftMonth(month, 1)) > today;
  const title = new Date(month.year, month.month - 1, 1)
    .toLocaleDateString("es-PE", { month: "long", year: "numeric" })
    .replace(" de ", " ")
    .replace(/^./, (letter) => letter.toUpperCase());
  const move = (delta: number) => {
    const next = shiftMonth(month, delta);
    setMonth(next);
    // El detalle sigue al mes: hoy si es el actual; si no, su primer día.
    const first = firstDay(next);
    setSelected(firstDay(shiftMonth(next, 1)) > today ? today : first);
  };
  const day = days.get(selected);
  const rows = day ? goalRows(day, unit) : [];
  const missing = rows.filter((row) => !row.done);

  return (
    <Screen>
      <ScrollView contentContainerStyle={AppTheme.content}>
        <View style={AppTheme.sectionHeader}>
          <Text
            style={[AppTheme.title, { fontSize: 26, lineHeight: 30, flex: 1 }]}
            accessibilityRole="header"
          >
            {title}
          </Text>
          <View style={{ flexDirection: "row", gap: 8 }}>
            <IconButton icon="chevron-back" label="Mes anterior" onPress={() => move(-1)} />
            {latest ? (
              <View aria-hidden pointerEvents="none" style={{ opacity: 0.35 }}>
                <IconButton
                  icon="chevron-forward"
                  label="No hay meses siguientes"
                  onPress={() => undefined}
                />
              </View>
            ) : (
              <IconButton icon="chevron-forward" label="Mes siguiente" onPress={() => move(1)} />
            )}
          </View>
        </View>
        <View style={{ gap: 4 }}>
          <View style={{ flexDirection: "row" }}>
            {WEEKDAYS.map((item) => (
              <Text key={item.id} style={[AppTheme.hint, { flex: 1, textAlign: "center" }]}>
                {item.short}
              </Text>
            ))}
          </View>
          {monthWeeks(month).map((week, index) => (
            <View key={index} style={{ flexDirection: "row" }}>
              {week.map((date, column) => {
                if (!date) return <View key={column} style={{ flex: 1 }} />;
                const future = date > today;
                const score = dayScore(days.get(date));
                const active = date === selected;
                return (
                  <PressableScale
                    key={date}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active, disabled: future }}
                    accessibilityLabel={`${dayLabel(date)}, ${score} de ${GOALS} objetivos`}
                    disabled={future}
                    onPress={() => setSelected(date)}
                    style={{ flex: 1, alignItems: "center", paddingVertical: 2 }}
                  >
                    <View
                      style={{
                        padding: 4,
                        borderRadius: RADIUS.card,
                        backgroundColor: active ? AppTheme.colors.surface2 : "transparent",
                      }}
                    >
                      <DayRing score={score} label={String(Number(date.slice(8)))} future={future} />
                    </View>
                  </PressableScale>
                );
              })}
            </View>
          ))}
        </View>
        {day ? (
          <View style={[AppTheme.card, { borderRadius: RADIUS.hero }]}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 16 }}>
              <GoalsRing done={Object.fromEntries(rows.map((row) => [row.key, row.done])) as DayCompliance} />
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={[AppTheme.title, { fontSize: 22, lineHeight: 26 }]}>
                  {dayLabel(selected).replace(/^./, (letter) => letter.toUpperCase())}
                </Text>
                <Text style={AppTheme.hint}>
                  {!day.logged
                    ? "Sin nada anotado"
                    : missing.length === 0
                      ? "Día completo"
                      : missing.length === 1
                        ? `${selected === today ? "Falta" : "Faltó"} ${missing[0].label.toLowerCase()}`
                        : `${selected === today ? "Faltan" : "Faltaron"} ${missing.length} objetivos`}
                </Text>
              </View>
            </View>
            <View>
              {rows.map((row) => (
                <View
                  key={row.key}
                  accessible
                  accessibilityLabel={`${row.label}: ${row.done ? "cumplido" : "pendiente"}. ${row.value}`}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 12,
                    minHeight: 44,
                    borderTopWidth: 1,
                    borderTopColor: AppTheme.colors.border,
                  }}
                >
                  <Ionicons
                    name={GOAL_ICONS[row.key]}
                    size={20}
                    color={row.done ? goalColor(row.key) : AppTheme.colors.muted}
                  />
                  <Text style={[AppTheme.body, { flex: 1 }]}>{row.label}</Text>
                  <Text style={AppTheme.hint}>{row.value}</Text>
                  <Ionicons
                    name={row.done ? "checkmark-circle" : "ellipse-outline"}
                    size={20}
                    color={row.done ? goalColor(row.key) : AppTheme.colors.border}
                  />
                </View>
              ))}
            </View>
            <Button
              title="Ver y editar este día"
              variant="secondary"
              onPress={() => {
                pickDay(selected);
                if (router.canGoBack()) router.back();
                else router.replace("/");
              }}
            />
          </View>
        ) : null}
      </ScrollView>
    </Screen>
  );
}
