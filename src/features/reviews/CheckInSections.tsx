import { Text, View } from "react-native";

import { Button, Card, LinkButton, ListRow } from "@/src/components/ui";
import type { DashboardSnapshot } from "@/src/features/dashboard/dashboard.repository";
import { adjustModeLabels, adjustModeOf, checkInDaysOf } from "@/src/features/profile/profile";
import { describeReview, nextReviewDate, type WeeklyReview } from "@/src/features/reviews/reviews";
import type { CheckInControls } from "@/src/features/reviews/useCheckIn";
import { dayLabel } from "@/src/lib/dates";
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
  return (
    <Card title={`Revisión cada ${days} días`}>
      <View style={AppTheme.checkInTop}>
        <View
          style={[
            AppTheme.statusPill,
            checkIn.status === "updating"
              ? AppTheme.statusUpdating
              : checkIn.status === "holding"
                ? AppTheme.statusHolding
                : AppTheme.statusBuilding,
          ]}
        >
          <Text style={AppTheme.statusPillText}>
            {checkIn.status === "updating"
              ? "Actualizando"
              : checkIn.status === "holding"
                ? "En pausa"
                : "Construyendo"}
          </Text>
        </View>
        <Text style={AppTheme.hint}>
          {snapshot.analysis.nutritionDaysLast7}/7 ingestas · {snapshot.analysis.weightDaysLast7}/7 pesajes
        </Text>
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
          Estás en modo manual: la app no cambia tu objetivo. Si quieres aplicar esta sugerencia, edita tu
          plan o cambia de modo.
        </Text>
      ) : null}
      {controls.action === "none" && checkIn.ready && !snapshot.reviewDue && next ? (
        <Text style={AppTheme.hint}>
          Modo {adjustModeLabels[mode].toLowerCase()}. Próxima revisión: {dayLabel(next)} ({next}).
        </Text>
      ) : null}
    </Card>
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
