import ReanimatedSwipeable from "react-native-gesture-handler/ReanimatedSwipeable";
import { ENTER, EXIT, SETTLE } from "@/src/components/motion";
import Animated from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { Pressable, View } from "react-native";
import { Text, TextInput } from "@/src/components/Text";

import { StackBar } from "@/src/components/charts";
import { IconButton, LinkButton, type IconName } from "@/src/components/ui";
import { stateLabels, type Food, type Nutrients } from "@/src/features/nutrition/foods";
import { isEstimate, type MealEntry, type MealSlot } from "@/src/features/nutrition/meals";
import { AppTheme } from "@/src/theme";

// Piezas de las comidas del Panel y de "Agregar alimento". Solo dibujan.

const ICONS: Record<string, IconName> = {
  breakfast: "sunny-outline",
  midmorning: "partly-sunny-outline",
  lunch: "restaurant-outline",
  snack: "cafe-outline",
  dinner: "moon-outline",
  latenight: "bed-outline",
};
/** Icono de un momento del día; las comidas por número usan el mismo. */
export const slotIcon = (slot: MealSlot): IconName => ICONS[slot] ?? "nutrition-outline";

/** Una comida del día: encabezado con icono y total, y cada alimento en su fila. */
/** Guardar los alimentos de un momento como una comida propia, para repetirla con un toque. */
export function SaveMealInline({
  label,
  onSave,
}: {
  label: string;
  onSave: (name: string) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [saved, setSaved] = useState(false);
  if (!open)
    return (
      <Pressable
        accessibilityRole="button"
        onPress={() => {
          setOpen(true);
          setSaved(false);
        }}
        style={{ flexDirection: "row", alignItems: "center", gap: 6, paddingTop: 6 }}
      >
        <Ionicons name={saved ? "bookmark" : "bookmark-outline"} size={16} color={AppTheme.colors.accent} />
        <Text style={[AppTheme.hint, { color: AppTheme.colors.accent }]}>
          {saved ? "Comida guardada" : "Guardar como comida"}
        </Text>
      </Pressable>
    );
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 8, paddingTop: 6 }}>
      <TextInput
        accessibilityLabel="Nombre de la comida"
        value={name}
        onChangeText={setName}
        placeholder={`Ej. Mi ${label.toLowerCase()}`}
        placeholderTextColor={AppTheme.colors.muted}
        style={[AppTheme.input, { flex: 1 }]}
        autoFocus
      />
      <IconButton
        icon="checkmark"
        label="Guardar comida"
        onPress={async () => {
          if (!name.trim()) return;
          await onSave(name);
          setName("");
          setOpen(false);
          setSaved(true);
        }}
      />
      <IconButton icon="close" label="Cancelar" onPress={() => setOpen(false)} danger />
    </View>
  );
}

export function MealCard({
  slot,
  label,
  entries,
  kcal,
  onAdd,
  onRemove,
  onEdit,
  onSave,
  onCopy,
  pasteLabel,
  onPaste,
}: {
  slot: MealSlot;
  label: string;
  entries: MealEntry[];
  kcal: number;
  onAdd: () => void;
  onRemove: (entry: MealEntry) => void;
  onEdit?: (entry: MealEntry) => void;
  /** Guardar estos alimentos como una comida propia. */
  onSave?: (name: string) => Promise<void>;
  /** Copiar esta comida para pegarla en otro momento o día. */
  onCopy?: () => void;
  /** Hay una comida copiada: su nombre, y pegarla aquí. */
  pasteLabel?: string | null;
  onPaste?: () => void;
}) {
  return (
    <View style={AppTheme.card}>
      <View style={AppTheme.mealHeader}>
        <View style={AppTheme.iconChip}>
          <Ionicons name={slotIcon(slot)} size={20} color={AppTheme.colors.accent} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={AppTheme.mealTitle}>{label}</Text>
          <Text style={AppTheme.mealKcal}>{entries.length ? `${kcal} kcal` : "Sin registrar"}</Text>
        </View>
        {onCopy && entries.length ? (
          <IconButton icon="copy-outline" label={`Copiar ${label.toLowerCase()}`} onPress={onCopy} />
        ) : null}
        <IconButton icon="add" label={`Agregar a ${label.toLowerCase()}`} onPress={onAdd} />
      </View>
      {pasteLabel && onPaste ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Pegar en ${label.toLowerCase()}`}
          onPress={onPaste}
          style={{ flexDirection: "row", alignItems: "center", gap: 6, paddingTop: 6 }}
        >
          <Ionicons name="clipboard-outline" size={16} color={AppTheme.colors.accent} />
          <Text style={[AppTheme.hint, { color: AppTheme.colors.accent }]}>Pegar aquí: {pasteLabel}</Text>
        </Pressable>
      ) : null}
      {entries.map((entry) => (
        <Animated.View key={entry.id} entering={ENTER} exiting={EXIT} layout={SETTLE}>
          <ReanimatedSwipeable
            friction={2}
            rightThreshold={40}
            overshootRight={false}
            renderRightActions={() => (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Quitar ${entry.name} (deslizado)`}
                onPress={() => onRemove(entry)}
                style={{
                  justifyContent: "center",
                  paddingHorizontal: 18,
                  backgroundColor: AppTheme.colors.coralSoft,
                  borderRadius: 10,
                }}
              >
                <Ionicons name="trash-outline" size={20} color={AppTheme.colors.coral} />
              </Pressable>
            )}
          >
            {/* Con fondo propio: la acción de quitar queda detrás y solo se ve al deslizar. */}
            <View style={{ backgroundColor: AppTheme.colors.surface }}>
              <EntryRow
                entry={entry}
                onRemove={() => onRemove(entry)}
                onPress={onEdit ? () => onEdit(entry) : undefined}
              />
            </View>
          </ReanimatedSwipeable>
        </Animated.View>
      ))}
      {onSave && entries.length ? <SaveMealInline label={label} onSave={onSave} /> : null}
    </View>
  );
}

/** Un alimento registrado. Quitarlo pide confirmar en la misma fila. */
export function EntryRow({
  entry,
  onRemove,
  onPress,
}: {
  entry: MealEntry;
  onRemove?: () => void;
  onPress?: () => void;
}) {
  const [asking, setAsking] = useState(false);
  return (
    <View style={AppTheme.entryRow}>
      <Pressable
        accessibilityRole={onPress ? "button" : undefined}
        accessibilityLabel={onPress ? `Editar ${entry.name}` : undefined}
        disabled={!onPress}
        onPress={onPress}
        style={{ flex: 1, gap: 2 }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <Text style={[AppTheme.entryName, { flexShrink: 1 }]} numberOfLines={1}>
            {entry.name}
          </Text>
          {isEstimate(entry) ? (
            <View
              accessibilityLabel="Estimado"
              style={{
                borderRadius: 6,
                paddingHorizontal: 6,
                paddingVertical: 1,
                backgroundColor: AppTheme.colors.surface2,
              }}
            >
              <Text style={[AppTheme.hint, { fontSize: 11, color: AppTheme.colors.amber }]}>estimado</Text>
            </View>
          ) : null}
        </View>
        <Text style={AppTheme.entryDetail}>
          {entry.grams ? `${entry.grams} g · ` : ""}P {entry.proteinG} · C {entry.carbsG} · G {entry.fatsG}
        </Text>
      </Pressable>
      {asking ? (
        <>
          <LinkButton title="Quitar" danger onPress={() => (setAsking(false), onRemove?.())} />
          <LinkButton title="No" onPress={() => setAsking(false)} />
        </>
      ) : (
        <>
          <Text style={AppTheme.entryKcal}>{entry.kcal}</Text>
          {onRemove ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Quitar ${entry.name}`}
              onPress={() => setAsking(true)}
              hitSlop={10}
            >
              <Ionicons name="close" size={18} color={AppTheme.colors.muted} />
            </Pressable>
          ) : null}
        </>
      )}
    </View>
  );
}

/** Un resultado de búsqueda: toda la fila se toca para elegirlo. */
export function FoodResult({ food, onPress }: { food: Food; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={food.name}
      onPress={onPress}
      style={AppTheme.entryRow}
    >
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={AppTheme.entryName} numberOfLines={1}>
          {food.name}
        </Text>
        <Text style={AppTheme.entryDetail} numberOfLines={1}>
          {food.brand ? `${food.brand} · ` : ""}
          {food.per100.kcal} kcal · P {food.per100.proteinG} · C {food.per100.carbsG} · G {food.per100.fatsG}{" "}
          /100 g
        </Text>
      </View>
      {food.state ? (
        <View style={AppTheme.badge}>
          <Text style={AppTheme.badgeText}>{stateLabels[food.state]}</Text>
        </View>
      ) : food.source !== "builtin" ? (
        <View style={AppTheme.badge}>
          <Text style={AppTheme.badgeText}>
            {food.source === "recipe" ? "Receta" : food.source === "off" ? "Envasado" : "Mío"}
          </Text>
        </View>
      ) : null}
      <Ionicons name="chevron-forward" size={18} color={AppTheme.colors.muted} />
    </Pressable>
  );
}

/** Reparto de calorías de una porción entre los tres macros. */
export function MacroSplit({ nutrients }: { nutrients: Nutrients }) {
  const { colors } = AppTheme;
  const items = [
    { label: "Proteína", grams: nutrients.proteinG, kcal: nutrients.proteinG * 4, color: colors.protein },
    { label: "Carbos", grams: nutrients.carbsG, kcal: nutrients.carbsG * 4, color: colors.carbs },
    { label: "Grasas", grams: nutrients.fatsG, kcal: nutrients.fatsG * 9, color: colors.fats },
  ];
  return (
    <View style={{ gap: 8 }}>
      <StackBar segments={items.map((item) => ({ value: item.kcal, color: item.color }))} />
      <View style={AppTheme.macroRow}>
        {items.map((item) => (
          <View key={item.label} style={AppTheme.macroColumn}>
            <View style={AppTheme.legendRow}>
              <View style={[AppTheme.legendDot, { backgroundColor: item.color }]} />
              <Text style={AppTheme.macroLabel}>{item.label}</Text>
            </View>
            <Text style={AppTheme.macroValue}>{item.grams} g</Text>
          </View>
        ))}
      </View>
    </View>
  );
}
