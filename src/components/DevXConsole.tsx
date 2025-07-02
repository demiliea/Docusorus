import React, { useMemo } from 'react';
import Keycloak from 'keycloak-js';
import { ReactKeycloakProvider, useKeycloak } from '@react-keycloak/web';
import './DevXConsole.css'; // adjust path for root simplicity

// Keycloak configuration constants
const keycloakConfig = {
  url: 'https://keycloak.eu-nordics-sto-test.dstny.d4sp.com/auth',
  realm: '40aa6bdb-11e5-49b7-8af8-6afe2111e514',
  clientId: 'sam',
};

const initOptions: Keycloak.KeycloakInitOptions = {
  onLoad: 'login-required',
  checkLoginIframe: false,
  pkceMethod: 'S256',
  redirectUri: typeof window !== 'undefined' ? window.location.href : undefined,
};

const ConsoleInner: React.FC = () => {
  const { keycloak, initialized } = useKeycloak();

  const snippet = useMemo(() => {
    if (!initialized || !keycloak.authenticated || !keycloak.token) return '';
    return `curl -H "Authorization: Bearer ${keycloak.token}" https://api.example.com/hello`;
  }, [initialized, keycloak]);

  if (!initialized) return <p>Loading authentication...</p>;

  if (!keycloak.authenticated) {
    return (
      <div className="consoleContainer">
        <p>You are not authenticated.</p>
        <button onClick={() => keycloak.login()}>Login with Keycloak</button>
      </div>
    );
  }

  return (
    <div className="consoleContainer">
      <h3>Your DevX Console</h3>
      <p className="userInfo">
        Logged in as <strong>{keycloak.tokenParsed?.preferred_username}</strong>
      </p>
      <h4>JWT Token</h4>
      <pre className="token"><code>{keycloak.token}</code></pre>
      <button onClick={() => navigator.clipboard.writeText(keycloak.token!)}>Copy token</button>
      <h4>Ready-to-use Code Snippet</h4>
      <pre className="snippet"><code>{snippet}</code></pre>
      <button onClick={() => navigator.clipboard.writeText(snippet)}>Copy snippet</button>
      <button onClick={() => keycloak.logout({ redirectUri: window.location.href })}>Logout</button>
    </div>
  );
};

const DevXConsole: React.FC = () => {
  const keycloak = useMemo(() => new Keycloak(keycloakConfig), []);

  return (
    <ReactKeycloakProvider authClient={keycloak} initOptions={initOptions}>
      <ConsoleInner />
    </ReactKeycloakProvider>
  );
};

export default DevXConsole;