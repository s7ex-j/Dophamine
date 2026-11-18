import { useEffect, useState } from "react";

import { getNutritionProfile } from "@/src/features/profile/profile.repository";
import { closeViewerSession, openViewerSession, viewerSessionOpen } from "@/src/lib/viewerSession";

// El visor web solo muestra el Panel y la Estrategia cuando ya trajo datos del teléfono.
// Quien carga datos (conexión directa o respaldo) avisa con `viewerDataChanged`.
const listeners = new Set<() => void>();

/** Llegaron datos (o se eligió ver los guardados): se muestran en esta visita. */
export function viewerDataChanged() {
  openViewerSession();
  for (const listener of listeners) listener();
}

/** Vuelve a "Conecta tu teléfono" sin borrar lo guardado. */
export function closeViewer() {
  closeViewerSession();
  for (const listener of listeners) listener();
}

/** `null` mientras se comprueba; luego si hay un plan cargado y abierto en esta visita. */
export function useViewerHasData(enabled: boolean) {
  const [hasData, setHasData] = useState<boolean | null>(enabled ? null : true);
  useEffect(() => {
    if (!enabled) return;
    const check = () =>
      getNutritionProfile().then((profile) => setHasData(Boolean(profile) && viewerSessionOpen()));
    check();
    listeners.add(check);
    return () => {
      listeners.delete(check);
    };
  }, [enabled]);
  return hasData;
}

/** Lo que hay guardado en este navegador de una visita anterior, aunque no esté abierto. */
export function useSavedViewerData(enabled: boolean) {
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    if (!enabled) return;
    const check = () => getNutritionProfile().then((profile) => setSaved(Boolean(profile)));
    check();
    listeners.add(check);
    return () => {
      listeners.delete(check);
    };
  }, [enabled]);
  return saved;
}
