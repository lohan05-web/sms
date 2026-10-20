/**
 * Runtime verification of the existing LoginScreen form: portal switching,
 * real submit → login() call, duplicate-submission blocking, and error
 * surfacing. The auth provider is mocked at the boundary; everything else
 * (form state, validation UI, loading state) is the real component code.
 */
import { fireEvent, render, act } from '@testing-library/react-native';

import { ApiError } from '../src/lib/api';
import { LoginScreen } from '../src/screens/auth/LoginScreen';

const mockLogin = jest.fn();
jest.mock('../src/lib/auth', () => ({
  useAuth: () => ({
    user: null,
    loading: false,
    login: mockLogin,
    logout: jest.fn(),
  }),
}));
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: jest.fn() }),
  useFocusEffect: jest.fn(),
}));

describe('LoginScreen form', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'log').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('shows the admin form by default', () => {
    const { getByTestId } = render(<LoginScreen portal="admin" />);
    expect(getByTestId('login-form-admin')).toBeTruthy();
  });

  it('switches to the teacher form when the portal tab is pressed', () => {
    const { getByTestId, getByLabelText } = render(<LoginScreen portal="admin" />);
    fireEvent.press(getByLabelText('Teacher sign in'));
    expect(getByTestId('login-form-teacher')).toBeTruthy();
  });

  it('submits the typed credentials to login() exactly once and blocks duplicate submits', async () => {
    let resolveLogin!: (value: unknown) => void;
    mockLogin.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveLogin = resolve;
        }),
    );

    const { getByPlaceholderText, getByTestId, getByText } = render(
      <LoginScreen portal="admin" />,
    );
    fireEvent.changeText(getByPlaceholderText('you@school.edu'), 'user@school.edu');
    fireEvent.changeText(getByPlaceholderText('••••••••'), 'correct-horse');

    fireEvent.press(getByTestId('login-submit'));
    // A second tap while the request is in flight must not fire a second call.
    fireEvent.press(getByTestId('login-submit'));

    expect(mockLogin).toHaveBeenCalledTimes(1);
    expect(mockLogin).toHaveBeenCalledWith('user@school.edu', 'correct-horse', 'admin');
    // Loading indicator replaces the label while in flight.
    expect(getByText('Signing in…')).toBeTruthy();

    await act(async () => {
      resolveLogin({});
    });
  });

  it('surfaces the API error message and returns the button to idle', async () => {
    mockLogin.mockRejectedValue(
      new ApiError('Invalid email or password', 401, 'INVALID_CREDENTIALS'),
    );

    const { getByPlaceholderText, getByTestId, getByText, findByText } = render(
      <LoginScreen portal="admin" />,
    );
    fireEvent.changeText(getByPlaceholderText('you@school.edu'), 'user@school.edu');
    fireEvent.changeText(getByPlaceholderText('••••••••'), 'wrong-password');
    fireEvent.press(getByTestId('login-submit'));

    expect(await findByText('Invalid email or password')).toBeTruthy();
    // Idle label restored after the failure.
    expect(getByText('Sign in')).toBeTruthy();
    expect(mockLogin).toHaveBeenCalledTimes(1);
  });
});
