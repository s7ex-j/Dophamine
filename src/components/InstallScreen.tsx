import { Ionicons } from "@expo/vector-icons";
import { Image, ScrollView, View } from "react-native";

import { Text } from "@/src/components/Text";
import { Card, LinkButton, Screen } from "@/src/components/ui";
import { AppTheme } from "@/src/theme";

const STEPS: Array<{ icon: keyof typeof Ionicons.glyphMap; text: string }> = [
  { icon: "share-outline", text: "En Safari, toca Compartir." },
  { icon: "add-circle-outline", text: 'Elige "Agregar a pantalla de inicio" y confirma.' },
  { icon: "apps-outline", text: "Abre Dophamine desde su ícono y empieza ahí." },
];

/** iPhone en Safari: se instala antes de empezar, porque la app instalada guarda sus datos aparte. */
export function InstallScreen({ onSkip }: { onSkip: () => void }) {
  return (
    <Screen>
      <ScrollView contentContainerStyle={[AppTheme.content, { paddingTop: 40 }]}>
        <Image
          source={require("../../assets/images/icon.png")}
          accessibilityIgnoresInvertColors
          style={{ width: 72, height: 72, borderRadius: 18 }}
        />
        <Text style={AppTheme.title}>Instala Dophamine en tu iPhone.</Text>
        <View>
          {STEPS.map((step, index) => (
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
          Lo que anotes aquí, en Safari, no pasa a la app instalada. Después de instalarla funciona sin
          conexión.
        </Text>
        <Card title="Qué trae esta versión">
          <Text style={AppTheme.body}>
            Registro de comida, peso, sueño y entreno, gráficos, tu plan y Term. Tus datos quedan en el
            teléfono.
          </Text>
          <Text style={AppTheme.hint}>
            No trae recordatorios, Apple Health, widget, cámara para códigos o etiquetas, dictado ni fotos de
            progreso: eso es de la app de Android.
          </Text>
          <Text style={AppTheme.hint}>
            Si borras la app o los datos de Safari, se pierden: comparte un respaldo de vez en cuando (Más →
            Respaldo).
          </Text>
        </Card>
        <View style={{ alignItems: "flex-start" }}>
          <LinkButton title="Probarla sin instalar" onPress={onSkip} />
        </View>
      </ScrollView>
    </Screen>
  );
}
