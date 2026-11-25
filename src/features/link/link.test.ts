import jsQR from "jsqr";
import { describe, expect, it } from "vitest";

import {
  Assembler,
  FRAME_SIZE,
  isLinkMessage,
  MAX_PENDING,
  MAX_PENDING_CHARS,
  PENDING_LIFETIME_MS,
  toFrames,
  type LinkMessage,
} from "@/src/features/link/protocol";
import { qrMatrix, qrPath } from "@/src/features/link/qr";
import { sha256Hex, verificationCode } from "@/src/features/link/sha256";
import { buildSdp, LinkError, packSignal, readSdp, unpackSignal } from "@/src/features/link/signal";

const FINGERPRINT = Array.from({ length: 32 }, (_, index) =>
  ((index * 37 + 11) % 256).toString(16).padStart(2, "0").toUpperCase(),
);
// Un SDP como el que entrega Chrome para un canal de datos.
const SDP = [
  "v=0",
  "o=- 4611731400430051336 2 IN IP4 127.0.0.1",
  "s=-",
  "t=0 0",
  "a=group:BUNDLE 0",
  "a=extmap-allow-mixed",
  "a=msid-semantic: WMS",
  "m=application 54321 UDP/DTLS/SCTP webrtc-datachannel",
  "c=IN IP4 192.168.1.20",
  "a=candidate:2 1 udp 2113939711 2800:200:abcd::1 54322 typ host generation 0",
  "a=candidate:1 1 udp 2113937151 192.168.1.20 54321 typ host generation 0 network-cost 999",
  "a=candidate:3 1 tcp 1518280447 192.168.1.20 9 typ host tcptype active",
  "a=candidate:4 1 udp 2113937151 fe80::1 5000 typ host",
  "a=candidate:5 1 udp 1677729535 190.1.2.3 61000 typ srflx raddr 192.168.1.20 rport 54321",
  "a=candidate:6 1 udp 2113937151 0f3a9c1e-77aa-4c1d-9a10-aabbccddeeff.local 50001 typ host",
  "a=ice-ufrag:Ab+/",
  "a=ice-pwd:abcdefghijklmnopqrstuvwx",
  "a=ice-options:trickle",
  `a=fingerprint:sha-256 ${FINGERPRINT.join(":")}`,
  "a=setup:actpass",
  "a=mid:0",
  "a=sctp-port:5000",
  "a=max-message-size:262144",
  "",
].join("\r\n");

describe("señal para el código QR", () => {
  const signal = readSdp(SDP, "offer");

  it("saca del SDP solo lo necesario y ordena las direcciones locales", () => {
    expect(signal).toMatchObject({ type: "offer", ufrag: "Ab+/", setup: "actpass" });
    expect(signal.fingerprint).toBe(FINGERPRINT.join(""));
    // Fuera: TCP, enlace local (fe80) y la dirección pública (sin STUN no se usa).
    expect(signal.candidates).toEqual([
      { host: "192.168.1.20", port: 54321 },
      { host: "0f3a9c1e-77aa-4c1d-9a10-aabbccddeeff.local", port: 50001 },
      { host: "2800:200:abcd::1", port: 54322 },
    ]);
  });

  it("el código va y vuelve sin perder nada, y es corto", () => {
    const code = packSignal(signal);
    expect(code.startsWith("D2|O|")).toBe(true);
    expect(code.length).toBeLessThan(230);
    expect(unpackSignal(code, "offer")).toEqual(signal);
    expect(unpackSignal(`  ${code}\n`)).toEqual(signal);
  });

  it("el código caduca a los 10 minutos y uno de la versión anterior se rechaza con un aviso", () => {
    const code = packSignal({ ...signal, issuedAt: 1_800_000_000 });
    expect(unpackSignal(code, "offer", 1_800_000_000_000 + 9 * 60_000).issuedAt).toBe(1_800_000_000);
    expect(() => unpackSignal(code, "offer", 1_800_000_000_000 + 11 * 60_000)).toThrow("caducó");
    expect(() => unpackSignal(code.replace(/^D2/, "D1"))).toThrow("versión anterior");
  });

  it("reconstruye un SDP con la misma huella, credenciales y direcciones", () => {
    const rebuilt = buildSdp(unpackSignal(packSignal(signal)));
    expect(rebuilt).toContain(`a=fingerprint:sha-256 ${FINGERPRINT.join(":")}`);
    expect(rebuilt).toContain("a=ice-ufrag:Ab+/");
    expect(rebuilt).toContain("m=application 9 UDP/DTLS/SCTP webrtc-datachannel");
    expect(rebuilt).toContain("192.168.1.20 54321 typ host");
    expect(readSdp(rebuilt, "offer")).toEqual({ ...signal, issuedAt: expect.any(Number) });
  });

  it("explica qué pasa con un código que no sirve", () => {
    expect(() => unpackSignal("hola")).toThrow(LinkError);
    expect(() => unpackSignal(packSignal(signal), "answer")).toThrow("código de la web");
    expect(() => unpackSignal(packSignal({ ...signal, candidates: [] }))).toThrow("dirección de red");
    expect(() => unpackSignal(packSignal(signal).replace("192.168.1.20", "192.168.1.20 a=x"))).toThrow(
      "incompleto",
    );
    expect(() => readSdp("v=0", "offer")).toThrow(LinkError);
  });

  it("cabe en un QR que se lee de vuelta", () => {
    const code = packSignal(signal);
    const { size, d } = qrPath(qrMatrix(code));
    expect(d.startsWith("M")).toBe(true);
    // Se dibuja a 4 píxeles por módulo y se decodifica como lo haría la cámara.
    const matrix = qrMatrix(code);
    const scale = 4;
    const side = size * scale;
    const pixels = new Uint8ClampedArray(side * side * 4).fill(255);
    matrix.forEach((row, y) =>
      row.forEach((dark, x) => {
        if (!dark) return;
        for (let dy = 0; dy < scale; dy++)
          for (let dx = 0; dx < scale; dx++) {
            const at = (((y + 4) * scale + dy) * side + (x + 4) * scale + dx) * 4;
            pixels[at] = pixels[at + 1] = pixels[at + 2] = 0;
          }
      }),
    );
    expect(jsQR(pixels, side, side)?.data).toBe(code);
  });
});

describe("código de verificación", () => {
  it("el SHA-256 propio coincide con el del sistema", async () => {
    for (const text of ["", "abc", "ñandú 🦙 dieta", "a".repeat(55), "a".repeat(56), "x".repeat(1000)]) {
      const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
      const expected = [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
      expect(sha256Hex(text)).toBe(expected);
    }
    expect(sha256Hex("abc")).toBe("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
  });

  it("los dos lados obtienen el mismo número y cambia si cambia una huella", () => {
    const other = [...FINGERPRINT].reverse().join("");
    const code = verificationCode(FINGERPRINT.join(""), other);
    expect(code).toMatch(/^\d{3} \d{3}$/);
    expect(verificationCode(FINGERPRINT.join(""), other)).toBe(code);
    expect(verificationCode(FINGERPRINT.join(""), other.replace(/.$/, "0"))).not.toBe(code);
  });
});

describe("mensajes troceados", () => {
  it("un mensaje grande se parte y se arma aunque las tramas lleguen desordenadas", () => {
    const message: LinkMessage = { t: "backup", backup: { texto: "día ñ ".repeat(20_000) } };
    const frames = toFrames(message, 7, 1000);
    expect(frames.length).toBeGreaterThan(100);
    const assembler = new Assembler();
    const shuffled = [...frames.slice(50), ...frames.slice(0, 50)];
    const results = shuffled.map((frame) => assembler.push(frame));
    expect(results.slice(0, -1).every((result) => result === null)).toBe(true);
    expect(results.at(-1)).toEqual(message);
    expect(assembler.progress()).toBe(0);
  });

  it("dos mensajes a la vez no se mezclan y lo que no sirve se ignora", () => {
    const assembler = new Assembler();
    const [a1, a2] = toFrames({ t: "diet", plan: { name: "x".repeat(30) } }, 1, 40);
    const [hello] = toFrames({ t: "hello", v: 1, role: "web" }, 2);
    expect(assembler.push(a1)).toBeNull();
    expect(assembler.progress()).toBeGreaterThan(0);
    expect(assembler.push(hello)).toEqual({ t: "hello", v: 1, role: "web" });
    expect(assembler.push("basura")).toBeNull();
    expect(assembler.push("9:0/1:{no es json")).toBeNull();
    expect(assembler.push('9:0/1:{"t":"borrar-todo"}')).toBeNull();
    expect(assembler.push("3:5/2:x")).toBeNull();
    expect(assembler.push(a2)).toMatchObject({ t: "diet" });
  });

  it("solo acepta los mensajes del protocolo", () => {
    expect(isLinkMessage({ t: "get", what: "backup" })).toBe(true);
    expect(isLinkMessage({ t: "get", what: "todo" })).toBe(false);
    expect(isLinkMessage({ t: "ack", of: "diet", ok: true })).toBe(true);
    expect(isLinkMessage({ t: "ack", of: "diet" })).toBe(false);
    expect(isLinkMessage(null)).toBe(false);
  });
});

describe("0.42.1: lo que llega a medias tiene tope", () => {
  it("de cantidad de mensajes, y los completos siguen pasando al liberarse sitio", () => {
    const assembler = new Assembler();
    for (let id = 0; id < 2000; id += 1) assembler.push(`${id}:0/5000:x`);
    expect(assembler.pending().messages).toBe(MAX_PENDING);
    assembler.clear();
    expect(assembler.pending()).toEqual({ messages: 0, chars: 0 });
    expect(assembler.push(toFrames({ t: "bye" }, 9)[0])).toEqual({ t: "bye" });
  });

  it("de tamaño por trama y en total", () => {
    const assembler = new Assembler();
    expect(assembler.push(`1:0/2:${"x".repeat(FRAME_SIZE + 1)}`)).toBeNull();
    expect(assembler.pending().messages).toBe(0);
    const piece = "x".repeat(FRAME_SIZE);
    for (let id = 1; id <= 2; id += 1)
      for (let i = 0; i < 4999; i += 1) assembler.push(`${id}:${i}/5000:${piece}`);
    expect(assembler.pending().chars).toBeLessThanOrEqual(MAX_PENDING_CHARS);
  });

  it("de tiempo: lo abandonado se olvida y deja sitio", () => {
    let now = 0;
    const assembler = new Assembler(() => now);
    for (let id = 0; id < MAX_PENDING; id += 1) assembler.push(`${id}:0/2:x`);
    now = PENDING_LIFETIME_MS + 1;
    expect(assembler.push(toFrames({ t: "bye" }, 50)[0])).toEqual({ t: "bye" });
    expect(assembler.pending().messages).toBe(0);
  });

  it("una trama repetida no cambia lo recibido ni cuenta dos veces", () => {
    const assembler = new Assembler();
    const [a, b] = toFrames({ t: "diet", plan: "y".repeat(60) }, 3, 50);
    assembler.push(a);
    const before = assembler.pending();
    assembler.push(a.replace("diet", "evil"));
    expect(assembler.pending()).toEqual(before);
    const rest = toFrames({ t: "diet", plan: "y".repeat(60) }, 3, 50).slice(2);
    let result = assembler.push(b);
    for (const frame of rest) result = assembler.push(frame);
    expect(result).toMatchObject({ t: "diet" });
  });

  it("un respaldo grande normal sigue pasando entero", () => {
    const backup = { texto: "z".repeat(3_000_000) };
    const assembler = new Assembler();
    const results = toFrames({ t: "backup", backup }, 1).map((frame) => assembler.push(frame));
    expect(results.at(-1)).toEqual({ t: "backup", backup });
    expect(assembler.pending()).toEqual({ messages: 0, chars: 0 });
  });
});
