import { Ionicons } from "@expo/vector-icons";
import { useRef, useState, type ReactNode } from "react";
import { Modal, Platform, Pressable, View } from "react-native";
import { Gesture, GestureDetector, GestureHandlerRootView } from "react-native-gesture-handler";
import Svg, { Circle, Line, Path, Text as SvgText } from "react-native-svg";

import { Text } from "@/src/components/Text";
import { Button, LinkButton, type IconName } from "@/src/components/ui";
import { arcPath, gapOf, minutesAt, pointOf, shiftMinutes } from "@/src/lib/dial";
import { haptic } from "@/src/lib/haptics";
import { formatTime, parseTime } from "@/src/lib/time";
import { AppTheme } from "@/src/theme";

export type DialHand = { minutes: number; icon: IconName; color: string; label: string };

const SIZE = 264;
const CENTER = SIZE / 2;
const STROKE = 30;
const RADIUS = CENTER - STROKE / 2 - 4;
const KNOB = 15;

/**
 * Reloj de 24 horas con la medianoche arriba: cada aguja se arrastra por el anillo (de 5 en 5 minutos).
 * Con dos agujas se pinta el tramo de la primera a la segunda, como una noche. Al centro va lo que se
 * quiera mostrar. Para quien no arrastra, `TimeStepper` cambia la misma hora con botones.
 */
export function TimeDial({
  hands,
  onChange,
  arcColor,
  children,
}: {
  hands: DialHand[];
  onChange: (index: number, minutes: number) => void;
  /** Con dos agujas, el color del tramo entre ellas. */
  arcColor?: string;
  children?: ReactNode;
}) {
  const active = useRef<number | null>(null);
  const [dragging, setDragging] = useState<number | null>(null);
  const pick = (x: number, y: number) => {
    const at = minutesAt(x, y, CENTER, 1);
    return hands.reduce(
      (best, hand, index) => (gapOf(hand.minutes, at) < gapOf(hands[best].minutes, at) ? index : best),
      0,
    );
  };
  const move = (x: number, y: number) => {
    const index = active.current;
    if (index === null) return;
    const minutes = minutesAt(x, y, CENTER);
    if (minutes === hands[index].minutes) return;
    if (minutes % 60 === 0) haptic.tap();
    onChange(index, minutes);
  };
  const pan = Gesture.Pan()
    .runOnJS(true)
    .minDistance(0)
    .onBegin((event) => {
      active.current = pick(event.x, event.y);
      setDragging(active.current);
      move(event.x, event.y);
    })
    .onUpdate((event) => move(event.x, event.y))
    .onFinalize(() => {
      active.current = null;
      setDragging(null);
    });

  const [first, second] = hands;
  return (
    <GestureDetector gesture={pan}>
      <View
        testID="time-dial"
        accessible={false}
        style={[
          { width: SIZE, height: SIZE, alignSelf: "center" },
          // En el navegador, el arrastre es del reloj y no de la página.
          Platform.OS === "web" ? ({ touchAction: "none", cursor: "grab" } as object) : null,
        ]}
      >
        <Svg width={SIZE} height={SIZE}>
          <Circle
            cx={CENTER}
            cy={CENTER}
            r={RADIUS}
            stroke={AppTheme.colors.surface2}
            strokeWidth={STROKE}
            fill="none"
          />
          {Array.from({ length: 24 }, (_, hour) => {
            const outer = pointOf(hour * 60, CENTER, RADIUS - STROKE / 2 - 4);
            const inner = pointOf(hour * 60, CENTER, RADIUS - STROKE / 2 - (hour % 6 === 0 ? 12 : 8));
            return (
              <Line
                key={hour}
                x1={outer.x}
                y1={outer.y}
                x2={inner.x}
                y2={inner.y}
                stroke={hour % 6 === 0 ? AppTheme.colors.body : AppTheme.colors.border}
                strokeWidth={hour % 6 === 0 ? 2 : 1.5}
                strokeLinecap="round"
              />
            );
          })}
          {[0, 6, 12, 18].map((hour) => {
            const point = pointOf(hour * 60, CENTER, RADIUS - STROKE / 2 - 22);
            return (
              <SvgText
                key={hour}
                x={point.x}
                y={point.y + 4}
                fill={AppTheme.colors.muted}
                fontSize={11}
                fontWeight="600"
                textAnchor="middle"
              >
                {String(hour).padStart(2, "0")}
              </SvgText>
            );
          })}
          {first && second ? (
            <Path
              d={arcPath(first.minutes, second.minutes, CENTER, RADIUS)}
              stroke={arcColor ?? first.color}
              strokeOpacity={0.85}
              strokeWidth={STROKE - 6}
              strokeLinecap="round"
              fill="none"
            />
          ) : null}
          {hands.map((hand, index) => {
            const point = pointOf(hand.minutes, CENTER, RADIUS);
            return (
              <Circle
                key={hand.label}
                cx={point.x}
                cy={point.y}
                r={dragging === index ? KNOB + 2 : KNOB}
                fill={AppTheme.colors.background}
                stroke={hand.color}
                strokeWidth={2.5}
              />
            );
          })}
        </Svg>
        {hands.map((hand) => {
          const point = pointOf(hand.minutes, CENTER, RADIUS);
          return (
            <View
              key={hand.label}
              pointerEvents="none"
              style={{ position: "absolute", left: point.x - 8, top: point.y - 8 }}
            >
              <Ionicons name={hand.icon} size={16} color={hand.color} />
            </View>
          );
        })}
        <View
          pointerEvents="none"
          style={{
            position: "absolute",
            top: STROKE + 30,
            bottom: STROKE + 30,
            left: STROKE + 30,
            right: STROKE + 30,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {children}
        </View>
      </View>
    </GestureDetector>
  );
}

/** Una hora con botones: menos y más una hora o cinco minutos. También sirve con lector de pantalla. */
export function TimeStepper({
  label,
  icon,
  color,
  value,
  onChange,
}: {
  label: string;
  icon?: IconName;
  color?: string;
  /** "HH:MM". */
  value: string;
  onChange: (value: string) => void;
}) {
  const minutes = parseTime(value) ?? 0;
  const step = (delta: number) => {
    haptic.tap();
    onChange(formatTime(shiftMinutes(minutes, delta)));
  };
  const button = (delta: number, name: IconName, hint: string) => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${label}: ${hint}`}
      onPress={() => step(delta)}
      hitSlop={6}
      style={{
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: AppTheme.colors.surface2,
      }}
    >
      <Ionicons name={name} size={18} color={AppTheme.colors.text} />
    </Pressable>
  );
  return (
    <View
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={label}
      accessibilityValue={{ text: value }}
      accessibilityActions={[{ name: "increment" }, { name: "decrement" }]}
      onAccessibilityAction={(event) => step(event.nativeEvent.actionName === "increment" ? 5 : -5)}
      style={[AppTheme.legendRow, { gap: 6 }]}
    >
      {icon ? <Ionicons name={icon} size={16} color={color ?? AppTheme.colors.muted} /> : null}
      <Text style={[AppTheme.legendLabel, { flex: 1 }]} numberOfLines={1}>
        {label}
      </Text>
      {button(-60, "play-back-outline", "una hora menos")}
      {button(-5, "remove", "cinco minutos menos")}
      <Text
        style={[AppTheme.quickValue, { minWidth: 56, textAlign: "center", fontVariant: ["tabular-nums"] }]}
      >
        {value}
      </Text>
      {button(5, "add", "cinco minutos más")}
      {button(60, "play-forward-outline", "una hora más")}
    </View>
  );
}

/**
 * Una hora que se toca para cambiarla: muestra "HH:MM" (o "--:--" vacía) y abre el reloj en una hoja
 * desde abajo, con los botones para afinar. `optional` agrega "Sin hora" (deja el valor vacío).
 */
export function TimeChip({
  label,
  value,
  onChange,
  fallback = "08:00",
  optional,
  color = AppTheme.colors.accent,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  fallback?: string;
  optional?: boolean;
  color?: string;
}) {
  const [open, setOpen] = useState(false);
  const parsed = parseTime(value);
  const shown = parsed === null ? null : formatTime(parsed);
  const [draft, setDraft] = useState(shown ?? fallback);
  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${shown ?? "sin hora"}. Cambiar`}
        onPress={() => {
          setDraft(shown ?? fallback);
          setOpen(true);
        }}
        style={[
          AppTheme.legendRow,
          {
            gap: 6,
            paddingVertical: 8,
            paddingHorizontal: 10,
            borderRadius: 10,
            borderWidth: 1,
            borderColor: AppTheme.colors.border,
            backgroundColor: AppTheme.colors.surface2,
          },
        ]}
      >
        <Ionicons name="time-outline" size={15} color={shown ? color : AppTheme.colors.muted} />
        <Text
          style={[
            AppTheme.legendValue,
            { fontVariant: ["tabular-nums"], color: shown ? AppTheme.colors.text : AppTheme.colors.muted },
          ]}
        >
          {shown ?? "--:--"}
        </Text>
      </Pressable>
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <GestureHandlerRootView style={{ flex: 1, justifyContent: "flex-end" }}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Cerrar sin cambiar"
            onPress={() => setOpen(false)}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: "rgba(0,0,0,0.55)",
            }}
          />
          <View
            accessibilityViewIsModal
            style={[
              AppTheme.card,
              {
                borderBottomLeftRadius: 0,
                borderBottomRightRadius: 0,
                paddingBottom: 28,
                width: "100%",
                maxWidth: 520,
                alignSelf: "center",
              },
            ]}
          >
            <Text style={AppTheme.label}>{label}</Text>
            <TimeDial
              hands={[{ minutes: parseTime(draft) ?? 0, icon: "time-outline", color, label }]}
              onChange={(_, minutes) => setDraft(formatTime(minutes))}
            >
              <Text style={[AppTheme.title, { fontVariant: ["tabular-nums"] }]}>{draft}</Text>
            </TimeDial>
            <TimeStepper label="Hora" value={draft} onChange={setDraft} />
            <Button
              title="Listo"
              onPress={() => {
                onChange(draft);
                setOpen(false);
              }}
            />
            {optional && shown ? (
              <LinkButton
                title="Sin hora"
                danger
                onPress={() => {
                  onChange("");
                  setOpen(false);
                }}
              />
            ) : null}
          </View>
        </GestureHandlerRootView>
      </Modal>
    </>
  );
}
