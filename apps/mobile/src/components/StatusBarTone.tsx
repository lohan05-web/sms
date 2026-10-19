import { useFocusEffect } from '@react-navigation/native';
import { useCallback } from 'react';
import { StatusBar, type StatusBarStyle } from 'react-native';

/**
 * Switches the status-bar icon colour while the owning screen is focused and
 * restores the app default (dark icons, matching the white `Layout` header and
 * the light stack headers) when it blurs.
 *
 * The app runs edge-to-edge (see `App`), so screens that paint a dark surface
 * behind the status bar — the gradient welcome screen and the marketing hero —
 * render this with `barStyle="light-content"`.
 *
 * Focus-based instead of a mounted `<StatusBar>` because React Navigation keeps
 * pushed screens mounted: a mounted style keeps winning after a screen with a
 * light header covers the dark one, leaving unreadable icons.
 */
export function StatusBarTone({ barStyle }: { barStyle: StatusBarStyle }) {
  useFocusEffect(
    useCallback(() => {
      StatusBar.setBarStyle(barStyle, true);
      return () => {
        StatusBar.setBarStyle('dark-content', true);
      };
    }, [barStyle]),
  );

  return null;
}
