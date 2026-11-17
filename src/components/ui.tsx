import { useState, type PropsWithChildren } from "react";
import { Ionicons } from "@expo/vector-icons";
import { ScrollView, Text, TextInput, type TextInputProps, View } from "react-native";

import { PressableScale as Pressable } from "@/src/components/PressableScale";
import { GrowBar } from "@/src/components/motion";
import { haptic } from "@/src/lib/haptics";
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
      <GrowBar fraction={value / 100} style={[AppTheme.progressFill, { backgroundColor: color }]} />
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
    <Pressable
      accessibilityRole="button"
      onPress={() => {
        if (!secondary) haptic.light();
        onPress();
      }}
      style={[AppTheme.button, secondary && AppTheme.buttonSecondary]}
    >
      <Text style={[AppTheme.buttonText, secondary && AppTheme.buttonTextSecondary]}>{title}</Text>
    </Pressable>
  );
}
export function ChoiceControl<T extends string>(props: {
  value: T;
  onChange: (value: T) => void;
  options: Array<{ value: T; label: string }>;
}) {
  return <Segmented {...props} />;
}
/**
 * Control segmentado: las opciones van unidas en una sola pieza, del mismo
 * ancho, y la elegida se resalta por dentro. Con muchas opciones o textos
 * largos se reparte en filas de tres celdas iguales.
 */
export function Segmented<T extends string | number>({
  value,
  onChange,
  options,
  label,
}: {
  value: T;
  onChange: (value: T) => void;
  options: Array<{ value: T; label: string }>;
  /** Nombre accesible del grupo. */
  label?: string;
}) {
  const longest = Math.max(...options.map((option) => option.label.length));
  const perRow =
    options.length <= 3 || (options.length <= 8 && longest <= 6) || (options.length <= 4 && longest <= 9)
      ? options.length
      : 3;
  const rows = Array.from({ length: Math.ceil(options.length / perRow) }, (_, row) =>
    options.slice(row * perRow, row * perRow + perRow),
  );
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel={label} style={AppTheme.segmentGroup}>
      {rows.map((row, rowIndex) => (
        <View key={rowIndex} style={[AppTheme.segmentRow, rowIndex > 0 && AppTheme.segmentRowDivider]}>
          {Array.from({ length: perRow }, (_, column) => {
            const option = row[column];
            if (!option)
              return (
                <View
                  key={`empty-${column}`}
                  style={[AppTheme.segmentCell, column > 0 && AppTheme.segmentCellDivider]}
                />
              );
            const active = option.value === value;
            return (
              <Pressable
                key={String(option.value)}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                onPress={() => {
                  if (option.value !== value) haptic.tap();
                  onChange(option.value);
                }}
                style={[
                  AppTheme.segmentCell,
                  column > 0 && AppTheme.segmentCellDivider,
                  active && AppTheme.segmentCellActive,
                ]}
              >
                <Text style={[AppTheme.segmentLabel, active && AppTheme.segmentLabelActive]}>
                  {option.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
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

/**
 * Opciones con explicación, en una lista agrupada: una fila por opción,
 * separadas por una línea, y un indicador de selección a la derecha. Para
 * elegir una sola.
 */
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
    <View accessibilityRole="radiogroup" style={AppTheme.groupList}>
      {options.map((option, index) => {
        const active = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            onPress={() => {
              if (option.value !== value) haptic.tap();
              onChange(option.value);
            }}
            style={[AppTheme.groupRow, index > 0 && AppTheme.groupRowDivider]}
          >
            <View style={AppTheme.optionText}>
              <Text style={[AppTheme.optionTitle, active && { color: AppTheme.colors.accent }]}>
                {option.label}
              </Text>
              <Text style={AppTheme.optionDetail}>{option.detail}</Text>
            </View>
            <View style={[AppTheme.radio, active && AppTheme.radioActive]}>
              {active ? <View style={AppTheme.radioDot} /> : null}
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}
/** Valores cortos (días, minutos, cantidades): un control segmentado. */
export function Chips<T extends string | number>(props: {
  value: T;
  onChange: (value: T) => void;
  options: Array<{ value: T; label: string }>;
}) {
  return <Segmented {...props} />;
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
            onPress={() => {
              if (option.value !== value) haptic.tap();
              onChange(option.value);
            }}
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
          onPress={() => {
            if (option.value !== value) haptic.tap();
            onChange(option.value);
          }}
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
