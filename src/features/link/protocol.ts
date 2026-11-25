/**
 * Mensajes de la conexión directa teléfono ↔ web y su troceado.
 *
 * Un canal de datos WebRTC no admite mensajes grandes, y un respaldo puede
 * pesar varios megas: cada mensaje se parte en tramas numeradas y el otro lado
 * las junta. Módulo puro: no sabe nada de WebRTC.
 */
import { LinkError } from "@/src/features/link/signal";

export const LINK_VERSION = 1;

export type LinkMessage =
  | { t: "hello"; v: number; role: "phone" | "web" }
  /** La web pide los datos del teléfono. */
  | { t: "get"; what: "backup" }
  /** El respaldo completo, con la misma forma que el archivo de respaldo. */
  | { t: "backup"; backup: unknown }
  /** La web envía una dieta para guardarla en el teléfono. */
  | { t: "diet"; plan: unknown }
  /** Respuesta del teléfono a un pedido: aceptado o no, con un texto para mostrar. */
  | { t: "ack"; of: "backup" | "diet"; ok: boolean; note?: string }
  | { t: "bye" };

const TYPES = ["hello", "get", "backup", "diet", "ack", "bye"];
/** Caracteres por trama: cabe holgado en el límite de un canal de datos. */
export const FRAME_SIZE = 12_000;
/** Tope de un mensaje ya armado (unos 60 MB de texto). */
export const MAX_FRAMES = 5_000;

export function isLinkMessage(value: unknown): value is LinkMessage {
  if (typeof value !== "object" || value === null) return false;
  const message = value as {
    t?: unknown;
    v?: unknown;
    role?: unknown;
    what?: unknown;
    of?: unknown;
    ok?: unknown;
  };
  if (typeof message.t !== "string" || !TYPES.includes(message.t)) return false;
  if (message.t === "hello")
    return typeof message.v === "number" && (message.role === "phone" || message.role === "web");
  if (message.t === "get") return message.what === "backup";
  if (message.t === "ack")
    return (message.of === "backup" || message.of === "diet") && typeof message.ok === "boolean";
  return true;
}

/**
 * Parte un mensaje en tramas `id:posición/total:trozo`. Con el mismo tope que quien recibe: un mensaje que el
 * otro lado va a rechazar falla aquí, antes de enviar nada.
 */
export function toFrames(message: LinkMessage, id: number, size = FRAME_SIZE): string[] {
  const text = JSON.stringify(message);
  const total = Math.max(1, Math.ceil(text.length / size));
  if (total > MAX_FRAMES)
    throw new LinkError(
      "Los datos son demasiado grandes para la conexión directa. Comparte el respaldo como archivo.",
    );
  return Array.from(
    { length: total },
    (_, index) => `${id}:${index}/${total}:${text.slice(index * size, (index + 1) * size)}`,
  );
}

/** Mensajes a medias a la vez, caracteres retenidos entre todos y cuánto se espera a que lleguen. */
export const MAX_PENDING = 4;
export const MAX_PENDING_CHARS = FRAME_SIZE * MAX_FRAMES;
export const PENDING_LIFETIME_MS = 60_000;

type Pending = { total: number; pieces: Map<number, string>; chars: number; touchedAt: number };

/**
 * Junta las tramas que van llegando y entrega cada mensaje cuando está completo. Lo que el otro lado deje
 * a medias tiene tope de cantidad, de tamaño y de tiempo: no puede llenar la memoria.
 */
export class Assembler {
  private parts = new Map<number, Pending>();
  private chars = 0;

  constructor(private now: () => number = Date.now) {}

  private drop(id: number) {
    this.chars -= this.parts.get(id)?.chars ?? 0;
    this.parts.delete(id);
  }

  /** Olvida todo lo que quedó a medias (al cerrar la conexión). */
  clear() {
    this.parts.clear();
    this.chars = 0;
  }

  /** Cuánto hay retenido a la espera de completarse. */
  pending() {
    return { messages: this.parts.size, chars: this.chars };
  }

  /** Devuelve el mensaje si esta trama lo completó; null si falta o si la trama no sirve. */
  push(frame: string): LinkMessage | null {
    const first = frame.indexOf(":");
    const second = frame.indexOf(":", first + 1);
    if (first < 1 || second < 0 || frame.length - second - 1 > FRAME_SIZE) return null;
    const id = Number(frame.slice(0, first));
    const [index, total] = frame
      .slice(first + 1, second)
      .split("/")
      .map(Number);
    if (
      !Number.isSafeInteger(id) ||
      id < 0 ||
      !Number.isInteger(index) ||
      !Number.isInteger(total) ||
      total < 1 ||
      total > MAX_FRAMES ||
      index < 0 ||
      index >= total
    )
      return null;
    const now = this.now();
    for (const [key, item] of this.parts) if (now - item.touchedAt > PENDING_LIFETIME_MS) this.drop(key);
    const piece = frame.slice(second + 1);
    let entry = this.parts.get(id);
    if (entry && entry.total !== total) return null;
    // Una trama repetida no reemplaza a la primera.
    if (entry?.pieces.has(index)) return null;
    if (!entry && this.parts.size >= MAX_PENDING) return null;
    if (this.chars + piece.length > MAX_PENDING_CHARS) {
      this.drop(id);
      return null;
    }
    if (!entry) {
      entry = { total, pieces: new Map(), chars: 0, touchedAt: now };
      this.parts.set(id, entry);
    }
    entry.pieces.set(index, piece);
    entry.chars += piece.length;
    entry.touchedAt = now;
    this.chars += piece.length;
    if (entry.pieces.size < total) return null;
    const { pieces } = entry;
    this.drop(id);
    try {
      const value: unknown = JSON.parse(
        Array.from({ length: total }, (_, position) => pieces.get(position) ?? "").join(""),
      );
      return isLinkMessage(value) ? value : null;
    } catch {
      return null;
    }
  }

  /** Avance del mensaje más grande en camino, de 0 a 1 (para mostrar progreso). */
  progress(): number {
    let best = 0;
    for (const entry of this.parts.values())
      if (entry.total > 1) best = Math.max(best, entry.pieces.size / entry.total);
    return best;
  }
}
