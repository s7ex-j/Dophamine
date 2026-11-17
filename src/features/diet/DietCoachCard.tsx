import { useEffect, useRef, useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";

import { Button, LinkButton } from "@/src/components/ui";
import { applyAdvice, type Advice, type DayState } from "@/src/features/diet/coach";
import type { CoachToday } from "@/src/features/diet/coach.data";
import { scaleItem, type DietItem } from "@/src/features/diet/diet";
import { saveDayState } from "@/src/features/diet/diet.repository";
import { sumNutrients } from "@/src/features/nutrition/foods";
import { addMealEntries } from "@/src/features/nutrition/nutrition.repository";
import { formatTime } from "@/src/lib/time";
import { AppTheme } from "@/src/theme";

const TRAIN_OPTIONS: Array<[string, number]> = [
  ["Mañana", 7 * 60],
  ["Mediodía", 12 * 60],
  ["Tarde", 17 * 60],
  ["Noche", 20 * 60],
];

/** La recomendación que se muestra: la de la comida que toca primero; si no, la más importante. */
function adviceFor(advice: Advice[], slot: string | undefined): Advice | null {
  return (
    advice.find((item) => item.swap?.slot === slot) ?? advice.find((item) => item.kind === "allergy") ?? null
  );
}

/**
 * Tu dieta en el Panel: solo la comida que toca. Se registra tal cual o
 * ajustando las cantidades (nunca se come exacto). Muestra una sola sugerencia,
 * la que importa para esta comida (antes o después de entrenar, alergia,
 * cómo te sientes). Nada se aplica solo.
 */
export function DietCoachCard({
  today,
  onChanged,
  onOpenDiet,
  onOpenMeals,
}: {
  today: CoachToday;
  onChanged: () => void;
  onOpenDiet: () => void;
  /** Todas las comidas del día (registrar fuera de la dieta, editar, copiar). */
  onOpenMeals: () => void;
}) {
  const { result, state, date } = today;
  const next = result.next;
  const [adjusting, setAdjusting] = useState(false);
  const [grams, setGramsState] = useState<Record<number, string>>({});
  // Copia inmediata de lo escrito: "Registrar" usa siempre lo último, aunque la pantalla no haya redibujado.
  const typed = useRef<Record<number, string>>({});
  const setGrams = (value: Record<number, string>) => {
    typed.current = value;
    setGramsState(value);
  };
  useEffect(() => {
    setAdjusting(false);
    setGrams({});
  }, [next?.slot]);

  const update = async (value: DayState) => {
    await saveDayState(value);
    onChanged();
  };
  const position = next ? result.meals.findIndex((meal) => meal.slot === next.slot) + 1 : 0;
  // Lo que se va a registrar: las cantidades del plan o las que la persona ajustó.
  const itemsFor = (values: Record<number, string>): DietItem[] =>
    (next?.items ?? []).flatMap((item, index) => {
      if (item.unknown) return [];
      const value = Number((values[index] ?? "").replace(",", "."));
      return [item.grams && value > 0 && value !== item.grams ? scaleItem(item, value / item.grams) : item];
    });
  const items = itemsFor(grams);
  const totals = sumNutrients(items);
  const tip = adviceFor(result.advice, next?.slot);
  const gymToday =
    today.trainingDay && !state.trained && !state.noTraining && typeof state.trainTime === "number"
      ? state.trainTime
      : null;

  return (
    <View style={[AppTheme.card, { gap: 10 }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Abrir mi dieta"
        onPress={onOpenDiet}
        style={AppTheme.sectionHeader}
      >
        <Text style={AppTheme.eyebrow}>TU DIETA</Text>
        <Text style={AppTheme.hint}>
          {result.meals.filter((meal) => meal.status === "done").length} de {result.meals.length} comidas
        </Text>
      </Pressable>

      {result.askTraining ? (
        <View style={{ gap: 6 }}>
          <Text style={AppTheme.body}>¿A qué hora entrenas hoy?</Text>
          <View style={AppTheme.chipRow}>
            {TRAIN_OPTIONS.map(([label, minutes]) => (
              <Pressable
                key={label}
                accessibilityRole="button"
                accessibilityLabel={`Entreno en la ${label.toLowerCase()}`}
                onPress={() => update({ ...state, trainTime: minutes })}
                style={AppTheme.chip}
              >
                <Text style={AppTheme.chipText}>{formatTime(minutes)}</Text>
              </Pressable>
            ))}
          </View>
          <View style={AppTheme.rowActions}>
            <LinkButton title="Ya entrené" onPress={() => update({ ...state, trained: true })} />
            <LinkButton title="Hoy no entreno" onPress={() => update({ ...state, noTraining: true })} />
          </View>
        </View>
      ) : null}

      {next ? (
        <>
          <View>
            <Text style={AppTheme.tileTitle}>
              Comida {position}
              {next.time ? ` · ${next.time}` : ""}
            </Text>
            <Text style={AppTheme.hint}>
              {next.label}
              {next.around === "pre"
                ? " · antes de entrenar"
                : next.around === "post"
                  ? " · después de entrenar"
                  : ""}
            </Text>
          </View>

          {adjusting ? (
            <View style={{ gap: 6 }}>
              {next.items.map((item, index) =>
                item.unknown ? null : (
                  <View
                    key={`${item.name}-${index}`}
                    style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
                  >
                    <Text style={[AppTheme.body, { flex: 1 }]} numberOfLines={1}>
                      {item.name}
                    </Text>
                    {item.grams ? (
                      <TextInput
                        accessibilityLabel={`Cantidad de ${item.name}`}
                        value={grams[index] ?? String(item.grams)}
                        onChangeText={(text) => setGrams({ ...typed.current, [index]: text })}
                        keyboardType="decimal-pad"
                        selectTextOnFocus
                        style={[AppTheme.input, { width: 76, textAlign: "center", paddingVertical: 6 }]}
                      />
                    ) : (
                      <Text style={AppTheme.hint}>{item.kcal} kcal</Text>
                    )}
                    <Text style={[AppTheme.hint, { width: 20 }]}>{item.grams ? "g" : ""}</Text>
                  </View>
                ),
              )}
            </View>
          ) : (
            <Text style={AppTheme.body} numberOfLines={2}>
              {items.map((item) => (item.grams ? `${item.name} ${item.grams} g` : item.name)).join(" · ")}
            </Text>
          )}
          <Text style={AppTheme.hint}>
            {totals.kcal} kcal · P {Math.round(totals.proteinG)} · C {Math.round(totals.carbsG)} · G{" "}
            {Math.round(totals.fatsG)}
          </Text>

          <Button
            title="Registrar comida"
            onPress={async () => {
              await addMealEntries(
                date,
                next.slot,
                itemsFor(typed.current).map(
                  ({ unknown: _unknown, ambiguous: _ambiguous, ...draft }) => draft,
                ),
              );
              onChanged();
            }}
          />
          <View style={AppTheme.rowActions}>
            <LinkButton
              title={adjusting ? "Usar las cantidades del plan" : "Ajustar cantidades"}
              onPress={() => {
                if (adjusting) setGrams({});
                setAdjusting(!adjusting);
              }}
            />
          </View>
        </>
      ) : (
        <Text style={AppTheme.body}>Completaste las comidas de hoy.</Text>
      )}
      <LinkButton title="Ver todas las comidas del día" onPress={onOpenMeals} />

      {gymToday !== null ? (
        <View style={AppTheme.sectionHeader}>
          <Text style={AppTheme.hint}>Gimnasio a las {formatTime(gymToday)}</Text>
          <LinkButton title="Ya entrené" onPress={() => update({ ...state, trained: true })} />
        </View>
      ) : null}

      {tip ? (
        <View style={{ gap: 2, paddingTop: 10, borderTopWidth: 1, borderTopColor: AppTheme.colors.border }}>
          <Text style={[AppTheme.entryName, tip.kind === "allergy" && { color: AppTheme.colors.coral }]}>
            {tip.title}
          </Text>
          <Text style={AppTheme.entryDetail}>{tip.detail}</Text>
          {tip.swap || tip.scale ? (
            <LinkButton title="Aplicar el cambio" onPress={() => update(applyAdvice(state, tip))} />
          ) : null}
        </View>
      ) : null}
      {state.swaps.length || state.scale ? (
        <LinkButton
          title="Volver a la dieta original de hoy"
          onPress={() => update({ ...state, swaps: [], scale: undefined })}
        />
      ) : null}
    </View>
  );
}
