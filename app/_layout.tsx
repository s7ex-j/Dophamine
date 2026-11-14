import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";

import { initializeDatabase } from "@/src/db/database";
import { configureNotifications } from "@/src/features/reminders/scheduler";
import { AppTheme } from "@/src/theme";

export default function RootLayout() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    configureNotifications();
    initializeDatabase().finally(() => setReady(true));
  }, []);

  if (!ready) {
    return (
      <View style={AppTheme.loading}>
        <ActivityIndicator color={AppTheme.colors.accent} />
      </View>
    );
  }

  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: AppTheme.colors.background },
          headerStyle: { backgroundColor: AppTheme.colors.background },
          headerShadowVisible: false,
          headerTintColor: AppTheme.colors.accent,
          headerTitleStyle: { color: AppTheme.colors.text, fontWeight: "700" },
          headerBackTitle: "Atrás",
        }}
      >
        <Stack.Screen name="(tabs)" />
        {/* Pantallas que se abren encima de las pestañas, con botón de volver. */}
        <Stack.Screen name="add-food" options={{ headerShown: true, title: "Agregar alimento" }} />
        <Stack.Screen name="insight" options={{ headerShown: true, title: "Análisis" }} />
        <Stack.Screen name="edit-entry" options={{ headerShown: true, title: "Editar alimento" }} />
        <Stack.Screen name="session" options={{ headerShown: true, title: "Entreno en curso" }} />
        <Stack.Screen name="exercise" options={{ headerShown: true, title: "Ejercicio" }} />
        <Stack.Screen name="catalog" options={{ headerShown: true, title: "Ejercicios" }} />
        <Stack.Screen name="routine" options={{ headerShown: true, title: "Mi rutina" }} />
        <Stack.Screen name="gyms" options={{ headerShown: true, title: "Dónde entrenas" }} />
        <Stack.Screen name="achievements" options={{ headerShown: true, title: "Racha y logros" }} />
        <Stack.Screen name="photos" options={{ headerShown: true, title: "Fotos de progreso" }} />
        <Stack.Screen name="algorithm" options={{ headerShown: true, title: "Cómo se calcula" }} />
        <Stack.Screen name="measurements" options={{ headerShown: true, title: "Medidas corporales" }} />
        <Stack.Screen name="nutrients" options={{ headerShown: true, title: "Nutrientes" }} />
        <Stack.Screen name="reminders" options={{ headerShown: true, title: "Recordatorios" }} />
        <Stack.Screen name="analysis" options={{ headerShown: true, title: "Análisis" }} />
        <Stack.Screen name="habits" options={{ headerShown: true, title: "Hábitos" }} />
        <Stack.Screen name="wellbeing" options={{ headerShown: true, title: "Bienestar" }} />
      </Stack>
    </>
  );
}
