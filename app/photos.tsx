import { useCallback, useState } from "react";
import { Image, Pressable, ScrollView, Text, View } from "react-native";
import { useFocusEffect } from "expo-router";

import { Button, Card, Chips, LinkButton, RowActions, Screen, Segmented } from "@/src/components/ui";
import { getDashboardSnapshot } from "@/src/features/dashboard/dashboard.repository";
import {
  MEASUREMENTS_KEY,
  readMeasurements,
  type Measurement,
} from "@/src/features/measurements/measurements";
import { getLatestBiometrics } from "@/src/features/biometrics/biometrics.repository";
import {
  addPhoto,
  comparePair,
  comparisonStats,
  daysBetween,
  PHOTOS_KEY,
  POSE_LABELS,
  readPhotos,
  removePhoto,
  type Pose,
  type ProgressPhoto,
} from "@/src/features/photos/photos";
import {
  capturePhoto,
  deletePhotoFile,
  PHOTOS_SUPPORTED,
  photoUri,
} from "@/src/features/photos/photos.storage";
import { weightUnitOf, type NutritionProfile } from "@/src/features/profile/profile";
import { getNutritionProfile } from "@/src/features/profile/profile.repository";
import { getSetting, setSetting } from "@/src/features/settings/settings.repository";
import { localDateKey } from "@/src/lib/dates";
import { VIEWER } from "@/src/lib/mode";
import { formatWeight } from "@/src/lib/units";
import { AppTheme } from "@/src/theme";

const newId = () => `${Date.now()}-${Math.random().toString(36).slice(2)}`;

// Fotos de progreso: se toman o eligen en el teléfono, quedan en la carpeta
// privada de la app y se comparan la primera y la última de cada pose.
export default function PhotosScreen() {
  const [photos, setPhotos] = useState<ProgressPhoto[]>([]);
  const [pose, setPose] = useState<Pose>("front");
  const [profile, setProfile] = useState<NutritionProfile | null>(null);
  const [series, setSeries] = useState<Array<{ date: string; weightKg: number }>>([]);
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [chosen, setChosen] = useState<{ before?: string; after?: string }>({});
  const [mode, setMode] = useState<"side" | "flip">("side");
  const [showAfter, setShowAfter] = useState(true);
  const load = useCallback(() => {
    getSetting(PHOTOS_KEY).then((value) =>
      // Una foto cuyo archivo ya no está (por ejemplo, tras restaurar en otro teléfono) no se muestra.
      setPhotos(readPhotos(value).filter((photo) => photoUri(photo.file))),
    );
    getNutritionProfile().then(setProfile);
    getSetting(MEASUREMENTS_KEY).then((value) => setMeasurements(readMeasurements(value)));
    getDashboardSnapshot().then((snapshot) => {
      const engine = snapshot.analysis.adaptive;
      setSeries(engine?.active ? engine.series : []);
    });
  }, []);
  useFocusEffect(load);

  if (!PHOTOS_SUPPORTED || VIEWER)
    return (
      <Screen>
        <View style={AppTheme.content}>
          <Card title="Fotos de progreso">
            <Text style={AppTheme.body}>
              Las fotos se toman y se guardan solo en el teléfono, en la carpeta privada de la app. Ábrelas
              desde la app en tu celular.
            </Text>
          </Card>
        </View>
      </Screen>
    );

  const store = async (next: ProgressPhoto[]) => {
    setPhotos(next);
    await setSetting(PHOTOS_KEY, next);
  };
  const take = async (source: "camera" | "library") => {
    const file = await capturePhoto(source);
    if (!file) return;
    const latest = await getLatestBiometrics();
    await store(
      addPhoto(photos, { id: newId(), date: localDateKey(), file, pose, weightKg: latest?.weightKg ?? null }),
    );
  };
  const unit = profile ? weightUnitOf(profile) : "kg";
  const auto = comparePair(photos, pose);
  const byId = new Map(photos.map((photo) => [photo.id, photo]));
  const pickedBefore = chosen.before ? byId.get(chosen.before) : undefined;
  const pickedAfter = chosen.after ? byId.get(chosen.after) : undefined;
  const pair =
    auto || (pickedBefore && pickedAfter)
      ? {
          before: pickedBefore?.pose === pose ? pickedBefore : (auto?.before as ProgressPhoto),
          after: pickedAfter?.pose === pose ? pickedAfter : (auto?.after as ProgressPhoto),
        }
      : null;
  const stats = pair ? comparisonStats(pair.before, pair.after, series, measurements) : null;
  const ofPose = photos.filter((photo) => photo.pose === pose);
  const caption = (photo: ProgressPhoto) =>
    `${photo.date}${photo.weightKg ? ` · ${formatWeight(photo.weightKg, unit, 1)}` : ""}`;

  return (
    <Screen>
      <ScrollView contentContainerStyle={AppTheme.content}>
        <Chips
          value={pose}
          onChange={setPose}
          options={(Object.keys(POSE_LABELS) as Pose[]).map((value) => ({
            value,
            label: POSE_LABELS[value],
          }))}
        />
        {pair && stats ? (
          <Card title={`Antes y ahora · ${daysBetween(pair.before.date, pair.after.date)} días`}>
            <Segmented
              label="Cómo comparar"
              value={mode}
              onChange={setMode}
              options={[
                { value: "side", label: "Lado a lado" },
                { value: "flip", label: "Alternar" },
              ]}
            />
            {mode === "side" ? (
              <View style={{ flexDirection: "row", gap: 8 }}>
                {[pair.before, pair.after].map((photo) => (
                  <View key={photo.id} style={{ flex: 1, gap: 4 }}>
                    <Image
                      source={{ uri: photoUri(photo.file) ?? undefined }}
                      style={{ width: "100%", aspectRatio: 3 / 4, borderRadius: 12 }}
                    />
                    <Text style={AppTheme.hint}>{photo.date}</Text>
                  </View>
                ))}
              </View>
            ) : (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Tocar para alternar entre antes y ahora"
                onPress={() => setShowAfter(!showAfter)}
                style={{ gap: 4 }}
              >
                <Image
                  source={{ uri: photoUri((showAfter ? pair.after : pair.before).file) ?? undefined }}
                  style={{ width: "100%", aspectRatio: 3 / 4, borderRadius: 12 }}
                />
                <Text style={AppTheme.hint}>
                  {showAfter ? "Ahora" : "Antes"} · {(showAfter ? pair.after : pair.before).date} · toca para
                  cambiar
                </Text>
              </Pressable>
            )}
            <View
              style={{
                flexDirection: "row",
                borderTopWidth: 1,
                borderTopColor: AppTheme.colors.border,
                paddingTop: 10,
              }}
            >
              {[
                {
                  label: stats.realWeight ? "Peso real" : "Peso",
                  value:
                    stats.beforeKg !== null && stats.afterKg !== null
                      ? `${stats.afterKg - stats.beforeKg > 0 ? "+" : "−"}${formatWeight(Math.abs(stats.afterKg - stats.beforeKg), unit, 1)}`
                      : "—",
                },
                {
                  label: "Cintura",
                  value: stats.waistCm
                    ? `${stats.waistCm.after - stats.waistCm.before > 0 ? "+" : "−"}${Math.abs(stats.waistCm.after - stats.waistCm.before).toFixed(1)} cm`
                    : "—",
                },
                { label: "Tiempo", value: `${Math.round(stats.days / 7)} sem` },
              ].map((figure, index) => (
                <View
                  key={figure.label}
                  style={[
                    { flex: 1, gap: 2 },
                    index > 0 && {
                      borderLeftWidth: 1,
                      borderLeftColor: AppTheme.colors.border,
                      paddingLeft: 10,
                    },
                  ]}
                >
                  <Text style={[AppTheme.hint, { fontSize: 11 }]}>{figure.label}</Text>
                  <Text style={[AppTheme.tileValue, { fontSize: 18 }]}>{figure.value}</Text>
                </View>
              ))}
            </View>
            {stats.realWeight ? (
              <Text style={AppTheme.hint}>
                Peso real del motor en cada fecha, sin el agua del día: la comparación no se deja engañar.
              </Text>
            ) : null}
          </Card>
        ) : (
          <Card title="Antes y ahora">
            <Text style={AppTheme.body}>
              Con dos fotos de {POSE_LABELS[pose].toLowerCase()} verás la primera junto a la más reciente.
              Tómalas con la misma luz, distancia y hora para que se puedan comparar.
            </Text>
          </Card>
        )}
        <View style={{ flexDirection: "row", gap: 10 }}>
          <View style={{ flex: 1 }}>
            <Button title="Tomar foto" onPress={() => take("camera")} />
          </View>
          <View style={{ flex: 1 }}>
            <Button title="Elegir de galería" variant="secondary" onPress={() => take("library")} />
          </View>
        </View>
        {ofPose.length ? (
          <Card title={`Todas · ${POSE_LABELS[pose]}`}>
            {ofPose.map((photo) => (
              <View
                key={photo.id}
                style={{ flexDirection: "row", gap: 12, alignItems: "center", paddingVertical: 6 }}
              >
                <Image
                  source={{ uri: photoUri(photo.file) ?? undefined }}
                  style={{ width: 54, height: 72, borderRadius: 8 }}
                />
                <View style={{ flex: 1 }}>
                  <Text style={AppTheme.entryName}>{caption(photo)}</Text>
                  <View style={AppTheme.rowActions}>
                    <LinkButton
                      title="Usar como antes"
                      onPress={() => setChosen({ ...chosen, before: photo.id })}
                    />
                    <LinkButton
                      title="Usar como ahora"
                      onPress={() => setChosen({ ...chosen, after: photo.id })}
                    />
                  </View>
                  <RowActions
                    question="¿Borrar esta foto?"
                    onDelete={async () => {
                      deletePhotoFile(photo.file);
                      await store(removePhoto(photos, photo.id));
                    }}
                  />
                </View>
              </View>
            ))}
          </Card>
        ) : null}
        <Text style={AppTheme.hint}>
          Las fotos quedan solo en este teléfono, en la carpeta privada de la app, y no entran en el respaldo.
        </Text>
      </ScrollView>
    </Screen>
  );
}
