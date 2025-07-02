import React, { useMemo } from 'react';
import Keycloak from 'keycloak-js';
import { ReactKeycloakProvider } from '@react-keycloak/web';

// -----------------------------------------------------------------------------
// Keycloak configuration — values reused from DevXConsole component
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

/**
 * Root wrapper for the entire Docusaurus site.
 *
 * It provides a site-wide ReactKeycloakProvider so every page/component can
 * access authentication state via `useKeycloak()`.
 *
 * The provider is only mounted in the browser — during SSR we simply render the
 * children to avoid accessing `window`/`document`, which are not available in
 * Node.js.
 */
const Root: React.FC = ({ children }) => {
  const isBrowser = typeof window !== 'undefined';

  // Avoid executing Keycloak code during server-side rendering
  if (!isBrowser) {
    return <>{children}</>;
  }

  const keycloak = useMemo(() => new Keycloak(keycloakConfig), []);

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
      {children}
    </ReactKeycloakProvider>
  );
}

export default Root;