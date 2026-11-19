import { useEffect, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { TermTip } from "@/src/features/profile/TermTip";
import { FirstRunSetup } from "@/src/features/profile/FirstRunSetup";
import { Pressable, ScrollView, View } from "react-native";
import { Text } from "@/src/components/Text";

import { StackBar } from "@/src/components/charts";
import {
  BigInput,
  Button,
  Card,
  Chips,
  ChoiceControl,
  Input,
  OptionList,
  Screen,
  StepDots,
} from "@/src/components/ui";
import { saveDayBody } from "@/src/features/biometrics/biometrics.repository";
import { readDiet } from "@/src/features/diet/diet";
import { getHealth, saveDiet, saveHealth } from "@/src/features/diet/diet.repository";
import { DietFormatError, importDietFile, isDietFile } from "@/src/features/diet/format";
import { parseProgram } from "@/src/features/export/export";
import { ALLERGEN_LABELS, type Allergen } from "@/src/features/health/foodTags";
import { DIET_TYPES } from "@/src/features/profile/targets";
import { saveRoutine } from "@/src/features/training/training.repository";
import { localDateKey } from "@/src/lib/dates";
import { getSetting, setSetting } from "@/src/features/settings/settings.repository";
import { GOAL_DATE_KEY, readGoalDate } from "@/src/features/goals/goalDate";
import { switchTheme } from "@/src/theming/live";
import { suggestedTheme, THEME_KEY, type ThemeId } from "@/src/theming/palettes";
import { ThemePicker } from "@/src/theming/ThemePicker";
import { pickTextFile } from "@/src/lib/files";
import { MEAL_COUNTS, mealSlots } from "@/src/features/nutrition/meals";
import {
  answersFrom,
  bodyFatPresets,
  deadlineAnswers,
  goalDateFrom,
  planInputFrom,
  stepError,
  stepsFor,
  type Answers,
  type OnboardingStep,
} from "@/src/features/profile/onboarding";
import {
  buildNutritionProfile,
  goalProgress,
  planEstimate,
  targetWeeklyRateKg,
  type NutritionProfile,
} from "@/src/features/profile/profile";
import { saveNutritionProfile } from "@/src/features/profile/profile.repository";
import { formatWeight, toKg, WEIGHT_UNIT_OPTIONS, weightValue, type WeightUnit } from "@/src/lib/units";
import { AppTheme, THEME } from "@/src/theme";

// Una pregunta corta por pantalla; la explicación va en una sola línea.
/** Evaluación a medias, guardada mientras la app se reinicia para mostrar un tema. */
export const DRAFT_KEY = "onboarding_draft";
const readDraft = (value: unknown): { answers: Answers; index: number } | null => {
  const raw = value as { answers?: Answers; index?: number } | null;
  return raw?.answers && typeof raw.answers.goal === "string" && typeof raw.index === "number"
    ? { answers: raw.answers, index: raw.index }
    : null;
};

const TITLES: Record<OnboardingStep, { title: string; help: string }> = {
  goal: { title: "¿Qué quieres lograr?", help: "Define hacia dónde se ajusta tu energía." },
  body: { title: "Sobre ti", help: "La base del cálculo." },
  style: {
    title: "Tu estilo",
    help: "Toca un tema y toda la app cambia para que lo veas. Te sugerimos uno según tu perfil; lo cambias cuando quieras en Más.",
  },
  composition: {
    title: "Grasa corporal",
    help: "Opcional. Elige lo que más se parezca o escribe tu medición.",
  },
  activity: { title: "Tu día a día", help: "Sin contar el entrenamiento." },
  training: { title: "Tu entrenamiento", help: "Una semana normal." },
  intake: { title: "Lo que comes hoy", help: "Opcional. Si lo sabes, es el mejor dato para empezar." },
  target: { title: "Tu meta", help: "A dónde quieres llegar y a qué ritmo." },
  deadline: {
    title: "¿Tienes una fecha?",
    help: "Opcional. Un viaje, una boda o una prueba: la app calcula si llegas a tiempo.",
  },
  protein: { title: "Proteína", help: "Más proteína ayuda a conservar músculo." },
  plan: { title: "Tipo de plan", help: "Cómo se reparten carbohidratos y grasas. Se puede cambiar después." },
  meals: { title: "Tus comidas", help: "Cuántas veces comes al día y cómo llamarlas." },
  restrictions: {
    title: "Alergias e intolerancias",
    help: "Opcional. Lo que marques no se te propondrá y se avisará si aparece.",
  },
  files: {
    title: "¿Ya tienes una dieta o una rutina?",
    help: "Opcional. Si la tienes en un archivo de Dophamine, cárgala ahora; si no, continúa.",
  },
  tracking: { title: "Seguimiento", help: "La app compara tu avance con la meta y recalcula." },
  summary: { title: "Tu plan", help: "Un punto de partida: se afina con tus registros." },
};

/**
 * Evaluación inicial por pasos. Sirve para crear el plan y para editarlo.
 * Guarda el perfil y, si aún no hay ningún pesaje, registra el peso indicado.
 */
export function Onboarding({
  profile,
  weightKg,
  onSaved,
  onCancel,
}: {
  profile: NutritionProfile | null;
  weightKg: number | null;
  onSaved: () => void;
  onCancel?: () => void;
}) {
  const [answers, setAnswers] = useState<Answers>(() => answersFrom(profile, weightKg));
  const [index, setIndex] = useState(0);
  const [error, setError] = useState("");
  const steps = stepsFor(answers.goal);
  // La meta con fecha vive aparte del perfil: se carga al abrir para poder editarla.
  // Si la app se reinició para mostrar un tema, se retoma la evaluación donde iba.
  useEffect(() => {
    Promise.all([getSetting(GOAL_DATE_KEY), getSetting(DRAFT_KEY)]).then(([saved, draft]) => {
      const goal = readGoalDate(saved);
      if (goal) setAnswers((current) => ({ ...current, ...deadlineAnswers(goal, current.unit) }));
      const resumed = readDraft(draft);
      if (resumed) {
        setAnswers(resumed.answers);
        setIndex(resumed.index);
        void setSetting(DRAFT_KEY, null);
      }
    });
  }, []);
  const step = steps[Math.min(index, steps.length - 1)];
  const set = <K extends keyof Answers>(key: K, value: Answers[K]) => {
    setError("");
    setAnswers((current) => ({ ...current, [key]: value }));
  };
  // Al cambiar de unidad se convierte lo ya escrito, para no guardar 170 lb como 170 kg.
  const changeUnit = (next: WeightUnit) => {
    const convert = (text: string) =>
      Number(text) > 0 ? weightValue(toKg(Number(text), answers.unit), next) : text;
    setAnswers((current) => ({
      ...current,
      unit: next,
      weight: convert(current.weight),
      goalWeight: convert(current.goalWeight),
      deadlineWeight: convert(current.deadlineWeight),
    }));
  };

  const next = () => {
    const problem = stepError(step, answers);
    if (problem) return setError(problem);
    setError("");
    setIndex(index + 1);
  };
  const back = () => {
    setError("");
    if (index === 0) onCancel?.();
    else setIndex(index - 1);
  };
  // Tras crear el primer plan: el tema que se eligió, para aplicarlo al salir del último paso.
  const [finished, setFinished] = useState<ThemeId | null>(null);
  const save = async () => {
    const input = planInputFrom(answers, profile);
    await saveNutritionProfile({ ...buildNutritionProfile(input), dietType: answers.dietType });
    // El tema se aplica al final: si cambia, la app se vuelve a dibujar con sus colores.
    const theme = answers.theme ?? suggestedTheme(answers.sex);
    await setSetting(THEME_KEY, theme);
    await setSetting(GOAL_DATE_KEY, goalDateFrom(answers));
    const health = await getHealth();
    if (answers.avoid.length || health.avoid.length) await saveHealth({ ...health, avoid: answers.avoid });
    if (weightKg === null)
      await saveDayBody({ weightKg: input.weightKg, bodyFatPct: input.bodyFatPct ?? null });
    // La primera vez, antes del Panel: recordatorios y Health Connect en un solo paso.
    if (!profile) return setFinished(theme);
    onSaved();
    if (theme !== THEME) switchTheme(theme);
  };

  if (finished)
    return (
      <FirstRunSetup
        mealsPerDay={answers.mealsPerDay}
        onDone={() => {
          onSaved();
          if (finished !== THEME) switchTheme(finished);
        }}
      />
    );

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={[AppTheme.content, { flexGrow: 1 }]}
        keyboardShouldPersistTaps="handled"
      >
        <StepDots total={steps.length} current={index} />
        <Text style={AppTheme.eyebrow}>
          {profile ? "Reevaluación" : "Evaluación inicial"}, paso {index + 1} de {steps.length}
        </Text>
        <Text style={AppTheme.title}>{TITLES[step].title}</Text>
        <Text style={AppTheme.hint}>{TITLES[step].help}</Text>

        {step === "goal" ? (
          <OptionList
            value={answers.goal}
            onChange={(goal) => set("goal", goal)}
            options={[
              {
                value: "lose",
                label: "Definición",
                detail: "Bajar grasa conservando músculo",
              },
              { value: "maintain", label: "Mantenimiento", detail: "Sostener tu peso", icon: "remove" },
              { value: "gain", label: "Volumen", detail: "Ganar masa muscular", icon: "trending-up" },
            ]}
          />
        ) : null}

        {step === "body" ? (
          <>
            <ChoiceControl
              value={answers.sex}
              onChange={(sex) => set("sex", sex)}
              options={[
                { value: "male", label: "Hombre" },
                { value: "female", label: "Mujer" },
              ]}
            />
            <View style={AppTheme.fieldRow}>
              <BigInput
                label="Edad"
                unit="años"
                value={answers.age}
                onChangeText={(age) => set("age", age)}
                keyboardType="number-pad"
              />
              <BigInput
                label="Altura"
                unit="cm"
                value={answers.height}
                onChangeText={(height) => set("height", height)}
                keyboardType="number-pad"
              />
            </View>
            <View style={AppTheme.fieldRow}>
              <BigInput
                label="Peso actual"
                unit={answers.unit}
                value={answers.weight}
                onChangeText={(weight) => set("weight", weight)}
              />
            </View>
            <ChoiceControl value={answers.unit} onChange={changeUnit} options={WEIGHT_UNIT_OPTIONS} />
          </>
        ) : null}

        {step === "composition" ? (
          <>
            <OptionList
              value={answers.bodyFat}
              onChange={(bodyFat) => set("bodyFat", bodyFat)}
              options={[
                ...bodyFatPresets(answers.sex).map((preset) => ({
                  value: preset.value,
                  label: `${preset.label} · ~${preset.value} %`,
                  detail: preset.detail,
                  icon: "body-outline" as const,
                })),
                {
                  value: "",
                  label: "No lo sé",
                  detail: "Se calcula sin este dato",
                  icon: "help-outline" as const,
                },
              ]}
            />
            <Input
              label="O escribe tu medición (%)"
              value={answers.bodyFat}
              onChangeText={(bodyFat) => set("bodyFat", bodyFat)}
              keyboardType="decimal-pad"
              placeholder="Opcional"
            />
          </>
        ) : null}

        {step === "activity" ? (
          <OptionList
            value={answers.activity}
            onChange={(activity) => set("activity", activity)}
            options={[
              {
                value: "low",
                label: "Sentado casi todo el día",
                detail: "Oficina o estudio, poco traslado",
              },
              {
                value: "light",
                label: "Algo de movimiento",
                detail: "Caminas a clases o al trabajo",
              },
              {
                value: "moderate",
                label: "De pie buena parte del día",
                detail: "Ventas, docencia, reparto a pie",
              },
              {
                value: "high",
                label: "Trabajo físico",
                detail: "Construcción, carga, campo",
              },
            ]}
          />
        ) : null}

        {step === "training" ? (
          <>
            <Text style={AppTheme.label}>Días por semana</Text>
            <Chips
              value={answers.trainingDays}
              onChange={(days) => set("trainingDays", days)}
              options={[0, 1, 2, 3, 4, 5, 6, 7].map((days) => ({ value: days, label: String(days) }))}
            />
            {answers.trainingDays > 0 ? (
              <>
                <Text style={AppTheme.label}>Minutos por sesión</Text>
                <Chips
                  value={answers.sessionMinutes}
                  onChange={(minutes) => set("sessionMinutes", minutes)}
                  options={[30, 45, 60, 75, 90, 120].map((minutes) => ({
                    value: minutes,
                    label: String(minutes),
                  }))}
                />
                <Text style={AppTheme.label}>Tipo</Text>
                <OptionList
                  value={answers.trainingType}
                  onChange={(type) => set("trainingType", type)}
                  options={[
                    {
                      value: "strength",
                      label: "Fuerza",
                      detail: "Pesas, calistenia",
                    },
                    {
                      value: "mixed",
                      label: "Mixto",
                      detail: "Pesas y cardio, deportes de equipo",
                    },
                    {
                      value: "cardio",
                      label: "Cardio",
                      detail: "Correr, bici, natación",
                    },
                  ]}
                />
                <Text style={AppTheme.label}>Experiencia entrenando fuerza</Text>
                <OptionList
                  value={answers.experience}
                  onChange={(experience) => set("experience", experience)}
                  options={[
                    {
                      value: "beginner",
                      label: "Menos de 1 año",
                      detail: "Progresas casi cada semana",
                    },
                    {
                      value: "intermediate",
                      label: "1 a 3 años",
                      detail: "Progresas mes a mes",
                    },
                    {
                      value: "advanced",
                      label: "Más de 3 años",
                      detail: "Cada mejora cuesta",
                    },
                  ]}
                />
              </>
            ) : null}
          </>
        ) : null}

        {step === "intake" ? (
          <>
            <View style={AppTheme.fieldRow}>
              <BigInput
                label="Calorías al día"
                unit="kcal, en promedio"
                value={answers.knownIntake}
                onChangeText={(knownIntake) => set("knownIntake", knownIntake)}
                keyboardType="number-pad"
              />
            </View>
            {answers.knownIntake.trim() ? (
              <>
                <Text style={AppTheme.label}>Con eso, tu peso en el último mes…</Text>
                <OptionList
                  value={answers.recentTrend}
                  onChange={(trend) => set("recentTrend", trend)}
                  options={[
                    { value: "stable", label: "Se mantuvo", detail: "Cambió menos de 1 kg", icon: "remove" },
                    { value: "gaining", label: "Subió", detail: "Más de 1 kg", icon: "trending-up" },
                    { value: "losing", label: "Bajó", detail: "Más de 1 kg", icon: "trending-down" },
                  ]}
                />
              </>
            ) : (
              <Text style={AppTheme.hint}>Si no llevas la cuenta, déjalo vacío y continúa.</Text>
            )}
          </>
        ) : null}

        {step === "target" ? (
          <>
            <View style={AppTheme.fieldRow}>
              <BigInput
                label="Peso meta"
                unit={answers.unit}
                value={answers.goalWeight}
                onChangeText={(goalWeight) => set("goalWeight", goalWeight)}
              />
            </View>
            <OptionList
              value={answers.pace}
              onChange={(pace) => set("pace", pace)}
              options={(["gentle", "moderate", "fast"] as const).map((pace) => {
                const rate = targetWeeklyRateKg(
                  { goal: answers.goal, pace, experience: answers.experience },
                  toKg(Number(answers.weight), answers.unit),
                );
                return {
                  value: pace,
                  label: { gentle: "Suave", moderate: "Moderado", fast: "Rápido" }[pace],
                  detail: `${formatWeight(Math.abs(rate ?? 0), answers.unit, 2)} por semana`,
                  icon: (
                    {
                      gentle: "speedometer-outline",
                      moderate: "speedometer-outline",
                      fast: "flash-outline",
                    } as const
                  )[pace],
                };
              })}
            />
          </>
        ) : null}

        {step === "deadline" ? (
          <>
            <OptionList
              value={answers.hasDeadline ? "yes" : "no"}
              onChange={(choice) => set("hasDeadline", choice === "yes")}
              options={[
                {
                  value: "no",
                  label: "Sin fecha",
                  detail: "Llegar a mi ritmo",
                  icon: "infinite-outline",
                },
                {
                  value: "yes",
                  label: "Sí, tengo una fecha",
                  detail: "Ver si llego y cuánto ajustar",
                  icon: "calendar-outline",
                },
              ]}
            />
            {answers.hasDeadline ? (
              <>
                <Input
                  label="Qué es (opcional)"
                  value={answers.deadlineLabel}
                  onChangeText={(deadlineLabel) => set("deadlineLabel", deadlineLabel)}
                  placeholder="Viaje a la playa"
                />
                <Input
                  label="Fecha (AAAA-MM-DD)"
                  value={answers.deadlineDate}
                  onChangeText={(deadlineDate) => set("deadlineDate", deadlineDate)}
                  keyboardType="numbers-and-punctuation"
                />
                <View style={AppTheme.fieldRow}>
                  <BigInput
                    label="Peso para esa fecha"
                    unit={answers.unit}
                    value={answers.deadlineWeight}
                    placeholder={answers.goalWeight || "0"}
                    onChangeText={(deadlineWeight) => set("deadlineWeight", deadlineWeight)}
                  />
                </View>
              </>
            ) : null}
          </>
        ) : null}

        {step === "protein" ? (
          <OptionList
            value={answers.proteinLevel}
            onChange={(proteinLevel) => set("proteinLevel", proteinLevel)}
            options={[
              { value: "moderate", label: "Moderada", detail: "1.6 g por kg", icon: "egg-outline" },
              {
                value: "high",
                label: "Alta",
                detail: "2.0 g por kg · si entrenas fuerza",
              },
              {
                value: "very_high",
                label: "Muy alta",
                detail: "2.4 g por kg · déficits marcados",
              },
            ]}
          />
        ) : null}

        {step === "style" ? (
          <ThemePicker
            value={answers.theme ?? suggestedTheme(answers.sex)}
            onChange={async (theme) => {
              set("theme", theme);
              if (theme === THEME) return;
              // Toda la app se vuelve a dibujar con el tema: se guarda la evaluación y se retoma.
              await setSetting(DRAFT_KEY, { answers: { ...answers, theme }, index });
              await setSetting(THEME_KEY, theme);
              switchTheme(theme, profile ? "/strategy" : "/");
            }}
          />
        ) : null}

        {step === "plan" ? (
          <OptionList
            value={answers.dietType}
            onChange={(dietType) => set("dietType", dietType)}
            options={DIET_TYPES.map((item) => ({
              value: item.value,
              label: item.label,
              detail: item.detail,
            }))}
          />
        ) : null}

        {step === "restrictions" ? (
          <RestrictionsStep
            value={answers.avoid}
            onChange={(avoid) => set("avoid", avoid)}
            editing={Boolean(profile)}
          />
        ) : null}

        {step === "files" ? <FilesStep /> : null}

        {step === "meals" ? (
          <>
            <OptionList
              value={answers.mealStyle}
              onChange={(mealStyle) => set("mealStyle", mealStyle)}
              options={[
                {
                  value: "numbered",
                  label: "Por número",
                  detail: "Comida 1, comida 2… sirve para cualquier cantidad",
                },
                {
                  value: "named",
                  label: "Por nombre",
                  detail: "Desayuno, almuerzo, cena…",
                },
              ]}
            />
            <Text style={AppTheme.label}>Comidas al día</Text>
            <Chips
              value={answers.mealsPerDay}
              onChange={(mealsPerDay) => set("mealsPerDay", mealsPerDay)}
              options={MEAL_COUNTS.map((count) => ({ value: count, label: String(count) }))}
            />
            <Text style={AppTheme.hint}>
              {mealSlots({ style: answers.mealStyle, count: answers.mealsPerDay })
                .map((slot) => slot.label)
                .join(" · ")}
            </Text>
          </>
        ) : null}

        {step === "tracking" ? (
          <>
            <Text style={AppTheme.label}>Revisar el avance</Text>
            <ChoiceControl
              value={String(answers.checkInDays) as "3" | "7"}
              onChange={(days) => set("checkInDays", days === "3" ? 3 : 7)}
              options={[
                { value: "3", label: "Cada 3 días" },
                { value: "7", label: "Cada 7 días" },
              ]}
            />
            <Text style={AppTheme.label}>Quién decide los ajustes</Text>
            <OptionList
              value={answers.adjustMode}
              onChange={(adjustMode) => set("adjustMode", adjustMode)}
              options={[
                {
                  value: "auto",
                  label: "Automático",
                  detail: "La app ajusta, avisa y puedes deshacer",
                },
                {
                  value: "collaborative",
                  label: "Colaborativo",
                  detail: "La app propone, tú decides",
                },
                {
                  value: "manual",
                  label: "Manual",
                  detail: "La app solo informa",
                },
              ]}
            />
          </>
        ) : null}

        {step === "summary" ? <PlanSummary answers={answers} existing={profile} /> : null}

        <TermTip step={step} />
        {error ? <Text style={AppTheme.errorText}>{error}</Text> : null}
        <View style={AppTheme.wizardFooter}>
          {index > 0 || onCancel ? (
            <View style={AppTheme.wizardFooterButton}>
              <Button title={index === 0 ? "Cancelar" : "Atrás"} variant="secondary" onPress={back} />
            </View>
          ) : null}
          <View style={AppTheme.wizardFooterButton}>
            {step === "summary" ? (
              <Button title={profile ? "Guardar plan" : "Crear mi plan"} onPress={save} />
            ) : (
              <Button title="Continuar" onPress={next} />
            )}
          </View>
        </View>
      </ScrollView>
    </Screen>
  );
}

function Legend({ color, label, value }: { color: string; label: string; value: string }) {
  return (
    <View style={AppTheme.legendRow}>
      <View style={[AppTheme.legendDot, { backgroundColor: color }]} />
      <Text style={AppTheme.legendLabel}>{label}</Text>
      <Text style={AppTheme.legendValue}>{value}</Text>
    </View>
  );
}

// El resultado: de dónde sale el gasto, cuánto se ajusta por el objetivo y cómo se reparte en macros.
function PlanSummary({ answers, existing }: { answers: Answers; existing: NutritionProfile | null }) {
  const input = planInputFrom(answers, existing);
  const profile = buildNutritionProfile(input);
  const estimate = planEstimate(input);
  const currentKg = input.weightKg;
  const progress = goalProgress({ ...profile, startWeightKg: currentKg }, currentKg);
  const rate = targetWeeklyRateKg(profile, currentKg);
  const { colors } = AppTheme;
  const offset = estimate ? profile.calorieTarget - estimate.tdee : 0;
  return (
    <>
      <Card title="Objetivo diario">
        <Text style={AppTheme.ringNumber}>{profile.calorieTarget} kcal</Text>
        <StackBar
          segments={[
            { value: profile.proteinTarget * 4, color: colors.protein },
            { value: profile.carbsTarget * 4, color: colors.carbs },
            { value: profile.fatsTarget * 9, color: colors.fats },
          ]}
        />
        <Legend color={colors.protein} label="Proteína" value={`${profile.proteinTarget} g`} />
        <Legend color={colors.carbs} label="Carbohidratos" value={`${profile.carbsTarget} g`} />
        <Legend color={colors.fats} label="Grasas" value={`${profile.fatsTarget} g`} />
      </Card>
      {estimate ? (
        <Card title={`Gasto estimado · ${estimate.tdee} kcal`}>
          <StackBar
            segments={[
              { value: estimate.bmr, color: colors.violet },
              { value: estimate.dailyActivity, color: colors.blue },
              { value: estimate.training, color: colors.accent },
              { value: Math.max(0, estimate.calibration), color: colors.amber },
            ]}
          />
          <Legend color={colors.violet} label="Metabolismo basal" value={`${estimate.bmr}`} />
          <Legend color={colors.blue} label="Día a día" value={`${estimate.dailyActivity}`} />
          <Legend color={colors.accent} label="Entrenamiento" value={`${estimate.training}`} />
          <Legend
            color={colors.amber}
            label={estimate.usedKnownIntake ? "Ajuste por lo que comes hoy" : "Ajuste por edad y actividad"}
            value={`${estimate.calibration > 0 ? "+" : ""}${estimate.calibration}`}
          />
          <Legend
            color={colors.muted}
            label={offset > 0 ? "Superávit para tu meta" : offset < 0 ? "Déficit para tu meta" : "Sin ajuste"}
            value={`${offset > 0 ? "+" : ""}${offset}`}
          />
        </Card>
      ) : null}
      {rate ? (
        <Card title="Ritmo">
          <Legend
            color={colors.accent}
            label={progress?.weeksLeft ? `Unas ${progress.weeksLeft} semanas hasta tu meta` : "Por semana"}
            value={`${rate > 0 ? "+" : "−"}${formatWeight(Math.abs(rate), answers.unit, 2)}`}
          />
        </Card>
      ) : null}
      <Text style={AppTheme.hint}>
        Es una estimación, no un consejo médico. Con dos semanas de registros la app la reemplaza por tu gasto
        real.
      </Text>
    </>
  );
}

/** Alergias e intolerancias: una lista para marcar varias. */
function RestrictionsStep({
  value,
  onChange,
  editing,
}: {
  value: Allergen[];
  onChange: (value: Allergen[]) => void;
  editing: boolean;
}) {
  // Al editar el plan se parte de lo que ya estaba marcado en Salud y restricciones.
  useEffect(() => {
    if (editing && !value.length) getHealth().then((health) => health.avoid.length && onChange(health.avoid));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <View style={AppTheme.groupList}>
      {(Object.keys(ALLERGEN_LABELS) as Allergen[]).map((allergen, index) => {
        const active = value.includes(allergen);
        return (
          <Pressable
            key={allergen}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: active }}
            accessibilityLabel={`Evitar ${ALLERGEN_LABELS[allergen]}`}
            onPress={() =>
              onChange(active ? value.filter((item) => item !== allergen) : [...value, allergen])
            }
            style={[AppTheme.groupRow, index > 0 && AppTheme.groupRowDivider]}
          >
            <Text style={[AppTheme.optionTitle, { flex: 1 }, active && { color: AppTheme.colors.accent }]}>
              {ALLERGEN_LABELS[allergen]}
            </Text>
            <View style={[AppTheme.checkbox, active && AppTheme.checkboxActive]}>
              {active ? <Ionicons name="checkmark" size={14} color={AppTheme.colors.onAccent} /> : null}
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

/** Cargar una dieta o una rutina que ya se tiene en archivo. Se guardan al momento. */
function FilesStep() {
  const [diet, setDiet] = useState("");
  const [routine, setRoutine] = useState("");
  const openDiet = async () => {
    const text = await pickTextFile();
    if (!text) return;
    try {
      const json: unknown = JSON.parse(text);
      const plan = isDietFile(json) ? importDietFile(json, localDateKey()) : readDiet(json);
      if (!plan) return setDiet("Ese archivo no es una dieta de Dophamine.");
      await saveDiet(plan);
      setDiet(`Cargada: ${plan.name} (${plan.days.length} ${plan.days.length === 1 ? "día" : "días"}).`);
    } catch (error) {
      setDiet(error instanceof DietFormatError ? error.message : "Ese archivo no es una dieta de Dophamine.");
    }
  };
  const openRoutine = async () => {
    const text = await pickTextFile();
    if (!text) return;
    const result = parseProgram(text);
    if (!result.routine) return setRoutine(result.error);
    await saveRoutine(result.routine);
    setRoutine(
      `Cargada: ${result.routine.schedule.length} días de entreno, ${result.routine.schedule.reduce((sum, day) => sum + day.exercises.length, 0)} ejercicios.`,
    );
  };
  return (
    <View style={{ gap: 12 }}>
      <View style={AppTheme.groupList}>
        <Pressable accessibilityRole="button" onPress={openDiet} style={AppTheme.groupRow}>
          <View style={AppTheme.optionText}>
            <Text style={AppTheme.optionTitle}>Cargar mi dieta</Text>
            <Text style={AppTheme.optionDetail}>{diet || "Archivo dophamine-diet (.json)"}</Text>
          </View>
          <Text style={AppTheme.linkButtonText}>Abrir</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={openRoutine}
          style={[AppTheme.groupRow, AppTheme.groupRowDivider]}
        >
          <View style={AppTheme.optionText}>
            <Text style={AppTheme.optionTitle}>Cargar mi rutina</Text>
            <Text style={AppTheme.optionDetail}>{routine || "Archivo de rutina (.csv o .json)"}</Text>
          </View>
          <Text style={AppTheme.linkButtonText}>Abrir</Text>
        </Pressable>
      </View>
      <Text style={AppTheme.hint}>
        Las plantillas de los dos formatos se descargan desde la web de Dophamine. Si tu dieta o rutina está
        en un PDF o una foto, una IA puede pasarla a ese formato. También puedes cargarlas después, en Mi
        dieta y en Mi rutina.
      </Text>
    </View>
  );
}
