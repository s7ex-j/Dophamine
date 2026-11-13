import { sleepMinutes, type SleepEntry } from "@/src/features/sleep/sleep";

/**
 * Chequeo breve de bienestar: tres preguntas de un toque (ánimo, energía y
 * estrés) y, si quieres, qué influyó. Dopi lo ofrece una vez al día en el
 * Panel, sin insistir: si dices "ahora no", no vuelve a preguntar hasta mañana.
 * Módulo puro.
 */
export type Question = {
  key: "mood" | "energy" | "stress";
  title: string;
  /** Cinco respuestas, de 1 a 5. */
  options: Array<{ emoji: string; label: string }>;
};

export const QUESTIONS: Question[] = [
  {
    key: "mood",
    title: "¿Cómo va tu día?",
    options: [
      { emoji: "😞", label: "Muy mal" },
      { emoji: "🙁", label: "Mal" },
      { emoji: "😐", label: "Normal" },
      { emoji: "🙂", label: "Bien" },
      { emoji: "😄", label: "Muy bien" },
    ],
  },
  {
    key: "energy",
    title: "¿Cuánta energía tienes?",
    options: [
      { emoji: "🪫", label: "Ninguna" },
      { emoji: "😮‍💨", label: "Poca" },
      { emoji: "🙂", label: "Normal" },
      { emoji: "💪", label: "Buena" },
      { emoji: "⚡", label: "Mucha" },
    ],
  },
  {
    key: "stress",
    title: "¿Y el estrés?",
    options: [
      { emoji: "😌", label: "Nada" },
      { emoji: "🙂", label: "Poco" },
      { emoji: "😐", label: "Algo" },
      { emoji: "😣", label: "Bastante" },
      { emoji: "🤯", label: "Mucho" },
    ],
  },
];

/** Lo que pudo influir. Se guarda como etiquetas al inicio de la nota ("#trabajo …"). */
export const INFLUENCES = [
  "sueño",
  "trabajo",
  "estudios",
  "comida",
  "entreno",
  "familia",
  "pareja",
  "amigos",
  "salud",
  "clima",
];

export const DISMISS_KEY = "checkin_dismissed";

/** Dopi pregunta si hoy no hay chequeo y no le dijiste "ahora no" hoy. */
export const shouldOfferCheckIn = (today: string, checkedToday: boolean, dismissedOn: unknown) =>
  !checkedToday && dismissedOn !== today;

/** Une las etiquetas elegidas y la nota escrita. */
export function composeNote(tags: string[], text: string): string {
  const prefix = tags.map((tag) => `#${tag}`).join(" ");
  return [prefix, text.trim()].filter(Boolean).join(" ");
}

/** Separa las etiquetas de una nota guardada. */
export function splitNote(note: string): { tags: string[]; text: string } {
  const tags: string[] = [];
  const words = note.trim().split(/\s+/);
  while (words.length && /^#[\wáéíóúñü]+$/i.test(words[0])) tags.push((words.shift() as string).slice(1));
  return { tags, text: words.join(" ") };
}

type Entry = { date: string; mood: number; energy: number | null; stress: number | null; note: string };

const average = (values: number[]) => values.reduce((sum, value) => sum + value, 0) / values.length;
const one = (value: number) => Math.round(value * 10) / 10;

/**
 * Patrones simples con tus propios datos: ánimo según cuánto dormiste, energía
 * los días que entrenas, y lo que más aparece en tus días malos. Cada patrón
 * necesita al menos 3 chequeos en cada lado para no sacar conclusiones de un día.
 */
export function wellbeingPatterns(entries: Entry[], sleep: SleepEntry[], workoutDates: string[]): string[] {
  const patterns: string[] = [];
  const minutesByDate = new Map(
    sleep.flatMap((night) => {
      const minutes = sleepMinutes(night.bedtime, night.wakeTime);
      return minutes === null ? [] : [[night.date, minutes] as const];
    }),
  );
  const rested = entries.filter((entry) => (minutesByDate.get(entry.date) ?? 0) >= 420);
  const tired = entries.filter((entry) => {
    const minutes = minutesByDate.get(entry.date);
    return minutes !== undefined && minutes < 420;
  });
  if (rested.length >= 3 && tired.length >= 3) {
    const diff = average(rested.map((entry) => entry.mood)) - average(tired.map((entry) => entry.mood));
    if (Math.abs(diff) >= 0.3)
      patterns.push(
        `Tu ánimo es ${one(Math.abs(diff))} puntos ${diff > 0 ? "más alto" : "más bajo"} los días que duermes 7 h o más.`,
      );
  }
  const trainedDays = new Set(workoutDates);
  const withEnergy = entries.filter((entry) => entry.energy !== null);
  const trained = withEnergy.filter((entry) => trainedDays.has(entry.date));
  const rest = withEnergy.filter((entry) => !trainedDays.has(entry.date));
  if (trained.length >= 3 && rest.length >= 3) {
    const diff =
      average(trained.map((entry) => entry.energy as number)) -
      average(rest.map((entry) => entry.energy as number));
    if (Math.abs(diff) >= 0.3)
      patterns.push(
        `Los días que entrenas tu energía es ${one(Math.abs(diff))} puntos ${diff > 0 ? "mayor" : "menor"}.`,
      );
  }
  const low = entries.filter((entry) => entry.mood <= 2);
  if (low.length >= 3) {
    const counts = new Map<string, number>();
    for (const entry of low)
      for (const tag of splitNote(entry.note).tags) counts.set(tag, (counts.get(tag) ?? 0) + 1);
    const top = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
    if (top && top[1] >= 2)
      patterns.push(`En tus días bajos aparece más «${top[0]}» (${top[1]} de ${low.length}).`);
  }
  return patterns;
}
