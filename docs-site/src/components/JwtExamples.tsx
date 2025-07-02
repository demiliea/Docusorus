import React, { useCallback, useState } from 'react';
import { useKeycloak } from '@react-keycloak/web';
import styles from './JwtExamples.module.css';

interface ApiResult {
  source: 'fetch' | 'axios';
  ok: boolean;
  status: number;
  data: unknown;
}

/**
 * JwtExamples component demonstrates practical ways of using JWT tokens
 * when calling backend APIs. Shows placeholders when not authenticated,
 * and real tokens when authenticated.
 */
const JwtExamples: React.FC = () => {
  const { keycloak, initialized } = useKeycloak();
  const [result, setResult] = useState<ApiResult | null>(null);

  const ensureFreshToken = useCallback(async () => {
    if (!initialized) throw new Error('Keycloak not initialised');

    try {
      // Make sure the token is valid for at least 60 s
      await keycloak.updateToken(60);
    } catch {
      // If refreshing fails, force re-login
      await keycloak.login();
      throw new Error('Refreshing token failed – redirecting to login');
    }
  }, [initialized, keycloak]);

  const callWithFetch = useCallback(async () => {
    if (!keycloak.authenticated) {
      // Show demo result for unauthenticated users
      setResult({
        source: 'fetch',
        ok: true,
        status: 200,
        data: {
          message: 'This is a demo response. Sign in to see real API calls with your JWT token.',
          headers: {
            authorization: 'Bearer [YOUR_JWT_TOKEN_HERE]'
          },
          url: 'https://httpbin.org/get'
        }
      });
      return;
    }

    await ensureFreshToken();
    const res = await fetch('https://httpbin.org/get', {
      headers: {
        Authorization: `Bearer ${keycloak.token}`,
      },
    });
    const data = await res.json();
    setResult({ source: 'fetch', ok: res.ok, status: res.status, data });
  }, [ensureFreshToken, keycloak.token, keycloak.authenticated]);

  const callWithAxios = useCallback(async () => {
    if (!keycloak.authenticated) {
      // Show demo result for unauthenticated users
      setResult({
        source: 'axios',
        ok: true,
        status: 200,
        data: {
          message: 'This is a demo response. Sign in to see real API calls with your JWT token.',
          headers: {
            authorization: 'Bearer [YOUR_JWT_TOKEN_HERE]'
          },
          url: 'https://httpbin.org/get'
        }
      });
      return;
    }

    await ensureFreshToken();

    // Dynamically load axios to keep it out of the main bundle unless needed
    const { default: axios } = await import('axios');

    const res = await axios.get('https://httpbin.org/get', {
      headers: {
        Authorization: `Bearer ${keycloak.token}`,
      },
    });

    setResult({
      source: 'axios',
      ok: res.status >= 200 && res.status < 300,
      status: res.status,
      data: res.data,
    });
  }, [ensureFreshToken, keycloak.token, keycloak.authenticated]);

  if (!initialized) return <p>Initialising authentication …</p>;

  const isAuthenticated = keycloak.authenticated;
  const currentToken = isAuthenticated ? keycloak.token : '[YOUR_JWT_TOKEN_HERE]';
  const username = isAuthenticated ? keycloak.tokenParsed?.preferred_username : 'your-username';

  return (
    <div className={styles.container}>
      <h3>Using JWT access tokens in API calls</h3>

      {!isAuthenticated && (
        <div className="admonition admonition-info">
          <div className="admonition-heading">
            <h5>Demo Mode</h5>
          </div>
          <div className="admonition-content">
            <p>
              You're viewing placeholder examples. <button 
                className="button button--primary button--sm"
                onClick={() => keycloak.login()}
                style={{ marginLeft: '8px' }}>
                Sign in
              </button> to see your actual JWT token and make real API calls.
            </p>
          </div>
        </div>
      )}

      {isAuthenticated && (
        <div className="admonition admonition-success">
          <div className="admonition-heading">
            <h5>Authenticated</h5>
          </div>
          <div className="admonition-content">
            <p>
              Signed in as <strong>{username}</strong>. Examples below use your real JWT token.
            </p>
          </div>
        </div>
      )}

      <p>
        Current token for <strong>{username}</strong>:
      </p>
      <pre className={styles.token}>
        <code>{isAuthenticated ? currentToken : 'eyJhbGciOiJSUzI1NiIsInR5cCIgOiAiSldUIiwia2lkIiA6ICJxWG...[PLACEHOLDER_JWT_TOKEN]'}</code>
      </pre>

      <h4>Example 1 – fetch</h4>
      <pre className={styles.code}>{`await fetch('https://api.example.com/hello', {
  headers: {
    Authorization: 'Bearer ${currentToken}',
  },
});`}</pre>
      <button onClick={callWithFetch}>
        {isAuthenticated ? 'Run fetch example' : 'Run demo fetch example'}
      </button>

      <h4 style={{ marginTop: '2rem' }}>Example 2 – axios</h4>
      <pre className={styles.code}>{`import axios from 'axios';

await axios.get('https://api.example.com/hello', {
  headers: {
    Authorization: 'Bearer ${currentToken}',
  },
});`}</pre>
      <button onClick={callWithAxios}>
        {isAuthenticated ? 'Run axios example' : 'Run demo axios example'}
      </button>

      {result && (
        <div className={styles.result} style={{ marginTop: '2rem' }}>
          <h4>
            {result.source} response – status {result.status} ({result.ok ? 'ok' : 'error'})
            {!isAuthenticated && <span style={{ color: '#666', marginLeft: '8px' }}>(Demo)</span>}
          </h4>
          <pre>{JSON.stringify(result.data, null, 2)}</pre>
        </div>
      )}

      {isAuthenticated && (
        <div style={{ marginTop: '2rem', padding: '1rem', backgroundColor: '#f5f5f5', borderRadius: '4px' }}>
          <h4>Token Information</h4>
          <p>
            <strong>Expires:</strong> {keycloak.tokenParsed?.exp 
              ? new Date((keycloak.tokenParsed.exp as number) * 1000).toLocaleString()
              : 'Unknown'
            }
          </p>
          <button 
            className="button button--secondary button--sm"
            onClick={() => navigator.clipboard.writeText(keycloak.token ?? '')}>
            Copy Token
          </button>
          <button 
            className="button button--danger button--sm"
            onClick={() => keycloak.logout({ redirectUri: window.location.href })}
            style={{ marginLeft: '8px' }}>
            Sign Out
          </button>
        </div>
      )}
    </div>
  );
};

export default JwtExamples;