// Configuración de Metro: la de Expo, más los modelos de visión (.tflite) como archivos de la app.
const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);
config.resolver.assetExts.push("tflite");

module.exports = config;
