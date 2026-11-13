import { Ionicons } from "@expo/vector-icons";
import { useCallback, useMemo, useState } from "react";
import { ScrollView, Text, TextInput, View } from "react-native";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";

import {
  BigInput,
  Button,
  Card,
  Chips,
  ChoiceControl,
  IconButton,
  IconTabs,
  Input,
  RowActions,
  Screen,
} from "@/src/components/ui";
import { ViewerOnlyNotice } from "@/src/features/backup/ViewerSections";
import { BarcodeScanner, scannerAvailable } from "@/src/features/nutrition/BarcodeScanner";
import { BUILTIN_FOODS } from "@/src/features/nutrition/builtin.foods";
import {
  buildCustomFood,
  buildRecipe,
  counterpart,
  emptyCustomFood,
  equivalentGrams,
  nutrientsFor,
  searchFoods,
  stateLabels,
  type CustomFoodForm,
  type Food,
  type FoodState,
} from "@/src/features/nutrition/foods";
import { EntryRow, FoodResult, MacroSplit, SLOT_ICONS } from "@/src/features/nutrition/MealSections";
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
  toggleId,
  totalsOf,
  type MealDraft,
  type MealEntry,
  type MealSlot,
  type QuickForm,
} from "@/src/features/nutrition/meals";
import {
  addMealEntries,
  deleteFood,
  deleteMealEntry,
  getMealEntries,
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
import { getSetting, setSetting } from "@/src/features/settings/settings.repository";
import { dayLabel, localDateKey } from "@/src/lib/dates";
import { VIEWER } from "@/src/lib/mode";
import { AppTheme } from "@/src/theme";

type Mode = "search" | "quick" | "new" | "barcode" | "recipe";

export default function AddFoodScreen() {
  return VIEWER ? <ViewerOnlyNotice what="El registro de comidas" /> : <AddFoodContent />;
}

// Agregar alimento: cada alimento se registra por separado, con su peso, en el
// momento del día elegido. Una receta se arma aparte y queda como un alimento más.
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
  const [logged, setLogged] = useState<MealEntry[]>([]);
  const [online, setOnline] = useState(false);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const [onlineResults, setOnlineResults] = useState<Food[]>([]);
  const [selected, setSelected] = useState<Food | null>(null);
  const [grams, setGrams] = useState("");
  const [quick, setQuick] = useState<QuickForm>(emptyQuick);
  const [custom, setCustom] = useState<CustomFoodForm>(emptyCustomFood);
  const [barcode, setBarcode] = useState("");
  const [scanning, setScanning] = useState(false);
  const [busy, setBusy] = useState(false);
  const [ingredients, setIngredients] = useState<MealDraft[]>([]);
  const [recipeName, setRecipeName] = useState("");
  const [recipeServings, setRecipeServings] = useState("1");
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null);

  const load = useCallback(() => {
    Promise.all([
      getUserFoods(),
      getMealHistory(),
      getOnlineLookup(),
      getMealEntries(date),
      getSetting("favorite_foods"),
    ]).then(([foods, entries, enabled, today, saved]) => {
      setUserFoods(foods);
      setHistory(entries);
      setOnline(enabled);
      setLogged(today);
      setFavorites(
        Array.isArray(saved) ? saved.filter((item): item is string => typeof item === "string") : [],
      );
    });
  }, [date]);
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
  const favoriteFoods = favorites.flatMap((id) => {
    const food = allFoods.find((item) => item.id === id);
    return food ? [food] : [];
  });
  const toggleFavorite = async (id: string) => {
    const next = toggleId(favorites, id);
    setFavorites(next);
    await setSetting("favorite_foods", next);
  };
  const inSlot = logged.filter((entry) => entry.slot === slot);
  const note = (text: string, error = false) => setMessage({ text, error });
  const slotName = slotLabel(slot).toLowerCase();

  const choose = (food: Food) => {
    setMessage(null);
    setSelected(food);
    setGrams(String(usage.lastGrams[food.id] ?? food.servingG));
  };
  // Pasar de crudo a cocido cambia el alimento y convierte la cantidad a la equivalente.
  const switchState = (state: FoodState) => {
    if (!selected || selected.state === state) return;
    const other = counterpart(selected, allFoods);
    if (!other) return;
    setGrams(String(equivalentGrams(selected, other, Number(grams) || selected.servingG)));
    setSelected(other);
  };
  const log = async (drafts: MealDraft[]) => {
    await addMealEntries(date, slot, drafts);
    load();
  };
  const addSelected = async () => {
    if (!selected) return;
    const amount = Number(grams);
    if (!(amount > 0 && amount <= 5000)) return note("Escribe la cantidad en gramos.", true);
    // Un producto traído de internet se guarda la primera vez que se usa: después aparece sin red.
    if (selected.source === "off" && !userFoods.some((food) => food.id === selected.id))
      await saveFood(selected);
    const draft = draftFromFood(selected, amount);
    if (mode === "recipe") {
      setIngredients((current) => [...current, draft]);
      note(`${selected.name} · ${amount} g en la receta.`);
    } else {
      await log([draft]);
      note(`${selected.name} · ${amount} g en ${slotName}.`);
    }
    setSelected(null);
    setQuery("");
    setOnlineResults([]);
  };
  const addQuick = async () => {
    const result = draftFromQuick(quick);
    if (result.error !== null) return note(result.error, true);
    await log([result.draft]);
    setQuick(emptyQuick());
    note(`${result.draft.name} · ${result.draft.kcal} kcal en ${slotName}.`);
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
      note(found.length ? `${found.length} productos en línea.` : "Sin resultados en línea.");
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
    if (!online) return note("Ese producto no está guardado. Enciende la búsqueda en línea en Más.", true);
    setBusy(true);
    try {
      const found = await lookupBarcodeOnline(code);
      if (found) choose(found);
      else note("Ese código no está en Open Food Facts. Créalo como alimento nuevo.", true);
    } catch {
      note("No se pudo consultar el código. Revisa tu conexión.", true);
    } finally {
      setBusy(false);
    }
  };
  const saveRecipe = async () => {
    const result = buildRecipe(
      recipeName,
      Number(recipeServings),
      ingredientsFromDrafts(ingredients),
      newFoodId("r"),
    );
    if (result.error !== null) return note(result.error, true);
    await saveFood(result.food);
    setRecipeName("");
    setIngredients([]);
    load();
    note(`Receta "${result.food.name}" guardada: una porción son ${result.food.servingG} g.`);
  };

  const preview = selected ? nutrientsFor(selected, Number(grams) || 0) : null;
  const other = selected ? counterpart(selected, allFoods) : null;
  const searching = mode === "search" || mode === "recipe";

  return (
    <Screen>
      <ScrollView contentContainerStyle={AppTheme.content} keyboardShouldPersistTaps="handled">
        <Text style={AppTheme.eyebrow}>
          {dayLabel(date).toUpperCase()} · {date}
        </Text>
        <IconTabs
          value={slot}
          onChange={setSlot}
          options={MEAL_SLOTS.map((item) => ({
            value: item.id,
            label: item.label,
            icon: SLOT_ICONS[item.id],
          }))}
        />

        {selected && preview ? (
          <Card title={selected.name}>
            <View style={AppTheme.rowActions}>
              <IconButton
                icon={favorites.includes(selected.id) ? "star" : "star-outline"}
                label={favorites.includes(selected.id) ? "Quitar de favoritos" : "Agregar a favoritos"}
                onPress={() => toggleFavorite(selected.id)}
              />
            </View>
            {other && selected.state ? (
              <ChoiceControl
                value={selected.state}
                onChange={switchState}
                options={(["raw", "cooked"] as const).map((state) => ({
                  value: state,
                  label: stateLabels[state],
                }))}
              />
            ) : null}
            <View style={AppTheme.fieldRow}>
              <BigInput label="Cantidad" unit="gramos" value={grams} onChangeText={setGrams} autoFocus />
            </View>
            <Chips
              value={Number(grams)}
              onChange={(value) => setGrams(String(value))}
              options={[0.5, 1, 2].map((portions) => ({
                value: Math.round(selected.servingG * portions),
                label: `${portions === 0.5 ? "½" : portions} ${selected.servingLabel ?? "porción"}`,
              }))}
            />
            <Text style={AppTheme.ringNumber}>{preview.kcal} kcal</Text>
            <MacroSplit nutrients={preview} />
            {other && Number(grams) > 0 ? (
              <Text style={AppTheme.hint}>
                Equivale a {equivalentGrams(selected, other, Number(grams))} g{" "}
                {stateLabels[other.state ?? "raw"].toLowerCase()}
              </Text>
            ) : null}
            <Button
              title={mode === "recipe" ? "Agregar a la receta" : `Agregar a ${slotName}`}
              onPress={addSelected}
            />
            <Button title="Cancelar" variant="secondary" onPress={() => setSelected(null)} />
          </Card>
        ) : (
          <>
            <IconTabs
              value={mode}
              onChange={(next) => {
                setMessage(null);
                setMode(next);
              }}
              options={[
                { value: "search", label: "Buscar", icon: "search" },
                { value: "quick", label: "Rápido", icon: "flash-outline" },
                { value: "new", label: "Nuevo", icon: "create-outline" },
                { value: "barcode", label: "Código", icon: "barcode-outline" },
                { value: "recipe", label: "Receta", icon: "book-outline" },
              ]}
            />

            {searching ? (
              <Card title={mode === "recipe" ? "Ingredientes de la receta" : "Buscar alimento"}>
                <View style={[AppTheme.iconRow, AppTheme.searchBox]}>
                  <Ionicons name="search" size={18} color={AppTheme.colors.muted} />
                  <TextInput
                    accessibilityLabel="Buscar alimento"
                    value={query}
                    onChangeText={(text) => {
                      setQuery(text);
                      setOnlineResults([]);
                    }}
                    placeholder="pollo, arroz, avena…"
                    placeholderTextColor={AppTheme.colors.muted}
                    autoCorrect={false}
                    style={AppTheme.searchInput}
                  />
                </View>
                {query.trim() ? (
                  <>
                    {results.map((food) => (
                      <FoodResult key={food.id} food={food} onPress={() => choose(food)} />
                    ))}
                    {!results.length ? (
                      <Text style={AppTheme.hint}>Sin resultados. Créalo en "Nuevo".</Text>
                    ) : null}
                    {online && query.trim().length >= 3 ? (
                      <Button
                        title={busy ? "Buscando…" : "Buscar también en línea"}
                        variant="secondary"
                        onPress={busy ? () => undefined : searchOnlineNow}
                      />
                    ) : null}
                    {onlineResults.length ? <Text style={AppTheme.hint}>{OFF_ATTRIBUTION}</Text> : null}
                  </>
                ) : (
                  <>
                    {mode === "search" && favoriteFoods.length ? (
                      <Text style={AppTheme.label}>Favoritos</Text>
                    ) : null}
                    {mode === "search"
                      ? favoriteFoods.map((food) => (
                          <FoodResult key={`fav-${food.id}`} food={food} onPress={() => choose(food)} />
                        ))
                      : null}
                    {mode === "search" && suggestions.length ? (
                      <Text style={AppTheme.label}>Habituales en {slotName}</Text>
                    ) : null}
                    {mode === "search"
                      ? suggestions.map((food) => (
                          <FoodResult key={food.id} food={food} onPress={() => choose(food)} />
                        ))
                      : null}
                    {mode === "search" && mine.length ? (
                      <Text style={AppTheme.label}>Mis alimentos y recetas</Text>
                    ) : null}
                    {mode === "search"
                      ? mine.map((food) => (
                          <View key={food.id}>
                            <FoodResult food={food} onPress={() => choose(food)} />
                            <RowActions
                              question={`¿Borrar "${food.name}"?`}
                              onDelete={() => deleteFood(food.id).then(load)}
                            />
                          </View>
                        ))
                      : null}
                  </>
                )}
              </Card>
            ) : null}

            {mode === "recipe" ? (
              <Card title={ingredients.length ? `Receta · ${totalsOf(ingredients).kcal} kcal` : "Receta"}>
                {ingredients.map((draft, index) => (
                  <EntryRow
                    key={`${draft.name}-${index}`}
                    entry={{ ...draft, id: String(index), date, slot }}
                    onRemove={() =>
                      setIngredients((current) => current.filter((_, position) => position !== index))
                    }
                  />
                ))}
                {!ingredients.length ? (
                  <Text style={AppTheme.hint}>Busca cada ingrediente y agrégalo con su peso.</Text>
                ) : null}
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
                <Button title="Guardar receta" onPress={saveRecipe} />
              </Card>
            ) : null}

            {mode === "quick" ? (
              <Card title="Registro rápido">
                <Input
                  label="Descripción"
                  value={quick.name}
                  onChangeText={(name) => setQuick({ ...quick, name })}
                  placeholder="Opcional"
                />
                <View style={AppTheme.fieldRow}>
                  <BigInput
                    label="Calorías"
                    unit="kcal"
                    value={quick.kcal}
                    onChangeText={(kcal) => setQuick({ ...quick, kcal })}
                    keyboardType="number-pad"
                  />
                </View>
                <MacroInputs
                  protein={quick.protein}
                  carbs={quick.carbs}
                  fats={quick.fats}
                  onChange={(field, value) => setQuick({ ...quick, [field]: value })}
                />
                <Button title={`Agregar a ${slotName}`} onPress={addQuick} />
              </Card>
            ) : null}

            {mode === "new" ? (
              <Card title="Nuevo alimento">
                <Text style={AppTheme.hint}>Copia la etiqueta: valores de una porción.</Text>
                <Input
                  label="Nombre"
                  value={custom.name}
                  onChangeText={(name) => setCustom({ ...custom, name })}
                />
                <View style={AppTheme.fieldRow}>
                  <View style={{ flex: 2 }}>
                    <Input
                      label="Marca"
                      value={custom.brand}
                      onChangeText={(brand) => setCustom({ ...custom, brand })}
                      placeholder="Opcional"
                    />
                  </View>
                  <View style={AppTheme.fieldRowItem}>
                    <Input
                      label="Porción (g)"
                      value={custom.servingG}
                      onChangeText={(servingG) => setCustom({ ...custom, servingG })}
                      keyboardType="decimal-pad"
                    />
                  </View>
                </View>
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
                        ? OFF_ATTRIBUTION
                        : "Sin búsqueda en línea solo se encuentran productos que ya usaste."}
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

        {mode !== "recipe" ? (
          <Card
            title={inSlot.length ? `${slotLabel(slot)} · ${totalsOf(inSlot).kcal} kcal` : slotLabel(slot)}
          >
            {inSlot.map((entry) => (
              <EntryRow key={entry.id} entry={entry} onRemove={() => deleteMealEntry(entry).then(load)} />
            ))}
            {!inSlot.length ? <Text style={AppTheme.hint}>Aún no registras nada en {slotName}.</Text> : null}
            <Button title="Listo" variant="secondary" onPress={() => router.back()} />
          </Card>
        ) : null}
      </ScrollView>
    </Screen>
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
