import { StyleSheet, View } from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type MacroRingProps = {
  label: string;
  current: number;
  goal: number;
  unit: string;
  color: string;
  size?: number;
};

// Runder Fortschritts-Ring: füllt sich im Uhrzeigersinn je nach Stand
// (current / goal). Über 100 % bleibt der Ring voll, der Prozentwert zeigt
// die echte Zahl.
export function MacroRing({ label, current, goal, unit, color, size = 80 }: MacroRingProps) {
  const theme = useTheme();
  const ratio = goal > 0 ? Math.min(current / goal, 1) : 0;
  const percent = goal > 0 ? Math.round((current / goal) * 100) : 0;

  const strokeWidth = 8;
  const radius = (size - strokeWidth) / 2;
  const center = size / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - ratio);

  return (
    <View style={[styles.container, { width: size }]}>
      <View style={{ width: size, height: size }}>
        <Svg width={size} height={size}>
          <Circle
            cx={center}
            cy={center}
            r={radius}
            stroke={theme.backgroundSelected}
            strokeWidth={strokeWidth}
            fill="none"
          />
          {/* Bei -90° gedreht, damit die Füllung oben startet. */}
          <G rotation={-90} origin={`${center}, ${center}`}>
            <Circle
              cx={center}
              cy={center}
              r={radius}
              stroke={color}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              fill="none"
              strokeDasharray={circumference}
              strokeDashoffset={dashOffset}
            />
          </G>
        </Svg>
        <View style={[styles.centerLabel, { width: size, height: size }]}>
          <ThemedText type="smallBold">{percent}%</ThemedText>
        </View>
      </View>

      <ThemedText type="small" style={styles.label}>
        {label}
      </ThemedText>
      <ThemedText type="small" themeColor="textSecondary" style={styles.value}>
        {Math.round(current)} / {goal} {unit}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: Spacing.one,
  },
  centerLabel: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    textAlign: 'center',
  },
  value: {
    textAlign: 'center',
  },
});
