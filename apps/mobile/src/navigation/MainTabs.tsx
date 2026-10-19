import type { ComponentType } from 'react';
import { View } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Permission, Role } from '@smartschool/shared';

import { Icon, type IconName } from '../components/Icon';
import { Layout } from '../components/Layout';
import { useRealtime } from '../components/RealtimeProvider';
import { useAuth } from '../lib/auth';
import { can } from '../lib/permissions';
import { defaultRouteForRole, type TabRouteName } from '../lib/routing';
import { colors } from '../theme';
import { academicNavForRole } from './navItems';
import { AdminDashboardScreen } from '../screens/admin/AdminDashboardScreen';
import { AcademicsScreen } from '../screens/admin/AcademicsScreen';
import { NotificationsScreen } from '../screens/admin/AdminNotificationsScreen';
import { ProfileScreen } from '../screens/admin/AdminProfileScreen';

const Tab = createBottomTabNavigator();

/** The four primary destinations. Everything else lives in the drawer. */
const TABS: {
  name: TabRouteName;
  component: ComponentType;
  label: string;
  icon: IconName;
  permission?: Permission;
  /** Roles that never see this tab (teachers get their own portal instead). */
  excludeRoles?: readonly Role[];
  /** Highlights the Notifications tab with the live unread counter. */
  badge?: boolean;
  /** Only shown when the role can open at least one academic module. */
  academic?: boolean;
}[] = [
  {
    name: 'admin-dashboard',
    component: AdminDashboardScreen,
    label: 'Dashboard',
    icon: 'dashboard',
    permission: Permission.REPORT_READ,
    // The web dashboard is excluded for teachers, who have `/teacher` instead.
    excludeRoles: [Role.TEACHER],
  },
  {
    name: 'academics',
    component: AcademicsScreen,
    label: 'Academics',
    icon: 'subject',
    academic: true,
  },
  {
    name: 'notifications',
    component: NotificationsScreen,
    label: 'Notifications',
    icon: 'bell',
    permission: Permission.NOTIFICATION_READ,
    badge: true,
  },
  {
    name: 'profile',
    component: ProfileScreen,
    label: 'Profile',
    icon: 'user',
  },
];

/** Wraps a tab screen in the shared shell so every tab has the same chrome. */
function withLayout(Screen: ComponentType): ComponentType {
  function Wrapped() {
    // The tab bar already covers the bottom safe-area inset.
    return (
      <Layout bottomInset={false}>
        <Screen />
      </Layout>
    );
  }
  Wrapped.displayName = `Tab(${Screen.displayName ?? Screen.name ?? 'Screen'})`;
  return Wrapped;
}

function TabIcon({ name, color, size }: { name: IconName; color: string; size: number }) {
  return (
    <View style={styles.tabIcon}>
      <Icon name={name} size={size} color={color} />
    </View>
  );
}

export function MainTabs() {
  const { user } = useAuth();
  const { unread } = useRealtime();
  const insets = useSafeAreaInsets();
  if (!user) return null;

  // Only the tabs the role may open; Profile is always available, so the set
  // is never empty.
  const hasAcademicModules = academicNavForRole(user.role).length > 0;
  const allowed = TABS.filter((tab) => {
    if (tab.academic && !hasAcademicModules) return false;
    if (tab.excludeRoles && tab.excludeRoles.includes(user.role)) return false;
    if (tab.permission && !can(user.role, tab.permission)) return false;
    return true;
  });
  const preferred = defaultRouteForRole(user.role);
  const initialRouteName =
    allowed.find((tab) => tab.name === preferred)?.name ?? allowed[0]?.name ?? 'profile';

  return (
    <Tab.Navigator
      initialRouteName={initialRouteName}
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        // An explicit height overrides the tab bar's own safe-area handling, so
        // the bottom inset has to be added by hand — otherwise the tab labels
        // end up underneath Android's navigation bar.
        tabBarStyle: {
          height: 58 + insets.bottom,
          paddingTop: 6,
          paddingBottom: 6 + insets.bottom,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          backgroundColor: colors.surface,
        },
        tabBarLabelStyle: {
          fontSize: 11.5,
          fontWeight: '600',
        },
      }}
    >
      {allowed.map((tab) => (
        <Tab.Screen
          key={tab.name}
          name={tab.name}
          component={withLayout(tab.component)}
          options={{
            title: tab.label,
            tabBarLabel: tab.label,
            tabBarAccessibilityLabel: `${tab.label} tab`,
            tabBarIcon: ({ color, size }) => <TabIcon name={tab.icon} color={color} size={size} />,
            tabBarBadge:
              tab.badge && unread > 0 ? (unread > 99 ? '99+' : unread) : undefined,
            tabBarBadgeStyle: styles.tabBadge,
          }}
        />
      ))}
    </Tab.Navigator>
  );
}

const styles = {
  tabIcon: {
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  tabBadge: {
    backgroundColor: colors.danger,
    color: colors.white,
    fontSize: 10,
    fontWeight: '800' as const,
  },
} as const;
