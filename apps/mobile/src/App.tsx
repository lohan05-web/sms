import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ErrorBoundary } from './components/ErrorBoundary';
import { RealtimeProvider } from './components/RealtimeProvider';
import { AuthProvider } from './lib/auth';
import { SettingsProvider } from './lib/settings';
import { RootNavigator } from './navigation/RootNavigator';

/**
 * Applications root: authentication/session providers first, then the school
 * settings and realtime socket, and finally the navigation tree.
 *
 * `GestureHandlerRootView` must wrap the whole tree: the drawer and stack
 * navigators are built on `react-native-gesture-handler`, and on Android its
 * gestures do not work unless an ancestor is a gesture-handler root view.
 *
 * The status bar is drawn edge-to-edge (`translucent`). Every screen therefore
 * compensates with `useSafeAreaInsets()` — the `Layout` header with the top
 * inset, the bottom tab bar and the drawer footer with the bottom inset — so
 * neither the header nor the navigation tabs can slip under the Android system
 * bars. Screens with a dark surface behind the status bar (the gradient welcome
 * screen, the marketing hero) switch to light icons with `StatusBarTone`.
 */
export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar translucent backgroundColor="transparent" barStyle="dark-content" />
      <ErrorBoundary>
        <SafeAreaProvider>
          <AuthProvider>
            <SettingsProvider>
              <RealtimeProvider>
                <NavigationContainer>
                  <RootNavigator />
                </NavigationContainer>
              </RealtimeProvider>
            </SettingsProvider>
          </AuthProvider>
        </SafeAreaProvider>
      </ErrorBoundary>
    </GestureHandlerRootView>
  );
}
