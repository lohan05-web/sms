import type { DrawerNavigationProp } from '@react-navigation/drawer';
import { useNavigation } from '@react-navigation/native';
import { Pressable, Text, View } from 'react-native';
import { useRealtime } from './RealtimeProvider';
import { humanize } from '../lib/format';

/**
 * Toast queue rendered at the bottom of the screen. Tapping a toast marks the
 * underlying notification as read.
 */
export function Toaster() {
  const { toasts, dismiss } = useRealtime();
  const navigation = useNavigation<DrawerNavigationProp<Record<string, object | undefined>>>();

  if (toasts.length === 0) return null;

  const open = (id: string) => {
    dismiss(id);
    navigation.navigate('notifications');
  };

  return (
    <View style={styles.toastStack} pointerEvents="box-none">
      {toasts.map((toast) => (
        <View key={toast.id} style={styles.toast}>
          <Pressable onPress={() => open(toast.id)} style={styles.toastMain}>
            <Text style={styles.toastType}>{humanize(toast.type)}</Text>
            <Text style={styles.toastTitle}>{toast.title}</Text>
            {toast.body ? <Text style={styles.toastBody}>{toast.body}</Text> : null}
          </Pressable>
          <Pressable onPress={() => dismiss(toast.id)} style={styles.toastClose}>
            <Text style={styles.toastCloseText}>Dismiss</Text>
          </Pressable>
        </View>
      ))}
    </View>
  );
}

const styles = {
  toastStack: {
    position: 'absolute' as const,
    left: 0,
    right: 0,
    bottom: 16,
    paddingHorizontal: 12,
    gap: 8,
    zIndex: 10,
  },
  toast: {
    backgroundColor: '#0f172a',
    borderRadius: 12,
    padding: 12,
    gap: 4,
  },
  toastMain: {
    alignItems: 'stretch' as const,
  },
  toastType: {
    color: '#93c5fd',
    fontSize: 12,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
  },
  toastTitle: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
  },
  toastBody: {
    color: '#cbd5e1',
    fontSize: 13,
  },
  toastClose: {
    alignSelf: 'flex-end' as const,
    marginTop: 4,
  },
  toastCloseText: {
    color: '#94a3b8',
    fontSize: 12,
  },
} as const;
