import { useState } from "react";
import { Text } from "react-native";

import { Button, Card } from "@/src/components/ui";
import { readAllData } from "@/src/features/backup/backup.repository";
import { dailyCsv, mealsCsv, setsCsv } from "@/src/features/export/export";
import { localDateKey } from "@/src/lib/dates";
import { shareTextFile } from "@/src/lib/files";
import { AppTheme } from "@/src/theme";

/** Exportar a CSV para una hoja de cálculo o un entrenador. Solo sale si lo compartes. */
export function ExportCard() {
  const [message, setMessage] = useState("");
  const exportCsv = async (name: string, build: typeof dailyCsv) => {
    try {
      await shareTextFile(`dophamine-${name}-${localDateKey()}.csv`, build(await readAllData()), "text/csv");
      setMessage(`Listo: ${name}.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo exportar.");
    }
  };
  return (
    <Card title="Exportar a CSV">
      <Text style={AppTheme.hint}>
        Para abrir en Excel o Google Sheets, o enviárselo a tu entrenador. Se abre en cualquier hoja de
        cálculo.
      </Text>
      <Button
        title="Diario (peso, comida, sueño)"
        variant="secondary"
        onPress={() => exportCsv("diario", dailyCsv)}
      />
      <Button
        title="Comidas (cada alimento)"
        variant="secondary"
        onPress={() => exportCsv("comidas", mealsCsv)}
      />
      <Button
        title="Entrenos (cada serie)"
        variant="secondary"
        onPress={() => exportCsv("series", setsCsv)}
      />
      {message ? <Text style={AppTheme.body}>{message}</Text> : null}
    </Card>
  );
}
