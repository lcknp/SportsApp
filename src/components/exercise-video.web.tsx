import { createElement, useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from './themed-text';

import { Spacing } from '@/constants/theme';
import { toEmbedUrl } from '@/lib/video-url';

type ExerciseVideoButtonProps = {
  url: string;
};

// Web: spielt das Übungsvideo in einem eingebetteten Player-Overlay ab.
export function ExerciseVideoButton({ url }: ExerciseVideoButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Pressable
        style={({ pressed }) => [styles.button, pressed && styles.pressed]}
        onPress={() => setIsOpen(true)}>
        <ThemedText type="small" themeColor="accent">
          ▶ Video
        </ThemedText>
      </Pressable>

      <Modal visible={isOpen} transparent animationType="fade" onRequestClose={() => setIsOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setIsOpen(false)}>
          <Pressable style={styles.playerBox} onPress={() => {}}>
            {createElement('iframe', {
              src: toEmbedUrl(url),
              style: { width: '100%', height: '100%', border: 'none', borderRadius: 12 },
              allow: 'autoplay; encrypted-media; fullscreen',
            })}
            <Pressable style={styles.closeButton} onPress={() => setIsOpen(false)}>
              <View style={styles.closeButtonInner}>
                <ThemedText type="smallBold" style={styles.closeText}>
                  ✕ Schließen
                </ThemedText>
              </View>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  button: {
    paddingHorizontal: 4,
  },
  pressed: {
    opacity: 0.7,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.four,
  },
  playerBox: {
    width: '100%',
    maxWidth: 720,
    aspectRatio: 16 / 9,
    backgroundColor: '#000000',
    borderRadius: 12,
  },
  closeButton: {
    position: 'absolute',
    top: -40,
    right: 0,
  },
  closeButtonInner: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  closeText: {
    color: '#ffffff',
  },
});
