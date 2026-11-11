import type { DailyBiometrics } from "@/src/features/biometrics/biometrics.repository";

// Cálculos del tablero "Hoy" que no dependen de la interfaz. Se prueban solos.

export type WeekDay = { key: string; day: string; record: DailyBiometrics | undefined };

/** Los últimos siete días (hoy al final), cada uno con su registro si existe. */
export function buildWeek(recentRecords: DailyBiometrics[], today = new Date()): WeekDay[] {
  const recentByDate = new Map(recentRecords.map((record) => [record.date, record]));
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(today);
    date.setDate(date.getDate() - (6 - index));
    const key = date.toISOString().slice(0, 10);
    return {
      key,
      day: date.toLocaleDateString("es-PE", { weekday: "narrow" }).toUpperCase(),
      record: recentByDate.get(key),
    };
  });
}

export type NextStep = {
  title: string;
  detail: string;
  action: string;
  route: "/biometrics" | "/habits" | "/training";
};

/** Qué conviene hacer ahora: registrar el día, completar hábitos o entrenar. */
export function nextStepFor(hasIntake: boolean, todayScore: number, totalHabits: number): NextStep {
  if (!hasIntake)
    return {
      title: "Registra tu día",
      detail: "Añade peso, energía y macros para activar tus señales.",
      action: "Abrir registro",
      route: "/biometrics",
    };
  if (todayScore < totalHabits)
    return {
      title: "Completa tu consistencia",
      detail: `Llevas ${todayScore} de ${totalHabits} compromisos diarios.`,
      action: "Ver hábitos",
      route: "/habits",
    };
  return {
    title: "Día bien encaminado",
    detail: "Tus hábitos de hoy están completos. Revisa tu sesión si entrenas.",
    action: "Abrir entreno",
    route: "/training",
  };
}

/** La frase bajo la energía disponible. */
export function heroMessageFor(caloriesIn: number | null, calorieTarget: number): string {
  if (!caloriesIn) return "Aún no has registrado tu balance.";
  if (caloriesIn > calorieTarget) return "Hoy superaste la energía objetivo.";
  return `${Math.max(0, calorieTarget - caloriesIn)} kcal para cerrar tu objetivo.`;
}
