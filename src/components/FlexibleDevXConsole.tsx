import React, { useEffect, useMemo, useState } from 'react';
import { ReactKeycloakProvider, useKeycloak } from '@react-keycloak/web';
import TokenDecoder from './TokenDecoder';
import { TokenData, TokenManager } from '../utils/tokenManager';
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
  onLogout?: () => void;
  tokenData?: TokenData | null;
  tokenManager?: TokenManager;
  authEnabled?: boolean;
}

// -----------------------------------------------------------------------------
// Inner console component (for authenticated mode)
// -----------------------------------------------------------------------------

const AuthenticatedConsole: React.FC<{ 
  onBackToLanding: () => void; 
  onLogout?: () => void;
  tokenData?: TokenData | null;
}> = ({ onBackToLanding, onLogout, tokenData }) => {
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

  // Check if token is expiring soon
  const isTokenExpiringSoon = useMemo(() => {
    if (!keycloak.tokenParsed?.exp) return false;
    const expirationTime = keycloak.tokenParsed.exp * 1000;
    const currentTime = Date.now();
    const timeUntilExpiry = expirationTime - currentTime;
    return timeUntilExpiry < 5 * 60 * 1000; // 5 minutes
  }, [keycloak.tokenParsed]);

  const snippet = useMemo(() => {
    // Use stored token data if available, otherwise fall back to keycloak
    const token = tokenData?.accessToken || keycloak.token;
    if (!token) return '';
    return `curl -H "Authorization: Bearer ${token}" https://api.example.com/hello`;
  }, [initialized, keycloak, tokenData]);

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

  // Use stored token data if available, otherwise fall back to keycloak
  const currentToken = tokenData?.accessToken || keycloak.token;
  const currentUsername = tokenData?.username || keycloak.tokenParsed?.preferred_username;
  const currentTokenParsed = tokenData?.tokenParsed || keycloak.tokenParsed;
  const currentExpiresAt = tokenData?.expiresAt || (keycloak.tokenParsed?.exp ? keycloak.tokenParsed.exp * 1000 : null);

  if (!keycloak.authenticated && !tokenData) {
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
          You're using real authentication tokens {tokenData ? 'from storage' : 'from Keycloak'}
        </p>
      </div>

      <p className={styles.userInfo}>
        Logged in as <strong>{currentUsername}</strong>
      </p>

      {currentExpiresAt && (
        <p>
          Token expires at{' '}
          <strong>{new Date(currentExpiresAt).toLocaleTimeString()}</strong>
        </p>
      )}

      {isTokenExpiringSoon && (
        <div style={{ background: '#fff7e6', padding: '1rem', borderRadius: '8px', marginBottom: '1rem', border: '1px solid #ffc069' }}>
          <strong>⚠️ Token Expiring Soon</strong>
          <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.9rem' }}>
            Your token expires in less than 5 minutes. You may want to refresh it.
          </p>
        </div>
      )}

      <h4>JWT Token</h4>
      <pre className={styles.token}>
        <code>{currentToken}</code>
      </pre>
      <button onClick={() => navigator.clipboard.writeText(currentToken ?? '')}>Copy token</button>
      <button onClick={handleRefreshToken} style={{ marginLeft: '0.5rem' }}>Refresh Token</button>

      <h4>Ready-to-use Code Snippet</h4>
      <pre className={styles.snippet}>
        <code>{snippet}</code>
      </pre>
      <button onClick={() => navigator.clipboard.writeText(snippet)}>Copy snippet</button>

      {currentToken && <TokenDecoder token={currentToken} />}

      <button onClick={() => {
        if (onLogout) {
          onLogout();
        } else {
          keycloak.logout({ redirectUri: window.location.href });
        }
      }}>Logout</button>
    </div>
  );
};

// -----------------------------------------------------------------------------
// Placeholder/Guest console component
// -----------------------------------------------------------------------------

const PlaceholderConsole: React.FC<{ 
  onBackToLanding: () => void; 
  onLogout?: () => void;
}> = ({ onBackToLanding, onLogout }) => {
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

const FlexibleDevXConsole: React.FC<ConsoleProps> = ({ 
  mode, 
  onBackToLanding, 
  onLogout, 
  tokenData, 
  tokenManager, 
  authEnabled = true 
}) => {
  const [keycloakInstance, setKeycloakInstance] = useState<any | null>(null);
  const [isInitializing, setIsInitializing] = useState(false);
  const [initializationError, setInitializationError] = useState<string | null>(null);

  useEffect(() => {
    const initKeycloak = async () => {
      if (mode !== 'authenticated') return;
      
      setIsInitializing(true);
      setInitializationError(null);
      
      try {
        const { default: Keycloak } = await import('keycloak-js');
        const keycloak = new Keycloak(keycloakConfig);
        
        // Add timeout to prevent hanging
        const initTimeout = setTimeout(() => {
          setInitializationError('Keycloak initialization timed out. Please try again.');
          setIsInitializing(false);
        }, 10000); // 10 second timeout
        
        setKeycloakInstance(keycloak);
        clearTimeout(initTimeout);
      } catch (error) {
        console.debug('Failed to load Keycloak:', error);
        setInitializationError('Failed to initialize authentication.');
      } finally {
        setIsInitializing(false);
      }
    };

    initKeycloak();
  }, [mode]);

  // Optional debug logging
  const onEvent = (event: unknown, error: unknown) => {
    console.debug('[Keycloak event]', event, error);
  };

  const onTokens = (tokens: unknown) => {
    console.debug('[Keycloak tokens]', tokens);
  };

  if (mode === 'placeholder' || mode === 'guest') {
    return <PlaceholderConsole onBackToLanding={onBackToLanding} onLogout={onLogout} />;
  }

  if (isInitializing) {
    return (
      <div className={styles.consoleContainer}>
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          <div style={{ 
            border: '4px solid #f3f3f3', 
            borderTop: '4px solid #3498db', 
            borderRadius: '50%', 
            width: '40px', 
            height: '40px', 
            animation: 'spin 2s linear infinite',
            margin: '0 auto 20px'
          }}></div>
          <p>Initializing authentication...</p>
          <p style={{ fontSize: '14px', color: '#666' }}>This will timeout in 10 seconds</p>
        </div>
      </div>
    );
  }

  if (initializationError) {
    return (
      <div className={styles.consoleContainer}>
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          <p style={{ color: 'var(--ifm-color-danger)', marginBottom: '1rem' }}>{initializationError}</p>
          <button onClick={() => window.location.reload()}>Retry</button>
          <button onClick={onBackToLanding} style={{ marginLeft: '1rem' }}>Back to Landing</button>
        </div>
      </div>
    );
  }

  if (!keycloakInstance) {
    return (
      <div className={styles.consoleContainer}>
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          <p>Loading authentication...</p>
        </div>
      </div>
    );
  }

  return (
    <ReactKeycloakProvider 
      authClient={keycloakInstance} 
      initOptions={initOptions} 
      onEvent={onEvent} 
      onTokens={onTokens}
    >
      <AuthenticatedConsole 
        onBackToLanding={onBackToLanding} 
        onLogout={onLogout}
        tokenData={tokenData}
      />
    </ReactKeycloakProvider>
  );
};

export default FlexibleDevXConsole;