// El día elegido en el calendario, hasta que el Panel lo recoge al volver.
let picked: string | null = null;
export const pickDay = (date: string) => {
  picked = date;
};
export const takePickedDay = () => {
  const date = picked;
  picked = null;
  return date;
};
