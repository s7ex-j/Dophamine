import { useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";

import { Button, LinkButton } from "@/src/components/ui";
import { toggleHabit } from "@/src/features/habits/habits.repository";
import { dateKey } from "@/src/features/habits/habits";
import { composeNote, INFLUENCES, QUESTIONS } from "@/src/features/wellbeing/wellbeing";
import { saveWellbeingEntry } from "@/src/features/wellbeing/wellbeing.repository";
import { AppTheme } from "@/src/theme";

/**
 * Las tres preguntas, una a la vez: un toque por respuesta y pasa sola a la
 * siguiente. Al final, si quieres, qué influyó y una nota.
 */
export function QuickCheckIn({ onDone }: { onDone: () => void }) {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [tags, setTags] = useState<string[]>([]);
  const [note, setNote] = useState("");
  const question = QUESTIONS[step];

  const save = async () => {
    await saveWellbeingEntry({
      mood: answers.mood ?? 3,
      energy: answers.energy ?? 3,
      stress: answers.stress ?? 3,
      sleepHours: 0,
      note: composeNote(tags, note),
    });
    await toggleHabit("checkin", dateKey());
    onDone();
  };

  if (question)
    return (
      <View style={{ gap: 10 }}>
        <Text style={AppTheme.tileTitle}>{question.title}</Text>
        <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 4 }}>
          {question.options.map((option, index) => {
            const value = index + 1;
            const active = answers[question.key] === value;
            return (
              <Pressable
                key={option.label}
                accessibilityRole="button"
                accessibilityLabel={option.label}
                onPress={() => {
                  setAnswers({ ...answers, [question.key]: value });
                  setStep(step + 1);
                }}
                style={{
                  flex: 1,
                  alignItems: "center",
                  gap: 2,
                  paddingVertical: 8,
                  borderRadius: 12,
                  backgroundColor: active ? AppTheme.colors.accentSoft : AppTheme.colors.surface2,
                }}
              >
                <Text style={{ fontSize: 26 }}>{option.emoji}</Text>
                <Text style={[AppTheme.hint, { fontSize: 10 }]} numberOfLines={1}>
                  {option.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
        <Text style={AppTheme.hint}>
          {step + 1} de {QUESTIONS.length}
        </Text>
      </View>
    );

  return (
    <View style={{ gap: 10 }}>
      <Text style={AppTheme.tileTitle}>¿Algo influyó hoy? (opcional)</Text>
      <View style={AppTheme.chipRow}>
        {INFLUENCES.map((tag) => {
          const active = tags.includes(tag);
          return (
            <Pressable
              key={tag}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              onPress={() => setTags(active ? tags.filter((item) => item !== tag) : [...tags, tag])}
              style={[AppTheme.chip, active && AppTheme.chipActive]}
            >
              <Text style={[AppTheme.chipText, active && AppTheme.chipTextActive]}>{tag}</Text>
            </Pressable>
          );
        })}
      </View>
      <TextInput
        accessibilityLabel="Nota del chequeo"
        value={note}
        onChangeText={setNote}
        placeholder="Una línea, si quieres"
        placeholderTextColor={AppTheme.colors.muted}
        style={AppTheme.input}
      />
      <Button title="Listo" onPress={save} />
      <LinkButton title="Volver" onPress={() => setStep(QUESTIONS.length - 1)} />
    </View>
  );
}
