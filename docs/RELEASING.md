# Publicar Dophamine

## Web

El workflow `deploy-web.yml` compila la web estática y la publica en GitHub Pages
cuando Pages esté configurado para usar GitHub Actions. La URL final será:

`https://s7ex-j.github.io/Dophamine/`

## APK de Android (uno solo, siempre el último)

Hay **un solo APK publicado**: el de la última versión, adjunto a su GitHub Release con el nombre fijo
`dophamine.apk`. El sitio y el README enlazan a `releases/latest/download/dophamine.apk`, que siempre
apunta al último. Por eso cada versión nueva que se publique lleva su APK:

1. `npx eas-cli build --platform android --profile preview --non-interactive --no-wait` (perfil `preview`:
   la app completa adentro, no un development build). La fila gratuita tarda unos 40 minutos.
2. Al terminar, descarga el APK y súbelo a la release nueva: `gh release upload vX.Y.Z dophamine.apk`.
3. Borra el APK de la release anterior: `gh release delete-asset vX.Y.Z-anterior dophamine.apk --yes`.

Hasta que el APK esté subido, el enlace de descarga apunta a una release sin archivo: publica la release
de GitHub cuando el APK ya esté listo, o súbelo en cuanto termine.

## Tiendas

Google Play necesita un AAB de `production`, una cuenta de Google Play Developer,
política de privacidad, ficha de la app y capturas. Apple requiere una cuenta Apple
Developer y distribución mediante TestFlight/App Store.

No publiques una build de producción hasta validar la política de privacidad y el
comportamiento del algoritmo con datos reales.
