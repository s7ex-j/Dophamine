import { FlexWidget, TextWidget } from "react-native-android-widget";

import type { WidgetSummary } from "@/src/features/widget/widget";

// El widget de la pantalla de inicio (Android). Colores fijos de Bosque: el widget vive fuera de la
// app y no cambia con el tema.
const BG = "#161C19";
const TEXT = "#F1F5F2";
const MUTED = "#9AA59E";
const ACCENT = "#34D399";
const CORAL = "#F87171";

export function TodayWidget({ summary }: { summary: WidgetSummary }) {
  return (
    <FlexWidget
      clickAction="OPEN_APP"
      accessibilityLabel={`${summary.label} ${summary.figure} ${summary.unit}. ${summary.detail}`}
      style={{
        height: "match_parent",
        width: "match_parent",
        backgroundColor: BG,
        borderRadius: 22,
        padding: 16,
        flexDirection: "column",
        justifyContent: "space-between",
      }}
    >
      <FlexWidget style={{ flexDirection: "row", justifyContent: "space-between", width: "match_parent" }}>
        <TextWidget text={summary.label} style={{ fontSize: 13, color: MUTED }} />
        <TextWidget text="Dophamine" style={{ fontSize: 12, color: ACCENT, fontWeight: "600" }} />
      </FlexWidget>
      <FlexWidget style={{ flexDirection: "row", alignItems: "flex-end" }}>
        <TextWidget
          text={summary.figure}
          style={{ fontSize: 40, color: summary.over ? CORAL : TEXT, fontWeight: "700" }}
        />
        <TextWidget text={` ${summary.unit}`} style={{ fontSize: 15, color: MUTED, marginBottom: 6 }} />
      </FlexWidget>
      <TextWidget text={summary.detail} style={{ fontSize: 12, color: MUTED }} maxLines={1} truncate="END" />
    </FlexWidget>
  );
}
