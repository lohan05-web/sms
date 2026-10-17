import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';

import { Icon } from '../../components/Icon';
import { HeroScene } from '../../components/illustrations';
import { ROUTES } from '../../navigation/routes';
import { colors, radius, shadow } from '../../theme';

export function WelcomeScreen() {
  const navigation = useNavigation<{ navigate: (route: string, params?: object) => void }>();

  const onRegister = () => {
    Alert.alert(
      'Contact your school administrator',
      'SmartSchool accounts are created by your school administrator. Please ask them to set up your account (or reset your password) and share your sign-in details.',
      [{ text: 'OK' }],
    );
  };

  return (
    <LinearGradient colors={colors.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.screen}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.brandRow}>
          <View style={styles.brandMark}>
            <Icon name="shield" size={22} color={colors.white} />
          </View>
          <Text style={styles.brand}>SmartSchool</Text>
        </View>

        <View style={styles.hero}>
          <HeroScene />
        </View>

        <View style={styles.copy}>
          <Text style={styles.title}>The all-in-one school platform</Text>
          <Text style={styles.subtitle}>
            Admissions, academics, finance and communication — in your pocket.
          </Text>
        </View>

        <View style={styles.actions}>
          <Pressable
            style={[styles.primary, shadow]}
            onPress={() => navigation.navigate(ROUTES.public.login)}
            accessibilityLabel="Login"
          >
            <Text style={styles.primaryText}>Login</Text>
          </Pressable>
          <Pressable
            style={styles.secondary}
            onPress={onRegister}
            accessibilityLabel="Register"
          >
            <Text style={styles.secondaryText}>Register</Text>
          </Pressable>
          <Pressable
            style={styles.siteLink}
            onPress={() => navigation.navigate('public')}
            accessibilityLabel="Explore the public site"
          >
            <Text style={styles.siteLinkText}>Explore SmartSchool</Text>
          </Pressable>
        </View>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = {
  screen: {
    flex: 1,
  },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 48,
    paddingBottom: 32,
    gap: 20,
  },
  brandRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 10,
  },
  brandMark: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  brand: {
    fontSize: 22,
    fontWeight: '800' as const,
    color: colors.white,
  },
  hero: {
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    paddingVertical: 8,
  },
  copy: {
    gap: 6,
  },
  title: {
    fontSize: 26,
    fontWeight: '800' as const,
    color: colors.white,
    textAlign: 'center' as const,
  },
  subtitle: {
    fontSize: 15,
    color: '#e2e8f0',
    textAlign: 'center' as const,
  },
  actions: {
    marginTop: 'auto',
    gap: 12,
  },
  primary: {
    backgroundColor: colors.white,
    borderRadius: radius.md,
    paddingVertical: 14,
    alignItems: 'center' as const,
    minHeight: 52,
    justifyContent: 'center' as const,
  },
  primaryText: {
    color: colors.primaryDark,
    fontWeight: '800' as const,
    fontSize: 16,
  },
  secondary: {
    borderRadius: radius.md,
    paddingVertical: 14,
    alignItems: 'center' as const,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.7)',
    minHeight: 52,
    justifyContent: 'center' as const,
  },
  secondaryText: {
    color: colors.white,
    fontWeight: '700' as const,
    fontSize: 16,
  },
  siteLink: {
    alignSelf: 'center' as const,
    paddingVertical: 6,
  },
  siteLinkText: {
    color: '#e2e8f0',
    fontWeight: '600' as const,
    textDecorationLine: 'underline' as const,
  },
} as const;
