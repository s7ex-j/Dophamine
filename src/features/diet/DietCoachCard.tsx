import { Ionicons } from "@expo/vector-icons";
import { Pressable, Text, View } from "react-native";

import { Button, LinkButton } from "@/src/components/ui";
import { applyAdvice, type Advice, type DayState } from "@/src/features/diet/coach";
import type { CoachToday } from "@/src/features/diet/coach.data";
import { saveDayState } from "@/src/features/diet/diet.repository";
import { addMealEntries } from "@/src/features/nutrition/nutrition.repository";
import { formatTime } from "@/src/lib/time";
import { AppTheme } from "@/src/theme";

const TRAIN_OPTIONS: Array<[string, number]> = [
  ["Mañana", 7 * 60],
  ["Mediodía", 12 * 60],
  ["Tarde", 17 * 60],
  ["Noche", 20 * 60],
];
const KIND_ICON: Record<Advice["kind"], keyof typeof Ionicons.glyphMap> = {
  allergy: "warning-outline",
  timing: "barbell-outline",
  feeling: "happy-outline",
  health: "medkit-outline",
  balance: "scale-outline",
};

/**
 * Tu dieta de hoy en el Panel: pregunta la hora del entreno, muestra la comida
 * que toca para registrarla con un toque y propone cambios. Nada se aplica solo.
 */
export function DietCoachCard({
  today,
  onChanged,
  onOpenDiet,
}: {
  today: CoachToday;
  onChanged: () => void;
  onOpenDiet: () => void;
}) {
  const { result, state, date } = today;
  const update = async (next: DayState) => {
    await saveDayState(next);
    onChanged();
  };
  const next = result.next;
  const done = result.meals.filter((meal) => meal.status === "done").length;

  return (
    <View style={[AppTheme.card, { gap: 12 }]}>
      <Pressable accessibilityRole="button" onPress={onOpenDiet} style={AppTheme.sectionHeader}>
        <View>
          <Text style={AppTheme.eyebrow}>TU DIETA DE HOY</Text>
          <Text style={AppTheme.tileSubtitle}>
            {done}/{result.meals.length} comidas · plan {result.planned.kcal} kcal
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={AppTheme.colors.muted} />
      </Pressable>

      {result.askTraining ? (
        <View style={{ gap: 8 }}>
          <Text style={AppTheme.tileTitle}>¿A qué hora entrenas hoy?</Text>
          <View style={AppTheme.chipRow}>
            <Pressable
              accessibilityRole="button"
              onPress={() => update({ ...state, trained: true })}
              style={AppTheme.chip}
            >
              <Text style={AppTheme.chipText}>Ya entrené</Text>
            </Pressable>
            {TRAIN_OPTIONS.map(([label, minutes]) => (
              <Pressable
                key={label}
                accessibilityRole="button"
                accessibilityLabel={`Entreno en la ${label.toLowerCase()}`}
                onPress={() => update({ ...state, trainTime: minutes })}
                style={AppTheme.chip}
              >
                <Text style={AppTheme.chipText}>
                  {label} · {formatTime(minutes)}
                </Text>
              </Pressable>
            ))}
            <Pressable
              accessibilityRole="button"
              onPress={() => update({ ...state, noTraining: true })}
              style={AppTheme.chip}
            >
              <Text style={AppTheme.chipText}>Hoy no</Text>
            </Pressable>
          </View>
        </View>
      ) : today.trainingDay && !state.trained && !state.noTraining && typeof state.trainTime === "number" ? (
        <View style={AppTheme.sectionHeader}>
          <Text style={AppTheme.hint}>Entreno hoy a las {formatTime(state.trainTime)}</Text>
          <View style={AppTheme.rowActions}>
            <LinkButton title="Ya entrené" onPress={() => update({ ...state, trained: true })} />
            <LinkButton title="Cambiar" onPress={() => update({ ...state, trainTime: null })} />
          </View>
        </View>
      ) : null}

      {next ? (
        <View style={{ gap: 6 }}>
          <Text style={AppTheme.tileTitle}>
            Toca: {next.label}
            {next.around === "pre"
              ? " · antes de entrenar"
              : next.around === "post"
                ? " · después de entrenar"
                : ""}
          </Text>
          {next.items.map((item, index) => (
            <View key={`${item.name}-${index}`} style={AppTheme.legendRow}>
              <Text style={[AppTheme.legendLabel, { flex: 1 }]} numberOfLines={1}>
                {item.name}
              </Text>
              <Text style={AppTheme.legendValue}>{item.grams ? `${item.grams} g` : `${item.kcal} kcal`}</Text>
            </View>
          ))}
          <Text style={AppTheme.hint}>
            {next.totals.kcal} kcal · P {Math.round(next.totals.proteinG)} · C{" "}
            {Math.round(next.totals.carbsG)} · G {Math.round(next.totals.fatsG)}
          </Text>
          <Button
            title={`Registrar ${next.label.toLowerCase()}`}
            onPress={async () => {
              await addMealEntries(
                date,
                next.slot,
                next.items
                  .filter((item) => !item.unknown)
                  .map(({ unknown: _unknown, ambiguous: _ambiguous, ...draft }) => draft),
              );
              onChanged();
            }}
          />
        </View>
      ) : (
        <Text style={AppTheme.body}>Completaste las comidas de tu dieta de hoy.</Text>
      )}

      {result.advice.map((advice) => (
        <View
          key={advice.id}
          style={{
            flexDirection: "row",
            gap: 10,
            paddingTop: 10,
            borderTopWidth: 1,
            borderTopColor: AppTheme.colors.border,
          }}
        >
          <Ionicons
            name={KIND_ICON[advice.kind]}
            size={18}
            color={advice.kind === "allergy" ? AppTheme.colors.coral : AppTheme.colors.accent}
          />
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={AppTheme.entryName}>{advice.title}</Text>
            <Text style={AppTheme.entryDetail}>{advice.detail}</Text>
            {advice.swap || advice.scale ? (
              <LinkButton title="Aplicar el cambio" onPress={() => update(applyAdvice(state, advice))} />
            ) : null}
          </View>
        </View>
      ))}
      {state.swaps.length || state.scale ? (
        <LinkButton
          title="Volver a mi dieta original de hoy"
          onPress={() => update({ ...state, swaps: [], scale: undefined })}
        />
      ) : null}
    </View>
  );
}
