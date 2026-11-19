// Variante web: el dictado propio solo existe en el teléfono. Mismas funciones que la nativa.
export function useDictation(_onText: (text: string) => void) {
  return {
    available: false,
    listening: false,
    error: "",
    start: async () => undefined,
    stop: () => undefined,
  };
}
