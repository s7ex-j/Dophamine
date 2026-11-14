import { useCallback, useState } from "react";
import { ScrollView, Text, TextInput, View } from "react-native";
import { useFocusEffect } from "expo-router";

import { DetailChart } from "@/src/components/DetailChart";
import { Button, Card, Chips, Screen } from "@/src/components/ui";
import {
  latestMeasurements,
  MEASUREMENT_FIELDS,
  measurementChange,
  MEASUREMENTS_KEY,
  navyBodyFat,
  readMeasurements,
  upsertMeasurement,
  waistToHeight,
  type Measurement,
  type MeasurementField,
} from "@/src/features/measurements/measurements";
import type { NutritionProfile } from "@/src/features/profile/profile";
import { getNutritionProfile } from "@/src/features/profile/profile.repository";
import { getSetting, setSetting } from "@/src/features/settings/settings.repository";
import { localDateKey } from "@/src/lib/dates";
import { VIEWER } from "@/src/lib/mode";
import { AppTheme } from "@/src/theme";

const signed = (value: number) => `${value > 0 ? "+" : value < 0 ? "−" : "±"}${Math.abs(value)} cm`;

// Medidas con cinta: anotar las de hoy, ver cada una en el tiempo y lo que cambió.
export default function MeasurementsScreen() {
  const [list, setList] = useState<Measurement[]>([]);
  const [profile, setProfile] = useState<NutritionProfile | null>(null);
  const [form, setForm] = useState<Partial<Record<MeasurementField, string>>>({});
  const [field, setField] = useState<MeasurementField>("waistCm");
  const [saved, setSaved] = useState(false);
  const load = useCallback(() => {
    getSetting(MEASUREMENTS_KEY).then((value) => setList(readMeasurements(value)));
    getNutritionProfile().then(setProfile);
  }, []);
  useFocusEffect(load);

  const save = async () => {
    const entry: Measurement = { date: localDateKey() };
    for (const { key } of MEASUREMENT_FIELDS) {
      const value = Number((form[key] ?? "").replace(",", "."));
      if (value > 0) entry[key] = value;
    }
    const next = upsertMeasurement(list, entry);
    setList(next);
    await setSetting(MEASUREMENTS_KEY, next);
    setForm({});
    setSaved(true);
  };
  const latest = latestMeasurements(list);
  const series = list.filter((item) => item[field] !== undefined);
  const navy = profile ? navyBodyFat(profile.sex, profile.heightCm, latest) : null;
  const ratio = profile ? waistToHeight(latest.waistCm, profile.heightCm) : null;

  return (
    <Screen>
      <ScrollView contentContainerStyle={AppTheme.content} keyboardShouldPersistTaps="handled">
        {VIEWER ? null : (
          <Card title="Medir hoy">
            <Text style={AppTheme.hint}>Anota solo las que tengas. Mide en ayunas y siempre igual.</Text>
            {MEASUREMENT_FIELDS.map((item) => (
              <View key={item.key} style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Text style={AppTheme.entryName}>{item.label}</Text>
                  <Text style={AppTheme.entryDetail}>{item.hint}</Text>
                </View>
                <TextInput
                  accessibilityLabel={`${item.label} en cm`}
                  value={form[item.key] ?? ""}
                  onChangeText={(text) => {
                    setSaved(false);
                    setForm({ ...form, [item.key]: text });
                  }}
                  keyboardType="decimal-pad"
                  placeholder={latest[item.key] ? String(latest[item.key]) : "cm"}
                  placeholderTextColor={AppTheme.colors.muted}
                  style={[AppTheme.input, { width: 84, textAlign: "center" }]}
                />
              </View>
            ))}
            <Button title={saved ? "Guardado" : "Guardar medidas"} onPress={save} />
          </Card>
        )}

        <Chips
          value={field}
          onChange={setField}
          options={MEASUREMENT_FIELDS.map((item) => ({ value: item.key, label: item.label }))}
        />
        <View style={AppTheme.card}>
          {series.length >= 2 ? (
            <DetailChart
              key={field}
              insight={{
                title: MEASUREMENT_FIELDS.find((item) => item.key === field)?.label ?? "",
                unit: "cm",
                dates: series.map((item) => item.date),
                series: [
                  {
                    label: "cm",
                    color: "violet",
                    kind: "line",
                    values: series.map((item) => item[field] ?? null),
                  },
                ],
              }}
            />
          ) : (
            <Text style={AppTheme.body}>Con dos mediciones verás cómo cambia.</Text>
          )}
        </View>

        <Card title="Desde tu primera medición">
          {MEASUREMENT_FIELDS.map((item) => {
            const change = measurementChange(list, item.key);
            return change ? (
              <View key={item.key} style={AppTheme.legendRow}>
                <Text style={AppTheme.legendLabel}>{item.label}</Text>
                <Text style={AppTheme.legendValue}>
                  {change.last} cm ({signed(change.change)})
                </Text>
              </View>
            ) : null;
          })}
          {!list.length ? <Text style={AppTheme.body}>Aún no hay medidas.</Text> : null}
          {ratio !== null ? (
            <Text style={AppTheme.hint}>
              Cintura ÷ altura: {ratio} {ratio < 0.5 ? "(por debajo de 0.5)" : "(0.5 o más)"}.
            </Text>
          ) : null}
          {navy !== null ? (
            <Text style={AppTheme.hint}>
              % de grasa estimado por perímetros (fórmula de la Marina de EE. UU.): {navy} %. Es aproximado
              (±3–4 puntos); sirve para ver la tendencia.
            </Text>
          ) : null}
        </Card>
      </ScrollView>
    </Screen>
  );
}
