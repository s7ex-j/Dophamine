import { useCallback, useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";

import { Button, Card, Input, LinkButton, NavRow, RowActions, Screen } from "@/src/components/ui";
import {
  DAY_KIND_LABELS,
  dayTotals,
  dietToText,
  isWeekly,
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
import {
  DietFormatError,
  importDietFile,
  isDietFile,
  WEEKDAY_NAMES,
  WEEKDAYS,
  type Weekday,
} from "@/src/features/diet/format";
import { BUILTIN_FOODS } from "@/src/features/nutrition/builtin.foods";
import { searchFoods, type Food } from "@/src/features/nutrition/foods";
import { getUserFoods } from "@/src/features/nutrition/nutrition.repository";
import { weekdayId } from "@/src/features/training/week";
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
  const [weekday, setWeekday] = useState(() => weekdayId(new Date()));
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
    const json = source.trim().startsWith("{") ? safeJson(source) : null;
    let fromJson: DietPlan | null = null;
    if (isDietFile(json)) {
      // Archivo con el formato de Dophamine: o entra completo o se dice qué corregir.
      try {
        fromJson = importDietFile(json, localDateKey());
      } catch (error) {
        return setMessage(error instanceof DietFormatError ? error.message : "No se pudo leer el archivo.");
      }
    } else if (json) fromJson = readDiet(json);
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
            <Text style={AppTheme.hint}>
              Si tu dieta cambia según el día de la semana, usa un archivo con el formato de Dophamine
              (dophamine-diet): lleva tus alimentos, tus comidas, el horario de cada día y la hora del
              gimnasio. La plantilla está en la web; una IA puede pasar tu dieta a ese formato.
            </Text>
          </Card>
        </ScrollView>
      </Screen>
    );

  const pending = unresolved(plan);
  const weekly = isWeekly(plan);
  const shown = plan.days
    .map((day, index) => ({ day, index }))
    .filter(({ day }) => !weekly || day.weekday === weekday);
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

        <Text style={AppTheme.title}>{plan.name}</Text>
        {plan.targets ? (
          <Text style={AppTheme.hint}>
            Metas de la dieta: {plan.targets.kcal} kcal · P {plan.targets.proteinG} · C {plan.targets.carbsG}{" "}
            · G {plan.targets.fatsG}
          </Text>
        ) : null}
        {weekly ? (
          <View
            style={{ flexDirection: "row", borderBottomWidth: 1, borderBottomColor: AppTheme.colors.border }}
          >
            {WEEKDAYS.map((id) => {
              const day = plan.days.find((item) => item.weekday === id);
              const active = id === weekday;
              return (
                <Pressable
                  key={id}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: active }}
                  accessibilityLabel={WEEKDAY_NAMES[id]}
                  onPress={() => setWeekday(id)}
                  style={{
                    flex: 1,
                    alignItems: "center",
                    paddingVertical: 10,
                    borderBottomWidth: 2,
                    borderBottomColor: active ? AppTheme.colors.accent : "transparent",
                  }}
                >
                  <Text
                    style={{
                      fontWeight: active ? "700" : "500",
                      color: !day
                        ? AppTheme.colors.muted
                        : active
                          ? AppTheme.colors.accent
                          : AppTheme.colors.text,
                    }}
                  >
                    {WEEKDAY_NAMES[id].slice(0, 3)}
                  </Text>
                  <Text style={[AppTheme.hint, { fontSize: 10 }]}>{day?.gym ? "gym" : " "}</Text>
                </Pressable>
              );
            })}
          </View>
        ) : null}
        {weekly && !shown.length ? (
          <Text style={AppTheme.body}>
            La dieta no tiene comidas para el {WEEKDAY_NAMES[weekday as Weekday]?.toLowerCase()}.
          </Text>
        ) : null}

        {shown.map(({ day, index: dayIndex }) => (
          <View key={`${day.kind}-${dayIndex}`} style={{ gap: 12 }}>
            <Text style={AppTheme.sectionTitle}>
              {day.weekday ? WEEKDAY_NAMES[day.weekday as Weekday] : DAY_KIND_LABELS[day.kind]} ·{" "}
              {dayTotals(day).kcal} kcal · {Math.round(dayTotals(day).proteinG)} g prot
            </Text>
            {day.gym ? (
              <Text style={AppTheme.hint}>
                Gimnasio {day.gym.start}
                {day.gym.end ? `–${day.gym.end}` : ""}
              </Text>
            ) : null}
            {day.meals.map((meal, mealIndex) => (
              <Card
                key={`${meal.slot}-${mealIndex}`}
                title={`${meal.time ? `${meal.time} · ` : ""}${meal.label}`}
              >
                {meal.tags?.includes("pre_gym") || meal.tags?.includes("post_gym") ? (
                  <Text style={[AppTheme.eyebrow, { color: AppTheme.colors.warning }]}>
                    {meal.tags.includes("pre_gym") ? "ANTES DE ENTRENAR" : "DESPUÉS DE ENTRENAR"}
                  </Text>
                ) : null}
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
            {plan.rules?.length ? (
              <Card title="Reglas de tu dieta">
                {plan.rules.map((rule) => (
                  <Text key={rule} style={AppTheme.body}>
                    · {rule}
                  </Text>
                ))}
              </Card>
            ) : null}
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
                    setText(weekly ? "" : dietToText(plan));
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
