import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { usePlanGroups } from '@/hooks/use-plan-groups';
import { useTheme } from '@/hooks/use-theme';
import { useTrainingPlans } from '@/hooks/use-training-plans';
import { combineVolumes, planVolume, sortedTargets } from '@/lib/volume';

export default function VolumeScreen() {
  const theme = useTheme();
  const { plans, setPlanGroup } = useTrainingPlans();
  const { groups, createGroup, deleteGroup } = usePlanGroups();

  const [newGroupName, setNewGroupName] = useState('');
  const [error, setError] = useState<string | null>(null);

  const ungroupedPlans = plans.filter((plan) => !plan.group_id);

  async function handleCreateGroup() {
    if (!newGroupName.trim()) return;
    setError(null);
    const message = await createGroup(newGroupName.trim());
    if (message) {
      setError(message);
      return;
    }
    setNewGroupName('');
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <ThemedText type="title" style={styles.title}>
        Volumen-Übersicht
      </ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        Volumen = Anzahl Sätze. Gruppiere deine Einheiten (z.B. Push, Pull, Beine) zu einem Split,
        um das Volumen pro Muskelgruppe über alle Einheiten hinweg zu sehen.
      </ThemedText>

      <ThemedView style={styles.row}>
        <TextInput
          style={[styles.input, styles.flex1, { color: theme.text, borderColor: theme.backgroundSelected }]}
          placeholder="Neue Gruppe (z.B. Push/Pull/Beine)"
          placeholderTextColor={theme.textSecondary}
          value={newGroupName}
          onChangeText={setNewGroupName}
        />
        <Pressable style={({ pressed }) => [styles.button, pressed && styles.pressed]} onPress={handleCreateGroup}>
          <ThemedView type="accent" style={styles.buttonInner}>
            <ThemedText type="smallBold" themeColor="accentText">
              Erstellen
            </ThemedText>
          </ThemedView>
        </Pressable>
      </ThemedView>

      {error && (
        <ThemedText type="small" style={styles.error}>
          {error}
        </ThemedText>
      )}

      {groups.map((group) => {
        const groupPlans = plans.filter((plan) => plan.group_id === group.id);
        const groupSummary = combineVolumes(groupPlans.map(planVolume));
        return (
          <ThemedView key={group.id} type="backgroundElement" style={styles.card}>
            <ThemedView style={styles.cardHeader}>
              <ThemedText type="smallBold">{group.name}</ThemedText>
              <Pressable style={({ pressed }) => pressed && styles.pressed} onPress={() => deleteGroup(group.id)}>
                <ThemedText type="small" themeColor="textSecondary">
                  Gruppe löschen
                </ThemedText>
              </Pressable>
            </ThemedView>

            {groupPlans.length === 0 ? (
              <ThemedText type="small" themeColor="textSecondary">
                Noch keine Einheiten in dieser Gruppe.
              </ThemedText>
            ) : (
              <>
                {groupPlans.map((plan) => (
                  <ThemedView key={plan.id} style={styles.planRow}>
                    <ThemedText type="small">
                      {plan.name} · {planVolume(plan).totalSets} Sätze
                    </ThemedText>
                    <Pressable
                      style={({ pressed }) => pressed && styles.pressed}
                      onPress={() => setPlanGroup(plan.id, null)}>
                      <ThemedText type="small" themeColor="textSecondary">
                        Entfernen
                      </ThemedText>
                    </Pressable>
                  </ThemedView>
                ))}

                <ThemedView style={styles.divider} />
                <ThemedText type="smallBold">Sätze pro Muskelgruppe</ThemedText>
                {sortedTargets(groupSummary).map(([target, sets]) => (
                  <ThemedView key={target} style={styles.targetRow}>
                    <ThemedText type="small">{target}</ThemedText>
                    <ThemedText type="smallBold">{sets}</ThemedText>
                  </ThemedView>
                ))}
                <ThemedView style={styles.divider} />
                <ThemedView style={styles.targetRow}>
                  <ThemedText type="smallBold">Gesamt</ThemedText>
                  <ThemedText type="smallBold">{groupSummary.totalSets} Sätze</ThemedText>
                </ThemedView>
              </>
            )}

            {ungroupedPlans.length > 0 && (
              <>
                <ThemedText type="small" themeColor="textSecondary">
                  Einheit hinzufügen:
                </ThemedText>
                <ThemedView style={styles.chipRow}>
                  {ungroupedPlans.map((plan) => (
                    <Pressable
                      key={plan.id}
                      style={({ pressed }) => pressed && styles.pressed}
                      onPress={() => setPlanGroup(plan.id, group.id)}>
                      <ThemedView type="background" style={styles.chip}>
                        <ThemedText type="small">+ {plan.name}</ThemedText>
                      </ThemedView>
                    </Pressable>
                  ))}
                </ThemedView>
              </>
            )}
          </ThemedView>
        );
      })}

      <ThemedText type="smallBold">Alle Einheiten im Detail</ThemedText>
      {plans.length === 0 && (
        <ThemedText type="small" themeColor="textSecondary">
          Noch keine Einheiten erstellt.
        </ThemedText>
      )}
      {plans.map((plan) => {
        const summary = planVolume(plan);
        return (
          <ThemedView key={plan.id} type="backgroundElement" style={styles.card}>
            <ThemedView style={styles.cardHeader}>
              <ThemedText type="smallBold">{plan.name}</ThemedText>
              <ThemedText type="smallBold">{summary.totalSets} Sätze</ThemedText>
            </ThemedView>
            {sortedTargets(summary).map(([target, sets]) => (
              <ThemedView key={target} style={styles.targetRow}>
                <ThemedText type="small">{target}</ThemedText>
                <ThemedText type="small">{sets}</ThemedText>
              </ThemedView>
            ))}
          </ThemedView>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: Spacing.four,
    gap: Spacing.three,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  title: {
    marginBottom: Spacing.two,
  },
  row: {
    flexDirection: 'row',
    gap: Spacing.two,
    alignItems: 'center',
  },
  flex1: {
    flex: 1,
  },
  input: {
    borderWidth: 1,
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    fontSize: 16,
  },
  button: {
    borderRadius: Spacing.two,
  },
  buttonInner: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    borderRadius: Spacing.two,
  },
  card: {
    gap: Spacing.two,
    padding: Spacing.three,
    borderRadius: Spacing.four,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  planRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  targetRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  divider: {
    height: 1,
    opacity: 0.15,
    backgroundColor: '#888888',
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  chip: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.three,
  },
  pressed: {
    opacity: 0.7,
  },
  error: {
    color: '#e5484d',
  },
});
