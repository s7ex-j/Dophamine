import { requestWidgetUpdate } from "react-native-android-widget";

import { renderTodayWidget, WIDGET_NAME } from "@/src/features/widget/widgetTask";

/** Vuelve a dibujar el widget con los datos de hoy (si hay uno en la pantalla de inicio). */
export function refreshWidget() {
  requestWidgetUpdate({ widgetName: WIDGET_NAME, renderWidget: renderTodayWidget }).catch(() => undefined);
}
