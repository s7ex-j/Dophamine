import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";

import { Ring, StackBar } from "@/src/components/charts";
import { IconButton, LinkButton, type IconName } from "@/src/components/ui";
import { stateLabels, type Food, type Nutrients } from "@/src/features/nutrition/foods";
import type { MealEntry, MealSlot } from "@/src/features/nutrition/meals";
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

type Targets = { calories: number; protein: number; carbs: number; fats: number } | null;

/** Anillo de calorías y barras de macros del día. */
export function DaySummary({ totals, targets }: { totals: Nutrients; targets: Targets }) {
  const { colors } = AppTheme;
  const remaining = targets ? targets.calories - totals.kcal : 0;
  const macros = [
    { label: "Proteína", value: totals.proteinG, target: targets?.protein, color: colors.protein },
    { label: "Carbos", value: totals.carbsG, target: targets?.carbs, color: colors.carbs },
    { label: "Grasas", value: totals.fatsG, target: targets?.fats, color: colors.fats },
  ];
  return (
    <View style={[AppTheme.card, AppTheme.iconRow, { gap: 18 }]}>
      <Ring
        value={targets ? totals.kcal / targets.calories : 0}
        size={118}
        color={remaining < 0 ? colors.coral : colors.kcal}
      >
        <Text style={AppTheme.ringNumber}>{totals.kcal}</Text>
        <Text style={AppTheme.ringLabel}>
          {targets ? (remaining >= 0 ? `quedan ${remaining}` : `+${-remaining}`) : "kcal"}
        </Text>
      </Ring>
      <View style={{ flex: 1, gap: 10 }}>
        {macros.map((macro) => (
          <View key={macro.label} style={{ gap: 4 }}>
            <View style={AppTheme.legendRow}>
              <Text style={AppTheme.legendLabel}>{macro.label}</Text>
              <Text style={AppTheme.legendValue}>
                {Math.round(macro.value)}
                {macro.target ? <Text style={AppTheme.macroTarget}> / {macro.target} g</Text> : " g"}
              </Text>
            </View>
            <View style={AppTheme.progressTrack}>
              <View
                style={{
                  height: "100%",
                  borderRadius: 5,
                  backgroundColor: macro.color,
                  width: `${Math.min(100, macro.target ? (macro.value / macro.target) * 100 : 0)}%`,
                }}
              />
            </View>
          </View>
        ))}
        {totals.alcoholG ? (
          <Text style={AppTheme.hint}>
            Alcohol: {totals.alcoholG} g ({Math.round(totals.alcoholG * 7)} kcal, fuera de los macros)
          </Text>
        ) : null}
      </View>
    </View>
  );
}

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
        <EntryRow
          key={entry.id}
          entry={entry}
          onRemove={() => onRemove(entry)}
          onPress={onEdit ? () => onEdit(entry) : undefined}
        />
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
        <Text style={AppTheme.entryName} numberOfLines={1}>
          {entry.name}
        </Text>
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
