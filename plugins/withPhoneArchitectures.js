// El APK solo lleva el código nativo de los teléfonos reales (arm64 y armv7), no el de los emuladores
// (x86 y x86_64). Así pesa menos de la mitad. Dos partes: lo que compila React Native
// (gradle.properties) y las librerías que ya vienen compiladas, como WebRTC (filtro de ABI de la app).
const { withAppBuildGradle, withGradleProperties } = require("@expo/config-plugins");

const ABIS = ["armeabi-v7a", "arm64-v8a"];
const MARK = "// Dophamine: solo arquitecturas de teléfono";

const withArchitectureProperty = (config) =>
  withGradleProperties(config, (config) => {
    config.modResults = config.modResults.filter(
      (item) => !(item.type === "property" && item.key === "reactNativeArchitectures"),
    );
    config.modResults.push({ type: "property", key: "reactNativeArchitectures", value: ABIS.join(",") });
    return config;
  });

const withAbiFilter = (config) =>
  withAppBuildGradle(config, (config) => {
    if (config.modResults.contents.includes(MARK)) return config;
    config.modResults.contents = config.modResults.contents.replace(
      /defaultConfig\s*\{/,
      (match) => `${match}\n        ${MARK}\n        ndk { abiFilters ${ABIS.map((abi) => `"${abi}"`).join(", ")} }`,
    );
    return config;
  });

module.exports = function withPhoneArchitectures(config) {
  return withAbiFilter(withArchitectureProperty(config));
};
