/**
 * Mensajes de la conexión directa teléfono ↔ web y su troceado.
 *
 * Un canal de datos WebRTC no admite mensajes grandes, y un respaldo puede
 * pesar varios megas: cada mensaje se parte en tramas numeradas y el otro lado
 * las junta. Módulo puro: no sabe nada de WebRTC.
 */
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
const MAX_FRAMES = 5_000;

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

/** Parte un mensaje en tramas `id:posición/total:trozo`. */
export function toFrames(message: LinkMessage, id: number, size = FRAME_SIZE): string[] {
  const text = JSON.stringify(message);
  const total = Math.max(1, Math.ceil(text.length / size));
  return Array.from(
    { length: total },
    (_, index) => `${id}:${index}/${total}:${text.slice(index * size, (index + 1) * size)}`,
  );
}

/** Junta las tramas que van llegando y entrega cada mensaje cuando está completo. */
export class Assembler {
  private parts = new Map<number, { total: number; pieces: string[]; count: number }>();

  /** Devuelve el mensaje si esta trama lo completó; null si falta o si la trama no sirve. */
  push(frame: string): LinkMessage | null {
    const first = frame.indexOf(":");
    const second = frame.indexOf(":", first + 1);
    if (first < 1 || second < 0) return null;
    const id = Number(frame.slice(0, first));
    const [index, total] = frame
      .slice(first + 1, second)
      .split("/")
      .map(Number);
    if (
      !Number.isInteger(id) ||
      !Number.isInteger(index) ||
      !Number.isInteger(total) ||
      total < 1 ||
      total > MAX_FRAMES ||
      index < 0 ||
      index >= total
    )
      return null;
    const entry = this.parts.get(id) ?? { total, pieces: new Array<string>(total), count: 0 };
    if (entry.total !== total) return null;
    if (entry.pieces[index] === undefined) entry.count += 1;
    entry.pieces[index] = frame.slice(second + 1);
    this.parts.set(id, entry);
    if (entry.count < total) return null;
    this.parts.delete(id);
    try {
      const value: unknown = JSON.parse(entry.pieces.join(""));
      return isLinkMessage(value) ? value : null;
    } catch {
      return null;
    }
  }

  /** Avance del mensaje más grande en camino, de 0 a 1 (para mostrar progreso). */
  progress(): number {
    let best = 0;
    for (const entry of this.parts.values())
      if (entry.total > 1) best = Math.max(best, entry.count / entry.total);
    return best;
  }
}
