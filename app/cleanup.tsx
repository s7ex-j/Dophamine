import { useCallback, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useFocusEffect } from "expo-router";

import { Button, Card, Input, LinkButton, Screen } from "@/src/components/ui";
import type { Store } from "@/src/db/web-storage";
import { buildBackup } from "@/src/features/backup/backup";
import { readAllData, restoreBackup } from "@/src/features/backup/backup.repository";
import { ViewerOnlyNotice } from "@/src/features/backup/ViewerSections";
import {
  countInRange,
  deleteExercise,
  deleteRange,
  exerciseCounts,
  KIND_LABELS,
  type DataKind,
} from "@/src/features/cleanup/cleanup";
import { addDays, localDateKey } from "@/src/lib/dates";
import { VIEWER } from "@/src/lib/mode";
import { AppTheme } from "@/src/theme";

export default function CleanupScreen() {
  return VIEWER ? <ViewerOnlyNotice what="Borrar datos" /> : <CleanupContent />;
}

const isDate = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value.trim());

// Borrar con precisión: un rango de fechas y qué tipo de datos, o un ejercicio entero.
// Pide confirmar y lo hace en una sola operación (todo o nada).
function CleanupContent() {
  const [store, setStore] = useState<Store | null>(null);
  const [from, setFrom] = useState(addDays(localDateKey(), -6));
  const [to, setTo] = useState(localDateKey());
  const [kinds, setKinds] = useState<DataKind[]>([]);
  const [asking, setAsking] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const load = useCallback(() => {
    readAllData().then(setStore);
  }, []);
  useFocusEffect(load);
  if (!store) return <Screen />;

  const valid = isDate(from) && isDate(to) && from.trim() <= to.trim();
  const counts = valid ? countInRange(store, from.trim(), to.trim()) : null;
  const total = counts ? kinds.reduce((sum, kind) => sum + counts[kind], 0) : 0;
  const apply = async (next: Store, done: string) => {
    await restoreBackup(buildBackup(next));
    setAsking(null);
    setKinds([]);
    setMessage(done);
    load();
  };

  return (
    <Screen>
      <ScrollView contentContainerStyle={AppTheme.content} keyboardShouldPersistTaps="handled">
        <Card title="Por fechas">
          <View style={{ flexDirection: "row", gap: 10 }}>
            <View style={{ flex: 1 }}>
              <Input label="Desde" value={from} onChangeText={setFrom} placeholder="AAAA-MM-DD" />
            </View>
            <View style={{ flex: 1 }}>
              <Input label="Hasta" value={to} onChangeText={setTo} placeholder="AAAA-MM-DD" />
            </View>
          </View>
          {!valid ? (
            <Text style={AppTheme.errorText}>Escribe dos fechas (AAAA-MM-DD), la primera antes.</Text>
          ) : null}
          {(Object.keys(KIND_LABELS) as DataKind[]).map((kind) => {
            const active = kinds.includes(kind);
            return (
              <Pressable
                key={kind}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: active }}
                accessibilityLabel={`Borrar ${KIND_LABELS[kind]}`}
                onPress={() => setKinds(active ? kinds.filter((item) => item !== kind) : [...kinds, kind])}
                style={[AppTheme.entryRow, { gap: 10 }]}
              >
                <View
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: 5,
                    borderWidth: 2,
                    borderColor: active ? AppTheme.colors.coral : AppTheme.colors.border,
                    backgroundColor: active ? AppTheme.colors.coral : "transparent",
                  }}
                />
                <Text style={[AppTheme.entryName, { flex: 1 }]}>{KIND_LABELS[kind]}</Text>
                <Text style={AppTheme.hint}>{counts ? counts[kind] : "—"}</Text>
              </Pressable>
            );
          })}
          {asking === "range" ? (
            <View style={{ gap: 8 }}>
              <Text style={AppTheme.body}>
                Se borrarán {total} registros entre {from} y {to}. No se puede deshacer (salvo con un
                respaldo).
              </Text>
              <Button
                title="Sí, borrar"
                onPress={() =>
                  apply(deleteRange(store, from.trim(), to.trim(), kinds), `Borrados ${total} registros.`)
                }
              />
              <LinkButton title="Cancelar" onPress={() => setAsking(null)} />
            </View>
          ) : (
            <Button
              title="Borrar lo marcado"
              variant="secondary"
              onPress={() =>
                valid && total ? setAsking("range") : setMessage("No hay nada marcado en esas fechas.")
              }
            />
          )}
        </Card>

        <Card title="Un ejercicio">
          {exerciseCounts(store).map((item) => (
            <View key={item.name} style={{ gap: 4, paddingVertical: 4 }}>
              <View style={AppTheme.legendRow}>
                <Text style={[AppTheme.entryName, { flex: 1 }]}>{item.name}</Text>
                <Text style={AppTheme.hint}>{item.sets} series</Text>
              </View>
              {asking === item.name ? (
                <View style={AppTheme.rowActions}>
                  <Text style={AppTheme.rowQuestion}>
                    ¿Borrar sus {item.sets} series de todas las sesiones?
                  </Text>
                  <LinkButton
                    title="Sí, borrar"
                    danger
                    onPress={() =>
                      apply(deleteExercise(store, item.name), `Borradas las series de ${item.name}.`)
                    }
                  />
                  <LinkButton title="Cancelar" onPress={() => setAsking(null)} />
                </View>
              ) : (
                <LinkButton title="Borrar este ejercicio" danger onPress={() => setAsking(item.name)} />
              )}
            </View>
          ))}
          {!exerciseCounts(store).length ? (
            <Text style={AppTheme.body}>Aún no hay series guardadas.</Text>
          ) : null}
        </Card>
        {message ? <Text style={AppTheme.body}>{message}</Text> : null}
        <Text style={AppTheme.hint}>Antes de borrar mucho, conviene guardar un respaldo desde Más.</Text>
      </ScrollView>
    </Screen>
  );
}
