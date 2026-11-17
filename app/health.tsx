import { useCallback, useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useFocusEffect } from "expo-router";

import { Card, Screen } from "@/src/components/ui";
import { ViewerOnlyNotice } from "@/src/features/backup/ViewerSections";
import { getHealth, saveHealth } from "@/src/features/diet/diet.repository";
import { ALLERGEN_LABELS, type Allergen } from "@/src/features/health/foodTags";
import {
  CONDITIONS,
  EMPTY_HEALTH,
  LAB_TESTS,
  labStatus,
  suggestedConditions,
  type ConditionId,
  type HealthProfile,
  type LabId,
} from "@/src/features/health/health";
import { getNutritionProfile } from "@/src/features/profile/profile.repository";
import { localDateKey } from "@/src/lib/dates";
import { VIEWER } from "@/src/lib/mode";
import { AppTheme } from "@/src/theme";

export default function HealthScreen() {
  return VIEWER ? <ViewerOnlyNotice what="Salud y restricciones" /> : <HealthContent />;
}

// Lo que evitas, lo que te indicó tu médico y tus análisis. Con esto la dieta
// y los reemplazos se adaptan. No es un diagnóstico.
function HealthContent() {
  const [health, setHealth] = useState<HealthProfile>(EMPTY_HEALTH);
  const [sex, setSex] = useState<"female" | "male">("male");
  const [values, setValues] = useState<Partial<Record<LabId, string>>>({});
  useFocusEffect(
    useCallback(() => {
      getHealth().then(setHealth);
      getNutritionProfile().then((profile) => profile && setSex(profile.sex));
    }, []),
  );
  const store = async (next: HealthProfile) => {
    setHealth(next);
    await saveHealth(next);
  };
  const toggle = <T extends string>(list: T[], value: T) =>
    list.includes(value) ? list.filter((item) => item !== value) : [...list, value];
  const suggested = suggestedConditions(health.labs, sex).filter((id) => !health.conditions.includes(id));
  const saveLab = (id: LabId) => {
    const value = Number((values[id] ?? "").replace(",", "."));
    if (!(value > 0)) return;
    store({
      ...health,
      labs: [...health.labs.filter((lab) => lab.id !== id), { id, value, date: localDateKey() }],
    });
    setValues({ ...values, [id]: "" });
  };

  return (
    <Screen>
      <ScrollView contentContainerStyle={AppTheme.content} keyboardShouldPersistTaps="handled">
        <Card title="Alergias e intolerancias">
          <Text style={AppTheme.hint}>
            Lo que marques no se te propondrá y se avisará si está en tu dieta.
          </Text>
          <View style={AppTheme.chipRow}>
            {(Object.keys(ALLERGEN_LABELS) as Allergen[]).map((allergen) => {
              const active = health.avoid.includes(allergen);
              return (
                <Pressable
                  key={allergen}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  accessibilityLabel={`Evitar ${ALLERGEN_LABELS[allergen]}`}
                  onPress={() => store({ ...health, avoid: toggle(health.avoid, allergen) })}
                  style={[AppTheme.chip, active && AppTheme.chipActive]}
                >
                  <Text style={[AppTheme.chipText, active && AppTheme.chipTextActive]}>
                    {ALLERGEN_LABELS[allergen]}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <Text style={AppTheme.hint}>
            Las etiquetas salen del nombre del alimento. Con una alergia, revisa siempre el envase.
          </Text>
        </Card>

        {(
          [
            ["blood", "Según tus análisis de sangre"],
            ["digestive", "Digestivo (gastroenterólogo)"],
          ] as const
        ).map(([group, title]) => (
          <Card key={group} title={title}>
            <Text style={AppTheme.hint}>Marca solo lo que te indicó tu médico o salió en un análisis.</Text>
            {CONDITIONS.filter((condition) => condition.group === group).map((condition) => {
              const active = health.conditions.includes(condition.id);
              return (
                <Pressable
                  key={condition.id}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: active }}
                  accessibilityLabel={condition.label}
                  onPress={() =>
                    store({ ...health, conditions: toggle<ConditionId>(health.conditions, condition.id) })
                  }
                  style={[AppTheme.entryRow, { gap: 10, alignItems: "flex-start" }]}
                >
                  <View
                    style={{
                      width: 20,
                      height: 20,
                      marginTop: 2,
                      borderRadius: 5,
                      borderWidth: 2,
                      borderColor: active ? AppTheme.colors.accent : AppTheme.colors.border,
                      backgroundColor: active ? AppTheme.colors.accent : "transparent",
                    }}
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={AppTheme.entryName}>{condition.label}</Text>
                    {active
                      ? condition.tips.map((tip) => (
                          <Text key={tip} style={AppTheme.entryDetail}>
                            {tip}
                          </Text>
                        ))
                      : null}
                  </View>
                </Pressable>
              );
            })}
          </Card>
        ))}

        <Card title="Valores de laboratorio (opcional)">
          <Text style={AppTheme.hint}>
            Si los anotas, se comparan con rangos habituales en adultos para sugerirte qué marcar arriba. Tu
            laboratorio puede usar otros rangos.
          </Text>
          {suggested.length ? (
            <View style={AppTheme.banner}>
              <Text style={AppTheme.body}>
                Según lo anotado podrías marcar:{" "}
                {suggested.map((id) => CONDITIONS.find((item) => item.id === id)?.label).join(", ")}.
                Confírmalo con tu médico.
              </Text>
            </View>
          ) : null}
          {LAB_TESTS.map((test) => {
            const saved = health.labs.find((lab) => lab.id === test.id);
            const status = saved ? labStatus(test, saved.value, sex) : null;
            return (
              <View key={test.id} style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <View style={{ flex: 1 }}>
                  <Text style={AppTheme.entryName}>{test.label}</Text>
                  <Text
                    style={[
                      AppTheme.entryDetail,
                      status && status !== "normal" && { color: AppTheme.colors.warning },
                    ]}
                  >
                    {saved
                      ? `${saved.value} ${test.unit} · ${status === "low" ? "bajo" : status === "high" ? "alto" : "en rango"} (${saved.date})`
                      : test.unit}
                  </Text>
                </View>
                <TextInput
                  accessibilityLabel={`Valor de ${test.label}`}
                  value={values[test.id] ?? ""}
                  onChangeText={(text) => setValues({ ...values, [test.id]: text })}
                  onEndEditing={() => saveLab(test.id)}
                  keyboardType="decimal-pad"
                  placeholder="valor"
                  placeholderTextColor={AppTheme.colors.muted}
                  style={[AppTheme.input, { width: 86, textAlign: "center" }]}
                />
              </View>
            );
          })}
        </Card>
        <Text style={AppTheme.hint}>
          Esto no es un diagnóstico ni un tratamiento: son pautas generales de alimentación. Sigue siempre lo
          que indique tu médico o nutricionista. Todo queda solo en tu teléfono.
        </Text>
      </ScrollView>
    </Screen>
  );
}
