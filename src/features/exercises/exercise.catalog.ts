export type Exercise = {
  id: string;
  name: string;
  category: "strength" | "cardio";
  target: string;
  equipment: string;
  instructions: string[];
};

// The shape mirrors the upstream dataset while the full import remains an
// explicit build step. No third-party image or GIF is bundled here.
export const POSTERIOR_CHAIN_EXERCISES: Exercise[] = [
  {
    id: "hip-thrust", name: "Hip thrust", category: "strength", target: "glúteos", equipment: "barra o mancuerna",
    instructions: ["Apoya la espalda alta en un banco y coloca la carga sobre la cadera.", "Empuja el suelo con los pies hasta extender la cadera.", "Pausa apretando glúteos y baja con control."]
  },
  {
    id: "romanian-deadlift", name: "Peso muerto rumano", category: "strength", target: "isquiotibiales", equipment: "barra o mancuernas",
    instructions: ["Mantén la carga cerca de las piernas y las rodillas ligeramente flexionadas.", "Lleva la cadera atrás conservando la espalda neutra.", "Extiende la cadera para volver a la posición inicial."]
  },
  {
    id: "leg-curl", name: "Curl femoral", category: "strength", target: "isquiotibiales", equipment: "máquina o banda",
    instructions: ["Ajusta el eje de la máquina a la altura de las rodillas.", "Flexiona las rodillas de forma controlada.", "Vuelve lentamente sin perder tensión."]
  },
  {
    id: "back-extension", name: "Extensión lumbar", category: "strength", target: "glúteos y espalda baja", equipment: "banco romano",
    instructions: ["Apoya las caderas en el banco y activa el abdomen.", "Extiende el torso hasta quedar alineado con las piernas.", "Evita hiperextender la zona lumbar."]
  },
  {
    id: "front-plank", name: "Plancha frontal", category: "strength", target: "zona media", equipment: "peso corporal",
    instructions: ["Apoya antebrazos y puntas de los pies.", "Mantén hombros, cadera y talones alineados.", "Respira lento sin dejar caer la cadera."]
  },
  {
    id: "zone-2-walk", name: "Caminata en zona 2", category: "cardio", target: "capacidad aeróbica", equipment: "cinta o exterior",
    instructions: ["Elige un ritmo que permita conversar con frases cortas.", "Mantén un esfuerzo estable durante la sesión.", "Reduce el ritmo gradualmente al terminar."]
  }
];

