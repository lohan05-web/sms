import { useNavigation } from '@react-navigation/native';
import { Pressable, Text, View } from 'react-native';

import {
  childLabel,
  type ParentChild,
} from '../../components/ParentChildShell';
import { Icon, type IconName } from '../../components/Icon';
import { api } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { useAsync } from '../../lib/useAsync';

type ParentFeatureIcon = 'timetable' | 'marks' | 'finance' | 'homework' | 'bus' | 'bell';

const FEATURES: { route: string; label: string; icon: ParentFeatureIcon }[] = [
  { route: 'parent-timetable', label: 'Timetable', icon: 'timetable' },
  { route: 'parent-results', label: 'Results', icon: 'marks' },
  { route: 'parent-invoices', label: 'Invoices', icon: 'finance' },
  { route: 'parent-homework', label: 'Homework', icon: 'homework' },
  { route: 'parent-vehicle', label: 'Vehicle details', icon: 'bus' },
  { route: 'notifications', label: 'Notifications', icon: 'bell' },
];

interface ChildOverview {
  children: ParentChild[];
}

/** Any of the per-child parent screens. */
type ParentRouteName = string;

/**
 * The parent portal: shows the children linked to the parent's account and
 * jumps into each per-child feature screen.
 */
export function ParentPortalScreen() {
  const { user } = useAuth();
  const navigation = useNavigation<{
    navigate: (route: ParentRouteName, params?: object) => void;
  }>();
  const state = useAsync<ParentChild[]>(async () => {
    const overview = await api.get<ChildOverview>('/parents/me/children');
    return overview.children;
  }, []);

  const children = state.data ?? [];

  return (
    <>
      <Header title="My Children" subtitle={`Welcome back, ${user?.firstName ?? 'Parent'}`} />

      {state.loading ? (
        <Text style={styles.muted}>Loading children…</Text>
      ) : state.error ? (
        <Text style={styles.muted}>{state.error}</Text>
      ) : children.length === 0 ? (
        <Text style={styles.muted}>
          No children are linked to your account yet. Please contact the school office.
        </Text>
      ) : (
        <View style={styles.grid}>
          {children.map((child) => (
            <View key={child.id} style={styles.childCard}>
              <Text style={styles.childName}>{childLabel(child)}</Text>
              <Text style={styles.muted}>Admission {child.admissionNo}</Text>
            </View>
          ))}
        </View>
      )}

      <View style={styles.grid}>
        {FEATURES.map((feature) => (
          <FeatureButton
            key={feature.route}
            label={feature.label}
            icon={feature.icon}
            onPress={() => navigation.navigate(feature.route)}
          />
        ))}
      </View>
    </>
  );
}

function FeatureButton({
  label,
  icon,
  onPress,
}: {
  label: string;
  icon: ParentFeatureIcon;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={styles.feature} accessibilityLabel={label}>
      <Icon name={icon as IconName} size={20} />
      <Text style={styles.featureLabel}>{label}</Text>
    </Pressable>
  );
}

function Header({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <View>
      <Text style={styles.headerTitle}>{title}</Text>
      {subtitle ? <Text style={styles.headerSubtitle}>{subtitle}</Text> : null}
    </View>
  );
}

const styles = {
  grid: {
    gap: 8,
  },
  childCard: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#ffffff',
    gap: 2,
  },
  childName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
  },
  feature: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#ffffff',
  },
  featureLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
  },
  muted: {
    fontSize: 13,
    color: '#64748b',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#0f172a',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#475569',
    marginTop: 2,
  },
} as const;
