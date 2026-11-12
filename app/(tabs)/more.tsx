import { useCallback, useState } from "react";
import { ScrollView, Text } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";

import { Card, ChoiceControl, NavRow, Screen } from "@/src/components/ui";
import { BackupCard } from "@/src/features/backup/BackupCard";
import { weightUnitOf, type NutritionProfile } from "@/src/features/profile/profile";
import { getNutritionProfile, saveNutritionProfile } from "@/src/features/profile/profile.repository";
import { WEIGHT_UNIT_OPTIONS, type WeightUnit } from "@/src/lib/units";
import { VIEWER } from "@/src/lib/mode";
import { AppTheme } from "@/src/theme";

// Pestaña "Más": el resto de secciones, preferencias y respaldo.
export default function MoreScreen() {
  const router = useRouter();
  const [profile, setProfile] = useState<NutritionProfile | null>(null);
  const load = useCallback(() => {
    getNutritionProfile().then(setProfile);
  }, []);
  useFocusEffect(load);

  const changeUnit = async (weightUnit: WeightUnit) => {
    if (!profile) return;
    await saveNutritionProfile({ ...profile, weightUnit });
    load();
  };

  return (
    <Screen>
      <ScrollView contentContainerStyle={AppTheme.content}>
        <Text style={AppTheme.eyebrow}>MÁS</Text>
        <Text style={AppTheme.title}>Todo lo demás</Text>
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
            </>
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
        {VIEWER ? (
          <BackupCard
            onRestored={load}
            title="Actualizar datos"
            intro="Carga un respaldo más reciente de tu teléfono para actualizar lo que ves aquí."
          />
        ) : (
          <BackupCard onRestored={load} />
        )}
        <Card title="Privacidad">
          <Text style={AppTheme.body}>
            Tus datos viven solo en este dispositivo. Dophamine no tiene cuentas, servidor ni analítica.
          </Text>
          <Text style={AppTheme.hint}>
            Las cifras de gasto y composición son estimaciones para orientar tus decisiones, no un consejo
            médico.
          </Text>
        </Card>
      </ScrollView>
    </Screen>
  );
}
