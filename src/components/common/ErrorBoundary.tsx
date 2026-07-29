// components/common/ErrorBoundary.tsx
import React from 'react';
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
    // The only place a render crash is recorded now that Sentry has been removed. Left
    // ungated by __DEV__ on purpose: this fires at most once per crash, not in a hot path,
    // and it is the sole signal available when diagnosing one from a device log.
    console.error('ErrorBoundary caught:', error, info.componentStack);
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