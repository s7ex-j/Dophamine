# Contribuir a Dophamine

Gracias por mejorar Dophamine. El proyecto prioriza claridad, privacidad y baja friccion sobre acumular funciones.

## Principios

- Mantener el funcionamiento offline-first.
- No incorporar telemetria, anuncios ni servicios remotos por defecto.
- Tratar peso, nutricion y bienestar como datos sensibles.
- Separar interfaz, dominio y persistencia en modulos pequenos y claros.
- No presentar estimaciones como diagnostico o recomendacion clinica.
- No redistribuir imagenes o GIFs de ejercicios sin una licencia verificable.

## Flujo de trabajo

1. Abre un issue para cambios grandes o para discutir la direccion del producto.
2. Crea una rama descriptiva desde `main`.
3. Mantiene el cambio acotado y actualiza documentacion cuando altere un flujo.
4. Ejecuta `npm ci` y `npm run typecheck`.
5. Abre un pull request con contexto, pruebas realizadas y capturas cuando cambie la interfaz.

## Convenciones

- Las pantallas viven en `app/`; el dominio en `src/features/<modulo>`.
- Mantiene los repositorios de datos en `src/db/` y evita SQL en componentes.
- Prefiere datos estructurados a texto parseado manualmente.
- Respeta el idioma de cada archivo y evita reformateos masivos ajenos al cambio.
- Incluye estados vacios, carga y error cuando una pantalla lo necesite.

## Reportar problemas

No adjuntes datos personales, registros de salud completos ni capturas que los muestren. Describe pasos para reproducir, resultado esperado, resultado actual, plataforma y version de la app.
