import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";

import { initializeDatabase } from "@/src/db/database";
import { AppTheme } from "@/src/theme";

export default function RootLayout() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
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
      <StatusBar style="dark" />
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
        <Stack.Screen name="add-food" options={{ headerShown: true, title: "Agregar comida" }} />
        <Stack.Screen name="analysis" options={{ headerShown: true, title: "Análisis" }} />
        <Stack.Screen name="habits" options={{ headerShown: true, title: "Hábitos" }} />
        <Stack.Screen name="wellbeing" options={{ headerShown: true, title: "Bienestar" }} />
      </Stack>
    </>
  );
}
