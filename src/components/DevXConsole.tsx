import React, { useEffect, useMemo, useState } from 'react';
import { ReactKeycloakProvider, useKeycloak } from '@react-keycloak/web';
import styles from './DevXConsole.module.css';

// -----------------------------------------------------------------------------
// Keycloak configuration
// -----------------------------------------------------------------------------

const keycloakConfig = {
  url: 'https://keycloak.eu-nordics-sto-test.dstny.d4sp.com/auth',
  realm: '40aa6bdb-11e5-49b7-8af8-6afe2111e514',
  clientId: 'sam',
};

const initOptions = {
  onLoad: 'login-required' as const,
  checkLoginIframe: false,
  pkceMethod: 'S256' as const,
  redirectUri: typeof window !== 'undefined' ? window.location.href : undefined,
};

// -----------------------------------------------------------------------------
// Inner console component (consumes Keycloak context)
// -----------------------------------------------------------------------------

const ConsoleInner: React.FC = () => {
  const { keycloak, initialized } = useKeycloak();
  const [error, setError] = useState<string | null>(null);

  // Manual token refresh function
  const handleRefreshToken = async () => {
    try {
      await keycloak.updateToken(0); // Force refresh
      setError(null);
    } catch (error) {
      setError('Token refresh failed. Please log in again.');
    }
  };

  const snippet = useMemo(() => {
    if (!initialized || !keycloak.authenticated || !keycloak.token) return '';
    return `curl -H "Authorization: Bearer ${keycloak.token}" https://api.example.com/hello`;
  }, [initialized, keycloak]);

  // ---------------------------------------------------------------------------
  // Render logic
  // ---------------------------------------------------------------------------

  if (!initialized) return <p>Loading authentication …</p>;

  if (error) {
    return (
      <div className={styles.consoleContainer}>
        <p style={{ color: 'var(--ifm-color-danger)', marginBottom: '1rem' }}>{error}</p>
        <button onClick={() => keycloak.login()}>Retry login</button>
      </div>
    );
  }

  if (!keycloak.authenticated) {
    return (
      <div className={styles.consoleContainer}>
        <p>You are not authenticated.</p>
        <button onClick={() => keycloak.login()}>Login with Keycloak</button>
      </div>
    );
  }

  return (
    <div className={styles.consoleContainer}>
      <h3>Your DevX Console</h3>

      <p className={styles.userInfo}>
        Logged in as <strong>{keycloak.tokenParsed?.preferred_username}</strong>
      </p>

      {keycloak.tokenParsed?.exp && (
        <p>
          Token expires at{' '}
          <strong>{new Date((keycloak.tokenParsed.exp as number) * 1000).toLocaleTimeString()}</strong>
        </p>
      )}

      <h4>JWT Token</h4>
      <pre className={styles.token}>
        <code>{keycloak.token}</code>
      </pre>
      <button onClick={() => navigator.clipboard.writeText(keycloak.token ?? '')}>Copy token</button>
      <button onClick={handleRefreshToken} style={{ marginLeft: '0.5rem' }}>Refresh Token</button>

      <h4>Ready-to-use Code Snippet</h4>
      <pre className={styles.snippet}>
        <code>{snippet}</code>
      </pre>
      <button onClick={() => navigator.clipboard.writeText(snippet)}>Copy snippet</button>

      <button onClick={() => keycloak.logout({ redirectUri: window.location.href })}>Logout</button>
    </div>
  );
};

// -----------------------------------------------------------------------------
// Provider wrapper component
// -----------------------------------------------------------------------------

const DevXConsole: React.FC = () => {
  const [keycloakInstance, setKeycloakInstance] = useState<any>(null);

  useEffect(() => {
    const initKeycloak = async () => {
      try {
        const { default: Keycloak } = await import('keycloak-js');
        const keycloak = new Keycloak(keycloakConfig);
        setKeycloakInstance(keycloak);
      } catch (error) {
        console.debug('Failed to load Keycloak:', error);
      }
    };

    initKeycloak();
  }, []);

  // Optional debug logging
  const onEvent = (event: unknown, error: unknown) => {
    // eslint-disable-next-line no-console
    console.debug('[Keycloak event]', event, error);
  };

  const onTokens = (tokens: unknown) => {
    // eslint-disable-next-line no-console
    console.debug('[Keycloak tokens]', tokens);
  };

  if (!keycloakInstance) {
    return <div>Loading authentication...</div>;
  }

  return (
    <ReactKeycloakProvider authClient={keycloakInstance} initOptions={initOptions} onEvent={onEvent} onTokens={onTokens}>
      <ConsoleInner />
    </ReactKeycloakProvider>
  );
};

export default DevXConsole;