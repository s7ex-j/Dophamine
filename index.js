// Punto de entrada: en Android registra el widget de la pantalla de inicio y luego arranca la app.
import { Platform } from "react-native";

if (Platform.OS === "android") {
  const { registerWidgetTaskHandler } = require("react-native-android-widget");
  registerWidgetTaskHandler(require("./src/features/widget/widgetTask").widgetTaskHandler);
}

require("expo-router/entry");
