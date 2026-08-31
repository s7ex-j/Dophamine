# Dophamine

Aplicación offline-first para sostener un plan de nutrición, entrenamiento y
bienestar sin convertir cada día en una hoja de cálculo. Dophamine registra
totales diarios de macros, estima el gasto energético desde la tendencia de
peso y propone ajustes semanales pequeños y explicables.

## Qué hace

- Configura un plan inicial con calorías y macros según objetivo y actividad.
- Registra peso y totales diarios: calorías, proteína, carbohidratos y grasas.
- Separa el peso puntual de una tendencia suavizada.
- Estima TDEE cuando existen al menos 14 días y 10 días con ingesta registrada.
- Muestra adherencia, entrenamiento, cardio y bienestar desde una pantalla diaria.
- Funciona sin cuenta: SQLite en móvil y almacenamiento local en la web.

## Principio de nutrición

Dophamine no requiere registrar cada alimento. El flujo principal es introducir
los totales del día y observar su relación con el peso tendencia. Un catálogo de
alimentos detallado será opcional, no un requisito para que el plan funcione.

## Desarrollo

```powershell
npm install
npm run typecheck
npm run web
```

La previsualización web usa `localStorage`; no comparte datos con la base SQLite
de Android o iOS.

## Arquitectura

```text
app/                 Rutas y pantallas de Expo Router
src/db/              SQLite nativo y adaptador web
src/features/        Dominio: biometría, TDEE, perfil, ejercicios y bienestar
src/components/      Componentes reutilizables de interfaz
docs/                Arquitectura y proceso de publicación
```

## Estado del proyecto

`0.2.0` incorpora onboarding, macros, análisis de peso e ingesta, TDEE dinámico,
entrenamiento y bienestar. Pendiente: gráficos interactivos avanzados, edición
de series/cargas, plantillas de comidas, importación de datos y sincronización
cifrada opcional.

## Privacidad y límites

Los datos permanecen en el dispositivo. La app ofrece estimaciones y seguimiento
personal; no diagnostica, trata ni sustituye atención profesional.

Consulta [NOTICE.md](NOTICE.md) antes de importar fuentes externas de ejercicios
o medios. Los GIFs de terceros no forman parte de este repositorio.

## Publicación

El repositorio incluye comprobación de tipos y workflow de GitHub Pages. Revisa
[docs/RELEASING.md](docs/RELEASING.md) para web, APK de pruebas y tiendas.

## Licencia

MIT. Consulta [LICENSE](LICENSE).

