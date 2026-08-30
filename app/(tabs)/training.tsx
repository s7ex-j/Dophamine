import { ScrollView, Text } from "react-native";
import { Button, Card, Screen } from "@/src/components/ui";
import { AppTheme } from "@/src/theme";

export default function TrainingScreen() {
  return <Screen><ScrollView contentContainerStyle={AppTheme.content}>
    <Text style={AppTheme.title}>Entrenamiento</Text>
    <Card title="Rutina A · cadena posterior"><Text style={AppTheme.body}>Hip thrust · Peso muerto rumano · Curl femoral · Plancha</Text><Button title="Iniciar sesión" onPress={() => {}} variant="secondary" /></Card>
    <Card title="Zona 2"><Text style={AppTheme.body}>Cardio sostenido y conversacional. Registra duración y sensación al terminar.</Text></Card>
    <Text style={AppTheme.hint}>La estructura de sesiones y series ya está preparada en la base de datos; el temporizador y editor de rutinas serán el siguiente módulo.</Text>
  </ScrollView></Screen>;
}

