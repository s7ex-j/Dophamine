import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { ScrollView, Text, View } from "react-native";

import { Button, LinkButton } from "@/src/components/ui";
import { AppTheme } from "@/src/theme";

/**
 * Lo que se ve si una pantalla falla, en lugar de una pantalla en blanco: qué
 * pasó, que los datos guardados siguen ahí y un botón para reintentar. El
 * detalle técnico se puede abrir para copiarlo en un reporte.
 */
export function ErrorScreen({ message, onRetry }: { message: string; onRetry?: () => void }) {
  const [details, setDetails] = useState(false);
  return (
    <View style={[AppTheme.screen, { justifyContent: "center", padding: 24 }]}>
      <ScrollView contentContainerStyle={{ gap: 14, alignItems: "center" }}>
        <Ionicons name="alert-circle-outline" size={48} color={AppTheme.colors.warning} />
        <Text style={[AppTheme.title, { textAlign: "center" }]}>Algo salió mal</Text>
        <Text style={[AppTheme.body, { textAlign: "center" }]}>
          Esta pantalla tuvo un error. Tus datos guardados siguen en el teléfono; prueba de nuevo.
        </Text>
        {onRetry ? <Button title="Reintentar" onPress={onRetry} /> : null}
        <LinkButton
          title={details ? "Ocultar detalle" : "Ver detalle técnico"}
          onPress={() => setDetails(!details)}
        />
        {details ? (
          <Text selectable style={[AppTheme.hint, { fontFamily: "monospace" }]}>
            {message}
          </Text>
        ) : null}
      </ScrollView>
    </View>
  );
}
