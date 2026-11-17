// Importar un archivo como texto (`archivo?raw`): lo resuelve Vite/Vitest. Solo se usa en pruebas.
declare module "*?raw" {
  const text: string;
  export default text;
}
