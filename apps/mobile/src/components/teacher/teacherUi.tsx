import type { ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { Icon, type IconName } from '../Icon';
import { EmptyState } from '../ui';
import { colors, radius, shadow, shadowStrong, teacherGradient } from '../../theme';

/**
 * The shared building blocks for the Teacher portal screens.
 *
 * They follow the navy + purple design the web Teacher Dashboard applies
 * through `data-theme="navy"`: a deep-navy hero with a purple → navy gradient,
 * white rounded cards with subtle borders, and consistent 20/24px rhythm.
 * Nothing here talks to the network — screens own their data.
 */

/* --------------------------------------------------------------------------
   Page + card chrome
   -------------------------------------------------------------------------- */

/**
 * Vertical rhythm wrapper for a teacher screen. The shared `Layout` already
 * adds a 12px gap; teacher sections need a touch more air so the summary
 * cards, the weekly grid and the day list never read as one merged block.
 */
export function TeacherPage({ children }: { children: ReactNode }) {
  return <View style={styles.page}>{children}</View>;
}

/** A titled, rounded card — the container for every teacher section. */
export function TeacherPanel({
  title,
  subtitle,
  icon,
  action,
  accent,
  children,
}: {
  title?: string;
  subtitle?: string;
  icon?: IconName;
  /** Rendered on the right of the header (usually a text button). */
  action?: ReactNode;
  /**
   * A 4px colour bar across the top of the card. Two stacked panels that hold
   * different views of the same data (the weekly grid vs. the day-by-day
   * schedule) use distinct accents so they never read as one long list.
   */
  accent?: 'navy' | 'violet';
  children: ReactNode;
}) {
  const panelStyle = [styles.panel, accent ? PANEL_ACCENTS[accent] : null];
  if (!title) {
    return <View style={panelStyle}>{children}</View>;
  }
  return (
    <View style={panelStyle}>
      <View style={styles.panelHeader}>
        <View style={styles.panelHeading}>
          {icon ? (
            <View style={styles.panelIcon}>
              <Icon name={icon} size={16} color={colors.primary} />
            </View>
          ) : null}
          <View style={styles.panelHeadingText}>
            <Text style={styles.panelTitle}>{title}</Text>
            {subtitle ? <Text style={styles.panelSubtitle}>{subtitle}</Text> : null}
          </View>
        </View>
        {action ?? null}
      </View>
      {children}
    </View>
  );
}

export type NoticeTone = 'info' | 'warning' | 'danger' | 'success';

const NOTICE_TONES: Record<NoticeTone, { bg: string; fg: string }> = {
  info: { bg: colors.infoSoft, fg: colors.info },
  warning: { bg: colors.warningSoft, fg: colors.warning },
  danger: { bg: colors.dangerSoft, fg: colors.danger },
  success: { bg: colors.successSoft, fg: colors.success },
};

/**
 * An inline banner for states that need explaining but not replacing: a list
 * that hit its paging ceiling, a partially failed save, a permission note.
 */
export function TeacherNotice({
  tone = 'info',
  message,
  icon = 'info',
}: {
  tone?: NoticeTone;
  message: string;
  icon?: IconName;
}) {
  const palette = NOTICE_TONES[tone];
  return (
    <View style={[styles.notice, { backgroundColor: palette.bg }]}>
      <Icon name={icon} size={15} color={palette.fg} />
      <Text style={[styles.noticeText, { color: palette.fg }]}>{message}</Text>
    </View>
  );
}

/** Small uppercase group heading used for sub-sections inside a panel. */
export function SectionTitle({ children }: { children: ReactNode }) {
  return <Text style={styles.sectionTitle}>{children}</Text>;
}

/* --------------------------------------------------------------------------
   Hero
   -------------------------------------------------------------------------- */

/**
 * The navy → purple greeting banner. Mirrors `.teacher-hero` on the web
 * dashboard: eyebrow (school), greeting, date/class line, action buttons, and
 * a highlighted "attendance today" tile.
 */
export function TeacherHero({
  eyebrow,
  title,
  subtitle,
  actions,
  statLabel,
  statValue,
  statHint,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  statLabel?: string;
  statValue?: string;
  statHint?: string;
}) {
  return (
    <LinearGradient
      colors={teacherGradient}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.hero}
    >
      <View style={styles.heroText}>
        {eyebrow ? (
          <View style={styles.heroEyebrow}>
            <Icon name="sparkles" size={12} color={colors.onNavyMuted} />
            <Text style={styles.heroEyebrowLabel} numberOfLines={1}>
              {eyebrow}
            </Text>
          </View>
        ) : null}
        <Text style={styles.heroTitle}>{title}</Text>
        {subtitle ? <Text style={styles.heroSubtitle}>{subtitle}</Text> : null}
        {actions ? <View style={styles.heroActions}>{actions}</View> : null}
      </View>

      {statLabel ? (
        <View style={styles.heroStat}>
          <Text style={styles.heroStatLabel} numberOfLines={1}>
            {statLabel}
          </Text>
          <Text style={styles.heroStatValue} numberOfLines={1}>
            {statValue ?? '—'}
          </Text>
          {statHint ? (
            <Text style={styles.heroStatHint} numberOfLines={2}>
              {statHint}
            </Text>
          ) : null}
        </View>
      ) : null}
    </LinearGradient>
  );
}

/* --------------------------------------------------------------------------
   Rows, chips, quick actions
   -------------------------------------------------------------------------- */

/** Label / value row used for profile-style detail lists. */
export function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue} numberOfLines={2}>
        {value || '—'}
      </Text>
    </View>
  );
}

export type ChipTone = 'default' | 'info' | 'success' | 'warning' | 'danger' | 'navy';

const CHIP_TONES: Record<ChipTone, { bg: string; fg: string }> = {
  default: { bg: colors.surfaceMuted, fg: colors.textMuted },
  info: { bg: colors.infoSoft, fg: colors.info },
  success: { bg: colors.successSoft, fg: colors.success },
  warning: { bg: colors.warningSoft, fg: colors.warning },
  danger: { bg: colors.dangerSoft, fg: colors.danger },
  navy: { bg: '#e0e7ff', fg: '#1e3a8a' },
};

/** Small pill used for subjects, grades, statuses and counts. */
export function Chip({
  label,
  tone = 'default',
}: {
  label: string;
  tone?: ChipTone;
}) {
  const palette = CHIP_TONES[tone];
  return (
    <View style={[styles.chip, { backgroundColor: palette.bg }]}>
      <Text style={[styles.chipLabel, { color: palette.fg }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

export interface QuickAction {
  key: string;
  label: string;
  description?: string;
  icon: IconName;
  onPress: () => void;
}

/** Two-column grid of tappable shortcuts (the dashboard's "Quick access"). */
export function QuickActionGrid({ items }: { items: readonly QuickAction[] }) {
  if (items.length === 0) return null;
  return (
    <View style={styles.actionGrid}>
      {items.map((item) => (
        <Pressable
          key={item.key}
          onPress={item.onPress}
          accessibilityRole="button"
          accessibilityLabel={item.label}
          style={({ pressed }) => [styles.actionCard, pressed ? styles.actionCardPressed : null]}
        >
          <View style={styles.actionIcon}>
            <Icon name={item.icon} size={18} color={colors.primary} />
          </View>
          <View style={styles.actionBody}>
            <Text style={styles.actionLabel} numberOfLines={1}>
              {item.label}
            </Text>
            {item.description ? (
              <Text style={styles.actionDesc} numberOfLines={2}>
                {item.description}
              </Text>
            ) : null}
          </View>
        </Pressable>
      ))}
    </View>
  );
}

/** A full-width primary/ghost button sized for a thumb. */
export function TeacherButton({
  label,
  icon,
  onPress,
  variant = 'primary',
  disabled,
}: {
  label: string;
  icon?: IconName;
  onPress: () => void;
  variant?: 'primary' | 'ghost' | 'navy';
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: Boolean(disabled) }}
      style={({ pressed }) => [
        styles.button,
        variant === 'primary' ? styles.buttonPrimary : null,
        variant === 'ghost' ? styles.buttonGhost : null,
        variant === 'navy' ? styles.buttonNavy : null,
        pressed ? styles.buttonPressed : null,
        disabled ? styles.buttonDisabled : null,
      ]}
    >
      {icon ? (
        <Icon
          name={icon}
          size={16}
          color={
            variant === 'primary' || variant === 'navy'
              ? colors.white
              : colors.text
          }
        />
      ) : null}
      <Text
        style={[
          styles.buttonLabel,
          variant === 'primary' || variant === 'navy' ? styles.buttonLabelOnFill : null,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

/* --------------------------------------------------------------------------
   Empty state
   -------------------------------------------------------------------------- */

/**
 * Empty state with the same copy tone as the web teacher pages: a plain
 * message plus a short hint explaining what fills it in.
 */
export function TeacherEmpty({
  message,
  hint,
  icon = 'inbox',
  art,
}: {
  message: string;
  hint?: string;
  icon?: IconName;
  art?: ReactNode;
}) {
  return (
    <View style={styles.empty}>
      {art}
      <EmptyState message={message} icon={icon} />
      {hint ? <Text style={styles.emptyHint}>{hint}</Text> : null}
    </View>
  );
}

/* --------------------------------------------------------------------------
   Styles
   -------------------------------------------------------------------------- */

/** Top-edge accent colours for `TeacherPanel`. */
const PANEL_ACCENTS = {
  navy: { borderTopWidth: 4, borderTopColor: '#1e3a8a' },
  violet: { borderTopWidth: 4, borderTopColor: '#6d28d9' },
} as const;

const styles = {
  page: {
    gap: 16,
  },
  panel: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: 16,
    gap: 12,
    ...shadow,
  },
  notice: {
    flexDirection: 'row' as const,
    alignItems: 'flex-start' as const,
    gap: 8,
    padding: 12,
    borderRadius: radius.sm,
  },
  noticeText: {
    flex: 1,
    fontSize: 12.5,
    lineHeight: 17,
    fontWeight: '600' as const,
  },
  panelHeader: {
    flexDirection: 'row' as const,
    alignItems: 'flex-start' as const,
    justifyContent: 'space-between' as const,
    gap: 10,
    flexWrap: 'wrap' as const,
  },
  panelHeading: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 10,
    flex: 1,
    minWidth: 0,
  },
  panelIcon: {
    width: 32,
    height: 32,
    borderRadius: radius.sm,
    backgroundColor: colors.primarySoft,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  panelHeadingText: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  panelTitle: {
    fontSize: 15.5,
    fontWeight: '700' as const,
    color: colors.text,
  },
  panelSubtitle: {
    fontSize: 12.5,
    color: colors.textMuted,
  },
  sectionTitle: {
    fontSize: 11.5,
    fontWeight: '700' as const,
    letterSpacing: 0.6,
    textTransform: 'uppercase' as const,
    color: colors.textFaint,
    marginTop: 4,
  },

  hero: {
    borderRadius: radius.xl,
    padding: 18,
    gap: 16,
    ...shadowStrong,
  },
  heroText: {
    gap: 6,
  },
  heroEyebrow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 6,
  },
  heroEyebrowLabel: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: colors.onNavyMuted,
    flexShrink: 1,
  },
  heroTitle: {
    fontSize: 23,
    lineHeight: 29,
    fontWeight: '800' as const,
    color: colors.onNavy,
  },
  heroSubtitle: {
    fontSize: 13.5,
    lineHeight: 19,
    color: colors.onNavyMuted,
  },
  heroActions: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    gap: 8,
    marginTop: 6,
  },
  heroStat: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    padding: 14,
    gap: 4,
    alignSelf: 'stretch' as const,
  },
  heroStatLabel: {
    fontSize: 11.5,
    fontWeight: '700' as const,
    letterSpacing: 0.5,
    textTransform: 'uppercase' as const,
    color: colors.onNavyMuted,
  },
  heroStatValue: {
    fontSize: 30,
    fontWeight: '800' as const,
    color: colors.white,
  },
  heroStatHint: {
    fontSize: 12.5,
    color: colors.onNavyMuted,
  },

  detailRow: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'flex-start' as const,
    gap: 12,
    paddingVertical: 7,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  detailLabel: {
    fontSize: 13.5,
    color: colors.textMuted,
    flexShrink: 0,
  },
  detailValue: {
    fontSize: 13.5,
    fontWeight: '600' as const,
    color: colors.text,
    flexShrink: 1,
    textAlign: 'right' as const,
  },

  chip: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: radius.pill,
    alignSelf: 'flex-start' as const,
  },
  chipLabel: {
    fontSize: 11.5,
    fontWeight: '700' as const,
  },

  actionGrid: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    gap: 10,
  },
  actionCard: {
    flexGrow: 1,
    flexBasis: '46%',
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 10,
    padding: 12,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    minHeight: 64,
  },
  actionCardPressed: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primaryLight,
  },
  actionIcon: {
    width: 34,
    height: 34,
    borderRadius: radius.sm,
    backgroundColor: colors.primarySoft,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  actionBody: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  actionLabel: {
    fontSize: 13.5,
    fontWeight: '700' as const,
    color: colors.text,
  },
  actionDesc: {
    fontSize: 11.5,
    color: colors.textMuted,
  },

  button: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: 8,
    minHeight: 42,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  buttonPrimary: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  buttonGhost: {
    backgroundColor: colors.surface,
    borderColor: colors.borderStrong,
  },
  buttonNavy: {
    backgroundColor: colors.navySurface,
    borderColor: colors.navyBorder,
  },
  buttonPressed: {
    opacity: 0.75,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonLabel: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: colors.text,
  },
  buttonLabelOnFill: {
    color: colors.white,
  },

  empty: {
    alignItems: 'center' as const,
    gap: 6,
  },
  emptyHint: {
    fontSize: 12.5,
    lineHeight: 18,
    color: colors.textMuted,
    textAlign: 'center' as const,
    paddingHorizontal: 8,
  },
} as const;
