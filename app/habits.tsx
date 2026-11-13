import { Ionicons } from "@expo/vector-icons";
import { useCallback, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { useFocusEffect } from "expo-router";

import { Card, Chips, Screen, type IconName } from "@/src/components/ui";
import { ViewerOnlyNotice } from "@/src/features/backup/ViewerSections";
import {
  COMPLIANCE_ITEMS,
  complianceRates,
  streak,
  type ComplianceKey,
  type DayCompliance,
} from "@/src/features/habits/compliance";
import { getComplianceDays } from "@/src/features/habits/compliance.data";
import { VIEWER } from "@/src/lib/mode";
import { AppTheme } from "@/src/theme";

const ICONS: Record<ComplianceKey, IconName> = {
  calories: "flame-outline",
  protein: "fish-outline",
  water: "water-outline",
  weight: "scale-outline",
  training: "barbell-outline",
  sleep: "moon-outline",
  wellbeing: "happy-outline",
};

export default function HabitsScreen() {
  return VIEWER ? <ViewerOnlyNotice what="El cumplimiento" /> : <ComplianceContent />;
}

// Cumplimiento: los seis compromisos de cada día, marcados solos con lo que se
// registró. Una fila por compromiso, un cuadro por día.
function ComplianceContent() {
  const [range, setRange] = useState(28);
  const [days, setDays] = useState<Array<{ date: string; compliance: DayCompliance }>>([]);
  useFocusEffect(
    useCallback(() => {
      getComplianceDays(range).then(setDays);
    }, [range]),
  );
  const values = days.map((day) => day.compliance);
  const rates = complianceRates(values);

  return (
    <Screen>
      <ScrollView contentContainerStyle={AppTheme.content}>
        <Chips
          value={range}
          onChange={setRange}
          options={[
            { value: 7, label: "7 días" },
            { value: 28, label: "4 semanas" },
            { value: 84, label: "12 semanas" },
          ]}
        />
        {COMPLIANCE_ITEMS.map((item) => (
          <Card key={item.key} title={item.label}>
            <View style={AppTheme.sectionHeader}>
              <View style={AppTheme.iconRow}>
                <View style={AppTheme.iconChip}>
                  <Ionicons name={ICONS[item.key]} size={18} color={AppTheme.colors.accent} />
                </View>
                <Text style={AppTheme.hint}>{item.rule}</Text>
              </View>
              <Text style={AppTheme.tileValue}>{rates[item.key]} %</Text>
            </View>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 4 }}>
              {days.map((day) => (
                <View
                  key={day.date}
                  accessibilityLabel={`${day.date}: ${day.compliance[item.key] ? "cumplido" : "no"}`}
                  style={{
                    width: range > 28 ? 8 : 16,
                    height: 16,
                    borderRadius: 4,
                    backgroundColor: day.compliance[item.key]
                      ? AppTheme.colors.accent
                      : AppTheme.colors.surface2,
                  }}
                />
              ))}
            </View>
            <Text style={AppTheme.hint}>Racha actual: {streak(values, item.key)} días</Text>
          </Card>
        ))}
        <Text style={AppTheme.hint}>
          Se calcula con lo que registras: comida, peso y agua en el Panel, sesiones en Entreno, sueño y
          bienestar. Los días de descanso de tu rutina cuentan como cumplidos en Entreno.
        </Text>
      </ScrollView>
    </Screen>
  );
}
