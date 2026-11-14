import { describe, expect, it } from "vitest";

import { buildRecipe, type RecipeIngredient } from "@/src/features/nutrition/foods";
import {
  editRecipe,
  recipeServings,
  scaleIngredient,
  splitUserFoods,
} from "@/src/features/nutrition/library";

const rice: RecipeIngredient = {
  foodId: "b:arroz",
  name: "Arroz",
  grams: 200,
  kcal: 260,
  proteinG: 5,
  carbsG: 56,
  fatsG: 1,
};
const chicken: RecipeIngredient = {
  foodId: "b:pollo",
  name: "Pollo",
  grams: 150,
  kcal: 248,
  proteinG: 46,
  carbsG: 0,
  fatsG: 5,
};
const recipe = buildRecipe("Arroz con pollo", 2, [rice, chicken], "r:1").food!;

describe("editar una receta", () => {
  it("sabe cuántas porciones rinde", () => {
    expect(recipeServings(recipe)).toBe(2);
  });

  it("cambiar gramos recalcula sus nutrientes", () => {
    expect(scaleIngredient(rice, 100)).toMatchObject({ grams: 100, kcal: 130, proteinG: 2.5, carbsG: 28 });
  });

  it("se rearma con el mismo id, sin los ingredientes en 0", () => {
    const edited = editRecipe(recipe, [scaleIngredient(rice, 100), scaleIngredient(chicken, 0)], 1).food!;
    expect(edited.id).toBe("r:1");
    expect(edited.ingredients).toHaveLength(1);
    expect(edited.servingG).toBe(100);
    expect(edited.per100.kcal).toBe(130);
    expect(editRecipe(recipe, [], 1).error).toContain("ingrediente");
  });

  it("separa alimentos propios y recetas", () => {
    const own = { ...recipe, id: "c:1", source: "custom" as const };
    expect(splitUserFoods([recipe, own])).toEqual({ foods: [own], recipes: [recipe] });
  });
});
