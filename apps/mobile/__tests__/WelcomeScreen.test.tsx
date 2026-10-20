/**
 * Runtime verification of the WelcomeScreen (login-landing) buttons.
 *
 * These tests render the real component tree (Reanimated/SafeArea mocked at
 * the native boundary only) and fire actual press events on the buttons by
 * their testIDs, asserting the handlers execute and target the correct,
 * pre-existing routes. They cannot prove native touch delivery on a device —
 * see the [SS-DEBUG] logs for on-device confirmation — but they do execute
 * the JS handlers, the tap guards, and the alert flow end to end.
 */
import { Alert } from 'react-native';
import { act, fireEvent, render } from '@testing-library/react-native';

import { WelcomeScreen } from '../src/screens/public/WelcomeScreen';

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
  // StatusBarTone only needs the hook to exist; no focus simulation needed.
  useFocusEffect: jest.fn(),
}));

describe('WelcomeScreen buttons', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    jest.spyOn(console, 'log').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  it('mounts and prints the [SS-DEBUG] marker', () => {
    render(<WelcomeScreen />);
    expect(console.log).toHaveBeenCalledWith(
      '[SS-DEBUG] WelcomeScreen mounted',
      expect.objectContaining({ reduceMotion: false }),
    );
  });

  it('Login press runs the handler and navigates to the admin sign-in route', () => {
    const { getByTestId } = render(<WelcomeScreen />);
    const login = getByTestId('welcome-login');

    fireEvent.press(login);
    expect(mockNavigate).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledWith('login-admin');

    // Taps during the transition are ignored (double-push guard)...
    fireEvent.press(login);
    fireEvent.press(login);
    expect(mockNavigate).toHaveBeenCalledTimes(1);

    // ...and the guard releases once the transition window has passed.
    act(() => {
      jest.advanceTimersByTime(800);
    });
    fireEvent.press(login);
    expect(mockNavigate).toHaveBeenCalledTimes(2);
  });

  it('Login press emits the [SS-DEBUG] log (the marker to watch for in Metro)', () => {
    const { getByTestId } = render(<WelcomeScreen />);
    fireEvent.press(getByTestId('welcome-login'));
    expect(console.log).toHaveBeenCalledWith(
      '[SS-DEBUG] WelcomeScreen: Login pressed',
      expect.objectContaining({ target: 'login-admin', guardActive: false }),
    );
  });

  it('Register press opens the administrator alert; guard releases on OK', () => {
    const alertSpy = jest.spyOn(Alert, 'alert');
    const { getByTestId } = render(<WelcomeScreen />);
    const register = getByTestId('welcome-register');

    fireEvent.press(register);
    expect(alertSpy).toHaveBeenCalledTimes(1);
    expect(alertSpy.mock.calls[0][0]).toBe('Contact your school administrator');

    // Repeat taps while the dialog is open are guarded.
    fireEvent.press(register);
    expect(alertSpy).toHaveBeenCalledTimes(1);

    // Simulate the user confirming the dialog, then verify it works again.
    act(() => {
      alertSpy.mock.calls[0][2]?.[0].onPress?.();
    });
    fireEvent.press(register);
    expect(alertSpy).toHaveBeenCalledTimes(2);
  });

  it('Explore press runs the handler and navigates to the public stack', () => {
    const { getByTestId } = render(<WelcomeScreen />);
    fireEvent.press(getByTestId('welcome-explore'));
    expect(mockNavigate).toHaveBeenCalledWith('public');
  });
});
