import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';

import { Spacing } from '@/constants/theme';
import { usePhotoMacroEstimate } from '@/hooks/use-photo-macro-estimate';

// Native Variante: Foto per Kamera oder Mediathek auswählen, an Gemini
// schicken und die geschätzten Makros zur Übernahme anzeigen.
export function PhotoMacroEstimate({
  onApply,
}: {
  onApply: (proteinG: number, carbsG: number, fatG: number) => void;
}) {
  const { estimate, isLoading, error, analyze, reset } = usePhotoMacroEstimate();
  const [previewUri, setPreviewUri] = useState<string | null>(null);

  async function pickAndAnalyze(fromCamera: boolean) {
    const permission = fromCamera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return;

    const result = fromCamera
      ? await ImagePicker.launchCameraAsync({ base64: true, quality: 0.5 })
      : await ImagePicker.launchImageLibraryAsync({ base64: true, quality: 0.5 });
    const asset = result.canceled ? null : result.assets[0];
    if (!asset?.base64) return;

    setPreviewUri(asset.uri);
    await analyze(asset.base64, asset.mimeType ?? 'image/jpeg');
  }

  function handleApply() {
    if (!estimate) return;
    onApply(estimate.protein_g, estimate.carbs_g, estimate.fat_g);
    reset();
    setPreviewUri(null);
  }

  return (
    <ThemedView type="backgroundElement" style={styles.card}>
      <ThemedText type="smallBold">Foto-Schätzung</ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        Foto vom Essen aufnehmen oder auswählen — die KI schätzt Protein, Kohlenhydrate und Fett.
      </ThemedText>

      {previewUri && <Image source={{ uri: previewUri }} style={styles.preview} />}

      <View style={styles.row}>
        <Pressable
          style={({ pressed }) => [styles.button, styles.flex1, pressed && styles.pressed]}
          disabled={isLoading}
          onPress={() => pickAndAnalyze(true)}>
          <ThemedView type="backgroundSelected" style={styles.buttonInner}>
            <ThemedText type="smallBold">{isLoading ? 'Schätze …' : 'Kamera'}</ThemedText>
          </ThemedView>
        </Pressable>
        <Pressable
          style={({ pressed }) => [styles.button, styles.flex1, pressed && styles.pressed]}
          disabled={isLoading}
          onPress={() => pickAndAnalyze(false)}>
          <ThemedView type="backgroundSelected" style={styles.buttonInner}>
            <ThemedText type="smallBold">{isLoading ? 'Schätze …' : 'Galerie'}</ThemedText>
          </ThemedView>
        </Pressable>
      </View>

      {error && (
        <ThemedText type="small" style={styles.errorText}>
          {error}
        </ThemedText>
      )}

      {estimate && (
        <>
          <ThemedText type="small" themeColor="textSecondary">
            {estimate.description} · ~{Math.round(estimate.calories_kcal)} kcal (Sicherheit:{' '}
            {estimate.confidence})
          </ThemedText>
          <Pressable style={({ pressed }) => [styles.button, pressed && styles.pressed]} onPress={handleApply}>
            <ThemedView type="accent" style={styles.buttonInner}>
              <ThemedText type="smallBold" themeColor="accentText">
                Übernehmen
              </ThemedText>
            </ThemedView>
          </Pressable>
        </>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Spacing.four,
  },
  row: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  flex1: {
    flex: 1,
  },
  button: {
    borderRadius: Spacing.two,
  },
  buttonInner: {
    alignItems: 'center',
    paddingVertical: Spacing.three,
    borderRadius: Spacing.two,
  },
  pressed: {
    opacity: 0.7,
  },
  preview: {
    width: '100%',
    height: 160,
    borderRadius: Spacing.two,
  },
  errorText: {
    color: '#E5484D',
  },
});
