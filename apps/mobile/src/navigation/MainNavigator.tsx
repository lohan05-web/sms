import type { ComponentType } from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import {
  createDrawerNavigator,
  type DrawerContentComponentProps,
} from '@react-navigation/drawer';

import { Icon } from '../components/Icon';
import { Layout } from '../components/Layout';
import { useAuth } from '../lib/auth';
import { humanize, initials } from '../lib/format';
import { drawerInitialRouteForRole } from '../lib/routing';
import { colors, radius } from '../theme';
import { ROUTES } from './routes';
import { NAV_ICONS, groupNav, navForRole } from './navItems';
import { MainTabs } from './MainTabs';
import { StudentDetailsScreen } from '../screens/admin/StudentDetailsScreen';
import { MarkManagementScreen } from '../screens/admin/MarkManagementScreen';
import { ResourceListScreen } from '../screens/admin/ResourceListScreen';
import { InfoScreen } from '../screens/admin/InfoScreen';
import { MessagesScreen } from '../screens/admin/AdminMessagesScreen';
import { SettingsScreen } from '../screens/admin/AdminSettingsScreen';
import { TeacherPortalScreen } from '../screens/teacher/TeacherPortalScreen';
import { ParentPortalScreen } from '../screens/parent/ParentPortalScreen';
import { ParentTimetableScreen } from '../screens/parent/ParentTimetableScreen';
import { ParentResultsScreen } from '../screens/parent/ParentResultsScreen';
import { ParentInvoicesScreen } from '../screens/parent/ParentInvoicesScreen';
import { ParentHomeworkScreen } from '../screens/parent/ParentHomeworkScreen';
import { ParentVehicleScreen } from '../screens/parent/ParentVehicleScreen';

const Drawer = createDrawerNavigator();

/**
 * Wraps a screen in the shared Layout shell (header, scrollable content,
 * toaster) so every drawer screen renders the same chrome. The bottom-tab host
 * (`tabs`) is excluded because each tab already renders its own Layout.
 */
function withLayout(ScreenComponent: ComponentType): ComponentType {
  function Screen() {
    return (
      <Layout>
        <ScreenComponent />
      </Layout>
    );
  }
  Screen.displayName = `Layout(...${
    ScreenComponent.displayName ?? ScreenComponent.name ?? 'Screen'
  })`;
  return Screen;
}

/** Drawer screens that carry their own Layout (everything except the tab host). */
const SCREEN_SHELLS: { route: string; component: ComponentType }[] = [
  { route: ROUTES.teacher.portal, component: TeacherPortalScreen },
  { route: ROUTES.parent.portal, component: ParentPortalScreen },
  { route: ROUTES.parent.timetable, component: ParentTimetableScreen },
  { route: ROUTES.parent.results, component: ParentResultsScreen },
  { route: ROUTES.parent.invoices, component: ParentInvoicesScreen },
  { route: ROUTES.parent.homework, component: ParentHomeworkScreen },
  { route: ROUTES.parent.vehicle, component: ParentVehicleScreen },
  { route: ROUTES.admin.students, component: StudentDetailsScreen },
  { route: ROUTES.admin.marks, component: MarkManagementScreen },
  { route: ROUTES.admin.resource, component: ResourceListScreen },
  { route: ROUTES.admin.info, component: InfoScreen },
  { route: ROUTES.admin.messages, component: MessagesScreen },
  { route: ROUTES.admin.settings, component: SettingsScreen },
];

/**
 * The authenticated experience: a drawer whose entries are exactly the nav
 * items the signed-in role may open (grouped into Overview / Academics / School
 * Operations / Account). Its home is the bottom-tab host, so the four primary
 * areas stay one tap away.
 */
export function MainNavigator() {
  const { user } = useAuth();
  if (!user) return null;

  return (
    <Drawer.Navigator
      initialRouteName={drawerInitialRouteForRole(user.role)}
      screenOptions={{
        headerShown: false,
        swipeEnabled: true,
        drawerType: 'slide',
        drawerStyle: { backgroundColor: colors.surface, width: 288 },
      }}
      drawerContent={(props) => <DrawerContent {...props} />}
    >
      <Drawer.Screen name={ROUTES.admin.tabs} component={MainTabs} />
      {SCREEN_SHELLS.map(({ route, component }) => (
        <Drawer.Screen key={route} name={route} component={withLayout(component)} />
      ))}
    </Drawer.Navigator>
  );
}

/** Custom drawer content: profile header, role-filtered sections, sign-out. */
function DrawerContent({ state, navigation }: DrawerContentComponentProps) {
  const { user, logout } = useAuth();
  if (!user) return null;

  const activeScreen = currentScreenName(state);
  const groups = groupNav(navForRole(user.role));
  const name = `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || 'Signed in';
  const role = humanize(user.role);
  const avatar = initials(user.firstName, user.lastName);

  const openProfile = () => {
    navigation.navigate(ROUTES.admin.tabs, { screen: ROUTES.admin.profile });
    navigation.closeDrawer();
  };

  const confirmSignOut = () => {
    Alert.alert('Sign out', 'Are you sure you want to sign out of SmartSchool?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: () => void logout() },
    ]);
  };

  return (
    <View style={styles.drawer}>
      <Pressable
        style={styles.profileHeader}
        onPress={openProfile}
        accessibilityRole="button"
        accessibilityLabel={`${name}, ${role}. Open profile`}
      >
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{avatar}</Text>
        </View>
        <View style={styles.profileText}>
          <Text style={styles.profileName} numberOfLines={1}>
            {name}
          </Text>
          <Text style={styles.profileRole} numberOfLines={1}>
            {role}
          </Text>
        </View>
      </Pressable>

      <ScrollView
        style={styles.drawerScroll}
        contentContainerStyle={styles.drawerScrollInner}
        showsVerticalScrollIndicator={false}
      >
        {groups.map((group, index) => (
          <View key={group.title ?? `group-${index}`} style={styles.drawerGroup}>
            {group.title ? <Text style={styles.drawerGroupTitle}>{group.title}</Text> : null}
            {group.items.map((item) => {
              const active = isItemActive(item.route, item.params, activeScreen);
              return (
                <Pressable
                  key={item.key}
                  onPress={() => {
                    navigation.navigate(item.route, item.params);
                    navigation.closeDrawer();
                  }}
                  style={[styles.drawerItem, active ? styles.drawerItemActive : null]}
                  accessibilityRole="button"
                  accessibilityLabel={item.label}
                  accessibilityState={{ selected: active }}
                >
                  <Icon
                    name={NAV_ICONS[item.key] ?? 'dashboard'}
                    size={18}
                    color={active ? colors.primary : colors.textMuted}
                  />
                  <Text
                    style={[styles.drawerItemLabel, active ? styles.drawerItemLabelActive : null]}
                    numberOfLines={1}
                  >
                    {item.label}
                  </Text>
                  {active ? <View style={styles.activeDot} /> : null}
                </Pressable>
              );
            })}
          </View>
        ))}
      </ScrollView>

      <View style={styles.footer}>
        <Pressable
          style={styles.drawerSignOut}
          accessibilityRole="button"
          accessibilityLabel="Sign out"
          onPress={confirmSignOut}
        >
          <Icon name="logout" size={18} color={colors.danger} />
          <Text style={styles.drawerSignOutText}>Sign out</Text>
        </Pressable>
      </View>
    </View>
  );
}

/**
 * The screen name currently visible, descending into the tab host so drawer
 * entries that target a tab (e.g. Dashboard) still highlight correctly.
 */
function currentScreenName(state: DrawerContentComponentProps['state']): string {
  const route = state.routes[state.index];
  const nested = route?.state;
  if (nested && typeof nested.index === 'number') {
    return nested.routes[nested.index]?.name ?? route.name;
  }
  return route?.name ?? '';
}

function isItemActive(
  route: string,
  params: Record<string, unknown> | undefined,
  activeScreen: string,
): boolean {
  if (route === activeScreen) return true;
  const target = params?.screen;
  return typeof target === 'string' && target === activeScreen;
}

const styles = {
  drawer: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 16,
    backgroundColor: colors.primarySoft,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: colors.white,
    fontSize: 17,
    fontWeight: '800',
  },
  profileText: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  profileName: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  profileRole: {
    fontSize: 12.5,
    color: colors.primary,
    fontWeight: '600',
  },
  drawerScroll: {
    flex: 1,
  },
  drawerScrollInner: {
    paddingVertical: 8,
    paddingBottom: 16,
  },
  drawerGroup: {
    paddingBottom: 6,
  },
  drawerGroupTitle: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 4,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    color: colors.textFaint,
  },
  drawerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 46,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  drawerItemActive: {
    backgroundColor: colors.primaryLight,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
  },
  drawerItemLabel: {
    flexShrink: 1,
    fontSize: 14.5,
    color: colors.text,
  },
  drawerItemLabelActive: {
    fontWeight: '700',
    color: colors.primaryDark,
  },
  activeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.primary,
    marginLeft: 'auto',
  },
  footer: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    padding: 12,
  },
  drawerSignOut: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    minHeight: 48,
    padding: 12,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.dangerSoft,
    backgroundColor: colors.dangerSoft,
  },
  drawerSignOutText: {
    color: colors.danger,
    fontWeight: '700',
    fontSize: 15,
  },
} as const;
