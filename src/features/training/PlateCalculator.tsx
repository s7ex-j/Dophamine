import { useState } from "react";
import { Text } from "react-native";

import { Card, ChoiceControl, Input } from "@/src/components/ui";
import { BAR_OPTIONS, describePlates, plateLoad, PLATES } from "@/src/features/training/strength";
import type { WeightUnit } from "@/src/lib/units";
import { AppTheme } from "@/src/theme";

/** Calculadora de discos: qué poner en cada lado de la barra. Solo interfaz; no guarda nada. */
export function PlateCalculator({ unit }: { unit: WeightUnit }) {
  const [target, setTarget] = useState("");
  const [bar, setBar] = useState(String(BAR_OPTIONS[unit][0]));
  // Si cambia la unidad, la barra elegida deja de existir: se vuelve a la estándar.
  const bars = BAR_OPTIONS[unit].map(String);
  const currentBar = bars.includes(bar) ? bar : bars[0];
  const load = plateLoad(Number(target), Number(currentBar), PLATES[unit]);

  return (
    <Card title="Calculadora de discos">
      <Input
        label={`Peso total (${unit})`}
        value={target}
        onChangeText={setTarget}
        keyboardType="decimal-pad"
        placeholder={`Barra incluida, por ejemplo ${unit === "kg" ? "80" : "185"}`}
      />
      <Text style={AppTheme.label}>Barra</Text>
      <ChoiceControl
        value={currentBar}
        onChange={setBar}
        options={bars.map((value) => ({ value, label: `${value} ${unit}` }))}
      />
      {load ? (
        <>
          <Text style={AppTheme.energyNumber}>{describePlates(load)}</Text>
          <Text style={AppTheme.hint}>
            Por cada lado, en {unit}.
            {load.missing > 0
              ? ` Con estos discos llegas a ${load.loaded} ${unit}: faltan ${load.missing} ${unit}.`
              : ""}
          </Text>
        </>
      ) : (
        <Text style={AppTheme.hint}>
          {Number(target) > 0
            ? "El peso pedido es menor que la barra."
            : `Discos considerados: ${PLATES[unit].join(", ")} ${unit}.`}
        </Text>
      )}
    </Card>
  );
}
