# Contribuir a Balance

## Principios

- Mantener el funcionamiento offline-first.
- No incorporar telemetría ni servicios remotos por defecto.
- Tratar los datos de bienestar como información sensible.
- Separar la interfaz, el dominio y la persistencia en módulos claros.

## Desarrollo

1. Instala las dependencias: `npm install`.
2. Inicia Expo: `npm run start`.
3. Antes de abrir una solicitud de cambios, ejecuta `npm run typecheck`.

Las nuevas funciones deben vivir en `src/features/<modulo>` y sus pantallas en `app/`.

