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
    buttonSecondary: { backgroundColor: "#DCF3E8" }, buttonText: { color: "#FFFFFF", fontSize: 15, fontWeight: "700" }, buttonTextSecondary: { color: "#12563F" }
  })
};

