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
    if (!player) {
      player = createAudioPlayer(require("../../assets/sounds/term-beep.wav"));
      // Un pitido amable, no una alarma.
      player.volume = 0.35;
    }
    player.seekTo(0);
    player.play();
  } catch {
    // Sin audio: Term igual reacciona con su animación.
  }
}
