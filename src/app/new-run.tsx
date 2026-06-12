import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet } from 'react-native';

import { DateStepper } from '@/components/date-stepper';
import { ThemedText } from '@/components/themed-text';
import { ThemedTextInput } from '@/components/themed-text-input';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useRuns } from '@/hooks/use-runs';

function formatPace(distanceKm: number, durationMinutes: number) {
  if (distanceKm <= 0) return '–';
  const paceMinutes = durationMinutes / distanceKm;
  const minutes = Math.floor(paceMinutes);
  const seconds = Math.round((paceMinutes - minutes) * 60);
  return `${minutes}:${seconds.toString().padStart(2, '0')} min/km`;
}

export default function NewRunScreen() {
  const { addRun } = useRuns();

  const [date, setDate] = useState(new Date());
  const [distance, setDistance] = useState('');
  const [duration, setDuration] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const distanceKm = Number(distance) || 0;
  const durationMinutes = Number(duration) || 0;

  async function handleSave() {
    if (distanceKm <= 0 || durationMinutes <= 0) {
      setError('Bitte Distanz und Dauer eingeben.');
      return;
    }
    setError(null);
    setIsSaving(true);
    const message = await addRun(date, distanceKm, durationMinutes);
    setIsSaving(false);
    if (message) {
      setError(message);
      return;
    }
    router.back();
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <ThemedText type="title" style={styles.title}>
        Lauf eintragen
      </ThemedText>

      <DateStepper date={date} onChange={setDate} />

      <ThemedView style={styles.row}>
        <ThemedView style={[styles.field, styles.flex1]}>
          <ThemedText type="small">Distanz (km)</ThemedText>
          <ThemedTextInput keyboardType="numeric" value={distance} onChangeText={setDistance} />
        </ThemedView>
        <ThemedView style={[styles.field, styles.flex1]}>
          <ThemedText type="small">Dauer (min)</ThemedText>
          <ThemedTextInput keyboardType="numeric" value={duration} onChangeText={setDuration} />
        </ThemedView>
      </ThemedView>

      <ThemedView type="backgroundElement" style={styles.paceCard}>
        <ThemedText type="small" themeColor="textSecondary">
          Pace
        </ThemedText>
        <ThemedText type="subtitle">{formatPace(distanceKm, durationMinutes)}</ThemedText>
      </ThemedView>

      {error && (
        <ThemedText type="small" style={styles.error}>
          {error}
        </ThemedText>
      )}

      <Pressable
        style={({ pressed }) => [styles.saveButton, pressed && styles.pressed]}
        disabled={isSaving}
        onPress={handleSave}>
        <ThemedView type="backgroundSelected" style={styles.saveButtonInner}>
          <ThemedText type="smallBold">Speichern</ThemedText>
        </ThemedView>
      </Pressable>
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
  field: {
    gap: Spacing.one,
  },
  flex1: {
    flex: 1,
  },
  row: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  paceCard: {
    gap: Spacing.one,
    padding: Spacing.three,
    borderRadius: Spacing.three,
  },
  saveButton: {
    marginTop: Spacing.two,
    borderRadius: Spacing.two,
  },
  saveButtonInner: {
    alignItems: 'center',
    paddingVertical: Spacing.three,
    borderRadius: Spacing.two,
  },
  pressed: {
    opacity: 0.7,
  },
  error: {
    color: '#e5484d',
  },
});
