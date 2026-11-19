import type * as Tflite from "react-native-fast-tflite";
import { decode } from "jpeg-js";
import { manipulateAsync, SaveFormat } from "expo-image-manipulator";

import type { Landmark, Mask } from "@/src/features/photos/bodyShape";
import {
  cropMask,
  frameFor,
  poseFromMoveNet,
  squareInput,
  type Frame,
} from "@/src/features/photos/photoPixels";

/**
 * Corre dos modelos ya entrenados sobre una foto guardada, en el teléfono: segmentación de persona
 * de MediaPipe (la silueta) y MoveNet Lightning (nariz, hombros, cadera y tobillos). Las reglas de
 * medición están en `bodyShape.ts`. La foto no sale del teléfono. Variante web: photos.analysis.web.ts.
 */
const SEGMENTER_SIZE = 256;
const POSE_SIZE = 192;

const tflite = (): typeof Tflite | null => {
  try {
    return require("react-native-fast-tflite") as typeof Tflite;
  } catch {
    return null;
  }
};

/** Si este build trae el motor de modelos (un build viejo no). */
export const ANALYSIS_READY = tflite() !== null;

type Model = Awaited<ReturnType<typeof Tflite.loadTensorflowModel>>;
let models: Promise<{ segmenter: Model; pose: Model }> | null = null;

const loadModels = () => {
  const engine = tflite();
  if (!engine) throw new Error("El análisis no está disponible en esta versión de la app.");
  models ??= Promise.all([
    engine.loadTensorflowModel(require("../../../assets/models/selfie_segmenter.tflite"), []),
    engine.loadTensorflowModel(require("../../../assets/models/movenet_lightning.tflite"), []),
  ]).then(([segmenter, pose]) => ({ segmenter, pose }));
  return models;
};

const bytesFromBase64 = (base64: string) => {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index++) bytes[index] = binary.charCodeAt(index);
  return bytes;
};

/** La foto achicada (lado mayor = `size`) y sus píxeles RGBA, con su encuadre en el cuadrado. */
async function pixelsFor(file: string, size: number): Promise<{ rgba: Uint8Array; frame: Frame }> {
  const original = await manipulateAsync(file, []);
  const scale = size / Math.max(original.width, original.height);
  const resized = await manipulateAsync(
    file,
    [{ resize: { width: Math.round(original.width * scale), height: Math.round(original.height * scale) } }],
    { base64: true, format: SaveFormat.JPEG, compress: 0.95 },
  );
  const image = decode(bytesFromBase64(resized.base64 ?? ""), { useTArray: true, formatAsRGBA: true });
  return { rgba: image.data, frame: frameFor(image.width, image.height, size) };
}

const run = (model: Model, input: Uint8Array | Float32Array) => {
  const buffer = input.buffer.slice(input.byteOffset, input.byteOffset + input.byteLength) as ArrayBuffer;
  return new Float32Array(model.runSync([buffer])[0]);
};

export async function analyzePhoto(file: string): Promise<{ mask: Mask; landmarks: Landmark[] } | null> {
  const { segmenter, pose } = await loadModels();

  const forMask = await pixelsFor(file, SEGMENTER_SIZE);
  const maskType = segmenter.inputs[0]?.dataType === "uint8" ? "uint8" : "float32";
  const mask = cropMask(run(segmenter, squareInput(forMask.rgba, forMask.frame, maskType)), forMask.frame);

  const forPose = await pixelsFor(file, POSE_SIZE);
  const poseType = pose.inputs[0]?.dataType === "float32" ? "float32" : "uint8";
  const landmarks = poseFromMoveNet(
    run(pose, squareInput(forPose.rgba, forPose.frame, poseType)),
    forPose.frame,
  );

  return { mask, landmarks };
}
