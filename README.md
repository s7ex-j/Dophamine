# Dophamine

Aplicación móvil offline-first para registrar entrenamiento, biometría, ingesta y bienestar personal.

## Inicio

1. Instala dependencias con `npm install`.
2. Ejecuta `npm run start`.
3. Abre el proyecto con Expo Go o un emulador Android/iOS.

## Estructura

- `app/`: rutas y pantallas con Expo Router.
- `src/db/`: inicialización y migraciones de SQLite.
- `src/features/`: lógica de dominio aislada por módulo.
- `src/components/`: componentes de interfaz reutilizables.

Los registros se guardan en SQLite local. La sincronización y autenticación no se incluyen todavía: antes de incorporarlas hay que decidir el modelo de cifrado y recuperación de claves.

