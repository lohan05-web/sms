import { View, Text } from 'react-native';
import { SITE_FAQ } from '../../lib/publicContent';
import { PageHero, Section, SectionHeading } from './sections';

export function PublicFaqScreen() {
  return (
    <>
      <PageHero
        eyebrow="FAQ"
        title="Frequently asked questions"
        description="Answers to the questions schools ask before they sign up — and after they have been using SmartSchool for a while."
      />
      <Section>
        <SectionHeading
          eyebrow="Questions"
          title="Everything you need to know"
        />
        <View style={styles.faqList}>
          {SITE_FAQ.map((entry) => (
            <View key={entry.question} style={styles.faqItem}>
              <Text style={styles.faqQuestion}>{entry.question}</Text>
              <Text style={styles.faqAnswer}>{entry.answer}</Text>
            </View>
          ))}
        </View>
      </Section>
    </>
  );
}

const styles = {
  faqList: {
    gap: 12,
  },
  faqItem: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 16,
  },
  faqQuestion: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
  },
  faqAnswer: {
    fontSize: 14,
    color: '#475569',
    marginTop: 6,
  },
} as const;
