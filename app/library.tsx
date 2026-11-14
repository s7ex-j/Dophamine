import { useCallback, useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useFocusEffect } from "expo-router";

import { Button, Card, Chips, IconButton, RowActions, Screen } from "@/src/components/ui";
import { BUILTIN_FOODS } from "@/src/features/nutrition/builtin.foods";
import type { Food, RecipeIngredient } from "@/src/features/nutrition/foods";
import {
  editRecipe,
  recipeServings,
  scaleIngredient,
  splitUserFoods,
  type LibrarySection,
} from "@/src/features/nutrition/library";
import { deleteFood, getUserFoods, saveFood } from "@/src/features/nutrition/nutrition.repository";
import { savedMealTotals, type SavedMeal } from "@/src/features/nutrition/savedMeals";
import { deleteSavedMeal, getSavedMeals } from "@/src/features/nutrition/savedMeals.repository";
import { toggleId } from "@/src/features/nutrition/meals";
import { getSetting, setSetting } from "@/src/features/settings/settings.repository";
import { VIEWER } from "@/src/lib/mode";
import { AppTheme } from "@/src/theme";

const SECTIONS: Array<{ value: LibrarySection; label: string }> = [
  { value: "favorites", label: "Favoritos" },
  { value: "foods", label: "Mis alimentos" },
  { value: "recipes", label: "Recetas" },
  { value: "meals", label: "Comidas" },
];

const per100 = (food: Food) =>
  `${food.per100.kcal} kcal · ${food.per100.proteinG} P · ${food.per100.carbsG} C · ${food.per100.fatsG} G por 100 g`;

// Biblioteca: favoritos, alimentos propios, recetas (editables) y comidas guardadas.
export default function LibraryScreen() {
  const [section, setSection] = useState<LibrarySection>("favorites");
  const [userFoods, setUserFoods] = useState<Food[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [meals, setMeals] = useState<SavedMeal[]>([]);
  const [editing, setEditing] = useState<string | null>(null);
  const load = useCallback(() => {
    Promise.all([getUserFoods(), getSetting("favorite_foods"), getSavedMeals()]).then(
      ([foods, favs, saved]) => {
        setUserFoods(foods);
        setFavorites(
          Array.isArray(favs) ? favs.filter((item): item is string => typeof item === "string") : [],
        );
        setMeals(saved);
      },
    );
  }, []);
  useFocusEffect(load);
  const { foods, recipes } = splitUserFoods(userFoods);
  const all = [...userFoods, ...BUILTIN_FOODS];
  const favoriteFoods = favorites.flatMap((id) => all.filter((food) => food.id === id));
  const unfavorite = async (id: string) => {
    const next = toggleId(favorites, id);
    setFavorites(next);
    await setSetting("favorite_foods", next);
  };
  const canEdit = !VIEWER;

  return (
    <Screen>
      <ScrollView contentContainerStyle={AppTheme.content} keyboardShouldPersistTaps="handled">
        <Chips value={section} onChange={setSection} options={SECTIONS} />

        {section === "favorites" ? (
          <Card title={`Favoritos · ${favoriteFoods.length}`}>
            {favoriteFoods.map((food) => (
              <View key={food.id} style={AppTheme.entryRow}>
                <View style={{ flex: 1 }}>
                  <Text style={AppTheme.entryName}>{food.name}</Text>
                  <Text style={AppTheme.entryDetail}>{per100(food)}</Text>
                </View>
                {canEdit ? (
                  <IconButton
                    icon="star"
                    label={`Quitar ${food.name} de favoritos`}
                    onPress={() => unfavorite(food.id)}
                  />
                ) : null}
              </View>
            ))}
            {!favoriteFoods.length ? (
              <Text style={AppTheme.body}>
                Marca la estrella de un alimento al agregarlo para tenerlo aquí.
              </Text>
            ) : null}
          </Card>
        ) : null}

        {section === "foods" ? (
          <Card title={`Mis alimentos · ${foods.length}`}>
            {foods.map((food) => (
              <View key={food.id} style={{ gap: 2, paddingVertical: 4 }}>
                <Text style={AppTheme.entryName}>
                  {food.name}
                  {food.brand ? ` · ${food.brand}` : ""}
                </Text>
                <Text style={AppTheme.entryDetail}>{per100(food)}</Text>
                {canEdit ? (
                  <RowActions
                    question={`¿Borrar "${food.name}"? Lo ya anotado no cambia.`}
                    onDelete={() => deleteFood(food.id).then(load)}
                  />
                ) : null}
              </View>
            ))}
            {!foods.length ? (
              <Text style={AppTheme.body}>Crea uno en Agregar → Nuevo, o escanea un código de barras.</Text>
            ) : null}
          </Card>
        ) : null}

        {section === "recipes" ? (
          <View style={{ gap: 12 }}>
            {recipes.map((recipe) =>
              editing === recipe.id && canEdit ? (
                <RecipeEditor
                  key={recipe.id}
                  recipe={recipe}
                  onDone={async (next) => {
                    if (next) await saveFood(next);
                    setEditing(null);
                    load();
                  }}
                />
              ) : (
                <View key={recipe.id} style={[AppTheme.card, { gap: 4 }]}>
                  <Text style={AppTheme.tileTitle}>{recipe.name}</Text>
                  <Text style={AppTheme.entryDetail}>
                    {recipeServings(recipe)} porciones de {recipe.servingG} g ·{" "}
                    {Math.round((recipe.per100.kcal * recipe.servingG) / 100)} kcal por porción
                  </Text>
                  <Text style={AppTheme.hint}>
                    {(recipe.ingredients ?? []).map((item) => item.name).join(", ")}
                  </Text>
                  {canEdit ? (
                    <RowActions
                      question={`¿Borrar la receta "${recipe.name}"?`}
                      onDelete={() => deleteFood(recipe.id).then(load)}
                    >
                      <Pressable accessibilityRole="button" onPress={() => setEditing(recipe.id)}>
                        <Text style={[AppTheme.hint, { color: AppTheme.colors.accent }]}>Editar</Text>
                      </Pressable>
                    </RowActions>
                  ) : null}
                </View>
              ),
            )}
            {!recipes.length ? (
              <Card title="Recetas">
                <Text style={AppTheme.body}>
                  Arma una en Agregar → Receta: sus ingredientes con su peso y cuántas porciones rinde.
                </Text>
              </Card>
            ) : null}
          </View>
        ) : null}

        {section === "meals" ? (
          <Card title={`Comidas guardadas · ${meals.length}`}>
            {meals.map((meal) => (
              <View key={meal.id} style={{ gap: 2, paddingVertical: 4 }}>
                <Text style={AppTheme.entryName}>{meal.name}</Text>
                <Text style={AppTheme.entryDetail}>
                  {savedMealTotals(meal).kcal} kcal · {meal.items.map((item) => item.name).join(", ")}
                </Text>
                {canEdit ? (
                  <RowActions
                    question={`¿Borrar "${meal.name}"?`}
                    onDelete={() => deleteSavedMeal(meal.id).then(load)}
                  />
                ) : null}
              </View>
            ))}
            {!meals.length ? (
              <Text style={AppTheme.body}>
                Guarda una comida desde su tarjeta en el Panel ("Guardar como comida").
              </Text>
            ) : null}
          </Card>
        ) : null}
      </ScrollView>
    </Screen>
  );
}

/** Editar una receta: gramos de cada ingrediente (0 lo quita) y porciones. */
function RecipeEditor({ recipe, onDone }: { recipe: Food; onDone: (next: Food | null) => void }) {
  const [ingredients, setIngredients] = useState<RecipeIngredient[]>(recipe.ingredients ?? []);
  const [servings, setServings] = useState(String(recipeServings(recipe)));
  const [error, setError] = useState("");
  return (
    <View style={[AppTheme.card, { gap: 8 }]}>
      <Text style={AppTheme.tileTitle}>{recipe.name}</Text>
      {ingredients.map((item, index) => (
        <View key={`${item.foodId}-${index}`} style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Text style={[AppTheme.entryName, { flex: 1 }]} numberOfLines={1}>
            {item.name}
          </Text>
          <TextInput
            accessibilityLabel={`Gramos de ${item.name}`}
            defaultValue={String(item.grams)}
            keyboardType="decimal-pad"
            onEndEditing={(event) => {
              const grams = Number(event.nativeEvent.text.replace(",", "."));
              setIngredients(
                ingredients.map((value, place) =>
                  place === index ? scaleIngredient(value, grams || 0) : value,
                ),
              );
            }}
            style={[AppTheme.input, { width: 80, textAlign: "center" }]}
          />
          <Text style={AppTheme.hint}>g</Text>
        </View>
      ))}
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <Text style={[AppTheme.entryName, { flex: 1 }]}>Porciones que rinde</Text>
        <TextInput
          accessibilityLabel="Porciones"
          value={servings}
          onChangeText={setServings}
          keyboardType="number-pad"
          style={[AppTheme.input, { width: 80, textAlign: "center" }]}
        />
      </View>
      <Text style={AppTheme.hint}>
        Pon 0 g para quitar un ingrediente. Lo que ya anotaste con esta receta no cambia.
      </Text>
      {error ? <Text style={AppTheme.errorText}>{error}</Text> : null}
      <Button
        title="Guardar receta"
        onPress={() => {
          const result = editRecipe(recipe, ingredients, Number(servings));
          if (result.error !== null) return setError(result.error);
          onDone(result.food);
        }}
      />
      <Button title="Cancelar" variant="secondary" onPress={() => onDone(null)} />
    </View>
  );
}
