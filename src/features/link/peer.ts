import { Assembler, toFrames, type LinkMessage } from "@/src/features/link/protocol";
import { verificationCode } from "@/src/features/link/sha256";
import {
  buildSdp,
  LinkError,
  packSignal,
  readSdp,
  unpackSignal,
  type Signal,
} from "@/src/features/link/signal";

/**
 * El canal directo entre los dos dispositivos (WebRTC, canal de datos).
 *
 * - Sin servidor: no se configura ningún servidor ICE (ni STUN ni TURN), así que
 *   solo conecta dentro de la misma red local. La señalización viaja en dos
 *   códigos QR (`signal.ts`).
 * - Cifrado: todo canal de datos WebRTC va cifrado con DTLS de extremo a
 *   extremo. La huella del certificado de cada lado viaja en su QR, así que el
 *   canal solo se abre con el dispositivo que mostró ese código.
 *
 * En la web usa el WebRTC del navegador. En el teléfono hace falta que la app
 * instalada registre `RTCPeerConnection` (react-native-webrtc, etapa del APK):
 * en Expo Go no existe y `rtcAvailable()` devuelve false.
 */
export type LinkState = "connecting" | "open" | "closed";
export type LinkHandlers = {
  onMessage: (message: LinkMessage) => void;
  onState: (state: LinkState) => void;
  /** Avance de un mensaje grande que está llegando, de 0 a 1. */
  onProgress?: (fraction: number) => void;
};
export type Link = {
  send: (message: LinkMessage) => Promise<void>;
  close: () => void;
  /** Código de seis cifras que deben mostrar igual los dos lados; null hasta tener las dos huellas. */
  verification: () => string | null;
};

const GATHER_TIMEOUT_MS = 3000;
const BUFFER_LIMIT = 1_000_000;

export const rtcAvailable = () => typeof globalThis.RTCPeerConnection === "function";

const wait = (ms: number) => new Promise<void>((done) => setTimeout(done, ms));

/** Espera a que el dispositivo termine de reunir sus direcciones locales. */
async function gathered(connection: RTCPeerConnection): Promise<void> {
  if (connection.iceGatheringState === "complete") return;
  let check = () => undefined as void;
  const complete = new Promise<void>((done) => {
    check = () => {
      if (connection.iceGatheringState === "complete") done();
    };
    connection.addEventListener("icegatheringstatechange", check);
  });
  await Promise.race([complete, wait(GATHER_TIMEOUT_MS)]);
  connection.removeEventListener("icegatheringstatechange", check);
}

function createLink(connection: RTCPeerConnection, handlers: LinkHandlers) {
  const assembler = new Assembler();
  let channel: RTCDataChannel | null = null;
  let state: LinkState = "connecting";
  let nextId = 1;
  let local: Signal | null = null;
  let remote: Signal | null = null;
  let queue: Promise<void> = Promise.resolve();

  const setState = (next: LinkState) => {
    if (state === next || state === "closed") return;
    state = next;
    handlers.onState(next);
  };
  const attach = (next: RTCDataChannel) => {
    channel = next;
    next.addEventListener("open", () => setState("open"));
    next.addEventListener("close", () => {
      assembler.clear();
      setState("closed");
    });
    next.addEventListener("message", (event) => {
      if (typeof event.data !== "string") return;
      const message = assembler.push(event.data);
      handlers.onProgress?.(message ? 0 : assembler.progress());
      if (message) handlers.onMessage(message);
    });
    if (next.readyState === "open") setState("open");
  };
  connection.addEventListener("connectionstatechange", () => {
    if (["failed", "closed", "disconnected"].includes(connection.connectionState)) setState("closed");
  });

  const link: Link = {
    send: (message) => {
      // De a un mensaje por vez, para que sus tramas no se intercalen con las de otro.
      queue = queue
        .catch(() => undefined)
        .then(async () => {
          const open = channel;
          if (!open || open.readyState !== "open") throw new LinkError("La conexión se cerró.");
          for (const frame of toFrames(message, nextId++)) {
            while (open.bufferedAmount > BUFFER_LIMIT) await wait(40);
            if (open.readyState !== "open") throw new LinkError("La conexión se cerró.");
            open.send(frame);
          }
        });
      return queue;
    },
    close: () => {
      try {
        if (channel?.readyState === "open") channel.send(toFrames({ t: "bye" }, nextId++)[0]);
      } catch {
        // Ya estaba cerrado.
      }
      channel?.close();
      connection.close();
      setState("closed");
    },
    verification: () => {
      if (!local || !remote) return null;
      const [offer, answer] = local.type === "offer" ? [local, remote] : [remote, local];
      return verificationCode(offer.fingerprint, answer.fingerprint);
    },
  };
  return {
    link,
    attach,
    setLocal: (signal: Signal) => (local = signal),
    setRemote: (signal: Signal) => (remote = signal),
  };
}

function newConnection(): RTCPeerConnection {
  if (!rtcAvailable()) throw new LinkError("Este dispositivo no puede abrir una conexión directa.");
  // Sin servidores ICE: nada sale de la red local.
  return new RTCPeerConnection({ iceServers: [] });
}

/** Lado que empieza (la web): crea el código y luego acepta el de respuesta. */
export async function startOffer(handlers: LinkHandlers): Promise<{
  code: string;
  accept: (answerCode: string) => Promise<void>;
  link: Link;
}> {
  const connection = newConnection();
  const { link, attach, setLocal, setRemote } = createLink(connection, handlers);
  attach(connection.createDataChannel("dophamine", { ordered: true }));
  await connection.setLocalDescription(await connection.createOffer());
  await gathered(connection);
  const local = readSdp(connection.localDescription?.sdp ?? "", "offer");
  if (!local.candidates.length)
    throw new LinkError("Este dispositivo no tiene una red local disponible. Conéctalo al Wi-Fi.");
  setLocal(local);
  return {
    code: packSignal(local),
    link,
    accept: async (answerCode) => {
      const remote = unpackSignal(answerCode, "answer");
      setRemote(remote);
      await connection.setRemoteDescription({ type: "answer", sdp: buildSdp(remote) });
    },
  };
}

/** Lado que responde (el teléfono): recibe el código de la web y crea el suyo. */
export async function startAnswer(
  offerCode: string,
  handlers: LinkHandlers,
): Promise<{ code: string; link: Link }> {
  const remote = unpackSignal(offerCode, "offer");
  const connection = newConnection();
  const { link, attach, setLocal, setRemote } = createLink(connection, handlers);
  connection.addEventListener("datachannel", (event) => attach(event.channel));
  setRemote(remote);
  await connection.setRemoteDescription({ type: "offer", sdp: buildSdp(remote) });
  await connection.setLocalDescription(await connection.createAnswer());
  await gathered(connection);
  const local = readSdp(connection.localDescription?.sdp ?? "", "answer");
  if (!local.candidates.length)
    throw new LinkError("Este dispositivo no tiene una red local disponible. Conéctalo al Wi-Fi.");
  setLocal(local);
  return { code: packSignal(local), link };
}
