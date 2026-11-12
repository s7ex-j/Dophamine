import { useState } from "react";
import { ScrollView, Text, View } from "react-native";

import {
  Button,
  Card,
  ChoiceControl,
  Input,
  ListRow,
  OptionList,
  ProgressBar,
  Screen,
} from "@/src/components/ui";
import { saveDailyBiometrics } from "@/src/features/biometrics/biometrics.repository";
import {
  answersFrom,
  planInputFrom,
  stepError,
  stepsFor,
  type Answers,
  type OnboardingStep,
} from "@/src/features/profile/onboarding";
import {
  buildNutritionProfile,
  goalProgress,
  targetWeeklyRateKg,
  type NutritionProfile,
} from "@/src/features/profile/profile";
import { saveNutritionProfile } from "@/src/features/profile/profile.repository";
import { formatWeight, toKg, WEIGHT_UNIT_OPTIONS, weightValue, type WeightUnit } from "@/src/lib/units";
import { AppTheme } from "@/src/theme";

const TITLES: Record<OnboardingStep, { title: string; help: string }> = {
  goal: { title: "¿Qué quieres lograr?", help: "Define hacia dónde se ajusta tu energía diaria." },
  body: { title: "Sobre ti", help: "Con esto se estima tu gasto energético inicial." },
  composition: {
    title: "Composición corporal",
    help: "Opcional. Si conoces tu % de grasa (balanza de bioimpedancia, plicómetro o estimación visual), el cálculo parte de tu masa magra y es más preciso.",
  },
  activity: {
    title: "Tu día a día",
    help: "Cuenta trabajo, traslados y entrenamiento de una semana normal.",
  },
  target: { title: "Tu meta", help: "A dónde quieres llegar y a qué ritmo." },
  protein: {
    title: "Proteína",
    help: "Más proteína ayuda a conservar masa muscular, sobre todo en definición.",
  },
  tracking: {
    title: "Seguimiento",
    help: "Cada cierto tiempo la app compara tu tendencia de peso con tu meta y recalcula tu gasto.",
  },
  summary: { title: "Tu plan", help: "Es un punto de partida: se afina con tus registros." },
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
    }));
  };

  const preview = step === "summary" ? buildNutritionProfile(planInputFrom(answers, profile)) : null;
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
  const save = async () => {
    const input = planInputFrom(answers, profile);
    await saveNutritionProfile(buildNutritionProfile(input));
    if (weightKg === null)
      await saveDailyBiometrics({
        weightKg: input.weightKg,
        caloriesIn: 0,
        proteinG: 0,
        carbsG: 0,
        fatsG: 0,
        bodyFatPct: input.bodyFatPct ?? null,
      });
    onSaved();
  };

  return (
    <Screen>
      <ScrollView contentContainerStyle={AppTheme.content} keyboardShouldPersistTaps="handled">
        <Text style={AppTheme.eyebrow}>
          {profile ? "EDITAR PLAN" : "EVALUACIÓN INICIAL"} · PASO {index + 1} DE {steps.length}
        </Text>
        <ProgressBar value={((index + 1) / steps.length) * 100} color={AppTheme.colors.accent} />
        <Text style={AppTheme.title}>{TITLES[step].title}</Text>
        <Text style={AppTheme.body}>{TITLES[step].help}</Text>

        {step === "goal" ? (
          <OptionList
            value={answers.goal}
            onChange={(goal) => set("goal", goal)}
            options={[
              { value: "lose", label: "Definición", detail: "Bajar grasa conservando músculo." },
              { value: "maintain", label: "Mantenimiento", detail: "Sostener tu peso y mejorar hábitos." },
              { value: "gain", label: "Volumen", detail: "Ganar masa muscular con un superávit controlado." },
            ]}
          />
        ) : null}

        {step === "body" ? (
          <Card title="Datos de referencia">
            <Text style={AppTheme.label}>Sexo biológico</Text>
            <ChoiceControl
              value={answers.sex}
              onChange={(sex) => set("sex", sex)}
              options={[
                { value: "male", label: "Hombre" },
                { value: "female", label: "Mujer" },
              ]}
            />
            <Input
              label="Edad"
              value={answers.age}
              onChangeText={(age) => set("age", age)}
              keyboardType="number-pad"
            />
            <Input
              label="Altura (cm)"
              value={answers.height}
              onChangeText={(height) => set("height", height)}
              keyboardType="number-pad"
            />
            <Text style={AppTheme.label}>Unidad de peso</Text>
            <ChoiceControl value={answers.unit} onChange={changeUnit} options={WEIGHT_UNIT_OPTIONS} />
            <Input
              label={`Peso actual (${answers.unit})`}
              value={answers.weight}
              onChangeText={(weight) => set("weight", weight)}
              keyboardType="decimal-pad"
            />
          </Card>
        ) : null}

        {step === "composition" ? (
          <Card title="Si lo conoces">
            <Input
              label="% de grasa corporal"
              value={answers.bodyFat}
              onChangeText={(bodyFat) => set("bodyFat", bodyFat)}
              keyboardType="decimal-pad"
              placeholder="Opcional"
            />
            <Text style={AppTheme.hint}>
              Después podrás registrar grasa, masa muscular, agua y masa ósea cada día en el Diario.
            </Text>
          </Card>
        ) : null}

        {step === "activity" ? (
          <OptionList
            value={answers.activity}
            onChange={(activity) => set("activity", activity)}
            options={[
              { value: "low", label: "Baja", detail: "Trabajo sentado y poco o ningún ejercicio." },
              { value: "light", label: "Ligera", detail: "Algo de caminata o 1–2 entrenos por semana." },
              { value: "moderate", label: "Moderada", detail: "3–5 entrenos por semana o trabajo de pie." },
              { value: "high", label: "Alta", detail: "Entreno casi diario o trabajo físico." },
            ]}
          />
        ) : null}

        {step === "target" ? (
          <>
            <Card title="Peso meta">
              <Input
                label={`Peso meta (${answers.unit})`}
                value={answers.goalWeight}
                onChangeText={(goalWeight) => set("goalWeight", goalWeight)}
                keyboardType="decimal-pad"
              />
            </Card>
            <OptionList
              value={answers.pace}
              onChange={(pace) => set("pace", pace)}
              options={(["gentle", "moderate", "fast"] as const).map((pace) => {
                const rate = targetWeeklyRateKg(
                  { goal: answers.goal, pace },
                  toKg(Number(answers.weight), answers.unit),
                );
                const perWeek = formatWeight(Math.abs(rate ?? 0), answers.unit, 2);
                return {
                  value: pace,
                  label: { gentle: "Suave", moderate: "Moderado", fast: "Rápido" }[pace],
                  detail: `Unos ${perWeek} por semana. ${
                    {
                      gentle: "Más fácil de sostener.",
                      moderate: "El equilibrio habitual.",
                      fast: "Exige más constancia.",
                    }[pace]
                  }`,
                };
              })}
            />
          </>
        ) : null}

        {step === "protein" ? (
          <OptionList
            value={answers.proteinLevel}
            onChange={(proteinLevel) => set("proteinLevel", proteinLevel)}
            options={[
              { value: "moderate", label: "Moderada", detail: "1.6 g por kg de peso." },
              { value: "high", label: "Alta", detail: "2.0 g por kg. Recomendada si entrenas fuerza." },
              { value: "very_high", label: "Muy alta", detail: "2.4 g por kg. Para déficits marcados." },
            ]}
          />
        ) : null}

        {step === "tracking" ? (
          <>
            <Text style={AppTheme.label}>¿Cada cuánto revisar tu avance?</Text>
            <OptionList
              value={String(answers.checkInDays) as "3" | "7"}
              onChange={(days) => set("checkInDays", days === "3" ? 3 : 7)}
              options={[
                {
                  value: "3",
                  label: "Cada 3 días",
                  detail: "Ajustes pequeños y frecuentes (hasta 50 kcal).",
                },
                { value: "7", label: "Cada 7 días", detail: "Ajustes semanales (hasta 100 kcal)." },
              ]}
            />
            <Text style={AppTheme.label}>¿Quién decide los ajustes?</Text>
            <OptionList
              value={answers.adjustMode}
              onChange={(adjustMode) => set("adjustMode", adjustMode)}
              options={[
                {
                  value: "auto",
                  label: "Automático",
                  detail:
                    "Si tu avance se aparta de la meta, la app ajusta tus calorías, te avisa y puedes deshacerlo.",
                },
                {
                  value: "collaborative",
                  label: "Colaborativo",
                  detail: "La app propone el ajuste y tú lo aceptas o lo descartas.",
                },
                { value: "manual", label: "Manual", detail: "La app solo informa; tú cambias el plan." },
              ]}
            />
          </>
        ) : null}

        {preview ? <PlanPreview profile={preview} answers={answers} /> : null}

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

function PlanPreview({ profile, answers }: { profile: NutritionProfile; answers: Answers }) {
  const currentKg = toKg(Number(answers.weight), answers.unit);
  const progress = goalProgress({ ...profile, startWeightKg: currentKg }, currentKg);
  const rate = targetWeeklyRateKg(profile, currentKg);
  return (
    <Card title="Objetivo diario inicial">
      <Text style={AppTheme.energyNumber}>{profile.calorieTarget} kcal</Text>
      <ListRow title="Proteína" detail="Prioridad del día" value={`${profile.proteinTarget} g`} />
      <ListRow title="Carbohidratos" detail="Energía para entrenar" value={`${profile.carbsTarget} g`} />
      <ListRow title="Grasas" detail="Mínimo saludable" value={`${profile.fatsTarget} g`} />
      {rate ? (
        <ListRow
          title="Ritmo buscado"
          detail={progress?.weeksLeft ? `Unas ${progress.weeksLeft} semanas hasta tu meta` : "Por semana"}
          value={`${rate > 0 ? "+" : "−"}${formatWeight(Math.abs(rate), answers.unit, 2)}`}
        />
      ) : null}
      <Text style={AppTheme.hint}>
        Es una estimación a partir de fórmulas de población, no un consejo médico. Tu gasto real se calcula
        con tus registros de peso e ingesta a partir de las dos semanas.
      </Text>
    </Card>
  );
}
