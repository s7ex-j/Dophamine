/**
 * Lo que dice el widget de la pantalla de inicio: lo que queda del día y, debajo, agua y pasos.
 * Módulo puro; el dibujo está en `TodayWidget.tsx` y la lectura de datos en `widgetTask.tsx`.
 */
export type WidgetData = {
  target: number | null;
  eatenKcal: number;
  waterMl: number;
  steps: number | null;
};

export type WidgetSummary = { label: string; figure: string; unit: string; detail: string; over: boolean };

const thousands = (value: number) => Math.round(value).toLocaleString("es-PE");

export function widgetSummary(data: WidgetData): WidgetSummary {
  const water = data.waterMl > 0 ? `${(data.waterMl / 1000).toFixed(1)} L de agua` : "Sin agua anotada";
  const steps = data.steps ? ` · ${thousands(data.steps)} pasos` : "";
  if (!data.target)
    return {
      label: "Comiste hoy",
      figure: thousands(data.eatenKcal),
      unit: "kcal",
      detail: water + steps,
      over: false,
    };
  const remaining = data.target - data.eatenKcal;
  return {
    label: remaining >= 0 ? "Te quedan" : "Te pasaste por",
    figure: thousands(Math.abs(remaining)),
    unit: "kcal",
    detail: water + steps,
    over: remaining < 0,
  };
}
