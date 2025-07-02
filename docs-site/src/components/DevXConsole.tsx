import React, { useMemo, useState, useEffect } from 'react';
import { useKeycloak } from '@react-keycloak/web';
import styles from './DevXConsole.module.css';

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
    if (!initialized) return '';
    if (!keycloak.authenticated) {
      return `curl -H "Authorization: Bearer [YOUR_JWT_TOKEN_HERE]" https://api.example.com/hello`;
    }
    return `curl -H "Authorization: Bearer ${keycloak.token}" https://api.example.com/hello`;
  }, [initialized, keycloak]);

  if (!initialized) return <p>Loading authentication...</p>;

  const isAuthenticated = keycloak.authenticated;
  const username = isAuthenticated ? keycloak.tokenParsed?.preferred_username : 'your-username';
  const currentToken = isAuthenticated ? keycloak.token : 'eyJhbGciOiJSUzI1NiIsInR5cCIgOiAiSldUIiwia2lkIiA6ICJxWG...[PLACEHOLDER_JWT_TOKEN]';

  if (error) {
    return (
      <div className={styles.consoleContainer}>
        <p style={{ color: 'var(--ifm-color-danger)' }}>{error}</p>
        <button onClick={() => keycloak.login()}>Retry login</button>
      </div>
    );
  }

  return (
    <div className={styles.consoleContainer}>
      <h3>Developer Console</h3>
      
      {!isAuthenticated && (
        <div className="admonition admonition-info" style={{ marginBottom: '1rem' }}>
          <div className="admonition-heading">
            <h5>Demo Mode</h5>
          </div>
          <div className="admonition-content">
            <p>
              You're viewing placeholder content. <button 
                className="button button--primary button--sm"
                onClick={() => keycloak.login()}
                style={{ marginLeft: '8px' }}>
                Sign in
              </button> to see your actual JWT token and personalized developer tools.
            </p>
          </div>
        </div>
      )}

      {isAuthenticated && (
        <div className="admonition admonition-success" style={{ marginBottom: '1rem' }}>
          <div className="admonition-heading">
            <h5>Authenticated</h5>
          </div>
          <div className="admonition-content">
            <p>
              Signed in as <strong>{username}</strong>. Tools below use your real JWT token.
            </p>
          </div>
        </div>
      )}

      <p className={styles.userInfo}>
        User: <strong>{username}</strong>
        {!isAuthenticated && <span style={{ color: '#666', marginLeft: '8px' }}>(Demo)</span>}
      </p>
      
      {isAuthenticated && keycloak.tokenParsed?.exp && (
        <p>
          Token expires at:{' '}
          <strong>
            {new Date((keycloak.tokenParsed.exp as number) * 1000).toLocaleString()}
          </strong>
        </p>
      )}

      {!isAuthenticated && (
        <p style={{ color: '#666' }}>
          Token expires at: <strong>[Sign in to see expiration]</strong>
        </p>
      )}

      <h4>JWT Token</h4>
      <pre className={styles.token}><code>{currentToken}</code></pre>
      <button 
        onClick={() => navigator.clipboard.writeText(isAuthenticated ? keycloak.token! : '[PLACEHOLDER_TOKEN]')}
        title={isAuthenticated ? 'Copy your JWT token' : 'Copy placeholder token'}>
        {isAuthenticated ? 'Copy token' : 'Copy placeholder'}
      </button>
      
      <h4>Ready-to-use Code Snippet</h4>
      <pre className={styles.snippet}><code>{snippet}</code></pre>
      <button 
        onClick={() => navigator.clipboard.writeText(snippet)}
        title={isAuthenticated ? 'Copy curl command with your token' : 'Copy curl command template'}>
        {isAuthenticated ? 'Copy snippet' : 'Copy template'}
      </button>

      <div style={{ marginTop: '2rem' }}>
        {isAuthenticated ? (
          <button 
            className="button button--danger"
            onClick={() => keycloak.logout({ redirectUri: window.location.href })}>
            Sign Out
          </button>
        ) : (
          <button 
            className="button button--primary"
            onClick={() => keycloak.login()}>
            Sign In for Real Tokens
          </button>
        )}
      </div>

      {isAuthenticated && (
        <div style={{ marginTop: '2rem', padding: '1rem', backgroundColor: '#f5f5f5', borderRadius: '4px' }}>
          <h4>Additional Developer Tools</h4>
          <p>
            <strong>Token Type:</strong> {keycloak.tokenParsed?.typ || 'JWT'}
          </p>
          <p>
            <strong>Issuer:</strong> {keycloak.tokenParsed?.iss || 'Unknown'}
          </p>
          <p>
            <strong>Subject:</strong> {keycloak.tokenParsed?.sub || 'Unknown'}
          </p>
          <details>
            <summary>Full Token Payload</summary>
            <pre style={{ fontSize: '0.8rem', maxHeight: '200px', overflow: 'auto' }}>
              {JSON.stringify(keycloak.tokenParsed, null, 2)}
            </pre>
          </details>
        </div>
      )}
    </div>
  );
};

/**
 * DevXConsole component provides developer tools for JWT token management.
 * Shows placeholder content when not authenticated and real tools when authenticated.
 */
const DevXConsole: React.FC = () => {
  // The site-wide ReactKeycloakProvider (defined in src/theme/Root.tsx) already
  // supplies the Keycloak context, so we can directly render the inner
  // console component here.
  return <ConsoleInner />;
};

export default DevXConsole;