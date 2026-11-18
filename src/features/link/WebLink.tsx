import { useCallback, useEffect, useRef, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { ScrollView, View } from "react-native";
import { useRouter } from "expo-router";

import { Text } from "@/src/components/Text";
import { Button, Card, Input, Screen } from "@/src/components/ui";
import { describeBackup, parseBackup } from "@/src/features/backup/backup";
import { restoreBackup } from "@/src/features/backup/backup.repository";
import { viewerDataChanged } from "@/src/features/backup/viewerData";
import { dayTotals, parseDietText, unresolved } from "@/src/features/diet/diet";
import { startOffer, type Link, type LinkState } from "@/src/features/link/peer";
import { LINK_VERSION, type LinkMessage } from "@/src/features/link/protocol";
import { QrCode } from "@/src/features/link/QrCode";
import { QrScanner } from "@/src/features/link/QrScanner";
import { BUILTIN_FOODS } from "@/src/features/nutrition/builtin.foods";
import { getUserFoods } from "@/src/features/nutrition/nutrition.repository";
import { localDateKey } from "@/src/lib/dates";
import { AppTheme } from "@/src/theme";

// El lado de la web de la conexión directa (ver app/link.tsx). Se usa como pantalla propia y,
// en el visor sin datos, dentro de la página de inicio.

export const errorText = (error: unknown) =>
  error instanceof Error && error.message ? error.message : "No se pudo completar la conexión.";

export function Verification({ link }: { link: Link | null }) {
  const code = link?.verification();
  if (!code) return null;
  return (
    <View style={AppTheme.banner}>
      <Text style={AppTheme.bannerTitle}>Conectado · verificación {code}</Text>
      <Text style={AppTheme.bannerText}>
        Los dos dispositivos deben mostrar el mismo número. Si no coincide, cierra y vuelve a empezar.
      </Text>
    </View>
  );
}

export const SameNetwork = () => (
  <Text style={AppTheme.hint}>
    Los dos dispositivos deben estar en la misma red Wi-Fi. La conexión va cifrada de uno al otro: no pasa por
    ningún servidor ni sale de tu red.
  </Text>
);

/** La web: muestra su código, lee el del teléfono, recibe los datos y puede enviar una dieta. */
export function WebLink({
  embedded = false,
  onShowProgress,
}: {
  embedded?: boolean;
  /** Dentro del visor sin datos, "Ver mi progreso" vuelve a dibujar esa misma página con los datos. */
  onShowProgress?: () => void;
}) {
  const router = useRouter();
  const session = useRef<{ link: Link; accept: (code: string) => Promise<void> } | null>(null);
  const [code, setCode] = useState("");
  const [answer, setAnswer] = useState("");
  const [state, setState] = useState<LinkState | "idle" | "offer">("idle");
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [progress, setProgress] = useState(0);
  const [loaded, setLoaded] = useState("");
  const [dietText, setDietText] = useState("");
  const [dietStatus, setDietStatus] = useState("");

  useEffect(() => () => session.current?.link.close(), []);

  const onMessage = useCallback(async (message: LinkMessage) => {
    if (message.t === "backup") {
      try {
        const backup = parseBackup(JSON.stringify(message.backup));
        await restoreBackup(backup);
        setLoaded(describeBackup(backup));
        viewerDataChanged();
        setStatus("");
      } catch (problem) {
        setError(errorText(problem));
      }
    } else if (message.t === "ack" && message.of === "backup" && !message.ok)
      setStatus("En el teléfono se eligió no enviar los datos.");
    else if (message.t === "ack" && message.of === "diet")
      setDietStatus(
        message.ok ? "Dieta guardada en el teléfono." : (message.note ?? "El teléfono no guardó la dieta."),
      );
  }, []);

  const begin = async () => {
    setError("");
    try {
      const offer = await startOffer({
        onMessage,
        onProgress: setProgress,
        onState: (next) => {
          setState(next);
          if (next !== "open") return;
          offer.link.send({ t: "hello", v: LINK_VERSION, role: "web" }).catch(() => undefined);
          offer.link.send({ t: "get", what: "backup" }).catch(() => undefined);
          setStatus("Confirma en el teléfono para traer tus datos.");
        },
      });
      session.current = offer;
      setCode(offer.code);
      setState("offer");
    } catch (problem) {
      setError(errorText(problem));
    }
  };
  const connect = async (value: string) => {
    setError("");
    setScanning(false);
    try {
      await session.current?.accept(value);
      setState("connecting");
    } catch (problem) {
      setError(errorText(problem));
    }
  };
  const sendDiet = async () => {
    const foods = [...(await getUserFoods()), ...BUILTIN_FOODS];
    const { plan } = parseDietText(dietText, foods, "Mi dieta", localDateKey());
    if (!plan.days.length)
      return setDietStatus("No encontré comidas. Escribe cada comida en una línea y sus alimentos debajo.");
    const pending = unresolved(plan);
    try {
      await session.current?.link.send({ t: "diet", plan });
      setDietStatus(
        `Dieta enviada (${plan.days[0].meals.length} comidas, ${dayTotals(plan.days[0]).kcal} kcal). Confírmala en el teléfono.${
          pending ? ` ${pending} alimentos no se reconocieron: podrás corregirlos allí.` : ""
        }`,
      );
    } catch (problem) {
      setDietStatus(errorText(problem));
    }
  };

  const body = (
    <>
      {embedded ? null : (
        <Text style={AppTheme.title}>Trae tus datos del teléfono sin subir un archivo.</Text>
      )}
      {embedded ? null : <SameNetwork />}
      {error ? <Text style={AppTheme.errorText}>{error}</Text> : null}

      {state === "idle" ? (
        <Card title="1. Muestra el código de esta pantalla">
          <Text style={AppTheme.body}>
            En el teléfono abre Más → Conectar con la web y lee el código QR que aparecerá aquí.
          </Text>
          {embedded ? (
            <View
              style={{
                height: 200,
                borderRadius: 12,
                borderWidth: 1,
                borderStyle: "dashed",
                borderColor: AppTheme.colors.border,
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
              }}
            >
              <Ionicons name="qr-code-outline" size={44} color={AppTheme.colors.muted} />
              <Text style={AppTheme.hint}>El código aparece aquí</Text>
            </View>
          ) : null}
          <Button title="Mostrar código QR" onPress={begin} />
        </Card>
      ) : null}

      {state === "offer" || state === "connecting" ? (
        <>
          <Card title="1. Lee este código con el teléfono">
            <QrCode value={code} />
            <Text selectable accessibilityLabel="Código de conexión" style={AppTheme.hint}>
              {code}
            </Text>
          </Card>
          <Card title="2. Pega el código que te envía el teléfono">
            <Text style={AppTheme.hint}>
              En el teléfono toca "Enviar a la computadora" y mándalo como prefieras (WhatsApp Web, correo,
              Enlace Móvil). Luego pégalo aquí.
            </Text>
            <Input
              label="Código del teléfono"
              value={answer}
              onChangeText={setAnswer}
              autoCapitalize="none"
              autoCorrect={false}
              placeholder="Pega aquí el código"
            />
            {state === "connecting" ? (
              <Text style={AppTheme.body}>Conectando…</Text>
            ) : (
              <Button title="Conectar" onPress={() => connect(answer)} />
            )}
            {state === "connecting" ? null : scanning ? (
              <QrScanner
                onCode={connect}
                onClose={() => setScanning(false)}
                hint="Acerca el teléfono a la cámara hasta que el código se vea completo."
              />
            ) : (
              <Button
                title="O léelo con la cámara de la computadora"
                variant="secondary"
                onPress={() => setScanning(true)}
              />
            )}
          </Card>
        </>
      ) : null}

      {state === "open" ? (
        <>
          <Verification link={session.current?.link ?? null} />
          <Card title="Tus datos">
            {loaded ? (
              <>
                <Text style={AppTheme.body}>Datos cargados: {loaded}</Text>
                <Button
                  title="Ver mi progreso"
                  onPress={() => (onShowProgress ? onShowProgress() : router.replace("/"))}
                />
              </>
            ) : (
              <Text style={AppTheme.body}>
                {progress > 0 ? `Recibiendo… ${Math.round(progress * 100)} %` : status}
              </Text>
            )}
          </Card>
          <Card title="Enviar una dieta al teléfono">
            <Text style={AppTheme.hint}>
              Pega aquí tu dieta: una comida por título y sus alimentos debajo, con la cantidad. En el
              teléfono se pedirá confirmación antes de guardarla.
            </Text>
            <Input
              label="Dieta"
              value={dietText}
              onChangeText={setDietText}
              multiline
              placeholder={"Desayuno 7:30\n- Avena 60 g\n- 2 huevos"}
            />
            <Button title="Enviar dieta" onPress={sendDiet} />
            {dietStatus ? <Text style={AppTheme.body}>{dietStatus}</Text> : null}
          </Card>
        </>
      ) : null}

      {state === "closed" ? (
        <Card title="Conexión cerrada">
          {loaded ? <Text style={AppTheme.body}>Datos cargados: {loaded}</Text> : null}
          <Text style={AppTheme.body}>
            Si no llegó a conectar, revisa que los dos dispositivos estén en la misma red Wi-Fi.
          </Text>
          {loaded ? (
            <Button
              title="Ver mi progreso"
              onPress={() => (onShowProgress ? onShowProgress() : router.replace("/"))}
            />
          ) : null}
          <Button
            title="Empezar de nuevo"
            variant="secondary"
            onPress={() => {
              session.current = null;
              setCode("");
              setAnswer("");
              setState("idle");
            }}
          />
        </Card>
      ) : null}
    </>
  );
  if (embedded) return <View style={{ gap: 14 }}>{body}</View>;
  return (
    <Screen>
      <ScrollView contentContainerStyle={AppTheme.content} keyboardShouldPersistTaps="handled">
        {body}
      </ScrollView>
    </Screen>
  );
}
