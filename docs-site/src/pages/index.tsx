import React from 'react';
import type {ReactNode} from 'react';
import clsx from 'clsx';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
import HomepageFeatures from '@site/src/components/HomepageFeatures';
import Heading from '@theme/Heading';
import BrowserOnly from '@docusaurus/BrowserOnly';
import { useKeycloak } from '@react-keycloak/web';

import styles from './index.module.css';

function SignInSection() {
  const { keycloak, initialized } = useKeycloak();

  if (!initialized) {
    return (
      <div className="hero hero--secondary">
        <div className="container">
          <div className="row">
            <div className="col col--6 col--offset-3">
              <div className="card">
                <div className="card__header">
                  <h3>Authentication</h3>
                </div>
                <div className="card__body">
                  <p>Loading authentication...</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (keycloak.authenticated) {
    return (
      <div className="hero hero--secondary">
        <div className="container">
          <div className="row">
            <div className="col col--6 col--offset-3">
              <div className="card">
                <div className="card__header">
                  <h3>Welcome Back!</h3>
                </div>
                <div className="card__body">
                  <p>
                    Signed in as <strong>{keycloak.tokenParsed?.preferred_username}</strong>
                  </p>
                  <p>
                    You now have access to JWT token replacement in examples and developer tools.
                  </p>
                  <div className="button-group">
                    <Link
                      className="button button--primary button--outline"
                      to="/jwt-examples">
                      View JWT Examples
                    </Link>
                    <Link
                      className="button button--secondary button--outline"
                      to="/devx-console">
                      Developer Console
                    </Link>
                    <button 
                      className="button button--danger button--outline"
                      onClick={() => keycloak.logout({ redirectUri: window.location.href })}>
                      Sign Out
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="hero hero--secondary">
      <div className="container">
        <div className="row">
          <div className="col col--6 col--offset-3">
            <div className="card">
              <div className="card__header">
                <h3>Enhanced Experience</h3>
              </div>
              <div className="card__body">
                <p>
                  Sign in to unlock JWT token replacement in code examples and access developer tools.
                </p>
                <p>
                  <strong>Note:</strong> All content is available without signing in. Authentication only enables 
                  personalized JWT tokens in examples instead of placeholders.
                </p>
                <button 
                  className="button button--primary"
                  onClick={() => keycloak.login()}>
                  Sign In
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
}

function HomepageHeader() {
  const { siteConfig } = useDocusaurusContext();
  return (
    <header className={clsx('hero hero--primary', styles.heroBanner)}>
      <div className="container">
        <Heading as="h1" className="hero__title">
          {siteConfig.title}
        </Heading>
        <p className="hero__subtitle">{siteConfig.tagline}</p>
        <div className={styles.buttons}>
          <Link
            className="button button--secondary button--lg"
            to="/docs/intro">
            Documentation - 5min ⏱️
          </Link>
          <Link
            className="button button--primary button--lg button--outline"
            to="/jwt-examples">
            JWT Examples
          </Link>
        </div>
      </div>
    </header>
  );
}

export default function Home(): ReactNode {
  const { siteConfig } = useDocusaurusContext();
  return (
    <Layout
      title={`Welcome to ${siteConfig.title}`}
      description="Learn JWT authentication with practical examples and tools">
      <HomepageHeader />
      <main>
        <BrowserOnly fallback={<div>Loading...</div>}>
          {() => <SignInSection />}
        </BrowserOnly>
        <HomepageFeatures />
      </main>
    </Layout>
  );
}
