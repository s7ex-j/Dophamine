import { useState } from "react";
import { Alert, ScrollView, Text } from "react-native";
import { Button, Card, Input, Screen } from "@/src/components/ui";
import { saveWellbeingEntry } from "@/src/features/wellbeing/wellbeing.repository";
import { AppTheme } from "@/src/theme";

export default function WellbeingScreen() {
  const [mood, setMood] = useState("3");
  const [note, setNote] = useState("");
  const save = async () => {
    const score = Number(mood);
    if (!Number.isInteger(score) || score < 1 || score > 5) return Alert.alert("Estado inválido", "Elige un valor entero del 1 al 5.");
    await saveWellbeingEntry({ mood: score, note });
    setNote("");
    Alert.alert("Guardado", "Tu nota quedó almacenada localmente.");
  };
  return <Screen><ScrollView contentContainerStyle={AppTheme.content}>
    <Text style={AppTheme.title}>Bienestar</Text>
    <Card title="Chequeo privado"><Input label="Estado de ánimo (1-5)" value={mood} onChangeText={setMood} keyboardType="number-pad" /><Input label="Nota opcional" value={note} onChangeText={setNote} multiline /><Button title="Guardar chequeo" onPress={save} /></Card>
    <Text style={AppTheme.hint}>Esta sección sirve para observar patrones personales; no sustituye el acompañamiento profesional. Ante una urgencia, contacta a los servicios de emergencia de tu zona.</Text>
  </ScrollView></Screen>;
}

