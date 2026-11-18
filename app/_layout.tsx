import { Stack, useRouter, type ErrorBoundaryProps } from "expo-router";
import { onThemeChange, takeReturnPath } from "@/src/theming/live";
import { LAUNCH_MIN_MS, LaunchScreen } from "@/src/components/LaunchScreen";
import { useFonts } from "expo-font";
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useState } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import { ErrorScreen } from "@/src/components/ErrorScreen";
import { initializeDatabase } from "@/src/db/database";
import { configureNotifications } from "@/src/features/reminders/scheduler";
import { enableWebRTC } from "@/src/features/link/webrtc";
import { AppTheme, THEME } from "@/src/theme";
import { FONTS } from "@/src/theming/fonts";
import { FONT_FILES } from "@/src/theming/fontFiles";

enableWebRTC();

/** Si una pantalla falla, se muestra un aviso con "Reintentar" en lugar de una pantalla en blanco. */
export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  return <ErrorScreen message={`${error.name}: ${error.message}`} onRetry={retry} />;
}

export default function RootLayout() {
  const [ready, setReady] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  // Cambiar de tema vuelve a montar la navegación con los colores nuevos, sin reiniciar la app.
  const [themeVersion, setThemeVersion] = useState(0);
  const router = useRouter();
  // Si una fuente no carga, la app sigue con la letra del sistema en lugar de quedarse esperando.
  const [fontsLoaded, fontError] = useFonts(FONT_FILES);
  const fontsReady = fontsLoaded || Boolean(fontError);
  // La pantalla de carga dura lo que dura la carga real, con un mínimo para que no parpadee.
  const [minElapsed, setMinElapsed] = useState(false);
  const [launchGone, setLaunchGone] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setMinElapsed(true), LAUNCH_MIN_MS);
    return () => clearTimeout(timer);
  }, []);
  const hideLaunch = useCallback(() => setLaunchGone(true), []);
  useEffect(() => onThemeChange(() => setThemeVersion((version) => version + 1)), []);
  useEffect(() => {
    const path = takeReturnPath();
    if (path && path !== "/") setTimeout(() => router.navigate(path as never), 0);
  }, [themeVersion, router]);

  useEffect(() => {
    configureNotifications();
    // Si la base de datos no abre, mejor decirlo que seguir y fallar en cada pantalla.
    initializeDatabase()
      .then(() => setReady(true))
      .catch((error: unknown) => setFailure(error instanceof Error ? error.message : String(error)));
  }, [attempt]);

  if (failure)
    return (
      <ErrorScreen
        message={failure}
        onRetry={() => {
          setFailure(null);
          setLaunchGone(false);
          setAttempt(attempt + 1);
        }}
      />
    );

  const appReady = ready && fontsReady;
  const launch = launchGone ? null : (
    <LaunchScreen
      progress={(ready ? 0.5 : 0) + (fontsReady ? 0.5 : 0)}
      fontsReady={fontsReady}
      done={appReady && minElapsed}
      onHidden={hideLaunch}
    />
  );
  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: AppTheme.colors.background }}>
      <StatusBar style={THEME === "light" ? "dark" : "light"} />
      {/* La navegación se monta debajo de la pantalla de carga cuando todo está listo. */}
      {appReady ? (
        <Stack
          key={themeVersion}
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: AppTheme.colors.background },
            headerStyle: { backgroundColor: AppTheme.colors.background },
            headerShadowVisible: false,
            headerTintColor: AppTheme.colors.accent,
            headerTitleStyle: { color: AppTheme.colors.text, fontFamily: FONTS.text700, fontSize: 17 },
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
          <Stack.Screen name="period" options={{ headerShown: true, title: "Ciclo menstrual" }} />
          <Stack.Screen name="library" options={{ headerShown: true, title: "Biblioteca" }} />
          <Stack.Screen name="meals" options={{ headerShown: true, title: "Comidas" }} />
          <Stack.Screen name="diet" options={{ headerShown: true, title: "Mi dieta" }} />
          <Stack.Screen name="link" options={{ headerShown: true, title: "Conexión directa" }} />
          <Stack.Screen name="health" options={{ headerShown: true, title: "Salud y restricciones" }} />
          <Stack.Screen name="cleanup" options={{ headerShown: true, title: "Borrar datos" }} />
          <Stack.Screen name="achievements" options={{ headerShown: true, title: "Racha y logros" }} />
          <Stack.Screen name="week-share" options={{ headerShown: true, title: "Compartir mi semana" }} />
          <Stack.Screen name="challenges" options={{ headerShown: true, title: "Retos de 21 días" }} />
          <Stack.Screen name="photos" options={{ headerShown: true, title: "Fotos de progreso" }} />
          <Stack.Screen name="algorithm" options={{ headerShown: true, title: "Cómo se calcula" }} />
          <Stack.Screen name="measurements" options={{ headerShown: true, title: "Medidas corporales" }} />
          <Stack.Screen name="nutrients" options={{ headerShown: true, title: "Nutrientes" }} />
          <Stack.Screen name="reminders" options={{ headerShown: true, title: "Recordatorios" }} />
          <Stack.Screen name="analysis" options={{ headerShown: true, title: "Análisis" }} />
          <Stack.Screen name="habits" options={{ headerShown: true, title: "Hábitos" }} />
          <Stack.Screen name="wellbeing" options={{ headerShown: true, title: "Bienestar" }} />
        </Stack>
      ) : null}
      {launch}
    </GestureHandlerRootView>
  );
}
