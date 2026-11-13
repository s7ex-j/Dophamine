import { useRouter } from "expo-router";
import { ScrollView } from "react-native";

import { Screen } from "@/src/components/ui";
import { CatalogBrowser } from "@/src/features/exercises/CatalogBrowser";
import { AppTheme } from "@/src/theme";

// Catálogo de ejercicios para explorar: por grupo muscular, músculo y equipo.
export default function CatalogScreen() {
  const router = useRouter();
  return (
    <Screen>
      <ScrollView contentContainerStyle={AppTheme.content} keyboardShouldPersistTaps="handled">
        <CatalogBrowser
          onOpen={(exercise) => router.push({ pathname: "/exercise", params: { name: exercise.name } })}
        />
      </ScrollView>
    </Screen>
  );
}
