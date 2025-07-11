export interface TokenData {
  accessToken: string;
  refreshToken?: string;
  expiresAt: number;
  username: string;
  email?: string;
  tokenParsed?: any;
}

export interface TokenManagerOptions {
  domain?: string;
  secure?: boolean;
  sameSite?: 'strict' | 'lax' | 'none';
}

export class TokenManager {
  private static readonly ACCESS_TOKEN_KEY = 'keycloak_access_token';
  private static readonly REFRESH_TOKEN_KEY = 'keycloak_refresh_token';
  private static readonly TOKEN_DATA_KEY = 'keycloak_token_data';
  private static readonly EXPIRES_AT_KEY = 'keycloak_expires_at';
  private static readonly USERNAME_KEY = 'keycloak_username';
  private static readonly EMAIL_KEY = 'keycloak_email';
  
  private options: TokenManagerOptions;
  
  constructor(options: TokenManagerOptions = {}) {
    this.options = {
      domain: options.domain || window.location.hostname,
      secure: options.secure !== false, // Default to true
      sameSite: options.sameSite || 'strict',
    };
  }
  
  /**
   * Store token data in both localStorage and cookies
   */
  storeTokens(tokenData: TokenData): void {
    try {
      // Store in localStorage
      localStorage.setItem(TokenManager.ACCESS_TOKEN_KEY, tokenData.accessToken);
      localStorage.setItem(TokenManager.EXPIRES_AT_KEY, tokenData.expiresAt.toString());
      localStorage.setItem(TokenManager.USERNAME_KEY, tokenData.username);
      
      if (tokenData.refreshToken) {
        localStorage.setItem(TokenManager.REFRESH_TOKEN_KEY, tokenData.refreshToken);
      }
      
      if (tokenData.email) {
        localStorage.setItem(TokenManager.EMAIL_KEY, tokenData.email);
      }
      
      // Store complete token data as JSON
      localStorage.setItem(TokenManager.TOKEN_DATA_KEY, JSON.stringify(tokenData));
      
      // Store in cookies with security flags
      this.setCookie(TokenManager.ACCESS_TOKEN_KEY, tokenData.accessToken, tokenData.expiresAt);
      this.setCookie(TokenManager.EXPIRES_AT_KEY, tokenData.expiresAt.toString(), tokenData.expiresAt);
      this.setCookie(TokenManager.USERNAME_KEY, tokenData.username, tokenData.expiresAt);
      
      if (tokenData.refreshToken) {
        this.setCookie(TokenManager.REFRESH_TOKEN_KEY, tokenData.refreshToken, tokenData.expiresAt);
      }
      
      if (tokenData.email) {
        this.setCookie(TokenManager.EMAIL_KEY, tokenData.email, tokenData.expiresAt);
      }
      
      console.debug('TokenManager: Tokens stored successfully');
    } catch (error) {
      console.error('TokenManager: Failed to store tokens:', error);
    }
  }
  
  /**
   * Retrieve token data from storage
   */
  getTokens(): TokenData | null {
    try {
      // Try localStorage first
      const tokenDataJson = localStorage.getItem(TokenManager.TOKEN_DATA_KEY);
      if (tokenDataJson) {
        const tokenData = JSON.parse(tokenDataJson) as TokenData;
        
        // Validate token is not expired
        if (this.isTokenValid(tokenData)) {
          return tokenData;
        }
      }
      
      // Fallback to individual items
      const accessToken = localStorage.getItem(TokenManager.ACCESS_TOKEN_KEY) || this.getCookie(TokenManager.ACCESS_TOKEN_KEY);
      const refreshToken = localStorage.getItem(TokenManager.REFRESH_TOKEN_KEY) || this.getCookie(TokenManager.REFRESH_TOKEN_KEY);
      const expiresAt = localStorage.getItem(TokenManager.EXPIRES_AT_KEY) || this.getCookie(TokenManager.EXPIRES_AT_KEY);
      const username = localStorage.getItem(TokenManager.USERNAME_KEY) || this.getCookie(TokenManager.USERNAME_KEY);
      const email = localStorage.getItem(TokenManager.EMAIL_KEY) || this.getCookie(TokenManager.EMAIL_KEY);
      
      if (accessToken && expiresAt && username) {
        const tokenData: TokenData = {
          accessToken,
          refreshToken: refreshToken || undefined,
          expiresAt: parseInt(expiresAt),
          username,
          email: email || undefined,
        };
        
        if (this.isTokenValid(tokenData)) {
          return tokenData;
        }
      }
      
      return null;
    } catch (error) {
      console.error('TokenManager: Failed to retrieve tokens:', error);
      return null;
    }
  }
  
  /**
   * Check if token is valid (not expired)
   */
  isTokenValid(tokenData: TokenData): boolean {
    const now = Date.now();
    const expiresAt = tokenData.expiresAt;
    
    // Check if token expires within 1 minute (buffer time)
    const bufferTime = 60 * 1000; // 1 minute
    return expiresAt > (now + bufferTime);
  }
  
  /**
   * Check if token is expiring soon (within 5 minutes)
   */
  isTokenExpiringSoon(tokenData: TokenData): boolean {
    const now = Date.now();
    const expiresAt = tokenData.expiresAt;
    
    // Check if token expires within 5 minutes
    const warningTime = 5 * 60 * 1000; // 5 minutes
    return expiresAt <= (now + warningTime);
  }
  
  /**
   * Get Authorization header value
   */
  getAuthorizationHeader(): string | null {
    const tokenData = this.getTokens();
    if (tokenData && this.isTokenValid(tokenData)) {
      return `Bearer ${tokenData.accessToken}`;
    }
    return null;
  }
  
  /**
   * Parse JWT token payload
   */
  parseJwtToken(token: string): any {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) {
        throw new Error('Invalid JWT format');
      }
      
      const payload = parts[1];
      const decoded = atob(payload);
      return JSON.parse(decoded);
    } catch (error) {
      console.error('TokenManager: Failed to parse JWT token:', error);
      return null;
    }
  }
  
  /**
   * Extract token data from Keycloak instance
   */
  extractTokenDataFromKeycloak(keycloak: any): TokenData | null {
    try {
      if (!keycloak.token || !keycloak.tokenParsed) {
        return null;
      }
      
      const tokenParsed = keycloak.tokenParsed;
      const expiresAt = tokenParsed.exp * 1000; // Convert to milliseconds
      
      return {
        accessToken: keycloak.token,
        refreshToken: keycloak.refreshToken,
        expiresAt,
        username: tokenParsed.preferred_username || tokenParsed.sub,
        email: tokenParsed.email,
        tokenParsed,
      };
    } catch (error) {
      console.error('TokenManager: Failed to extract token data from Keycloak:', error);
      return null;
    }
  }
  
  /**
   * Clear all stored tokens
   */
  clearTokens(): void {
    try {
      // Clear localStorage
      localStorage.removeItem(TokenManager.ACCESS_TOKEN_KEY);
      localStorage.removeItem(TokenManager.REFRESH_TOKEN_KEY);
      localStorage.removeItem(TokenManager.TOKEN_DATA_KEY);
      localStorage.removeItem(TokenManager.EXPIRES_AT_KEY);
      localStorage.removeItem(TokenManager.USERNAME_KEY);
      localStorage.removeItem(TokenManager.EMAIL_KEY);
      
      // Clear cookies
      this.deleteCookie(TokenManager.ACCESS_TOKEN_KEY);
      this.deleteCookie(TokenManager.REFRESH_TOKEN_KEY);
      this.deleteCookie(TokenManager.EXPIRES_AT_KEY);
      this.deleteCookie(TokenManager.USERNAME_KEY);
      this.deleteCookie(TokenManager.EMAIL_KEY);
      
      console.debug('TokenManager: Tokens cleared successfully');
    } catch (error) {
      console.error('TokenManager: Failed to clear tokens:', error);
    }
  }
  
  /**
   * Set cookie with security flags
   */
  private setCookie(name: string, value: string, expiresAt: number): void {
    try {
      const expiresDate = new Date(expiresAt);
      const cookieOptions = [
        `expires=${expiresDate.toUTCString()}`,
        `path=/`,
        `domain=${this.options.domain}`,
        `SameSite=${this.options.sameSite}`,
      ];
      
      if (this.options.secure) {
        cookieOptions.push('Secure');
      }
      
      // Add HttpOnly for sensitive tokens (not accessible via JavaScript)
      if (name === TokenManager.ACCESS_TOKEN_KEY || name === TokenManager.REFRESH_TOKEN_KEY) {
        // Note: HttpOnly cookies can't be read by JavaScript, so we store them in localStorage too
        // This is a trade-off between security and functionality
      }
      
      const cookieString = `${name}=${encodeURIComponent(value)}; ${cookieOptions.join('; ')}`;
      document.cookie = cookieString;
    } catch (error) {
      console.error('TokenManager: Failed to set cookie:', error);
    }
  }
  
  /**
   * Get cookie value
   */
  private getCookie(name: string): string | null {
    try {
      const nameEQ = name + '=';
      const ca = document.cookie.split(';');
      
      for (let i = 0; i < ca.length; i++) {
        let c = ca[i];
        while (c.charAt(0) === ' ') c = c.substring(1, c.length);
        if (c.indexOf(nameEQ) === 0) {
          return decodeURIComponent(c.substring(nameEQ.length, c.length));
        }
      }
      return null;
    } catch (error) {
      console.error('TokenManager: Failed to get cookie:', error);
      return null;
    }
  }
  
  /**
   * Delete cookie
   */
  private deleteCookie(name: string): void {
    try {
      const cookieOptions = [
        'expires=Thu, 01 Jan 1970 00:00:00 GMT',
        'path=/',
        `domain=${this.options.domain}`,
      ];
      
      const cookieString = `${name}=; ${cookieOptions.join('; ')}`;
      document.cookie = cookieString;
    } catch (error) {
      console.error('TokenManager: Failed to delete cookie:', error);
    }
  }
}

/**
 * Default token manager instance
 */
export const tokenManager = new TokenManager({
  secure: window.location.protocol === 'https:',
  sameSite: 'strict',
});

/**
 * Token refresh utility
 */
export class TokenRefreshManager {
  private refreshInterval: NodeJS.Timeout | null = null;
  private tokenManager: TokenManager;
  private onTokenRefresh?: (tokenData: TokenData) => void;
  private onTokenExpired?: () => void;
  
  constructor(
    tokenManager: TokenManager,
    onTokenRefresh?: (tokenData: TokenData) => void,
    onTokenExpired?: () => void
  ) {
    this.tokenManager = tokenManager;
    this.onTokenRefresh = onTokenRefresh;
    this.onTokenExpired = onTokenExpired;
  }
  
  /**
   * Start automatic token refresh checking
   */
  startAutoRefresh(): void {
    this.stopAutoRefresh();
    
    // Check every minute
    this.refreshInterval = setInterval(() => {
      this.checkAndRefreshToken();
    }, 60 * 1000);
    
    // Also check immediately
    this.checkAndRefreshToken();
  }
  
  /**
   * Stop automatic token refresh
   */
  stopAutoRefresh(): void {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = null;
    }
  }
  
  /**
   * Check if token needs refresh and attempt to refresh it
   */
  private async checkAndRefreshToken(): Promise<void> {
    try {
      const tokenData = this.tokenManager.getTokens();
      
      if (!tokenData) {
        console.debug('TokenRefreshManager: No tokens found');
        return;
      }
      
      if (!this.tokenManager.isTokenValid(tokenData)) {
        console.debug('TokenRefreshManager: Token expired');
        this.tokenManager.clearTokens();
        this.onTokenExpired?.();
        return;
      }
      
      if (this.tokenManager.isTokenExpiringSoon(tokenData)) {
        console.debug('TokenRefreshManager: Token expiring soon, attempting refresh');
        await this.refreshToken(tokenData);
      }
    } catch (error) {
      console.error('TokenRefreshManager: Error checking token:', error);
    }
  }
  
  /**
   * Refresh token using Keycloak
   */
  private async refreshToken(tokenData: TokenData): Promise<void> {
    try {
      if (!tokenData.refreshToken) {
        console.debug('TokenRefreshManager: No refresh token available');
        return;
      }
      
      // Import Keycloak dynamically
      const { default: Keycloak } = await import('keycloak-js');
      
      const keycloak = new Keycloak({
        url: process.env.REACT_APP_KEYCLOAK_URL || 'https://keycloak.eu-nordics-sto-test.dstny.d4sp.com/auth',
        realm: process.env.REACT_APP_KEYCLOAK_REALM || '40aa6bdb-11e5-49b7-8af8-6afe2111e514',
        clientId: process.env.REACT_APP_KEYCLOAK_CLIENT_ID || 'sam',
      });
      
      // Set the existing tokens
      keycloak.token = tokenData.accessToken;
      keycloak.refreshToken = tokenData.refreshToken;
      keycloak.tokenParsed = tokenData.tokenParsed;
      
      // Update token (this will refresh if needed)
      const refreshed = await keycloak.updateToken(5 * 60); // 5 minutes
      
      if (refreshed && keycloak.token) {
        const newTokenData = this.tokenManager.extractTokenDataFromKeycloak(keycloak);
        if (newTokenData) {
          this.tokenManager.storeTokens(newTokenData);
          this.onTokenRefresh?.(newTokenData);
          console.debug('TokenRefreshManager: Token refreshed successfully');
        }
      }
    } catch (error) {
      console.error('TokenRefreshManager: Failed to refresh token:', error);
      this.tokenManager.clearTokens();
      this.onTokenExpired?.();
    }
  }
}