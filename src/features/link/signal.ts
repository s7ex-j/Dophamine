/**
 * Señalización de la conexión directa, sin servidor.
 *
 * Para abrir un canal WebRTC cada lado necesita la "descripción" del otro
 * (SDP). Normalmente la lleva un servidor; aquí viaja en un código QR. Un SDP
 * completo no cabe cómodo en un QR, así que se guarda solo lo imprescindible:
 * las credenciales ICE, la huella del certificado (con ella se cifra y se
 * comprueba el canal) y las direcciones locales. El otro lado reconstruye el
 * SDP a partir de eso.
 *
 * Módulo puro.
 */
export type SignalType = "offer" | "answer";
export type Signal = {
  type: SignalType;
  ufrag: string;
  pwd: string;
  /** Huella SHA-256 del certificado: 64 dígitos hexadecimales en mayúsculas. */
  fingerprint: string;
  setup: "actpass" | "active" | "passive";
  /** Direcciones locales donde escucha este dispositivo. */
  candidates: Array<{ host: string; port: number }>;
  /** Cuándo se creó el código (segundos desde 1970): caduca a los 10 minutos. */
  issuedAt?: number;
};

export class LinkError extends Error {}

const PREFIX = "D2";
/** Un código QR sirve 10 minutos: una foto vieja de la pantalla ya no abre la conexión. */
export const SIGNAL_LIFETIME_S = 600;
const MAX_CANDIDATES = 6;
const SETUP_CODES = { actpass: "x", active: "a", passive: "p" } as const;
const BASE64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";

const hexToBase64 = (hex: string) => {
  const bytes = hex.match(/../g)?.map((pair) => parseInt(pair, 16)) ?? [];
  let text = "";
  for (let index = 0; index < bytes.length; index += 3) {
    const [a, b, c] = [bytes[index], bytes[index + 1], bytes[index + 2]];
    text += BASE64[a >> 2] + BASE64[((a & 3) << 4) | ((b ?? 0) >> 4)];
    if (b !== undefined) text += BASE64[((b & 15) << 2) | ((c ?? 0) >> 6)];
    if (c !== undefined) text += BASE64[c & 63];
  }
  return text;
};

const base64ToHex = (text: string) => {
  let bits = 0;
  let value = 0;
  let hex = "";
  for (const char of text) {
    const index = BASE64.indexOf(char);
    if (index < 0) throw new LinkError("El código no es válido.");
    value = (value << 6) | index;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      hex += ((value >> bits) & 255).toString(16).padStart(2, "0");
    }
  }
  return hex.toUpperCase();
};

const isIpv4 = (host: string) => /^\d{1,3}(\.\d{1,3}){3}$/.test(host);
const isIpv6 = (host: string) => {
  const halves = host.split("::");
  const groups = halves.flatMap((half) => (half ? half.split(":") : []));
  if (halves.length > 2 || !groups.every((group) => /^[0-9A-Fa-f]{1,4}$/.test(group))) return false;
  return halves.length === 2 ? groups.length < 8 : groups.length === 8;
};
// Una dirección que se puede escribir en el SDP: IPv4, IPv6 o un nombre `.local` (los que usa el navegador).
const isHost = (host: string) =>
  isIpv4(host)
    ? host.split(".").every((part) => Number(part) <= 255)
    : host.endsWith(".local")
      ? /^[0-9A-Za-z-]{1,63}\.local$/.test(host)
      : isIpv6(host);
const isPort = (port: string) => /^\d{1,5}$/.test(port) && Number(port) > 0 && Number(port) < 65536;
const isPrivate = (host: string) => /^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(host);
// Orden de preferencia: red local IPv4, otras IPv4, nombres .local y al final IPv6.
const rank = (host: string) => (isPrivate(host) ? 0 : isIpv4(host) ? 1 : host.endsWith(".local") ? 2 : 3);

/** Saca de un SDP lo que el otro lado necesita. */
export function readSdp(sdp: string, type: SignalType): Signal {
  const lines = sdp.split(/\r?\n/);
  const value = (prefix: string) => lines.find((line) => line.startsWith(prefix))?.slice(prefix.length);
  const ufrag = value("a=ice-ufrag:");
  const pwd = value("a=ice-pwd:");
  const fingerprint = value("a=fingerprint:sha-256 ")?.replace(/:/g, "").toUpperCase();
  const setup = value("a=setup:");
  if (!ufrag || !pwd || !fingerprint || fingerprint.length !== 64)
    throw new LinkError("No se pudo preparar la conexión en este dispositivo.");
  const seen = new Set<string>();
  const candidates = lines
    .filter((line) => line.startsWith("a=candidate:"))
    .flatMap((line) => {
      const [, component, protocol, , host, port, , kind] = line.split(" ");
      if (component !== "1" || protocol.toLowerCase() !== "udp" || kind !== "host") return [];
      if (host.startsWith("fe80") || host === "127.0.0.1" || host === "::1") return [];
      if (!isHost(host) || !isPort(port)) return [];
      const key = `${host}:${port}`;
      if (seen.has(key)) return [];
      seen.add(key);
      return [{ host, port: Number(port) }];
    })
    .sort((a, b) => rank(a.host) - rank(b.host))
    .slice(0, MAX_CANDIDATES);
  return {
    type,
    ufrag,
    pwd,
    fingerprint,
    setup: setup === "active" || setup === "passive" ? setup : type === "offer" ? "actpass" : "active",
    candidates,
    issuedAt: Math.floor(Date.now() / 1000),
  };
}

/** Reconstruye un SDP mínimo (solo canal de datos) a partir de la señal. */
export function buildSdp(signal: Signal): string {
  const session = [...signal.ufrag].reduce((sum, char) => sum * 31 + char.charCodeAt(0), 7) % 2147483647;
  const fingerprint = signal.fingerprint.match(/../g)?.join(":") ?? "";
  return [
    "v=0",
    `o=- ${session} 2 IN IP4 127.0.0.1`,
    "s=-",
    "t=0 0",
    "a=group:BUNDLE 0",
    "a=msid-semantic: WMS",
    "m=application 9 UDP/DTLS/SCTP webrtc-datachannel",
    "c=IN IP4 0.0.0.0",
    ...signal.candidates.map(
      (candidate, index) =>
        `a=candidate:${index + 1} 1 udp ${2122260223 - index} ${candidate.host} ${candidate.port} typ host generation 0`,
    ),
    `a=ice-ufrag:${signal.ufrag}`,
    `a=ice-pwd:${signal.pwd}`,
    `a=fingerprint:sha-256 ${fingerprint}`,
    `a=setup:${signal.setup}`,
    "a=mid:0",
    "a=sctp-port:5000",
    "a=max-message-size:262144",
    "",
  ].join("\r\n");
}

/** La señal como texto corto para un QR: `D2|O|hora|ufrag|pwd|huella|rol|puerto@dirección,...`. */
export function packSignal(signal: Signal): string {
  return [
    PREFIX,
    signal.type === "offer" ? "O" : "A",
    (signal.issuedAt ?? Math.floor(Date.now() / 1000)).toString(36),
    signal.ufrag,
    signal.pwd,
    hexToBase64(signal.fingerprint),
    SETUP_CODES[signal.setup],
    signal.candidates.map((candidate) => `${candidate.port}@${candidate.host}`).join(","),
  ].join("|");
}

/** Lee un código escaneado o pegado. Lanza LinkError con un mensaje para mostrar. */
export function unpackSignal(code: string, expected?: SignalType, now = Date.now()): Signal {
  const parts = code.trim().split("|");
  if (parts[0] === "D1")
    throw new LinkError("Ese código es de una versión anterior de Dophamine. Actualiza la app.");
  if (parts.length !== 8 || parts[0] !== PREFIX || !["O", "A"].includes(parts[1]))
    throw new LinkError("Ese código no es de Dophamine. Vuelve a leerlo completo.");
  const [, kind, stamp, ufrag, pwd, print, setupCode, list] = parts;
  const issuedAt = parseInt(stamp, 36);
  if (!Number.isFinite(issuedAt)) throw new LinkError("El código está incompleto. Vuelve a leerlo.");
  const age = now / 1000 - issuedAt;
  if (age > SIGNAL_LIFETIME_S || age < -120)
    throw new LinkError("Ese código caducó (dura 10 minutos). Pide uno nuevo en la otra pantalla.");
  const type: SignalType = kind === "O" ? "offer" : "answer";
  if (expected && type !== expected)
    throw new LinkError(
      expected === "offer"
        ? "Ese es el código del teléfono. Aquí va el que muestra la web."
        : "Ese es el código de la web. Aquí va el que muestra el teléfono.",
    );
  const fingerprint = base64ToHex(print);
  const setup = (Object.keys(SETUP_CODES) as Signal["setup"][]).find((key) => SETUP_CODES[key] === setupCode);
  const items = list.split(",").filter(Boolean);
  // El otro lado nunca manda más: un código con más direcciones no lo hizo Dophamine.
  if (items.length > MAX_CANDIDATES)
    throw new LinkError("Ese código trae demasiadas direcciones. Pide uno nuevo en la otra pantalla.");
  const addresses = items.map((item) => {
    const at = item.indexOf("@");
    return { host: item.slice(at + 1), port: item.slice(0, Math.max(0, at)) };
  });
  if (
    !ufrag ||
    !pwd ||
    fingerprint.length !== 64 ||
    !setup ||
    addresses.some(({ host, port }) => !isHost(host) || !isPort(port)) ||
    !/^[0-9A-Za-z+/]+$/.test(ufrag) ||
    !/^[0-9A-Za-z+/]+$/.test(pwd)
  )
    throw new LinkError("El código está incompleto. Vuelve a leerlo.");
  const candidates = addresses.map(({ host, port }) => ({ host, port: Number(port) }));
  if (!candidates.length)
    throw new LinkError("El otro dispositivo no informó ninguna dirección de red. Revisa que tenga Wi-Fi.");
  return { type, ufrag, pwd, fingerprint, setup, candidates, issuedAt };
}
