import { useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PhotoMacroEstimate } from '@/components/photo-macro-estimate';
import { ThemedText } from '@/components/themed-text';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useDailyMacros } from '@/hooks/use-daily-macros';

export default function PhotoScreen() {
  const insets = useSafeAreaInsets();
  const today = new Date();
  const { macros, saveMacros } = useDailyMacros(today);
  const [message, setMessage] = useState<string | null>(null);

  async function handleApply(estimatedProtein: number, estimatedCarbs: number, estimatedFat: number) {
    // Eine Foto-Schätzung ist eine Mahlzeit — zu den heutigen Makros addieren.
    const protein = (macros?.protein_g ?? 0) + estimatedProtein;
    const carbs = (macros?.carbs_g ?? 0) + estimatedCarbs;
    const fat = (macros?.fat_g ?? 0) + estimatedFat;
    const error = await saveMacros(protein, carbs, fat);
    setMessage(
      error ?? `Zu heute hinzugefügt: +${estimatedProtein} g P · +${estimatedCarbs} g KH · +${estimatedFat} g Fett`,
    );
  }

  return (
    <ScrollView
      contentContainerStyle={[
        styles.container,
        { paddingTop: insets.top + Spacing.three, paddingBottom: insets.bottom + BottomTabInset + Spacing.three },
      ]}>
      <ThemedText type="title">Foto-Schätzung</ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        Mach ein Foto von deinem Essen — die KI schätzt die Makros und addiert sie zu deinen heutigen
        Tagesmakros.
      </ThemedText>

      <PhotoMacroEstimate onApply={handleApply} />

      {message && <ThemedText type="small">{message}</ThemedText>}
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
});
