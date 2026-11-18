import { useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";

import { Text } from "@/src/components/Text";
import { Button, LinkButton, Screen } from "@/src/components/ui";
import { BackupCard } from "@/src/features/backup/BackupCard";
import { Brand, LayoutSwitch, ThemeSwitch } from "@/src/features/backup/ViewerChrome";
import { closeViewer, useSavedViewerData, viewerDataChanged } from "@/src/features/backup/viewerData";
import { SameNetwork, WebLink } from "@/src/features/link/WebLink";
import { VIEWER_WIDE } from "@/src/lib/viewerLayout";
import { forgetViewerData } from "@/src/lib/viewerSession";
import { AppTheme } from "@/src/theme";

// Lo que muestra la web (visor de solo lectura) en lugar de las pantallas donde
// se registra: los registros se hacen en la app del teléfono.

/**
 * Visor sin datos abiertos: solo cómo conectar el teléfono. Si en este navegador quedó algo de una
 * visita anterior, se ofrece aparte (ver o borrar); un respaldo, para cuando no hay la misma red.
 */
export function ViewerEmpty({ onLoaded }: { onLoaded: () => void }) {
  const saved = useSavedViewerData(true);
  const [withFile, setWithFile] = useState(false);
  const loaded = () => {
    viewerDataChanged();
    onLoaded();
  };
  return (
    <Screen>
      <View style={[styles.topBar, { borderBottomColor: AppTheme.colors.border }]}>
        <Brand />
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <ThemeSwitch />
          <LayoutSwitch compact={!VIEWER_WIDE} />
        </View>
      </View>
      <ScrollView
        contentContainerStyle={[AppTheme.content, VIEWER_WIDE && styles.wideContent]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={VIEWER_WIDE ? styles.wideRow : { gap: 24 }}>
          <View style={[{ gap: 18 }, VIEWER_WIDE && { flex: 1, maxWidth: 460, paddingTop: 8 }]}>
            <Text
              style={[AppTheme.title, VIEWER_WIDE && { fontSize: 40, lineHeight: 44, letterSpacing: -1 }]}
            >
              Tu progreso, en pantalla grande.
            </Text>
            <Text style={[AppTheme.body, { color: AppTheme.colors.muted }]}>
              Dophamine se usa en el teléfono. Conéctalo y aquí verás tu Panel y tu Estrategia. Esta página
              solo lee: no registra nada y tus datos no salen de este navegador.
            </Text>
            <View style={{ paddingTop: 6 }}>
              {STEPS.map((step, index) => (
                <View
                  key={step}
                  style={[
                    styles.step,
                    index > 0 && { borderTopWidth: 1, borderTopColor: AppTheme.colors.border },
                  ]}
                >
                  <Text style={[styles.stepNumber, { color: AppTheme.colors.accentText }]}>{index + 1}</Text>
                  <Text style={[AppTheme.body, { flex: 1 }]}>{step}</Text>
                </View>
              ))}
            </View>
            <SameNetwork />
          </View>
          <View style={[{ gap: 14 }, VIEWER_WIDE && { flex: 1, maxWidth: 520 }]}>
            {saved ? (
              <View style={AppTheme.card}>
                <Text style={AppTheme.cardTitle}>Ya hay datos en este navegador</Text>
                <Text style={AppTheme.hint}>
                  Los trajiste en una visita anterior. Puedes verlos o borrarlos de esta computadora; el
                  teléfono no cambia.
                </Text>
                <View style={{ flexDirection: "row", gap: 10 }}>
                  <View style={{ flex: 1 }}>
                    <Button title="Ver mis datos" onPress={loaded} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Button
                      title="Borrar de aquí"
                      variant="secondary"
                      onPress={() => {
                        forgetViewerData();
                        closeViewer();
                      }}
                    />
                  </View>
                </View>
              </View>
            ) : null}
            <WebLink embedded onShowProgress={loaded} />
            {withFile ? (
              <BackupCard
                onRestored={loaded}
                title="Cargar un respaldo"
                intro="En el teléfono: Más → Respaldo → Compartir respaldo. Pasa ese archivo a esta computadora y cárgalo aquí; se lee en este navegador y no se envía a ningún servidor."
              />
            ) : (
              <LinkButton
                title="¿No están en la misma red? Usa un archivo de respaldo"
                onPress={() => setWithFile(true)}
              />
            )}
          </View>
        </View>
      </ScrollView>
    </Screen>
  );
}

const STEPS = [
  "Conecta el teléfono y esta computadora a la misma red Wi-Fi.",
  'Aquí, toca "Mostrar código QR". En el teléfono abre Más → Conectar con la web y léelo.',
  'En el teléfono toca "Enviar a la computadora" y pega aquí el código que te llegue.',
  "Confirma en el teléfono y tus datos aparecen en esta página.",
];

/** Franja que recuerda que lo que se ve es de solo lectura. */
export function ViewerBanner() {
  return (
    <View style={AppTheme.banner}>
      <Text style={AppTheme.bannerTitle}>Solo lectura</Text>
      <Text style={AppTheme.bannerText}>
        Estás viendo un respaldo. Los registros se hacen en la app del teléfono; para actualizar esta vista,
        carga un respaldo más reciente en Más.
      </Text>
    </View>
  );
}

/** Pantalla de registro abierta desde el visor (por ejemplo, con un enlace guardado). */
export function ViewerOnlyNotice({ what }: { what: string }) {
  return (
    <Screen>
      <ScrollView contentContainerStyle={AppTheme.content}>
        <Text style={AppTheme.eyebrow}>Solo lectura</Text>
        <Text style={AppTheme.title}>{what} se usa en el teléfono.</Text>
        <Text style={AppTheme.body}>
          Esta página es un visor de tu progreso. Para registrar, abre Dophamine en tu teléfono.
        </Text>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  topBar: {
    height: 64,
    paddingHorizontal: 24,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
  },
  wideContent: { maxWidth: 1120, paddingTop: 56, paddingHorizontal: 40 },
  wideRow: { flexDirection: "row", gap: 64, alignItems: "flex-start", justifyContent: "space-between" },
  step: { flexDirection: "row", gap: 16, alignItems: "flex-start", paddingVertical: 14 },
  stepNumber: { width: 18, fontSize: 15, fontWeight: "700", fontVariant: ["tabular-nums"] },
});
