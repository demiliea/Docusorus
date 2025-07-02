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
 * JwtExamples component demonstrates practical ways of using the current
 * Keycloak access-token when calling backend APIs.
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
    await ensureFreshToken();
    const res = await fetch('https://httpbin.org/get', {
      headers: {
        Authorization: `Bearer ${keycloak.token}`,
      },
    });
    const data = await res.json();
    setResult({ source: 'fetch', ok: res.ok, status: res.status, data });
  }, [ensureFreshToken, keycloak.token]);

  const callWithAxios = useCallback(async () => {
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
  }, [ensureFreshToken, keycloak.token]);

  if (!initialized) return <p>Initialising authentication …</p>;

  if (!keycloak.authenticated) {
    return (
      <div className={styles.container}>
        <p>You need to log in to try the examples.</p>
        <button onClick={() => keycloak.login()}>Login</button>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <h3>Using the JWT access token in API calls</h3>

      <p>
        Current token for <strong>{keycloak.tokenParsed?.preferred_username}</strong>:
      </p>
      <pre className={styles.token}><code>{keycloak.token}</code></pre>

      <h4>Example 1 – fetch</h4>
      <pre className={styles.code}>{`await fetch('https://api.example.com/hello', {
  headers: {
    Authorization: 'Bearer ${keycloak.token}',
  },
});`}</pre>
      <button onClick={callWithFetch}>Run fetch example</button>

      <h4 style={{ marginTop: '2rem' }}>Example 2 – axios</h4>
      <pre className={styles.code}>{`import axios from 'axios';

await axios.get('https://api.example.com/hello', {
  headers: {
    Authorization: 'Bearer ${keycloak.token}',
  },
});`}</pre>
      <button onClick={callWithAxios}>Run axios example</button>

      {result && (
        <div className={styles.result} style={{ marginTop: '2rem' }}>
          <h4>
            {result.source} response – status {result.status} ({result.ok ? 'ok' : 'error'})
          </h4>
          <pre>{JSON.stringify(result.data, null, 2)}</pre>
        </div>
      )}
    </div>
  );
};

export default JwtExamples;