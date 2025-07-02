import React, { useMemo, useState, useEffect } from 'react';
import Keycloak, { type KeycloakInstance, type KeycloakInitOptions } from 'keycloak-js';
import { ReactKeycloakProvider, useKeycloak } from '@react-keycloak/web';
import styles from './DevXConsole.module.css';

// Keycloak configuration constants
const keycloakConfig = {
  url: 'https://keycloak.eu-nordics-sto-test.dstny.d4sp.com/auth',
  realm: '40aa6bdb-11e5-49b7-8af8-6afe2111e514',
  clientId: 'sam',
};

const initOptions: KeycloakInitOptions = {
  onLoad: 'login-required',
  checkLoginIframe: false,
  pkceMethod: 'S256',
  redirectUri: typeof window !== 'undefined' ? window.location.href : undefined,
};

// Inner component that consumes Keycloak context
const ConsoleInner: React.FC = () => {
  const { keycloak, initialized } = useKeycloak();
  const [error, setError] = useState<string | null>(null);

  // Refresh token proactively 60 s before expiry
  useEffect(() => {
    if (!initialized || !keycloak.authenticated) return;

    const refreshInterval = setInterval(() => {
      keycloak
        .updateToken(60) // seconds
        .catch(() => setError('Failed to refresh token'));
    }, 30_000); // tick every 30s

    return () => clearInterval(refreshInterval);
  }, [initialized, keycloak]);

  const snippet = useMemo(() => {
    if (!initialized || !keycloak.authenticated || !keycloak.token) return '';
    return `curl -H "Authorization: Bearer ${keycloak.token}" https://api.example.com/hello`;
  }, [initialized, keycloak]);

  if (!initialized) return <p>Loading authentication...</p>;

  if (error) {
    return (
      <div className={styles.consoleContainer}>
        <p style={{ color: 'var(--ifm-color-danger)' }}>{error}</p>
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
          Token expires at:{' '}
          <strong>
            {new Date((keycloak.tokenParsed.exp as number) * 1000).toLocaleTimeString()}
          </strong>
        </p>
      )}
      <h4>JWT Token</h4>
      <pre className={styles.token}><code>{keycloak.token}</code></pre>
      <button onClick={() => navigator.clipboard.writeText(keycloak.token!)}>Copy token</button>
      <h4>Ready-to-use Code Snippet</h4>
      <pre className={styles.snippet}><code>{snippet}</code></pre>
      <button onClick={() => navigator.clipboard.writeText(snippet)}>Copy snippet</button>
      <button onClick={() => keycloak.logout({ redirectUri: window.location.href })}>Logout</button>
    </div>
  );
};

/**
 * DevXConsole component wraps children with Keycloak provider and renders the console.
 */
const DevXConsole: React.FC = () => {
  const keycloak = useMemo<KeycloakInstance>(() => new Keycloak(keycloakConfig), []);

  return (
    <ReactKeycloakProvider
      authClient={keycloak}
      initOptions={initOptions}
      onEvent={(event, error) => {
        // eslint-disable-next-line no-console
        console.debug('[Keycloak event]', event, error);
      }}
      onTokens={(tokens) => {
        // eslint-disable-next-line no-console
        console.debug('[Keycloak tokens]', tokens);
      }}
    >
      <ConsoleInner />
    </ReactKeycloakProvider>
  );
};

export default DevXConsole;