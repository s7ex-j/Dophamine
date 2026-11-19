// Declara el permiso de "Acceso al uso" (PACKAGE_USAGE_STATS). Es un permiso especial: Android no lo
// pregunta en una ventana; la persona lo activa en Ajustes. `tools:ignore` evita el aviso de permiso
// protegido al compilar.
const { withAndroidManifest } = require("@expo/config-plugins");

module.exports = function withUsageAccess(config) {
  return withAndroidManifest(config, (config) => {
    const manifest = config.modResults.manifest;
    manifest.$["xmlns:tools"] = manifest.$["xmlns:tools"] ?? "http://schemas.android.com/tools";
    const permissions = (manifest["uses-permission"] = manifest["uses-permission"] ?? []);
    const name = "android.permission.PACKAGE_USAGE_STATS";
    if (!permissions.some((item) => item.$["android:name"] === name))
      permissions.push({ $: { "android:name": name, "tools:ignore": "ProtectedPermissions" } });
    return config;
  });
};
