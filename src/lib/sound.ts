import { createAudioPlayer, type AudioPlayer } from "expo-audio";

/**
 * El sonido de Term: tres notas cortas, como un pitido de terminal amable
 * (assets/sounds/term-beep.wav, hecho para la app). Se carga una vez y se
 * reproduce desde el principio cada vez. Si el módulo de audio no existe (Expo
 * Go antiguo) o falla, no suena y la app sigue.
 */
let player: AudioPlayer | null = null;

export function playTermSound() {
  try {
    player ??= createAudioPlayer(require("../../assets/sounds/term-beep.wav"));
    player.seekTo(0);
    player.play();
  } catch {
    // Sin audio: Term igual reacciona con su animación.
  }
}
