import { useCallback, useState } from "react";
import { Alert, ScrollView, Text } from "react-native";
import { useFocusEffect } from "expo-router";
import { Button, Card, Input, ListRow, Screen, SegmentedControl } from "@/src/components/ui";
import { getRecentWellbeingEntries, saveWellbeingEntry, type WellbeingEntry } from "@/src/features/wellbeing/wellbeing.repository";
import { AppTheme } from "@/src/theme";

export default function WellbeingScreen() {
  const [mood, setMood] = useState(3);
  const [note, setNote] = useState("");
  const [entries, setEntries] = useState<WellbeingEntry[]>([]);
  const load = useCallback(() => { getRecentWellbeingEntries().then(setEntries); }, []);
  useFocusEffect(load);
  const save = async () => {
    await saveWellbeingEntry({ mood, note });
    setNote("");
    load();
    Alert.alert("Guardado", "Tu nota quedó almacenada localmente.");
  };
  return <Screen><ScrollView contentContainerStyle={AppTheme.content}>
    <Text style={AppTheme.title}>Bienestar</Text>
    <Card title="Chequeo privado"><Text style={AppTheme.label}>Estado de ánimo</Text><SegmentedControl value={mood} onChange={setMood} options={[1, 2, 3, 4, 5]} /><Input label="Nota opcional" value={note} onChangeText={setNote} multiline /><Button title="Guardar chequeo" onPress={save} /></Card>
    <Card title="Historial reciente">{entries.length ? entries.map((entry) => <ListRow key={entry.id} title={`Estado ${entry.mood}/5`} detail={entry.note || entry.date} value={entry.date} />) : <Text style={AppTheme.body}>Tus chequeos privados aparecerán aquí.</Text>}</Card>
    <Text style={AppTheme.hint}>Esta sección sirve para observar patrones personales; no sustituye el acompañamiento profesional. Ante una urgencia, contacta a los servicios de emergencia de tu zona.</Text>
  </ScrollView></Screen>;
}

