import { useCallback, useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useFocusEffect } from "expo-router";

import { Button, Card, Input, RowActions, Screen } from "@/src/components/ui";
import { ViewerOnlyNotice } from "@/src/features/backup/ViewerSections";
import { EQUIPMENT_LABELS } from "@/src/features/exercises/catalog";
import { ALL_EQUIPMENT, type GymSetup } from "@/src/features/training/gyms";
import { getGyms, saveGyms, setActiveGym } from "@/src/features/training/gyms.repository";
import { VIEWER } from "@/src/lib/mode";
import { AppTheme } from "@/src/theme";

export default function GymsScreen() {
  return VIEWER ? <ViewerOnlyNotice what="Los gimnasios" /> : <GymsContent />;
}

// Perfiles de gimnasio: dónde entrenas, con qué equipo, la barra y el salto de carga.
// El activo filtra el catálogo, los reemplazos y redondea las cargas sugeridas.
function GymsContent() {
  const [gyms, setGyms] = useState<GymSetup[]>([]);
  const [activeId, setActiveId] = useState("");
  const [name, setName] = useState("");
  const load = useCallback(() => {
    getGyms().then(({ gyms: list, active }) => {
      setGyms(list);
      setActiveId(active.id);
    });
  }, []);
  useFocusEffect(load);
  const store = async (next: GymSetup[]) => {
    setGyms(next);
    await saveGyms(next);
  };
  const change = (id: string, patch: Partial<GymSetup>) =>
    store(gyms.map((gym) => (gym.id === id ? { ...gym, ...patch } : gym)));

  return (
    <Screen>
      <ScrollView contentContainerStyle={AppTheme.content} keyboardShouldPersistTaps="handled">
        {gyms.map((gym) => {
          const active = gym.id === activeId;
          return (
            <View
              key={gym.id}
              style={[AppTheme.card, { gap: 10 }, active && { borderColor: AppTheme.colors.accent }]}
            >
              <View style={AppTheme.sectionHeader}>
                <Text style={AppTheme.tileTitle}>{gym.name}</Text>
                {active ? (
                  <View style={AppTheme.badge}>
                    <Text style={AppTheme.badgeText}>Activo</Text>
                  </View>
                ) : (
                  <Button
                    title="Usar este"
                    variant="secondary"
                    onPress={async () => {
                      await setActiveGym(gym.id);
                      setActiveId(gym.id);
                    }}
                  />
                )}
              </View>
              <View style={AppTheme.chipRow}>
                {ALL_EQUIPMENT.map((item) => {
                  const has = gym.equipment.includes(item);
                  return (
                    <Pressable
                      key={item}
                      accessibilityRole="button"
                      accessibilityState={{ selected: has }}
                      onPress={() =>
                        change(gym.id, {
                          equipment: has
                            ? gym.equipment.filter((value) => value !== item)
                            : [...gym.equipment, item],
                        })
                      }
                      style={[AppTheme.chip, has && AppTheme.chipActive]}
                    >
                      <Text style={[AppTheme.chipText, has && AppTheme.chipTextActive]}>
                        {EQUIPMENT_LABELS[item]}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
              <View style={{ flexDirection: "row", gap: 10 }}>
                {(
                  [
                    ["Barra (kg)", "barKg"],
                    ["Salto mínimo (kg)", "incrementKg"],
                  ] as const
                ).map(([label, field]) => (
                  <View key={field} style={{ flex: 1, gap: 2 }}>
                    <Text style={AppTheme.hint}>{label}</Text>
                    <TextInput
                      accessibilityLabel={`${label} de ${gym.name}`}
                      defaultValue={String(gym[field])}
                      keyboardType="decimal-pad"
                      onEndEditing={(event) => {
                        const value = Number(event.nativeEvent.text.replace(",", "."));
                        if (value > 0) change(gym.id, { [field]: value });
                      }}
                      style={AppTheme.input}
                    />
                  </View>
                ))}
              </View>
              {gyms.length > 1 && !active ? (
                <RowActions
                  question={`¿Borrar "${gym.name}"?`}
                  onDelete={() => store(gyms.filter((item) => item.id !== gym.id))}
                />
              ) : null}
            </View>
          );
        })}
        <Card title="Agregar un lugar">
          <Input
            label="Nombre"
            value={name}
            onChangeText={setName}
            placeholder="Trabajo, casa de mis padres…"
          />
          <Button
            title="Agregar"
            onPress={async () => {
              if (!name.trim()) return;
              await store([
                ...gyms,
                {
                  id: `${Date.now()}`,
                  name: name.trim(),
                  equipment: ["bodyweight", "dumbbell"],
                  barKg: 20,
                  incrementKg: 2,
                },
              ]);
              setName("");
            }}
          />
        </Card>
        <Text style={AppTheme.hint}>
          El salto mínimo es lo menos que puedes subir: 2.5 kg si tu par de discos más chico es de 1.25, o el
          paso entre tus mancuernas.
        </Text>
      </ScrollView>
    </Screen>
  );
}
