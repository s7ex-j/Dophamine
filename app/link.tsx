import { useCallback, useEffect, useRef, useState } from "react";
import { ScrollView, Share } from "react-native";
import { Text } from "@/src/components/Text";

import { Button, Card, Input, LinkButton, Screen } from "@/src/components/ui";
import { buildBackup, describeBackup } from "@/src/features/backup/backup";
import { readAllData } from "@/src/features/backup/backup.repository";
import { dayTotals, readDiet, unresolved, type DietPlan } from "@/src/features/diet/diet";
import { getDiet, saveDiet } from "@/src/features/diet/diet.repository";
import { rtcAvailable, startAnswer, type Link, type LinkState } from "@/src/features/link/peer";
import { LINK_VERSION, type LinkMessage } from "@/src/features/link/protocol";
import { QrCode } from "@/src/features/link/QrCode";
import { errorText, SameNetwork, Verification, WebLink } from "@/src/features/link/WebLink";
import { QrScanner } from "@/src/features/link/QrScanner";
import { VIEWER } from "@/src/lib/mode";
import { AppTheme } from "@/src/theme";

// Conexión directa entre el teléfono y la web: dos códigos QR abren un canal
// cifrado de dispositivo a dispositivo dentro de la misma red, sin servidor.
// La web (visor) empieza y muestra su código; el teléfono lo lee y responde.
export default function LinkScreen() {
  return VIEWER ? <WebLink /> : <PhoneSide />;
}

/** El teléfono: lee el código de la web, muestra el suyo y decide qué enviar y qué guardar. */
function PhoneSide() {
  const session = useRef<Link | null>(null);
  const [offer, setOffer] = useState("");
  const [code, setCode] = useState("");
  const [state, setState] = useState<LinkState | "idle" | "answer">("idle");
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState("");
  const [asked, setAsked] = useState(false);
  const [sent, setSent] = useState("");
  const [incoming, setIncoming] = useState<DietPlan | null>(null);
  const [replaces, setReplaces] = useState(false);
  const [saved, setSaved] = useState("");

  useEffect(() => () => session.current?.close(), []);

  const onMessage = useCallback(async (message: LinkMessage) => {
    if (message.t === "get") setAsked(true);
    if (message.t === "diet") {
      const plan = readDiet(message.plan);
      if (!plan) {
        session.current
          ?.send({ t: "ack", of: "diet", ok: false, note: "La dieta recibida no es válida." })
          .catch(() => undefined);
        return;
      }
      setReplaces(Boolean(await getDiet()));
      setSaved("");
      setIncoming(plan);
    }
  }, []);

  const connect = async (value: string) => {
    setError("");
    setScanning(false);
    try {
      const answer = await startAnswer(value, {
        onMessage,
        onState: (next) => {
          setState(next);
          if (next === "open")
            answer.link.send({ t: "hello", v: LINK_VERSION, role: "phone" }).catch(() => undefined);
        },
      });
      session.current = answer.link;
      setCode(answer.code);
      setState((current) => (current === "idle" ? "answer" : current));
    } catch (problem) {
      setError(errorText(problem));
    }
  };
  const sendData = async () => {
    try {
      const backup = buildBackup(await readAllData());
      await session.current?.send({ t: "backup", backup });
      setSent(describeBackup(backup));
      setAsked(false);
    } catch (problem) {
      setError(errorText(problem));
    }
  };
  const refuse = () => {
    session.current?.send({ t: "ack", of: "backup", ok: false }).catch(() => undefined);
    setAsked(false);
  };
  const answerDiet = async (accept: boolean) => {
    if (!incoming) return;
    if (accept) await saveDiet(incoming);
    session.current
      ?.send({
        t: "ack",
        of: "diet",
        ok: accept,
        ...(accept ? {} : { note: "En el teléfono se descartó la dieta." }),
      })
      .catch(() => undefined);
    setSaved(accept ? "Dieta guardada. La verás en Más → Mi dieta y en el Panel." : "Dieta descartada.");
    setIncoming(null);
  };

  if (!rtcAvailable())
    return (
      <Screen>
        <ScrollView contentContainerStyle={AppTheme.content}>
          <Text style={AppTheme.title}>Disponible con la app instalada.</Text>
          <Text style={AppTheme.body}>
            Para conectarse con la web sin servidor, el teléfono necesita una pieza que Expo Go no incluye.
            Llegará con la app instalada (APK). Mientras tanto, usa Más → Respaldo → Compartir respaldo y
            carga ese archivo en la web.
          </Text>
        </ScrollView>
      </Screen>
    );

  return (
    <Screen>
      <ScrollView contentContainerStyle={AppTheme.content} keyboardShouldPersistTaps="handled">
        <Text style={AppTheme.title}>Mira tus datos en la web sin subir un archivo.</Text>
        <SameNetwork />
        {error ? <Text style={AppTheme.errorText}>{error}</Text> : null}

        {state === "idle" ? (
          <Card title="1. Lee el código de la web">
            <Text style={AppTheme.body}>
              En la computadora abre Dophamine, entra a Conectar con el teléfono y pulsa Mostrar código QR.
            </Text>
            {scanning ? (
              <QrScanner
                onCode={connect}
                onClose={() => setScanning(false)}
                hint="Apunta al código QR de la pantalla."
              />
            ) : (
              <Button title="Leer el código QR" onPress={() => setScanning(true)} />
            )}
            <Input
              label="Código de la web"
              value={offer}
              onChangeText={setOffer}
              autoCapitalize="none"
              autoCorrect={false}
              placeholder="O pega aquí el código"
            />
            <Button title="Conectar" variant="secondary" onPress={() => connect(offer)} />
          </Card>
        ) : null}

        {state === "answer" || state === "connecting" ? (
          <Card title="2. Envía este código a la computadora">
            <Text style={AppTheme.body}>
              Mándalo como prefieras (WhatsApp Web, correo, Enlace Móvil) y pégalo en la web. Si la
              computadora tiene cámara, también puede leer el QR.
            </Text>
            <Button title="Enviar a la computadora" onPress={() => Share.share({ message: code })} />
            <QrCode value={code} />
            <Text selectable accessibilityLabel="Código de respuesta" style={AppTheme.hint}>
              {code}
            </Text>
          </Card>
        ) : null}

        {state === "open" ? (
          <>
            <Verification link={session.current} />
            {asked ? (
              <Card title="La web pide tus datos">
                <Text style={AppTheme.body}>
                  Se enviará una copia de tu progreso a esa pantalla para verla ahí. En tu teléfono no cambia
                  nada.
                </Text>
                <Button title="Enviar mis datos" onPress={sendData} />
                <LinkButton title="No enviar" onPress={refuse} />
              </Card>
            ) : null}
            {sent ? (
              <Card title="Datos enviados">
                <Text style={AppTheme.body}>{sent}</Text>
              </Card>
            ) : null}
            {incoming ? (
              <Card title="La web envió una dieta">
                <Text style={AppTheme.body}>
                  {incoming.name}: {incoming.days[0]?.meals.length ?? 0} comidas ·{" "}
                  {incoming.days[0] ? dayTotals(incoming.days[0]).kcal : 0} kcal
                  {incoming.days.length > 1 ? ` · ${incoming.days.length} tipos de día` : ""}.
                </Text>
                {unresolved(incoming) ? (
                  <Text style={AppTheme.hint}>
                    {unresolved(incoming)} alimentos no se reconocieron: corrígelos luego en Mi dieta.
                  </Text>
                ) : null}
                {replaces ? (
                  <Text style={AppTheme.hint}>Reemplazará la dieta que tienes guardada.</Text>
                ) : null}
                <Button title="Guardar dieta" onPress={() => answerDiet(true)} />
                <LinkButton title="Descartar" onPress={() => answerDiet(false)} />
              </Card>
            ) : null}
            {saved ? <Text style={AppTheme.body}>{saved}</Text> : null}
            <Button
              title="Cerrar conexión"
              variant="secondary"
              onPress={() => {
                session.current?.close();
              }}
            />
          </>
        ) : null}

        {state === "closed" ? (
          <Card title="Conexión cerrada">
            {sent ? <Text style={AppTheme.body}>Datos enviados: {sent}</Text> : null}
            {saved ? <Text style={AppTheme.body}>{saved}</Text> : null}
            <Text style={AppTheme.body}>
              Si no llegó a conectar, revisa que los dos dispositivos estén en la misma red Wi-Fi.
            </Text>
            <Button
              title="Empezar de nuevo"
              variant="secondary"
              onPress={() => {
                session.current = null;
                setOffer("");
                setCode("");
                setAsked(false);
                setState("idle");
              }}
            />
          </Card>
        ) : null}
      </ScrollView>
    </Screen>
  );
}
