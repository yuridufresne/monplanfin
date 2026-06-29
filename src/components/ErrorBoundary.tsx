import React from 'react';
import * as Sentry from '@sentry/react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Remonte l'erreur de rendu a Sentry si configure ; sinon trace console
    // (une erreur non rattrapee est rare et serieuse -> jamais l'avaler).
    if (Sentry.getClient?.()) {
      Sentry.captureException(error, { extra: { componentStack: errorInfo?.componentStack } });
    } else {
      console.error('[ErrorBoundary]', error, errorInfo);
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', minHeight: '100vh', background: '#050810',
          color: '#fff', padding: 40, textAlign: 'center',
        }}>
          <h1 style={{ color: '#C9A063', fontSize: 24, marginBottom: 16 }}>Une erreur est survenue</h1>
          <p style={{ color: '#ccc', marginBottom: 24 }}>Veuillez rafraîchir la page.</p>
          <button onClick={() => window.location.reload()} style={{
            background: '#C9A063', color: '#050810', border: 'none',
            padding: '12px 24px', borderRadius: 8, cursor: 'pointer', fontWeight: 'bold',
          }}>Rafraîchir</button>
        </div>
      );
    }
    return this.props.children;
  }
}
