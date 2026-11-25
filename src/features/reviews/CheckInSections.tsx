import { Ionicons } from "@expo/vector-icons";
import { View } from "react-native";
import { Text } from "@/src/components/Text";

import { Button, Card, LinkButton, ListRow } from "@/src/components/ui";
import type { DashboardSnapshot } from "@/src/features/dashboard/dashboard.repository";
import { adjustModeLabels, adjustModeOf, checkInDaysOf } from "@/src/features/profile/profile";
import { describeReview, nextReviewDate, type WeeklyReview } from "@/src/features/reviews/reviews";
import type { CheckInControls } from "@/src/features/reviews/useCheckIn";
import { signed } from "@/src/features/strategy/strategy";
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
  const proposal = controls.action === "propose" ? checkIn.suggestedCalories : null;
  const change = proposal === null ? 0 : proposal - profile.calorieTarget;
  return (
    <View style={[AppTheme.card, { gap: 14 }]}>
      <View style={[AppTheme.sectionHeader, { gap: 12 }]}>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={AppTheme.cardTitle} accessibilityRole="header">
            {left ? "Próxima revisión" : "Revisión de hoy"}
          </Text>
          <Text style={AppTheme.hint}>
            {left
              ? `${dayLabel(next as string)}, en ${left} ${left === 1 ? "día" : "días"}`
              : `Toca cada ${days} días`}
          </Text>
        </View>
        <View style={{ alignItems: "flex-end", gap: 2 }}>
          <Text style={AppTheme.hint}>Modo</Text>
          <Text style={AppTheme.label}>{adjustModeLabels[mode]}</Text>
        </View>
      </View>
      <View style={{ flexDirection: "row", gap: 20 }}>
        <WeekDots label="Comidas" done={snapshot.analysis.nutritionDaysLast7} color={AppTheme.colors.kcal} />
        <WeekDots label="Pesajes" done={snapshot.analysis.weightDaysLast7} color={AppTheme.colors.violet} />
      </View>
      {proposal !== null ? (
        <View style={{ gap: 12, borderTopWidth: 1, borderTopColor: AppTheme.colors.border, paddingTop: 14 }}>
          <View
            accessible
            accessibilityLabel={`Cambio sugerido: de ${profile.calorieTarget} a ${proposal} kcal al día`}
            style={{ flexDirection: "row", alignItems: "flex-end", gap: 12 }}
          >
            <View>
              <Text style={AppTheme.hint}>Ahora</Text>
              <Text style={[AppTheme.tileValue, { color: AppTheme.colors.muted }]}>
                {profile.calorieTarget}
              </Text>
            </View>
            <Ionicons
              name="arrow-forward"
              size={18}
              color={AppTheme.colors.muted}
              style={{ marginBottom: 6 }}
            />
            <View style={{ flex: 1 }}>
              <Text style={AppTheme.hint}>Sugerido</Text>
              <Text style={AppTheme.tileValue}>
                {proposal}
                <Text style={AppTheme.tileUnit}> kcal al día</Text>
              </Text>
            </View>
            <Text style={[AppTheme.tileTitle, { color: AppTheme.colors.accentText, marginBottom: 4 }]}>
              {signed(change)}
            </Text>
          </View>
          <Text style={AppTheme.body}>{checkIn.message}</Text>
          <Button title={`Aplicar ${proposal} kcal`} onPress={controls.apply} />
          <Button title="Mantener mi objetivo actual" variant="secondary" onPress={controls.dismiss} />
        </View>
      ) : (
        <Text style={AppTheme.body}>{checkIn.message}</Text>
      )}
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

/** Cuántos de los últimos siete días tienen ese dato. */
function WeekDots({ label, done, color }: { label: string; done: number; color: string }) {
  return (
    <View accessible accessibilityLabel={`${label}: ${done} de 7 días`} style={{ flex: 1, gap: 6 }}>
      <View style={AppTheme.sectionHeader}>
        <Text style={AppTheme.hint}>{label}</Text>
        <Text style={AppTheme.label}>{done} de 7</Text>
      </View>
      <View style={{ flexDirection: "row", gap: 4 }}>
        {Array.from({ length: 7 }, (_, index) => (
          <View
            key={index}
            style={{
              flex: 1,
              height: 6,
              borderRadius: 3,
              backgroundColor: index < done ? color : AppTheme.colors.border,
            }}
          />
        ))}
      </View>
    </View>
  );
}

export function ReviewHistoryCard({ reviews }: { reviews: WeeklyReview[] }) {
  return (
    <Card title="Historial de revisiones">
      <ReviewList reviews={reviews} />
    </Card>
  );
}

export function ReviewList({ reviews }: { reviews: WeeklyReview[] }) {
  if (!reviews.length)
    return (
      <Text style={AppTheme.body}>
        Aquí quedará cada ajuste que la app aplique, proponga o que decidas no aplicar.
      </Text>
    );
  return reviews.map((review) => {
    const { title, detail, value } = describeReview(review);
    return <ListRow key={review.id} title={title} detail={detail} value={value} />;
  });
}
