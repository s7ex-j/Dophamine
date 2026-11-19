import type { PropsWithChildren } from "react";
import { View, type StyleProp, type ViewStyle } from "react-native";
import Svg, { Path } from "react-native-svg";

import { AppTheme } from "@/src/theme";

const TAIL_W = 16;
const TAIL_H = 12;

/**
 * Globo de diálogo: lo que dice alguien (Term). La cola va pegada al globo y apunta abajo a la
 * izquierda, hacia quien habla. (Los circulitos sueltos son de un globo de pensamiento.)
 */
export function SpeechBubble({
  children,
  style,
  tail = "down",
  tailOffset = 18,
}: PropsWithChildren<{
  style?: StyleProp<ViewStyle>;
  /** Hacia dónde está quien habla: abajo (cola abajo a la izquierda) o a la izquierda. */
  tail?: "down" | "left";
  tailOffset?: number;
}>) {
  const fill = AppTheme.colors.surface2;
  const stroke = AppTheme.colors.border;
  return (
    <View style={style}>
      <View
        style={{
          backgroundColor: fill,
          borderColor: stroke,
          borderWidth: 1,
          borderRadius: 16,
          paddingHorizontal: 14,
          paddingVertical: 10,
        }}
      >
        {children}
      </View>
      {/* La cola tapa el borde del globo donde nace, así se ve como una sola pieza. */}
      {tail === "down" ? (
        <Svg
          width={TAIL_W}
          height={TAIL_H + 1}
          style={{ position: "absolute", left: tailOffset, bottom: -TAIL_H }}
          pointerEvents="none"
        >
          <Path d={`M0 0 L${TAIL_W} 0 L1 ${TAIL_H} Z`} fill={fill} />
          <Path d={`M0 0 L1 ${TAIL_H} L${TAIL_W} 0`} stroke={stroke} strokeWidth={1} fill="none" />
        </Svg>
      ) : (
        <Svg
          width={TAIL_H + 1}
          height={TAIL_W}
          style={{ position: "absolute", left: -TAIL_H, top: tailOffset }}
          pointerEvents="none"
        >
          <Path d={`M${TAIL_H + 1} 0 L${TAIL_H + 1} ${TAIL_W} L0 ${TAIL_W - 2} Z`} fill={fill} />
          <Path
            d={`M${TAIL_H + 1} 0 L0 ${TAIL_W - 2} L${TAIL_H + 1} ${TAIL_W}`}
            stroke={stroke}
            strokeWidth={1}
            fill="none"
          />
        </Svg>
      )}
    </View>
  );
}
