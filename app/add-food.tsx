import { useCallback, useMemo, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";

import {
  Button,
  Card,
  ChoiceControl,
  Input,
  LinkButton,
  ListRow,
  RowActions,
  Screen,
} from "@/src/components/ui";
import { ViewerOnlyNotice } from "@/src/features/backup/ViewerSections";
import { BarcodeScanner, scannerAvailable } from "@/src/features/nutrition/BarcodeScanner";
import { BUILTIN_FOODS } from "@/src/features/nutrition/builtin.foods";
import {
  buildCustomFood,
  buildRecipe,
  describeNutrients,
  emptyCustomFood,
  nutrientsFor,
  searchFoods,
  sourceLabels,
  type CustomFoodForm,
  type Food,
} from "@/src/features/nutrition/foods";
import {
  draftFromFood,
  draftFromQuick,
  emptyQuick,
  foodUsage,
  ingredientsFromDrafts,
  MEAL_SLOTS,
  slotForHour,
  slotLabel,
  suggestionsFor,
  totalsOf,
  type MealDraft,
  type MealEntry,
  type MealSlot,
  type QuickForm,
} from "@/src/features/nutrition/meals";
import {
  addMealEntries,
  deleteFood,
  getMealHistory,
  getOnlineLookup,
  getUserFoods,
  newFoodId,
  saveFood,
} from "@/src/features/nutrition/nutrition.repository";
import {
  cleanBarcode,
  lookupBarcodeOnline,
  OFF_ATTRIBUTION,
  searchOnline,
} from "@/src/features/nutrition/openfoodfacts";
import { dayLabel, localDateKey } from "@/src/lib/dates";
import { VIEWER } from "@/src/lib/mode";
import { AppTheme } from "@/src/theme";

type Mode = "search" | "quick" | "new" | "barcode";
const MODES: Array<{ value: Mode; label: string }> = [
  { value: "search", label: "Buscar" },
  { value: "quick", label: "Rápido" },
  { value: "new", label: "Nuevo alimento" },
  { value: "barcode", label: "Código de barras" },
];

export default function AddFoodScreen() {
  return VIEWER ? <ViewerOnlyNotice what="El registro de comidas" /> : <AddFoodContent />;
}

// Agregar comida: se eligen uno o varios alimentos, se juntan en "el plato" y se
// guardan juntos en un momento del día. El plato también se puede guardar como receta.
function AddFoodContent() {
  const router = useRouter();
  const params = useLocalSearchParams<{ date?: string; slot?: string }>();
  const date = /^\d{4}-\d{2}-\d{2}$/.test(params.date ?? "") ? (params.date as string) : localDateKey();
  const [slot, setSlot] = useState<MealSlot>(
    MEAL_SLOTS.some((item) => item.id === params.slot)
      ? (params.slot as MealSlot)
      : slotForHour(new Date().getHours()),
  );
  const [mode, setMode] = useState<Mode>("search");
  const [userFoods, setUserFoods] = useState<Food[]>([]);
  const [history, setHistory] = useState<MealEntry[]>([]);
  const [online, setOnline] = useState(false);
  const [query, setQuery] = useState("");
  const [onlineResults, setOnlineResults] = useState<Food[]>([]);
  const [selected, setSelected] = useState<Food | null>(null);
  const [grams, setGrams] = useState("");
  const [plate, setPlate] = useState<MealDraft[]>([]);
  const [quick, setQuick] = useState<QuickForm>(emptyQuick);
  const [custom, setCustom] = useState<CustomFoodForm>(emptyCustomFood);
  const [barcode, setBarcode] = useState("");
  const [scanning, setScanning] = useState(false);
  const [busy, setBusy] = useState(false);
  const [recipeName, setRecipeName] = useState("");
  const [recipeServings, setRecipeServings] = useState("1");
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null);

  const load = useCallback(() => {
    Promise.all([getUserFoods(), getMealHistory(), getOnlineLookup()]).then(([foods, entries, enabled]) => {
      setUserFoods(foods);
      setHistory(entries);
      setOnline(enabled);
    });
  }, []);
  useFocusEffect(load);

  const allFoods = useMemo(() => [...userFoods, ...BUILTIN_FOODS], [userFoods]);
  const usage = useMemo(() => foodUsage(history), [history]);
  const results = useMemo(() => {
    const local = searchFoods(allFoods, query, usage.counts);
    const known = new Set(local.map((food) => food.id));
    return [...local, ...onlineResults.filter((food) => !known.has(food.id))];
  }, [allFoods, query, usage, onlineResults]);
  const suggestions = useMemo(() => suggestionsFor(slot, usage, allFoods), [slot, usage, allFoods]);
  const mine = userFoods.filter((food) => food.source !== "off");
  const note = (text: string, error = false) => setMessage({ text, error });

  const choose = (food: Food) => {
    setMessage(null);
    setSelected(food);
    setGrams(String(usage.lastGrams[food.id] ?? food.servingG));
  };
  const addSelected = async () => {
    if (!selected) return;
    const amount = Number(grams);
    if (!(amount > 0 && amount <= 5000)) return note("Escribe la cantidad en gramos.", true);
    // Un producto traído de internet se guarda la primera vez que se usa: después aparece sin red.
    if (selected.source === "off" && !userFoods.some((food) => food.id === selected.id)) {
      await saveFood(selected);
      load();
    }
    setPlate((current) => [...current, draftFromFood(selected, amount)]);
    setSelected(null);
    setQuery("");
    setOnlineResults([]);
    note(`"${selected.name}" está en el plato.`);
  };
  const addQuick = () => {
    const result = draftFromQuick(quick);
    if (result.error !== null) return note(result.error, true);
    setPlate((current) => [...current, result.draft]);
    setQuick(emptyQuick());
    note("Registro rápido añadido al plato.");
  };
  const createFood = async () => {
    const result = buildCustomFood(custom, newFoodId("c"));
    if (result.error !== null) return note(result.error, true);
    await saveFood(result.food);
    setCustom(emptyCustomFood());
    load();
    setMode("search");
    choose(result.food);
  };
  const searchOnlineNow = async () => {
    setBusy(true);
    try {
      const found = await searchOnline(query.trim());
      setOnlineResults(found);
      note(
        found.length
          ? `${found.length} productos encontrados en línea.`
          : "Sin resultados en línea para esa búsqueda.",
      );
    } catch {
      note("No se pudo buscar en línea. Revisa tu conexión.", true);
    } finally {
      setBusy(false);
    }
  };
  const findBarcode = async (raw: string) => {
    setScanning(false);
    const code = cleanBarcode(raw);
    if (!code) return note("Ese no parece un código de barras (8 a 14 dígitos).", true);
    setBarcode(code);
    const cached = userFoods.find((food) => food.barcode === code);
    if (cached) return choose(cached);
    if (!online)
      return note(
        "Ese producto aún no está guardado. Enciende la búsqueda en línea en Más para traerlo, o créalo como alimento nuevo.",
        true,
      );
    setBusy(true);
    try {
      const found = await lookupBarcodeOnline(code);
      if (found) choose(found);
      else note("Ese código no está en Open Food Facts. Puedes crearlo como alimento nuevo.", true);
    } catch {
      note("No se pudo consultar el código. Revisa tu conexión.", true);
    } finally {
      setBusy(false);
    }
  };
  const removeFood = async (food: Food) => {
    await deleteFood(food.id);
    load();
  };
  const savePlate = async () => {
    if (!plate.length) return note("El plato está vacío: elige un alimento primero.", true);
    await addMealEntries(date, slot, plate);
    router.back();
  };
  const saveRecipe = async () => {
    const result = buildRecipe(
      recipeName,
      Number(recipeServings),
      ingredientsFromDrafts(plate),
      newFoodId("r"),
    );
    if (result.error !== null) return note(result.error, true);
    await saveFood(result.food);
    setRecipeName("");
    load();
    note(`Receta "${result.food.name}" guardada: una porción son ${result.food.servingG} g.`);
  };

  const plateTotals = totalsOf(plate);
  const preview = selected ? nutrientsFor(selected, Number(grams) || 0) : null;

  return (
    <Screen>
      <ScrollView contentContainerStyle={AppTheme.content} keyboardShouldPersistTaps="handled">
        <Text style={AppTheme.eyebrow}>
          AGREGAR · {dayLabel(date).toUpperCase()} {date}
        </Text>
        <ChoiceControl
          value={slot}
          onChange={setSlot}
          options={MEAL_SLOTS.map((item) => ({ value: item.id, label: item.label }))}
        />

        {selected && preview ? (
          <Card title={selected.name}>
            <Text style={AppTheme.hint}>
              {selected.brand ? `${selected.brand} · ` : ""}
              {sourceLabels[selected.source]} · por 100 g: {describeNutrients(selected.per100)}
            </Text>
            <Input label="Cantidad (g)" value={grams} onChangeText={setGrams} keyboardType="decimal-pad" />
            <View style={AppTheme.rowActions}>
              {[0.5, 1, 2].map((portions) => (
                <LinkButton
                  key={portions}
                  title={`${portions === 0.5 ? "½" : portions} ${selected.servingLabel ?? "porción"} · ${Math.round(selected.servingG * portions)} g`}
                  onPress={() => setGrams(String(Math.round(selected.servingG * portions)))}
                />
              ))}
            </View>
            <Text style={AppTheme.body}>{describeNutrients(preview)}</Text>
            <Button title="Añadir al plato" onPress={addSelected} />
            <Button title="Cancelar" variant="secondary" onPress={() => setSelected(null)} />
          </Card>
        ) : (
          <>
            <ChoiceControl value={mode} onChange={setMode} options={MODES} />

            {mode === "search" ? (
              <Card title="Buscar alimento">
                <Input
                  label="Nombre o marca"
                  value={query}
                  onChangeText={(text) => {
                    setQuery(text);
                    setOnlineResults([]);
                  }}
                  placeholder="pollo, avena, yogur…"
                  autoCorrect={false}
                />
                {query.trim() ? (
                  <>
                    {results.map((food) => (
                      <FoodRow key={food.id} food={food} onPress={() => choose(food)} />
                    ))}
                    {!results.length ? (
                      <Text style={AppTheme.body}>
                        No está entre tus alimentos ni en los básicos. Créalo en "Nuevo alimento" o usa
                        "Rápido".
                      </Text>
                    ) : null}
                    {online && query.trim().length >= 3 ? (
                      <Button
                        title={busy ? "Buscando…" : "Buscar también en línea"}
                        variant="secondary"
                        onPress={busy ? () => undefined : searchOnlineNow}
                      />
                    ) : (
                      <Text style={AppTheme.hint}>
                        {online
                          ? "Escribe al menos 3 letras para buscar productos en línea."
                          : "Resultados sin conexión. Para buscar productos envasados, enciende la búsqueda en línea en Más."}
                      </Text>
                    )}
                    {onlineResults.length ? <Text style={AppTheme.hint}>{OFF_ATTRIBUTION}</Text> : null}
                  </>
                ) : (
                  <>
                    {suggestions.length ? (
                      <Text style={AppTheme.label}>Habituales en {slotLabel(slot).toLowerCase()}</Text>
                    ) : (
                      <Text style={AppTheme.hint}>
                        Aquí aparecerá lo que sueles comer a esta hora. Empieza escribiendo un alimento.
                      </Text>
                    )}
                    {suggestions.map((food) => (
                      <FoodRow key={food.id} food={food} onPress={() => choose(food)} />
                    ))}
                    {mine.length ? <Text style={AppTheme.label}>Mis alimentos y recetas</Text> : null}
                    {mine.map((food) => (
                      <View key={food.id}>
                        <FoodRow food={food} onPress={() => choose(food)} />
                        <RowActions question={`¿Borrar "${food.name}"?`} onDelete={() => removeFood(food)} />
                      </View>
                    ))}
                  </>
                )}
              </Card>
            ) : null}

            {mode === "quick" ? (
              <Card title="Registro rápido">
                <Text style={AppTheme.hint}>
                  Solo calorías y macros, sin buscar el alimento. Si dejas vacías las calorías, se calculan.
                </Text>
                <Input
                  label="Descripción"
                  value={quick.name}
                  onChangeText={(name) => setQuick({ ...quick, name })}
                  placeholder="Opcional"
                />
                <Input
                  label="Calorías"
                  value={quick.kcal}
                  onChangeText={(kcal) => setQuick({ ...quick, kcal })}
                  keyboardType="number-pad"
                />
                <MacroInputs
                  protein={quick.protein}
                  carbs={quick.carbs}
                  fats={quick.fats}
                  onChange={(field, value) => setQuick({ ...quick, [field]: value })}
                />
                <Button title="Añadir al plato" onPress={addQuick} />
              </Card>
            ) : null}

            {mode === "new" ? (
              <Card title="Nuevo alimento">
                <Text style={AppTheme.hint}>
                  Copia los valores de la etiqueta para una porción. Queda guardado en tus alimentos.
                </Text>
                <Input
                  label="Nombre"
                  value={custom.name}
                  onChangeText={(name) => setCustom({ ...custom, name })}
                />
                <Input
                  label="Marca"
                  value={custom.brand}
                  onChangeText={(brand) => setCustom({ ...custom, brand })}
                  placeholder="Opcional"
                />
                <Input
                  label="Gramos por porción"
                  value={custom.servingG}
                  onChangeText={(servingG) => setCustom({ ...custom, servingG })}
                  keyboardType="decimal-pad"
                />
                <Input
                  label="Calorías por porción"
                  value={custom.kcal}
                  onChangeText={(kcal) => setCustom({ ...custom, kcal })}
                  keyboardType="number-pad"
                  placeholder="Vacío: se calculan con los macros"
                />
                <MacroInputs
                  protein={custom.protein}
                  carbs={custom.carbs}
                  fats={custom.fats}
                  onChange={(field, value) => setCustom({ ...custom, [field]: value })}
                />
                <Button title="Guardar alimento" onPress={createFood} />
              </Card>
            ) : null}

            {mode === "barcode" ? (
              <Card title="Código de barras">
                {scanning ? (
                  <BarcodeScanner onCode={findBarcode} onClose={() => setScanning(false)} />
                ) : (
                  <>
                    {scannerAvailable ? (
                      <Button title="Escanear con la cámara" onPress={() => setScanning(true)} />
                    ) : null}
                    <Input
                      label="Número del código"
                      value={barcode}
                      onChangeText={setBarcode}
                      keyboardType="number-pad"
                      placeholder="7750000000000"
                    />
                    <Button
                      title={busy ? "Buscando…" : "Buscar código"}
                      variant="secondary"
                      onPress={busy ? () => undefined : () => findBarcode(barcode)}
                    />
                    <Text style={AppTheme.hint}>
                      {online
                        ? `Los productos nuevos se consultan en Open Food Facts y quedan guardados. ${OFF_ATTRIBUTION}`
                        : "Sin búsqueda en línea solo se encuentran productos que ya usaste. Enciéndela en Más."}
                    </Text>
                  </>
                )}
              </Card>
            ) : null}
          </>
        )}

        {message ? (
          <Text style={message.error ? AppTheme.errorText : AppTheme.body}>{message.text}</Text>
        ) : null}

        <Card title={plate.length ? `El plato · ${plateTotals.kcal} kcal` : "El plato"}>
          {plate.length ? (
            <>
              {plate.map((draft, index) => (
                <View key={`${draft.name}-${index}`}>
                  <ListRow
                    title={draft.name}
                    detail={`${draft.grams ? `${draft.grams} g · ` : ""}P ${draft.proteinG} · C ${draft.carbsG} · G ${draft.fatsG}`}
                    value={`${draft.kcal} kcal`}
                  />
                  <View style={AppTheme.rowActions}>
                    <LinkButton
                      title="Quitar"
                      danger
                      onPress={() =>
                        setPlate((current) => current.filter((_, position) => position !== index))
                      }
                    />
                  </View>
                </View>
              ))}
              <Text style={AppTheme.body}>Total: {describeNutrients(plateTotals)}</Text>
              <Button title={`Guardar en ${slotLabel(slot).toLowerCase()}`} onPress={savePlate} />
              <Text style={AppTheme.label}>¿Lo preparas seguido? Guárdalo como receta</Text>
              <View style={AppTheme.fieldRow}>
                <View style={{ flex: 2 }}>
                  <Input label="Nombre de la receta" value={recipeName} onChangeText={setRecipeName} />
                </View>
                <View style={AppTheme.fieldRowItem}>
                  <Input
                    label="Porciones"
                    value={recipeServings}
                    onChangeText={setRecipeServings}
                    keyboardType="decimal-pad"
                  />
                </View>
              </View>
              <Button title="Guardar como receta" variant="secondary" onPress={saveRecipe} />
            </>
          ) : (
            <Text style={AppTheme.body}>
              Elige uno o varios alimentos; se juntan aquí y los guardas de una vez.
            </Text>
          )}
        </Card>
      </ScrollView>
    </Screen>
  );
}

function FoodRow({ food, onPress }: { food: Food; onPress: () => void }) {
  return (
    <View>
      <ListRow
        title={food.name}
        detail={`${food.brand ? `${food.brand} · ` : ""}${sourceLabels[food.source]} · P ${food.per100.proteinG} · C ${food.per100.carbsG} · G ${food.per100.fatsG} por 100 g`}
        value={`${food.per100.kcal} kcal`}
      />
      <View style={AppTheme.rowActions}>
        <LinkButton title="Elegir" onPress={onPress} />
      </View>
    </View>
  );
}

function MacroInputs({
  protein,
  carbs,
  fats,
  onChange,
}: {
  protein: string;
  carbs: string;
  fats: string;
  onChange: (field: "protein" | "carbs" | "fats", value: string) => void;
}) {
  return (
    <View style={AppTheme.fieldRow}>
      <View style={AppTheme.fieldRowItem}>
        <Input
          label="Proteína (g)"
          value={protein}
          onChangeText={(value) => onChange("protein", value)}
          keyboardType="decimal-pad"
        />
      </View>
      <View style={AppTheme.fieldRowItem}>
        <Input
          label="Carbos (g)"
          value={carbs}
          onChangeText={(value) => onChange("carbs", value)}
          keyboardType="decimal-pad"
        />
      </View>
      <View style={AppTheme.fieldRowItem}>
        <Input
          label="Grasas (g)"
          value={fats}
          onChangeText={(value) => onChange("fats", value)}
          keyboardType="decimal-pad"
        />
      </View>
    </View>
  );
}
