// En la app instalada (Android, iPhone) no hay web instalable.
export const PWA = false;
export const needsInstall = () => false;
export async function keepStorage(): Promise<void> {}
