import { useNavigation } from '@react-navigation/native';
import { Bell } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';
import { Permission } from '@smartschool/shared';

import { useAuth } from '../lib/auth';
import { can } from '../lib/permissions';
import { connectionLabel } from '../lib/realtime';
import { ROUTES } from '../navigation/routes';
import { useRealtime } from './RealtimeProvider';

/**
 * Shows the unread counter for the notifications the signed-in role may read.
 * Hidden entirely for roles without notification access.
 *
 * It navigates to the tab host (`tabs` → Notifications) so the link works from
 * both drawer screens and the tabs themselves.
 */
export function NotificationBell() {
  const { user } = useAuth();
  const { unread, status } = useRealtime();
  const navigation = useNavigation<{ navigate: (route: string, params?: object) => void }>();

  if (!user || !can(user.role, Permission.NOTIFICATION_READ)) return null;

  const label = connectionLabel(status);
  const badge = unread > 99 ? '99+' : String(unread);

  return (
    <Pressable
      onPress={() =>
        navigation.navigate(ROUTES.admin.tabs, { screen: ROUTES.admin.notifications })
      }
      style={styles.bell}
      accessibilityLabel={`Notifications, ${unread} unread. ${label}`}
    >
      <Bell size={20} color="#1e293b" />
      {unread > 0 ? (
        <View style={styles.badgeWrap}>
          <Text style={styles.badgeText}>{badge}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = {
  bell: {
    padding: 8,
    borderRadius: 10,
    position: 'relative' as const,
  },
  badgeWrap: {
    position: 'absolute' as const,
    top: -4,
    right: -4,
    backgroundColor: '#dc2626',
    borderRadius: 10,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  badgeText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
  },
} as const;
