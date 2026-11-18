import { useCallback, useState } from "react";
import { WELCOME_KEY } from "@/src/features/welcome/Welcome";
import { Text } from "@/src/components/Text";
import { TitledScroll } from "@/src/components/TitledScroll";
import { useFocusEffect, useRouter } from "expo-router";

import { Button, Card, ChoiceControl, NavRow, Screen } from "@/src/components/ui";
import { BackupCard } from "@/src/features/backup/BackupCard";
import { ExportCard } from "@/src/features/export/ExportCard";
import { getOnlineLookup, setOnlineLookup } from "@/src/features/nutrition/nutrition.repository";
import { OFF_ATTRIBUTION } from "@/src/features/nutrition/openfoodfacts";
import { weightUnitOf, type NutritionProfile } from "@/src/features/profile/profile";
import { getNutritionProfile, saveNutritionProfile } from "@/src/features/profile/profile.repository";
import { WEIGHT_UNIT_OPTIONS, type WeightUnit } from "@/src/lib/units";
import { VIEWER } from "@/src/lib/mode";
import { AppTheme, THEME } from "@/src/theme";
import { switchTheme } from "@/src/theming/live";
import { setSetting } from "@/src/features/settings/settings.repository";
import { THEME_KEY } from "@/src/theming/palettes";
import { ThemePicker } from "@/src/theming/ThemePicker";

// Pestaña "Más": el resto de secciones, preferencias y respaldo.
export default function MoreScreen() {
  const router = useRouter();
  const [profile, setProfile] = useState<NutritionProfile | null>(null);
  const [online, setOnline] = useState(false);
  const load = useCallback(() => {
    getNutritionProfile().then(setProfile);
    getOnlineLookup().then(setOnline);
  }, []);
  const changeOnline = async (value: "on" | "off") => {
    await setOnlineLookup(value === "on");
    load();
  };
  useFocusEffect(load);

  const changeUnit = async (weightUnit: WeightUnit) => {
    if (!profile) return;
    await saveNutritionProfile({ ...profile, weightUnit });
    load();
  };

  return (
    <Screen>
      <TitledScroll title="Todo lo demás">
        <Card title="Secciones">
          {VIEWER ? null : (
            <>
              <NavRow
                title="Hábitos"
                detail="Tus cinco compromisos diarios y el mes completo"
                onPress={() => router.push("/habits")}
              />
              <NavRow
                title="Bienestar"
                detail="Ánimo, energía, estrés y sueño"
                onPress={() => router.push("/wellbeing")}
              />
              <NavRow
                title="Retos de 21 días"
                detail="Un compromiso tres semanas seguidas, marcado solo"
                onPress={() => router.push("/challenges")}
              />
              <NavRow
                title="Racha y logros"
                detail="Term crece con tu racha de registro"
                onPress={() => router.push("/achievements")}
              />
              <NavRow
                title="Medidas corporales"
                detail="Cintura, cadera, pecho, brazo, muslo y cuello"
                onPress={() => router.push("/measurements")}
              />
              <NavRow
                title="Mi dieta"
                detail="Carga tu dieta y recibe qué comer, cuándo y con qué cambiarlo"
                onPress={() => router.push("/diet")}
              />
              <NavRow
                title="Salud y restricciones"
                detail="Alergias, intolerancias, análisis y digestivo"
                onPress={() => router.push("/health")}
              />
              <NavRow
                title="Biblioteca"
                detail="Favoritos, alimentos propios, recetas y comidas guardadas"
                onPress={() => router.push("/library")}
              />
              <NavRow
                title="Nutrientes"
                detail="Qué alimentos aportan más y cómo repartes tus comidas"
                onPress={() => router.push("/nutrients")}
              />
              {profile?.sex === "female" ? (
                <NavRow
                  title="Ciclo menstrual"
                  detail="Fase de hoy, próximo periodo y su efecto en el peso"
                  onPress={() => router.push("/period")}
                />
              ) : null}
              <NavRow
                title="Fotos de progreso"
                detail="Compara tu cuerpo entre dos fechas"
                onPress={() => router.push("/photos")}
              />
            </>
          )}
          {VIEWER ? null : (
            <NavRow
              title="Recordatorios de comidas"
              detail="Cuántas comidas, a qué hora, cada día"
              onPress={() => router.push("/reminders")}
            />
          )}
          <NavRow
            title="Análisis"
            detail="Tendencia, ingesta y adherencia"
            onPress={() => router.push("/analysis")}
          />
        </Card>
        {profile ? (
          <Card title="Unidad de peso">
            <ChoiceControl
              value={weightUnitOf(profile)}
              onChange={changeUnit}
              options={WEIGHT_UNIT_OPTIONS}
            />
            <Text style={AppTheme.hint}>
              Solo cambia cómo se muestran y se escriben los pesos; los datos se guardan en kilogramos.
            </Text>
          </Card>
        ) : null}
        {VIEWER ? null : (
          <Card title="Búsqueda de alimentos en línea">
            <ChoiceControl
              value={online ? "on" : "off"}
              onChange={changeOnline}
              options={[
                { value: "off", label: "Apagada" },
                { value: "on", label: "Encendida" },
              ]}
            />
            <Text style={AppTheme.body}>
              Apagada, la app no usa internet: buscas entre los alimentos básicos incluidos, los tuyos y tus
              recetas. Encendida, además puedes buscar productos envasados y leer códigos de barras en Open
              Food Facts.
            </Text>
            <Text style={AppTheme.hint}>
              Solo se envía el texto que buscas o el número del código de barras, nunca tus registros. Lo que
              encuentres queda guardado para usarlo sin conexión. {OFF_ATTRIBUTION}
            </Text>
          </Card>
        )}
        {VIEWER ? null : (
          <Card title="Estilo de la app">
            <ThemePicker
              value={THEME}
              onChange={async (theme) => {
                if (theme === THEME) return;
                await setSetting(THEME_KEY, theme);
                switchTheme(theme, "/more");
              }}
            />
            <Text style={AppTheme.hint}>Toda la app cambia al instante.</Text>
            <Button
              title="Ver la bienvenida otra vez"
              variant="secondary"
              onPress={async () => {
                await setSetting(WELCOME_KEY, false);
                router.navigate("/");
              }}
            />
          </Card>
        )}
        <Card title={VIEWER ? "Conectar con el teléfono" : "Conectar con la web"}>
          <NavRow
            title="Conexión directa por código QR"
            detail={
              VIEWER
                ? "Trae tus datos del teléfono sin subir un archivo y envíale tu dieta"
                : "Mira tus datos en la web sin subir un archivo; cifrada y sin servidor"
            }
            onPress={() => router.push("/link")}
          />
        </Card>
        {VIEWER ? (
          <BackupCard
            onRestored={load}
            title="Actualizar datos"
            intro="Carga un respaldo más reciente de tu teléfono para actualizar lo que ves aquí."
          />
        ) : (
          <BackupCard onRestored={load} />
        )}
        <ExportCard />
        {VIEWER ? null : (
          <Card title="Borrar datos">
            <NavRow
              title="Por fechas o por ejercicio"
              detail="Peso, comidas, sueño, entrenos o bienestar de un rango; o todas las series de un ejercicio"
              onPress={() => router.push("/cleanup")}
            />
          </Card>
        )}
        <Card title="Privacidad">
          <Text style={AppTheme.body}>
            Tus datos viven solo en este dispositivo. Dophamine no tiene cuentas, servidor ni analítica; lo
            único que puede usar internet es la búsqueda de alimentos, y solo si la enciendes. La conexión
            directa con la web va cifrada de un dispositivo al otro por tu red Wi-Fi, sin servidor, y solo
            cuando tú la inicias.
          </Text>
          <Text style={AppTheme.hint}>
            Las cifras de gasto y composición son estimaciones para orientar tus decisiones, no un consejo
            médico.
          </Text>
        </Card>
      </TitledScroll>
    </Screen>
  );
}
