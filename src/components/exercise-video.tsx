import * as WebBrowser from 'expo-web-browser';
import { Pressable, StyleSheet } from 'react-native';

import { ThemedText } from './themed-text';

type ExerciseVideoButtonProps = {
  url: string;
};

// Native: öffnet das Übungsvideo im In-App-Browser (Safari-Sheet).
export function ExerciseVideoButton({ url }: ExerciseVideoButtonProps) {
  return (
    <Pressable
      style={({ pressed }) => [styles.button, pressed && styles.pressed]}
      onPress={() => WebBrowser.openBrowserAsync(url)}>
      <ThemedText type="small" themeColor="accent">
        ▶ Video
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    paddingHorizontal: 4,
  },
  pressed: {
    opacity: 0.7,
  },
});
