// components/common/ErrorBoundary.tsx
import React from 'react';
import * as Sentry from '@sentry/react-native';
import ErrorScreen from './ErrorScreen';

interface Props {
  children: React.ReactNode;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
}

class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.log('ErrorBoundary caught:', error, info);
    // No-ops when EXPO_PUBLIC_SENTRY_DSN isn't set (see App.tsx's Sentry.init) — same
    // graceful-degradation as the backend's equivalent capture in http-exception.filter.ts.
    Sentry.captureException(error, { extra: { componentStack: info.componentStack } });
  }

  handleReset = () => {
    this.setState({ hasError: false });
    this.props.onReset?.();
  };

  render() {
    if (this.state.hasError) {
      return (
        <ErrorScreen
          onBack={this.handleReset}
          onGoHome={this.handleReset}
          title="Oops, something went wrong"
          subtitle="Try again in a moment."
        />
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;