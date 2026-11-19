import { useEffect, useState } from "react";
import { Platform } from "react-native";

import { Text } from "@/src/components/Text";
import { Button, Card, LinkButton } from "@/src/components/ui";
import { IMPORT_DAYS } from "@/src/features/health/healthConnect";
import {
  healthConnectStatus,
  importFromHealthConnect,
  openHealthConnect,
  type HealthConnectStatus,
} from "@/src/features/health/healthConnect.repository";
import { haptic } from "@/src/lib/haptics";
import { AppTheme } from "@/src/theme";

/** Traer peso, % de grasa y sueño de Health Connect (Samsung Health, Google Fit…). Solo Android. */
export function HealthConnectCard({ onImported }: { onImported: () => void }) {
  const [status, setStatus] = useState<HealthConnectStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  useEffect(() => {
    if (Platform.OS === "android") healthConnectStatus().then(setStatus);
  }, []);
  if (Platform.OS !== "android" || status === null) return null;

  const run = async () => {
    setBusy(true);
    setMessage("");
    try {
      const result = await importFromHealthConnect();
      haptic.success();
      setMessage(
        result.weights || result.nights || result.stepDays || result.foodDays
          ? `Listo: ${result.weights} días de peso, ${result.nights} noches, ${result.stepDays} días de pasos y ${result.foodDays} días de comida.`
          : "No había días nuevos: lo que ya anotaste aquí no se reemplaza.",
      );
      onImported();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo leer Health Connect.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card title="Health Connect">
      <Text style={AppTheme.body}>
        Trae tu peso, % de grasa, sueño, pasos y lo comido de los últimos {IMPORT_DAYS} días desde Samsung
        Health, Google Fit u otras apps. Solo se llenan los días vacíos: lo que anotaste aquí no cambia. Nada
        sale del teléfono.
      </Text>
      {status === "available" ? (
        <Button
          title={busy ? "Leyendo…" : "Importar de Health Connect"}
          onPress={busy ? () => undefined : run}
        />
      ) : (
        <>
          <Text style={AppTheme.hint}>
            {status === "needs-update"
              ? "Health Connect necesita actualizarse."
              : "Health Connect no está disponible en este teléfono."}
          </Text>
          <LinkButton title="Abrir Health Connect" onPress={openHealthConnect} />
        </>
      )}
      {message ? <Text style={AppTheme.hint}>{message}</Text> : null}
    </Card>
  );
}
