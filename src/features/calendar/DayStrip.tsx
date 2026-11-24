import { useCallback, useState } from "react";
import { View } from "react-native";
import { useFocusEffect } from "expo-router";

import { PressableScale } from "@/src/components/PressableScale";
import { Text } from "@/src/components/Text";
import { LinkButton } from "@/src/components/ui";
import { daysBetween, dayScore, GOALS, stripDates } from "@/src/features/calendar/calendar";
import { DayRing } from "@/src/features/calendar/DayRing";
import { getComplianceDays, type ComplianceDay } from "@/src/features/habits/compliance.data";
import { weekdayOf, WEEKDAYS } from "@/src/features/reminders/reminders";
import { haptic } from "@/src/lib/haptics";
import { dayLabel, localDateKey } from "@/src/lib/dates";
import { AppTheme, RADIUS } from "@/src/theme";

const letterOf = (date: string) => {
  const [year, month, day] = date.split("-").map(Number);
  const id = weekdayOf(new Date(year, month - 1, day));
  return WEEKDAYS.find((item) => item.id === id)?.short ?? "";
};

/** Los últimos días, cada uno con el anillo de sus objetivos. Tocar uno lleva a ese día. */
export function DayStrip({
  date,
  onChange,
  refresh,
}: {
  date: string;
  onChange: (date: string) => void;
  /** Cambia cuando se guarda algo, para volver a leer los anillos. */
  refresh: unknown;
}) {
  const today = localDateKey();
  const dates = stripDates(date, today);
  const first = dates[0];
  const [days, setDays] = useState<Map<string, ComplianceDay>>(new Map());
  useFocusEffect(
    useCallback(() => {
      let current = true;
      getComplianceDays(daysBetween(first, today) + 1).then((list) => {
        if (current) setDays(new Map(list.map((day) => [day.date, day])));
      });
      return () => {
        current = false;
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [first, today, refresh]),
  );
  return (
    <View style={{ gap: 6 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
        {dates.map((item) => {
          const active = item === date;
          const score = dayScore(days.get(item));
          return (
            <PressableScale
              key={item}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              accessibilityLabel={`${dayLabel(item)}, ${score} de ${GOALS} objetivos`}
              onPress={() => {
                if (!active) haptic.tap();
                onChange(item);
              }}
              style={{
                flex: 1,
                maxWidth: 52,
                alignItems: "center",
                gap: 6,
                paddingVertical: 8,
                borderRadius: RADIUS.card,
                backgroundColor: active ? AppTheme.colors.surface2 : "transparent",
              }}
            >
              <Text
                style={[
                  AppTheme.hint,
                  { fontSize: 12, lineHeight: 16 },
                  active && { color: AppTheme.colors.text },
                ]}
                maxFontSizeMultiplier={1.2}
              >
                {item === today ? "Hoy" : letterOf(item)}
              </Text>
              <DayRing score={score} label={String(Number(item.slice(8)))} />
            </PressableScale>
          );
        })}
      </View>
      {date === today ? null : (
        <View style={[AppTheme.sectionHeader, { paddingHorizontal: 4 }]}>
          <Text style={AppTheme.cardTitle}>{dayLabel(date)}</Text>
          <LinkButton title="Volver a hoy" onPress={() => onChange(today)} />
        </View>
      )}
    </View>
  );
}
