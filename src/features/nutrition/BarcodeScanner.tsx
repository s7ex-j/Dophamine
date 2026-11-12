import { CameraView, useCameraPermissions } from "expo-camera";
import { useRef } from "react";
import { Text, View } from "react-native";

import { Button } from "@/src/components/ui";
import { AppTheme } from "@/src/theme";

// Variante para Android e iOS: lee el código de barras con la cámara.
// La imagen no se guarda ni sale del teléfono; solo se usa el número leído.
export const scannerAvailable = true;

export function BarcodeScanner({ onCode, onClose }: { onCode: (code: string) => void; onClose: () => void }) {
  const [permission, requestPermission] = useCameraPermissions();
  // La cámara avisa varias veces por segundo mientras ve el código: solo cuenta la primera.
  const handled = useRef(false);

  if (!permission) return null;
  if (!permission.granted)
    return (
      <View style={{ gap: 10 }}>
        <Text style={AppTheme.body}>
          Para leer códigos de barras la app necesita usar la cámara. La imagen no se guarda.
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
          barcodeScannerSettings={{ barcodeTypes: ["ean13", "ean8", "upc_a", "upc_e"] }}
          onBarcodeScanned={({ data }) => {
            if (handled.current) return;
            handled.current = true;
            onCode(data);
          }}
        />
      </View>
      <Text style={AppTheme.hint}>Apunta al código de barras del envase.</Text>
      <Button title="Cerrar cámara" variant="secondary" onPress={onClose} />
    </View>
  );
}
