import { useCallback, useState } from "react";
import { Pressable, View } from "react-native";
import { useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { Text } from "@/src/components/Text";
import { Card, Chips } from "@/src/components/ui";
import { Rings } from "@/src/features/nutrition/DaySummary";
import { TermEmpty } from "@/src/features/streak/TermEmpty";
import {
  NUTRIENT_LABELS,
  microsCoverage,
  nutrientRings,
  proteinPerMeal,
  slotDistribution,
  topContributors,
  topMeals,
  type NutrientKey,
  type NutrientRing,
} from "@/src/features/nutrition/insights";
import { type MealEntry } from "@/src/features/nutrition/meals";
import { MICRO_INFO, type MicroKey } from "@/src/features/nutrition/micros";
import { getMealHistory } from "@/src/features/nutrition/nutrition.repository";
import { mealSetupOf, type NutritionProfile } from "@/src/features/profile/profile";
import { targetsForWeekday } from "@/src/features/profile/targets";
import { addDays } from "@/src/lib/dates";
import { AppTheme } from "@/src/theme";

const MACRO_COLORS: Partial<Record<NutrientKey, string>> = {
  kcal: AppTheme.colors.kcal,
  proteinG: AppTheme.colors.protein,
  carbsG: AppTheme.colors.carbs,
  fatsG: AppTheme.colors.fats,
  alcoholG: AppTheme.colors.violet,
};
const GROUP_COLORS: Record<string, string> = {
  "Carbohidratos y grasas": AppTheme.colors.carbs,
  Minerales: AppTheme.colors.violet,
  Vitaminas: AppTheme.colors.amber,
};
const isMicro = (key: NutrientKey): key is MicroKey => key in MICRO_INFO;
const colorOf = (ring: Pick<NutrientRing, "key" | "limit" | "progress">) => {
  if (ring.limit) return ring.progress > 1 ? AppTheme.colors.coral : AppTheme.colors.blue;
  return MACRO_COLORS[ring.key] ?? (isMicro(ring.key) ? GROUP_COLORS[MICRO_INFO[ring.key].group] : undefined);
};

const MACROS: NutrientKey[] = ["kcal", "proteinG", "carbsG", "fatsG"];
const SECTIONS: Array<{ title: string; keys: MicroKey[] }> = [
  { title: "Fibra, azúcar y grasa saturada", keys: ["fiberG", "sugarG", "satFatG"] },
  { title: "Minerales", keys: ["sodiumMg", "potassiumMg", "calciumMg", "ironMg", "magnesiumMg", "zincMg"] },
  { title: "Vitaminas", keys: ["vitaminAUg", "vitaminCMg", "vitaminDUg", "vitaminB12Ug", "folateUg"] },
];
/** La barra llega hasta 150 % de la referencia; la raya del 100 % queda a dos tercios. */
const SCALE = 1.5;

const PERIODS = [
  { value: 1, label: "Este día" },
  { value: 7, label: "7 días" },
  { value: 30, label: "30 días" },
  { value: 90, label: "90 días" },
];

/**
 * El resumen de lo comido: un solo anillo con capas para calorías y macros (como el del Panel) y una barra
 * con escala por micro, frente a la meta del plan o un valor de referencia. Al tocar una fila, de qué
 * alimentos y comidas salió. En la pantalla de Comida.
 */
export function NutrientSummary({ date, profile }: { date: string; profile: NutritionProfile }) {
  const [history, setHistory] = useState<MealEntry[]>([]);
  const [days, setDays] = useState(1);
  const [key, setKey] = useState<NutrientKey>("proteinG");
  useFocusEffect(
    useCallback(() => {
      getMealHistory(5000).then(setHistory);
    }, []),
  );
  const since = addDays(date, -(days - 1));
  const entries = history.filter((entry) => entry.date >= since && entry.date <= date);
  const targets = targetsForWeekday(profile, "mon", []);
  const rings = nutrientRings(entries, {
    calories: targets.calories,
    protein: targets.protein,
    carbs: targets.carbs,
    fats: targets.fats,
  });
  const ringOf = (item: NutrientKey) => rings.find((ring) => ring.key === item);
  const selected = ringOf(key);
  const label = NUTRIENT_LABELS[key];
  const top = topContributors(entries, key, 6);
  const meals = topMeals(entries, key, 3);
  const coverage = microsCoverage(entries);
  const slots = slotDistribution(entries, mealSetupOf(profile)).filter((slot) => slot.kcal > 0);
  const maxShare = Math.max(1, ...slots.map((slot) => slot.share));
  const protein = proteinPerMeal(entries);

  return (
    <View style={{ gap: 14 }}>
      <Chips value={days} onChange={setDays} options={PERIODS} />
      {entries.length ? (
        <>
          <Card title={days === 1 ? "Calorías y macros de este día" : "Calorías y macros, por día"}>
            <View style={[AppTheme.legendRow, { gap: 16, alignItems: "center" }]}>
              <Rings
                rings={MACROS.flatMap((item) => {
                  const ring = ringOf(item);
                  return ring
                    ? [
                        {
                          label: ring.label,
                          value: ring.amount,
                          target: ring.target,
                          color: colorOf(ring) ?? "",
                        },
                      ]
                    : [];
                })}
              />
              <View style={{ flex: 1, gap: 4 }}>
                {MACROS.map((item) => {
                  const ring = ringOf(item);
                  return ring ? (
                    <NutrientRow
                      key={item}
                      ring={ring}
                      selected={item === key}
                      onPress={() => setKey(item)}
                    />
                  ) : null;
                })}
              </View>
            </View>
          </Card>

          <Card title={days === 1 ? "Micronutrientes de este día" : "Micronutrientes, por día"}>
            {SECTIONS.map((section) => (
              <View key={section.title} style={{ gap: 2 }}>
                <Text style={AppTheme.label}>{section.title}</Text>
                {section.keys.map((item) => {
                  const ring = ringOf(item);
                  return ring ? (
                    <NutrientBar
                      key={item}
                      ring={ring}
                      selected={item === key}
                      onPress={() => setKey(item)}
                    />
                  ) : null;
                })}
              </View>
            ))}
            <View style={[AppTheme.legendRow, { gap: 6 }]}>
              <View style={{ width: 2, height: 12, backgroundColor: AppTheme.colors.body }} />
              <Text style={[AppTheme.hint, { flex: 1 }]}>
                La raya marca la referencia: una meta, o un tope en azúcar, grasa saturada y sodio.
              </Text>
            </View>
            <Text style={AppTheme.hint}>
              {coverage < 100
                ? `Los micros salen del ${coverage} % de lo comido: los registros rápidos y algunos alimentos no los traen. `
                : ""}
              Las metas de macros son las de tu plan; las de micros, valores de referencia generales para
              adultos (FDA), no una indicación personal.
            </Text>
          </Card>

          <Card title={`Lo que más te dio ${label.label.toLowerCase()}`}>
            {selected ? (
              <Text style={AppTheme.body}>
                {selected.amount} {label.unit} {days === 1 ? "este día" : "por día"} ·{" "}
                {Math.round(selected.progress * 100)} % de {selected.target} {label.unit}
                {selected.limit ? " (tope)" : ""}
              </Text>
            ) : null}
            {top.length ? (
              top.map((item) => (
                <View key={item.name} style={{ gap: 4 }}>
                  <View style={AppTheme.legendRow}>
                    <Text style={[AppTheme.legendLabel, { flex: 1 }]} numberOfLines={1}>
                      {item.name}
                    </Text>
                    <Text style={AppTheme.legendValue}>
                      {item.amount} {label.unit} · {item.share} %
                    </Text>
                  </View>
                  <View style={AppTheme.progressTrack}>
                    <View
                      style={[
                        AppTheme.goalFill,
                        {
                          width: `${item.share}%`,
                          backgroundColor: selected ? colorOf(selected) : undefined,
                        },
                      ]}
                    />
                  </View>
                </View>
              ))
            ) : (
              <Text style={AppTheme.body}>
                Nada de lo registrado en este periodo trae {label.label.toLowerCase()}.
              </Text>
            )}
            {meals.length && days > 1 ? (
              <View style={{ gap: 8, paddingTop: 4 }}>
                <Text style={AppTheme.label}>Las comidas con más {label.label.toLowerCase()}</Text>
                {meals.map((meal) => (
                  <View key={`${meal.date}-${meal.slot}`} style={{ gap: 2 }}>
                    <View style={AppTheme.legendRow}>
                      <Text style={[AppTheme.legendLabel, { flex: 1 }]}>
                        {meal.label} · {Number(meal.date.slice(8))}/{Number(meal.date.slice(5, 7))}
                      </Text>
                      <Text style={AppTheme.legendValue}>
                        {meal.amount} {label.unit}
                      </Text>
                    </View>
                    <Text style={AppTheme.hint} numberOfLines={2}>
                      {meal.foods.join(", ")}
                    </Text>
                  </View>
                ))}
              </View>
            ) : null}
          </Card>

          {days > 1 && slots.length ? (
            <Card title="Cómo repartes el día">
              {slots.map((slot) => (
                <View key={slot.slot} style={{ gap: 4 }}>
                  <View style={AppTheme.legendRow}>
                    <Text style={AppTheme.legendLabel}>{slot.label}</Text>
                    <Text style={AppTheme.legendValue}>
                      {slot.kcal} kcal · {slot.proteinG} g prot · {slot.share} %
                    </Text>
                  </View>
                  <View style={AppTheme.progressTrack}>
                    <View
                      style={[
                        AppTheme.goalFill,
                        { width: `${(slot.share / maxShare) * 100}%`, backgroundColor: AppTheme.colors.kcal },
                      ]}
                    />
                  </View>
                </View>
              ))}
              {protein.meals ? (
                <Text style={AppTheme.body}>
                  {protein.withTwenty} de {protein.meals} comidas llegaron a 20 g de proteína (media{" "}
                  {protein.average} g). Repartirla en 3–5 comidas con 20–40 g cada una ayuda a aprovecharla.
                </Text>
              ) : null}
              <Text style={AppTheme.hint}>Promedio por día con registros.</Text>
            </Card>
          ) : null}
        </>
      ) : (
        <TermEmpty
          text={days === 1 ? "Aún no hay comidas este día." : "Aún no hay comidas en este periodo."}
        />
      )}
    </View>
  );
}

const percentOf = (ring: NutrientRing) => {
  const percent = Math.round(ring.progress * 100);
  return percent > 999 ? "999+" : String(percent);
};
const a11y = (ring: NutrientRing) =>
  `${ring.label}: ${ring.amount} ${ring.unit}, ${percentOf(ring)} % de ${ring.target} ${ring.unit}${ring.limit ? ", tope" : ""}`;

/** Una fila de la leyenda del anillo: color, nombre y lo comido frente a la meta. */
function NutrientRow({
  ring,
  selected,
  onPress,
}: {
  ring: NutrientRing;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={a11y(ring)}
      onPress={onPress}
      style={[
        AppTheme.legendRow,
        {
          gap: 8,
          paddingVertical: 6,
          paddingHorizontal: 8,
          borderRadius: 10,
          backgroundColor: selected ? AppTheme.colors.surface2 : "transparent",
        },
      ]}
    >
      <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: colorOf(ring) }} />
      <Text style={[AppTheme.legendLabel, { flex: 1 }]} numberOfLines={1}>
        {ring.label}
      </Text>
      <Text style={AppTheme.legendValue}>
        {ring.amount}
        <Text style={AppTheme.quickHint}>
          {" "}
          / {ring.target} {ring.unit}
        </Text>
      </Text>
    </Pressable>
  );
}

/** Un micro en una línea con escala: se llena hasta la raya de la referencia y puede pasarla. */
function NutrientBar({
  ring,
  selected,
  onPress,
}: {
  ring: NutrientRing;
  selected: boolean;
  onPress: () => void;
}) {
  const color = colorOf(ring) ?? AppTheme.colors.accent;
  const fill = Math.min(1, ring.progress / SCALE) * 100;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={a11y(ring)}
      onPress={onPress}
      style={{
        gap: 5,
        paddingVertical: 7,
        paddingHorizontal: 8,
        borderRadius: 10,
        backgroundColor: selected ? AppTheme.colors.surface2 : "transparent",
      }}
    >
      <View style={AppTheme.legendRow}>
        <Text style={[AppTheme.legendLabel, { flex: 1 }]} numberOfLines={1}>
          {ring.label}
        </Text>
        {ring.limit && ring.progress > 1 ? (
          <Ionicons name="alert-circle" size={14} color={AppTheme.colors.coral} />
        ) : null}
        <Text style={AppTheme.legendValue}>
          {ring.amount}
          <Text style={AppTheme.quickHint}>
            {" "}
            / {ring.target} {ring.unit} · {percentOf(ring)} %
          </Text>
        </Text>
      </View>
      <View style={{ height: 12, justifyContent: "center" }}>
        <View style={[AppTheme.progressTrack, { height: 6 }]}>
          <View style={{ height: "100%", width: `${fill}%`, borderRadius: 3, backgroundColor: color }} />
        </View>
        <View
          style={{
            position: "absolute",
            left: `${100 / SCALE}%`,
            width: 2,
            height: 12,
            marginLeft: -1,
            borderRadius: 1,
            backgroundColor: AppTheme.colors.body,
          }}
        />
      </View>
    </Pressable>
  );
}
