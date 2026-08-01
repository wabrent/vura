'use client';

import { Component } from 'react';

export default class ErrorBoundary extends Component<{ children: React.ReactNode }, { hasError: boolean }> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    console.error('Tab render error:', error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-3)' }}>
          <div style={{ fontSize: '0.8rem', marginBottom: '0.5rem' }}>Something went wrong loading this tab.</div>
          <button
            className="csv-btn"
            onClick={() => this.setState({ hasError: false })}
          >
            Retry
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
