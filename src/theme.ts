import { StyleSheet } from "react-native";

export const AppTheme = {
  colors: {
    background: "#F7F8F5", surface: "#FFFFFF", text: "#16231D", muted: "#66736B",
    border: "#DCE3DD", accent: "#167B5B", accentSoft: "#DCF3E8", warning: "#AE5A20"
  },
  ...StyleSheet.create({
    loading: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#F7F8F5" },
    screen: { flex: 1, backgroundColor: "#F7F8F5" },
    content: { padding: 20, paddingBottom: 36, gap: 16 },
    eyebrow: { color: "#167B5B", fontSize: 12, fontWeight: "700", letterSpacing: 0 },
    title: { color: "#16231D", fontSize: 28, fontWeight: "700", letterSpacing: 0 },
    card: { backgroundColor: "#FFFFFF", borderRadius: 8, borderWidth: 1, borderColor: "#DCE3DD", padding: 16, gap: 12 },
    cardTitle: { color: "#16231D", fontSize: 16, fontWeight: "700" },
    body: { color: "#33433A", fontSize: 15, lineHeight: 22 },
    hint: { color: "#66736B", fontSize: 13, lineHeight: 19 },
    metricGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
    metric: { width: "48%", backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#DCE3DD", borderRadius: 8, padding: 14, gap: 4 },
    metricLabel: { fontSize: 12, color: "#66736B" }, metricValue: { fontSize: 18, color: "#16231D", fontWeight: "700" },
    label: { color: "#33433A", fontSize: 13, fontWeight: "600" },
    input: { minHeight: 44, borderWidth: 1, borderColor: "#DCE3DD", borderRadius: 6, paddingHorizontal: 12, paddingVertical: 9, color: "#16231D", fontSize: 16, backgroundColor: "#FFFFFF" },
    inputGroup: { gap: 6 },
    button: { minHeight: 44, borderRadius: 6, alignItems: "center", justifyContent: "center", paddingHorizontal: 16, backgroundColor: "#167B5B" },
    buttonSecondary: { backgroundColor: "#DCF3E8" }, buttonText: { color: "#FFFFFF", fontSize: 15, fontWeight: "700" }, buttonTextSecondary: { color: "#12563F" },
    segmented: { flexDirection: "row", gap: 6 }, segment: { flex: 1, minHeight: 40, borderWidth: 1, borderColor: "#DCE3DD", borderRadius: 6, alignItems: "center", justifyContent: "center" },
    segmentActive: { backgroundColor: "#167B5B", borderColor: "#167B5B" }, segmentText: { color: "#66736B", fontWeight: "700" }, segmentTextActive: { color: "#FFFFFF" },
    listRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#DCE3DD", gap: 12 },
    listText: { flex: 1, gap: 2 }, listTitle: { color: "#16231D", fontWeight: "700", fontSize: 14 }, listDetail: { color: "#66736B", fontSize: 13 }, listValue: { color: "#167B5B", fontWeight: "700", fontSize: 15 },
    choiceWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 }, choice: { minHeight: 38, borderWidth: 1, borderColor: "#DCE3DD", borderRadius: 6, paddingHorizontal: 12, justifyContent: "center" }, choiceActive: { backgroundColor: "#DCF3E8", borderColor: "#167B5B" }, choiceText: { color: "#66736B", fontWeight: "600" }, choiceTextActive: { color: "#12563F" }
    ,chart: { height: 152, justifyContent: "flex-end", borderBottomWidth: 1, borderBottomColor: "#DCE3DD", paddingTop: 12 }, chartBars: { flex: 1, flexDirection: "row", gap: 4, alignItems: "flex-end" }, chartColumn: { flex: 1, height: "100%", justifyContent: "flex-end" }, chartBar: { backgroundColor: "#167B5B", borderRadius: 3, minHeight: 4 }, chartLabels: { flexDirection: "row", justifyContent: "space-between" },
    intakeBars: { gap: 9 }, intakeRow: { flexDirection: "row", alignItems: "center", gap: 8 }, intakeLabel: { width: 38, fontSize: 12, color: "#66736B" }, intakeTrack: { flex: 1, height: 10, backgroundColor: "#DCF3E8", overflow: "hidden", borderRadius: 5 }, intakeFill: { height: "100%", backgroundColor: "#167B5B", borderRadius: 5 }, intakeValue: { width: 42, textAlign: "right", fontSize: 12, color: "#33433A", fontWeight: "700" }
  })
};

