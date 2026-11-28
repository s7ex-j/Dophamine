import { useCallback, useState } from "react";
import { Switch, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";

import { Text } from "@/src/components/Text";
import { TitledScroll } from "@/src/components/TitledScroll";
import { LinkButton, Screen, Segmented } from "@/src/components/ui";
import { BackupCard } from "@/src/features/backup/BackupCard";
import { ExportCard } from "@/src/features/export/ExportCard";
import { getMoreSummary, type MoreSummary } from "@/src/features/more/more.data";
import {
  MoreControl,
  MoreDisclosure,
  MoreGroup,
  MoreRow,
  MoreTile,
  PlanCard,
  ThemeDots,
} from "@/src/features/more/MoreSections";
import { getOnlineLookup, setOnlineLookup } from "@/src/features/nutrition/nutrition.repository";
import { OFF_ATTRIBUTION } from "@/src/features/nutrition/openfoodfacts";
import { weightUnitOf, type NutritionProfile } from "@/src/features/profile/profile";
import { getNutritionProfile, saveNutritionProfile } from "@/src/features/profile/profile.repository";
import { setSetting } from "@/src/features/settings/settings.repository";
import { WELCOME_KEY } from "@/src/features/welcome/Welcome";
import { VIEWER } from "@/src/lib/mode";
import type { WeightUnit } from "@/src/lib/units";
import { AppTheme, THEME } from "@/src/theme";
import { switchTheme } from "@/src/theming/live";
import { THEME_KEY } from "@/src/theming/palettes";

const UNITS: Array<{ value: WeightUnit; label: string }> = [
  { value: "kg", label: "kg" },
  { value: "lb", label: "lb" },
];
const EMPTY = { value: "—", detail: "" };

// Pestaña "Más": tu plan, lo de hoy en mosaicos, el resto de secciones por grupo y los ajustes.
export default function MoreScreen() {
  const router = useRouter();
  const [profile, setProfile] = useState<NutritionProfile | null>(null);
  const [summary, setSummary] = useState<MoreSummary | null>(null);
  const [online, setOnline] = useState(false);
  const load = useCallback(() => {
    getNutritionProfile().then(setProfile);
    getOnlineLookup().then(setOnline);
    if (!VIEWER) getMoreSummary().then(setSummary);
  }, []);
  useFocusEffect(load);

  const changeOnline = async (value: boolean) => {
    setOnline(value);
    await setOnlineLookup(value);
  };
  const changeUnit = async (weightUnit: WeightUnit) => {
    if (!profile) return;
    await saveNutritionProfile({ ...profile, weightUnit });
    load();
  };
  const { colors } = AppTheme;

  const unitRow = profile ? (
    <MoreControl icon="scale-outline" title="Unidad de peso">
      <View style={{ width: 112 }}>
        <Segmented
          label="Unidad de peso"
          value={weightUnitOf(profile)}
          onChange={changeUnit}
          options={UNITS}
        />
      </View>
    </MoreControl>
  ) : null;
  const privacyRow = (
    <MoreDisclosure icon="lock-closed-outline" title="Privacidad">
      <Text style={AppTheme.body}>
        Tus datos viven solo en este dispositivo. Dophamine no tiene cuentas, servidor ni analítica; lo único
        que puede usar internet es la búsqueda de alimentos, y solo si la enciendes. La conexión directa con
        la web va cifrada de un dispositivo al otro por tu red Wi-Fi, sin servidor, y solo cuando tú la
        inicias.
      </Text>
    </MoreDisclosure>
  );
  const disclaimer = (
    <Text style={[AppTheme.hint, { paddingHorizontal: 4 }]}>
      Las cifras de gasto y composición son estimaciones para orientar tus decisiones, no un consejo médico.
    </Text>
  );

  if (VIEWER)
    return (
      <Screen>
        <TitledScroll title="Más">
          <MoreGroup title="General">
            <MoreRow icon="analytics-outline" title="Análisis" onPress={() => router.push("/analysis")} />
            <MoreRow
              icon="qr-code-outline"
              title="Conectar con el teléfono"
              onPress={() => router.push("/link")}
            />
            {unitRow}
            {privacyRow}
          </MoreGroup>
          <BackupCard
            onRestored={load}
            title="Actualizar datos"
            intro="Carga un respaldo más reciente de tu teléfono para actualizar lo que ves aquí."
          />
          <ExportCard />
          {disclaimer}
        </TitledScroll>
      </Screen>
    );

  return (
    <Screen>
      <TitledScroll title="Más">
        {summary?.plan ? <PlanCard {...summary.plan} onPress={() => router.navigate("/strategy")} /> : null}
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
          <MoreTile
            icon="checkmark-done-outline"
            color={colors.accent}
            title="Hábitos"
            text={summary?.habits ?? EMPTY}
            onPress={() => router.push("/habits")}
          />
          <MoreTile
            icon="happy-outline"
            color={colors.blue}
            title="Bienestar"
            text={summary?.wellbeing ?? EMPTY}
            onPress={() => router.push("/wellbeing")}
          />
          <MoreTile
            icon="flame-outline"
            color={colors.warning}
            title="Racha y logros"
            text={summary?.streak ?? EMPTY}
            onPress={() => router.push("/achievements")}
          />
          <MoreTile
            icon="body-outline"
            color={colors.violet}
            title="Medidas"
            text={summary?.measurements ?? EMPTY}
            onPress={() => router.push("/measurements")}
          />
        </View>
        <MoreGroup title="Comida y salud">
          <MoreRow
            icon="restaurant-outline"
            title="Mi dieta"
            value={summary?.diet}
            onPress={() => router.push("/diet")}
          />
          <MoreRow icon="book-outline" title="Biblioteca" onPress={() => router.push("/library")} />
          <MoreRow
            icon="medkit-outline"
            title="Salud y restricciones"
            value={summary?.health}
            onPress={() => router.push("/health")}
          />
        </MoreGroup>
        <MoreGroup title="Cuerpo y progreso">
          <MoreRow icon="analytics-outline" title="Análisis" onPress={() => router.push("/analysis")} />
          <MoreRow icon="images-outline" title="Fotos de progreso" onPress={() => router.push("/photos")} />
          <MoreRow
            icon="trophy-outline"
            title="Retos de 21 días"
            value={summary?.challenge}
            onPress={() => router.push("/challenges")}
          />
          {profile?.sex === "female" ? (
            <MoreRow icon="flower-outline" title="Ciclo menstrual" onPress={() => router.push("/period")} />
          ) : null}
        </MoreGroup>
        <MoreGroup title="Ajustes">
          <MoreRow
            icon="notifications-outline"
            title="Recordatorios"
            value={summary?.reminders}
            onPress={() => router.push("/reminders")}
          />
          <MoreControl icon="color-palette-outline" title="Tema">
            <ThemeDots
              value={THEME}
              onChange={async (theme) => {
                if (theme === THEME) return;
                await setSetting(THEME_KEY, theme);
                switchTheme(theme, "/more");
              }}
            />
          </MoreControl>
          {unitRow}
          <MoreDisclosure
            icon="globe-outline"
            title="Buscar en línea"
            control={
              <Switch
                accessibilityLabel="Búsqueda de alimentos en línea"
                value={online}
                onValueChange={changeOnline}
                trackColor={{ true: colors.accent, false: colors.border }}
                thumbColor={colors.text}
              />
            }
          >
            <Text style={AppTheme.body}>
              Apagada, la app no usa internet. Encendida, además puedes buscar productos envasados y leer
              códigos de barras en Open Food Facts.
            </Text>
            <Text style={AppTheme.hint}>
              Solo se envía el texto que buscas o el número del código de barras, nunca tus registros. Lo que
              encuentres queda guardado para usarlo sin conexión. {OFF_ATTRIBUTION}
            </Text>
          </MoreDisclosure>
        </MoreGroup>
        <MoreGroup title="Tus datos">
          <MoreRow
            icon="cloud-offline-outline"
            title="Respaldo"
            value={summary?.backup}
            onPress={() => router.push("/data")}
          />
          <MoreRow icon="qr-code-outline" title="Conectar con la web" onPress={() => router.push("/link")} />
          {privacyRow}
          <MoreRow icon="trash-outline" title="Borrar datos" danger onPress={() => router.push("/cleanup")} />
        </MoreGroup>
        <LinkButton
          title="Ver la bienvenida otra vez"
          onPress={async () => {
            await setSetting(WELCOME_KEY, false);
            router.navigate("/");
          }}
        />
        {disclaimer}
      </TitledScroll>
    </Screen>
  );
}
