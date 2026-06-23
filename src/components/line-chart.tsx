import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Line, Polyline } from 'react-native-svg';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

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
  /** Einheit für die Y-Achsen-Beschriftung, z.B. "g" oder "kcal". */
  unit?: string;
  /** Y-Achse bei 0 beginnen lassen (für absolute Mengen wie Gramm). */
  baselineZero?: boolean;
};

const Y_AXIS_WIDTH = 34;
const TICK_COUNT = 5;

// „Schöne" Schrittweite (1/2/2.5/5/10 × Zehnerpotenz) für ~TICK_COUNT Ticks.
function niceStep(range: number): number {
  if (range <= 0) return 1;
  const raw = range / TICK_COUNT;
  const pow = Math.pow(10, Math.floor(Math.log10(raw)));
  const candidates = [1, 2, 2.5, 5, 10].map((m) => m * pow);
  return candidates.find((c) => c >= raw) ?? 10 * pow;
}

// Nachkommastellen, die der Schritt braucht (0,5 -> 1; 0,25 -> 2; 2 -> 0).
function decimalsForStep(step: number): number {
  for (let d = 0; d <= 2; d++) {
    const scaled = step * 10 ** d;
    if (Math.abs(scaled - Math.round(scaled)) < 1e-9) return d;
  }
  return 2;
}

// Gemeinsame Y-Skala über alle Serien + gerundete Tick-Werte.
function computeScale(series: LineChartSeries[], baselineZero: boolean) {
  const values = series.flatMap((s) => s.values);
  if (values.length === 0) return { min: 0, max: 1, ticks: [0, 1], decimals: 0 };

  const dataMin = baselineZero ? 0 : Math.min(...values);
  const dataMax = Math.max(...values);
  const step = niceStep(dataMax - dataMin || dataMax || 1);
  const min = Math.floor(dataMin / step) * step;
  const max = Math.ceil((dataMax || step) / step) * step;

  const ticks: number[] = [];
  for (let t = min; t <= max + step / 2; t += step) ticks.push(t);
  return { min, max: max === min ? min + step : max, ticks, decimals: decimalsForStep(step) };
}

function buildPoints(values: number[], min: number, max: number) {
  if (values.length === 0) return '';
  const range = max - min || 1;
  return values
    .map((value, index) => {
      const x = values.length > 1 ? (index / (values.length - 1)) * 100 : 50;
      const y = 100 - ((value - min) / range) * 100;
      return `${x},${y}`;
    })
    .join(' ');
}

export function LineChart({
  title,
  series,
  labels,
  height = 160,
  unit,
  baselineZero = false,
}: LineChartProps) {
  const theme = useTheme();
  const hasData = series.some((s) => s.values.length > 0);
  const { min, max, ticks, decimals } = computeScale(series, baselineZero);

  // X-Achse: erste, mittlere und letzte Beschriftung (sonst überlappt es).
  const xLabels =
    labels.length <= 1
      ? labels
      : [labels[0], labels[Math.floor((labels.length - 1) / 2)], labels[labels.length - 1]];

  return (
    <ThemedView type="backgroundElement" style={styles.container}>
      <ThemedText type="smallBold">{title}</ThemedText>

      {!hasData ? (
        <ThemedText type="small" themeColor="textSecondary">
          Noch keine Daten vorhanden.
        </ThemedText>
      ) : (
        <>
          <View style={[styles.chartRow, { height }]}>
            {/* Y-Achse: Tick-Werte (oben = max, unten = min) */}
            <View style={[styles.yAxis, { width: Y_AXIS_WIDTH }]}>
              {[...ticks].reverse().map((tick) => (
                <ThemedText key={tick} type="small" themeColor="textSecondary" style={styles.yTick}>
                  {tick.toFixed(decimals)}
                </ThemedText>
              ))}
            </View>

            <View style={styles.plotArea}>
              <Svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
                {/* Gitterlinien an den Tick-Positionen */}
                {ticks.map((tick) => {
                  const y = 100 - ((tick - min) / (max - min || 1)) * 100;
                  return (
                    <Line
                      key={`grid-${tick}`}
                      x1={0}
                      y1={y}
                      x2={100}
                      y2={y}
                      stroke={theme.textSecondary}
                      strokeWidth={0.5}
                      strokeOpacity={0.25}
                      vectorEffect="non-scaling-stroke"
                    />
                  );
                })}

                {series.map((s) => {
                  const points = buildPoints(s.values, min, max);
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

                {series.map((s) => {
                  if (s.values.length === 0) return null;
                  const lastIndex = s.values.length - 1;
                  const x = s.values.length > 1 ? 100 : 50;
                  const y = 100 - ((s.values[lastIndex] - min) / (max - min || 1)) * 100;
                  return (
                    <Circle
                      key={`${s.label}-last`}
                      cx={x}
                      cy={y}
                      r={2}
                      fill={s.color}
                      vectorEffect="non-scaling-stroke"
                    />
                  );
                })}
              </Svg>
            </View>
          </View>

          {/* X-Achse: Tage */}
          {xLabels.length > 0 && (
            <View style={[styles.labelRow, { paddingLeft: Y_AXIS_WIDTH }]}>
              {xLabels.map((label, index) => (
                <ThemedText key={`${label}-${index}`} type="small" themeColor="textSecondary">
                  {label}
                </ThemedText>
              ))}
            </View>
          )}

          <View style={styles.legend}>
            {series.map((s) => (
              <View key={s.label} style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: s.color }]} />
                <ThemedText type="small" themeColor="textSecondary">
                  {s.label}
                </ThemedText>
              </View>
            ))}
            {unit && (
              <ThemedText type="small" themeColor="textSecondary">
                Y-Achse: {unit}
              </ThemedText>
            )}
          </View>
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
  chartRow: {
    flexDirection: 'row',
    width: '100%',
  },
  yAxis: {
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingRight: Spacing.one,
  },
  yTick: {
    lineHeight: 10,
  },
  plotArea: {
    flex: 1,
    height: '100%',
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
