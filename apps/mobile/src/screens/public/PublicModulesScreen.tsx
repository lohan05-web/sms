import { View, Text } from 'react-native';
import { Icon } from '../../components/Icon';
import { SITE_MODULE_GROUPS } from '../../lib/publicContent';
import { PageHero, Section, SectionHeading } from './sections';

export function PublicModulesScreen() {
  return (
    <>
      <PageHero
        eyebrow="Modules"
        title="A module for every department"
        description="Browse the modules by department — each one is available from the day you sign in."
      />
      <Section>
        <SectionHeading
          eyebrow="Departments"
          title="What runs in your school"
          description="Modules are grouped by the work they support every day."
        />
        {SITE_MODULE_GROUPS.map((group) => (
          <View key={group.title} style={styles.group}>
            <View style={styles.groupHeading}>
              <Icon name={group.icon} size={20} />
              <Text style={styles.groupTitle}>{group.title}</Text>
            </View>
            <Text style={styles.groupSummary}>{group.summary}</Text>
            <View style={styles.groupList}>
              {group.modules.map((module) => (
                <View key={module} style={styles.moduleChip}>
                  <Text style={styles.moduleChipText}>{module}</Text>
                </View>
              ))}
            </View>
          </View>
        ))}
      </Section>
    </>
  );
}

const styles = {
  group: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 16,
    marginBottom: 12,
  },
  groupHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  groupTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
  },
  groupSummary: {
    fontSize: 14,
    color: '#475569',
    marginTop: 4,
  },
  groupList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
  },
  moduleChip: {
    backgroundColor: '#eef2ff',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  moduleChipText: {
    fontSize: 13,
    color: '#3730a3',
  },
} as const;
