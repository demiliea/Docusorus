import React, { useState, useEffect } from 'react';
import LandingPage from './components/LandingPage';
import FlexibleDevXConsole from './components/FlexibleDevXConsole';
import { tokenManager, TokenRefreshManager, TokenData } from './utils/tokenManager';
import './App.css';

type AppState = 'landing' | 'console';
type AuthMode = 'authenticated' | 'placeholder' | 'guest';

const App: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<AppState>('landing');
  const [authMode, setAuthMode] = useState<AuthMode>('guest');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [username, setUsername] = useState<string | undefined>();
  const [email, setEmail] = useState<string | undefined>();
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [tokenData, setTokenData] = useState<TokenData | null>(null);
  const [refreshManager, setRefreshManager] = useState<TokenRefreshManager | null>(null);

  // Environment configuration
  const authEnabled = process.env.REACT_APP_ENABLE_AUTH === 'true';
  const debugAuth = process.env.REACT_APP_DEBUG_AUTH === 'true';
  const authTimeout = parseInt(process.env.REACT_APP_AUTH_TIMEOUT || '5000');

  // Keycloak configuration from environment
  const keycloakConfig = {
    url: process.env.REACT_APP_KEYCLOAK_URL || 'https://keycloak.eu-nordics-sto-test.dstny.d4sp.com/auth',
    realm: process.env.REACT_APP_KEYCLOAK_REALM || '40aa6bdb-11e5-49b7-8af8-6afe2111e514',
    clientId: process.env.REACT_APP_KEYCLOAK_CLIENT_ID || 'sam',
  };

  // Token refresh callback
  const handleTokenRefresh = (newTokenData: TokenData) => {
    setTokenData(newTokenData);
    setUsername(newTokenData.username);
    setEmail(newTokenData.email);
    if (debugAuth) {
      console.debug('App: Token refreshed successfully');
    }
  };

  // Token expiry callback
  const handleTokenExpired = () => {
    setTokenData(null);
    setIsAuthenticated(false);
    setUsername(undefined);
    setEmail(undefined);
    setAuthMode('guest');
    if (debugAuth) {
      console.debug('App: Token expired, logged out');
    }
  };

  // Check for existing authentication on app load
  useEffect(() => {
    const checkExistingAuth = async () => {
      try {
        if (!authEnabled) {
          console.debug('App: Authentication disabled via environment');
          setIsCheckingAuth(false);
          return;
        }

        // Check for stored tokens first
        const storedTokenData = tokenManager.getTokens();
        if (storedTokenData && tokenManager.isTokenValid(storedTokenData)) {
          console.debug('App: Found valid stored tokens');
          setTokenData(storedTokenData);
          setIsAuthenticated(true);
          setUsername(storedTokenData.username);
          setEmail(storedTokenData.email);
          setAuthMode('authenticated');
          
          // Setup token refresh manager
          const refreshMgr = new TokenRefreshManager(
            tokenManager, 
            handleTokenRefresh, 
            handleTokenExpired
          );
          refreshMgr.startAutoRefresh();
          setRefreshManager(refreshMgr);
          
          setIsCheckingAuth(false);
          return;
        }

        // No valid stored tokens, try Keycloak initialization
        console.debug('App: No valid stored tokens, checking Keycloak');
        const { default: Keycloak } = await import('keycloak-js');
        const keycloak = new Keycloak(keycloakConfig);

        // Add timeout to prevent hanging
        const initPromise = keycloak.init({
          onLoad: 'check-sso',
          checkLoginIframe: false,
          pkceMethod: 'S256',
        });

        // Create a timeout promise that rejects after configured timeout
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => {
            reject(new Error('Authentication initialization timeout'));
          }, authTimeout);
        });

        // Race between init and timeout
        const authenticated = await Promise.race([initPromise, timeoutPromise]);

        if (authenticated && keycloak.tokenParsed) {
          console.debug('App: Keycloak authentication successful');
          
          // Extract and store token data
          const newTokenData = tokenManager.extractTokenDataFromKeycloak(keycloak);
          if (newTokenData) {
            tokenManager.storeTokens(newTokenData);
            setTokenData(newTokenData);
            setIsAuthenticated(true);
            setUsername(newTokenData.username);
            setEmail(newTokenData.email);
            setAuthMode('authenticated');
            
            // Setup token refresh manager
            const refreshMgr = new TokenRefreshManager(
              tokenManager, 
              handleTokenRefresh, 
              handleTokenExpired
            );
            refreshMgr.startAutoRefresh();
            setRefreshManager(refreshMgr);
          }
        } else {
          console.debug('App: Keycloak authentication failed or user not authenticated');
        }
      } catch (error) {
        if (debugAuth) {
          console.debug('App: Auth check failed:', error);
        }
        // Continue as guest - this is expected if Keycloak is not available or times out
      } finally {
        setIsCheckingAuth(false);
      }
    };

    checkExistingAuth();

    // Cleanup on unmount
    return () => {
      if (refreshManager) {
        refreshManager.stopAutoRefresh();
      }
    };
  }, [authEnabled, debugAuth, authTimeout]);

  const handleSignIn = async () => {
    try {
      if (!authEnabled) {
        // If auth is disabled, just go to placeholder mode
        setAuthMode('placeholder');
        setCurrentPage('console');
        return;
      }

      // If we have stored tokens, just use them
      const storedTokenData = tokenManager.getTokens();
      if (storedTokenData && tokenManager.isTokenValid(storedTokenData)) {
        setTokenData(storedTokenData);
        setIsAuthenticated(true);
        setUsername(storedTokenData.username);
        setEmail(storedTokenData.email);
        setAuthMode('authenticated');
        setCurrentPage('console');
        return;
      }

      // Otherwise, initialize Keycloak for login
      const { default: Keycloak } = await import('keycloak-js');
      const keycloak = new Keycloak(keycloakConfig);

      const authenticated = await keycloak.init({
        onLoad: 'login-required',
        checkLoginIframe: false,
        pkceMethod: 'S256',
      });

      if (authenticated && keycloak.tokenParsed) {
        // Extract and store token data
        const newTokenData = tokenManager.extractTokenDataFromKeycloak(keycloak);
        if (newTokenData) {
          tokenManager.storeTokens(newTokenData);
          setTokenData(newTokenData);
          setIsAuthenticated(true);
          setUsername(newTokenData.username);
          setEmail(newTokenData.email);
          setAuthMode('authenticated');
          
          // Setup token refresh manager
          const refreshMgr = new TokenRefreshManager(
            tokenManager, 
            handleTokenRefresh, 
            handleTokenExpired
          );
          refreshMgr.startAutoRefresh();
          setRefreshManager(refreshMgr);
        }
      }
      
      setCurrentPage('console');
    } catch (error) {
      console.error('App: Sign in failed:', error);
      // Fallback to placeholder mode
      setAuthMode('placeholder');
      setCurrentPage('console');
    }
  };

  const handleContinueWithoutSignIn = () => {
    setAuthMode('placeholder');
    setCurrentPage('console');
  };

  const handleBackToLanding = () => {
    setCurrentPage('landing');
  };

  const handleLogout = () => {
    // Clear all stored tokens
    tokenManager.clearTokens();
    
    // Stop token refresh
    if (refreshManager) {
      refreshManager.stopAutoRefresh();
      setRefreshManager(null);
    }
    
    // Reset state
    setTokenData(null);
    setIsAuthenticated(false);
    setUsername(undefined);
    setEmail(undefined);
    setAuthMode('guest');
    setCurrentPage('landing');
    
    console.debug('App: User logged out');
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
            <p>Checking stored tokens...</p>
            <p style={{ fontSize: '14px', color: '#666' }}>
              This will timeout in {authTimeout / 1000} seconds
            </p>
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
        authEnabled={authEnabled}
        tokenData={tokenData}
      />
    );
  }

  return (
    <FlexibleDevXConsole
      mode={authMode}
      onBackToLanding={handleBackToLanding}
      onLogout={handleLogout}
      tokenData={tokenData}
      tokenManager={tokenManager}
      authEnabled={authEnabled}
    />
  );
};

export default App;