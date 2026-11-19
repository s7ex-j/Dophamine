import { useEffect, useRef, useState } from "react";
import type * as Speech from "expo-speech-recognition";

// Dictar lo que se busca (variante web: dictation.web.ts). Solo con reconocimiento dentro del
// teléfono (`requiresOnDeviceRecognition`): la voz no sale del dispositivo. Si el teléfono no lo
// permite, el botón no aparece y queda el micrófono del teclado.

const speech = (): typeof Speech | null => {
  try {
    return require("expo-speech-recognition") as typeof Speech;
  } catch {
    return null;
  }
};

const onDevice = () => {
  try {
    return speech()?.ExpoSpeechRecognitionModule.supportsOnDeviceRecognition() === true;
  } catch {
    return false;
  }
};

/** Dictado en español: `onText` recibe lo que se va entendiendo (y lo final al terminar). */
export function useDictation(onText: (text: string) => void) {
  const [available] = useState(onDevice);
  const [listening, setListening] = useState(false);
  const [error, setError] = useState("");
  const callback = useRef(onText);
  callback.current = onText;

  useEffect(() => {
    const module = available ? speech()?.ExpoSpeechRecognitionModule : null;
    if (!module) return;
    const subscriptions = [
      module.addListener("result", (event) => {
        const text = event.results[0]?.transcript;
        if (text) callback.current(text.trim());
      }),
      module.addListener("end", () => setListening(false)),
      module.addListener("error", (event) => {
        setListening(false);
        if (event.error !== "aborted" && event.error !== "no-speech")
          setError("No te entendí. Prueba otra vez o escribe.");
      }),
    ];
    return () => subscriptions.forEach((subscription) => subscription.remove());
  }, [available]);

  const start = async () => {
    const module = speech()?.ExpoSpeechRecognitionModule;
    if (!module) return;
    setError("");
    const permission = await module.requestPermissionsAsync();
    if (!permission.granted) return setError("Sin permiso para usar el micrófono.");
    setListening(true);
    module.start({
      lang: "es-419",
      interimResults: true,
      continuous: false,
      requiresOnDeviceRecognition: true,
    });
  };
  const stop = () => speech()?.ExpoSpeechRecognitionModule.stop();

  return { available, listening, error, start, stop };
}
