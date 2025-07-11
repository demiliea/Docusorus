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
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

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

        // Add timeout to prevent hanging
        const initPromise = keycloak.init({
          onLoad: 'check-sso',
          checkLoginIframe: false,
          pkceMethod: 'S256',
        });

        // Create a timeout promise that rejects after 10 seconds
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => {
            reject(new Error('Authentication initialization timeout'));
          }, 10000); // 10 second timeout
        });

        // Race between init and timeout
        const authenticated = await Promise.race([initPromise, timeoutPromise]);

        if (authenticated && keycloak.tokenParsed) {
          setIsAuthenticated(true);
          setUsername(keycloak.tokenParsed.preferred_username as string);
          setAuthMode('authenticated');
        }
      } catch (error) {
        console.debug('Auth check failed:', error);
        // Continue as guest - this is expected if Keycloak is not available or times out
      } finally {
        setIsCheckingAuth(false);
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

  // Show loading state while checking authentication
  if (isCheckingAuth) {
    return (
      <div className="App" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <div>
          <div style={{ textAlign: 'center', marginBottom: '20px' }}>
            <div style={{ 
              border: '4px solid #f3f3f3', 
              borderTop: '4px solid #3498db', 
              borderRadius: '50%', 
              width: '40px', 
              height: '40px', 
              animation: 'spin 2s linear infinite',
              margin: '0 auto 20px'
            }}></div>
            <p>Checking authentication...</p>
            <p style={{ fontSize: '14px', color: '#666' }}>This will timeout in 10 seconds</p>
          </div>
        </div>
      </div>
    );
  }

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