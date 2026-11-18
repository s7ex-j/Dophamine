import { CameraView, useCameraPermissions } from "expo-camera";
import { useRef } from "react";
import { View } from "react-native";
import { Text } from "@/src/components/Text";

import { Button } from "@/src/components/ui";
import { AppTheme } from "@/src/theme";

// Variante para Android e iOS: lee el QR de conexión con la cámara del teléfono.
// La imagen no se guarda; solo se usa el texto del código.
export function QrScanner({
  onCode,
  onClose,
  hint,
}: {
  onCode: (code: string) => void;
  onClose: () => void;
  hint: string;
}) {
  const [permission, requestPermission] = useCameraPermissions();
  const handled = useRef(false);

  if (!permission) return null;
  if (!permission.granted)
    return (
      <View style={{ gap: 10 }}>
        <Text style={AppTheme.body}>
          Para leer el código QR la app necesita usar la cámara. La imagen no se guarda.
        </Text>
        <Button title="Permitir cámara" onPress={requestPermission} />
        <Button title="Cancelar" variant="secondary" onPress={onClose} />
      </View>
    );

  return (
    <View style={{ gap: 10 }}>
      <View style={AppTheme.scannerFrame}>
        <CameraView
          style={{ flex: 1 }}
          facing="back"
          barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
          onBarcodeScanned={({ data }) => {
            // Solo sirven los códigos de conexión de Dophamine; cualquier otro QR se ignora.
            if (handled.current || !data.startsWith("D2|")) return;
            handled.current = true;
            onCode(data);
          }}
        />
      </View>
      <Text style={AppTheme.hint}>{hint}</Text>
      <Button title="Cerrar cámara" variant="secondary" onPress={onClose} />
    </View>
  );
}
