import { useCallback, useState } from "react";
import { Image, ScrollView, Text, View } from "react-native";
import { useFocusEffect } from "expo-router";

import { Button, Card, Chips, RowActions, Screen } from "@/src/components/ui";
import { getLatestBiometrics } from "@/src/features/biometrics/biometrics.repository";
import {
  addPhoto,
  comparePair,
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
  const load = useCallback(() => {
    getSetting(PHOTOS_KEY).then((value) =>
      // Una foto cuyo archivo ya no está (por ejemplo, tras restaurar en otro teléfono) no se muestra.
      setPhotos(readPhotos(value).filter((photo) => photoUri(photo.file))),
    );
    getNutritionProfile().then(setProfile);
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
  const pair = comparePair(photos, pose);
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
        {pair ? (
          <Card title={`Antes y ahora · ${daysBetween(pair.before.date, pair.after.date)} días`}>
            <View style={{ flexDirection: "row", gap: 8 }}>
              {[pair.before, pair.after].map((photo) => (
                <View key={photo.id} style={{ flex: 1, gap: 4 }}>
                  <Image
                    source={{ uri: photoUri(photo.file) ?? undefined }}
                    style={{ width: "100%", aspectRatio: 3 / 4, borderRadius: 12 }}
                  />
                  <Text style={AppTheme.hint}>{caption(photo)}</Text>
                </View>
              ))}
            </View>
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
