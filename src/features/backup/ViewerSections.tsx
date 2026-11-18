import { Ionicons } from "@expo/vector-icons";
import { ScrollView, StyleSheet, View } from "react-native";

import { PressableScale as Pressable } from "@/src/components/PressableScale";
import { Text } from "@/src/components/Text";
import { Screen } from "@/src/components/ui";
import { BackupCard } from "@/src/features/backup/BackupCard";
import { viewerDataChanged } from "@/src/features/backup/viewerData";
import { SameNetwork, WebLink } from "@/src/features/link/WebLink";
import { setViewerLayout, VIEWER_LAYOUT, VIEWER_WIDE } from "@/src/lib/viewerLayout";
import { AppTheme } from "@/src/theme";

// Lo que muestra la web (visor de solo lectura) en lugar de las pantallas donde
// se registra: los registros se hacen en la app del teléfono.

/** Visor sin datos: solo los pasos para traerlos del teléfono, con el código QR a la vista. */
export function ViewerEmpty({ onLoaded }: { onLoaded: () => void }) {
  const loaded = () => {
    viewerDataChanged();
    onLoaded();
  };
  return (
    <Screen>
      <ScrollView
        contentContainerStyle={[AppTheme.content, VIEWER_WIDE && { maxWidth: 1120, paddingTop: 40 }]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={AppTheme.sectionHeader}>
          <Text style={[AppTheme.cardTitle, { fontSize: 20, fontWeight: "700" }]}>Dophamine</Text>
          <ViewerLayoutToggle />
        </View>
        <View style={VIEWER_WIDE ? styles.wideRow : { gap: 16 }}>
          <View style={[{ gap: 16 }, VIEWER_WIDE && { flex: 1 }]}>
            <Text style={AppTheme.title}>Conecta tu teléfono para ver tu progreso.</Text>
            <Text style={AppTheme.body}>
              Dophamine se usa en el teléfono. Esta página solo muestra tu progreso: no registra nada y tus
              datos no salen de este navegador.
            </Text>
            <View style={{ gap: 14, paddingTop: 4 }}>
              {STEPS.map((step, index) => (
                <View key={step} style={styles.step}>
                  <View style={[styles.stepNumber, { backgroundColor: AppTheme.colors.accentSoft }]}>
                    <Text style={[AppTheme.label, { color: AppTheme.colors.accentText }]}>{index + 1}</Text>
                  </View>
                  <Text style={[AppTheme.body, { flex: 1 }]}>{step}</Text>
                </View>
              ))}
            </View>
            <SameNetwork />
          </View>
          <View style={[{ gap: 14 }, VIEWER_WIDE && { flex: 1 }]}>
            <WebLink embedded onShowProgress={loaded} />
            <BackupCard
              onRestored={loaded}
              title="¿Sin la misma red? Usa un respaldo"
              intro="En el teléfono: Más → Respaldo → Compartir respaldo. Pasa ese archivo a esta computadora y cárgalo aquí; se lee en este navegador y no se envía a ningún servidor."
            />
          </View>
        </View>
      </ScrollView>
    </Screen>
  );
}

const STEPS = [
  "Abre Dophamine en tu teléfono, conectado a la misma red Wi-Fi que esta computadora.",
  "En el teléfono, entra a Más → Conectar con la web.",
  'Aquí, toca "Mostrar código QR" y léelo con el teléfono.',
  'En el teléfono toca "Enviar a la computadora" y pega aquí el código que te llegue.',
  "Confirma en el teléfono: tu Panel y tu Estrategia aparecen en esta página.",
];

/** Cambia el visor entre la vista ancha (de computadora) y la de celular. */
export function ViewerLayoutToggle() {
  const wide = VIEWER_LAYOUT === "wide";
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={wide ? "Cambiar a vista de celular" : "Cambiar a vista ancha"}
      onPress={() => setViewerLayout(wide ? "phone" : "wide")}
      style={[AppTheme.headerAction, { flexDirection: "row", alignItems: "center", gap: 6 }]}
    >
      <Ionicons
        name={wide ? "phone-portrait-outline" : "desktop-outline"}
        size={15}
        color={AppTheme.colors.accentText}
      />
      <Text style={AppTheme.headerActionText}>{wide ? "Vista de celular" : "Vista ancha"}</Text>
    </Pressable>
  );
}

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
  wideRow: { flexDirection: "row", gap: 48, alignItems: "flex-start" },
  step: { flexDirection: "row", gap: 12, alignItems: "flex-start" },
  stepNumber: { width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center" },
});
