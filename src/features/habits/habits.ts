export type Habit = { id: string; label: string; shortLabel: string; color: string };

export const DEFAULT_HABITS: Habit[] = [
  { id: "nutrition", label: "Plan nutricional", shortLabel: "N", color: "#2C8C68" },
  { id: "protein", label: "Proteína objetivo", shortLabel: "P", color: "#D06B33" },
  { id: "training", label: "Movimiento", shortLabel: "M", color: "#4666C7" },
  { id: "sleep", label: "Rutina de sueño", shortLabel: "S", color: "#8B5CB8" },
  { id: "checkin", label: "Chequeo personal", shortLabel: "C", color: "#C25476" }
];

export const dateKey = (date = new Date()) => date.toISOString().slice(0, 10);
export const monthDays = (date = new Date()) => {
  const year = date.getFullYear(); const month = date.getMonth();
  return Array.from({ length: new Date(year, month + 1, 0).getDate() }, (_, index) => dateKey(new Date(year, month, index + 1)));
};
