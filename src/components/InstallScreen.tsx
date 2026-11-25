import { Ionicons } from "@expo/vector-icons";
import { Image, ScrollView, View } from "react-native";

import { Text } from "@/src/components/Text";
import { Button, Card, LinkButton, Screen } from "@/src/components/ui";
import { QrCode } from "@/src/features/link/QrCode";
import { pwaUrl, type InstallKind } from "@/src/lib/pwa";
import { AppTheme } from "@/src/theme";

const STEPS: Array<{ icon: keyof typeof Ionicons.glyphMap; text: string }> = [
  { icon: "share-outline", text: "En Safari, toca Compartir." },
  { icon: "add-circle-outline", text: 'Elige "Agregar a pantalla de inicio" y confirma.' },
  { icon: "apps-outline", text: "Abre Dophamine desde su ícono y empieza ahí." },
];

const OPEN: (typeof STEPS)[number] = {
  icon: "qr-code-outline",
  text: "Lee el código y abre el enlace en Safari.",
};

/**
 * iPhone en Safari: se instala antes de empezar, porque la app instalada guarda sus datos aparte. En una
 * computadora u otro teléfono se muestra cómo abrirla en el iPhone.
 */
export function InstallScreen({ kind, onSkip }: { kind: InstallKind; onSkip: () => void }) {
  const ios = kind === "ios";
  return (
    <Screen>
      <ScrollView
        contentContainerStyle={[
          AppTheme.content,
          { paddingTop: 40, width: "100%", maxWidth: 560, alignSelf: "center" },
        ]}
      >
        <Image
          source={require("../../assets/images/icon.png")}
          accessibilityIgnoresInvertColors
          style={{ width: 72, height: 72, borderRadius: 18 }}
        />
        <Text style={AppTheme.title}>
          {ios ? "Instala Dophamine en tu iPhone." : "Esta versión es para iPhone."}
        </Text>
        {ios ? null : (
          <>
            <Text style={AppTheme.body}>
              Lee este código con la cámara del iPhone para abrirla en Safari. En Android, descarga la app
              desde la página de Dophamine.
            </Text>
            <QrCode value={pwaUrl()} size={196} label="Código QR para abrir Dophamine en el iPhone" />
          </>
        )}
        <View>
          {(ios ? STEPS : [OPEN, ...STEPS]).map((step, index) => (
            <View
              key={step.text}
              style={[
                AppTheme.iconRow,
                { paddingVertical: 14 },
                index > 0 && { borderTopWidth: 1, borderTopColor: AppTheme.colors.border },
              ]}
            >
              <Ionicons name={step.icon} size={22} color={AppTheme.colors.accent} />
              <Text style={[AppTheme.body, { flex: 1 }]}>{step.text}</Text>
            </View>
          ))}
        </View>
        <Text style={AppTheme.hint}>
          {ios
            ? "Lo que anotes aquí, en Safari, no pasa a la app instalada. Después de instalarla funciona sin conexión."
            : "Lo que anotes en este navegador se queda en él: no pasa al iPhone."}
        </Text>
        <Card title="Qué trae esta versión">
          <Text style={AppTheme.body}>
            Registro de comida, peso, sueño y entreno, gráficos, tu plan y Term. Tus datos quedan en el
            dispositivo.
          </Text>
          <Text style={AppTheme.hint}>
            No trae recordatorios, Apple Health, widget, cámara para códigos o etiquetas, dictado ni fotos de
            progreso: eso es de la app de Android.
          </Text>
          <Text style={AppTheme.hint}>
            Si borras la app o los datos del navegador, se pierden: comparte un respaldo de vez en cuando (Más
            → Respaldo).
          </Text>
        </Card>
        <View style={{ alignItems: "flex-start" }}>
          {ios ? (
            <LinkButton title="Probarla sin instalar" onPress={onSkip} />
          ) : (
            <Button title="Seguir en este navegador" onPress={onSkip} />
          )}
        </View>
      </ScrollView>
    </Screen>
  );
}
