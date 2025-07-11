import React, { useMemo, useState, useEffect } from 'react';
import { useKeycloak } from '@react-keycloak/web';
import styles from './DevXConsole.module.css';

// Inner component that consumes Keycloak context
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
      <button onClick={handleRefreshToken} style={{ marginLeft: '0.5rem' }}>Refresh Token</button>
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
  // The site-wide ReactKeycloakProvider (defined in src/theme/Root.tsx) already
  // supplies the Keycloak context, so we can directly render the inner
  // console component here.
  return <ConsoleInner />;
};

export default DevXConsole;