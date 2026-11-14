import { useState, type PropsWithChildren } from "react";
import { Ionicons } from "@expo/vector-icons";
import { Pressable, ScrollView, Text, TextInput, type TextInputProps, View } from "react-native";
import { AppTheme } from "@/src/theme";

export function Screen({ children }: PropsWithChildren) {
  return <View style={AppTheme.screen}>{children}</View>;
}
export function Card({ title, children }: PropsWithChildren<{ title: string }>) {
  return (
    <View style={AppTheme.card}>
      <Text style={AppTheme.cardTitle}>{title}</Text>
      {children}
    </View>
  );
}
export function Metric({ label, value }: { label: string; value: string }) {
  return (
    <View style={AppTheme.metric}>
      <Text style={AppTheme.metricLabel}>{label}</Text>
      <Text style={AppTheme.metricValue}>{value}</Text>
    </View>
  );
}
export function ProgressBar({ value, color = AppTheme.colors.accent }: { value: number; color?: string }) {
  return (
    <View style={AppTheme.progressTrack}>
      <View
        style={[
          AppTheme.progressFill,
          { width: `${Math.max(0, Math.min(value, 100))}%`, backgroundColor: color },
        ]}
      />
    </View>
  );
}
export function Input({ label, multiline, ...props }: TextInputProps & { label: string }) {
  return (
    <View style={AppTheme.inputGroup}>
      <Text style={AppTheme.label}>{label}</Text>
      <TextInput
        style={[AppTheme.input, multiline && { minHeight: 96, textAlignVertical: "top" }]}
        multiline={multiline}
        placeholderTextColor={AppTheme.colors.muted}
        {...props}
      />
    </View>
  );
}
export function Button({
  title,
  onPress,
  variant = "primary",
}: {
  title: string;
  onPress: () => void;
  variant?: "primary" | "secondary";
}) {
  const secondary = variant === "secondary";
  return (
    <Pressable onPress={onPress} style={[AppTheme.button, secondary && AppTheme.buttonSecondary]}>
      <Text style={[AppTheme.buttonText, secondary && AppTheme.buttonTextSecondary]}>{title}</Text>
    </Pressable>
  );
}
export function ChoiceControl<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (value: T) => void;
  options: Array<{ value: T; label: string }>;
}) {
  return (
    <View style={AppTheme.choiceWrap}>
      {options.map((option) => (
        <Pressable
          key={option.value}
          onPress={() => onChange(option.value)}
          style={[AppTheme.choice, option.value === value && AppTheme.choiceActive]}
        >
          <Text style={[AppTheme.choiceText, option.value === value && AppTheme.choiceTextActive]}>
            {option.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}
export function ListRow({ title, detail, value }: { title: string; detail: string; value?: string }) {
  return (
    <View style={AppTheme.listRow}>
      <View style={AppTheme.listText}>
        <Text style={AppTheme.listTitle}>{title}</Text>
        <Text style={AppTheme.listDetail}>{detail}</Text>
      </View>
      {value ? <Text style={AppTheme.listValue}>{value}</Text> : null}
    </View>
  );
}
export function LinkButton({
  title,
  onPress,
  danger,
}: {
  title: string;
  onPress: () => void;
  danger?: boolean;
}) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={AppTheme.linkButton}>
      <Text style={[AppTheme.linkButtonText, danger && AppTheme.linkButtonDanger]}>{title}</Text>
    </Pressable>
  );
}
/**
 * Acciones bajo una fila de lista, con "Borrar" en dos pasos: primero pregunta
 * y solo borra al confirmar. Va en la propia pantalla porque los diálogos del
 * sistema no existen en la web.
 */
export function RowActions({
  question,
  onDelete,
  children,
}: PropsWithChildren<{ question: string; onDelete: () => void }>) {
  const [asking, setAsking] = useState(false);
  return asking ? (
    <View style={AppTheme.rowActions}>
      <Text style={AppTheme.rowQuestion}>{question}</Text>
      <LinkButton
        title="Sí, borrar"
        danger
        onPress={() => {
          setAsking(false);
          onDelete();
        }}
      />
      <LinkButton title="Cancelar" onPress={() => setAsking(false)} />
    </View>
  ) : (
    <View style={AppTheme.rowActions}>
      {children}
      <LinkButton title="Borrar" danger onPress={() => setAsking(true)} />
    </View>
  );
}
export type IconName = keyof typeof Ionicons.glyphMap;

/** Opciones en lista vertical, cada una con icono y una línea de explicación. Para elegir una sola. */
export function OptionList<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (value: T) => void;
  options: Array<{ value: T; label: string; detail: string; icon?: IconName }>;
}) {
  return (
    <View style={AppTheme.optionList}>
      {options.map((option) => {
        const active = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            onPress={() => onChange(option.value)}
            style={[AppTheme.optionCard, active && AppTheme.optionCardActive]}
          >
            <View style={AppTheme.optionRow}>
              {option.icon ? (
                <View style={AppTheme.iconChip}>
                  <Ionicons
                    name={option.icon}
                    size={20}
                    color={active ? AppTheme.colors.accent : AppTheme.colors.muted}
                  />
                </View>
              ) : null}
              <View style={AppTheme.optionText}>
                <Text style={AppTheme.optionTitle}>{option.label}</Text>
                <Text style={AppTheme.optionDetail}>{option.detail}</Text>
              </View>
              {active ? <Ionicons name="checkmark-circle" size={22} color={AppTheme.colors.accent} /> : null}
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}
/** Píldoras para elegir un valor corto (días, minutos). */
export function Chips<T extends string | number>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (value: T) => void;
  options: Array<{ value: T; label: string }>;
}) {
  return (
    <View style={AppTheme.chipRow}>
      {options.map((option) => (
        <Pressable
          key={String(option.value)}
          accessibilityRole="button"
          accessibilityState={{ selected: option.value === value }}
          onPress={() => onChange(option.value)}
          style={[AppTheme.chip, option.value === value && AppTheme.chipActive]}
        >
          <Text style={[AppTheme.chipText, option.value === value && AppTheme.chipTextActive]}>
            {option.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}
/** Campo numérico grande, para una sola cifra por pantalla o por fila. */
export function BigInput({ label, unit, ...props }: TextInputProps & { label: string; unit?: string }) {
  return (
    <View style={{ flex: 1, alignItems: "center", gap: 4 }}>
      <Text style={AppTheme.label}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        style={AppTheme.bigInput}
        placeholderTextColor={AppTheme.colors.border}
        placeholder="0"
        keyboardType="decimal-pad"
        {...props}
      />
      {unit ? <Text style={AppTheme.bigInputUnit}>{unit}</Text> : null}
    </View>
  );
}
/** Avance por pasos: una raya por paso, llenas las ya recorridas. */
export function StepDots({ total, current }: { total: number; current: number }) {
  return (
    <View style={AppTheme.dots}>
      {Array.from({ length: total }, (_, index) => (
        <View key={index} style={[AppTheme.dot, index <= current && AppTheme.dotActive]} />
      ))}
    </View>
  );
}
/** Botón redondo con solo un icono. `label` es lo que lee un lector de pantalla. */
export function IconButton({
  icon,
  label,
  onPress,
  danger,
}: {
  icon: IconName;
  label: string;
  onPress: () => void;
  danger?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={[AppTheme.iconButton, danger && { backgroundColor: AppTheme.colors.coralSoft }]}
    >
      <Ionicons name={icon} size={20} color={danger ? AppTheme.colors.coral : AppTheme.colors.accent} />
    </Pressable>
  );
}
/** Pestañas con icono arriba y texto abajo, para elegir entre pocas opciones a la vista. */
export function IconTabs<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (value: T) => void;
  options: Array<{ value: T; label: string; icon: IconName }>;
}) {
  return (
    <View style={AppTheme.slotTabs}>
      {options.map((option) => {
        const active = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            onPress={() => onChange(option.value)}
            style={[AppTheme.slotTab, active && AppTheme.slotTabActive]}
          >
            <Ionicons
              name={option.icon}
              size={22}
              color={active ? AppTheme.colors.accent : AppTheme.colors.muted}
            />
            <Text style={[AppTheme.slotTabText, active && AppTheme.slotTabTextActive]}>{option.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}
/** Fila que lleva a otra pantalla. */
export function NavRow({ title, detail, onPress }: { title: string; detail: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={AppTheme.navRow}>
      <View style={AppTheme.listText}>
        <Text style={AppTheme.listTitle}>{title}</Text>
        <Text style={AppTheme.listDetail}>{detail}</Text>
      </View>
      <Text style={AppTheme.navChevron}>›</Text>
    </Pressable>
  );
}
/** Elegir un momento del día: con iconos si son 4 o menos; con píldoras desplazables si son más. */
export function SlotPicker<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (value: T) => void;
  options: Array<{ value: T; label: string; icon: IconName }>;
}) {
  if (options.length <= 4) return <IconTabs value={value} onChange={onChange} options={options} />;
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
      {options.map((option) => (
        <Pressable
          key={option.value}
          accessibilityRole="button"
          accessibilityState={{ selected: option.value === value }}
          onPress={() => onChange(option.value)}
          style={[AppTheme.chip, AppTheme.iconRow, { gap: 6 }, option.value === value && AppTheme.chipActive]}
        >
          <Ionicons
            name={option.icon}
            size={16}
            color={option.value === value ? AppTheme.colors.onAccent : AppTheme.colors.muted}
          />
          <Text style={[AppTheme.chipText, option.value === value && AppTheme.chipTextActive]}>
            {option.label}
          </Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}
