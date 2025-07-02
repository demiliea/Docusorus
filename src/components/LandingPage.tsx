import React from 'react';
import styles from './LandingPage.module.css';

interface LandingPageProps {
  onSignIn: () => void;
  onContinueWithoutSignIn: () => void;
  isAuthenticated: boolean;
  username?: string;
}

const LandingPage: React.FC<LandingPageProps> = ({
  onSignIn,
  onContinueWithoutSignIn,
  isAuthenticated,
  username
}) => {
  return (
    <div className={styles.container}>
      <div className={styles.hero}>
        <h1 className={styles.title}>Welcome to DevX Console</h1>
        <p className={styles.subtitle}>
          Your developer experience platform for API testing and token management
        </p>
        
        {isAuthenticated ? (
          <div className={styles.welcomeBack}>
            <h2>Welcome back, {username}!</h2>
            <p>You're already signed in and ready to go.</p>
          </div>
        ) : (
          <div className={styles.authOptions}>
            <div className={styles.signInOption}>
              <h3>Sign In</h3>
              <p>Sign in to access your personalized tokens and settings</p>
              <button className={styles.primaryButton} onClick={onSignIn}>
                Sign In with Keycloak
              </button>
            </div>
            
            <div className={styles.divider}>
              <span>OR</span>
            </div>
            
            <div className={styles.guestOption}>
              <h3>Continue as Guest</h3>
              <p>Use the console with placeholder tokens - perfect for testing</p>
              <button className={styles.secondaryButton} onClick={onContinueWithoutSignIn}>
                Continue Without Sign In
              </button>
            </div>
          </div>
        )}
        
        <div className={styles.features}>
          <div className={styles.feature}>
            <h4>🔐 Secure Authentication</h4>
            <p>OAuth 2.0 / OIDC with Keycloak integration</p>
          </div>
          <div className={styles.feature}>
            <h4>🚀 Ready-to-use Tokens</h4>
            <p>Copy JWT tokens and API snippets instantly</p>
          </div>
          <div className={styles.feature}>
            <h4>⚡ Developer Friendly</h4>
            <p>Works with or without authentication</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LandingPage;