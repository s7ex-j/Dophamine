import { ScrollView, View } from "react-native";
import { Text } from "@/src/components/Text";
import { useRouter } from "expo-router";

import { Button, Card, Screen } from "@/src/components/ui";
import { BackupCard } from "@/src/features/backup/BackupCard";
import { AppTheme } from "@/src/theme";

// Lo que muestra la web (visor de solo lectura) en lugar de las pantallas donde
// se registra: los registros se hacen en la app del teléfono.

/** Visor sin datos: explica cómo traerlos del teléfono. */
export function ViewerEmpty({ onLoaded }: { onLoaded: () => void }) {
  const router = useRouter();
  return (
    <Screen>
      <ScrollView contentContainerStyle={AppTheme.content}>
        <Text style={AppTheme.eyebrow}>Visor de Dophamine</Text>
        <Text style={AppTheme.title}>Mira tu progreso en pantalla grande.</Text>
        <Text style={AppTheme.body}>
          Dophamine se usa en el teléfono. Esta página solo muestra tu progreso a partir de un respaldo: no
          registra nada y tus datos no salen de este navegador.
        </Text>
        <Card title="Conexión directa (misma red Wi-Fi)">
          <Text style={AppTheme.body}>
            Con la app instalada en el teléfono, dos códigos QR abren una conexión cifrada entre los dos
            dispositivos y tus datos llegan sin subir ningún archivo.
          </Text>
          <Button title="Conectar con el teléfono" onPress={() => router.push("/link")} />
        </Card>
        <Card title="O con un archivo de respaldo">
          <Text style={AppTheme.body}>
            1. En la app del teléfono abre Más → Respaldo → Compartir respaldo.
          </Text>
          <Text style={AppTheme.body}>2. Pasa ese archivo a este equipo (correo, cable, nube).</Text>
          <Text style={AppTheme.body}>3. Cárgalo aquí.</Text>
        </Card>
        <BackupCard
          onRestored={onLoaded}
          title="Cargar respaldo"
          intro="El archivo se lee en este navegador y no se envía a ningún servidor."
        />
      </ScrollView>
    </Screen>
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
