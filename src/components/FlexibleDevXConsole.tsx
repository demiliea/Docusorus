import React, { useEffect, useMemo, useState } from 'react';
import { ReactKeycloakProvider, useKeycloak } from '@react-keycloak/web';
import TokenDecoder from './TokenDecoder';
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
  onLoad: 'check-sso' as const, // Changed from 'login-required' to 'check-sso'
  checkLoginIframe: false,
  pkceMethod: 'S256' as const,
  redirectUri: typeof window !== 'undefined' ? window.location.href : undefined,
};

// -----------------------------------------------------------------------------
// Mock/Placeholder token utilities
// -----------------------------------------------------------------------------

const generatePlaceholderToken = (): string => {
  const header = {
    "alg": "RS256",
    "typ": "JWT",
    "kid": "placeholder-key"
  };
  
  const payload = {
    "iss": "https://placeholder-issuer.com",
    "sub": "placeholder-user-123",
    "aud": "placeholder-audience",
    "exp": Math.floor(Date.now() / 1000) + 3600, // 1 hour from now
    "iat": Math.floor(Date.now() / 1000),
    "preferred_username": "guest-user",
    "email": "guest@example.com",
    "name": "Guest User",
    "placeholder": true
  };
  
  const signature = "placeholder-signature";
  
  // Base64 encode each part (simplified for demo)
  const encodedHeader = btoa(JSON.stringify(header));
  const encodedPayload = btoa(JSON.stringify(payload));
  
  return `${encodedHeader}.${encodedPayload}.${signature}`;
};

const parsePlaceholderToken = (token: string) => {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    
    const payload = JSON.parse(atob(parts[1]));
    return payload;
  } catch {
    return null;
  }
};

// -----------------------------------------------------------------------------
// Console component types
// -----------------------------------------------------------------------------

interface ConsoleProps {
  mode: 'authenticated' | 'placeholder' | 'guest';
  onBackToLanding: () => void;
}

// -----------------------------------------------------------------------------
// Inner console component (for authenticated mode)
// -----------------------------------------------------------------------------

const AuthenticatedConsole: React.FC<{ onBackToLanding: () => void }> = ({ onBackToLanding }) => {
  const { keycloak, initialized } = useKeycloak();
  const [error, setError] = useState<string | null>(null);

  // Proactively refresh the token every 30 s, 60 s before expiry
  useEffect(() => {
    if (!initialized || !keycloak.authenticated) return;

    const interval = setInterval(() => {
      keycloak
        .updateToken(60)
        .catch(() => setError('Failed to refresh token – please log in again'));
    }, 30_000);

    return () => clearInterval(interval);
  }, [initialized, keycloak]);

  const snippet = useMemo(() => {
    if (!initialized || !keycloak.authenticated || !keycloak.token) return '';
    return `curl -H "Authorization: Bearer ${keycloak.token}" https://api.example.com/hello`;
  }, [initialized, keycloak]);

  if (!initialized) return <p>Loading authentication …</p>;

  if (error) {
    return (
      <div className={styles.consoleContainer}>
        <p style={{ color: 'var(--ifm-color-danger)', marginBottom: '1rem' }}>{error}</p>
        <button onClick={() => keycloak.login()}>Retry login</button>
        <button onClick={onBackToLanding} style={{ marginLeft: '1rem' }}>Back to Landing</button>
      </div>
    );
  }

  if (!keycloak.authenticated) {
    return (
      <div className={styles.consoleContainer}>
        <p>Authentication check completed, but you are not authenticated.</p>
        <button onClick={() => keycloak.login()}>Login with Keycloak</button>
        <button onClick={onBackToLanding} style={{ marginLeft: '1rem' }}>Back to Landing</button>
      </div>
    );
  }

  return (
    <div className={styles.consoleContainer}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h3>Your DevX Console</h3>
        <button onClick={onBackToLanding}>← Back to Landing</button>
      </div>

      <div style={{ background: '#e6f7ff', padding: '1rem', borderRadius: '8px', marginBottom: '2rem' }}>
        <strong>🔐 Authenticated Mode</strong>
        <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.9rem' }}>
          You're using real authentication tokens from Keycloak
        </p>
      </div>

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

      <h4>Ready-to-use Code Snippet</h4>
      <pre className={styles.snippet}>
        <code>{snippet}</code>
      </pre>
      <button onClick={() => navigator.clipboard.writeText(snippet)}>Copy snippet</button>

      {keycloak.token && <TokenDecoder token={keycloak.token} />}

      <button onClick={() => keycloak.logout({ redirectUri: window.location.href })}>Logout</button>
    </div>
  );
};

// -----------------------------------------------------------------------------
// Placeholder/Guest console component
// -----------------------------------------------------------------------------

const PlaceholderConsole: React.FC<{ onBackToLanding: () => void }> = ({ onBackToLanding }) => {
  const [placeholderToken] = useState(() => generatePlaceholderToken());
  const tokenData = useMemo(() => parsePlaceholderToken(placeholderToken), [placeholderToken]);
  
  const snippet = useMemo(() => {
    return `curl -H "Authorization: Bearer ${placeholderToken}" https://api.example.com/hello`;
  }, [placeholderToken]);

  return (
    <div className={styles.consoleContainer}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h3>DevX Console - Guest Mode</h3>
        <button onClick={onBackToLanding}>← Back to Landing</button>
      </div>

      <div style={{ background: '#fff7e6', padding: '1rem', borderRadius: '8px', marginBottom: '2rem' }}>
        <strong>🧪 Guest Mode</strong>
        <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.9rem' }}>
          You're using placeholder tokens for testing. These tokens are not valid for real API calls.
        </p>
      </div>

      <p className={styles.userInfo}>
        Guest user: <strong>{tokenData?.preferred_username || 'guest-user'}</strong>
      </p>

      {tokenData?.exp && (
        <p>
          Placeholder token expires at{' '}
          <strong>{new Date((tokenData.exp as number) * 1000).toLocaleTimeString()}</strong>
        </p>
      )}

      <h4>Placeholder JWT Token</h4>
      <pre className={styles.token}>
        <code>{placeholderToken}</code>
      </pre>
      <button onClick={() => navigator.clipboard.writeText(placeholderToken)}>Copy placeholder token</button>

      <h4>Ready-to-use Code Snippet (For Testing)</h4>
      <pre className={styles.snippet}>
        <code>{snippet}</code>
      </pre>
      <button onClick={() => navigator.clipboard.writeText(snippet)}>Copy snippet</button>

      <TokenDecoder token={placeholderToken} />

      <div style={{ background: '#f6ffed', padding: '1rem', borderRadius: '8px', marginTop: '2rem' }}>
        <h4 style={{ margin: '0 0 0.5rem 0', color: '#52c41a' }}>💡 Want real tokens?</h4>
        <p style={{ margin: '0', fontSize: '0.9rem' }}>
          Sign in to get actual JWT tokens that work with your APIs
        </p>
      </div>
    </div>
  );
};

// -----------------------------------------------------------------------------
// Main flexible console component
// -----------------------------------------------------------------------------

const FlexibleDevXConsole: React.FC<ConsoleProps> = ({ mode, onBackToLanding }) => {
  const [keycloakInstance, setKeycloakInstance] = useState<any | null>(null);

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

    if (mode === 'authenticated') {
      initKeycloak();
    }
  }, [mode]);

  // Optional debug logging
  const onEvent = (event: unknown, error: unknown) => {
    console.debug('[Keycloak event]', event, error);
  };

  const onTokens = (tokens: unknown) => {
    console.debug('[Keycloak tokens]', tokens);
  };

  if (mode === 'placeholder' || mode === 'guest') {
    return <PlaceholderConsole onBackToLanding={onBackToLanding} />;
  }

  if (!keycloakInstance) {
    return <div>Loading authentication...</div>;
  }

  return (
    <ReactKeycloakProvider 
      authClient={keycloakInstance} 
      initOptions={initOptions} 
      onEvent={onEvent} 
      onTokens={onTokens}
    >
      <AuthenticatedConsole onBackToLanding={onBackToLanding} />
    </ReactKeycloakProvider>
  );
};

export default FlexibleDevXConsole;