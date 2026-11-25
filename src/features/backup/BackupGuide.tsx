import { Platform } from "react-native";

import { Text } from "@/src/components/Text";
import { exportLabel } from "@/src/features/backup/backup.repository";
import { MoreDisclosure, MoreGroup } from "@/src/features/more/MoreSections";
import { AppTheme } from "@/src/theme";

const WEB = Platform.OS === "web";

function Steps({ items }: { items: string[] }) {
  return items.map((item, index) => (
    <Text key={item} style={AppTheme.body}>
      {index + 1}. {item}
    </Text>
  ));
}

/** Cómo funciona el respaldo, en partes cortas que se abren: actualizar, guardar, recuperar y qué incluye. */
export function BackupGuide() {
  return (
    <MoreGroup title="Cómo funciona">
      <MoreDisclosure icon="refresh-outline" title="Si vas a actualizar la app" startOpen>
        {WEB ? (
          <Text style={AppTheme.body}>
            Se actualiza sola al abrirla con internet y tus datos se quedan. Si borras la app de tu pantalla
            de inicio o los datos del navegador, se pierden: guarda antes un respaldo.
          </Text>
        ) : (
          <>
            <Steps
              items={[
                `Por precaución, toca "${exportLabel}" y guárdalo fuera de la app.`,
                "Instala la versión nueva encima de la actual, sin desinstalar.",
                "Ábrela: tus datos siguen ahí. No hace falta restaurar nada.",
              ]}
            />
            <Text style={AppTheme.hint}>
              Si desinstalas la app se borra todo, también la copia semanal. En ese caso, usa el archivo que
              guardaste para recuperarlo.
            </Text>
          </>
        )}
      </MoreDisclosure>
      <MoreDisclosure icon="save-outline" title="Guardar un respaldo">
        <Steps
          items={[
            `Toca "${exportLabel}". Se crea un archivo con la fecha de hoy.`,
            WEB
              ? "Guárdalo en Archivos, en tu nube o en otro dispositivo."
              : "Elige dónde guardarlo: Drive, Archivos o un mensaje para ti.",
            "Repítelo de vez en cuando: el archivo solo tiene lo anotado hasta ese momento.",
          ]}
        />
        <Text style={AppTheme.hint}>
          El archivo no lleva contraseña y contiene tus datos de salud: guárdalo en un lugar privado.
        </Text>
      </MoreDisclosure>
      <MoreDisclosure icon="download-outline" title="Recuperar tus datos">
        <Steps
          items={[
            WEB
              ? "Abre la app y llega a esta pantalla."
              : "Instala la app en el teléfono y llega a esta pantalla.",
            'Toca "Restaurar desde un archivo" y elige tu respaldo.',
            'Revisa lo que trae y confirma con "Reemplazar mis datos".',
          ]}
        />
        <Text style={AppTheme.hint}>
          Reemplaza todo lo que haya en la app; no se mezcla. Un respaldo de una versión anterior también
          sirve.
        </Text>
      </MoreDisclosure>
      <MoreDisclosure icon="list-outline" title="Qué incluye">
        <Text style={AppTheme.body}>
          Peso, comidas, alimentos y recetas propias, sueño, agua, entrenos, bienestar, medidas, tu dieta, tu
          plan con sus revisiones y tus ajustes.
        </Text>
        <Text style={AppTheme.body}>
          No incluye las imágenes de tus fotos de progreso: quedan solo en el teléfono y se pierden si
          desinstalas la app.
        </Text>
      </MoreDisclosure>
    </MoreGroup>
  );
}
