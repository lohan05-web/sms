import { Pressable, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { HeroScene, AnalyticsArt } from '../../components/illustrations';
import {
  FeatureCard,
  PageHero,
  Section,
  SectionHeading,
  Split,
  StatStrip,
} from './sections';
import { SITE_FEATURES, SITE_STATS } from '../../lib/publicContent';
import { ROUTES } from '../../navigation/routes';

/**
 * Marketing home. Mirrors the web `/site` landing page, and exposes
 * navigation to the sign-in screens (parity with the web app's
 * `/site` navbar + hero CTA).
 */
const SITE_LINKS: { label: string; route: string }[] = [
  { label: 'About', route: ROUTES.public.about },
  { label: 'Features', route: ROUTES.public.features },
  { label: 'Modules', route: ROUTES.public.modules },
  { label: 'Plans', route: ROUTES.public.plans },
  { label: 'FAQ', route: ROUTES.public.faq },
  { label: 'Contact', route: ROUTES.public.contact },
];

export function PublicHomeScreen() {
  const navigation = useNavigation<{ navigate: (route: string, params?: object) => void }>();
  return (
    <>
      <PageHero
        eyebrow="SmartSchool"
        title="The all-in-one school platform"
        description="Run admissions, academics, finance and communication from one place — on the web, the classroom and the parent portal."
      >
        <View style={styles.heroActions}>
          <Pressable
            style={styles.primaryCta}
            onPress={() => navigation.navigate(ROUTES.public.login)}
            accessibilityLabel="Sign in to your account"
          >
            <Text style={styles.primaryCtaText}>Sign in</Text>
          </Pressable>
        </View>
        <View style={styles.siteNav}>
          {SITE_LINKS.map((link) => (
            <Pressable
              key={link.route}
              onPress={() => navigation.navigate(link.route)}
              accessibilityLabel={link.label}
            >
              <Text style={styles.siteNavLink}>{link.label}</Text>
            </Pressable>
          ))}
        </View>
      </PageHero>

      <Section>
        <Split
          media={
            <AnalyticsArt />
          }
        >
          <SectionHeading
            eyebrow="Insight"
            title="Reports that guide every decision"
            description="Live dashboards turn attendance, marks and fee data into answers your leadership team can act on."
          />
        </Split>
      </Section>

      <Section>
        <SectionHeading
          eyebrow="Modules"
          title="Everything a school needs"
          description="Thirty built-in modules cover the whole school year, from enrolment to report cards."
        />
        <View style={styles.grid}>
          {SITE_FEATURES.map((feature) => (
            <FeatureCard key={feature.title} feature={feature} />
          ))}
        </View>
      </Section>

      <Section>
        <StatStrip stats={SITE_STATS} />
      </Section>

      <Section>
        <HeroScene />
      </Section>
    </>
  );
}

const styles = {
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 12,
  },
  heroActions: {
    marginTop: 4,
  },
  primaryCta: {
    backgroundColor: '#1d4ed8',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  primaryCtaText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 15,
  },
  siteNav: {
    marginTop: 4,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  siteNavLink: {
    color: '#e2e8f0',
    fontWeight: '600',
    fontSize: 13,
    textDecorationLine: 'underline',
  },
} as const;
