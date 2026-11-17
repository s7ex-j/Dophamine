import jsQR from "jsqr";
import { createElement, useEffect, useRef, useState } from "react";
import { Text, View } from "react-native";

import { Button } from "@/src/components/ui";
import { AppTheme } from "@/src/theme";

// Variante web: lee el QR con la cámara del equipo. Cada cuadro se decodifica en
// el navegador (jsQR); la imagen no se guarda ni se envía a ningún lado.
export function QrScanner({
  onCode,
  onClose,
  hint,
}: {
  onCode: (code: string) => void;
  onClose: () => void;
  hint: string;
}) {
  const video = useRef<HTMLVideoElement | null>(null);
  const report = useRef(onCode);
  report.current = onCode;
  const [error, setError] = useState("");

  useEffect(() => {
    let stream: MediaStream | null = null;
    let frame = 0;
    let stopped = false;
    const canvas = document.createElement("canvas");
    const tick = () => {
      if (stopped) return;
      const element = video.current;
      if (element && element.readyState >= 2 && element.videoWidth) {
        const scale = Math.min(1, 720 / element.videoWidth);
        const width = Math.round(element.videoWidth * scale);
        const height = Math.round(element.videoHeight * scale);
        canvas.width = width;
        canvas.height = height;
        const context = canvas.getContext("2d", { willReadFrequently: true });
        if (context) {
          context.drawImage(element, 0, 0, width, height);
          const result = jsQR(context.getImageData(0, 0, width, height).data, width, height);
          // Solo sirven los códigos de conexión de Dophamine; cualquier otro QR se ignora.
          if (result?.data.startsWith("D1|")) {
            stopped = true;
            report.current(result.data);
            return;
          }
        }
      }
      frame = requestAnimationFrame(tick);
    };
    if (!navigator.mediaDevices?.getUserMedia) {
      setError("Este navegador no permite usar la cámara aquí. Pega el código en el campo de abajo.");
      return;
    }
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: "environment" }, audio: false })
      .then((media) => {
        if (stopped) {
          media.getTracks().forEach((track) => track.stop());
          return;
        }
        stream = media;
        if (video.current) {
          video.current.srcObject = media;
          video.current.play().catch(() => undefined);
        }
        tick();
      })
      .catch(() =>
        setError("No se pudo usar la cámara. Revisa el permiso del navegador o pega el código abajo."),
      );
    return () => {
      stopped = true;
      cancelAnimationFrame(frame);
      stream?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  return (
    <View style={{ gap: 10 }}>
      {error ? (
        <Text style={AppTheme.errorText}>{error}</Text>
      ) : (
        <View style={AppTheme.scannerFrame}>
          {createElement("video", {
            ref: video,
            muted: true,
            playsInline: true,
            style: { width: "100%", height: "100%", objectFit: "cover" },
          })}
        </View>
      )}
      <Text style={AppTheme.hint}>{hint}</Text>
      <Button title="Cerrar cámara" variant="secondary" onPress={onClose} />
    </View>
  );
}
