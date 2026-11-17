import { useCallback, useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";

import { Button, Card, Input, LinkButton, NavRow, RowActions, Screen } from "@/src/components/ui";
import {
  DAY_KIND_LABELS,
  dayTotals,
  dietToText,
  itemFromFood,
  mealTotals,
  otherState,
  parseDietText,
  readDiet,
  replaceItem,
  scaleItem,
  unresolved,
  type DietPlan,
} from "@/src/features/diet/diet";
import { getDiet, saveDiet } from "@/src/features/diet/diet.repository";
import { BUILTIN_FOODS } from "@/src/features/nutrition/builtin.foods";
import { searchFoods, type Food } from "@/src/features/nutrition/foods";
import { getUserFoods } from "@/src/features/nutrition/nutrition.repository";
import { localDateKey } from "@/src/lib/dates";
import { pickTextFile, shareTextFile } from "@/src/lib/files";
import { VIEWER } from "@/src/lib/mode";
import { AppTheme } from "@/src/theme";

const EXAMPLE = `Desayuno 7:30
- Avena 60 g
- 2 huevos
- 1 plátano de seda
Almuerzo 13:00
- Arroz blanco cocido 200 g
- Pechuga de pollo cocida 150 g
Cena 20:00
- Lentejas cocidas 250 g`;

type At = { day: number; meal: number; item: number };

// Mi dieta: se pega como texto (o se abre un archivo), la app reconoce comidas,
// alimentos y cantidades, y se corrige lo que no entendió antes de guardar.
export default function DietScreen() {
  const router = useRouter();
  const [saved, setSaved] = useState<DietPlan | null>(null);
  const [draft, setDraft] = useState<DietPlan | null>(null);
  const [text, setText] = useState("");
  const [foods, setFoods] = useState<Food[]>(BUILTIN_FOODS);
  const [fixing, setFixing] = useState<At | null>(null);
  const [query, setQuery] = useState("");
  const [message, setMessage] = useState("");
  useFocusEffect(
    useCallback(() => {
      getDiet().then(setSaved);
      getUserFoods().then((mine) => setFoods([...mine, ...BUILTIN_FOODS]));
    }, []),
  );

  const plan = draft ?? saved;
  const editable = !VIEWER;
  const change = (next: DietPlan) => (draft ? setDraft(next) : saveDiet(next).then(() => setSaved(next)));
  const read = (source: string) => {
    const fromJson = source.trim().startsWith("{") ? readDiet(safeJson(source)) : null;
    const next = fromJson ?? parseDietText(source, foods, "Mi dieta", localDateKey()).plan;
    if (!next.days.length)
      return setMessage("No encontré comidas. Escribe cada comida en una línea y sus alimentos debajo.");
    setMessage("");
    setDraft(next);
  };

  if (!plan)
    return (
      <Screen>
        <ScrollView contentContainerStyle={AppTheme.content} keyboardShouldPersistTaps="handled">
          <Card title="Carga tu dieta">
            <Text style={AppTheme.body}>
              Pega aquí la dieta que te dio tu nutricionista o la que sigues. Una comida por título y sus
              alimentos debajo, con la cantidad.
            </Text>
            <Input
              label="Tu dieta"
              value={text}
              onChangeText={setText}
              multiline
              placeholder={EXAMPLE}
              style={[AppTheme.input, { minHeight: 220, textAlignVertical: "top" }]}
            />
            {editable ? <Button title="Leer dieta" onPress={() => read(text)} /> : null}
            {editable ? (
              <Button
                title="Abrir un archivo"
                variant="secondary"
                onPress={async () => {
                  const file = await pickTextFile();
                  if (file) read(file);
                }}
              />
            ) : null}
            <LinkButton title="Usar el ejemplo" onPress={() => setText(EXAMPLE)} />
            {message ? <Text style={AppTheme.errorText}>{message}</Text> : null}
            <Text style={AppTheme.hint}>
              Para tener un día de entreno y otro de descanso, pon "Día de entreno" y "Día de descanso" como
              títulos. Entiende gramos, ml, unidades, tazas y cucharadas.
            </Text>
          </Card>
        </ScrollView>
      </Screen>
    );

  const pending = unresolved(plan);
  return (
    <Screen>
      <ScrollView contentContainerStyle={AppTheme.content} keyboardShouldPersistTaps="handled">
        {draft ? (
          <View style={AppTheme.banner}>
            <Text style={AppTheme.bannerTitle}>Revisa antes de guardar</Text>
            <Text style={AppTheme.body}>
              {pending
                ? `No reconocí ${pending} ${pending === 1 ? "alimento" : "alimentos"}: tócalo para elegirlo.`
                : "Reconocí todos los alimentos. Revisa las cantidades y si es crudo o cocido."}
            </Text>
          </View>
        ) : null}

        {plan.days.map((day, dayIndex) => (
          <View key={`${day.kind}-${dayIndex}`} style={{ gap: 12 }}>
            <Text style={AppTheme.sectionTitle}>
              {DAY_KIND_LABELS[day.kind]} · {dayTotals(day).kcal} kcal · {Math.round(dayTotals(day).proteinG)}{" "}
              g prot
            </Text>
            {day.meals.map((meal, mealIndex) => (
              <Card
                key={`${meal.slot}-${mealIndex}`}
                title={`${meal.label}${meal.time ? ` · ${meal.time}` : ""}`}
              >
                <Text style={AppTheme.hint}>
                  {mealTotals(meal).kcal} kcal · P {Math.round(mealTotals(meal).proteinG)} · C{" "}
                  {Math.round(mealTotals(meal).carbsG)} · G {Math.round(mealTotals(meal).fatsG)}
                </Text>
                {meal.items.map((item, itemIndex) => {
                  const at = { day: dayIndex, meal: mealIndex, item: itemIndex };
                  const open =
                    fixing?.day === dayIndex && fixing.meal === mealIndex && fixing.item === itemIndex;
                  const other = item.ambiguous ? otherState(item, foods) : null;
                  return (
                    <View key={`${item.name}-${itemIndex}`} style={{ gap: 6, paddingVertical: 4 }}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel={`Cambiar ${item.name}`}
                          disabled={!editable}
                          onPress={() => {
                            setFixing(open ? null : at);
                            setQuery("");
                          }}
                          style={{ flex: 1 }}
                        >
                          <Text
                            style={[AppTheme.entryName, item.unknown && { color: AppTheme.colors.warning }]}
                          >
                            {item.name}
                          </Text>
                          <Text style={AppTheme.entryDetail}>
                            {item.unknown
                              ? "No lo reconocí: toca para elegirlo"
                              : `${item.kcal} kcal · P ${item.proteinG}`}
                          </Text>
                        </Pressable>
                        {item.grams && editable ? (
                          <TextInput
                            accessibilityLabel={`Gramos de ${item.name}`}
                            defaultValue={String(item.grams)}
                            keyboardType="decimal-pad"
                            onEndEditing={(event) => {
                              const grams = Number(event.nativeEvent.text.replace(",", "."));
                              if (grams > 0 && item.grams)
                                change(replaceItem(plan, at, scaleItem(item, grams / item.grams)));
                            }}
                            style={[AppTheme.input, { width: 72, textAlign: "center" }]}
                          />
                        ) : (
                          <Text style={AppTheme.hint}>{item.grams ? `${item.grams} g` : ""}</Text>
                        )}
                      </View>
                      {other && editable ? (
                        <LinkButton
                          title={`¿Era ${other.name.toLowerCase()}? Cambiar`}
                          onPress={() => change(replaceItem(plan, at, other))}
                        />
                      ) : null}
                      {open ? (
                        <View style={{ gap: 4 }}>
                          <TextInput
                            accessibilityLabel="Buscar alimento para la dieta"
                            value={query}
                            onChangeText={setQuery}
                            placeholder="Buscar el alimento correcto"
                            placeholderTextColor={AppTheme.colors.muted}
                            style={AppTheme.input}
                            autoFocus
                          />
                          {searchFoods(foods, query, {}, 6).map((food) => (
                            <Pressable
                              key={food.id}
                              accessibilityRole="button"
                              onPress={() => {
                                change(
                                  replaceItem(plan, at, itemFromFood(food, item.grams ?? food.servingG)),
                                );
                                setFixing(null);
                              }}
                              style={AppTheme.entryRow}
                            >
                              <Text style={[AppTheme.entryName, { flex: 1 }]}>{food.name}</Text>
                              <Text style={AppTheme.hint}>{food.per100.kcal} kcal/100 g</Text>
                            </Pressable>
                          ))}
                          <LinkButton
                            title="Quitar de la dieta"
                            danger
                            onPress={() => change(replaceItem(plan, at, null))}
                          />
                        </View>
                      ) : null}
                    </View>
                  );
                })}
              </Card>
            ))}
          </View>
        ))}

        {draft ? (
          <>
            <Button
              title="Guardar dieta"
              onPress={async () => {
                await saveDiet(draft);
                setSaved(draft);
                setDraft(null);
              }}
            />
            <Button title="Volver a escribirla" variant="secondary" onPress={() => setDraft(null)} />
          </>
        ) : (
          <>
            <Card title="Con tu dieta cargada">
              <Text style={AppTheme.body}>
                En el Panel verás qué comida toca, la registras con un toque y recibes cambios según tu
                entreno, cómo te sientes y tu salud.
              </Text>
              <NavRow
                title="Salud y restricciones"
                detail="Alergias, intolerancias y lo que te indicó tu médico"
                onPress={() => router.push("/health")}
              />
            </Card>
            <Button
              title="Compartir como texto"
              variant="secondary"
              onPress={() => shareTextFile("mi-dieta.txt", dietToText(plan), "text/plain")}
            />
            {editable ? (
              <>
                <Button
                  title="Reemplazar por otra"
                  variant="secondary"
                  onPress={() => {
                    setText(dietToText(plan));
                    setSaved(null);
                  }}
                />
                <RowActions
                  question="¿Borrar tu dieta? Lo ya registrado no cambia."
                  onDelete={async () => {
                    await saveDiet(null);
                    setSaved(null);
                    setText("");
                  }}
                />
              </>
            ) : null}
          </>
        )}
      </ScrollView>
    </Screen>
  );
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}
