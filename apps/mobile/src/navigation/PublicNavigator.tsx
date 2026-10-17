import { createStackNavigator } from '@react-navigation/stack';
import { useNavigation } from '@react-navigation/native';
import type { ComponentType } from 'react';
import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import { ROUTES } from './routes';
import {
  PublicAboutScreen,
  PublicContactScreen,
  PublicFaqScreen,
  PublicFeaturesScreen,
  PublicHomeScreen,
  PublicModulesScreen,
  PublicPlansScreen,
} from '../screens/public';

/**
 * The marketing stack: every page of the public site, browsable without an
 * account. A "Sign in" button is exposed from the public screens so visitors
 * can reach the sign-in flow (mirroring the web app's `/site` navbar).
 */
const Stack = createStackNavigator();

/**
 * Public pages are long-form marketing content; React Navigation does not
 * provide a scroll container, so each page is wrapped in one. This mirrors
 * the `withLayout` helper used by the authenticated drawer.
 */
function withScroll(Component: ComponentType) {
  function Page() {
    return (
      <ScrollView
        contentContainerStyle={styles.page}
        showsVerticalScrollIndicator={false}
      >
        <Component />
      </ScrollView>
    );
  }
  Page.displayName = `Scroll(${Component.displayName ?? Component.name ?? 'Screen'})`;
  return Page;
}

function HeaderSignIn() {
  const navigation = useNavigation<{ navigate: (route: string, params?: object) => void }>();
  return (
    <Pressable
      onPress={() => navigation.navigate(ROUTES.public.login)}
      hitSlop={8}
      style={styles.headerSignIn}
      accessibilityLabel="Sign in"
    >
      <Text style={styles.headerSignInText}>Sign in</Text>
    </Pressable>
  );
}

const SCREENS: Array<{
  name: string;
  component: ComponentType;
  options: any;
}> = [
  {
    name: ROUTES.public.home,
    component: withScroll(PublicHomeScreen),
    options: { headerShown: false },
  },
  {
    name: ROUTES.public.about,
    component: withScroll(PublicAboutScreen),
    options: { title: 'About', headerRight: () => <HeaderSignIn /> },
  },
  {
    name: ROUTES.public.features,
    component: withScroll(PublicFeaturesScreen),
    options: { title: 'Features', headerRight: () => <HeaderSignIn /> },
  },
  {
    name: ROUTES.public.modules,
    component: withScroll(PublicModulesScreen),
    options: { title: 'Modules', headerRight: () => <HeaderSignIn /> },
  },
  {
    name: ROUTES.public.plans,
    component: withScroll(PublicPlansScreen),
    options: { title: 'Plans', headerRight: () => <HeaderSignIn /> },
  },
  {
    name: ROUTES.public.faq,
    component: withScroll(PublicFaqScreen),
    options: { title: 'FAQ', headerRight: () => <HeaderSignIn /> },
  },
  {
    name: ROUTES.public.contact,
    component: withScroll(PublicContactScreen),
    options: { title: 'Contact', headerRight: () => <HeaderSignIn /> },
  },
];

export function PublicNavigator() {
  return (
    <Stack.Navigator initialRouteName={ROUTES.public.home}>
      {SCREENS.map(({ name, component, options }) => (
        <Stack.Screen key={name} name={name} component={component} options={options} />
      ))}
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  page: {
    paddingBottom: 32,
  },
  headerSignIn: {
    marginRight: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#1d4ed8',
  },
  headerSignInText: {
    color: '#ffffff',
    fontWeight: '700',
  },
});
