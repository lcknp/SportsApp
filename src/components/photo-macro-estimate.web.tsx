import { useRef, useState } from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';

import { Spacing } from '@/constants/theme';
import { usePhotoMacroEstimate } from '@/hooks/use-photo-macro-estimate';

// Web-Variante: Foto über einen Datei-Dialog auswählen (auf Mobilgeräten im
// Browser öffnet `capture="environment"` direkt die Kamera).
export function PhotoMacroEstimate({
  onApply,
}: {
  onApply: (proteinG: number, carbsG: number, fatG: number) => void;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const { estimate, isLoading, error, analyze, reset } = usePhotoMacroEstimate();
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  async function handleFile(file: File) {
    setPreviewUrl(URL.createObjectURL(file));

    const dataUrl: string = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
    const base64 = dataUrl.split(',')[1] ?? '';
    await analyze(base64, file.type || 'image/jpeg');
  }

  function handleApply() {
    if (!estimate) return;
    onApply(estimate.protein_g, estimate.carbs_g, estimate.fat_g);
    reset();
    setPreviewUrl(null);
  }

  return (
    <ThemedView type="backgroundElement" style={styles.card}>
      <ThemedText type="smallBold">Foto-Schätzung</ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        Foto vom Essen hochladen — die KI schätzt Protein, Kohlenhydrate und Fett.
      </ThemedText>

      {previewUrl && <Image source={{ uri: previewUrl }} style={styles.preview} />}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        style={{ display: 'none' }}
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) handleFile(file);
          event.target.value = '';
        }}
      />

      <View style={styles.row}>
        <Pressable
          style={({ pressed }) => [styles.button, styles.flex1, pressed && styles.pressed]}
          disabled={isLoading}
          onPress={() => inputRef.current?.click()}>
          <ThemedView type="backgroundSelected" style={styles.buttonInner}>
            <ThemedText type="smallBold">{isLoading ? 'Schätze …' : 'Foto auswählen'}</ThemedText>
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
