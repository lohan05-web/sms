import { View } from 'react-native';
import { LearningArt } from '../../components/illustrations';
import { SITE_FEATURES } from '../../lib/publicContent';
import { PageHero, Section, SectionHeading, FeatureCard } from './sections';

export function PublicFeaturesScreen() {
  return (
    <>
      <PageHero
        eyebrow="Features"
        title="Everything your school needs to run"
        description="Thirty modules cover every department — from admissions to year-end reporting."
      />
      <Section>
        <SectionHeading
          eyebrow="Included"
          title="A feature for every role"
          description="Each portal is tailored to the work its role does every day."
        />
        <View style={styles.grid}>
          {SITE_FEATURES.map((feature) => (
            <FeatureCard key={feature.title} feature={feature} />
          ))}
        </View>
      </Section>
      <Section>
        <View style={styles.artWrap}>
          <LearningArt />
        </View>
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
  artWrap: {
    alignItems: 'center',
    marginTop: 12,
  },
} as const;
