import { useCallback, useState } from "react";
import { Alert, ScrollView, Text } from "react-native";
import { useFocusEffect } from "expo-router";
import { Button, Card, ListRow, Screen } from "@/src/components/ui";
import { completePosteriorWorkout, getRecentWorkouts, type Workout } from "@/src/features/training/training.repository";
import { POSTERIOR_CHAIN_EXERCISES } from "@/src/features/exercises/exercise.catalog";
import { AppTheme } from "@/src/theme";

export default function TrainingScreen() {
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const load = useCallback(() => { getRecentWorkouts().then(setWorkouts); }, []);
  useFocusEffect(load);
  const complete = async () => { await completePosteriorWorkout(); load(); Alert.alert("Sesión guardada", "Registramos la rutina y sus cuatro ejercicios."); };
  return <Screen><ScrollView contentContainerStyle={AppTheme.content}>
    <Text style={AppTheme.title}>Entrenamiento</Text>
    <Card title="Rutina A · cadena posterior"><Text style={AppTheme.body}>Hip thrust · Peso muerto rumano · Curl femoral · Plancha</Text><Button title="Registrar rutina completada" onPress={complete} /></Card>
    <Card title="Zona 2"><Text style={AppTheme.body}>Cardio sostenido y conversacional. Registra duración y sensación al terminar.</Text></Card>
    <Card title="Biblioteca de ejercicios">
      {POSTERIOR_CHAIN_EXERCISES.map((exercise) => <ListRow key={exercise.id} title={exercise.name} detail={`${exercise.target} · ${exercise.equipment}`} value={exercise.category === "cardio" ? "Cardio" : "Fuerza"} />)}
    </Card>
    <Card title="Sesiones recientes">{workouts.length ? workouts.map((workout) => <ListRow key={workout.id} title={workout.name} detail="4 ejercicios registrados" value={workout.completedAt.slice(0, 10)} />) : <Text style={AppTheme.body}>Todavía no hay sesiones registradas.</Text>}</Card>
    <Text style={AppTheme.hint}>Cada rutina queda guardada localmente con sus ejercicios. El siguiente paso será registrar series, carga y repeticiones.</Text>
  </ScrollView></Screen>;
}

