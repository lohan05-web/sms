import { createStackNavigator } from '@react-navigation/stack';

import { LoginScreen } from '../screens/auth/LoginScreen';
import { WelcomeScreen } from '../screens/public/WelcomeScreen';
import { ROUTES } from './routes';
import { PublicNavigator } from './PublicNavigator';

/**
 * The signed-out experience: a gradient welcome screen, the public marketing
 * stack, and one sign-in screen per portal (admin, teacher, parent).
 *
 * The app opens on the welcome screen (branding + Login / Register), which
 * mirrors the web app's public entry point while keeping the sign-in flow one
 * tap away. The marketing pages (the web app's `/site`) stay reachable from
 * the welcome screen and the site navigation.
 */
const Stack = createStackNavigator();

export function AuthNavigator() {
  return (
    <Stack.Navigator
      initialRouteName={ROUTES.public.welcome}
      screenOptions={{ headerShown: false }}
    >
      <Stack.Screen name={ROUTES.public.welcome} component={WelcomeScreen} />
      <Stack.Screen name="public" component={PublicNavigator} />
      <Stack.Screen
        name={ROUTES.public.login}
        options={{ headerShown: true, title: 'Admin sign in' }}
      >
        {() => <LoginScreen portal="admin" />}
      </Stack.Screen>
      <Stack.Screen
        name={ROUTES.public.loginTeacher}
        options={{ headerShown: true, title: 'Teacher sign in' }}
      >
        {() => <LoginScreen portal="teacher" />}
      </Stack.Screen>
      <Stack.Screen
        name={ROUTES.public.loginParent}
        options={{ headerShown: true, title: 'Parent sign in' }}
      >
        {() => <LoginScreen portal="parent" />}
      </Stack.Screen>
    </Stack.Navigator>
  );
}
