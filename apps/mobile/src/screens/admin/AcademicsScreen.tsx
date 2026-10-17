import { useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';

import { Icon, type IconName } from '../../components/Icon';
import { EmptyState, PageHeader } from '../../components/ui';
import { SearchField } from '../../components/DataList';
import { useAuth } from '../../lib/auth';
import { academicNavForRole, NAV_ICONS, type NavItem } from '../../navigation/navItems';

/**
 * Academics hub: a searchable index of the academic modules the signed-in role
 * is authorised to open. It reuses the same permission-filtered nav items the
 * drawer renders, so a module only appears when it exists and is allowed.
 */
export function AcademicsScreen() {
  const { user } = useAuth();
  const [query, setQuery] = useState('');

  const items = useMemo(
    () => (user ? academicNavForRole(user.role) : []),
    [user],
  );

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return items;
    return items.filter((item) => item.label.toLowerCase().includes(needle));
  }, [items, query]);

  return (
    <>
      <PageHeader
        title="Academics"
        subtitle="Jump to any academic module"
        icon="subject"
      />

      <SearchField value={query} onChange={setQuery} placeholder="Search academic modules…" />

      {items.length === 0 ? (
        <EmptyState message="No academic modules are available for your role." icon="lock" />
      ) : filtered.length === 0 ? (
        <EmptyState message={`No modules match “${query.trim()}”.`} icon="search" />
      ) : (
        <View style={styles.grid}>
          {filtered.map((item) => (
            <ModuleCard key={item.key} item={item} />
          ))}
        </View>
      )}
    </>
  );
}

function ModuleCard({ item }: { item: NavItem }) {
  const navigation = useNavigation<{ navigate: (route: string, params?: object) => void }>();
  const icon: IconName = NAV_ICONS[item.key] ?? 'subject';

  return (
    <Pressable
      style={styles.card}
      onPress={() => navigation.navigate(item.route, item.params)}
      accessibilityLabel={item.label}
    >
      <View style={styles.cardIcon}>
        <Icon name={icon} size={20} />
      </View>
      <Text style={styles.cardLabel} numberOfLines={2}>
        {item.label}
      </Text>
      <Icon name="chevron-right" size={16} />
    </Pressable>
  );
}

const styles = {
  grid: {
    gap: 8,
  },
  card: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#ffffff',
    minHeight: 56,
  },
  cardIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#dbeafe',
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  cardLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#0f172a',
  },
} as const;
