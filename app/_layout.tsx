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
    return <View style={AppTheme.loading}><ActivityIndicator color={AppTheme.colors.accent} /></View>;
  }

  return (
    <>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: AppTheme.colors.background } }} />
    </>
  );
}

