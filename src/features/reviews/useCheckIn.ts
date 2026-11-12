import { useEffect, useRef } from "react";

import type { DashboardSnapshot } from "@/src/features/dashboard/dashboard.repository";
import { adjustModeOf, checkInDaysOf, withCalorieTarget } from "@/src/features/profile/profile";
import { saveNutritionProfile } from "@/src/features/profile/profile.repository";
import { canUndoAuto, checkInAction, type CheckInAction } from "@/src/features/reviews/reviews";
import { saveWeeklyReview, setReviewDecision } from "@/src/features/reviews/reviews.repository";
import { VIEWER } from "@/src/lib/mode";

export type CheckInControls = {
  action: CheckInAction;
  /** Hay un ajuste automático reciente que todavía se puede deshacer. */
  undoable: boolean;
  apply: () => Promise<void>;
  dismiss: () => Promise<void>;
  undo: () => Promise<void>;
};

/**
 * Las acciones de la revisión periódica, compartidas por Panel y Estrategia.
 * La decisión de qué toca hacer es de `checkInAction` (dominio); aquí solo se
 * guarda. En modo automático el ajuste se aplica al cargar, una sola vez.
 */
export function useCheckIn(snapshot: DashboardSnapshot | null, reload: () => void): CheckInControls {
  const profile = snapshot?.profile ?? null;
  const checkIn = snapshot?.checkIn ?? null;
  // El visor web no escribe: ni aplica ajustes ni ofrece responderlos.
  const action =
    profile && !VIEWER ? checkInAction(checkIn, snapshot?.reviewDue ?? false, adjustModeOf(profile)) : "none";
  const applying = useRef(false);

  const record = async (decision: "accepted" | "dismissed" | "auto") => {
    if (!profile || !checkIn?.suggestedCalories) return;
    if (decision !== "dismissed")
      await saveNutritionProfile(withCalorieTarget(profile, checkIn.suggestedCalories));
    await saveWeeklyReview({
      decision,
      previousCalories: profile.calorieTarget,
      suggestedCalories: checkIn.suggestedCalories,
      tdee: snapshot?.tdee ?? null,
    });
    reload();
  };

  useEffect(() => {
    if (action !== "auto" || applying.current) return;
    applying.current = true;
    record("auto").finally(() => {
      applying.current = false;
    });
    // `record` cambia en cada render; lo que dispara el ajuste es que la acción pase a "auto".
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [action]);

  const last = snapshot?.lastReview ?? null;
  return {
    action,
    undoable: !VIEWER && canUndoAuto(last, undefined, checkInDaysOf(profile)),
    apply: () => record("accepted"),
    dismiss: () => record("dismissed"),
    undo: async () => {
      if (!profile || !last) return;
      await saveNutritionProfile(withCalorieTarget(profile, last.previousCalories));
      await setReviewDecision(last.id, "dismissed");
      reload();
    },
  };
}
