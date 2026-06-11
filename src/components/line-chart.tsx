import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Polyline } from 'react-native-svg';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';

export type LineChartSeries = {
  label: string;
  color: string;
  values: number[];
};

type LineChartProps = {
  title: string;
  series: LineChartSeries[];
  labels: string[];
  height?: number;
};

function buildPoints(values: number[]) {
  if (values.length === 0) return '';
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  return values
    .map((value, index) => {
      const x = values.length > 1 ? (index / (values.length - 1)) * 100 : 50;
      const y = 100 - ((value - min) / range) * 100;
      return `${x},${y}`;
    })
    .join(' ');
}

export function LineChart({ title, series, labels, height = 140 }: LineChartProps) {
  const hasData = series.some((s) => s.values.length > 0);

  return (
    <ThemedView type="backgroundElement" style={styles.container}>
      <ThemedText type="smallBold">{title}</ThemedText>

      {!hasData ? (
        <ThemedText type="small" themeColor="textSecondary">
          Noch keine Daten vorhanden.
        </ThemedText>
      ) : (
        <>
          <View style={[styles.chartArea, { height }]}>
            <Svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
              {series.map((s) => {
                const points = buildPoints(s.values);
                if (!points) return null;
                return (
                  <Polyline
                    key={s.label}
                    points={points}
                    fill="none"
                    stroke={s.color}
                    strokeWidth={2}
                    vectorEffect="non-scaling-stroke"
                  />
                );
              })}
              {series.map((s) =>
                s.values.length > 0
                  ? (() => {
                      const min = Math.min(...s.values);
                      const max = Math.max(...s.values);
                      const range = max - min || 1;
                      const lastIndex = s.values.length - 1;
                      const x = s.values.length > 1 ? (lastIndex / lastIndex) * 100 : 50;
                      const y = 100 - ((s.values[lastIndex] - min) / range) * 100;
                      return (
                        <Circle key={`${s.label}-last`} cx={x} cy={y} r={2} fill={s.color} vectorEffect="non-scaling-stroke" />
                      );
                    })()
                  : null,
              )}
            </Svg>
          </View>

          <ThemedView style={styles.legend}>
            {series.map((s) => (
              <ThemedView key={s.label} style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: s.color }]} />
                <ThemedText type="small" themeColor="textSecondary">
                  {s.label}
                </ThemedText>
              </ThemedView>
            ))}
          </ThemedView>

          {labels.length > 0 && (
            <ThemedView style={styles.labelRow}>
              <ThemedText type="small" themeColor="textSecondary">
                {labels[0]}
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {labels[labels.length - 1]}
              </ThemedText>
            </ThemedView>
          )}
        </>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Spacing.four,
  },
  chartArea: {
    width: '100%',
  },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.three,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
});
