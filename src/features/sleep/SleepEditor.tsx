import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import { View } from "react-native";

import {
  hasUsageAccess,
  openUsageAccessSettings,
  phoneUsageAvailable,
  screenEvents,
} from "@/modules/phone-usage";
import { Text } from "@/src/components/Text";
import { TimeDial, TimeStepper } from "@/src/components/TimeDial";
import { Button, Chips, LinkButton, Segmented } from "@/src/components/ui";
import { getSetting, setSetting } from "@/src/features/settings/settings.repository";
import {
  AUTO_SLEEP_KEY,
  AUTO_SLEEP_MODES,
  autoSleepSettingOf,
  nightWindow,
  sleepFromScreen,
  type AutoSleepMode,
  type AutoSleepSetting,
} from "@/src/features/sleep/screenSleep";
import { sleepError, sleepMinutes, type SleepEntry } from "@/src/features/sleep/sleep";
import { deleteSleep, saveSleep } from "@/src/features/sleep/sleep.repository";
import { haptic } from "@/src/lib/haptics";
import { formatDuration, formatTime, parseTime } from "@/src/lib/time";
import { AppTheme } from "@/src/theme";

const DEFAULT_NIGHT = { bedtime: "23:00", wakeTime: "07:00" };

/**
 * Anotar una noche: un reloj de 24 horas con la hora de acostarse y la de despertar, que se arrastran,
 * y botones para afinar. Con el permiso de uso del teléfono (Android), la noche se puede calcular sola.
 */
export function SleepEditor({
  date,
  sleep,
  onDone,
  onMessage,
}: {
  date: string;
  sleep: SleepEntry | null;
  /** Se guardó o se quitó: el Panel vuelve a leer y muestra el texto. */
  onDone: (text?: string) => void;
  onMessage: (message: { text: string; error: boolean }) => void;
}) {
  const [night, setNight] = useState({
    bedtime: sleep?.bedtime ?? DEFAULT_NIGHT.bedtime,
    wakeTime: sleep?.wakeTime ?? DEFAULT_NIGHT.wakeTime,
  });
  const [quality, setQuality] = useState(sleep?.quality ?? 0);
  const [auto, setAuto] = useState<AutoSleepSetting | null>(null);
  useEffect(() => {
    if (phoneUsageAvailable) getSetting(AUTO_SLEEP_KEY).then((value) => setAuto(autoSleepSettingOf(value)));
  }, []);

  const bed = parseTime(night.bedtime) ?? 0;
  const wake = parseTime(night.wakeTime) ?? 0;
  const minutes = sleepMinutes(night.bedtime, night.wakeTime);

  const save = async () => {
    const input = { ...night, quality: quality || null };
    const problem = sleepError(input);
    if (problem) return onMessage({ text: problem, error: true });
    await saveSleep(input, date);
    haptic.success();
    onDone("Sueño guardado.");
  };
  const fromPhone = async () => {
    if (!hasUsageAccess()) {
      onMessage({ text: 'Activa Dophamine en "Acceso al uso" y vuelve a tocar aquí.', error: false });
      return openUsageAccessSettings();
    }
    const window = nightWindow(date);
    const found = sleepFromScreen(await screenEvents(window.start, window.end), date);
    if (!found)
      return onMessage({
        text: "El teléfono no estuvo apagado 3 horas seguidas esa noche. Marca la hora en el reloj.",
        error: true,
      });
    setNight({ bedtime: found.bedtime, wakeTime: found.wakeTime });
    onMessage({ text: "Calculado con el uso del teléfono: revísalo y guarda.", error: false });
  };
  const setMode = async (mode: AutoSleepMode) => {
    const next = { ...(auto ?? autoSleepSettingOf(null)), mode };
    setAuto(next);
    await setSetting(AUTO_SLEEP_KEY, next);
  };

  return (
    <View style={AppTheme.card}>
      <TimeDial
        hands={[
          { minutes: bed, icon: "moon", color: AppTheme.colors.violet, label: "Me acosté" },
          { minutes: wake, icon: "sunny", color: AppTheme.colors.amber, label: "Desperté" },
        ]}
        arcColor={AppTheme.colors.blue}
        onChange={(index, value) =>
          setNight(
            index === 0
              ? { ...night, bedtime: formatTime(value) }
              : { ...night, wakeTime: formatTime(value) },
          )
        }
      >
        <Text style={[AppTheme.quickHint, { textAlign: "center" }]}>Dormiste</Text>
        <Text style={[AppTheme.title, { fontSize: 24, textAlign: "center" }]}>
          {minutes ? formatDuration(minutes).replace(/ min$/, "") : "—"}
        </Text>
        <Text style={[AppTheme.quickHint, { textAlign: "center" }]}>
          {night.bedtime} → {night.wakeTime}
        </Text>
      </TimeDial>
      <Text style={[AppTheme.hint, { textAlign: "center" }]}>Arrastra la luna y el sol por el reloj.</Text>
      <TimeStepper
        label="Me acosté"
        icon="moon"
        color={AppTheme.colors.violet}
        value={night.bedtime}
        onChange={(bedtime) => setNight({ ...night, bedtime })}
      />
      <TimeStepper
        label="Desperté"
        icon="sunny"
        color={AppTheme.colors.amber}
        value={night.wakeTime}
        onChange={(wakeTime) => setNight({ ...night, wakeTime })}
      />
      <Text style={AppTheme.label}>¿Cómo dormiste?</Text>
      <Chips
        value={quality}
        onChange={setQuality}
        options={[1, 2, 3, 4, 5].map((value) => ({ value, label: String(value) }))}
      />
      <Button title={sleep ? "Guardar cambios de sueño" : "Guardar sueño"} onPress={save} />

      {phoneUsageAvailable ? (
        <View style={{ gap: 10, paddingTop: 12, borderTopWidth: 1, borderTopColor: AppTheme.colors.border }}>
          <View style={AppTheme.legendRow}>
            <Ionicons name="phone-portrait-outline" size={16} color={AppTheme.colors.blue} />
            <Text style={[AppTheme.legendLabel, { flex: 1 }]}>Con el uso del teléfono</Text>
          </View>
          <Text style={AppTheme.hint}>
            Al abrir la app, la noche sale de cuándo estuvo apagada la pantalla. Mirar la hora un momento no
            la corta. Es una estimación: puedes corregirla aquí.
          </Text>
          {auto ? (
            <Segmented
              label="Noche con el uso del teléfono"
              value={auto.mode}
              onChange={setMode}
              options={AUTO_SLEEP_MODES}
            />
          ) : null}
          <Button title="Calcular ahora con el teléfono" variant="secondary" onPress={fromPhone} />
        </View>
      ) : null}

      {sleep ? (
        <View style={AppTheme.rowActions}>
          <LinkButton
            title="Quitar esta noche"
            danger
            onPress={async () => {
              await deleteSleep(date);
              onDone();
            }}
          />
        </View>
      ) : null}
    </View>
  );
}
