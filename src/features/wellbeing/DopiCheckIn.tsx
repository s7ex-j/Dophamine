import { useState } from "react";
import { Text, View } from "react-native";

import { LinkButton } from "@/src/components/ui";
import { setSetting } from "@/src/features/settings/settings.repository";
import { Dopi } from "@/src/features/streak/Dopi";
import { QuickCheckIn } from "@/src/features/wellbeing/QuickCheckIn";
import { DISMISS_KEY } from "@/src/features/wellbeing/wellbeing";
import { localDateKey } from "@/src/lib/dates";
import { AppTheme } from "@/src/theme";

/**
 * Dopi pregunta, una vez al día, si quieres contar cómo va tu día. "Ahora no"
 * lo esconde hasta mañana. No es una notificación del sistema: solo aparece al
 * abrir el Panel.
 */
export function DopiCheckIn({ level, onDone }: { level: number; onDone: () => void }) {
  const [open, setOpen] = useState(false);
  const [thanks, setThanks] = useState(false);
  if (thanks)
    return (
      <View
        style={[AppTheme.card, { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 10 }]}
      >
        <Dopi level={level} mood="happy" size={44} />
        <Text style={[AppTheme.body, { flex: 1 }]}>¡Gracias! Lo verás en tus patrones de Bienestar.</Text>
      </View>
    );
  return (
    <View style={[AppTheme.card, { gap: 10 }]}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        <Dopi level={level} mood="waiting" size={44} />
        <View style={{ flex: 1 }}>
          <Text style={AppTheme.tileTitle}>¿Cómo va tu día?</Text>
          {!open ? <Text style={AppTheme.tileSubtitle}>3 preguntas de un toque</Text> : null}
        </View>
        {!open ? (
          <View style={{ alignItems: "flex-end" }}>
            <LinkButton title="Responder" onPress={() => setOpen(true)} />
            <LinkButton
              title="Ahora no"
              onPress={async () => {
                await setSetting(DISMISS_KEY, localDateKey());
                onDone();
              }}
            />
          </View>
        ) : null}
      </View>
      {open ? (
        <QuickCheckIn
          onDone={() => {
            setThanks(true);
            setTimeout(onDone, 2500);
          }}
        />
      ) : null}
    </View>
  );
}
