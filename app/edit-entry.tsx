import { useCallback, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";

import { BigInput, Button, Card, ChoiceControl, IconTabs, Input, Screen } from "@/src/components/ui";
import { ViewerOnlyNotice } from "@/src/features/backup/ViewerSections";
import { BUILTIN_FOODS } from "@/src/features/nutrition/builtin.foods";
import {
  counterpart,
  equivalentGrams,
  stateLabels,
  type Food,
  type FoodState,
} from "@/src/features/nutrition/foods";
import { MacroSplit, SLOT_ICONS } from "@/src/features/nutrition/MealSections";
import { draftFromQuick, MEAL_SLOTS, rescaleEntry, type MealEntry } from "@/src/features/nutrition/meals";
import {
  deleteMealEntry,
  getMealEntries,
  getUserFoods,
  updateMealEntry,
} from "@/src/features/nutrition/nutrition.repository";
import { VIEWER } from "@/src/lib/mode";
import { AppTheme } from "@/src/theme";

export default function EditEntryScreen() {
  return VIEWER ? <ViewerOnlyNotice what="Editar alimentos" /> : <EditEntryContent />;
}

// Editar un alimento ya registrado: cantidad, crudo o cocido, y momento del día.
// Un registro rápido (sin alimento) se edita por sus calorías y macros.
function EditEntryContent() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string; date?: string }>();
  const [entry, setEntry] = useState<MealEntry | null>(null);
  const [food, setFood] = useState<Food | null>(null);
  const [foods, setFoods] = useState<Food[]>(BUILTIN_FOODS);
  const [grams, setGrams] = useState("");
  const [quick, setQuick] = useState({ kcal: "", protein: "", carbs: "", fats: "" });
  const [error, setError] = useState("");

  useFocusEffect(
    useCallback(() => {
      if (!params.date) return;
      Promise.all([getMealEntries(params.date), getUserFoods()]).then(([entries, userFoods]) => {
        const all = [...userFoods, ...BUILTIN_FOODS];
        const found = entries.find((item) => item.id === params.id) ?? null;
        setFoods(all);
        setEntry(found);
        setFood(all.find((item) => item.id === found?.foodId) ?? null);
        setGrams(found?.grams ? String(found.grams) : "");
        if (found)
          setQuick({
            kcal: String(found.kcal),
            protein: String(found.proteinG),
            carbs: String(found.carbsG),
            fats: String(found.fatsG),
          });
      });
    }, [params.date, params.id]),
  );

  if (!entry) return <Screen />;
  const isQuick = !entry.grams;
  const other = food ? counterpart(food, foods) : null;
  const amount = Number(grams);
  const preview = isQuick ? entry : rescaleEntry(entry, amount > 0 ? amount : (entry.grams ?? 0), food);

  const switchState = (state: FoodState) => {
    if (!food || !other || food.state === state) return;
    setGrams(String(equivalentGrams(food, other, amount || entry.grams || 0)));
    setFood(other);
  };
  const save = async () => {
    if (isQuick) {
      const result = draftFromQuick({ name: entry.name, ...quick });
      if (result.error !== null) return setError(result.error);
      await updateMealEntry({ ...entry, ...result.draft, name: entry.name });
    } else {
      if (!(amount > 0 && amount <= 5000)) return setError("Escribe la cantidad en gramos.");
      await updateMealEntry({ ...rescaleEntry(entry, amount, food), slot: entry.slot });
    }
    router.back();
  };
  const remove = async () => {
    await deleteMealEntry(entry);
    router.back();
  };

  return (
    <Screen>
      <ScrollView contentContainerStyle={AppTheme.content} keyboardShouldPersistTaps="handled">
        <IconTabs
          value={entry.slot}
          onChange={(slot) => setEntry({ ...entry, slot })}
          options={MEAL_SLOTS.map((item) => ({
            value: item.id,
            label: item.label,
            icon: SLOT_ICONS[item.id],
          }))}
        />
        <Card title={food?.name ?? entry.name}>
          {isQuick ? (
            <>
              <View style={AppTheme.fieldRow}>
                <BigInput
                  label="Calorías"
                  unit="kcal"
                  value={quick.kcal}
                  onChangeText={(kcal) => setQuick({ ...quick, kcal })}
                  keyboardType="number-pad"
                />
              </View>
              <View style={AppTheme.fieldRow}>
                {(["protein", "carbs", "fats"] as const).map((field) => (
                  <View key={field} style={AppTheme.fieldRowItem}>
                    <Input
                      label={{ protein: "Proteína (g)", carbs: "Carbos (g)", fats: "Grasas (g)" }[field]}
                      value={quick[field]}
                      onChangeText={(value) => setQuick({ ...quick, [field]: value })}
                      keyboardType="decimal-pad"
                    />
                  </View>
                ))}
              </View>
            </>
          ) : (
            <>
              {other && food?.state ? (
                <ChoiceControl
                  value={food.state}
                  onChange={switchState}
                  options={(["raw", "cooked"] as const).map((state) => ({
                    value: state,
                    label: stateLabels[state],
                  }))}
                />
              ) : null}
              <View style={AppTheme.fieldRow}>
                <BigInput label="Cantidad" unit="gramos" value={grams} onChangeText={setGrams} />
              </View>
              <Text style={AppTheme.ringNumber}>{preview.kcal} kcal</Text>
              <MacroSplit nutrients={preview} />
              {!food ? (
                <Text style={AppTheme.hint}>
                  El alimento original ya no existe: la cantidad se ajusta en proporción.
                </Text>
              ) : null}
            </>
          )}
        </Card>
        {error ? <Text style={AppTheme.errorText}>{error}</Text> : null}
        <Button title="Guardar cambios" onPress={save} />
        <Button title="Quitar del día" variant="secondary" onPress={remove} />
      </ScrollView>
    </Screen>
  );
}
