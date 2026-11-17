import Svg, { Circle } from "react-native-svg";
import { Text, View } from "react-native";

import { Button, Card, LinkButton, ListRow } from "@/src/components/ui";
import type { DashboardSnapshot } from "@/src/features/dashboard/dashboard.repository";
import { adjustModeLabels, adjustModeOf, checkInDaysOf } from "@/src/features/profile/profile";
import { describeReview, nextReviewDate, type WeeklyReview } from "@/src/features/reviews/reviews";
import type { CheckInControls } from "@/src/features/reviews/useCheckIn";
import { dayLabel, localDateKey } from "@/src/lib/dates";
import { AppTheme } from "@/src/theme";

// Secciones de la revisión periódica (cada 3 o 7 días). Se usan en Panel y en Estrategia.

/** Aviso de un ajuste que la app aplicó sola, con la opción de deshacerlo. */
export function AutoAdjustBanner({
  snapshot,
  controls,
}: {
  snapshot: DashboardSnapshot;
  controls: CheckInControls;
}) {
  const last = snapshot.lastReview;
  if (!controls.undoable || !last) return null;
  const delta = last.suggestedCalories - last.previousCalories;
  return (
    <View style={AppTheme.banner}>
      <Text style={AppTheme.bannerTitle}>
        Ajuste automático: {last.previousCalories} → {last.suggestedCalories} kcal
      </Text>
      <Text style={AppTheme.bannerText}>
        {dayLabel(last.date)} tu objetivo {delta > 0 ? "subió" : "bajó"} {Math.abs(delta)} kcal porque tu
        tendencia de peso se apartó de la meta. Puedes deshacerlo hasta la próxima revisión.
      </Text>
      <View style={AppTheme.rowActions}>
        <LinkButton title="Deshacer ajuste" onPress={controls.undo} />
      </View>
    </View>
  );
}

export function CheckInCard({
  snapshot,
  controls,
}: {
  snapshot: DashboardSnapshot;
  controls: CheckInControls;
}) {
  const { checkIn, profile } = snapshot;
  if (!checkIn || !profile) return null;
  const days = checkInDaysOf(profile);
  const mode = adjustModeOf(profile);
  const next = nextReviewDate(snapshot.lastReview, days);
  const today = localDateKey();
  const left = next && next > today ? daysBetween(today, next) : 0;
  const status =
    checkIn.status === "updating"
      ? "Con datos suficientes"
      : checkIn.status === "holding"
        ? "En pausa"
        : "Reuniendo datos";
  return (
    <View style={[AppTheme.card, { gap: 12 }]}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
        <ReviewRing days={days} left={left} />
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={AppTheme.cardTitle}>Revisión cada {days} días</Text>
          <Text style={AppTheme.hint}>
            {left ? `Próxima: ${dayLabel(next as string).toLowerCase()}` : "Toca hoy"} · modo{" "}
            {adjustModeLabels[mode].toLowerCase()}
          </Text>
          <Text style={AppTheme.hint}>
            {status} · {snapshot.analysis.nutritionDaysLast7}/7 comidas · {snapshot.analysis.weightDaysLast7}
            /7 pesajes
          </Text>
        </View>
      </View>
      <Text style={AppTheme.body}>{checkIn.message}</Text>
      {controls.action === "propose" ? (
        <>
          <Button title={`Aplicar ${checkIn.suggestedCalories} kcal`} onPress={controls.apply} />
          <Button title="Mantener mi objetivo actual" variant="secondary" onPress={controls.dismiss} />
        </>
      ) : null}
      {controls.action === "inform" ? (
        <Text style={AppTheme.hint}>
          Estás en modo manual: la app no cambia tu objetivo. Si quieres aplicar esta sugerencia, reevalúa tu
          plan o cambia de modo.
        </Text>
      ) : null}
    </View>
  );
}

const daysBetween = (from: string, to: string) =>
  Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000);

/** Un anillo que se va llenando hasta la próxima revisión; en el centro, los días que faltan. */
function ReviewRing({ days, left }: { days: number; left: number }) {
  const size = 68;
  const stroke = 6;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const done = days ? (days - left) / days : 1;
  return (
    <View
      accessibilityLabel={left ? `Faltan ${left} días para la revisión` : "La revisión toca hoy"}
      style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}
    >
      <Svg width={size} height={size} style={{ position: "absolute" }}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={AppTheme.colors.border}
          strokeWidth={stroke}
          fill="none"
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={AppTheme.colors.accent}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${circumference * done} ${circumference}`}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <Text style={[AppTheme.tileValue, { fontSize: 22, lineHeight: 26 }]}>{left || "Hoy"}</Text>
      {left ? (
        <Text style={[AppTheme.hint, { fontSize: 10, lineHeight: 12 }]}>{left === 1 ? "día" : "días"}</Text>
      ) : null}
    </View>
  );
}

export function ReviewHistoryCard({ reviews }: { reviews: WeeklyReview[] }) {
  return (
    <Card title="Historial de revisiones">
      {reviews.length ? (
        reviews.map((review) => {
          const { title, detail, value } = describeReview(review);
          return <ListRow key={review.id} title={title} detail={detail} value={value} />;
        })
      ) : (
        <Text style={AppTheme.body}>
          Aquí quedará cada ajuste que la app aplique, proponga o que decidas no aplicar.
        </Text>
      )}
    </Card>
  );
}
