// En la app instalada (Android, iPhone) no hay web instalable.
export const PWA = false;
export type InstallKind = "ios" | "other";
export const needsInstall = (): InstallKind | null => null;
export function skipInstall() {}
export const pwaUrl = () => "";
export async function keepStorage(): Promise<void> {}
