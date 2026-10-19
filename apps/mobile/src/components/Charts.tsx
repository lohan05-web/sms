import { useMemo } from 'react';
import { useWindowDimensions, View } from 'react-native';
import {
  Circle,
  G,
  Line,
  Polyline,
  Rect,
  Text as SvgText,
  Svg,
} from 'react-native-svg';

import { colors } from '../theme';

/**
 * Dependency-free chart primitives for the Teacher portal.
 *
 * The mobile app ships no charting library, so these are drawn directly with
 * `react-native-svg` (already a dependency for other native components). They
 * cover the two shapes the Marks & Grades screen needs — a categorical bar
 * comparison and a trend line — from real API values, with an explicit value
 * axis so the numbers are readable rather than merely decorative.
 */

export interface ChartDatum {
  /** Category label (subject name, exam name, …). */
  x: string;
  /** The measured value. */
  y: number;
}

export interface ChartProps {
  data: ChartDatum[];
  /** Overall chart height in dp. */
  height?: number;
  /** Stroke / fill colour for the marks. */
  color?: string;
  /**
   * Fixed ceiling for the value axis. Pass `100` for percentages so two charts
   * stay visually comparable; omit to scale to the largest value.
   */
  maxValue?: number;
  /** Appended to every value label, e.g. `%`. */
  suffix?: string;
}

const PLOT = { top: 18, right: 10, bottom: 30, left: 42 };
const GRID_STEPS = 4;

function truncate(text: string, max = 9): string {
  const trimmed = text.trim();
  return trimmed.length > max ? `${trimmed.slice(0, max - 1)}…` : trimmed;
}

/** Renders at most `max` x-axis labels so they never overlap on a narrow screen. */
function labelStep(count: number, max = 6): number {
  return Math.max(1, Math.ceil(count / max));
}

interface Frame {
  plotW: number;
  plotH: number;
  max: number;
  ticks: number[];
}

function useFrame(
  data: ChartDatum[],
  height: number,
  width: number,
  maxValue?: number,
): Frame {
  return useMemo(() => {
    const plotW = Math.max(1, width - PLOT.left - PLOT.right);
    const plotH = Math.max(1, height - PLOT.top - PLOT.bottom);
    const largest = data.reduce((peak, d) => Math.max(peak, Number(d.y) || 0), 0);
    const max = maxValue && maxValue > 0 ? maxValue : largest > 0 ? largest : 1;
    const ticks = Array.from({ length: GRID_STEPS + 1 }, (_, i) => (max / GRID_STEPS) * i);
    return { plotW, plotH, max, ticks };
  }, [data, height, width, maxValue]);
}

/** Shared axes + gridlines so bars and lines sit on the same visual frame. */
function FrameChrome({ frame, suffix }: { frame: Frame; suffix: string }) {
  const { plotW, plotH, max, ticks } = frame;
  return (
    <G>
      {ticks.map((tick) => {
        const y = PLOT.top + plotH - (tick / max) * plotH;
        return (
          <G key={`grid-${tick}`}>
            <Line
              x1={PLOT.left}
              y1={y}
              x2={PLOT.left + plotW}
              y2={y}
              stroke={colors.border}
              strokeWidth={1}
              strokeDasharray={tick === 0 ? undefined : '3 3'}
            />
            <SvgText
              x={PLOT.left - 8}
              y={y + 3}
              fontSize={9}
              fill={colors.textFaint}
              textAnchor="end"
            >
              {`${Math.round(tick * 10) / 10}${suffix}`}
            </SvgText>
          </G>
        );
      })}
      <Line
        x1={PLOT.left}
        y1={PLOT.top + plotH}
        x2={PLOT.left + plotW}
        y2={PLOT.top + plotH}
        stroke={colors.borderStrong}
        strokeWidth={1.25}
      />
    </G>
  );
}

function EmptyChart({ height }: { height: number }) {
  return <View style={{ height }} />;
}

/** Vertical bar comparison — used for subject-wise averages. */
export function BarChart({
  data,
  height = 210,
  color = colors.primary,
  maxValue,
  suffix = '',
}: ChartProps) {
  const { width: windowWidth } = useWindowDimensions();
  const width = Math.max(220, windowWidth - 76);
  const frame = useFrame(data, height, width, maxValue);
  if (data.length === 0) return <EmptyChart height={height} />;

  const { plotW, plotH, max } = frame;
  const band = plotW / data.length;
  const barWidth = Math.min(Math.max(band * 0.56, 6), 44);
  const step = labelStep(data.length);

  return (
    <View accessibilityRole="image" accessibilityLabel="Bar chart">
      <Svg width={width} height={height}>
        <FrameChrome frame={frame} suffix={suffix} />
        {data.map((datum, index) => {
          const value = Number(datum.y) || 0;
          const barHeight = Math.max(0, (value / max) * plotH);
          const centerX = PLOT.left + band * index + band / 2;
          const y = PLOT.top + plotH - barHeight;
          return (
            <G key={`bar-${index}-${datum.x}`}>
              <Rect
                x={centerX - barWidth / 2}
                y={y}
                width={barWidth}
                height={barHeight}
                rx={Math.min(5, barWidth / 2)}
                fill={color}
                opacity={0.9}
              />
              <SvgText
                x={centerX}
                y={y - 5}
                fontSize={9}
                fontWeight="700"
                fill={colors.textMuted}
                textAnchor="middle"
              >
                {`${Math.round(value * 10) / 10}${suffix}`}
              </SvgText>
              {index % step === 0 ? (
                <SvgText
                  x={centerX}
                  y={PLOT.top + plotH + 14}
                  fontSize={9}
                  fill={colors.textMuted}
                  textAnchor="middle"
                >
                  {truncate(datum.x)}
                </SvgText>
              ) : null}
            </G>
          );
        })}
      </Svg>
    </View>
  );
}

/** Trend line — used for performance across exams over time. */
export function LineChart({
  data,
  height = 210,
  color = colors.success,
  maxValue,
  suffix = '',
}: ChartProps) {
  const { width: windowWidth } = useWindowDimensions();
  const width = Math.max(220, windowWidth - 76);
  const frame = useFrame(data, height, width, maxValue);
  if (data.length === 0) return <EmptyChart height={height} />;

  const { plotW, plotH, max } = frame;
  const step = labelStep(data.length);
  const denominator = Math.max(1, data.length - 1);

  const points = data.map((datum, index) => {
    const value = Number(datum.y) || 0;
    return {
      datum,
      value,
      cx: PLOT.left + (plotW / denominator) * index,
      cy: PLOT.top + plotH - (value / max) * plotH,
    };
  });

  return (
    <View accessibilityRole="image" accessibilityLabel="Line chart">
      <Svg width={width} height={height}>
        <FrameChrome frame={frame} suffix={suffix} />
        <Polyline
          points={points.map((p) => `${p.cx},${p.cy}`).join(' ')}
          fill="none"
          stroke={color}
          strokeWidth={2.25}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {points.map((point, index) => (
          <G key={`pt-${index}-${point.datum.x}`}>
            <Circle
              cx={point.cx}
              cy={point.cy}
              r={3.6}
              fill={colors.surface}
              stroke={color}
              strokeWidth={2}
            />
            <SvgText
              x={point.cx}
              y={point.cy - 9}
              fontSize={9}
              fontWeight="700"
              fill={colors.textMuted}
              textAnchor="middle"
            >
              {`${Math.round(point.value * 10) / 10}${suffix}`}
            </SvgText>
            {index % step === 0 ? (
              <SvgText
                x={point.cx}
                y={PLOT.top + plotH + 14}
                fontSize={9}
                fill={colors.textMuted}
                textAnchor="middle"
              >
                {truncate(point.datum.x)}
              </SvgText>
            ) : null}
          </G>
        ))}
      </Svg>
    </View>
  );
}
