import { DrawerActions, useNavigation } from '@react-navigation/native';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from './Icon';
import { NotificationBell } from './NotificationBell';
import { Toaster } from './Toaster';
import { useAuth } from '../lib/auth';
import { initials } from '../lib/format';
import { colors, shadow } from '../theme';

/**
 * The shell every authenticated screen renders inside: a compact header with
 * the drawer menu, the SmartSchool brand and school name, the notifications bell
 * and the signed-in user's avatar, a scrollable content area, and the toaster.
 * Navigation itself lives in the drawer navigator.
 *
 * The header carries the top safe-area inset and the scroll content the bottom
 * one, because the status bar is drawn edge-to-edge: without it the header would
 * sit under the Android status bar and the last row of content under the
 * navigation bar. Screens hosted by the bottom-tab navigator pass
 * `bottomInset={false}`, because the tab bar already occupies that inset.
 */
export function Layout({
  children,
  heading,
  subheading,
  bottomInset = true,
}: {
  children: React.ReactNode;
  /** Primary header line. Defaults to the SmartSchool brand name. */
  heading?: string;
  /** Optional second header line (e.g. the school name). */
  subheading?: string;
  /**
   * Whether to add the bottom safe-area inset to the content. Set to `false`
   * inside the bottom-tab host, where the tab bar itself covers the inset.
   */
  bottomInset?: boolean;
}) {
  const navigation = useNavigation();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const bottom = bottomInset ? insets.bottom : 0;

  const name = `${user?.firstName ?? ''} ${user?.lastName ?? ''}`.trim();
  const avatar = initials(user?.firstName, user?.lastName);

  return (
    <View style={styles.shell}>
      <View style={[styles.header, shadow, { paddingTop: insets.top + 6 }]}>
        <Pressable
          style={styles.menuButton}
          onPress={() => navigation.dispatch(DrawerActions.toggleDrawer())}
          accessibilityLabel="Open menu"
          hitSlop={8}
        >
          <Icon name="menu" size={20} />
        </Pressable>
        <View style={styles.brand}>
          <View style={styles.logoMark}>
            <Icon name="shield" size={18} color={colors.white} />
          </View>
          <View style={styles.headerText}>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {heading ?? 'SmartSchool'}
            </Text>
            {subheading ? (
              <Text style={styles.headerSubtitle} numberOfLines={1}>
                {subheading}
              </Text>
            ) : null}
          </View>
        </View>
        <NotificationBell />
        <Pressable
          style={styles.avatarButton}
          onPress={() => navigation.dispatch(DrawerActions.toggleDrawer())}
          accessibilityLabel={name ? `Open menu, signed in as ${name}` : 'Open menu'}
          hitSlop={8}
        >
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{avatar || 'SS'}</Text>
          </View>
        </Pressable>
      </View>
      <View style={styles.content}>
        <ScrollView
          contentContainerStyle={[styles.contentInner, { paddingBottom: bottom + 32 }]}
          showsVerticalScrollIndicator={false}
        >
          {children}
        </ScrollView>
        <Toaster bottomInset={bottomInset} />
      </View>
    </View>
  );
}

const styles = {
  shell: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 8,
    paddingHorizontal: 12,
    // The top padding is extended with the status-bar inset in the component.
    paddingTop: 6,
    paddingBottom: 6,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  menuButton: {
    width: 44,
    height: 44,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    borderRadius: 22,
  },
  brand: {
    flex: 1,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 10,
    minWidth: 0,
  },
  logoMark: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: colors.primary,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  headerText: {
    flex: 1,
    minWidth: 0,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700' as const,
    color: colors.text,
  },
  headerSubtitle: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 1,
  },
  avatarButton: {
    paddingHorizontal: 2,
  },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.primaryLight,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    borderWidth: 1,
    borderColor: colors.border,
  },
  avatarText: {
    fontSize: 12,
    fontWeight: '800' as const,
    color: colors.primaryDark,
  },
  content: {
    flex: 1,
  },
  contentInner: {
    padding: 16,
    // Extended with the bottom safe-area inset in the component.
    paddingBottom: 32,
    gap: 12,
  },
} as const;
