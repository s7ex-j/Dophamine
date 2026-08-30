import { useCallback, useEffect, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { useFocusEffect } from "expo-router";

import { getDashboardSnapshot, type DashboardSnapshot } from "@/src/features/dashboard/dashboard.repository";
import { Card, Metric, Screen } from "@/src/components/ui";
import { AppTheme } from "@/src/theme";

export default function DashboardScreen() {
  const [snapshot, setSnapshot] = useState<DashboardSnapshot | null>(null);
  const load = useCallback(() => { getDashboardSnapshot().then(setSnapshot); }, []);
  useEffect(load, [load]);
  useFocusEffect(load);

  return (
    <Screen>
      <ScrollView contentContainerStyle={AppTheme.content}>
        <Text style={AppTheme.eyebrow}>RESUMEN DIARIO</Text>
        <Text style={AppTheme.title}>Tu ritmo, sin ruido.</Text>
        <View style={AppTheme.metricGrid}>
          <Metric label="Peso" value={snapshot?.weightKg ? `${snapshot.weightKg} kg` : "--"} />
          <Metric label="Calorías" value={snapshot?.caloriesIn ? `${snapshot.caloriesIn}` : "--"} />
          <Metric label="TDEE estimado" value={snapshot?.tdee ? `${snapshot.tdee}` : "Sin datos"} />
          <Metric label="Estado" value={snapshot?.mood ? `${snapshot.mood}/5` : "--"} />
        </View>
        <Card title="Siguiente paso">
          <Text style={AppTheme.body}>{snapshot?.weightKg ? "Tus datos de hoy están guardados localmente." : "Registra tu primera medición en Progreso."}</Text>
        </Card>
        <Card title="Privacidad">
          <Text style={AppTheme.body}>Esta primera versión funciona sin cuenta y conserva los datos en este dispositivo.</Text>
        </Card>
      </ScrollView>
    </Screen>
  );
}

