# Contribuir a Dophamine

Gracias por mejorar Dophamine. El proyecto prioriza claridad, privacidad y baja fricción sobre acumular funciones.

## Principios

- Mantener el funcionamiento offline-first.
- No incorporar telemetría, anuncios ni servicios remotos por defecto.
- Tratar peso, nutrición y bienestar como datos sensibles.
- Separar interfaz, dominio y persistencia en módulos pequeños y claros.
- No presentar estimaciones como diagnóstico o recomendación clínica.
- No redistribuir imágenes o GIFs de ejercicios sin una licencia verificable.

## Flujo de trabajo

1. Abre un issue para cambios grandes o para discutir la dirección del producto.
2. Crea una rama descriptiva desde `main`.
3. Mantén el cambio acotado y actualiza la documentación cuando altere un flujo.
4. Ejecuta `npm ci`, `npm run typecheck`, `npm test` y `npm run format:check`.
5. Abre un pull request con contexto, pruebas realizadas y capturas cuando cambie la interfaz.

## Convenciones

- Las pantallas viven en `app/`; el dominio en `src/features/<modulo>`.
- La conexión vive en `src/db/` y el acceso a datos en los `*.repository.ts` de cada módulo; nada de SQL en componentes.
- Prefiere datos estructurados a texto parseado manualmente.
- Respeta el idioma de cada archivo y evita reformateos masivos ajenos al cambio.
- Incluye estados vacíos, carga y error cuando una pantalla lo necesite.

## Licencia de las contribuciones

Dophamine se publica bajo la GNU General Public License, versión 3 únicamente (GPL-3.0-only). Al enviar una contribución aceptas que se publique bajo esa misma licencia. No se pide ceder derechos ni firmar un acuerdo de contribución (CLA).

Cada commit debe llevar una línea `Signed-off-by` con tu nombre y correo, que certifica el [Developer Certificate of Origin](https://developercertificate.org/) (DCO): que escribiste el cambio o tienes derecho a enviarlo bajo la licencia del proyecto. Se agrega con `git commit -s`.

El nombre "Dophamine", "Term" y sus ilustraciones siguen la [política de marca](TRADEMARK.md).

## Reportar problemas

No adjuntes datos personales, registros de salud completos ni capturas que los muestren. Describe pasos para reproducir, resultado esperado, resultado actual, plataforma y versión de la app.
