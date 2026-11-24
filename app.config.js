// La configuración está en app.json. Aquí solo cambia la dirección de la web instalable (PWA), que se
// publica aparte del visor: `EXPO_PUBLIC_PWA=1` la compila para /Dophamine/pwa.
module.exports = ({ config }) =>
  process.env.EXPO_PUBLIC_PWA === "1"
    ? { ...config, experiments: { ...config.experiments, baseUrl: "/Dophamine/pwa" } }
    : config;
