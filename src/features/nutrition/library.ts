import {
  buildRecipe,
  type CustomFoodResult,
  type Food,
  type RecipeIngredient,
} from "@/src/features/nutrition/foods";

/**
 * Biblioteca: todo lo propio en un solo lugar (favoritos, alimentos propios,
 * recetas y comidas guardadas) y editar una receta ya creada: cambiar gramos,
 * quitar ingredientes o las porciones que rinde. Módulo puro.
 */

const round1 = (value: number) => Math.round(value * 10) / 10;

/** Porciones que rinde una receta (total de gramos ÷ gramos por porción). */
export function recipeServings(recipe: Food): number {
  const total = (recipe.ingredients ?? []).reduce((sum, item) => sum + item.grams, 0);
  return recipe.servingG > 0 ? Math.max(1, Math.round(total / recipe.servingG)) : 1;
}

/** Un ingrediente con otra cantidad: sus nutrientes cambian en proporción. */
export function scaleIngredient(ingredient: RecipeIngredient, grams: number): RecipeIngredient {
  const factor = ingredient.grams > 0 ? Math.max(0, grams) / ingredient.grams : 0;
  return {
    ...ingredient,
    grams: Math.max(0, grams),
    kcal: Math.round(ingredient.kcal * factor),
    proteinG: round1(ingredient.proteinG * factor),
    carbsG: round1(ingredient.carbsG * factor),
    fatsG: round1(ingredient.fatsG * factor),
    ...(ingredient.alcoholG ? { alcoholG: round1(ingredient.alcoholG * factor) } : {}),
  };
}

/** Vuelve a armar la receta con sus cambios, conservando su id (lo ya registrado no cambia). */
export function editRecipe(
  recipe: Food,
  ingredients: RecipeIngredient[],
  servings: number,
  name = recipe.name,
): CustomFoodResult {
  return buildRecipe(
    name,
    servings,
    ingredients.filter((item) => item.grams > 0),
    recipe.id,
  );
}

export type LibrarySection = "favorites" | "foods" | "recipes" | "meals";

/** Separa los alimentos de la persona en propios (incluye los de Open Food Facts guardados) y recetas. */
export function splitUserFoods(foods: Food[]) {
  return {
    foods: foods.filter((food) => food.source !== "recipe"),
    recipes: foods.filter((food) => food.source === "recipe"),
  };
}
