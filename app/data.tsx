import { ScrollView } from "react-native";

import { Screen } from "@/src/components/ui";
import { BackupCard } from "@/src/features/backup/BackupCard";
import { BackupGuide } from "@/src/features/backup/BackupGuide";
import { ViewerOnlyNotice } from "@/src/features/backup/ViewerSections";
import { ExportCard } from "@/src/features/export/ExportCard";
import { HealthConnectCard } from "@/src/features/health/HealthConnectCard";
import { VIEWER } from "@/src/lib/mode";
import { AppTheme } from "@/src/theme";

// Respaldo: guardar y restaurar los datos, traerlos de Health Connect y exportarlos.
export default function DataScreen() {
  if (VIEWER) return <ViewerOnlyNotice what="El respaldo" />;
  return (
    <Screen>
      <ScrollView contentContainerStyle={AppTheme.content}>
        <BackupCard onRestored={() => undefined} />
        <BackupGuide />
        <HealthConnectCard onImported={() => undefined} />
        <ExportCard />
      </ScrollView>
    </Screen>
  );
}
