import { useState } from "react";
import { Text, View } from "react-native";

import { Button, Card } from "@/src/components/ui";
import { BackupError, describeBackup, parseBackup, type Backup } from "@/src/features/backup/backup";
import {
  backupAvailable,
  downloadBackup,
  pickBackupFile,
  restoreBackup,
} from "@/src/features/backup/backup.repository";
import { AppTheme } from "@/src/theme";

/**
 * Descargar y restaurar un respaldo. Solo aparece donde está disponible (hoy, la web).
 * Restaurar reemplaza todos los datos, así que primero muestra qué trae el
 * archivo y pide confirmar.
 */
export function BackupCard({ onRestored }: { onRestored: () => void }) {
  const [pending, setPending] = useState<Backup | null>(null);
  const [message, setMessage] = useState("");

  if (!backupAvailable) return null;

  const download = async () => {
    await downloadBackup();
    setMessage("Respaldo descargado. Guárdalo en un lugar seguro: contiene tus datos de salud.");
  };
  const choose = async () => {
    setMessage("");
    const text = await pickBackupFile();
    if (text === null) return;
    try {
      setPending(parseBackup(text));
    } catch (error) {
      setPending(null);
      setMessage(error instanceof BackupError ? error.message : "No se pudo leer el archivo.");
    }
  };
  const confirm = async () => {
    if (!pending) return;
    await restoreBackup(pending);
    setPending(null);
    setMessage("Datos restaurados.");
    onRestored();
  };

  return (
    <Card title="Respaldo">
      <Text style={AppTheme.body}>
        Tus datos viven solo en este navegador. Si borras sus datos, se pierden: descarga un respaldo de vez
        en cuando.
      </Text>
      {pending ? (
        <View style={{ gap: 10 }}>
          <Text style={AppTheme.body}>{describeBackup(pending)}</Text>
          <Text style={AppTheme.hint}>Restaurar reemplaza todo lo que tienes ahora en este navegador.</Text>
          <Button title="Reemplazar mis datos" onPress={confirm} />
          <Button title="Cancelar" onPress={() => setPending(null)} variant="secondary" />
        </View>
      ) : (
        <View style={{ gap: 10 }}>
          <Button title="Descargar respaldo" onPress={download} />
          <Button title="Restaurar desde un archivo" onPress={choose} variant="secondary" />
        </View>
      )}
      {message ? <Text style={AppTheme.hint}>{message}</Text> : null}
    </Card>
  );
}
