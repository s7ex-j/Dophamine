import { useCallback, useMemo, useState } from "react";
import { Alert, ScrollView, Text, View } from "react-native";
import { useFocusEffect } from "expo-router";
import { Button, Card, Input, ListRow, Metric, Screen, SegmentedControl } from "@/src/components/ui";
import { getRecentWellbeingEntries, saveWellbeingEntry, type WellbeingEntry } from "@/src/features/wellbeing/wellbeing.repository";
import { toggleHabit } from "@/src/features/habits/habits.repository";
import { dateKey } from "@/src/features/habits/habits";
import { AppTheme } from "@/src/theme";

const average = (values: Array<number | null | undefined>) => {
  const valid = values.filter((value): value is number => typeof value === "number");
  return valid.length ? (valid.reduce((sum, value) => sum + value, 0) / valid.length).toFixed(1) : "—";
};

export default function WellbeingScreen() {
  const [mood, setMood] = useState(3); const [energy, setEnergy] = useState(3); const [stress, setStress] = useState(3);
  const [sleepHours, setSleepHours] = useState(7); const [note, setNote] = useState(""); const [entries, setEntries] = useState<WellbeingEntry[]>([]);
  const load = useCallback(() => { getRecentWellbeingEntries().then(setEntries); }, []); useFocusEffect(load);
  const averages = useMemo(() => ({ mood: average(entries.map((entry) => entry.mood)), energy: average(entries.map((entry) => entry.energy)), sleep: average(entries.map((entry) => entry.sleepHours)) }), [entries]);
  const save = async () => {
    await saveWellbeingEntry({ mood, energy, stress, sleepHours, note });
    await toggleHabit("checkin", dateKey()); setNote(""); load();
    Alert.alert("Chequeo guardado", "Tu registro privado se añadió a tus tendencias.");
  };
  return <Screen><ScrollView contentContainerStyle={AppTheme.content}>
    <Text style={AppTheme.eyebrow}>PATRONES PERSONALES</Text><Text style={AppTheme.title}>Bienestar</Text>
    <Card title="Chequeo de hoy">
      <Text style={AppTheme.label}>Estado de ánimo</Text><SegmentedControl value={mood} onChange={setMood} options={[1, 2, 3, 4, 5]} />
      <Text style={AppTheme.label}>Energía disponible</Text><SegmentedControl value={energy} onChange={setEnergy} options={[1, 2, 3, 4, 5]} />
      <Text style={AppTheme.label}>Estrés percibido</Text><SegmentedControl value={stress} onChange={setStress} options={[1, 2, 3, 4, 5]} />
      <Input label="Horas de sueño" value={String(sleepHours)} onChangeText={(value) => setSleepHours(Number(value.replace(",", ".")) || 0)} keyboardType="decimal-pad" />
      <Input label="Nota opcional" value={note} onChangeText={setNote} multiline placeholder="Qué influyó hoy, una victoria o algo a observar" />
      <Button title="Guardar chequeo" onPress={save} />
    </Card>
    <Card title="Pulso reciente"><View style={AppTheme.metricGrid}><Metric label="Ánimo medio" value={`${averages.mood}/5`} /><Metric label="Energía media" value={`${averages.energy}/5`} /><Metric label="Sueño medio" value={`${averages.sleep} h`} /><Metric label="Registros" value={String(entries.length)} /></View></Card>
    <Card title="Historial">{entries.length ? entries.map((entry) => <ListRow key={entry.id} title={`Ánimo ${entry.mood}/5 · energía ${entry.energy ?? "—"}/5`} detail={`${entry.sleepHours ?? "—"} h sueño · estrés ${entry.stress ?? "—"}/5${entry.note ? ` · ${entry.note}` : ""}`} value={entry.date} />) : <Text style={AppTheme.body}>Tus chequeos aparecerán aquí para ver tendencias, no para juzgar días aislados.</Text>}</Card>
    <Text style={AppTheme.hint}>Una herramienta de autoconocimiento no sustituye apoyo profesional. Ante una urgencia, contacta los servicios de emergencia de tu zona.</Text>
  </ScrollView></Screen>;
}
