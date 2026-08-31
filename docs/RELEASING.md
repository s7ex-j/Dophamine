# Publicar Dophamine

## Web

El workflow `deploy-web.yml` compila la web estática y la publica en GitHub Pages
cuando Pages esté configurado para usar GitHub Actions. La URL final será:

`https://s7ex-j.github.io/Dophamine/`

## Android de prueba

1. Crea una cuenta de Expo y ejecuta `npx eas login`.
2. Ejecuta `npx eas build --platform android --profile preview`.
3. Descarga el APK generado y adjúntalo a una GitHub Release.

## Tiendas

Google Play necesita un AAB de `production`, una cuenta de Google Play Developer,
política de privacidad, ficha de la app y capturas. Apple requiere una cuenta Apple
Developer y distribución mediante TestFlight/App Store.

No publiques una build de producción hasta validar la política de privacidad y el
comportamiento del algoritmo con datos reales.

