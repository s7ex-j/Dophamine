import { useEffect, useState } from "react";

import { getNutritionProfile } from "@/src/features/profile/profile.repository";

// El visor web solo muestra el Panel y la Estrategia cuando ya trajo datos del teléfono.
// Quien carga datos (conexión directa o respaldo) avisa con `viewerDataChanged`.
const listeners = new Set<() => void>();

export function viewerDataChanged() {
  for (const listener of listeners) listener();
}

/** `null` mientras se comprueba; luego si hay un plan cargado. */
export function useViewerHasData(enabled: boolean) {
  const [hasData, setHasData] = useState<boolean | null>(enabled ? null : true);
  useEffect(() => {
    if (!enabled) return;
    const check = () => getNutritionProfile().then((profile) => setHasData(Boolean(profile)));
    check();
    listeners.add(check);
    return () => {
      listeners.delete(check);
    };
  }, [enabled]);
  return hasData;
}
