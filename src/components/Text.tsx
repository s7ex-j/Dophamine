import { createContext, forwardRef, useContext, type ComponentRef } from "react";
import {
  StyleSheet,
  Text as NativeText,
  TextInput as NativeTextInput,
  type StyleProp,
  type TextInputProps,
  type TextProps,
  type TextStyle,
} from "react-native";

import { fontFor } from "@/src/theming/fonts";

// Un texto dentro de otro hereda la letra del de afuera salvo que pida otro peso o tamaño.
const InsideText = createContext(false);

function withFont(style: StyleProp<TextStyle>, nested: boolean): StyleProp<TextStyle> {
  const flat = (StyleSheet.flatten(style) ?? {}) as TextStyle;
  if (nested && flat.fontWeight === undefined && flat.fontFamily === undefined && flat.fontSize === undefined)
    return style;
  // El peso ya va en la familia; dejarlo engordaría la letra a la fuerza.
  return [
    style,
    { fontFamily: fontFor(flat.fontFamily, flat.fontWeight, flat.fontSize), fontWeight: "normal" },
  ];
}

/** `Text` de React Native con la tipografía de la app. Se usa en lugar del de "react-native". */
export const Text = forwardRef<ComponentRef<typeof NativeText>, TextProps>(function Text(props, ref) {
  const nested = useContext(InsideText);
  const size = (StyleSheet.flatten(props.style) as TextStyle | undefined)?.fontSize ?? 0;
  // Con texto grande del sistema, las cifras enormes crecen menos para no romper la pantalla; el resto
  // del texto crece todo lo que la persona pidió.
  const cap =
    size >= 28 && props.maxFontSizeMultiplier === undefined ? { maxFontSizeMultiplier: 1.25 } : null;
  const text = <NativeText {...cap} {...props} ref={ref} style={withFont(props.style, nested)} />;
  return nested ? text : <InsideText.Provider value>{text}</InsideText.Provider>;
});

/** `TextInput` de React Native con la tipografía de la app. */
export const TextInput = forwardRef<ComponentRef<typeof NativeTextInput>, TextInputProps>(
  function TextInput(props, ref) {
    return <NativeTextInput {...props} ref={ref} style={withFont(props.style, false)} />;
  },
);
