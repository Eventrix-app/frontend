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
    // TODO: send to your crash-reporting service (Sentry, etc.) once you have one
    console.log('ErrorBoundary caught:', error, info);
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