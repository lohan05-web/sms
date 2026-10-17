import { useId, type ReactNode } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import {
  Circle,
  Defs,
  LinearGradient,
  Path,
  RadialGradient,
  Rect,
  Stop,
  Svg,
  type SvgProps,
} from 'react-native-svg';

/**
 * Self-contained, theme-matched SVG illustrations for the public marketing
 * screens. They use the navy / indigo / violet palette so they sit naturally
 * on the app theme, and they never depend on external image files (so there
 * are no broken links or network requests).
 *
 * Every illustration is decorative: the surrounding copy carries the meaning,
 * so the SVG is hidden from the accessibility tree.
 */

const COMMON = 'site-illus';

interface ArtProps {
  /** Rendered as part of a parent container. */
  testID?: string;
}

interface SvgFrameProps {
  id: string;
  viewBox: string;
  accessibilityLabel?: string;
  children: ReactNode;
  /** Extra styles applied to the sizing container (e.g. a fixed width). */
  style?: StyleProp<ViewStyle>;
  /** Upper bound on the rendered height so art never dominates a screen. */
  maxHeight?: number;
}

/**
 * Shared frame for every illustration.
 *
 * `react-native-svg` defaults a `<Svg>` with no explicit dimensions to
 * `width="100%" height="100%"`. Inside a flex container that gives the SVG the
 * parent's full height, which used to let an illustration swallow the whole
 * viewport and push the rest of a screen out of view. To prevent that, the SVG
 * is wrapped in a container sized from the `viewBox` aspect ratio (with an
 * optional height cap), so every illustration always has a natural size.
 */
function SvgFrame({
  id,
  viewBox,
  accessibilityLabel,
  children,
  style,
  maxHeight = 360,
}: SvgFrameProps) {
  const props: SvgProps = {
    viewBox,
    accessibilityLabel,
    importantForAccessibility: 'no-hide-descendants',
  };
  const parts = viewBox.split(/\s+/).map(Number);
  const boxWidth = parts[2] ?? 0;
  const boxHeight = parts[3] ?? 0;
  const aspectRatio = boxWidth > 0 && boxHeight > 0 ? boxWidth / boxHeight : undefined;

  return (
    <View style={[frameStyle, { aspectRatio, maxHeight }, style]}>
      <Svg {...props} width="100%" height="100%" testID={COMMON}>
        <Defs>
          <RadialGradient id={`${id}-halo`} cx="50%" cy="45%" r="55%">
            <Stop offset="0%" stopColor="#a5b4fc" stopOpacity={0.55} />
            <Stop offset="100%" stopColor="#a5b4fc" stopOpacity={0} />
          </RadialGradient>
        </Defs>
        {children}
      </Svg>
    </View>
  );
}

const frameStyle: ViewStyle = {
  width: '100%',
  alignSelf: 'center',
};

/** People-bubble illustrations render as a compact square, not a full-width block. */
const avatarFrameStyle: StyleProp<ViewStyle> = {
  width: 96,
  alignSelf: 'flex-start',
};

function BrandGradient({ id }: { id: string }) {
  return (
    <LinearGradient
      id={`${id}-brand`}
      x1="0"
      y1="0"
      x2="1"
      y2="1"
    >
      <Stop offset="0%" stopColor="#6366f1" />
      <Stop offset="100%" stopColor="#8b5cf6" />
    </LinearGradient>
  );
}

function SkyGradient({ id }: { id: string }) {
  return (
    <LinearGradient
      id={`${id}-sky`}
      x1="0"
      y1="0"
      x2="1"
      y2="1"
    >
      <Stop offset="0%" stopColor="#38bdf8" />
      <Stop offset="100%" stopColor="#6366f1" />
    </LinearGradient>
  );
}

function ScreenGradient({ id }: { id: string }) {
  return (
    <LinearGradient
      id={`${id}-screen`}
      x1="0"
      y1="0"
      x2="1"
      y2="1"
    >
      <Stop offset="0%" stopColor="#1b2450" />
      <Stop offset="100%" stopColor="#0b1220" />
    </LinearGradient>
  );
}

/* -------------------------------------------------------------------------- */
/*  Hero scene — a school dashboard with floating people bubbles               */
/* -------------------------------------------------------------------------- */

export function HeroScene() {
  const id = useId().replace(/:/g, '');
  return (
    <SvgFrame id={id} viewBox="0 0 600 440">
      <ScreenGradient id={id} />
      <BrandGradient id={id} />
      <SkyGradient id={id} />
      <Circle cx="300" cy="200" r="205" fill={`url(#${id}-halo)`} />
      {/* Dashboard screen */}
      <Rect x="92" y="40" width="416" height="272" rx="22" fill={`url(#${id}-screen)`} />
      <Rect
        x="92.5"
        y="40.5"
        width="415"
        height="271"
        rx="21.5"
        stroke="#ffffff"
        strokeOpacity={0.12}
      />
      <Circle cx="116" cy="64" r="4.5" fill="#f87171" />
      <Circle cx="131" cy="64" r="4.5" fill="#fbbf24" />
      <Circle cx="146" cy="64" r="4.5" fill="#34d399" />
      <Rect x="112" y="86" width="118" height="11" rx="5.5" fill="#ffffff" fillOpacity={0.55} />
      <Rect x="112" y="106" width="72" height="8" rx="4" fill="#ffffff" fillOpacity={0.22} />

      {/* Bar chart */}
      <Rect x="112" y="196" width="22" height="70" rx="6" fill={`url(#${id}-brand)`} />
      <Rect x="144" y="168" width="22" height="98" rx="6" fill={`url(#${id}-sky)`} />
      <Rect x="176" y="206" width="22" height="60" rx="6" fill={`url(#${id}-brand)`} />
      <Rect x="208" y="150" width="22" height="116" rx="6" fill={`url(#${id}-sky)`} />

      {/* Donut */}
      <Circle
        cx="392"
        cy="176"
        r="46"
        fill="none"
        stroke="#ffffff"
        strokeOpacity={0.12}
        strokeWidth="16"
      />
      <Circle
        cx="392"
        cy="176"
        r="46"
        fill="none"
        stroke={`url(#${id}-brand)`}
        strokeWidth="16"
        strokeLinecap="round"
        strokeDasharray="210 290"
      />

      {/* Attendance rows */}
      <Rect x="300" y="118" width="150" height="10" rx="5" fill="#ffffff" fillOpacity={0.5} />
      <Rect x="300" y="240" width="150" height="9" rx="4.5" fill="#ffffff" fillOpacity={0.16} />
      <Rect x="300" y="258" width="118" height="9" rx="4.5" fill="#ffffff" fillOpacity={0.16} />
      <Rect x="300" y="276" width="134" height="9" rx="4.5" fill="#ffffff" fillOpacity={0.16} />
    </SvgFrame>
  );
}

/* -------------------------------------------------------------------------- */
/*  Classroom scene — a teacher and two students at a board                    */
/* -------------------------------------------------------------------------- */

export function ClassroomArt() {
  const id = useId().replace(/:/g, '');
  return (
    <SvgFrame id={id} viewBox="0 0 560 380">
      <ScreenGradient id={id} />
      <BrandGradient id={id} />
      <SkyGradient id={id} />
      <LinearGradient id={`${id}-board`} x1="0" y1="0" x2="1" y2="1">
        <Stop offset="0%" stopColor="#1b2450" />
        <Stop offset="100%" stopColor="#0f1a33" />
      </LinearGradient>
      <LinearGradient id={`${id}-wall`} x1="0" y1="0" x2="0" y2="1">
        <Stop offset="0%" stopColor="#f5f7ff" />
        <Stop offset="100%" stopColor="#e7ecfb" />
      </LinearGradient>
      <Rect x="20" y="24" width="520" height="330" rx="26" fill={`url(#${id}-wall)`} />
      {/* Blackboard */}
      <Rect x="120" y="52" width="330" height="176" rx="16" fill={`url(#${id}-board)`} />
      <Rect
        x="120"
        y="52"
        width="330"
        height="176"
        rx="16"
        stroke="#ffffff"
        strokeOpacity={0.1}
      />
      <Rect x="146" y="78" width="130" height="12" rx="6" fill="#ffffff" fillOpacity={0.6} />
      <Rect x="146" y="102" width="86" height="9" rx="4.5" fill="#a5b4fc" fillOpacity={0.8} />
      <Rect x="146" y="126" width="110" height="9" rx="4.5" fill="#ffffff" fillOpacity={0.22} />
      <Circle
        cx="392"
        cy="140"
        r="42"
        fill="none"
        stroke="#ffffff"
        strokeOpacity={0.14}
        strokeWidth="14"
      />
      <Circle
        cx="392"
        cy="140"
        r="42"
        fill="none"
        stroke={`url(#${id}-sky)`}
        strokeWidth="14"
        strokeLinecap="round"
        strokeDasharray="150 260"
      />
      <Rect x="146" y="158" width="70" height="9" rx="4.5" fill="#ffffff" fillOpacity={0.22} />
      <Rect x="146" y="180" width="96" height="9" rx="4.5" fill="#ffffff" fillOpacity={0.22} />

      {/* Teacher */}
      <Circle cx="96" cy="196" r="22" fill="#f2c6a0" />
      <Path
        d="M96 172c-13 0-22 8-22 19 6-8 14-10 22-10s16 2 22 10c0-11-9-19-22-19Z"
        fill="#2a2f45"
      />
      <Path d="M70 262a26 26 0 0 1 52 0Z" fill={`url(#${id}-brand)`} />
      <Rect x="70" y="236" width="52" height="30" rx="15" fill={`url(#${id}-brand)`} />
      <Path d="M122 240l54-30" stroke="#f2c6a0" strokeWidth={7} strokeLinecap="round" />
      <Circle cx="178" cy="208" r="6" fill="#2a2f45" />

      {/* Students at a desk */}
      <Rect x="300" y="300" width="210" height="16" rx="8" fill="#c7d2fe" />
      <Circle cx="360" cy="256" r="20" fill="#d29c74" />
      <Path
        d="M360 236c-12 0-20 6-20 15 5-6 12-8 20-8s15 2 20 8c0-9-8-15-20-15Z"
        fill="#5b3f2e"
      />
      <Rect x="332" y="272" width="56" height="30" rx="15" fill={`url(#${id}-sky)`} />
      <Circle cx="438" cy="248" r="20" fill="#f2c6a0" />
      <Path
        d="M438 228c-12 0-20 6-20 15 5-6 12-8 20-8s15 2 20 8c0-9-8-15-20-15Z"
        fill="#2a2f45"
      />
      <Rect x="410" y="264" width="56" height="38" rx="15" fill={`url(#${id}-brand)`} />
      <Rect x="330" y="284" width="52" height="16" rx="4" fill="#ffffff" />
      <Rect x="336" y="278" width="40" height="12" rx="3" fill="#e0e7ff" />
    </SvgFrame>
  );
}

/* -------------------------------------------------------------------------- */
/*  People bubbles — teacher / student / parent                               */
/* -------------------------------------------------------------------------- */

type AvatarVariant = 'teacher' | 'student' | 'parent';

const AVATAR_PALETTE: Record<
  AvatarVariant,
  { skin: string; hair: string; shirt: 'brand' | 'sky' | 'violet'; accent: string }
> = {
  teacher: { skin: '#f2c6a0', hair: '#2a2f45', shirt: 'brand', accent: '#f59e0b' },
  student: { skin: '#d29c74', hair: '#5b3f2e', shirt: 'sky', accent: '#34d399' },
  parent: { skin: '#e8b48c', hair: '#3f2f24', shirt: 'violet', accent: '#38bdf8' },
};

export function AvatarArt({ variant }: ArtProps & { variant: AvatarVariant }) {
  const id = useId().replace(/:/g, '');
  const p = AVATAR_PALETTE[variant];
  return (
    <SvgFrame
      id={id}
      viewBox="0 0 220 220"
      accessibilityLabel={`${variant} illustration`}
      style={avatarFrameStyle}
    >
      <BrandGradient id={id} />
      <SkyGradient id={id} />
      <LinearGradient id={`${id}-violet`} x1="0" y1="0" x2="1" y2="1">
        <Stop offset="0%" stopColor="#8b5cf6" />
        <Stop offset="100%" stopColor="#6366f1" />
      </LinearGradient>
      <Circle cx="110" cy="110" r="96" fill="#eef2ff" />
      <Circle cx="110" cy="110" r="96" fill="none" stroke="#e0e7ff" strokeWidth={2} />
      <Circle cx="110" cy="98" r="34" fill={p.skin} />
      <Path
        d="M110 64c-20 0-34 12-34 30 9-13 22-16 34-16s25 3 34 16c0-18-14-30-34-30Z"
        fill={p.hair}
      />
      <Path d="M52 196a58 58 0 0 1 116 0Z" fill={`url(#${id}-${p.shirt})`} />
      <Circle cx="168" cy="70" r="14" fill={p.accent} />
      <Path
        d="M162 70l4 4 7-8"
        stroke="#ffffff"
        strokeWidth={3}
        strokeLinecap="round"
      />
    </SvgFrame>
  );
}

/* -------------------------------------------------------------------------- */
/*  Learning & analytics art                                                   */
/* -------------------------------------------------------------------------- */

export function LearningArt() {
  const id = useId().replace(/:/g, '');
  return (
    <SvgFrame
      id={id}
      viewBox="0 0 260 220"
      accessibilityLabel="Illustration of books, a laptop and a lightbulb representing learning"
    >
      <BrandGradient id={id} />
      <SkyGradient id={id} />
      <Circle cx="130" cy="110" r="92" fill="#eef2ff" />
      <Rect x="70" y="128" width="120" height="18" rx="6" fill={`url(#${id}-brand)`} />
      <Rect x="62" y="146" width="136" height="18" rx="6" fill={`url(#${id}-sky)`} />
      <Rect x="78" y="110" width="104" height="18" rx="6" fill="#a5b4fc" />
      <Rect x="96" y="72" width="68" height="42" rx="6" fill="#ffffff" stroke="#c7d2fe" strokeWidth={2} />
      <Circle cx="130" cy="52" r="20" fill={`url(#${id}-brand)`} />
      <Path d="M130 40v10M130 60h.01" stroke="#ffffff" strokeWidth={3} strokeLinecap="round" />
      <Path d="M120 72c4 6 16 6 20 0" fill="none" stroke="#c7d2fe" strokeWidth={3} strokeLinecap="round" />
      <Circle cx="196" cy="76" r="10" fill="#f59e0b" />
    </SvgFrame>
  );
}

export function AnalyticsArt() {
  const id = useId().replace(/:/g, '');
  return (
    <SvgFrame
      id={id}
      viewBox="0 0 260 220"
      accessibilityLabel="Illustration of a dashboard with charts representing reporting"
    >
      <BrandGradient id={id} />
      <SkyGradient id={id} />
      <Circle cx="130" cy="110" r="92" fill="#eef2ff" />
      <Rect x="52" y="52" width="156" height="116" rx="16" fill="#0f1a33" />
      <Rect x="70" y="140" width="18" height="16" rx="5" fill={`url(#${id}-brand)`} />
      <Rect x="96" y="120" width="18" height="36" rx="5" fill={`url(#${id}-sky)`} />
      <Rect x="122" y="132" width="18" height="24" rx="5" fill={`url(#${id}-brand)`} />
      <Rect x="148" y="104" width="18" height="52" rx="5" fill={`url(#${id}-sky)`} />
      <Circle
        cx="184"
        cy="80"
        r="16"
        fill="none"
        stroke="#ffffff"
        strokeOpacity={0.2}
        strokeWidth={7}
      />
      <Circle
        cx="184"
        cy="80"
        r="16"
        fill="none"
        stroke={`url(#${id}-brand)`}
        strokeWidth={7}
        strokeLinecap="round"
        strokeDasharray="66 100"
      />
      <Rect x="70" y="70" width="70" height="8" rx="4" fill="#ffffff" fillOpacity={0.5} />
      <Circle cx="204" cy="164" r="12" fill="#34d399" />
    </SvgFrame>
  );
}
