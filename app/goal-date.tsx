import { useCallback, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { useFocusEffect } from "expo-router";
import Svg, { Line, Path, Polyline, Text as SvgText } from "react-native-svg";

import { Button, Card, Input, RowActions, Screen } from "@/src/components/ui";
import { getDashboardSnapshot, type DashboardSnapshot } from "@/src/features/dashboard/dashboard.repository";
import {
  GOAL_DATE_KEY,
  goalDatePlan,
  inWeeks,
  readGoalDate,
  type GoalDate,
} from "@/src/features/goals/goalDate";
import { weightUnitOf } from "@/src/features/profile/profile";
import { saveNutritionProfile } from "@/src/features/profile/profile.repository";
import { getSetting, setSetting } from "@/src/features/settings/settings.repository";
import { localDateKey } from "@/src/lib/dates";
import { VIEWER } from "@/src/lib/mode";
import { convertWeight, formatWeight, toKg } from "@/src/lib/units";
import { AppTheme } from "@/src/theme";

// Meta con fecha: llegar a un peso un día concreto, con la proyección del motor.
export default function GoalDateScreen() {
  const today = localDateKey();
  const [snapshot, setSnapshot] = useState<DashboardSnapshot | null>(null);
  const [goal, setGoal] = useState<GoalDate | null>(null);
  const [form, setForm] = useState({ label: "", date: inWeeks(today, 12), weight: "" });
  const [error, setError] = useState("");
  const load = useCallback(() => {
    Promise.all([getDashboardSnapshot(), getSetting(GOAL_DATE_KEY)]).then(([next, saved]) => {
      setSnapshot(next);
      setGoal(readGoalDate(saved));
    });
  }, []);
  useFocusEffect(load);
  if (!snapshot?.profile) return <Screen />;
  const profile = snapshot.profile;
  const unit = weightUnitOf(profile);
  const engine = snapshot.analysis.adaptive?.active ? snapshot.analysis.adaptive : null;
  const currentKg = engine?.weightKg ?? snapshot.trendKg ?? snapshot.weightKg ?? 0;

  const save = async () => {
    const weightKg = toKg(Number(form.weight.replace(",", ".")), unit);
    const next = readGoalDate({ date: form.date.trim(), weightKg, label: form.label.trim() || undefined });
    if (!next) return setError("Revisa la fecha (AAAA-MM-DD) y el peso.");
    if (next.date <= today) return setError("La fecha tiene que ser después de hoy.");
    await setSetting(GOAL_DATE_KEY, next);
    setError("");
    setGoal(next);
  };

  if (!goal)
    return (
      <Screen>
        <ScrollView contentContainerStyle={AppTheme.content} keyboardShouldPersistTaps="handled">
          <Text style={AppTheme.body}>
            Un viaje, una boda, una prueba física o un pesaje: un día que importe. La app proyecta dónde
            llegarías ese día y cuánto ajustar para llegar.
          </Text>
          <Card title="Tu meta">
            <Input
              label="Qué es (opcional)"
              value={form.label}
              onChangeText={(label) => setForm({ ...form, label })}
              placeholder="Viaje a la playa"
            />
            <Input
              label="Fecha (AAAA-MM-DD)"
              value={form.date}
              onChangeText={(date) => setForm({ ...form, date })}
              keyboardType="numbers-and-punctuation"
            />
            <Input
              label={`Peso que quieres tener (${unit})`}
              value={form.weight}
              onChangeText={(weight) => setForm({ ...form, weight })}
              keyboardType="decimal-pad"
              placeholder={currentKg ? convertWeight(currentKg, "kg", unit).toFixed(1) : ""}
            />
            {error ? <Text style={AppTheme.errorText}>{error}</Text> : null}
            {VIEWER ? null : <Button title="Guardar meta" onPress={save} />}
          </Card>
        </ScrollView>
      </Screen>
    );

  const plan = goalDatePlan(goal, today, currentKg, profile.calorieTarget, engine);
  const signed = (value: number, digits = 2) =>
    `${value > 0 ? "+" : value < 0 ? "−" : ""}${Math.abs(value).toFixed(digits)}`;
  return (
    <Screen>
      <ScrollView contentContainerStyle={AppTheme.content}>
        <View style={{ gap: 2 }}>
          <Text style={AppTheme.eyebrow}>{(goal.label ?? "META CON FECHA").toUpperCase()}</Text>
          <Text style={AppTheme.title}>
            {formatWeight(goal.weightKg, unit, 1)} para el {goal.date}
          </Text>
        </View>
        <View style={[AppTheme.card, { flexDirection: "row" }]}>
          {[
            { label: "Faltan", value: String(plan.daysLeft), unit: "días" },
            { label: "Peso real", value: convertWeight(currentKg, "kg", unit).toFixed(1), unit },
            {
              label: "Ritmo necesario",
              value: signed(convertWeight(plan.requiredWeeklyKg, "kg", unit)),
              unit: `${unit}/sem`,
            },
          ].map((figure, index) => (
            <View
              key={figure.label}
              style={[
                { flex: 1, gap: 2 },
                index > 0 && { borderLeftWidth: 1, borderLeftColor: AppTheme.colors.border, paddingLeft: 10 },
              ]}
            >
              <Text style={[AppTheme.hint, { fontSize: 11 }]}>{figure.label}</Text>
              <Text style={[AppTheme.tileValue, { fontSize: 20 }]}>{figure.value}</Text>
              <Text style={[AppTheme.hint, { fontSize: 10 }]}>{figure.unit}</Text>
            </View>
          ))}
        </View>

        {plan.projection && plan.probability !== null ? (
          <Card title="Dónde llegarías ese día">
            <ProjectionChart path={plan.path} goalKg={goal.weightKg} unit={unit} />
            <Text style={AppTheme.body}>
              Con tu objetivo de {profile.calorieTarget} kcal llegarías con{" "}
              {formatWeight(plan.projection.kg, unit, 1)} ±{" "}
              {convertWeight(1.96 * plan.projection.sd, "kg", unit).toFixed(1)}. Probabilidad de estar en tu
              meta: {Math.round(plan.probability * 100)} %.
            </Text>
            {plan.suggestion === 0 && plan.overshootKg > 0 ? (
              <Text style={AppTheme.hint}>
                Llegarías unos {formatWeight(plan.overshootKg, unit, 1)} más allá de tu meta: puedes comer
                algo más y llegar igual.
              </Text>
            ) : plan.suggestion === 0 ? (
              <Text style={AppTheme.hint}>Vas bien: no hace falta cambiar nada.</Text>
            ) : plan.suggestion === null ? (
              <Text style={AppTheme.hint}>
                Ni con 300 kcal de cambio diario llegas con seguridad: considera mover la fecha o la meta.
              </Text>
            ) : VIEWER ? null : (
              <Button
                title={`Aplicar ${plan.suggestion > 0 ? "+" : "−"}${Math.abs(plan.suggestion)} kcal`}
                onPress={async () => {
                  await saveNutritionProfile({
                    ...profile,
                    calorieTarget: profile.calorieTarget + (plan.suggestion ?? 0),
                  });
                  load();
                }}
              />
            )}
          </Card>
        ) : (
          <Card title="Proyección">
            <Text style={AppTheme.body}>
              Hace falta {signed(convertWeight(plan.requiredWeeklyKg, "kg", unit))} {unit} por semana. La
              proyección con su probabilidad aparece cuando el motor de autoajuste se activa (15 días seguidos
              con peso y comida).
            </Text>
          </Card>
        )}

        {plan.finalStretch ? (
          <Card title="Últimas dos semanas">
            <Text style={AppTheme.body}>Sin cambios de dieta, para que el agua no se mueva.</Text>
            <Text style={AppTheme.body}>Entreno algo más suave la última semana.</Text>
            <Text style={AppTheme.body}>Pésate a la misma hora todos los días.</Text>
          </Card>
        ) : null}
        {VIEWER ? null : (
          <RowActions
            question="¿Quitar esta meta con fecha?"
            onDelete={async () => {
              await setSetting(GOAL_DATE_KEY, null);
              setGoal(null);
            }}
          />
        )}
      </ScrollView>
    </Screen>
  );
}

function ProjectionChart({
  path,
  goalKg,
  unit,
}: {
  path: Array<{ day: number; kg: number; band: number }>;
  goalKg: number;
  unit: "kg" | "lb";
}) {
  const width = 320;
  const height = 120;
  const last = path.at(-1)?.day || 1;
  const values = path.flatMap((point) => [point.kg - point.band, point.kg + point.band]).concat(goalKg);
  const low = Math.min(...values);
  const high = Math.max(...values);
  const x = (day: number) => (day / last) * width;
  const y = (kg: number) => 8 + ((high - kg) / (high - low || 1)) * (height - 16);
  const upper = path.map((point) => `${x(point.day)} ${y(point.kg + point.band)}`);
  const lower = [...path].reverse().map((point) => `${x(point.day)} ${y(point.kg - point.band)}`);
  return (
    <Svg
      width="100%"
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      accessibilityLabel="Peso proyectado con su margen"
    >
      <Path
        d={`M${upper.join(" L")} L${lower.join(" L")} Z`}
        fill={AppTheme.colors.accent}
        fillOpacity={0.15}
      />
      <Polyline
        points={path.map((point) => `${x(point.day)},${y(point.kg)}`).join(" ")}
        fill="none"
        stroke={AppTheme.colors.accent}
        strokeWidth={2.5}
      />
      <Line
        x1={0}
        x2={width}
        y1={y(goalKg)}
        y2={y(goalKg)}
        stroke={AppTheme.colors.muted}
        strokeDasharray="4 4"
      />
      <SvgText x={4} y={y(goalKg) - 4} fill={AppTheme.colors.muted} fontSize={10} fontFamily="sans-serif">
        meta {convertWeight(goalKg, "kg", unit).toFixed(1)} {unit}
      </SvgText>
    </Svg>
  );
}
