import { useState } from "react";
import { Text, View } from "react-native";

import { Button, Card } from "@/src/components/ui";
import { BackupError, describeBackup, parseBackup, type Backup } from "@/src/features/backup/backup";
import {
  backupAvailable,
  backupPlace,
  downloadBackup,
  exportLabel,
  pickBackupFile,
  restoreBackup,
} from "@/src/features/backup/backup.repository";
import { VIEWER } from "@/src/lib/mode";
import { AppTheme } from "@/src/theme";

/**
 * Exportar y restaurar un respaldo. Restaurar reemplaza todos los datos, así
 * que primero muestra qué trae el archivo y pide confirmar.
 *
 * En el visor web sirve para cargar el respaldo del teléfono: `title` e `intro`
 * permiten presentarlo así.
 */
export function BackupCard({
  onRestored,
  title = "Respaldo",
  intro,
}: {
  onRestored: () => void;
  title?: string;
  intro?: string;
}) {
  const [pending, setPending] = useState<Backup | null>(null);
  const [message, setMessage] = useState("");

  if (!backupAvailable) return null;

  const download = async () => {
    try {
      await downloadBackup();
      setMessage("Respaldo listo. Guárdalo en un lugar seguro: contiene tus datos de salud.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo crear el respaldo.");
    }
  };
  const choose = async () => {
    setMessage("");
    try {
      const text = await pickBackupFile();
      if (text === null) return;
      setPending(parseBackup(text));
    } catch (error) {
      setPending(null);
      setMessage(error instanceof BackupError ? error.message : "No se pudo leer el archivo.");
    }
  };
  const confirm = async () => {
    if (!pending) return;
    try {
      await restoreBackup(pending);
      setPending(null);
      setMessage("Datos restaurados.");
      onRestored();
    } catch {
      setMessage("No se pudo restaurar el respaldo. Tus datos anteriores siguen intactos.");
    }
  };

  return (
    <Card title={title}>
      <Text style={AppTheme.body}>
        {intro ??
          `Tus datos viven solo en ${backupPlace}. Si se borran o cambias de dispositivo, se pierden: guarda un respaldo de vez en cuando.`}
      </Text>
      {pending ? (
        <View style={{ gap: 10 }}>
          <Text style={AppTheme.body}>{describeBackup(pending)}</Text>
          <Text style={AppTheme.hint}>Restaurar reemplaza todo lo que tienes ahora en {backupPlace}.</Text>
          <Button title="Reemplazar mis datos" onPress={confirm} />
          <Button title="Cancelar" onPress={() => setPending(null)} variant="secondary" />
        </View>
      ) : (
        <View style={{ gap: 10 }}>
          {VIEWER ? (
            <>
              <Button title="Cargar un respaldo" onPress={choose} />
              <Button title="Descargar estos datos" onPress={download} variant="secondary" />
            </>
          ) : (
            <>
              <Button title={exportLabel} onPress={download} />
              <Button title="Restaurar desde un archivo" onPress={choose} variant="secondary" />
            </>
          )}
        </View>
      )}
      {message ? <Text style={AppTheme.hint}>{message}</Text> : null}
    </Card>
  );
}
