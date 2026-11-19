import type { WidgetTaskHandler } from "react-native-android-widget";

import { getBiometricsByDate } from "@/src/features/biometrics/biometrics.repository";
import { getNutritionProfile } from "@/src/features/profile/profile.repository";
import { TodayWidget } from "@/src/features/widget/TodayWidget";
import { widgetSummary } from "@/src/features/widget/widget";
import { localDateKey } from "@/src/lib/dates";

export const WIDGET_NAME = "Today";

/** Lee el día de hoy de la base del teléfono y arma el widget. */
export async function renderTodayWidget() {
  const [day, profile] = await Promise.all([getBiometricsByDate(localDateKey()), getNutritionProfile()]);
  const summary = widgetSummary({
    target: profile?.calorieTarget ?? null,
    eatenKcal: day?.caloriesIn ?? 0,
    waterMl: day?.waterMl ?? 0,
    steps: day?.steps ?? null,
  });
  return <TodayWidget summary={summary} />;
}

/** Android pide el widget al agregarlo, al cambiarle el tamaño y cada media hora. */
export const widgetTaskHandler: WidgetTaskHandler = async (props) => {
  if (props.widgetAction === "WIDGET_DELETED" || props.widgetAction === "WIDGET_CLICK") return;
  try {
    props.renderWidget(await renderTodayWidget());
  } catch {
    // Sin base de datos todavía (la app nunca se abrió): el widget queda como estaba.
  }
};
