import { Text, View } from 'react-native';
import { SITE_PLANS } from '../../lib/publicContent';
import { Icon } from '../../components/Icon';
import { PageHero, Section, SectionHeading } from './sections';

export function PublicPlansScreen() {
  return (
    <>
      <PageHero
        eyebrow="Plans"
        title="Simple pricing that grows with you"
        description="Start free and switch on more modules when your school is ready — no migration required."
      />
      <Section>
        <SectionHeading
          eyebrow="Compare"
          title="Choose the plan that fits"
          description="All plans include the core school year. Upgrade any time."
        />
        <View style={styles.plansGrid}>
          {SITE_PLANS.map((plan) => (
            <View
              key={plan.name}
              style={[styles.plan, plan.highlighted ? styles.planHighlighted : null]}
            >
              {plan.highlighted ? (
                <Text style={styles.planBadge}>Most popular</Text>
              ) : null}
              <Text style={styles.planName}>{plan.name}</Text>
              <Text style={styles.planPrice}>{plan.price}</Text>
              <Text style={styles.planPeriod}>{plan.period}</Text>
              <Text style={styles.planTagline}>{plan.tagline}</Text>
              {plan.features.map((feature) => (
                <View key={feature} style={styles.featureRow}>
                  <Icon name="check" size={14} />
                  <Text style={styles.featureText}>{feature}</Text>
                </View>
              ))}
            </View>
          ))}
        </View>
      </Section>
    </>
  );
}

const styles = {
  plansGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 12,
  },
  plan: {
    flexGrow: 1,
    minWidth: 240,
    backgroundColor: '#ffffff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 16,
  },
  planHighlighted: {
    borderColor: '#6366f1',
    borderWidth: 2,
  },
  planBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#eef2ff',
    color: '#3730a3',
    borderRadius: 999,
    fontSize: 12,
    fontWeight: '700',
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  planName: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
    marginTop: 8,
  },
  planPrice: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1d4ed8',
  },
  planPeriod: {
    fontSize: 13,
    color: '#64748b',
  },
  planTagline: {
    fontSize: 14,
    color: '#475569',
    marginTop: 4,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
  },
  featureText: {
    fontSize: 14,
    color: '#334155',
  },
} as const;
