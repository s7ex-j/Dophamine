import { useMemo } from "react";
import { View } from "react-native";
import Svg, { Path, Rect } from "react-native-svg";

import { qrMatrix, qrPath } from "@/src/features/link/qr";

/** Un código QR dibujado en la app, negro sobre blanco para que cualquier cámara lo lea. */
export function QrCode({ value, size = 248 }: { value: string; size?: number }) {
  const { size: modules, d } = useMemo(() => qrPath(qrMatrix(value)), [value]);
  return (
    <View
      accessibilityRole="image"
      accessibilityLabel="Código QR de conexión"
      style={{ alignSelf: "center", backgroundColor: "#FFFFFF", borderRadius: 12, padding: 6 }}
    >
      <Svg width={size} height={size} viewBox={`0 0 ${modules} ${modules}`}>
        <Rect width={modules} height={modules} fill="#FFFFFF" />
        <Path d={d} fill="#000000" />
      </Svg>
    </View>
  );
}
