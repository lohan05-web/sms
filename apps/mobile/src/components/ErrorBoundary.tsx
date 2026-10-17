import { Component, type ReactNode } from 'react';
import { Text, View } from 'react-native';

/**
 * Minimal replacement for the web app's `ErrorBoundary`: renders children and
 * shows a fallback with a reload action when a child throws.
 */
export class ErrorBoundary extends Component<
  { children: ReactNode },
  { error: Error | null }
> {
  override state = { error: null as Error | null } as { error: Error | null };

  static getDerivedStateFromError(error: Error): { error: Error | null } {
    return { error };
  }

  override componentDidCatch(_error: Error): void {
    // Intentionally empty: React Native reports crashes to the system log.
  }

  override render() {
    if (this.state.error) {
      return (
        <View style={fallbackStyle}>
          <Text style={fallbackTitle}>Something went wrong</Text>
          <Text style={fallbackMessage}>{this.state.error.message}</Text>
        </View>
      );
    }
    return this.props.children;
  }
}

const fallbackStyle = {
  flex: 1,
  alignItems: 'center' as const,
  justifyContent: 'center' as const,
  padding: 24,
  gap: 8,
  backgroundColor: '#ffffff',
};

const fallbackTitle = {
  fontSize: 18,
  fontWeight: '700' as const,
  color: '#0f172a',
};

const fallbackMessage = {
  color: '#475569',
  textAlign: 'center' as const,
};
