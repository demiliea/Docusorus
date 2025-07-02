import React, { useState, useEffect } from 'react';
import LandingPage from './components/LandingPage';
import FlexibleDevXConsole from './components/FlexibleDevXConsole';
import './App.css';

type AppState = 'landing' | 'console';
type AuthMode = 'authenticated' | 'placeholder' | 'guest';

const App: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<AppState>('landing');
  const [authMode, setAuthMode] = useState<AuthMode>('guest');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [username, setUsername] = useState<string | undefined>();

  // Check if user is already authenticated on app load
  useEffect(() => {
    const checkExistingAuth = async () => {
      try {
        const { default: Keycloak } = await import('keycloak-js');
        const keycloak = new Keycloak({
          url: 'https://keycloak.eu-nordics-sto-test.dstny.d4sp.com/auth',
          realm: '40aa6bdb-11e5-49b7-8af8-6afe2111e514',
          clientId: 'sam',
        });

        const authenticated = await keycloak.init({
          onLoad: 'check-sso',
          checkLoginIframe: false,
          pkceMethod: 'S256',
        });

        if (authenticated && keycloak.tokenParsed) {
          setIsAuthenticated(true);
          setUsername(keycloak.tokenParsed.preferred_username as string);
          setAuthMode('authenticated');
        }
      } catch (error) {
        console.debug('Auth check failed:', error);
        // Continue as guest - this is expected if Keycloak is not available
      }
    };

    checkExistingAuth();
  }, []);

  const handleSignIn = () => {
    setAuthMode('authenticated');
    setCurrentPage('console');
  };

  const handleContinueWithoutSignIn = () => {
    setAuthMode('placeholder');
    setCurrentPage('console');
  };

  const handleBackToLanding = () => {
    setCurrentPage('landing');
  };

  if (currentPage === 'landing') {
    return (
      <LandingPage
        onSignIn={handleSignIn}
        onContinueWithoutSignIn={handleContinueWithoutSignIn}
        isAuthenticated={isAuthenticated}
        username={username}
      />
    );
  }

  return (
    <FlexibleDevXConsole
      mode={authMode}
      onBackToLanding={handleBackToLanding}
    />
  );
};

export default App;