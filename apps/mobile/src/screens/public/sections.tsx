import type { ReactNode } from 'react';
import { Text, View } from 'react-native';
import { Icon } from '../../components/Icon';
import { AvatarArt } from '../../components/illustrations';
import type { SiteFeature, SiteModule, SiteStat } from '../../lib/publicContent';

export function Section({ children }: { children: ReactNode }) {
  return (
    <View style={styles.section}>{children}</View>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  description,
  align = 'center',
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  align?: 'center' | 'start';
}) {
  return (
    <View style={[styles.heading, align === 'start' ? styles.headingStart : null]}>
      {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
      <Text style={styles.headingTitle}>{title}</Text>
      {description ? <Text style={styles.headingDescription}>{description}</Text> : null}
    </View>
  );
}

export function Split({
  reverse,
  media,
  children,
}: {
  reverse?: boolean;
  media: ReactNode;
  children: ReactNode;
}) {
  return (
    <View style={[styles.split, reverse ? styles.splitReverse : null]}>
      <View style={styles.splitText}>{children}</View>
      <View style={styles.splitMedia}>{media}</View>
    </View>
  );
}

export function PageHero({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children?: ReactNode;
}) {
  return (
    <View style={styles.hero}>
      <Text style={styles.eyebrow}>{eyebrow}</Text>
      <Text style={styles.heroTitle}>{title}</Text>
      <Text style={styles.heroLead}>{description}</Text>
      {children ? <View>{children}</View> : null}
    </View>
  );
}

export function FeatureCard({ feature }: { feature: SiteFeature }) {
  return (
    <View style={styles.card}>
      <View style={styles.cardIcon}>
        <Icon name={feature.icon} size={22} />
      </View>
      <Text style={styles.cardTitle}>{feature.title}</Text>
      <Text style={styles.cardDescription}>{feature.description}</Text>
    </View>
  );
}

export function ModuleCard({ module }: { module: SiteModule }) {
  return (
    <View style={styles.card}>
      <View style={styles.cardIcon}>
        <Icon name={module.icon} size={20} />
      </View>
      <Text style={styles.cardTitle}>{module.title}</Text>
      <Text style={styles.cardDescription}>{module.description}</Text>
    </View>
  );
}

export function StatStrip({ stats }: { stats: SiteStat[] }) {
  return (
    <View style={styles.statStrip}>
      {stats.map((stat) => (
        <View key={stat.label} style={styles.stat}>
          <Text style={styles.statValue}>{stat.value}</Text>
          <Text style={styles.statLabel}>{stat.label}</Text>
        </View>
      ))}
    </View>
  );
}

export function CtaBand({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <View style={styles.cta}>
      <Text style={styles.ctaTitle}>{title}</Text>
      <Text style={styles.ctaDescription}>{description}</Text>
    </View>
  );
}

export function PeopleCard({
  variant,
  title,
  description,
}: {
  variant: 'teacher' | 'student' | 'parent';
  title: string;
  description: string;
}) {
  return (
    <View style={styles.card}>
      <AvatarArt variant={variant} />
      <Text style={styles.cardTitle}>{title}</Text>
      <Text style={styles.cardDescription}>{description}</Text>
    </View>
  );
}

const styles = {
  section: {
    paddingVertical: 24,
  },
  heading: {
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 8,
  },
  headingStart: {},
  eyebrow: {
    color: '#4f46e5',
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  headingTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#0f172a',
    textAlign: 'center',
    marginTop: 8,
  },
  headingDescription: {
    fontSize: 15,
    color: '#475569',
    marginTop: 6,
    textAlign: 'center',
  },
  hero: {
    padding: 32,
    gap: 12,
    backgroundColor: '#1e293b',
  },
  heroTitle: {
    fontSize: 30,
    fontWeight: '800',
    color: '#ffffff',
  },
  heroLead: {
    fontSize: 16,
    color: '#cbd5e1',
  },
  split: {
    flexDirection: 'row' as const,
    gap: 24,
    alignItems: 'center' as const,
  },
  splitReverse: {
    flexDirection: 'row-reverse' as const,
  },
  splitText: {
    flex: 1,
  },
  splitMedia: {
    flex: 1,
    alignItems: 'center' as const,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 16,
    minWidth: 220,
    flexGrow: 1,
  },
  cardIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#eef2ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
    marginTop: 10,
  },
  cardDescription: {
    fontSize: 14,
    color: '#475569',
    marginTop: 4,
  },
  statStrip: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  stat: {
    width: 150,
    backgroundColor: '#eef2ff',
    borderRadius: 12,
    padding: 12,
  },
  statValue: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1e293b',
  },
  statLabel: {
    fontSize: 12,
    color: '#64748b',
  },
  cta: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 24,
    gap: 8,
  },
  ctaTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#ffffff',
  },
  ctaDescription: {
    color: '#cbd5e1',
  },
} as const;
