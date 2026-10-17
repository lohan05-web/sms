import { ActivityIndicator, View } from 'react-native';

import { useAuth } from '../lib/auth';
import { AuthNavigator } from './AuthNavigator';
import { MainNavigator } from './MainNavigator';

/**
 * Root navigator decides between the sign-in flow and the authenticated
 * experience. When no user is signed in the app shows the public/auth flow;
 * once authenticated it shows the role-specific drawer.
 */
export function RootNavigator() {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }
  return user ? <MainNavigator /> : <AuthNavigator />;
}
