import { useEffect, useState } from "react";
import { Text, Vibration, View } from "react-native";

import { LinkButton } from "@/src/components/ui";
import { formatClock } from "@/src/features/training/training.plans";
import { AppTheme } from "@/src/theme";

/**
 * Cuenta regresiva de descanso entre series. Solo interfaz: no guarda nada.
 * Se mide contra la hora de término y no restando segundos, para que siga
 * siendo exacta si la app pasa un rato en segundo plano.
 */
export function RestTimer({ seconds }: { seconds: number }) {
  const [endsAt, setEndsAt] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [finished, setFinished] = useState(false);

  useEffect(() => {
    if (endsAt === null) return;
    const tick = () => {
      const current = Date.now();
      setNow(current);
      if (current < endsAt) return;
      setEndsAt(null);
      setFinished(true);
      try {
        Vibration.vibrate(400);
      } catch {
        /* Sin vibración disponible: el aviso en pantalla basta. */
      }
    };
    tick();
    const interval = setInterval(tick, 250);
    return () => clearInterval(interval);
  }, [endsAt]);

  const start = () => {
    setFinished(false);
    setNow(Date.now());
    setEndsAt(Date.now() + seconds * 1000);
  };

  return endsAt === null ? (
    <View style={AppTheme.restRow}>
      <Text style={AppTheme.hint}>{finished ? "Descanso terminado. A la siguiente serie." : ""}</Text>
      <LinkButton title={`Descanso ${formatClock(seconds)}`} onPress={start} />
    </View>
  ) : (
    <View style={AppTheme.restRow}>
      <Text style={AppTheme.restClock}>{formatClock((endsAt - now) / 1000)}</Text>
      <LinkButton title="Detener" onPress={() => setEndsAt(null)} />
    </View>
  );
}
