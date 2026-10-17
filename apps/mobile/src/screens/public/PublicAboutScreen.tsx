import { View, Text } from 'react-native';
import { ClassroomArt } from '../../components/illustrations';
import { Icon } from '../../components/Icon';
import { SITE_VALUES } from '../../lib/publicContent';
import { PageHero, Section, SectionHeading, PeopleCard } from './sections';

export function PublicAboutScreen() {
  return (
    <>
      <PageHero
        eyebrow="About us"
        title="About SmartSchool"
        description="A school management system built by teachers, for teachers — and trusted by the families they support."
      />
      <Section>
        <SectionHeading
          eyebrow="Our story"
          title="One platform for the whole school"
          description="SmartSchool started as a spreadsheet kept by a single head teacher. It has since grown into the system used by every portal in the school."
        />
        <View style={styles.story}>
          <Text style={styles.storyText}>
            The platform covers every role: administrators run the school, teachers mark
            attendance and enter marks in seconds, parents follow their children, and
            students keep up with homework — all against the same live data.
          </Text>
        </View>
      </Section>
      <Section>
        <SectionHeading eyebrow="People" title="Who uses SmartSchool" />
        <View style={styles.peopleGrid}>
          <PeopleCard
            variant="teacher"
            title="Teachers"
            description="Classrooms, timetables, homework and instant marks entry."
          />
          <PeopleCard
            variant="student"
            title="Students"
            description="Their own view of timetables, homework, results and library loans."
          />
          <PeopleCard
            variant="parent"
            title="Parents"
            description="Attendance, marks, invoices and teacher communication in one place."
          />
        </View>
      </Section>
      <Section>
        <SectionHeading
          eyebrow="Highlights"
          title="What makes it different"
          description="A few details our users tell us about most."
        />
        <View style={styles.highlights}>
          {SITE_VALUES.map((value) => (
            <View key={value.title} style={styles.highlight}>
              <Icon name={value.icon} size={20} />
              <Text style={styles.highlightTitle}>{value.title}</Text>
              <Text style={styles.highlightDescription}>{value.description}</Text>
            </View>
          ))}
        </View>
        <View style={styles.modulesHint}>
          <ClassroomArt />
        </View>
      </Section>
    </>
  );
}

const styles = {
  story: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 16,
  },
  storyText: {
    fontSize: 15,
    lineHeight: 22,
    color: '#334155',
  },
  peopleGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  highlights: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  highlight: {
    flexGrow: 1,
    minWidth: 180,
    backgroundColor: '#ffffff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 16,
  },
  highlightTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
    marginTop: 8,
  },
  highlightDescription: {
    fontSize: 14,
    color: '#475569',
    marginTop: 4,
  },
  modulesHint: {
    marginTop: 12,
  },
} as const;
