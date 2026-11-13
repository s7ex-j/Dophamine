import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";

import {
  CATALOG,
  EQUIPMENT_LABELS,
  exercisesInGroup,
  MUSCLE_GROUPS,
  MUSCLE_LABELS,
  searchExercises,
  type CatalogExercise,
  type Equipment,
  type Muscle,
  type MuscleGroup,
} from "@/src/features/exercises/catalog";
import { ExerciseImage } from "@/src/features/exercises/ExerciseImage";
import { AppTheme } from "@/src/theme";

// Imagen que representa a cada grupo en la cuadrícula.
const COVER: Record<MuscleGroup, string> = {
  chest: "bench-press",
  back: "lat-pulldown",
  shoulders: "dumbbell-shoulder-press",
  biceps: "bicep-curl",
  triceps: "tricep-pushdown",
  forearms: "dumbbell-wrist-curl",
  legs: "squat",
  glutes: "hip-thrust",
  core: "plank",
  cardio: "rowing-machine",
};
const PAGE = 40;

/**
 * Explorar el catálogo sin saber el nombre del ejercicio: grupo muscular →
 * músculo → equipo. También se puede buscar por nombre. `onPick` agrega el
 * ejercicio (rutina o sesión); `onOpen` abre su ficha.
 */
export function CatalogBrowser({
  onPick,
  onOpen,
  picked = [],
  focus,
}: {
  onPick?: (exercise: CatalogExercise) => void;
  onOpen?: (exercise: CatalogExercise) => void;
  /** Nombres ya agregados: se marcan con un visto. */
  picked?: string[];
  /** Grupos del día que se está armando: se abre en el primero y van primero en la cuadrícula. */
  focus?: MuscleGroup[];
}) {
  const [query, setQuery] = useState("");
  const [group, setGroup] = useState<MuscleGroup | null>(focus?.[0] ?? null);
  const [muscle, setMuscle] = useState<Muscle | null>(null);
  const [equipment, setEquipment] = useState<Equipment | null>(null);
  const [limit, setLimit] = useState(PAGE);

  const current = MUSCLE_GROUPS.find((item) => item.id === group);
  const inGroup = group ? exercisesInGroup(group, { muscle: muscle ?? undefined }) : [];
  const equipmentOptions = [...new Set(inGroup.map((item) => item.equipment))];
  const list = query.trim()
    ? searchExercises(query)
    : inGroup.filter((item) => !equipment || item.equipment === equipment);
  const choose = (next: MuscleGroup | null) => {
    setGroup(next);
    setMuscle(null);
    setEquipment(null);
    setLimit(PAGE);
  };

  return (
    <View style={{ gap: 12 }}>
      <View style={[AppTheme.iconRow, AppTheme.searchBox]}>
        <Ionicons name="search" size={18} color={AppTheme.colors.muted} />
        <TextInput
          accessibilityLabel="Buscar ejercicio"
          value={query}
          onChangeText={(text) => {
            setQuery(text);
            setLimit(PAGE);
          }}
          placeholder="Buscar ejercicio"
          placeholderTextColor={AppTheme.colors.muted}
          style={AppTheme.searchInput}
        />
      </View>

      {!query.trim() && !group ? (
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
          {[...MUSCLE_GROUPS]
            .sort((a, b) => Number(focus?.includes(b.id) ?? 0) - Number(focus?.includes(a.id) ?? 0))
            .map((item) => (
              <Pressable
                key={item.id}
                accessibilityRole="button"
                accessibilityLabel={`Grupo ${item.label}`}
                onPress={() => choose(item.id)}
                style={{
                  width: "31.5%",
                  backgroundColor: AppTheme.colors.surface,
                  borderRadius: 14,
                  borderWidth: 1,
                  borderColor: AppTheme.colors.border,
                  padding: 8,
                  gap: 6,
                  alignItems: "center",
                }}
              >
                <ExerciseImage media={COVER[item.id]} size={72} />
                <Text style={AppTheme.tileTitle}>{item.label}</Text>
                <Text style={AppTheme.hint}>{exercisesInGroup(item.id).length}</Text>
              </Pressable>
            ))}
        </View>
      ) : null}

      {!query.trim() && current ? (
        <View style={{ gap: 8 }}>
          <Pressable
            accessibilityRole="button"
            onPress={() => choose(null)}
            style={{ flexDirection: "row", alignItems: "center", gap: 4 }}
          >
            <Ionicons name="chevron-back" size={18} color={AppTheme.colors.accent} />
            <Text style={[AppTheme.tileTitle, { color: AppTheme.colors.accent }]}>{current.label}</Text>
          </Pressable>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            {[null, ...current.muscles].map((value) => (
              <Pressable
                key={value ?? "all"}
                accessibilityRole="button"
                accessibilityState={{ selected: muscle === value }}
                onPress={() => {
                  setMuscle(value);
                  setEquipment(null);
                }}
                style={[AppTheme.chip, muscle === value && AppTheme.chipActive]}
              >
                <Text style={[AppTheme.chipText, muscle === value && AppTheme.chipTextActive]}>
                  {value ? MUSCLE_LABELS[value] : "Todos"}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            {[null, ...equipmentOptions].map((value) => (
              <Pressable
                key={value ?? "any"}
                accessibilityRole="button"
                accessibilityState={{ selected: equipment === value }}
                onPress={() => setEquipment(value)}
                style={[AppTheme.chip, equipment === value && AppTheme.chipActive]}
              >
                <Text style={[AppTheme.chipText, equipment === value && AppTheme.chipTextActive]}>
                  {value ? EQUIPMENT_LABELS[value] : "Cualquier equipo"}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      ) : null}

      {query.trim() || group ? (
        <View style={{ gap: 2 }}>
          <Text style={AppTheme.hint}>
            {list.length} {list.length === 1 ? "ejercicio" : "ejercicios"}
          </Text>
          {list.slice(0, limit).map((exercise) => {
            const added = picked.includes(exercise.name);
            return (
              <Pressable
                key={exercise.id}
                accessibilityRole="button"
                accessibilityLabel={exercise.name}
                onPress={() => (onPick ? onPick(exercise) : onOpen?.(exercise))}
                style={[AppTheme.entryRow, { gap: 12 }]}
              >
                <ExerciseImage media={exercise.media} size={52} />
                <View style={{ flex: 1 }}>
                  <Text style={AppTheme.entryName}>{exercise.name}</Text>
                  <Text style={AppTheme.entryDetail} numberOfLines={1}>
                    {exercise.primary.map((item) => MUSCLE_LABELS[item]).join(", ")} ·{" "}
                    {EQUIPMENT_LABELS[exercise.equipment]}
                  </Text>
                </View>
                {onPick ? (
                  <Ionicons
                    name={added ? "checkmark-circle" : "add-circle-outline"}
                    size={24}
                    color={added ? AppTheme.colors.accent : AppTheme.colors.muted}
                  />
                ) : (
                  <Ionicons name="chevron-forward" size={18} color={AppTheme.colors.muted} />
                )}
              </Pressable>
            );
          })}
          {list.length > limit ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => setLimit(limit + PAGE)}
              style={{ paddingVertical: 12, alignItems: "center" }}
            >
              <Text style={[AppTheme.tileTitle, { color: AppTheme.colors.accent }]}>
                Ver más ({list.length - limit})
              </Text>
            </Pressable>
          ) : null}
        </View>
      ) : (
        <Text style={AppTheme.hint}>
          {CATALOG.length} ejercicios. Imágenes e instrucciones: Exercise data by RepDB (repdb.co).
        </Text>
      )}
    </View>
  );
}
