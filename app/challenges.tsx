import { useCallback, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useFocusEffect } from "expo-router";

import { Card, Screen } from "@/src/components/ui";
import { ViewerOnlyNotice } from "@/src/features/backup/ViewerSections";
import {
  CHALLENGE_DAYS,
  CHALLENGE_TEXT,
  CHALLENGES_KEY,
  challengeProgress,
  readChallenges,
  settleChallenges,
  startChallenge,
  type ChallengeProgress,
  type Challenges,
  type DayMark,
} from "@/src/features/challenges/challenges";
import { COMPLIANCE_ITEMS, type ComplianceKey, type DayCompliance } from "@/src/features/habits/compliance";
import { getComplianceDays } from "@/src/features/habits/compliance.data";
import { getSetting, setSetting } from "@/src/features/settings/settings.repository";
import { daysBetween } from "@/src/features/photos/photos";
import { localDateKey } from "@/src/lib/dates";
import { VIEWER } from "@/src/lib/mode";
import { AppTheme } from "@/src/theme";

const MARK_COLORS: Record<DayMark, string> = {
  done: AppTheme.colors.accent,
  missed: AppTheme.colors.coral,
  today: "transparent",
  pending: AppTheme.colors.surface2,
};

export default function ChallengesScreen() {
  return VIEWER ? <ViewerOnlyNotice what="Retos" /> : <ChallengesContent />;
}

// Retos de 21 días: un compromiso del cumplimiento, tres semanas seguidas.
function ChallengesContent() {
  const today = localDateKey();
  const [state, setState] = useState<Challenges | null>(null);
  const [compliance, setCompliance] = useState<Map<string, DayCompliance>>(new Map());
  const load = useCallback(() => {
    getSetting(CHALLENGES_KEY).then(async (value) => {
      const saved = readChallenges(value);
      const span = Math.min(
        60,
        Math.max(1, ...saved.active.map((challenge) => daysBetween(challenge.start, today) + 1)),
      );
      const days = await getComplianceDays(span);
      const map = new Map(days.map((item) => [item.date, item.compliance]));
      const settled = settleChallenges(saved, map, today);
      if (settled !== saved) await setSetting(CHALLENGES_KEY, settled);
      setCompliance(map);
      setState(settled);
    });
  }, [today]);
  useFocusEffect(load);
  if (!state) return <Screen />;

  const start = async (key: ComplianceKey) => {
    await setSetting(CHALLENGES_KEY, startChallenge(state, key, today));
    load();
  };
  const active = state.active.map((challenge) => challengeProgress(challenge, compliance, today));
  const available = COMPLIANCE_ITEMS.filter(
    (item) => !state.active.some((challenge) => challenge.key === item.key),
  );
  const done = state.history.filter((item) => item.result === "done");

  return (
    <Screen>
      <ScrollView contentContainerStyle={AppTheme.content}>
        <Text style={AppTheme.body}>
          Repite un compromiso tres semanas. Se marca solo con lo que ya registras; un día fallado no reinicia
          el reto: se permite uno por semana.
        </Text>
        {active.map((progress) => (
          <ActiveChallenge key={progress.challenge.key} progress={progress} />
        ))}
        <Text style={AppTheme.sectionTitle}>{active.length ? "Empezar otro" : "Elige un reto"}</Text>
        <View style={AppTheme.groupList}>
          {available.map((item, index) => (
            <Pressable
              key={item.key}
              accessibilityRole="button"
              accessibilityLabel={`Empezar reto: ${CHALLENGE_TEXT[item.key].title}`}
              onPress={() => start(item.key)}
              style={[AppTheme.groupRow, index > 0 && AppTheme.groupRowDivider]}
            >
              <View style={AppTheme.optionText}>
                <Text style={AppTheme.optionTitle}>{CHALLENGE_TEXT[item.key].title}</Text>
                <Text style={AppTheme.optionDetail}>{CHALLENGE_TEXT[item.key].detail}</Text>
              </View>
              <Text style={AppTheme.linkButtonText}>Empezar</Text>
            </Pressable>
          ))}
        </View>
        {done.length ? (
          <Card title={`Completados · ${done.length}`}>
            {done.map((item) => (
              <View key={`${item.key}-${item.start}`} style={AppTheme.sectionHeader}>
                <Text style={AppTheme.body}>{CHALLENGE_TEXT[item.key].title}</Text>
                <Text style={AppTheme.hint}>{item.end}</Text>
              </View>
            ))}
          </Card>
        ) : null}
      </ScrollView>
    </Screen>
  );
}

function ActiveChallenge({ progress }: { progress: ChallengeProgress }) {
  const text = CHALLENGE_TEXT[progress.challenge.key];
  const weeks = [0, 1, 2].map((week) => progress.marks.slice(week * 7, week * 7 + 7));
  return (
    <View style={[AppTheme.card, { gap: 10 }]}>
      <View style={AppTheme.sectionHeader}>
        <Text style={AppTheme.cardTitle}>{text.title}</Text>
        <Text style={[AppTheme.label, { color: AppTheme.colors.accent }]}>
          día {Math.min(progress.day, CHALLENGE_DAYS)} de {CHALLENGE_DAYS}
        </Text>
      </View>
      <View
        accessibilityLabel={`${progress.done} días cumplidos y ${progress.missed} fallados`}
        style={{ gap: 4 }}
      >
        {weeks.map((week, row) => (
          <View key={row} style={{ flexDirection: "row", gap: 4 }}>
            {week.map((mark, column) => (
              <View
                key={column}
                style={{
                  flex: 1,
                  height: 22,
                  borderRadius: 4,
                  backgroundColor: MARK_COLORS[mark],
                  borderWidth: mark === "today" ? 2 : 0,
                  borderColor: AppTheme.colors.accent,
                }}
              />
            ))}
          </View>
        ))}
      </View>
      <Text style={AppTheme.hint}>
        {progress.done} cumplidos · {progress.missed} fallados · {text.detail.toLowerCase()}
      </Text>
    </View>
  );
}
