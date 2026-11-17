import { registerGlobals } from "react-native-webrtc";

/**
 * Registra RTCPeerConnection y compañía como globales, para que la conexión
 * directa (peer.ts) funcione igual que en el navegador. Solo en la app
 * instalada: en Expo Go el módulo nativo no existe y se sigue sin conexión.
 */
export function enableWebRTC() {
  try {
    registerGlobals();
  } catch {
    // Sin el módulo nativo (Expo Go): la pantalla de conexión lo explica.
  }
}
